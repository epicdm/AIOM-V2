/**
 * TanStack Query Options for Project Data
 *
 * Provides query configurations for fetching project data
 * from Odoo ERP with caching and refetch strategies.
 */

import { queryOptions } from "@tanstack/react-query";
import {
  getProjectsFn,
  getActiveProjectsFn,
  getProjectByIdFn,
  getProjectsByUserFn,
  getProjectsByPartnerFn,
  getFavoriteProjectsFn,
  getProjectSummariesFn,
  countProjectsFn,
  getProjectMilestonesFn,
  getMilestoneByIdFn,
  getUpcomingMilestonesFn,
  getOverdueMilestonesFn,
  getMilestoneSummariesFn,
  getProjectTasksFn,
  getTaskByIdFn,
  getTasksByUserFn,
  getOverdueTasksFn,
  getMilestoneTasksFn,
  getTaskSummariesFn,
  getProjectTeamMembersFn,
  getProjectStatsFn,
} from "~/fn/projects";

// =============================================================================
// Project Query Options
// =============================================================================

/**
 * Query options for fetching all projects
 */
export const projectsQueryOptions = (options?: {
  active?: boolean;
  limit?: number;
  offset?: number;
}) =>
  queryOptions({
    queryKey: ["projects", "list", options],
    queryFn: () => getProjectsFn({ data: options }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

/**
 * Query options for fetching active projects
 */
export const activeProjectsQueryOptions = (
  limit: number = 50,
  offset: number = 0
) =>
  queryOptions({
    queryKey: ["projects", "active", { limit, offset }],
    queryFn: () => getActiveProjectsFn({ data: { limit, offset } }),
    staleTime: 5 * 60 * 1000,
  });

/**
 * Query options for fetching a project by ID
 */
export const projectByIdQueryOptions = (projectId: number) =>
  queryOptions({
    queryKey: ["projects", "detail", projectId],
    queryFn: () => getProjectByIdFn({ data: { projectId } }),
    staleTime: 5 * 60 * 1000,
  });

/**
 * Query options for fetching projects by user (manager)
 */
export const projectsByUserQueryOptions = (
  userId: number,
  limit: number = 50,
  offset: number = 0
) =>
  queryOptions({
    queryKey: ["projects", "user", userId, { limit, offset }],
    queryFn: () => getProjectsByUserFn({ data: { userId, limit, offset } }),
    staleTime: 5 * 60 * 1000,
  });

/**
 * Query options for fetching projects by partner (customer)
 */
export const projectsByPartnerQueryOptions = (
  partnerId: number,
  limit: number = 50,
  offset: number = 0
) =>
  queryOptions({
    queryKey: ["projects", "partner", partnerId, { limit, offset }],
    queryFn: () => getProjectsByPartnerFn({ data: { partnerId, limit, offset } }),
    staleTime: 5 * 60 * 1000,
  });

/**
 * Query options for fetching favorite projects
 */
export const favoriteProjectsQueryOptions = (
  limit: number = 50,
  offset: number = 0
) =>
  queryOptions({
    queryKey: ["projects", "favorites", { limit, offset }],
    queryFn: () => getFavoriteProjectsFn({ data: { limit, offset } }),
    staleTime: 5 * 60 * 1000,
  });

/**
 * Query options for fetching project summaries with filters
 */
export const projectSummariesQueryOptions = (options?: {
  active?: boolean;
  userId?: number;
  partnerId?: number;
  isFavorite?: boolean;
  searchQuery?: string;
  limit?: number;
  offset?: number;
}) =>
  queryOptions({
    queryKey: ["projects", "summaries", options],
    queryFn: () => getProjectSummariesFn({ data: options }),
    staleTime: 2 * 60 * 1000, // 2 minutes for summaries
  });

/**
 * Query options for counting projects
 */
export const projectCountQueryOptions = (options?: { active?: boolean }) =>
  queryOptions({
    queryKey: ["projects", "count", options],
    queryFn: () => countProjectsFn({ data: options }),
    staleTime: 2 * 60 * 1000,
  });

// =============================================================================
// Milestone Query Options
// =============================================================================

/**
 * Query options for fetching milestones for a project
 */
export const projectMilestonesQueryOptions = (
  projectId: number,
  limit: number = 50,
  offset: number = 0
) =>
  queryOptions({
    queryKey: ["projects", "milestones", projectId, { limit, offset }],
    queryFn: () => getProjectMilestonesFn({ data: { projectId, limit, offset } }),
    staleTime: 5 * 60 * 1000,
  });

/**
 * Query options for fetching a milestone by ID
 */
export const milestoneByIdQueryOptions = (milestoneId: number) =>
  queryOptions({
    queryKey: ["projects", "milestone", milestoneId],
    queryFn: () => getMilestoneByIdFn({ data: { milestoneId } }),
    staleTime: 5 * 60 * 1000,
  });

/**
 * Query options for fetching upcoming milestones
 */
export const upcomingMilestonesQueryOptions = (options?: {
  projectId?: number;
  limit?: number;
  offset?: number;
}) =>
  queryOptions({
    queryKey: ["projects", "milestones", "upcoming", options],
    queryFn: () => getUpcomingMilestonesFn({ data: options }),
    staleTime: 2 * 60 * 1000,
  });

/**
 * Query options for fetching overdue milestones
 */
export const overdueMilestonesQueryOptions = (options?: {
  asOfDate?: string;
  limit?: number;
  offset?: number;
}) =>
  queryOptions({
    queryKey: ["projects", "milestones", "overdue", options],
    queryFn: () => getOverdueMilestonesFn({ data: options }),
    staleTime: 2 * 60 * 1000,
  });

/**
 * Query options for fetching milestone summaries for a project
 */
export const milestoneSummariesQueryOptions = (
  projectId: number,
  limit: number = 50,
  offset: number = 0
) =>
  queryOptions({
    queryKey: ["projects", "milestones", "summaries", projectId, { limit, offset }],
    queryFn: () => getMilestoneSummariesFn({ data: { projectId, limit, offset } }),
    staleTime: 2 * 60 * 1000,
  });

// =============================================================================
// Task Query Options
// =============================================================================

/**
 * Query options for fetching tasks for a project
 */
export const projectTasksQueryOptions = (
  projectId: number,
  limit: number = 50,
  offset: number = 0
) =>
  queryOptions({
    queryKey: ["projects", "tasks", projectId, { limit, offset }],
    queryFn: () => getProjectTasksFn({ data: { projectId, limit, offset } }),
    staleTime: 2 * 60 * 1000, // Tasks change frequently
  });

/**
 * Query options for fetching a task by ID
 */
export const taskByIdQueryOptions = (taskId: number) =>
  queryOptions({
    queryKey: ["projects", "task", taskId],
    queryFn: () => getTaskByIdFn({ data: { taskId } }),
    staleTime: 2 * 60 * 1000,
  });

/**
 * Query options for fetching tasks by user (assignee)
 */
export const tasksByUserQueryOptions = (
  userId: number,
  limit: number = 50,
  offset: number = 0
) =>
  queryOptions({
    queryKey: ["projects", "tasks", "user", userId, { limit, offset }],
    queryFn: () => getTasksByUserFn({ data: { userId, limit, offset } }),
    staleTime: 2 * 60 * 1000,
  });

/**
 * Query options for fetching overdue tasks
 */
export const overdueTasksQueryOptions = (options?: {
  asOfDate?: string;
  projectId?: number;
  limit?: number;
  offset?: number;
}) =>
  queryOptions({
    queryKey: ["projects", "tasks", "overdue", options],
    queryFn: () => getOverdueTasksFn({ data: options }),
    staleTime: 2 * 60 * 1000,
  });

/**
 * Query options for fetching tasks for a milestone
 */
export const milestoneTasksQueryOptions = (
  milestoneId: number,
  limit: number = 50,
  offset: number = 0
) =>
  queryOptions({
    queryKey: ["projects", "tasks", "milestone", milestoneId, { limit, offset }],
    queryFn: () => getMilestoneTasksFn({ data: { milestoneId, limit, offset } }),
    staleTime: 2 * 60 * 1000,
  });

/**
 * Query options for fetching task summaries for a project
 */
export const taskSummariesQueryOptions = (
  projectId: number,
  limit: number = 50,
  offset: number = 0
) =>
  queryOptions({
    queryKey: ["projects", "tasks", "summaries", projectId, { limit, offset }],
    queryFn: () => getTaskSummariesFn({ data: { projectId, limit, offset } }),
    staleTime: 2 * 60 * 1000,
  });

// =============================================================================
// Team Member Query Options
// =============================================================================

/**
 * Query options for fetching team members for a project
 */
export const projectTeamMembersQueryOptions = (projectId: number) =>
  queryOptions({
    queryKey: ["projects", "team", projectId],
    queryFn: () => getProjectTeamMembersFn({ data: { projectId } }),
    staleTime: 5 * 60 * 1000, // Team members change less frequently
  });

// =============================================================================
// Statistics Query Options
// =============================================================================

/**
 * Query options for fetching project statistics
 */
export const projectStatsQueryOptions = () =>
  queryOptions({
    queryKey: ["projects", "stats"],
    queryFn: () => getProjectStatsFn(),
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  });
