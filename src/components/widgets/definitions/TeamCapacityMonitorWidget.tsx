import * as React from "react";
import {
  Users,
  UserCheck,
  UserX,
  AlertTriangle,
  AlertCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Lightbulb,
  Activity,
  BarChart3,
  User,
  Briefcase,
  CheckCircle2,
  XCircle,
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
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Progress } from "~/components/ui/progress";

// =============================================================================
// Types
// =============================================================================

export type CapacityAlertSeverity = "info" | "warning" | "critical";
export type MemberCapacityStatus = "available" | "busy" | "overloaded" | "away" | "offline";

export interface TeamMemberCapacity {
  maxWeeklyHours: number;
  maxConcurrentTasks: number;
  maxActiveProjects: number;
  currentTasks: number;
  currentProjects: number;
  currentWeeklyHours: number;
  currentUtilization: number;
  status: MemberCapacityStatus;
  statusNote: string | null;
}

export interface TeamAssignmentSummary {
  id: string;
  title: string;
  type: string;
  priority: string;
  status: string;
  estimatedHours: number | null;
  dueDate: string | null;
  isOverdue: boolean;
}

export interface TeamMemberWithCapacity {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: string | null;
  capacity: TeamMemberCapacity | null;
  assignments: TeamAssignmentSummary[];
}

export interface CapacityMonitorAlert {
  id: string;
  type: string;
  severity: CapacityAlertSeverity;
  title: string;
  message: string;
  userId?: string;
  userName?: string;
  currentValue?: number;
  thresholdValue?: number;
  createdAt: string;
  acknowledged: boolean;
}

export interface TeamCapacitySummary {
  totalMembers: number;
  availableMembers: number;
  busyMembers: number;
  overloadedMembers: number;
  awayMembers: number;
  averageUtilization: number;
  totalCapacityHours: number;
  usedCapacityHours: number;
  availableCapacityHours: number;
}

export interface WorkloadDistribution {
  underutilized: number;
  optimal: number;
  busy: number;
  overloaded: number;
  balanceScore: number;
}

export interface CapacityTrendPoint {
  date: string;
  averageUtilization: number;
  overloadedCount: number;
  availableCapacityHours: number;
}

export interface RebalancingSuggestion {
  id: string;
  type: "reassign" | "redistribute" | "defer" | "hire";
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  fromUserId?: string;
  fromUserName?: string;
  toUserId?: string;
  toUserName?: string;
  potentialImpact: string;
}

/**
 * Team Capacity Monitor Widget Data
 */
export interface TeamCapacityMonitorData {
  summary: TeamCapacitySummary;
  members: TeamMemberWithCapacity[];
  distribution: WorkloadDistribution;
  alerts: CapacityMonitorAlert[];
  suggestions: RebalancingSuggestion[];
  trends: CapacityTrendPoint[];
  lastRefreshed: string;
}

/**
 * Team Capacity Monitor Widget Config
 */
export interface TeamCapacityMonitorConfig {
  showMembers: boolean;
  showAlerts: boolean;
  showSuggestions: boolean;
  showDistribution: boolean;
  showTrends: boolean;
  compactMode: boolean;
  overloadThreshold: number;
  warningThreshold: number;
  underutilizedThreshold: number;
}

// =============================================================================
// Drill-down Modal State
// =============================================================================

type DrillDownType = "summary" | "members" | "alerts" | "suggestions" | "distribution" | null;

// =============================================================================
// Utility Functions
// =============================================================================

function getStatusColor(status: MemberCapacityStatus): string {
  switch (status) {
    case "available":
      return "bg-green-500";
    case "busy":
      return "bg-yellow-500";
    case "overloaded":
      return "bg-red-500";
    case "away":
      return "bg-gray-400";
    case "offline":
      return "bg-gray-300";
    default:
      return "bg-gray-400";
  }
}

function getUtilizationColor(utilization: number): string {
  if (utilization > 100) return "text-red-500";
  if (utilization > 85) return "text-yellow-500";
  if (utilization < 30) return "text-blue-500";
  return "text-green-500";
}

function getUtilizationBgColor(utilization: number): string {
  if (utilization > 100) return "bg-red-500";
  if (utilization > 85) return "bg-yellow-500";
  if (utilization < 30) return "bg-blue-500";
  return "bg-green-500";
}

function formatInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// =============================================================================
// Sub-components
// =============================================================================

/**
 * Member Avatar with Status Indicator
 */
function MemberAvatar({
  member,
  size = "md",
}: {
  member: TeamMemberWithCapacity;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10",
  };

  const statusSize = {
    sm: "h-2 w-2",
    md: "h-2.5 w-2.5",
    lg: "h-3 w-3",
  };

  const status = member.capacity?.status || "available";

  return (
    <div className="relative">
      <Avatar className={sizeClasses[size]}>
        <AvatarImage src={member.image || undefined} alt={member.name} />
        <AvatarFallback className="text-xs">{formatInitials(member.name)}</AvatarFallback>
      </Avatar>
      <span
        className={cn(
          "absolute bottom-0 right-0 rounded-full ring-2 ring-background",
          statusSize[size],
          getStatusColor(status)
        )}
      />
    </div>
  );
}

/**
 * Utilization Progress Bar
 */
function UtilizationBar({ utilization, size = "md" }: { utilization: number; size?: "sm" | "md" }) {
  const heightClass = size === "sm" ? "h-1.5" : "h-2";

  return (
    <div className={cn("w-full bg-muted rounded-full overflow-hidden", heightClass)}>
      <div
        className={cn("h-full rounded-full transition-all", getUtilizationBgColor(utilization))}
        style={{ width: `${Math.min(utilization, 100)}%` }}
      />
    </div>
  );
}

/**
 * Alert Badge component
 */
function AlertBadge({ severity, count }: { severity: CapacityAlertSeverity; count: number }) {
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
 * Distribution Mini Chart
 */
function DistributionChart({ distribution }: { distribution: WorkloadDistribution }) {
  const total =
    distribution.underutilized + distribution.optimal + distribution.busy + distribution.overloaded;
  if (total === 0) return null;

  const segments = [
    { count: distribution.underutilized, color: "bg-blue-500", label: "Underutilized" },
    { count: distribution.optimal, color: "bg-green-500", label: "Optimal" },
    { count: distribution.busy, color: "bg-yellow-500", label: "Busy" },
    { count: distribution.overloaded, color: "bg-red-500", label: "Overloaded" },
  ];

  return (
    <div className="space-y-2">
      <div className="flex h-3 rounded-full overflow-hidden">
        {segments.map(
          (seg, i) =>
            seg.count > 0 && (
              <div
                key={i}
                className={cn("transition-all", seg.color)}
                style={{ width: `${(seg.count / total) * 100}%` }}
                title={`${seg.label}: ${seg.count}`}
              />
            )
        )}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>Balance Score: {distribution.balanceScore}%</span>
        <span>{total} members</span>
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
  data: TeamCapacityMonitorData;
}) {
  if (!type) return null;

  const getTitle = () => {
    switch (type) {
      case "summary":
        return "Team Capacity Overview";
      case "members":
        return "Team Members";
      case "alerts":
        return "Capacity Alerts";
      case "suggestions":
        return "Workload Rebalancing Suggestions";
      case "distribution":
        return "Workload Distribution";
      default:
        return "Details";
    }
  };

  const getDescription = () => {
    switch (type) {
      case "summary":
        return "Detailed breakdown of team capacity metrics";
      case "members":
        return "Individual team member workload and availability";
      case "alerts":
        return "Alerts requiring attention";
      case "suggestions":
        return "Recommendations for balancing team workload";
      case "distribution":
        return "How work is distributed across the team";
      default:
        return "";
    }
  };

  const renderContent = () => {
    switch (type) {
      case "summary":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-xs text-muted-foreground">Team Size</p>
                <p className="text-2xl font-bold text-primary">{data.summary.totalMembers}</p>
              </div>
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <p className="text-xs text-muted-foreground">Available</p>
                <p className="text-2xl font-bold text-green-500">{data.summary.availableMembers}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-center">
                <p className="text-xs text-muted-foreground">Busy</p>
                <p className="text-lg font-semibold text-yellow-600">{data.summary.busyMembers}</p>
              </div>
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
                <p className="text-xs text-muted-foreground">Overloaded</p>
                <p className="text-lg font-semibold text-red-500">{data.summary.overloadedMembers}</p>
              </div>
              <div className="p-3 rounded-lg bg-gray-500/10 border border-gray-500/20 text-center">
                <p className="text-xs text-muted-foreground">Away</p>
                <p className="text-lg font-semibold text-gray-500">{data.summary.awayMembers}</p>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Team Utilization</span>
                <span className={cn("text-lg font-bold", getUtilizationColor(data.summary.averageUtilization))}>
                  {data.summary.averageUtilization.toFixed(0)}%
                </span>
              </div>
              <UtilizationBar utilization={data.summary.averageUtilization} />
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded-lg bg-muted/30">
                <p className="text-xs text-muted-foreground">Total Capacity</p>
                <p className="font-medium">{data.summary.totalCapacityHours}h / week</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <p className="text-xs text-muted-foreground">Available Capacity</p>
                <p className="font-medium text-green-500">{data.summary.availableCapacityHours}h</p>
              </div>
            </div>
          </div>
        );

      case "members":
        return (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {data.members.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No team members found</p>
              </div>
            ) : (
              data.members.map((member) => {
                const utilization = member.capacity?.currentUtilization ?? 0;
                return (
                  <div key={member.id} className="p-3 rounded-lg border bg-card">
                    <div className="flex items-center gap-3">
                      <MemberAvatar member={member} size="lg" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium truncate">{member.name}</p>
                          <span
                            className={cn(
                              "text-sm font-semibold",
                              getUtilizationColor(utilization)
                            )}
                          >
                            {utilization.toFixed(0)}%
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {member.role || "Team Member"} • {member.assignments.length} tasks
                        </p>
                        <div className="mt-1.5">
                          <UtilizationBar utilization={utilization} size="sm" />
                        </div>
                      </div>
                    </div>
                    {member.assignments.length > 0 && (
                      <div className="mt-2 pt-2 border-t">
                        <p className="text-xs text-muted-foreground mb-1">Active Assignments:</p>
                        <div className="space-y-1">
                          {member.assignments.slice(0, 3).map((task) => (
                            <div
                              key={task.id}
                              className={cn(
                                "text-xs flex items-center gap-1",
                                task.isOverdue && "text-red-500"
                              )}
                            >
                              {task.isOverdue ? (
                                <XCircle className="w-3 h-3" />
                              ) : (
                                <CheckCircle2 className="w-3 h-3 text-muted-foreground" />
                              )}
                              <span className="truncate">{task.title}</span>
                            </div>
                          ))}
                          {member.assignments.length > 3 && (
                            <p className="text-xs text-muted-foreground">
                              +{member.assignments.length - 3} more
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        );

      case "alerts":
        return (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {data.alerts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-50 text-green-500" />
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
                  <div key={alert.id} className={cn("p-3 rounded-lg border", colors[alert.severity])}>
                    <div className="flex items-start gap-2">
                      <AlertCircle className={cn("w-4 h-4 mt-0.5", iconColors[alert.severity])} />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{alert.title}</p>
                        <p className="text-xs text-muted-foreground">{alert.message}</p>
                        {alert.userName && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Affected: {alert.userName}
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
                          <span
                            className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded",
                              suggestion.priority === "high"
                                ? "bg-red-500/20 text-red-500"
                                : suggestion.priority === "medium"
                                  ? "bg-yellow-500/20 text-yellow-600"
                                  : "bg-blue-500/20 text-blue-500"
                            )}
                          >
                            {suggestion.priority}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{suggestion.description}</p>
                        {suggestion.fromUserName && suggestion.toUserName && (
                          <p className="text-xs mt-1">
                            <span className="text-muted-foreground">Move from</span>{" "}
                            <span className="font-medium">{suggestion.fromUserName}</span>{" "}
                            <span className="text-muted-foreground">to</span>{" "}
                            <span className="font-medium">{suggestion.toUserName}</span>
                          </p>
                        )}
                        <p className="text-xs text-green-500 mt-1">{suggestion.potentialImpact}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        );

      case "distribution":
        return (
          <div className="space-y-4">
            <DistributionChart distribution={data.distribution} />

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
                <p className="text-xs text-muted-foreground">Underutilized</p>
                <p className="text-xl font-bold text-blue-500">{data.distribution.underutilized}</p>
                <p className="text-[10px] text-muted-foreground">&lt; 30% capacity</p>
              </div>
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
                <p className="text-xs text-muted-foreground">Optimal</p>
                <p className="text-xl font-bold text-green-500">{data.distribution.optimal}</p>
                <p className="text-[10px] text-muted-foreground">30-80% capacity</p>
              </div>
              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-center">
                <p className="text-xs text-muted-foreground">Busy</p>
                <p className="text-xl font-bold text-yellow-600">{data.distribution.busy}</p>
                <p className="text-[10px] text-muted-foreground">80-100% capacity</p>
              </div>
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
                <p className="text-xs text-muted-foreground">Overloaded</p>
                <p className="text-xl font-bold text-red-500">{data.distribution.overloaded}</p>
                <p className="text-[10px] text-muted-foreground">&gt; 100% capacity</p>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Workload Balance Score</span>
                <span
                  className={cn(
                    "text-lg font-bold",
                    data.distribution.balanceScore >= 70
                      ? "text-green-500"
                      : data.distribution.balanceScore >= 40
                        ? "text-yellow-500"
                        : "text-red-500"
                  )}
                >
                  {data.distribution.balanceScore}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {data.distribution.balanceScore >= 70
                  ? "Work is well distributed across the team"
                  : data.distribution.balanceScore >= 40
                    ? "Some workload imbalance detected"
                    : "Significant workload imbalance - consider rebalancing"}
              </p>
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

function TeamCapacityMonitorWidgetComponent({
  data,
  isLoading,
  error,
  instance,
  size,
}: WidgetProps<TeamCapacityMonitorData, TeamCapacityMonitorConfig>) {
  const config = instance.config as unknown as TeamCapacityMonitorConfig;
  const [drillDownType, setDrillDownType] = React.useState<DrillDownType>(null);

  // Sample data for when no real data is available
  const sampleData: TeamCapacityMonitorData = {
    summary: {
      totalMembers: 8,
      availableMembers: 3,
      busyMembers: 3,
      overloadedMembers: 1,
      awayMembers: 1,
      averageUtilization: 72,
      totalCapacityHours: 320,
      usedCapacityHours: 230,
      availableCapacityHours: 90,
    },
    members: [
      {
        id: "1",
        name: "Alice Johnson",
        email: "alice@example.com",
        image: null,
        role: "Developer",
        capacity: {
          maxWeeklyHours: 40,
          maxConcurrentTasks: 5,
          maxActiveProjects: 3,
          currentTasks: 6,
          currentProjects: 2,
          currentWeeklyHours: 45,
          currentUtilization: 112,
          status: "overloaded",
          statusNote: "Working on critical deadline",
        },
        assignments: [
          { id: "a1", title: "API Integration", type: "task", priority: "high", status: "in_progress", estimatedHours: 16, dueDate: new Date(Date.now() - 86400000).toISOString(), isOverdue: true },
          { id: "a2", title: "Bug fixes", type: "task", priority: "medium", status: "assigned", estimatedHours: 8, dueDate: null, isOverdue: false },
        ],
      },
      {
        id: "2",
        name: "Bob Smith",
        email: "bob@example.com",
        image: null,
        role: "Designer",
        capacity: {
          maxWeeklyHours: 40,
          maxConcurrentTasks: 5,
          maxActiveProjects: 3,
          currentTasks: 4,
          currentProjects: 2,
          currentWeeklyHours: 35,
          currentUtilization: 87,
          status: "busy",
          statusNote: null,
        },
        assignments: [
          { id: "b1", title: "UI Redesign", type: "project", priority: "high", status: "in_progress", estimatedHours: 20, dueDate: new Date(Date.now() + 604800000).toISOString(), isOverdue: false },
        ],
      },
      {
        id: "3",
        name: "Carol Davis",
        email: "carol@example.com",
        image: null,
        role: "QA Engineer",
        capacity: {
          maxWeeklyHours: 40,
          maxConcurrentTasks: 5,
          maxActiveProjects: 3,
          currentTasks: 1,
          currentProjects: 1,
          currentWeeklyHours: 12,
          currentUtilization: 30,
          status: "available",
          statusNote: null,
        },
        assignments: [
          { id: "c1", title: "Test automation", type: "task", priority: "low", status: "assigned", estimatedHours: 12, dueDate: null, isOverdue: false },
        ],
      },
    ],
    distribution: {
      underutilized: 1,
      optimal: 4,
      busy: 2,
      overloaded: 1,
      balanceScore: 65,
    },
    alerts: [
      {
        id: "alert-1",
        type: "member_overloaded",
        severity: "critical",
        title: "Team Member Overloaded",
        message: "Alice Johnson is at 112% capacity with 6 active tasks",
        userId: "1",
        userName: "Alice Johnson",
        currentValue: 112,
        thresholdValue: 100,
        createdAt: new Date().toISOString(),
        acknowledged: false,
      },
      {
        id: "alert-2",
        type: "deadline_risk",
        severity: "warning",
        title: "Overdue Assignment",
        message: "Alice Johnson has 1 overdue assignment",
        userId: "1",
        userName: "Alice Johnson",
        currentValue: 1,
        createdAt: new Date().toISOString(),
        acknowledged: false,
      },
    ],
    suggestions: [
      {
        id: "sug-1",
        type: "reassign",
        title: "Reassign \"Bug fixes\"",
        description: "Move this task from Alice Johnson to Carol Davis to balance workload",
        priority: "high",
        fromUserId: "1",
        fromUserName: "Alice Johnson",
        toUserId: "3",
        toUserName: "Carol Davis",
        potentialImpact: "Could reduce Alice's load by 8+ hours",
      },
    ],
    trends: [],
    lastRefreshed: new Date().toISOString(),
  };

  const displayData = data ?? sampleData;

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px]">
        <div className="animate-pulse flex flex-col space-y-4 w-full p-4">
          <div className="h-16 bg-muted rounded-lg" />
          <div className="grid grid-cols-3 gap-3">
            <div className="h-12 bg-muted rounded-lg" />
            <div className="h-12 bg-muted rounded-lg" />
            <div className="h-12 bg-muted rounded-lg" />
          </div>
          <div className="h-20 bg-muted rounded-lg" />
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
  const showDistribution = config.showDistribution !== false && !isCompact;
  const showMembers = config.showMembers !== false;

  // Count alerts by severity
  const alertCounts = displayData.alerts.reduce(
    (acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1;
      return acc;
    },
    {} as Record<CapacityAlertSeverity, number>
  );

  return (
    <div className="space-y-4" data-testid="team-capacity-monitor-widget">
      {/* Drill-down Dialog */}
      <DrillDownDialog
        open={drillDownType !== null}
        onClose={() => setDrillDownType(null)}
        type={drillDownType}
        data={displayData}
      />

      {/* Team Summary - Main Hero */}
      <div
        className="text-center pb-4 border-b cursor-pointer hover:bg-muted/30 rounded-lg transition-colors -mx-1 px-1"
        onClick={() => setDrillDownType("summary")}
        data-testid="summary-section"
      >
        <p className="text-sm text-muted-foreground mb-1">Team Utilization</p>
        <div className="flex items-center justify-center gap-2">
          <Activity className="w-6 h-6 text-primary" />
          <span
            className={cn(
              "font-bold",
              isCompact ? "text-2xl" : "text-3xl",
              getUtilizationColor(displayData.summary.averageUtilization)
            )}
          >
            {displayData.summary.averageUtilization.toFixed(0)}%
          </span>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {displayData.summary.totalMembers} members • {displayData.summary.availableCapacityHours}h available
        </p>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-4 gap-2">
        <div className="text-center p-2 rounded-lg bg-green-500/10">
          <UserCheck className="w-4 h-4 mx-auto text-green-500 mb-1" />
          <p className="text-lg font-bold text-green-500">{displayData.summary.availableMembers}</p>
          <p className="text-[10px] text-muted-foreground">Available</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-yellow-500/10">
          <User className="w-4 h-4 mx-auto text-yellow-500 mb-1" />
          <p className="text-lg font-bold text-yellow-600">{displayData.summary.busyMembers}</p>
          <p className="text-[10px] text-muted-foreground">Busy</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-red-500/10">
          <UserX className="w-4 h-4 mx-auto text-red-500 mb-1" />
          <p className="text-lg font-bold text-red-500">{displayData.summary.overloadedMembers}</p>
          <p className="text-[10px] text-muted-foreground">Overloaded</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-gray-500/10">
          <Clock className="w-4 h-4 mx-auto text-gray-500 mb-1" />
          <p className="text-lg font-bold text-gray-500">{displayData.summary.awayMembers}</p>
          <p className="text-[10px] text-muted-foreground">Away</p>
        </div>
      </div>

      {/* Distribution Chart */}
      {showDistribution && (
        <div
          className="p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
          onClick={() => setDrillDownType("distribution")}
          data-testid="distribution-section"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Workload Distribution</span>
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
          </div>
          <DistributionChart distribution={displayData.distribution} />
        </div>
      )}

      {/* Team Members Preview */}
      {showMembers && !isCompact && (
        <div
          className="p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
          onClick={() => setDrillDownType("members")}
          data-testid="members-section"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Team Members</span>
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
          </div>
          <div className="flex items-center gap-1">
            {displayData.members.slice(0, 6).map((member) => (
              <MemberAvatar key={member.id} member={member} size="sm" />
            ))}
            {displayData.members.length > 6 && (
              <span className="text-xs text-muted-foreground ml-1">
                +{displayData.members.length - 6} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Alerts Section */}
      {showAlerts && displayData.alerts.length > 0 && (
        <div
          className="p-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5 cursor-pointer hover:bg-yellow-500/10 transition-colors"
          onClick={() => setDrillDownType("alerts")}
          data-testid="alerts-section"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium">
                {displayData.alerts.length} Alert{displayData.alerts.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex gap-1">
              {alertCounts.critical > 0 && <AlertBadge severity="critical" count={alertCounts.critical} />}
              {alertCounts.warning > 0 && <AlertBadge severity="warning" count={alertCounts.warning} />}
              {alertCounts.info > 0 && <AlertBadge severity="info" count={alertCounts.info} />}
            </div>
          </div>
          {displayData.alerts[0] && (
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {displayData.alerts[0].message}
            </p>
          )}
        </div>
      )}

      {/* Suggestions Section */}
      {showSuggestions && displayData.suggestions.length > 0 && (
        <div
          className="p-3 rounded-lg border border-blue-500/30 bg-blue-500/5 cursor-pointer hover:bg-blue-500/10 transition-colors"
          onClick={() => setDrillDownType("suggestions")}
          data-testid="suggestions-section"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium">
                {displayData.suggestions.length} Suggestion{displayData.suggestions.length !== 1 ? "s" : ""}
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
          {displayData.suggestions[0] && (
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {displayData.suggestions[0].title}
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

export const TeamCapacityMonitorWidgetDefinition: WidgetDefinition<
  TeamCapacityMonitorData,
  TeamCapacityMonitorConfig
> = {
  id: "team-capacity-monitor",
  name: "Team Capacity Monitor",
  description:
    "Monitor team workload, assignment balance, and capacity constraints. Alerts when individuals are overloaded or teams are underutilized.",
  category: "analytics",
  defaultSize: "medium",
  supportedSizes: ["small", "medium", "large", "full"],
  icon: Users,
  dataRequirements: [
    {
      key: "teamCapacity",
      label: "Team Capacity Data",
      description: "Real-time team workload and capacity metrics",
      required: true,
      type: "query",
    },
  ],
  configOptions: [
    {
      key: "showMembers",
      label: "Show Team Members",
      description: "Display team member preview",
      type: "boolean",
      defaultValue: true,
    },
    {
      key: "showAlerts",
      label: "Show Alerts",
      description: "Display capacity alerts",
      type: "boolean",
      defaultValue: true,
    },
    {
      key: "showSuggestions",
      label: "Show Suggestions",
      description: "Display rebalancing suggestions",
      type: "boolean",
      defaultValue: true,
    },
    {
      key: "showDistribution",
      label: "Show Distribution",
      description: "Display workload distribution chart",
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
      key: "overloadThreshold",
      label: "Overload Threshold (%)",
      description: "Utilization percentage considered overloaded",
      type: "number",
      defaultValue: 100,
      validation: { min: 50, max: 150 },
    },
    {
      key: "warningThreshold",
      label: "Warning Threshold (%)",
      description: "Utilization percentage for warning",
      type: "number",
      defaultValue: 85,
      validation: { min: 50, max: 100 },
    },
    {
      key: "underutilizedThreshold",
      label: "Underutilized Threshold (%)",
      description: "Utilization percentage considered underutilized",
      type: "number",
      defaultValue: 30,
      validation: { min: 0, max: 50 },
    },
  ],
  component: TeamCapacityMonitorWidgetComponent,
  defaultConfig: {
    showMembers: true,
    showAlerts: true,
    showSuggestions: true,
    showDistribution: true,
    showTrends: true,
    compactMode: false,
    overloadThreshold: 100,
    warningThreshold: 85,
    underutilizedThreshold: 30,
  },
  supportsRefresh: true,
  minRefreshInterval: 30000, // 30 seconds
};

export default TeamCapacityMonitorWidgetComponent;
