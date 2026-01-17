import { Loader2, Inbox, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "~/components/ui/button";
import { UnifiedInboxThreadItem } from "./UnifiedInboxThreadItem";
import type { UnifiedInboxThread } from "~/db/schema";

interface UnifiedInboxThreadListProps {
  threads: UnifiedInboxThread[];
  isLoading: boolean;
  selectedThreadId?: string | null;
  onSelectThread: (thread: UnifiedInboxThread) => void;
  onMarkAsRead?: (threadId: string) => void;
  onTogglePinned?: (threadId: string, isPinned: boolean) => void;
  onToggleMuted?: (threadId: string, isMuted: boolean) => void;
  onArchive?: (threadId: string) => void;
  onSync?: () => void;
  isSyncing?: boolean;
  onScorePriority?: (threadId: string) => void;
  showPriority?: boolean;
  sortByPriority?: boolean;
}

export function UnifiedInboxThreadList({
  threads,
  isLoading,
  selectedThreadId,
  onSelectThread,
  onMarkAsRead,
  onTogglePinned,
  onToggleMuted,
  onArchive,
  onSync,
  isSyncing,
  onScorePriority,
  showPriority = true,
  sortByPriority = false,
}: UnifiedInboxThreadListProps) {
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
        <div className="p-4 rounded-full bg-muted mb-4">
          <Inbox className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          No messages yet
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm mb-4">
          Your unified inbox is empty. Start a conversation or wait for new
          messages to appear here.
        </p>
        {onSync && (
          <Button
            variant="outline"
            size="sm"
            onClick={onSync}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Sync Messages
          </Button>
        )}
      </div>
    );
  }

  // Group threads: pinned first, then high priority, then by recency
  const pinnedThreads = threads.filter((t) => t.isPinned);
  const unpinnedThreads = threads.filter((t) => !t.isPinned);

  // Further group unpinned threads by priority if enabled
  const highPriorityThreads = sortByPriority
    ? unpinnedThreads.filter((t) => t.isHighPriority)
    : [];
  const normalThreads = sortByPriority
    ? unpinnedThreads.filter((t) => !t.isHighPriority)
    : unpinnedThreads;

  // Sort by priority score if enabled
  if (sortByPriority) {
    highPriorityThreads.sort((a, b) => (b.priorityScore ?? 0) - (a.priorityScore ?? 0));
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {pinnedThreads.length > 0 && (
        <div>
          <div className="px-4 py-2 bg-muted/30 border-b border-white/5">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Pinned
            </span>
          </div>
          {pinnedThreads.map((thread) => (
            <div key={thread.id} className="group">
              <UnifiedInboxThreadItem
                thread={thread}
                isSelected={selectedThreadId === thread.id}
                onSelect={onSelectThread}
                onMarkAsRead={onMarkAsRead}
                onTogglePinned={onTogglePinned}
                onToggleMuted={onToggleMuted}
                onArchive={onArchive}
                onScorePriority={onScorePriority}
                showPriority={showPriority}
              />
            </div>
          ))}
        </div>
      )}

      {sortByPriority && highPriorityThreads.length > 0 && (
        <div>
          <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20 flex items-center gap-2">
            <AlertTriangle className="h-3 w-3 text-red-500" />
            <span className="text-xs font-medium text-red-500 uppercase tracking-wider">
              High Priority
            </span>
          </div>
          {highPriorityThreads.map((thread) => (
            <div key={thread.id} className="group">
              <UnifiedInboxThreadItem
                thread={thread}
                isSelected={selectedThreadId === thread.id}
                onSelect={onSelectThread}
                onMarkAsRead={onMarkAsRead}
                onTogglePinned={onTogglePinned}
                onToggleMuted={onToggleMuted}
                onArchive={onArchive}
                onScorePriority={onScorePriority}
                showPriority={showPriority}
              />
            </div>
          ))}
        </div>
      )}

      {normalThreads.length > 0 && (
        <div>
          {(pinnedThreads.length > 0 || (sortByPriority && highPriorityThreads.length > 0)) && (
            <div className="px-4 py-2 bg-muted/30 border-b border-white/5">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {sortByPriority ? "Other Messages" : "All Messages"}
              </span>
            </div>
          )}
          {normalThreads.map((thread) => (
            <div key={thread.id} className="group">
              <UnifiedInboxThreadItem
                thread={thread}
                isSelected={selectedThreadId === thread.id}
                onSelect={onSelectThread}
                onMarkAsRead={onMarkAsRead}
                onTogglePinned={onTogglePinned}
                onToggleMuted={onToggleMuted}
                onArchive={onArchive}
                onScorePriority={onScorePriority}
                showPriority={showPriority}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
