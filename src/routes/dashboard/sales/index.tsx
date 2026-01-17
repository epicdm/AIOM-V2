import * as React from "react";
import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  DollarSign,
  Users,
  FileText,
  Target,
  ArrowRight,
  Phone,
  Mail,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Flame,
  ThermometerSun,
  Snowflake,
  BarChart3,
  PieChart,
  Activity,
  Briefcase,
  CircleDollarSign,
  MessageSquare,
  Eye,
  Send,
  FileCheck,
  XCircle,
  Timer,
} from "lucide-react";
import { authClient } from "~/lib/auth-client";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import { getSalesDashboardDataFn } from "~/fn/sales";
import type { UserRole } from "~/db/schema";
import type {
  SalesDashboardData,
  PipelineStage,
  CustomerInteraction,
  QuotationItem,
  Opportunity,
  RevenueTarget,
} from "~/fn/sales";

export const Route = createFileRoute("/dashboard/sales/")({
  beforeLoad: async () => {
    const sessionResult = await authClient.getSession();
    if (!sessionResult || !sessionResult.data) {
      throw redirect({
        to: "/sign-in",
        search: { redirect: "/dashboard/sales" },
      });
    }
    // Check if user is sales, admin, or MD
    const user = sessionResult.data.user as { role?: UserRole; isAdmin?: boolean } | undefined;
    if (!user || (user.role !== "sales" && user.role !== "admin" && user.role !== "md" && !user.isAdmin)) {
      throw redirect({
        to: "/dashboard",
      });
    }
  },
  component: SalesDashboardPage,
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

// Format short currency helper for compact display
function formatShortCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`;
  }
  return formatCurrency(amount);
}

// Format time ago helper
function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 0) {
    // Future date
    const absSeconds = Math.abs(seconds);
    if (absSeconds < 3600) return `in ${Math.floor(absSeconds / 60)}m`;
    if (absSeconds < 86400) return `in ${Math.floor(absSeconds / 3600)}h`;
    return `in ${Math.floor(absSeconds / 86400)}d`;
  }
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

// Pipeline Stage Card Component
interface PipelineStageCardProps {
  stage: PipelineStage;
  index: number;
  total: number;
}

function PipelineStageCard({ stage, index, total }: PipelineStageCardProps) {
  const colors = [
    "from-blue-500/20 to-blue-600/20 border-blue-500/30",
    "from-cyan-500/20 to-cyan-600/20 border-cyan-500/30",
    "from-yellow-500/20 to-yellow-600/20 border-yellow-500/30",
    "from-orange-500/20 to-orange-600/20 border-orange-500/30",
    "from-green-500/20 to-green-600/20 border-green-500/30",
  ];

  return (
    <div
      className={cn(
        "relative bg-gradient-to-br border rounded-lg p-4 flex-1 min-w-[140px]",
        colors[index % colors.length]
      )}
    >
      {index < total - 1 && (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10">
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
        </div>
      )}
      <div className="text-center">
        <p className="text-xs text-muted-foreground mb-1">{stage.name}</p>
        <p className="text-2xl font-bold">{stage.deals}</p>
        <p className="text-sm font-medium text-muted-foreground">
          {formatShortCurrency(stage.value)}
        </p>
        <div className="mt-2 text-xs text-muted-foreground">
          {stage.conversionRate}% conv.
        </div>
      </div>
    </div>
  );
}

// Stat Card Component
interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: { value: number; isPositive: boolean };
  status?: "success" | "warning" | "error" | "info";
}

function StatCard({ title, value, subtitle, icon: Icon, trend, status }: StatCardProps) {
  const statusColors = {
    success: "text-green-500 bg-green-500/10",
    warning: "text-yellow-500 bg-yellow-500/10",
    error: "text-red-500 bg-red-500/10",
    info: "text-blue-500 bg-blue-500/10",
  };

  return (
    <div className="bg-card/50 backdrop-blur-sm border rounded-xl p-4 hover:shadow-lg transition-all">
      <div className="flex items-start justify-between">
        <div className={cn("p-2 rounded-lg", status ? statusColors[status] : "bg-primary/10")}>
          <Icon className={cn("w-4 h-4", status ? "" : "text-primary")} />
        </div>
        {trend && (
          <div className={cn(
            "flex items-center gap-1 text-xs font-medium",
            trend.isPositive ? "text-green-500" : "text-red-500"
          )}>
            {trend.isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>
      <div className="mt-3">
        <h3 className="text-xl font-bold">{value}</h3>
        <p className="text-xs text-muted-foreground">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

// Revenue Target Progress Component
interface RevenueTargetProgressProps {
  target: RevenueTarget;
  label: string;
}

function RevenueTargetProgress({ target, label }: RevenueTargetProgressProps) {
  const trendColors = {
    "on-track": "text-green-500",
    "at-risk": "text-yellow-500",
    "behind": "text-red-500",
    "exceeding": "text-blue-500",
  };

  const progressColors = {
    "on-track": "bg-green-500",
    "at-risk": "bg-yellow-500",
    "behind": "bg-red-500",
    "exceeding": "bg-blue-500",
  };

  return (
    <div className="bg-muted/30 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">{label}</span>
        <Badge variant="outline" className={cn("text-xs", trendColors[target.trend])}>
          {target.trend.replace("-", " ")}
        </Badge>
      </div>
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-xl font-bold">{formatShortCurrency(target.achieved)}</span>
        <span className="text-xs text-muted-foreground">/ {formatShortCurrency(target.target)}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden mb-2">
        <div
          className={cn("h-full transition-all", progressColors[target.trend])}
          style={{ width: `${Math.min(target.percentage, 100)}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{target.percentage}% achieved</span>
        <span>{target.daysRemaining} days left</span>
      </div>
    </div>
  );
}

// Interaction Item Component
interface InteractionItemProps {
  interaction: CustomerInteraction;
}

function InteractionItem({ interaction }: InteractionItemProps) {
  const typeIcons = {
    call: Phone,
    email: Mail,
    meeting: Calendar,
    demo: Eye,
    "follow-up": MessageSquare,
  };
  const typeColors = {
    call: "text-blue-500 bg-blue-500/10",
    email: "text-purple-500 bg-purple-500/10",
    meeting: "text-green-500 bg-green-500/10",
    demo: "text-orange-500 bg-orange-500/10",
    "follow-up": "text-yellow-500 bg-yellow-500/10",
  };
  const statusColors = {
    completed: "bg-green-500",
    scheduled: "bg-blue-500",
    pending: "bg-yellow-500",
    cancelled: "bg-red-500",
  };

  const Icon = typeIcons[interaction.type];

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
      <div className={cn("p-2 rounded-lg shrink-0", typeColors[interaction.type])}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{interaction.customerName}</p>
          <div className={cn("w-2 h-2 rounded-full shrink-0", statusColors[interaction.status])} />
        </div>
        <p className="text-xs text-muted-foreground truncate">{interaction.subject}</p>
      </div>
      <span className="text-xs text-muted-foreground shrink-0">
        {formatTimeAgo(interaction.scheduledAt)}
      </span>
    </div>
  );
}

// Quotation Item Component
interface QuotationItemProps {
  quotation: QuotationItem;
}

function QuotationItemComponent({ quotation }: QuotationItemProps) {
  const statusIcons = {
    draft: FileText,
    sent: Send,
    viewed: Eye,
    accepted: FileCheck,
    rejected: XCircle,
    expired: Timer,
  };
  const statusColors = {
    draft: "text-gray-500 bg-gray-500/10",
    sent: "text-blue-500 bg-blue-500/10",
    viewed: "text-purple-500 bg-purple-500/10",
    accepted: "text-green-500 bg-green-500/10",
    rejected: "text-red-500 bg-red-500/10",
    expired: "text-yellow-500 bg-yellow-500/10",
  };

  const Icon = statusIcons[quotation.status];

  return (
    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn("p-2 rounded-lg shrink-0", statusColors[quotation.status])}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{quotation.quotationNumber}</p>
          <p className="text-xs text-muted-foreground truncate">{quotation.customerName}</p>
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-medium">{formatCurrency(quotation.amount)}</p>
        <p className="text-xs text-muted-foreground capitalize">{quotation.status}</p>
      </div>
    </div>
  );
}

// Opportunity Item Component
interface OpportunityItemProps {
  opportunity: Opportunity;
}

function OpportunityItem({ opportunity }: OpportunityItemProps) {
  const priorityIcons = {
    hot: Flame,
    warm: ThermometerSun,
    cold: Snowflake,
  };
  const priorityColors = {
    hot: "text-red-500 bg-red-500/10",
    warm: "text-orange-500 bg-orange-500/10",
    cold: "text-blue-500 bg-blue-500/10",
  };

  const Icon = priorityIcons[opportunity.priority];

  return (
    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-muted">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className={cn("p-2 rounded-lg shrink-0", priorityColors[opportunity.priority])}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{opportunity.name}</p>
          <p className="text-xs text-muted-foreground truncate">{opportunity.customerName}</p>
        </div>
      </div>
      <div className="text-right shrink-0 ml-4">
        <p className="text-sm font-bold">{formatCurrency(opportunity.value)}</p>
        <div className="flex items-center gap-2 justify-end">
          <span className="text-xs text-muted-foreground">{opportunity.probability}%</span>
          <Badge variant="outline" className="text-xs">
            {opportunity.stage}
          </Badge>
        </div>
      </div>
    </div>
  );
}

function SalesDashboardPage() {
  const { data: session } = authClient.useSession();

  // Fetch Sales dashboard data
  const {
    data: dashboardData,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["sales-dashboard-data"],
    queryFn: async () => {
      return await getSalesDashboardDataFn();
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Default/fallback data structure
  const defaultData: SalesDashboardData = {
    pipeline: {
      totalDeals: 0,
      totalValue: 0,
      weightedValue: 0,
      stages: [],
      averageDealSize: 0,
      winRate: 0,
      avgSalesCycle: 0,
    },
    interactions: {
      total: 0,
      completed: 0,
      scheduled: 0,
      pending: 0,
      todayActivities: 0,
      overdue: 0,
      recentInteractions: [],
      upcomingInteractions: [],
    },
    quotations: {
      totalQuotations: 0,
      totalValue: 0,
      byStatus: { draft: 0, sent: 0, viewed: 0, accepted: 0, rejected: 0, expired: 0 },
      conversionRate: 0,
      avgResponseTime: "0 days",
      recentQuotations: [],
      pendingFollowUps: 0,
    },
    revenueTargets: {
      monthly: { period: "monthly", target: 0, achieved: 0, percentage: 0, remaining: 0, daysRemaining: 0, projectedCompletion: 0, trend: "on-track" },
      quarterly: { period: "quarterly", target: 0, achieved: 0, percentage: 0, remaining: 0, daysRemaining: 0, projectedCompletion: 0, trend: "on-track" },
      yearly: { period: "yearly", target: 0, achieved: 0, percentage: 0, remaining: 0, daysRemaining: 0, projectedCompletion: 0, trend: "on-track" },
      topPerformers: [],
      revenueByProduct: [],
    },
    opportunities: {
      totalOpportunities: 0,
      totalValue: 0,
      hotOpportunities: 0,
      warmOpportunities: 0,
      coldOpportunities: 0,
      closingSoon: 0,
      stalled: 0,
      opportunities: [],
      winLossRatio: { won: 0, lost: 0, ratio: 0 },
    },
    lastUpdated: new Date(),
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
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" data-testid="sales-dashboard-title">
                  Sales Dashboard
                </h1>
                <p className="text-muted-foreground mt-1">
                  Pipeline visibility, targets, and opportunity tracking
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
          </div>
        </div>

        {/* Sales Pipeline Section */}
        <div className="space-y-4" data-testid="pipeline-section">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Sales Pipeline
            </h2>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-muted-foreground">
                Win Rate: <span className="font-medium text-foreground">{data.pipeline.winRate}%</span>
              </span>
              <span className="text-muted-foreground">
                Avg Cycle: <span className="font-medium text-foreground">{data.pipeline.avgSalesCycle} days</span>
              </span>
            </div>
          </div>

          {/* Pipeline Funnel */}
          <div className="bg-card/50 backdrop-blur-sm border rounded-xl p-6">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {data.pipeline.stages.map((stage, index) => (
                <PipelineStageCard
                  key={stage.id}
                  stage={stage}
                  index={index}
                  total={data.pipeline.stages.length}
                />
              ))}
            </div>
            <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{data.pipeline.totalDeals}</p>
                <p className="text-xs text-muted-foreground">Total Deals</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{formatShortCurrency(data.pipeline.totalValue)}</p>
                <p className="text-xs text-muted-foreground">Pipeline Value</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{formatShortCurrency(data.pipeline.weightedValue)}</p>
                <p className="text-xs text-muted-foreground">Weighted Value</p>
              </div>
            </div>
          </div>
        </div>

        {/* Revenue Targets & Stats Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Revenue Targets */}
          <div className="bg-card/50 backdrop-blur-sm border rounded-xl p-6" data-testid="revenue-targets-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Revenue Targets
              </h3>
            </div>
            <div className="space-y-4">
              <RevenueTargetProgress target={data.revenueTargets.monthly} label="Monthly" />
              <RevenueTargetProgress target={data.revenueTargets.quarterly} label="Quarterly" />
              <RevenueTargetProgress target={data.revenueTargets.yearly} label="Yearly" />
            </div>
          </div>

          {/* Key Stats */}
          <div className="space-y-4" data-testid="key-stats-section">
            <h3 className="font-semibold flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Key Metrics
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                title="Total Pipeline"
                value={formatShortCurrency(data.pipeline.totalValue)}
                subtitle={`${data.pipeline.totalDeals} deals`}
                icon={CircleDollarSign}
                status="info"
              />
              <StatCard
                title="Avg Deal Size"
                value={formatShortCurrency(data.pipeline.averageDealSize)}
                icon={DollarSign}
                status="success"
              />
              <StatCard
                title="Quotations"
                value={data.quotations.totalQuotations}
                subtitle={`${data.quotations.conversionRate}% conversion`}
                icon={FileText}
                status="info"
              />
              <StatCard
                title="Today's Activities"
                value={data.interactions.todayActivities}
                subtitle={`${data.interactions.overdue} overdue`}
                icon={Calendar}
                status={data.interactions.overdue > 0 ? "warning" : "success"}
              />
            </div>
          </div>
        </div>

        {/* Opportunities & Interactions Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Hot Opportunities */}
          <div className="bg-card/50 backdrop-blur-sm border rounded-xl p-6" data-testid="opportunities-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Flame className="w-5 h-5 text-primary" />
                Opportunities
              </h3>
              <div className="flex items-center gap-2">
                <Badge variant="destructive" className="gap-1">
                  <Flame className="w-3 h-3" />
                  {data.opportunities.hotOpportunities} hot
                </Badge>
                <Badge variant="outline">
                  {data.opportunities.closingSoon} closing soon
                </Badge>
              </div>
            </div>

            {/* Opportunity Summary */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              <div className="text-center p-2 bg-red-500/10 rounded-lg">
                <p className="text-lg font-bold text-red-500">{data.opportunities.hotOpportunities}</p>
                <p className="text-xs text-muted-foreground">Hot</p>
              </div>
              <div className="text-center p-2 bg-orange-500/10 rounded-lg">
                <p className="text-lg font-bold text-orange-500">{data.opportunities.warmOpportunities}</p>
                <p className="text-xs text-muted-foreground">Warm</p>
              </div>
              <div className="text-center p-2 bg-blue-500/10 rounded-lg">
                <p className="text-lg font-bold text-blue-500">{data.opportunities.coldOpportunities}</p>
                <p className="text-xs text-muted-foreground">Cold</p>
              </div>
              <div className="text-center p-2 bg-yellow-500/10 rounded-lg">
                <p className="text-lg font-bold text-yellow-500">{data.opportunities.stalled}</p>
                <p className="text-xs text-muted-foreground">Stalled</p>
              </div>
            </div>

            {/* Win/Loss Ratio */}
            <div className="bg-muted/30 rounded-lg p-3 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Win/Loss Ratio</span>
                <span className="font-medium">
                  {data.opportunities.winLossRatio.won}W / {data.opportunities.winLossRatio.lost}L ({data.opportunities.winLossRatio.ratio.toFixed(2)})
                </span>
              </div>
            </div>

            {/* Opportunity List */}
            <div className="space-y-1 max-h-[300px] overflow-y-auto">
              {data.opportunities.opportunities.slice(0, 5).map((opportunity) => (
                <OpportunityItem key={opportunity.id} opportunity={opportunity} />
              ))}
            </div>
          </div>

          {/* Customer Interactions */}
          <div className="bg-card/50 backdrop-blur-sm border rounded-xl p-6" data-testid="interactions-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Customer Interactions
              </h3>
              <Badge variant="outline">
                {data.interactions.scheduled} scheduled
              </Badge>
            </div>

            {/* Interaction Summary */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              <div className="text-center p-2 bg-green-500/10 rounded-lg">
                <p className="text-lg font-bold text-green-500">{data.interactions.completed}</p>
                <p className="text-xs text-muted-foreground">Done</p>
              </div>
              <div className="text-center p-2 bg-blue-500/10 rounded-lg">
                <p className="text-lg font-bold text-blue-500">{data.interactions.scheduled}</p>
                <p className="text-xs text-muted-foreground">Scheduled</p>
              </div>
              <div className="text-center p-2 bg-yellow-500/10 rounded-lg">
                <p className="text-lg font-bold text-yellow-500">{data.interactions.pending}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
              <div className="text-center p-2 bg-red-500/10 rounded-lg">
                <p className="text-lg font-bold text-red-500">{data.interactions.overdue}</p>
                <p className="text-xs text-muted-foreground">Overdue</p>
              </div>
            </div>

            {/* Upcoming Interactions */}
            <div className="mb-4">
              <p className="text-sm font-medium mb-2 text-muted-foreground">Upcoming</p>
              <div className="space-y-1 max-h-[140px] overflow-y-auto">
                {data.interactions.upcomingInteractions.slice(0, 3).map((interaction) => (
                  <InteractionItem key={interaction.id} interaction={interaction} />
                ))}
              </div>
            </div>

            {/* Recent Interactions */}
            <div>
              <p className="text-sm font-medium mb-2 text-muted-foreground">Recent</p>
              <div className="space-y-1 max-h-[140px] overflow-y-auto">
                {data.interactions.recentInteractions.slice(0, 3).map((interaction) => (
                  <InteractionItem key={interaction.id} interaction={interaction} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Quotations Section */}
        <div className="bg-card/50 backdrop-blur-sm border rounded-xl p-6" data-testid="quotations-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Quotation Status
            </h3>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-muted-foreground">
                Total Value: <span className="font-medium text-foreground">{formatCurrency(data.quotations.totalValue)}</span>
              </span>
              <span className="text-muted-foreground">
                Conversion: <span className="font-medium text-foreground">{data.quotations.conversionRate}%</span>
              </span>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Status Breakdown */}
            <div>
              <p className="text-sm font-medium mb-3 text-muted-foreground">By Status</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-3 bg-gray-500/10 rounded-lg">
                  <p className="text-xl font-bold">{data.quotations.byStatus.draft}</p>
                  <p className="text-xs text-muted-foreground">Draft</p>
                </div>
                <div className="text-center p-3 bg-blue-500/10 rounded-lg">
                  <p className="text-xl font-bold text-blue-500">{data.quotations.byStatus.sent}</p>
                  <p className="text-xs text-muted-foreground">Sent</p>
                </div>
                <div className="text-center p-3 bg-purple-500/10 rounded-lg">
                  <p className="text-xl font-bold text-purple-500">{data.quotations.byStatus.viewed}</p>
                  <p className="text-xs text-muted-foreground">Viewed</p>
                </div>
                <div className="text-center p-3 bg-green-500/10 rounded-lg">
                  <p className="text-xl font-bold text-green-500">{data.quotations.byStatus.accepted}</p>
                  <p className="text-xs text-muted-foreground">Accepted</p>
                </div>
                <div className="text-center p-3 bg-red-500/10 rounded-lg">
                  <p className="text-xl font-bold text-red-500">{data.quotations.byStatus.rejected}</p>
                  <p className="text-xs text-muted-foreground">Rejected</p>
                </div>
                <div className="text-center p-3 bg-yellow-500/10 rounded-lg">
                  <p className="text-xl font-bold text-yellow-500">{data.quotations.byStatus.expired}</p>
                  <p className="text-xs text-muted-foreground">Expired</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Avg Response Time</span>
                  <span className="font-medium">{data.quotations.avgResponseTime}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-muted-foreground">Pending Follow-ups</span>
                  <Badge variant={data.quotations.pendingFollowUps > 10 ? "destructive" : "secondary"}>
                    {data.quotations.pendingFollowUps}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Recent Quotations */}
            <div>
              <p className="text-sm font-medium mb-3 text-muted-foreground">Recent Quotations</p>
              <div className="space-y-1 max-h-[240px] overflow-y-auto">
                {data.quotations.recentQuotations.map((quotation) => (
                  <QuotationItemComponent key={quotation.id} quotation={quotation} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Top Performers Section */}
        <div className="bg-card/50 backdrop-blur-sm border rounded-xl p-6" data-testid="top-performers-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Top Performers
            </h3>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {data.revenueTargets.topPerformers.map((performer, index) => (
              <div
                key={performer.salesPersonId}
                className={cn(
                  "p-4 rounded-lg border",
                  index === 0 ? "bg-yellow-500/10 border-yellow-500/30" :
                  index === 1 ? "bg-gray-500/10 border-gray-500/30" :
                  index === 2 ? "bg-orange-500/10 border-orange-500/30" :
                  "bg-muted/30"
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg font-bold">#{index + 1}</span>
                  <span className="text-sm font-medium truncate">{performer.name}</span>
                </div>
                <p className="text-xl font-bold">{formatShortCurrency(performer.achieved)}</p>
                <div className="mt-2">
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full",
                        performer.percentage >= 100 ? "bg-green-500" :
                        performer.percentage >= 80 ? "bg-yellow-500" : "bg-red-500"
                      )}
                      style={{ width: `${Math.min(performer.percentage, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {performer.percentage}% of {formatShortCurrency(performer.target)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
