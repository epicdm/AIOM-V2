/**
 * Expense GL Posting Query Definitions
 *
 * TanStack Query definitions for expense GL posting operations.
 */

import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  postExpenseVoucherToGLFn,
  batchPostExpenseVouchersToGLFn,
  autoPostPendingVouchersToGLFn,
  reverseExpenseGLPostingFn,
  getExpenseGLPostingStatusFn,
  getExpenseGLAccountsFn,
  getExpenseJournalsFn,
  validateGLAccountCodeFn,
} from "~/fn/expense-gl-posting";

// =============================================================================
// Query Keys
// =============================================================================

export const expenseGLPostingKeys = {
  all: ["expense-gl-posting"] as const,
  accounts: () => [...expenseGLPostingKeys.all, "accounts"] as const,
  journals: () => [...expenseGLPostingKeys.all, "journals"] as const,
  status: (voucherId: string) => [...expenseGLPostingKeys.all, "status", voucherId] as const,
  validation: (accountCode: string) => [...expenseGLPostingKeys.all, "validation", accountCode] as const,
};

// =============================================================================
// Query Options
// =============================================================================

/**
 * Query options for fetching available GL accounts
 */
export const expenseGLAccountsQueryOptions = queryOptions({
  queryKey: expenseGLPostingKeys.accounts(),
  queryFn: () => getExpenseGLAccountsFn(),
  staleTime: 5 * 60 * 1000, // 5 minutes - accounts don't change often
});

/**
 * Query options for fetching available journals
 */
export const expenseJournalsQueryOptions = queryOptions({
  queryKey: expenseGLPostingKeys.journals(),
  queryFn: () => getExpenseJournalsFn(),
  staleTime: 5 * 60 * 1000, // 5 minutes
});

/**
 * Query options for fetching GL posting status of a voucher
 */
export function expenseGLPostingStatusQueryOptions(voucherId: string) {
  return queryOptions({
    queryKey: expenseGLPostingKeys.status(voucherId),
    queryFn: () => getExpenseGLPostingStatusFn({ data: { voucherId } }),
    enabled: !!voucherId,
  });
}

/**
 * Query options for validating a GL account code
 */
export function validateGLAccountQueryOptions(accountCode: string) {
  return queryOptions({
    queryKey: expenseGLPostingKeys.validation(accountCode),
    queryFn: () => validateGLAccountCodeFn({ data: { accountCode } }),
    enabled: !!accountCode && accountCode.length > 0,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// =============================================================================
// Mutation Hooks
// =============================================================================

/**
 * Hook for posting a single expense voucher to GL
 */
export function usePostExpenseVoucherToGL() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      voucherId: string;
      options?: {
        postingDate?: string;
        journalCode?: string;
        apAccountCode?: string;
      };
    }) => {
      return postExpenseVoucherToGLFn({ data: params });
    },
    onSuccess: (data, variables) => {
      // Invalidate voucher queries
      queryClient.invalidateQueries({ queryKey: ["expense-vouchers"] });
      queryClient.invalidateQueries({
        queryKey: expenseGLPostingKeys.status(variables.voucherId),
      });
    },
  });
}

/**
 * Hook for batch posting multiple vouchers to GL
 */
export function useBatchPostExpenseVouchersToGL() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      voucherIds: string[];
      options?: {
        postingDate?: string;
        journalCode?: string;
        apAccountCode?: string;
      };
    }) => {
      return batchPostExpenseVouchersToGLFn({ data: params });
    },
    onSuccess: () => {
      // Invalidate all voucher queries
      queryClient.invalidateQueries({ queryKey: ["expense-vouchers"] });
      queryClient.invalidateQueries({ queryKey: expenseGLPostingKeys.all });
    },
  });
}

/**
 * Hook for auto-posting all pending vouchers
 */
export function useAutoPostPendingVouchersToGL() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (options?: {
      postingDate?: string;
      journalCode?: string;
      apAccountCode?: string;
    }) => {
      return autoPostPendingVouchersToGLFn({ data: options });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense-vouchers"] });
      queryClient.invalidateQueries({ queryKey: expenseGLPostingKeys.all });
    },
  });
}

/**
 * Hook for reversing a GL posting
 */
export function useReverseExpenseGLPosting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { voucherId: string; reason: string }) => {
      return reverseExpenseGLPostingFn({ data: params });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["expense-vouchers"] });
      queryClient.invalidateQueries({
        queryKey: expenseGLPostingKeys.status(variables.voucherId),
      });
    },
  });
}
