import { createServerFn } from "@tanstack/react-start";
import { assertSalesMiddleware } from "./middleware";
import { getSalesDashboardStats } from "~/data-access/sales-dashboard";

/**
 * Sales Dashboard Data Types
 */

// Pipeline Stage with deal counts and values
export interface PipelineStage {
  id: string;
  name: string;
  deals: number;
  value: number;
  conversionRate: number;
}

// Sales Pipeline Overview
export interface SalesPipeline {
  totalDeals: number;
  totalValue: number;
  weightedValue: number;
  stages: PipelineStage[];
  averageDealSize: number;
  winRate: number;
  avgSalesCycle: number; // in days
}

// Customer Interaction Types
export interface CustomerInteraction {
  id: string;
  customerId: string;
  customerName: string;
  type: "call" | "email" | "meeting" | "demo" | "follow-up";
  subject: string;
  status: "completed" | "scheduled" | "pending" | "cancelled";
  scheduledAt: Date;
  completedAt?: Date;
  notes?: string;
  priority: "high" | "normal" | "low";
}

export interface CustomerInteractionsData {
  total: number;
  completed: number;
  scheduled: number;
  pending: number;
  todayActivities: number;
  overdue: number;
  recentInteractions: CustomerInteraction[];
  upcomingInteractions: CustomerInteraction[];
}

// Quotation Types
export interface QuotationItem {
  id: string;
  quotationNumber: string;
  customerName: string;
  amount: number;
  status: "draft" | "sent" | "viewed" | "accepted" | "rejected" | "expired";
  createdAt: Date;
  expiresAt: Date;
  lastViewed?: Date;
  probability: number;
}

export interface QuotationStatusData {
  totalQuotations: number;
  totalValue: number;
  byStatus: {
    draft: number;
    sent: number;
    viewed: number;
    accepted: number;
    rejected: number;
    expired: number;
  };
  conversionRate: number;
  avgResponseTime: string;
  recentQuotations: QuotationItem[];
  pendingFollowUps: number;
}

// Revenue Target Types
export interface RevenueTarget {
  period: "monthly" | "quarterly" | "yearly";
  target: number;
  achieved: number;
  percentage: number;
  remaining: number;
  daysRemaining: number;
  projectedCompletion: number;
  trend: "on-track" | "at-risk" | "behind" | "exceeding";
}

export interface RevenueTargetData {
  monthly: RevenueTarget;
  quarterly: RevenueTarget;
  yearly: RevenueTarget;
  topPerformers: Array<{
    salesPersonId: string;
    name: string;
    achieved: number;
    target: number;
    percentage: number;
  }>;
  revenueByProduct: Array<{
    productName: string;
    revenue: number;
    percentage: number;
  }>;
}

// Opportunity Types
export interface Opportunity {
  id: string;
  name: string;
  customerName: string;
  value: number;
  probability: number;
  expectedCloseDate: Date;
  stage: string;
  priority: "hot" | "warm" | "cold";
  lastActivity: Date;
  daysInStage: number;
  nextAction?: string;
}

export interface OpportunityTrackingData {
  totalOpportunities: number;
  totalValue: number;
  hotOpportunities: number;
  warmOpportunities: number;
  coldOpportunities: number;
  closingSoon: number; // within 7 days
  stalled: number; // no activity in 14+ days
  opportunities: Opportunity[];
  winLossRatio: {
    won: number;
    lost: number;
    ratio: number;
  };
}

// Complete Sales Dashboard Data
export interface SalesDashboardData {
  pipeline: SalesPipeline;
  interactions: CustomerInteractionsData;
  quotations: QuotationStatusData;
  revenueTargets: RevenueTargetData;
  opportunities: OpportunityTrackingData;
  lastUpdated: Date;
}

/**
 * Get complete Sales dashboard data
 * This server function fetches all the data needed for the Sales dashboard
 */
export const getSalesDashboardDataFn = createServerFn({
  method: "GET",
})
  .middleware([assertSalesMiddleware])
  .handler(async (): Promise<SalesDashboardData> => {
    const stats = await getSalesDashboardStats();
    return stats;
  });

/**
 * Get sales pipeline overview
 */
export const getSalesPipelineFn = createServerFn({
  method: "GET",
})
  .middleware([assertSalesMiddleware])
  .handler(async (): Promise<SalesPipeline> => {
    const stats = await getSalesDashboardStats();
    return stats.pipeline;
  });

/**
 * Get customer interactions data
 */
export const getCustomerInteractionsFn = createServerFn({
  method: "GET",
})
  .middleware([assertSalesMiddleware])
  .handler(async (): Promise<CustomerInteractionsData> => {
    const stats = await getSalesDashboardStats();
    return stats.interactions;
  });

/**
 * Get quotation status data
 */
export const getQuotationStatusFn = createServerFn({
  method: "GET",
})
  .middleware([assertSalesMiddleware])
  .handler(async (): Promise<QuotationStatusData> => {
    const stats = await getSalesDashboardStats();
    return stats.quotations;
  });

/**
 * Get revenue targets data
 */
export const getRevenueTargetsFn = createServerFn({
  method: "GET",
})
  .middleware([assertSalesMiddleware])
  .handler(async (): Promise<RevenueTargetData> => {
    const stats = await getSalesDashboardStats();
    return stats.revenueTargets;
  });

/**
 * Get opportunity tracking data
 */
export const getOpportunityTrackingFn = createServerFn({
  method: "GET",
})
  .middleware([assertSalesMiddleware])
  .handler(async (): Promise<OpportunityTrackingData> => {
    const stats = await getSalesDashboardStats();
    return stats.opportunities;
  });
