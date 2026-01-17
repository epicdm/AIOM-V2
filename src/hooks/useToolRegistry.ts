/**
 * Tool Registry React Hooks
 * Custom hooks for accessing and managing the tool registry
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  toolsQueryOptions,
  toolByIdQueryOptions,
  claudeToolsQueryOptions,
  toolCategoriesQueryOptions,
  searchToolsQueryOptions,
  registryStatsQueryOptions,
} from "~/queries/tool-registry";
import {
  executeToolFn,
  enableToolFn,
  disableToolFn,
} from "~/fn/tool-registry";
import { getErrorMessage } from "~/utils/error";
import type { ToolCategory } from "~/lib/tool-registry";

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Hook to get all available tools
 */
export function useTools(
  options?: {
    category?: ToolCategory;
    enabledOnly?: boolean;
    tags?: string[];
  },
  enabled = true
) {
  return useQuery({
    ...toolsQueryOptions(options),
    enabled,
  });
}

/**
 * Hook to get a single tool by ID
 */
export function useTool(toolId: string, enabled = true) {
  return useQuery({
    ...toolByIdQueryOptions(toolId),
    enabled: enabled && !!toolId,
  });
}

/**
 * Hook to get tools in Claude-compatible format
 */
export function useClaudeTools(
  options?: {
    category?: ToolCategory;
    tags?: string[];
  },
  enabled = true
) {
  return useQuery({
    ...claudeToolsQueryOptions(options),
    enabled,
  });
}

/**
 * Hook to get tool categories with counts
 */
export function useToolCategories(enabled = true) {
  return useQuery({
    ...toolCategoriesQueryOptions(),
    enabled,
  });
}

/**
 * Hook to search tools
 */
export function useToolSearch(query: string, enabled = true) {
  return useQuery({
    ...searchToolsQueryOptions(query),
    enabled: enabled && query.length >= 1,
  });
}

/**
 * Hook to get registry statistics (admin only)
 */
export function useRegistryStats(enabled = true) {
  return useQuery({
    ...registryStatsQueryOptions(),
    enabled,
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Hook to execute a tool
 */
export function useExecuteTool() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      toolId,
      input,
      timeoutMs,
    }: {
      toolId: string;
      input: Record<string, unknown>;
      timeoutMs?: number;
    }): Promise<{ success: boolean }> => {
      const result = await executeToolFn({ data: { toolId, input, timeoutMs } });
      return result as { success: boolean };
    },
    onSuccess: (result, { toolId }) => {
      if (result.success) {
        // Optionally invalidate related queries
        queryClient.invalidateQueries({ queryKey: ["tools"] });
      }
    },
    onError: (error, { toolId }) => {
      toast.error(`Failed to execute tool: ${toolId}`, {
        description: getErrorMessage(error),
      });
    },
  });
}

/**
 * Hook to enable a tool (admin only)
 */
export function useEnableTool() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (toolId: string) => {
      return enableToolFn({ data: { toolId } });
    },
    onSuccess: (result, toolId) => {
      if (result.success) {
        toast.success(`Tool "${toolId}" enabled`);
        queryClient.invalidateQueries({ queryKey: ["tools"] });
      }
    },
    onError: (error, toolId) => {
      toast.error(`Failed to enable tool: ${toolId}`, {
        description: getErrorMessage(error),
      });
    },
  });
}

/**
 * Hook to disable a tool (admin only)
 */
export function useDisableTool() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (toolId: string) => {
      return disableToolFn({ data: { toolId } });
    },
    onSuccess: (result, toolId) => {
      if (result.success) {
        toast.success(`Tool "${toolId}" disabled`);
        queryClient.invalidateQueries({ queryKey: ["tools"] });
      }
    },
    onError: (error, toolId) => {
      toast.error(`Failed to disable tool: ${toolId}`, {
        description: getErrorMessage(error),
      });
    },
  });
}

// ============================================================================
// Compound Hooks
// ============================================================================

/**
 * Hook that combines tools data with execution capability
 */
export function useToolWithExecution(toolId: string) {
  const toolQuery = useTool(toolId);
  const executeMutation = useExecuteTool();

  return {
    // Tool data
    tool: toolQuery.data,
    isLoading: toolQuery.isLoading,
    isError: toolQuery.isError,
    error: toolQuery.error,

    // Execution
    execute: (input: Record<string, unknown>, timeoutMs?: number) =>
      executeMutation.mutateAsync({ toolId, input, timeoutMs }),
    isExecuting: executeMutation.isPending,
    executionResult: executeMutation.data,
    executionError: executeMutation.error,

    // Refetch
    refetch: toolQuery.refetch,
  };
}

/**
 * Hook for tool listing with filtering and search
 */
export function useToolListing() {
  const categoriesQuery = useToolCategories();

  return {
    // Get tools with category filter
    useFilteredTools: (category?: ToolCategory) => useTools({ category }),

    // Get tools with search
    useSearchedTools: (query: string) => useToolSearch(query),

    // Categories data
    categories: categoriesQuery.data ?? [],
    isCategoriesLoading: categoriesQuery.isLoading,

    // Refresh all
    refreshAll: () => {
      categoriesQuery.refetch();
    },
  };
}

/**
 * Hook for admin tool management
 */
export function useToolManagement() {
  const statsQuery = useRegistryStats();
  const enableMutation = useEnableTool();
  const disableMutation = useDisableTool();

  return {
    // Stats
    stats: statsQuery.data,
    isStatsLoading: statsQuery.isLoading,
    refetchStats: statsQuery.refetch,

    // Enable/Disable
    enableTool: enableMutation.mutate,
    disableTool: disableMutation.mutate,
    isEnabling: enableMutation.isPending,
    isDisabling: disableMutation.isPending,
  };
}
