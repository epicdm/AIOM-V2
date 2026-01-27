import * as React from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Shield,
  RefreshCw,
  Search,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Inbox,
  Filter,
  Eye,
  Clock,
  FileText,
  Users,
} from "lucide-react";
import { authClient } from "~/lib/auth-client";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { KycVerificationCard } from "~/components/kyc-verification";
import type { KycVerificationData } from "~/components/kyc-verification";
import {
  getPendingKycVerificationsFn,
  listKycVerificationsFn,
  getKycVerificationDetailsFn,
  approveKycVerificationFn,
  rejectKycVerificationFn,
  startKycReviewFn,
  verifyKycDocumentFn,
  rejectKycDocumentFn,
  getKycVerificationStatsFn,
} from "~/fn/kyc-verification";
import { toast } from "sonner";
import { cn } from "~/lib/utils";
import type {
  KycVerificationStatus,
  KycTierLevel,
  UserRole,
} from "~/db/schema";

export const Route = createFileRoute("/dashboard/kyc/")({
  beforeLoad: async () => {
    const sessionResult = await authClient.getSession();
    if (!sessionResult || !sessionResult.data) {
      throw redirect({
        to: "/sign-in",
        search: { redirect: "/dashboard/kyc" },
      });
    }
    // Check if user is admin
    const user = sessionResult.data.user as { role?: UserRole; isAdmin?: boolean } | undefined;
    if (!user || (user.role !== "admin" && !user.isAdmin && user.role !== "md")) {
      throw redirect({
        to: "/dashboard",
      });
    }
  },
  component: KycVerificationPage,
});

type StatusFilter = KycVerificationStatus | "all" | "pending_review" | "submitted";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All Verifications" },
  { value: "pending_review", label: "Pending Review" },
  { value: "submitted", label: "Submitted" },
  { value: "under_review", label: "Under Review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "expired", label: "Expired" },
];

function KycVerificationPage() {
  const { data: session } = authClient.useSession();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("pending_review");
  const [currentPage, setCurrentPage] = React.useState(1);

  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset page when filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, debouncedSearch]);

  // Query for KYC stats
  const { data: stats } = useQuery({
    queryKey: ["kyc-verification-stats"],
    queryFn: async () => {
      return await getKycVerificationStatsFn();
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Query for KYC verifications
  const {
    data: verificationsData,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["kyc-verifications", statusFilter, currentPage, debouncedSearch],
    queryFn: async () => {
      if (statusFilter === "pending_review") {
        // Get pending verifications (submitted + under_review)
        const pending = await getPendingKycVerificationsFn({ data: { limit: 50 } });
        return {
          data: pending,
          total: pending.length,
          page: 1,
          totalPages: 1,
        };
      }

      // Get filtered verifications
      const statusParam = statusFilter === "all" ? undefined : statusFilter;
      const result = await listKycVerificationsFn({
        data: {
          status: statusParam,
          page: currentPage,
          limit: 20,
          orderBy: "submittedAt",
          orderDir: "desc",
        },
      });
      return result;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch full verification data for display
  const {
    data: verificationsWithDetails,
    isLoading: isLoadingDetails,
  } = useQuery({
    queryKey: ["kyc-verifications-details", verificationsData?.data?.map((v: { id: string }) => v.id).join(",")],
    queryFn: async () => {
      if (!verificationsData?.data || verificationsData.data.length === 0) return [];

      const detailedVerifications = await Promise.all(
        verificationsData.data.map(async (v: { id: string }) => {
          try {
            const details = await getKycVerificationDetailsFn({ data: { verificationId: v.id } });
            return details;
          } catch {
            return v;
          }
        })
      );

      return detailedVerifications as KycVerificationData[];
    },
    enabled: !!verificationsData?.data && verificationsData.data.length > 0,
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async ({
      id,
      tierLevel,
      comments,
    }: {
      id: string;
      tierLevel: KycTierLevel;
      comments?: string;
    }) => {
      const result = await approveKycVerificationFn({
        data: { verificationId: id, tierLevel, comments },
      });
      return result;
    },
    onSuccess: () => {
      toast.success("KYC verification approved successfully");
      queryClient.invalidateQueries({ queryKey: ["kyc-verifications"] });
      queryClient.invalidateQueries({ queryKey: ["kyc-verification-stats"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to approve verification");
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async ({
      id,
      reason,
      details,
    }: {
      id: string;
      reason: string;
      details?: string;
    }) => {
      const result = await rejectKycVerificationFn({
        data: { verificationId: id, reason, details },
      });
      return result;
    },
    onSuccess: () => {
      toast.success("KYC verification rejected");
      queryClient.invalidateQueries({ queryKey: ["kyc-verifications"] });
      queryClient.invalidateQueries({ queryKey: ["kyc-verification-stats"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to reject verification");
    },
  });

  // Start review mutation
  const startReviewMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await startKycReviewFn({
        data: { verificationId: id },
      });
      return result;
    },
    onSuccess: () => {
      toast.success("Review started");
      queryClient.invalidateQueries({ queryKey: ["kyc-verifications"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to start review");
    },
  });

  // Verify document mutation
  const verifyDocumentMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const result = await verifyKycDocumentFn({
        data: { documentId },
      });
      return result;
    },
    onSuccess: () => {
      toast.success("Document verified");
      queryClient.invalidateQueries({ queryKey: ["kyc-verifications"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to verify document");
    },
  });

  // Reject document mutation
  const rejectDocumentMutation = useMutation({
    mutationFn: async ({ documentId, reason }: { documentId: string; reason: string }) => {
      const result = await rejectKycDocumentFn({
        data: { documentId, reason },
      });
      return result;
    },
    onSuccess: () => {
      toast.success("Document rejected");
      queryClient.invalidateQueries({ queryKey: ["kyc-verifications"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to reject document");
    },
  });

  const handleApprove = async (id: string, tierLevel: KycTierLevel, comments?: string) => {
    await approveMutation.mutateAsync({ id, tierLevel, comments });
  };

  const handleReject = async (id: string, reason: string, details?: string) => {
    await rejectMutation.mutateAsync({ id, reason, details });
  };

  const handleStartReview = async (id: string) => {
    await startReviewMutation.mutateAsync(id);
  };

  const handleVerifyDocument = async (documentId: string) => {
    await verifyDocumentMutation.mutateAsync(documentId);
  };

  const handleRejectDocument = async (documentId: string, reason: string) => {
    await rejectDocumentMutation.mutateAsync({ documentId, reason });
  };

  // Filter by search
  const displayVerifications = React.useMemo(() => {
    const verifications = verificationsWithDetails ?? [];
    if (!debouncedSearch) return verifications;

    const searchLower = debouncedSearch.toLowerCase();
    return verifications.filter((v) => {
      const fullName = [v.firstName, v.middleName, v.lastName].filter(Boolean).join(" ");
      return (
        fullName.toLowerCase().includes(searchLower) ||
        v.user?.email?.toLowerCase().includes(searchLower) ||
        v.user?.name?.toLowerCase().includes(searchLower)
      );
    });
  }, [verificationsWithDetails, debouncedSearch]);

  const isProcessing =
    approveMutation.isPending ||
    rejectMutation.isPending ||
    startReviewMutation.isPending ||
    verifyDocumentMutation.isPending ||
    rejectDocumentMutation.isPending;

  const isFullyLoading =
    isLoading || (verificationsData?.data && verificationsData.data.length > 0 && isLoadingDetails);

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" data-testid="kyc-page-title">
                  KYC Verification
                </h1>
                <p className="text-muted-foreground mt-1">
                  Review and manage KYC verification submissions
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
              <RefreshCw className={cn("w-4 h-4", isFetching && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" data-testid="kyc-stats">
            <div className="bg-card/50 backdrop-blur-sm border rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.pendingCount}</p>
                  <p className="text-sm text-muted-foreground">Pending Review</p>
                </div>
              </div>
            </div>
            <div className="bg-card/50 backdrop-blur-sm border rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Eye className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.underReviewCount}</p>
                  <p className="text-sm text-muted-foreground">Under Review</p>
                </div>
              </div>
            </div>
            <div className="bg-card/50 backdrop-blur-sm border rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.approvedCount}</p>
                  <p className="text-sm text-muted-foreground">Approved</p>
                </div>
              </div>
            </div>
            <div className="bg-card/50 backdrop-blur-sm border rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.rejectedCount}</p>
                  <p className="text-sm text-muted-foreground">Rejected</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="search-input"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as StatusFilter)}
            >
              <SelectTrigger className="w-[200px]" data-testid="status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results info */}
        {displayVerifications.length > 0 && (
          <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <span className="font-medium">{displayVerifications.length}</span>
              <span className="text-muted-foreground">
                {displayVerifications.length === 1 ? "verification" : "verifications"}
              </span>
            </div>
          </div>
        )}

        {/* Content */}
        {isFullyLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading KYC verifications...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-full bg-red-500/10 mb-4">
              <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Failed to load verifications</h2>
            <p className="text-muted-foreground mb-4">
              {error instanceof Error ? error.message : "An unexpected error occurred"}
            </p>
            <Button onClick={() => refetch()} variant="outline" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Try Again
            </Button>
          </div>
        ) : displayVerifications.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16 text-center"
            data-testid="empty-state"
          >
            <div className="p-4 rounded-full bg-muted mb-4">
              <Inbox className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No verifications found</h2>
            <p className="text-muted-foreground">
              {debouncedSearch
                ? "No KYC verifications match your search criteria"
                : statusFilter === "pending_review"
                ? "All KYC submissions have been reviewed"
                : "No KYC verifications with this status"}
            </p>
          </div>
        ) : (
          <div
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
            data-testid="kyc-cards-grid"
          >
            {displayVerifications.map((verification) => (
              <KycVerificationCard
                key={verification.id}
                verification={verification}
                onApprove={handleApprove}
                onReject={handleReject}
                onStartReview={handleStartReview}
                onVerifyDocument={handleVerifyDocument}
                onRejectDocument={handleRejectDocument}
                isProcessing={isProcessing}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {verificationsData && verificationsData.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {verificationsData.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(verificationsData.totalPages, p + 1))}
              disabled={currentPage === verificationsData.totalPages}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
