import * as React from "react";
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  X,
  ExternalLink,
} from "lucide-react";
import { cn } from "~/lib/utils";
import type { WidgetDefinition, WidgetProps } from "../types";

/**
 * Alert Severity Levels
 */
export type AlertSeverity = "info" | "success" | "warning" | "error";

/**
 * Alert Item Interface
 */
export interface AlertItem {
  id: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
  source?: string;
}

/**
 * Alerts Widget Data
 */
export interface AlertsData {
  alerts: AlertItem[];
  unreadCount: number;
  criticalCount: number;
}

/**
 * Alerts Widget Config
 */
export interface AlertsConfig {
  maxItems: number;
  showReadAlerts: boolean;
  filterBySeverity: AlertSeverity | null;
  groupBySource: boolean;
}

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
 * Alerts Widget Component
 */
function AlertsWidgetComponent({
  data,
  isLoading,
  error,
  instance,
}: WidgetProps<AlertsData, AlertsConfig>) {
  const config = instance.config as unknown as AlertsConfig;
  const [dismissedIds, setDismissedIds] = React.useState<Set<string>>(
    new Set()
  );

  // Sample data for demonstration
  const sampleAlerts: AlertItem[] = [
    {
      id: "1",
      title: "System Maintenance Scheduled",
      message:
        "Planned maintenance window on Saturday, 2:00 AM - 4:00 AM UTC.",
      severity: "warning",
      timestamp: new Date(Date.now() - 1800000),
      read: false,
      source: "System",
    },
    {
      id: "2",
      title: "Payment Successfully Processed",
      message: "Invoice #1234 has been paid successfully.",
      severity: "success",
      timestamp: new Date(Date.now() - 3600000),
      read: false,
      actionUrl: "/invoices/1234",
      actionLabel: "View Invoice",
      source: "Billing",
    },
    {
      id: "3",
      title: "Security Alert",
      message: "Unusual login activity detected from a new device.",
      severity: "error",
      timestamp: new Date(Date.now() - 7200000),
      read: false,
      actionUrl: "/security/activity",
      actionLabel: "Review Activity",
      source: "Security",
    },
    {
      id: "4",
      title: "New Feature Available",
      message:
        "Check out our new dashboard widgets for better productivity.",
      severity: "info",
      timestamp: new Date(Date.now() - 86400000),
      read: true,
      source: "Updates",
    },
    {
      id: "5",
      title: "Subscription Renewal",
      message: "Your subscription will renew in 7 days.",
      severity: "info",
      timestamp: new Date(Date.now() - 172800000),
      read: true,
      source: "Billing",
    },
  ];

  const alerts = data?.alerts ?? sampleAlerts;

  // Filter alerts
  let filteredAlerts = alerts.filter((a) => !dismissedIds.has(a.id));
  if (!config.showReadAlerts) {
    filteredAlerts = filteredAlerts.filter((a) => !a.read);
  }
  if (config.filterBySeverity) {
    filteredAlerts = filteredAlerts.filter(
      (a) => a.severity === config.filterBySeverity
    );
  }

  const displayAlerts = filteredAlerts.slice(0, config.maxItems);
  const unreadCount = data?.unreadCount ?? alerts.filter((a) => !a.read).length;
  const criticalCount =
    data?.criticalCount ?? alerts.filter((a) => a.severity === "error").length;

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => new Set([...prev, id]));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px]">
        <div className="animate-pulse flex flex-col space-y-3 w-full p-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted rounded-lg" />
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
    <div className="space-y-3">
      {/* Summary */}
      <div className="flex items-center justify-between text-sm pb-2 border-b">
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="font-medium">{unreadCount}</span>
              <span className="text-muted-foreground">unread</span>
            </span>
          )}
          {criticalCount > 0 && (
            <span className="flex items-center gap-1 text-red-500">
              <AlertCircle className="w-3 h-3" />
              <span className="font-medium">{criticalCount}</span>
              <span>critical</span>
            </span>
          )}
        </div>
        {displayAlerts.length > 0 && (
          <button
            onClick={() =>
              setDismissedIds(new Set(displayAlerts.map((a) => a.id)))
            }
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Dismiss all
          </button>
        )}
      </div>

      {/* Alert List */}
      <div className="space-y-2">
        {displayAlerts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>No alerts to display</p>
          </div>
        ) : (
          displayAlerts.map((alert) => {
            const SeverityIcon = severityIcons[alert.severity];
            const colors = severityColors[alert.severity];
            return (
              <div
                key={alert.id}
                className={cn(
                  "relative p-3 rounded-lg border transition-all",
                  colors.bg,
                  colors.border,
                  !alert.read && "ring-1 ring-primary/20"
                )}
              >
                <div className="flex gap-3">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                      colors.bg
                    )}
                  >
                    <SeverityIcon className={cn("w-4 h-4", colors.icon)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm">{alert.title}</p>
                        {alert.source && (
                          <span className="text-xs text-muted-foreground">
                            {alert.source}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleDismiss(alert.id)}
                        className="p-1 rounded hover:bg-muted/50 transition-colors shrink-0"
                      >
                        <X className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {alert.message}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-muted-foreground">
                        {formatTimeAgo(alert.timestamp)}
                      </span>
                      {alert.actionUrl && (
                        <a
                          href={alert.actionUrl}
                          className={cn(
                            "text-xs font-medium flex items-center gap-1",
                            colors.text,
                            "hover:underline"
                          )}
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
      {filteredAlerts.length > config.maxItems && (
        <div className="text-center pt-2">
          <button className="text-sm text-primary hover:underline">
            View all {filteredAlerts.length} alerts
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Alerts Widget Definition
 */
export const AlertsWidgetDefinition: WidgetDefinition<
  AlertsData,
  AlertsConfig
> = {
  id: "alerts",
  name: "Alerts",
  description: "View and manage system alerts and notifications",
  category: "system",
  defaultSize: "medium",
  supportedSizes: ["small", "medium", "large"],
  icon: Bell,
  dataRequirements: [
    {
      key: "alerts",
      label: "Alert Items",
      description: "List of alerts and notifications",
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
      key: "showReadAlerts",
      label: "Show Read Alerts",
      description: "Include alerts that have been read",
      type: "boolean",
      defaultValue: true,
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
      key: "groupBySource",
      label: "Group by Source",
      description: "Group alerts by their source",
      type: "boolean",
      defaultValue: false,
    },
  ],
  component: AlertsWidgetComponent,
  defaultConfig: {
    maxItems: 5,
    showReadAlerts: true,
    filterBySeverity: null,
    groupBySource: false,
  },
  supportsRefresh: true,
  minRefreshInterval: 15000,
};
