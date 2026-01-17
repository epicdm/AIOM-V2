import * as React from "react";
import {
  Newspaper,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
  Bell,
  Target,
  Lightbulb,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  User,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { briefingQueryOptions } from "~/queries/briefing-generator";
import { regenerateBriefingFn, markBriefingReadFn } from "~/fn/briefing-generator";
import type { WidgetDefinition, WidgetProps } from "../types";
import type { BriefingData } from "~/data-access/briefing-generator";

/**
 * Daily Briefing Widget Data Type
 */
export interface DailyBriefingWidgetData {
  briefing: BriefingData | null;
}

/**
 * Daily Briefing Widget Config
 */
export interface DailyBriefingConfig {
  showTasks: boolean;
  showApprovals: boolean;
  showAlerts: boolean;
  showInsights: boolean;
  compactMode: boolean;
}

/**
 * Format relative time
 */
function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return new Date(date).toLocaleDateString();
}

/**
 * Format currency for display
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Role badge display
 */
const roleDisplayNames: Record<string, string> = {
  md: "Managing Director",
  "field-tech": "Field Technician",
  admin: "Administrator",
  sales: "Sales",
};

/**
 * Section Card Component
 */
function SectionCard({
  title,
  icon: Icon,
  children,
  badge,
  className,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  badge?: string | number;
  className?: string;
}) {
  return (
    <div className={cn("border rounded-lg p-3", className)}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium text-sm">{title}</span>
        </div>
        {badge !== undefined && (
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

/**
 * Stat Item Component
 */
function StatItem({
  label,
  value,
  variant = "default",
}: {
  label: string;
  value: number | string;
  variant?: "default" | "warning" | "success" | "error";
}) {
  const colors = {
    default: "text-foreground",
    warning: "text-yellow-600",
    success: "text-green-600",
    error: "text-red-600",
  };

  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium", colors[variant])}>{value}</span>
    </div>
  );
}

/**
 * Daily Briefing Widget Component
 */
function DailyBriefingWidgetComponent({
  instance,
  size,
}: WidgetProps<DailyBriefingWidgetData, DailyBriefingConfig>) {
  const config = instance.config as unknown as DailyBriefingConfig;
  const queryClient = useQueryClient();

  // Fetch briefing data
  const {
    data: briefing,
    isLoading,
    error,
    refetch,
  } = useQuery(briefingQueryOptions());

  // Regenerate mutation
  const regenerateMutation = useMutation({
    mutationFn: () => regenerateBriefingFn(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["briefing"] });
    },
  });

  // Mark as read mutation
  const markReadMutation = useMutation({
    mutationFn: () => markBriefingReadFn(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["briefing"] });
    },
  });

  // Mark as read when component mounts with data
  React.useEffect(() => {
    if (briefing && !markReadMutation.isPending) {
      // Auto-mark as read after viewing for 2 seconds
      const timer = setTimeout(() => {
        markReadMutation.mutate();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [briefing?.generatedAt]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">
            Generating your briefing...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center p-4">
        <AlertCircle className="w-10 h-10 text-destructive mb-2" />
        <p className="text-destructive font-medium">Failed to load briefing</p>
        <p className="text-sm text-muted-foreground mt-1">
          {error instanceof Error ? error.message : "Unknown error occurred"}
        </p>
        <button
          onClick={() => refetch()}
          className="mt-3 text-sm text-primary hover:underline flex items-center gap-1"
        >
          <RefreshCw className="w-4 h-4" />
          Try again
        </button>
      </div>
    );
  }

  if (!briefing) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center p-4">
        <Newspaper className="w-10 h-10 text-muted-foreground/50 mb-2" />
        <p className="font-medium">No briefing available</p>
        <p className="text-sm text-muted-foreground mt-1">
          Click below to generate your daily briefing
        </p>
        <button
          onClick={() => regenerateMutation.mutate()}
          disabled={regenerateMutation.isPending}
          className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
        >
          {regenerateMutation.isPending ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Newspaper className="w-4 h-4" />
              Generate Briefing
            </>
          )}
        </button>
      </div>
    );
  }

  const isCompact = config.compactMode || size === "small";

  return (
    <div className="space-y-4" data-testid="daily-briefing-widget">
      {/* Header with Greeting */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold" data-testid="briefing-greeting">
            {briefing.greeting}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            {briefing.userRole && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full flex items-center gap-1">
                <User className="w-3 h-3" />
                {roleDisplayNames[briefing.userRole] || briefing.userRole}
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              Updated {formatTimeAgo(new Date(briefing.generatedAt))}
            </span>
          </div>
        </div>
        <button
          onClick={() => regenerateMutation.mutate()}
          disabled={regenerateMutation.isPending}
          className="p-2 rounded-md hover:bg-muted transition-colors"
          title="Refresh briefing"
        >
          <RefreshCw
            className={cn(
              "w-4 h-4 text-muted-foreground",
              regenerateMutation.isPending && "animate-spin"
            )}
          />
        </button>
      </div>

      {/* Summary */}
      <div className="bg-muted/50 rounded-lg p-3">
        <p className="text-sm" data-testid="briefing-summary">
          {briefing.summary}
        </p>
      </div>

      {/* Content Grid */}
      <div
        className={cn(
          "grid gap-3",
          isCompact ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
        )}
      >
        {/* Tasks Section */}
        {config.showTasks && (
          <SectionCard
            title="Tasks"
            icon={CheckCircle2}
            badge={briefing.tasks.totalOpen}
          >
            <div className="space-y-1.5">
              <StatItem
                label="Overdue"
                value={briefing.tasks.overdue}
                variant={briefing.tasks.overdue > 0 ? "error" : "default"}
              />
              <StatItem
                label="Due Today"
                value={briefing.tasks.dueToday}
                variant={briefing.tasks.dueToday > 0 ? "warning" : "default"}
              />
              <StatItem label="High Priority" value={briefing.tasks.highPriority} />
              {briefing.tasks.blocked > 0 && (
                <StatItem
                  label="Blocked"
                  value={briefing.tasks.blocked}
                  variant="error"
                />
              )}
            </div>
            {!isCompact && briefing.tasks.topOverdueTasks.length > 0 && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Top Overdue:
                </p>
                <ul className="space-y-1">
                  {briefing.tasks.topOverdueTasks.slice(0, 2).map((task) => (
                    <li
                      key={task.id}
                      className="text-xs flex items-center gap-2"
                    >
                      <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />
                      <span className="truncate">{task.name}</span>
                      <span className="text-red-500 shrink-0">
                        {task.daysOverdue}d
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </SectionCard>
        )}

        {/* Approvals Section */}
        {config.showApprovals && briefing.approvals.pendingCount > 0 && (
          <SectionCard
            title="Approvals"
            icon={FileText}
            badge={briefing.approvals.pendingCount}
          >
            <div className="space-y-1.5">
              <StatItem
                label="Pending Value"
                value={formatCurrency(briefing.approvals.totalPendingValue)}
              />
              {briefing.approvals.urgentCount > 0 && (
                <StatItem
                  label="Urgent"
                  value={briefing.approvals.urgentCount}
                  variant="warning"
                />
              )}
              {briefing.approvals.oldestPendingDays > 0 && (
                <StatItem
                  label="Oldest Pending"
                  value={`${briefing.approvals.oldestPendingDays} days`}
                  variant={
                    briefing.approvals.oldestPendingDays > 7
                      ? "error"
                      : "default"
                  }
                />
              )}
            </div>
          </SectionCard>
        )}

        {/* Alerts Section */}
        {config.showAlerts && (
          <SectionCard
            title="Notifications"
            icon={Bell}
            badge={briefing.alerts.unreadCount}
          >
            {briefing.alerts.unreadCount === 0 ? (
              <p className="text-sm text-muted-foreground">
                All caught up!
              </p>
            ) : (
              <div className="space-y-2">
                {briefing.alerts.recentAlerts.slice(0, 3).map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-start gap-2 text-xs"
                  >
                    <Bell className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
                    <span className="truncate">{alert.title}</span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        )}

        {/* Insights Section */}
        {config.showInsights && !isCompact && (
          <SectionCard
            title="Insights"
            icon={Lightbulb}
            className="md:col-span-2"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Key Highlights */}
              {briefing.insights.keyHighlights.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Highlights
                  </p>
                  <ul className="space-y-1">
                    {briefing.insights.keyHighlights.slice(0, 2).map((item, i) => (
                      <li key={i} className="text-xs flex items-start gap-1.5">
                        <ChevronRight className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommended Actions */}
              {briefing.insights.recommendedActions.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    Recommended
                  </p>
                  <ul className="space-y-1">
                    {briefing.insights.recommendedActions
                      .slice(0, 2)
                      .map((item, i) => (
                        <li key={i} className="text-xs flex items-start gap-1.5">
                          <ChevronRight className="w-3 h-3 text-green-600 mt-0.5 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                  </ul>
                </div>
              )}

              {/* Risk Areas */}
              {briefing.insights.riskAreas.length > 0 && (
                <div className="md:col-span-2">
                  <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-yellow-600" />
                    Attention Needed
                  </p>
                  <ul className="space-y-1">
                    {briefing.insights.riskAreas.slice(0, 2).map((item, i) => (
                      <li key={i} className="text-xs flex items-start gap-1.5">
                        <ChevronRight className="w-3 h-3 text-yellow-600 mt-0.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </SectionCard>
        )}
      </div>

      {/* Role Priorities (for larger sizes) */}
      {!isCompact && size === "large" && briefing.rolePriorities && (
        <div className="border-t pt-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Today's Focus Areas:
          </p>
          <div className="flex flex-wrap gap-2">
            {briefing.rolePriorities.focusAreas.slice(0, 4).map((area, i) => (
              <span
                key={i}
                className="text-xs bg-muted px-2 py-1 rounded-full"
              >
                {area}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Daily Briefing Widget Definition
 */
export const DailyBriefingWidgetDefinition: WidgetDefinition<
  DailyBriefingWidgetData,
  DailyBriefingConfig
> = {
  id: "daily-briefing",
  name: "Daily Briefing",
  description:
    "Personalized daily briefing with tasks, approvals, alerts, and insights based on your role",
  category: "productivity",
  defaultSize: "medium",
  supportedSizes: ["small", "medium", "large", "full"],
  icon: Newspaper,
  dataRequirements: [
    {
      key: "briefing",
      label: "Briefing Data",
      description: "Aggregated daily briefing content",
      required: true,
      type: "query",
    },
  ],
  configOptions: [
    {
      key: "showTasks",
      label: "Show Tasks",
      description: "Display task summary section",
      type: "boolean",
      defaultValue: true,
    },
    {
      key: "showApprovals",
      label: "Show Approvals",
      description: "Display pending approvals section",
      type: "boolean",
      defaultValue: true,
    },
    {
      key: "showAlerts",
      label: "Show Alerts",
      description: "Display notifications/alerts section",
      type: "boolean",
      defaultValue: true,
    },
    {
      key: "showInsights",
      label: "Show Insights",
      description: "Display AI-generated insights section",
      type: "boolean",
      defaultValue: true,
    },
    {
      key: "compactMode",
      label: "Compact Mode",
      description: "Use compact layout regardless of widget size",
      type: "boolean",
      defaultValue: false,
    },
  ],
  component: DailyBriefingWidgetComponent,
  defaultConfig: {
    showTasks: true,
    showApprovals: true,
    showAlerts: true,
    showInsights: true,
    compactMode: false,
  },
  supportsRefresh: true,
  minRefreshInterval: 60000, // 1 minute minimum refresh
};
