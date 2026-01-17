import * as React from "react";
import {
  CheckCircle2,
  Circle,
  Clock,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import type { CallTask } from "~/db/schema";
import type { TaskPriority, TaskStatus } from "~/fn/call-dispositions";

interface TaskListProps {
  tasks: CallTask[];
  onCompleteTask?: (taskId: string) => void;
  onDeleteTask?: (taskId: string) => void;
  isLoading?: boolean;
  emptyMessage?: string;
}

const priorityConfig: Record<
  TaskPriority,
  { label: string; color: string; icon?: React.ReactNode }
> = {
  low: {
    label: "Low",
    color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  },
  medium: {
    label: "Medium",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400",
  },
  high: {
    label: "High",
    color: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400",
  },
  urgent: {
    label: "Urgent",
    color: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400",
    icon: <AlertCircle className="h-3 w-3" />,
  },
};

const statusConfig: Record<
  TaskStatus,
  { label: string; icon: React.ReactNode; color: string }
> = {
  pending: {
    label: "Pending",
    icon: <Circle className="h-4 w-4" />,
    color: "text-gray-500",
  },
  in_progress: {
    label: "In Progress",
    icon: <Clock className="h-4 w-4" />,
    color: "text-blue-500",
  },
  completed: {
    label: "Completed",
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: "text-green-500",
  },
  cancelled: {
    label: "Cancelled",
    icon: <Circle className="h-4 w-4" />,
    color: "text-gray-400 line-through",
  },
};

function formatDueDate(date: Date | null): string {
  if (!date) return "";

  const now = new Date();
  const dueDate = new Date(date);
  const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? "s" : ""}`;
  } else if (diffDays === 0) {
    return "Due today";
  } else if (diffDays === 1) {
    return "Due tomorrow";
  } else if (diffDays <= 7) {
    return `Due in ${diffDays} days`;
  } else {
    return dueDate.toLocaleDateString();
  }
}

export function TaskList({
  tasks,
  onCompleteTask,
  onDeleteTask,
  isLoading = false,
  emptyMessage = "No tasks created yet",
}: TaskListProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Tasks ({tasks.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {tasks.map((task) => {
            const priority = priorityConfig[task.priority as TaskPriority] || priorityConfig.medium;
            const status = statusConfig[task.status as TaskStatus] || statusConfig.pending;
            const isCompleted = task.status === "completed" || task.status === "cancelled";
            const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !isCompleted;

            return (
              <div
                key={task.id}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                  isCompleted
                    ? "bg-gray-50 dark:bg-gray-900/50 opacity-60"
                    : isOverdue
                      ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
                      : "hover:bg-gray-50 dark:hover:bg-gray-900/50"
                )}
              >
                {/* Complete Button */}
                <button
                  type="button"
                  onClick={() => !isCompleted && onCompleteTask?.(task.id)}
                  disabled={isCompleted}
                  className={cn(
                    "mt-0.5 flex-shrink-0 transition-colors",
                    status.color,
                    !isCompleted && "hover:text-green-500 cursor-pointer"
                  )}
                >
                  {status.icon}
                </button>

                {/* Task Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4
                      className={cn(
                        "font-medium text-sm",
                        isCompleted && "line-through text-muted-foreground"
                      )}
                    >
                      {task.title}
                    </h4>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge
                        variant="secondary"
                        className={cn("text-xs", priority.color)}
                      >
                        {priority.icon}
                        {priority.label}
                      </Badge>
                      {onDeleteTask && !isCompleted && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => onDeleteTask(task.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {task.description && (
                    <p
                      className={cn(
                        "text-sm text-muted-foreground mt-1",
                        isCompleted && "line-through"
                      )}
                    >
                      {task.description}
                    </p>
                  )}

                  {task.dueDate && (
                    <div
                      className={cn(
                        "flex items-center gap-1 mt-2 text-xs",
                        isOverdue
                          ? "text-red-600 dark:text-red-400"
                          : "text-muted-foreground"
                      )}
                    >
                      <Clock className="h-3 w-3" />
                      {formatDueDate(task.dueDate)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
