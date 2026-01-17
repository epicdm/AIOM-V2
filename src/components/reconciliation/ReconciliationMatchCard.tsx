import { useState } from "react";
import { Link2, Link2Off, CheckCircle, AlertTriangle, ChevronDown, ChevronUp, FileText, Receipt } from "lucide-react";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { DiscrepancyList } from "./DiscrepancyBadge";
import { cn } from "~/lib/utils";
import type { ReconciliationMatch } from "~/data-access/expense-reconciliation";

interface ReconciliationMatchCardProps {
  match: ReconciliationMatch;
  onReconcile?: (match: ReconciliationMatch) => void;
  onMarkDiscrepancy?: (match: ReconciliationMatch) => void;
  onUnlink?: (match: ReconciliationMatch) => void;
}

const confidenceStyles = {
  high: { label: "High Match", className: "bg-green-100 text-green-800 border-green-200" },
  medium: { label: "Medium Match", className: "bg-amber-100 text-amber-800 border-amber-200" },
  low: { label: "Low Match", className: "bg-red-100 text-red-800 border-red-200" },
};

export function ReconciliationMatchCard({
  match,
  onReconcile,
  onMarkDiscrepancy,
  onUnlink,
}: ReconciliationMatchCardProps) {
  const [expanded, setExpanded] = useState(false);

  const { expenseRequest, expenseVoucher, discrepancies, matchConfidence, isReconciled } = match;
  const confidence = confidenceStyles[matchConfidence];

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

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card
      className={cn(
        "transition-shadow hover:shadow-md",
        isReconciled && "border-green-200 bg-green-50/30"
      )}
      data-testid={`reconciliation-match-${match.id}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <Link2 className="h-3 w-3 text-primary" />
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-primary font-medium">
                  {expenseVoucher.voucherNumber}
                </span>
                <Badge variant="outline" className={confidence.className}>
                  {confidence.label}
                </Badge>
                {isReconciled && (
                  <Badge className="bg-green-600 text-white">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Reconciled
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Matched with expense request
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isReconciled && (
              <>
                {discrepancies.length > 0 ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onMarkDiscrepancy?.(match)}
                    data-testid="mark-discrepancy-button"
                  >
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    Flag Issue
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  onClick={() => onReconcile?.(match)}
                  data-testid="reconcile-button"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Reconcile
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onUnlink?.(match)}
              title="Unlink voucher from request"
              data-testid="unlink-button"
            >
              <Link2Off className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setExpanded(!expanded)}
              data-testid="expand-button"
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Summary Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Expense Request Side */}
          <div className="p-4 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-sm">Expense Request</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Amount</span>
                <span className="font-semibold">
                  {formatCurrency(expenseRequest.amount, expenseRequest.currency)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Purpose</span>
                <span className="text-sm truncate max-w-[150px]" title={expenseRequest.purpose}>
                  {expenseRequest.purpose}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Submitted</span>
                <span className="text-sm">{formatDate(expenseRequest.submittedAt)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Requester</span>
                <div className="flex items-center gap-2">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={expenseRequest.requester.image || undefined} />
                    <AvatarFallback className="text-xs">
                      {getInitials(expenseRequest.requester.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{expenseRequest.requester.name}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Expense Voucher Side */}
          <div className="p-4 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-2 mb-3">
              <Receipt className="h-4 w-4 text-green-600" />
              <span className="font-medium text-sm">Expense Voucher</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Amount</span>
                <span className="font-semibold">
                  {formatCurrency(expenseVoucher.amount, expenseVoucher.currency)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Description</span>
                <span className="text-sm truncate max-w-[150px]" title={expenseVoucher.description}>
                  {expenseVoucher.description}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Created</span>
                <span className="text-sm">{formatDate(expenseVoucher.createdAt)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Submitter</span>
                <div className="flex items-center gap-2">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={expenseVoucher.submitter.image || undefined} />
                    <AvatarFallback className="text-xs">
                      {getInitials(expenseVoucher.submitter.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{expenseVoucher.submitter.name}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Discrepancies */}
        <div className="pt-2 border-t">
          <h4 className="text-sm font-medium mb-2">Discrepancy Analysis</h4>
          <DiscrepancyList discrepancies={discrepancies} showDetails={expanded} />
        </div>

        {/* Expanded Details */}
        {expanded && (
          <div className="pt-4 border-t space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium mb-2">Request Details</h4>
                <dl className="space-y-1">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">ID</dt>
                    <dd className="font-mono text-xs">{expenseRequest.id}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Status</dt>
                    <dd>
                      <Badge variant="outline" className="text-xs">
                        {expenseRequest.status}
                      </Badge>
                    </dd>
                  </div>
                  {expenseRequest.description && (
                    <div>
                      <dt className="text-muted-foreground mb-1">Description</dt>
                      <dd className="bg-muted/50 p-2 rounded text-xs">
                        {expenseRequest.description}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
              <div>
                <h4 className="font-medium mb-2">Voucher Details</h4>
                <dl className="space-y-1">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">ID</dt>
                    <dd className="font-mono text-xs">{expenseVoucher.id}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Status</dt>
                    <dd>
                      <Badge variant="outline" className="text-xs">
                        {expenseVoucher.status}
                      </Badge>
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Vendor</dt>
                    <dd>{expenseVoucher.vendorName || "-"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">GL Account</dt>
                    <dd>{expenseVoucher.glAccountCode || "-"}</dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Reconciliation Info */}
            {isReconciled && match.reconciliationDate && (
              <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                <h4 className="font-medium text-green-800 mb-2">Reconciliation Details</h4>
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-green-700">Date</dt>
                    <dd className="text-green-900">{formatDate(match.reconciliationDate)}</dd>
                  </div>
                  {match.reconciliationNotes && (
                    <div className="col-span-2">
                      <dt className="text-green-700">Notes</dt>
                      <dd className="text-green-900 mt-1">{match.reconciliationNotes}</dd>
                    </div>
                  )}
                </dl>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
