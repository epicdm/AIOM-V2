/**
 * Server Functions for Odoo Task Queries
 *
 * Provides server-side functions for querying Odoo tasks with comprehensive filters.
 * Designed for AIOM dashboard consumption with normalized task data.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authenticatedMiddleware } from "./middleware";
import { privateEnv } from "~/config/privateEnv";
import { initOdooClient } from "~/data-access/odoo";
import {
  type TaskFilters,
  getTasksWithFilters,
  getTaskStatistics,
  getUserTasks,
  getOverdueTasksForDashboard,
  getTasksDueToday,
  getTasksDueThisWeek,
  getHighPriorityTasks,
  getBlockedTasks,
  getProjectTasksForDashboard,
} from "~/data-access/odoo-tasks";

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Ensures Odoo client is initialized
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
// Zod Schemas
// =============================================================================

const taskFiltersSchema = z
  .object({
    assignedUserId: z
      .union([z.number().int().positive(), z.array(z.number().int().positive())])
      .optional(),
    projectId: z
      .union([z.number().int().positive(), z.array(z.number().int().positive())])
      .optional(),
    milestoneId: z.number().int().positive().optional(),
    stageId: z
      .union([z.number().int().positive(), z.array(z.number().int().positive())])
      .optional(),
    status: z.enum(["open", "closed", "all"]).optional(),
    priority: z.enum(["0", "1", "all"]).optional(),
    kanbanState: z.enum(["normal", "done", "blocked", "all"]).optional(),
    dueDateFilter: z
      .enum([
        "overdue",
        "due_today",
        "due_this_week",
        "due_this_month",
        "no_deadline",
        "all",
      ])
      .optional(),
    dueDateFrom: z.string().optional(),
    dueDateTo: z.string().optional(),
    active: z.boolean().optional(),
    searchQuery: z.string().optional(),
    parentOnly: z.boolean().optional(),
    limit: z.number().int().positive().max(500).optional().default(50),
    offset: z.number().int().nonnegative().optional().default(0),
    order: z.string().optional(),
  })
  .optional();

const paginationSchema = z
  .object({
    limit: z.number().int().positive().max(500).optional().default(50),
    offset: z.number().int().nonnegative().optional().default(0),
  })
  .optional();

// =============================================================================
// Server Functions
// =============================================================================

/**
 * Query tasks with comprehensive filters
 */
export const queryTasksFn = createServerFn({
  method: "GET",
})
  .inputValidator(taskFiltersSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    await ensureOdooClient();
    const filters = data || {};
    const result = await getTasksWithFilters(filters as TaskFilters);
    return result;
  });

/**
 * Get task statistics for dashboard widgets
 */
export const getTaskStatsFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z
      .object({
        projectId: z
          .union([z.number().int().positive(), z.array(z.number().int().positive())])
          .optional(),
        assignedUserId: z
          .union([z.number().int().positive(), z.array(z.number().int().positive())])
          .optional(),
      })
      .optional()
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    await ensureOdooClient();
    const filters = data || {};
    const stats = await getTaskStatistics(filters);
    return { stats };
  });

/**
 * Get tasks assigned to a specific user
 */
export const getUserTasksFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      userId: z.number().int().positive("Invalid user ID"),
      status: z.enum(["open", "closed", "all"]).optional(),
      priority: z.enum(["0", "1", "all"]).optional(),
      dueDateFilter: z
        .enum([
          "overdue",
          "due_today",
          "due_this_week",
          "due_this_month",
          "no_deadline",
          "all",
        ])
        .optional(),
      limit: z.number().int().positive().max(500).optional().default(50),
      offset: z.number().int().nonnegative().optional().default(0),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    await ensureOdooClient();
    const { userId, ...options } = data;
    const result = await getUserTasks(userId, options);
    return result;
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
        projectId: z.number().int().positive().optional(),
        assignedUserId: z.number().int().positive().optional(),
        limit: z.number().int().positive().max(500).optional().default(50),
        offset: z.number().int().nonnegative().optional().default(0),
      })
      .optional()
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    await ensureOdooClient();
    const options = data || {};
    const result = await getOverdueTasksForDashboard(options);
    return result;
  });

/**
 * Get tasks due today
 */
export const getTasksDueTodayFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z
      .object({
        projectId: z.number().int().positive().optional(),
        assignedUserId: z.number().int().positive().optional(),
        limit: z.number().int().positive().max(500).optional().default(50),
        offset: z.number().int().nonnegative().optional().default(0),
      })
      .optional()
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    await ensureOdooClient();
    const options = data || {};
    const result = await getTasksDueToday(options);
    return result;
  });

/**
 * Get tasks due this week
 */
export const getTasksDueThisWeekFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z
      .object({
        projectId: z.number().int().positive().optional(),
        assignedUserId: z.number().int().positive().optional(),
        limit: z.number().int().positive().max(500).optional().default(50),
        offset: z.number().int().nonnegative().optional().default(0),
      })
      .optional()
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    await ensureOdooClient();
    const options = data || {};
    const result = await getTasksDueThisWeek(options);
    return result;
  });

/**
 * Get high priority tasks
 */
export const getHighPriorityTasksFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z
      .object({
        projectId: z.number().int().positive().optional(),
        assignedUserId: z.number().int().positive().optional(),
        limit: z.number().int().positive().max(500).optional().default(50),
        offset: z.number().int().nonnegative().optional().default(0),
      })
      .optional()
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    await ensureOdooClient();
    const options = data || {};
    const result = await getHighPriorityTasks(options);
    return result;
  });

/**
 * Get blocked tasks
 */
export const getBlockedTasksFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z
      .object({
        projectId: z.number().int().positive().optional(),
        assignedUserId: z.number().int().positive().optional(),
        limit: z.number().int().positive().max(500).optional().default(50),
        offset: z.number().int().nonnegative().optional().default(0),
      })
      .optional()
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    await ensureOdooClient();
    const options = data || {};
    const result = await getBlockedTasks(options);
    return result;
  });

/**
 * Get tasks for a specific project
 */
export const getProjectTasksDashboardFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      projectId: z.number().int().positive("Invalid project ID"),
      status: z.enum(["open", "closed", "all"]).optional(),
      priority: z.enum(["0", "1", "all"]).optional(),
      kanbanState: z.enum(["normal", "done", "blocked", "all"]).optional(),
      dueDateFilter: z
        .enum([
          "overdue",
          "due_today",
          "due_this_week",
          "due_this_month",
          "no_deadline",
          "all",
        ])
        .optional(),
      assignedUserId: z.number().int().positive().optional(),
      limit: z.number().int().positive().max(500).optional().default(50),
      offset: z.number().int().nonnegative().optional().default(0),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    await ensureOdooClient();
    const { projectId, ...options } = data;
    const result = await getProjectTasksForDashboard(projectId, options);
    return result;
  });

/**
 * Get task statistics for a specific project
 */
export const getProjectTaskStatsFn = createServerFn({
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
    const stats = await getTaskStatistics({ projectId: data.projectId });
    return { stats };
  });

/**
 * Get task statistics for a specific user
 */
export const getUserTaskStatsFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      userId: z.number().int().positive("Invalid user ID"),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    await ensureOdooClient();
    const stats = await getTaskStatistics({ assignedUserId: data.userId });
    return { stats };
  });
