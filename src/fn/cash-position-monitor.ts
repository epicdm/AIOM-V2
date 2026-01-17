/**
 * Cash Position Monitor Server Functions
 *
 * Server-side functions for cash position monitoring including:
 * - Real-time cash position tracking
 * - Runway predictions
 * - Alert generation
 * - Liquidity improvement suggestions
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authenticatedMiddleware } from "./middleware";
import {
  getCashPositionSummary,
  getCashPositionByUserId,
  getCashFlowHistory,
  calculateBurnRate,
  predictRunway,
  generateCashAlerts,
  generateLiquiditySuggestions,
  getCashPositionMonitorData,
  getCashPositionMonitorDataByUserId,
  DEFAULT_CASH_THRESHOLDS,
  type CashThresholdConfig,
  type CashPositionMonitorData,
  type CashPositionSummary,
  type CashFlowEntry,
  type BurnRateAnalysis,
  type RunwayPrediction,
  type CashPositionAlert,
  type LiquiditySuggestion,
} from "~/data-access/cash-position-monitor";
import { getOrCreateWallet } from "~/data-access/wallet";

// =============================================================================
// Validation Schemas
// =============================================================================

const thresholdConfigSchema = z.object({
  lowBalanceWarning: z.number().min(0).optional(),
  lowBalanceCritical: z.number().min(0).optional(),
  runwayWarningDays: z.number().min(1).optional(),
  runwayCriticalDays: z.number().min(1).optional(),
  burnRateIncreaseWarning: z.number().min(0).max(100).optional(),
  largeOutflowThreshold: z.number().min(0).optional(),
}).optional();

const periodSchema = z.number().min(7).max(365).default(30);

// =============================================================================
// Cash Position Query Functions
// =============================================================================

/**
 * Get current user's cash position summary
 */
export const getMyCashPositionSummaryFn = createServerFn()
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    // Get or create wallet for user
    const wallet = await getOrCreateWallet(context.userId);
    const summary = await getCashPositionSummary(wallet.id);

    if (!summary) {
      return {
        currentBalance: 0,
        availableBalance: 0,
        pendingBalance: 0,
        currency: "USD",
        lastUpdated: new Date(),
      };
    }

    return summary;
  });

/**
 * Get complete cash position monitor data for current user
 */
export const getMyCashPositionMonitorDataFn = createServerFn()
  .inputValidator(
    z.object({
      periodDays: periodSchema,
      thresholds: thresholdConfigSchema,
    }).optional()
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ context, data }) => {
    // Get or create wallet for user
    const wallet = await getOrCreateWallet(context.userId);

    const periodDays = data?.periodDays ?? 30;
    const thresholds: CashThresholdConfig = {
      ...DEFAULT_CASH_THRESHOLDS,
      ...(data?.thresholds || {}),
    };

    const monitorData = await getCashPositionMonitorData(
      wallet.id,
      periodDays,
      thresholds
    );

    if (!monitorData) {
      // Return default/empty data structure
      return createEmptyMonitorData();
    }

    return monitorData;
  });

/**
 * Get cash flow history for current user
 */
export const getMyCashFlowHistoryFn = createServerFn()
  .inputValidator(
    z.object({
      startDate: z.string().transform((s) => new Date(s)),
      endDate: z.string().transform((s) => new Date(s)),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ context, data }) => {
    const wallet = await getOrCreateWallet(context.userId);
    return getCashFlowHistory(wallet.id, data.startDate, data.endDate);
  });

/**
 * Get burn rate analysis for current user
 */
export const getMyBurnRateAnalysisFn = createServerFn()
  .inputValidator(
    z.object({
      periodDays: periodSchema,
    }).optional()
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ context, data }) => {
    const wallet = await getOrCreateWallet(context.userId);
    return calculateBurnRate(wallet.id, data?.periodDays ?? 30);
  });

/**
 * Get runway prediction for current user
 */
export const getMyRunwayPredictionFn = createServerFn()
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    const wallet = await getOrCreateWallet(context.userId);
    return predictRunway(wallet.id);
  });

/**
 * Get cash alerts for current user
 */
export const getMyCashAlertsFn = createServerFn()
  .inputValidator(
    z.object({
      thresholds: thresholdConfigSchema,
    }).optional()
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ context, data }) => {
    const wallet = await getOrCreateWallet(context.userId);
    const thresholds: CashThresholdConfig = {
      ...DEFAULT_CASH_THRESHOLDS,
      ...(data?.thresholds || {}),
    };
    return generateCashAlerts(wallet.id, thresholds);
  });

/**
 * Get liquidity improvement suggestions for current user
 */
export const getMyLiquiditySuggestionsFn = createServerFn()
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    const wallet = await getOrCreateWallet(context.userId);
    return generateLiquiditySuggestions(wallet.id);
  });

// =============================================================================
// Admin/Manager Functions (for viewing other users' cash positions)
// =============================================================================

/**
 * Get cash position monitor data for a specific user (admin only)
 */
export const getCashPositionMonitorDataByUserIdFn = createServerFn()
  .inputValidator(
    z.object({
      userId: z.string().min(1),
      periodDays: periodSchema,
      thresholds: thresholdConfigSchema,
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ context, data }) => {
    // TODO: Add admin role check here
    // For now, allow authenticated users to access

    const thresholds: CashThresholdConfig = {
      ...DEFAULT_CASH_THRESHOLDS,
      ...(data.thresholds || {}),
    };

    const monitorData = await getCashPositionMonitorDataByUserId(
      data.userId,
      data.periodDays,
      thresholds
    );

    if (!monitorData) {
      return createEmptyMonitorData();
    }

    return monitorData;
  });

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Create empty monitor data structure for new/empty wallets
 */
function createEmptyMonitorData(): CashPositionMonitorData {
  return {
    summary: {
      currentBalance: 0,
      availableBalance: 0,
      pendingBalance: 0,
      currency: "USD",
      lastUpdated: new Date(),
    },
    cashFlow: [],
    burnRate: {
      daily: 0,
      weekly: 0,
      monthly: 0,
      trend: "stable",
      trendPercentage: 0,
    },
    runway: {
      daysRemaining: Infinity,
      monthsRemaining: Infinity,
      projectedZeroDate: null,
      confidence: "low",
    },
    alerts: [],
    suggestions: [
      {
        id: "get-started",
        title: "Start Using Your Wallet",
        description: "Make your first deposit to start tracking your cash position",
        potentialImpact: 0,
        priority: "high",
        category: "increase_reserves",
      },
    ],
    lastRefreshed: new Date(),
  };
}

// =============================================================================
// Type Exports
// =============================================================================

export type {
  CashPositionMonitorData,
  CashPositionSummary,
  CashFlowEntry,
  BurnRateAnalysis,
  RunwayPrediction,
  CashPositionAlert,
  LiquiditySuggestion,
  CashThresholdConfig,
};
