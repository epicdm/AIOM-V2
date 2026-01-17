/**
 * Odoo Query Tools
 *
 * Claude tool implementations for querying Odoo data (tasks, projects, customers, financials).
 * Converts natural language queries into structured Odoo API calls.
 */

import type { ToolDefinition, ToolResult } from "../tool-registry";
import { createSummaryFormatter, createTableFormatter } from "../tool-registry";
import {
  findProjects,
  findProjectById,
  findActiveProjects,
  findProjectsByPartner,
  getProjectStats,
  getProjectSummaries,
  toProjectSummary,
} from "~/data-access/projects";
import {
  findTasks,
  findTaskById,
  findProjectTasks,
  findTasksByUser,
  findOverdueTasks,
  getTaskSummaries,
  toTaskSummary,
} from "~/data-access/projects";
import {
  findMilestones,
  findMilestoneById,
  findProjectMilestones,
  findUpcomingMilestones,
  findOverdueMilestones,
  getMilestoneSummaries,
  toMilestoneSummary,
} from "~/data-access/projects";
import {
  findCustomers,
  findVendors,
  getCustomerById,
  getCustomerWithBalance,
  getVendorWithBalance,
  searchPartners,
  getPartnerWithBalance,
  getPartnerContactInfo,
  getPartnerRelationshipHistory,
  getTopCustomersByRevenue,
  getTopVendorsByPurchases,
  getInactiveCustomers,
} from "~/data-access/partners";
import type {
  ProjectSummary,
  TaskSummary,
  MilestoneSummary,
  ProjectStats,
  PartnerSummary,
  PartnerWithBalance,
  PartnerContactInfo,
  PartnerRelationshipHistory,
} from "~/lib/odoo";

// =============================================================================
// Type Definitions for Tool Inputs/Outputs
// =============================================================================

interface SearchProjectsInput {
  query?: string;
  active?: boolean;
  partnerId?: number;
  userId?: number;
  isFavorite?: boolean;
  limit?: number;
}

interface GetProjectInput {
  projectId: number;
}

interface SearchTasksInput {
  query?: string;
  projectId?: number;
  userId?: number;
  status?: "open" | "done" | "blocked" | "all";
  priority?: "high" | "normal" | "all";
  overdue?: boolean;
  limit?: number;
}

interface GetTaskInput {
  taskId: number;
}

interface SearchMilestonesInput {
  projectId?: number;
  status?: "upcoming" | "reached" | "overdue" | "all";
  limit?: number;
}

interface GetMilestoneInput {
  milestoneId: number;
}

interface SearchCustomersInput {
  query?: string;
  city?: string;
  withBalance?: boolean;
  limit?: number;
}

interface GetCustomerInput {
  customerId: number;
  includeBalance?: boolean;
  includeHistory?: boolean;
}

interface SearchVendorsInput {
  query?: string;
  city?: string;
  withBalance?: boolean;
  limit?: number;
}

interface GetVendorInput {
  vendorId: number;
  includeBalance?: boolean;
  includeHistory?: boolean;
}

// =============================================================================
// Project Query Tools
// =============================================================================

/**
 * Search Projects Tool
 * Searches for projects based on various criteria
 */
export const searchProjectsTool: ToolDefinition<
  SearchProjectsInput,
  { projects: ProjectSummary[]; totalCount: number }
> = {
  id: "search-projects",
  name: "Search Projects",
  description:
    "Search for projects in Odoo. Use this when asked to find projects, list active projects, or get projects for a specific customer or manager. Supports filtering by name, active status, customer, manager, and favorites.",
  version: "1.0.0",
  category: "data",
  permission: "user",
  enabled: true,
  tags: ["odoo", "project", "search", "list"],
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search query to match project names (partial match)",
      },
      active: {
        type: "boolean",
        description: "Filter by active status. True for active projects only.",
      },
      partnerId: {
        type: "integer",
        description: "Filter by customer/partner ID",
      },
      userId: {
        type: "integer",
        description: "Filter by project manager/responsible user ID",
      },
      isFavorite: {
        type: "boolean",
        description: "Filter by favorite status",
      },
      limit: {
        type: "integer",
        description: "Maximum number of results (default 50)",
        default: 50,
        minimum: 1,
        maximum: 200,
      },
    },
  },
  handler: async (
    input,
    context
  ): Promise<ToolResult<{ projects: ProjectSummary[]; totalCount: number }>> => {
    try {
      const result = await getProjectSummaries({
        searchQuery: input.query,
        active: input.active,
        partnerId: input.partnerId,
        userId: input.userId,
        isFavorite: input.isFavorite,
        limit: input.limit ?? 50,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "SEARCH_PROJECTS_ERROR",
          message: error instanceof Error ? error.message : "Failed to search projects",
          retryable: true,
        },
      };
    }
  },
};

/**
 * Get Project Details Tool
 * Gets detailed information about a specific project
 */
export const getProjectTool: ToolDefinition<
  GetProjectInput,
  { project: ProjectSummary | null }
> = {
  id: "get-project",
  name: "Get Project Details",
  description:
    "Get detailed information about a specific project by its ID. Use this when you need full details about a particular project including task counts, milestones, and progress.",
  version: "1.0.0",
  category: "data",
  permission: "user",
  enabled: true,
  tags: ["odoo", "project", "detail"],
  inputSchema: {
    type: "object",
    properties: {
      projectId: {
        type: "integer",
        description: "The Odoo project ID to retrieve",
      },
    },
    required: ["projectId"],
  },
  handler: async (
    input,
    context
  ): Promise<ToolResult<{ project: ProjectSummary | null }>> => {
    try {
      const project = await findProjectById(input.projectId);

      if (!project) {
        return {
          success: false,
          error: {
            code: "PROJECT_NOT_FOUND",
            message: `Project with ID ${input.projectId} not found`,
            retryable: false,
          },
        };
      }

      return {
        success: true,
        data: { project: toProjectSummary(project) },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "GET_PROJECT_ERROR",
          message: error instanceof Error ? error.message : "Failed to get project",
          retryable: true,
        },
      };
    }
  },
  formatter: createSummaryFormatter<{ project: ProjectSummary | null }>([
    { key: "project.id", label: "Project ID" },
    { key: "project.name", label: "Project Name" },
    { key: "project.partnerName", label: "Customer" },
    { key: "project.managerName", label: "Project Manager" },
    { key: "project.taskCount", label: "Total Tasks" },
    { key: "project.openTaskCount", label: "Open Tasks" },
    { key: "project.progress", label: "Progress %" },
    { key: "project.milestoneCount", label: "Milestones" },
  ]),
};

/**
 * Get Project Statistics Tool
 * Gets overall statistics about projects, tasks, and milestones
 */
export const getProjectStatsTool: ToolDefinition<
  Record<string, never>,
  ProjectStats
> = {
  id: "get-project-stats",
  name: "Project Statistics",
  description:
    "Get overall statistics about projects, tasks, and milestones. Use this for dashboards or when asked for a summary of all project activity, total open tasks, or overdue items.",
  version: "1.0.0",
  category: "data",
  permission: "user",
  enabled: true,
  tags: ["odoo", "project", "statistics", "summary"],
  inputSchema: {
    type: "object",
    properties: {},
  },
  handler: async (input, context): Promise<ToolResult<ProjectStats>> => {
    try {
      const stats = await getProjectStats();
      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "PROJECT_STATS_ERROR",
          message: error instanceof Error ? error.message : "Failed to get project statistics",
          retryable: true,
        },
      };
    }
  },
  formatter: createSummaryFormatter<ProjectStats>([
    { key: "totalProjects", label: "Total Projects" },
    { key: "activeProjects", label: "Active Projects" },
    { key: "totalTasks", label: "Total Tasks" },
    { key: "openTasks", label: "Open Tasks" },
    { key: "closedTasks", label: "Closed Tasks" },
    { key: "overdueTasks", label: "Overdue Tasks" },
    { key: "totalMilestones", label: "Total Milestones" },
    { key: "upcomingMilestones", label: "Upcoming Milestones" },
    { key: "reachedMilestones", label: "Reached Milestones" },
  ]),
};

// =============================================================================
// Task Query Tools
// =============================================================================

/**
 * Search Tasks Tool
 * Searches for tasks based on various criteria
 */
export const searchTasksTool: ToolDefinition<
  SearchTasksInput,
  { tasks: TaskSummary[]; count: number }
> = {
  id: "search-tasks",
  name: "Search Tasks",
  description:
    "Search for tasks in Odoo. Use this when asked to find tasks, list open tasks, show overdue tasks, or get tasks for a specific project or user. Supports filtering by name, status, priority, and assignee.",
  version: "1.0.0",
  category: "data",
  permission: "user",
  enabled: true,
  tags: ["odoo", "task", "search", "list"],
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search query to match task names (partial match)",
      },
      projectId: {
        type: "integer",
        description: "Filter by project ID",
      },
      userId: {
        type: "integer",
        description: "Filter by assigned user ID",
      },
      status: {
        type: "string",
        description: "Filter by status: 'open' for incomplete, 'done' for completed, 'blocked' for blocked tasks, 'all' for any status",
        enum: ["open", "done", "blocked", "all"],
      },
      priority: {
        type: "string",
        description: "Filter by priority: 'high' for high priority, 'normal' for normal, 'all' for any",
        enum: ["high", "normal", "all"],
      },
      overdue: {
        type: "boolean",
        description: "Set to true to only show overdue tasks (past deadline and not completed)",
      },
      limit: {
        type: "integer",
        description: "Maximum number of results (default 50)",
        default: 50,
        minimum: 1,
        maximum: 200,
      },
    },
  },
  handler: async (
    input,
    context
  ): Promise<ToolResult<{ tasks: TaskSummary[]; count: number }>> => {
    try {
      let tasks: TaskSummary[];

      if (input.projectId) {
        // Get tasks for specific project
        const projectTasks = await getTaskSummaries(input.projectId, {
          limit: input.limit ?? 50,
        });
        tasks = projectTasks;
      } else if (input.overdue) {
        // Get overdue tasks
        const overdueTasks = await findOverdueTasks(undefined, input.projectId, {
          limit: input.limit ?? 50,
        });
        tasks = overdueTasks.map(toTaskSummary);
      } else if (input.userId) {
        // Get tasks by user
        const userTasks = await findTasksByUser(input.userId, {
          limit: input.limit ?? 50,
        });
        tasks = userTasks.map(toTaskSummary);
      } else {
        // General search
        const allTasks = await findTasks(
          input.query ? [["name", "ilike", input.query], ["active", "=", true]] : [["active", "=", true]],
          { limit: input.limit ?? 50 }
        );
        tasks = allTasks.map(toTaskSummary);
      }

      // Apply additional filters
      if (input.status && input.status !== "all") {
        if (input.status === "open") {
          tasks = tasks.filter((t) => t.kanbanState !== "done");
        } else if (input.status === "done") {
          tasks = tasks.filter((t) => t.kanbanState === "done");
        } else if (input.status === "blocked") {
          tasks = tasks.filter((t) => t.kanbanState === "blocked");
        }
      }

      if (input.priority && input.priority !== "all") {
        tasks = tasks.filter((t) => t.priority === input.priority);
      }

      return {
        success: true,
        data: { tasks, count: tasks.length },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "SEARCH_TASKS_ERROR",
          message: error instanceof Error ? error.message : "Failed to search tasks",
          retryable: true,
        },
      };
    }
  },
};

/**
 * Get Task Details Tool
 * Gets detailed information about a specific task
 */
export const getTaskTool: ToolDefinition<
  GetTaskInput,
  { task: TaskSummary | null }
> = {
  id: "get-task",
  name: "Get Task Details",
  description:
    "Get detailed information about a specific task by its ID. Use this when you need full details about a particular task including project, assignees, deadline, and progress.",
  version: "1.0.0",
  category: "data",
  permission: "user",
  enabled: true,
  tags: ["odoo", "task", "detail"],
  inputSchema: {
    type: "object",
    properties: {
      taskId: {
        type: "integer",
        description: "The Odoo task ID to retrieve",
      },
    },
    required: ["taskId"],
  },
  handler: async (
    input,
    context
  ): Promise<ToolResult<{ task: TaskSummary | null }>> => {
    try {
      const task = await findTaskById(input.taskId);

      if (!task) {
        return {
          success: false,
          error: {
            code: "TASK_NOT_FOUND",
            message: `Task with ID ${input.taskId} not found`,
            retryable: false,
          },
        };
      }

      return {
        success: true,
        data: { task: toTaskSummary(task) },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "GET_TASK_ERROR",
          message: error instanceof Error ? error.message : "Failed to get task",
          retryable: true,
        },
      };
    }
  },
  formatter: createSummaryFormatter<{ task: TaskSummary | null }>([
    { key: "task.id", label: "Task ID" },
    { key: "task.name", label: "Task Name" },
    { key: "task.projectName", label: "Project" },
    { key: "task.stageName", label: "Stage" },
    { key: "task.priority", label: "Priority" },
    { key: "task.deadline", label: "Deadline" },
    { key: "task.plannedHours", label: "Planned Hours" },
    { key: "task.effectiveHours", label: "Actual Hours" },
    { key: "task.progress", label: "Progress %" },
  ]),
};

// =============================================================================
// Milestone Query Tools
// =============================================================================

/**
 * Search Milestones Tool
 * Searches for project milestones
 */
export const searchMilestonesTool: ToolDefinition<
  SearchMilestonesInput,
  { milestones: MilestoneSummary[]; count: number }
> = {
  id: "search-milestones",
  name: "Search Milestones",
  description:
    "Search for project milestones in Odoo. Use this when asked to find milestones, list upcoming deadlines, or check milestone progress for a project.",
  version: "1.0.0",
  category: "data",
  permission: "user",
  enabled: true,
  tags: ["odoo", "milestone", "search", "deadline"],
  inputSchema: {
    type: "object",
    properties: {
      projectId: {
        type: "integer",
        description: "Filter by project ID",
      },
      status: {
        type: "string",
        description: "Filter by status: 'upcoming' for not yet reached, 'reached' for completed, 'overdue' for past deadline and not reached, 'all' for any",
        enum: ["upcoming", "reached", "overdue", "all"],
      },
      limit: {
        type: "integer",
        description: "Maximum number of results (default 50)",
        default: 50,
        minimum: 1,
        maximum: 200,
      },
    },
  },
  handler: async (
    input,
    context
  ): Promise<ToolResult<{ milestones: MilestoneSummary[]; count: number }>> => {
    try {
      let milestones: MilestoneSummary[];

      if (input.status === "upcoming") {
        const upcoming = await findUpcomingMilestones(input.projectId, {
          limit: input.limit ?? 50,
        });
        milestones = upcoming.map(toMilestoneSummary);
      } else if (input.status === "overdue") {
        const overdue = await findOverdueMilestones(undefined, {
          limit: input.limit ?? 50,
        });
        milestones = overdue.map(toMilestoneSummary);
        if (input.projectId) {
          milestones = milestones.filter((m) => m.projectId === input.projectId);
        }
      } else if (input.status === "reached") {
        const reached = await findMilestones([["is_reached", "=", true]], {
          limit: input.limit ?? 50,
        });
        milestones = reached.map(toMilestoneSummary);
        if (input.projectId) {
          milestones = milestones.filter((m) => m.projectId === input.projectId);
        }
      } else if (input.projectId) {
        milestones = await getMilestoneSummaries(input.projectId, {
          limit: input.limit ?? 50,
        });
      } else {
        const all = await findMilestones([], { limit: input.limit ?? 50 });
        milestones = all.map(toMilestoneSummary);
      }

      return {
        success: true,
        data: { milestones, count: milestones.length },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "SEARCH_MILESTONES_ERROR",
          message: error instanceof Error ? error.message : "Failed to search milestones",
          retryable: true,
        },
      };
    }
  },
};

/**
 * Get Milestone Details Tool
 */
export const getMilestoneTool: ToolDefinition<
  GetMilestoneInput,
  { milestone: MilestoneSummary | null }
> = {
  id: "get-milestone",
  name: "Get Milestone Details",
  description:
    "Get detailed information about a specific milestone by its ID.",
  version: "1.0.0",
  category: "data",
  permission: "user",
  enabled: true,
  tags: ["odoo", "milestone", "detail"],
  inputSchema: {
    type: "object",
    properties: {
      milestoneId: {
        type: "integer",
        description: "The Odoo milestone ID to retrieve",
      },
    },
    required: ["milestoneId"],
  },
  handler: async (
    input,
    context
  ): Promise<ToolResult<{ milestone: MilestoneSummary | null }>> => {
    try {
      const milestone = await findMilestoneById(input.milestoneId);

      if (!milestone) {
        return {
          success: false,
          error: {
            code: "MILESTONE_NOT_FOUND",
            message: `Milestone with ID ${input.milestoneId} not found`,
            retryable: false,
          },
        };
      }

      return {
        success: true,
        data: { milestone: toMilestoneSummary(milestone) },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "GET_MILESTONE_ERROR",
          message: error instanceof Error ? error.message : "Failed to get milestone",
          retryable: true,
        },
      };
    }
  },
};

// =============================================================================
// Customer Query Tools
// =============================================================================

/**
 * Search Customers Tool
 */
export const searchCustomersTool: ToolDefinition<
  SearchCustomersInput,
  { customers: PartnerSummary[]; count: number }
> = {
  id: "search-customers",
  name: "Search Customers",
  description:
    "Search for customers in Odoo. Use this when asked to find customers, list clients, or search for customer contacts. Supports searching by name, email, or city.",
  version: "1.0.0",
  category: "data",
  permission: "user",
  enabled: true,
  tags: ["odoo", "customer", "partner", "search"],
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search query to match customer name or email (partial match)",
      },
      city: {
        type: "string",
        description: "Filter by city (partial match)",
      },
      withBalance: {
        type: "boolean",
        description: "Include account balance information (slower query)",
      },
      limit: {
        type: "integer",
        description: "Maximum number of results (default 50)",
        default: 50,
        minimum: 1,
        maximum: 200,
      },
    },
  },
  handler: async (
    input,
    context
  ): Promise<ToolResult<{ customers: PartnerSummary[]; count: number }>> => {
    try {
      const customers = await searchPartners(
        {
          name: input.query,
          city: input.city,
          type: "customer",
          active: true,
        },
        { limit: input.limit ?? 50 }
      );

      return {
        success: true,
        data: { customers, count: customers.length },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "SEARCH_CUSTOMERS_ERROR",
          message: error instanceof Error ? error.message : "Failed to search customers",
          retryable: true,
        },
      };
    }
  },
};

/**
 * Get Customer Details Tool
 */
export const getCustomerTool: ToolDefinition<
  GetCustomerInput,
  { customer: PartnerWithBalance | null; history?: PartnerRelationshipHistory | null }
> = {
  id: "get-customer",
  name: "Get Customer Details",
  description:
    "Get detailed information about a specific customer by ID. Can include account balance and transaction history. Use this when you need full details about a customer.",
  version: "1.0.0",
  category: "data",
  permission: "user",
  enabled: true,
  tags: ["odoo", "customer", "partner", "detail"],
  inputSchema: {
    type: "object",
    properties: {
      customerId: {
        type: "integer",
        description: "The Odoo customer/partner ID to retrieve",
      },
      includeBalance: {
        type: "boolean",
        description: "Include account balance information (default true)",
        default: true,
      },
      includeHistory: {
        type: "boolean",
        description: "Include transaction history summary (default false)",
        default: false,
      },
    },
    required: ["customerId"],
  },
  handler: async (
    input,
    context
  ): Promise<ToolResult<{ customer: PartnerWithBalance | null; history?: PartnerRelationshipHistory | null }>> => {
    try {
      const customer = input.includeBalance !== false
        ? await getCustomerWithBalance(input.customerId)
        : await getCustomerById(input.customerId) as PartnerWithBalance | null;

      if (!customer) {
        return {
          success: false,
          error: {
            code: "CUSTOMER_NOT_FOUND",
            message: `Customer with ID ${input.customerId} not found`,
            retryable: false,
          },
        };
      }

      let history: PartnerRelationshipHistory | null = null;
      if (input.includeHistory) {
        history = await getPartnerRelationshipHistory(input.customerId);
      }

      return {
        success: true,
        data: { customer, history },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "GET_CUSTOMER_ERROR",
          message: error instanceof Error ? error.message : "Failed to get customer",
          retryable: true,
        },
      };
    }
  },
};

/**
 * Get Top Customers Tool
 */
export const getTopCustomersTool: ToolDefinition<
  { limit?: number },
  { customers: Array<{ partnerId: number; partnerName: string; totalRevenue: number }> }
> = {
  id: "get-top-customers",
  name: "Get Top Customers",
  description:
    "Get the top customers by total revenue. Use this when asked for best customers, top clients, or highest revenue accounts.",
  version: "1.0.0",
  category: "data",
  permission: "user",
  enabled: true,
  tags: ["odoo", "customer", "revenue", "top"],
  inputSchema: {
    type: "object",
    properties: {
      limit: {
        type: "integer",
        description: "Number of top customers to return (default 10)",
        default: 10,
        minimum: 1,
        maximum: 50,
      },
    },
  },
  handler: async (
    input,
    context
  ): Promise<ToolResult<{ customers: Array<{ partnerId: number; partnerName: string; totalRevenue: number }> }>> => {
    try {
      const customers = await getTopCustomersByRevenue(input.limit ?? 10);
      return {
        success: true,
        data: { customers },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "TOP_CUSTOMERS_ERROR",
          message: error instanceof Error ? error.message : "Failed to get top customers",
          retryable: true,
        },
      };
    }
  },
};

// =============================================================================
// Vendor Query Tools
// =============================================================================

/**
 * Search Vendors Tool
 */
export const searchVendorsTool: ToolDefinition<
  SearchVendorsInput,
  { vendors: PartnerSummary[]; count: number }
> = {
  id: "search-vendors",
  name: "Search Vendors",
  description:
    "Search for vendors/suppliers in Odoo. Use this when asked to find vendors, list suppliers, or search for supplier contacts.",
  version: "1.0.0",
  category: "data",
  permission: "user",
  enabled: true,
  tags: ["odoo", "vendor", "supplier", "partner", "search"],
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search query to match vendor name or email (partial match)",
      },
      city: {
        type: "string",
        description: "Filter by city (partial match)",
      },
      withBalance: {
        type: "boolean",
        description: "Include account balance information (slower query)",
      },
      limit: {
        type: "integer",
        description: "Maximum number of results (default 50)",
        default: 50,
        minimum: 1,
        maximum: 200,
      },
    },
  },
  handler: async (
    input,
    context
  ): Promise<ToolResult<{ vendors: PartnerSummary[]; count: number }>> => {
    try {
      const vendors = await searchPartners(
        {
          name: input.query,
          city: input.city,
          type: "vendor",
          active: true,
        },
        { limit: input.limit ?? 50 }
      );

      return {
        success: true,
        data: { vendors, count: vendors.length },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "SEARCH_VENDORS_ERROR",
          message: error instanceof Error ? error.message : "Failed to search vendors",
          retryable: true,
        },
      };
    }
  },
};

/**
 * Get Vendor Details Tool
 */
export const getVendorTool: ToolDefinition<
  GetVendorInput,
  { vendor: PartnerWithBalance | null; history?: PartnerRelationshipHistory | null }
> = {
  id: "get-vendor",
  name: "Get Vendor Details",
  description:
    "Get detailed information about a specific vendor/supplier by ID. Can include account balance and transaction history.",
  version: "1.0.0",
  category: "data",
  permission: "user",
  enabled: true,
  tags: ["odoo", "vendor", "supplier", "partner", "detail"],
  inputSchema: {
    type: "object",
    properties: {
      vendorId: {
        type: "integer",
        description: "The Odoo vendor/partner ID to retrieve",
      },
      includeBalance: {
        type: "boolean",
        description: "Include account balance information (default true)",
        default: true,
      },
      includeHistory: {
        type: "boolean",
        description: "Include transaction history summary (default false)",
        default: false,
      },
    },
    required: ["vendorId"],
  },
  handler: async (
    input,
    context
  ): Promise<ToolResult<{ vendor: PartnerWithBalance | null; history?: PartnerRelationshipHistory | null }>> => {
    try {
      const vendor = input.includeBalance !== false
        ? await getVendorWithBalance(input.vendorId)
        : null;

      if (!vendor) {
        return {
          success: false,
          error: {
            code: "VENDOR_NOT_FOUND",
            message: `Vendor with ID ${input.vendorId} not found`,
            retryable: false,
          },
        };
      }

      let history: PartnerRelationshipHistory | null = null;
      if (input.includeHistory) {
        history = await getPartnerRelationshipHistory(input.vendorId);
      }

      return {
        success: true,
        data: { vendor, history },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "GET_VENDOR_ERROR",
          message: error instanceof Error ? error.message : "Failed to get vendor",
          retryable: true,
        },
      };
    }
  },
};

/**
 * Get Top Vendors Tool
 */
export const getTopVendorsTool: ToolDefinition<
  { limit?: number },
  { vendors: Array<{ partnerId: number; partnerName: string; totalPurchased: number }> }
> = {
  id: "get-top-vendors",
  name: "Get Top Vendors",
  description:
    "Get the top vendors by total purchase volume. Use this when asked for top suppliers or highest volume vendors.",
  version: "1.0.0",
  category: "data",
  permission: "user",
  enabled: true,
  tags: ["odoo", "vendor", "supplier", "purchases", "top"],
  inputSchema: {
    type: "object",
    properties: {
      limit: {
        type: "integer",
        description: "Number of top vendors to return (default 10)",
        default: 10,
        minimum: 1,
        maximum: 50,
      },
    },
  },
  handler: async (
    input,
    context
  ): Promise<ToolResult<{ vendors: Array<{ partnerId: number; partnerName: string; totalPurchased: number }> }>> => {
    try {
      const vendors = await getTopVendorsByPurchases(input.limit ?? 10);
      return {
        success: true,
        data: { vendors },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "TOP_VENDORS_ERROR",
          message: error instanceof Error ? error.message : "Failed to get top vendors",
          retryable: true,
        },
      };
    }
  },
};

/**
 * Get Inactive Customers Tool
 */
export const getInactiveCustomersTool: ToolDefinition<
  { inactiveDays?: number; limit?: number },
  { customers: Array<{ partnerId: number; partnerName: string; daysSinceLastTransaction: number }> }
> = {
  id: "get-inactive-customers",
  name: "Get Inactive Customers",
  description:
    "Get customers who have not had any transactions in the specified number of days. Use this to identify customers who may need follow-up or re-engagement.",
  version: "1.0.0",
  category: "data",
  permission: "user",
  enabled: true,
  tags: ["odoo", "customer", "inactive", "churn"],
  inputSchema: {
    type: "object",
    properties: {
      inactiveDays: {
        type: "integer",
        description: "Number of days with no activity to be considered inactive (default 90)",
        default: 90,
        minimum: 30,
        maximum: 365,
      },
      limit: {
        type: "integer",
        description: "Maximum number of results (default 50)",
        default: 50,
        minimum: 1,
        maximum: 200,
      },
    },
  },
  handler: async (
    input,
    context
  ): Promise<ToolResult<{ customers: Array<{ partnerId: number; partnerName: string; daysSinceLastTransaction: number }> }>> => {
    try {
      const customers = await getInactiveCustomers(
        input.inactiveDays ?? 90,
        input.limit ?? 50
      );
      return {
        success: true,
        data: { customers },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "INACTIVE_CUSTOMERS_ERROR",
          message: error instanceof Error ? error.message : "Failed to get inactive customers",
          retryable: true,
        },
      };
    }
  },
};

// =============================================================================
// Export All Tools
// =============================================================================

export const odooQueryTools = [
  // Project tools
  searchProjectsTool,
  getProjectTool,
  getProjectStatsTool,
  // Task tools
  searchTasksTool,
  getTaskTool,
  // Milestone tools
  searchMilestonesTool,
  getMilestoneTool,
  // Customer tools
  searchCustomersTool,
  getCustomerTool,
  getTopCustomersTool,
  getInactiveCustomersTool,
  // Vendor tools
  searchVendorsTool,
  getVendorTool,
  getTopVendorsTool,
];

/**
 * Get count of Odoo query tools
 */
export function getOdooQueryToolCount(): number {
  return odooQueryTools.length;
}
