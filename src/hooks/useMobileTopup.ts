/**
 * Mobile Top-up Hooks
 *
 * Custom React hooks for mobile airtime/data top-up operations.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  countriesQueryOptions,
  operatorsQueryOptions,
  operatorQueryOptions,
  fxRateQueryOptions,
  mobileTopupTransactionsQueryOptions,
  mobileTopupTransactionQueryOptions,
  mobileTopupReceiptQueryOptions,
  mobileTopupStatsQueryOptions,
  topupEligibilityQueryOptions,
  mobileTopupKeys,
} from "~/queries/mobile-topup";
import { walletBalanceKeys } from "~/queries/wallet-balance";
import { sendMobileTopupFn, checkTopupEligibilityFn } from "~/fn/mobile-topup";
import { detectReloadlyOperatorFn } from "~/fn/reloadly";
import { getErrorMessage } from "~/utils/error";

// =============================================================================
// Query Hooks
// =============================================================================

/**
 * Hook to get supported countries
 */
export function useCountries() {
  return useQuery(countriesQueryOptions());
}

/**
 * Hook to get operators for a country
 */
export function useOperators(countryCode?: string) {
  return useQuery(operatorsQueryOptions(countryCode));
}

/**
 * Hook to get a specific operator
 */
export function useOperator(operatorId: number) {
  return useQuery(operatorQueryOptions(operatorId));
}

/**
 * Hook to calculate FX rate
 */
export function useFxRate(operatorId: number, amount: number) {
  return useQuery(fxRateQueryOptions(operatorId, amount));
}

/**
 * Hook to get user's top-up transactions
 */
export function useMobileTopupTransactions(params?: {
  status?: "pending" | "processing" | "successful" | "failed" | "refunded";
  limit?: number;
  offset?: number;
}) {
  return useQuery(mobileTopupTransactionsQueryOptions(params));
}

/**
 * Hook to get a specific transaction
 */
export function useMobileTopupTransaction(id: string) {
  return useQuery(mobileTopupTransactionQueryOptions(id));
}

/**
 * Hook to get transaction receipt
 */
export function useMobileTopupReceipt(transactionId: string) {
  return useQuery(mobileTopupReceiptQueryOptions(transactionId));
}

/**
 * Hook to get user's top-up statistics
 */
export function useMobileTopupStats() {
  return useQuery(mobileTopupStatsQueryOptions());
}

/**
 * Hook to check eligibility before top-up
 */
export function useTopupEligibility(operatorId: number, amount: number) {
  return useQuery(topupEligibilityQueryOptions(operatorId, amount));
}

// =============================================================================
// Mutation Hooks
// =============================================================================

/**
 * Hook for detecting operator from phone number
 */
export function useDetectOperator() {
  return useMutation({
    mutationFn: (data: { phone: string; countryCode: string }) =>
      detectReloadlyOperatorFn({ data }),
    onError: (error) => {
      // Don't show error toast for operator detection failures
      // as it's expected behavior for unsupported numbers
      console.log("Operator detection failed:", getErrorMessage(error));
    },
  });
}

/**
 * Hook for sending mobile top-up
 */
export function useSendMobileTopup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      operatorId: number;
      amount: number;
      useLocalAmount?: boolean;
      recipientPhone: {
        countryCode: string;
        number: string;
      };
      senderPhone?: {
        countryCode: string;
        number: string;
      };
      idempotencyKey?: string;
      metadata?: Record<string, unknown>;
    }) => sendMobileTopupFn({ data }),
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Top-up sent successfully!", {
          description: `Transaction ID: ${result.transaction?.id?.slice(0, 8)}...`,
        });
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: mobileTopupKeys.all });
        queryClient.invalidateQueries({ queryKey: walletBalanceKeys.all });
      } else {
        // Handle specific error cases
        switch (result.errorCode) {
          case "INSUFFICIENT_FUNDS":
            toast.error("Insufficient funds", {
              description:
                "Please top up your wallet to proceed with this purchase.",
            });
            break;
          case "OPERATOR_NOT_FOUND":
            toast.error("Operator not found", {
              description:
                "The selected operator is no longer available. Please try again.",
            });
            break;
          case "TOPUP_FAILED":
            toast.error("Top-up failed", {
              description:
                result.error || "The top-up could not be completed. Please try again.",
            });
            break;
          default:
            toast.error("Top-up failed", {
              description: result.error || "An unexpected error occurred.",
            });
        }
      }
    },
    onError: (error) => {
      toast.error("Top-up failed", {
        description: getErrorMessage(error),
      });
    },
  });
}

/**
 * Hook for checking eligibility before initiating top-up
 */
export function useCheckEligibility() {
  return useMutation({
    mutationFn: (data: { operatorId: number; amount: number }) =>
      checkTopupEligibilityFn({ data }),
  });
}

// =============================================================================
// Combined Service Hook
// =============================================================================

/**
 * Hook that provides combined top-up state and operations
 */
export function useMobileTopupService(countryCode?: string) {
  const countriesQuery = useCountries();
  const operatorsQuery = useOperators(countryCode);
  const statsQuery = useMobileTopupStats();
  const transactionsQuery = useMobileTopupTransactions({ limit: 5 });
  const sendTopupMutation = useSendMobileTopup();
  const detectOperatorMutation = useDetectOperator();

  return {
    // Countries
    countries: countriesQuery.data ?? [],
    countriesLoading: countriesQuery.isLoading,
    countriesError: countriesQuery.error,

    // Operators
    operators: operatorsQuery.data ?? [],
    operatorsLoading: operatorsQuery.isLoading,
    operatorsError: operatorsQuery.error,
    refetchOperators: operatorsQuery.refetch,

    // Stats
    stats: statsQuery.data,
    statsLoading: statsQuery.isLoading,

    // Recent transactions
    recentTransactions: transactionsQuery.data ?? [],
    transactionsLoading: transactionsQuery.isLoading,

    // Detect operator
    detectOperator: detectOperatorMutation.mutate,
    detectOperatorAsync: detectOperatorMutation.mutateAsync,
    isDetectingOperator: detectOperatorMutation.isPending,
    detectedOperator: detectOperatorMutation.data,

    // Send top-up
    sendTopup: sendTopupMutation.mutate,
    sendTopupAsync: sendTopupMutation.mutateAsync,
    isSendingTopup: sendTopupMutation.isPending,
    topupResult: sendTopupMutation.data,
    topupError: sendTopupMutation.error,
    resetTopup: sendTopupMutation.reset,

    // Overall state
    isLoading:
      countriesQuery.isLoading ||
      operatorsQuery.isLoading ||
      sendTopupMutation.isPending,
  };
}
