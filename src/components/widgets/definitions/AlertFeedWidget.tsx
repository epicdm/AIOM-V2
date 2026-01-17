import * as React from "react";
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  X,
  ExternalLink,
  CheckCheck,
  Clock,
  Filter,
  ArrowUpDown,
} from "lucide-react";
import { cn } from "~/lib/utils";
import type { WidgetDefinition, WidgetProps } from "../types";

/**
 * Alert Priority Levels (higher number = higher priority)
 */
export type AlertPriority = "low" | "medium" | "high" | "critical";

/**
 * Alert Severity Levels
 */
export type AlertFeedSeverity = "info" | "success" | "warning" | "error";

/**
 * Alert Feed Item Interface - Enhanced with priority and acknowledgment
 */
export interface AlertFeedItem {
  id: string;
  title: string;
  message: string;
  severity: AlertFeedSeverity;
  priority: AlertPriority;
  timestamp: Date;
  read: boolean;
  acknowledged: boolean;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  actionUrl?: string;
  actionLabel?: string;
  source?: string;
  category?: string;
}

/**
 * Alert Feed Widget Data
 */
export interface AlertFeedData {
  alerts: AlertFeedItem[];
  unreadCount: number;
  unacknowledgedCount: number;
  criticalCount: number;
}

/**
 * Alert Feed Widget Config
 */
export interface AlertFeedConfig {
  maxItems: number;
  showAcknowledged: boolean;
  filterBySeverity: AlertFeedSeverity | null;
  filterByPriority: AlertPriority | null;
  sortBy: "timestamp" | "priority" | "severity";
  groupBySource: boolean;
  enableAcknowledgment: boolean;
}

/**
 * Priority order mapping (for sorting)
 */
const priorityOrder: Record<AlertPriority, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

/**
 * Severity order mapping (for sorting)
 */
const severityOrder: Record<AlertFeedSeverity, number> = {
  error: 4,
  warning: 3,
  success: 2,
  info: 1,
};

/**
 * Severity icon mapping
 */
const severityIcons = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle,
};

/**
 * Severity color mapping
 */
const severityColors = {
  info: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    text: "text-blue-500",
    icon: "text-blue-500",
  },
  success: {
    bg: "bg-green-500/10",
    border: "border-green-500/20",
    text: "text-green-500",
    icon: "text-green-500",
  },
  warning: {
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/20",
    text: "text-yellow-600",
    icon: "text-yellow-500",
  },
  error: {
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    text: "text-red-500",
    icon: "text-red-500",
  },
};

/**
 * Priority badge colors
 */
const priorityColors: Record<AlertPriority, string> = {
  low: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  critical: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

/**
 * Format relative time
 */
function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(date).toLocaleDateString();
}

/**
 * Sort alerts based on config
 */
function sortAlerts(
  alerts: AlertFeedItem[],
  sortBy: AlertFeedConfig["sortBy"]
): AlertFeedItem[] {
  return [...alerts].sort((a, b) => {
    switch (sortBy) {
      case "priority":
        // Higher priority first, then by timestamp
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      case "severity":
        // Higher severity first, then by timestamp
        const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
        if (severityDiff !== 0) return severityDiff;
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      case "timestamp":
      default:
        // Newest first
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    }
  });
}

/**
 * Alert Feed Widget Component
 */
function AlertFeedWidgetComponent({
  data,
  isLoading,
  error,
  instance,
}: WidgetProps<AlertFeedData, AlertFeedConfig>) {
  const config = instance.config as unknown as AlertFeedConfig;
  const [dismissedIds, setDismissedIds] = React.useState<Set<string>>(new Set());
  const [acknowledgedIds, setAcknowledgedIds] = React.useState<Set<string>>(new Set());

  // Sample data for demonstration
  const sampleAlerts: AlertFeedItem[] = [
    {
      id: "1",
      title: "Critical Security Alert",
      message: "Multiple failed login attempts detected from IP 192.168.1.100. Account may be under attack.",
      severity: "error",
      priority: "critical",
      timestamp: new Date(Date.now() - 300000), // 5 min ago
      read: false,
      acknowledged: false,
      actionUrl: "/security/activity",
      actionLabel: "Review Activity",
      source: "Security",
      category: "authentication",
    },
    {
      id: "2",
      title: "System Maintenance Scheduled",
      message: "Planned maintenance window on Saturday, 2:00 AM - 4:00 AM UTC. Services may be temporarily unavailable.",
      severity: "warning",
      priority: "high",
      timestamp: new Date(Date.now() - 1800000), // 30 min ago
      read: false,
      acknowledged: false,
      source: "System",
      category: "maintenance",
    },
    {
      id: "3",
      title: "Payment Successfully Processed",
      message: "Invoice #1234 has been paid successfully. Amount: $5,240.00",
      severity: "success",
      priority: "medium",
      timestamp: new Date(Date.now() - 3600000), // 1 hour ago
      read: false,
      acknowledged: true,
      acknowledgedAt: new Date(Date.now() - 1800000),
      acknowledgedBy: "John Doe",
      actionUrl: "/invoices/1234",
      actionLabel: "View Invoice",
      source: "Billing",
      category: "payment",
    },
    {
      id: "4",
      title: "New Feature Available",
      message: "Check out our new dashboard widgets for better productivity.",
      severity: "info",
      priority: "low",
      timestamp: new Date(Date.now() - 86400000), // 1 day ago
      read: true,
      acknowledged: true,
      acknowledgedAt: new Date(Date.now() - 43200000),
      source: "Updates",
      category: "announcement",
    },
    {
      id: "5",
      title: "Storage Capacity Warning",
      message: "Database storage is at 85% capacity. Consider archiving old records or upgrading storage.",
      severity: "warning",
      priority: "high",
      timestamp: new Date(Date.now() - 7200000), // 2 hours ago
      read: false,
      acknowledged: false,
      actionUrl: "/settings/storage",
      actionLabel: "Manage Storage",
      source: "Infrastructure",
      category: "capacity",
    },
    {
      id: "6",
      title: "API Rate Limit Approaching",
      message: "External API usage at 90% of monthly limit. 3 days remaining in billing cycle.",
      severity: "warning",
      priority: "medium",
      timestamp: new Date(Date.now() - 10800000), // 3 hours ago
      read: false,
      acknowledged: false,
      source: "API",
      category: "usage",
    },
  ];

  const alerts = data?.alerts ?? sampleAlerts;

  // Filter alerts
  let filteredAlerts = alerts.filter((a) => !dismissedIds.has(a.id));

  // Apply acknowledgment filter
  if (!config.showAcknowledged) {
    filteredAlerts = filteredAlerts.filter(
      (a) => !a.acknowledged && !acknowledgedIds.has(a.id)
    );
  }

  // Apply severity filter
  if (config.filterBySeverity) {
    filteredAlerts = filteredAlerts.filter(
      (a) => a.severity === config.filterBySeverity
    );
  }

  // Apply priority filter
  if (config.filterByPriority) {
    filteredAlerts = filteredAlerts.filter(
      (a) => a.priority === config.filterByPriority
    );
  }

  // Sort alerts
  const sortedAlerts = sortAlerts(filteredAlerts, config.sortBy);
  const displayAlerts = sortedAlerts.slice(0, config.maxItems);

  // Calculate counts
  const unreadCount = data?.unreadCount ?? alerts.filter((a) => !a.read).length;
  const unacknowledgedCount = data?.unacknowledgedCount ??
    alerts.filter((a) => !a.acknowledged && !acknowledgedIds.has(a.id)).length;
  const criticalCount = data?.criticalCount ??
    alerts.filter((a) => a.priority === "critical" && !a.acknowledged && !acknowledgedIds.has(a.id)).length;

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => new Set([...prev, id]));
  };

  const handleAcknowledge = (id: string) => {
    setAcknowledgedIds((prev) => new Set([...prev, id]));
  };

  const handleAcknowledgeAll = () => {
    const unacknowledgedAlertIds = displayAlerts
      .filter((a) => !a.acknowledged && !acknowledgedIds.has(a.id))
      .map((a) => a.id);
    setAcknowledgedIds((prev) => new Set([...prev, ...unacknowledgedAlertIds]));
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
    <div className="space-y-3" data-testid="alert-feed-widget">
      {/* Summary Header */}
      <div className="flex items-center justify-between text-sm pb-2 border-b" data-testid="alert-feed-summary">
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <span className="flex items-center gap-1" data-testid="unread-count">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="font-medium">{unreadCount}</span>
              <span className="text-muted-foreground">unread</span>
            </span>
          )}
          {unacknowledgedCount > 0 && (
            <span className="flex items-center gap-1 text-amber-600" data-testid="unacknowledged-count">
              <Clock className="w-3 h-3" />
              <span className="font-medium">{unacknowledgedCount}</span>
              <span>pending</span>
            </span>
          )}
          {criticalCount > 0 && (
            <span className="flex items-center gap-1 text-red-500" data-testid="critical-count">
              <AlertCircle className="w-3 h-3" />
              <span className="font-medium">{criticalCount}</span>
              <span>critical</span>
            </span>
          )}
        </div>
        {config.enableAcknowledgment && displayAlerts.some((a) => !a.acknowledged && !acknowledgedIds.has(a.id)) && (
          <button
            onClick={handleAcknowledgeAll}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            data-testid="acknowledge-all-button"
          >
            <CheckCheck className="w-3 h-3" />
            Acknowledge all
          </button>
        )}
      </div>

      {/* Alert List */}
      <div className="space-y-2" data-testid="alert-list">
        {displayAlerts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground" data-testid="empty-state">
            <Bell className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>No alerts to display</p>
          </div>
        ) : (
          displayAlerts.map((alert) => {
            const SeverityIcon = severityIcons[alert.severity];
            const colors = severityColors[alert.severity];
            const isAcknowledged = alert.acknowledged || acknowledgedIds.has(alert.id);

            return (
              <div
                key={alert.id}
                data-testid={`alert-item-${alert.id}`}
                className={cn(
                  "relative p-3 rounded-lg border transition-all",
                  colors.bg,
                  colors.border,
                  !alert.read && "ring-1 ring-primary/20",
                  isAcknowledged && "opacity-70"
                )}
              >
                <div className="flex gap-3">
                  {/* Icon */}
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                      colors.bg
                    )}
                  >
                    <SeverityIcon className={cn("w-4 h-4", colors.icon)} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm">{alert.title}</p>
                          {/* Priority Badge */}
                          <span
                            className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded font-medium uppercase",
                              priorityColors[alert.priority]
                            )}
                            data-testid={`priority-badge-${alert.id}`}
                          >
                            {alert.priority}
                          </span>
                        </div>
                        {alert.source && (
                          <span className="text-xs text-muted-foreground">
                            {alert.source}
                            {alert.category && ` · ${alert.category}`}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleDismiss(alert.id)}
                        className="p-1 rounded hover:bg-muted/50 transition-colors shrink-0"
                        data-testid={`dismiss-button-${alert.id}`}
                      >
                        <X className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>

                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {alert.message}
                    </p>

                    {/* Footer with time, acknowledgment, and action */}
                    <div className="flex items-center justify-between mt-2 gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {formatTimeAgo(alert.timestamp)}
                        </span>

                        {/* Acknowledgment status */}
                        {isAcknowledged ? (
                          <span className="text-xs text-green-600 flex items-center gap-1" data-testid={`acknowledged-status-${alert.id}`}>
                            <CheckCheck className="w-3 h-3" />
                            Acknowledged
                            {alert.acknowledgedBy && ` by ${alert.acknowledgedBy}`}
                          </span>
                        ) : config.enableAcknowledgment ? (
                          <button
                            onClick={() => handleAcknowledge(alert.id)}
                            className="text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1 transition-colors"
                            data-testid={`acknowledge-button-${alert.id}`}
                          >
                            <CheckCircle className="w-3 h-3" />
                            Acknowledge
                          </button>
                        ) : null}
                      </div>

                      {alert.actionUrl && (
                        <a
                          href={alert.actionUrl}
                          className={cn(
                            "text-xs font-medium flex items-center gap-1",
                            colors.text,
                            "hover:underline"
                          )}
                          data-testid={`action-link-${alert.id}`}
                        >
                          {alert.actionLabel || "View"}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* View All Link */}
      {sortedAlerts.length > config.maxItems && (
        <div className="text-center pt-2" data-testid="view-all-section">
          <button className="text-sm text-primary hover:underline">
            View all {sortedAlerts.length} alerts
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Alert Feed Widget Definition
 */
export const AlertFeedWidgetDefinition: WidgetDefinition<
  AlertFeedData,
  AlertFeedConfig
> = {
  id: "alert-feed",
  name: "Alert Feed",
  description: "Prioritized alerts and notifications with severity levels, acknowledgment tracking, and action links",
  category: "system",
  defaultSize: "medium",
  supportedSizes: ["small", "medium", "large"],
  icon: Bell,
  dataRequirements: [
    {
      key: "alerts",
      label: "Alert Items",
      description: "List of prioritized alerts and notifications",
      required: true,
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
      key: "showAcknowledged",
      label: "Show Acknowledged",
      description: "Include alerts that have been acknowledged",
      type: "boolean",
      defaultValue: false,
    },
    {
      key: "filterBySeverity",
      label: "Filter by Severity",
      description: "Only show alerts of a specific severity",
      type: "select",
      defaultValue: null,
      options: [
        { label: "All Severities", value: "" },
        { label: "Info", value: "info" },
        { label: "Success", value: "success" },
        { label: "Warning", value: "warning" },
        { label: "Error", value: "error" },
      ],
    },
    {
      key: "filterByPriority",
      label: "Filter by Priority",
      description: "Only show alerts of a specific priority",
      type: "select",
      defaultValue: null,
      options: [
        { label: "All Priorities", value: "" },
        { label: "Low", value: "low" },
        { label: "Medium", value: "medium" },
        { label: "High", value: "high" },
        { label: "Critical", value: "critical" },
      ],
    },
    {
      key: "sortBy",
      label: "Sort By",
      description: "How to sort alerts",
      type: "select",
      defaultValue: "priority",
      options: [
        { label: "Priority (Highest First)", value: "priority" },
        { label: "Severity (Most Severe First)", value: "severity" },
        { label: "Time (Newest First)", value: "timestamp" },
      ],
    },
    {
      key: "groupBySource",
      label: "Group by Source",
      description: "Group alerts by their source",
      type: "boolean",
      defaultValue: false,
    },
    {
      key: "enableAcknowledgment",
      label: "Enable Acknowledgment",
      description: "Allow users to acknowledge alerts",
      type: "boolean",
      defaultValue: true,
    },
  ],
  component: AlertFeedWidgetComponent,
  defaultConfig: {
    maxItems: 5,
    showAcknowledged: false,
    filterBySeverity: null,
    filterByPriority: null,
    sortBy: "priority",
    groupBySource: false,
    enableAcknowledgment: true,
  },
  supportsRefresh: true,
  minRefreshInterval: 15000,
};
