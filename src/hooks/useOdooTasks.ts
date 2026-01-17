/**
 * React Hooks for Odoo Task Queries
 *
 * Provides React hooks for fetching and managing Odoo task data
 * using TanStack Query. Designed for AIOM dashboard consumption.
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  tasksQueryOptions,
  taskStatsQueryOptions,
  userTasksQueryOptions,
  overdueTasksQueryOptions,
  tasksDueTodayQueryOptions,
  tasksDueThisWeekQueryOptions,
  highPriorityTasksQueryOptions,
  blockedTasksQueryOptions,
  projectTasksDashboardQueryOptions,
  projectTaskStatsQueryOptions,
  userTaskStatsQueryOptions,
} from "~/queries/tasks";
import type { TaskFilters } from "~/data-access/odoo-tasks";

// =============================================================================
// Task Query Hooks
// =============================================================================

/**
 * Hook for fetching tasks with comprehensive filters
 */
export function useOdooTasks(filters?: TaskFilters, enabled: boolean = true) {
  return useQuery({
    ...tasksQueryOptions(filters),
    enabled,
  });
}

/**
 * Hook for fetching task statistics
 */
export function useTaskStats(
  options?: {
    projectId?: number | number[];
    assignedUserId?: number | number[];
  },
  enabled: boolean = true
) {
  return useQuery({
    ...taskStatsQueryOptions(options),
    enabled,
  });
}

/**
 * Hook for fetching tasks assigned to a specific user
 */
export function useUserTasks(
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
  },
  enabled: boolean = true
) {
  return useQuery({
    ...userTasksQueryOptions(userId, options),
    enabled: enabled && userId > 0,
  });
}

/**
 * Hook for fetching overdue tasks
 */
export function useOverdueTasks(
  options?: {
    projectId?: number;
    assignedUserId?: number;
    limit?: number;
    offset?: number;
  },
  enabled: boolean = true
) {
  return useQuery({
    ...overdueTasksQueryOptions(options),
    enabled,
  });
}

/**
 * Hook for fetching tasks due today
 */
export function useTasksDueToday(
  options?: {
    projectId?: number;
    assignedUserId?: number;
    limit?: number;
    offset?: number;
  },
  enabled: boolean = true
) {
  return useQuery({
    ...tasksDueTodayQueryOptions(options),
    enabled,
  });
}

/**
 * Hook for fetching tasks due this week
 */
export function useTasksDueThisWeek(
  options?: {
    projectId?: number;
    assignedUserId?: number;
    limit?: number;
    offset?: number;
  },
  enabled: boolean = true
) {
  return useQuery({
    ...tasksDueThisWeekQueryOptions(options),
    enabled,
  });
}

/**
 * Hook for fetching high priority tasks
 */
export function useHighPriorityTasks(
  options?: {
    projectId?: number;
    assignedUserId?: number;
    limit?: number;
    offset?: number;
  },
  enabled: boolean = true
) {
  return useQuery({
    ...highPriorityTasksQueryOptions(options),
    enabled,
  });
}

/**
 * Hook for fetching blocked tasks
 */
export function useBlockedTasks(
  options?: {
    projectId?: number;
    assignedUserId?: number;
    limit?: number;
    offset?: number;
  },
  enabled: boolean = true
) {
  return useQuery({
    ...blockedTasksQueryOptions(options),
    enabled,
  });
}

/**
 * Hook for fetching tasks for a specific project
 */
export function useProjectTasksDashboard(
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
  },
  enabled: boolean = true
) {
  return useQuery({
    ...projectTasksDashboardQueryOptions(projectId, options),
    enabled: enabled && projectId > 0,
  });
}

/**
 * Hook for fetching task statistics for a specific project
 */
export function useProjectTaskStats(projectId: number, enabled: boolean = true) {
  return useQuery({
    ...projectTaskStatsQueryOptions(projectId),
    enabled: enabled && projectId > 0,
  });
}

/**
 * Hook for fetching task statistics for a specific user
 */
export function useUserTaskStats(userId: number, enabled: boolean = true) {
  return useQuery({
    ...userTaskStatsQueryOptions(userId),
    enabled: enabled && userId > 0,
  });
}

// =============================================================================
// Combined Dashboard Hooks
// =============================================================================

/**
 * Hook for fetching all task data needed for the main dashboard
 * Returns task statistics, overdue tasks, tasks due today, and high priority tasks
 */
export function useTaskDashboard(enabled: boolean = true) {
  const taskStats = useTaskStats(undefined, enabled);
  const overdueTasks = useOverdueTasks({ limit: 5 }, enabled);
  const tasksDueToday = useTasksDueToday({ limit: 5 }, enabled);
  const tasksDueThisWeek = useTasksDueThisWeek({ limit: 10 }, enabled);
  const highPriorityTasks = useHighPriorityTasks({ limit: 5 }, enabled);
  const blockedTasks = useBlockedTasks({ limit: 5 }, enabled);

  return {
    taskStats,
    overdueTasks,
    tasksDueToday,
    tasksDueThisWeek,
    highPriorityTasks,
    blockedTasks,
    isLoading:
      taskStats.isLoading ||
      overdueTasks.isLoading ||
      tasksDueToday.isLoading ||
      highPriorityTasks.isLoading,
    isError:
      taskStats.isError ||
      overdueTasks.isError ||
      tasksDueToday.isError ||
      highPriorityTasks.isError,
    error:
      taskStats.error ||
      overdueTasks.error ||
      tasksDueToday.error ||
      highPriorityTasks.error,
  };
}

/**
 * Hook for fetching task data for a user's personal dashboard
 */
export function useUserTaskDashboard(userId: number, enabled: boolean = true) {
  const isEnabled = enabled && userId > 0;

  const taskStats = useUserTaskStats(userId, isEnabled);
  const myTasks = useUserTasks(userId, { status: "open", limit: 10 }, isEnabled);
  const overdueTasks = useOverdueTasks({ assignedUserId: userId, limit: 5 }, isEnabled);
  const tasksDueToday = useTasksDueToday({ assignedUserId: userId, limit: 5 }, isEnabled);
  const highPriorityTasks = useHighPriorityTasks({ assignedUserId: userId, limit: 5 }, isEnabled);

  return {
    taskStats,
    myTasks,
    overdueTasks,
    tasksDueToday,
    highPriorityTasks,
    isLoading:
      taskStats.isLoading ||
      myTasks.isLoading ||
      overdueTasks.isLoading ||
      tasksDueToday.isLoading,
    isError:
      taskStats.isError ||
      myTasks.isError ||
      overdueTasks.isError ||
      tasksDueToday.isError,
    error:
      taskStats.error ||
      myTasks.error ||
      overdueTasks.error ||
      tasksDueToday.error,
  };
}

/**
 * Hook for fetching task data for a project dashboard
 */
export function useProjectTaskDashboard(
  projectId: number,
  enabled: boolean = true
) {
  const isEnabled = enabled && projectId > 0;

  const taskStats = useProjectTaskStats(projectId, isEnabled);
  const allTasks = useProjectTasksDashboard(projectId, { limit: 50 }, isEnabled);
  const openTasks = useProjectTasksDashboard(
    projectId,
    { status: "open", limit: 20 },
    isEnabled
  );
  const overdueTasks = useProjectTasksDashboard(
    projectId,
    { dueDateFilter: "overdue", limit: 10 },
    isEnabled
  );
  const blockedTasks = useProjectTasksDashboard(
    projectId,
    { kanbanState: "blocked", limit: 10 },
    isEnabled
  );

  return {
    taskStats,
    allTasks,
    openTasks,
    overdueTasks,
    blockedTasks,
    isLoading:
      taskStats.isLoading ||
      allTasks.isLoading ||
      openTasks.isLoading,
    isError:
      taskStats.isError ||
      allTasks.isError ||
      openTasks.isError,
    error:
      taskStats.error ||
      allTasks.error ||
      openTasks.error,
  };
}

// =============================================================================
// Invalidation Hook
// =============================================================================

/**
 * Hook for invalidating task queries
 * Useful after making changes that affect task data
 */
export function useInvalidateTaskQueries() {
  const queryClient = useQueryClient();

  return {
    /**
     * Invalidate all task queries
     */
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: ["odoo-tasks"] });
    },

    /**
     * Invalidate task list/query queries
     */
    invalidateTasks: () => {
      queryClient.invalidateQueries({ queryKey: ["odoo-tasks", "query"] });
    },

    /**
     * Invalidate task statistics
     */
    invalidateStats: () => {
      queryClient.invalidateQueries({ queryKey: ["odoo-tasks", "stats"] });
    },

    /**
     * Invalidate tasks for a specific user
     */
    invalidateUserTasks: (userId: number) => {
      queryClient.invalidateQueries({
        queryKey: ["odoo-tasks", "user", userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["odoo-tasks", "stats", "user", userId],
      });
    },

    /**
     * Invalidate tasks for a specific project
     */
    invalidateProjectTasks: (projectId: number) => {
      queryClient.invalidateQueries({
        queryKey: ["odoo-tasks", "project", projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["odoo-tasks", "stats", "project", projectId],
      });
    },

    /**
     * Invalidate overdue tasks
     */
    invalidateOverdueTasks: () => {
      queryClient.invalidateQueries({ queryKey: ["odoo-tasks", "overdue"] });
    },

    /**
     * Invalidate tasks due today
     */
    invalidateTasksDueToday: () => {
      queryClient.invalidateQueries({ queryKey: ["odoo-tasks", "due-today"] });
    },

    /**
     * Invalidate tasks due this week
     */
    invalidateTasksDueThisWeek: () => {
      queryClient.invalidateQueries({
        queryKey: ["odoo-tasks", "due-this-week"],
      });
    },

    /**
     * Invalidate high priority tasks
     */
    invalidateHighPriorityTasks: () => {
      queryClient.invalidateQueries({
        queryKey: ["odoo-tasks", "high-priority"],
      });
    },

    /**
     * Invalidate blocked tasks
     */
    invalidateBlockedTasks: () => {
      queryClient.invalidateQueries({ queryKey: ["odoo-tasks", "blocked"] });
    },
  };
}
