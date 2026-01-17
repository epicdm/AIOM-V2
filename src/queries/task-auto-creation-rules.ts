/**
 * TanStack Query Options for Task Auto-Creation Rules
 *
 * Provides query configurations for fetching task rule data
 * with caching and refetch strategies.
 */

import { queryOptions } from "@tanstack/react-query";
import {
  listRulesFn,
  listMyRulesFn,
  getRuleFn,
  getRuleStatisticsFn,
  getRuleStatsByIdFn,
  getRuleExecutionLogsFn,
  getRecentExecutionLogsFn,
  canTriggerRuleFn,
} from "~/fn/task-auto-creation-rules";
import type { TaskRuleTriggerType, TaskRuleStatus } from "~/data-access/task-auto-creation-rules";

// =============================================================================
// Query Options
// =============================================================================

/**
 * Query options for fetching all rules with filters
 */
export const taskRulesQueryOptions = (filters?: {
  status?: TaskRuleStatus;
  triggerType?: TaskRuleTriggerType;
  limit?: number;
  offset?: number;
}) =>
  queryOptions({
    queryKey: ["task-rules", "list", filters],
    queryFn: () => listRulesFn({ data: filters }),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

/**
 * Query options for fetching rules created by the current user
 */
export const myTaskRulesQueryOptions = (filters?: {
  status?: TaskRuleStatus;
  triggerType?: TaskRuleTriggerType;
  limit?: number;
  offset?: number;
}) =>
  queryOptions({
    queryKey: ["task-rules", "my-rules", filters],
    queryFn: () => listMyRulesFn({ data: filters }),
    staleTime: 2 * 60 * 1000,
  });

/**
 * Query options for fetching a single rule by ID
 */
export const taskRuleQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["task-rules", "detail", id],
    queryFn: () => getRuleFn({ data: { id } }),
    staleTime: 1 * 60 * 1000, // 1 minute
    enabled: !!id,
  });

/**
 * Query options for fetching overall rule statistics
 */
export const taskRuleStatisticsQueryOptions = () =>
  queryOptions({
    queryKey: ["task-rules", "statistics"],
    queryFn: () => getRuleStatisticsFn(),
    staleTime: 1 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  });

/**
 * Query options for fetching statistics for a specific rule
 */
export const taskRuleStatsQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["task-rules", "stats", id],
    queryFn: () => getRuleStatsByIdFn({ data: { id } }),
    staleTime: 1 * 60 * 1000,
    enabled: !!id,
  });

/**
 * Query options for fetching execution logs for a rule
 */
export const ruleExecutionLogsQueryOptions = (
  ruleId: string,
  options?: {
    limit?: number;
    offset?: number;
    successOnly?: boolean;
  }
) =>
  queryOptions({
    queryKey: ["task-rules", "execution-logs", ruleId, options],
    queryFn: () =>
      getRuleExecutionLogsFn({
        data: {
          ruleId,
          limit: options?.limit ?? 20,
          offset: options?.offset ?? 0,
          successOnly: options?.successOnly,
        },
      }),
    staleTime: 30 * 1000, // 30 seconds
    enabled: !!ruleId,
  });

/**
 * Query options for fetching recent execution logs across all rules
 */
export const recentExecutionLogsQueryOptions = (options?: {
  limit?: number;
  offset?: number;
  since?: string;
}) =>
  queryOptions({
    queryKey: ["task-rules", "recent-logs", options],
    queryFn: () => getRecentExecutionLogsFn({ data: options }),
    staleTime: 30 * 1000,
  });

/**
 * Query options for checking if a rule can be triggered
 */
export const canTriggerRuleQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["task-rules", "can-trigger", id],
    queryFn: () => canTriggerRuleFn({ data: { id } }),
    staleTime: 10 * 1000, // 10 seconds
    enabled: !!id,
  });
