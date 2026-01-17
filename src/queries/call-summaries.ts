/**
 * Call Summary Query Options
 *
 * TanStack Query options for call summary data fetching.
 */

import { queryOptions } from "@tanstack/react-query";
import {
  getCallSummaryByIdFn,
  getCallSummaryWithRelationsFn,
  getCallSummaryByCallRecordIdFn,
  hasCallSummaryFn,
  getCallSummariesFn,
  getCallSummaryStatsFn,
  type SentimentType,
  type SummaryStatus,
} from "~/fn/call-summaries";

// =============================================================================
// Query Options
// =============================================================================

/**
 * Query options for getting a call summary by ID
 */
export const callSummaryQueryOptions = (summaryId: string) =>
  queryOptions({
    queryKey: ["call-summary", summaryId],
    queryFn: () => getCallSummaryByIdFn({ data: { id: summaryId } }),
    enabled: !!summaryId,
  });

/**
 * Query options for getting a call summary with relations
 */
export const callSummaryWithRelationsQueryOptions = (summaryId: string) =>
  queryOptions({
    queryKey: ["call-summary", summaryId, "relations"],
    queryFn: () => getCallSummaryWithRelationsFn({ data: { id: summaryId } }),
    enabled: !!summaryId,
  });

/**
 * Query options for getting a call summary by call record ID
 */
export const callSummaryByCallRecordQueryOptions = (callRecordId: string) =>
  queryOptions({
    queryKey: ["call-summary", "call-record", callRecordId],
    queryFn: () => getCallSummaryByCallRecordIdFn({ data: { callRecordId } }),
    enabled: !!callRecordId,
  });

/**
 * Query options for checking if a call has a summary
 */
export const hasCallSummaryQueryOptions = (callRecordId: string) =>
  queryOptions({
    queryKey: ["call-summary", "has-summary", callRecordId],
    queryFn: () => hasCallSummaryFn({ data: { callRecordId } }),
    enabled: !!callRecordId,
  });

/**
 * Filters for call summaries list query
 */
export interface CallSummariesFilters {
  sentiment?: SentimentType;
  status?: SummaryStatus;
  startDate?: string;
  endDate?: string;
  hasActionItems?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Query options for getting all call summaries with filters
 */
export const callSummariesQueryOptions = (filters?: CallSummariesFilters) =>
  queryOptions({
    queryKey: ["call-summaries", filters],
    queryFn: () =>
      getCallSummariesFn({
        data: {
          sentiment: filters?.sentiment,
          status: filters?.status,
          startDate: filters?.startDate,
          endDate: filters?.endDate,
          hasActionItems: filters?.hasActionItems,
          limit: filters?.limit || 50,
          offset: filters?.offset || 0,
        },
      }),
  });

/**
 * Filters for call summary statistics query
 */
export interface CallSummaryStatsFilters {
  startDate?: string;
  endDate?: string;
}

/**
 * Query options for getting call summary statistics
 */
export const callSummaryStatsQueryOptions = (filters?: CallSummaryStatsFilters) =>
  queryOptions({
    queryKey: ["call-summary-stats", filters],
    queryFn: () =>
      getCallSummaryStatsFn({
        data: {
          startDate: filters?.startDate,
          endDate: filters?.endDate,
        },
      }),
  });
