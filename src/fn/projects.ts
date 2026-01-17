/**
 * Server Functions for Project Data
 *
 * Provides server-side functions for querying project data from Odoo ERP.
 * Includes projects, milestones, tasks, and team member operations.
 * Supports filtering by active status and user assignment.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authenticatedMiddleware } from "./middleware";
import { privateEnv } from "~/config/privateEnv";
import { initOdooClient } from "~/data-access/odoo";
import type { OdooDomain } from "~/lib/odoo";
import {
  findProjects,
  findProjectById,
  findActiveProjects,
  findProjectsByUser,
  findProjectsByPartner,
  findFavoriteProjects,
  getProjectsWithFilters,
  findMilestones,
  findMilestoneById,
  findProjectMilestones,
  findUpcomingMilestones,
  findOverdueMilestones,
  findTasks,
  findTaskById,
  findProjectTasks,
  findTasksByUser,
  findOverdueTasks,
  findMilestoneTasks,
  getProjectTeamMembers,
  getProjectStats,
  getProjectSummaries,
  getMilestoneSummaries,
  getTaskSummaries,
  toProjectSummary,
  toMilestoneSummary,
  toTaskSummary,
  countProjects,
  countMilestones,
  countTasks,
} from "~/data-access/projects";

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Gets the Odoo configuration and initializes client
 */
async function ensureOdooClient() {
  const url = privateEnv.ODOO_URL;
  const database = privateEnv.ODOO_DATABASE;
  const username = privateEnv.ODOO_USERNAME;
  const password = privateEnv.ODOO_PASSWORD;

  if (!url || !database || !username || !password) {
    throw new Error(
      "Odoo configuration is incomplete. Please check environment variables."
    );
  }

  await initOdooClient({ url, database, username, password });
}

// =============================================================================
// Project Functions
// =============================================================================

/**
 * Get all projects
 */
export const getProjectsFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z
      .object({
        active: z.boolean().optional(),
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      })
      .optional()
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    await ensureOdooClient();
    const options = data || { limit: 50, offset: 0 };
    const domain: OdooDomain = options.active !== undefined
      ? [["active", "=", options.active]]
      : [];
    const projects = await findProjects(domain, {
      limit: options.limit,
      offset: options.offset,
    });
    return { projects: projects.map(toProjectSummary) };
  });

/**
 * Get active projects
 */
export const getActiveProjectsFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z
      .object({
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      })
      .optional()
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    await ensureOdooClient();
    const options = data || { limit: 50, offset: 0 };
    const projects = await findActiveProjects(options);
    return { projects: projects.map(toProjectSummary) };
  });

/**
 * Get project by ID
 */
export const getProjectByIdFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      projectId: z.number().int().positive("Invalid project ID"),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    await ensureOdooClient();
    const project = await findProjectById(data.projectId);

    if (!project) {
      throw new Error("Project not found");
    }

    return { project: toProjectSummary(project) };
  });

/**
 * Get projects by user (manager/responsible)
 */
export const getProjectsByUserFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      userId: z.number().int().positive("Invalid user ID"),
      limit: z.number().optional().default(50),
      offset: z.number().optional().default(0),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    await ensureOdooClient();
    const projects = await findProjectsByUser(data.userId, {
      limit: data.limit,
      offset: data.offset,
    });
    return { projects: projects.map(toProjectSummary) };
  });

/**
 * Get projects by partner (customer)
 */
export const getProjectsByPartnerFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      partnerId: z.number().int().positive("Invalid partner ID"),
      limit: z.number().optional().default(50),
      offset: z.number().optional().default(0),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    await ensureOdooClient();
    const projects = await findProjectsByPartner(data.partnerId, {
      limit: data.limit,
      offset: data.offset,
    });
    return { projects: projects.map(toProjectSummary) };
  });

/**
 * Get favorite projects
 */
export const getFavoriteProjectsFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z
      .object({
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      })
      .optional()
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    await ensureOdooClient();
    const options = data || { limit: 50, offset: 0 };
    const projects = await findFavoriteProjects(options);
    return { projects: projects.map(toProjectSummary) };
  });

/**
 * Get project summaries with filters
 */
export const getProjectSummariesFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z
      .object({
        active: z.boolean().optional(),
        userId: z.number().int().positive().optional(),
        partnerId: z.number().int().positive().optional(),
        isFavorite: z.boolean().optional(),
        searchQuery: z.string().optional(),
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      })
      .optional()
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    await ensureOdooClient();
    const options = data || {};
    const result = await getProjectSummaries(options);
    return result;
  });

/**
 * Count projects
 */
export const countProjectsFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z
      .object({
        active: z.boolean().optional(),
      })
      .optional()
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    await ensureOdooClient();
    const domain: OdooDomain = data?.active !== undefined
      ? [["active", "=", data.active]]
      : [];
    const count = await countProjects(domain);
    return { count };
  });

// =============================================================================
// Milestone Functions
// =============================================================================

/**
 * Get milestones for a project
 */
export const getProjectMilestonesFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      projectId: z.number().int().positive("Invalid project ID"),
      limit: z.number().optional().default(50),
      offset: z.number().optional().default(0),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    await ensureOdooClient();
    const milestones = await findProjectMilestones(data.projectId, {
      limit: data.limit,
      offset: data.offset,
    });
    return { milestones: milestones.map(toMilestoneSummary) };
  });

/**
 * Get milestone by ID
 */
export const getMilestoneByIdFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      milestoneId: z.number().int().positive("Invalid milestone ID"),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    await ensureOdooClient();
    const milestone = await findMilestoneById(data.milestoneId);

    if (!milestone) {
      throw new Error("Milestone not found");
    }

    return { milestone: toMilestoneSummary(milestone) };
  });

/**
 * Get upcoming milestones
 */
export const getUpcomingMilestonesFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z
      .object({
        projectId: z.number().int().positive().optional(),
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      })
      .optional()
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    await ensureOdooClient();
    const options = data || { limit: 50, offset: 0 };
    const milestones = await findUpcomingMilestones(options.projectId, {
      limit: options.limit,
      offset: options.offset,
    });
    return { milestones: milestones.map(toMilestoneSummary) };
  });

/**
 * Get overdue milestones
 */
export const getOverdueMilestonesFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z
      .object({
        asOfDate: z.string().optional(),
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      })
      .optional()
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    await ensureOdooClient();
    const { asOfDate, limit = 50, offset = 0 } = data || {};
    const milestones = await findOverdueMilestones(asOfDate, { limit, offset });
    return { milestones: milestones.map(toMilestoneSummary) };
  });

/**
 * Get milestone summaries for a project
 */
export const getMilestoneSummariesFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      projectId: z.number().int().positive("Invalid project ID"),
      limit: z.number().optional().default(50),
      offset: z.number().optional().default(0),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    await ensureOdooClient();
    const milestones = await getMilestoneSummaries(data.projectId, {
      limit: data.limit,
      offset: data.offset,
    });
    return { milestones };
  });

// =============================================================================
// Task Functions
// =============================================================================

/**
 * Get tasks for a project
 */
export const getProjectTasksFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      projectId: z.number().int().positive("Invalid project ID"),
      limit: z.number().optional().default(50),
      offset: z.number().optional().default(0),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    await ensureOdooClient();
    const tasks = await findProjectTasks(data.projectId, {
      limit: data.limit,
      offset: data.offset,
    });
    return { tasks: tasks.map(toTaskSummary) };
  });

/**
 * Get task by ID
 */
export const getTaskByIdFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      taskId: z.number().int().positive("Invalid task ID"),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    await ensureOdooClient();
    const task = await findTaskById(data.taskId);

    if (!task) {
      throw new Error("Task not found");
    }

    return { task: toTaskSummary(task) };
  });

/**
 * Get tasks by user (assignee)
 */
export const getTasksByUserFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      userId: z.number().int().positive("Invalid user ID"),
      limit: z.number().optional().default(50),
      offset: z.number().optional().default(0),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    await ensureOdooClient();
    const tasks = await findTasksByUser(data.userId, {
      limit: data.limit,
      offset: data.offset,
    });
    return { tasks: tasks.map(toTaskSummary) };
  });

/**
 * Get overdue tasks
 */
export const getOverdueTasksFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z
      .object({
        asOfDate: z.string().optional(),
        projectId: z.number().int().positive().optional(),
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      })
      .optional()
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    await ensureOdooClient();
    const { asOfDate, projectId, limit = 50, offset = 0 } = data || {};
    const tasks = await findOverdueTasks(asOfDate, projectId, { limit, offset });
    return { tasks: tasks.map(toTaskSummary) };
  });

/**
 * Get tasks for a milestone
 */
export const getMilestoneTasksFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      milestoneId: z.number().int().positive("Invalid milestone ID"),
      limit: z.number().optional().default(50),
      offset: z.number().optional().default(0),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    await ensureOdooClient();
    const tasks = await findMilestoneTasks(data.milestoneId, {
      limit: data.limit,
      offset: data.offset,
    });
    return { tasks: tasks.map(toTaskSummary) };
  });

/**
 * Get task summaries for a project
 */
export const getTaskSummariesFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      projectId: z.number().int().positive("Invalid project ID"),
      limit: z.number().optional().default(50),
      offset: z.number().optional().default(0),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    await ensureOdooClient();
    const tasks = await getTaskSummaries(data.projectId, {
      limit: data.limit,
      offset: data.offset,
    });
    return { tasks };
  });

// =============================================================================
// Team Member Functions
// =============================================================================

/**
 * Get team members for a project
 */
export const getProjectTeamMembersFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      projectId: z.number().int().positive("Invalid project ID"),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    await ensureOdooClient();
    const teamMembers = await getProjectTeamMembers(data.projectId);
    return { teamMembers };
  });

// =============================================================================
// Statistics Functions
// =============================================================================

/**
 * Get project statistics
 */
export const getProjectStatsFn = createServerFn({
  method: "GET",
})
  .middleware([authenticatedMiddleware])
  .handler(async () => {
    await ensureOdooClient();
    const stats = await getProjectStats();
    return { stats };
  });
