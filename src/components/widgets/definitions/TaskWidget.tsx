/**
 * TaskWidget - Reusable Task List Widget
 *
 * A comprehensive widget displaying filtered task lists with:
 * - Sorting (by due date, priority, status, or title)
 * - Status indicators (pending, in_progress, completed, overdue)
 * - Due date highlighting (overdue, due today, due soon)
 * - Quick actions (complete, defer, reassign)
 *
 * Designed to be used as a standalone component or as a dashboard widget.
 */

import * as React from "react";
import { useState, useMemo, useCallback } from "react";
import {
  CheckCircle2,
  Circle,
  Clock,
  ListTodo,
  AlertCircle,
  MoreVertical,
  Calendar,
  CalendarClock,
  User,
  ArrowUpDown,
  Filter,
  ChevronDown,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  UserPlus,
  CheckCheck,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "~/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Tooltip } from "~/components/ui/tooltip";
import type { WidgetDefinition, WidgetProps } from "../types";

// =============================================================================
// Types & Interfaces
// =============================================================================

/**
 * Task Status Types
 */
export type TaskStatus = "pending" | "in_progress" | "completed" | "overdue";

/**
 * Task Priority Levels
 */
export type TaskPriority = "low" | "medium" | "high" | "urgent";

/**
 * Sort Options for Tasks
 */
export type TaskSortBy = "dueDate" | "priority" | "status" | "title" | "createdAt";

/**
 * Sort Direction
 */
export type SortDirection = "asc" | "desc";

/**
 * Filter Options for Tasks
 */
export type TaskFilterStatus = "all" | "pending" | "in_progress" | "completed" | "overdue";
export type TaskFilterPriority = "all" | "low" | "medium" | "high" | "urgent";

/**
 * Assignee Information
 */
export interface TaskAssignee {
  id: string;
  name: string;
  avatarUrl?: string;
}

/**
 * Task Item Interface
 */
export interface TaskWidgetItem {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: Date;
  assignee?: TaskAssignee;
  projectId?: string;
  projectName?: string;
  tags?: string[];
  createdAt?: Date;
  completedAt?: Date;
}

/**
 * Task Widget Data
 */
export interface TaskWidgetData {
  tasks: TaskWidgetItem[];
  totalCount: number;
  completedCount: number;
  overdueCount: number;
  availableAssignees?: TaskAssignee[];
}

/**
 * Task Widget Configuration
 */
export interface TaskWidgetConfig {
  showCompleted: boolean;
  maxItems: number;
  sortBy: TaskSortBy;
  sortDirection: SortDirection;
  filterStatus: TaskFilterStatus;
  filterPriority: TaskFilterPriority;
  showFilters: boolean;
  showQuickActions: boolean;
  highlightOverdue: boolean;
  highlightDueSoon: boolean;
  dueSoonDays: number;
  compactMode: boolean;
}

/**
 * Quick Action Handlers
 */
export interface TaskWidgetActions {
  onComplete?: (taskId: string) => Promise<void> | void;
  onDefer?: (taskId: string, newDueDate: Date) => Promise<void> | void;
  onReassign?: (taskId: string, assigneeId: string) => Promise<void> | void;
  onTaskClick?: (task: TaskWidgetItem) => void;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Status icon mapping
 */
const statusIcons: Record<TaskStatus, React.ComponentType<{ className?: string }>> = {
  pending: Circle,
  in_progress: Clock,
  completed: CheckCircle2,
  overdue: AlertCircle,
};

/**
 * Status colors mapping
 */
const statusColors: Record<TaskStatus, string> = {
  pending: "text-muted-foreground",
  in_progress: "text-blue-500",
  completed: "text-green-500",
  overdue: "text-red-500",
};

/**
 * Status badge variants
 */
const statusBadgeStyles: Record<TaskStatus, string> = {
  pending: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  overdue: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

/**
 * Priority colors mapping
 */
const priorityColors: Record<TaskPriority, string> = {
  low: "text-green-500",
  medium: "text-yellow-500",
  high: "text-orange-500",
  urgent: "text-red-500",
};

/**
 * Priority badge styles
 */
const priorityBadgeStyles: Record<TaskPriority, string> = {
  low: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  urgent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 animate-pulse",
};

/**
 * Priority order for sorting (higher number = higher priority)
 */
const priorityOrder: Record<TaskPriority, number> = {
  low: 1,
  medium: 2,
  high: 3,
  urgent: 4,
};

/**
 * Status order for sorting
 */
const statusOrder: Record<TaskStatus, number> = {
  overdue: 1,
  in_progress: 2,
  pending: 3,
  completed: 4,
};

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Calculate days until due date
 */
function getDaysUntilDue(dueDate: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Check if task is overdue
 */
function isTaskOverdue(task: TaskWidgetItem): boolean {
  if (!task.dueDate || task.status === "completed") return false;
  return getDaysUntilDue(task.dueDate) < 0;
}

/**
 * Check if task is due soon (within specified days)
 */
function isTaskDueSoon(task: TaskWidgetItem, days: number): boolean {
  if (!task.dueDate || task.status === "completed" || isTaskOverdue(task)) return false;
  const daysUntil = getDaysUntilDue(task.dueDate);
  return daysUntil >= 0 && daysUntil <= days;
}

/**
 * Format due date for display
 */
function formatDueDate(dueDate: Date): string {
  const days = getDaysUntilDue(dueDate);

  if (days < 0) {
    const absDays = Math.abs(days);
    return absDays === 1 ? "1 day overdue" : `${absDays} days overdue`;
  }
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days <= 7) return `Due in ${days} days`;

  return new Date(dueDate).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/**
 * Get defer date options
 */
function getDeferOptions(): { label: string; date: Date }[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const nextMonth = new Date(today);
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  return [
    { label: "Tomorrow", date: tomorrow },
    { label: "Next week", date: nextWeek },
    { label: "Next month", date: nextMonth },
  ];
}

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * Task Status Badge Component
 */
function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const StatusIcon = statusIcons[status];
  const label = status.replace("_", " ").replace(/^\w/, (c) => c.toUpperCase());

  return (
    <Badge
      variant="outline"
      className={cn(
        "text-xs font-medium border-0 gap-1",
        statusBadgeStyles[status]
      )}
    >
      <StatusIcon className="w-3 h-3" />
      {label}
    </Badge>
  );
}

/**
 * Task Priority Badge Component
 */
function TaskPriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-xs font-medium border-0",
        priorityBadgeStyles[priority]
      )}
    >
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </Badge>
  );
}

/**
 * Due Date Display Component
 */
function DueDateDisplay({
  dueDate,
  status,
  highlightOverdue,
  highlightDueSoon,
  dueSoonDays,
}: {
  dueDate?: Date;
  status: TaskStatus;
  highlightOverdue: boolean;
  highlightDueSoon: boolean;
  dueSoonDays: number;
}) {
  if (!dueDate) return null;

  const isOverdue = status !== "completed" && getDaysUntilDue(dueDate) < 0;
  const isDueToday = getDaysUntilDue(dueDate) === 0;
  const isDueSoon = !isOverdue && getDaysUntilDue(dueDate) <= dueSoonDays;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs",
        isOverdue && highlightOverdue && "text-red-600 dark:text-red-400 font-medium",
        isDueToday && highlightDueSoon && "text-orange-600 dark:text-orange-400 font-medium",
        isDueSoon && !isDueToday && highlightDueSoon && "text-yellow-600 dark:text-yellow-400",
        !isOverdue && !isDueSoon && "text-muted-foreground"
      )}
    >
      {isOverdue ? (
        <AlertTriangle className="w-3 h-3" />
      ) : (
        <Calendar className="w-3 h-3" />
      )}
      {formatDueDate(dueDate)}
    </span>
  );
}

/**
 * Quick Actions Menu Component
 */
function QuickActionsMenu({
  task,
  actions,
  availableAssignees,
  onActionStart,
  onActionEnd,
}: {
  task: TaskWidgetItem;
  actions: TaskWidgetActions;
  availableAssignees?: TaskAssignee[];
  onActionStart?: () => void;
  onActionEnd?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const deferOptions = getDeferOptions();

  const handleComplete = async () => {
    if (!actions.onComplete) return;
    onActionStart?.();
    try {
      await actions.onComplete(task.id);
    } finally {
      onActionEnd?.();
      setIsOpen(false);
    }
  };

  const handleDefer = async (newDueDate: Date) => {
    if (!actions.onDefer) return;
    onActionStart?.();
    try {
      await actions.onDefer(task.id, newDueDate);
    } finally {
      onActionEnd?.();
      setIsOpen(false);
    }
  };

  const handleReassign = async (assigneeId: string) => {
    if (!actions.onReassign) return;
    onActionStart?.();
    try {
      await actions.onReassign(task.id, assigneeId);
    } finally {
      onActionEnd?.();
      setIsOpen(false);
    }
  };

  const hasActions = actions.onComplete || actions.onDefer || actions.onReassign;
  if (!hasActions) return null;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="h-4 w-4" />
          <span className="sr-only">Task actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {actions.onComplete && task.status !== "completed" && (
          <DropdownMenuItem onClick={handleComplete}>
            <CheckCheck className="w-4 h-4 mr-2 text-green-500" />
            Mark as complete
          </DropdownMenuItem>
        )}

        {actions.onDefer && task.status !== "completed" && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <CalendarClock className="w-4 h-4 mr-2 text-blue-500" />
              Defer task
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {deferOptions.map((option) => (
                <DropdownMenuItem
                  key={option.label}
                  onClick={() => handleDefer(option.date)}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}

        {actions.onReassign && availableAssignees && availableAssignees.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <UserPlus className="w-4 h-4 mr-2 text-purple-500" />
                Reassign to
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {availableAssignees
                  .filter((a) => a.id !== task.assignee?.id)
                  .map((assignee) => (
                    <DropdownMenuItem
                      key={assignee.id}
                      onClick={() => handleReassign(assignee.id)}
                    >
                      <User className="w-4 h-4 mr-2" />
                      {assignee.name}
                    </DropdownMenuItem>
                  ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Task List Item Component
 */
function TaskListItem({
  task,
  config,
  actions,
  availableAssignees,
  onActionStart,
  onActionEnd,
}: {
  task: TaskWidgetItem;
  config: TaskWidgetConfig;
  actions: TaskWidgetActions;
  availableAssignees?: TaskAssignee[];
  onActionStart?: () => void;
  onActionEnd?: () => void;
}) {
  const StatusIcon = statusIcons[task.status];
  const isOverdue = isTaskOverdue(task);
  const isDueSoon = isTaskDueSoon(task, config.dueSoonDays);

  // Determine actual status for display (mark as overdue visually)
  const displayStatus = isOverdue ? "overdue" : task.status;

  return (
    <div
      className={cn(
        "group flex items-start gap-3 p-3 rounded-lg transition-all",
        "hover:bg-muted/50 cursor-pointer",
        task.status === "completed" && "opacity-60",
        isOverdue && config.highlightOverdue && "bg-red-50/50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-800/30",
        isDueSoon && !isOverdue && config.highlightDueSoon && "bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30",
        !isOverdue && !isDueSoon && "border border-transparent"
      )}
      onClick={() => actions.onTaskClick?.(task)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          actions.onTaskClick?.(task);
        }
      }}
    >
      {/* Status Icon */}
      <StatusIcon
        className={cn(
          "w-5 h-5 mt-0.5 shrink-0",
          statusColors[displayStatus]
        )}
      />

      {/* Task Content */}
      <div className="flex-1 min-w-0 space-y-1">
        {/* Title and Priority */}
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={cn(
              "font-medium text-sm",
              task.status === "completed" && "line-through text-muted-foreground"
            )}
          >
            {task.title}
          </span>
          {!config.compactMode && <TaskPriorityBadge priority={task.priority} />}
        </div>

        {/* Description (non-compact mode) */}
        {!config.compactMode && task.description && (
          <p className="text-sm text-muted-foreground line-clamp-1">
            {task.description}
          </p>
        )}

        {/* Meta info row */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Due Date */}
          <DueDateDisplay
            dueDate={task.dueDate}
            status={task.status}
            highlightOverdue={config.highlightOverdue}
            highlightDueSoon={config.highlightDueSoon}
            dueSoonDays={config.dueSoonDays}
          />

          {/* Assignee */}
          {!config.compactMode && task.assignee && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <User className="w-3 h-3" />
              {task.assignee.name}
            </span>
          )}

          {/* Project */}
          {!config.compactMode && task.projectName && (
            <span className="text-xs text-muted-foreground">
              {task.projectName}
            </span>
          )}
        </div>
      </div>

      {/* Compact mode: Show status badge */}
      {config.compactMode && (
        <TaskStatusBadge status={displayStatus} />
      )}

      {/* Quick Actions */}
      {config.showQuickActions && (
        <QuickActionsMenu
          task={task}
          actions={actions}
          availableAssignees={availableAssignees}
          onActionStart={onActionStart}
          onActionEnd={onActionEnd}
        />
      )}
    </div>
  );
}

/**
 * Filter Controls Component
 */
function FilterControls({
  config,
  onConfigChange,
}: {
  config: TaskWidgetConfig;
  onConfigChange?: (config: Partial<TaskWidgetConfig>) => void;
}) {
  if (!config.showFilters) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap pb-3 border-b">
      {/* Sort By */}
      <Select
        value={config.sortBy}
        onValueChange={(value) => onConfigChange?.({ sortBy: value as TaskSortBy })}
      >
        <SelectTrigger className="w-[130px] h-8 text-xs">
          <ArrowUpDown className="w-3 h-3 mr-1" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="dueDate">Due Date</SelectItem>
          <SelectItem value="priority">Priority</SelectItem>
          <SelectItem value="status">Status</SelectItem>
          <SelectItem value="title">Title</SelectItem>
          <SelectItem value="createdAt">Created</SelectItem>
        </SelectContent>
      </Select>

      {/* Sort Direction */}
      <Button
        variant="outline"
        size="sm"
        className="h-8 px-2"
        onClick={() =>
          onConfigChange?.({
            sortDirection: config.sortDirection === "asc" ? "desc" : "asc",
          })
        }
      >
        {config.sortDirection === "asc" ? (
          <ArrowUp className="w-3 h-3" />
        ) : (
          <ArrowDown className="w-3 h-3" />
        )}
      </Button>

      {/* Status Filter */}
      <Select
        value={config.filterStatus}
        onValueChange={(value) =>
          onConfigChange?.({ filterStatus: value as TaskFilterStatus })
        }
      >
        <SelectTrigger className="w-[120px] h-8 text-xs">
          <Filter className="w-3 h-3 mr-1" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="in_progress">In Progress</SelectItem>
          <SelectItem value="completed">Completed</SelectItem>
          <SelectItem value="overdue">Overdue</SelectItem>
        </SelectContent>
      </Select>

      {/* Priority Filter */}
      <Select
        value={config.filterPriority}
        onValueChange={(value) =>
          onConfigChange?.({ filterPriority: value as TaskFilterPriority })
        }
      >
        <SelectTrigger className="w-[120px] h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Priority</SelectItem>
          <SelectItem value="urgent">Urgent</SelectItem>
          <SelectItem value="high">High</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="low">Low</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * TaskWidget Component Props (for standalone use)
 */
export interface TaskWidgetProps {
  data?: TaskWidgetData;
  config?: Partial<TaskWidgetConfig>;
  actions?: TaskWidgetActions;
  isLoading?: boolean;
  error?: string | null;
  onConfigChange?: (config: Partial<TaskWidgetConfig>) => void;
  className?: string;
}

/**
 * Default configuration
 */
const defaultConfig: TaskWidgetConfig = {
  showCompleted: false,
  maxItems: 10,
  sortBy: "dueDate",
  sortDirection: "asc",
  filterStatus: "all",
  filterPriority: "all",
  showFilters: true,
  showQuickActions: true,
  highlightOverdue: true,
  highlightDueSoon: true,
  dueSoonDays: 3,
  compactMode: false,
};

/**
 * Sample data for demonstration
 */
const sampleTasks: TaskWidgetItem[] = [
  {
    id: "1",
    title: "Review quarterly report",
    description: "Review and approve Q4 financial report",
    status: "in_progress",
    priority: "high",
    dueDate: new Date(Date.now() + 86400000),
    assignee: { id: "u1", name: "John Doe" },
    projectName: "Finance",
    createdAt: new Date(Date.now() - 86400000 * 3),
  },
  {
    id: "2",
    title: "Team standup meeting",
    description: "Daily sync with development team",
    status: "pending",
    priority: "medium",
    dueDate: new Date(Date.now() + 3600000),
    assignee: { id: "u2", name: "Jane Smith" },
    projectName: "Engineering",
    createdAt: new Date(Date.now() - 86400000 * 2),
  },
  {
    id: "3",
    title: "Update project documentation",
    status: "pending",
    priority: "low",
    dueDate: new Date(Date.now() + 172800000),
    createdAt: new Date(Date.now() - 86400000),
  },
  {
    id: "4",
    title: "Client presentation - URGENT",
    description: "Prepare and deliver Q1 strategy presentation",
    status: "pending",
    priority: "urgent",
    dueDate: new Date(Date.now() - 86400000),
    assignee: { id: "u1", name: "John Doe" },
    projectName: "Sales",
    createdAt: new Date(Date.now() - 86400000 * 5),
  },
  {
    id: "5",
    title: "Code review for feature branch",
    description: "Review PR #123 for new authentication flow",
    status: "completed",
    priority: "medium",
    completedAt: new Date(Date.now() - 86400000 * 2),
    createdAt: new Date(Date.now() - 86400000 * 4),
  },
  {
    id: "6",
    title: "Update security policies",
    status: "in_progress",
    priority: "high",
    dueDate: new Date(Date.now() + 86400000 * 2),
    assignee: { id: "u3", name: "Alice Johnson" },
    projectName: "Security",
    createdAt: new Date(Date.now() - 86400000 * 6),
  },
];

const sampleAssignees: TaskAssignee[] = [
  { id: "u1", name: "John Doe" },
  { id: "u2", name: "Jane Smith" },
  { id: "u3", name: "Alice Johnson" },
  { id: "u4", name: "Bob Williams" },
];

/**
 * TaskWidget - Standalone Component
 *
 * Can be used independently or within the widget system
 */
export function TaskWidget({
  data,
  config: configProp,
  actions = {},
  isLoading,
  error,
  onConfigChange,
  className,
}: TaskWidgetProps) {
  const [isActionPending, setIsActionPending] = useState(false);

  // Merge config with defaults
  const config = useMemo(
    () => ({ ...defaultConfig, ...configProp }),
    [configProp]
  );

  // Use sample data if no data provided
  const tasks = data?.tasks ?? sampleTasks;
  const availableAssignees = data?.availableAssignees ?? sampleAssignees;

  // Filter tasks
  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    // Apply status filter
    if (config.filterStatus !== "all") {
      if (config.filterStatus === "overdue") {
        result = result.filter((t) => isTaskOverdue(t));
      } else {
        result = result.filter((t) => t.status === config.filterStatus);
      }
    }

    // Apply priority filter
    if (config.filterPriority !== "all") {
      result = result.filter((t) => t.priority === config.filterPriority);
    }

    // Filter completed tasks if needed
    if (!config.showCompleted) {
      result = result.filter((t) => t.status !== "completed");
    }

    return result;
  }, [tasks, config.filterStatus, config.filterPriority, config.showCompleted]);

  // Sort tasks
  const sortedTasks = useMemo(() => {
    const result = [...filteredTasks];

    result.sort((a, b) => {
      let comparison = 0;

      switch (config.sortBy) {
        case "dueDate":
          // Tasks without due dates go to the end
          if (!a.dueDate && !b.dueDate) comparison = 0;
          else if (!a.dueDate) comparison = 1;
          else if (!b.dueDate) comparison = -1;
          else comparison = a.dueDate.getTime() - b.dueDate.getTime();
          break;

        case "priority":
          comparison = priorityOrder[b.priority] - priorityOrder[a.priority];
          break;

        case "status":
          comparison = statusOrder[a.status] - statusOrder[b.status];
          break;

        case "title":
          comparison = a.title.localeCompare(b.title);
          break;

        case "createdAt":
          if (!a.createdAt && !b.createdAt) comparison = 0;
          else if (!a.createdAt) comparison = 1;
          else if (!b.createdAt) comparison = -1;
          else comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
      }

      return config.sortDirection === "desc" ? -comparison : comparison;
    });

    return result.slice(0, config.maxItems);
  }, [filteredTasks, config.sortBy, config.sortDirection, config.maxItems]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === "completed").length;
    const overdue = tasks.filter((t) => isTaskOverdue(t)).length;
    return { total, completed, overdue };
  }, [tasks]);

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="animate-pulse flex flex-col space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={cn("flex items-center justify-center py-8 text-destructive", className)}>
        <AlertCircle className="w-5 h-5 mr-2" />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Summary Stats */}
      <div className="flex items-center justify-between text-sm text-muted-foreground pb-2 border-b">
        <span>
          {stats.completed} of {stats.total} completed
        </span>
        {stats.overdue > 0 && (
          <span className="text-xs text-red-500 font-medium flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            {stats.overdue} overdue
          </span>
        )}
      </div>

      {/* Filter Controls */}
      <FilterControls config={config} onConfigChange={onConfigChange} />

      {/* Task List */}
      <div className="space-y-1">
        {sortedTasks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ListTodo className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="font-medium">No tasks to display</p>
            <p className="text-sm">Try adjusting your filters</p>
          </div>
        ) : (
          sortedTasks.map((task) => (
            <TaskListItem
              key={task.id}
              task={task}
              config={config}
              actions={actions}
              availableAssignees={availableAssignees}
              onActionStart={() => setIsActionPending(true)}
              onActionEnd={() => setIsActionPending(false)}
            />
          ))
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

      {/* Action pending overlay */}
      {isActionPending && (
        <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded-lg">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Widget Definition (for Dashboard Widget System)
// =============================================================================

/**
 * Task Widget Component for Widget System
 */
function TaskWidgetDashboardComponent({
  data,
  isLoading,
  error,
  instance,
  onConfigChange,
}: WidgetProps<TaskWidgetData, TaskWidgetConfig>) {
  const config = instance.config as unknown as TaskWidgetConfig;

  // Convert widget system's onConfigChange to our format
  const handleConfigChange = useCallback(
    (newConfig: Partial<TaskWidgetConfig>) => {
      onConfigChange?.(newConfig);
    },
    [onConfigChange]
  );

  return (
    <TaskWidget
      data={data}
      config={config}
      isLoading={isLoading}
      error={error ?? undefined}
      onConfigChange={handleConfigChange}
      actions={{
        onComplete: async (taskId) => {
          console.log("Complete task:", taskId);
          // In a real implementation, this would call the task completion API
        },
        onDefer: async (taskId, newDueDate) => {
          console.log("Defer task:", taskId, "to:", newDueDate);
          // In a real implementation, this would call the task defer API
        },
        onReassign: async (taskId, assigneeId) => {
          console.log("Reassign task:", taskId, "to:", assigneeId);
          // In a real implementation, this would call the task reassign API
        },
        onTaskClick: (task) => {
          console.log("Task clicked:", task);
          // In a real implementation, this would navigate to task details
        },
      }}
    />
  );
}

/**
 * Task Widget Definition for Dashboard Widget System
 */
export const TaskWidgetDefinition: WidgetDefinition<TaskWidgetData, TaskWidgetConfig> = {
  id: "task-widget",
  name: "Task Widget",
  description:
    "Reusable widget displaying filtered task lists with sorting, status indicators, due date highlighting, and quick actions (complete, defer, reassign).",
  category: "productivity",
  defaultSize: "medium",
  supportedSizes: ["small", "medium", "large", "full"],
  icon: ListTodo,
  dataRequirements: [
    {
      key: "tasks",
      label: "Tasks",
      description: "List of tasks to display",
      required: true,
      type: "query",
    },
    {
      key: "availableAssignees",
      label: "Available Assignees",
      description: "List of users that tasks can be reassigned to",
      required: false,
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
      defaultValue: 10,
      validation: { min: 1, max: 50 },
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
        { label: "Title", value: "title" },
        { label: "Created Date", value: "createdAt" },
      ],
    },
    {
      key: "sortDirection",
      label: "Sort Direction",
      description: "Sort ascending or descending",
      type: "select",
      defaultValue: "asc",
      options: [
        { label: "Ascending", value: "asc" },
        { label: "Descending", value: "desc" },
      ],
    },
    {
      key: "filterStatus",
      label: "Status Filter",
      description: "Filter tasks by status",
      type: "select",
      defaultValue: "all",
      options: [
        { label: "All", value: "all" },
        { label: "Pending", value: "pending" },
        { label: "In Progress", value: "in_progress" },
        { label: "Completed", value: "completed" },
        { label: "Overdue", value: "overdue" },
      ],
    },
    {
      key: "filterPriority",
      label: "Priority Filter",
      description: "Filter tasks by priority",
      type: "select",
      defaultValue: "all",
      options: [
        { label: "All", value: "all" },
        { label: "Urgent", value: "urgent" },
        { label: "High", value: "high" },
        { label: "Medium", value: "medium" },
        { label: "Low", value: "low" },
      ],
    },
    {
      key: "showFilters",
      label: "Show Filters",
      description: "Display filter controls in the widget",
      type: "boolean",
      defaultValue: true,
    },
    {
      key: "showQuickActions",
      label: "Show Quick Actions",
      description: "Enable quick action menu on tasks",
      type: "boolean",
      defaultValue: true,
    },
    {
      key: "highlightOverdue",
      label: "Highlight Overdue",
      description: "Visually highlight overdue tasks",
      type: "boolean",
      defaultValue: true,
    },
    {
      key: "highlightDueSoon",
      label: "Highlight Due Soon",
      description: "Visually highlight tasks due soon",
      type: "boolean",
      defaultValue: true,
    },
    {
      key: "dueSoonDays",
      label: "Due Soon Days",
      description: "Number of days to consider as 'due soon'",
      type: "number",
      defaultValue: 3,
      validation: { min: 1, max: 14 },
    },
    {
      key: "compactMode",
      label: "Compact Mode",
      description: "Use a more compact display for tasks",
      type: "boolean",
      defaultValue: false,
    },
  ],
  component: TaskWidgetDashboardComponent,
  defaultConfig: defaultConfig,
  supportsRefresh: true,
  minRefreshInterval: 30000,
};

export default TaskWidget;
