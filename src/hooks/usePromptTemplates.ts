/**
 * Prompt Templates React Hooks
 * Custom hooks for prompt template operations
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  promptTemplateKeys,
  accessibleTemplatesQueryOptions,
  builtInTemplatesQueryOptions,
  userCustomTemplatesQueryOptions,
  templateByIdQueryOptions,
  templatesByCategoryQueryOptions,
  templateUsageStatsQueryOptions,
  userUsageStatsQueryOptions,
  recentUsageQueryOptions,
  cacheEligibilityQueryOptions,
} from "~/queries/prompt-templates";
import {
  createTemplateFn,
  updateTemplateFn,
  deleteTemplateFn,
  duplicateTemplateFn,
  renderTemplateFn,
  executeTemplateFn,
} from "~/fn/prompt-templates";
import type {
  PromptTemplateCategory,
  PromptTemplateStatus,
  TemplateVariableValues,
} from "~/lib/prompt-templates/types";

// =============================================================================
// Query Hooks
// =============================================================================

/**
 * Hook for fetching accessible templates (built-in + custom)
 */
export function useAccessibleTemplates(
  filters?: {
    category?: PromptTemplateCategory;
    status?: PromptTemplateStatus;
    searchQuery?: string;
    isBuiltIn?: boolean;
  },
  pagination?: {
    limit?: number;
    offset?: number;
  }
) {
  return useQuery(accessibleTemplatesQueryOptions(filters, pagination));
}

/**
 * Hook for fetching built-in templates only
 */
export function useBuiltInTemplates() {
  return useQuery(builtInTemplatesQueryOptions());
}

/**
 * Hook for fetching user's custom templates
 */
export function useUserCustomTemplates(pagination?: {
  limit?: number;
  offset?: number;
}) {
  return useQuery(userCustomTemplatesQueryOptions(pagination));
}

/**
 * Hook for fetching a specific template by ID
 */
export function useTemplate(id: string) {
  return useQuery(templateByIdQueryOptions(id));
}

/**
 * Hook for fetching templates by category
 */
export function useTemplatesByCategory(category: PromptTemplateCategory) {
  return useQuery(templatesByCategoryQueryOptions(category));
}

/**
 * Hook for fetching template usage statistics
 */
export function useTemplateUsageStats(templateId: string) {
  return useQuery(templateUsageStatsQueryOptions(templateId));
}

/**
 * Hook for fetching user's overall usage statistics
 */
export function useUserUsageStats() {
  return useQuery(userUsageStatsQueryOptions());
}

/**
 * Hook for fetching recent usage records
 */
export function useRecentUsage(limit?: number) {
  return useQuery(recentUsageQueryOptions(limit));
}

/**
 * Hook for checking cache eligibility
 */
export function useCacheEligibility(
  templateId: string,
  variableValues?: Record<string, unknown>
) {
  return useQuery(cacheEligibilityQueryOptions(templateId, variableValues));
}

// =============================================================================
// Mutation Hooks
// =============================================================================

/**
 * Hook for creating a new template
 */
export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      name: string;
      description: string;
      category: PromptTemplateCategory;
      systemPrompt: string;
      userPromptPrefix?: string;
      userPromptSuffix?: string;
      variables?: Array<{
        name: string;
        description: string;
        type: "string" | "number" | "boolean" | "array" | "object" | "date";
        required: boolean;
        defaultValue?: unknown;
        example?: unknown;
        validation?: string;
      }>;
      caching?: {
        enablePromptCaching: boolean;
        enableMemoryCache: boolean;
        memoryCacheTTL?: number;
        minTokensForCaching?: number;
      };
      recommendedModel?: string;
      recommendedTemperature?: number;
      recommendedMaxTokens?: number;
      tags?: string[];
    }) => createTemplateFn({ data }),
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: promptTemplateKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: promptTemplateKeys.custom(),
      });
    },
  });
}

/**
 * Hook for updating a template
 */
export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      id: string;
      name?: string;
      description?: string;
      category?: PromptTemplateCategory;
      status?: PromptTemplateStatus;
      systemPrompt?: string;
      userPromptPrefix?: string | null;
      userPromptSuffix?: string | null;
      variables?: Array<{
        name: string;
        description: string;
        type: "string" | "number" | "boolean" | "array" | "object" | "date";
        required: boolean;
        defaultValue?: unknown;
        example?: unknown;
        validation?: string;
      }>;
      caching?: {
        enablePromptCaching: boolean;
        enableMemoryCache: boolean;
        memoryCacheTTL?: number;
        minTokensForCaching?: number;
      };
      recommendedModel?: string | null;
      recommendedTemperature?: number | null;
      recommendedMaxTokens?: number | null;
      tags?: string[] | null;
    }) => updateTemplateFn({ data }),
    onSuccess: (_, variables) => {
      // Invalidate the specific template and lists
      queryClient.invalidateQueries({
        queryKey: promptTemplateKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: promptTemplateKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: promptTemplateKeys.custom(),
      });
    },
  });
}

/**
 * Hook for deleting a template
 */
export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteTemplateFn({ data: { id } }),
    onSuccess: (_, id) => {
      // Remove from cache and invalidate lists
      queryClient.removeQueries({
        queryKey: promptTemplateKeys.detail(id),
      });
      queryClient.invalidateQueries({
        queryKey: promptTemplateKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: promptTemplateKeys.custom(),
      });
    },
  });
}

/**
 * Hook for duplicating a template
 */
export function useDuplicateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { id: string; newName?: string }) =>
      duplicateTemplateFn({ data }),
    onSuccess: () => {
      // Invalidate lists
      queryClient.invalidateQueries({
        queryKey: promptTemplateKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: promptTemplateKeys.custom(),
      });
    },
  });
}

/**
 * Hook for rendering a template (preview without execution)
 */
export function useRenderTemplate() {
  return useMutation({
    mutationFn: (data: {
      templateId: string;
      variableValues: TemplateVariableValues;
    }) => renderTemplateFn({ data }),
  });
}

/**
 * Hook for executing a template with Claude API
 */
export function useExecuteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      templateId: string;
      variableValues: TemplateVariableValues;
      userMessage: string;
      model?: string;
      maxTokens?: number;
      temperature?: number;
    }) => executeTemplateFn({ data }),
    onSuccess: (_, variables) => {
      // Invalidate usage stats after execution
      queryClient.invalidateQueries({
        queryKey: promptTemplateKeys.templateUsage(variables.templateId),
      });
      queryClient.invalidateQueries({
        queryKey: promptTemplateKeys.userUsage(),
      });
      queryClient.invalidateQueries({
        queryKey: promptTemplateKeys.recentUsage(),
      });
    },
  });
}

// =============================================================================
// Combined Hooks
// =============================================================================

/**
 * Hook for template management (combines common operations)
 */
export function useTemplateManagement(templateId?: string) {
  const queryClient = useQueryClient();

  const template = useTemplate(templateId || "");
  const usageStats = useTemplateUsageStats(templateId || "");
  const updateMutation = useUpdateTemplate();
  const deleteMutation = useDeleteTemplate();
  const duplicateMutation = useDuplicateTemplate();

  const invalidateTemplate = () => {
    if (templateId) {
      queryClient.invalidateQueries({
        queryKey: promptTemplateKeys.detail(templateId),
      });
    }
  };

  return {
    template: template.data?.template,
    isLoading: template.isLoading,
    error: template.error,
    usageStats: usageStats.data?.stats,
    update: updateMutation,
    delete: deleteMutation,
    duplicate: duplicateMutation,
    invalidate: invalidateTemplate,
  };
}

/**
 * Hook for template execution with state management
 */
export function useTemplateExecution() {
  const executeMutation = useExecuteTemplate();
  const renderMutation = useRenderTemplate();

  return {
    execute: executeMutation.mutateAsync,
    render: renderMutation.mutateAsync,
    isExecuting: executeMutation.isPending,
    isRendering: renderMutation.isPending,
    executeError: executeMutation.error,
    renderError: renderMutation.error,
    lastExecution: executeMutation.data,
    lastRender: renderMutation.data,
    reset: () => {
      executeMutation.reset();
      renderMutation.reset();
    },
  };
}

/**
 * Hook for template browsing with filtering
 */
export function useTemplateBrowser(initialFilters?: {
  category?: PromptTemplateCategory;
  status?: PromptTemplateStatus;
  searchQuery?: string;
  isBuiltIn?: boolean;
}) {
  const [filters, setFilters] = React.useState(initialFilters || {});
  const [pagination, setPagination] = React.useState({ limit: 20, offset: 0 });

  const query = useAccessibleTemplates(filters, pagination);

  const setCategory = (category?: PromptTemplateCategory) => {
    setFilters((prev) => ({ ...prev, category }));
    setPagination({ limit: 20, offset: 0 }); // Reset pagination
  };

  const setStatus = (status?: PromptTemplateStatus) => {
    setFilters((prev) => ({ ...prev, status }));
    setPagination({ limit: 20, offset: 0 });
  };

  const setSearchQuery = (searchQuery?: string) => {
    setFilters((prev) => ({ ...prev, searchQuery }));
    setPagination({ limit: 20, offset: 0 });
  };

  const setBuiltInOnly = (isBuiltIn?: boolean) => {
    setFilters((prev) => ({ ...prev, isBuiltIn }));
    setPagination({ limit: 20, offset: 0 });
  };

  const nextPage = () => {
    if (query.data?.hasMore) {
      setPagination((prev) => ({
        ...prev,
        offset: prev.offset + prev.limit,
      }));
    }
  };

  const prevPage = () => {
    setPagination((prev) => ({
      ...prev,
      offset: Math.max(0, prev.offset - prev.limit),
    }));
  };

  const resetFilters = () => {
    setFilters({});
    setPagination({ limit: 20, offset: 0 });
  };

  return {
    templates: query.data?.templates || [],
    total: query.data?.total || 0,
    hasMore: query.data?.hasMore || false,
    isLoading: query.isLoading,
    error: query.error,
    filters,
    pagination,
    setCategory,
    setStatus,
    setSearchQuery,
    setBuiltInOnly,
    nextPage,
    prevPage,
    resetFilters,
  };
}

// Import React for hooks that use state
import React from "react";
