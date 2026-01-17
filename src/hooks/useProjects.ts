/**
 * React Hooks for Project Data
 *
 * Provides React hooks for fetching and managing project data
 * from Odoo ERP using TanStack Query.
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  projectsQueryOptions,
  activeProjectsQueryOptions,
  projectByIdQueryOptions,
  projectsByUserQueryOptions,
  projectsByPartnerQueryOptions,
  favoriteProjectsQueryOptions,
  projectSummariesQueryOptions,
  projectCountQueryOptions,
  projectMilestonesQueryOptions,
  milestoneByIdQueryOptions,
  upcomingMilestonesQueryOptions,
  overdueMilestonesQueryOptions,
  milestoneSummariesQueryOptions,
  projectTasksQueryOptions,
  taskByIdQueryOptions,
  tasksByUserQueryOptions,
  overdueTasksQueryOptions,
  milestoneTasksQueryOptions,
  taskSummariesQueryOptions,
  projectTeamMembersQueryOptions,
  projectStatsQueryOptions,
} from "~/queries/projects";

// =============================================================================
// Project Hooks
// =============================================================================

/**
 * Hook for fetching all projects
 */
export function useProjects(
  options?: {
    active?: boolean;
    limit?: number;
    offset?: number;
  },
  enabled: boolean = true
) {
  return useQuery({
    ...projectsQueryOptions(options),
    enabled,
  });
}

/**
 * Hook for fetching active projects
 */
export function useActiveProjects(
  limit: number = 50,
  offset: number = 0,
  enabled: boolean = true
) {
  return useQuery({
    ...activeProjectsQueryOptions(limit, offset),
    enabled,
  });
}

/**
 * Hook for fetching a project by ID
 */
export function useProjectById(projectId: number, enabled: boolean = true) {
  return useQuery({
    ...projectByIdQueryOptions(projectId),
    enabled: enabled && projectId > 0,
  });
}

/**
 * Hook for fetching projects by user (manager)
 */
export function useProjectsByUser(
  userId: number,
  limit: number = 50,
  offset: number = 0,
  enabled: boolean = true
) {
  return useQuery({
    ...projectsByUserQueryOptions(userId, limit, offset),
    enabled: enabled && userId > 0,
  });
}

/**
 * Hook for fetching projects by partner (customer)
 */
export function useProjectsByPartner(
  partnerId: number,
  limit: number = 50,
  offset: number = 0,
  enabled: boolean = true
) {
  return useQuery({
    ...projectsByPartnerQueryOptions(partnerId, limit, offset),
    enabled: enabled && partnerId > 0,
  });
}

/**
 * Hook for fetching favorite projects
 */
export function useFavoriteProjects(
  limit: number = 50,
  offset: number = 0,
  enabled: boolean = true
) {
  return useQuery({
    ...favoriteProjectsQueryOptions(limit, offset),
    enabled,
  });
}

/**
 * Hook for fetching project summaries with filtering
 */
export function useProjectSummaries(
  options?: {
    active?: boolean;
    userId?: number;
    partnerId?: number;
    isFavorite?: boolean;
    searchQuery?: string;
    limit?: number;
    offset?: number;
  },
  enabled: boolean = true
) {
  return useQuery({
    ...projectSummariesQueryOptions(options),
    enabled,
  });
}

/**
 * Hook for counting projects
 */
export function useProjectCount(
  options?: { active?: boolean },
  enabled: boolean = true
) {
  return useQuery({
    ...projectCountQueryOptions(options),
    enabled,
  });
}

// =============================================================================
// Milestone Hooks
// =============================================================================

/**
 * Hook for fetching milestones for a project
 */
export function useProjectMilestones(
  projectId: number,
  limit: number = 50,
  offset: number = 0,
  enabled: boolean = true
) {
  return useQuery({
    ...projectMilestonesQueryOptions(projectId, limit, offset),
    enabled: enabled && projectId > 0,
  });
}

/**
 * Hook for fetching a milestone by ID
 */
export function useMilestoneById(milestoneId: number, enabled: boolean = true) {
  return useQuery({
    ...milestoneByIdQueryOptions(milestoneId),
    enabled: enabled && milestoneId > 0,
  });
}

/**
 * Hook for fetching upcoming milestones
 */
export function useUpcomingMilestones(
  options?: {
    projectId?: number;
    limit?: number;
    offset?: number;
  },
  enabled: boolean = true
) {
  return useQuery({
    ...upcomingMilestonesQueryOptions(options),
    enabled,
  });
}

/**
 * Hook for fetching overdue milestones
 */
export function useOverdueMilestones(
  options?: {
    asOfDate?: string;
    limit?: number;
    offset?: number;
  },
  enabled: boolean = true
) {
  return useQuery({
    ...overdueMilestonesQueryOptions(options),
    enabled,
  });
}

/**
 * Hook for fetching milestone summaries for a project
 */
export function useMilestoneSummaries(
  projectId: number,
  limit: number = 50,
  offset: number = 0,
  enabled: boolean = true
) {
  return useQuery({
    ...milestoneSummariesQueryOptions(projectId, limit, offset),
    enabled: enabled && projectId > 0,
  });
}

// =============================================================================
// Task Hooks
// =============================================================================

/**
 * Hook for fetching tasks for a project
 */
export function useProjectTasks(
  projectId: number,
  limit: number = 50,
  offset: number = 0,
  enabled: boolean = true
) {
  return useQuery({
    ...projectTasksQueryOptions(projectId, limit, offset),
    enabled: enabled && projectId > 0,
  });
}

/**
 * Hook for fetching a task by ID
 */
export function useTaskById(taskId: number, enabled: boolean = true) {
  return useQuery({
    ...taskByIdQueryOptions(taskId),
    enabled: enabled && taskId > 0,
  });
}

/**
 * Hook for fetching tasks by user (assignee)
 */
export function useTasksByUser(
  userId: number,
  limit: number = 50,
  offset: number = 0,
  enabled: boolean = true
) {
  return useQuery({
    ...tasksByUserQueryOptions(userId, limit, offset),
    enabled: enabled && userId > 0,
  });
}

/**
 * Hook for fetching overdue tasks
 */
export function useOverdueTasks(
  options?: {
    asOfDate?: string;
    projectId?: number;
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
 * Hook for fetching tasks for a milestone
 */
export function useMilestoneTasks(
  milestoneId: number,
  limit: number = 50,
  offset: number = 0,
  enabled: boolean = true
) {
  return useQuery({
    ...milestoneTasksQueryOptions(milestoneId, limit, offset),
    enabled: enabled && milestoneId > 0,
  });
}

/**
 * Hook for fetching task summaries for a project
 */
export function useTaskSummaries(
  projectId: number,
  limit: number = 50,
  offset: number = 0,
  enabled: boolean = true
) {
  return useQuery({
    ...taskSummariesQueryOptions(projectId, limit, offset),
    enabled: enabled && projectId > 0,
  });
}

// =============================================================================
// Team Member Hooks
// =============================================================================

/**
 * Hook for fetching team members for a project
 */
export function useProjectTeamMembers(
  projectId: number,
  enabled: boolean = true
) {
  return useQuery({
    ...projectTeamMembersQueryOptions(projectId),
    enabled: enabled && projectId > 0,
  });
}

// =============================================================================
// Statistics Hooks
// =============================================================================

/**
 * Hook for fetching project statistics
 */
export function useProjectStats(enabled: boolean = true) {
  return useQuery({
    ...projectStatsQueryOptions(),
    enabled,
  });
}

// =============================================================================
// Invalidation Hooks
// =============================================================================

/**
 * Hook for invalidating project queries
 * Useful after making changes that affect project data
 */
export function useInvalidateProjectQueries() {
  const queryClient = useQueryClient();

  return {
    /**
     * Invalidate all project queries
     */
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },

    /**
     * Invalidate project list queries
     */
    invalidateProjects: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", "list"] });
      queryClient.invalidateQueries({ queryKey: ["projects", "active"] });
      queryClient.invalidateQueries({ queryKey: ["projects", "favorites"] });
      queryClient.invalidateQueries({ queryKey: ["projects", "summaries"] });
      queryClient.invalidateQueries({ queryKey: ["projects", "count"] });
    },

    /**
     * Invalidate a specific project
     */
    invalidateProject: (projectId: number) => {
      queryClient.invalidateQueries({
        queryKey: ["projects", "detail", projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["projects", "milestones", projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["projects", "tasks", projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["projects", "team", projectId],
      });
    },

    /**
     * Invalidate milestone queries
     */
    invalidateMilestones: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", "milestones"] });
      queryClient.invalidateQueries({ queryKey: ["projects", "milestone"] });
    },

    /**
     * Invalidate task queries
     */
    invalidateTasks: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["projects", "task"] });
    },

    /**
     * Invalidate team member queries
     */
    invalidateTeamMembers: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", "team"] });
    },

    /**
     * Invalidate statistics
     */
    invalidateStats: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", "stats"] });
    },
  };
}

// =============================================================================
// Combined Dashboard Hook
// =============================================================================

/**
 * Hook for fetching all data needed for a project dashboard
 * Returns project stats, active projects, upcoming milestones, and overdue tasks
 */
export function useProjectDashboard(enabled: boolean = true) {
  const projectStats = useProjectStats(enabled);
  const activeProjects = useActiveProjects(10, 0, enabled);
  const upcomingMilestones = useUpcomingMilestones({ limit: 5 }, enabled);
  const overdueTasks = useOverdueTasks({ limit: 5 }, enabled);
  const favoriteProjects = useFavoriteProjects(5, 0, enabled);

  return {
    projectStats,
    activeProjects,
    upcomingMilestones,
    overdueTasks,
    favoriteProjects,
    isLoading:
      projectStats.isLoading ||
      activeProjects.isLoading ||
      upcomingMilestones.isLoading,
    isError:
      projectStats.isError ||
      activeProjects.isError ||
      upcomingMilestones.isError,
    error:
      projectStats.error || activeProjects.error || upcomingMilestones.error,
  };
}

/**
 * Hook for fetching all data needed for a project detail page
 * Returns project details, milestones, tasks, and team members
 */
export function useProjectDetail(projectId: number, enabled: boolean = true) {
  const project = useProjectById(projectId, enabled);
  const milestones = useProjectMilestones(projectId, 50, 0, enabled);
  const tasks = useProjectTasks(projectId, 50, 0, enabled);
  const teamMembers = useProjectTeamMembers(projectId, enabled);

  return {
    project,
    milestones,
    tasks,
    teamMembers,
    isLoading:
      project.isLoading ||
      milestones.isLoading ||
      tasks.isLoading ||
      teamMembers.isLoading,
    isError:
      project.isError ||
      milestones.isError ||
      tasks.isError ||
      teamMembers.isError,
    error:
      project.error || milestones.error || tasks.error || teamMembers.error,
  };
}
