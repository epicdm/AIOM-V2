import * as React from "react";
import { BarChart3, TrendingUp, AlertCircle } from "lucide-react";
import { cn } from "~/lib/utils";
import type { WidgetDefinition, WidgetProps } from "../types";

/**
 * Chart Data Point
 */
export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

/**
 * Chart Widget Data
 */
export interface ChartData {
  title?: string;
  data: ChartDataPoint[];
  total?: number;
  unit?: string;
}

/**
 * Chart Widget Config
 */
export interface ChartConfig {
  chartType: "bar" | "horizontalBar" | "donut" | "line";
  showLegend: boolean;
  showValues: boolean;
  colorScheme: "default" | "blue" | "green" | "rainbow";
  animated: boolean;
}

/**
 * Color schemes
 */
const colorSchemes = {
  default: [
    "bg-primary",
    "bg-purple-500",
    "bg-blue-500",
    "bg-green-500",
    "bg-yellow-500",
    "bg-red-500",
  ],
  blue: [
    "bg-blue-300",
    "bg-blue-400",
    "bg-blue-500",
    "bg-blue-600",
    "bg-blue-700",
    "bg-blue-800",
  ],
  green: [
    "bg-green-300",
    "bg-green-400",
    "bg-green-500",
    "bg-green-600",
    "bg-green-700",
    "bg-green-800",
  ],
  rainbow: [
    "bg-red-500",
    "bg-orange-500",
    "bg-yellow-500",
    "bg-green-500",
    "bg-blue-500",
    "bg-purple-500",
  ],
};

/**
 * Bar Chart Component
 */
function BarChartView({
  data,
  config,
  maxValue,
}: {
  data: ChartDataPoint[];
  config: ChartConfig;
  maxValue: number;
}) {
  const colors = colorSchemes[config.colorScheme];

  return (
    <div className="flex items-end justify-around gap-2 h-40 px-2">
      {data.map((point, index) => {
        const height = maxValue > 0 ? (point.value / maxValue) * 100 : 0;
        const color = point.color || colors[index % colors.length];
        return (
          <div
            key={point.label}
            className="flex flex-col items-center gap-1 flex-1"
          >
            <div className="relative w-full h-32 flex items-end justify-center">
              <div
                className={cn(
                  "w-full max-w-12 rounded-t-md transition-all duration-500",
                  color,
                  config.animated && "animate-grow-up"
                )}
                style={{
                  height: `${height}%`,
                  animationDelay: config.animated
                    ? `${index * 100}ms`
                    : undefined,
                }}
              />
              {config.showValues && (
                <span className="absolute -top-5 text-xs font-medium">
                  {point.value.toLocaleString()}
                </span>
              )}
            </div>
            <span className="text-xs text-muted-foreground truncate w-full text-center">
              {point.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Horizontal Bar Chart Component
 */
function HorizontalBarChartView({
  data,
  config,
  maxValue,
}: {
  data: ChartDataPoint[];
  config: ChartConfig;
  maxValue: number;
}) {
  const colors = colorSchemes[config.colorScheme];

  return (
    <div className="space-y-3">
      {data.map((point, index) => {
        const width = maxValue > 0 ? (point.value / maxValue) * 100 : 0;
        const color = point.color || colors[index % colors.length];
        return (
          <div key={point.label} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground truncate max-w-[60%]">
                {point.label}
              </span>
              {config.showValues && (
                <span className="font-medium">
                  {point.value.toLocaleString()}
                </span>
              )}
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  color,
                  config.animated && "animate-grow-right"
                )}
                style={{
                  width: `${width}%`,
                  animationDelay: config.animated
                    ? `${index * 100}ms`
                    : undefined,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Donut Chart Component
 */
function DonutChartView({
  data,
  config,
  total,
}: {
  data: ChartDataPoint[];
  config: ChartConfig;
  total: number;
}) {
  const colors = colorSchemes[config.colorScheme];
  const size = 120;
  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedOffset = 0;

  return (
    <div className="flex items-center justify-center gap-6">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {data.map((point, index) => {
            const percentage = total > 0 ? (point.value / total) * 100 : 0;
            const strokeLength = (percentage / 100) * circumference;
            const offset = accumulatedOffset;
            accumulatedOffset += strokeLength;

            // Map color class to actual color
            const colorClass = point.color || colors[index % colors.length];
            const colorMap: Record<string, string> = {
              "bg-primary": "hsl(var(--primary))",
              "bg-purple-500": "#a855f7",
              "bg-blue-500": "#3b82f6",
              "bg-green-500": "#22c55e",
              "bg-yellow-500": "#eab308",
              "bg-red-500": "#ef4444",
              "bg-orange-500": "#f97316",
              "bg-blue-300": "#93c5fd",
              "bg-blue-400": "#60a5fa",
              "bg-blue-600": "#2563eb",
              "bg-blue-700": "#1d4ed8",
              "bg-blue-800": "#1e40af",
              "bg-green-300": "#86efac",
              "bg-green-400": "#4ade80",
              "bg-green-600": "#16a34a",
              "bg-green-700": "#15803d",
              "bg-green-800": "#166534",
            };
            const strokeColor = colorMap[colorClass] || "#6366f1";

            return (
              <circle
                key={point.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeDasharray={`${strokeLength} ${circumference}`}
                strokeDashoffset={-offset}
                className={cn(
                  "transition-all duration-500",
                  config.animated && "animate-draw-circle"
                )}
                style={{
                  animationDelay: config.animated
                    ? `${index * 150}ms`
                    : undefined,
                }}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold">{total.toLocaleString()}</span>
          <span className="text-xs text-muted-foreground">Total</span>
        </div>
      </div>
      {config.showLegend && (
        <div className="space-y-2">
          {data.map((point, index) => {
            const color = point.color || colors[index % colors.length];
            return (
              <div key={point.label} className="flex items-center gap-2">
                <div className={cn("w-3 h-3 rounded-full", color)} />
                <span className="text-sm text-muted-foreground">
                  {point.label}
                </span>
                {config.showValues && (
                  <span className="text-sm font-medium ml-auto">
                    {point.value.toLocaleString()}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Line Chart Component (Simple version)
 */
function LineChartView({
  data,
  config,
  maxValue,
}: {
  data: ChartDataPoint[];
  config: ChartConfig;
  maxValue: number;
}) {
  const width = 300;
  const height = 120;
  const padding = 20;

  const points = data.map((point, index) => {
    const x = padding + (index / (data.length - 1)) * (width - 2 * padding);
    const y =
      height -
      padding -
      (maxValue > 0 ? (point.value / maxValue) * (height - 2 * padding) : 0);
    return { x, y, ...point };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${padding} ${height - padding} Z`;

  return (
    <div className="flex flex-col items-center">
      <svg width={width} height={height} className="overflow-visible">
        {/* Grid lines */}
        {[0.25, 0.5, 0.75, 1].map((fraction) => (
          <line
            key={fraction}
            x1={padding}
            y1={height - padding - fraction * (height - 2 * padding)}
            x2={width - padding}
            y2={height - padding - fraction * (height - 2 * padding)}
            stroke="currentColor"
            strokeOpacity={0.1}
            strokeDasharray="4 4"
          />
        ))}

        {/* Area fill */}
        <path
          d={areaPath}
          fill="url(#areaGradient)"
          className={cn(
            config.animated && "animate-fade-in opacity-0"
          )}
          style={{ animationDelay: "300ms", animationFillMode: "forwards" }}
        />

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn(config.animated && "animate-draw-line")}
        />

        {/* Data points */}
        {points.map((point, index) => (
          <g key={point.label}>
            <circle
              cx={point.x}
              cy={point.y}
              r={4}
              fill="hsl(var(--background))"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              className={cn(config.animated && "animate-scale-in")}
              style={{
                animationDelay: config.animated
                  ? `${index * 100 + 200}ms`
                  : undefined,
              }}
            />
            {config.showValues && (
              <text
                x={point.x}
                y={point.y - 10}
                textAnchor="middle"
                className="fill-current text-xs"
              >
                {point.value}
              </text>
            )}
          </g>
        ))}

        {/* Gradient definition */}
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      {/* Labels */}
      <div className="flex justify-between w-full px-4 mt-2">
        {data.map((point) => (
          <span
            key={point.label}
            className="text-xs text-muted-foreground truncate"
          >
            {point.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Chart Widget Component
 */
function ChartWidgetComponent({
  data,
  isLoading,
  error,
  instance,
}: WidgetProps<ChartData, ChartConfig>) {
  const config = instance.config as unknown as ChartConfig;

  // Sample data for demonstration
  const sampleData: ChartData = {
    title: "Monthly Performance",
    data: [
      { label: "Jan", value: 1200 },
      { label: "Feb", value: 1900 },
      { label: "Mar", value: 1500 },
      { label: "Apr", value: 2200 },
      { label: "May", value: 1800 },
      { label: "Jun", value: 2500 },
    ],
    total: 11100,
    unit: "units",
  };

  const displayData = data ?? sampleData;
  const maxValue = Math.max(...displayData.data.map((d) => d.value));
  const total = displayData.total ?? displayData.data.reduce((sum, d) => sum + d.value, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px]">
        <div className="animate-pulse w-full h-40 bg-muted rounded-lg" />
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
      {/* Title */}
      {displayData.title && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="font-medium">{displayData.title}</span>
          </div>
          {displayData.unit && (
            <span className="text-xs text-muted-foreground">
              {displayData.unit}
            </span>
          )}
        </div>
      )}

      {/* Chart */}
      <div className="min-h-[140px]">
        {config.chartType === "bar" && (
          <BarChartView data={displayData.data} config={config} maxValue={maxValue} />
        )}
        {config.chartType === "horizontalBar" && (
          <HorizontalBarChartView
            data={displayData.data}
            config={config}
            maxValue={maxValue}
          />
        )}
        {config.chartType === "donut" && (
          <DonutChartView data={displayData.data} config={config} total={total} />
        )}
        {config.chartType === "line" && (
          <LineChartView data={displayData.data} config={config} maxValue={maxValue} />
        )}
      </div>
    </div>
  );
}

/**
 * Chart Widget Definition
 */
export const ChartWidgetDefinition: WidgetDefinition<ChartData, ChartConfig> = {
  id: "chart",
  name: "Chart",
  description: "Visualize data with various chart types",
  category: "analytics",
  defaultSize: "medium",
  supportedSizes: ["small", "medium", "large", "full"],
  icon: BarChart3,
  dataRequirements: [
    {
      key: "chartData",
      label: "Chart Data",
      description: "Data points for the chart",
      required: true,
      type: "query",
    },
  ],
  configOptions: [
    {
      key: "chartType",
      label: "Chart Type",
      description: "Type of chart to display",
      type: "select",
      defaultValue: "bar",
      options: [
        { label: "Bar Chart", value: "bar" },
        { label: "Horizontal Bar", value: "horizontalBar" },
        { label: "Donut Chart", value: "donut" },
        { label: "Line Chart", value: "line" },
      ],
    },
    {
      key: "showLegend",
      label: "Show Legend",
      description: "Display chart legend",
      type: "boolean",
      defaultValue: true,
    },
    {
      key: "showValues",
      label: "Show Values",
      description: "Display data values on chart",
      type: "boolean",
      defaultValue: true,
    },
    {
      key: "colorScheme",
      label: "Color Scheme",
      description: "Color palette for the chart",
      type: "select",
      defaultValue: "default",
      options: [
        { label: "Default", value: "default" },
        { label: "Blue", value: "blue" },
        { label: "Green", value: "green" },
        { label: "Rainbow", value: "rainbow" },
      ],
    },
    {
      key: "animated",
      label: "Animated",
      description: "Enable chart animations",
      type: "boolean",
      defaultValue: true,
    },
  ],
  component: ChartWidgetComponent,
  defaultConfig: {
    chartType: "bar",
    showLegend: true,
    showValues: true,
    colorScheme: "default",
    animated: true,
  },
  supportsRefresh: true,
  minRefreshInterval: 60000,
};
