/**
 * Message Priority Scoring Server Functions
 *
 * API endpoints for AI-powered message priority scoring
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authenticatedMiddleware } from "./middleware";
import {
  getHighPriorityThreads,
  getThreadsByPriority,
  getThreadPriorityScore,
  getPriorityStats,
  resetThreadPriorityScore,
} from "~/data-access/message-priority";
import {
  scoreThreadPriority,
  batchScoreThreadPriorities,
  scoreAllPendingThreads,
} from "~/use-cases/message-priority";
import type { PriorityLevel } from "~/db/schema";

// =============================================================================
// Score a Single Thread
// =============================================================================

/**
 * Score priority for a single thread
 */
export const scoreThreadPriorityFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      threadId: z.string().min(1, "Thread ID is required"),
      useAI: z.boolean().optional().default(true),
      forceRescore: z.boolean().optional().default(false),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const result = await scoreThreadPriority(data.threadId, context.userId, {
      useAI: data.useAI,
      forceRescore: data.forceRescore,
    });

    if (!result.success) {
      throw new Error(result.error || "Failed to score thread priority");
    }

    return result;
  });

// =============================================================================
// Batch Score Threads
// =============================================================================

/**
 * Score priority for multiple threads
 */
export const batchScoreThreadsFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      threadIds: z.array(z.string()).optional(),
      maxThreads: z.number().min(1).max(50).optional().default(10),
      useAI: z.boolean().optional().default(true),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const result = await batchScoreThreadPriorities(context.userId, {
      threadIds: data.threadIds,
      maxThreads: data.maxThreads,
      useAI: data.useAI,
    });

    return result;
  });

// =============================================================================
// Score All Pending Threads
// =============================================================================

/**
 * Score all threads that need scoring (haven't been scored recently)
 */
export const scoreAllPendingFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      useAI: z.boolean().optional().default(true),
      maxAgeMinutes: z.number().min(1).max(1440).optional().default(60),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const result = await scoreAllPendingThreads(context.userId, {
      useAI: data.useAI,
      maxAgeMinutes: data.maxAgeMinutes,
    });

    return result;
  });

// =============================================================================
// Get High Priority Threads
// =============================================================================

/**
 * Get all high priority threads for the user
 */
export const getHighPriorityThreadsFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      limit: z.number().optional().default(10),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const threads = await getHighPriorityThreads(context.userId, data.limit ?? 10);
    return { threads };
  });

// =============================================================================
// Get Threads by Priority
// =============================================================================

/**
 * Get threads filtered and sorted by priority
 */
export const getThreadsByPriorityFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      minScore: z.number().optional(),
      priorityLevel: z.enum(["critical", "high", "normal", "low"]).optional(),
      limit: z.number().optional().default(50),
      offset: z.number().optional().default(0),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const threads = await getThreadsByPriority(context.userId, {
      minScore: data.minScore,
      priorityLevel: data.priorityLevel as PriorityLevel | undefined,
      limit: data.limit ?? 50,
      offset: data.offset ?? 0,
    });

    return {
      threads,
      hasMore: threads.length === (data.limit ?? 50),
    };
  });

// =============================================================================
// Get Thread Priority Score
// =============================================================================

/**
 * Get the priority score for a specific thread
 */
export const getThreadPriorityFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      threadId: z.string().min(1, "Thread ID is required"),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    const priority = await getThreadPriorityScore(data.threadId);

    if (!priority) {
      return {
        priorityScore: null,
        priorityLevel: null,
        priorityFactors: null,
        priorityReason: null,
        scoredAt: null,
        isHighPriority: false,
        needsScoring: true,
      };
    }

    return {
      ...priority,
      needsScoring: !priority.scoredAt,
    };
  });

// =============================================================================
// Get Priority Statistics
// =============================================================================

/**
 * Get priority statistics for the user's inbox
 */
export const getPriorityStatsFn = createServerFn({
  method: "GET",
})
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    const stats = await getPriorityStats(context.userId);
    return stats;
  });

// =============================================================================
// Reset Thread Priority
// =============================================================================

/**
 * Reset priority score for a thread (mark as needing rescore)
 */
export const resetThreadPriorityFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      threadId: z.string().min(1, "Thread ID is required"),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    const result = await resetThreadPriorityScore(data.threadId);

    if (!result) {
      throw new Error("Failed to reset thread priority");
    }

    return { success: true, threadId: data.threadId };
  });
