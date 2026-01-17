/**
 * Prompt Templates Query Options
 * TanStack Query options for prompt template data fetching
 */

import { queryOptions } from "@tanstack/react-query";
import {
  getAccessibleTemplatesFn,
  getBuiltInTemplatesFn,
  getUserCustomTemplatesFn,
  getTemplateByIdFn,
  getTemplatesByCategoryFn,
  getTemplateUsageStatsFn,
  getUserUsageStatsFn,
  getRecentUsageFn,
  checkCacheEligibilityFn,
} from "~/fn/prompt-templates";
import type {
  PromptTemplateCategory,
  PromptTemplateStatus,
} from "~/lib/prompt-templates/types";

// =============================================================================
// Query Keys
// =============================================================================

export const promptTemplateKeys = {
  all: ["prompt-templates"] as const,
  lists: () => [...promptTemplateKeys.all, "list"] as const,
  list: (filters?: {
    category?: string;
    status?: string;
    searchQuery?: string;
    isBuiltIn?: boolean;
  }) => [...promptTemplateKeys.lists(), filters] as const,
  builtIn: () => [...promptTemplateKeys.all, "built-in"] as const,
  custom: () => [...promptTemplateKeys.all, "custom"] as const,
  details: () => [...promptTemplateKeys.all, "detail"] as const,
  detail: (id: string) => [...promptTemplateKeys.details(), id] as const,
  byCategory: (category: string) =>
    [...promptTemplateKeys.all, "category", category] as const,
  usage: () => [...promptTemplateKeys.all, "usage"] as const,
  templateUsage: (templateId: string) =>
    [...promptTemplateKeys.usage(), "template", templateId] as const,
  userUsage: () => [...promptTemplateKeys.usage(), "user"] as const,
  recentUsage: (limit?: number) =>
    [...promptTemplateKeys.usage(), "recent", limit] as const,
  cacheEligibility: (templateId: string, variableValues?: Record<string, unknown>) =>
    [...promptTemplateKeys.all, "cache-eligibility", templateId, variableValues] as const,
};

// =============================================================================
// Query Options
// =============================================================================

/**
 * Query options for accessible templates (built-in + custom)
 */
export const accessibleTemplatesQueryOptions = (
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
) =>
  queryOptions({
    queryKey: promptTemplateKeys.list(filters),
    queryFn: () =>
      getAccessibleTemplatesFn({
        data: {
          filters,
          pagination,
        },
      }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

/**
 * Query options for built-in templates only
 */
export const builtInTemplatesQueryOptions = () =>
  queryOptions({
    queryKey: promptTemplateKeys.builtIn(),
    queryFn: () => getBuiltInTemplatesFn(),
    staleTime: 60 * 60 * 1000, // 1 hour (built-in templates don't change)
  });

/**
 * Query options for user's custom templates
 */
export const userCustomTemplatesQueryOptions = (
  pagination?: {
    limit?: number;
    offset?: number;
  }
) =>
  queryOptions({
    queryKey: promptTemplateKeys.custom(),
    queryFn: () =>
      getUserCustomTemplatesFn({
        data: pagination,
      }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

/**
 * Query options for a specific template by ID
 */
export const templateByIdQueryOptions = (id: string) =>
  queryOptions({
    queryKey: promptTemplateKeys.detail(id),
    queryFn: () => getTemplateByIdFn({ data: { id } }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!id,
  });

/**
 * Query options for templates by category
 */
export const templatesByCategoryQueryOptions = (category: PromptTemplateCategory) =>
  queryOptions({
    queryKey: promptTemplateKeys.byCategory(category),
    queryFn: () => getTemplatesByCategoryFn({ data: { category } }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

/**
 * Query options for template usage statistics
 */
export const templateUsageStatsQueryOptions = (templateId: string) =>
  queryOptions({
    queryKey: promptTemplateKeys.templateUsage(templateId),
    queryFn: () => getTemplateUsageStatsFn({ data: { templateId } }),
    staleTime: 1 * 60 * 1000, // 1 minute (usage changes frequently)
    enabled: !!templateId,
  });

/**
 * Query options for user's overall usage statistics
 */
export const userUsageStatsQueryOptions = () =>
  queryOptions({
    queryKey: promptTemplateKeys.userUsage(),
    queryFn: () => getUserUsageStatsFn(),
    staleTime: 1 * 60 * 1000, // 1 minute
  });

/**
 * Query options for recent usage records
 */
export const recentUsageQueryOptions = (limit?: number) =>
  queryOptions({
    queryKey: promptTemplateKeys.recentUsage(limit),
    queryFn: () => getRecentUsageFn({ data: limit ? { limit } : undefined }),
    staleTime: 30 * 1000, // 30 seconds
  });

/**
 * Query options for cache eligibility check
 */
export const cacheEligibilityQueryOptions = (
  templateId: string,
  variableValues?: Record<string, unknown>
) =>
  queryOptions({
    queryKey: promptTemplateKeys.cacheEligibility(templateId, variableValues),
    queryFn: () =>
      checkCacheEligibilityFn({
        data: {
          templateId,
          variableValues,
        },
      }),
    staleTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!templateId,
  });

// =============================================================================
// Prefetch Utilities
// =============================================================================

/**
 * Prefetch function for accessible templates
 * Use with queryClient.prefetchQuery()
 */
export const prefetchAccessibleTemplates = (
  filters?: {
    category?: PromptTemplateCategory;
    status?: PromptTemplateStatus;
    searchQuery?: string;
    isBuiltIn?: boolean;
  }
) => accessibleTemplatesQueryOptions(filters);

/**
 * Prefetch function for template details
 * Use with queryClient.prefetchQuery()
 */
export const prefetchTemplateDetails = (id: string) =>
  templateByIdQueryOptions(id);
