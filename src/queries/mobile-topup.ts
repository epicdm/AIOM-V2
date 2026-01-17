/**
 * Mobile Top-up Query Options
 *
 * TanStack Query configuration for mobile airtime/data top-ups.
 */

import { queryOptions } from "@tanstack/react-query";
import {
  getReloadlyCountriesFn,
  getReloadlyOperatorsFn,
  getReloadlyOperatorFn,
  detectReloadlyOperatorFn,
  getMyReloadlyTransactionsFn,
  getMyReloadlyTransactionsCountFn,
  getReloadlyTransactionByIdFn,
  calculateReloadlyFxRateFn,
} from "~/fn/reloadly";
import {
  getMobileTopupStatsFn,
  listMobileTopupsFn,
  getMobileTopupReceiptFn,
  checkTopupEligibilityFn,
} from "~/fn/mobile-topup";

// =============================================================================
// Query Keys
// =============================================================================

export const mobileTopupKeys = {
  all: ["mobile-topup"] as const,
  countries: () => [...mobileTopupKeys.all, "countries"] as const,
  operators: (countryCode?: string) =>
    [...mobileTopupKeys.all, "operators", countryCode] as const,
  operator: (operatorId: number) =>
    [...mobileTopupKeys.all, "operator", operatorId] as const,
  detectOperator: (phone: string, countryCode: string) =>
    [...mobileTopupKeys.all, "detect-operator", phone, countryCode] as const,
  fxRate: (operatorId: number, amount: number) =>
    [...mobileTopupKeys.all, "fx-rate", operatorId, amount] as const,
  transactions: (filters?: Record<string, unknown>) =>
    [...mobileTopupKeys.all, "transactions", filters] as const,
  transaction: (id: string) =>
    [...mobileTopupKeys.all, "transaction", id] as const,
  receipt: (id: string) =>
    [...mobileTopupKeys.all, "receipt", id] as const,
  stats: () => [...mobileTopupKeys.all, "stats"] as const,
  eligibility: (operatorId: number, amount: number) =>
    [...mobileTopupKeys.all, "eligibility", operatorId, amount] as const,
};

// =============================================================================
// Query Options
// =============================================================================

/**
 * Query options for supported countries
 */
export const countriesQueryOptions = () =>
  queryOptions({
    queryKey: mobileTopupKeys.countries(),
    queryFn: () => getReloadlyCountriesFn(),
    staleTime: 24 * 60 * 60 * 1000, // 24 hours - countries don't change often
  });

/**
 * Query options for operators (all or by country)
 */
export const operatorsQueryOptions = (countryCode?: string) =>
  queryOptions({
    queryKey: mobileTopupKeys.operators(countryCode),
    queryFn: () => getReloadlyOperatorsFn({ data: { countryCode } }),
    staleTime: 60 * 60 * 1000, // 1 hour
    enabled: true,
  });

/**
 * Query options for a specific operator
 */
export const operatorQueryOptions = (operatorId: number) =>
  queryOptions({
    queryKey: mobileTopupKeys.operator(operatorId),
    queryFn: () => getReloadlyOperatorFn({ data: { operatorId } }),
    staleTime: 60 * 60 * 1000, // 1 hour
    enabled: operatorId > 0,
  });

/**
 * Query options for FX rate calculation
 */
export const fxRateQueryOptions = (operatorId: number, amount: number) =>
  queryOptions({
    queryKey: mobileTopupKeys.fxRate(operatorId, amount),
    queryFn: () => calculateReloadlyFxRateFn({ data: { operatorId, amount } }),
    staleTime: 5 * 60 * 1000, // 5 minutes - FX rates change
    enabled: operatorId > 0 && amount > 0,
  });

/**
 * Query options for user's transaction history
 */
export const mobileTopupTransactionsQueryOptions = (params?: {
  status?: "pending" | "processing" | "successful" | "failed" | "refunded";
  limit?: number;
  offset?: number;
}) =>
  queryOptions({
    queryKey: mobileTopupKeys.transactions(params),
    queryFn: () => listMobileTopupsFn({ data: params }),
    staleTime: 30 * 1000, // 30 seconds
  });

/**
 * Query options for a specific transaction
 */
export const mobileTopupTransactionQueryOptions = (id: string) =>
  queryOptions({
    queryKey: mobileTopupKeys.transaction(id),
    queryFn: () => getReloadlyTransactionByIdFn({ data: { id } }),
    enabled: !!id,
    staleTime: 30 * 1000,
  });

/**
 * Query options for transaction receipt
 */
export const mobileTopupReceiptQueryOptions = (transactionId: string) =>
  queryOptions({
    queryKey: mobileTopupKeys.receipt(transactionId),
    queryFn: () => getMobileTopupReceiptFn({ data: { transactionId } }),
    enabled: !!transactionId,
    staleTime: 60 * 1000,
  });

/**
 * Query options for user's top-up statistics
 */
export const mobileTopupStatsQueryOptions = () =>
  queryOptions({
    queryKey: mobileTopupKeys.stats(),
    queryFn: () => getMobileTopupStatsFn(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

/**
 * Query options for checking eligibility before top-up
 */
export const topupEligibilityQueryOptions = (
  operatorId: number,
  amount: number
) =>
  queryOptions({
    queryKey: mobileTopupKeys.eligibility(operatorId, amount),
    queryFn: () => checkTopupEligibilityFn({ data: { operatorId, amount } }),
    staleTime: 10 * 1000, // 10 seconds - balance can change
    enabled: operatorId > 0 && amount > 0,
  });
