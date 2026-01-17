/**
 * Wallet Balance Hooks
 *
 * Custom React hooks for wallet balance operations including:
 * - Balance queries
 * - Debit/Credit mutations
 * - Transfer mutations
 * - Balance locking operations
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  myWalletBalanceQueryOptions,
  walletBalanceByIdQueryOptions,
  checkSufficientBalanceQueryOptions,
  walletTransactionsQueryOptions,
  walletBalanceKeys,
} from "~/queries/wallet-balance";
import {
  debitWalletFn,
  creditWalletFn,
  transferFundsFn,
  lockFundsFn,
  releaseFundsFn,
  completePendingDebitFn,
  WalletErrorCodes,
} from "~/fn/wallet-balance";
import { getErrorMessage } from "~/utils/error";

// =============================================================================
// Query Hooks
// =============================================================================

/**
 * Hook to get current user's wallet balance
 */
export function useMyWalletBalance() {
  return useQuery(myWalletBalanceQueryOptions());
}

/**
 * Hook to get wallet balance by ID
 */
export function useWalletBalance(walletId: string) {
  return useQuery(walletBalanceByIdQueryOptions(walletId));
}

/**
 * Hook to check if sufficient balance is available
 */
export function useCheckSufficientBalance(amount: string, walletId?: string) {
  return useQuery(checkSufficientBalanceQueryOptions(amount, walletId));
}

/**
 * Hook to get wallet transaction history
 */
export function useWalletTransactions(params?: {
  walletId?: string;
  type?: "deposit" | "withdrawal" | "transfer_in" | "transfer_out" | "expense_disbursement" | "expense_refund" | "airtime_purchase" | "adjustment" | "fee" | "reversal";
  status?: "pending" | "processing" | "completed" | "failed" | "reversed" | "cancelled";
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery(walletTransactionsQueryOptions(params));
}

// =============================================================================
// Mutation Hooks
// =============================================================================

/**
 * Hook for debit wallet operations
 *
 * Features:
 * - Overdraft prevention
 * - Automatic balance refresh
 * - Error handling with specific error codes
 */
export function useDebitWallet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      walletId?: string;
      amount: string;
      type: "withdrawal" | "transfer_out" | "expense_disbursement" | "airtime_purchase" | "fee";
      description?: string;
      reference?: string;
      idempotencyKey?: string;
      relatedExpenseRequestId?: string;
      relatedExpenseVoucherId?: string;
      relatedReloadlyTransactionId?: string;
      metadata?: Record<string, unknown>;
    }) => debitWalletFn({ data }),
    onSuccess: (result) => {
      // Invalidate wallet balance queries to refresh data
      queryClient.invalidateQueries({ queryKey: walletBalanceKeys.all });
      toast.success("Transaction completed successfully");
    },
    onError: (error) => {
      const message = getErrorMessage(error);

      // Provide user-friendly error messages for known error codes
      if (message.includes("INSUFFICIENT_FUNDS")) {
        toast.error("Insufficient funds for this transaction");
      } else if (message.includes("WALLET_FROZEN")) {
        toast.error("Your wallet is frozen. Please contact support.");
      } else if (message.includes("WALLET_SUSPENDED")) {
        toast.error("Your wallet is suspended. Please contact support.");
      } else if (message.includes("DAILY_LIMIT_EXCEEDED")) {
        toast.error("Daily transaction limit exceeded");
      } else if (message.includes("MONTHLY_LIMIT_EXCEEDED")) {
        toast.error("Monthly transaction limit exceeded");
      } else {
        toast.error(message || "Transaction failed");
      }
    },
  });
}

/**
 * Hook for credit wallet operations
 */
export function useCreditWallet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      walletId?: string;
      amount: string;
      type: "deposit" | "transfer_in" | "expense_refund" | "adjustment" | "reversal";
      description?: string;
      reference?: string;
      idempotencyKey?: string;
      relatedExpenseRequestId?: string;
      relatedExpenseVoucherId?: string;
      relatedReloadlyTransactionId?: string;
      metadata?: Record<string, unknown>;
    }) => creditWalletFn({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: walletBalanceKeys.all });
      toast.success("Funds credited successfully");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error) || "Credit operation failed");
    },
  });
}

/**
 * Hook for transfer operations between wallets
 */
export function useTransferFunds() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      destinationWalletId?: string;
      destinationUserId?: string;
      amount: string;
      description?: string;
      reference?: string;
      idempotencyKey?: string;
      metadata?: Record<string, unknown>;
    }) => transferFundsFn({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: walletBalanceKeys.all });
      toast.success("Transfer completed successfully");
    },
    onError: (error) => {
      const message = getErrorMessage(error);

      if (message.includes("INSUFFICIENT_FUNDS")) {
        toast.error("Insufficient funds for this transfer");
      } else if (message.includes("same wallet")) {
        toast.error("Cannot transfer to the same wallet");
      } else {
        toast.error(message || "Transfer failed");
      }
    },
  });
}

/**
 * Hook for locking funds (for pending transactions)
 */
export function useLockFunds() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      walletId?: string;
      amount: string;
      reason: string;
    }) => lockFundsFn({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: walletBalanceKeys.all });
    },
    onError: (error) => {
      const message = getErrorMessage(error);

      if (message.includes("INSUFFICIENT_FUNDS")) {
        toast.error("Insufficient available funds to lock");
      } else {
        toast.error(message || "Failed to lock funds");
      }
    },
  });
}

/**
 * Hook for releasing locked funds
 */
export function useReleaseFunds() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      walletId?: string;
      amount: string;
      reason: string;
    }) => releaseFundsFn({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: walletBalanceKeys.all });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error) || "Failed to release funds");
    },
  });
}

/**
 * Hook for completing a pending debit transaction
 */
export function useCompletePendingDebit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      walletId: string;
      amount: string;
      transactionId: string;
    }) => completePendingDebitFn({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: walletBalanceKeys.all });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error) || "Failed to complete pending transaction");
    },
  });
}

// =============================================================================
// Utility Hooks
// =============================================================================

/**
 * Hook that provides wallet balance state and common operations
 */
export function useWalletBalanceService() {
  const balanceQuery = useMyWalletBalance();
  const debitMutation = useDebitWallet();
  const creditMutation = useCreditWallet();
  const transferMutation = useTransferFunds();
  const lockMutation = useLockFunds();
  const releaseMutation = useReleaseFunds();

  return {
    // Balance state
    balance: balanceQuery.data?.balance ?? "0.00",
    availableBalance: balanceQuery.data?.availableBalance ?? "0.00",
    pendingBalance: balanceQuery.data?.pendingBalance ?? "0.00",
    currency: balanceQuery.data?.currency ?? "USD",
    status: balanceQuery.data?.status ?? "active",
    walletId: balanceQuery.data?.walletId,

    // Query state
    isLoading: balanceQuery.isLoading,
    isError: balanceQuery.isError,
    error: balanceQuery.error,
    refetch: balanceQuery.refetch,

    // Mutations
    debit: debitMutation.mutate,
    debitAsync: debitMutation.mutateAsync,
    isDebiting: debitMutation.isPending,

    credit: creditMutation.mutate,
    creditAsync: creditMutation.mutateAsync,
    isCrediting: creditMutation.isPending,

    transfer: transferMutation.mutate,
    transferAsync: transferMutation.mutateAsync,
    isTransferring: transferMutation.isPending,

    lock: lockMutation.mutate,
    lockAsync: lockMutation.mutateAsync,
    isLocking: lockMutation.isPending,

    release: releaseMutation.mutate,
    releaseAsync: releaseMutation.mutateAsync,
    isReleasing: releaseMutation.isPending,

    // Overall mutation state
    isMutating:
      debitMutation.isPending ||
      creditMutation.isPending ||
      transferMutation.isPending ||
      lockMutation.isPending ||
      releaseMutation.isPending,
  };
}

// Export error codes for use in components
export { WalletErrorCodes };
