/**
 * TransactionList Component
 *
 * Displays a list of wallet transactions with optional filtering.
 * Supports compact mode for dashboard preview and full mode for history page.
 * Now supports viewing transaction receipts on click.
 */

import * as React from "react";
import {
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  RotateCcw,
  Smartphone,
  Receipt,
  Wallet,
  Filter,
  Eye,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { cn } from "~/lib/utils";
import type { WalletTransaction } from "~/db/schema";
import { format, formatDistanceToNow } from "date-fns";
import { TransactionReceiptDialog } from "./TransactionReceiptDialog";

// Currency formatting helper
function formatCurrency(
  amount: string | number,
  currency: string = "USD"
): string {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
  }).format(numAmount);
}

// Transaction type configuration
const transactionTypeConfig: Record<
  string,
  {
    label: string;
    icon: React.ElementType;
    colorClass: string;
    bgClass: string;
    isCredit: boolean;
  }
> = {
  deposit: {
    label: "Deposit",
    icon: ArrowDownLeft,
    colorClass: "text-green-600 dark:text-green-400",
    bgClass: "bg-green-500/10",
    isCredit: true,
  },
  withdrawal: {
    label: "Withdrawal",
    icon: ArrowUpRight,
    colorClass: "text-red-600 dark:text-red-400",
    bgClass: "bg-red-500/10",
    isCredit: false,
  },
  transfer_in: {
    label: "Received",
    icon: ArrowDownLeft,
    colorClass: "text-green-600 dark:text-green-400",
    bgClass: "bg-green-500/10",
    isCredit: true,
  },
  transfer_out: {
    label: "Sent",
    icon: ArrowUpRight,
    colorClass: "text-red-600 dark:text-red-400",
    bgClass: "bg-red-500/10",
    isCredit: false,
  },
  expense_disbursement: {
    label: "Expense",
    icon: Receipt,
    colorClass: "text-orange-600 dark:text-orange-400",
    bgClass: "bg-orange-500/10",
    isCredit: false,
  },
  expense_refund: {
    label: "Refund",
    icon: RotateCcw,
    colorClass: "text-green-600 dark:text-green-400",
    bgClass: "bg-green-500/10",
    isCredit: true,
  },
  airtime_purchase: {
    label: "Airtime",
    icon: Smartphone,
    colorClass: "text-purple-600 dark:text-purple-400",
    bgClass: "bg-purple-500/10",
    isCredit: false,
  },
  adjustment: {
    label: "Adjustment",
    icon: RefreshCw,
    colorClass: "text-blue-600 dark:text-blue-400",
    bgClass: "bg-blue-500/10",
    isCredit: true,
  },
  fee: {
    label: "Fee",
    icon: Wallet,
    colorClass: "text-gray-600 dark:text-gray-400",
    bgClass: "bg-gray-500/10",
    isCredit: false,
  },
  reversal: {
    label: "Reversal",
    icon: RotateCcw,
    colorClass: "text-amber-600 dark:text-amber-400",
    bgClass: "bg-amber-500/10",
    isCredit: true,
  },
};

// Status configuration
const statusConfig: Record<
  string,
  { icon: React.ElementType; colorClass: string }
> = {
  completed: { icon: CheckCircle, colorClass: "text-green-500" },
  pending: { icon: Clock, colorClass: "text-amber-500" },
  processing: { icon: RefreshCw, colorClass: "text-blue-500" },
  failed: { icon: XCircle, colorClass: "text-red-500" },
  reversed: { icon: RotateCcw, colorClass: "text-amber-500" },
  cancelled: { icon: XCircle, colorClass: "text-gray-500" },
};

interface TransactionItemProps {
  transaction: WalletTransaction;
  compact?: boolean;
  onClick?: (transaction: WalletTransaction) => void;
}

function TransactionItem({ transaction, compact = false, onClick }: TransactionItemProps) {
  const config = transactionTypeConfig[transaction.type] ?? {
    label: transaction.type,
    icon: Wallet,
    colorClass: "text-gray-600",
    bgClass: "bg-gray-500/10",
    isCredit: false,
  };

  const statusConf = statusConfig[transaction.status] ?? {
    icon: Clock,
    colorClass: "text-gray-500",
  };

  const Icon = config.icon;
  const StatusIcon = statusConf.icon;
  const isCredit = config.isCredit;

  const handleClick = () => {
    if (onClick) {
      onClick(transaction);
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 py-3",
        !compact && "border-b last:border-0",
        onClick && "cursor-pointer hover:bg-muted/50 rounded-lg px-2 -mx-2 transition-colors"
      )}
      onClick={handleClick}
      data-testid={`transaction-item-${transaction.id}`}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") handleClick(); } : undefined}
    >
      {/* Transaction Icon */}
      <div className={cn("p-2 rounded-full shrink-0", config.bgClass)}>
        <Icon className={cn("h-4 w-4", config.colorClass)} />
      </div>

      {/* Transaction Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm truncate">{config.label}</p>
          <StatusIcon
            className={cn("h-3 w-3 shrink-0", statusConf.colorClass)}
          />
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {transaction.description ||
            formatDistanceToNow(new Date(transaction.createdAt), {
              addSuffix: true,
            })}
        </p>
      </div>

      {/* Amount */}
      <div className="text-right shrink-0">
        <p
          className={cn(
            "font-semibold text-sm",
            isCredit ? "text-green-600 dark:text-green-400" : "text-foreground"
          )}
        >
          {isCredit ? "+" : "-"}
          {formatCurrency(transaction.amount, transaction.currency)}
        </p>
        {!compact && (
          <p className="text-xs text-muted-foreground">
            {format(new Date(transaction.createdAt), "MMM d, yyyy")}
          </p>
        )}
      </div>

      {/* View Receipt Icon - shown when clickable */}
      {onClick && !compact && (
        <div className="shrink-0 text-muted-foreground">
          <Eye className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}

interface TransactionListProps {
  transactions: WalletTransaction[];
  isLoading?: boolean;
  compact?: boolean;
  showFilters?: boolean;
  showReceiptDialog?: boolean;
  onFilterChange?: (filters: {
    type?: string;
    status?: string;
  }) => void;
  onTransactionClick?: (transaction: WalletTransaction) => void;
}

export function TransactionList({
  transactions,
  isLoading = false,
  compact = false,
  showFilters = false,
  showReceiptDialog = true,
  onFilterChange,
  onTransactionClick,
}: TransactionListProps) {
  const [typeFilter, setTypeFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [selectedTransaction, setSelectedTransaction] = React.useState<WalletTransaction | null>(null);
  const [receiptOpen, setReceiptOpen] = React.useState(false);

  // Handle transaction click
  const handleTransactionClick = (transaction: WalletTransaction) => {
    if (onTransactionClick) {
      onTransactionClick(transaction);
    } else if (showReceiptDialog) {
      setSelectedTransaction(transaction);
      setReceiptOpen(true);
    }
  };

  // Handle filter changes
  React.useEffect(() => {
    if (onFilterChange) {
      onFilterChange({
        type: typeFilter === "all" ? undefined : typeFilter,
        status: statusFilter === "all" ? undefined : statusFilter,
      });
    }
  }, [typeFilter, statusFilter, onFilterChange]);

  // Filter transactions locally if no callback provided
  const filteredTransactions = React.useMemo(() => {
    if (onFilterChange) return transactions; // Server-side filtering

    return transactions.filter((tx) => {
      if (typeFilter !== "all" && tx.type !== typeFilter) return false;
      if (statusFilter !== "all" && tx.status !== statusFilter) return false;
      return true;
    });
  }, [transactions, typeFilter, statusFilter, onFilterChange]);

  if (isLoading) {
    return (
      <div className="space-y-3" data-testid="transactions-loading">
        {[...Array(compact ? 3 : 5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-3 animate-pulse">
            <div className="w-10 h-10 bg-muted rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-24 bg-muted rounded" />
              <div className="h-3 w-32 bg-muted rounded" />
            </div>
            <div className="h-4 w-16 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div data-testid="transaction-list">
      {/* Filters */}
      {showFilters && (
        <div className="flex flex-wrap gap-3 mb-4" data-testid="transaction-filters">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Filter:</span>
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px] h-8" data-testid="type-filter">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="deposit">Deposits</SelectItem>
              <SelectItem value="withdrawal">Withdrawals</SelectItem>
              <SelectItem value="transfer_in">Received</SelectItem>
              <SelectItem value="transfer_out">Sent</SelectItem>
              <SelectItem value="expense_disbursement">Expenses</SelectItem>
              <SelectItem value="expense_refund">Refunds</SelectItem>
              <SelectItem value="airtime_purchase">Airtime</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] h-8" data-testid="status-filter">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="reversed">Reversed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Empty State */}
      {filteredTransactions.length === 0 ? (
        <div
          className="text-center py-8"
          data-testid="transactions-empty"
        >
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">No transactions found</p>
          {(typeFilter !== "all" || statusFilter !== "all") && (
            <Button
              variant="link"
              size="sm"
              onClick={() => {
                setTypeFilter("all");
                setStatusFilter("all");
              }}
              className="mt-2"
            >
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <div className={cn(!compact && "divide-y")}>
          {filteredTransactions.map((transaction) => (
            <TransactionItem
              key={transaction.id}
              transaction={transaction}
              compact={compact}
              onClick={!compact ? handleTransactionClick : undefined}
            />
          ))}
        </div>
      )}

      {/* Receipt Dialog */}
      {showReceiptDialog && !onTransactionClick && (
        <TransactionReceiptDialog
          transaction={selectedTransaction}
          open={receiptOpen}
          onOpenChange={setReceiptOpen}
        />
      )}
    </div>
  );
}
