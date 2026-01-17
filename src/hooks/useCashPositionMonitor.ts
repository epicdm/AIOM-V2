/**
 * Cash Position Monitor Hooks
 *
 * Custom React hooks for cash position monitoring including:
 * - Cash position summary queries
 * - Burn rate analysis
 * - Runway predictions
 * - Alert monitoring
 * - Liquidity suggestions
 */

import { useQuery } from "@tanstack/react-query";
import {
  myCashPositionSummaryQueryOptions,
  myCashPositionMonitorDataQueryOptions,
  myCashFlowHistoryQueryOptions,
  myBurnRateAnalysisQueryOptions,
  myRunwayPredictionQueryOptions,
  myCashAlertsQueryOptions,
  myLiquiditySuggestionsQueryOptions,
  cashPositionMonitorDataByUserIdQueryOptions,
} from "~/queries/cash-position-monitor";
import type { CashThresholdConfig } from "~/fn/cash-position-monitor";

// =============================================================================
// Query Hooks
// =============================================================================

/**
 * Hook to get current user's cash position summary
 *
 * Returns basic cash position info: balance, available balance, pending balance
 */
export function useMyCashPositionSummary() {
  return useQuery(myCashPositionSummaryQueryOptions());
}

/**
 * Hook to get complete cash position monitor data
 *
 * Includes: summary, cash flow history, burn rate, runway, alerts, suggestions
 *
 * @param options - Configuration options
 * @param options.periodDays - Number of days to analyze (default: 30)
 * @param options.thresholds - Custom threshold configuration for alerts
 */
export function useMyCashPositionMonitorData(options?: {
  periodDays?: number;
  thresholds?: Partial<CashThresholdConfig>;
}) {
  return useQuery(myCashPositionMonitorDataQueryOptions(options));
}

/**
 * Hook to get cash flow history for a date range
 *
 * @param startDate - Start date (ISO string)
 * @param endDate - End date (ISO string)
 */
export function useMyCashFlowHistory(startDate: string, endDate: string) {
  return useQuery(myCashFlowHistoryQueryOptions(startDate, endDate));
}

/**
 * Hook to get burn rate analysis
 *
 * Returns daily, weekly, monthly burn rates and trend information
 *
 * @param periodDays - Number of days to analyze for burn rate (default: 30)
 */
export function useMyBurnRateAnalysis(periodDays?: number) {
  return useQuery(myBurnRateAnalysisQueryOptions(periodDays));
}

/**
 * Hook to get runway prediction
 *
 * Returns days/months remaining and projected zero date
 */
export function useMyRunwayPrediction() {
  return useQuery(myRunwayPredictionQueryOptions());
}

/**
 * Hook to get cash position alerts
 *
 * Returns alerts based on current cash position and configured thresholds
 *
 * @param thresholds - Custom threshold configuration for alerts
 */
export function useMyCashAlerts(thresholds?: Partial<CashThresholdConfig>) {
  return useQuery(myCashAlertsQueryOptions(thresholds));
}

/**
 * Hook to get liquidity improvement suggestions
 *
 * Returns actionable suggestions to improve cash position
 */
export function useMyLiquiditySuggestions() {
  return useQuery(myLiquiditySuggestionsQueryOptions());
}

/**
 * Hook to get cash position monitor data for another user (admin)
 *
 * @param userId - Target user ID
 * @param options - Configuration options
 */
export function useCashPositionMonitorDataByUserId(
  userId: string,
  options?: {
    periodDays?: number;
    thresholds?: Partial<CashThresholdConfig>;
  }
) {
  return useQuery(cashPositionMonitorDataByUserIdQueryOptions(userId, options));
}

// =============================================================================
// Combined Hook for Widget
// =============================================================================

/**
 * Combined hook that provides all data needed for the Cash Position Monitor Widget
 *
 * Optimized for widget usage - fetches all data in a single query
 */
export function useCashPositionMonitorWidget(options?: {
  periodDays?: number;
  thresholds?: Partial<CashThresholdConfig>;
  enabled?: boolean;
}) {
  const query = useQuery({
    ...myCashPositionMonitorDataQueryOptions({
      periodDays: options?.periodDays,
      thresholds: options?.thresholds,
    }),
    enabled: options?.enabled !== false,
  });

  return {
    ...query,
    // Convenience accessors
    summary: query.data?.summary,
    cashFlow: query.data?.cashFlow,
    burnRate: query.data?.burnRate,
    runway: query.data?.runway,
    alerts: query.data?.alerts,
    suggestions: query.data?.suggestions,
    lastRefreshed: query.data?.lastRefreshed,
  };
}
