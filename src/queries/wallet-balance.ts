/**
 * Wallet Balance Query Options
 *
 * TanStack Query configuration for wallet balance operations.
 */

import { queryOptions } from "@tanstack/react-query";
import {
  getMyWalletBalanceFn,
  getWalletBalanceByIdFn,
  checkSufficientBalanceFn,
  getWalletTransactionsFn,
} from "~/fn/wallet-balance";

// =============================================================================
// Query Keys
// =============================================================================

export const walletBalanceKeys = {
  all: ["wallet-balance"] as const,
  myBalance: () => [...walletBalanceKeys.all, "my-balance"] as const,
  balance: (walletId: string) => [...walletBalanceKeys.all, "balance", walletId] as const,
  checkBalance: (walletId: string | undefined, amount: string) =>
    [...walletBalanceKeys.all, "check-balance", walletId, amount] as const,
  transactions: (walletId?: string, filters?: Record<string, unknown>) =>
    [...walletBalanceKeys.all, "transactions", walletId, filters] as const,
};

// =============================================================================
// Query Options
// =============================================================================

/**
 * Query options for current user's wallet balance
 */
export const myWalletBalanceQueryOptions = () =>
  queryOptions({
    queryKey: walletBalanceKeys.myBalance(),
    queryFn: () => getMyWalletBalanceFn(),
    staleTime: 10 * 1000, // Consider stale after 10 seconds (balances can change frequently)
  });

/**
 * Query options for a specific wallet balance by ID
 */
export const walletBalanceByIdQueryOptions = (walletId: string) =>
  queryOptions({
    queryKey: walletBalanceKeys.balance(walletId),
    queryFn: () => getWalletBalanceByIdFn({ data: { walletId } }),
    enabled: !!walletId,
    staleTime: 10 * 1000,
  });

/**
 * Query options for checking if sufficient balance is available
 */
export const checkSufficientBalanceQueryOptions = (
  amount: string,
  walletId?: string
) =>
  queryOptions({
    queryKey: walletBalanceKeys.checkBalance(walletId, amount),
    queryFn: () => checkSufficientBalanceFn({ data: { walletId, amount } }),
    enabled: !!amount && parseFloat(amount) > 0,
    staleTime: 5 * 1000, // Very short stale time for balance checks
  });

/**
 * Query options for wallet transaction history
 */
export const walletTransactionsQueryOptions = (params?: {
  walletId?: string;
  type?: "deposit" | "withdrawal" | "transfer_in" | "transfer_out" | "expense_disbursement" | "expense_refund" | "airtime_purchase" | "adjustment" | "fee" | "reversal";
  status?: "pending" | "processing" | "completed" | "failed" | "reversed" | "cancelled";
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}) =>
  queryOptions({
    queryKey: walletBalanceKeys.transactions(params?.walletId, params),
    queryFn: () => getWalletTransactionsFn({ data: params }),
    staleTime: 30 * 1000, // Transaction history changes less frequently
  });
