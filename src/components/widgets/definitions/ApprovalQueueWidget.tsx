import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  CheckCircle,
  XCircle,
  Clock,
  ClipboardCheck,
  User,
  DollarSign,
  AlertCircle,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Eye,
  FileText,
  Calendar,
  Receipt,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { toast } from "sonner";
import type { WidgetDefinition, WidgetProps } from "../types";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Tooltip } from "~/components/ui/tooltip";
import { Textarea } from "~/components/ui/textarea";
import {
  getPendingExpenseRequestsFn,
  getExpenseRequestByIdFn,
  approveExpenseRequestFn,
  rejectExpenseRequestFn,
} from "~/fn/expense-requests";
import type { ExpenseRequestWithUsers } from "~/data-access/expense-requests";

/**
 * Approval Item Interface
 */
export interface ApprovalItem {
  id: string;
  type: "expense" | "leave" | "purchase" | "document" | "access";
  title: string;
  description?: string;
  requesterId: string;
  requesterName: string;
  requesterImage?: string;
  amount?: number;
  currency?: string;
  status: "pending" | "approved" | "rejected";
  submittedAt: Date;
  priority: "normal" | "urgent" | "critical";
  receiptUrl?: string;
}

/**
 * Approval Queue Widget Data
 */
export interface ApprovalQueueData {
  items: ApprovalItem[];
  pendingCount: number;
  urgentCount: number;
}

/**
 * Approval Queue Widget Config
 */
export interface ApprovalQueueConfig {
  maxItems: number;
  showOnlyUrgent: boolean;
  filterByType: string | null;
  showAmount: boolean;
}

/**
 * Type icon mapping
 */
const typeIcons = {
  expense: DollarSign,
  leave: Clock,
  purchase: ClipboardCheck,
  document: ClipboardCheck,
  access: User,
};

/**
 * Type label mapping
 */
const typeLabels = {
  expense: "Expense Request",
  leave: "Leave Request",
  purchase: "Purchase Order",
  document: "Document Approval",
  access: "Access Request",
};

/**
 * Calculate urgency based on how old the request is
 */
function calculateUrgency(submittedAt: Date): "normal" | "urgent" | "critical" {
  const hoursOld = (Date.now() - new Date(submittedAt).getTime()) / (1000 * 60 * 60);
  if (hoursOld > 72) return "critical"; // More than 3 days
  if (hoursOld > 24) return "urgent"; // More than 1 day
  return "normal";
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
 * Format currency amount
 */
function formatCurrency(amount: string | number, currency: string = "USD"): string {
  const numericAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(numericAmount);
}

/**
 * Format time ago
 */
function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

/**
 * Transform expense request to approval item
 */
function transformToApprovalItem(request: ExpenseRequestWithUsers): ApprovalItem {
  return {
    id: request.id,
    type: "expense",
    title: request.purpose,
    description: request.description || undefined,
    requesterId: request.requesterId,
    requesterName: request.requester?.name || "Unknown User",
    requesterImage: request.requester?.image || undefined,
    amount: parseFloat(request.amount),
    currency: request.currency,
    status: request.status as "pending" | "approved" | "rejected",
    submittedAt: new Date(request.submittedAt),
    priority: calculateUrgency(new Date(request.submittedAt)),
    receiptUrl: request.receiptUrl || undefined,
  };
}

/**
 * Details Preview Dialog Component
 */
function DetailsPreviewDialog({
  item,
  open,
  onOpenChange,
}: {
  item: ApprovalItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!item) return null;

  const TypeIcon = typeIcons[item.type];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TypeIcon className="w-5 h-5 text-primary" />
            {item.title}
          </DialogTitle>
          <DialogDescription>
            {typeLabels[item.type]} from {item.requesterName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Requester Info */}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <Avatar className="h-10 w-10">
              {item.requesterImage ? (
                <AvatarImage src={item.requesterImage} alt={item.requesterName} />
              ) : (
                <AvatarFallback className="bg-primary/10 text-primary">
                  {getInitials(item.requesterName)}
                </AvatarFallback>
              )}
            </Avatar>
            <div>
              <p className="font-medium">{item.requesterName}</p>
              <p className="text-sm text-muted-foreground">Requester</p>
            </div>
          </div>

          {/* Amount */}
          {item.amount && (
            <div className="flex items-center gap-3">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Amount</p>
                <p className="text-lg font-bold text-primary">
                  {formatCurrency(item.amount, item.currency)}
                </p>
              </div>
            </div>
          )}

          {/* Description */}
          {item.description && (
            <div className="flex items-start gap-3">
              <FileText className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Description</p>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            </div>
          )}

          {/* Submitted Date */}
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Submitted</p>
              <p className="text-sm text-muted-foreground">
                {formatTimeAgo(item.submittedAt)} ({new Date(item.submittedAt).toLocaleDateString()})
              </p>
            </div>
          </div>

          {/* Receipt */}
          {item.receiptUrl && (
            <div className="flex items-center gap-3">
              <Receipt className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Receipt</p>
                <a
                  href={item.receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                >
                  View attachment <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          {/* Urgency Badge */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Status:</span>
            <Badge
              variant={
                item.priority === "critical"
                  ? "destructive"
                  : item.priority === "urgent"
                  ? "secondary"
                  : "outline"
              }
              className={cn(
                item.priority === "critical" && "bg-red-500 text-white",
                item.priority === "urgent" && "bg-orange-500 text-white"
              )}
            >
              {item.priority === "critical"
                ? "Critical - Over 3 days old"
                : item.priority === "urgent"
                ? "Urgent - Over 1 day old"
                : "Normal"}
            </Badge>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Link to="/dashboard/approvals">
            <Button className="gap-2">
              <ExternalLink className="w-4 h-4" />
              View Full Details
            </Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Rejection Dialog Component
 */
function RejectDialog({
  item,
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: {
  item: ApprovalItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  isLoading: boolean;
}) {
  const [reason, setReason] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const handleConfirm = () => {
    if (!reason.trim()) {
      setError("Please provide a reason for rejection");
      return;
    }
    onConfirm(reason);
  };

  React.useEffect(() => {
    if (!open) {
      setReason("");
      setError(null);
    }
  }, [open]);

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-600" />
            Reject Request
          </DialogTitle>
          <DialogDescription>
            You are about to reject the {typeLabels[item.type].toLowerCase()} &quot;{item.title}&quot;
            {item.amount && ` for ${formatCurrency(item.amount, item.currency)}`} from{" "}
            <strong>{item.requesterName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label htmlFor="rejection-reason" className="text-sm font-medium mb-2 block">
              Reason for Rejection <span className="text-red-500">*</span>
            </label>
            <Textarea
              id="rejection-reason"
              placeholder="Please explain why this request is being rejected..."
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setError(null);
              }}
              className="min-h-[100px]"
              data-testid="widget-rejection-reason"
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
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading || !reason.trim()}
            data-testid="widget-confirm-reject-btn"
          >
            {isLoading ? (
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
  );
}

/**
 * Approval Queue Widget Component
 */
function ApprovalQueueWidgetComponent({
  data,
  isLoading: externalLoading,
  error: externalError,
  instance,
  onRefresh,
}: WidgetProps<ApprovalQueueData, ApprovalQueueConfig>) {
  const config = instance.config as unknown as ApprovalQueueConfig;
  const queryClient = useQueryClient();

  // State for dialogs
  const [selectedItem, setSelectedItem] = React.useState<ApprovalItem | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = React.useState(false);
  const [showRejectDialog, setShowRejectDialog] = React.useState(false);
  const [processingId, setProcessingId] = React.useState<string | null>(null);

  // Fetch pending expense requests
  const {
    data: pendingRequests,
    isLoading: isLoadingRequests,
    error: requestsError,
    refetch,
  } = useQuery({
    queryKey: ["widget-pending-expense-requests"],
    queryFn: async () => {
      const requests = await getPendingExpenseRequestsFn({
        data: { limit: 50, offset: 0 },
      });
      return requests;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 15000, // Consider data stale after 15 seconds
  });

  // Fetch user info for pending requests
  const { data: requestsWithUsers, isLoading: isLoadingUsers } = useQuery({
    queryKey: ["widget-pending-requests-with-users", pendingRequests?.map((r) => r.id).join(",")],
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
            } as ExpenseRequestWithUsers;
          }
        })
      );

      return requestsWithUserInfo;
    },
    enabled: !!pendingRequests && pendingRequests.length > 0,
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      setProcessingId(id);
      const result = await approveExpenseRequestFn({ data: { id } });
      return result;
    },
    onSuccess: () => {
      toast.success("Request approved!", {
        description: "The approval has been processed successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["widget-pending-expense-requests"] });
      queryClient.invalidateQueries({ queryKey: ["expense-requests"] });
      queryClient.invalidateQueries({ queryKey: ["pending-expense-requests"] });
      onRefresh?.();
    },
    onError: (error: Error) => {
      toast.error("Failed to approve", {
        description: error.message || "An error occurred while approving the request.",
      });
    },
    onSettled: () => {
      setProcessingId(null);
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      setProcessingId(id);
      const result = await rejectExpenseRequestFn({
        data: { id, rejectionReason: reason },
      });
      return result;
    },
    onSuccess: () => {
      toast.success("Request rejected", {
        description: "The rejection has been processed.",
      });
      setShowRejectDialog(false);
      queryClient.invalidateQueries({ queryKey: ["widget-pending-expense-requests"] });
      queryClient.invalidateQueries({ queryKey: ["expense-requests"] });
      queryClient.invalidateQueries({ queryKey: ["pending-expense-requests"] });
      onRefresh?.();
    },
    onError: (error: Error) => {
      toast.error("Failed to reject", {
        description: error.message || "An error occurred while rejecting the request.",
      });
    },
    onSettled: () => {
      setProcessingId(null);
    },
  });

  // Transform data to approval items
  const items: ApprovalItem[] = React.useMemo(() => {
    if (data?.items) return data.items;
    if (requestsWithUsers && requestsWithUsers.length > 0) {
      return requestsWithUsers.map(transformToApprovalItem);
    }
    return [];
  }, [data, requestsWithUsers]);

  // Filter items based on config
  let filteredItems = config.showOnlyUrgent
    ? items.filter((i) => i.priority === "urgent" || i.priority === "critical")
    : items;

  if (config.filterByType && config.filterByType !== "") {
    filteredItems = filteredItems.filter((i) => i.type === config.filterByType);
  }

  const displayItems = filteredItems.slice(0, config.maxItems);
  const pendingCount = data?.pendingCount ?? items.length;
  const urgentCount =
    data?.urgentCount ?? items.filter((i) => i.priority === "urgent" || i.priority === "critical").length;

  const isLoading = externalLoading || isLoadingRequests || (pendingRequests && pendingRequests.length > 0 && isLoadingUsers);
  const error = externalError || (requestsError ? String(requestsError) : null);

  // Handlers
  const handleApprove = (item: ApprovalItem) => {
    approveMutation.mutate(item.id);
  };

  const handleRejectClick = (item: ApprovalItem) => {
    setSelectedItem(item);
    setShowRejectDialog(true);
  };

  const handleRejectConfirm = (reason: string) => {
    if (selectedItem) {
      rejectMutation.mutate({ id: selectedItem.id, reason });
    }
  };

  const handleViewDetails = (item: ApprovalItem) => {
    setSelectedItem(item);
    setShowDetailsDialog(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px]" data-testid="approval-widget-loading">
        <div className="animate-pulse flex flex-col space-y-3 w-full p-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px] text-destructive" data-testid="approval-widget-error">
        <AlertCircle className="w-5 h-5 mr-2" />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="approval-queue-widget">
      {/* Summary Stats */}
      <div className="flex items-center justify-between text-sm pb-2 border-b">
        <div className="flex items-center gap-4">
          <span className="text-muted-foreground">
            <span className="font-medium text-foreground" data-testid="pending-count">{pendingCount}</span> pending
          </span>
          {urgentCount > 0 && (
            <span className="text-red-500">
              <span className="font-medium" data-testid="urgent-count">{urgentCount}</span> urgent
            </span>
          )}
        </div>
      </div>

      {/* Approval Items */}
      <div className="space-y-2">
        {displayItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground" data-testid="empty-approvals">
            <ClipboardCheck className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>No pending approvals</p>
          </div>
        ) : (
          displayItems.map((item) => {
            const TypeIcon = typeIcons[item.type];
            const isProcessing = processingId === item.id;

            return (
              <div
                key={item.id}
                data-testid={`approval-item-${item.id}`}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg transition-all",
                  "hover:bg-muted/50",
                  "border-l-3",
                  item.priority === "critical"
                    ? "border-l-red-500 bg-red-500/5"
                    : item.priority === "urgent"
                    ? "border-l-orange-500 bg-orange-500/5"
                    : "border-l-transparent",
                  isProcessing && "opacity-50 pointer-events-none"
                )}
              >
                {/* Avatar/Icon */}
                <Tooltip content="Click to view details">
                  <button
                    onClick={() => handleViewDetails(item)}
                    className="flex-shrink-0"
                  >
                    {item.requesterImage ? (
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={item.requesterImage} alt={item.requesterName} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {getInitials(item.requesterName)}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center",
                          "bg-primary/10"
                        )}
                      >
                        <TypeIcon className="w-5 h-5 text-primary" />
                      </div>
                    )}
                  </button>
                </Tooltip>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleViewDetails(item)}
                      className="font-medium truncate text-left hover:text-primary transition-colors"
                    >
                      {item.title}
                    </button>
                    {item.priority !== "normal" && (
                      <Badge
                        variant={item.priority === "critical" ? "destructive" : "secondary"}
                        className={cn(
                          "text-xs flex-shrink-0",
                          item.priority === "critical" && "bg-red-500 hover:bg-red-600",
                          item.priority === "urgent" && "bg-orange-500 hover:bg-orange-600 text-white"
                        )}
                      >
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        {item.priority === "critical" ? "Critical" : "Urgent"}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {item.requesterName} · {typeLabels[item.type]}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground">
                      {formatTimeAgo(item.submittedAt)}
                    </span>
                    {config.showAmount && item.amount && (
                      <span className="text-sm font-medium">
                        {formatCurrency(item.amount, item.currency)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-1 flex-shrink-0">
                  {isProcessing ? (
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      <Tooltip content="View details">
                        <button
                          onClick={() => handleViewDetails(item)}
                          className="p-1.5 rounded-full hover:bg-blue-500/10 text-blue-500 transition-colors"
                          data-testid={`view-btn-${item.id}`}
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                      </Tooltip>
                      <Tooltip content="Quick approve">
                        <button
                          onClick={() => handleApprove(item)}
                          className="p-1.5 rounded-full hover:bg-green-500/10 text-green-500 transition-colors"
                          data-testid={`approve-btn-${item.id}`}
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                      </Tooltip>
                      <Tooltip content="Reject with reason">
                        <button
                          onClick={() => handleRejectClick(item)}
                          className="p-1.5 rounded-full hover:bg-red-500/10 text-red-500 transition-colors"
                          data-testid={`reject-btn-${item.id}`}
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      </Tooltip>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* View All Link */}
      {filteredItems.length > config.maxItems && (
        <div className="text-center pt-2">
          <Link
            to="/dashboard/approvals"
            className="text-sm text-primary hover:underline inline-flex items-center gap-1"
          >
            View all {filteredItems.length} requests
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* Details Preview Dialog */}
      <DetailsPreviewDialog
        item={selectedItem}
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog}
      />

      {/* Reject Dialog */}
      <RejectDialog
        item={selectedItem}
        open={showRejectDialog}
        onOpenChange={setShowRejectDialog}
        onConfirm={handleRejectConfirm}
        isLoading={rejectMutation.isPending}
      />
    </div>
  );
}

/**
 * Approval Queue Widget Definition
 */
export const ApprovalQueueWidgetDefinition: WidgetDefinition<
  ApprovalQueueData,
  ApprovalQueueConfig
> = {
  id: "approval-queue",
  name: "Approval Queue",
  description: "View and manage pending approval requests",
  category: "productivity",
  defaultSize: "medium",
  supportedSizes: ["medium", "large"],
  icon: ClipboardCheck,
  dataRequirements: [
    {
      key: "approvals",
      label: "Approval Items",
      description: "List of items pending approval",
      required: true,
      type: "query",
    },
  ],
  configOptions: [
    {
      key: "maxItems",
      label: "Maximum Items",
      description: "Maximum number of items to display",
      type: "number",
      defaultValue: 5,
      validation: { min: 1, max: 20 },
    },
    {
      key: "showOnlyUrgent",
      label: "Show Only Urgent",
      description: "Only display urgent approval requests",
      type: "boolean",
      defaultValue: false,
    },
    {
      key: "filterByType",
      label: "Filter by Type",
      description: "Filter approvals by type",
      type: "select",
      defaultValue: null,
      options: [
        { label: "All Types", value: "" },
        { label: "Expense", value: "expense" },
        { label: "Leave", value: "leave" },
        { label: "Purchase", value: "purchase" },
        { label: "Document", value: "document" },
        { label: "Access", value: "access" },
      ],
    },
    {
      key: "showAmount",
      label: "Show Amount",
      description: "Display monetary amounts when applicable",
      type: "boolean",
      defaultValue: true,
    },
  ],
  component: ApprovalQueueWidgetComponent,
  defaultConfig: {
    maxItems: 5,
    showOnlyUrgent: false,
    filterByType: null,
    showAmount: true,
  },
  supportsRefresh: true,
  minRefreshInterval: 30000,
};
