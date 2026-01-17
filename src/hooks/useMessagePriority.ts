/**
 * Message Priority Scoring React Hooks
 *
 * Custom hooks for AI-powered message priority scoring
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  highPriorityThreadsQueryOptions,
  threadsByPriorityQueryOptions,
  threadPriorityQueryOptions,
  priorityStatsQueryOptions,
  messagePriorityKeys,
} from "~/queries/message-priority";
import {
  scoreThreadPriorityFn,
  batchScoreThreadsFn,
  scoreAllPendingFn,
  resetThreadPriorityFn,
} from "~/fn/message-priority";
import { getErrorMessage } from "~/utils/error";
import type { PriorityLevel } from "~/db/schema";

// =============================================================================
// Query Hooks
// =============================================================================

/**
 * Hook to get high priority threads
 */
export function useHighPriorityThreads(limit: number = 10, enabled = true) {
  return useQuery({
    ...highPriorityThreadsQueryOptions(limit),
    enabled,
  });
}

/**
 * Hook to get threads filtered and sorted by priority
 */
export function useThreadsByPriority(
  filters: {
    minScore?: number;
    priorityLevel?: PriorityLevel;
    limit?: number;
    offset?: number;
  },
  enabled = true
) {
  return useQuery({
    ...threadsByPriorityQueryOptions(filters),
    enabled,
  });
}

/**
 * Hook to get priority score for a specific thread
 */
export function useThreadPriority(threadId: string, enabled = true) {
  return useQuery({
    ...threadPriorityQueryOptions(threadId),
    enabled: enabled && !!threadId,
  });
}

/**
 * Hook to get priority statistics
 */
export function usePriorityStats(enabled = true) {
  return useQuery({
    ...priorityStatsQueryOptions(),
    enabled,
  });
}

// =============================================================================
// Mutation Hooks
// =============================================================================

/**
 * Hook to score a single thread's priority
 */
export function useScoreThreadPriority() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      threadId,
      useAI = true,
      forceRescore = false,
    }: {
      threadId: string;
      useAI?: boolean;
      forceRescore?: boolean;
    }) =>
      scoreThreadPriorityFn({
        data: { threadId, useAI, forceRescore },
      }),
    onSuccess: (data, variables) => {
      // Invalidate thread-specific priority
      queryClient.invalidateQueries({
        queryKey: messagePriorityKeys.thread(variables.threadId),
      });
      // Invalidate high priority list
      queryClient.invalidateQueries({
        queryKey: messagePriorityKeys.highPriority(),
      });
      // Invalidate stats
      queryClient.invalidateQueries({
        queryKey: messagePriorityKeys.stats(),
      });
      // Invalidate unified inbox queries
      queryClient.invalidateQueries({ queryKey: ["unified-inbox"] });

      // Show success toast with priority info
      const levelEmoji = {
        critical: "🔴",
        high: "🟠",
        normal: "🟡",
        low: "🟢",
      };
      toast.success("Priority scored", {
        description: `${levelEmoji[data.priorityLevel]} ${data.priorityLevel.charAt(0).toUpperCase() + data.priorityLevel.slice(1)} priority (${data.priorityScore}/100)`,
      });
    },
    onError: (error) => {
      toast.error("Failed to score priority", {
        description: getErrorMessage(error),
      });
    },
  });
}

/**
 * Hook to score multiple threads
 */
export function useBatchScoreThreads() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      threadIds,
      maxThreads = 10,
      useAI = true,
    }: {
      threadIds?: string[];
      maxThreads?: number;
      useAI?: boolean;
    }) =>
      batchScoreThreadsFn({
        data: { threadIds, maxThreads, useAI },
      }),
    onSuccess: (data) => {
      // Invalidate all priority queries
      queryClient.invalidateQueries({
        queryKey: messagePriorityKeys.all,
      });
      // Invalidate unified inbox queries
      queryClient.invalidateQueries({ queryKey: ["unified-inbox"] });

      toast.success("Batch scoring complete", {
        description: `Scored ${data.successful} of ${data.totalProcessed} threads`,
      });
    },
    onError: (error) => {
      toast.error("Failed to score threads", {
        description: getErrorMessage(error),
      });
    },
  });
}

/**
 * Hook to score all pending threads
 */
export function useScoreAllPending() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      useAI = true,
      maxAgeMinutes = 60,
    }: {
      useAI?: boolean;
      maxAgeMinutes?: number;
    } = {}) =>
      scoreAllPendingFn({
        data: { useAI, maxAgeMinutes },
      }),
    onSuccess: (data) => {
      // Invalidate all priority queries
      queryClient.invalidateQueries({
        queryKey: messagePriorityKeys.all,
      });
      // Invalidate unified inbox queries
      queryClient.invalidateQueries({ queryKey: ["unified-inbox"] });

      if (data.totalProcessed > 0) {
        toast.success("Priority scoring complete", {
          description: `Analyzed ${data.successful} messages`,
        });
      } else {
        toast.info("All messages are up to date", {
          description: "No messages needed scoring",
        });
      }
    },
    onError: (error) => {
      toast.error("Failed to score messages", {
        description: getErrorMessage(error),
      });
    },
  });
}

/**
 * Hook to reset a thread's priority
 */
export function useResetThreadPriority() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (threadId: string) =>
      resetThreadPriorityFn({
        data: { threadId },
      }),
    onSuccess: (_, threadId) => {
      // Invalidate thread-specific priority
      queryClient.invalidateQueries({
        queryKey: messagePriorityKeys.thread(threadId),
      });
      // Invalidate high priority list
      queryClient.invalidateQueries({
        queryKey: messagePriorityKeys.highPriority(),
      });
      // Invalidate stats
      queryClient.invalidateQueries({
        queryKey: messagePriorityKeys.stats(),
      });

      toast.success("Priority reset", {
        description: "Thread will be re-scored on next analysis",
      });
    },
    onError: (error) => {
      toast.error("Failed to reset priority", {
        description: getErrorMessage(error),
      });
    },
  });
}

// =============================================================================
// Utility Hooks
// =============================================================================

/**
 * Hook that provides priority level colors for UI
 */
export function usePriorityColors() {
  return {
    critical: {
      bg: "bg-red-100 dark:bg-red-900/30",
      text: "text-red-700 dark:text-red-400",
      border: "border-red-300 dark:border-red-700",
      badge: "bg-red-500 text-white",
    },
    high: {
      bg: "bg-orange-100 dark:bg-orange-900/30",
      text: "text-orange-700 dark:text-orange-400",
      border: "border-orange-300 dark:border-orange-700",
      badge: "bg-orange-500 text-white",
    },
    normal: {
      bg: "bg-yellow-100 dark:bg-yellow-900/30",
      text: "text-yellow-700 dark:text-yellow-400",
      border: "border-yellow-300 dark:border-yellow-700",
      badge: "bg-yellow-500 text-white",
    },
    low: {
      bg: "bg-green-100 dark:bg-green-900/30",
      text: "text-green-700 dark:text-green-400",
      border: "border-green-300 dark:border-green-700",
      badge: "bg-green-500 text-white",
    },
  };
}

/**
 * Get priority level label
 */
export function getPriorityLabel(level: PriorityLevel): string {
  const labels: Record<PriorityLevel, string> = {
    critical: "Critical",
    high: "High",
    normal: "Normal",
    low: "Low",
  };
  return labels[level];
}

/**
 * Get priority level emoji
 */
export function getPriorityEmoji(level: PriorityLevel): string {
  const emojis: Record<PriorityLevel, string> = {
    critical: "🔴",
    high: "🟠",
    normal: "🟡",
    low: "🟢",
  };
  return emojis[level];
}
