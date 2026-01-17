/**
 * React Hooks for Task Auto-Creation Rules
 *
 * Provides React hooks for fetching and managing task auto-creation rules
 * using TanStack Query.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  taskRulesQueryOptions,
  myTaskRulesQueryOptions,
  taskRuleQueryOptions,
  taskRuleStatisticsQueryOptions,
  taskRuleStatsQueryOptions,
  ruleExecutionLogsQueryOptions,
  recentExecutionLogsQueryOptions,
  canTriggerRuleQueryOptions,
} from "~/queries/task-auto-creation-rules";
import {
  createRuleFn,
  updateRuleFn,
  deleteRuleFn,
  activateRuleFn,
  pauseRuleFn,
  disableRuleFn,
  archiveRuleFn,
  manualTriggerRuleFn,
  testRuleConditionsFn,
  previewTaskFn,
} from "~/fn/task-auto-creation-rules";
import type {
  TaskRuleTriggerType,
  TaskRuleStatus,
  TaskTemplateConfig,
  TaskRuleConditionsConfig,
} from "~/data-access/task-auto-creation-rules";

// =============================================================================
// Query Hooks
// =============================================================================

/**
 * Hook for fetching all rules with filters
 */
export function useTaskRules(
  filters?: {
    status?: TaskRuleStatus;
    triggerType?: TaskRuleTriggerType;
    limit?: number;
    offset?: number;
  },
  enabled: boolean = true
) {
  return useQuery({
    ...taskRulesQueryOptions(filters),
    enabled,
  });
}

/**
 * Hook for fetching rules created by the current user
 */
export function useMyTaskRules(
  filters?: {
    status?: TaskRuleStatus;
    triggerType?: TaskRuleTriggerType;
    limit?: number;
    offset?: number;
  },
  enabled: boolean = true
) {
  return useQuery({
    ...myTaskRulesQueryOptions(filters),
    enabled,
  });
}

/**
 * Hook for fetching a single rule by ID
 */
export function useTaskRule(id: string, enabled: boolean = true) {
  return useQuery({
    ...taskRuleQueryOptions(id),
    enabled: enabled && !!id,
  });
}

/**
 * Hook for fetching overall rule statistics
 */
export function useTaskRuleStatistics(enabled: boolean = true) {
  return useQuery({
    ...taskRuleStatisticsQueryOptions(),
    enabled,
  });
}

/**
 * Hook for fetching statistics for a specific rule
 */
export function useTaskRuleStats(id: string, enabled: boolean = true) {
  return useQuery({
    ...taskRuleStatsQueryOptions(id),
    enabled: enabled && !!id,
  });
}

/**
 * Hook for fetching execution logs for a rule
 */
export function useRuleExecutionLogs(
  ruleId: string,
  options?: {
    limit?: number;
    offset?: number;
    successOnly?: boolean;
  },
  enabled: boolean = true
) {
  return useQuery({
    ...ruleExecutionLogsQueryOptions(ruleId, options),
    enabled: enabled && !!ruleId,
  });
}

/**
 * Hook for fetching recent execution logs across all rules
 */
export function useRecentExecutionLogs(
  options?: {
    limit?: number;
    offset?: number;
    since?: string;
  },
  enabled: boolean = true
) {
  return useQuery({
    ...recentExecutionLogsQueryOptions(options),
    enabled,
  });
}

/**
 * Hook for checking if a rule can be triggered
 */
export function useCanTriggerRule(id: string, enabled: boolean = true) {
  return useQuery({
    ...canTriggerRuleQueryOptions(id),
    enabled: enabled && !!id,
  });
}

// =============================================================================
// Mutation Hooks
// =============================================================================

/**
 * Hook for creating a new rule
 */
export function useCreateTaskRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      name: string;
      description?: string;
      triggerType: TaskRuleTriggerType;
      conditions?: TaskRuleConditionsConfig;
      taskTemplate: TaskTemplateConfig;
      schedule?: string;
      cooldownMinutes?: number;
      maxTriggersPerDay?: number;
      priority?: number;
    }) => createRuleFn({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-rules"] });
    },
  });
}

/**
 * Hook for updating a rule
 */
export function useUpdateTaskRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      id: string;
      name?: string;
      description?: string | null;
      triggerType?: TaskRuleTriggerType;
      conditions?: TaskRuleConditionsConfig | null;
      taskTemplate?: TaskTemplateConfig;
      status?: TaskRuleStatus;
      schedule?: string | null;
      cooldownMinutes?: number;
      maxTriggersPerDay?: number | null;
      priority?: number;
    }) => updateRuleFn({ data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["task-rules"] });
      queryClient.invalidateQueries({ queryKey: ["task-rules", "detail", variables.id] });
    },
  });
}

/**
 * Hook for deleting a rule
 */
export function useDeleteTaskRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteRuleFn({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-rules"] });
    },
  });
}

/**
 * Hook for activating a rule
 */
export function useActivateRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => activateRuleFn({ data: { id } }),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["task-rules"] });
      queryClient.invalidateQueries({ queryKey: ["task-rules", "detail", id] });
    },
  });
}

/**
 * Hook for pausing a rule
 */
export function usePauseRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => pauseRuleFn({ data: { id } }),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["task-rules"] });
      queryClient.invalidateQueries({ queryKey: ["task-rules", "detail", id] });
    },
  });
}

/**
 * Hook for disabling a rule
 */
export function useDisableRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => disableRuleFn({ data: { id } }),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["task-rules"] });
      queryClient.invalidateQueries({ queryKey: ["task-rules", "detail", id] });
    },
  });
}

/**
 * Hook for archiving a rule
 */
export function useArchiveRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => archiveRuleFn({ data: { id } }),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["task-rules"] });
      queryClient.invalidateQueries({ queryKey: ["task-rules", "detail", id] });
    },
  });
}

/**
 * Hook for manually triggering a rule
 */
export function useManualTriggerRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { id: string; data?: Record<string, unknown> }) =>
      manualTriggerRuleFn({ data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["task-rules", "detail", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["task-rules", "stats", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["task-rules", "execution-logs", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["task-rules", "statistics"] });
    },
  });
}

/**
 * Hook for testing rule conditions
 */
export function useTestRuleConditions() {
  return useMutation({
    mutationFn: (data: { id: string; sampleData: Record<string, unknown> }) =>
      testRuleConditionsFn({ data }),
  });
}

/**
 * Hook for previewing task generation
 */
export function usePreviewTask() {
  return useMutation({
    mutationFn: (data: { template: TaskTemplateConfig; sampleData: Record<string, unknown> }) =>
      previewTaskFn({ data }),
  });
}

// =============================================================================
// Invalidation Hook
// =============================================================================

/**
 * Hook for invalidating task rule queries
 */
export function useInvalidateTaskRuleQueries() {
  const queryClient = useQueryClient();

  return {
    /**
     * Invalidate all task rule queries
     */
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: ["task-rules"] });
    },

    /**
     * Invalidate rule list queries
     */
    invalidateList: () => {
      queryClient.invalidateQueries({ queryKey: ["task-rules", "list"] });
      queryClient.invalidateQueries({ queryKey: ["task-rules", "my-rules"] });
    },

    /**
     * Invalidate a specific rule
     */
    invalidateRule: (id: string) => {
      queryClient.invalidateQueries({ queryKey: ["task-rules", "detail", id] });
      queryClient.invalidateQueries({ queryKey: ["task-rules", "stats", id] });
      queryClient.invalidateQueries({ queryKey: ["task-rules", "execution-logs", id] });
    },

    /**
     * Invalidate statistics
     */
    invalidateStatistics: () => {
      queryClient.invalidateQueries({ queryKey: ["task-rules", "statistics"] });
    },

    /**
     * Invalidate execution logs
     */
    invalidateExecutionLogs: () => {
      queryClient.invalidateQueries({ queryKey: ["task-rules", "recent-logs"] });
    },
  };
}

// =============================================================================
// Combined Dashboard Hook
// =============================================================================

/**
 * Hook for fetching all data needed for the rules dashboard
 */
export function useTaskRulesDashboard(enabled: boolean = true) {
  const statistics = useTaskRuleStatistics(enabled);
  const activeRules = useTaskRules({ status: "active", limit: 10 }, enabled);
  const recentLogs = useRecentExecutionLogs({ limit: 10 }, enabled);

  return {
    statistics,
    activeRules,
    recentLogs,
    isLoading: statistics.isLoading || activeRules.isLoading || recentLogs.isLoading,
    isError: statistics.isError || activeRules.isError || recentLogs.isError,
    error: statistics.error || activeRules.error || recentLogs.error,
  };
}
