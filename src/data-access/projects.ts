/**
 * Projects Data Access Layer
 *
 * Provides data access functions for querying project data from Odoo ERP.
 * Includes projects, milestones, tasks, and team member operations.
 * Supports filtering by active status and user assignment.
 */

import {
  type OdooDomain,
  type SearchReadOptions,
  type ProjectProject,
  type ProjectMilestone,
  type ProjectTask,
  type ProjectSummary,
  type MilestoneSummary,
  type TaskSummary,
  type TeamMember,
  type ProjectFilters,
  type ProjectStats,
  type ResUsers,
} from "~/lib/odoo";
import { getOdooClient } from "./odoo";

// =============================================================================
// Constants
// =============================================================================

const PROJECT_FIELDS = [
  "id",
  "name",
  "active",
  "sequence",
  "partner_id",
  "company_id",
  "user_id",
  "date_start",
  "date",
  "description",
  "privacy_visibility",
  "task_count",
  "open_task_count",
  "closed_task_count",
  "color",
  "tag_ids",
  "is_favorite",
  "milestone_ids",
  "milestone_count",
  "create_date",
  "write_date",
];

const MILESTONE_FIELDS = [
  "id",
  "name",
  "project_id",
  "deadline",
  "is_reached",
  "reached_date",
  "sequence",
  "task_ids",
  "open_task_count",
  "closed_task_count",
  "create_date",
  "write_date",
];

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
// Project Operations
// =============================================================================

/**
 * Finds projects matching the criteria
 */
export async function findProjects(
  domain: OdooDomain = [],
  options: SearchReadOptions = {}
): Promise<ProjectProject[]> {
  const client = await getOdooClient();
  return client.searchRead<ProjectProject>("project.project", domain, {
    fields: options.fields || PROJECT_FIELDS,
    order: options.order || "sequence, name",
    ...options,
  });
}

/**
 * Finds a project by ID
 */
export async function findProjectById(
  id: number
): Promise<ProjectProject | null> {
  const client = await getOdooClient();
  const results = await client.read<ProjectProject>("project.project", [id], {
    fields: PROJECT_FIELDS,
  });
  return results[0] || null;
}

/**
 * Finds active projects
 */
export async function findActiveProjects(
  options: SearchReadOptions = {}
): Promise<ProjectProject[]> {
  return findProjects([["active", "=", true]], options);
}

/**
 * Finds projects by user (manager/responsible)
 */
export async function findProjectsByUser(
  userId: number,
  options: SearchReadOptions = {}
): Promise<ProjectProject[]> {
  return findProjects(
    [
      ["user_id", "=", userId],
      ["active", "=", true],
    ],
    options
  );
}

/**
 * Finds projects by partner (customer)
 */
export async function findProjectsByPartner(
  partnerId: number,
  options: SearchReadOptions = {}
): Promise<ProjectProject[]> {
  return findProjects(
    [
      ["partner_id", "=", partnerId],
      ["active", "=", true],
    ],
    options
  );
}

/**
 * Finds favorite projects for a user
 */
export async function findFavoriteProjects(
  options: SearchReadOptions = {}
): Promise<ProjectProject[]> {
  return findProjects([["is_favorite", "=", true]], options);
}

/**
 * Counts projects matching the criteria
 */
export async function countProjects(domain: OdooDomain = []): Promise<number> {
  const client = await getOdooClient();
  return client.searchCount("project.project", domain);
}

/**
 * Gets projects with filters (for complex filtering)
 */
export async function getProjectsWithFilters(
  filters: ProjectFilters
): Promise<{ projects: ProjectProject[]; totalCount: number }> {
  const domain: OdooDomain = [];

  // Apply filters
  if (filters.active !== undefined) {
    domain.push(["active", "=", filters.active]);
  }

  if (filters.userId) {
    domain.push(["user_id", "=", filters.userId]);
  }

  if (filters.partnerId) {
    domain.push(["partner_id", "=", filters.partnerId]);
  }

  if (filters.isFavorite !== undefined) {
    domain.push(["is_favorite", "=", filters.isFavorite]);
  }

  if (filters.searchQuery) {
    domain.push(["name", "ilike", filters.searchQuery]);
  }

  const client = await getOdooClient();
  const totalCount = await client.searchCount("project.project", domain);

  const projects = await client.searchRead<ProjectProject>(
    "project.project",
    domain,
    {
      fields: PROJECT_FIELDS,
      order: "sequence, name",
      limit: filters.limit || 50,
      offset: filters.offset || 0,
    }
  );

  return { projects, totalCount };
}

// =============================================================================
// Milestone Operations
// =============================================================================

/**
 * Finds milestones matching the criteria
 */
export async function findMilestones(
  domain: OdooDomain = [],
  options: SearchReadOptions = {}
): Promise<ProjectMilestone[]> {
  const client = await getOdooClient();
  return client.searchRead<ProjectMilestone>("project.milestone", domain, {
    fields: options.fields || MILESTONE_FIELDS,
    order: options.order || "deadline, sequence, name",
    ...options,
  });
}

/**
 * Finds a milestone by ID
 */
export async function findMilestoneById(
  id: number
): Promise<ProjectMilestone | null> {
  const client = await getOdooClient();
  const results = await client.read<ProjectMilestone>(
    "project.milestone",
    [id],
    {
      fields: MILESTONE_FIELDS,
    }
  );
  return results[0] || null;
}

/**
 * Finds milestones for a specific project
 */
export async function findProjectMilestones(
  projectId: number,
  options: SearchReadOptions = {}
): Promise<ProjectMilestone[]> {
  return findMilestones([["project_id", "=", projectId]], options);
}

/**
 * Finds upcoming milestones (not yet reached, sorted by deadline)
 */
export async function findUpcomingMilestones(
  projectId?: number,
  options: SearchReadOptions = {}
): Promise<ProjectMilestone[]> {
  const domain: OdooDomain = [["is_reached", "=", false]];

  if (projectId) {
    domain.push(["project_id", "=", projectId]);
  }

  return findMilestones(domain, {
    order: "deadline asc, sequence, name",
    ...options,
  });
}

/**
 * Finds overdue milestones
 */
export async function findOverdueMilestones(
  asOfDate?: string,
  options: SearchReadOptions = {}
): Promise<ProjectMilestone[]> {
  const today = asOfDate || new Date().toISOString().split("T")[0];
  return findMilestones(
    [
      ["is_reached", "=", false],
      ["deadline", "<", today],
    ],
    options
  );
}

/**
 * Counts milestones matching the criteria
 */
export async function countMilestones(domain: OdooDomain = []): Promise<number> {
  const client = await getOdooClient();
  return client.searchCount("project.milestone", domain);
}

// =============================================================================
// Task Operations
// =============================================================================

/**
 * Finds tasks matching the criteria
 */
export async function findTasks(
  domain: OdooDomain = [],
  options: SearchReadOptions = {}
): Promise<ProjectTask[]> {
  const client = await getOdooClient();
  return client.searchRead<ProjectTask>("project.task", domain, {
    fields: options.fields || TASK_FIELDS,
    order: options.order || "priority desc, sequence, name",
    ...options,
  });
}

/**
 * Finds a task by ID
 */
export async function findTaskById(id: number): Promise<ProjectTask | null> {
  const client = await getOdooClient();
  const results = await client.read<ProjectTask>("project.task", [id], {
    fields: TASK_FIELDS,
  });
  return results[0] || null;
}

/**
 * Finds tasks for a specific project
 */
export async function findProjectTasks(
  projectId: number,
  options: SearchReadOptions = {}
): Promise<ProjectTask[]> {
  return findTasks(
    [
      ["project_id", "=", projectId],
      ["active", "=", true],
    ],
    options
  );
}

/**
 * Finds tasks assigned to a specific user
 */
export async function findTasksByUser(
  userId: number,
  options: SearchReadOptions = {}
): Promise<ProjectTask[]> {
  return findTasks(
    [
      ["user_ids", "in", [userId]],
      ["active", "=", true],
    ],
    options
  );
}

/**
 * Finds overdue tasks
 */
export async function findOverdueTasks(
  asOfDate?: string,
  projectId?: number,
  options: SearchReadOptions = {}
): Promise<ProjectTask[]> {
  const today = asOfDate || new Date().toISOString().split("T")[0];
  const domain: OdooDomain = [
    ["date_deadline", "<", today],
    ["date_end", "=", false], // Not completed
    ["active", "=", true],
  ];

  if (projectId) {
    domain.push(["project_id", "=", projectId]);
  }

  return findTasks(domain, options);
}

/**
 * Finds tasks for a specific milestone
 */
export async function findMilestoneTasks(
  milestoneId: number,
  options: SearchReadOptions = {}
): Promise<ProjectTask[]> {
  return findTasks(
    [
      ["milestone_id", "=", milestoneId],
      ["active", "=", true],
    ],
    options
  );
}

/**
 * Counts tasks matching the criteria
 */
export async function countTasks(domain: OdooDomain = []): Promise<number> {
  const client = await getOdooClient();
  return client.searchCount("project.task", domain);
}

// =============================================================================
// Team Member Operations
// =============================================================================

/**
 * Gets team members for a project (users assigned to tasks)
 */
export async function getProjectTeamMembers(
  projectId: number
): Promise<TeamMember[]> {
  const client = await getOdooClient();

  // Get all tasks for the project
  const tasks = await findProjectTasks(projectId, {
    fields: ["id", "user_ids"],
  });

  // Collect unique user IDs
  const userIds = new Set<number>();
  for (const task of tasks) {
    if (task.user_ids && Array.isArray(task.user_ids)) {
      for (const userId of task.user_ids) {
        userIds.add(userId);
      }
    }
  }

  if (userIds.size === 0) {
    return [];
  }

  // Get user details
  const users = await client.read<ResUsers>(
    "res.users",
    Array.from(userIds),
    {
      fields: ["id", "name", "email"],
    }
  );

  // Calculate task counts per user
  const teamMembers: TeamMember[] = [];
  for (const user of users) {
    const userTasks = tasks.filter(
      (task) => task.user_ids && task.user_ids.includes(user.id)
    );
    const openTasks = userTasks.filter((task) => !task.date_end);

    teamMembers.push({
      id: user.id,
      name: user.name,
      email: typeof user.email === "string" ? user.email : null,
      taskCount: userTasks.length,
      openTaskCount: openTasks.length,
    });
  }

  return teamMembers.sort((a, b) => b.taskCount - a.taskCount);
}

// =============================================================================
// Summary & Statistics
// =============================================================================

/**
 * Converts ProjectProject to ProjectSummary
 */
export function toProjectSummary(project: ProjectProject): ProjectSummary {
  const taskCount = project.task_count ?? 0;
  const openTaskCount = project.open_task_count ?? 0;
  const closedTaskCount = project.closed_task_count ?? 0;
  const progress =
    taskCount > 0 ? Math.round((closedTaskCount / taskCount) * 100) : 0;

  return {
    id: project.id,
    name: project.name,
    partnerId: Array.isArray(project.partner_id) ? project.partner_id[0] : null,
    partnerName: Array.isArray(project.partner_id)
      ? project.partner_id[1]
      : null,
    managerId: Array.isArray(project.user_id) ? project.user_id[0] : null,
    managerName: Array.isArray(project.user_id) ? project.user_id[1] : null,
    dateStart:
      typeof project.date_start === "string" ? project.date_start : null,
    dateEnd: typeof project.date === "string" ? project.date : null,
    taskCount,
    openTaskCount,
    closedTaskCount,
    milestoneCount: project.milestone_count ?? 0,
    isActive: project.active ?? true,
    isFavorite: project.is_favorite ?? false,
    progress,
  };
}

/**
 * Converts ProjectMilestone to MilestoneSummary
 */
export function toMilestoneSummary(
  milestone: ProjectMilestone
): MilestoneSummary {
  const openTaskCount = milestone.open_task_count ?? 0;
  const closedTaskCount = milestone.closed_task_count ?? 0;
  const totalTasks = openTaskCount + closedTaskCount;
  const progress =
    totalTasks > 0 ? Math.round((closedTaskCount / totalTasks) * 100) : 0;

  return {
    id: milestone.id,
    name: milestone.name,
    projectId: Array.isArray(milestone.project_id)
      ? milestone.project_id[0]
      : 0,
    projectName: Array.isArray(milestone.project_id)
      ? milestone.project_id[1]
      : "",
    deadline:
      typeof milestone.deadline === "string" ? milestone.deadline : null,
    isReached: milestone.is_reached ?? false,
    reachedDate:
      typeof milestone.reached_date === "string"
        ? milestone.reached_date
        : null,
    openTaskCount,
    closedTaskCount,
    progress,
  };
}

/**
 * Converts ProjectTask to TaskSummary
 */
export function toTaskSummary(task: ProjectTask): TaskSummary {
  return {
    id: task.id,
    name: task.name,
    projectId: Array.isArray(task.project_id) ? task.project_id[0] : null,
    projectName: Array.isArray(task.project_id) ? task.project_id[1] : null,
    assigneeIds: task.user_ids ?? [],
    deadline:
      typeof task.date_deadline === "string" ? task.date_deadline : null,
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
  };
}

/**
 * Gets project statistics
 */
export async function getProjectStats(): Promise<ProjectStats> {
  const today = new Date().toISOString().split("T")[0];

  const [
    totalProjects,
    activeProjects,
    totalTasks,
    openTasks,
    closedTasks,
    overdueTasks,
    totalMilestones,
    reachedMilestones,
    upcomingMilestones,
  ] = await Promise.all([
    countProjects([]),
    countProjects([["active", "=", true]]),
    countTasks([["active", "=", true]]),
    countTasks([
      ["active", "=", true],
      ["date_end", "=", false],
    ]),
    countTasks([
      ["active", "=", true],
      ["date_end", "!=", false],
    ]),
    countTasks([
      ["active", "=", true],
      ["date_end", "=", false],
      ["date_deadline", "<", today],
    ]),
    countMilestones([]),
    countMilestones([["is_reached", "=", true]]),
    countMilestones([
      ["is_reached", "=", false],
      ["deadline", ">=", today],
    ]),
  ]);

  return {
    totalProjects,
    activeProjects,
    totalTasks,
    openTasks,
    closedTasks,
    overdueTasks,
    totalMilestones,
    upcomingMilestones,
    reachedMilestones,
  };
}

/**
 * Gets project summaries with pagination
 */
export async function getProjectSummaries(options: {
  active?: boolean;
  userId?: number;
  partnerId?: number;
  isFavorite?: boolean;
  searchQuery?: string;
  limit?: number;
  offset?: number;
}): Promise<{ projects: ProjectSummary[]; totalCount: number }> {
  const { projects, totalCount } = await getProjectsWithFilters({
    active: options.active,
    userId: options.userId,
    partnerId: options.partnerId,
    isFavorite: options.isFavorite,
    searchQuery: options.searchQuery,
    limit: options.limit,
    offset: options.offset,
  });

  return {
    projects: projects.map(toProjectSummary),
    totalCount,
  };
}

/**
 * Gets milestone summaries for a project
 */
export async function getMilestoneSummaries(
  projectId: number,
  options: SearchReadOptions = {}
): Promise<MilestoneSummary[]> {
  const milestones = await findProjectMilestones(projectId, options);
  return milestones.map(toMilestoneSummary);
}

/**
 * Gets task summaries for a project
 */
export async function getTaskSummaries(
  projectId: number,
  options: SearchReadOptions = {}
): Promise<TaskSummary[]> {
  const tasks = await findProjectTasks(projectId, options);
  return tasks.map(toTaskSummary);
}
