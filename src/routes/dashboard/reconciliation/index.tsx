import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  FileText,
  Receipt,
  Link2Off,
  RefreshCw,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  useMatchedVouchers,
  useUnmatchedExpenseRequests,
  useUnmatchedVouchers,
  useReconciliationStats,
  useReconcileMatch,
  useMarkWithDiscrepancies,
  useLinkVoucherToRequest,
  useUnlinkVoucherFromRequest,
} from "~/hooks/useExpenseReconciliation";
import {
  ReconciliationMatchCard,
  ReconcileDialog,
  MarkDiscrepancyDialog,
  ManualLinkDialog,
  UnmatchedRequestCard,
  UnmatchedVoucherCard,
} from "~/components/reconciliation";
import type { ReconciliationMatch, UnmatchedExpenseRequest, UnmatchedVoucher } from "~/data-access/expense-reconciliation";
import type { ReconciliationStatus } from "~/db/schema";

export const Route = createFileRoute("/dashboard/reconciliation/")({
  component: ReconciliationPage,
});

function ReconciliationPage() {
  // State for filters
  const [activeTab, setActiveTab] = useState("matched");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReconciliationStatus | "all">("all");

  // State for dialogs
  const [reconcileDialogOpen, setReconcileDialogOpen] = useState(false);
  const [discrepancyDialogOpen, setDiscrepancyDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<ReconciliationMatch | null>(null);
  const [selectedUnmatchedRequest, setSelectedUnmatchedRequest] = useState<UnmatchedExpenseRequest | null>(null);
  const [selectedUnmatchedVoucher, setSelectedUnmatchedVoucher] = useState<UnmatchedVoucher | null>(null);

  // Queries
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useReconciliationStats();
  const {
    data: matchedVouchers,
    isLoading: matchedLoading,
    refetch: refetchMatched,
  } = useMatchedVouchers({
    reconciliationStatus: statusFilter === "all" ? undefined : statusFilter,
    searchQuery: searchQuery || undefined,
  });
  const {
    data: unmatchedRequests,
    isLoading: requestsLoading,
    refetch: refetchRequests,
  } = useUnmatchedExpenseRequests({ searchQuery: searchQuery || undefined });
  const {
    data: unmatchedVouchers,
    isLoading: vouchersLoading,
    refetch: refetchVouchers,
  } = useUnmatchedVouchers({ searchQuery: searchQuery || undefined });

  // Mutations
  const reconcileMutation = useReconcileMatch();
  const discrepancyMutation = useMarkWithDiscrepancies();
  const linkMutation = useLinkVoucherToRequest();
  const unlinkMutation = useUnlinkVoucherFromRequest();

  // Handlers
  const handleReconcile = (match: ReconciliationMatch) => {
    setSelectedMatch(match);
    setReconcileDialogOpen(true);
  };

  const handleMarkDiscrepancy = (match: ReconciliationMatch) => {
    setSelectedMatch(match);
    setDiscrepancyDialogOpen(true);
  };

  const handleUnlink = (match: ReconciliationMatch) => {
    unlinkMutation.mutate({ voucherId: match.expenseVoucher.id });
  };

  const handleLinkRequest = (data: UnmatchedExpenseRequest) => {
    setSelectedUnmatchedRequest(data);
    setSelectedUnmatchedVoucher(null);
    setLinkDialogOpen(true);
  };

  const handleLinkVoucher = (data: UnmatchedVoucher) => {
    setSelectedUnmatchedVoucher(data);
    setSelectedUnmatchedRequest(null);
    setLinkDialogOpen(true);
  };

  const handleConfirmReconcile = (data: { reference: string; notes?: string }) => {
    if (selectedMatch) {
      reconcileMutation.mutate(
        {
          voucherId: selectedMatch.expenseVoucher.id,
          reference: data.reference,
          notes: data.notes,
        },
        {
          onSuccess: () => {
            setReconcileDialogOpen(false);
            setSelectedMatch(null);
          },
        }
      );
    }
  };

  const handleConfirmDiscrepancy = (data: { notes: string }) => {
    if (selectedMatch) {
      discrepancyMutation.mutate(
        {
          voucherId: selectedMatch.expenseVoucher.id,
          notes: data.notes,
        },
        {
          onSuccess: () => {
            setDiscrepancyDialogOpen(false);
            setSelectedMatch(null);
          },
        }
      );
    }
  };

  const handleConfirmLink = (targetId: string) => {
    if (selectedUnmatchedRequest) {
      // Linking a voucher to a request
      linkMutation.mutate(
        {
          voucherId: targetId,
          expenseRequestId: selectedUnmatchedRequest.expenseRequest.id,
        },
        {
          onSuccess: () => {
            setLinkDialogOpen(false);
            setSelectedUnmatchedRequest(null);
          },
        }
      );
    } else if (selectedUnmatchedVoucher) {
      // Linking a request to a voucher
      linkMutation.mutate(
        {
          voucherId: selectedUnmatchedVoucher.expenseVoucher.id,
          expenseRequestId: targetId,
        },
        {
          onSuccess: () => {
            setLinkDialogOpen(false);
            setSelectedUnmatchedVoucher(null);
          },
        }
      );
    }
  };

  const handleRefresh = () => {
    refetchStats();
    refetchMatched();
    refetchRequests();
    refetchVouchers();
  };

  // Filter matched vouchers by search query locally
  const filteredMatched = matchedVouchers?.filter((match) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      match.expenseVoucher.voucherNumber.toLowerCase().includes(query) ||
      match.expenseVoucher.description.toLowerCase().includes(query) ||
      match.expenseRequest.purpose.toLowerCase().includes(query)
    );
  });

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="page-title">
              Expense Reconciliation
            </h1>
            <p className="text-muted-foreground mt-2">
              Match expense requests with vouchers and resolve discrepancies
            </p>
          </div>
          <Button variant="outline" onClick={handleRefresh} data-testid="refresh-button">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Link2Off className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="stat-total-matched">
                    {statsLoading ? "-" : stats?.totalMatched || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Total Matched</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-green-100">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="stat-reconciled">
                    {statsLoading ? "-" : stats?.reconciled || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Reconciled</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-amber-100">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="stat-discrepancies">
                    {statsLoading ? "-" : stats?.withDiscrepancies || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">With Issues</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-gray-100">
                  <Receipt className="h-4 w-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="stat-unreconciled">
                    {statsLoading ? "-" : stats?.unreconciled || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Unreconciled</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-purple-100">
                  <FileText className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="stat-unmatched-requests">
                    {statsLoading ? "-" : stats?.unmatchedRequests || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Orphan Requests</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-orange-100">
                  <Receipt className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="stat-unmatched-vouchers">
                    {statsLoading ? "-" : stats?.unmatchedVouchers || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Orphan Vouchers</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by voucher number, description, or purpose..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="search-input"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select
                  value={statusFilter}
                  onValueChange={(value) =>
                    setStatusFilter(value as ReconciliationStatus | "all")
                  }
                >
                  <SelectTrigger className="w-[180px]" data-testid="status-filter">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="unreconciled">Unreconciled</SelectItem>
                    <SelectItem value="reconciled">Reconciled</SelectItem>
                    <SelectItem value="discrepancy">With Discrepancies</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="matched" data-testid="tab-matched">
              Matched
              {filteredMatched && filteredMatched.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {filteredMatched.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="unmatched-requests" data-testid="tab-unmatched-requests">
              Orphan Requests
              {unmatchedRequests && unmatchedRequests.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {unmatchedRequests.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="unmatched-vouchers" data-testid="tab-unmatched-vouchers">
              Orphan Vouchers
              {unmatchedVouchers && unmatchedVouchers.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {unmatchedVouchers.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Matched Tab */}
          <TabsContent value="matched" className="space-y-4">
            {matchedLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                <p className="text-muted-foreground mt-4">Loading matched expenses...</p>
              </div>
            ) : filteredMatched && filteredMatched.length > 0 ? (
              <div className="space-y-4">
                {filteredMatched.map((match) => (
                  <ReconciliationMatchCard
                    key={match.id}
                    match={match}
                    onReconcile={handleReconcile}
                    onMarkDiscrepancy={handleMarkDiscrepancy}
                    onUnlink={handleUnlink}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <CheckCircle className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <h2 className="text-xl font-semibold mb-2">No matched expenses found</h2>
                <p className="text-muted-foreground">
                  {searchQuery || statusFilter !== "all"
                    ? "Try adjusting your filters"
                    : "No expense requests are linked to vouchers yet"}
                </p>
              </div>
            )}
          </TabsContent>

          {/* Unmatched Requests Tab */}
          <TabsContent value="unmatched-requests" className="space-y-4">
            {requestsLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                <p className="text-muted-foreground mt-4">Loading unmatched requests...</p>
              </div>
            ) : unmatchedRequests && unmatchedRequests.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {unmatchedRequests.map((data) => (
                  <UnmatchedRequestCard
                    key={data.expenseRequest.id}
                    data={data}
                    onLink={handleLinkRequest}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <FileText className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <h2 className="text-xl font-semibold mb-2">All requests are matched</h2>
                <p className="text-muted-foreground">
                  All approved expense requests have been linked to vouchers
                </p>
              </div>
            )}
          </TabsContent>

          {/* Unmatched Vouchers Tab */}
          <TabsContent value="unmatched-vouchers" className="space-y-4">
            {vouchersLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                <p className="text-muted-foreground mt-4">Loading unmatched vouchers...</p>
              </div>
            ) : unmatchedVouchers && unmatchedVouchers.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {unmatchedVouchers.map((data) => (
                  <UnmatchedVoucherCard
                    key={data.expenseVoucher.id}
                    data={data}
                    onLink={handleLinkVoucher}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <Receipt className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <h2 className="text-xl font-semibold mb-2">All vouchers are matched</h2>
                <p className="text-muted-foreground">
                  All expense vouchers have been linked to requests
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        <ReconcileDialog
          open={reconcileDialogOpen}
          onOpenChange={setReconcileDialogOpen}
          match={selectedMatch}
          onConfirm={handleConfirmReconcile}
          isLoading={reconcileMutation.isPending}
        />

        <MarkDiscrepancyDialog
          open={discrepancyDialogOpen}
          onOpenChange={setDiscrepancyDialogOpen}
          match={selectedMatch}
          onConfirm={handleConfirmDiscrepancy}
          isLoading={discrepancyMutation.isPending}
        />

        <ManualLinkDialog
          open={linkDialogOpen}
          onOpenChange={setLinkDialogOpen}
          sourceType={selectedUnmatchedRequest ? "request" : "voucher"}
          sourceItem={
            selectedUnmatchedRequest?.expenseRequest ||
            selectedUnmatchedVoucher?.expenseVoucher ||
            null
          }
          suggestions={
            selectedUnmatchedRequest
              ? selectedUnmatchedRequest.suggestedVouchers
              : selectedUnmatchedVoucher
                ? selectedUnmatchedVoucher.suggestedRequests
                : []
          }
          onLink={handleConfirmLink}
          isLoading={linkMutation.isPending}
        />
      </div>
    </div>
  );
}
