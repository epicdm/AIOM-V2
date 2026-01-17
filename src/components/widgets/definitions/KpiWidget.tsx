import * as React from "react";
import { TrendingUp, TrendingDown, Minus, Target, AlertTriangle, AlertCircle } from "lucide-react";
import { cn } from "~/lib/utils";
import type { WidgetDefinition, WidgetProps } from "../types";

/**
 * KPI Status
 */
export type KpiStatus = "success" | "warning" | "critical" | "neutral";

/**
 * KPI Trend
 */
export type KpiTrend = "up" | "down" | "flat";

/**
 * KPI Item
 */
export interface KpiItem {
  id: string;
  name: string;
  value: number;
  previousValue?: number;
  targetValue?: number;
  format: "number" | "currency" | "percentage" | "duration";
  unit?: string;
  trend?: KpiTrend;
  trendPercentage?: number;
  status?: KpiStatus;
}

/**
 * KPI Widget Data
 */
export interface KpiWidgetData {
  kpis: KpiItem[];
  lastUpdated?: string;
}

/**
 * KPI Widget Config
 */
export interface KpiWidgetConfig {
  layout: "grid" | "list" | "compact";
  showTrend: boolean;
  showTarget: boolean;
  colorByStatus: boolean;
  columns: number;
}

/**
 * Format value based on format type
 */
function formatValue(value: number, format: string, unit?: string): string {
  switch (format) {
    case "currency":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    case "percentage":
      return `${value.toFixed(1)}%`;
    case "duration":
      const hours = Math.floor(value / 3600);
      const minutes = Math.floor((value % 3600) / 60);
      return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    default:
      const formatted = value >= 1000
        ? `${(value / 1000).toFixed(1)}k`
        : value.toLocaleString();
      return unit ? `${formatted} ${unit}` : formatted;
  }
}

/**
 * Get status color classes
 */
function getStatusClasses(status: KpiStatus | undefined): string {
  switch (status) {
    case "success":
      return "text-green-500 bg-green-500/10";
    case "warning":
      return "text-yellow-500 bg-yellow-500/10";
    case "critical":
      return "text-red-500 bg-red-500/10";
    default:
      return "text-muted-foreground bg-muted";
  }
}

/**
 * Get trend icon
 */
function getTrendIcon(trend: KpiTrend | undefined) {
  switch (trend) {
    case "up":
      return <TrendingUp className="w-4 h-4 text-green-500" />;
    case "down":
      return <TrendingDown className="w-4 h-4 text-red-500" />;
    default:
      return <Minus className="w-4 h-4 text-muted-foreground" />;
  }
}

/**
 * Single KPI Card
 */
function KpiCard({
  kpi,
  config,
  isCompact,
}: {
  kpi: KpiItem;
  config: KpiWidgetConfig;
  isCompact?: boolean;
}) {
  const progressToTarget = kpi.targetValue
    ? Math.min((kpi.value / kpi.targetValue) * 100, 100)
    : null;

  return (
    <div
      className={cn(
        "rounded-lg border p-4 transition-all hover:shadow-md",
        config.colorByStatus && kpi.status
          ? getStatusClasses(kpi.status)
          : "bg-card border-border",
        isCompact && "p-3"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className={cn(
          "text-sm font-medium text-muted-foreground",
          isCompact && "text-xs"
        )}>
          {kpi.name}
        </span>
        {kpi.status === "warning" && (
          <AlertTriangle className="w-4 h-4 text-yellow-500" />
        )}
        {kpi.status === "critical" && (
          <AlertCircle className="w-4 h-4 text-red-500" />
        )}
      </div>

      {/* Value */}
      <div className={cn("font-bold", isCompact ? "text-xl" : "text-2xl")}>
        {formatValue(kpi.value, kpi.format, kpi.unit)}
      </div>

      {/* Trend */}
      {config.showTrend && kpi.trend && (
        <div className="flex items-center gap-2 mt-2">
          {getTrendIcon(kpi.trend)}
          {kpi.trendPercentage !== undefined && (
            <span
              className={cn(
                "text-sm",
                kpi.trend === "up" && "text-green-500",
                kpi.trend === "down" && "text-red-500",
                kpi.trend === "flat" && "text-muted-foreground"
              )}
            >
              {kpi.trend === "up" ? "+" : ""}
              {kpi.trendPercentage.toFixed(1)}%
            </span>
          )}
          {kpi.previousValue !== undefined && (
            <span className="text-xs text-muted-foreground">
              vs {formatValue(kpi.previousValue, kpi.format, kpi.unit)}
            </span>
          )}
        </div>
      )}

      {/* Target Progress */}
      {config.showTarget && kpi.targetValue && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="flex items-center gap-1">
              <Target className="w-3 h-3" />
              Target: {formatValue(kpi.targetValue, kpi.format, kpi.unit)}
            </span>
            <span>{progressToTarget?.toFixed(0)}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                progressToTarget && progressToTarget >= 100
                  ? "bg-green-500"
                  : progressToTarget && progressToTarget >= 75
                  ? "bg-primary"
                  : progressToTarget && progressToTarget >= 50
                  ? "bg-yellow-500"
                  : "bg-red-500"
              )}
              style={{ width: `${progressToTarget}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * KPI Widget Component
 */
function KpiWidgetComponent({
  data,
  isLoading,
  error,
  instance,
  size,
}: WidgetProps<KpiWidgetData, KpiWidgetConfig>) {
  const config = instance.config as unknown as KpiWidgetConfig;

  // Sample data for demonstration
  const sampleData: KpiWidgetData = {
    kpis: [
      {
        id: "1",
        name: "Total Revenue",
        value: 124500,
        previousValue: 115000,
        targetValue: 150000,
        format: "currency",
        trend: "up",
        trendPercentage: 8.3,
        status: "success",
      },
      {
        id: "2",
        name: "Active Users",
        value: 2450,
        previousValue: 2380,
        format: "number",
        trend: "up",
        trendPercentage: 2.9,
        status: "success",
      },
      {
        id: "3",
        name: "Conversion Rate",
        value: 3.2,
        previousValue: 3.5,
        targetValue: 4.0,
        format: "percentage",
        trend: "down",
        trendPercentage: -8.6,
        status: "warning",
      },
      {
        id: "4",
        name: "Avg Response Time",
        value: 1250,
        previousValue: 1400,
        targetValue: 1000,
        format: "duration",
        trend: "up",
        trendPercentage: 10.7,
        status: "neutral",
      },
    ],
    lastUpdated: new Date().toISOString(),
  };

  const displayData = data ?? sampleData;
  const isCompact = size === "small" || config.layout === "compact";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px]">
        <div className="animate-pulse space-y-4 w-full">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 bg-muted rounded-lg" />
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
      {/* KPIs Grid */}
      <div
        className={cn(
          "grid gap-4",
          config.layout === "list"
            ? "grid-cols-1"
            : config.layout === "compact"
            ? "grid-cols-2"
            : size === "small"
            ? "grid-cols-1"
            : size === "medium"
            ? "grid-cols-2"
            : `grid-cols-${Math.min(config.columns, 4)}`
        )}
      >
        {displayData.kpis.map((kpi) => (
          <KpiCard
            key={kpi.id}
            kpi={kpi}
            config={config}
            isCompact={isCompact}
          />
        ))}
      </div>

      {/* Last Updated */}
      {displayData.lastUpdated && (
        <p className="text-xs text-muted-foreground text-right">
          Last updated: {new Date(displayData.lastUpdated).toLocaleString()}
        </p>
      )}
    </div>
  );
}

/**
 * KPI Widget Definition
 */
export const KpiWidgetDefinition: WidgetDefinition<KpiWidgetData, KpiWidgetConfig> = {
  id: "kpi",
  name: "KPI Tracker",
  description: "Display key performance indicators with trends and targets",
  category: "analytics",
  defaultSize: "medium",
  supportedSizes: ["small", "medium", "large", "full"],
  icon: Target,
  dataRequirements: [
    {
      key: "kpiData",
      label: "KPI Data",
      description: "Key performance indicator data",
      required: true,
      type: "query",
    },
  ],
  configOptions: [
    {
      key: "layout",
      label: "Layout",
      description: "How to display KPIs",
      type: "select",
      defaultValue: "grid",
      options: [
        { label: "Grid", value: "grid" },
        { label: "List", value: "list" },
        { label: "Compact", value: "compact" },
      ],
    },
    {
      key: "showTrend",
      label: "Show Trend",
      description: "Display trend indicators",
      type: "boolean",
      defaultValue: true,
    },
    {
      key: "showTarget",
      label: "Show Target",
      description: "Display target progress",
      type: "boolean",
      defaultValue: true,
    },
    {
      key: "colorByStatus",
      label: "Color by Status",
      description: "Apply status-based colors",
      type: "boolean",
      defaultValue: false,
    },
    {
      key: "columns",
      label: "Columns",
      description: "Number of columns in grid layout",
      type: "number",
      defaultValue: 2,
      validation: { min: 1, max: 4 },
    },
  ],
  component: KpiWidgetComponent,
  defaultConfig: {
    layout: "grid",
    showTrend: true,
    showTarget: true,
    colorByStatus: false,
    columns: 2,
  },
  supportsRefresh: true,
  minRefreshInterval: 30000,
};
