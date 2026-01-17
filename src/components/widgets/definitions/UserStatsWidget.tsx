import * as React from "react";
import {
  Users,
  UserPlus,
  UserCheck,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { cn } from "~/lib/utils";
import type { WidgetDefinition, WidgetProps } from "../types";

/**
 * User Stats Widget Data
 */
export interface UserStatsData {
  totalUsers: number;
  activeToday: number;
  activeThisWeek: number;
  newThisWeek: number;
  newThisMonth: number;
  byRole: Record<string, number>;
  trend: {
    users: number;
    active: number;
  };
}

/**
 * User Stats Widget Config
 */
export interface UserStatsConfig {
  showRoleBreakdown: boolean;
  showTrends: boolean;
  showNewUsers: boolean;
  period: "day" | "week" | "month";
}

/**
 * Role display names
 */
const roleDisplayNames: Record<string, string> = {
  md: "Managing Director",
  admin: "Administrator",
  "field-tech": "Field Technician",
  sales: "Sales",
};

/**
 * Role colors
 */
const roleColors: Record<string, string> = {
  md: "bg-purple-500",
  admin: "bg-blue-500",
  "field-tech": "bg-green-500",
  sales: "bg-orange-500",
};

/**
 * User Stats Widget Component
 */
function UserStatsWidgetComponent({
  data,
  isLoading,
  error,
  instance,
  size,
}: WidgetProps<UserStatsData, UserStatsConfig>) {
  const config = instance.config as unknown as UserStatsConfig;

  // Sample data for demonstration
  const sampleData: UserStatsData = {
    totalUsers: 156,
    activeToday: 45,
    activeThisWeek: 120,
    newThisWeek: 8,
    newThisMonth: 23,
    byRole: {
      md: 3,
      admin: 8,
      "field-tech": 95,
      sales: 50,
    },
    trend: {
      users: 12,
      active: 5,
    },
  };

  const stats = data ?? sampleData;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px]">
        <div className="animate-pulse flex flex-col space-y-3 w-full p-4">
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted rounded-lg" />
            ))}
          </div>
          <div className="h-24 bg-muted rounded-lg" />
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

  const isCompact = size === "small";

  return (
    <div className="space-y-4">
      {/* Main Stats */}
      <div className={cn("grid gap-4", isCompact ? "grid-cols-2" : "grid-cols-3")}>
        {/* Total Users */}
        <div className="p-4 rounded-lg bg-primary/10">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Total Users</span>
          </div>
          <div className="text-2xl font-bold">{stats.totalUsers}</div>
          {config.showTrends && stats.trend.users > 0 && (
            <div className="flex items-center gap-1 text-xs text-green-500 mt-1">
              <TrendingUp className="w-3 h-3" />
              <span>+{stats.trend.users}% this month</span>
            </div>
          )}
        </div>

        {/* Active Today */}
        <div className="p-4 rounded-lg bg-green-500/10">
          <div className="flex items-center gap-2 mb-2">
            <UserCheck className="w-4 h-4 text-green-500" />
            <span className="text-xs text-muted-foreground">Active Today</span>
          </div>
          <div className="text-2xl font-bold text-green-500">{stats.activeToday}</div>
          {config.showTrends && stats.trend.active !== 0 && (
            <div className={cn(
              "flex items-center gap-1 text-xs mt-1",
              stats.trend.active > 0 ? "text-green-500" : "text-red-500"
            )}>
              <TrendingUp className={cn("w-3 h-3", stats.trend.active < 0 && "rotate-180")} />
              <span>{stats.trend.active > 0 ? "+" : ""}{stats.trend.active}% vs yesterday</span>
            </div>
          )}
        </div>

        {/* New Users */}
        {config.showNewUsers && !isCompact && (
          <div className="p-4 rounded-lg bg-blue-500/10">
            <div className="flex items-center gap-2 mb-2">
              <UserPlus className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">
                New {config.period === "day" ? "Today" : config.period === "week" ? "This Week" : "This Month"}
              </span>
            </div>
            <div className="text-2xl font-bold text-blue-500">
              {config.period === "week" ? stats.newThisWeek : stats.newThisMonth}
            </div>
          </div>
        )}
      </div>

      {/* Role Breakdown */}
      {config.showRoleBreakdown && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Users by Role</span>
            <span className="text-xs text-muted-foreground">{stats.totalUsers} total</span>
          </div>

          {/* Role Progress Bars */}
          <div className="space-y-2">
            {Object.entries(stats.byRole).map(([role, count]) => {
              const percentage = (count / stats.totalUsers) * 100;
              return (
                <div key={role} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {roleDisplayNames[role] || role}
                    </span>
                    <span className="font-medium">{count}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full", roleColors[role] || "bg-primary")}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Role Legend */}
          {!isCompact && (
            <div className="flex flex-wrap gap-3 pt-2">
              {Object.entries(stats.byRole).map(([role, count]) => (
                <div key={role} className="flex items-center gap-1.5 text-xs">
                  <div className={cn("w-2 h-2 rounded-full", roleColors[role] || "bg-primary")} />
                  <span className="text-muted-foreground">{roleDisplayNames[role] || role}</span>
                  <span className="font-medium">({Math.round((count / stats.totalUsers) * 100)}%)</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Active Users Bar */}
      {!isCompact && (
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Activity Rate</span>
            <span className="font-medium">
              {Math.round((stats.activeToday / stats.totalUsers) * 100)}% today
            </span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full"
              style={{ width: `${(stats.activeToday / stats.totalUsers) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * User Stats Widget Definition
 */
export const UserStatsWidgetDefinition: WidgetDefinition<
  UserStatsData,
  UserStatsConfig
> = {
  id: "user-stats",
  name: "User Statistics",
  description: "View user counts, activity, and role distribution",
  category: "analytics",
  defaultSize: "medium",
  supportedSizes: ["small", "medium", "large"],
  icon: Users,
  dataRequirements: [
    {
      key: "users",
      label: "User Statistics",
      description: "User counts and activity data",
      required: true,
      type: "query",
    },
  ],
  configOptions: [
    {
      key: "showRoleBreakdown",
      label: "Show Role Breakdown",
      description: "Display user distribution by role",
      type: "boolean",
      defaultValue: true,
    },
    {
      key: "showTrends",
      label: "Show Trends",
      description: "Display growth trends",
      type: "boolean",
      defaultValue: true,
    },
    {
      key: "showNewUsers",
      label: "Show New Users",
      description: "Display new user count",
      type: "boolean",
      defaultValue: true,
    },
    {
      key: "period",
      label: "Period",
      description: "Time period for new user stats",
      type: "select",
      defaultValue: "week",
      options: [
        { label: "Today", value: "day" },
        { label: "This Week", value: "week" },
        { label: "This Month", value: "month" },
      ],
    },
  ],
  component: UserStatsWidgetComponent,
  defaultConfig: {
    showRoleBreakdown: true,
    showTrends: true,
    showNewUsers: true,
    period: "week",
  },
  supportsRefresh: true,
  minRefreshInterval: 60000,
};
