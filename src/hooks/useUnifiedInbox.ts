import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  unifiedInboxThreadsQueryOptions,
  unifiedInboxThreadQueryOptions,
  unifiedInboxSummaryQueryOptions,
  unifiedInboxUnreadCountQueryOptions,
  unreadCountsBySourceQueryOptions,
} from "~/queries/unified-inbox";
import {
  markThreadAsReadFn,
  toggleThreadPinnedFn,
  toggleThreadMutedFn,
  archiveThreadFn,
  syncUnifiedInboxFn,
} from "~/fn/unified-inbox";
import type { UnifiedInboxSourceType, UnifiedInboxThreadStatus } from "~/db/schema";

export interface UseUnifiedInboxOptions {
  sourceTypes?: UnifiedInboxSourceType[];
  status?: UnifiedInboxThreadStatus[];
  unreadOnly?: boolean;
  pinnedOnly?: boolean;
  searchQuery?: string;
  limit?: number;
  offset?: number;
}

/**
 * Hook for managing unified inbox threads
 */
export function useUnifiedInbox(options?: UseUnifiedInboxOptions) {
  const queryClient = useQueryClient();

  // Fetch threads with filters
  const threadsQuery = useQuery(unifiedInboxThreadsQueryOptions(options));

  // Fetch summary for dashboard
  const summaryQuery = useQuery(unifiedInboxSummaryQueryOptions());

  // Fetch total unread count
  const unreadCountQuery = useQuery(unifiedInboxUnreadCountQueryOptions());

  // Fetch unread counts by source type
  const unreadBySourceQuery = useQuery(unreadCountsBySourceQueryOptions());

  // Mark thread as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (threadId: string) =>
      markThreadAsReadFn({ data: { threadId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unified-inbox"] });
    },
  });

  // Toggle pinned mutation
  const togglePinnedMutation = useMutation({
    mutationFn: ({ threadId, isPinned }: { threadId: string; isPinned: boolean }) =>
      toggleThreadPinnedFn({ data: { threadId, isPinned } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unified-inbox"] });
    },
  });

  // Toggle muted mutation
  const toggleMutedMutation = useMutation({
    mutationFn: ({ threadId, isMuted }: { threadId: string; isMuted: boolean }) =>
      toggleThreadMutedFn({ data: { threadId, isMuted } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unified-inbox"] });
    },
  });

  // Archive thread mutation
  const archiveMutation = useMutation({
    mutationFn: (threadId: string) =>
      archiveThreadFn({ data: { threadId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unified-inbox"] });
    },
  });

  // Sync all threads mutation
  const syncMutation = useMutation({
    mutationFn: () => syncUnifiedInboxFn(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unified-inbox"] });
    },
  });

  return {
    // Queries
    threads: threadsQuery.data ?? [],
    isLoading: threadsQuery.isLoading,
    isError: threadsQuery.isError,
    error: threadsQuery.error,

    // Summary
    summary: summaryQuery.data,
    isSummaryLoading: summaryQuery.isLoading,

    // Unread counts
    totalUnreadCount: unreadCountQuery.data?.count ?? 0,
    unreadBySource: unreadBySourceQuery.data,

    // Mutations
    markAsRead: markAsReadMutation.mutate,
    isMarkingAsRead: markAsReadMutation.isPending,

    togglePinned: togglePinnedMutation.mutate,
    isTogglingPinned: togglePinnedMutation.isPending,

    toggleMuted: toggleMutedMutation.mutate,
    isTogglingMuted: toggleMutedMutation.isPending,

    archive: archiveMutation.mutate,
    isArchiving: archiveMutation.isPending,

    sync: syncMutation.mutate,
    isSyncing: syncMutation.isPending,

    // Refetch
    refetch: threadsQuery.refetch,
  };
}

/**
 * Hook for fetching a single thread with messages
 */
export function useUnifiedInboxThread(threadId: string | null, messageLimit?: number) {
  const queryClient = useQueryClient();

  const threadQuery = useQuery({
    ...unifiedInboxThreadQueryOptions(threadId ?? "", messageLimit),
    enabled: !!threadId,
  });

  // Mark thread as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: () =>
      markThreadAsReadFn({ data: { threadId: threadId! } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unified-inbox"] });
    },
  });

  return {
    thread: threadQuery.data,
    isLoading: threadQuery.isLoading,
    isError: threadQuery.isError,
    error: threadQuery.error,
    markAsRead: markAsReadMutation.mutate,
    refetch: threadQuery.refetch,
  };
}
