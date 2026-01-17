/**
 * Cash Position Monitor Data Access Layer
 *
 * Provides database queries for cash flow monitoring, runway calculations,
 * threshold alerting, and liquidity improvement suggestions.
 *
 * Features:
 * - Real-time cash position tracking
 * - Cash flow trend analysis
 * - Runway prediction based on burn rate
 * - Threshold-based alerting
 * - Liquidity improvement suggestions
 */

import { eq, desc, and, gte, lte, sql, sum, count, asc, lt, gt } from "drizzle-orm";
import { database } from "~/db";
import {
  userWallet,
  walletTransaction,
  expenseRequest,
  user,
  type WalletTransaction,
  type UserWallet,
} from "~/db/schema";

// =============================================================================
// Types
// =============================================================================

/**
 * Alert severity levels for cash position
 */
export type CashAlertSeverity = "info" | "warning" | "critical";

/**
 * Alert types for cash position monitoring
 */
export type CashAlertType =
  | "low_balance"
  | "high_burn_rate"
  | "short_runway"
  | "negative_cash_flow"
  | "threshold_breach"
  | "large_outflow"
  | "unusual_activity";

/**
 * Cash position alert
 */
export interface CashPositionAlert {
  id: string;
  type: CashAlertType;
  severity: CashAlertSeverity;
  title: string;
  message: string;
  value?: number;
  threshold?: number;
  createdAt: Date;
  acknowledged: boolean;
}

/**
 * Cash flow entry for trend analysis
 */
export interface CashFlowEntry {
  date: string;
  inflow: number;
  outflow: number;
  netFlow: number;
  balance: number;
}

/**
 * Burn rate analysis
 */
export interface BurnRateAnalysis {
  daily: number;
  weekly: number;
  monthly: number;
  trend: "increasing" | "decreasing" | "stable";
  trendPercentage: number;
}

/**
 * Runway prediction
 */
export interface RunwayPrediction {
  daysRemaining: number;
  monthsRemaining: number;
  projectedZeroDate: Date | null;
  confidence: "high" | "medium" | "low";
}

/**
 * Liquidity improvement suggestion
 */
export interface LiquiditySuggestion {
  id: string;
  title: string;
  description: string;
  potentialImpact: number;
  priority: "high" | "medium" | "low";
  category: "reduce_expenses" | "accelerate_receivables" | "optimize_timing" | "increase_reserves";
}

/**
 * Cash position summary
 */
export interface CashPositionSummary {
  currentBalance: number;
  availableBalance: number;
  pendingBalance: number;
  currency: string;
  lastUpdated: Date;
}

/**
 * Threshold configuration
 */
export interface CashThresholdConfig {
  lowBalanceWarning: number;
  lowBalanceCritical: number;
  runwayWarningDays: number;
  runwayCriticalDays: number;
  burnRateIncreaseWarning: number; // percentage
  largeOutflowThreshold: number;
}

/**
 * Complete cash position monitor data
 */
export interface CashPositionMonitorData {
  summary: CashPositionSummary;
  cashFlow: CashFlowEntry[];
  burnRate: BurnRateAnalysis;
  runway: RunwayPrediction;
  alerts: CashPositionAlert[];
  suggestions: LiquiditySuggestion[];
  lastRefreshed: Date;
}

// =============================================================================
// Default Configuration
// =============================================================================

export const DEFAULT_CASH_THRESHOLDS: CashThresholdConfig = {
  lowBalanceWarning: 10000,
  lowBalanceCritical: 5000,
  runwayWarningDays: 90,
  runwayCriticalDays: 30,
  burnRateIncreaseWarning: 20, // 20% increase
  largeOutflowThreshold: 5000,
};

// =============================================================================
// Cash Position Queries
// =============================================================================

/**
 * Get current cash position summary for a user's wallet
 */
export async function getCashPositionSummary(
  walletId: string
): Promise<CashPositionSummary | null> {
  const wallet = await database
    .select({
      id: userWallet.id,
      balance: userWallet.balance,
      availableBalance: userWallet.availableBalance,
      pendingBalance: userWallet.pendingBalance,
      currency: userWallet.currency,
      updatedAt: userWallet.updatedAt,
    })
    .from(userWallet)
    .where(eq(userWallet.id, walletId))
    .limit(1);

  if (wallet.length === 0) return null;

  const w = wallet[0];
  return {
    currentBalance: parseFloat(w.balance),
    availableBalance: parseFloat(w.availableBalance),
    pendingBalance: parseFloat(w.pendingBalance),
    currency: w.currency,
    lastUpdated: w.updatedAt,
  };
}

/**
 * Get cash position summary for a user by user ID
 */
export async function getCashPositionByUserId(
  userId: string
): Promise<CashPositionSummary | null> {
  const wallet = await database
    .select({
      id: userWallet.id,
      balance: userWallet.balance,
      availableBalance: userWallet.availableBalance,
      pendingBalance: userWallet.pendingBalance,
      currency: userWallet.currency,
      updatedAt: userWallet.updatedAt,
    })
    .from(userWallet)
    .where(eq(userWallet.userId, userId))
    .limit(1);

  if (wallet.length === 0) return null;

  const w = wallet[0];
  return {
    currentBalance: parseFloat(w.balance),
    availableBalance: parseFloat(w.availableBalance),
    pendingBalance: parseFloat(w.pendingBalance),
    currency: w.currency,
    lastUpdated: w.updatedAt,
  };
}

/**
 * Get cash flow history for a period
 */
export async function getCashFlowHistory(
  walletId: string,
  startDate: Date,
  endDate: Date
): Promise<CashFlowEntry[]> {
  const transactions = await database
    .select({
      id: walletTransaction.id,
      type: walletTransaction.type,
      amount: walletTransaction.amount,
      netAmount: walletTransaction.netAmount,
      balanceAfter: walletTransaction.balanceAfter,
      completedAt: walletTransaction.completedAt,
      status: walletTransaction.status,
    })
    .from(walletTransaction)
    .where(
      and(
        eq(walletTransaction.walletId, walletId),
        eq(walletTransaction.status, "completed"),
        gte(walletTransaction.completedAt, startDate),
        lte(walletTransaction.completedAt, endDate)
      )
    )
    .orderBy(asc(walletTransaction.completedAt));

  // Group transactions by day
  const dailyFlows = new Map<string, { inflow: number; outflow: number; balance: number }>();

  for (const tx of transactions) {
    if (!tx.completedAt) continue;

    const dateKey = tx.completedAt.toISOString().split("T")[0];
    const amount = parseFloat(tx.netAmount);
    const balance = parseFloat(tx.balanceAfter);

    if (!dailyFlows.has(dateKey)) {
      dailyFlows.set(dateKey, { inflow: 0, outflow: 0, balance: 0 });
    }

    const entry = dailyFlows.get(dateKey)!;

    // Determine if inflow or outflow based on transaction type
    if (isInflowType(tx.type)) {
      entry.inflow += amount;
    } else {
      entry.outflow += Math.abs(amount);
    }
    entry.balance = balance; // Last balance of the day
  }

  // Convert to array and fill gaps
  const result: CashFlowEntry[] = [];
  const current = new Date(startDate);
  let lastBalance = 0;

  while (current <= endDate) {
    const dateKey = current.toISOString().split("T")[0];
    const dayData = dailyFlows.get(dateKey);

    if (dayData) {
      result.push({
        date: dateKey,
        inflow: dayData.inflow,
        outflow: dayData.outflow,
        netFlow: dayData.inflow - dayData.outflow,
        balance: dayData.balance,
      });
      lastBalance = dayData.balance;
    } else {
      // No transactions on this day - carry forward balance
      result.push({
        date: dateKey,
        inflow: 0,
        outflow: 0,
        netFlow: 0,
        balance: lastBalance,
      });
    }

    current.setDate(current.getDate() + 1);
  }

  return result;
}

/**
 * Calculate burn rate from transaction history
 */
export async function calculateBurnRate(
  walletId: string,
  periodDays: number = 30
): Promise<BurnRateAnalysis> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - periodDays);

  // Get previous period for trend comparison
  const prevStartDate = new Date(startDate);
  prevStartDate.setDate(prevStartDate.getDate() - periodDays);

  // Current period outflows
  const currentOutflows = await database
    .select({
      total: sql<string>`COALESCE(SUM(ABS(CAST(${walletTransaction.netAmount} AS DECIMAL))), 0)`,
    })
    .from(walletTransaction)
    .where(
      and(
        eq(walletTransaction.walletId, walletId),
        eq(walletTransaction.status, "completed"),
        gte(walletTransaction.completedAt, startDate),
        lte(walletTransaction.completedAt, endDate),
        sql`${walletTransaction.type} IN ('withdrawal', 'expense_disbursement', 'transfer', 'airtime_purchase', 'bill_payment')`
      )
    );

  // Previous period outflows
  const previousOutflows = await database
    .select({
      total: sql<string>`COALESCE(SUM(ABS(CAST(${walletTransaction.netAmount} AS DECIMAL))), 0)`,
    })
    .from(walletTransaction)
    .where(
      and(
        eq(walletTransaction.walletId, walletId),
        eq(walletTransaction.status, "completed"),
        gte(walletTransaction.completedAt, prevStartDate),
        lt(walletTransaction.completedAt, startDate),
        sql`${walletTransaction.type} IN ('withdrawal', 'expense_disbursement', 'transfer', 'airtime_purchase', 'bill_payment')`
      )
    );

  const currentTotal = parseFloat(currentOutflows[0]?.total || "0");
  const previousTotal = parseFloat(previousOutflows[0]?.total || "0");

  const dailyBurn = currentTotal / periodDays;
  const weeklyBurn = dailyBurn * 7;
  const monthlyBurn = dailyBurn * 30;

  // Calculate trend
  let trend: "increasing" | "decreasing" | "stable" = "stable";
  let trendPercentage = 0;

  if (previousTotal > 0) {
    const percentChange = ((currentTotal - previousTotal) / previousTotal) * 100;
    trendPercentage = Math.round(percentChange * 10) / 10;

    if (percentChange > 5) {
      trend = "increasing";
    } else if (percentChange < -5) {
      trend = "decreasing";
    }
  }

  return {
    daily: Math.round(dailyBurn * 100) / 100,
    weekly: Math.round(weeklyBurn * 100) / 100,
    monthly: Math.round(monthlyBurn * 100) / 100,
    trend,
    trendPercentage,
  };
}

/**
 * Predict runway based on current balance and burn rate
 */
export async function predictRunway(
  walletId: string
): Promise<RunwayPrediction> {
  const summary = await getCashPositionSummary(walletId);
  const burnRate = await calculateBurnRate(walletId, 30);

  if (!summary || burnRate.daily <= 0) {
    return {
      daysRemaining: Infinity,
      monthsRemaining: Infinity,
      projectedZeroDate: null,
      confidence: "low",
    };
  }

  const daysRemaining = summary.availableBalance / burnRate.daily;
  const monthsRemaining = daysRemaining / 30;

  // Calculate projected zero date
  const projectedZeroDate = new Date();
  projectedZeroDate.setDate(projectedZeroDate.getDate() + Math.floor(daysRemaining));

  // Determine confidence based on data consistency
  let confidence: "high" | "medium" | "low" = "medium";
  if (burnRate.trend === "stable" && Math.abs(burnRate.trendPercentage) < 10) {
    confidence = "high";
  } else if (Math.abs(burnRate.trendPercentage) > 30) {
    confidence = "low";
  }

  return {
    daysRemaining: Math.round(daysRemaining * 10) / 10,
    monthsRemaining: Math.round(monthsRemaining * 10) / 10,
    projectedZeroDate: daysRemaining > 0 ? projectedZeroDate : new Date(),
    confidence,
  };
}

/**
 * Generate alerts based on cash position
 */
export async function generateCashAlerts(
  walletId: string,
  thresholds: CashThresholdConfig = DEFAULT_CASH_THRESHOLDS
): Promise<CashPositionAlert[]> {
  const alerts: CashPositionAlert[] = [];
  const summary = await getCashPositionSummary(walletId);
  const burnRate = await calculateBurnRate(walletId, 30);
  const runway = await predictRunway(walletId);

  if (!summary) return alerts;

  const now = new Date();

  // Low balance alerts
  if (summary.availableBalance <= thresholds.lowBalanceCritical) {
    alerts.push({
      id: `low-balance-critical-${now.getTime()}`,
      type: "low_balance",
      severity: "critical",
      title: "Critical: Low Cash Balance",
      message: `Available balance (${formatCurrency(summary.availableBalance, summary.currency)}) is below critical threshold`,
      value: summary.availableBalance,
      threshold: thresholds.lowBalanceCritical,
      createdAt: now,
      acknowledged: false,
    });
  } else if (summary.availableBalance <= thresholds.lowBalanceWarning) {
    alerts.push({
      id: `low-balance-warning-${now.getTime()}`,
      type: "low_balance",
      severity: "warning",
      title: "Warning: Low Cash Balance",
      message: `Available balance (${formatCurrency(summary.availableBalance, summary.currency)}) is approaching low threshold`,
      value: summary.availableBalance,
      threshold: thresholds.lowBalanceWarning,
      createdAt: now,
      acknowledged: false,
    });
  }

  // Short runway alerts
  if (runway.daysRemaining <= thresholds.runwayCriticalDays && runway.daysRemaining !== Infinity) {
    alerts.push({
      id: `short-runway-critical-${now.getTime()}`,
      type: "short_runway",
      severity: "critical",
      title: "Critical: Short Cash Runway",
      message: `At current burn rate, funds will last only ${runway.daysRemaining.toFixed(0)} days`,
      value: runway.daysRemaining,
      threshold: thresholds.runwayCriticalDays,
      createdAt: now,
      acknowledged: false,
    });
  } else if (runway.daysRemaining <= thresholds.runwayWarningDays && runway.daysRemaining !== Infinity) {
    alerts.push({
      id: `short-runway-warning-${now.getTime()}`,
      type: "short_runway",
      severity: "warning",
      title: "Warning: Limited Cash Runway",
      message: `At current burn rate, funds will last approximately ${runway.daysRemaining.toFixed(0)} days`,
      value: runway.daysRemaining,
      threshold: thresholds.runwayWarningDays,
      createdAt: now,
      acknowledged: false,
    });
  }

  // High burn rate increase alert
  if (burnRate.trend === "increasing" && burnRate.trendPercentage >= thresholds.burnRateIncreaseWarning) {
    alerts.push({
      id: `high-burn-rate-${now.getTime()}`,
      type: "high_burn_rate",
      severity: "warning",
      title: "Warning: Burn Rate Increasing",
      message: `Spending has increased by ${burnRate.trendPercentage.toFixed(1)}% compared to previous period`,
      value: burnRate.trendPercentage,
      threshold: thresholds.burnRateIncreaseWarning,
      createdAt: now,
      acknowledged: false,
    });
  }

  // Check for large recent outflows
  const recentLargeOutflows = await getRecentLargeOutflows(
    walletId,
    thresholds.largeOutflowThreshold,
    7 // Last 7 days
  );

  for (const outflow of recentLargeOutflows) {
    alerts.push({
      id: `large-outflow-${outflow.id}`,
      type: "large_outflow",
      severity: "info",
      title: "Large Transaction Detected",
      message: `${outflow.description || "Large outflow"}: ${formatCurrency(Math.abs(parseFloat(outflow.amount)), summary.currency)}`,
      value: Math.abs(parseFloat(outflow.amount)),
      threshold: thresholds.largeOutflowThreshold,
      createdAt: outflow.completedAt || new Date(),
      acknowledged: false,
    });
  }

  return alerts;
}

/**
 * Get recent large outflow transactions
 */
async function getRecentLargeOutflows(
  walletId: string,
  threshold: number,
  days: number
): Promise<WalletTransaction[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const outflows = await database
    .select()
    .from(walletTransaction)
    .where(
      and(
        eq(walletTransaction.walletId, walletId),
        eq(walletTransaction.status, "completed"),
        gte(walletTransaction.completedAt, startDate),
        sql`ABS(CAST(${walletTransaction.netAmount} AS DECIMAL)) >= ${threshold}`,
        sql`${walletTransaction.type} IN ('withdrawal', 'expense_disbursement', 'transfer', 'bill_payment')`
      )
    )
    .orderBy(desc(walletTransaction.completedAt))
    .limit(5);

  return outflows;
}

/**
 * Generate liquidity improvement suggestions
 */
export async function generateLiquiditySuggestions(
  walletId: string
): Promise<LiquiditySuggestion[]> {
  const suggestions: LiquiditySuggestion[] = [];
  const summary = await getCashPositionSummary(walletId);
  const burnRate = await calculateBurnRate(walletId, 30);
  const runway = await predictRunway(walletId);

  if (!summary) return suggestions;

  // Always provide some general suggestions
  suggestions.push({
    id: "review-recurring-expenses",
    title: "Review Recurring Expenses",
    description: "Identify and eliminate unnecessary subscriptions and recurring charges",
    potentialImpact: burnRate.monthly * 0.1, // Assume 10% potential savings
    priority: burnRate.trend === "increasing" ? "high" : "medium",
    category: "reduce_expenses",
  });

  suggestions.push({
    id: "optimize-payment-timing",
    title: "Optimize Payment Timing",
    description: "Schedule large payments to align with expected inflows",
    potentialImpact: burnRate.monthly * 0.05,
    priority: "medium",
    category: "optimize_timing",
  });

  // Context-specific suggestions based on runway
  if (runway.daysRemaining < 90 && runway.daysRemaining !== Infinity) {
    suggestions.push({
      id: "accelerate-collections",
      title: "Accelerate Collections",
      description: "Follow up on outstanding receivables and consider early payment discounts",
      potentialImpact: summary.currentBalance * 0.15,
      priority: "high",
      category: "accelerate_receivables",
    });

    suggestions.push({
      id: "negotiate-payment-terms",
      title: "Negotiate Extended Payment Terms",
      description: "Request extended payment terms from suppliers to preserve cash",
      potentialImpact: burnRate.monthly * 0.3,
      priority: "high",
      category: "optimize_timing",
    });
  }

  if (burnRate.trend === "increasing") {
    suggestions.push({
      id: "implement-spending-controls",
      title: "Implement Spending Controls",
      description: "Set up approval workflows for purchases above threshold",
      potentialImpact: burnRate.monthly * 0.15,
      priority: "high",
      category: "reduce_expenses",
    });
  }

  // Reserve building suggestion
  if (summary.availableBalance < burnRate.monthly * 3) {
    suggestions.push({
      id: "build-cash-reserve",
      title: "Build Cash Reserve",
      description: "Aim to maintain at least 3 months of operating expenses in reserve",
      potentialImpact: burnRate.monthly * 3 - summary.availableBalance,
      priority: runway.daysRemaining < 60 ? "high" : "medium",
      category: "increase_reserves",
    });
  }

  // Sort by priority and potential impact
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  suggestions.sort((a, b) => {
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return b.potentialImpact - a.potentialImpact;
  });

  return suggestions;
}

/**
 * Get complete cash position monitor data
 */
export async function getCashPositionMonitorData(
  walletId: string,
  periodDays: number = 30,
  thresholds?: CashThresholdConfig
): Promise<CashPositionMonitorData | null> {
  const summary = await getCashPositionSummary(walletId);
  if (!summary) return null;

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - periodDays);

  const [cashFlow, burnRate, runway, alerts, suggestions] = await Promise.all([
    getCashFlowHistory(walletId, startDate, endDate),
    calculateBurnRate(walletId, periodDays),
    predictRunway(walletId),
    generateCashAlerts(walletId, thresholds || DEFAULT_CASH_THRESHOLDS),
    generateLiquiditySuggestions(walletId),
  ]);

  return {
    summary,
    cashFlow,
    burnRate,
    runway,
    alerts,
    suggestions,
    lastRefreshed: new Date(),
  };
}

/**
 * Get cash position monitor data by user ID
 */
export async function getCashPositionMonitorDataByUserId(
  userId: string,
  periodDays: number = 30,
  thresholds?: CashThresholdConfig
): Promise<CashPositionMonitorData | null> {
  // Get wallet ID for user
  const wallet = await database
    .select({ id: userWallet.id })
    .from(userWallet)
    .where(eq(userWallet.userId, userId))
    .limit(1);

  if (wallet.length === 0) return null;

  return getCashPositionMonitorData(wallet[0].id, periodDays, thresholds);
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Determine if transaction type is an inflow
 */
function isInflowType(type: string): boolean {
  const inflowTypes = ["deposit", "credit", "refund", "reversal_credit", "adjustment_credit"];
  return inflowTypes.includes(type);
}

/**
 * Format currency for display
 */
function formatCurrency(amount: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
