import { useState, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { UnifiedInboxThreadList } from "~/components/UnifiedInboxThreadList";
import { UnifiedInboxThreadDetail } from "~/components/UnifiedInboxThreadDetail";
import {
  UnifiedInboxFilters,
  type UnifiedInboxFilterState,
} from "~/components/UnifiedInboxFilters";
import { useUnifiedInbox } from "~/hooks/useUnifiedInbox";
import {
  useScoreThreadPriority,
  useScoreAllPending,
  usePriorityStats,
} from "~/hooks/useMessagePriority";
import { RefreshCw, Inbox, Loader2, Sparkles, ArrowUpDown } from "lucide-react";
import type { UnifiedInboxThread } from "~/db/schema";

export const Route = createFileRoute("/dashboard/inbox")({
  component: UnifiedInboxPage,
});

function UnifiedInboxPage() {
  // Filter state
  const [filters, setFilters] = useState<UnifiedInboxFilterState>({
    searchQuery: "",
    sourceTypes: [],
    status: [],
    unreadOnly: false,
  });

  // Selected thread state
  const [selectedThread, setSelectedThread] = useState<UnifiedInboxThread | null>(
    null
  );

  // Sort by priority toggle
  const [sortByPriority, setSortByPriority] = useState(false);

  // Fetch inbox data with current filters
  const {
    threads,
    isLoading,
    totalUnreadCount,
    unreadBySource,
    markAsRead,
    togglePinned,
    toggleMuted,
    archive,
    sync,
    isSyncing,
  } = useUnifiedInbox({
    sourceTypes: filters.sourceTypes.length > 0 ? filters.sourceTypes : undefined,
    status: filters.status.length > 0 ? filters.status : ["active"], // Default to active threads
    unreadOnly: filters.unreadOnly,
    searchQuery: filters.searchQuery || undefined,
  });

  // Priority scoring hooks
  const { mutate: scoreThreadPriority, isPending: isScoring } = useScoreThreadPriority();
  const { mutate: scoreAllPending, isPending: isScoringAll } = useScoreAllPending();
  const { data: priorityStats } = usePriorityStats();

  // Handle thread selection
  const handleSelectThread = useCallback((thread: UnifiedInboxThread) => {
    setSelectedThread(thread);
  }, []);

  // Handle back button on mobile
  const handleBack = useCallback(() => {
    setSelectedThread(null);
  }, []);

  // Handle thread actions
  const handleMarkAsRead = useCallback(
    (threadId: string) => {
      markAsRead(threadId);
    },
    [markAsRead]
  );

  const handleTogglePinned = useCallback(
    (threadId: string, isPinned: boolean) => {
      togglePinned({ threadId, isPinned });
    },
    [togglePinned]
  );

  const handleToggleMuted = useCallback(
    (threadId: string, isMuted: boolean) => {
      toggleMuted({ threadId, isMuted });
    },
    [toggleMuted]
  );

  const handleArchive = useCallback(
    (threadId: string) => {
      archive(threadId);
      if (selectedThread?.id === threadId) {
        setSelectedThread(null);
      }
    },
    [archive, selectedThread]
  );

  const handleSync = useCallback(() => {
    sync();
  }, [sync]);

  // Handle priority scoring for a single thread
  const handleScorePriority = useCallback(
    (threadId: string) => {
      scoreThreadPriority({ threadId, useAI: true });
    },
    [scoreThreadPriority]
  );

  // Handle scoring all pending threads
  const handleScoreAll = useCallback(() => {
    scoreAllPending({ useAI: true });
  }, [scoreAllPending]);

  // Toggle sort by priority
  const handleToggleSortByPriority = useCallback(() => {
    setSortByPriority((prev) => !prev);
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Page Header */}
      <header className="border-b border-white/5 bg-background/50 backdrop-blur-sm px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Inbox className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
                Unified Inbox
                {totalUnreadCount > 0 && (
                  <Badge className="h-5 min-w-5 flex items-center justify-center p-0 text-xs">
                    {totalUnreadCount > 99 ? "99+" : totalUnreadCount}
                  </Badge>
                )}
              </h1>
              <p className="text-sm text-muted-foreground">
                All your messages in one place
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Priority Stats Badge */}
            {priorityStats && priorityStats.highPriorityCount > 0 && (
              <Badge variant="destructive" className="h-6">
                {priorityStats.highPriorityCount} High Priority
              </Badge>
            )}

            {/* Sort by Priority Toggle */}
            <Button
              variant={sortByPriority ? "default" : "outline"}
              size="sm"
              onClick={handleToggleSortByPriority}
            >
              <ArrowUpDown className="h-4 w-4 mr-2" />
              {sortByPriority ? "Priority Sort" : "Date Sort"}
            </Button>

            {/* Analyze All Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleScoreAll}
              disabled={isScoringAll}
            >
              {isScoringAll ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Analyze
            </Button>

            {/* Sync Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Sync
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Thread List Panel */}
        <div
          className={cn(
            "w-full lg:w-[400px] xl:w-[450px] border-r border-white/5 flex flex-col bg-background/30",
            selectedThread && "hidden lg:flex"
          )}
        >
          {/* Filters */}
          <div className="p-4 border-b border-white/5">
            <UnifiedInboxFilters
              filters={filters}
              onFiltersChange={setFilters}
              unreadCounts={unreadBySource}
            />
          </div>

          {/* Thread List */}
          <UnifiedInboxThreadList
            threads={threads}
            isLoading={isLoading}
            selectedThreadId={selectedThread?.id}
            onSelectThread={handleSelectThread}
            onMarkAsRead={handleMarkAsRead}
            onTogglePinned={handleTogglePinned}
            onToggleMuted={handleToggleMuted}
            onArchive={handleArchive}
            onSync={handleSync}
            isSyncing={isSyncing}
            onScorePriority={handleScorePriority}
            showPriority={true}
            sortByPriority={sortByPriority}
          />
        </div>

        {/* Thread Detail Panel */}
        <div
          className={cn(
            "flex-1 flex flex-col bg-background/20",
            !selectedThread && "hidden lg:flex"
          )}
        >
          <UnifiedInboxThreadDetail
            thread={selectedThread}
            onBack={handleBack}
            showBackButton={true}
          />
        </div>
      </div>
    </div>
  );
}
