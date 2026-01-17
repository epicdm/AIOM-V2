import type {
  SalesDashboardData,
  SalesPipeline,
  CustomerInteractionsData,
  QuotationStatusData,
  RevenueTargetData,
  OpportunityTrackingData,
  PipelineStage,
  CustomerInteraction,
  QuotationItem,
  Opportunity,
} from "~/fn/sales";

/**
 * Get complete Sales Dashboard statistics
 * Aggregates sales data for the Sales dashboard
 */
export async function getSalesDashboardStats(): Promise<SalesDashboardData> {
  // Get all dashboard data in parallel for better performance
  const [
    pipeline,
    interactions,
    quotations,
    revenueTargets,
    opportunities,
  ] = await Promise.all([
    getSalesPipeline(),
    getCustomerInteractions(),
    getQuotationStatus(),
    getRevenueTargets(),
    getOpportunityTracking(),
  ]);

  return {
    pipeline,
    interactions,
    quotations,
    revenueTargets,
    opportunities,
    lastUpdated: new Date(),
  };
}

/**
 * Get Sales Pipeline data
 * Simulated data - would integrate with Odoo CRM in production
 */
async function getSalesPipeline(): Promise<SalesPipeline> {
  // Pipeline stages with simulated data
  const stages: PipelineStage[] = [
    {
      id: "lead",
      name: "Lead",
      deals: 45,
      value: 450000,
      conversionRate: 65,
    },
    {
      id: "qualified",
      name: "Qualified",
      deals: 32,
      value: 520000,
      conversionRate: 72,
    },
    {
      id: "proposal",
      name: "Proposal",
      deals: 18,
      value: 380000,
      conversionRate: 78,
    },
    {
      id: "negotiation",
      name: "Negotiation",
      deals: 12,
      value: 285000,
      conversionRate: 85,
    },
    {
      id: "closed-won",
      name: "Closed Won",
      deals: 8,
      value: 195000,
      conversionRate: 100,
    },
  ];

  const totalDeals = stages.reduce((sum, stage) => sum + stage.deals, 0);
  const totalValue = stages.reduce((sum, stage) => sum + stage.value, 0);

  // Calculate weighted pipeline value (probability-adjusted)
  const weightedValue = stages.reduce((sum, stage) => {
    const probability = stage.conversionRate / 100;
    return sum + (stage.value * probability);
  }, 0);

  return {
    totalDeals,
    totalValue,
    weightedValue: Math.round(weightedValue),
    stages,
    averageDealSize: Math.round(totalValue / totalDeals),
    winRate: 68, // Simulated win rate percentage
    avgSalesCycle: 32, // Average sales cycle in days
  };
}

/**
 * Get Customer Interactions data
 * Simulated data - would integrate with Odoo CRM/Calendar in production
 */
async function getCustomerInteractions(): Promise<CustomerInteractionsData> {
  const now = new Date();

  // Recent customer interactions
  const recentInteractions: CustomerInteraction[] = [
    {
      id: "int-1",
      customerId: "cust-1",
      customerName: "Acme Corporation",
      type: "meeting",
      subject: "Q1 Contract Review",
      status: "completed",
      scheduledAt: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
      completedAt: new Date(now.getTime() - 1 * 60 * 60 * 1000),
      notes: "Discussed renewal terms, positive feedback",
      priority: "high",
    },
    {
      id: "int-2",
      customerId: "cust-2",
      customerName: "TechStart Inc",
      type: "call",
      subject: "Product Demo Follow-up",
      status: "completed",
      scheduledAt: new Date(now.getTime() - 4 * 60 * 60 * 1000),
      completedAt: new Date(now.getTime() - 3.5 * 60 * 60 * 1000),
      priority: "normal",
    },
    {
      id: "int-3",
      customerId: "cust-3",
      customerName: "Global Industries",
      type: "email",
      subject: "Proposal Sent",
      status: "completed",
      scheduledAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      completedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      priority: "normal",
    },
  ];

  // Upcoming interactions
  const upcomingInteractions: CustomerInteraction[] = [
    {
      id: "int-4",
      customerId: "cust-4",
      customerName: "Metro Solutions",
      type: "demo",
      subject: "Product Demonstration",
      status: "scheduled",
      scheduledAt: new Date(now.getTime() + 2 * 60 * 60 * 1000), // 2 hours from now
      priority: "high",
    },
    {
      id: "int-5",
      customerId: "cust-5",
      customerName: "Prime Services",
      type: "meeting",
      subject: "Contract Negotiation",
      status: "scheduled",
      scheduledAt: new Date(now.getTime() + 24 * 60 * 60 * 1000), // Tomorrow
      priority: "high",
    },
    {
      id: "int-6",
      customerId: "cust-6",
      customerName: "City Enterprises",
      type: "follow-up",
      subject: "Quote Follow-up",
      status: "pending",
      scheduledAt: new Date(now.getTime() + 48 * 60 * 60 * 1000), // 2 days from now
      priority: "normal",
    },
    {
      id: "int-7",
      customerId: "cust-7",
      customerName: "Regional Corp",
      type: "call",
      subject: "Initial Discovery Call",
      status: "scheduled",
      scheduledAt: new Date(now.getTime() + 72 * 60 * 60 * 1000), // 3 days from now
      priority: "low",
    },
  ];

  return {
    total: 156,
    completed: 124,
    scheduled: 22,
    pending: 10,
    todayActivities: 8,
    overdue: 3,
    recentInteractions,
    upcomingInteractions,
  };
}

/**
 * Get Quotation Status data
 * Simulated data - would integrate with Odoo Sales/Quotations in production
 */
async function getQuotationStatus(): Promise<QuotationStatusData> {
  const now = new Date();

  const recentQuotations: QuotationItem[] = [
    {
      id: "quot-1",
      quotationNumber: "QT-2025-0142",
      customerName: "Acme Corporation",
      amount: 75000,
      status: "sent",
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      expiresAt: new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000),
      lastViewed: new Date(now.getTime() - 4 * 60 * 60 * 1000),
      probability: 75,
    },
    {
      id: "quot-2",
      quotationNumber: "QT-2025-0141",
      customerName: "TechStart Inc",
      amount: 42000,
      status: "viewed",
      createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      expiresAt: new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000),
      lastViewed: new Date(now.getTime() - 1 * 60 * 60 * 1000),
      probability: 80,
    },
    {
      id: "quot-3",
      quotationNumber: "QT-2025-0140",
      customerName: "Global Industries",
      amount: 125000,
      status: "sent",
      createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      expiresAt: new Date(now.getTime() + 23 * 24 * 60 * 60 * 1000),
      probability: 60,
    },
    {
      id: "quot-4",
      quotationNumber: "QT-2025-0139",
      customerName: "Metro Solutions",
      amount: 38000,
      status: "accepted",
      createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      expiresAt: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000),
      probability: 100,
    },
    {
      id: "quot-5",
      quotationNumber: "QT-2025-0138",
      customerName: "Prime Services",
      amount: 56000,
      status: "draft",
      createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      expiresAt: new Date(now.getTime() + 29 * 24 * 60 * 60 * 1000),
      probability: 50,
    },
  ];

  return {
    totalQuotations: 89,
    totalValue: 1250000,
    byStatus: {
      draft: 12,
      sent: 28,
      viewed: 18,
      accepted: 22,
      rejected: 5,
      expired: 4,
    },
    conversionRate: 62,
    avgResponseTime: "3.2 days",
    recentQuotations,
    pendingFollowUps: 15,
  };
}

/**
 * Get Revenue Targets data
 * Simulated data - would integrate with Odoo Sales analytics in production
 */
async function getRevenueTargets(): Promise<RevenueTargetData> {
  const now = new Date();

  // Calculate days remaining in month/quarter/year
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysRemainingMonth = Math.ceil((endOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  const quarter = Math.floor(now.getMonth() / 3);
  const endOfQuarter = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
  const daysRemainingQuarter = Math.ceil((endOfQuarter.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  const endOfYear = new Date(now.getFullYear(), 11, 31);
  const daysRemainingYear = Math.ceil((endOfYear.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Monthly targets
  const monthlyTarget = 500000;
  const monthlyAchieved = 385000;
  const monthlyPercentage = Math.round((monthlyAchieved / monthlyTarget) * 100);

  // Quarterly targets
  const quarterlyTarget = 1500000;
  const quarterlyAchieved = 1125000;
  const quarterlyPercentage = Math.round((quarterlyAchieved / quarterlyTarget) * 100);

  // Yearly targets
  const yearlyTarget = 6000000;
  const yearlyAchieved = 4250000;
  const yearlyPercentage = Math.round((yearlyAchieved / yearlyTarget) * 100);

  // Calculate trend based on percentage and remaining days
  function getTrend(percentage: number, daysRemaining: number, totalDays: number): "on-track" | "at-risk" | "behind" | "exceeding" {
    const expectedPercentage = ((totalDays - daysRemaining) / totalDays) * 100;
    const difference = percentage - expectedPercentage;

    if (difference > 10) return "exceeding";
    if (difference > -5) return "on-track";
    if (difference > -15) return "at-risk";
    return "behind";
  }

  return {
    monthly: {
      period: "monthly",
      target: monthlyTarget,
      achieved: monthlyAchieved,
      percentage: monthlyPercentage,
      remaining: monthlyTarget - monthlyAchieved,
      daysRemaining: daysRemainingMonth,
      projectedCompletion: Math.round(monthlyAchieved * (30 / (30 - daysRemainingMonth))),
      trend: getTrend(monthlyPercentage, daysRemainingMonth, 30),
    },
    quarterly: {
      period: "quarterly",
      target: quarterlyTarget,
      achieved: quarterlyAchieved,
      percentage: quarterlyPercentage,
      remaining: quarterlyTarget - quarterlyAchieved,
      daysRemaining: daysRemainingQuarter,
      projectedCompletion: Math.round(quarterlyAchieved * (90 / (90 - daysRemainingQuarter))),
      trend: getTrend(quarterlyPercentage, daysRemainingQuarter, 90),
    },
    yearly: {
      period: "yearly",
      target: yearlyTarget,
      achieved: yearlyAchieved,
      percentage: yearlyPercentage,
      remaining: yearlyTarget - yearlyAchieved,
      daysRemaining: daysRemainingYear,
      projectedCompletion: Math.round(yearlyAchieved * (365 / (365 - daysRemainingYear))),
      trend: getTrend(yearlyPercentage, daysRemainingYear, 365),
    },
    topPerformers: [
      { salesPersonId: "sp-1", name: "Sarah Johnson", achieved: 425000, target: 400000, percentage: 106 },
      { salesPersonId: "sp-2", name: "Michael Chen", achieved: 380000, target: 400000, percentage: 95 },
      { salesPersonId: "sp-3", name: "Emily Davis", achieved: 352000, target: 350000, percentage: 101 },
      { salesPersonId: "sp-4", name: "James Wilson", achieved: 298000, target: 350000, percentage: 85 },
      { salesPersonId: "sp-5", name: "Lisa Anderson", achieved: 275000, target: 300000, percentage: 92 },
    ],
    revenueByProduct: [
      { productName: "Enterprise Suite", revenue: 1850000, percentage: 44 },
      { productName: "Professional Plan", revenue: 1125000, percentage: 26 },
      { productName: "Basic Package", revenue: 750000, percentage: 18 },
      { productName: "Add-on Services", revenue: 525000, percentage: 12 },
    ],
  };
}

/**
 * Get Opportunity Tracking data
 * Simulated data - would integrate with Odoo CRM opportunities in production
 */
async function getOpportunityTracking(): Promise<OpportunityTrackingData> {
  const now = new Date();

  const opportunities: Opportunity[] = [
    {
      id: "opp-1",
      name: "Enterprise Software Implementation",
      customerName: "Acme Corporation",
      value: 250000,
      probability: 85,
      expectedCloseDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      stage: "Negotiation",
      priority: "hot",
      lastActivity: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      daysInStage: 5,
      nextAction: "Send final contract",
    },
    {
      id: "opp-2",
      name: "Cloud Migration Project",
      customerName: "TechStart Inc",
      value: 180000,
      probability: 70,
      expectedCloseDate: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000),
      stage: "Proposal",
      priority: "hot",
      lastActivity: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      daysInStage: 8,
      nextAction: "Schedule technical review",
    },
    {
      id: "opp-3",
      name: "Annual Support Contract",
      customerName: "Global Industries",
      value: 95000,
      probability: 90,
      expectedCloseDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      stage: "Negotiation",
      priority: "hot",
      lastActivity: new Date(now.getTime() - 0.5 * 24 * 60 * 60 * 1000),
      daysInStage: 3,
      nextAction: "Get signature",
    },
    {
      id: "opp-4",
      name: "Data Analytics Platform",
      customerName: "Metro Solutions",
      value: 150000,
      probability: 55,
      expectedCloseDate: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000),
      stage: "Qualified",
      priority: "warm",
      lastActivity: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      daysInStage: 12,
      nextAction: "Demo presentation",
    },
    {
      id: "opp-5",
      name: "Security Audit Package",
      customerName: "Prime Services",
      value: 65000,
      probability: 60,
      expectedCloseDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      stage: "Proposal",
      priority: "warm",
      lastActivity: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      daysInStage: 7,
      nextAction: "Follow up on proposal",
    },
    {
      id: "opp-6",
      name: "Training Program",
      customerName: "City Enterprises",
      value: 45000,
      probability: 40,
      expectedCloseDate: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
      stage: "Lead",
      priority: "cold",
      lastActivity: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
      daysInStage: 18,
      nextAction: "Re-engage contact",
    },
    {
      id: "opp-7",
      name: "Integration Services",
      customerName: "Regional Corp",
      value: 85000,
      probability: 35,
      expectedCloseDate: new Date(now.getTime() + 75 * 24 * 60 * 60 * 1000),
      stage: "Lead",
      priority: "cold",
      lastActivity: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000),
      daysInStage: 25,
    },
  ];

  const hotOpportunities = opportunities.filter(o => o.priority === "hot").length;
  const warmOpportunities = opportunities.filter(o => o.priority === "warm").length;
  const coldOpportunities = opportunities.filter(o => o.priority === "cold").length;
  const closingSoon = opportunities.filter(o => {
    const daysUntilClose = Math.ceil((o.expectedCloseDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilClose <= 7 && daysUntilClose >= 0;
  }).length;
  const stalled = opportunities.filter(o => o.daysInStage > 14).length;

  return {
    totalOpportunities: opportunities.length,
    totalValue: opportunities.reduce((sum, o) => sum + o.value, 0),
    hotOpportunities,
    warmOpportunities,
    coldOpportunities,
    closingSoon,
    stalled,
    opportunities,
    winLossRatio: {
      won: 42,
      lost: 18,
      ratio: 2.33,
    },
  };
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format percentage for display
 */
export function formatPercentage(value: number): string {
  return `${value >= 0 ? "+" : ""}${value}%`;
}

/**
 * Format relative date for display
 */
export function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  if (diffDays > 0 && diffDays <= 7) return `In ${diffDays} days`;
  if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
