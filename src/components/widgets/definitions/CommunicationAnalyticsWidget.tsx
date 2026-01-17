import * as React from "react";
import {
  MessageSquare,
  Clock,
  TrendingUp,
  TrendingDown,
  Users,
  AlertTriangle,
  ChevronRight,
  Activity,
  BarChart3,
  CheckCircle2,
  XCircle,
  Timer,
  MessageCircle,
  Minus,
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

// =============================================================================
// Types
// =============================================================================

export interface ResponseTimeMetrics {
  avgMs: number | null;
  minMs: number | null;
  maxMs: number | null;
  trend: "improving" | "declining" | "stable";
}

export interface MessageVolumeMetrics {
  total: number;
  sent: number;
  received: number;
  dailyAverage: number;
}

export interface ConversationMetrics {
  totalConversations: number;
  activeConversations: number;
  newConversations: number;
}

export interface BottleneckInfo {
  id: string;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
}

export interface CommunicationAnalyticsData {
  period: {
    startDate: string;
    endDate: string;
    days: number;
  };
  responseTime: ResponseTimeMetrics;
  messageVolume: MessageVolumeMetrics;
  conversations: ConversationMetrics;
  peakHours: number[];
  bottlenecks: {
    total: number;
    bySeverity: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
    items: BottleneckInfo[];
  };
}

export interface CommunicationAnalyticsConfig {
  showResponseTime: boolean;
  showMessageVolume: boolean;
  showConversations: boolean;
  showBottlenecks: boolean;
  showPeakHours: boolean;
  compactMode: boolean;
  periodDays: number;
}

// =============================================================================
// Drill-down Modal State
// =============================================================================

type DrillDownType = "overview" | "responseTime" | "volume" | "conversations" | "bottlenecks" | null;

// =============================================================================
// Utility Functions
// =============================================================================

function formatDuration(ms: number | null): string {
  if (ms === null) return "N/A";
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
  if (ms < 86400000) return `${(ms / 3600000).toFixed(1)}h`;
  return `${(ms / 86400000).toFixed(1)}d`;
}

function formatHour(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return "12 PM";
  return `${hour - 12} PM`;
}

function getTrendIcon(trend: "improving" | "declining" | "stable") {
  switch (trend) {
    case "improving":
      return <TrendingDown className="w-4 h-4 text-green-500" />;
    case "declining":
      return <TrendingUp className="w-4 h-4 text-red-500" />;
    case "stable":
      return <Minus className="w-4 h-4 text-gray-400" />;
  }
}

function getTrendColor(trend: "improving" | "declining" | "stable"): string {
  switch (trend) {
    case "improving":
      return "text-green-500";
    case "declining":
      return "text-red-500";
    case "stable":
      return "text-gray-500";
  }
}

function getSeverityColor(severity: "low" | "medium" | "high" | "critical"): string {
  switch (severity) {
    case "critical":
      return "bg-red-500/10 text-red-500 border-red-500/20";
    case "high":
      return "bg-orange-500/10 text-orange-500 border-orange-500/20";
    case "medium":
      return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
    case "low":
      return "bg-blue-500/10 text-blue-500 border-blue-500/20";
  }
}

// =============================================================================
// Sub-components
// =============================================================================

function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  onClick,
  trend,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  subValue?: string;
  onClick?: () => void;
  trend?: "improving" | "declining" | "stable";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "p-3 rounded-lg bg-muted/50 transition-colors",
        onClick && "cursor-pointer hover:bg-muted",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-1">
        <Icon className="w-4 h-4 text-muted-foreground" />
        {trend && getTrendIcon(trend)}
      </div>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      {subValue && <p className="text-[10px] text-muted-foreground mt-0.5">{subValue}</p>}
    </div>
  );
}

function BottleneckBadge({
  severity,
  count,
}: {
  severity: "low" | "medium" | "high" | "critical";
  count: number;
}) {
  if (count === 0) return null;

  return (
    <span className={cn("px-1.5 py-0.5 rounded text-xs font-medium border", getSeverityColor(severity))}>
      {count}
    </span>
  );
}

function PeakHoursChart({ hours }: { hours: number[] }) {
  if (hours.length === 0) return null;

  return (
    <div className="flex gap-1 items-end">
      {hours.map((hour, i) => (
        <div
          key={hour}
          className={cn(
            "px-2 py-1 rounded text-xs font-medium",
            i === 0
              ? "bg-primary/20 text-primary"
              : "bg-muted text-muted-foreground"
          )}
        >
          {formatHour(hour)}
        </div>
      ))}
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
  data: CommunicationAnalyticsData;
}) {
  if (!type) return null;

  const getTitle = () => {
    switch (type) {
      case "overview":
        return "Communication Analytics Overview";
      case "responseTime":
        return "Response Time Analysis";
      case "volume":
        return "Message Volume Details";
      case "conversations":
        return "Conversation Activity";
      case "bottlenecks":
        return "Communication Bottlenecks";
      default:
        return "Details";
    }
  };

  const getDescription = () => {
    switch (type) {
      case "overview":
        return `Analytics for the last ${data.period.days} days`;
      case "responseTime":
        return "How quickly you respond to messages";
      case "volume":
        return "Message activity breakdown";
      case "conversations":
        return "Your conversation engagement";
      case "bottlenecks":
        return "Issues affecting communication efficiency";
      default:
        return "";
    }
  };

  const renderContent = () => {
    switch (type) {
      case "overview":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-xs text-muted-foreground">Average Response</p>
                <p className="text-2xl font-bold text-primary">
                  {formatDuration(data.responseTime.avgMs)}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <p className="text-xs text-muted-foreground">Total Messages</p>
                <p className="text-2xl font-bold text-green-500">{data.messageVolume.total}</p>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Sent vs Received</span>
              </div>
              <div className="flex h-3 rounded-full overflow-hidden">
                <div
                  className="bg-primary"
                  style={{
                    width: `${
                      data.messageVolume.total > 0
                        ? (data.messageVolume.sent / data.messageVolume.total) * 100
                        : 50
                    }%`,
                  }}
                />
                <div
                  className="bg-muted-foreground/30"
                  style={{
                    width: `${
                      data.messageVolume.total > 0
                        ? (data.messageVolume.received / data.messageVolume.total) * 100
                        : 50
                    }%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Sent: {data.messageVolume.sent}</span>
                <span>Received: {data.messageVolume.received}</span>
              </div>
            </div>
          </div>
        );

      case "responseTime":
        return (
          <div className="space-y-4">
            <div className="text-center p-6 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground mb-2">Average Response Time</p>
              <p className={cn("text-4xl font-bold", getTrendColor(data.responseTime.trend))}>
                {formatDuration(data.responseTime.avgMs)}
              </p>
              <div className="flex items-center justify-center gap-2 mt-2">
                {getTrendIcon(data.responseTime.trend)}
                <span className="text-sm text-muted-foreground">
                  {data.responseTime.trend === "improving"
                    ? "Improving"
                    : data.responseTime.trend === "declining"
                      ? "Needs attention"
                      : "Stable"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
                <p className="text-xs text-muted-foreground">Fastest</p>
                <p className="text-lg font-semibold text-green-500">
                  {formatDuration(data.responseTime.minMs)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
                <p className="text-xs text-muted-foreground">Slowest</p>
                <p className="text-lg font-semibold text-red-500">
                  {formatDuration(data.responseTime.maxMs)}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-blue-500/20 bg-blue-500/5">
              <p className="text-sm font-medium text-blue-500">Tips to improve response time:</p>
              <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                <li>• Set dedicated time blocks for responding to messages</li>
                <li>• Enable notifications for high-priority conversations</li>
                <li>• Use quick reply templates for common questions</li>
              </ul>
            </div>
          </div>
        );

      case "volume":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-center">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-xl font-bold text-primary">{data.messageVolume.total}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
                <p className="text-xs text-muted-foreground">Sent</p>
                <p className="text-xl font-bold text-blue-500">{data.messageVolume.sent}</p>
              </div>
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
                <p className="text-xs text-muted-foreground">Received</p>
                <p className="text-xl font-bold text-green-500">{data.messageVolume.received}</p>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm font-medium mb-2">Daily Average</p>
              <p className="text-3xl font-bold">{data.messageVolume.dailyAverage}</p>
              <p className="text-xs text-muted-foreground">messages per day</p>
            </div>

            {data.peakHours.length > 0 && (
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm font-medium mb-2">Most Active Hours</p>
                <PeakHoursChart hours={data.peakHours} />
              </div>
            )}
          </div>
        );

      case "conversations":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-center">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-xl font-bold text-primary">
                  {data.conversations.totalConversations}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
                <p className="text-xs text-muted-foreground">Active</p>
                <p className="text-xl font-bold text-green-500">
                  {data.conversations.activeConversations}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
                <p className="text-xs text-muted-foreground">New</p>
                <p className="text-xl font-bold text-blue-500">
                  {data.conversations.newConversations}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm font-medium mb-2">Conversation Activity</p>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{
                    width: `${
                      data.conversations.totalConversations > 0
                        ? (data.conversations.activeConversations /
                            data.conversations.totalConversations) *
                          100
                        : 0
                    }%`,
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {Math.round(
                  data.conversations.totalConversations > 0
                    ? (data.conversations.activeConversations /
                        data.conversations.totalConversations) *
                        100
                    : 0
                )}
                % of conversations are active
              </p>
            </div>
          </div>
        );

      case "bottlenecks":
        return (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {data.bottlenecks.total === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-50 text-green-500" />
                <p>No communication bottlenecks detected</p>
                <p className="text-xs mt-1">Great job keeping communication flowing!</p>
              </div>
            ) : (
              <>
                <div className="flex gap-2 mb-4">
                  <BottleneckBadge severity="critical" count={data.bottlenecks.bySeverity.critical} />
                  <BottleneckBadge severity="high" count={data.bottlenecks.bySeverity.high} />
                  <BottleneckBadge severity="medium" count={data.bottlenecks.bySeverity.medium} />
                  <BottleneckBadge severity="low" count={data.bottlenecks.bySeverity.low} />
                </div>
                {data.bottlenecks.items.map((bottleneck) => (
                  <div
                    key={bottleneck.id}
                    className={cn("p-3 rounded-lg border", getSeverityColor(bottleneck.severity))}
                  >
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{bottleneck.title}</p>
                        <p className="text-xs text-muted-foreground">{bottleneck.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
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

function CommunicationAnalyticsWidgetComponent({
  data,
  isLoading,
  error,
  instance,
  size,
}: WidgetProps<CommunicationAnalyticsData, CommunicationAnalyticsConfig>) {
  const config = instance.config as unknown as CommunicationAnalyticsConfig;
  const [drillDownType, setDrillDownType] = React.useState<DrillDownType>(null);

  // Sample data for when no real data is available
  const sampleData: CommunicationAnalyticsData = {
    period: {
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date().toISOString(),
      days: 7,
    },
    responseTime: {
      avgMs: 1800000, // 30 minutes
      minMs: 60000, // 1 minute
      maxMs: 7200000, // 2 hours
      trend: "improving",
    },
    messageVolume: {
      total: 156,
      sent: 78,
      received: 78,
      dailyAverage: 22,
    },
    conversations: {
      totalConversations: 12,
      activeConversations: 8,
      newConversations: 3,
    },
    peakHours: [10, 14, 16],
    bottlenecks: {
      total: 2,
      bySeverity: {
        critical: 0,
        high: 1,
        medium: 1,
        low: 0,
      },
      items: [
        {
          id: "1",
          type: "slow_response",
          severity: "high",
          title: "Slow Response Time",
          description: "Average response time is above 1 hour for some conversations",
        },
        {
          id: "2",
          type: "inactive_conversation",
          severity: "medium",
          title: "Inactive Conversations",
          description: "2 conversations have been inactive for more than 7 days",
        },
      ],
    },
  };

  const displayData = data ?? sampleData;

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px]">
        <div className="animate-pulse flex flex-col space-y-4 w-full p-4">
          <div className="h-20 bg-muted rounded-lg" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-16 bg-muted rounded-lg" />
            <div className="h-16 bg-muted rounded-lg" />
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
        <XCircle className="w-5 h-5 mr-2" />
        <span>{error}</span>
      </div>
    );
  }

  const isCompact = config.compactMode || size === "small";
  const showResponseTime = config.showResponseTime !== false;
  const showMessageVolume = config.showMessageVolume !== false;
  const showConversations = config.showConversations !== false && !isCompact;
  const showBottlenecks = config.showBottlenecks !== false;
  const showPeakHours = config.showPeakHours !== false && !isCompact;

  return (
    <div className="space-y-4" data-testid="communication-analytics-widget">
      {/* Drill-down Dialog */}
      <DrillDownDialog
        open={drillDownType !== null}
        onClose={() => setDrillDownType(null)}
        type={drillDownType}
        data={displayData}
      />

      {/* Main Hero - Response Time */}
      {showResponseTime && (
        <div
          className="text-center pb-4 border-b cursor-pointer hover:bg-muted/30 rounded-lg transition-colors -mx-1 px-1"
          onClick={() => setDrillDownType("responseTime")}
          data-testid="response-time-section"
        >
          <p className="text-sm text-muted-foreground mb-1">Avg Response Time</p>
          <div className="flex items-center justify-center gap-2">
            <Timer className="w-6 h-6 text-primary" />
            <span
              className={cn(
                "font-bold",
                isCompact ? "text-2xl" : "text-3xl",
                getTrendColor(displayData.responseTime.trend)
              )}
            >
              {formatDuration(displayData.responseTime.avgMs)}
            </span>
            {getTrendIcon(displayData.responseTime.trend)}
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {displayData.responseTime.trend === "improving"
              ? "Getting faster!"
              : displayData.responseTime.trend === "declining"
                ? "Needs attention"
                : "Consistent performance"}
          </p>
        </div>
      )}

      {/* Message Volume Stats */}
      {showMessageVolume && (
        <div className="grid grid-cols-3 gap-2">
          <StatCard
            icon={MessageSquare}
            label="Total"
            value={displayData.messageVolume.total}
            subValue={`${displayData.period.days} days`}
            onClick={() => setDrillDownType("volume")}
          />
          <StatCard
            icon={TrendingUp}
            label="Sent"
            value={displayData.messageVolume.sent}
            className="bg-blue-500/10"
          />
          <StatCard
            icon={TrendingDown}
            label="Received"
            value={displayData.messageVolume.received}
            className="bg-green-500/10"
          />
        </div>
      )}

      {/* Conversation Stats */}
      {showConversations && (
        <div
          className="p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
          onClick={() => setDrillDownType("conversations")}
          data-testid="conversations-section"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Conversations</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex gap-4 text-sm">
            <div>
              <span className="font-semibold text-green-500">
                {displayData.conversations.activeConversations}
              </span>
              <span className="text-muted-foreground"> active</span>
            </div>
            <div>
              <span className="font-semibold text-blue-500">
                {displayData.conversations.newConversations}
              </span>
              <span className="text-muted-foreground"> new</span>
            </div>
          </div>
        </div>
      )}

      {/* Peak Hours */}
      {showPeakHours && displayData.peakHours.length > 0 && (
        <div className="p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Peak Hours</span>
          </div>
          <PeakHoursChart hours={displayData.peakHours} />
        </div>
      )}

      {/* Bottlenecks Alert */}
      {showBottlenecks && displayData.bottlenecks.total > 0 && (
        <div
          className="p-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5 cursor-pointer hover:bg-yellow-500/10 transition-colors"
          onClick={() => setDrillDownType("bottlenecks")}
          data-testid="bottlenecks-section"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium">
                {displayData.bottlenecks.total} Bottleneck
                {displayData.bottlenecks.total !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex gap-1">
              <BottleneckBadge severity="critical" count={displayData.bottlenecks.bySeverity.critical} />
              <BottleneckBadge severity="high" count={displayData.bottlenecks.bySeverity.high} />
              <BottleneckBadge severity="medium" count={displayData.bottlenecks.bySeverity.medium} />
            </div>
          </div>
          {displayData.bottlenecks.items[0] && (
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {displayData.bottlenecks.items[0].title}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Widget Definition
// =============================================================================

export const CommunicationAnalyticsWidgetDefinition: WidgetDefinition<
  CommunicationAnalyticsData,
  CommunicationAnalyticsConfig
> = {
  id: "communication-analytics",
  name: "Communication Analytics",
  description:
    "Track response times, message volumes, and communication patterns to identify bottlenecks and optimize team collaboration.",
  category: "communication",
  defaultSize: "medium",
  supportedSizes: ["small", "medium", "large", "full"],
  icon: BarChart3,
  dataRequirements: [
    {
      key: "communicationAnalytics",
      label: "Communication Analytics Data",
      description: "Real-time communication metrics and patterns",
      required: true,
      type: "query",
    },
  ],
  configOptions: [
    {
      key: "showResponseTime",
      label: "Show Response Time",
      description: "Display average response time metrics",
      type: "boolean",
      defaultValue: true,
    },
    {
      key: "showMessageVolume",
      label: "Show Message Volume",
      description: "Display message volume statistics",
      type: "boolean",
      defaultValue: true,
    },
    {
      key: "showConversations",
      label: "Show Conversations",
      description: "Display conversation activity metrics",
      type: "boolean",
      defaultValue: true,
    },
    {
      key: "showBottlenecks",
      label: "Show Bottlenecks",
      description: "Display detected communication bottlenecks",
      type: "boolean",
      defaultValue: true,
    },
    {
      key: "showPeakHours",
      label: "Show Peak Hours",
      description: "Display most active communication hours",
      type: "boolean",
      defaultValue: true,
    },
    {
      key: "compactMode",
      label: "Compact Mode",
      description: "Show minimal information",
      type: "boolean",
      defaultValue: false,
    },
    {
      key: "periodDays",
      label: "Analysis Period (days)",
      description: "Number of days to analyze",
      type: "number",
      defaultValue: 7,
      validation: { min: 1, max: 90 },
    },
  ],
  component: CommunicationAnalyticsWidgetComponent,
  defaultConfig: {
    showResponseTime: true,
    showMessageVolume: true,
    showConversations: true,
    showBottlenecks: true,
    showPeakHours: true,
    compactMode: false,
    periodDays: 7,
  },
  supportsRefresh: true,
  minRefreshInterval: 60000, // 1 minute
};

export default CommunicationAnalyticsWidgetComponent;
