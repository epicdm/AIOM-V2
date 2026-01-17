import * as React from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  AlertCircle,
  CreditCard,
  PiggyBank,
  Receipt,
  Clock,
  Flame,
  ChevronRight,
  X,
  ExternalLink,
} from "lucide-react";
import { cn } from "~/lib/utils";
import type { WidgetDefinition, WidgetProps } from "../types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "~/components/ui/dialog";

/**
 * Aging Bucket Interface
 */
export interface AgingBucket {
  label: string;
  amount: number;
  count: number;
  percentage: number;
}

/**
 * AP/AR Aging Data
 */
export interface AgingData {
  current: AgingBucket;      // 0-30 days
  period1: AgingBucket;      // 31-60 days
  period2: AgingBucket;      // 61-90 days
  period3: AgingBucket;      // 91-120 days
  older: AgingBucket;        // 120+ days
  total: number;
  overdueTotal: number;
}

/**
 * Drill-down Detail Item
 */
export interface DrillDownItem {
  id: string;
  name: string;
  partner: string;
  amount: number;
  dueDate?: string;
  daysOverdue?: number;
  status: "current" | "overdue" | "paid";
}

/**
 * Financial Metric Interface (Enhanced)
 */
export interface FinancialMetric {
  id: string;
  label: string;
  value: number;
  previousValue?: number;
  currency: string;
  trend?: "up" | "down" | "neutral";
  changePercent?: number;
}

/**
 * Financial Summary Widget Data (Enhanced)
 */
export interface FinancialSummaryData {
  // Core financial metrics
  cashPosition: number;
  totalReceivables: number;
  totalPayables: number;
  netPosition: number;

  // Burn rate metrics
  burnRate: number;  // Monthly average
  runwayMonths: number;
  burnRateTrend?: "up" | "down" | "neutral";

  // AP/AR Aging
  receivablesAging: AgingData;
  payablesAging: AgingData;

  // Legacy compatibility
  totalBalance: number;
  totalIncome: number;
  totalExpenses: number;
  currency: string;
  period: string;
  metrics: FinancialMetric[];

  // Drill-down data
  overdueReceivables?: DrillDownItem[];
  overduePayables?: DrillDownItem[];
  topReceivables?: DrillDownItem[];
  topPayables?: DrillDownItem[];
}

/**
 * Financial Summary Widget Config (Enhanced)
 */
export interface FinancialSummaryConfig {
  showTrends: boolean;
  showAgingBreakdown: boolean;
  showBurnRate: boolean;
  showCashPosition: boolean;
  currency: string;
  period: "daily" | "weekly" | "monthly" | "yearly";
  compactMode: boolean;
}

/**
 * Drill-down Modal State
 */
type DrillDownType = "ar-aging" | "ap-aging" | "cash" | "burn-rate" | null;

/**
 * Format currency with proper locale
 */
function formatCurrency(amount: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format large numbers with abbreviations
 */
function formatCompactNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
}

/**
 * Create sample aging data for demonstration
 */
function createSampleAgingData(total: number): AgingData {
  return {
    current: { label: "0-30 days", amount: total * 0.45, count: 12, percentage: 45 },
    period1: { label: "31-60 days", amount: total * 0.25, count: 7, percentage: 25 },
    period2: { label: "61-90 days", amount: total * 0.15, count: 4, percentage: 15 },
    period3: { label: "91-120 days", amount: total * 0.10, count: 2, percentage: 10 },
    older: { label: "120+ days", amount: total * 0.05, count: 1, percentage: 5 },
    total,
    overdueTotal: total * 0.55,
  };
}

/**
 * Create sample drill-down items for demonstration
 */
function createSampleDrillDownItems(type: "receivable" | "payable"): DrillDownItem[] {
  const partners = type === "receivable"
    ? ["Acme Corp", "Tech Solutions", "Global Industries", "Prime Services", "Elite Partners"]
    : ["Supplier A", "Parts Co.", "Materials Inc.", "Vendor Services", "Equipment Ltd."];

  return partners.map((partner, i) => ({
    id: `${type}-${i}`,
    name: `INV-${2024001 + i}`,
    partner,
    amount: 15000 - (i * 2500) + Math.random() * 1000,
    dueDate: new Date(Date.now() - (i * 15 * 24 * 60 * 60 * 1000)).toISOString().split("T")[0],
    daysOverdue: i > 0 ? i * 12 : 0,
    status: i === 0 ? "current" as const : "overdue" as const,
  }));
}

/**
 * Aging Bar Component - Horizontal stacked bar showing aging breakdown
 */
function AgingBar({ data, colorScheme }: { data: AgingData; colorScheme: "green" | "red" }) {
  const colors = colorScheme === "green"
    ? ["bg-green-500", "bg-green-400", "bg-yellow-400", "bg-orange-400", "bg-red-500"]
    : ["bg-blue-500", "bg-blue-400", "bg-yellow-400", "bg-orange-400", "bg-red-500"];

  const buckets = [data.current, data.period1, data.period2, data.period3, data.older];

  return (
    <div className="w-full">
      <div className="flex h-2 rounded-full overflow-hidden bg-muted">
        {buckets.map((bucket, i) => (
          bucket.percentage > 0 && (
            <div
              key={i}
              className={cn(colors[i], "transition-all duration-500")}
              style={{ width: `${bucket.percentage}%` }}
              title={`${bucket.label}: ${formatCompactNumber(bucket.amount)}`}
            />
          )
        ))}
      </div>
      <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
        <span>Current</span>
        <span>30d</span>
        <span>60d</span>
        <span>90d</span>
        <span>120d+</span>
      </div>
    </div>
  );
}

/**
 * Drill-Down Dialog Component
 */
function DrillDownDialog({
  open,
  onClose,
  type,
  data,
  currency,
}: {
  open: boolean;
  onClose: () => void;
  type: DrillDownType;
  data: FinancialSummaryData;
  currency: string;
}) {
  if (!type) return null;

  const getTitle = () => {
    switch (type) {
      case "ar-aging": return "Accounts Receivable Aging";
      case "ap-aging": return "Accounts Payable Aging";
      case "cash": return "Cash Position Details";
      case "burn-rate": return "Burn Rate Analysis";
      default: return "Details";
    }
  };

  const getDescription = () => {
    switch (type) {
      case "ar-aging": return "Breakdown of outstanding customer invoices by age";
      case "ap-aging": return "Breakdown of outstanding vendor bills by age";
      case "cash": return "Current cash and liquidity position";
      case "burn-rate": return "Monthly cash burn and runway analysis";
      default: return "";
    }
  };

  const renderAgingDetails = (aging: AgingData, items: DrillDownItem[] | undefined, colorScheme: "green" | "red") => {
    const buckets = [
      { ...aging.current, color: colorScheme === "green" ? "bg-green-500" : "bg-blue-500" },
      { ...aging.period1, color: colorScheme === "green" ? "bg-green-400" : "bg-blue-400" },
      { ...aging.period2, color: "bg-yellow-400" },
      { ...aging.period3, color: "bg-orange-400" },
      { ...aging.older, color: "bg-red-500" },
    ];

    return (
      <div className="space-y-4">
        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Total Outstanding</p>
            <p className="text-lg font-bold">{formatCurrency(aging.total, currency)}</p>
          </div>
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-xs text-muted-foreground">Overdue</p>
            <p className="text-lg font-bold text-red-500">{formatCurrency(aging.overdueTotal, currency)}</p>
          </div>
        </div>

        {/* Aging breakdown */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Aging Breakdown</p>
          {buckets.map((bucket, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={cn("w-3 h-3 rounded-full", bucket.color)} />
              <div className="flex-1">
                <div className="flex justify-between text-sm">
                  <span>{bucket.label}</span>
                  <span className="font-medium">{formatCurrency(bucket.amount, currency)}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{bucket.count} invoices</span>
                  <span>{bucket.percentage.toFixed(0)}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Top items */}
        {items && items.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Top Outstanding</p>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {items.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div>
                    <p className="text-sm font-medium">{item.partner}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.name} • Due: {item.dueDate}
                      {item.daysOverdue && item.daysOverdue > 0 && (
                        <span className="text-red-500 ml-1">({item.daysOverdue}d overdue)</span>
                      )}
                    </p>
                  </div>
                  <span className={cn(
                    "font-medium",
                    item.status === "overdue" ? "text-red-500" : ""
                  )}>
                    {formatCurrency(item.amount, currency)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderCashDetails = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
          <p className="text-xs text-muted-foreground">Cash on Hand</p>
          <p className="text-2xl font-bold text-primary">{formatCurrency(data.cashPosition, currency)}</p>
        </div>
        <div className="p-4 rounded-lg bg-muted/50">
          <p className="text-xs text-muted-foreground">Net Position</p>
          <p className={cn(
            "text-2xl font-bold",
            data.netPosition >= 0 ? "text-green-500" : "text-red-500"
          )}>
            {formatCurrency(data.netPosition, currency)}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between p-2 rounded-lg bg-green-500/10">
          <span className="text-sm">Accounts Receivable</span>
          <span className="font-medium text-green-600">+{formatCurrency(data.totalReceivables, currency)}</span>
        </div>
        <div className="flex justify-between p-2 rounded-lg bg-red-500/10">
          <span className="text-sm">Accounts Payable</span>
          <span className="font-medium text-red-500">-{formatCurrency(data.totalPayables, currency)}</span>
        </div>
      </div>

      <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-yellow-500" />
          <p className="text-sm font-medium">Liquidity Status</p>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {data.runwayMonths > 12
            ? `Strong position with ${data.runwayMonths.toFixed(0)}+ months runway`
            : data.runwayMonths > 6
              ? `Healthy position with ${data.runwayMonths.toFixed(1)} months runway`
              : `Monitor closely - ${data.runwayMonths.toFixed(1)} months runway remaining`
          }
        </p>
      </div>
    </div>
  );

  const renderBurnRateDetails = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-500" />
            <p className="text-xs text-muted-foreground">Monthly Burn Rate</p>
          </div>
          <p className="text-2xl font-bold text-orange-500">{formatCurrency(data.burnRate, currency)}</p>
          {data.burnRateTrend && (
            <div className={cn(
              "flex items-center gap-1 text-xs mt-1",
              data.burnRateTrend === "up" ? "text-red-500" : data.burnRateTrend === "down" ? "text-green-500" : ""
            )}>
              {data.burnRateTrend === "up" ? <TrendingUp className="w-3 h-3" /> : data.burnRateTrend === "down" ? <TrendingDown className="w-3 h-3" /> : null}
              {data.burnRateTrend === "up" ? "Increasing" : data.burnRateTrend === "down" ? "Decreasing" : "Stable"}
            </div>
          )}
        </div>
        <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-500" />
            <p className="text-xs text-muted-foreground">Cash Runway</p>
          </div>
          <p className="text-2xl font-bold text-blue-500">{data.runwayMonths.toFixed(1)} mo</p>
          <p className="text-xs text-muted-foreground mt-1">
            At current burn rate
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Cash Flow Summary</p>
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Available Cash</span>
            <span className="font-medium">{formatCurrency(data.cashPosition, currency)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Monthly Burn</span>
            <span className="font-medium text-orange-500">-{formatCurrency(data.burnRate, currency)}</span>
          </div>
          <div className="flex justify-between text-sm pt-2 border-t">
            <span className="font-medium">Est. Runway</span>
            <span className="font-bold">{data.runwayMonths.toFixed(1)} months</span>
          </div>
        </div>
      </div>

      {data.runwayMonths < 6 && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <p className="text-sm font-medium text-red-500">Low Runway Alert</p>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Consider reviewing expenses or securing additional funding
          </p>
        </div>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>
        <div className="py-2">
          {type === "ar-aging" && renderAgingDetails(data.receivablesAging, data.overdueReceivables, "green")}
          {type === "ap-aging" && renderAgingDetails(data.payablesAging, data.overduePayables, "red")}
          {type === "cash" && renderCashDetails()}
          {type === "burn-rate" && renderBurnRateDetails()}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Financial Summary Widget Component (Enhanced)
 */
function FinancialSummaryWidgetComponent({
  data,
  isLoading,
  error,
  instance,
  size,
}: WidgetProps<FinancialSummaryData, FinancialSummaryConfig>) {
  const config = instance.config as unknown as FinancialSummaryConfig;
  const [drillDownType, setDrillDownType] = React.useState<DrillDownType>(null);

  // Enhanced sample data for demonstration
  const sampleData: FinancialSummaryData = {
    // Core metrics
    cashPosition: 487500,
    totalReceivables: 156000,
    totalPayables: 89000,
    netPosition: 554500,

    // Burn rate
    burnRate: 42000,
    runwayMonths: 11.6,
    burnRateTrend: "down",

    // Aging data
    receivablesAging: createSampleAgingData(156000),
    payablesAging: createSampleAgingData(89000),

    // Legacy compatibility
    totalBalance: 487500,
    totalIncome: 45250,
    totalExpenses: 28730,
    currency: config.currency || "USD",
    period: config.period || "monthly",
    metrics: [
      {
        id: "revenue",
        label: "Revenue",
        value: 45250,
        previousValue: 42100,
        currency: "USD",
        trend: "up",
        changePercent: 7.5,
      },
      {
        id: "expenses",
        label: "Expenses",
        value: 28730,
        previousValue: 31200,
        currency: "USD",
        trend: "down",
        changePercent: -7.9,
      },
      {
        id: "profit",
        label: "Net Profit",
        value: 16520,
        previousValue: 10900,
        currency: "USD",
        trend: "up",
        changePercent: 51.6,
      },
      {
        id: "pending",
        label: "Pending",
        value: 8450,
        currency: "USD",
        trend: "neutral",
      },
    ],

    // Drill-down items
    overdueReceivables: createSampleDrillDownItems("receivable"),
    overduePayables: createSampleDrillDownItems("payable"),
    topReceivables: createSampleDrillDownItems("receivable"),
    topPayables: createSampleDrillDownItems("payable"),
  };

  const displayData = data ?? sampleData;

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px]">
        <div className="animate-pulse flex flex-col space-y-4 w-full p-4">
          <div className="h-16 bg-muted rounded-lg" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-20 bg-muted rounded-lg" />
            <div className="h-20 bg-muted rounded-lg" />
          </div>
          <div className="h-12 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px] text-destructive">
        <AlertCircle className="w-5 h-5 mr-2" />
        <span>{error}</span>
      </div>
    );
  }

  const periodLabels = {
    daily: "Today",
    weekly: "This Week",
    monthly: "This Month",
    yearly: "This Year",
  };

  const isCompact = config.compactMode || size === "small";
  const isLarge = size === "large" || size === "full";
  const showAgingBreakdown = config.showAgingBreakdown !== false;
  const showBurnRate = config.showBurnRate !== false;
  const showCashPosition = config.showCashPosition !== false;

  return (
    <div className="space-y-4" data-testid="financial-summary-widget">
      {/* Drill-down Dialog */}
      <DrillDownDialog
        open={drillDownType !== null}
        onClose={() => setDrillDownType(null)}
        type={drillDownType}
        data={displayData}
        currency={displayData.currency}
      />

      {/* Cash Position - Main Hero Section */}
      {showCashPosition && (
        <div
          className="text-center pb-4 border-b cursor-pointer hover:bg-muted/30 rounded-lg transition-colors -mx-1 px-1"
          onClick={() => setDrillDownType("cash")}
          data-testid="cash-position-section"
        >
          <p className="text-sm text-muted-foreground mb-1">Cash Position</p>
          <div className="flex items-center justify-center gap-2">
            <Wallet className="w-6 h-6 text-primary" />
            <span className={cn("font-bold", isCompact ? "text-2xl" : "text-3xl")}>
              {isCompact
                ? `$${formatCompactNumber(displayData.cashPosition)}`
                : formatCurrency(displayData.cashPosition, displayData.currency)}
            </span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Net: {formatCurrency(displayData.netPosition, displayData.currency)}
          </p>
        </div>
      )}

      {/* AR/AP Summary - Clickable cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Accounts Receivable */}
        <div
          className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 cursor-pointer hover:bg-green-500/20 transition-colors"
          onClick={() => setDrillDownType("ar-aging")}
          data-testid="ar-section"
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Receivables</span>
            </div>
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
          </div>
          <span className="font-semibold text-green-500 text-lg">
            {isCompact
              ? `$${formatCompactNumber(displayData.totalReceivables)}`
              : formatCurrency(displayData.totalReceivables, displayData.currency)}
          </span>
          {showAgingBreakdown && !isCompact && displayData.receivablesAging && (
            <div className="mt-2">
              <AgingBar data={displayData.receivablesAging} colorScheme="green" />
            </div>
          )}
          {displayData.receivablesAging?.overdueTotal > 0 && (
            <p className="text-xs text-orange-500 mt-1">
              {formatCurrency(displayData.receivablesAging.overdueTotal, displayData.currency)} overdue
            </p>
          )}
        </div>

        {/* Accounts Payable */}
        <div
          className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 cursor-pointer hover:bg-red-500/20 transition-colors"
          onClick={() => setDrillDownType("ap-aging")}
          data-testid="ap-section"
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <ArrowDownRight className="w-4 h-4 text-red-500" />
              <span className="text-xs text-muted-foreground">Payables</span>
            </div>
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
          </div>
          <span className="font-semibold text-red-500 text-lg">
            {isCompact
              ? `$${formatCompactNumber(displayData.totalPayables)}`
              : formatCurrency(displayData.totalPayables, displayData.currency)}
          </span>
          {showAgingBreakdown && !isCompact && displayData.payablesAging && (
            <div className="mt-2">
              <AgingBar data={displayData.payablesAging} colorScheme="red" />
            </div>
          )}
          {displayData.payablesAging?.overdueTotal > 0 && (
            <p className="text-xs text-orange-500 mt-1">
              {formatCurrency(displayData.payablesAging.overdueTotal, displayData.currency)} overdue
            </p>
          )}
        </div>
      </div>

      {/* Burn Rate Section */}
      {showBurnRate && !isCompact && (
        <div
          className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 cursor-pointer hover:bg-orange-500/20 transition-colors"
          onClick={() => setDrillDownType("burn-rate")}
          data-testid="burn-rate-section"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Monthly Burn Rate</p>
                  <p className="font-semibold text-orange-500">
                    {formatCurrency(displayData.burnRate, displayData.currency)}
                  </p>
                </div>
              </div>
              {displayData.burnRateTrend && config.showTrends && (
                <div className={cn(
                  "flex items-center gap-1 text-xs px-2 py-0.5 rounded-full",
                  displayData.burnRateTrend === "up" ? "bg-red-500/20 text-red-500" :
                    displayData.burnRateTrend === "down" ? "bg-green-500/20 text-green-500" :
                      "bg-muted text-muted-foreground"
                )}>
                  {displayData.burnRateTrend === "up" ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : displayData.burnRateTrend === "down" ? (
                    <TrendingDown className="w-3 h-3" />
                  ) : null}
                  {displayData.burnRateTrend === "up" ? "Increasing" : displayData.burnRateTrend === "down" ? "Decreasing" : "Stable"}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Runway</p>
                <p className={cn(
                  "font-semibold",
                  displayData.runwayMonths < 6 ? "text-red-500" :
                    displayData.runwayMonths < 12 ? "text-orange-500" : "text-green-500"
                )}>
                  {displayData.runwayMonths.toFixed(1)} months
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        </div>
      )}

      {/* Additional Metrics - Only show on larger sizes */}
      {isLarge && displayData.metrics.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Additional Metrics</p>
          <div className="grid grid-cols-2 gap-2">
            {displayData.metrics.slice(0, 4).map((metric) => (
              <div
                key={metric.id}
                className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  {metric.id === "revenue" && (
                    <Receipt className="w-4 h-4 text-muted-foreground" />
                  )}
                  {metric.id === "expenses" && (
                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                  )}
                  {metric.id === "profit" && (
                    <PiggyBank className="w-4 h-4 text-muted-foreground" />
                  )}
                  {metric.id === "pending" && (
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span className="text-xs text-muted-foreground">
                    {metric.label}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium">
                    ${formatCompactNumber(metric.value)}
                  </span>
                  {config.showTrends &&
                    metric.changePercent !== undefined &&
                    metric.trend !== "neutral" && (
                      <span
                        className={cn(
                          "text-xs flex items-center",
                          metric.trend === "up"
                            ? "text-green-500"
                            : "text-red-500"
                        )}
                      >
                        {metric.trend === "up" ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        {Math.abs(metric.changePercent).toFixed(1)}%
                      </span>
                    )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Period Info */}
      <div className="text-center text-xs text-muted-foreground pt-2 border-t">
        {periodLabels[displayData.period as keyof typeof periodLabels] || "Current Period"}
      </div>
    </div>
  );
}

/**
 * Financial Summary Widget Definition (Enhanced)
 */
export const FinancialSummaryWidgetDefinition: WidgetDefinition<
  FinancialSummaryData,
  FinancialSummaryConfig
> = {
  id: "financial-summary",
  name: "Financial Summary",
  description: "Key financial metrics including cash position, AP/AR aging, burn rate with trend indicators and drill-down capabilities",
  category: "finance",
  defaultSize: "medium",
  supportedSizes: ["small", "medium", "large", "full"],
  icon: DollarSign,
  dataRequirements: [
    {
      key: "financials",
      label: "Financial Data",
      description: "Financial metrics, aging data, and cash flow information",
      required: true,
      type: "query",
    },
    {
      key: "aging",
      label: "Aging Reports",
      description: "AP/AR aging breakdown data",
      required: false,
      type: "query",
    },
  ],
  configOptions: [
    {
      key: "showTrends",
      label: "Show Trends",
      description: "Display trend indicators and percentages",
      type: "boolean",
      defaultValue: true,
    },
    {
      key: "showCashPosition",
      label: "Show Cash Position",
      description: "Display cash position as the main metric",
      type: "boolean",
      defaultValue: true,
    },
    {
      key: "showAgingBreakdown",
      label: "Show Aging Breakdown",
      description: "Display AP/AR aging visualization bars",
      type: "boolean",
      defaultValue: true,
    },
    {
      key: "showBurnRate",
      label: "Show Burn Rate",
      description: "Display monthly burn rate and runway metrics",
      type: "boolean",
      defaultValue: true,
    },
    {
      key: "currency",
      label: "Currency",
      description: "Currency for displaying amounts",
      type: "select",
      defaultValue: "USD",
      options: [
        { label: "USD ($)", value: "USD" },
        { label: "EUR", value: "EUR" },
        { label: "GBP", value: "GBP" },
        { label: "JPY", value: "JPY" },
        { label: "CAD", value: "CAD" },
        { label: "AUD", value: "AUD" },
      ],
    },
    {
      key: "period",
      label: "Time Period",
      description: "Time period for the summary",
      type: "select",
      defaultValue: "monthly",
      options: [
        { label: "Daily", value: "daily" },
        { label: "Weekly", value: "weekly" },
        { label: "Monthly", value: "monthly" },
        { label: "Yearly", value: "yearly" },
      ],
    },
    {
      key: "compactMode",
      label: "Compact Mode",
      description: "Use compact display format (hides aging bars and burn rate)",
      type: "boolean",
      defaultValue: false,
    },
  ],
  component: FinancialSummaryWidgetComponent,
  defaultConfig: {
    showTrends: true,
    showCashPosition: true,
    showAgingBreakdown: true,
    showBurnRate: true,
    currency: "USD",
    period: "monthly",
    compactMode: false,
  },
  supportsRefresh: true,
  minRefreshInterval: 60000,
};
