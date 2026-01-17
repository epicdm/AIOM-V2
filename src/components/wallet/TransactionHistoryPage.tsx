/**
 * TransactionHistoryPage Component
 *
 * Full transaction history page with filtering, pagination, date range selection,
 * and export capabilities.
 */

import * as React from "react";
import {
  ArrowLeft,
  Download,
  RefreshCw,
  Search,
  FileSpreadsheet,
  FileText,
  ChevronDown,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { cn } from "~/lib/utils";
import { useWalletTransactions } from "~/hooks/useWalletBalance";
import { TransactionList } from "./TransactionList";
import { DateRangePicker, type DateRange } from "~/components/ui/date-range-picker";
import {
  downloadTransactionsCSV,
  downloadTransactionsReport,
  generateTransactionSummary,
} from "~/utils/export-transactions";
import type { WalletTransactionType, WalletTransactionStatus } from "~/db/schema";
import { toast } from "sonner";
import { format } from "date-fns";

export function TransactionHistoryPage() {
  const [typeFilter, setTypeFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [searchTerm, setSearchTerm] = React.useState("");
  const [dateRange, setDateRange] = React.useState<DateRange>({ from: undefined, to: undefined });
  const [page, setPage] = React.useState(0);
  const [showExportMenu, setShowExportMenu] = React.useState(false);
  const exportMenuRef = React.useRef<HTMLDivElement>(null);
  const ITEMS_PER_PAGE = 20;

  // Handle click outside for export menu
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Build query params
  const queryParams = React.useMemo(() => {
    const params: {
      type?: WalletTransactionType;
      status?: WalletTransactionStatus;
      startDate?: string;
      endDate?: string;
      limit: number;
      offset: number;
    } = {
      limit: ITEMS_PER_PAGE,
      offset: page * ITEMS_PER_PAGE,
    };

    if (typeFilter !== "all") {
      params.type = typeFilter as WalletTransactionType;
    }

    if (statusFilter !== "all") {
      params.status = statusFilter as WalletTransactionStatus;
    }

    if (dateRange.from) {
      params.startDate = dateRange.from.toISOString();
    }

    if (dateRange.to) {
      params.endDate = dateRange.to.toISOString();
    }

    return params;
  }, [typeFilter, statusFilter, dateRange, page]);

  const {
    data: transactions,
    isLoading,
    refetch,
  } = useWalletTransactions(queryParams);

  // Filter by search term (local filtering)
  const filteredTransactions = React.useMemo(() => {
    if (!transactions || !searchTerm) return transactions;

    const term = searchTerm.toLowerCase();
    return transactions.filter(
      (tx) =>
        tx.description?.toLowerCase().includes(term) ||
        tx.reference?.toLowerCase().includes(term) ||
        tx.id.toLowerCase().includes(term)
    );
  }, [transactions, searchTerm]);

  // Handle filter changes
  const handleTypeChange = (value: string) => {
    setTypeFilter(value);
    setPage(0);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setPage(0);
  };

  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
    setPage(0);
  };

  // Check if there are more results
  const hasMore = transactions && transactions.length === ITEMS_PER_PAGE;
  const hasPrevious = page > 0;

  // Check if any filters are active
  const hasActiveFilters =
    typeFilter !== "all" ||
    statusFilter !== "all" ||
    searchTerm ||
    dateRange.from ||
    dateRange.to;

  // Clear all filters
  const clearAllFilters = () => {
    setTypeFilter("all");
    setStatusFilter("all");
    setSearchTerm("");
    setDateRange({ from: undefined, to: undefined });
    setPage(0);
  };

  // Handle CSV export
  const handleExportCSV = () => {
    if (!filteredTransactions || filteredTransactions.length === 0) {
      toast.error("No transactions to export");
      return;
    }

    try {
      const filename = dateRange.from || dateRange.to
        ? `transactions-${dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : "start"}-${dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : "end"}.csv`
        : undefined;
      downloadTransactionsCSV(filteredTransactions, filename);
      toast.success(`Exported ${filteredTransactions.length} transactions to CSV`);
      setShowExportMenu(false);
    } catch {
      toast.error("Failed to export transactions");
    }
  };

  // Handle text report export
  const handleExportReport = () => {
    if (!filteredTransactions || filteredTransactions.length === 0) {
      toast.error("No transactions to export");
      return;
    }

    try {
      const filename = dateRange.from || dateRange.to
        ? `transaction-report-${dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : "start"}-${dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : "end"}.txt`
        : undefined;
      downloadTransactionsReport(
        filteredTransactions,
        { from: dateRange.from, to: dateRange.to },
        filename
      );
      toast.success(`Exported transaction report with ${filteredTransactions.length} transactions`);
      setShowExportMenu(false);
    } catch {
      toast.error("Failed to export report");
    }
  };

  // Calculate summary for filtered transactions
  const summary = React.useMemo(() => {
    if (!filteredTransactions || filteredTransactions.length === 0) return null;
    return generateTransactionSummary(filteredTransactions);
  }, [filteredTransactions]);

  return (
    <div className="space-y-6" data-testid="transaction-history-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="shrink-0"
          >
            <Link to="/dashboard/wallet">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Transaction History</h1>
            <p className="text-muted-foreground">
              View and filter your wallet transactions
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            className="gap-2"
            data-testid="refresh-transactions"
          >
            <RefreshCw
              className={cn("h-4 w-4", isLoading && "animate-spin")}
            />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          {/* Export Dropdown */}
          <div className="relative" ref={exportMenuRef}>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={!filteredTransactions || filteredTransactions.length === 0}
              data-testid="export-transactions"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
              <ChevronDown className="h-3 w-3" />
            </Button>

            {showExportMenu && (
              <div
                className="absolute right-0 top-full mt-1 z-50 w-48 rounded-lg border bg-popover shadow-lg animate-in fade-in-0 zoom-in-95"
                data-testid="export-menu"
              >
                <div className="p-1">
                  <button
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted transition-colors"
                    onClick={handleExportCSV}
                    data-testid="export-csv"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Export as CSV
                  </button>
                  <button
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted transition-colors"
                    onClick={handleExportReport}
                    data-testid="export-report"
                  >
                    <FileText className="h-4 w-4" />
                    Export as Report
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filters Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Filters</CardTitle>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="text-muted-foreground hover:text-foreground"
                data-testid="clear-filters"
              >
                Clear All
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="search-input"
              />
            </div>

            {/* Date Range Picker */}
            <DateRangePicker
              value={dateRange}
              onChange={handleDateRangeChange}
              placeholder="Select dates"
            />

            {/* Type Filter */}
            <Select value={typeFilter} onValueChange={handleTypeChange}>
              <SelectTrigger data-testid="type-filter-select">
                <SelectValue placeholder="Transaction Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="deposit">Deposits</SelectItem>
                <SelectItem value="withdrawal">Withdrawals</SelectItem>
                <SelectItem value="transfer_in">Received Transfers</SelectItem>
                <SelectItem value="transfer_out">Sent Transfers</SelectItem>
                <SelectItem value="expense_disbursement">Expense Disbursements</SelectItem>
                <SelectItem value="expense_refund">Expense Refunds</SelectItem>
                <SelectItem value="airtime_purchase">Airtime Purchases</SelectItem>
                <SelectItem value="fee">Fees</SelectItem>
                <SelectItem value="reversal">Reversals</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={handleStatusChange}>
              <SelectTrigger data-testid="status-filter-select">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="reversed">Reversed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Summary Card - shown when filters are active */}
      {summary && hasActiveFilters && (
        <Card className="bg-muted/30">
          <CardContent className="pt-4 pb-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Transactions</p>
                <p className="text-lg font-semibold">{summary.transactionCount}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Credits</p>
                <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                  +{new Intl.NumberFormat("en-US", { style: "currency", currency: summary.currency }).format(summary.totalCredits)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Debits</p>
                <p className="text-lg font-semibold text-red-600 dark:text-red-400">
                  -{new Intl.NumberFormat("en-US", { style: "currency", currency: summary.currency }).format(summary.totalDebits)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Net</p>
                <p className={cn(
                  "text-lg font-semibold",
                  summary.netChange >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                )}>
                  {summary.netChange >= 0 ? "+" : ""}{new Intl.NumberFormat("en-US", { style: "currency", currency: summary.currency }).format(summary.netChange)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transactions List */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Transactions</CardTitle>
            <p className="text-xs text-muted-foreground">
              Click on a transaction to view receipt
            </p>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <TransactionList
            transactions={filteredTransactions ?? []}
            isLoading={isLoading}
            compact={false}
          />

          {/* Pagination */}
          {filteredTransactions && filteredTransactions.length > 0 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {page * ITEMS_PER_PAGE + 1} -{" "}
                {page * ITEMS_PER_PAGE + (filteredTransactions?.length || 0)}{" "}
                transactions
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!hasPrevious}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  data-testid="prev-page"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!hasMore}
                  onClick={() => setPage((p) => p + 1)}
                  data-testid="next-page"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
