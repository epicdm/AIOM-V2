/**
 * TanStack Query Options for Odoo Task Queries
 *
 * Provides query configurations for fetching task data
 * from Odoo ERP with caching and refetch strategies.
 * Designed for AIOM dashboard consumption.
 */

import { queryOptions } from "@tanstack/react-query";
import {
  queryTasksFn,
  getTaskStatsFn,
  getUserTasksFn,
  getOverdueTasksFn,
  getTasksDueTodayFn,
  getTasksDueThisWeekFn,
  getHighPriorityTasksFn,
  getBlockedTasksFn,
  getProjectTasksDashboardFn,
  getProjectTaskStatsFn,
  getUserTaskStatsFn,
} from "~/fn/tasks";
import type { TaskFilters } from "~/data-access/odoo-tasks";

// =============================================================================
// Task Query Options
// =============================================================================

/**
 * Query options for fetching tasks with comprehensive filters
 */
export const tasksQueryOptions = (filters?: TaskFilters) =>
  queryOptions({
    queryKey: ["odoo-tasks", "query", filters],
    queryFn: () => queryTasksFn({ data: filters }),
    staleTime: 2 * 60 * 1000, // 2 minutes - tasks change frequently
  });

/**
 * Query options for fetching task statistics
 */
export const taskStatsQueryOptions = (options?: {
  projectId?: number | number[];
  assignedUserId?: number | number[];
}) =>
  queryOptions({
    queryKey: ["odoo-tasks", "stats", options],
    queryFn: () => getTaskStatsFn({ data: options }),
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  });

/**
 * Query options for fetching tasks assigned to a user
 */
export const userTasksQueryOptions = (
  userId: number,
  options?: {
    status?: "open" | "closed" | "all";
    priority?: "0" | "1" | "all";
    dueDateFilter?:
      | "overdue"
      | "due_today"
      | "due_this_week"
      | "due_this_month"
      | "no_deadline"
      | "all";
    limit?: number;
    offset?: number;
  }
) =>
  queryOptions({
    queryKey: ["odoo-tasks", "user", userId, options],
    queryFn: () =>
      getUserTasksFn({
        data: {
          userId,
          ...options,
        },
      }),
    staleTime: 2 * 60 * 1000,
  });

/**
 * Query options for fetching overdue tasks
 */
export const overdueTasksQueryOptions = (options?: {
  projectId?: number;
  assignedUserId?: number;
  limit?: number;
  offset?: number;
}) =>
  queryOptions({
    queryKey: ["odoo-tasks", "overdue", options],
    queryFn: () => getOverdueTasksFn({ data: options }),
    staleTime: 2 * 60 * 1000,
  });

/**
 * Query options for fetching tasks due today
 */
export const tasksDueTodayQueryOptions = (options?: {
  projectId?: number;
  assignedUserId?: number;
  limit?: number;
  offset?: number;
}) =>
  queryOptions({
    queryKey: ["odoo-tasks", "due-today", options],
    queryFn: () => getTasksDueTodayFn({ data: options }),
    staleTime: 2 * 60 * 1000,
  });

/**
 * Query options for fetching tasks due this week
 */
export const tasksDueThisWeekQueryOptions = (options?: {
  projectId?: number;
  assignedUserId?: number;
  limit?: number;
  offset?: number;
}) =>
  queryOptions({
    queryKey: ["odoo-tasks", "due-this-week", options],
    queryFn: () => getTasksDueThisWeekFn({ data: options }),
    staleTime: 2 * 60 * 1000,
  });

/**
 * Query options for fetching high priority tasks
 */
export const highPriorityTasksQueryOptions = (options?: {
  projectId?: number;
  assignedUserId?: number;
  limit?: number;
  offset?: number;
}) =>
  queryOptions({
    queryKey: ["odoo-tasks", "high-priority", options],
    queryFn: () => getHighPriorityTasksFn({ data: options }),
    staleTime: 2 * 60 * 1000,
  });

/**
 * Query options for fetching blocked tasks
 */
export const blockedTasksQueryOptions = (options?: {
  projectId?: number;
  assignedUserId?: number;
  limit?: number;
  offset?: number;
}) =>
  queryOptions({
    queryKey: ["odoo-tasks", "blocked", options],
    queryFn: () => getBlockedTasksFn({ data: options }),
    staleTime: 2 * 60 * 1000,
  });

/**
 * Query options for fetching tasks for a specific project
 */
export const projectTasksDashboardQueryOptions = (
  projectId: number,
  options?: {
    status?: "open" | "closed" | "all";
    priority?: "0" | "1" | "all";
    kanbanState?: "normal" | "done" | "blocked" | "all";
    dueDateFilter?:
      | "overdue"
      | "due_today"
      | "due_this_week"
      | "due_this_month"
      | "no_deadline"
      | "all";
    assignedUserId?: number;
    limit?: number;
    offset?: number;
  }
) =>
  queryOptions({
    queryKey: ["odoo-tasks", "project", projectId, options],
    queryFn: () =>
      getProjectTasksDashboardFn({
        data: {
          projectId,
          ...options,
        },
      }),
    staleTime: 2 * 60 * 1000,
  });

/**
 * Query options for fetching task statistics for a specific project
 */
export const projectTaskStatsQueryOptions = (projectId: number) =>
  queryOptions({
    queryKey: ["odoo-tasks", "stats", "project", projectId],
    queryFn: () => getProjectTaskStatsFn({ data: { projectId } }),
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

/**
 * Query options for fetching task statistics for a specific user
 */
export const userTaskStatsQueryOptions = (userId: number) =>
  queryOptions({
    queryKey: ["odoo-tasks", "stats", "user", userId],
    queryFn: () => getUserTaskStatsFn({ data: { userId } }),
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
