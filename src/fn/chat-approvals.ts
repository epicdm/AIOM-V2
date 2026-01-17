import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authenticatedMiddleware } from "./middleware";
import { isUserParticipantInConversation } from "~/data-access/conversations";
import { createMessage } from "~/data-access/messages";
import {
  createChatApprovalRequest,
  findChatApprovalRequestById,
  findChatApprovalRequestByMessageId,
  findPendingApprovalRequestsForUser,
  findApprovalRequestsByRequester,
  findApprovalRequestsByConversation,
  findApprovalRequestsByMessageIds,
  approveChatApprovalRequest,
  rejectChatApprovalRequest,
  createApprovalNotificationThread,
  markApprovalThreadAsRead,
  countUnreadApprovalRequests,
} from "~/data-access/chat-approvals";
import type { ChatApprovalType } from "~/db/schema";

// Schema for creating an approval request
const createApprovalRequestSchema = z.object({
  conversationId: z.string().min(1, "Conversation ID is required"),
  approvalType: z.enum(["expense", "time_off", "purchase", "document", "general"]).default("general"),
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  description: z.string().max(2000, "Description too long").optional(),
  amount: z.string().optional(),
  currency: z.string().default("USD"),
  metadata: z.string().optional(), // JSON string for additional data
});

// Create a new approval request in a conversation
export const createApprovalRequestFn = createServerFn({
  method: "POST",
})
  .inputValidator(createApprovalRequestSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // Verify user is a participant in the conversation
    const isParticipant = await isUserParticipantInConversation(
      context.userId,
      data.conversationId
    );

    if (!isParticipant) {
      throw new Error("You are not a participant in this conversation");
    }

    // Create the message first (the approval request will be attached to it)
    const messageContent = `📋 Approval Request: ${data.title}${data.amount ? ` - ${data.currency} ${data.amount}` : ""}`;

    const newMessage = await createMessage({
      id: crypto.randomUUID(),
      conversationId: data.conversationId,
      senderId: context.userId,
      content: messageContent,
      isRead: false,
      createdAt: new Date(),
    });

    // Create the approval request linked to the message
    const approvalRequest = await createChatApprovalRequest({
      id: crypto.randomUUID(),
      conversationId: data.conversationId,
      messageId: newMessage.id,
      requesterId: context.userId,
      approvalType: data.approvalType,
      title: data.title,
      description: data.description || null,
      amount: data.amount || null,
      currency: data.currency,
      status: "pending",
      metadata: data.metadata || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Create notification thread for the approval request recipient
    // (the other participant in the conversation will receive this)
    await createApprovalNotificationThread({
      id: crypto.randomUUID(),
      approvalRequestId: approvalRequest.id,
      userId: context.userId, // This should be the other participant - will be handled by caller
      notificationType: "request_received",
      isRead: false,
      createdAt: new Date(),
    });

    return {
      message: newMessage,
      approvalRequest,
    };
  });

// Get approval request by ID
export const getApprovalRequestByIdFn = createServerFn({
  method: "GET",
})
  .inputValidator(z.object({ id: z.string().min(1) }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const request = await findChatApprovalRequestById(data.id);

    if (!request) {
      throw new Error("Approval request not found");
    }

    // Verify user has access (is a participant in the conversation)
    const isParticipant = await isUserParticipantInConversation(
      context.userId,
      request.conversationId
    );

    if (!isParticipant) {
      throw new Error("You don't have access to this approval request");
    }

    return request;
  });

// Get approval request by message ID
export const getApprovalRequestByMessageIdFn = createServerFn({
  method: "GET",
})
  .inputValidator(z.object({ messageId: z.string().min(1) }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const request = await findChatApprovalRequestByMessageId(data.messageId);

    if (!request) {
      return null;
    }

    // Verify user has access
    const isParticipant = await isUserParticipantInConversation(
      context.userId,
      request.conversationId
    );

    if (!isParticipant) {
      throw new Error("You don't have access to this approval request");
    }

    return request;
  });

// Get pending approval requests for the current user
export const getPendingApprovalRequestsFn = createServerFn({
  method: "GET",
})
  .inputValidator(z.object({ limit: z.number().optional().default(50) }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const requests = await findPendingApprovalRequestsForUser(
      context.userId,
      data.limit
    );
    return requests;
  });

// Get approval requests made by the current user
export const getMyApprovalRequestsFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      status: z.enum(["pending", "approved", "rejected"]).optional(),
      limit: z.number().optional().default(50),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const requests = await findApprovalRequestsByRequester(
      context.userId,
      data.status,
      data.limit
    );
    return requests;
  });

// Get approval requests for a specific conversation
export const getApprovalRequestsByConversationFn = createServerFn({
  method: "GET",
})
  .inputValidator(z.object({ conversationId: z.string().min(1) }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // Verify user has access
    const isParticipant = await isUserParticipantInConversation(
      context.userId,
      data.conversationId
    );

    if (!isParticipant) {
      throw new Error("You don't have access to this conversation");
    }

    const requests = await findApprovalRequestsByConversation(data.conversationId);
    return requests;
  });

// Get approval requests by message IDs (for bulk loading)
export const getApprovalRequestsByMessageIdsFn = createServerFn({
  method: "POST",
})
  .inputValidator(z.object({ messageIds: z.array(z.string()) }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    const requestMap = await findApprovalRequestsByMessageIds(data.messageIds);
    // Convert Map to object for serialization
    const result: Record<string, Awaited<ReturnType<typeof findChatApprovalRequestByMessageId>>> = {};
    requestMap.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  });

// Approve a request
export const approveRequestFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      id: z.string().min(1, "Request ID is required"),
      comment: z.string().max(1000, "Comment too long").optional(),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // Get the request first to check access
    const request = await findChatApprovalRequestById(data.id);

    if (!request) {
      throw new Error("Approval request not found");
    }

    // Verify user has access and is not the requester
    const isParticipant = await isUserParticipantInConversation(
      context.userId,
      request.conversationId
    );

    if (!isParticipant) {
      throw new Error("You don't have access to this approval request");
    }

    if (request.requesterId === context.userId) {
      throw new Error("You cannot approve your own request");
    }

    // Approve the request
    const updatedRequest = await approveChatApprovalRequest(
      data.id,
      context.userId,
      data.comment
    );

    // Create a response message in the conversation
    const responseContent = `✅ Approved: ${request.title}${data.comment ? `\n\nComment: ${data.comment}` : ""}`;

    await createMessage({
      id: crypto.randomUUID(),
      conversationId: request.conversationId,
      senderId: context.userId,
      content: responseContent,
      isRead: false,
      createdAt: new Date(),
    });

    // Create notification for the requester
    await createApprovalNotificationThread({
      id: crypto.randomUUID(),
      approvalRequestId: request.id,
      userId: request.requesterId,
      notificationType: "status_changed",
      isRead: false,
      createdAt: new Date(),
    });

    return updatedRequest;
  });

// Reject a request
export const rejectRequestFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      id: z.string().min(1, "Request ID is required"),
      reason: z.string().min(1, "Rejection reason is required").max(1000, "Reason too long"),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // Get the request first to check access
    const request = await findChatApprovalRequestById(data.id);

    if (!request) {
      throw new Error("Approval request not found");
    }

    // Verify user has access and is not the requester
    const isParticipant = await isUserParticipantInConversation(
      context.userId,
      request.conversationId
    );

    if (!isParticipant) {
      throw new Error("You don't have access to this approval request");
    }

    if (request.requesterId === context.userId) {
      throw new Error("You cannot reject your own request");
    }

    // Reject the request
    const updatedRequest = await rejectChatApprovalRequest(
      data.id,
      context.userId,
      data.reason
    );

    // Create a response message in the conversation
    const responseContent = `❌ Rejected: ${request.title}\n\nReason: ${data.reason}`;

    await createMessage({
      id: crypto.randomUUID(),
      conversationId: request.conversationId,
      senderId: context.userId,
      content: responseContent,
      isRead: false,
      createdAt: new Date(),
    });

    // Create notification for the requester
    await createApprovalNotificationThread({
      id: crypto.randomUUID(),
      approvalRequestId: request.id,
      userId: request.requesterId,
      notificationType: "status_changed",
      isRead: false,
      createdAt: new Date(),
    });

    return updatedRequest;
  });

// Mark approval notification as read
export const markApprovalAsReadFn = createServerFn({
  method: "POST",
})
  .inputValidator(z.object({ approvalRequestId: z.string().min(1) }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    await markApprovalThreadAsRead(data.approvalRequestId, context.userId);
    return { success: true };
  });

// Get unread approval count
export const getUnreadApprovalCountFn = createServerFn({
  method: "GET",
})
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    const count = await countUnreadApprovalRequests(context.userId);
    return { count };
  });
