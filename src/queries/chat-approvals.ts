import { queryOptions } from "@tanstack/react-query";
import {
  getApprovalRequestByIdFn,
  getApprovalRequestByMessageIdFn,
  getPendingApprovalRequestsFn,
  getMyApprovalRequestsFn,
  getApprovalRequestsByConversationFn,
  getApprovalRequestsByMessageIdsFn,
  getUnreadApprovalCountFn,
} from "~/fn/chat-approvals";
import type { ChatApprovalStatus } from "~/db/schema";

export const approvalRequestByIdQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["chat-approvals", "by-id", id],
    queryFn: () => getApprovalRequestByIdFn({ data: { id } }),
    enabled: !!id,
  });

export const approvalRequestByMessageIdQueryOptions = (messageId: string) =>
  queryOptions({
    queryKey: ["chat-approvals", "by-message", messageId],
    queryFn: () => getApprovalRequestByMessageIdFn({ data: { messageId } }),
    enabled: !!messageId,
  });

export const pendingApprovalRequestsQueryOptions = (limit?: number) =>
  queryOptions({
    queryKey: ["chat-approvals", "pending", { limit }],
    queryFn: () => getPendingApprovalRequestsFn({ data: { limit: limit ?? 50 } }),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

export const myApprovalRequestsQueryOptions = (
  status?: ChatApprovalStatus,
  limit?: number
) =>
  queryOptions({
    queryKey: ["chat-approvals", "my-requests", { status, limit }],
    queryFn: () => getMyApprovalRequestsFn({ data: { status, limit: limit ?? 50 } }),
  });

export const approvalRequestsByConversationQueryOptions = (conversationId: string) =>
  queryOptions({
    queryKey: ["chat-approvals", "by-conversation", conversationId],
    queryFn: () => getApprovalRequestsByConversationFn({ data: { conversationId } }),
    enabled: !!conversationId,
  });

export const approvalRequestsByMessageIdsQueryOptions = (messageIds: string[]) =>
  queryOptions({
    queryKey: ["chat-approvals", "by-message-ids", messageIds],
    queryFn: () => getApprovalRequestsByMessageIdsFn({ data: { messageIds } }),
    enabled: messageIds.length > 0,
  });

export const unreadApprovalCountQueryOptions = () =>
  queryOptions({
    queryKey: ["chat-approvals", "unread-count"],
    queryFn: () => getUnreadApprovalCountFn(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });
