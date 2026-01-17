import { eq, and, desc, sql, or, inArray } from "drizzle-orm";
import { database } from "~/db";
import {
  chatApprovalRequest,
  chatApprovalThread,
  user,
  conversation,
  type ChatApprovalRequest,
  type CreateChatApprovalRequestData,
  type UpdateChatApprovalRequestData,
  type ChatApprovalThread,
  type CreateChatApprovalThreadData,
  type User,
  type ChatApprovalStatus,
} from "~/db/schema";

// Types for queries
export type ChatApprovalRequestWithDetails = ChatApprovalRequest & {
  requester: Pick<User, "id" | "name" | "image" | "email">;
  approver: Pick<User, "id" | "name" | "image" | "email"> | null;
};

// Create a new chat approval request
export async function createChatApprovalRequest(
  data: CreateChatApprovalRequestData
): Promise<ChatApprovalRequest> {
  const [newRequest] = await database
    .insert(chatApprovalRequest)
    .values(data)
    .returning();

  return newRequest;
}

// Get approval request by ID
export async function findChatApprovalRequestById(
  id: string
): Promise<ChatApprovalRequestWithDetails | null> {
  const results = await database
    .select({
      id: chatApprovalRequest.id,
      conversationId: chatApprovalRequest.conversationId,
      messageId: chatApprovalRequest.messageId,
      requesterId: chatApprovalRequest.requesterId,
      approverId: chatApprovalRequest.approverId,
      approvalType: chatApprovalRequest.approvalType,
      title: chatApprovalRequest.title,
      description: chatApprovalRequest.description,
      amount: chatApprovalRequest.amount,
      currency: chatApprovalRequest.currency,
      status: chatApprovalRequest.status,
      responseComment: chatApprovalRequest.responseComment,
      respondedAt: chatApprovalRequest.respondedAt,
      metadata: chatApprovalRequest.metadata,
      createdAt: chatApprovalRequest.createdAt,
      updatedAt: chatApprovalRequest.updatedAt,
      expiresAt: chatApprovalRequest.expiresAt,
      requester: {
        id: user.id,
        name: user.name,
        image: user.image,
        email: user.email,
      },
    })
    .from(chatApprovalRequest)
    .innerJoin(user, eq(chatApprovalRequest.requesterId, user.id))
    .where(eq(chatApprovalRequest.id, id))
    .limit(1);

  if (!results[0]) return null;

  // Fetch approver separately if exists
  let approver: Pick<User, "id" | "name" | "image" | "email"> | null = null;
  if (results[0].approverId) {
    const [approverResult] = await database
      .select({
        id: user.id,
        name: user.name,
        image: user.image,
        email: user.email,
      })
      .from(user)
      .where(eq(user.id, results[0].approverId))
      .limit(1);
    approver = approverResult || null;
  }

  return {
    ...results[0],
    approver,
  };
}

// Get approval request by message ID
export async function findChatApprovalRequestByMessageId(
  messageId: string
): Promise<ChatApprovalRequestWithDetails | null> {
  const results = await database
    .select({
      id: chatApprovalRequest.id,
      conversationId: chatApprovalRequest.conversationId,
      messageId: chatApprovalRequest.messageId,
      requesterId: chatApprovalRequest.requesterId,
      approverId: chatApprovalRequest.approverId,
      approvalType: chatApprovalRequest.approvalType,
      title: chatApprovalRequest.title,
      description: chatApprovalRequest.description,
      amount: chatApprovalRequest.amount,
      currency: chatApprovalRequest.currency,
      status: chatApprovalRequest.status,
      responseComment: chatApprovalRequest.responseComment,
      respondedAt: chatApprovalRequest.respondedAt,
      metadata: chatApprovalRequest.metadata,
      createdAt: chatApprovalRequest.createdAt,
      updatedAt: chatApprovalRequest.updatedAt,
      expiresAt: chatApprovalRequest.expiresAt,
      requester: {
        id: user.id,
        name: user.name,
        image: user.image,
        email: user.email,
      },
    })
    .from(chatApprovalRequest)
    .innerJoin(user, eq(chatApprovalRequest.requesterId, user.id))
    .where(eq(chatApprovalRequest.messageId, messageId))
    .limit(1);

  if (!results[0]) return null;

  // Fetch approver separately if exists
  let approver: Pick<User, "id" | "name" | "image" | "email"> | null = null;
  if (results[0].approverId) {
    const [approverResult] = await database
      .select({
        id: user.id,
        name: user.name,
        image: user.image,
        email: user.email,
      })
      .from(user)
      .where(eq(user.id, results[0].approverId))
      .limit(1);
    approver = approverResult || null;
  }

  return {
    ...results[0],
    approver,
  };
}

// Get pending approval requests for a user (as the potential approver)
export async function findPendingApprovalRequestsForUser(
  userId: string,
  limit: number = 50
): Promise<ChatApprovalRequestWithDetails[]> {
  // Get all conversations where the user is a participant
  const userConversations = await database
    .select({ id: conversation.id })
    .from(conversation)
    .where(
      or(
        eq(conversation.participant1Id, userId),
        eq(conversation.participant2Id, userId)
      )
    );

  const conversationIds = userConversations.map((c) => c.id);

  if (conversationIds.length === 0) return [];

  // Get pending approval requests from those conversations
  // where the user is NOT the requester
  const results = await database
    .select({
      id: chatApprovalRequest.id,
      conversationId: chatApprovalRequest.conversationId,
      messageId: chatApprovalRequest.messageId,
      requesterId: chatApprovalRequest.requesterId,
      approverId: chatApprovalRequest.approverId,
      approvalType: chatApprovalRequest.approvalType,
      title: chatApprovalRequest.title,
      description: chatApprovalRequest.description,
      amount: chatApprovalRequest.amount,
      currency: chatApprovalRequest.currency,
      status: chatApprovalRequest.status,
      responseComment: chatApprovalRequest.responseComment,
      respondedAt: chatApprovalRequest.respondedAt,
      metadata: chatApprovalRequest.metadata,
      createdAt: chatApprovalRequest.createdAt,
      updatedAt: chatApprovalRequest.updatedAt,
      expiresAt: chatApprovalRequest.expiresAt,
      requester: {
        id: user.id,
        name: user.name,
        image: user.image,
        email: user.email,
      },
    })
    .from(chatApprovalRequest)
    .innerJoin(user, eq(chatApprovalRequest.requesterId, user.id))
    .where(
      and(
        inArray(chatApprovalRequest.conversationId, conversationIds),
        eq(chatApprovalRequest.status, "pending"),
        sql`${chatApprovalRequest.requesterId} != ${userId}`
      )
    )
    .orderBy(desc(chatApprovalRequest.createdAt))
    .limit(limit);

  return results.map((r) => ({ ...r, approver: null }));
}

// Get approval requests made by a user
export async function findApprovalRequestsByRequester(
  requesterId: string,
  status?: ChatApprovalStatus,
  limit: number = 50
): Promise<ChatApprovalRequestWithDetails[]> {
  const conditions = [eq(chatApprovalRequest.requesterId, requesterId)];
  if (status) {
    conditions.push(eq(chatApprovalRequest.status, status));
  }

  const results = await database
    .select({
      id: chatApprovalRequest.id,
      conversationId: chatApprovalRequest.conversationId,
      messageId: chatApprovalRequest.messageId,
      requesterId: chatApprovalRequest.requesterId,
      approverId: chatApprovalRequest.approverId,
      approvalType: chatApprovalRequest.approvalType,
      title: chatApprovalRequest.title,
      description: chatApprovalRequest.description,
      amount: chatApprovalRequest.amount,
      currency: chatApprovalRequest.currency,
      status: chatApprovalRequest.status,
      responseComment: chatApprovalRequest.responseComment,
      respondedAt: chatApprovalRequest.respondedAt,
      metadata: chatApprovalRequest.metadata,
      createdAt: chatApprovalRequest.createdAt,
      updatedAt: chatApprovalRequest.updatedAt,
      expiresAt: chatApprovalRequest.expiresAt,
      requester: {
        id: user.id,
        name: user.name,
        image: user.image,
        email: user.email,
      },
    })
    .from(chatApprovalRequest)
    .innerJoin(user, eq(chatApprovalRequest.requesterId, user.id))
    .where(and(...conditions))
    .orderBy(desc(chatApprovalRequest.createdAt))
    .limit(limit);

  return results.map((r) => ({ ...r, approver: null }));
}

// Approve a request
export async function approveChatApprovalRequest(
  id: string,
  approverId: string,
  comment?: string
): Promise<ChatApprovalRequest> {
  const [updated] = await database
    .update(chatApprovalRequest)
    .set({
      status: "approved",
      approverId,
      responseComment: comment || null,
      respondedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(chatApprovalRequest.id, id),
        eq(chatApprovalRequest.status, "pending")
      )
    )
    .returning();

  if (!updated) {
    throw new Error("Approval request not found or already processed");
  }

  return updated;
}

// Reject a request
export async function rejectChatApprovalRequest(
  id: string,
  approverId: string,
  reason: string
): Promise<ChatApprovalRequest> {
  const [updated] = await database
    .update(chatApprovalRequest)
    .set({
      status: "rejected",
      approverId,
      responseComment: reason,
      respondedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(chatApprovalRequest.id, id),
        eq(chatApprovalRequest.status, "pending")
      )
    )
    .returning();

  if (!updated) {
    throw new Error("Approval request not found or already processed");
  }

  return updated;
}

// Update approval request
export async function updateChatApprovalRequest(
  id: string,
  data: UpdateChatApprovalRequestData
): Promise<ChatApprovalRequest> {
  const [updated] = await database
    .update(chatApprovalRequest)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(chatApprovalRequest.id, id))
    .returning();

  return updated;
}

// Create notification thread for approval request
export async function createApprovalNotificationThread(
  data: CreateChatApprovalThreadData
): Promise<ChatApprovalThread> {
  const [thread] = await database
    .insert(chatApprovalThread)
    .values(data)
    .returning();

  return thread;
}

// Mark approval thread as read
export async function markApprovalThreadAsRead(
  approvalRequestId: string,
  userId: string
): Promise<void> {
  await database
    .update(chatApprovalThread)
    .set({
      isRead: true,
      readAt: new Date(),
    })
    .where(
      and(
        eq(chatApprovalThread.approvalRequestId, approvalRequestId),
        eq(chatApprovalThread.userId, userId),
        eq(chatApprovalThread.isRead, false)
      )
    );
}

// Count unread approval requests for a user
export async function countUnreadApprovalRequests(
  userId: string
): Promise<number> {
  const [result] = await database
    .select({ count: sql<number>`count(*)::int` })
    .from(chatApprovalThread)
    .where(
      and(
        eq(chatApprovalThread.userId, userId),
        eq(chatApprovalThread.isRead, false)
      )
    );

  return result?.count ?? 0;
}

// Get approval requests for a specific conversation
export async function findApprovalRequestsByConversation(
  conversationId: string
): Promise<ChatApprovalRequestWithDetails[]> {
  const results = await database
    .select({
      id: chatApprovalRequest.id,
      conversationId: chatApprovalRequest.conversationId,
      messageId: chatApprovalRequest.messageId,
      requesterId: chatApprovalRequest.requesterId,
      approverId: chatApprovalRequest.approverId,
      approvalType: chatApprovalRequest.approvalType,
      title: chatApprovalRequest.title,
      description: chatApprovalRequest.description,
      amount: chatApprovalRequest.amount,
      currency: chatApprovalRequest.currency,
      status: chatApprovalRequest.status,
      responseComment: chatApprovalRequest.responseComment,
      respondedAt: chatApprovalRequest.respondedAt,
      metadata: chatApprovalRequest.metadata,
      createdAt: chatApprovalRequest.createdAt,
      updatedAt: chatApprovalRequest.updatedAt,
      expiresAt: chatApprovalRequest.expiresAt,
      requester: {
        id: user.id,
        name: user.name,
        image: user.image,
        email: user.email,
      },
    })
    .from(chatApprovalRequest)
    .innerJoin(user, eq(chatApprovalRequest.requesterId, user.id))
    .where(eq(chatApprovalRequest.conversationId, conversationId))
    .orderBy(desc(chatApprovalRequest.createdAt));

  // Fetch approvers for requests that have them
  const requestsWithApprovers = await Promise.all(
    results.map(async (r) => {
      if (!r.approverId) return { ...r, approver: null };

      const [approverResult] = await database
        .select({
          id: user.id,
          name: user.name,
          image: user.image,
          email: user.email,
        })
        .from(user)
        .where(eq(user.id, r.approverId))
        .limit(1);

      return { ...r, approver: approverResult || null };
    })
  );

  return requestsWithApprovers;
}

// Get all approval requests associated with message IDs (for bulk loading in chat)
export async function findApprovalRequestsByMessageIds(
  messageIds: string[]
): Promise<Map<string, ChatApprovalRequestWithDetails>> {
  if (messageIds.length === 0) return new Map();

  const results = await database
    .select({
      id: chatApprovalRequest.id,
      conversationId: chatApprovalRequest.conversationId,
      messageId: chatApprovalRequest.messageId,
      requesterId: chatApprovalRequest.requesterId,
      approverId: chatApprovalRequest.approverId,
      approvalType: chatApprovalRequest.approvalType,
      title: chatApprovalRequest.title,
      description: chatApprovalRequest.description,
      amount: chatApprovalRequest.amount,
      currency: chatApprovalRequest.currency,
      status: chatApprovalRequest.status,
      responseComment: chatApprovalRequest.responseComment,
      respondedAt: chatApprovalRequest.respondedAt,
      metadata: chatApprovalRequest.metadata,
      createdAt: chatApprovalRequest.createdAt,
      updatedAt: chatApprovalRequest.updatedAt,
      expiresAt: chatApprovalRequest.expiresAt,
      requester: {
        id: user.id,
        name: user.name,
        image: user.image,
        email: user.email,
      },
    })
    .from(chatApprovalRequest)
    .innerJoin(user, eq(chatApprovalRequest.requesterId, user.id))
    .where(inArray(chatApprovalRequest.messageId, messageIds));

  // Create map with approver info
  const resultMap = new Map<string, ChatApprovalRequestWithDetails>();

  for (const r of results) {
    let approver: Pick<User, "id" | "name" | "image" | "email"> | null = null;
    if (r.approverId) {
      const [approverResult] = await database
        .select({
          id: user.id,
          name: user.name,
          image: user.image,
          email: user.email,
        })
        .from(user)
        .where(eq(user.id, r.approverId))
        .limit(1);
      approver = approverResult || null;
    }

    resultMap.set(r.messageId, { ...r, approver });
  }

  return resultMap;
}
