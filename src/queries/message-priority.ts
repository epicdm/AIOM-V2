/**
 * Message Priority Scoring Query Options
 *
 * TanStack Query options for message priority scoring
 */

import { queryOptions } from "@tanstack/react-query";
import {
  getHighPriorityThreadsFn,
  getThreadsByPriorityFn,
  getThreadPriorityFn,
  getPriorityStatsFn,
} from "~/fn/message-priority";
import type { PriorityLevel } from "~/db/schema";

// =============================================================================
// Query Keys
// =============================================================================

export const messagePriorityKeys = {
  all: ["message-priority"] as const,
  highPriority: (limit?: number) =>
    [...messagePriorityKeys.all, "high-priority", { limit }] as const,
  byPriority: (filters: {
    minScore?: number;
    priorityLevel?: PriorityLevel;
    limit?: number;
    offset?: number;
  }) => [...messagePriorityKeys.all, "by-priority", filters] as const,
  thread: (threadId: string) =>
    [...messagePriorityKeys.all, "thread", threadId] as const,
  stats: () => [...messagePriorityKeys.all, "stats"] as const,
};

// =============================================================================
// Query Options
// =============================================================================

/**
 * Get high priority threads
 */
export const highPriorityThreadsQueryOptions = (limit: number = 10) =>
  queryOptions({
    queryKey: messagePriorityKeys.highPriority(limit),
    queryFn: () => getHighPriorityThreadsFn({ data: { limit } }),
    staleTime: 1000 * 60 * 2, // Consider fresh for 2 minutes
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
  });

/**
 * Get threads filtered and sorted by priority
 */
export const threadsByPriorityQueryOptions = (filters: {
  minScore?: number;
  priorityLevel?: PriorityLevel;
  limit?: number;
  offset?: number;
}) =>
  queryOptions({
    queryKey: messagePriorityKeys.byPriority(filters),
    queryFn: () =>
      getThreadsByPriorityFn({
        data: {
          minScore: filters.minScore,
          priorityLevel: filters.priorityLevel,
          limit: filters.limit ?? 50,
          offset: filters.offset ?? 0,
        },
      }),
    staleTime: 1000 * 60 * 2,
  });

/**
 * Get priority score for a specific thread
 */
export const threadPriorityQueryOptions = (threadId: string) =>
  queryOptions({
    queryKey: messagePriorityKeys.thread(threadId),
    queryFn: () => getThreadPriorityFn({ data: { threadId } }),
    staleTime: 1000 * 60 * 5, // Consider fresh for 5 minutes
    enabled: !!threadId,
  });

/**
 * Get priority statistics
 */
export const priorityStatsQueryOptions = () =>
  queryOptions({
    queryKey: messagePriorityKeys.stats(),
    queryFn: () => getPriorityStatsFn(),
    staleTime: 1000 * 60 * 2,
    refetchInterval: 1000 * 60 * 5,
  });
