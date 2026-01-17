import { useState } from "react";
import { Check, X, Clock, Loader2, DollarSign, FileText, Calendar, Package, AlertCircle } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import { useApproveRequest, useRejectRequest } from "~/hooks/useChatApprovals";
import { cn } from "~/lib/utils";
import type { ChatApprovalRequestWithDetails } from "~/data-access/chat-approvals";
import type { ChatApprovalType, ChatApprovalStatus } from "~/db/schema";

interface ApprovalRequestMessageProps {
  approvalRequest: ChatApprovalRequestWithDetails;
  isOwnRequest: boolean;
  className?: string;
}

const approvalTypeIcons: Record<ChatApprovalType, typeof FileText> = {
  expense: DollarSign,
  time_off: Calendar,
  purchase: Package,
  document: FileText,
  general: AlertCircle,
};

const approvalTypeLabels: Record<ChatApprovalType, string> = {
  expense: "Expense",
  time_off: "Time Off",
  purchase: "Purchase",
  document: "Document",
  general: "General",
};

const statusConfig: Record<
  ChatApprovalStatus,
  { label: string; color: string; icon: typeof Check }
> = {
  pending: {
    label: "Pending",
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    icon: Clock,
  },
  approved: {
    label: "Approved",
    color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    icon: Check,
  },
  rejected: {
    label: "Rejected",
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    icon: X,
  },
};

function formatCurrency(amount: string, currency: string): string {
  const num = parseFloat(amount);
  if (isNaN(num)) return `${currency} ${amount}`;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(num);
}

export function ApprovalRequestMessage({
  approvalRequest,
  isOwnRequest,
  className,
}: ApprovalRequestMessageProps) {
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [approveComment, setApproveComment] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  const approveRequest = useApproveRequest();
  const rejectRequest = useRejectRequest();

  const status = approvalRequest.status as ChatApprovalStatus;
  const type = approvalRequest.approvalType as ChatApprovalType;
  const TypeIcon = approvalTypeIcons[type] || FileText;
  const StatusIcon = statusConfig[status].icon;

  const isPending = status === "pending";
  const canRespond = isPending && !isOwnRequest;

  const handleApprove = async () => {
    try {
      await approveRequest.mutateAsync({
        id: approvalRequest.id,
        comment: approveComment || undefined,
      });
      setShowApproveDialog(false);
      setApproveComment("");
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;

    try {
      await rejectRequest.mutateAsync({
        id: approvalRequest.id,
        reason: rejectReason,
      });
      setShowRejectDialog(false);
      setRejectReason("");
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  return (
    <>
      <div
        className={cn(
          "rounded-xl border bg-card p-4 shadow-sm w-full max-w-md",
          className
        )}
        data-testid="approval-request-message"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <TypeIcon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {approvalTypeLabels[type]} Request
              </p>
              <h4 className="font-semibold text-sm leading-tight">
                {approvalRequest.title}
              </h4>
            </div>
          </div>
          <Badge className={cn("shrink-0", statusConfig[status].color)}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {statusConfig[status].label}
          </Badge>
        </div>

        {/* Description */}
        {approvalRequest.description && (
          <p className="text-sm text-muted-foreground mb-3">
            {approvalRequest.description}
          </p>
        )}

        {/* Amount (if applicable) */}
        {approvalRequest.amount && (
          <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-muted/50">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold">
              {formatCurrency(
                approvalRequest.amount,
                approvalRequest.currency || "USD"
              )}
            </span>
          </div>
        )}

        {/* Response (if not pending) */}
        {!isPending && approvalRequest.responseComment && (
          <div className="mb-3 p-2 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">
              {status === "approved" ? "Approval Comment" : "Rejection Reason"}:
            </p>
            <p className="text-sm">{approvalRequest.responseComment}</p>
          </div>
        )}

        {/* Action Buttons (only for non-own pending requests) */}
        {canRespond && (
          <div className="flex gap-2 mt-4">
            <Button
              size="sm"
              onClick={() => setShowApproveDialog(true)}
              className="flex-1"
              data-testid="approve-button"
            >
              <Check className="h-4 w-4 mr-1" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setShowRejectDialog(true)}
              className="flex-1"
              data-testid="reject-button"
            >
              <X className="h-4 w-4 mr-1" />
              Reject
            </Button>
          </div>
        )}

        {/* Status footer for own requests */}
        {isOwnRequest && isPending && (
          <p className="text-xs text-muted-foreground mt-3 text-center">
            Waiting for approval...
          </p>
        )}
      </div>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Request</DialogTitle>
            <DialogDescription>
              You are about to approve "{approvalRequest.title}"
              {approvalRequest.amount &&
                ` for ${formatCurrency(
                  approvalRequest.amount,
                  approvalRequest.currency || "USD"
                )}`}
              .
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="approve-comment">
                Comment (optional)
              </Label>
              <Textarea
                id="approve-comment"
                placeholder="Add a comment for the requester..."
                value={approveComment}
                onChange={(e) => setApproveComment(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowApproveDialog(false)}
              disabled={approveRequest.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={approveRequest.isPending}
              data-testid="confirm-approve-button"
            >
              {approveRequest.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Approve
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
            <DialogTitle>Reject Request</DialogTitle>
            <DialogDescription>
              You are about to reject "{approvalRequest.title}". Please provide a
              reason for the rejection.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reject-reason">
                Rejection Reason <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="reject-reason"
                placeholder="Explain why this request is being rejected..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(false)}
              disabled={rejectRequest.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejectRequest.isPending || !rejectReason.trim()}
              data-testid="confirm-reject-button"
            >
              {rejectRequest.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Rejecting...
                </>
              ) : (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Reject
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
