/**
 * Call Summary React Hooks
 *
 * Custom hooks for working with AI-generated call summaries.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  callSummaryQueryOptions,
  callSummaryWithRelationsQueryOptions,
  callSummaryByCallRecordQueryOptions,
  hasCallSummaryQueryOptions,
  callSummariesQueryOptions,
  callSummaryStatsQueryOptions,
  type CallSummariesFilters,
  type CallSummaryStatsFilters,
} from "~/queries/call-summaries";
import {
  generateCallSummaryFn,
  regenerateCallSummaryFn,
  markActionItemCompletedFn,
  deleteCallSummaryFn,
} from "~/fn/call-summaries";
import { getErrorMessage } from "~/utils/error";

// =============================================================================
// Query Hooks
// =============================================================================

/**
 * Hook to get a call summary by ID
 */
export function useCallSummary(summaryId: string, enabled = true) {
  return useQuery({
    ...callSummaryQueryOptions(summaryId),
    enabled: enabled && !!summaryId,
  });
}

/**
 * Hook to get a call summary with relations
 */
export function useCallSummaryWithRelations(summaryId: string, enabled = true) {
  return useQuery({
    ...callSummaryWithRelationsQueryOptions(summaryId),
    enabled: enabled && !!summaryId,
  });
}

/**
 * Hook to get a call summary by call record ID
 */
export function useCallSummaryByCallRecord(callRecordId: string, enabled = true) {
  return useQuery({
    ...callSummaryByCallRecordQueryOptions(callRecordId),
    enabled: enabled && !!callRecordId,
  });
}

/**
 * Hook to check if a call has a summary
 */
export function useHasCallSummary(callRecordId: string, enabled = true) {
  return useQuery({
    ...hasCallSummaryQueryOptions(callRecordId),
    enabled: enabled && !!callRecordId,
  });
}

/**
 * Hook to get all call summaries with filters
 */
export function useCallSummaries(filters?: CallSummariesFilters, enabled = true) {
  return useQuery({
    ...callSummariesQueryOptions(filters),
    enabled,
  });
}

/**
 * Hook to get call summary statistics
 */
export function useCallSummaryStats(filters?: CallSummaryStatsFilters, enabled = true) {
  return useQuery({
    ...callSummaryStatsQueryOptions(filters),
    enabled,
  });
}

// =============================================================================
// Mutation Hooks
// =============================================================================

interface GenerateCallSummaryData {
  callRecordId: string;
  notes?: string;
  transcription?: string;
  forceRegenerate?: boolean;
}

/**
 * Hook to generate a call summary
 */
export function useGenerateCallSummary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: GenerateCallSummaryData) => generateCallSummaryFn({ data }),
    onSuccess: (result, variables) => {
      if (result.isExisting) {
        toast.info("Summary already exists", {
          description: "Returning existing call summary.",
        });
      } else {
        toast.success("Summary generated successfully!", {
          description: "The call has been analyzed and summarized.",
        });
      }
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ["call-summaries"] });
      queryClient.invalidateQueries({ queryKey: ["call-summary", "call-record", variables.callRecordId] });
      queryClient.invalidateQueries({ queryKey: ["call-summary", "has-summary", variables.callRecordId] });
      queryClient.invalidateQueries({ queryKey: ["call-summary-stats"] });
    },
    onError: (error) => {
      toast.error("Failed to generate summary", {
        description: getErrorMessage(error),
      });
    },
  });
}

interface RegenerateCallSummaryData {
  callRecordId: string;
  notes?: string;
}

/**
 * Hook to regenerate a call summary
 */
export function useRegenerateCallSummary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RegenerateCallSummaryData) => regenerateCallSummaryFn({ data }),
    onSuccess: (_, variables) => {
      toast.success("Summary regenerated successfully!", {
        description: "The call has been re-analyzed with fresh insights.",
      });
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ["call-summaries"] });
      queryClient.invalidateQueries({ queryKey: ["call-summary", "call-record", variables.callRecordId] });
      queryClient.invalidateQueries({ queryKey: ["call-summary-stats"] });
    },
    onError: (error) => {
      toast.error("Failed to regenerate summary", {
        description: getErrorMessage(error),
      });
    },
  });
}

interface MarkActionItemData {
  summaryId: string;
  actionItemId: string;
}

/**
 * Hook to mark an action item as completed
 */
export function useMarkActionItemCompleted() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: MarkActionItemData) => markActionItemCompletedFn({ data }),
    onSuccess: (result, variables) => {
      toast.success("Action item completed!", {
        description: "The task has been marked as done.",
      });
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ["call-summary", variables.summaryId] });
      queryClient.invalidateQueries({ queryKey: ["call-summaries"] });
      queryClient.invalidateQueries({ queryKey: ["call-summary-stats"] });
    },
    onError: (error) => {
      toast.error("Failed to update action item", {
        description: getErrorMessage(error),
      });
    },
  });
}

/**
 * Hook to delete a call summary
 */
export function useDeleteCallSummary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteCallSummaryFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Summary deleted successfully!");
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ["call-summaries"] });
      queryClient.invalidateQueries({ queryKey: ["call-summary"] });
      queryClient.invalidateQueries({ queryKey: ["call-summary-stats"] });
    },
    onError: (error) => {
      toast.error("Failed to delete summary", {
        description: getErrorMessage(error),
      });
    },
  });
}

// =============================================================================
// Convenience Hook
// =============================================================================

/**
 * Combined hook for call summary operations on a specific call record
 */
export function useCallSummaryForCall(callRecordId: string) {
  const summaryQuery = useCallSummaryByCallRecord(callRecordId);
  const hasSummaryQuery = useHasCallSummary(callRecordId);
  const generateMutation = useGenerateCallSummary();
  const regenerateMutation = useRegenerateCallSummary();

  return {
    // Data
    summary: summaryQuery.data,
    hasSummary: hasSummaryQuery.data ?? false,

    // Loading states
    isLoading: summaryQuery.isLoading || hasSummaryQuery.isLoading,
    isGenerating: generateMutation.isPending,
    isRegenerating: regenerateMutation.isPending,

    // Error states
    error: summaryQuery.error || hasSummaryQuery.error,
    generateError: generateMutation.error,

    // Actions
    generate: (notes?: string, transcription?: string) =>
      generateMutation.mutate({
        callRecordId,
        notes,
        transcription,
      }),
    regenerate: (notes?: string) =>
      regenerateMutation.mutate({
        callRecordId,
        notes,
      }),

    // Refetch
    refetch: () => {
      summaryQuery.refetch();
      hasSummaryQuery.refetch();
    },
  };
}
