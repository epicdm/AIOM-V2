import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  approvalRequestByIdQueryOptions,
  approvalRequestByMessageIdQueryOptions,
  pendingApprovalRequestsQueryOptions,
  myApprovalRequestsQueryOptions,
  approvalRequestsByConversationQueryOptions,
  approvalRequestsByMessageIdsQueryOptions,
  unreadApprovalCountQueryOptions,
} from "~/queries/chat-approvals";
import {
  createApprovalRequestFn,
  approveRequestFn,
  rejectRequestFn,
  markApprovalAsReadFn,
} from "~/fn/chat-approvals";
import { getErrorMessage } from "~/utils/error";
import type { ChatApprovalStatus, ChatApprovalType } from "~/db/schema";

// Get approval request by ID
export function useApprovalRequest(id: string, enabled = true) {
  return useQuery({
    ...approvalRequestByIdQueryOptions(id),
    enabled: enabled && !!id,
  });
}

// Get approval request by message ID
export function useApprovalRequestByMessageId(messageId: string, enabled = true) {
  return useQuery({
    ...approvalRequestByMessageIdQueryOptions(messageId),
    enabled: enabled && !!messageId,
  });
}

// Get pending approval requests for the current user
export function usePendingApprovalRequests(limit?: number, enabled = true) {
  return useQuery({
    ...pendingApprovalRequestsQueryOptions(limit),
    enabled,
  });
}

// Get approval requests made by the current user
export function useMyApprovalRequests(
  status?: ChatApprovalStatus,
  limit?: number,
  enabled = true
) {
  return useQuery({
    ...myApprovalRequestsQueryOptions(status, limit),
    enabled,
  });
}

// Get approval requests for a specific conversation
export function useApprovalRequestsByConversation(
  conversationId: string,
  enabled = true
) {
  return useQuery({
    ...approvalRequestsByConversationQueryOptions(conversationId),
    enabled: enabled && !!conversationId,
  });
}

// Get approval requests by message IDs (for bulk loading in chat)
export function useApprovalRequestsByMessageIds(
  messageIds: string[],
  enabled = true
) {
  return useQuery({
    ...approvalRequestsByMessageIdsQueryOptions(messageIds),
    enabled: enabled && messageIds.length > 0,
  });
}

// Get unread approval count
export function useUnreadApprovalCount(enabled = true) {
  return useQuery({
    ...unreadApprovalCountQueryOptions(),
    enabled,
  });
}

// Create approval request mutation
export function useCreateApprovalRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      conversationId: string;
      approvalType?: ChatApprovalType;
      title: string;
      description?: string;
      amount?: string;
      currency?: string;
      metadata?: string;
    }) => createApprovalRequestFn({ data }),
    onSuccess: (result, variables) => {
      // Invalidate messages for this conversation
      queryClient.invalidateQueries({
        queryKey: ["messages", variables.conversationId],
      });
      // Invalidate conversations list
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      // Invalidate approval requests
      queryClient.invalidateQueries({ queryKey: ["chat-approvals"] });

      toast.success("Approval request sent", {
        description: `Your request "${variables.title}" has been sent.`,
      });
    },
    onError: (error) => {
      toast.error("Failed to create approval request", {
        description: getErrorMessage(error),
      });
    },
  });
}

// Approve request mutation
export function useApproveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { id: string; comment?: string }) =>
      approveRequestFn({ data }),
    onSuccess: (result) => {
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: ["messages", result.conversationId],
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["chat-approvals"] });

      toast.success("Request approved", {
        description: "The approval request has been approved.",
      });
    },
    onError: (error) => {
      toast.error("Failed to approve request", {
        description: getErrorMessage(error),
      });
    },
  });
}

// Reject request mutation
export function useRejectRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { id: string; reason: string }) =>
      rejectRequestFn({ data }),
    onSuccess: (result) => {
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: ["messages", result.conversationId],
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["chat-approvals"] });

      toast.success("Request rejected", {
        description: "The approval request has been rejected.",
      });
    },
    onError: (error) => {
      toast.error("Failed to reject request", {
        description: getErrorMessage(error),
      });
    },
  });
}

// Mark approval as read mutation
export function useMarkApprovalAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (approvalRequestId: string) =>
      markApprovalAsReadFn({ data: { approvalRequestId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["chat-approvals", "unread-count"],
      });
    },
  });
}
