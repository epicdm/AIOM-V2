/**
 * Message Priority Scoring Data Access Layer
 *
 * Handles database operations for AI-powered message priority scoring
 */

import { eq, and, desc, gte, sql } from "drizzle-orm";
import { database } from "~/db";
import {
  unifiedInboxThread,
  type UnifiedInboxThread,
  type PriorityLevel,
  type PriorityFactors,
} from "~/db/schema";

// =============================================================================
// Priority Score Update Operations
// =============================================================================

/**
 * Update the priority score for a unified inbox thread
 */
export async function updateThreadPriorityScore(
  threadId: string,
  priorityData: {
    priorityScore: number;
    priorityLevel: PriorityLevel;
    priorityFactors: PriorityFactors;
    priorityReason: string;
  }
): Promise<UnifiedInboxThread | null> {
  const isHighPriority = priorityData.priorityLevel === "critical" || priorityData.priorityLevel === "high";

  const [updated] = await database
    .update(unifiedInboxThread)
    .set({
      priorityScore: priorityData.priorityScore,
      priorityLevel: priorityData.priorityLevel,
      priorityFactors: priorityData.priorityFactors,
      priorityReason: priorityData.priorityReason,
      isHighPriority,
      scoredAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(unifiedInboxThread.id, threadId))
    .returning();

  return updated || null;
}

/**
 * Batch update priority scores for multiple threads
 */
export async function batchUpdateThreadPriorityScores(
  updates: Array<{
    threadId: string;
    priorityScore: number;
    priorityLevel: PriorityLevel;
    priorityFactors: PriorityFactors;
    priorityReason: string;
  }>
): Promise<number> {
  let updatedCount = 0;

  for (const update of updates) {
    const result = await updateThreadPriorityScore(update.threadId, update);
    if (result) {
      updatedCount++;
    }
  }

  return updatedCount;
}

// =============================================================================
// Priority Score Query Operations
// =============================================================================

/**
 * Get high priority threads for a user
 */
export async function getHighPriorityThreads(
  userId: string,
  limit: number = 10
): Promise<UnifiedInboxThread[]> {
  const results = await database
    .select()
    .from(unifiedInboxThread)
    .where(
      and(
        eq(unifiedInboxThread.userId, userId),
        eq(unifiedInboxThread.isHighPriority, true),
        eq(unifiedInboxThread.status, "active")
      )
    )
    .orderBy(desc(unifiedInboxThread.priorityScore))
    .limit(limit);

  return results;
}

/**
 * Get threads sorted by priority score
 */
export async function getThreadsByPriority(
  userId: string,
  options?: {
    minScore?: number;
    priorityLevel?: PriorityLevel;
    limit?: number;
    offset?: number;
  }
): Promise<UnifiedInboxThread[]> {
  const conditions = [
    eq(unifiedInboxThread.userId, userId),
    eq(unifiedInboxThread.status, "active"),
  ];

  if (options?.minScore !== undefined) {
    conditions.push(gte(unifiedInboxThread.priorityScore, options.minScore));
  }

  if (options?.priorityLevel) {
    conditions.push(eq(unifiedInboxThread.priorityLevel, options.priorityLevel));
  }

  const results = await database
    .select()
    .from(unifiedInboxThread)
    .where(and(...conditions))
    .orderBy(desc(unifiedInboxThread.priorityScore))
    .limit(options?.limit ?? 50)
    .offset(options?.offset ?? 0);

  return results;
}

/**
 * Get threads that need priority scoring (haven't been scored recently)
 */
export async function getThreadsNeedingScoring(
  userId: string,
  options?: {
    maxAgeMinutes?: number;
    limit?: number;
  }
): Promise<UnifiedInboxThread[]> {
  const maxAge = options?.maxAgeMinutes ?? 60; // Default: rescore if older than 1 hour
  const cutoffTime = new Date(Date.now() - maxAge * 60 * 1000);

  const results = await database
    .select()
    .from(unifiedInboxThread)
    .where(
      and(
        eq(unifiedInboxThread.userId, userId),
        eq(unifiedInboxThread.status, "active"),
        sql`(${unifiedInboxThread.scoredAt} IS NULL OR ${unifiedInboxThread.scoredAt} < ${cutoffTime})`
      )
    )
    .orderBy(desc(unifiedInboxThread.lastMessageAt))
    .limit(options?.limit ?? 20);

  return results;
}

/**
 * Get priority statistics for a user
 */
export async function getPriorityStats(userId: string): Promise<{
  totalThreads: number;
  highPriorityCount: number;
  criticalCount: number;
  averageScore: number;
}> {
  const [stats] = await database
    .select({
      totalThreads: sql<number>`count(*)::int`,
      highPriorityCount: sql<number>`count(*) FILTER (WHERE ${unifiedInboxThread.isHighPriority} = true)::int`,
      criticalCount: sql<number>`count(*) FILTER (WHERE ${unifiedInboxThread.priorityLevel} = 'critical')::int`,
      averageScore: sql<number>`COALESCE(avg(${unifiedInboxThread.priorityScore}), 0)::float`,
    })
    .from(unifiedInboxThread)
    .where(
      and(
        eq(unifiedInboxThread.userId, userId),
        eq(unifiedInboxThread.status, "active")
      )
    );

  return {
    totalThreads: stats?.totalThreads ?? 0,
    highPriorityCount: stats?.highPriorityCount ?? 0,
    criticalCount: stats?.criticalCount ?? 0,
    averageScore: stats?.averageScore ?? 0,
  };
}

/**
 * Reset priority score for a thread (mark as needing rescore)
 */
export async function resetThreadPriorityScore(
  threadId: string
): Promise<UnifiedInboxThread | null> {
  const [updated] = await database
    .update(unifiedInboxThread)
    .set({
      priorityScore: 0,
      priorityLevel: "normal",
      priorityFactors: null,
      priorityReason: null,
      isHighPriority: false,
      scoredAt: null,
      updatedAt: new Date(),
    })
    .where(eq(unifiedInboxThread.id, threadId))
    .returning();

  return updated || null;
}

/**
 * Get the priority score for a specific thread
 */
export async function getThreadPriorityScore(
  threadId: string
): Promise<{
  priorityScore: number | null;
  priorityLevel: string | null;
  priorityFactors: PriorityFactors | null;
  priorityReason: string | null;
  scoredAt: Date | null;
  isHighPriority: boolean;
} | null> {
  const [thread] = await database
    .select({
      priorityScore: unifiedInboxThread.priorityScore,
      priorityLevel: unifiedInboxThread.priorityLevel,
      priorityFactors: unifiedInboxThread.priorityFactors,
      priorityReason: unifiedInboxThread.priorityReason,
      scoredAt: unifiedInboxThread.scoredAt,
      isHighPriority: unifiedInboxThread.isHighPriority,
    })
    .from(unifiedInboxThread)
    .where(eq(unifiedInboxThread.id, threadId))
    .limit(1);

  if (!thread) return null;

  return {
    priorityScore: thread.priorityScore,
    priorityLevel: thread.priorityLevel,
    priorityFactors: thread.priorityFactors as PriorityFactors | null,
    priorityReason: thread.priorityReason,
    scoredAt: thread.scoredAt,
    isHighPriority: thread.isHighPriority,
  };
}
