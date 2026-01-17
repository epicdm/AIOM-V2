import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  matchedVouchersQueryOptions,
  unmatchedExpenseRequestsQueryOptions,
  unmatchedVouchersQueryOptions,
  reconciliationStatsQueryOptions,
  type ReconciliationQueryParams,
} from "~/queries/expense-reconciliation";
import {
  linkVoucherToRequestFn,
  unlinkVoucherFromRequestFn,
  reconcileMatchFn,
  markWithDiscrepanciesFn,
} from "~/fn/expense-reconciliation";
import { getErrorMessage } from "~/utils/error";

// Query hooks

/**
 * Get matched vouchers with their expense requests
 */
export function useMatchedVouchers(params?: ReconciliationQueryParams, enabled = true) {
  return useQuery({
    ...matchedVouchersQueryOptions(params),
    enabled,
  });
}

/**
 * Get unmatched expense requests
 */
export function useUnmatchedExpenseRequests(params?: ReconciliationQueryParams, enabled = true) {
  return useQuery({
    ...unmatchedExpenseRequestsQueryOptions(params),
    enabled,
  });
}

/**
 * Get unmatched vouchers
 */
export function useUnmatchedVouchers(params?: ReconciliationQueryParams, enabled = true) {
  return useQuery({
    ...unmatchedVouchersQueryOptions(params),
    enabled,
  });
}

/**
 * Get reconciliation statistics
 */
export function useReconciliationStats(enabled = true) {
  return useQuery({
    ...reconciliationStatsQueryOptions(),
    enabled,
  });
}

// Mutation hooks

/**
 * Link a voucher to an expense request (manual matching)
 */
export function useLinkVoucherToRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { voucherId: string; expenseRequestId: string }) =>
      linkVoucherToRequestFn({ data }),
    onSuccess: () => {
      toast.success("Voucher linked!", {
        description: "The voucher has been linked to the expense request.",
      });
      queryClient.invalidateQueries({ queryKey: ["expense-reconciliation"] });
      queryClient.invalidateQueries({ queryKey: ["expense-vouchers"] });
    },
    onError: (error) => {
      toast.error("Failed to link voucher", {
        description: getErrorMessage(error),
      });
    },
  });
}

/**
 * Unlink a voucher from its expense request
 */
export function useUnlinkVoucherFromRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { voucherId: string }) =>
      unlinkVoucherFromRequestFn({ data }),
    onSuccess: () => {
      toast.success("Voucher unlinked!", {
        description: "The voucher has been unlinked from the expense request.",
      });
      queryClient.invalidateQueries({ queryKey: ["expense-reconciliation"] });
      queryClient.invalidateQueries({ queryKey: ["expense-vouchers"] });
    },
    onError: (error) => {
      toast.error("Failed to unlink voucher", {
        description: getErrorMessage(error),
      });
    },
  });
}

/**
 * Reconcile a matched pair
 */
export function useReconcileMatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { voucherId: string; reference: string; notes?: string }) =>
      reconcileMatchFn({ data }),
    onSuccess: () => {
      toast.success("Reconciled successfully!", {
        description: "The expense has been marked as reconciled.",
      });
      queryClient.invalidateQueries({ queryKey: ["expense-reconciliation"] });
      queryClient.invalidateQueries({ queryKey: ["expense-vouchers"] });
    },
    onError: (error) => {
      toast.error("Failed to reconcile", {
        description: getErrorMessage(error),
      });
    },
  });
}

/**
 * Mark a matched pair as having discrepancies
 */
export function useMarkWithDiscrepancies() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { voucherId: string; notes: string }) =>
      markWithDiscrepanciesFn({ data }),
    onSuccess: () => {
      toast.success("Marked with discrepancies", {
        description: "The expense has been flagged for review.",
      });
      queryClient.invalidateQueries({ queryKey: ["expense-reconciliation"] });
      queryClient.invalidateQueries({ queryKey: ["expense-vouchers"] });
    },
    onError: (error) => {
      toast.error("Failed to mark discrepancy", {
        description: getErrorMessage(error),
      });
    },
  });
}
