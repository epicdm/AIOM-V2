import { queryOptions } from "@tanstack/react-query";
import {
  getTaskLinksByConversationFn,
  getTaskLinksByExternalTaskFn,
  getTaskSuggestionsFn,
  getPendingTaskSuggestionsFn,
  getTaskThreadFn,
  getTaskThreadsByTaskFn,
  getUserTaskThreadsFn,
  getTaskThreadMessagesFn,
  getThreadParticipantsFn,
  getUnreadThreadCountFn,
} from "~/fn/task-conversation-links";

// =============================================================================
// Task Conversation Link Queries
// =============================================================================

export const taskLinksForConversationQueryOptions = (conversationId: string) =>
  queryOptions({
    queryKey: ["taskLinks", "conversation", conversationId],
    queryFn: () => getTaskLinksByConversationFn({ data: { conversationId } }),
    enabled: !!conversationId,
  });

export const taskLinksForExternalTaskQueryOptions = (externalTaskId: string) =>
  queryOptions({
    queryKey: ["taskLinks", "externalTask", externalTaskId],
    queryFn: () => getTaskLinksByExternalTaskFn({ data: { externalTaskId } }),
    enabled: !!externalTaskId,
  });

// =============================================================================
// Task Suggestion Queries
// =============================================================================

export const taskSuggestionsQueryOptions = (
  conversationId: string,
  status?: "pending" | "accepted" | "dismissed"
) =>
  queryOptions({
    queryKey: ["taskSuggestions", conversationId, status],
    queryFn: () => getTaskSuggestionsFn({ data: { conversationId, status } }),
    enabled: !!conversationId,
  });

export const pendingTaskSuggestionsQueryOptions = (conversationId: string) =>
  queryOptions({
    queryKey: ["taskSuggestions", conversationId, "pending"],
    queryFn: () => getPendingTaskSuggestionsFn({ data: { conversationId } }),
    enabled: !!conversationId,
  });

// =============================================================================
// Task Thread Queries
// =============================================================================

export const taskThreadQueryOptions = (threadId: string) =>
  queryOptions({
    queryKey: ["taskThread", threadId],
    queryFn: () => getTaskThreadFn({ data: { threadId } }),
    enabled: !!threadId,
  });

export const taskThreadsForTaskQueryOptions = (externalTaskId: string) =>
  queryOptions({
    queryKey: ["taskThreads", "externalTask", externalTaskId],
    queryFn: () => getTaskThreadsByTaskFn({ data: { externalTaskId } }),
    enabled: !!externalTaskId,
  });

export const userTaskThreadsQueryOptions = () =>
  queryOptions({
    queryKey: ["taskThreads", "user"],
    queryFn: () => getUserTaskThreadsFn(),
  });

// =============================================================================
// Task Thread Message Queries
// =============================================================================

export const taskThreadMessagesQueryOptions = (
  threadId: string,
  limit: number = 50,
  offset: number = 0
) =>
  queryOptions({
    queryKey: ["taskThreadMessages", threadId, limit, offset],
    queryFn: () => getTaskThreadMessagesFn({ data: { threadId, limit, offset } }),
    enabled: !!threadId,
  });

// =============================================================================
// Task Thread Participant Queries
// =============================================================================

export const threadParticipantsQueryOptions = (threadId: string) =>
  queryOptions({
    queryKey: ["threadParticipants", threadId],
    queryFn: () => getThreadParticipantsFn({ data: { threadId } }),
    enabled: !!threadId,
  });

// =============================================================================
// Utility Queries
// =============================================================================

export const unreadThreadCountQueryOptions = () =>
  queryOptions({
    queryKey: ["unreadThreadCount"],
    queryFn: () => getUnreadThreadCountFn(),
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // 1 minute
  });
