import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus, FileText, Filter, Search } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { useMyExpenseVouchers } from "~/hooks/useExpenseVouchers";
import type { ExpenseVoucherStatus } from "~/db/schema";

export const Route = createFileRoute("/dashboard/vouchers/")({
  component: VouchersPage,
});

// Status badge styles
const STATUS_STYLES: Record<
  ExpenseVoucherStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  draft: { label: "Draft", variant: "secondary" },
  pending_approval: { label: "Pending Approval", variant: "default" },
  approved: { label: "Approved", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
  posted: { label: "Posted", variant: "default" },
  voided: { label: "Voided", variant: "outline" },
};

function VouchersPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<ExpenseVoucherStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: vouchers, isLoading } = useMyExpenseVouchers(
    statusFilter === "all" ? undefined : { status: statusFilter }
  );

  // Filter vouchers by search query
  const filteredVouchers = vouchers?.filter((voucher) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      voucher.voucherNumber.toLowerCase().includes(query) ||
      voucher.description.toLowerCase().includes(query) ||
      voucher.vendorName?.toLowerCase().includes(query)
    );
  });

  const formatCurrency = (amount: string, currency: string) => {
    const symbols: Record<string, string> = {
      USD: "$",
      EUR: "€",
      GBP: "£",
      CAD: "C$",
      AUD: "A$",
      JPY: "¥",
      CHF: "CHF",
    };
    return `${symbols[currency] || currency}${parseFloat(amount).toLocaleString()}`;
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Expense Vouchers</h1>
            <p className="text-muted-foreground mt-2">
              Manage and track your expense vouchers
            </p>
          </div>

          <Button asChild data-testid="create-voucher-button">
            <Link to="/dashboard/vouchers/create">
              <Plus className="h-4 w-4 mr-2" />
              New Voucher
            </Link>
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search vouchers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="search-vouchers-input"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select
                  value={statusFilter}
                  onValueChange={(value) =>
                    setStatusFilter(value as ExpenseVoucherStatus | "all")
                  }
                >
                  <SelectTrigger className="w-[180px]" data-testid="status-filter">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="pending_approval">Pending Approval</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="posted">Posted</SelectItem>
                    <SelectItem value="voided">Voided</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vouchers List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
            <p className="text-muted-foreground mt-4">Loading vouchers...</p>
          </div>
        ) : filteredVouchers && filteredVouchers.length > 0 ? (
          <div className="space-y-4">
            {filteredVouchers.map((voucher) => (
              <Card
                key={voucher.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate({ to: `/dashboard/vouchers/${voucher.id}` })}
                data-testid={`voucher-card-${voucher.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium text-primary">
                          {voucher.voucherNumber}
                        </span>
                        <Badge
                          variant={STATUS_STYLES[voucher.status as ExpenseVoucherStatus]?.variant}
                        >
                          {STATUS_STYLES[voucher.status as ExpenseVoucherStatus]?.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {voucher.description}
                      </p>
                      {voucher.vendorName && (
                        <p className="text-xs text-muted-foreground">
                          Vendor: {voucher.vendorName}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold">
                        {formatCurrency(voucher.amount, voucher.currency)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(voucher.createdAt)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <FileText className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <h2 className="text-xl font-semibold mb-2">No vouchers found</h2>
            <p className="text-muted-foreground mb-4">
              {searchQuery || statusFilter !== "all"
                ? "Try adjusting your filters"
                : "Create your first expense voucher to get started"}
            </p>
            <Button asChild>
              <Link to="/dashboard/vouchers/create">
                <Plus className="h-4 w-4 mr-2" />
                Create Voucher
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
