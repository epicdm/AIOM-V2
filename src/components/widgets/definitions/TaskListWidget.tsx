import * as React from "react";
import {
  CheckCircle2,
  Circle,
  Clock,
  ListTodo,
  AlertCircle,
} from "lucide-react";
import { cn } from "~/lib/utils";
import type { WidgetDefinition, WidgetProps } from "../types";

/**
 * Task Item Interface
 */
export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  status: "pending" | "in_progress" | "completed" | "overdue";
  priority: "low" | "medium" | "high";
  dueDate?: Date;
  assignee?: string;
}

/**
 * Task List Widget Data
 */
export interface TaskListData {
  tasks: TaskItem[];
  totalCount: number;
  completedCount: number;
}

/**
 * Task List Widget Config
 */
export interface TaskListConfig {
  showCompleted: boolean;
  maxItems: number;
  groupByPriority: boolean;
  sortBy: "dueDate" | "priority" | "status";
}

/**
 * Status icon mapping
 */
const statusIcons = {
  pending: Circle,
  in_progress: Clock,
  completed: CheckCircle2,
  overdue: AlertCircle,
};

/**
 * Priority color mapping
 */
const priorityColors = {
  low: "text-green-500",
  medium: "text-yellow-500",
  high: "text-red-500",
};

/**
 * Status color mapping
 */
const statusColors = {
  pending: "text-muted-foreground",
  in_progress: "text-blue-500",
  completed: "text-green-500",
  overdue: "text-red-500",
};

/**
 * Task List Widget Component
 */
function TaskListWidgetComponent({
  data,
  isLoading,
  error,
  instance,
}: WidgetProps<TaskListData, TaskListConfig>) {
  const config = instance.config as unknown as TaskListConfig;

  // Sample data for demonstration when no data is provided
  const sampleTasks: TaskItem[] = [
    {
      id: "1",
      title: "Review quarterly report",
      description: "Review and approve Q4 financial report",
      status: "in_progress",
      priority: "high",
      dueDate: new Date(Date.now() + 86400000),
    },
    {
      id: "2",
      title: "Team standup meeting",
      description: "Daily sync with development team",
      status: "pending",
      priority: "medium",
      dueDate: new Date(Date.now() + 3600000),
    },
    {
      id: "3",
      title: "Update project documentation",
      status: "pending",
      priority: "low",
      dueDate: new Date(Date.now() + 172800000),
    },
    {
      id: "4",
      title: "Client presentation",
      status: "overdue",
      priority: "high",
      dueDate: new Date(Date.now() - 86400000),
    },
    {
      id: "5",
      title: "Code review for feature branch",
      status: "completed",
      priority: "medium",
    },
  ];

  const tasks = data?.tasks ?? sampleTasks;
  const filteredTasks = config.showCompleted
    ? tasks
    : tasks.filter((t) => t.status !== "completed");
  const displayTasks = filteredTasks.slice(0, config.maxItems);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px]">
        <div className="animate-pulse flex flex-col space-y-3 w-full p-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-muted rounded-lg" />
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
      {/* Summary Stats */}
      <div className="flex items-center justify-between text-sm text-muted-foreground pb-2 border-b">
        <span>
          {data?.completedCount ?? tasks.filter((t) => t.status === "completed").length} of{" "}
          {data?.totalCount ?? tasks.length} completed
        </span>
        <span className="text-xs">
          {displayTasks.filter((t) => t.status === "overdue").length} overdue
        </span>
      </div>

      {/* Task List */}
      <div className="space-y-2">
        {displayTasks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ListTodo className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>No tasks to display</p>
          </div>
        ) : (
          displayTasks.map((task) => {
            const StatusIcon = statusIcons[task.status];
            return (
              <div
                key={task.id}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg transition-colors",
                  "hover:bg-muted/50 cursor-pointer",
                  task.status === "completed" && "opacity-60"
                )}
              >
                <StatusIcon
                  className={cn("w-5 h-5 mt-0.5", statusColors[task.status])}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "font-medium truncate",
                        task.status === "completed" && "line-through"
                      )}
                    >
                      {task.title}
                    </span>
                    <span
                      className={cn(
                        "text-xs font-medium",
                        priorityColors[task.priority]
                      )}
                    >
                      {task.priority}
                    </span>
                  </div>
                  {task.description && (
                    <p className="text-sm text-muted-foreground truncate mt-0.5">
                      {task.description}
                    </p>
                  )}
                  {task.dueDate && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Due: {new Date(task.dueDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Show more link */}
      {filteredTasks.length > config.maxItems && (
        <div className="text-center pt-2">
          <button className="text-sm text-primary hover:underline">
            View all {filteredTasks.length} tasks
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Task List Widget Definition
 */
export const TaskListWidgetDefinition: WidgetDefinition<
  TaskListData,
  TaskListConfig
> = {
  id: "task-list",
  name: "Task List",
  description:
    "Display and manage your tasks with priority levels and due dates",
  category: "productivity",
  defaultSize: "medium",
  supportedSizes: ["small", "medium", "large"],
  icon: ListTodo,
  dataRequirements: [
    {
      key: "tasks",
      label: "Tasks",
      description: "List of tasks to display",
      required: true,
      type: "query",
    },
  ],
  configOptions: [
    {
      key: "showCompleted",
      label: "Show Completed",
      description: "Display completed tasks in the list",
      type: "boolean",
      defaultValue: false,
    },
    {
      key: "maxItems",
      label: "Maximum Items",
      description: "Maximum number of tasks to display",
      type: "number",
      defaultValue: 5,
      validation: { min: 1, max: 20 },
    },
    {
      key: "groupByPriority",
      label: "Group by Priority",
      description: "Group tasks by their priority level",
      type: "boolean",
      defaultValue: false,
    },
    {
      key: "sortBy",
      label: "Sort By",
      description: "How to sort the tasks",
      type: "select",
      defaultValue: "dueDate",
      options: [
        { label: "Due Date", value: "dueDate" },
        { label: "Priority", value: "priority" },
        { label: "Status", value: "status" },
      ],
    },
  ],
  component: TaskListWidgetComponent,
  defaultConfig: {
    showCompleted: false,
    maxItems: 5,
    groupByPriority: false,
    sortBy: "dueDate",
  },
  supportsRefresh: true,
  minRefreshInterval: 30000,
};
