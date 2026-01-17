/**
 * Call Summary Server Functions
 *
 * TanStack Start server functions for generating and managing
 * AI-powered call summaries.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authenticatedMiddleware } from "./middleware";
import {
  findCallSummaryById,
  findCallSummaryByIdParsed,
  findCallSummaryByCallRecordId,
  findCallSummaryByCallRecordIdParsed,
  findCallSummaryByIdWithRelations,
  getAllCallSummaries,
  getCallSummariesByUser,
  deleteCallSummary,
  markActionItemCompleted,
  getCallSummaryStats,
  hasCallSummary,
  parseCallSummary,
  type CallSummaryFilters,
} from "~/data-access/call-summaries";
import { findCallRecordById } from "~/data-access/call-records";
import {
  generateCallSummary,
  regenerateCallSummary,
} from "~/use-cases/call-summary";

// =============================================================================
// Types
// =============================================================================

// Sentiment types
export const SENTIMENT_TYPES = ["positive", "neutral", "negative", "mixed"] as const;
export type SentimentType = (typeof SENTIMENT_TYPES)[number];

// Summary status types
export const SUMMARY_STATUSES = ["pending", "processing", "completed", "failed"] as const;
export type SummaryStatus = (typeof SUMMARY_STATUSES)[number];

// =============================================================================
// Query Server Functions
// =============================================================================

/**
 * Get a call summary by ID
 */
export const getCallSummaryByIdFn = createServerFn({
  method: "GET",
})
  .inputValidator(z.object({ id: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    const summary = await findCallSummaryByIdParsed(data.id);
    if (!summary) {
      throw new Error("Call summary not found");
    }
    return summary;
  });

/**
 * Get a call summary by ID with relations
 */
export const getCallSummaryWithRelationsFn = createServerFn({
  method: "GET",
})
  .inputValidator(z.object({ id: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    const summary = await findCallSummaryByIdWithRelations(data.id);
    if (!summary) {
      throw new Error("Call summary not found");
    }
    // Parse JSON fields
    return {
      ...summary,
      keyPoints: summary.keyPoints ? JSON.parse(summary.keyPoints) : null,
      actionItems: summary.actionItems ? JSON.parse(summary.actionItems) : null,
      sentimentDetails: summary.sentimentDetails ? JSON.parse(summary.sentimentDetails) : null,
    };
  });

/**
 * Get a call summary by call record ID
 */
export const getCallSummaryByCallRecordIdFn = createServerFn({
  method: "GET",
})
  .inputValidator(z.object({ callRecordId: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    const summary = await findCallSummaryByCallRecordIdParsed(data.callRecordId);
    return summary; // Can be null if no summary exists
  });

/**
 * Check if a call record has a summary
 */
export const hasCallSummaryFn = createServerFn({
  method: "GET",
})
  .inputValidator(z.object({ callRecordId: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    return await hasCallSummary(data.callRecordId);
  });

/**
 * Get all call summaries with filters
 */
export const getCallSummariesFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      sentiment: z.enum(SENTIMENT_TYPES).optional(),
      status: z.enum(SUMMARY_STATUSES).optional(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      hasActionItems: z.boolean().optional(),
      limit: z.number().int().positive().max(100).optional().default(50),
      offset: z.number().int().min(0).optional().default(0),
    }).optional()
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const filters: CallSummaryFilters = {
      userId: context.userId,
      sentiment: data?.sentiment,
      status: data?.status,
      startDate: data?.startDate ? new Date(data.startDate) : undefined,
      endDate: data?.endDate ? new Date(data.endDate) : undefined,
      hasActionItems: data?.hasActionItems,
      limit: data?.limit || 50,
      offset: data?.offset || 0,
    };

    const summaries = await getAllCallSummaries(filters);

    // Parse JSON fields for each summary
    return summaries.map(parseCallSummary);
  });

/**
 * Get call summary statistics
 */
export const getCallSummaryStatsFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
    }).optional()
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const stats = await getCallSummaryStats(
      context.userId,
      data?.startDate ? new Date(data.startDate) : undefined,
      data?.endDate ? new Date(data.endDate) : undefined
    );
    return stats;
  });

// =============================================================================
// Mutation Server Functions
// =============================================================================

/**
 * Generate a call summary for a call record
 */
export const generateCallSummaryFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      callRecordId: z.string().min(1, "Call record ID is required"),
      notes: z.string().max(10000, "Notes must be less than 10000 characters").optional(),
      transcription: z.string().max(100000, "Transcription must be less than 100000 characters").optional(),
      forceRegenerate: z.boolean().optional().default(false),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // Verify the call record exists
    const callRecord = await findCallRecordById(data.callRecordId);
    if (!callRecord) {
      throw new Error("Call record not found");
    }

    // Generate the summary
    const result = await generateCallSummary({
      callRecordId: data.callRecordId,
      userId: context.userId,
      notes: data.notes,
      transcription: data.transcription,
      forceRegenerate: data.forceRegenerate,
    });

    if (!result.success) {
      throw new Error(result.error || "Failed to generate summary");
    }

    return {
      summary: result.summary,
      isExisting: result.isExisting || false,
    };
  });

/**
 * Regenerate a call summary (force new generation)
 */
export const regenerateCallSummaryFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      callRecordId: z.string().min(1, "Call record ID is required"),
      notes: z.string().max(10000).optional(),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // Verify the call record exists
    const callRecord = await findCallRecordById(data.callRecordId);
    if (!callRecord) {
      throw new Error("Call record not found");
    }

    const result = await regenerateCallSummary(
      data.callRecordId,
      context.userId,
      data.notes
    );

    if (!result.success) {
      throw new Error(result.error || "Failed to regenerate summary");
    }

    return result.summary;
  });

/**
 * Mark an action item as completed
 */
export const markActionItemCompletedFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      summaryId: z.string().min(1, "Summary ID is required"),
      actionItemId: z.string().min(1, "Action item ID is required"),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    const summary = await findCallSummaryById(data.summaryId);
    if (!summary) {
      throw new Error("Call summary not found");
    }

    const updatedSummary = await markActionItemCompleted(
      data.summaryId,
      data.actionItemId
    );

    if (!updatedSummary) {
      throw new Error("Failed to update action item");
    }

    return parseCallSummary(updatedSummary);
  });

/**
 * Delete a call summary
 */
export const deleteCallSummaryFn = createServerFn({
  method: "POST",
})
  .inputValidator(z.object({ id: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    const summary = await findCallSummaryById(data.id);
    if (!summary) {
      throw new Error("Call summary not found");
    }

    const deleted = await deleteCallSummary(data.id);
    if (!deleted) {
      throw new Error("Failed to delete summary");
    }

    return { success: true };
  });
