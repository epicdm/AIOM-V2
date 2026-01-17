import { createServerFn } from "@tanstack/react-start";
import { assertMDMiddleware } from "./middleware";
import { getMDDashboardStats } from "~/data-access/md-dashboard";

/**
 * MD Dashboard Data Types
 */
export interface FinancialOverview {
  revenue: {
    currentMonth: number;
    lastMonth: number;
    ytd: number;
    monthOverMonthChange: number;
  };
  expenses: {
    currentMonth: number;
    lastMonth: number;
    ytd: number;
    monthOverMonthChange: number;
    pendingValue: number;
  };
  profitMargin: {
    currentMonth: number;
    ytd: number;
    target: number;
  };
  cashFlow: {
    status: "positive" | "negative" | "neutral";
    runway: string;
    trend: "improving" | "declining" | "stable";
  };
}

export interface PendingApprovalItem {
  id: string;
  title: string;
  amount: number;
  priority: string;
  submittedAt: Date;
  daysWaiting: number;
}

export interface PendingApprovals {
  total: number;
  urgent: number;
  highPriority: number;
  normalPriority: number;
  lowPriority: number;
  totalValue: number;
  items: PendingApprovalItem[];
  contracts: number;
  budgetRequests: number;
  hiringRequests: number;
}

export interface TeamCapacity {
  totalStaff: number;
  byDepartment: {
    fieldTech: number;
    sales: number;
    admin: number;
  };
  utilization: {
    overall: number;
    fieldTech: number;
    sales: number;
  };
  availability: {
    onDuty: number;
    onLeave: number;
    unavailable: number;
  };
  openPositions: number;
  upcomingTimeOff: number;
}

export interface KeyMetrics {
  customerSatisfaction: {
    current: number;
    target: number;
    trend: "up" | "down" | "stable";
  };
  operationalEfficiency: {
    current: number;
    target: number;
    trend: "up" | "down" | "stable";
  };
  revenueGrowth: {
    current: number;
    target: number;
    trend: "up" | "down" | "stable";
  };
  employeeRetention: {
    current: number;
    target: number;
    trend: "up" | "down" | "stable";
  };
  expenseApprovalRate: {
    current: number;
    avgProcessingTime: string;
    trend: "up" | "down" | "stable";
  };
  projectCompletion: {
    onTime: number;
    delayed: number;
    atRisk: number;
  };
}

export interface ExecutiveBriefingItem {
  id: string;
  type: "alert" | "insight" | "action" | "update";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  timestamp: Date;
  actionRequired: boolean;
}

export interface ExecutiveBriefing {
  items: ExecutiveBriefingItem[];
  summary: {
    total: number;
    actionRequired: number;
    highPriority: number;
    newToday: number;
  };
}

export interface MDDashboardData {
  financialOverview: FinancialOverview;
  pendingApprovals: PendingApprovals;
  teamCapacity: TeamCapacity;
  keyMetrics: KeyMetrics;
  executiveBriefing: ExecutiveBriefing;
}

/**
 * Get MD dashboard data
 * This server function fetches all the data needed for the MD dashboard
 */
export const getMDDashboardDataFn = createServerFn({
  method: "GET",
})
  .middleware([assertMDMiddleware])
  .handler(async (): Promise<MDDashboardData> => {
    const stats = await getMDDashboardStats();
    return stats;
  });

/**
 * Get financial overview for MD
 */
export const getFinancialOverviewFn = createServerFn({
  method: "GET",
})
  .middleware([assertMDMiddleware])
  .handler(async (): Promise<FinancialOverview> => {
    const stats = await getMDDashboardStats();
    return stats.financialOverview;
  });

/**
 * Get pending approvals for MD
 */
export const getPendingApprovalsFn = createServerFn({
  method: "GET",
})
  .middleware([assertMDMiddleware])
  .handler(async (): Promise<PendingApprovals> => {
    const stats = await getMDDashboardStats();
    return stats.pendingApprovals;
  });

/**
 * Get team capacity for MD
 */
export const getTeamCapacityFn = createServerFn({
  method: "GET",
})
  .middleware([assertMDMiddleware])
  .handler(async (): Promise<TeamCapacity> => {
    const stats = await getMDDashboardStats();
    return stats.teamCapacity;
  });

/**
 * Get key metrics for MD
 */
export const getKeyMetricsFn = createServerFn({
  method: "GET",
})
  .middleware([assertMDMiddleware])
  .handler(async (): Promise<KeyMetrics> => {
    const stats = await getMDDashboardStats();
    return stats.keyMetrics;
  });

/**
 * Get executive briefing for MD
 */
export const getExecutiveBriefingFn = createServerFn({
  method: "GET",
})
  .middleware([assertMDMiddleware])
  .handler(async (): Promise<ExecutiveBriefing> => {
    const stats = await getMDDashboardStats();
    return stats.executiveBriefing;
  });
