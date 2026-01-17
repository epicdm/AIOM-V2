/**
 * Mobile Expense Approval Queue Page
 *
 * Mobile-optimized page for reviewing and acting on pending expense requests.
 * Supports swipe actions and quick approve/reject functionality.
 */

import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  RefreshCw,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Receipt,
  User,
  ChevronRight,
  Search,
  Inbox,
  AlertTriangle,
  MessageSquare,
} from "lucide-react";
import { authClient } from "~/lib/auth-client";
import { redirect } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent } from "~/components/ui/card";
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
  getPendingExpenseRequestsFn,
  getExpenseRequestByIdFn,
  approveExpenseRequestFn,
  rejectExpenseRequestFn,
} from "~/fn/expense-requests";
import { toast } from "sonner";
import { cn } from "~/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import type { ExpenseRequestWithUsers } from "~/data-access/expense-requests";

export const Route = createFileRoute("/mobile/approvals/")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session) {
      throw redirect({
        to: "/sign-in",
        search: { redirect: "/mobile/approvals" },
      });
    }
  },
  component: MobileApprovalsPage,
});

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
 * Approval Request Card Component
 */
function ApprovalRequestCard({
  request,
  onApprove,
  onReject,
  isProcessing,
}: {
  request: ExpenseRequestWithUsers;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  isProcessing: boolean;
}) {
  const createdDate = new Date(request.createdAt);

  return (
    <Card
      className={cn(
        "transition-all duration-200",
        isProcessing && "opacity-50 pointer-events-none"
      )}
      data-testid={`approval-card-${request.id}`}
    >
      <CardContent className="p-4">
        {/* Requester Info */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
            {request.requester.image ? (
              <img
                src={request.requester.image}
                alt={request.requester.name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              getInitials(request.requester.name)
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{request.requester.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(createdDate, { addSuffix: true })}
            </p>
          </div>
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-0">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        </div>

        {/* Amount */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg mb-4">
          <span className="text-sm text-muted-foreground">Amount</span>
          <span className="text-xl font-bold">
            {formatCurrency(request.amount, request.currency)}
          </span>
        </div>

        {/* Purpose */}
        <div className="mb-4">
          <p className="text-sm font-medium mb-1">Purpose</p>
          <p className="text-sm text-muted-foreground line-clamp-2">{request.purpose}</p>
        </div>

        {/* Receipt Indicator */}
        {request.receiptUrl && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Receipt className="w-4 h-4" />
            <span>Receipt attached</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 border-red-500/20 text-red-600 hover:bg-red-500/10 hover:text-red-700"
            onClick={() => onReject(request.id)}
            disabled={isProcessing}
            data-testid={`reject-btn-${request.id}`}
          >
            <XCircle className="w-4 h-4 mr-2" />
            Reject
          </Button>
          <Button
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            onClick={() => onApprove(request.id)}
            disabled={isProcessing}
            data-testid={`approve-btn-${request.id}`}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Approve
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function MobileApprovalsPage() {
  const { data: session } = authClient.useSession();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [selectedRequest, setSelectedRequest] = React.useState<ExpenseRequestWithUsers | null>(null);
  const [showApproveDialog, setShowApproveDialog] = React.useState(false);
  const [showRejectDialog, setShowRejectDialog] = React.useState(false);
  const [approvalComment, setApprovalComment] = React.useState("");
  const [rejectionReason, setRejectionReason] = React.useState("");

  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Query for pending expense requests
  const {
    data: pendingRequests,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["pending-expense-requests", debouncedSearch],
    queryFn: async () => {
      const requests = await getPendingExpenseRequestsFn({
        data: { limit: 50, offset: 0 },
      });

      if (debouncedSearch) {
        const searchLower = debouncedSearch.toLowerCase();
        return requests.filter(
          (req) =>
            req.purpose.toLowerCase().includes(searchLower) ||
            (req.description?.toLowerCase().includes(searchLower) ?? false)
        );
      }

      return requests;
    },
    refetchInterval: 30000,
  });

  // Fetch full request data with user info
  const { data: requestsWithUsers, isLoading: isLoadingUsers } = useQuery({
    queryKey: ["pending-expense-requests-with-users", pendingRequests?.map((r) => r.id).join(",")],
    queryFn: async () => {
      if (!pendingRequests || pendingRequests.length === 0) return [];

      const requestsWithUserInfo = await Promise.all(
        pendingRequests.map(async (req) => {
          try {
            const fullRequest = await getExpenseRequestByIdFn({
              data: { id: req.id },
            });
            return fullRequest;
          } catch {
            return {
              ...req,
              requester: {
                id: req.requesterId,
                name: "Unknown User",
                email: "unknown@email.com",
                image: null,
              },
              approver: null,
            };
          }
        })
      );

      return requestsWithUserInfo as ExpenseRequestWithUsers[];
    },
    enabled: !!pendingRequests && pendingRequests.length > 0,
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      return await approveExpenseRequestFn({ data: { id } });
    },
    onSuccess: () => {
      toast.success("Expense request approved");
      queryClient.invalidateQueries({ queryKey: ["pending-expense-requests"] });
      setShowApproveDialog(false);
      setSelectedRequest(null);
      setApprovalComment("");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to approve request");
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return await rejectExpenseRequestFn({ data: { id, rejectionReason: reason } });
    },
    onSuccess: () => {
      toast.success("Expense request rejected");
      queryClient.invalidateQueries({ queryKey: ["pending-expense-requests"] });
      setShowRejectDialog(false);
      setSelectedRequest(null);
      setRejectionReason("");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to reject request");
    },
  });

  const handleApprove = (id: string) => {
    const request = requestsWithUsers?.find((r) => r.id === id);
    if (request) {
      setSelectedRequest(request);
      setShowApproveDialog(true);
    }
  };

  const handleReject = (id: string) => {
    const request = requestsWithUsers?.find((r) => r.id === id);
    if (request) {
      setSelectedRequest(request);
      setShowRejectDialog(true);
    }
  };

  const confirmApprove = () => {
    if (selectedRequest) {
      approveMutation.mutate(selectedRequest.id);
    }
  };

  const confirmReject = () => {
    if (selectedRequest && rejectionReason.trim()) {
      rejectMutation.mutate({ id: selectedRequest.id, reason: rejectionReason });
    }
  };

  const displayRequests = requestsWithUsers ?? [];
  const isProcessing = approveMutation.isPending || rejectMutation.isPending;
  const isFullyLoading = isLoading || (pendingRequests && pendingRequests.length > 0 && isLoadingUsers);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to="/dashboard">
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-semibold">Approvals</h1>
              <p className="text-xs text-muted-foreground">
                {displayRequests.length} pending {displayRequests.length === 1 ? "request" : "requests"}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-9 w-9"
          >
            <RefreshCw className={cn("h-5 w-5", isFetching && "animate-spin")} />
          </Button>
        </div>
      </header>

      {/* Search */}
      <div className="px-4 py-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by purpose..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="search-input"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {isFullyLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading requests...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="p-3 rounded-full bg-red-500/10 mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-lg font-semibold mb-2">Failed to load requests</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {error instanceof Error ? error.message : "An unexpected error occurred"}
            </p>
            <Button onClick={() => refetch()} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        ) : displayRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="p-4 rounded-full bg-muted mb-4">
              <Inbox className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold mb-2">All caught up!</h2>
            <p className="text-sm text-muted-foreground">
              {debouncedSearch
                ? "No requests match your search"
                : "No pending expense requests to review"}
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {displayRequests.map((request) => (
              <ApprovalRequestCard
                key={request.id}
                request={request}
                onApprove={handleApprove}
                onReject={handleReject}
                isProcessing={isProcessing}
              />
            ))}
          </div>
        )}
      </div>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Approve Request
            </DialogTitle>
            <DialogDescription>
              {selectedRequest && (
                <>
                  Approve expense of{" "}
                  <strong>
                    {formatCurrency(selectedRequest.amount, selectedRequest.currency)}
                  </strong>{" "}
                  from <strong>{selectedRequest.requester.name}</strong>?
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Comment (optional)</label>
              <Textarea
                placeholder="Add a comment..."
                value={approvalComment}
                onChange={(e) => setApprovalComment(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowApproveDialog(false)}
              disabled={approveMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={confirmApprove}
              disabled={approveMutation.isPending}
              data-testid="confirm-approve-btn"
            >
              {approveMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
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
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              Reject Request
            </DialogTitle>
            <DialogDescription>
              {selectedRequest && (
                <>
                  Reject expense of{" "}
                  <strong>
                    {formatCurrency(selectedRequest.amount, selectedRequest.currency)}
                  </strong>{" "}
                  from <strong>{selectedRequest.requester.name}</strong>? Please provide a reason.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Reason for Rejection <span className="text-red-500">*</span>
              </label>
              <Textarea
                placeholder="Please explain why this request is being rejected..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="min-h-[100px]"
                required
                data-testid="rejection-reason"
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(false)}
              disabled={rejectMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmReject}
              disabled={rejectMutation.isPending || !rejectionReason.trim()}
              data-testid="confirm-reject-btn"
            >
              {rejectMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Rejecting...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
