/**
 * Odoo Tasks Data Access Layer
 *
 * Service layer for querying Odoo tasks with comprehensive filters
 * for assigned user, due dates, status, and project.
 * Returns normalized task data for display in AIOM dashboards.
 */

import {
  type OdooDomain,
  type SearchReadOptions,
  type ProjectTask,
  type TaskSummary,
  type ResUsers,
} from "~/lib/odoo";
import { getOdooClient } from "./odoo";

// =============================================================================
// Types
// =============================================================================

/**
 * Task status filter options
 */
export type TaskStatus = "open" | "closed" | "all";

/**
 * Task priority filter options
 */
export type TaskPriority = "0" | "1" | "all";

/**
 * Kanban state filter options
 */
export type KanbanState = "normal" | "done" | "blocked" | "all";

/**
 * Due date filter options
 */
export type DueDateFilter =
  | "overdue"
  | "due_today"
  | "due_this_week"
  | "due_this_month"
  | "no_deadline"
  | "all";

/**
 * Comprehensive task filter interface for dashboard queries
 */
export interface TaskFilters {
  /** Filter by assigned user ID(s) */
  assignedUserId?: number | number[];
  /** Filter by project ID(s) */
  projectId?: number | number[];
  /** Filter by milestone ID */
  milestoneId?: number;
  /** Filter by stage ID(s) */
  stageId?: number | number[];
  /** Filter by task status (open/closed/all) */
  status?: TaskStatus;
  /** Filter by priority level */
  priority?: TaskPriority;
  /** Filter by kanban state */
  kanbanState?: KanbanState;
  /** Filter by due date range */
  dueDateFilter?: DueDateFilter;
  /** Custom due date - start (inclusive) */
  dueDateFrom?: string;
  /** Custom due date - end (inclusive) */
  dueDateTo?: string;
  /** Filter by active status */
  active?: boolean;
  /** Search by task name */
  searchQuery?: string;
  /** Include parent tasks only (no subtasks) */
  parentOnly?: boolean;
  /** Pagination - limit */
  limit?: number;
  /** Pagination - offset */
  offset?: number;
  /** Sort order */
  order?: string;
}

/**
 * Extended task summary with additional computed fields for dashboards
 */
export interface DashboardTaskSummary extends TaskSummary {
  /** Days until deadline (negative if overdue) */
  daysUntilDeadline: number | null;
  /** Whether the task is overdue */
  isOverdue: boolean;
  /** Whether the task is due today */
  isDueToday: boolean;
  /** Whether the task is due this week */
  isDueThisWeek: boolean;
  /** Human-readable status */
  statusLabel: string;
  /** Formatted deadline string */
  deadlineFormatted: string | null;
  /** Assigned user names (resolved from user_ids) */
  assigneeNames: string[];
}

/**
 * Task statistics for dashboard widgets
 */
export interface TaskStats {
  totalTasks: number;
  openTasks: number;
  closedTasks: number;
  overdueTasks: number;
  dueToday: number;
  dueThisWeek: number;
  highPriority: number;
  blockedTasks: number;
  unassignedTasks: number;
  averageProgress: number;
}

/**
 * Task query result with pagination metadata
 */
export interface TaskQueryResult {
  tasks: DashboardTaskSummary[];
  totalCount: number;
  hasMore: boolean;
  filters: TaskFilters;
}

// =============================================================================
// Constants
// =============================================================================

const TASK_FIELDS = [
  "id",
  "name",
  "active",
  "project_id",
  "partner_id",
  "user_ids",
  "date_deadline",
  "date_assign",
  "date_end",
  "priority",
  "sequence",
  "stage_id",
  "tag_ids",
  "kanban_state",
  "description",
  "parent_id",
  "child_ids",
  "milestone_id",
  "planned_hours",
  "effective_hours",
  "remaining_hours",
  "progress",
  "subtask_count",
  "create_date",
  "write_date",
];

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Gets today's date in ISO format (YYYY-MM-DD)
 */
function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Gets the end of current week (Sunday) in ISO format
 */
function getEndOfWeek(): string {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + daysUntilSunday);
  return endOfWeek.toISOString().split("T")[0];
}

/**
 * Gets the end of current month in ISO format
 */
function getEndOfMonth(): string {
  const today = new Date();
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return endOfMonth.toISOString().split("T")[0];
}

/**
 * Calculates days until deadline
 */
function calculateDaysUntilDeadline(deadline: string | null): number | null {
  if (!deadline) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadlineDate = new Date(deadline);
  deadlineDate.setHours(0, 0, 0, 0);
  const diffTime = deadlineDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Formats deadline for display
 */
function formatDeadline(deadline: string | null): string | null {
  if (!deadline) return null;
  const date = new Date(deadline);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Gets human-readable status label
 */
function getStatusLabel(
  dateEnd: string | false | undefined,
  kanbanState: string
): string {
  if (dateEnd) return "Completed";
  switch (kanbanState) {
    case "done":
      return "Ready";
    case "blocked":
      return "Blocked";
    default:
      return "In Progress";
  }
}

// =============================================================================
// Core Query Functions
// =============================================================================

/**
 * Builds Odoo domain from task filters
 */
export function buildTaskDomain(filters: TaskFilters): OdooDomain {
  const domain: OdooDomain = [];
  const today = getToday();

  // Active filter (default: true)
  if (filters.active !== undefined) {
    domain.push(["active", "=", filters.active]);
  } else {
    domain.push(["active", "=", true]);
  }

  // Assigned user filter
  if (filters.assignedUserId !== undefined) {
    if (Array.isArray(filters.assignedUserId)) {
      domain.push(["user_ids", "in", filters.assignedUserId]);
    } else {
      domain.push(["user_ids", "in", [filters.assignedUserId]]);
    }
  }

  // Project filter
  if (filters.projectId !== undefined) {
    if (Array.isArray(filters.projectId)) {
      domain.push(["project_id", "in", filters.projectId]);
    } else {
      domain.push(["project_id", "=", filters.projectId]);
    }
  }

  // Milestone filter
  if (filters.milestoneId !== undefined) {
    domain.push(["milestone_id", "=", filters.milestoneId]);
  }

  // Stage filter
  if (filters.stageId !== undefined) {
    if (Array.isArray(filters.stageId)) {
      domain.push(["stage_id", "in", filters.stageId]);
    } else {
      domain.push(["stage_id", "=", filters.stageId]);
    }
  }

  // Status filter (open/closed)
  if (filters.status === "open") {
    domain.push(["date_end", "=", false]);
  } else if (filters.status === "closed") {
    domain.push(["date_end", "!=", false]);
  }

  // Priority filter
  if (filters.priority && filters.priority !== "all") {
    domain.push(["priority", "=", filters.priority]);
  }

  // Kanban state filter
  if (filters.kanbanState && filters.kanbanState !== "all") {
    domain.push(["kanban_state", "=", filters.kanbanState]);
  }

  // Due date filter
  if (filters.dueDateFilter && filters.dueDateFilter !== "all") {
    switch (filters.dueDateFilter) {
      case "overdue":
        domain.push(["date_deadline", "<", today]);
        domain.push(["date_end", "=", false]); // Only open tasks
        break;
      case "due_today":
        domain.push(["date_deadline", "=", today]);
        break;
      case "due_this_week":
        domain.push(["date_deadline", ">=", today]);
        domain.push(["date_deadline", "<=", getEndOfWeek()]);
        break;
      case "due_this_month":
        domain.push(["date_deadline", ">=", today]);
        domain.push(["date_deadline", "<=", getEndOfMonth()]);
        break;
      case "no_deadline":
        domain.push(["date_deadline", "=", false]);
        break;
    }
  }

  // Custom date range
  if (filters.dueDateFrom) {
    domain.push(["date_deadline", ">=", filters.dueDateFrom]);
  }
  if (filters.dueDateTo) {
    domain.push(["date_deadline", "<=", filters.dueDateTo]);
  }

  // Search query
  if (filters.searchQuery) {
    domain.push(["name", "ilike", filters.searchQuery]);
  }

  // Parent tasks only (exclude subtasks)
  if (filters.parentOnly) {
    domain.push(["parent_id", "=", false]);
  }

  return domain;
}

/**
 * Queries tasks from Odoo with comprehensive filters
 */
export async function queryTasks(
  filters: TaskFilters = {}
): Promise<ProjectTask[]> {
  const client = await getOdooClient();
  const domain = buildTaskDomain(filters);

  return client.searchRead<ProjectTask>("project.task", domain, {
    fields: TASK_FIELDS,
    order: filters.order || "priority desc, date_deadline asc, sequence, name",
    limit: filters.limit || 50,
    offset: filters.offset || 0,
  });
}

/**
 * Counts tasks matching the filters
 */
export async function countFilteredTasks(
  filters: TaskFilters = {}
): Promise<number> {
  const client = await getOdooClient();
  const domain = buildTaskDomain(filters);
  return client.searchCount("project.task", domain);
}

// =============================================================================
// User Name Resolution
// =============================================================================

// Cache for user names to avoid repeated lookups
const userNameCache = new Map<number, string>();

/**
 * Resolves user IDs to user names
 */
export async function resolveUserNames(
  userIds: number[]
): Promise<Map<number, string>> {
  if (userIds.length === 0) return new Map();

  // Filter out cached IDs
  const uncachedIds = userIds.filter((id) => !userNameCache.has(id));

  if (uncachedIds.length > 0) {
    const client = await getOdooClient();
    const users = await client.read<ResUsers>("res.users", uncachedIds, {
      fields: ["id", "name"],
    });

    for (const user of users) {
      userNameCache.set(user.id, user.name);
    }
  }

  // Return cached names for requested IDs
  const result = new Map<number, string>();
  for (const id of userIds) {
    const name = userNameCache.get(id);
    if (name) {
      result.set(id, name);
    }
  }

  return result;
}

// =============================================================================
// Task Transformation
// =============================================================================

/**
 * Converts a ProjectTask to a DashboardTaskSummary
 */
export function toDashboardTaskSummary(
  task: ProjectTask,
  userNames: Map<number, string>
): DashboardTaskSummary {
  const today = getToday();
  const deadline =
    typeof task.date_deadline === "string" ? task.date_deadline : null;
  const daysUntilDeadline = calculateDaysUntilDeadline(deadline);
  const isOverdue = daysUntilDeadline !== null && daysUntilDeadline < 0 && !task.date_end;
  const isDueToday = deadline === today;
  const endOfWeek = getEndOfWeek();
  const isDueThisWeek =
    deadline !== null && deadline >= today && deadline <= endOfWeek;

  // Resolve assignee names
  const assigneeNames: string[] = [];
  if (task.user_ids && Array.isArray(task.user_ids)) {
    for (const userId of task.user_ids) {
      const name = userNames.get(userId);
      if (name) {
        assigneeNames.push(name);
      }
    }
  }

  return {
    // Base TaskSummary fields
    id: task.id,
    name: task.name,
    projectId: Array.isArray(task.project_id) ? task.project_id[0] : null,
    projectName: Array.isArray(task.project_id) ? task.project_id[1] : null,
    assigneeIds: task.user_ids ?? [],
    deadline,
    priority: task.priority ?? "0",
    stageId: Array.isArray(task.stage_id) ? task.stage_id[0] : null,
    stageName: Array.isArray(task.stage_id) ? task.stage_id[1] : null,
    milestoneId: Array.isArray(task.milestone_id) ? task.milestone_id[0] : null,
    milestoneName: Array.isArray(task.milestone_id)
      ? task.milestone_id[1]
      : null,
    kanbanState: task.kanban_state ?? "normal",
    plannedHours: task.planned_hours ?? 0,
    effectiveHours: task.effective_hours ?? 0,
    progress: task.progress ?? 0,

    // Extended dashboard fields
    daysUntilDeadline,
    isOverdue,
    isDueToday,
    isDueThisWeek,
    statusLabel: getStatusLabel(task.date_end, task.kanban_state ?? "normal"),
    deadlineFormatted: formatDeadline(deadline),
    assigneeNames,
  };
}

// =============================================================================
// Main Query Functions for Dashboards
// =============================================================================

/**
 * Queries tasks with filters and returns normalized dashboard data
 */
export async function getTasksWithFilters(
  filters: TaskFilters = {}
): Promise<TaskQueryResult> {
  // Query tasks and count in parallel
  const [tasks, totalCount] = await Promise.all([
    queryTasks(filters),
    countFilteredTasks(filters),
  ]);

  // Collect all user IDs for name resolution
  const allUserIds = new Set<number>();
  for (const task of tasks) {
    if (task.user_ids && Array.isArray(task.user_ids)) {
      for (const userId of task.user_ids) {
        allUserIds.add(userId);
      }
    }
  }

  // Resolve user names
  const userNames = await resolveUserNames(Array.from(allUserIds));

  // Transform to dashboard summaries
  const dashboardTasks = tasks.map((task) =>
    toDashboardTaskSummary(task, userNames)
  );

  const limit = filters.limit || 50;
  const offset = filters.offset || 0;

  return {
    tasks: dashboardTasks,
    totalCount,
    hasMore: offset + tasks.length < totalCount,
    filters,
  };
}

/**
 * Gets task statistics for dashboard widgets
 */
export async function getTaskStatistics(
  filters: Omit<TaskFilters, "dueDateFilter" | "status" | "kanbanState"> = {}
): Promise<TaskStats> {
  const today = getToday();
  const endOfWeek = getEndOfWeek();

  // Build base domain without status/date filters
  const baseDomain: OdooDomain = [["active", "=", true]];

  if (filters.projectId !== undefined) {
    if (Array.isArray(filters.projectId)) {
      baseDomain.push(["project_id", "in", filters.projectId]);
    } else {
      baseDomain.push(["project_id", "=", filters.projectId]);
    }
  }

  if (filters.assignedUserId !== undefined) {
    if (Array.isArray(filters.assignedUserId)) {
      baseDomain.push(["user_ids", "in", filters.assignedUserId]);
    } else {
      baseDomain.push(["user_ids", "in", [filters.assignedUserId]]);
    }
  }

  const client = await getOdooClient();

  // Run all count queries in parallel
  const [
    totalTasks,
    openTasks,
    closedTasks,
    overdueTasks,
    dueToday,
    dueThisWeek,
    highPriority,
    blockedTasks,
    unassignedTasks,
    tasksWithProgress,
  ] = await Promise.all([
    // Total tasks
    client.searchCount("project.task", baseDomain),

    // Open tasks
    client.searchCount("project.task", [...baseDomain, ["date_end", "=", false]]),

    // Closed tasks
    client.searchCount("project.task", [
      ...baseDomain,
      ["date_end", "!=", false],
    ]),

    // Overdue tasks
    client.searchCount("project.task", [
      ...baseDomain,
      ["date_deadline", "<", today],
      ["date_end", "=", false],
    ]),

    // Due today
    client.searchCount("project.task", [
      ...baseDomain,
      ["date_deadline", "=", today],
      ["date_end", "=", false],
    ]),

    // Due this week
    client.searchCount("project.task", [
      ...baseDomain,
      ["date_deadline", ">=", today],
      ["date_deadline", "<=", endOfWeek],
      ["date_end", "=", false],
    ]),

    // High priority
    client.searchCount("project.task", [
      ...baseDomain,
      ["priority", "=", "1"],
      ["date_end", "=", false],
    ]),

    // Blocked tasks
    client.searchCount("project.task", [
      ...baseDomain,
      ["kanban_state", "=", "blocked"],
      ["date_end", "=", false],
    ]),

    // Unassigned tasks
    client.searchCount("project.task", [
      ...baseDomain,
      ["user_ids", "=", false],
      ["date_end", "=", false],
    ]),

    // Get tasks with progress for average calculation
    client.searchRead<ProjectTask>("project.task", baseDomain, {
      fields: ["progress"],
      limit: 1000,
    }),
  ]);

  // Calculate average progress
  const progressValues = tasksWithProgress
    .map((t) => t.progress ?? 0)
    .filter((p) => p > 0);
  const averageProgress =
    progressValues.length > 0
      ? Math.round(
          progressValues.reduce((a, b) => a + b, 0) / progressValues.length
        )
      : 0;

  return {
    totalTasks,
    openTasks,
    closedTasks,
    overdueTasks,
    dueToday,
    dueThisWeek,
    highPriority,
    blockedTasks,
    unassignedTasks,
    averageProgress,
  };
}

/**
 * Gets tasks assigned to a specific user with dashboard formatting
 */
export async function getUserTasks(
  userId: number,
  options: Omit<TaskFilters, "assignedUserId"> = {}
): Promise<TaskQueryResult> {
  return getTasksWithFilters({
    ...options,
    assignedUserId: userId,
  });
}

/**
 * Gets overdue tasks with dashboard formatting
 */
export async function getOverdueTasksForDashboard(
  options: Omit<TaskFilters, "dueDateFilter" | "status"> = {}
): Promise<TaskQueryResult> {
  return getTasksWithFilters({
    ...options,
    dueDateFilter: "overdue",
    status: "open",
  });
}

/**
 * Gets tasks due today with dashboard formatting
 */
export async function getTasksDueToday(
  options: Omit<TaskFilters, "dueDateFilter"> = {}
): Promise<TaskQueryResult> {
  return getTasksWithFilters({
    ...options,
    dueDateFilter: "due_today",
    status: "open",
  });
}

/**
 * Gets tasks due this week with dashboard formatting
 */
export async function getTasksDueThisWeek(
  options: Omit<TaskFilters, "dueDateFilter"> = {}
): Promise<TaskQueryResult> {
  return getTasksWithFilters({
    ...options,
    dueDateFilter: "due_this_week",
    status: "open",
  });
}

/**
 * Gets high priority tasks with dashboard formatting
 */
export async function getHighPriorityTasks(
  options: Omit<TaskFilters, "priority"> = {}
): Promise<TaskQueryResult> {
  return getTasksWithFilters({
    ...options,
    priority: "1",
    status: "open",
  });
}

/**
 * Gets blocked tasks with dashboard formatting
 */
export async function getBlockedTasks(
  options: Omit<TaskFilters, "kanbanState"> = {}
): Promise<TaskQueryResult> {
  return getTasksWithFilters({
    ...options,
    kanbanState: "blocked",
    status: "open",
  });
}

/**
 * Gets tasks for a specific project with dashboard formatting
 */
export async function getProjectTasksForDashboard(
  projectId: number,
  options: Omit<TaskFilters, "projectId"> = {}
): Promise<TaskQueryResult> {
  return getTasksWithFilters({
    ...options,
    projectId,
  });
}
