/**
 * WalletDashboard Component
 *
 * Mobile-friendly wallet interface showing:
 * - Current balance
 * - Available/Pending balance breakdown
 * - Quick actions (Top-up, Transfer)
 * - Recent transactions
 */

import * as React from "react";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  Send,
  RefreshCw,
  Eye,
  EyeOff,
  TrendingUp,
  TrendingDown,
  Clock,
  ChevronRight,
  Smartphone,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import { useMyWalletBalance, useWalletTransactions } from "~/hooks/useWalletBalance";
import { TransactionList } from "./TransactionList";
import { TopUpDialog } from "./TopUpDialog";
import { TransferDialog } from "./TransferDialog";

// Currency formatting helper
function formatCurrency(amount: string | number, currency: string = "USD"): string {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
  }).format(numAmount);
}

export function WalletDashboard() {
  const [showBalance, setShowBalance] = React.useState(true);
  const [topUpOpen, setTopUpOpen] = React.useState(false);
  const [transferOpen, setTransferOpen] = React.useState(false);

  // Fetch wallet balance
  const {
    data: walletData,
    isLoading: isLoadingBalance,
    error: balanceError,
    refetch: refetchBalance,
  } = useMyWalletBalance();

  // Fetch recent transactions
  const {
    data: transactions,
    isLoading: isLoadingTransactions,
    refetch: refetchTransactions,
  } = useWalletTransactions({ limit: 5 });

  const handleRefresh = async () => {
    await Promise.all([refetchBalance(), refetchTransactions()]);
  };

  // Calculate balance display values
  const balance = walletData?.balance ?? "0.00";
  const availableBalance = walletData?.availableBalance ?? "0.00";
  const pendingBalance = walletData?.pendingBalance ?? "0.00";
  const currency = walletData?.currency ?? "USD";
  const status = walletData?.status ?? "active";

  // Check if there are pending funds
  const hasPendingFunds = parseFloat(pendingBalance) > 0;

  return (
    <div className="space-y-6" data-testid="wallet-dashboard">
      {/* Balance Card */}
      <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20 overflow-hidden relative">
        <div className="absolute inset-0 bg-grid-white/5 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />
        <CardHeader className="relative pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-primary/10">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Balance
                </CardTitle>
                <Badge
                  variant={status === "active" ? "default" : "destructive"}
                  className="mt-1 text-xs"
                  data-testid="wallet-status-badge"
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setShowBalance(!showBalance)}
                data-testid="toggle-balance-visibility"
              >
                {showBalance ? (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleRefresh}
                disabled={isLoadingBalance}
                data-testid="refresh-balance-button"
              >
                <RefreshCw
                  className={cn(
                    "h-4 w-4 text-muted-foreground",
                    isLoadingBalance && "animate-spin"
                  )}
                />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative">
          {isLoadingBalance ? (
            <div className="animate-pulse">
              <div className="h-10 w-48 bg-muted rounded mb-4" />
              <div className="h-4 w-32 bg-muted rounded" />
            </div>
          ) : balanceError ? (
            <div className="text-destructive" data-testid="balance-error">
              Failed to load balance. Please try again.
            </div>
          ) : (
            <>
              <div className="mb-4">
                <p
                  className="text-4xl font-bold tracking-tight"
                  data-testid="wallet-balance"
                >
                  {showBalance ? formatCurrency(balance, currency) : "••••••"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {currency} Wallet
                </p>
              </div>

              {/* Balance Breakdown */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-background/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-1">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-xs font-medium">Available</span>
                  </div>
                  <p
                    className="text-lg font-semibold"
                    data-testid="available-balance"
                  >
                    {showBalance
                      ? formatCurrency(availableBalance, currency)
                      : "••••"}
                  </p>
                </div>
                <div className="bg-background/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-1">
                    <Clock className="h-4 w-4" />
                    <span className="text-xs font-medium">Pending</span>
                  </div>
                  <p
                    className="text-lg font-semibold"
                    data-testid="pending-balance"
                  >
                    {showBalance
                      ? formatCurrency(pendingBalance, currency)
                      : "••••"}
                  </p>
                </div>
              </div>

              {hasPendingFunds && (
                <p className="text-xs text-muted-foreground mt-3">
                  Some funds are locked for pending transactions
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-3" data-testid="quick-actions">
        <Button
          variant="outline"
          className="flex flex-col items-center gap-2 h-auto py-4 hover:bg-primary/5 hover:border-primary/50"
          onClick={() => setTopUpOpen(true)}
          disabled={status !== "active"}
          data-testid="topup-button"
        >
          <div className="p-2 rounded-full bg-green-500/10">
            <Plus className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <span className="text-sm font-medium">Top Up</span>
        </Button>

        <Button
          variant="outline"
          className="flex flex-col items-center gap-2 h-auto py-4 hover:bg-primary/5 hover:border-primary/50"
          onClick={() => setTransferOpen(true)}
          disabled={status !== "active"}
          data-testid="transfer-button"
        >
          <div className="p-2 rounded-full bg-blue-500/10">
            <Send className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <span className="text-sm font-medium">Transfer</span>
        </Button>

        <Button
          variant="outline"
          className="flex flex-col items-center gap-2 h-auto py-4 hover:bg-primary/5 hover:border-primary/50"
          disabled={status !== "active"}
          data-testid="airtime-button"
        >
          <div className="p-2 rounded-full bg-purple-500/10">
            <Smartphone className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <span className="text-sm font-medium">Airtime</span>
        </Button>
      </div>

      {/* Recent Transactions */}
      <Card data-testid="recent-transactions-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">
              Recent Transactions
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary hover:text-primary/80"
              asChild
            >
              <a href="/dashboard/wallet/transactions">
                View All
                <ChevronRight className="ml-1 h-4 w-4" />
              </a>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <TransactionList
            transactions={transactions ?? []}
            isLoading={isLoadingTransactions}
            compact
          />
        </CardContent>
      </Card>

      {/* Dialogs */}
      <TopUpDialog
        open={topUpOpen}
        onOpenChange={setTopUpOpen}
        currency={currency}
      />
      <TransferDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
        currency={currency}
        availableBalance={availableBalance}
      />
    </div>
  );
}
