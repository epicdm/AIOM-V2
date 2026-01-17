/**
 * Anomaly Detection Widget
 *
 * Dashboard widget for displaying ML-powered anomaly detection alerts.
 * Shows recent anomalies detected across expenses, transactions,
 * task completion rates, and user behavior.
 */

import * as React from "react";
import {
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Activity,
  Eye,
  CheckCircle,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { cn } from "~/lib/utils";
import type { WidgetDefinition, WidgetProps } from "../types";
import {
  useUnresolvedAlerts,
  useAnomalyStats,
  useAcknowledgeAlert,
  useDismissAlert,
} from "~/hooks/useAnomalyDetection";
import type {
  AnomalyCategory,
  AnomalySeverity,
} from "~/lib/anomaly-detection-service/types";

// =============================================================================
// Types
// =============================================================================

export interface AnomalyAlertItem {
  id: string;
  title: string;
  description: string;
  category: AnomalyCategory;
  severity: AnomalySeverity;
  status: string;
  metric: string;
  observedValue: number;
  expectedValue: number;
  deviation: number;
  anomalyScore: number;
  confidenceScore: number;
  detectedAt: Date;
  entityType?: string;
  entityId?: string;
}

export interface AnomalyDetectionData {
  alerts: AnomalyAlertItem[];
  stats: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    todayCount: number;
    weekCount: number;
  };
}

export interface AnomalyDetectionConfig {
  maxItems: number;
  showCriticalOnly: boolean;
  filterByCategory: AnomalyCategory | null;
  showTrend: boolean;
  autoRefresh: boolean;
}

// =============================================================================
// Helpers
// =============================================================================

const severityColors = {
  low: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    text: "text-blue-600",
    icon: "text-blue-500",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  medium: {
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/20",
    text: "text-yellow-600",
    icon: "text-yellow-500",
    badge: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  high: {
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
    text: "text-orange-600",
    icon: "text-orange-500",
    badge: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  },
  critical: {
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    text: "text-red-600",
    icon: "text-red-500",
    badge: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
};

const categoryLabels: Record<AnomalyCategory, string> = {
  expense: "Expense",
  transaction: "Transaction",
  task_completion: "Task",
  user_behavior: "User",
  system: "System",
};

const categoryIcons: Record<AnomalyCategory, React.ElementType> = {
  expense: TrendingDown,
  transaction: Activity,
  task_completion: CheckCircle,
  user_behavior: Eye,
  system: AlertCircle,
};

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(date).toLocaleDateString();
}

function formatValue(value: number): string {
  if (Math.abs(value) >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toFixed(2);
}

function getDeviationLabel(deviation: number): string {
  const absDeviation = Math.abs(deviation);
  if (absDeviation < 2) return "slightly";
  if (absDeviation < 3) return "moderately";
  if (absDeviation < 4) return "significantly";
  return "extremely";
}

// =============================================================================
// Component
// =============================================================================

function AnomalyDetectionWidgetComponent({
  data,
  isLoading: propIsLoading,
  error: propError,
  instance,
  onRefresh,
}: WidgetProps<AnomalyDetectionData, AnomalyDetectionConfig>) {
  const config = instance.config as unknown as AnomalyDetectionConfig;

  // Use real data from hooks
  const alertsQuery = useUnresolvedAlerts(config.maxItems);
  const statsQuery = useAnomalyStats();
  const acknowledgeAlert = useAcknowledgeAlert();
  const dismissAlert = useDismissAlert();

  const isLoading = propIsLoading || alertsQuery.isLoading || statsQuery.isLoading;
  const error = propError || (alertsQuery.error ? String(alertsQuery.error) : null);

  // Get alerts from query or prop data
  const alerts: AnomalyAlertItem[] = React.useMemo(() => {
    if (data?.alerts) return data.alerts;
    if (!alertsQuery.data) return [];

    return alertsQuery.data.map((alert: any) => ({
      id: alert.id,
      title: alert.title,
      description: alert.description,
      category: alert.category as AnomalyCategory,
      severity: alert.severity as AnomalySeverity,
      status: alert.status,
      metric: alert.metric,
      observedValue: alert.observedValue,
      expectedValue: alert.expectedValue,
      deviation: alert.deviation,
      anomalyScore: alert.anomalyScore,
      confidenceScore: alert.confidenceScore,
      detectedAt: new Date(alert.detectedAt),
      entityType: alert.entityType,
      entityId: alert.entityId,
    }));
  }, [data?.alerts, alertsQuery.data]);

  // Filter alerts
  let filteredAlerts = alerts;
  if (config.showCriticalOnly) {
    filteredAlerts = filteredAlerts.filter(
      (a) => a.severity === "critical" || a.severity === "high"
    );
  }
  if (config.filterByCategory) {
    filteredAlerts = filteredAlerts.filter(
      (a) => a.category === config.filterByCategory
    );
  }

  const displayAlerts = filteredAlerts.slice(0, config.maxItems);

  // Get stats
  const stats = React.useMemo(() => {
    if (data?.stats) return data.stats;
    if (!statsQuery.data) {
      return {
        total: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        todayCount: 0,
        weekCount: 0,
      };
    }
    const dbStats = statsQuery.data.database;
    const bySeverity = dbStats?.bySeverity || [];
    return {
      total: dbStats?.total || 0,
      critical: bySeverity.find((s: any) => s.severity === "critical")?.count || 0,
      high: bySeverity.find((s: any) => s.severity === "high")?.count || 0,
      medium: bySeverity.find((s: any) => s.severity === "medium")?.count || 0,
      low: bySeverity.find((s: any) => s.severity === "low")?.count || 0,
      todayCount: dbStats?.todayCount || 0,
      weekCount: dbStats?.weekCount || 0,
    };
  }, [data?.stats, statsQuery.data]);

  const handleAcknowledge = async (alertId: string) => {
    await acknowledgeAlert.mutateAsync(alertId);
  };

  const handleDismiss = async (alertId: string) => {
    await dismissAlert.mutateAsync({
      alertId,
      reason: "Dismissed from dashboard widget",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px]">
        <div className="animate-pulse flex flex-col space-y-3 w-full p-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px] text-destructive">
        <AlertCircle className="w-5 h-5 mr-2" />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Summary */}
      <div className="grid grid-cols-4 gap-2">
        <div className="text-center p-2 rounded-lg bg-red-500/10">
          <div className="text-lg font-bold text-red-600">{stats.critical}</div>
          <div className="text-xs text-muted-foreground">Critical</div>
        </div>
        <div className="text-center p-2 rounded-lg bg-orange-500/10">
          <div className="text-lg font-bold text-orange-600">{stats.high}</div>
          <div className="text-xs text-muted-foreground">High</div>
        </div>
        <div className="text-center p-2 rounded-lg bg-yellow-500/10">
          <div className="text-lg font-bold text-yellow-600">{stats.medium}</div>
          <div className="text-xs text-muted-foreground">Medium</div>
        </div>
        <div className="text-center p-2 rounded-lg bg-blue-500/10">
          <div className="text-lg font-bold text-blue-600">{stats.low}</div>
          <div className="text-xs text-muted-foreground">Low</div>
        </div>
      </div>

      {/* Today's Summary */}
      {config.showTrend && (
        <div className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Today:</span>
            <span className="font-medium">{stats.todayCount} anomalies</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">This week:</span>
            <span className="font-medium">{stats.weekCount}</span>
            {stats.weekCount > 0 && stats.todayCount > stats.weekCount / 7 && (
              <TrendingUp className="w-4 h-4 text-red-500" />
            )}
            {stats.weekCount > 0 && stats.todayCount < stats.weekCount / 7 && (
              <TrendingDown className="w-4 h-4 text-green-500" />
            )}
          </div>
        </div>
      )}

      {/* Alert List */}
      <div className="space-y-2">
        {displayAlerts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>No anomalies detected</p>
            <p className="text-xs mt-1">System is operating normally</p>
          </div>
        ) : (
          displayAlerts.map((alert) => {
            const colors = severityColors[alert.severity];
            const CategoryIcon = categoryIcons[alert.category];
            const isPositive = alert.deviation > 0;

            return (
              <div
                key={alert.id}
                className={cn(
                  "relative p-3 rounded-lg border transition-all",
                  colors.bg,
                  colors.border
                )}
              >
                <div className="flex gap-3">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                      colors.bg
                    )}
                  >
                    <CategoryIcon className={cn("w-5 h-5", colors.icon)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm line-clamp-1">
                            {alert.title}
                          </p>
                          <span
                            className={cn(
                              "text-xs px-1.5 py-0.5 rounded-full font-medium",
                              colors.badge
                            )}
                          >
                            {alert.severity}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span>{categoryLabels[alert.category]}</span>
                          <span>•</span>
                          <span>{alert.metric}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 text-sm">
                      <span className="text-muted-foreground">Value: </span>
                      <span className="font-mono font-medium">
                        {formatValue(alert.observedValue)}
                      </span>
                      <span className="text-muted-foreground"> vs expected </span>
                      <span className="font-mono">
                        {formatValue(alert.expectedValue)}
                      </span>
                      <span
                        className={cn(
                          "ml-2",
                          isPositive ? "text-red-500" : "text-blue-500"
                        )}
                      >
                        ({isPositive ? "+" : ""}
                        {(alert.deviation * 100).toFixed(0)}%)
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {formatTimeAgo(alert.detectedAt)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          • Confidence: {(alert.confidenceScore * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleAcknowledge(alert.id)}
                          disabled={acknowledgeAlert.isPending}
                          className="p-1 rounded hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                          title="Acknowledge"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDismiss(alert.id)}
                          disabled={dismissAlert.isPending}
                          className="p-1 rounded hover:bg-muted/50 transition-colors text-muted-foreground hover:text-destructive"
                          title="Dismiss"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* View All Link */}
      {filteredAlerts.length > config.maxItems && (
        <div className="text-center pt-2">
          <a
            href="/anomaly-detection"
            className="text-sm text-primary hover:underline inline-flex items-center gap-1"
          >
            View all {filteredAlerts.length} anomalies
            <AlertTriangle className="w-3 h-3" />
          </a>
        </div>
      )}

      {/* Refresh Button */}
      {onRefresh && (
        <div className="flex justify-end">
          <button
            onClick={onRefresh}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            Refresh
          </button>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Widget Definition
// =============================================================================

export const AnomalyDetectionWidgetDefinition: WidgetDefinition<
  AnomalyDetectionData,
  AnomalyDetectionConfig
> = {
  id: "anomaly-detection",
  name: "Anomaly Detection",
  description:
    "ML-powered anomaly detection alerts for expenses, transactions, tasks, and user behavior",
  category: "analytics",
  defaultSize: "medium",
  supportedSizes: ["small", "medium", "large"],
  icon: AlertTriangle,
  dataRequirements: [
    {
      key: "alerts",
      label: "Anomaly Alerts",
      description: "List of detected anomaly alerts",
      required: true,
      type: "query",
    },
    {
      key: "stats",
      label: "Detection Statistics",
      description: "Anomaly detection statistics",
      required: false,
      type: "query",
    },
  ],
  configOptions: [
    {
      key: "maxItems",
      label: "Maximum Items",
      description: "Maximum number of alerts to display",
      type: "number",
      defaultValue: 5,
      validation: { min: 1, max: 20 },
    },
    {
      key: "showCriticalOnly",
      label: "Critical & High Only",
      description: "Only show critical and high severity anomalies",
      type: "boolean",
      defaultValue: false,
    },
    {
      key: "filterByCategory",
      label: "Filter by Category",
      description: "Only show anomalies from a specific category",
      type: "select",
      defaultValue: null,
      options: [
        { label: "All Categories", value: "" },
        { label: "Expense", value: "expense" },
        { label: "Transaction", value: "transaction" },
        { label: "Task Completion", value: "task_completion" },
        { label: "User Behavior", value: "user_behavior" },
        { label: "System", value: "system" },
      ],
    },
    {
      key: "showTrend",
      label: "Show Trend",
      description: "Show today and weekly trend summary",
      type: "boolean",
      defaultValue: true,
    },
    {
      key: "autoRefresh",
      label: "Auto Refresh",
      description: "Automatically refresh alert data",
      type: "boolean",
      defaultValue: true,
    },
  ],
  component: AnomalyDetectionWidgetComponent,
  defaultConfig: {
    maxItems: 5,
    showCriticalOnly: false,
    filterByCategory: null,
    showTrend: true,
    autoRefresh: true,
  },
  supportsRefresh: true,
  minRefreshInterval: 30000, // 30 seconds
};
