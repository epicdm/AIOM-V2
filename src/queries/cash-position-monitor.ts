/**
 * Cash Position Monitor Query Options
 *
 * TanStack Query configuration for cash position monitoring operations.
 */

import { queryOptions } from "@tanstack/react-query";
import {
  getMyCashPositionSummaryFn,
  getMyCashPositionMonitorDataFn,
  getMyCashFlowHistoryFn,
  getMyBurnRateAnalysisFn,
  getMyRunwayPredictionFn,
  getMyCashAlertsFn,
  getMyLiquiditySuggestionsFn,
  getCashPositionMonitorDataByUserIdFn,
  type CashThresholdConfig,
} from "~/fn/cash-position-monitor";

// =============================================================================
// Query Keys
// =============================================================================

export const cashPositionKeys = {
  all: ["cash-position"] as const,
  summary: () => [...cashPositionKeys.all, "summary"] as const,
  monitorData: (periodDays?: number) =>
    [...cashPositionKeys.all, "monitor-data", periodDays ?? 30] as const,
  cashFlow: (startDate: string, endDate: string) =>
    [...cashPositionKeys.all, "cash-flow", startDate, endDate] as const,
  burnRate: (periodDays?: number) =>
    [...cashPositionKeys.all, "burn-rate", periodDays ?? 30] as const,
  runway: () => [...cashPositionKeys.all, "runway"] as const,
  alerts: (thresholds?: Partial<CashThresholdConfig>) =>
    [...cashPositionKeys.all, "alerts", thresholds] as const,
  suggestions: () => [...cashPositionKeys.all, "suggestions"] as const,
  byUserId: (userId: string, periodDays?: number) =>
    [...cashPositionKeys.all, "user", userId, periodDays ?? 30] as const,
};

// =============================================================================
// Query Options
// =============================================================================

/**
 * Query options for current user's cash position summary
 */
export const myCashPositionSummaryQueryOptions = () =>
  queryOptions({
    queryKey: cashPositionKeys.summary(),
    queryFn: () => getMyCashPositionSummaryFn(),
    staleTime: 30 * 1000, // 30 seconds - balances can change
  });

/**
 * Query options for complete cash position monitor data
 */
export const myCashPositionMonitorDataQueryOptions = (options?: {
  periodDays?: number;
  thresholds?: Partial<CashThresholdConfig>;
}) =>
  queryOptions({
    queryKey: cashPositionKeys.monitorData(options?.periodDays),
    queryFn: () =>
      getMyCashPositionMonitorDataFn({
        data: {
          periodDays: options?.periodDays ?? 30,
          thresholds: options?.thresholds,
        },
      }),
    staleTime: 60 * 1000, // 1 minute - comprehensive data
    gcTime: 5 * 60 * 1000, // 5 minutes cache time
  });

/**
 * Query options for cash flow history
 */
export const myCashFlowHistoryQueryOptions = (
  startDate: string,
  endDate: string
) =>
  queryOptions({
    queryKey: cashPositionKeys.cashFlow(startDate, endDate),
    queryFn: () => getMyCashFlowHistoryFn({ data: { startDate, endDate } }),
    enabled: !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000, // 5 minutes - historical data
  });

/**
 * Query options for burn rate analysis
 */
export const myBurnRateAnalysisQueryOptions = (periodDays?: number) =>
  queryOptions({
    queryKey: cashPositionKeys.burnRate(periodDays),
    queryFn: () =>
      getMyBurnRateAnalysisFn({
        data: { periodDays: periodDays ?? 30 },
      }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

/**
 * Query options for runway prediction
 */
export const myRunwayPredictionQueryOptions = () =>
  queryOptions({
    queryKey: cashPositionKeys.runway(),
    queryFn: () => getMyRunwayPredictionFn(),
    staleTime: 60 * 1000, // 1 minute - depends on burn rate
  });

/**
 * Query options for cash alerts
 */
export const myCashAlertsQueryOptions = (
  thresholds?: Partial<CashThresholdConfig>
) =>
  queryOptions({
    queryKey: cashPositionKeys.alerts(thresholds),
    queryFn: () => getMyCashAlertsFn({ data: { thresholds } }),
    staleTime: 60 * 1000, // 1 minute
  });

/**
 * Query options for liquidity suggestions
 */
export const myLiquiditySuggestionsQueryOptions = () =>
  queryOptions({
    queryKey: cashPositionKeys.suggestions(),
    queryFn: () => getMyLiquiditySuggestionsFn(),
    staleTime: 5 * 60 * 1000, // 5 minutes - suggestions don't change frequently
  });

/**
 * Query options for another user's cash position (admin)
 */
export const cashPositionMonitorDataByUserIdQueryOptions = (
  userId: string,
  options?: {
    periodDays?: number;
    thresholds?: Partial<CashThresholdConfig>;
  }
) =>
  queryOptions({
    queryKey: cashPositionKeys.byUserId(userId, options?.periodDays),
    queryFn: () =>
      getCashPositionMonitorDataByUserIdFn({
        data: {
          userId,
          periodDays: options?.periodDays ?? 30,
          thresholds: options?.thresholds,
        },
      }),
    enabled: !!userId,
    staleTime: 60 * 1000,
  });
