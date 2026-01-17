import * as React from "react";
import {
  GitBranch,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import { cn } from "~/lib/utils";
import type { WidgetDefinition, WidgetProps } from "../types";

/**
 * Workflow Item Interface
 */
export interface WorkflowItem {
  id: string;
  name: string;
  type: string;
  status: "running" | "completed" | "failed" | "paused";
  progress?: number;
  currentStep?: string;
  startedAt: Date;
  completedAt?: Date;
  duration?: string;
  error?: string;
}

/**
 * Workflow Monitor Widget Data
 */
export interface WorkflowMonitorData {
  workflows: WorkflowItem[];
  stats: {
    active: number;
    completed: number;
    failed: number;
    averageTime: string;
    successRate: number;
  };
}

/**
 * Workflow Monitor Widget Config
 */
export interface WorkflowMonitorConfig {
  maxItems: number;
  showCompletedWorkflows: boolean;
  showProgress: boolean;
  showStats: boolean;
}

/**
 * Status configuration mapping
 */
const statusConfig = {
  running: {
    icon: Play,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    label: "Running",
  },
  completed: {
    icon: CheckCircle2,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    label: "Completed",
  },
  failed: {
    icon: XCircle,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    label: "Failed",
  },
  paused: {
    icon: Clock,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
    label: "Paused",
  },
};

/**
 * Workflow Monitor Widget Component
 */
function WorkflowMonitorWidgetComponent({
  data,
  isLoading,
  error,
  instance,
  onRefresh,
  size,
}: WidgetProps<WorkflowMonitorData, WorkflowMonitorConfig>) {
  const config = instance.config as unknown as WorkflowMonitorConfig;

  // Sample data for demonstration
  const sampleWorkflows: WorkflowItem[] = [
    {
      id: "1",
      name: "Expense Approval Flow",
      type: "expense",
      status: "running",
      progress: 75,
      currentStep: "Manager Review",
      startedAt: new Date(Date.now() - 3600000),
    },
    {
      id: "2",
      name: "Document Processing",
      type: "document",
      status: "running",
      progress: 40,
      currentStep: "OCR Extraction",
      startedAt: new Date(Date.now() - 1800000),
    },
    {
      id: "3",
      name: "User Onboarding",
      type: "onboarding",
      status: "completed",
      startedAt: new Date(Date.now() - 7200000),
      completedAt: new Date(Date.now() - 3600000),
      duration: "1h 15m",
    },
    {
      id: "4",
      name: "Invoice Processing",
      type: "invoice",
      status: "failed",
      startedAt: new Date(Date.now() - 5400000),
      error: "Validation failed",
    },
    {
      id: "5",
      name: "Report Generation",
      type: "report",
      status: "paused",
      progress: 50,
      currentStep: "Data Aggregation",
      startedAt: new Date(Date.now() - 4500000),
    },
  ];

  const sampleStats = {
    active: 15,
    completed: 245,
    failed: 3,
    averageTime: "2.5h",
    successRate: 98.8,
  };

  const workflows = data?.workflows ?? sampleWorkflows;
  const stats = data?.stats ?? sampleStats;

  // Filter workflows based on config
  let filteredWorkflows = config.showCompletedWorkflows
    ? workflows
    : workflows.filter((w) => w.status !== "completed");

  filteredWorkflows = filteredWorkflows.slice(0, config.maxItems);

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
        <AlertTriangle className="w-5 h-5 mr-2" />
        <span>{error}</span>
      </div>
    );
  }

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const isCompact = size === "small";

  return (
    <div className="space-y-4">
      {/* Stats Summary */}
      {config.showStats && (
        <div className={cn("grid gap-3", isCompact ? "grid-cols-2" : "grid-cols-4")}>
          <div className="p-3 rounded-lg bg-blue-500/10 text-center">
            <div className="text-xl font-bold text-blue-500">{stats.active}</div>
            <div className="text-xs text-muted-foreground">Active</div>
          </div>
          <div className="p-3 rounded-lg bg-green-500/10 text-center">
            <div className="text-xl font-bold text-green-500">{stats.completed}</div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </div>
          {!isCompact && (
            <>
              <div className="p-3 rounded-lg bg-red-500/10 text-center">
                <div className="text-xl font-bold text-red-500">{stats.failed}</div>
                <div className="text-xs text-muted-foreground">Failed</div>
              </div>
              <div className="p-3 rounded-lg bg-primary/10 text-center">
                <div className="text-xl font-bold">{stats.averageTime}</div>
                <div className="text-xs text-muted-foreground">Avg Time</div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Success Rate */}
      {config.showStats && !isCompact && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Success Rate</span>
          <div className="flex items-center gap-2">
            <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full"
                style={{ width: `${stats.successRate}%` }}
              />
            </div>
            <span className="font-medium text-green-500">{stats.successRate}%</span>
          </div>
        </div>
      )}

      {/* Workflow List */}
      <div className="space-y-2">
        {filteredWorkflows.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <GitBranch className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>No active workflows</p>
          </div>
        ) : (
          filteredWorkflows.map((workflow) => {
            const statusInfo = statusConfig[workflow.status];
            const StatusIcon = statusInfo.icon;

            return (
              <div
                key={workflow.id}
                className={cn(
                  "p-3 rounded-lg transition-colors hover:bg-muted/50",
                  workflow.status === "failed" && "border-l-2 border-l-red-500"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn("p-2 rounded-lg", statusInfo.bgColor)}>
                    <StatusIcon
                      className={cn(
                        "w-4 h-4",
                        statusInfo.color,
                        workflow.status === "running" && "animate-pulse"
                      )}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm truncate">{workflow.name}</span>
                      <span className={cn("text-xs font-medium", statusInfo.color)}>
                        {statusInfo.label}
                      </span>
                    </div>

                    {/* Current Step */}
                    {workflow.currentStep && workflow.status === "running" && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <ArrowRight className="w-3 h-3" />
                        <span>{workflow.currentStep}</span>
                      </div>
                    )}

                    {/* Progress */}
                    {config.showProgress && workflow.progress !== undefined && workflow.status === "running" && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="text-blue-500">{workflow.progress}%</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 transition-all"
                            style={{ width: `${workflow.progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Duration / Error */}
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-muted-foreground">
                        Started {formatTimeAgo(workflow.startedAt)}
                      </span>
                      {workflow.duration && (
                        <span className="text-xs text-muted-foreground">
                          Duration: {workflow.duration}
                        </span>
                      )}
                    </div>

                    {workflow.error && (
                      <p className="text-xs text-red-500 mt-1">{workflow.error}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t">
        <button className="text-sm text-primary hover:underline">
          View all workflows
        </button>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            Refresh
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Workflow Monitor Widget Definition
 */
export const WorkflowMonitorWidgetDefinition: WidgetDefinition<
  WorkflowMonitorData,
  WorkflowMonitorConfig
> = {
  id: "workflow-monitor",
  name: "Workflow Monitor",
  description: "Monitor active workflows, their progress, and completion status",
  category: "system",
  defaultSize: "medium",
  supportedSizes: ["small", "medium", "large"],
  icon: GitBranch,
  dataRequirements: [
    {
      key: "workflows",
      label: "Workflow Data",
      description: "Active and recent workflow executions",
      required: true,
      type: "realtime",
    },
  ],
  configOptions: [
    {
      key: "maxItems",
      label: "Maximum Items",
      description: "Maximum number of workflows to display",
      type: "number",
      defaultValue: 5,
      validation: { min: 1, max: 20 },
    },
    {
      key: "showCompletedWorkflows",
      label: "Show Completed",
      description: "Include completed workflows in the list",
      type: "boolean",
      defaultValue: false,
    },
    {
      key: "showProgress",
      label: "Show Progress",
      description: "Display workflow progress bars",
      type: "boolean",
      defaultValue: true,
    },
    {
      key: "showStats",
      label: "Show Stats",
      description: "Display workflow statistics summary",
      type: "boolean",
      defaultValue: true,
    },
  ],
  component: WorkflowMonitorWidgetComponent,
  defaultConfig: {
    maxItems: 5,
    showCompletedWorkflows: false,
    showProgress: true,
    showStats: true,
  },
  supportsRefresh: true,
  minRefreshInterval: 15000,
};
