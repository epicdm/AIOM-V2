import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ClipboardCheck,
  RefreshCw,
  Search,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Inbox,
} from "lucide-react";
import { authClient } from "~/lib/auth-client";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { ExpenseApprovalCard } from "~/components/expense-approval";
import {
  getPendingExpenseRequestsFn,
  approveExpenseRequestFn,
  rejectExpenseRequestFn,
  getExpenseRequestByIdFn,
} from "~/fn/expense-requests";
import { toast } from "sonner";
import { cn } from "~/lib/utils";

export const Route = createFileRoute("/dashboard/approvals/")({
  component: ExpenseApprovalsPage,
});

function ExpenseApprovalsPage() {
  const { data: session } = authClient.useSession();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");

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
      // Get pending requests using the server function
      const requests = await getPendingExpenseRequestsFn({
        data: {
          limit: 50,
          offset: 0,
        },
      });

      // Filter by search query client-side if provided
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
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch full request data with user info for display
  const {
    data: requestsWithUsers,
    isLoading: isLoadingUsers,
  } = useQuery({
    queryKey: ["pending-expense-requests-with-users", pendingRequests?.map(r => r.id).join(",")],
    queryFn: async () => {
      if (!pendingRequests || pendingRequests.length === 0) return [];

      // Fetch user info for each request
      const requestsWithUserInfo = await Promise.all(
        pendingRequests.map(async (req) => {
          try {
            const fullRequest = await getExpenseRequestByIdFn({
              data: { id: req.id },
            });
            return fullRequest;
          } catch {
            // If we can't get user info, create a fallback
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

      return requestsWithUserInfo;
    },
    enabled: !!pendingRequests && pendingRequests.length > 0,
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async ({ id }: { id: string; comment?: string }) => {
      const result = await approveExpenseRequestFn({
        data: { id },
      });
      return result;
    },
    onSuccess: () => {
      toast.success("Expense request approved successfully");
      queryClient.invalidateQueries({
        queryKey: ["pending-expense-requests"],
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to approve request");
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const result = await rejectExpenseRequestFn({
        data: {
          id,
          rejectionReason: reason,
        },
      });
      return result;
    },
    onSuccess: () => {
      toast.success("Expense request rejected");
      queryClient.invalidateQueries({
        queryKey: ["pending-expense-requests"],
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to reject request");
    },
  });

  const handleApprove = async (id: string, _comment?: string) => {
    await approveMutation.mutateAsync({ id });
  };

  const handleReject = async (id: string, reason: string) => {
    await rejectMutation.mutateAsync({ id, reason });
  };

  const displayRequests = requestsWithUsers ?? [];
  const isProcessing = approveMutation.isPending || rejectMutation.isPending;
  const isFullyLoading = isLoading || (pendingRequests && pendingRequests.length > 0 && isLoadingUsers);

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <ClipboardCheck className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  Expense Approvals
                </h1>
                <p className="text-muted-foreground mt-1">
                  Review and manage pending expense requests
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="gap-2"
              data-testid="refresh-btn"
            >
              <RefreshCw
                className={cn("w-4 h-4", isFetching && "animate-spin")}
              />
              Refresh
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by purpose or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="search-input"
            />
          </div>
        </div>

        {/* Stats */}
        {displayRequests.length > 0 && (
          <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              <span className="font-medium">{displayRequests.length}</span>
              <span className="text-muted-foreground">
                pending {displayRequests.length === 1 ? "request" : "requests"}
              </span>
            </div>
          </div>
        )}

        {/* Content */}
        {isFullyLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading expense requests...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-full bg-red-500/10 mb-4">
              <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Failed to load requests</h2>
            <p className="text-muted-foreground mb-4">
              {error instanceof Error
                ? error.message
                : "An unexpected error occurred"}
            </p>
            <Button onClick={() => refetch()} variant="outline" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Try Again
            </Button>
          </div>
        ) : displayRequests.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16 text-center"
            data-testid="empty-state"
          >
            <div className="p-4 rounded-full bg-muted mb-4">
              <Inbox className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No pending requests</h2>
            <p className="text-muted-foreground">
              {debouncedSearch
                ? "No expense requests match your search criteria"
                : "All expense requests have been reviewed"}
            </p>
          </div>
        ) : (
          <div
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
            data-testid="expense-cards-grid"
          >
            {displayRequests.map((request) => (
              <ExpenseApprovalCard
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
    </div>
  );
}
