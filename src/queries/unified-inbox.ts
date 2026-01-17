import { queryOptions } from "@tanstack/react-query";
import {
  getUnifiedInboxThreadsFn,
  getUnifiedInboxThreadFn,
  getThreadMessagesFn,
  getUnifiedInboxSummaryFn,
  getUnifiedInboxUnreadCountFn,
  getUnreadCountsBySourceFn,
} from "~/fn/unified-inbox";
import type { UnifiedInboxSourceType, UnifiedInboxThreadStatus } from "~/db/schema";

/**
 * Query options for unified inbox threads list
 */
export const unifiedInboxThreadsQueryOptions = (options?: {
  sourceTypes?: UnifiedInboxSourceType[];
  status?: UnifiedInboxThreadStatus[];
  unreadOnly?: boolean;
  pinnedOnly?: boolean;
  searchQuery?: string;
  limit?: number;
  offset?: number;
}) =>
  queryOptions({
    queryKey: ["unified-inbox", "threads", options ?? {}],
    queryFn: () =>
      getUnifiedInboxThreadsFn({
        data: {
          sourceTypes: options?.sourceTypes,
          status: options?.status,
          unreadOnly: options?.unreadOnly,
          pinnedOnly: options?.pinnedOnly,
          searchQuery: options?.searchQuery,
          limit: options?.limit ?? 50,
          offset: options?.offset ?? 0,
        },
      }),
    staleTime: 30000, // Consider data stale after 30 seconds
  });

/**
 * Query options for a single unified inbox thread with messages
 */
export const unifiedInboxThreadQueryOptions = (
  threadId: string,
  messageLimit: number = 50
) =>
  queryOptions({
    queryKey: ["unified-inbox", "thread", threadId, { messageLimit }],
    queryFn: () =>
      getUnifiedInboxThreadFn({
        data: { threadId, messageLimit },
      }),
    enabled: !!threadId,
  });

/**
 * Query options for messages in a specific thread (for pagination)
 */
export const threadMessagesQueryOptions = (
  threadId: string,
  limit: number = 50,
  offset: number = 0
) =>
  queryOptions({
    queryKey: ["unified-inbox", "messages", threadId, { limit, offset }],
    queryFn: () =>
      getThreadMessagesFn({
        data: { threadId, limit, offset },
      }),
    enabled: !!threadId,
  });

/**
 * Query options for unified inbox summary (dashboard widget)
 */
export const unifiedInboxSummaryQueryOptions = () =>
  queryOptions({
    queryKey: ["unified-inbox", "summary"],
    queryFn: () => getUnifiedInboxSummaryFn(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

/**
 * Query options for total unread count across all sources
 */
export const unifiedInboxUnreadCountQueryOptions = () =>
  queryOptions({
    queryKey: ["unified-inbox", "unread-count"],
    queryFn: () => getUnifiedInboxUnreadCountFn(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

/**
 * Query options for unread counts by source type
 */
export const unreadCountsBySourceQueryOptions = () =>
  queryOptions({
    queryKey: ["unified-inbox", "unread-by-source"],
    queryFn: () => getUnreadCountsBySourceFn(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

/**
 * Query options for direct messages only
 */
export const directMessagesThreadsQueryOptions = (
  limit: number = 50,
  offset: number = 0
) =>
  queryOptions({
    queryKey: ["unified-inbox", "threads", "direct_message", { limit, offset }],
    queryFn: () =>
      getUnifiedInboxThreadsFn({
        data: {
          sourceTypes: ["direct_message"],
          limit,
          offset,
        },
      }),
    staleTime: 30000,
  });

/**
 * Query options for Odoo Discuss threads only
 */
export const odooDiscussThreadsQueryOptions = (
  limit: number = 50,
  offset: number = 0
) =>
  queryOptions({
    queryKey: ["unified-inbox", "threads", "odoo_discuss", { limit, offset }],
    queryFn: () =>
      getUnifiedInboxThreadsFn({
        data: {
          sourceTypes: ["odoo_discuss"],
          limit,
          offset,
        },
      }),
    staleTime: 30000,
  });

/**
 * Query options for notification threads only
 */
export const notificationThreadsQueryOptions = (
  limit: number = 50,
  offset: number = 0
) =>
  queryOptions({
    queryKey: ["unified-inbox", "threads", "notifications", { limit, offset }],
    queryFn: () =>
      getUnifiedInboxThreadsFn({
        data: {
          sourceTypes: ["system_notification", "push_notification"],
          limit,
          offset,
        },
      }),
    staleTime: 30000,
  });

/**
 * Query options for pinned threads
 */
export const pinnedThreadsQueryOptions = () =>
  queryOptions({
    queryKey: ["unified-inbox", "threads", "pinned"],
    queryFn: () =>
      getUnifiedInboxThreadsFn({
        data: {
          pinnedOnly: true,
          limit: 10,
        },
      }),
    staleTime: 30000,
  });

/**
 * Query options for unread threads
 */
export const unreadThreadsQueryOptions = (limit: number = 20) =>
  queryOptions({
    queryKey: ["unified-inbox", "threads", "unread", { limit }],
    queryFn: () =>
      getUnifiedInboxThreadsFn({
        data: {
          unreadOnly: true,
          limit,
        },
      }),
    staleTime: 30000,
  });
