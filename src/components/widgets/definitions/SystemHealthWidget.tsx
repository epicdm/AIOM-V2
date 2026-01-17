import * as React from "react";
import {
  Activity,
  Cpu,
  Server,
  HardDrive,
  Wifi,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { cn } from "~/lib/utils";
import type { WidgetDefinition, WidgetProps } from "../types";

/**
 * System Health Data Interface
 */
export interface SystemHealthData {
  status: "healthy" | "degraded" | "critical";
  uptime: number;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  activeConnections: number;
  lastUpdated?: Date;
}

/**
 * System Health Widget Config
 */
export interface SystemHealthConfig {
  showUptime: boolean;
  showConnections: boolean;
  compactMode: boolean;
  warningThreshold: number;
  criticalThreshold: number;
}

/**
 * Get status color based on value and thresholds
 */
function getStatusColor(value: number, warning: number, critical: number): string {
  if (value >= critical) return "text-red-500";
  if (value >= warning) return "text-yellow-500";
  return "text-green-500";
}

/**
 * Get status background color
 */
function getStatusBgColor(value: number, warning: number, critical: number): string {
  if (value >= critical) return "bg-red-500/10";
  if (value >= warning) return "bg-yellow-500/10";
  return "bg-green-500/10";
}

/**
 * System Health Widget Component
 */
function SystemHealthWidgetComponent({
  data,
  isLoading,
  error,
  instance,
  size,
}: WidgetProps<SystemHealthData, SystemHealthConfig>) {
  const config = instance.config as unknown as SystemHealthConfig;
  const warning = config.warningThreshold ?? 60;
  const critical = config.criticalThreshold ?? 80;

  // Sample data for demonstration
  const sampleData: SystemHealthData = {
    status: "healthy",
    uptime: 99.9,
    cpuUsage: 45,
    memoryUsage: 62,
    diskUsage: 38,
    activeConnections: 156,
    lastUpdated: new Date(),
  };

  const healthData = data ?? sampleData;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px]">
        <div className="animate-pulse flex flex-col space-y-3 w-full p-4">
          <div className="h-8 bg-muted rounded-lg w-1/2" />
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-muted rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px] text-destructive">
        <AlertTriangle className="w-5 h-5 mr-2" />
        <span>{error}</span>
      </div>
    );
  }

  const StatusIcon = healthData.status === "healthy"
    ? CheckCircle2
    : healthData.status === "degraded"
    ? AlertTriangle
    : XCircle;

  const statusColor = healthData.status === "healthy"
    ? "text-green-500"
    : healthData.status === "degraded"
    ? "text-yellow-500"
    : "text-red-500";

  const isCompact = config.compactMode || size === "small";

  return (
    <div className="space-y-4">
      {/* Status Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusIcon className={cn("w-5 h-5", statusColor)} />
          <span className={cn("font-medium capitalize", statusColor)}>
            {healthData.status}
          </span>
        </div>
        {config.showUptime && (
          <span className="text-sm text-muted-foreground">
            {healthData.uptime}% uptime
          </span>
        )}
      </div>

      {/* Metrics Grid */}
      <div className={cn(
        "grid gap-3",
        isCompact ? "grid-cols-2" : "grid-cols-2 lg:grid-cols-4"
      )}>
        {/* CPU Usage */}
        <div className={cn(
          "p-3 rounded-lg",
          getStatusBgColor(healthData.cpuUsage, warning, critical)
        )}>
          <div className="flex items-center gap-2 mb-2">
            <Cpu className={cn("w-4 h-4", getStatusColor(healthData.cpuUsage, warning, critical))} />
            <span className="text-xs text-muted-foreground">CPU</span>
          </div>
          <div className={cn(
            "text-xl font-bold",
            getStatusColor(healthData.cpuUsage, warning, critical)
          )}>
            {healthData.cpuUsage}%
          </div>
          {!isCompact && (
            <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full",
                  healthData.cpuUsage >= critical ? "bg-red-500" :
                  healthData.cpuUsage >= warning ? "bg-yellow-500" : "bg-green-500"
                )}
                style={{ width: `${healthData.cpuUsage}%` }}
              />
            </div>
          )}
        </div>

        {/* Memory Usage */}
        <div className={cn(
          "p-3 rounded-lg",
          getStatusBgColor(healthData.memoryUsage, warning, critical)
        )}>
          <div className="flex items-center gap-2 mb-2">
            <Server className={cn("w-4 h-4", getStatusColor(healthData.memoryUsage, warning, critical))} />
            <span className="text-xs text-muted-foreground">Memory</span>
          </div>
          <div className={cn(
            "text-xl font-bold",
            getStatusColor(healthData.memoryUsage, warning, critical)
          )}>
            {healthData.memoryUsage}%
          </div>
          {!isCompact && (
            <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full",
                  healthData.memoryUsage >= critical ? "bg-red-500" :
                  healthData.memoryUsage >= warning ? "bg-yellow-500" : "bg-green-500"
                )}
                style={{ width: `${healthData.memoryUsage}%` }}
              />
            </div>
          )}
        </div>

        {/* Disk Usage */}
        <div className={cn(
          "p-3 rounded-lg",
          getStatusBgColor(healthData.diskUsage, warning, critical)
        )}>
          <div className="flex items-center gap-2 mb-2">
            <HardDrive className={cn("w-4 h-4", getStatusColor(healthData.diskUsage, warning, critical))} />
            <span className="text-xs text-muted-foreground">Disk</span>
          </div>
          <div className={cn(
            "text-xl font-bold",
            getStatusColor(healthData.diskUsage, warning, critical)
          )}>
            {healthData.diskUsage}%
          </div>
          {!isCompact && (
            <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full",
                  healthData.diskUsage >= critical ? "bg-red-500" :
                  healthData.diskUsage >= warning ? "bg-yellow-500" : "bg-green-500"
                )}
                style={{ width: `${healthData.diskUsage}%` }}
              />
            </div>
          )}
        </div>

        {/* Active Connections */}
        {config.showConnections && (
          <div className="p-3 rounded-lg bg-blue-500/10">
            <div className="flex items-center gap-2 mb-2">
              <Wifi className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Connections</span>
            </div>
            <div className="text-xl font-bold text-blue-500">
              {healthData.activeConnections}
            </div>
          </div>
        )}
      </div>

      {/* Last Updated */}
      {healthData.lastUpdated && !isCompact && (
        <div className="text-xs text-muted-foreground text-center">
          Last updated: {new Date(healthData.lastUpdated).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}

/**
 * System Health Widget Definition
 */
export const SystemHealthWidgetDefinition: WidgetDefinition<
  SystemHealthData,
  SystemHealthConfig
> = {
  id: "system-health",
  name: "System Health",
  description: "Monitor system health metrics including CPU, memory, and disk usage",
  category: "system",
  defaultSize: "medium",
  supportedSizes: ["small", "medium", "large"],
  icon: Activity,
  dataRequirements: [
    {
      key: "health",
      label: "Health Metrics",
      description: "System health data from monitoring",
      required: true,
      type: "realtime",
    },
  ],
  configOptions: [
    {
      key: "showUptime",
      label: "Show Uptime",
      description: "Display system uptime percentage",
      type: "boolean",
      defaultValue: true,
    },
    {
      key: "showConnections",
      label: "Show Connections",
      description: "Display active connection count",
      type: "boolean",
      defaultValue: true,
    },
    {
      key: "compactMode",
      label: "Compact Mode",
      description: "Use compact layout",
      type: "boolean",
      defaultValue: false,
    },
    {
      key: "warningThreshold",
      label: "Warning Threshold",
      description: "Percentage threshold for warning state",
      type: "number",
      defaultValue: 60,
      validation: { min: 0, max: 100 },
    },
    {
      key: "criticalThreshold",
      label: "Critical Threshold",
      description: "Percentage threshold for critical state",
      type: "number",
      defaultValue: 80,
      validation: { min: 0, max: 100 },
    },
  ],
  component: SystemHealthWidgetComponent,
  defaultConfig: {
    showUptime: true,
    showConnections: true,
    compactMode: false,
    warningThreshold: 60,
    criticalThreshold: 80,
  },
  supportsRefresh: true,
  minRefreshInterval: 10000,
};
