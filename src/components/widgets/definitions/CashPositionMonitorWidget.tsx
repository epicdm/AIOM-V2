import * as React from "react";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  AlertCircle,
  Clock,
  Flame,
  ChevronRight,
  Lightbulb,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Activity,
  X,
} from "lucide-react";
import { cn } from "~/lib/utils";
import type { WidgetDefinition, WidgetProps } from "../types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";

// =============================================================================
// Types
// =============================================================================

export type CashAlertSeverity = "info" | "warning" | "critical";

export interface CashPositionAlert {
  id: string;
  type: string;
  severity: CashAlertSeverity;
  title: string;
  message: string;
  value?: number;
  threshold?: number;
  createdAt: Date;
  acknowledged: boolean;
}

export interface CashFlowEntry {
  date: string;
  inflow: number;
  outflow: number;
  netFlow: number;
  balance: number;
}

export interface BurnRateAnalysis {
  daily: number;
  weekly: number;
  monthly: number;
  trend: "increasing" | "decreasing" | "stable";
  trendPercentage: number;
}

export interface RunwayPrediction {
  daysRemaining: number;
  monthsRemaining: number;
  projectedZeroDate: Date | null;
  confidence: "high" | "medium" | "low";
}

export interface LiquiditySuggestion {
  id: string;
  title: string;
  description: string;
  potentialImpact: number;
  priority: "high" | "medium" | "low";
  category: string;
}

export interface CashPositionSummary {
  currentBalance: number;
  availableBalance: number;
  pendingBalance: number;
  currency: string;
  lastUpdated: Date;
}

/**
 * Cash Position Monitor Widget Data
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

/**
 * Cash Position Monitor Widget Config
 */
export interface CashPositionMonitorConfig {
  showTrends: boolean;
  showAlerts: boolean;
  showSuggestions: boolean;
  showCashFlow: boolean;
  showRunway: boolean;
  currency: string;
  periodDays: number;
  compactMode: boolean;
  lowBalanceWarning: number;
  lowBalanceCritical: number;
  runwayWarningDays: number;
  runwayCriticalDays: number;
}

// =============================================================================
// Drill-down Modal State
// =============================================================================

type DrillDownType = "balance" | "runway" | "alerts" | "suggestions" | "cash-flow" | null;

// =============================================================================
// Utility Functions
// =============================================================================

function formatCurrency(amount: number, currency: string = "USD"): string {
  if (!isFinite(amount)) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatCompactNumber(value: number): string {
  if (!isFinite(value)) return "N/A";
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toFixed(0);
}

function formatDate(date: Date | string | null): string {
  if (!date) return "N/A";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// =============================================================================
// Sub-components
// =============================================================================

/**
 * Mini Cash Flow Chart - Simple bar visualization
 */
function CashFlowMiniChart({ data, currency }: { data: CashFlowEntry[]; currency: string }) {
  if (data.length === 0) return null;

  // Get last 7 days of data
  const recentData = data.slice(-7);
  const maxValue = Math.max(...recentData.map((d) => Math.max(d.inflow, d.outflow)));

  return (
    <div className="space-y-1">
      <div className="flex items-end gap-1 h-12">
        {recentData.map((entry, i) => {
          const inflowHeight = maxValue > 0 ? (entry.inflow / maxValue) * 100 : 0;
          const outflowHeight = maxValue > 0 ? (entry.outflow / maxValue) * 100 : 0;

          return (
            <div key={i} className="flex-1 flex gap-0.5 items-end">
              <div
                className="flex-1 bg-green-500/70 rounded-t"
                style={{ height: `${inflowHeight}%`, minHeight: entry.inflow > 0 ? 2 : 0 }}
                title={`In: ${formatCurrency(entry.inflow, currency)}`}
              />
              <div
                className="flex-1 bg-red-500/70 rounded-t"
                style={{ height: `${outflowHeight}%`, minHeight: entry.outflow > 0 ? 2 : 0 }}
                title={`Out: ${formatCurrency(entry.outflow, currency)}`}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[9px] text-muted-foreground px-1">
        <span>7 days ago</span>
        <span>Today</span>
      </div>
    </div>
  );
}

/**
 * Alert Badge component
 */
function AlertBadge({ severity, count }: { severity: CashAlertSeverity; count: number }) {
  const colors = {
    info: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    warning: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    critical: "bg-red-500/10 text-red-500 border-red-500/20",
  };

  return (
    <span className={cn("px-1.5 py-0.5 rounded text-xs font-medium border", colors[severity])}>
      {count}
    </span>
  );
}

/**
 * Runway Indicator
 */
function RunwayIndicator({ runway, currency }: { runway: RunwayPrediction; currency: string }) {
  const isInfinite = !isFinite(runway.daysRemaining);

  const getColor = () => {
    if (isInfinite) return "text-green-500";
    if (runway.daysRemaining <= 30) return "text-red-500";
    if (runway.daysRemaining <= 90) return "text-yellow-500";
    return "text-green-500";
  };

  const getIcon = () => {
    if (isInfinite) return <TrendingUp className="w-4 h-4" />;
    if (runway.daysRemaining <= 30) return <AlertTriangle className="w-4 h-4" />;
    if (runway.daysRemaining <= 90) return <Clock className="w-4 h-4" />;
    return <TrendingUp className="w-4 h-4" />;
  };

  return (
    <div className={cn("flex items-center gap-2", getColor())}>
      {getIcon()}
      <div>
        <p className="font-semibold">
          {isInfinite ? "Sustainable" : `${runway.daysRemaining.toFixed(0)} days`}
        </p>
        {!isInfinite && runway.projectedZeroDate && (
          <p className="text-[10px] text-muted-foreground">
            Zero by {formatDate(runway.projectedZeroDate)}
          </p>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Drill-Down Dialogs
// =============================================================================

function DrillDownDialog({
  open,
  onClose,
  type,
  data,
}: {
  open: boolean;
  onClose: () => void;
  type: DrillDownType;
  data: CashPositionMonitorData;
}) {
  if (!type) return null;

  const getTitle = () => {
    switch (type) {
      case "balance": return "Cash Position Details";
      case "runway": return "Runway Analysis";
      case "alerts": return "Active Alerts";
      case "suggestions": return "Liquidity Improvement Suggestions";
      case "cash-flow": return "Cash Flow History";
      default: return "Details";
    }
  };

  const getDescription = () => {
    switch (type) {
      case "balance": return "Detailed breakdown of your current cash position";
      case "runway": return "Projected cash runway based on current burn rate";
      case "alerts": return "Alerts requiring your attention";
      case "suggestions": return "Actionable suggestions to improve your liquidity";
      case "cash-flow": return "Recent cash flow trends and patterns";
      default: return "";
    }
  };

  const renderContent = () => {
    switch (type) {
      case "balance":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-xs text-muted-foreground">Current Balance</p>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(data.summary.currentBalance, data.summary.currency)}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <p className="text-xs text-muted-foreground">Available</p>
                <p className="text-2xl font-bold text-green-500">
                  {formatCurrency(data.summary.availableBalance, data.summary.currency)}
                </p>
              </div>
            </div>
            {data.summary.pendingBalance > 0 && (
              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <p className="text-xs text-muted-foreground">Pending Transactions</p>
                <p className="text-lg font-semibold text-yellow-600">
                  {formatCurrency(data.summary.pendingBalance, data.summary.currency)}
                </p>
              </div>
            )}
            <div className="text-xs text-muted-foreground text-center">
              Last updated: {formatDate(data.summary.lastUpdated)}
            </div>
          </div>
        );

      case "runway":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <p className="text-xs text-muted-foreground">Days Remaining</p>
                </div>
                <p className="text-2xl font-bold text-blue-500">
                  {isFinite(data.runway.daysRemaining)
                    ? data.runway.daysRemaining.toFixed(0)
                    : "Sustainable"}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-500" />
                  <p className="text-xs text-muted-foreground">Monthly Burn</p>
                </div>
                <p className="text-2xl font-bold text-orange-500">
                  {formatCurrency(data.burnRate.monthly, data.summary.currency)}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Burn Rate Breakdown</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Daily</span>
                  <span>{formatCurrency(data.burnRate.daily, data.summary.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Weekly</span>
                  <span>{formatCurrency(data.burnRate.weekly, data.summary.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Monthly</span>
                  <span className="font-medium">{formatCurrency(data.burnRate.monthly, data.summary.currency)}</span>
                </div>
              </div>
            </div>

            <div className={cn(
              "p-3 rounded-lg flex items-center gap-2",
              data.burnRate.trend === "increasing"
                ? "bg-red-500/10 border border-red-500/20"
                : data.burnRate.trend === "decreasing"
                  ? "bg-green-500/10 border border-green-500/20"
                  : "bg-muted/50"
            )}>
              {data.burnRate.trend === "increasing" ? (
                <TrendingUp className="w-4 h-4 text-red-500" />
              ) : data.burnRate.trend === "decreasing" ? (
                <TrendingDown className="w-4 h-4 text-green-500" />
              ) : (
                <Activity className="w-4 h-4 text-muted-foreground" />
              )}
              <div>
                <p className="text-sm font-medium">
                  Burn Rate {data.burnRate.trend === "increasing" ? "Increasing" : data.burnRate.trend === "decreasing" ? "Decreasing" : "Stable"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {Math.abs(data.burnRate.trendPercentage).toFixed(1)}% compared to previous period
                </p>
              </div>
            </div>

            {isFinite(data.runway.daysRemaining) && data.runway.projectedZeroDate && (
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm font-medium">Projected Zero Date</p>
                <p className="text-lg">{formatDate(data.runway.projectedZeroDate)}</p>
                <p className="text-xs text-muted-foreground">
                  Confidence: {data.runway.confidence}
                </p>
              </div>
            )}
          </div>
        );

      case "alerts":
        return (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {data.alerts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No active alerts</p>
              </div>
            ) : (
              data.alerts.map((alert) => {
                const colors = {
                  info: "bg-blue-500/10 border-blue-500/20",
                  warning: "bg-yellow-500/10 border-yellow-500/20",
                  critical: "bg-red-500/10 border-red-500/20",
                };
                const iconColors = {
                  info: "text-blue-500",
                  warning: "text-yellow-500",
                  critical: "text-red-500",
                };

                return (
                  <div
                    key={alert.id}
                    className={cn("p-3 rounded-lg border", colors[alert.severity])}
                  >
                    <div className="flex items-start gap-2">
                      <AlertCircle className={cn("w-4 h-4 mt-0.5", iconColors[alert.severity])} />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{alert.title}</p>
                        <p className="text-xs text-muted-foreground">{alert.message}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {formatDate(alert.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        );

      case "suggestions":
        return (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {data.suggestions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Lightbulb className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No suggestions at this time</p>
              </div>
            ) : (
              data.suggestions.map((suggestion) => {
                const priorityColors = {
                  high: "bg-red-500/10 border-red-500/20",
                  medium: "bg-yellow-500/10 border-yellow-500/20",
                  low: "bg-blue-500/10 border-blue-500/20",
                };

                return (
                  <div
                    key={suggestion.id}
                    className={cn("p-3 rounded-lg border", priorityColors[suggestion.priority])}
                  >
                    <div className="flex items-start gap-2">
                      <Lightbulb className="w-4 h-4 mt-0.5 text-yellow-500" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">{suggestion.title}</p>
                          <span className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded",
                            suggestion.priority === "high"
                              ? "bg-red-500/20 text-red-500"
                              : suggestion.priority === "medium"
                                ? "bg-yellow-500/20 text-yellow-600"
                                : "bg-blue-500/20 text-blue-500"
                          )}>
                            {suggestion.priority}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{suggestion.description}</p>
                        {suggestion.potentialImpact > 0 && (
                          <p className="text-xs text-green-500 mt-1">
                            Potential impact: {formatCurrency(suggestion.potentialImpact, data.summary.currency)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        );

      case "cash-flow":
        return (
          <div className="space-y-4">
            <CashFlowMiniChart data={data.cashFlow} currency={data.summary.currency} />

            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded bg-green-500/10">
                <p className="text-xs text-muted-foreground">Total Inflow</p>
                <p className="text-sm font-medium text-green-500">
                  {formatCurrency(
                    data.cashFlow.reduce((sum, d) => sum + d.inflow, 0),
                    data.summary.currency
                  )}
                </p>
              </div>
              <div className="p-2 rounded bg-red-500/10">
                <p className="text-xs text-muted-foreground">Total Outflow</p>
                <p className="text-sm font-medium text-red-500">
                  {formatCurrency(
                    data.cashFlow.reduce((sum, d) => sum + d.outflow, 0),
                    data.summary.currency
                  )}
                </p>
              </div>
              <div className="p-2 rounded bg-muted/50">
                <p className="text-xs text-muted-foreground">Net Flow</p>
                <p className={cn(
                  "text-sm font-medium",
                  data.cashFlow.reduce((sum, d) => sum + d.netFlow, 0) >= 0
                    ? "text-green-500"
                    : "text-red-500"
                )}>
                  {formatCurrency(
                    data.cashFlow.reduce((sum, d) => sum + d.netFlow, 0),
                    data.summary.currency
                  )}
                </p>
              </div>
            </div>

            {/* Recent transactions */}
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {data.cashFlow.slice(-7).reverse().map((entry, i) => (
                <div key={i} className="flex items-center justify-between text-xs p-2 rounded bg-muted/30">
                  <span className="text-muted-foreground">{entry.date}</span>
                  <div className="flex gap-3">
                    {entry.inflow > 0 && (
                      <span className="text-green-500">+{formatCompactNumber(entry.inflow)}</span>
                    )}
                    {entry.outflow > 0 && (
                      <span className="text-red-500">-{formatCompactNumber(entry.outflow)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>
        <div className="py-2">{renderContent()}</div>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Main Widget Component
// =============================================================================

function CashPositionMonitorWidgetComponent({
  data,
  isLoading,
  error,
  instance,
  size,
  onRefresh,
}: WidgetProps<CashPositionMonitorData, CashPositionMonitorConfig>) {
  const config = instance.config as unknown as CashPositionMonitorConfig;
  const [drillDownType, setDrillDownType] = React.useState<DrillDownType>(null);

  // Sample data for when no real data is available
  const sampleData: CashPositionMonitorData = {
    summary: {
      currentBalance: 47500,
      availableBalance: 45000,
      pendingBalance: 2500,
      currency: config.currency || "USD",
      lastUpdated: new Date(),
    },
    cashFlow: Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return {
        date: date.toISOString().split("T")[0],
        inflow: Math.random() * 5000 + 1000,
        outflow: Math.random() * 3000 + 500,
        netFlow: 0,
        balance: 45000 + i * 100,
      };
    }).map((entry) => ({
      ...entry,
      netFlow: entry.inflow - entry.outflow,
    })),
    burnRate: {
      daily: 1450,
      weekly: 10150,
      monthly: 43500,
      trend: "decreasing" as const,
      trendPercentage: -8.5,
    },
    runway: {
      daysRemaining: 31,
      monthsRemaining: 1.03,
      projectedZeroDate: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000),
      confidence: "medium" as const,
    },
    alerts: [
      {
        id: "alert-1",
        type: "short_runway",
        severity: "warning" as const,
        title: "Limited Runway",
        message: "Cash runway is below 90 days at current burn rate",
        value: 31,
        threshold: 90,
        createdAt: new Date(),
        acknowledged: false,
      },
    ],
    suggestions: [
      {
        id: "sug-1",
        title: "Review Recurring Expenses",
        description: "Identify and eliminate unnecessary subscriptions",
        potentialImpact: 4350,
        priority: "medium" as const,
        category: "reduce_expenses",
      },
      {
        id: "sug-2",
        title: "Accelerate Collections",
        description: "Follow up on outstanding receivables",
        potentialImpact: 6750,
        priority: "high" as const,
        category: "accelerate_receivables",
      },
    ],
    lastRefreshed: new Date(),
  };

  const displayData = data ?? sampleData;

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px]">
        <div className="animate-pulse flex flex-col space-y-4 w-full p-4">
          <div className="h-16 bg-muted rounded-lg" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-20 bg-muted rounded-lg" />
            <div className="h-20 bg-muted rounded-lg" />
          </div>
          <div className="h-12 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px] text-destructive">
        <AlertCircle className="w-5 h-5 mr-2" />
        <span>{error}</span>
      </div>
    );
  }

  const isCompact = config.compactMode || size === "small";
  const isLarge = size === "large" || size === "full";
  const showAlerts = config.showAlerts !== false;
  const showSuggestions = config.showSuggestions !== false && isLarge;
  const showCashFlow = config.showCashFlow !== false && !isCompact;
  const showRunway = config.showRunway !== false;

  // Count alerts by severity
  const alertCounts = displayData.alerts.reduce(
    (acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1;
      return acc;
    },
    {} as Record<CashAlertSeverity, number>
  );

  return (
    <div className="space-y-4" data-testid="cash-position-monitor-widget">
      {/* Drill-down Dialog */}
      <DrillDownDialog
        open={drillDownType !== null}
        onClose={() => setDrillDownType(null)}
        type={drillDownType}
        data={displayData}
      />

      {/* Cash Position - Main Hero */}
      <div
        className="text-center pb-4 border-b cursor-pointer hover:bg-muted/30 rounded-lg transition-colors -mx-1 px-1"
        onClick={() => setDrillDownType("balance")}
        data-testid="balance-section"
      >
        <p className="text-sm text-muted-foreground mb-1">Available Cash</p>
        <div className="flex items-center justify-center gap-2">
          <Wallet className="w-6 h-6 text-primary" />
          <span className={cn("font-bold", isCompact ? "text-2xl" : "text-3xl")}>
            {isCompact
              ? `$${formatCompactNumber(displayData.summary.availableBalance)}`
              : formatCurrency(displayData.summary.availableBalance, displayData.summary.currency)}
          </span>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>
        {displayData.summary.pendingBalance > 0 && (
          <p className="text-xs text-yellow-500 mt-1">
            {formatCurrency(displayData.summary.pendingBalance, displayData.summary.currency)} pending
          </p>
        )}
      </div>

      {/* Runway & Burn Rate */}
      {showRunway && (
        <div className="grid grid-cols-2 gap-3">
          <div
            className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 cursor-pointer hover:bg-blue-500/20 transition-colors"
            onClick={() => setDrillDownType("runway")}
            data-testid="runway-section"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-muted-foreground">Runway</span>
              </div>
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
            </div>
            <RunwayIndicator runway={displayData.runway} currency={displayData.summary.currency} />
          </div>

          <div
            className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 cursor-pointer hover:bg-orange-500/20 transition-colors"
            onClick={() => setDrillDownType("runway")}
            data-testid="burn-rate-section"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="text-xs text-muted-foreground">Monthly Burn</span>
              </div>
              {displayData.burnRate.trend !== "stable" && (
                <span className={cn(
                  "text-[10px]",
                  displayData.burnRate.trend === "increasing" ? "text-red-500" : "text-green-500"
                )}>
                  {displayData.burnRate.trend === "increasing" ? (
                    <TrendingUp className="w-3 h-3 inline" />
                  ) : (
                    <TrendingDown className="w-3 h-3 inline" />
                  )}
                </span>
              )}
            </div>
            <p className="font-semibold text-orange-500">
              {isCompact
                ? `$${formatCompactNumber(displayData.burnRate.monthly)}`
                : formatCurrency(displayData.burnRate.monthly, displayData.summary.currency)}
            </p>
          </div>
        </div>
      )}

      {/* Cash Flow Chart */}
      {showCashFlow && displayData.cashFlow.length > 0 && (
        <div
          className="p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
          onClick={() => setDrillDownType("cash-flow")}
          data-testid="cash-flow-section"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Cash Flow (7 days)</span>
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
          </div>
          <CashFlowMiniChart data={displayData.cashFlow} currency={displayData.summary.currency} />
        </div>
      )}

      {/* Alerts Section */}
      {showAlerts && displayData.alerts.length > 0 && (
        <div
          className="p-3 rounded-lg bg-red-500/5 border border-red-500/10 cursor-pointer hover:bg-red-500/10 transition-colors"
          onClick={() => setDrillDownType("alerts")}
          data-testid="alerts-section"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="text-sm font-medium">
                {displayData.alerts.length} Alert{displayData.alerts.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex gap-1">
              {alertCounts.critical && <AlertBadge severity="critical" count={alertCounts.critical} />}
              {alertCounts.warning && <AlertBadge severity="warning" count={alertCounts.warning} />}
              {alertCounts.info && <AlertBadge severity="info" count={alertCounts.info} />}
            </div>
          </div>
        </div>
      )}

      {/* Suggestions Section - Only on large sizes */}
      {showSuggestions && displayData.suggestions.length > 0 && (
        <div
          className="p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/10 cursor-pointer hover:bg-yellow-500/10 transition-colors"
          onClick={() => setDrillDownType("suggestions")}
          data-testid="suggestions-section"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium">Suggestions</span>
            </div>
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground line-clamp-1">
            {displayData.suggestions[0]?.title}
            {displayData.suggestions.length > 1 && ` +${displayData.suggestions.length - 1} more`}
          </p>
        </div>
      )}

      {/* Refresh indicator */}
      {onRefresh && (
        <div className="flex justify-center pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            className="text-xs text-muted-foreground"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Refresh
          </Button>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Widget Definition
// =============================================================================

export const CashPositionMonitorWidgetDefinition: WidgetDefinition<
  CashPositionMonitorData,
  CashPositionMonitorConfig
> = {
  id: "cash-position-monitor",
  name: "Cash Position Monitor",
  description: "Monitor cash flow, runway predictions, and receive alerts when balances approach thresholds. Includes liquidity improvement suggestions.",
  category: "finance",
  defaultSize: "medium",
  supportedSizes: ["small", "medium", "large", "full"],
  icon: Wallet,
  dataRequirements: [
    {
      key: "cashPosition",
      label: "Cash Position Data",
      description: "Real-time wallet balance and cash flow data",
      required: true,
      type: "query",
    },
    {
      key: "burnRate",
      label: "Burn Rate Analysis",
      description: "Calculated burn rate and trends",
      required: true,
      type: "computed",
    },
    {
      key: "runway",
      label: "Runway Prediction",
      description: "Projected cash runway based on burn rate",
      required: true,
      type: "computed",
    },
    {
      key: "alerts",
      label: "Cash Alerts",
      description: "Threshold-based alerts for cash position",
      required: false,
      type: "computed",
    },
    {
      key: "suggestions",
      label: "Liquidity Suggestions",
      description: "AI-powered suggestions to improve liquidity",
      required: false,
      type: "computed",
    },
  ],
  configOptions: [
    {
      key: "showTrends",
      label: "Show Trends",
      description: "Display trend indicators",
      type: "boolean",
      defaultValue: true,
    },
    {
      key: "showAlerts",
      label: "Show Alerts",
      description: "Display active alerts",
      type: "boolean",
      defaultValue: true,
    },
    {
      key: "showSuggestions",
      label: "Show Suggestions",
      description: "Display liquidity improvement suggestions",
      type: "boolean",
      defaultValue: true,
    },
    {
      key: "showCashFlow",
      label: "Show Cash Flow",
      description: "Display cash flow chart",
      type: "boolean",
      defaultValue: true,
    },
    {
      key: "showRunway",
      label: "Show Runway",
      description: "Display runway prediction",
      type: "boolean",
      defaultValue: true,
    },
    {
      key: "currency",
      label: "Currency",
      description: "Currency for display",
      type: "select",
      defaultValue: "USD",
      options: [
        { label: "USD ($)", value: "USD" },
        { label: "EUR", value: "EUR" },
        { label: "GBP", value: "GBP" },
        { label: "NGN", value: "NGN" },
        { label: "KES", value: "KES" },
      ],
    },
    {
      key: "periodDays",
      label: "Analysis Period",
      description: "Number of days for analysis",
      type: "select",
      defaultValue: 30,
      options: [
        { label: "7 Days", value: 7 },
        { label: "14 Days", value: 14 },
        { label: "30 Days", value: 30 },
        { label: "90 Days", value: 90 },
      ],
    },
    {
      key: "compactMode",
      label: "Compact Mode",
      description: "Use compact display",
      type: "boolean",
      defaultValue: false,
    },
    {
      key: "lowBalanceWarning",
      label: "Low Balance Warning",
      description: "Warning threshold for low balance",
      type: "number",
      defaultValue: 10000,
      validation: { min: 0 },
    },
    {
      key: "lowBalanceCritical",
      label: "Low Balance Critical",
      description: "Critical threshold for low balance",
      type: "number",
      defaultValue: 5000,
      validation: { min: 0 },
    },
    {
      key: "runwayWarningDays",
      label: "Runway Warning Days",
      description: "Warning threshold for runway (days)",
      type: "number",
      defaultValue: 90,
      validation: { min: 1 },
    },
    {
      key: "runwayCriticalDays",
      label: "Runway Critical Days",
      description: "Critical threshold for runway (days)",
      type: "number",
      defaultValue: 30,
      validation: { min: 1 },
    },
  ],
  component: CashPositionMonitorWidgetComponent,
  defaultConfig: {
    showTrends: true,
    showAlerts: true,
    showSuggestions: true,
    showCashFlow: true,
    showRunway: true,
    currency: "USD",
    periodDays: 30,
    compactMode: false,
    lowBalanceWarning: 10000,
    lowBalanceCritical: 5000,
    runwayWarningDays: 90,
    runwayCriticalDays: 30,
  },
  supportsRefresh: true,
  minRefreshInterval: 30000, // 30 seconds
};
