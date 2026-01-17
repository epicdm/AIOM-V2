import { eq, sql, count, gte, and, or } from "drizzle-orm";
import { database } from "~/db";
import { user, expenseRequest, kycVerification } from "~/db/schema";
import type { AdminDashboardData } from "~/fn/admin";

/**
 * Get admin dashboard statistics
 * Aggregates data from various sources for the admin dashboard
 */
export async function getAdminDashboardStats(): Promise<AdminDashboardData> {
  // Get user statistics
  const userStats = await getUserStats();

  // Get pending approvals
  const pendingApprovals = await getPendingApprovalsStats();

  // Get system health (simulated for now - could integrate with actual monitoring)
  const systemHealth = getSystemHealth();

  // Get document queue stats (simulated - would integrate with document processing system)
  const documentQueue = getDocumentQueueStats();

  // Get workflow stats (simulated - would integrate with workflow engine)
  const workflows = getWorkflowStats();

  // Get recent activity
  const recentActivity = await getRecentActivity();

  return {
    systemHealth,
    pendingApprovals,
    documentQueue,
    userStats,
    workflows,
    recentActivity,
  };
}

/**
 * Get user statistics from database
 */
async function getUserStats() {
  // Get total users
  const [totalResult] = await database
    .select({ count: count() })
    .from(user);
  const totalUsers = totalResult?.count ?? 0;

  // Get users by role
  const roleResults = await database
    .select({
      role: user.role,
      count: count(),
    })
    .from(user)
    .groupBy(user.role);

  const byRole = {
    md: 0,
    admin: 0,
    "field-tech": 0,
    sales: 0,
  };

  roleResults.forEach((r) => {
    if (r.role && r.role in byRole) {
      byRole[r.role as keyof typeof byRole] = r.count;
    }
  });

  // Get active users today (users who have updated their session today)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // For now, use a simplified approach - count users updated today
  const [activeResult] = await database
    .select({ count: count() })
    .from(user)
    .where(gte(user.updatedAt, today));
  const activeToday = activeResult?.count ?? 0;

  // Get new users this week
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [newResult] = await database
    .select({ count: count() })
    .from(user)
    .where(gte(user.createdAt, weekAgo));
  const newThisWeek = newResult?.count ?? 0;

  return {
    totalUsers,
    activeToday,
    newThisWeek,
    byRole,
  };
}

/**
 * Get pending approvals statistics
 */
async function getPendingApprovalsStats() {
  // Get pending expense requests
  const [expenseResult] = await database
    .select({ count: count() })
    .from(expenseRequest)
    .where(eq(expenseRequest.status, "pending"));
  const expenses = expenseResult?.count ?? 0;

  // Get pending KYC verifications (submitted or under review)
  const [kycResult] = await database
    .select({ count: count() })
    .from(kycVerification)
    .where(
      or(
        eq(kycVerification.status, "submitted"),
        eq(kycVerification.status, "under_review")
      )
    );
  const kycPending = kycResult?.count ?? 0;

  // For now, simulate access approvals
  // These would come from their respective tables when implemented
  const access = 0;

  return {
    total: expenses + kycPending + access,
    expenses,
    documents: kycPending, // KYC verifications now go into documents count
    access,
  };
}

/**
 * Get system health metrics
 * In production, this would integrate with actual monitoring systems
 */
function getSystemHealth() {
  // Simulated system health metrics
  // In production, integrate with:
  // - Process metrics (os.cpus(), process.memoryUsage())
  // - Database connection pool stats
  // - External monitoring services (Datadog, New Relic, etc.)

  return {
    status: "healthy" as const,
    uptime: 99.9,
    cpuUsage: Math.floor(Math.random() * 30) + 20, // 20-50%
    memoryUsage: Math.floor(Math.random() * 30) + 40, // 40-70%
    diskUsage: Math.floor(Math.random() * 20) + 30, // 30-50%
    activeConnections: Math.floor(Math.random() * 100) + 50, // 50-150
  };
}

/**
 * Get document queue statistics
 * In production, this would integrate with document processing system
 */
function getDocumentQueueStats() {
  // Simulated document queue stats
  // Would integrate with actual document processing queue
  const total = Math.floor(Math.random() * 20) + 10;
  const processing = Math.floor(total * 0.2);
  const pending = Math.floor(total * 0.5);
  const completed = total - processing - pending;

  return {
    total,
    processing,
    pending,
    completed,
    failed: 0,
  };
}

/**
 * Get workflow statistics
 * In production, this would integrate with workflow engine
 */
function getWorkflowStats() {
  // Simulated workflow stats
  // Would integrate with expense-workflow-engine or other workflow systems
  return {
    active: Math.floor(Math.random() * 10) + 5,
    completed: Math.floor(Math.random() * 200) + 100,
    failed: Math.floor(Math.random() * 3),
    averageTime: `${(Math.random() * 3 + 1).toFixed(1)}h`,
  };
}

/**
 * Get recent activity
 * Aggregates recent actions across the system
 */
async function getRecentActivity() {
  // Get recent expense approvals
  const recentExpenses = await database
    .select({
      id: expenseRequest.id,
      status: expenseRequest.status,
      purpose: expenseRequest.purpose,
      updatedAt: expenseRequest.updatedAt,
    })
    .from(expenseRequest)
    .orderBy(sql`${expenseRequest.updatedAt} DESC`)
    .limit(5);

  const activities: Array<{
    id: string;
    type: "approval" | "document" | "user" | "workflow";
    title: string;
    user: string;
    time: string;
  }> = recentExpenses.map((expense) => ({
    id: expense.id,
    type: "approval" as const,
    title: expense.status === "approved"
      ? `Expense approved: ${expense.purpose.substring(0, 30)}...`
      : expense.status === "rejected"
      ? `Expense rejected: ${expense.purpose.substring(0, 30)}...`
      : `New expense request: ${expense.purpose.substring(0, 30)}...`,
    user: "System",
    time: getTimeAgo(expense.updatedAt),
  }));

  // Pad with simulated activities if we have fewer than 4
  const simulatedTypes: Array<"document" | "user" | "workflow"> = ["document", "user", "workflow"];
  let simIndex = 0;
  while (activities.length < 4) {
    const type = simulatedTypes[simIndex % simulatedTypes.length];
    activities.push({
      id: `simulated-${activities.length}`,
      type,
      title: type === "document"
        ? "Document processed"
        : type === "user"
        ? "New user registered"
        : "Workflow completed",
      user: "System",
      time: `${activities.length + 1}h ago`,
    });
    simIndex++;
  }

  return activities;
}

/**
 * Format time ago string
 */
function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
