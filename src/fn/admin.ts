import { createServerFn } from "@tanstack/react-start";
import { assertAdminMiddleware } from "./middleware";
import { getAdminDashboardStats } from "~/data-access/admin";

/**
 * Admin Dashboard Data Types
 */
export interface SystemHealth {
  status: "healthy" | "degraded" | "critical";
  uptime: number;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  activeConnections: number;
}

export interface PendingApprovals {
  total: number;
  expenses: number;
  documents: number;
  access: number;
}

export interface DocumentQueue {
  total: number;
  processing: number;
  pending: number;
  completed: number;
  failed: number;
}

export interface UserStats {
  totalUsers: number;
  activeToday: number;
  newThisWeek: number;
  byRole: {
    md: number;
    admin: number;
    "field-tech": number;
    sales: number;
  };
}

export interface WorkflowStats {
  active: number;
  completed: number;
  failed: number;
  averageTime: string;
}

export interface RecentActivity {
  id: string;
  type: "approval" | "document" | "user" | "workflow";
  title: string;
  user: string;
  time: string;
}

export interface AdminDashboardData {
  systemHealth: SystemHealth;
  pendingApprovals: PendingApprovals;
  documentQueue: DocumentQueue;
  userStats: UserStats;
  workflows: WorkflowStats;
  recentActivity: RecentActivity[];
}

/**
 * Get admin dashboard data
 * This server function fetches all the data needed for the admin dashboard
 */
export const getAdminDashboardDataFn = createServerFn({
  method: "GET",
})
  .middleware([assertAdminMiddleware])
  .handler(async (): Promise<AdminDashboardData> => {
    // Fetch real data from database
    const stats = await getAdminDashboardStats();
    return stats;
  });

/**
 * Get system health metrics
 */
export const getSystemHealthFn = createServerFn({
  method: "GET",
})
  .middleware([assertAdminMiddleware])
  .handler(async (): Promise<SystemHealth> => {
    const stats = await getAdminDashboardStats();
    return stats.systemHealth;
  });

/**
 * Get pending approvals summary
 */
export const getPendingApprovalsSummaryFn = createServerFn({
  method: "GET",
})
  .middleware([assertAdminMiddleware])
  .handler(async (): Promise<PendingApprovals> => {
    const stats = await getAdminDashboardStats();
    return stats.pendingApprovals;
  });

/**
 * Get document queue status
 */
export const getDocumentQueueStatusFn = createServerFn({
  method: "GET",
})
  .middleware([assertAdminMiddleware])
  .handler(async (): Promise<DocumentQueue> => {
    const stats = await getAdminDashboardStats();
    return stats.documentQueue;
  });

/**
 * Get user statistics
 */
export const getUserStatsFn = createServerFn({
  method: "GET",
})
  .middleware([assertAdminMiddleware])
  .handler(async (): Promise<UserStats> => {
    const stats = await getAdminDashboardStats();
    return stats.userStats;
  });

/**
 * Get workflow statistics
 */
export const getWorkflowStatsFn = createServerFn({
  method: "GET",
})
  .middleware([assertAdminMiddleware])
  .handler(async (): Promise<WorkflowStats> => {
    const stats = await getAdminDashboardStats();
    return stats.workflows;
  });
