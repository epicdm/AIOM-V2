/**
 * Call Summary Data Access Layer
 *
 * Database operations for AI-generated call summaries including
 * key points, action items, and sentiment analysis.
 */

import { eq, desc, and, gte, lte, between, isNull, isNotNull } from "drizzle-orm";
import { database } from "~/db";
import {
  callSummary,
  callRecord,
  user,
  type CallSummary,
  type CreateCallSummaryData,
  type UpdateCallSummaryData,
  type CallSentiment,
  type CallSummaryStatus,
  type CallKeyPoint,
  type CallActionItem,
  type CallSentimentDetails,
} from "~/db/schema";

// =============================================================================
// Types
// =============================================================================

// Type for call summary with related data
export type CallSummaryWithRelations = CallSummary & {
  callRecord: {
    id: string;
    callerId: string;
    callerName: string | null;
    recipientId: string | null;
    recipientName: string | null;
    direction: string;
    duration: number;
    callTimestamp: Date;
    status: string;
  };
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
};

// Parsed call summary with JSON fields parsed
export type ParsedCallSummary = Omit<CallSummary, "keyPoints" | "actionItems" | "sentimentDetails"> & {
  keyPoints: CallKeyPoint[] | null;
  actionItems: CallActionItem[] | null;
  sentimentDetails: CallSentimentDetails | null;
};

export interface CallSummaryFilters {
  userId?: string;
  callRecordId?: string;
  status?: CallSummaryStatus;
  sentiment?: CallSentiment;
  startDate?: Date;
  endDate?: Date;
  hasActionItems?: boolean;
  limit?: number;
  offset?: number;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Parse JSON fields from a call summary
 */
export function parseCallSummary(summary: CallSummary): ParsedCallSummary {
  return {
    ...summary,
    keyPoints: summary.keyPoints ? JSON.parse(summary.keyPoints) as CallKeyPoint[] : null,
    actionItems: summary.actionItems ? JSON.parse(summary.actionItems) as CallActionItem[] : null,
    sentimentDetails: summary.sentimentDetails ? JSON.parse(summary.sentimentDetails) as CallSentimentDetails : null,
  };
}

/**
 * Stringify JSON fields for database storage
 */
export function stringifyCallSummaryFields(data: {
  keyPoints?: CallKeyPoint[] | null;
  actionItems?: CallActionItem[] | null;
  sentimentDetails?: CallSentimentDetails | null;
}): {
  keyPoints?: string | null;
  actionItems?: string | null;
  sentimentDetails?: string | null;
} {
  return {
    keyPoints: data.keyPoints ? JSON.stringify(data.keyPoints) : null,
    actionItems: data.actionItems ? JSON.stringify(data.actionItems) : null,
    sentimentDetails: data.sentimentDetails ? JSON.stringify(data.sentimentDetails) : null,
  };
}

// =============================================================================
// Call Summary CRUD Operations
// =============================================================================

/**
 * Create a new call summary
 */
export async function createCallSummary(
  data: CreateCallSummaryData
): Promise<CallSummary> {
  const [result] = await database
    .insert(callSummary)
    .values({
      ...data,
      updatedAt: new Date(),
    })
    .returning();

  return result;
}

/**
 * Find a call summary by ID
 */
export async function findCallSummaryById(
  id: string
): Promise<CallSummary | null> {
  const [result] = await database
    .select()
    .from(callSummary)
    .where(eq(callSummary.id, id))
    .limit(1);

  return result || null;
}

/**
 * Find a call summary by ID and parse JSON fields
 */
export async function findCallSummaryByIdParsed(
  id: string
): Promise<ParsedCallSummary | null> {
  const result = await findCallSummaryById(id);
  return result ? parseCallSummary(result) : null;
}

/**
 * Find a call summary by call record ID (most recent)
 */
export async function findCallSummaryByCallRecordId(
  callRecordId: string
): Promise<CallSummary | null> {
  const [result] = await database
    .select()
    .from(callSummary)
    .where(eq(callSummary.callRecordId, callRecordId))
    .orderBy(desc(callSummary.createdAt))
    .limit(1);

  return result || null;
}

/**
 * Find a call summary by call record ID and parse JSON fields
 */
export async function findCallSummaryByCallRecordIdParsed(
  callRecordId: string
): Promise<ParsedCallSummary | null> {
  const result = await findCallSummaryByCallRecordId(callRecordId);
  return result ? parseCallSummary(result) : null;
}

/**
 * Find a call summary with all related data
 */
export async function findCallSummaryByIdWithRelations(
  id: string
): Promise<CallSummaryWithRelations | null> {
  const result = await database.query.callSummary.findFirst({
    where: eq(callSummary.id, id),
    with: {
      callRecord: {
        columns: {
          id: true,
          callerId: true,
          callerName: true,
          recipientId: true,
          recipientName: true,
          direction: true,
          duration: true,
          callTimestamp: true,
          status: true,
        },
      },
      user: {
        columns: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });

  return result as CallSummaryWithRelations | null;
}

/**
 * Update a call summary
 */
export async function updateCallSummary(
  id: string,
  data: UpdateCallSummaryData
): Promise<CallSummary | null> {
  const [result] = await database
    .update(callSummary)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(callSummary.id, id))
    .returning();

  return result || null;
}

/**
 * Delete a call summary
 */
export async function deleteCallSummary(id: string): Promise<boolean> {
  const result = await database
    .delete(callSummary)
    .where(eq(callSummary.id, id))
    .returning();

  return result.length > 0;
}

/**
 * Get all call summaries with filters
 */
export async function getAllCallSummaries(
  filters: CallSummaryFilters = {}
): Promise<CallSummary[]> {
  const {
    userId,
    callRecordId,
    status,
    sentiment,
    startDate,
    endDate,
    hasActionItems,
    limit = 50,
    offset = 0,
  } = filters;

  const conditions = [];

  if (userId) {
    conditions.push(eq(callSummary.userId, userId));
  }

  if (callRecordId) {
    conditions.push(eq(callSummary.callRecordId, callRecordId));
  }

  if (status) {
    conditions.push(eq(callSummary.status, status));
  }

  if (sentiment) {
    conditions.push(eq(callSummary.sentiment, sentiment));
  }

  if (startDate && endDate) {
    conditions.push(between(callSummary.createdAt, startDate, endDate));
  } else if (startDate) {
    conditions.push(gte(callSummary.createdAt, startDate));
  } else if (endDate) {
    conditions.push(lte(callSummary.createdAt, endDate));
  }

  if (hasActionItems === true) {
    conditions.push(isNotNull(callSummary.actionItems));
  } else if (hasActionItems === false) {
    conditions.push(isNull(callSummary.actionItems));
  }

  const query = database
    .select()
    .from(callSummary)
    .orderBy(desc(callSummary.createdAt))
    .limit(limit)
    .offset(offset);

  if (conditions.length > 0) {
    return await query.where(and(...conditions));
  }

  return await query;
}

/**
 * Get call summaries for a specific user
 */
export async function getCallSummariesByUser(
  userId: string,
  filters: Omit<CallSummaryFilters, "userId"> = {}
): Promise<CallSummary[]> {
  return await getAllCallSummaries({ ...filters, userId });
}

/**
 * Get all call summaries for a call record
 */
export async function getCallSummariesByCallRecord(
  callRecordId: string
): Promise<CallSummary[]> {
  return await database
    .select()
    .from(callSummary)
    .where(eq(callSummary.callRecordId, callRecordId))
    .orderBy(desc(callSummary.createdAt));
}

/**
 * Check if a call record has a summary
 */
export async function hasCallSummary(callRecordId: string): Promise<boolean> {
  const summary = await findCallSummaryByCallRecordId(callRecordId);
  return summary !== null && summary.status === "completed";
}

/**
 * Get pending summaries (for batch processing)
 */
export async function getPendingSummaries(
  limit: number = 50
): Promise<CallSummary[]> {
  return await database
    .select()
    .from(callSummary)
    .where(eq(callSummary.status, "pending"))
    .orderBy(callSummary.createdAt)
    .limit(limit);
}

/**
 * Update summary status
 */
export async function updateCallSummaryStatus(
  id: string,
  status: CallSummaryStatus,
  errorMessage?: string
): Promise<CallSummary | null> {
  return await updateCallSummary(id, {
    status,
    errorMessage: errorMessage || null,
  });
}

/**
 * Mark action item as completed
 */
export async function markActionItemCompleted(
  summaryId: string,
  actionItemId: string
): Promise<CallSummary | null> {
  const summary = await findCallSummaryByIdParsed(summaryId);
  if (!summary || !summary.actionItems) {
    return null;
  }

  const updatedActionItems = summary.actionItems.map((item) =>
    item.id === actionItemId ? { ...item, completed: true } : item
  );

  return await updateCallSummary(summaryId, {
    actionItems: JSON.stringify(updatedActionItems),
  });
}

/**
 * Get summaries by sentiment
 */
export async function getCallSummariesBySentiment(
  sentiment: CallSentiment,
  userId?: string,
  limit: number = 50
): Promise<CallSummary[]> {
  const conditions = [eq(callSummary.sentiment, sentiment)];

  if (userId) {
    conditions.push(eq(callSummary.userId, userId));
  }

  return await database
    .select()
    .from(callSummary)
    .where(and(...conditions))
    .orderBy(desc(callSummary.createdAt))
    .limit(limit);
}

/**
 * Get summary statistics for a user
 */
export async function getCallSummaryStats(
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalSummaries: number;
  bySentiment: Record<string, number>;
  averageSentimentScore: number | null;
  totalActionItems: number;
  completedActionItems: number;
}> {
  const filters: CallSummaryFilters = { userId, startDate, endDate, limit: 10000 };
  const summaries = await getAllCallSummaries(filters);

  const bySentiment: Record<string, number> = {
    positive: 0,
    neutral: 0,
    negative: 0,
    mixed: 0,
  };

  let totalScore = 0;
  let scoreCount = 0;
  let totalActionItems = 0;
  let completedActionItems = 0;

  for (const summary of summaries) {
    // Count by sentiment
    if (summary.sentiment && bySentiment[summary.sentiment] !== undefined) {
      bySentiment[summary.sentiment]++;
    }

    // Calculate average score
    if (summary.sentimentScore !== null) {
      totalScore += summary.sentimentScore;
      scoreCount++;
    }

    // Count action items
    if (summary.actionItems) {
      try {
        const items = JSON.parse(summary.actionItems) as CallActionItem[];
        totalActionItems += items.length;
        completedActionItems += items.filter((item) => item.completed).length;
      } catch {
        // Ignore parse errors
      }
    }
  }

  return {
    totalSummaries: summaries.length,
    bySentiment,
    averageSentimentScore: scoreCount > 0 ? totalScore / scoreCount : null,
    totalActionItems,
    completedActionItems,
  };
}
