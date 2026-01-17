import * as React from "react";
import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Briefcase,
  RefreshCw,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  ClipboardCheck,
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  Target,
  ArrowRight,
  Building2,
  UserCheck,
  UserMinus,
  Calendar,
  Lightbulb,
  Bell,
  Activity,
  PieChart,
  BarChart3,
  Wallet,
  CircleDollarSign,
} from "lucide-react";
import { authClient } from "~/lib/auth-client";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import { getMDDashboardDataFn } from "~/fn/md";
import type { UserRole } from "~/db/schema";
import type {
  MDDashboardData,
  ExecutiveBriefingItem,
  PendingApprovalItem,
} from "~/fn/md";

export const Route = createFileRoute("/dashboard/md/")({
  beforeLoad: async () => {
    const sessionResult = await authClient.getSession();
    if (!sessionResult || !sessionResult.data) {
      throw redirect({
        to: "/sign-in",
        search: { redirect: "/dashboard/md" },
      });
    }
    // Check if user is MD or admin
    const user = sessionResult.data.user as { role?: UserRole; isAdmin?: boolean } | undefined;
    if (!user || (user.role !== "md" && !user.isAdmin)) {
      throw redirect({
        to: "/dashboard",
      });
    }
  },
  component: MDDashboardPage,
});

// Format currency helper
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format time ago helper
function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

// Stat Card Component
interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: { value: number; isPositive: boolean };
  status?: "success" | "warning" | "error" | "info";
  size?: "default" | "large";
}

function StatCard({ title, value, subtitle, icon: Icon, trend, status, size = "default" }: StatCardProps) {
  const statusColors = {
    success: "text-green-500 bg-green-500/10",
    warning: "text-yellow-500 bg-yellow-500/10",
    error: "text-red-500 bg-red-500/10",
    info: "text-blue-500 bg-blue-500/10",
  };

  return (
    <div className={cn(
      "bg-card/50 backdrop-blur-sm border rounded-xl p-6 hover:shadow-lg transition-all",
      size === "large" && "md:col-span-2"
    )}>
      <div className="flex items-start justify-between">
        <div className={cn("p-3 rounded-lg", status ? statusColors[status] : "bg-primary/10")}>
          <Icon className={cn("w-5 h-5", status ? "" : "text-primary")} />
        </div>
        {trend && (
          <div className={cn(
            "flex items-center gap-1 text-sm font-medium",
            trend.isPositive ? "text-green-500" : "text-red-500"
          )}>
            {trend.isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>
      <div className="mt-4">
        <h3 className={cn("font-bold", size === "large" ? "text-3xl" : "text-2xl")}>{value}</h3>
        <p className="text-sm text-muted-foreground">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}

// KPI Card Component
interface KPICardProps {
  title: string;
  current: number;
  target: number;
  trend: "up" | "down" | "stable";
  unit?: string;
}

function KPICard({ title, current, target, trend, unit = "%" }: KPICardProps) {
  const progress = Math.min((current / target) * 100, 100);
  const isOnTarget = current >= target;

  return (
    <div className="bg-muted/30 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">{title}</span>
        <div className={cn(
          "flex items-center gap-1 text-xs",
          trend === "up" ? "text-green-500" : trend === "down" ? "text-red-500" : "text-muted-foreground"
        )}>
          {trend === "up" && <TrendingUp className="w-3 h-3" />}
          {trend === "down" && <TrendingDown className="w-3 h-3" />}
          {trend === "stable" && <Activity className="w-3 h-3" />}
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-bold">{current}{unit}</span>
        <span className="text-xs text-muted-foreground">/ {target}{unit} target</span>
      </div>
      <div className="mt-2">
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full transition-all",
              isOnTarget ? "bg-green-500" : progress >= 80 ? "bg-yellow-500" : "bg-red-500"
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// Briefing Item Component
interface BriefingItemProps {
  item: ExecutiveBriefingItem;
}

function BriefingItem({ item }: BriefingItemProps) {
  const typeIcons = {
    alert: AlertCircle,
    insight: Lightbulb,
    action: ClipboardCheck,
    update: Bell,
  };
  const typeColors = {
    alert: "text-red-500 bg-red-500/10",
    insight: "text-blue-500 bg-blue-500/10",
    action: "text-yellow-500 bg-yellow-500/10",
    update: "text-green-500 bg-green-500/10",
  };
  const priorityColors = {
    high: "bg-red-500",
    medium: "bg-yellow-500",
    low: "bg-green-500",
  };

  const Icon = typeIcons[item.type];

  return (
    <div className={cn(
      "flex items-start gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors",
      item.actionRequired && "border-l-2 border-yellow-500"
    )}>
      <div className={cn("p-2 rounded-lg shrink-0", typeColors[item.type])}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-medium text-sm truncate">{item.title}</h4>
          <div className={cn("w-2 h-2 rounded-full shrink-0", priorityColors[item.priority])} />
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-muted-foreground">{formatTimeAgo(item.timestamp)}</span>
          {item.actionRequired && (
            <Badge variant="outline" className="text-xs h-5">Action Required</Badge>
          )}
        </div>
      </div>
    </div>
  );
}

// Approval Item Component
interface ApprovalItemProps {
  item: PendingApprovalItem;
}

function ApprovalItem({ item }: ApprovalItemProps) {
  const priorityColors = {
    urgent: "bg-red-500",
    high: "bg-orange-500",
    normal: "bg-blue-500",
    low: "bg-gray-500",
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-2 h-2 rounded-full",
          priorityColors[item.priority as keyof typeof priorityColors] || "bg-blue-500"
        )} />
        <div>
          <p className="font-medium text-sm line-clamp-1">{item.title}</p>
          <p className="text-xs text-muted-foreground">
            {item.daysWaiting === 0 ? "Today" : `${item.daysWaiting}d waiting`}
          </p>
        </div>
      </div>
      <span className="font-medium text-sm">{formatCurrency(item.amount)}</span>
    </div>
  );
}

function MDDashboardPage() {
  const { data: session } = authClient.useSession();

  // Fetch MD dashboard data
  const {
    data: dashboardData,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["md-dashboard-data"],
    queryFn: async () => {
      return await getMDDashboardDataFn();
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Default/fallback data structure
  const defaultData: MDDashboardData = {
    financialOverview: {
      revenue: { currentMonth: 950000, lastMonth: 875000, ytd: 8500000, monthOverMonthChange: 8 },
      expenses: { currentMonth: 125000, lastMonth: 115000, ytd: 1200000, monthOverMonthChange: 9, pendingValue: 45000 },
      profitMargin: { currentMonth: 87, ytd: 86, target: 25 },
      cashFlow: { status: "positive", runway: "18 months", trend: "stable" },
    },
    pendingApprovals: {
      total: 15,
      urgent: 2,
      highPriority: 4,
      normalPriority: 7,
      lowPriority: 2,
      totalValue: 78500,
      items: [
        { id: "1", title: "Q1 Marketing Budget", amount: 25000, priority: "high", submittedAt: new Date(), daysWaiting: 2 },
        { id: "2", title: "Equipment Purchase", amount: 15000, priority: "normal", submittedAt: new Date(), daysWaiting: 1 },
        { id: "3", title: "Travel Expenses - Sales Team", amount: 8500, priority: "normal", submittedAt: new Date(), daysWaiting: 3 },
      ],
      contracts: 2,
      budgetRequests: 1,
      hiringRequests: 2,
    },
    teamCapacity: {
      totalStaff: 150,
      byDepartment: { fieldTech: 100, sales: 43, admin: 7 },
      utilization: { overall: 87, fieldTech: 92, sales: 78 },
      availability: { onDuty: 128, onLeave: 12, unavailable: 10 },
      openPositions: 3,
      upcomingTimeOff: 5,
    },
    keyMetrics: {
      customerSatisfaction: { current: 94, target: 95, trend: "up" },
      operationalEfficiency: { current: 89, target: 90, trend: "up" },
      revenueGrowth: { current: 12, target: 15, trend: "stable" },
      employeeRetention: { current: 95, target: 92, trend: "stable" },
      expenseApprovalRate: { current: 78, avgProcessingTime: "2.3 days", trend: "stable" },
      projectCompletion: { onTime: 87, delayed: 8, atRisk: 5 },
    },
    executiveBriefing: {
      items: [
        { id: "1", type: "alert", priority: "high", title: "Budget threshold approaching", description: "Q1 operational expenses at 85% of allocated budget.", timestamp: new Date(Date.now() - 1800000), actionRequired: true },
        { id: "2", type: "insight", priority: "medium", title: "Revenue trend positive", description: "Month-over-month revenue increased by 12%.", timestamp: new Date(Date.now() - 7200000), actionRequired: false },
        { id: "3", type: "action", priority: "high", title: "Contract renewal due", description: "3 major contracts require renewal within 30 days.", timestamp: new Date(Date.now() - 14400000), actionRequired: true },
      ],
      summary: { total: 5, actionRequired: 2, highPriority: 2, newToday: 3 },
    },
  };

  const data = dashboardData ?? defaultData;

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Briefcase className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" data-testid="md-dashboard-title">
                  Executive Dashboard
                </h1>
                <p className="text-muted-foreground mt-1">
                  Strategic overview and key business metrics
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="gap-2"
              data-testid="refresh-btn"
            >
              <RefreshCw className={cn("w-4 h-4", isFetching && "animate-spin")} />
              Refresh
            </Button>
            <Link to="/dashboard/approvals">
              <Button size="sm" className="gap-2" data-testid="view-approvals-btn">
                <ClipboardCheck className="w-4 h-4" />
                Review Approvals
              </Button>
            </Link>
          </div>
        </div>

        {/* Financial Overview Section */}
        <div className="space-y-4" data-testid="financial-overview-section">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <CircleDollarSign className="w-5 h-5 text-primary" />
              Financial Overview
            </h2>
            <Badge
              variant={data.financialOverview.cashFlow.status === "positive" ? "default" : "destructive"}
              data-testid="cash-flow-badge"
            >
              Cash Flow: {data.financialOverview.cashFlow.status}
            </Badge>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" data-testid="financial-stats">
            <StatCard
              title="Monthly Revenue"
              value={formatCurrency(data.financialOverview.revenue.currentMonth)}
              subtitle={`YTD: ${formatCurrency(data.financialOverview.revenue.ytd)}`}
              icon={TrendingUp}
              trend={{
                value: data.financialOverview.revenue.monthOverMonthChange,
                isPositive: data.financialOverview.revenue.monthOverMonthChange > 0,
              }}
              status="success"
            />
            <StatCard
              title="Monthly Expenses"
              value={formatCurrency(data.financialOverview.expenses.currentMonth)}
              subtitle={`Pending: ${formatCurrency(data.financialOverview.expenses.pendingValue)}`}
              icon={Wallet}
              trend={{
                value: data.financialOverview.expenses.monthOverMonthChange,
                isPositive: data.financialOverview.expenses.monthOverMonthChange < 0,
              }}
              status={data.financialOverview.expenses.monthOverMonthChange > 10 ? "warning" : "info"}
            />
            <StatCard
              title="Profit Margin"
              value={`${data.financialOverview.profitMargin.currentMonth}%`}
              subtitle={`Target: ${data.financialOverview.profitMargin.target}%`}
              icon={PieChart}
              status={data.financialOverview.profitMargin.currentMonth >= data.financialOverview.profitMargin.target ? "success" : "warning"}
            />
            <StatCard
              title="Cash Runway"
              value={data.financialOverview.cashFlow.runway}
              subtitle={`Trend: ${data.financialOverview.cashFlow.trend}`}
              icon={BarChart3}
              status="info"
            />
          </div>
        </div>

        {/* Main Grid - Approvals and Team Capacity */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Pending Approvals */}
          <div className="bg-card/50 backdrop-blur-sm border rounded-xl p-6" data-testid="pending-approvals-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-primary" />
                Pending Approvals
              </h3>
              <Link to="/dashboard/approvals">
                <Button variant="ghost" size="sm" className="gap-1">
                  View All <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>

            {/* Approval Summary */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              <div className="text-center p-3 bg-red-500/10 rounded-lg">
                <p className="text-xl font-bold text-red-500">{data.pendingApprovals.urgent}</p>
                <p className="text-xs text-muted-foreground">Urgent</p>
              </div>
              <div className="text-center p-3 bg-orange-500/10 rounded-lg">
                <p className="text-xl font-bold text-orange-500">{data.pendingApprovals.highPriority}</p>
                <p className="text-xs text-muted-foreground">High</p>
              </div>
              <div className="text-center p-3 bg-blue-500/10 rounded-lg">
                <p className="text-xl font-bold text-blue-500">{data.pendingApprovals.normalPriority}</p>
                <p className="text-xs text-muted-foreground">Normal</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-xl font-bold">{data.pendingApprovals.lowPriority}</p>
                <p className="text-xs text-muted-foreground">Low</p>
              </div>
            </div>

            {/* Total Value */}
            <div className="bg-muted/30 rounded-lg p-3 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Pending Value</span>
                <span className="text-lg font-bold">{formatCurrency(data.pendingApprovals.totalValue)}</span>
              </div>
            </div>

            {/* Recent Items */}
            <div className="space-y-1">
              {data.pendingApprovals.items.slice(0, 3).map((item) => (
                <ApprovalItem key={item.id} item={item} />
              ))}
            </div>

            {/* Other Approvals */}
            {(data.pendingApprovals.contracts > 0 || data.pendingApprovals.budgetRequests > 0 || data.pendingApprovals.hiringRequests > 0) && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">Other pending items:</p>
                <div className="flex flex-wrap gap-2">
                  {data.pendingApprovals.contracts > 0 && (
                    <Badge variant="outline">{data.pendingApprovals.contracts} contracts</Badge>
                  )}
                  {data.pendingApprovals.budgetRequests > 0 && (
                    <Badge variant="outline">{data.pendingApprovals.budgetRequests} budget requests</Badge>
                  )}
                  {data.pendingApprovals.hiringRequests > 0 && (
                    <Badge variant="outline">{data.pendingApprovals.hiringRequests} hiring requests</Badge>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Team Capacity */}
          <div className="bg-card/50 backdrop-blur-sm border rounded-xl p-6" data-testid="team-capacity-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Team Capacity
              </h3>
              <Badge variant="outline">{data.teamCapacity.totalStaff} total</Badge>
            </div>

            {/* Utilization Overview */}
            <div className="bg-muted/30 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Overall Utilization</span>
                <span className="text-xl font-bold">{data.teamCapacity.utilization.overall}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all",
                    data.teamCapacity.utilization.overall >= 85 ? "bg-green-500" :
                    data.teamCapacity.utilization.overall >= 70 ? "bg-yellow-500" : "bg-red-500"
                  )}
                  style={{ width: `${data.teamCapacity.utilization.overall}%` }}
                />
              </div>
            </div>

            {/* Staff Availability */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-lg">
                <UserCheck className="w-4 h-4 text-green-500" />
                <div>
                  <p className="text-sm font-medium">{data.teamCapacity.availability.onDuty}</p>
                  <p className="text-xs text-muted-foreground">On Duty</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-yellow-500/10 rounded-lg">
                <Calendar className="w-4 h-4 text-yellow-500" />
                <div>
                  <p className="text-sm font-medium">{data.teamCapacity.availability.onLeave}</p>
                  <p className="text-xs text-muted-foreground">On Leave</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-red-500/10 rounded-lg">
                <UserMinus className="w-4 h-4 text-red-500" />
                <div>
                  <p className="text-sm font-medium">{data.teamCapacity.availability.unavailable}</p>
                  <p className="text-xs text-muted-foreground">Unavailable</p>
                </div>
              </div>
            </div>

            {/* Department Breakdown */}
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">By Department</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Field Technicians</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{data.teamCapacity.utilization.fieldTech}% util.</span>
                    <span className="font-medium w-8 text-right">{data.teamCapacity.byDepartment.fieldTech}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Sales Team</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{data.teamCapacity.utilization.sales}% util.</span>
                    <span className="font-medium w-8 text-right">{data.teamCapacity.byDepartment.sales}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Administration</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium w-8 text-right">{data.teamCapacity.byDepartment.admin}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Open Positions */}
            {data.teamCapacity.openPositions > 0 && (
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Open Positions</span>
                  <Badge variant="secondary">{data.teamCapacity.openPositions}</Badge>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Key Metrics Section */}
        <div className="bg-card/50 backdrop-blur-sm border rounded-xl p-6" data-testid="key-metrics-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Key Performance Indicators
            </h3>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <KPICard
              title="Customer Satisfaction"
              current={data.keyMetrics.customerSatisfaction.current}
              target={data.keyMetrics.customerSatisfaction.target}
              trend={data.keyMetrics.customerSatisfaction.trend}
            />
            <KPICard
              title="Operational Efficiency"
              current={data.keyMetrics.operationalEfficiency.current}
              target={data.keyMetrics.operationalEfficiency.target}
              trend={data.keyMetrics.operationalEfficiency.trend}
            />
            <KPICard
              title="Revenue Growth"
              current={data.keyMetrics.revenueGrowth.current}
              target={data.keyMetrics.revenueGrowth.target}
              trend={data.keyMetrics.revenueGrowth.trend}
            />
            <KPICard
              title="Employee Retention"
              current={data.keyMetrics.employeeRetention.current}
              target={data.keyMetrics.employeeRetention.target}
              trend={data.keyMetrics.employeeRetention.trend}
            />
          </div>

          {/* Project Completion */}
          <div className="mt-6 pt-4 border-t">
            <p className="text-sm font-medium mb-3">Project Completion Status</p>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="h-3 bg-muted rounded-full overflow-hidden flex">
                  <div
                    className="bg-green-500"
                    style={{ width: `${data.keyMetrics.projectCompletion.onTime}%` }}
                  />
                  <div
                    className="bg-yellow-500"
                    style={{ width: `${data.keyMetrics.projectCompletion.delayed}%` }}
                  />
                  <div
                    className="bg-red-500"
                    style={{ width: `${data.keyMetrics.projectCompletion.atRisk}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  {data.keyMetrics.projectCompletion.onTime}% On Time
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  {data.keyMetrics.projectCompletion.delayed}% Delayed
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  {data.keyMetrics.projectCompletion.atRisk}% At Risk
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Executive Briefing */}
        <div className="bg-card/50 backdrop-blur-sm border rounded-xl p-6" data-testid="executive-briefing-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Executive Briefing
            </h3>
            <div className="flex items-center gap-2">
              {data.executiveBriefing.summary.actionRequired > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {data.executiveBriefing.summary.actionRequired} action required
                </Badge>
              )}
              <Badge variant="outline">{data.executiveBriefing.summary.newToday} new today</Badge>
            </div>
          </div>

          <div className="space-y-2">
            {data.executiveBriefing.items.map((item) => (
              <BriefingItem key={item.id} item={item} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
