/**
 * Proactive Monitoring Data Access Layer
 *
 * Provides database queries for health checks across all monitored categories:
 * - Tasks
 * - Expenses
 * - Financial Position
 * - Customer Issues
 * - Team Capacity
 */

import { eq, desc, count, and, or, isNull, lte, gte, sql, gt, lt, ne } from "drizzle-orm";
import { database } from "~/db";
import {
  user,
  expenseRequest,
  expenseVoucher,
  callRecord,
  callDisposition,
  callTask,
} from "~/db/schema";

// =============================================================================
// Types
// =============================================================================

export interface TaskHealthMetrics {
  totalTasks: number;
  overdueTasks: number;
  overduePercentage: number;
  completedToday: number;
  completedThisWeek: number;
  pendingTasks: number;
  inProgressTasks: number;
  blockedTasks: number;
  tasksByUser: { userId: string; userName: string; taskCount: number }[];
  averageCompletionTime: number | null;
}

export interface ExpenseHealthMetrics {
  totalPendingApproval: number;
  oldestPendingDays: number | null;
  totalAwaitingReceipts: number;
  totalPendingReconciliation: number;
  totalAmountPending: number;
  averageApprovalTime: number | null;
  expensesByStatus: { status: string; count: number; totalAmount: number }[];
  largeExpenses: { id: string; amount: number; purpose: string; requesterId: string }[];
}

export interface FinancialHealthMetrics {
  totalAROutstanding: number;
  arAgingBuckets: { bucket: string; amount: number; count: number }[];
  overdueInvoicesCount: number;
  overdueInvoicesAmount: number;
  totalAPOutstanding: number;
  apAgingBuckets: { bucket: string; amount: number; count: number }[];
  cashFlowProjection: number | null;
}

export interface CustomerIssueMetrics {
  totalOpenIssues: number;
  unresolvedEscalations: number;
  missedFollowUps: number;
  averageResolutionTime: number | null;
  issuesBySentiment: { sentiment: string; count: number }[];
  recentEscalations: { id: string; summary: string | null; escalatedAt: Date }[];
}

export interface TeamCapacityMetrics {
  totalTeamMembers: number;
  averageTaskLoad: number;
  overloadedMembers: { userId: string; userName: string; taskCount: number; maxCapacity: number }[];
  underutilizedMembers: { userId: string; userName: string; taskCount: number }[];
  capacityByRole: { role: string; memberCount: number; averageLoad: number }[];
}

// =============================================================================
// Task Health Queries
// =============================================================================

/**
 * Get task health metrics for anomaly detection
 */
export async function getTaskHealthMetrics(): Promise<TaskHealthMetrics> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);

  // Get call tasks summary
  const allTasks = await database
    .select({
      id: callTask.id,
      status: callTask.status,
      priority: callTask.priority,
      dueDate: callTask.dueDate,
      completedAt: callTask.completedAt,
      assignedTo: callTask.assignedTo,
      createdAt: callTask.createdAt,
    })
    .from(callTask);

  const totalTasks = allTasks.length;
  const now_ts = now.getTime();

  // Calculate overdue tasks (due date passed, not completed)
  const overdueTasks = allTasks.filter(
    (t) => t.dueDate && t.dueDate.getTime() < now_ts && t.status !== "completed" && t.status !== "cancelled"
  ).length;

  // Calculate completed today
  const completedToday = allTasks.filter(
    (t) => t.completedAt && t.completedAt >= todayStart
  ).length;

  // Calculate completed this week
  const completedThisWeek = allTasks.filter(
    (t) => t.completedAt && t.completedAt >= weekStart
  ).length;

  // Status counts
  const pendingTasks = allTasks.filter((t) => t.status === "pending").length;
  const inProgressTasks = allTasks.filter((t) => t.status === "in_progress").length;
  const blockedTasks = allTasks.filter((t) => t.status === "blocked").length;

  // Tasks by user
  const taskCountByUser = new Map<string, number>();
  for (const task of allTasks) {
    if (task.assignedTo && task.status !== "completed" && task.status !== "cancelled") {
      taskCountByUser.set(
        task.assignedTo,
        (taskCountByUser.get(task.assignedTo) || 0) + 1
      );
    }
  }

  // Get user names for task assignments
  const userIds = Array.from(taskCountByUser.keys());
  const users = userIds.length > 0
    ? await database
        .select({ id: user.id, name: user.name })
        .from(user)
        .where(sql`${user.id} IN ${userIds}`)
    : [];

  const userNameMap = new Map(users.map((u) => [u.id, u.name]));
  const tasksByUser = Array.from(taskCountByUser.entries()).map(([userId, taskCount]) => ({
    userId,
    userName: userNameMap.get(userId) || "Unknown",
    taskCount,
  }));

  // Calculate average completion time (in hours)
  const completedTasksWithTime = allTasks.filter(
    (t) => t.completedAt && t.createdAt
  );
  const averageCompletionTime =
    completedTasksWithTime.length > 0
      ? completedTasksWithTime.reduce(
          (sum, t) =>
            sum + (t.completedAt!.getTime() - t.createdAt.getTime()) / (1000 * 60 * 60),
          0
        ) / completedTasksWithTime.length
      : null;

  return {
    totalTasks,
    overdueTasks,
    overduePercentage: totalTasks > 0 ? (overdueTasks / totalTasks) * 100 : 0,
    completedToday,
    completedThisWeek,
    pendingTasks,
    inProgressTasks,
    blockedTasks,
    tasksByUser,
    averageCompletionTime,
  };
}

// =============================================================================
// Expense Health Queries
// =============================================================================

/**
 * Get expense health metrics for anomaly detection
 */
export async function getExpenseHealthMetrics(): Promise<ExpenseHealthMetrics> {
  const now = new Date();

  // Get expense requests pending approval
  const pendingRequests = await database
    .select({
      id: expenseRequest.id,
      amount: expenseRequest.amount,
      currency: expenseRequest.currency,
      purpose: expenseRequest.purpose,
      status: expenseRequest.status,
      requesterId: expenseRequest.requesterId,
      createdAt: expenseRequest.createdAt,
      approvedAt: expenseRequest.approvedAt,
    })
    .from(expenseRequest)
    .where(eq(expenseRequest.status, "pending"));

  const totalPendingApproval = pendingRequests.length;

  // Calculate oldest pending request
  const oldestPendingDays = pendingRequests.length > 0
    ? Math.max(
        ...pendingRequests.map((r) =>
          Math.floor((now.getTime() - r.createdAt.getTime()) / (1000 * 60 * 60 * 24))
        )
      )
    : null;

  // Get vouchers awaiting receipts
  const vouchersAwaitingReceipts = await database
    .select({ id: expenseVoucher.id })
    .from(expenseVoucher)
    .where(
      and(
        eq(expenseVoucher.status, "disbursed"),
        or(
          isNull(expenseVoucher.receiptAttachments),
          eq(expenseVoucher.receiptAttachments, ""),
          eq(expenseVoucher.receiptAttachments, "[]")
        )
      )
    );

  // Get vouchers pending reconciliation
  const vouchersPendingReconciliation = await database
    .select({ id: expenseVoucher.id })
    .from(expenseVoucher)
    .where(
      and(
        eq(expenseVoucher.postingStatus, "posted"),
        eq(expenseVoucher.reconciliationStatus, "unreconciled")
      )
    );

  // Calculate total amount pending
  const totalAmountPending = pendingRequests.reduce(
    (sum, r) => sum + parseFloat(r.amount || "0"),
    0
  );

  // Get expenses by status summary
  const allRequests = await database
    .select({
      status: expenseRequest.status,
      amount: expenseRequest.amount,
    })
    .from(expenseRequest);

  const statusSummary = new Map<string, { count: number; totalAmount: number }>();
  for (const req of allRequests) {
    const current = statusSummary.get(req.status) || { count: 0, totalAmount: 0 };
    statusSummary.set(req.status, {
      count: current.count + 1,
      totalAmount: current.totalAmount + parseFloat(req.amount || "0"),
    });
  }

  const expensesByStatus = Array.from(statusSummary.entries()).map(([status, data]) => ({
    status,
    count: data.count,
    totalAmount: data.totalAmount,
  }));

  // Find large expenses (above average * 3)
  const avgAmount = totalAmountPending / Math.max(pendingRequests.length, 1);
  const threshold = avgAmount * 3;
  const largeExpenses = pendingRequests
    .filter((r) => parseFloat(r.amount || "0") > threshold)
    .map((r) => ({
      id: r.id,
      amount: parseFloat(r.amount || "0"),
      purpose: r.purpose,
      requesterId: r.requesterId,
    }));

  // Calculate average approval time
  const approvedRequests = await database
    .select({
      createdAt: expenseRequest.createdAt,
      approvedAt: expenseRequest.approvedAt,
    })
    .from(expenseRequest)
    .where(
      and(
        eq(expenseRequest.status, "approved"),
        sql`${expenseRequest.approvedAt} IS NOT NULL`
      )
    )
    .limit(100);

  const averageApprovalTime =
    approvedRequests.length > 0
      ? approvedRequests.reduce(
          (sum, r) =>
            sum +
            (r.approvedAt!.getTime() - r.createdAt.getTime()) / (1000 * 60 * 60),
          0
        ) / approvedRequests.length
      : null;

  return {
    totalPendingApproval,
    oldestPendingDays,
    totalAwaitingReceipts: vouchersAwaitingReceipts.length,
    totalPendingReconciliation: vouchersPendingReconciliation.length,
    totalAmountPending,
    averageApprovalTime,
    expensesByStatus,
    largeExpenses,
  };
}

// =============================================================================
// Financial Health Queries (placeholder - would integrate with Odoo)
// =============================================================================

/**
 * Get financial health metrics
 * Note: In production, this would integrate with Odoo ERP for AR/AP data
 */
export async function getFinancialHealthMetrics(): Promise<FinancialHealthMetrics> {
  // Placeholder metrics - would be replaced with actual Odoo integration
  // For now, return mock data structure
  return {
    totalAROutstanding: 0,
    arAgingBuckets: [
      { bucket: "0-30 days", amount: 0, count: 0 },
      { bucket: "31-60 days", amount: 0, count: 0 },
      { bucket: "61-90 days", amount: 0, count: 0 },
      { bucket: "90+ days", amount: 0, count: 0 },
    ],
    overdueInvoicesCount: 0,
    overdueInvoicesAmount: 0,
    totalAPOutstanding: 0,
    apAgingBuckets: [
      { bucket: "0-30 days", amount: 0, count: 0 },
      { bucket: "31-60 days", amount: 0, count: 0 },
      { bucket: "61-90 days", amount: 0, count: 0 },
      { bucket: "90+ days", amount: 0, count: 0 },
    ],
    cashFlowProjection: null,
  };
}

// =============================================================================
// Customer Issue Queries
// =============================================================================

/**
 * Get customer issue metrics from call records and dispositions
 */
export async function getCustomerIssueMetrics(): Promise<CustomerIssueMetrics> {
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Get call dispositions with follow-up needed or escalated
  // Note: disposition can be "resolved", "follow_up_needed", or "escalate"
  // followUpDate exists but followUpRequired/followUpCompleted do not exist in schema
  const dispositions = await database
    .select({
      id: callDisposition.id,
      disposition: callDisposition.disposition,
      customerSentiment: callDisposition.customerSentiment,
      followUpDate: callDisposition.followUpDate,
      createdAt: callDisposition.createdAt,
      callRecordId: callDisposition.callRecordId,
    })
    .from(callDisposition);

  // Count unresolved escalations (escalated dispositions without resolved follow-up)
  // We consider an escalation "unresolved" if it's escalated type
  const unresolvedEscalations = dispositions.filter(
    (d) => d.disposition === "escalate"
  ).length;

  // Count missed follow-ups (follow-up date passed for follow_up_needed dispositions)
  const missedFollowUps = dispositions.filter(
    (d) =>
      d.disposition === "follow_up_needed" &&
      d.followUpDate &&
      d.followUpDate.getTime() < now.getTime()
  ).length;

  // Total open issues (needs follow-up or escalated)
  const totalOpenIssues = dispositions.filter(
    (d) =>
      d.disposition === "follow_up_needed" || d.disposition === "escalate"
  ).length;

  // Issues by sentiment
  const sentimentCounts = new Map<string, number>();
  for (const d of dispositions) {
    if (d.customerSentiment) {
      sentimentCounts.set(
        d.customerSentiment,
        (sentimentCounts.get(d.customerSentiment) || 0) + 1
      );
    }
  }
  const issuesBySentiment = Array.from(sentimentCounts.entries()).map(
    ([sentiment, count]) => ({ sentiment, count })
  );

  // Get recent escalations with call record details
  const escalations = dispositions
    .filter((d) => d.disposition === "escalate")
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 5);

  const callRecordIds = escalations.map((e) => e.callRecordId);
  const callRecords =
    callRecordIds.length > 0
      ? await database
          .select({ id: callRecord.id, summary: callRecord.summary })
          .from(callRecord)
          .where(sql`${callRecord.id} IN ${callRecordIds}`)
      : [];

  const callRecordMap = new Map(callRecords.map((c) => [c.id, c.summary]));

  const recentEscalations = escalations.map((e) => ({
    id: e.id,
    summary: callRecordMap.get(e.callRecordId) || null,
    escalatedAt: e.createdAt,
  }));

  // Calculate average resolution time (placeholder)
  const averageResolutionTime = null;

  return {
    totalOpenIssues,
    unresolvedEscalations,
    missedFollowUps,
    averageResolutionTime,
    issuesBySentiment,
    recentEscalations,
  };
}

// =============================================================================
// Team Capacity Queries
// =============================================================================

/**
 * Get team capacity metrics
 */
export async function getTeamCapacityMetrics(): Promise<TeamCapacityMetrics> {
  const DEFAULT_MAX_CAPACITY = 15; // Default max tasks per user

  // Get all active users
  const allUsers = await database
    .select({
      id: user.id,
      name: user.name,
      role: user.role,
    })
    .from(user)
    .where(
      and(
        or(
          eq(user.subscriptionStatus, "active"),
          isNull(user.subscriptionStatus)
        )
      )
    );

  // Get task counts per user (non-completed tasks)
  const tasks = await database
    .select({
      assignedTo: callTask.assignedTo,
    })
    .from(callTask)
    .where(
      and(
        ne(callTask.status, "completed"),
        ne(callTask.status, "cancelled"),
        sql`${callTask.assignedTo} IS NOT NULL`
      )
    );

  // Count tasks per user
  const taskCountByUser = new Map<string, number>();
  for (const task of tasks) {
    if (task.assignedTo) {
      taskCountByUser.set(
        task.assignedTo,
        (taskCountByUser.get(task.assignedTo) || 0) + 1
      );
    }
  }

  const totalTeamMembers = allUsers.length;

  // Calculate average task load
  const totalTasks = Array.from(taskCountByUser.values()).reduce((a, b) => a + b, 0);
  const averageTaskLoad = totalTeamMembers > 0 ? totalTasks / totalTeamMembers : 0;

  // Find overloaded members (> 80% of max capacity)
  const overloadedMembers = allUsers
    .filter((u) => {
      const taskCount = taskCountByUser.get(u.id) || 0;
      return taskCount > DEFAULT_MAX_CAPACITY * 0.8;
    })
    .map((u) => ({
      userId: u.id,
      userName: u.name,
      taskCount: taskCountByUser.get(u.id) || 0,
      maxCapacity: DEFAULT_MAX_CAPACITY,
    }));

  // Find underutilized members (< 30% of average)
  const underutilizationThreshold = averageTaskLoad * 0.3;
  const underutilizedMembers = allUsers
    .filter((u) => {
      const taskCount = taskCountByUser.get(u.id) || 0;
      return taskCount < underutilizationThreshold && taskCount > 0;
    })
    .map((u) => ({
      userId: u.id,
      userName: u.name,
      taskCount: taskCountByUser.get(u.id) || 0,
    }));

  // Capacity by role
  const roleStats = new Map<string, { memberCount: number; totalTasks: number }>();
  for (const u of allUsers) {
    const role = u.role || "unassigned";
    const taskCount = taskCountByUser.get(u.id) || 0;
    const current = roleStats.get(role) || { memberCount: 0, totalTasks: 0 };
    roleStats.set(role, {
      memberCount: current.memberCount + 1,
      totalTasks: current.totalTasks + taskCount,
    });
  }

  const capacityByRole = Array.from(roleStats.entries()).map(([role, stats]) => ({
    role,
    memberCount: stats.memberCount,
    averageLoad: stats.memberCount > 0 ? stats.totalTasks / stats.memberCount : 0,
  }));

  return {
    totalTeamMembers,
    averageTaskLoad,
    overloadedMembers,
    underutilizedMembers,
    capacityByRole,
  };
}

// =============================================================================
// Historical Data for Trend Analysis
// =============================================================================

/**
 * Get historical task completion data for trend analysis
 */
export async function getTaskCompletionTrend(days: number = 7): Promise<{ date: string; completed: number }[]> {
  const result: { date: string; completed: number }[] = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];

    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    const completedTasks = await database
      .select({ id: callTask.id })
      .from(callTask)
      .where(
        and(
          gte(callTask.completedAt, dayStart),
          lt(callTask.completedAt, dayEnd)
        )
      );

    result.push({
      date: dateStr,
      completed: completedTasks.length,
    });
  }

  return result;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if current time is within quiet hours
 */
export function isWithinQuietHours(
  timezone: string,
  quietHoursStart: string,
  quietHoursEnd: string
): boolean {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: timezone,
    });
    const currentTime = formatter.format(now);

    const [currentHour, currentMinute] = currentTime.split(":").map(Number);
    const [startHour, startMinute] = quietHoursStart.split(":").map(Number);
    const [endHour, endMinute] = quietHoursEnd.split(":").map(Number);

    const currentMinutes = currentHour * 60 + currentMinute;
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    // Handle overnight quiet hours (e.g., 22:00 - 08:00)
    if (startMinutes > endMinutes) {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }

    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } catch {
    return false;
  }
}

/**
 * Check if today is a working day
 */
export function isWorkingDay(timezone: string, workingDays: number[]): boolean {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      timeZone: timezone,
    });
    const dayName = formatter.format(now);

    const dayMap: Record<string, number> = {
      Sunday: 0,
      Monday: 1,
      Tuesday: 2,
      Wednesday: 3,
      Thursday: 4,
      Friday: 5,
      Saturday: 6,
    };

    const currentDay = dayMap[dayName];
    return workingDays.includes(currentDay);
  } catch {
    return true;
  }
}
