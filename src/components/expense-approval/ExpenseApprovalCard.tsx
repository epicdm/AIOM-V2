import * as React from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  User,
  FileText,
  Calendar,
  Receipt,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Textarea } from "~/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import type { ExpenseRequestWithUsers } from "~/data-access/expense-requests";

interface ExpenseApprovalCardProps {
  request: ExpenseRequestWithUsers;
  onApprove: (id: string, comment?: string) => Promise<void>;
  onReject: (id: string, reason: string) => Promise<void>;
  isProcessing?: boolean;
}

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
 * Get initials from a name
 */
function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Expense Approval Card Component
 * Displays expense request details with approval/rejection actions
 */
export function ExpenseApprovalCard({
  request,
  onApprove,
  onReject,
  isProcessing = false,
}: ExpenseApprovalCardProps) {
  const [showRejectDialog, setShowRejectDialog] = React.useState(false);
  const [showApproveDialog, setShowApproveDialog] = React.useState(false);
  const [rejectionReason, setRejectionReason] = React.useState("");
  const [approvalComment, setApprovalComment] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleApprove = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await onApprove(request.id, approvalComment || undefined);
      setShowApproveDialog(false);
      setApprovalComment("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve request");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      setError("Please provide a reason for rejection");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await onReject(request.id, rejectionReason);
      setShowRejectDialog(false);
      setRejectionReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject request");
    } finally {
      setIsSubmitting(false);
    }
  };

  const submittedDate = new Date(request.submittedAt);
  const timeAgo = formatDistanceToNow(submittedDate, { addSuffix: true });
  const formattedDate = format(submittedDate, "MMM d, yyyy 'at' h:mm a");

  return (
    <>
      <Card
        className={cn(
          "transition-all duration-200 hover:shadow-md",
          isProcessing && "opacity-50 pointer-events-none"
        )}
        data-testid={`expense-card-${request.id}`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                {request.requester.image ? (
                  <AvatarImage
                    src={request.requester.image}
                    alt={request.requester.name}
                  />
                ) : (
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getInitials(request.requester.name)}
                  </AvatarFallback>
                )}
              </Avatar>
              <div>
                <CardTitle className="text-lg">
                  {request.requester.name}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {request.requester.email}
                </p>
              </div>
            </div>
            <Badge
              variant="outline"
              className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
            >
              <Clock className="w-3 h-3 mr-1" />
              Pending
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Amount Display */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground">Amount</span>
            </div>
            <span className="text-2xl font-bold text-primary">
              {formatCurrency(request.amount, request.currency)}
            </span>
          </div>

          {/* Request Details */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <FileText className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Purpose</p>
                <p className="text-sm text-muted-foreground">{request.purpose}</p>
              </div>
            </div>

            {request.description && (
              <div className="flex items-start gap-3">
                <User className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Description</p>
                  <p className="text-sm text-muted-foreground">
                    {request.description}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Submitted</p>
                <p className="text-sm text-muted-foreground" title={formattedDate}>
                  {timeAgo}
                </p>
              </div>
            </div>

            {request.receiptUrl && (
              <div className="flex items-center gap-3">
                <Receipt className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Receipt</p>
                  <a
                    href={request.receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    View attached receipt
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1 border-red-500/20 text-red-600 hover:bg-red-500/10 hover:text-red-700"
              onClick={() => setShowRejectDialog(true)}
              disabled={isProcessing}
              data-testid={`reject-btn-${request.id}`}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject
            </Button>
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              onClick={() => setShowApproveDialog(true)}
              disabled={isProcessing}
              data-testid={`approve-btn-${request.id}`}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Approve Expense Request
            </DialogTitle>
            <DialogDescription>
              You are about to approve an expense request of{" "}
              <strong>{formatCurrency(request.amount, request.currency)}</strong>{" "}
              from <strong>{request.requester.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="approval-comment"
                className="text-sm font-medium mb-2 block"
              >
                Comment (optional)
              </label>
              <Textarea
                id="approval-comment"
                placeholder="Add a comment for the requester..."
                value={approvalComment}
                onChange={(e) => setApprovalComment(e.target.value)}
                className="min-h-[80px]"
                data-testid="approval-comment"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-500/10 p-3 rounded-lg">
                <AlertTriangle className="w-4 h-4" />
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowApproveDialog(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleApprove}
              disabled={isSubmitting}
              data-testid="confirm-approve-btn"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirm Approval
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              Reject Expense Request
            </DialogTitle>
            <DialogDescription>
              You are about to reject an expense request of{" "}
              <strong>{formatCurrency(request.amount, request.currency)}</strong>{" "}
              from <strong>{request.requester.name}</strong>. Please provide a
              reason.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="rejection-reason"
                className="text-sm font-medium mb-2 block"
              >
                Reason for Rejection <span className="text-red-500">*</span>
              </label>
              <Textarea
                id="rejection-reason"
                placeholder="Please explain why this request is being rejected..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="min-h-[100px]"
                required
                data-testid="rejection-reason"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-500/10 p-3 rounded-lg">
                <AlertTriangle className="w-4 h-4" />
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isSubmitting || !rejectionReason.trim()}
              data-testid="confirm-reject-btn"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Rejecting...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  Confirm Rejection
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
