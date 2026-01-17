/**
 * Mobile Top-Up History Page
 *
 * Displays user's mobile top-up transaction history with filtering.
 */

import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Smartphone,
  ChevronRight,
  Loader2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  Search,
} from "lucide-react";
import { authClient } from "~/lib/auth-client";
import { redirect } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import {
  useMobileTopupTransactions,
  useMobileTopupStats,
} from "~/hooks/useMobileTopup";

export const Route = createFileRoute("/mobile/topup/history")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session) {
      throw redirect({
        to: "/sign-in",
        search: { redirect: "/mobile/topup/history" },
      });
    }
  },
  component: TopupHistoryPage,
});

// Status configuration
const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    icon: Clock,
    colorClass: "text-yellow-600",
    bgClass: "bg-yellow-500/10",
  },
  processing: {
    label: "Processing",
    icon: RefreshCw,
    colorClass: "text-blue-600",
    bgClass: "bg-blue-500/10",
  },
  successful: {
    label: "Success",
    icon: CheckCircle,
    colorClass: "text-green-600",
    bgClass: "bg-green-500/10",
  },
  failed: {
    label: "Failed",
    icon: XCircle,
    colorClass: "text-red-600",
    bgClass: "bg-red-500/10",
  },
  refunded: {
    label: "Refunded",
    icon: RefreshCw,
    colorClass: "text-purple-600",
    bgClass: "bg-purple-500/10",
  },
};

type StatusType = keyof typeof STATUS_CONFIG;

// Format currency
function formatCurrency(amount: string, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(parseFloat(amount));
}

// Format date
function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

function TopupHistoryPage() {
  const [statusFilter, setStatusFilter] = React.useState<StatusType | "all">("all");
  const [searchQuery, setSearchQuery] = React.useState("");

  // Hooks
  const { data: transactions, isLoading, refetch, isRefetching } = useMobileTopupTransactions({
    status: statusFilter === "all" ? undefined : statusFilter,
    limit: 50,
  });
  const { data: stats, isLoading: statsLoading } = useMobileTopupStats();

  // Filter transactions by search
  const filteredTransactions = React.useMemo(() => {
    if (!transactions || !searchQuery) return transactions ?? [];
    const search = searchQuery.toLowerCase();
    return transactions.filter(
      (tx) =>
        tx.recipientPhone.includes(search) ||
        tx.operatorName.toLowerCase().includes(search)
    );
  }, [transactions, searchQuery]);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to="/mobile/topup">
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-semibold">Transaction History</h1>
              <p className="text-xs text-muted-foreground">
                Your mobile top-up history
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={cn("h-5 w-5", isRefetching && "animate-spin")} />
          </Button>
        </div>
      </header>

      {/* Stats Summary */}
      {stats && !statsLoading && (
        <div className="px-4 py-3 border-b bg-muted/30">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-semibold">{stats.totalTopups}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-green-600">
                {stats.successfulTopups}
              </p>
              <p className="text-xs text-muted-foreground">Successful</p>
            </div>
            <div>
              <p className="text-2xl font-semibold">{formatCurrency(stats.totalAmountSpent)}</p>
              <p className="text-xs text-muted-foreground">Total Spent</p>
            </div>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="px-4 py-3 border-b space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by phone or operator..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("all")}
            className="shrink-0"
          >
            All
          </Button>
          {(Object.keys(STATUS_CONFIG) as StatusType[]).map((status) => {
            const config = STATUS_CONFIG[status];
            return (
              <Button
                key={status}
                variant={statusFilter === status ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(status)}
                className="shrink-0"
              >
                {config.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Transaction List */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredTransactions.length > 0 ? (
          <div className="divide-y">
            {filteredTransactions.map((tx) => {
              const statusConfig = STATUS_CONFIG[tx.status as StatusType] ?? STATUS_CONFIG.pending;
              const StatusIcon = statusConfig.icon;

              return (
                <Link
                  key={tx.id}
                  to="/mobile/topup/$transactionId"
                  params={{ transactionId: tx.id }}
                >
                  <div className="flex items-center gap-4 px-4 py-4 hover:bg-muted/50 transition-colors">
                    {/* Operator Logo */}
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <Smartphone className="h-6 w-6 text-muted-foreground" />
                    </div>

                    {/* Transaction Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">
                          +{tx.recipientCountryCode} {tx.recipientPhone}
                        </p>
                        <Badge
                          variant="outline"
                          className={cn(
                            "shrink-0",
                            statusConfig.colorClass,
                            statusConfig.bgClass
                          )}
                        >
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusConfig.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {tx.operatorName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(tx.createdAt)}
                      </p>
                    </div>

                    {/* Amount */}
                    <div className="text-right shrink-0">
                      <p className="font-semibold">
                        {formatCurrency(tx.requestedAmount, tx.requestedAmountCurrency)}
                      </p>
                      {tx.deliveredAmount && (
                        <p className="text-xs text-muted-foreground">
                          → {formatCurrency(tx.deliveredAmount, tx.deliveredAmountCurrency ?? "USD")}
                        </p>
                      )}
                    </div>

                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Smartphone className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-1">No transactions found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery
                ? "Try adjusting your search"
                : "Start by sending your first top-up"}
            </p>
            {!searchQuery && (
              <Link to="/mobile/topup">
                <Button>Send Top-Up</Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
