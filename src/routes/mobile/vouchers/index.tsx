/**
 * Mobile Expense Voucher Management Page
 *
 * Mobile-optimized page for viewing and reconciling expense vouchers.
 * Supports voucher status tracking, reconciliation, and GL posting status.
 */

import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  RefreshCw,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Receipt,
  FileCheck,
  FileX,
  AlertCircle,
  Search,
  Inbox,
  ChevronRight,
  Filter,
  BookOpen,
} from "lucide-react";
import { authClient } from "~/lib/auth-client";
import { redirect } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import {
  useMyExpenseVouchers,
  useUnreconciledVouchers,
} from "~/hooks/useExpenseVouchers";
import { cn } from "~/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import type { ExpenseVoucher, ExpenseVoucherStatus, ReconciliationStatus } from "~/db/schema";

export const Route = createFileRoute("/mobile/vouchers/")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session) {
      throw redirect({
        to: "/sign-in",
        search: { redirect: "/mobile/vouchers" },
      });
    }
  },
  component: MobileVouchersPage,
});

// Status configuration
const STATUS_CONFIG: Record<
  ExpenseVoucherStatus,
  { label: string; icon: typeof Clock; colorClass: string; bgClass: string }
> = {
  draft: {
    label: "Draft",
    icon: FileCheck,
    colorClass: "text-gray-600 dark:text-gray-400",
    bgClass: "bg-gray-500/10",
  },
  pending_approval: {
    label: "Pending Approval",
    icon: Clock,
    colorClass: "text-yellow-600 dark:text-yellow-400",
    bgClass: "bg-yellow-500/10",
  },
  approved: {
    label: "Approved",
    icon: CheckCircle,
    colorClass: "text-green-600 dark:text-green-400",
    bgClass: "bg-green-500/10",
  },
  rejected: {
    label: "Rejected",
    icon: XCircle,
    colorClass: "text-red-600 dark:text-red-400",
    bgClass: "bg-red-500/10",
  },
  posted: {
    label: "Posted",
    icon: BookOpen,
    colorClass: "text-blue-600 dark:text-blue-400",
    bgClass: "bg-blue-500/10",
  },
  voided: {
    label: "Voided",
    icon: FileX,
    colorClass: "text-gray-600 dark:text-gray-400",
    bgClass: "bg-gray-500/10",
  },
};

const RECONCILIATION_CONFIG: Record<
  ReconciliationStatus,
  { label: string; colorClass: string; bgClass: string }
> = {
  unreconciled: {
    label: "Unreconciled",
    colorClass: "text-orange-600 dark:text-orange-400",
    bgClass: "bg-orange-500/10",
  },
  partially_reconciled: {
    label: "Partial",
    colorClass: "text-yellow-600 dark:text-yellow-400",
    bgClass: "bg-yellow-500/10",
  },
  reconciled: {
    label: "Reconciled",
    colorClass: "text-green-600 dark:text-green-400",
    bgClass: "bg-green-500/10",
  },
  disputed: {
    label: "Disputed",
    colorClass: "text-red-600 dark:text-red-400",
    bgClass: "bg-red-500/10",
  },
};

/**
 * Format currency amount
 */
function formatCurrency(amount: string, currency: string = "USD"): string {
  const numericAmount = parseFloat(amount);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(numericAmount);
}

/**
 * Voucher Card Component
 */
function VoucherCard({ voucher }: { voucher: ExpenseVoucher }) {
  const statusConfig = STATUS_CONFIG[voucher.status as ExpenseVoucherStatus];
  const StatusIcon = statusConfig.icon;
  const reconciliationConfig = voucher.reconciliationStatus
    ? RECONCILIATION_CONFIG[voucher.reconciliationStatus as ReconciliationStatus]
    : null;
  const createdDate = new Date(voucher.createdAt);

  return (
    <Link to="/mobile/vouchers/$id" params={{ id: voucher.id }}>
      <Card className="transition-all duration-200 active:scale-[0.98] hover:shadow-md">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Badge
                  variant="outline"
                  className={cn(statusConfig.bgClass, statusConfig.colorClass, "border-0")}
                >
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {statusConfig.label}
                </Badge>
                {reconciliationConfig && voucher.status === "posted" && (
                  <Badge
                    variant="outline"
                    className={cn(
                      reconciliationConfig.bgClass,
                      reconciliationConfig.colorClass,
                      "border-0"
                    )}
                  >
                    {reconciliationConfig.label}
                  </Badge>
                )}
              </div>
              <p className="font-mono text-sm text-muted-foreground">{voucher.voucherNumber}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          </div>

          <h3 className="font-medium line-clamp-1 mb-2">{voucher.description}</h3>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {formatDistanceToNow(createdDate, { addSuffix: true })}
            </p>
            <p className="text-lg font-semibold">
              {formatCurrency(voucher.amount, voucher.currency)}
            </p>
          </div>

          {/* Vendor Info */}
          {voucher.vendorName && (
            <p className="text-xs text-muted-foreground mt-2 truncate">
              Vendor: {voucher.vendorName}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

/**
 * Filter Tabs Component
 */
function FilterTabs({
  activeFilter,
  onFilterChange,
}: {
  activeFilter: ExpenseVoucherStatus | "all" | "unreconciled";
  onFilterChange: (filter: ExpenseVoucherStatus | "all" | "unreconciled") => void;
}) {
  const filters: Array<{ value: ExpenseVoucherStatus | "all" | "unreconciled"; label: string }> = [
    { value: "all", label: "All" },
    { value: "draft", label: "Draft" },
    { value: "pending_approval", label: "Pending" },
    { value: "approved", label: "Approved" },
    { value: "posted", label: "Posted" },
    { value: "unreconciled", label: "Unreconciled" },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
      {filters.map((filter) => (
        <Button
          key={filter.value}
          variant={activeFilter === filter.value ? "default" : "outline"}
          size="sm"
          onClick={() => onFilterChange(filter.value)}
          className="flex-shrink-0 whitespace-nowrap"
        >
          {filter.label}
        </Button>
      ))}
    </div>
  );
}

function MobileVouchersPage() {
  const [statusFilter, setStatusFilter] = React.useState<
    ExpenseVoucherStatus | "all" | "unreconciled"
  >("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");

  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Query for user's vouchers
  const {
    data: vouchers,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useMyExpenseVouchers(
    statusFilter === "all" || statusFilter === "unreconciled"
      ? undefined
      : { status: statusFilter }
  );

  // Query for unreconciled vouchers (when filter is "unreconciled")
  const {
    data: unreconciledVouchers,
    isLoading: isLoadingUnreconciled,
  } = useUnreconciledVouchers(undefined, statusFilter === "unreconciled");

  // Calculate stats
  const stats = React.useMemo(() => {
    if (!vouchers) return { draft: 0, pending: 0, approved: 0, posted: 0, unreconciled: 0 };
    return {
      draft: vouchers.filter((v) => v.status === "draft").length,
      pending: vouchers.filter((v) => v.status === "pending_approval").length,
      approved: vouchers.filter((v) => v.status === "approved").length,
      posted: vouchers.filter((v) => v.status === "posted").length,
      unreconciled: vouchers.filter(
        (v) => v.status === "posted" && v.reconciliationStatus === "unreconciled"
      ).length,
    };
  }, [vouchers]);

  // Get display vouchers based on filter
  const displayVouchers = React.useMemo(() => {
    let data = statusFilter === "unreconciled" ? unreconciledVouchers : vouchers;
    if (!data) return [];

    // Apply search filter
    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase();
      data = data.filter(
        (v) =>
          v.voucherNumber.toLowerCase().includes(searchLower) ||
          v.description.toLowerCase().includes(searchLower) ||
          v.vendorName?.toLowerCase().includes(searchLower)
      );
    }

    return data;
  }, [vouchers, unreconciledVouchers, statusFilter, debouncedSearch]);

  const isPageLoading =
    statusFilter === "unreconciled" ? isLoadingUnreconciled : isLoading;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to="/dashboard">
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-semibold">Expense Vouchers</h1>
              <p className="text-xs text-muted-foreground">
                {displayVouchers.length} {displayVouchers.length === 1 ? "voucher" : "vouchers"}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-9 w-9"
          >
            <RefreshCw className={cn("h-5 w-5", isFetching && "animate-spin")} />
          </Button>
        </div>
      </header>

      {/* Quick Stats */}
      <div className="px-4 py-3 bg-muted/30 border-b">
        <div className="grid grid-cols-5 gap-1 text-center">
          <div>
            <p className="text-sm font-semibold text-gray-600">{stats.draft}</p>
            <p className="text-xs text-muted-foreground">Draft</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-yellow-600">{stats.pending}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-green-600">{stats.approved}</p>
            <p className="text-xs text-muted-foreground">Approved</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-blue-600">{stats.posted}</p>
            <p className="text-xs text-muted-foreground">Posted</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-orange-600">{stats.unreconciled}</p>
            <p className="text-xs text-muted-foreground">Unrecon.</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-3 border-b space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search vouchers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <FilterTabs activeFilter={statusFilter} onFilterChange={setStatusFilter} />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {isPageLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading vouchers...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="p-3 rounded-full bg-red-500/10 mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-lg font-semibold mb-2">Failed to load vouchers</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {error instanceof Error ? error.message : "An unexpected error occurred"}
            </p>
            <Button onClick={() => refetch()} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        ) : displayVouchers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="p-4 rounded-full bg-muted mb-4">
              <Inbox className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold mb-2">No vouchers found</h2>
            <p className="text-sm text-muted-foreground">
              {debouncedSearch
                ? "No vouchers match your search"
                : statusFilter === "unreconciled"
                ? "All vouchers have been reconciled"
                : "No expense vouchers yet"}
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {displayVouchers.map((voucher) => (
              <VoucherCard key={voucher.id} voucher={voucher} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
