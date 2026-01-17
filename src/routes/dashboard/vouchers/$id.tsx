import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Send,
  CheckCircle,
  XCircle,
  FileText,
  Download,
  Clock,
  User,
  Building2,
  CreditCard,
  Tag,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import {
  useExpenseVoucherDetails,
  useDeleteExpenseVoucher,
} from "~/hooks/useExpenseVouchers";
import type { ExpenseVoucherStatus } from "~/db/schema";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";

export const Route = createFileRoute("/dashboard/vouchers/$id")({
  component: VoucherDetailPage,
});

// Status badge styles
const STATUS_STYLES: Record<
  ExpenseVoucherStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof CheckCircle }
> = {
  draft: { label: "Draft", variant: "secondary", icon: Edit2 },
  pending_approval: { label: "Pending Approval", variant: "default", icon: Clock },
  approved: { label: "Approved", variant: "default", icon: CheckCircle },
  rejected: { label: "Rejected", variant: "destructive", icon: XCircle },
  posted: { label: "Posted", variant: "default", icon: CheckCircle },
  voided: { label: "Voided", variant: "outline", icon: XCircle },
};

// Currency symbols
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  CAD: "C$",
  AUD: "A$",
  JPY: "¥",
  CHF: "CHF",
};

function VoucherDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: voucher, isLoading, error } = useExpenseVoucherDetails(id);
  const deleteVoucher = useDeleteExpenseVoucher();

  const handleDelete = async () => {
    try {
      await deleteVoucher.mutateAsync(id);
      navigate({ to: "/dashboard/vouchers" });
    } catch (error) {
      console.error("Failed to delete voucher:", error);
    }
  };

  const formatCurrency = (amount: string, currency: string) => {
    return `${CURRENCY_SYMBOLS[currency] || currency}${parseFloat(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
        <p className="text-muted-foreground mt-4">Loading voucher details...</p>
      </div>
    );
  }

  if (error || !voucher) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <XCircle className="w-16 h-16 mx-auto text-destructive/50 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Voucher Not Found</h2>
        <p className="text-muted-foreground mb-4">
          The expense voucher you're looking for doesn't exist or has been deleted.
        </p>
        <Button asChild>
          <Link to="/dashboard/vouchers">Back to Vouchers</Link>
        </Button>
      </div>
    );
  }

  const status = voucher.status as ExpenseVoucherStatus;
  const StatusIcon = STATUS_STYLES[status]?.icon || FileText;
  const isDraft = status === "draft";

  // Parse receipt attachments
  const attachments = voucher.receiptAttachments
    ? JSON.parse(voucher.receiptAttachments)
    : [];

  // Parse tags
  const tags = voucher.tags ? JSON.parse(voucher.tags) : [];

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate({ to: "/dashboard/vouchers" })}
              data-testid="back-button"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight font-mono">
                  {voucher.voucherNumber}
                </h1>
                <Badge variant={STATUS_STYLES[status]?.variant}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {STATUS_STYLES[status]?.label}
                </Badge>
              </div>
              <p className="text-muted-foreground mt-1">
                Created {formatDate(voucher.createdAt)}
              </p>
            </div>
          </div>

          {/* Actions */}
          {isDraft && (
            <div className="flex items-center gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Voucher</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this expense voucher? This action
                      cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>

        {/* Main Details Card */}
        <Card>
          <CardHeader>
            <CardTitle>Voucher Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Amount and Description */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-3xl font-bold text-primary">
                  {formatCurrency(voucher.amount, voucher.currency)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="text-base">{voucher.description}</p>
              </div>
            </div>

            {/* Vendor Information */}
            {voucher.vendorName && (
              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Vendor Information</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Vendor Name</p>
                    <p className="text-base">{voucher.vendorName}</p>
                  </div>
                  {voucher.vendorId && (
                    <div>
                      <p className="text-sm text-muted-foreground">Vendor ID</p>
                      <p className="text-base font-mono">{voucher.vendorId}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* GL Account Information */}
            {voucher.glAccountCode && (
              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">GL Account & Cost Allocation</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">GL Account</p>
                    <p className="text-base font-mono">
                      {voucher.glAccountCode}
                      {voucher.glAccountName && (
                        <span className="text-muted-foreground text-sm ml-2">
                          ({voucher.glAccountName})
                        </span>
                      )}
                    </p>
                  </div>
                  {voucher.costCenter && (
                    <div>
                      <p className="text-sm text-muted-foreground">Cost Center</p>
                      <p className="text-base">{voucher.costCenter}</p>
                    </div>
                  )}
                  {voucher.department && (
                    <div>
                      <p className="text-sm text-muted-foreground">Department</p>
                      <p className="text-base">{voucher.department}</p>
                    </div>
                  )}
                  {voucher.projectCode && (
                    <div>
                      <p className="text-sm text-muted-foreground">Project Code</p>
                      <p className="text-base font-mono">{voucher.projectCode}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Payment Information */}
            {voucher.paymentMethod && (
              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Payment Information</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Payment Method</p>
                    <p className="text-base capitalize">
                      {voucher.paymentMethod.replace(/_/g, " ")}
                    </p>
                  </div>
                  {voucher.paymentReference && (
                    <div>
                      <p className="text-sm text-muted-foreground">Reference</p>
                      <p className="text-base font-mono">{voucher.paymentReference}</p>
                    </div>
                  )}
                  {voucher.paymentDate && (
                    <div>
                      <p className="text-sm text-muted-foreground">Payment Date</p>
                      <p className="text-base">{formatDate(voucher.paymentDate)}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Submitter Information */}
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Workflow Information</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Submitted By</p>
                  <p className="text-base">
                    {voucher.submitter?.name || "Unknown"}
                  </p>
                </div>
                {voucher.submittedAt && (
                  <div>
                    <p className="text-sm text-muted-foreground">Submitted At</p>
                    <p className="text-base">{formatDate(voucher.submittedAt)}</p>
                  </div>
                )}
                {voucher.approvedAt && (
                  <div>
                    <p className="text-sm text-muted-foreground">Approved At</p>
                    <p className="text-base">{formatDate(voucher.approvedAt)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Tags</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag: string, index: number) => (
                    <Badge key={index} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {voucher.notes && (
              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground mb-1">Internal Notes</p>
                <p className="text-base whitespace-pre-wrap">{voucher.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Line Items Card */}
        {voucher.lineItems && voucher.lineItems.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Line Items</CardTitle>
              <CardDescription>
                Detailed breakdown of expenses ({voucher.lineItems.length} items)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {voucher.lineItems.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{item.description}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        {item.glAccountCode && (
                          <span className="font-mono">GL: {item.glAccountCode}</span>
                        )}
                        {item.expenseCategory && (
                          <span className="capitalize">
                            {item.expenseCategory.replace(/_/g, " ")}
                          </span>
                        )}
                        {item.quantity && item.quantity !== "1" && (
                          <span>Qty: {item.quantity}</span>
                        )}
                      </div>
                    </div>
                    <p className="font-semibold">
                      {formatCurrency(item.amount, voucher.currency)}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Attachments Card */}
        {attachments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Receipt Attachments</CardTitle>
              <CardDescription>
                {attachments.length} attached file(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {attachments.map((attachment: { id: string; fileName: string; fileSize: number; mimeType: string }) => (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{attachment.fileName}</p>
                        <p className="text-xs text-muted-foreground">
                          {(attachment.fileSize / 1024).toFixed(1)} KB • {attachment.mimeType}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Approval History Card */}
        {voucher.approvalHistory && voucher.approvalHistory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Approval History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {voucher.approvalHistory.map((entry) => (
                  <div key={entry.id} className="flex items-start gap-4">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        entry.action === "approved"
                          ? "bg-green-100 text-green-600"
                          : entry.action === "rejected"
                            ? "bg-red-100 text-red-600"
                            : "bg-blue-100 text-blue-600"
                      }`}
                    >
                      {entry.action === "approved" ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : entry.action === "rejected" ? (
                        <XCircle className="h-4 w-4" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">
                          {entry.approver?.name || "Unknown User"}
                          <span className="text-muted-foreground font-normal ml-2">
                            {entry.action}
                          </span>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(entry.actionAt)}
                        </p>
                      </div>
                      {entry.comments && (
                        <p className="text-sm text-muted-foreground mt-1">
                          "{entry.comments}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
