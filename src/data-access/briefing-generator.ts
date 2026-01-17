/**
 * Briefing Generator Data Access Layer
 *
 * Service that generates personalized daily briefings using AI.
 * Aggregates tasks, approvals, alerts, and contextual insights
 * based on user role and current priorities.
 */

import { eq, desc, and, gte, lt, count, sql, sum } from "drizzle-orm";
import { database } from "~/db";
import {
  user,
  expenseRequest,
  notification,
  dailyBriefing,
  type User,
  type UserRole,
} from "~/db/schema";
import { findUserById, getUserRole } from "./users";
import {
  getTaskStatistics,
  getOverdueTasksForDashboard,
  getTasksDueToday,
  getHighPriorityTasks,
  type TaskStats,
  type DashboardTaskSummary,
} from "./odoo-tasks";
import { countUnreadNotifications, findUnreadNotifications } from "./notifications";
import { createBriefing, findUserTodayBriefing, findUserActiveBriefing } from "./briefings";

// =============================================================================
// Types
// =============================================================================

/**
 * Role-specific priorities configuration
 */
export interface RolePriorities {
  focusAreas: string[];
  keyMetrics: string[];
  actionItems: string[];
}

/**
 * Task summary for briefing
 */
export interface BriefingTaskSummary {
  totalOpen: number;
  overdue: number;
  dueToday: number;
  highPriority: number;
  blocked: number;
  topOverdueTasks: Array<{
    id: number;
    name: string;
    projectName: string | null;
    daysOverdue: number;
    priority: string;
  }>;
  topPriorityTasks: Array<{
    id: number;
    name: string;
    projectName: string | null;
    deadline: string | null;
    priority: string;
  }>;
}

/**
 * Approval summary for briefing
 */
export interface BriefingApprovalSummary {
  pendingCount: number;
  totalPendingValue: number;
  urgentCount: number;
  oldestPendingDays: number;
  topPendingApprovals: Array<{
    id: string;
    purpose: string;
    amount: number;
    daysWaiting: number;
    requesterName: string | null;
  }>;
}

/**
 * Alerts/Notifications summary for briefing
 */
export interface BriefingAlertsSummary {
  unreadCount: number;
  recentAlerts: Array<{
    id: string;
    title: string;
    type: string;
    createdAt: Date;
  }>;
}

/**
 * Contextual insights based on aggregated data
 */
export interface BriefingInsights {
  keyHighlights: string[];
  recommendedActions: string[];
  riskAreas: string[];
  opportunities: string[];
}

/**
 * Complete briefing data structure
 */
export interface BriefingData {
  generatedAt: Date;
  expiresAt: Date;
  userId: string;
  userName: string;
  userRole: UserRole | null;
  greeting: string;
  summary: string;
  tasks: BriefingTaskSummary;
  approvals: BriefingApprovalSummary;
  alerts: BriefingAlertsSummary;
  insights: BriefingInsights;
  rolePriorities: RolePriorities;
}

/**
 * Aggregated data from various sources for briefing generation
 */
export interface AggregatedBriefingData {
  user: User;
  userRole: UserRole | null;
  taskStats: TaskStats | null;
  overdueTasks: DashboardTaskSummary[];
  priorityTasks: DashboardTaskSummary[];
  dueTodayTasks: DashboardTaskSummary[];
  pendingApprovals: Array<{
    id: string;
    purpose: string;
    amount: string;
    createdAt: Date;
    requesterName: string | null;
  }>;
  unreadNotifications: number;
  recentNotifications: Array<{
    id: string;
    title: string;
    type: string;
    createdAt: Date;
  }>;
}

// =============================================================================
// Role-Based Priorities Configuration
// =============================================================================

const ROLE_PRIORITIES: Record<UserRole, RolePriorities> = {
  md: {
    focusAreas: [
      "Financial oversight and budget approvals",
      "Strategic decision-making",
      "Team performance monitoring",
      "Risk management",
    ],
    keyMetrics: [
      "Pending high-value approvals",
      "Budget utilization",
      "Team capacity",
      "Project milestones",
    ],
    actionItems: [
      "Review and approve pending expense requests",
      "Address escalated issues",
      "Monitor cash flow projections",
    ],
  },
  admin: {
    focusAreas: [
      "System administration",
      "User management",
      "Process optimization",
      "Compliance monitoring",
    ],
    keyMetrics: [
      "System health",
      "Pending user requests",
      "Workflow bottlenecks",
      "Audit items",
    ],
    actionItems: [
      "Process pending admin requests",
      "Review system alerts",
      "Update configurations as needed",
    ],
  },
  "field-tech": {
    focusAreas: [
      "Work order completion",
      "Customer site visits",
      "Equipment maintenance",
      "Time tracking",
    ],
    keyMetrics: [
      "Assigned work orders",
      "Tasks due today",
      "Customer appointments",
      "Parts inventory",
    ],
    actionItems: [
      "Complete high-priority work orders",
      "Update task status",
      "Log time entries",
    ],
  },
  sales: {
    focusAreas: [
      "Lead management",
      "Customer relationships",
      "Sales pipeline",
      "Revenue targets",
    ],
    keyMetrics: [
      "Open opportunities",
      "Pending quotes",
      "Customer follow-ups",
      "Monthly targets",
    ],
    actionItems: [
      "Follow up with hot leads",
      "Update opportunity stages",
      "Prepare customer proposals",
    ],
  },
};

const DEFAULT_PRIORITIES: RolePriorities = {
  focusAreas: [
    "Task completion",
    "Communication",
    "Collaboration",
  ],
  keyMetrics: [
    "Pending tasks",
    "Unread notifications",
    "Upcoming deadlines",
  ],
  actionItems: [
    "Review pending tasks",
    "Check notifications",
    "Plan daily activities",
  ],
};

// =============================================================================
// Data Aggregation Functions
// =============================================================================

/**
 * Aggregates all data needed for briefing generation
 */
export async function aggregateBriefingData(
  userId: string
): Promise<AggregatedBriefingData | null> {
  // Get user info
  const userData = await findUserById(userId);
  if (!userData) return null;

  const userRole = await getUserRole(userId);

  // Run all data fetches in parallel for performance
  const [
    taskStats,
    overdueResult,
    priorityResult,
    dueTodayResult,
    pendingApprovals,
    unreadCount,
    recentNotifications,
  ] = await Promise.all([
    // Task statistics - may fail if Odoo is not connected
    getTaskStatistics().catch(() => null),

    // Overdue tasks
    getOverdueTasksForDashboard({ limit: 5 }).catch(() => ({ tasks: [] })),

    // High priority tasks
    getHighPriorityTasks({ limit: 5 }).catch(() => ({ tasks: [] })),

    // Tasks due today
    getTasksDueToday({ limit: 5 }).catch(() => ({ tasks: [] })),

    // Pending expense approvals (for MD/Admin roles)
    getPendingApprovalsForBriefing(userId, userRole),

    // Unread notifications count
    countUnreadNotifications(userId),

    // Recent notifications
    findUnreadNotifications(userId, 5).then((notifs) =>
      notifs.map((n) => ({
        id: n.id,
        title: n.title,
        type: n.type,
        createdAt: n.createdAt,
      }))
    ),
  ]);

  return {
    user: userData,
    userRole,
    taskStats,
    overdueTasks: overdueResult.tasks,
    priorityTasks: priorityResult.tasks,
    dueTodayTasks: dueTodayResult.tasks,
    pendingApprovals,
    unreadNotifications: unreadCount,
    recentNotifications,
  };
}

/**
 * Gets pending approvals relevant for the user's role
 */
async function getPendingApprovalsForBriefing(
  userId: string,
  userRole: UserRole | null
): Promise<Array<{
  id: string;
  purpose: string;
  amount: string;
  createdAt: Date;
  requesterName: string | null;
}>> {
  // Only MD and Admin roles see pending approvals
  if (userRole !== "md" && userRole !== "admin") {
    return [];
  }

  const results = await database
    .select({
      id: expenseRequest.id,
      purpose: expenseRequest.purpose,
      amount: expenseRequest.amount,
      createdAt: expenseRequest.createdAt,
      requesterName: user.name,
    })
    .from(expenseRequest)
    .leftJoin(user, eq(expenseRequest.requesterId, user.id))
    .where(eq(expenseRequest.status, "pending"))
    .orderBy(desc(expenseRequest.createdAt))
    .limit(5);

  return results;
}

// =============================================================================
// Briefing Generation Functions
// =============================================================================

/**
 * Generates greeting based on time of day
 */
function generateGreeting(userName: string): string {
  const hour = new Date().getHours();
  let timeGreeting: string;

  if (hour < 12) {
    timeGreeting = "Good morning";
  } else if (hour < 17) {
    timeGreeting = "Good afternoon";
  } else {
    timeGreeting = "Good evening";
  }

  return `${timeGreeting}, ${userName}!`;
}

/**
 * Generates a summary paragraph based on aggregated data
 */
function generateSummary(data: AggregatedBriefingData): string {
  const parts: string[] = [];

  // Task summary
  if (data.taskStats) {
    if (data.taskStats.overdueTasks > 0) {
      parts.push(`You have ${data.taskStats.overdueTasks} overdue task${data.taskStats.overdueTasks > 1 ? 's' : ''} requiring attention`);
    }
    if (data.taskStats.dueToday > 0) {
      parts.push(`${data.taskStats.dueToday} task${data.taskStats.dueToday > 1 ? 's' : ''} due today`);
    }
    if (data.taskStats.highPriority > 0) {
      parts.push(`${data.taskStats.highPriority} high-priority item${data.taskStats.highPriority > 1 ? 's' : ''}`);
    }
  }

  // Approval summary
  if (data.pendingApprovals.length > 0) {
    const totalValue = data.pendingApprovals.reduce(
      (sum, a) => sum + parseFloat(a.amount || "0"),
      0
    );
    parts.push(
      `${data.pendingApprovals.length} pending approval${data.pendingApprovals.length > 1 ? 's' : ''} totaling ${formatCurrency(totalValue)}`
    );
  }

  // Notifications
  if (data.unreadNotifications > 0) {
    parts.push(`${data.unreadNotifications} unread notification${data.unreadNotifications > 1 ? 's' : ''}`);
  }

  if (parts.length === 0) {
    return "You're all caught up! No urgent items require your attention.";
  }

  return parts.join(". ") + ".";
}

/**
 * Generates contextual insights based on data patterns
 */
function generateInsights(data: AggregatedBriefingData): BriefingInsights {
  const keyHighlights: string[] = [];
  const recommendedActions: string[] = [];
  const riskAreas: string[] = [];
  const opportunities: string[] = [];

  // Analyze task data
  if (data.taskStats) {
    const { overdueTasks, dueToday, highPriority, blockedTasks, openTasks } = data.taskStats;

    // Highlights
    if (openTasks > 0) {
      keyHighlights.push(`Managing ${openTasks} open tasks across your projects`);
    }

    // Risk areas
    if (overdueTasks > 3) {
      riskAreas.push(
        `${overdueTasks} overdue tasks may impact project timelines`
      );
      recommendedActions.push("Prioritize clearing overdue tasks or updating deadlines");
    }

    if (blockedTasks > 0) {
      riskAreas.push(`${blockedTasks} blocked task${blockedTasks > 1 ? 's' : ''} need unblocking`);
      recommendedActions.push("Resolve blockers to maintain team velocity");
    }

    // Opportunities
    if (overdueTasks === 0 && dueToday > 0) {
      opportunities.push("Great progress! Focus on today's tasks to maintain momentum");
    }

    if (highPriority > 0) {
      recommendedActions.push(`Address ${highPriority} high-priority items first`);
    }
  }

  // Analyze approval data
  if (data.pendingApprovals.length > 0) {
    const oldestDays = data.pendingApprovals.reduce((max, approval) => {
      const days = Math.floor(
        (Date.now() - new Date(approval.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      return Math.max(max, days);
    }, 0);

    if (oldestDays > 7) {
      riskAreas.push(
        `Oldest pending approval is ${oldestDays} days old - may cause delays`
      );
    }

    keyHighlights.push(
      `${data.pendingApprovals.length} expense request${data.pendingApprovals.length > 1 ? 's' : ''} awaiting review`
    );
  }

  // Notifications insights
  if (data.unreadNotifications > 10) {
    recommendedActions.push("Review and clear notification backlog");
  }

  // Add role-specific insights
  if (data.userRole === "md") {
    opportunities.push("Review team performance metrics for strategic planning");
  } else if (data.userRole === "sales") {
    opportunities.push("Check pipeline status and follow up with leads");
  } else if (data.userRole === "field-tech") {
    opportunities.push("Verify equipment and parts availability for scheduled work");
  }

  // Ensure we have at least some content
  if (keyHighlights.length === 0) {
    keyHighlights.push("Your workflow is running smoothly");
  }
  if (recommendedActions.length === 0) {
    recommendedActions.push("Continue with planned activities");
  }

  return {
    keyHighlights,
    recommendedActions,
    riskAreas,
    opportunities,
  };
}

/**
 * Transforms aggregated data into briefing structure
 */
function transformToBriefingData(
  data: AggregatedBriefingData
): BriefingData {
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setHours(23, 59, 59, 999); // Expires at end of day

  // Build task summary
  const taskSummary: BriefingTaskSummary = {
    totalOpen: data.taskStats?.openTasks ?? 0,
    overdue: data.taskStats?.overdueTasks ?? 0,
    dueToday: data.taskStats?.dueToday ?? 0,
    highPriority: data.taskStats?.highPriority ?? 0,
    blocked: data.taskStats?.blockedTasks ?? 0,
    topOverdueTasks: data.overdueTasks.slice(0, 3).map((t) => ({
      id: t.id,
      name: t.name,
      projectName: t.projectName,
      daysOverdue: Math.abs(t.daysUntilDeadline ?? 0),
      priority: t.priority,
    })),
    topPriorityTasks: data.priorityTasks.slice(0, 3).map((t) => ({
      id: t.id,
      name: t.name,
      projectName: t.projectName,
      deadline: t.deadline,
      priority: t.priority,
    })),
  };

  // Build approval summary
  const oldestDays = data.pendingApprovals.length > 0
    ? Math.max(
        ...data.pendingApprovals.map((a) =>
          Math.floor(
            (Date.now() - new Date(a.createdAt).getTime()) / (1000 * 60 * 60 * 24)
          )
        )
      )
    : 0;

  const approvalSummary: BriefingApprovalSummary = {
    pendingCount: data.pendingApprovals.length,
    totalPendingValue: data.pendingApprovals.reduce(
      (sum, a) => sum + parseFloat(a.amount || "0"),
      0
    ),
    urgentCount: data.pendingApprovals.filter((a) => {
      const days = Math.floor(
        (Date.now() - new Date(a.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      return days > 5;
    }).length,
    oldestPendingDays: oldestDays,
    topPendingApprovals: data.pendingApprovals.slice(0, 3).map((a) => ({
      id: a.id,
      purpose: a.purpose,
      amount: parseFloat(a.amount || "0"),
      daysWaiting: Math.floor(
        (Date.now() - new Date(a.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      ),
      requesterName: a.requesterName,
    })),
  };

  // Build alerts summary
  const alertsSummary: BriefingAlertsSummary = {
    unreadCount: data.unreadNotifications,
    recentAlerts: data.recentNotifications.slice(0, 5),
  };

  // Get role priorities
  const rolePriorities = data.userRole
    ? ROLE_PRIORITIES[data.userRole]
    : DEFAULT_PRIORITIES;

  return {
    generatedAt: now,
    expiresAt,
    userId: data.user.id,
    userName: data.user.name,
    userRole: data.userRole,
    greeting: generateGreeting(data.user.name),
    summary: generateSummary(data),
    tasks: taskSummary,
    approvals: approvalSummary,
    alerts: alertsSummary,
    insights: generateInsights(data),
    rolePriorities,
  };
}

// =============================================================================
// Main Briefing Generation
// =============================================================================

/**
 * Generates or retrieves today's briefing for a user
 * Returns existing briefing if already generated today, otherwise creates new one
 */
export async function getOrGenerateBriefing(
  userId: string
): Promise<BriefingData | null> {
  // Check for existing today's briefing
  const existingBriefing = await findUserTodayBriefing(userId);
  if (existingBriefing) {
    return JSON.parse(existingBriefing.content) as BriefingData;
  }

  // Generate new briefing
  return generateNewBriefing(userId);
}

/**
 * Forces generation of a new briefing (ignores existing)
 */
export async function generateNewBriefing(
  userId: string
): Promise<BriefingData | null> {
  // Aggregate data from all sources
  const aggregatedData = await aggregateBriefingData(userId);
  if (!aggregatedData) return null;

  // Transform to briefing structure
  const briefingData = transformToBriefingData(aggregatedData);

  // Save to database
  await createBriefing({
    id: crypto.randomUUID(),
    userId,
    content: JSON.stringify(briefingData),
    expiresAt: briefingData.expiresAt,
    generatedAt: briefingData.generatedAt,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return briefingData;
}

/**
 * Gets active briefing for user (not expired)
 */
export async function getActiveBriefingData(
  userId: string
): Promise<BriefingData | null> {
  const activeBriefing = await findUserActiveBriefing(userId);
  if (!activeBriefing) return null;

  return JSON.parse(activeBriefing.content) as BriefingData;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Format currency for display
 */
function formatCurrency(amount: number, currency = "PHP"): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Get briefing statistics for dashboard widgets
 */
export async function getBriefingStats(userId: string): Promise<{
  hasUnreadBriefing: boolean;
  lastGeneratedAt: Date | null;
  totalBriefings: number;
}> {
  const [activeBriefing, totalCount] = await Promise.all([
    findUserActiveBriefing(userId),
    database
      .select({ count: count() })
      .from(dailyBriefing)
      .where(eq(dailyBriefing.userId, userId))
      .then((result) => result[0]?.count ?? 0),
  ]);

  return {
    hasUnreadBriefing: activeBriefing ? !activeBriefing.isRead : false,
    lastGeneratedAt: activeBriefing?.generatedAt ?? null,
    totalBriefings: totalCount,
  };
}
