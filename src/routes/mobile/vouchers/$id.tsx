/**
 * Mobile Expense Voucher Detail and Reconciliation Page
 *
 * Displays voucher details with reconciliation actions,
 * GL posting status, and approval history.
 */

import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  XCircle,
  DollarSign,
  Receipt,
  FileCheck,
  FileX,
  BookOpen,
  Loader2,
  AlertCircle,
  User,
  Calendar,
  FileText,
  Building,
  CreditCard,
  Hash,
  CheckCircle2,
  Clipboard,
  AlertTriangle,
} from "lucide-react";
import { authClient } from "~/lib/auth-client";
import { redirect } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  useExpenseVoucherDetails,
  useReconcileExpenseVoucher,
} from "~/hooks/useExpenseVouchers";
import { cn } from "~/lib/utils";
import { format } from "date-fns";
import type { ExpenseVoucherStatus, ReconciliationStatus, PostingStatus } from "~/db/schema";

export const Route = createFileRoute("/mobile/vouchers/$id")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session) {
      throw redirect({
        to: "/sign-in",
        search: { redirect: "/mobile/vouchers" },
      });
    }
  },
  component: MobileVoucherDetailPage,
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
  { label: string; colorClass: string; bgClass: string; description: string }
> = {
  unreconciled: {
    label: "Unreconciled",
    colorClass: "text-orange-600 dark:text-orange-400",
    bgClass: "bg-orange-500/10",
    description: "This voucher has not been reconciled yet",
  },
  partially_reconciled: {
    label: "Partially Reconciled",
    colorClass: "text-yellow-600 dark:text-yellow-400",
    bgClass: "bg-yellow-500/10",
    description: "This voucher has been partially reconciled",
  },
  reconciled: {
    label: "Reconciled",
    colorClass: "text-green-600 dark:text-green-400",
    bgClass: "bg-green-500/10",
    description: "This voucher has been successfully reconciled",
  },
  disputed: {
    label: "Disputed",
    colorClass: "text-red-600 dark:text-red-400",
    bgClass: "bg-red-500/10",
    description: "This reconciliation is disputed",
  },
};

const POSTING_CONFIG: Record<
  PostingStatus,
  { label: string; colorClass: string; bgClass: string }
> = {
  not_posted: {
    label: "Not Posted",
    colorClass: "text-gray-600",
    bgClass: "bg-gray-500/10",
  },
  pending: {
    label: "Pending",
    colorClass: "text-yellow-600",
    bgClass: "bg-yellow-500/10",
  },
  posted: {
    label: "Posted to GL",
    colorClass: "text-green-600",
    bgClass: "bg-green-500/10",
  },
  failed: {
    label: "Posting Failed",
    colorClass: "text-red-600",
    bgClass: "bg-red-500/10",
  },
  reversed: {
    label: "Reversed",
    colorClass: "text-purple-600",
    bgClass: "bg-purple-500/10",
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

function MobileVoucherDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [showReconcileDialog, setShowReconcileDialog] = React.useState(false);
  const [reconcileReference, setReconcileReference] = React.useState("");
  const [reconcileNotes, setReconcileNotes] = React.useState("");

  const { data: voucher, isLoading, error } = useExpenseVoucherDetails(id);
  const reconcileVoucher = useReconcileExpenseVoucher();

  const handleReconcile = async () => {
    if (!reconcileReference.trim()) return;

    await reconcileVoucher.mutateAsync({
      id,
      reference: reconcileReference,
      notes: reconcileNotes || undefined,
    });

    setShowReconcileDialog(false);
    setReconcileReference("");
    setReconcileNotes("");
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading voucher...</p>
      </div>
    );
  }

  if (error || !voucher) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
          <div className="flex items-center px-4 py-3">
            <Link to="/mobile/vouchers">
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-lg font-semibold ml-3">Voucher Details</h1>
          </div>
        </header>
        <div className="flex flex-col items-center justify-center flex-1 px-4 text-center">
          <div className="p-3 rounded-full bg-red-500/10 mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-lg font-semibold mb-2">Voucher not found</h2>
          <p className="text-sm text-muted-foreground mb-4">
            This voucher may have been deleted or you don't have access to it.
          </p>
          <Link to="/mobile/vouchers">
            <Button variant="outline">Back to Vouchers</Button>
          </Link>
        </div>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[voucher.status as ExpenseVoucherStatus];
  const StatusIcon = statusConfig.icon;
  const reconciliationConfig = voucher.reconciliationStatus
    ? RECONCILIATION_CONFIG[voucher.reconciliationStatus as ReconciliationStatus]
    : null;
  const postingConfig = voucher.postingStatus
    ? POSTING_CONFIG[voucher.postingStatus as PostingStatus]
    : null;

  const canReconcile =
    voucher.status === "posted" && voucher.reconciliationStatus === "unreconciled";

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to="/mobile/vouchers">
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-semibold">Voucher Details</h1>
              <p className="text-xs text-muted-foreground font-mono">
                {voucher.voucherNumber}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Status Card */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className={cn("p-3 rounded-full", statusConfig.bgClass)}>
                <StatusIcon className={cn("w-6 h-6", statusConfig.colorClass)} />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap gap-2 mb-1">
                  <Badge
                    variant="outline"
                    className={cn(statusConfig.bgClass, statusConfig.colorClass, "border-0")}
                  >
                    {statusConfig.label}
                  </Badge>
                  {postingConfig && voucher.status === "approved" && (
                    <Badge
                      variant="outline"
                      className={cn(postingConfig.bgClass, postingConfig.colorClass, "border-0")}
                    >
                      {postingConfig.label}
                    </Badge>
                  )}
                </div>
                {reconciliationConfig && voucher.status === "posted" && (
                  <p className="text-sm text-muted-foreground">
                    {reconciliationConfig.description}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Amount Card */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
                <span className="text-muted-foreground">Total Amount</span>
              </div>
              <span className="text-2xl font-bold">
                {formatCurrency(voucher.amount, voucher.currency)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Details Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Voucher Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <FileText className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Description</p>
                <p className="text-sm text-muted-foreground">{voucher.description}</p>
              </div>
            </div>

            {voucher.vendorName && (
              <div className="flex items-center gap-3">
                <Building className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Vendor</p>
                  <p className="text-sm text-muted-foreground">{voucher.vendorName}</p>
                </div>
              </div>
            )}

            {voucher.glAccountCode && (
              <div className="flex items-center gap-3">
                <Hash className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">GL Account</p>
                  <p className="text-sm text-muted-foreground">
                    {voucher.glAccountCode}
                    {voucher.glAccountName && ` - ${voucher.glAccountName}`}
                  </p>
                </div>
              </div>
            )}

            {voucher.paymentMethod && (
              <div className="flex items-center gap-3">
                <CreditCard className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Payment Method</p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {voucher.paymentMethod.replace("_", " ")}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Created</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(voucher.createdAt), "PPP 'at' p")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Line Items Card */}
        {voucher.lineItems && voucher.lineItems.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Line Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {voucher.lineItems.map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{item.description}</p>
                    {item.glAccountCode && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {item.glAccountCode}
                      </p>
                    )}
                  </div>
                  <p className="text-sm font-semibold ml-3">
                    {formatCurrency(item.amount, voucher.currency)}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* GL Posting Card */}
        {voucher.status === "posted" && voucher.glPostingDate && (
          <Card className="border-blue-200 dark:border-blue-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-blue-600 dark:text-blue-400">
                GL Posting Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Posted Date</span>
                <span>{format(new Date(voucher.glPostingDate), "PPP")}</span>
              </div>
              {voucher.glPostingReference && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Reference</span>
                  <span className="font-mono">{voucher.glPostingReference}</span>
                </div>
              )}
              {voucher.glJournalEntryId && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Journal Entry</span>
                  <span className="font-mono">{voucher.glJournalEntryId}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Reconciliation Card */}
        {voucher.reconciliationStatus === "reconciled" && voucher.reconciliationDate && (
          <Card className="border-green-200 dark:border-green-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-green-600 dark:text-green-400">
                Reconciliation Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Reconciled Date</span>
                <span>{format(new Date(voucher.reconciliationDate), "PPP")}</span>
              </div>
              {voucher.reconciliationReference && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Reference</span>
                  <span className="font-mono">{voucher.reconciliationReference}</span>
                </div>
              )}
              {voucher.reconciliationNotes && (
                <div className="mt-2">
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="text-sm mt-1">{voucher.reconciliationNotes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Approval History Card */}
        {voucher.approvalHistory && voucher.approvalHistory.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Approval History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {voucher.approvalHistory.map((history, index) => (
                <div key={history.id} className="flex items-start gap-3">
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full mt-2",
                      history.action === "approved" && "bg-green-500",
                      history.action === "rejected" && "bg-red-500",
                      history.action === "returned" && "bg-yellow-500"
                    )}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{history.approver.name}</p>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          history.action === "approved" && "bg-green-500/10 text-green-600",
                          history.action === "rejected" && "bg-red-500/10 text-red-600",
                          history.action === "returned" && "bg-yellow-500/10 text-yellow-600"
                        )}
                      >
                        {history.action}
                      </Badge>
                    </div>
                    {history.comments && (
                      <p className="text-sm text-muted-foreground mt-1">{history.comments}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(history.actionAt), "PPP 'at' p")}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Reconcile Action Button */}
        {canReconcile && (
          <div className="pb-4">
            <Button
              onClick={() => setShowReconcileDialog(true)}
              className="w-full"
              size="lg"
              data-testid="reconcile-btn"
            >
              <Clipboard className="w-5 h-5 mr-2" />
              Reconcile Voucher
            </Button>
          </div>
        )}
      </div>

      {/* Reconcile Dialog */}
      <Dialog open={showReconcileDialog} onOpenChange={setShowReconcileDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clipboard className="w-5 h-5 text-primary" />
              Reconcile Voucher
            </DialogTitle>
            <DialogDescription>
              Mark this voucher as reconciled by providing a reconciliation reference.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Reconciliation Reference <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="e.g., Bank statement ref, check number..."
                value={reconcileReference}
                onChange={(e) => setReconcileReference(e.target.value)}
                data-testid="reconcile-reference"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Notes (optional)</label>
              <Textarea
                placeholder="Add any notes about this reconciliation..."
                value={reconcileNotes}
                onChange={(e) => setReconcileNotes(e.target.value)}
                className="min-h-[80px]"
                data-testid="reconcile-notes"
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowReconcileDialog(false)}
              disabled={reconcileVoucher.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReconcile}
              disabled={reconcileVoucher.isPending || !reconcileReference.trim()}
              data-testid="confirm-reconcile-btn"
            >
              {reconcileVoucher.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Reconciling...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirm Reconciliation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
