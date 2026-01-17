import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { database } from "~/db";
import {
  taskConversationLink,
  taskSuggestion,
  taskThread,
  taskThreadMessage,
  taskThreadParticipant,
  user,
  type TaskConversationLink,
  type CreateTaskConversationLinkData,
  type UpdateTaskConversationLinkData,
  type TaskSuggestion,
  type CreateTaskSuggestionData,
  type UpdateTaskSuggestionData,
  type TaskThread,
  type CreateTaskThreadData,
  type UpdateTaskThreadData,
  type TaskThreadMessage,
  type CreateTaskThreadMessageData,
  type TaskThreadParticipant,
  type CreateTaskThreadParticipantData,
  type User,
} from "~/db/schema";

// =============================================================================
// Task Conversation Link Types
// =============================================================================

export type TaskConversationLinkWithUser = TaskConversationLink & {
  linkedBy: Pick<User, "id" | "name" | "image">;
};

export type TaskSuggestionWithReviewer = TaskSuggestion & {
  reviewedBy: Pick<User, "id" | "name" | "image"> | null;
};

export type TaskThreadWithDetails = TaskThread & {
  createdBy: Pick<User, "id" | "name" | "image">;
  closedBy: Pick<User, "id" | "name" | "image"> | null;
  participants: TaskThreadParticipantWithUser[];
  lastMessage: TaskThreadMessageWithSender | null;
};

export type TaskThreadMessageWithSender = TaskThreadMessage & {
  sender: Pick<User, "id" | "name" | "image">;
};

export type TaskThreadParticipantWithUser = TaskThreadParticipant & {
  user: Pick<User, "id" | "name" | "image">;
};

// =============================================================================
// Task Conversation Link Data Access
// =============================================================================

export async function createTaskConversationLink(
  data: CreateTaskConversationLinkData
): Promise<TaskConversationLink> {
  const [newLink] = await database
    .insert(taskConversationLink)
    .values(data)
    .returning();

  return newLink;
}

export async function findTaskConversationLinkById(
  id: string
): Promise<TaskConversationLink | null> {
  const [result] = await database
    .select()
    .from(taskConversationLink)
    .where(eq(taskConversationLink.id, id))
    .limit(1);

  return result || null;
}

export async function findTaskLinksByConversationId(
  conversationId: string
): Promise<TaskConversationLinkWithUser[]> {
  const results = await database
    .select({
      id: taskConversationLink.id,
      conversationId: taskConversationLink.conversationId,
      externalTaskId: taskConversationLink.externalTaskId,
      externalProjectId: taskConversationLink.externalProjectId,
      taskSource: taskConversationLink.taskSource,
      linkedById: taskConversationLink.linkedById,
      linkReason: taskConversationLink.linkReason,
      status: taskConversationLink.status,
      createdAt: taskConversationLink.createdAt,
      updatedAt: taskConversationLink.updatedAt,
      linkedBy: {
        id: user.id,
        name: user.name,
        image: user.image,
      },
    })
    .from(taskConversationLink)
    .innerJoin(user, eq(taskConversationLink.linkedById, user.id))
    .where(
      and(
        eq(taskConversationLink.conversationId, conversationId),
        eq(taskConversationLink.status, "active")
      )
    )
    .orderBy(desc(taskConversationLink.createdAt));

  return results;
}

export async function findTaskLinksByExternalTaskId(
  externalTaskId: string
): Promise<TaskConversationLinkWithUser[]> {
  const results = await database
    .select({
      id: taskConversationLink.id,
      conversationId: taskConversationLink.conversationId,
      externalTaskId: taskConversationLink.externalTaskId,
      externalProjectId: taskConversationLink.externalProjectId,
      taskSource: taskConversationLink.taskSource,
      linkedById: taskConversationLink.linkedById,
      linkReason: taskConversationLink.linkReason,
      status: taskConversationLink.status,
      createdAt: taskConversationLink.createdAt,
      updatedAt: taskConversationLink.updatedAt,
      linkedBy: {
        id: user.id,
        name: user.name,
        image: user.image,
      },
    })
    .from(taskConversationLink)
    .innerJoin(user, eq(taskConversationLink.linkedById, user.id))
    .where(eq(taskConversationLink.externalTaskId, externalTaskId))
    .orderBy(desc(taskConversationLink.createdAt));

  return results;
}

export async function updateTaskConversationLink(
  id: string,
  data: UpdateTaskConversationLinkData
): Promise<TaskConversationLink> {
  const [updated] = await database
    .update(taskConversationLink)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(taskConversationLink.id, id))
    .returning();

  return updated;
}

export async function deleteTaskConversationLink(id: string): Promise<void> {
  await database
    .delete(taskConversationLink)
    .where(eq(taskConversationLink.id, id));
}

// =============================================================================
// Task Suggestion Data Access
// =============================================================================

export async function createTaskSuggestion(
  data: CreateTaskSuggestionData
): Promise<TaskSuggestion> {
  const [newSuggestion] = await database
    .insert(taskSuggestion)
    .values(data)
    .returning();

  return newSuggestion;
}

export async function createMultipleTaskSuggestions(
  data: CreateTaskSuggestionData[]
): Promise<TaskSuggestion[]> {
  if (data.length === 0) return [];

  const newSuggestions = await database
    .insert(taskSuggestion)
    .values(data)
    .returning();

  return newSuggestions;
}

export async function findTaskSuggestionById(
  id: string
): Promise<TaskSuggestion | null> {
  const [result] = await database
    .select()
    .from(taskSuggestion)
    .where(eq(taskSuggestion.id, id))
    .limit(1);

  return result || null;
}

export async function findTaskSuggestionsByConversationId(
  conversationId: string,
  status?: string
): Promise<TaskSuggestionWithReviewer[]> {
  const conditions = [eq(taskSuggestion.conversationId, conversationId)];
  if (status) {
    conditions.push(eq(taskSuggestion.status, status));
  }

  const results = await database
    .select({
      id: taskSuggestion.id,
      conversationId: taskSuggestion.conversationId,
      suggestedTaskId: taskSuggestion.suggestedTaskId,
      suggestedProjectId: taskSuggestion.suggestedProjectId,
      suggestionReason: taskSuggestion.suggestionReason,
      confidenceScore: taskSuggestion.confidenceScore,
      relevanceKeywords: taskSuggestion.relevanceKeywords,
      taskTitle: taskSuggestion.taskTitle,
      taskDescription: taskSuggestion.taskDescription,
      taskPriority: taskSuggestion.taskPriority,
      taskDeadline: taskSuggestion.taskDeadline,
      status: taskSuggestion.status,
      reviewedById: taskSuggestion.reviewedById,
      reviewedAt: taskSuggestion.reviewedAt,
      createdAt: taskSuggestion.createdAt,
      updatedAt: taskSuggestion.updatedAt,
    })
    .from(taskSuggestion)
    .where(and(...conditions))
    .orderBy(desc(taskSuggestion.confidenceScore), desc(taskSuggestion.createdAt));

  // Get reviewer info separately for suggestions that have been reviewed
  const suggestionsWithReviewers: TaskSuggestionWithReviewer[] = [];
  for (const suggestion of results) {
    if (suggestion.reviewedById) {
      const [reviewer] = await database
        .select({
          id: user.id,
          name: user.name,
          image: user.image,
        })
        .from(user)
        .where(eq(user.id, suggestion.reviewedById))
        .limit(1);

      suggestionsWithReviewers.push({
        ...suggestion,
        reviewedBy: reviewer || null,
      });
    } else {
      suggestionsWithReviewers.push({
        ...suggestion,
        reviewedBy: null,
      });
    }
  }

  return suggestionsWithReviewers;
}

export async function findPendingTaskSuggestions(
  conversationId: string
): Promise<TaskSuggestionWithReviewer[]> {
  return findTaskSuggestionsByConversationId(conversationId, "pending");
}

export async function updateTaskSuggestion(
  id: string,
  data: UpdateTaskSuggestionData
): Promise<TaskSuggestion> {
  const [updated] = await database
    .update(taskSuggestion)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(taskSuggestion.id, id))
    .returning();

  return updated;
}

export async function acceptTaskSuggestion(
  id: string,
  reviewedById: string
): Promise<TaskSuggestion> {
  return updateTaskSuggestion(id, {
    status: "accepted",
    reviewedById,
    reviewedAt: new Date(),
  });
}

export async function dismissTaskSuggestion(
  id: string,
  reviewedById: string
): Promise<TaskSuggestion> {
  return updateTaskSuggestion(id, {
    status: "dismissed",
    reviewedById,
    reviewedAt: new Date(),
  });
}

export async function deleteTaskSuggestion(id: string): Promise<void> {
  await database.delete(taskSuggestion).where(eq(taskSuggestion.id, id));
}

// =============================================================================
// Task Thread Data Access
// =============================================================================

export async function createTaskThread(
  data: CreateTaskThreadData
): Promise<TaskThread> {
  const [newThread] = await database
    .insert(taskThread)
    .values(data)
    .returning();

  return newThread;
}

export async function findTaskThreadById(
  id: string
): Promise<TaskThread | null> {
  const [result] = await database
    .select()
    .from(taskThread)
    .where(eq(taskThread.id, id))
    .limit(1);

  return result || null;
}

export async function findTaskThreadByIdWithDetails(
  id: string
): Promise<TaskThreadWithDetails | null> {
  const thread = await findTaskThreadById(id);
  if (!thread) return null;

  // Get creator
  const [creator] = await database
    .select({
      id: user.id,
      name: user.name,
      image: user.image,
    })
    .from(user)
    .where(eq(user.id, thread.createdById))
    .limit(1);

  // Get closer if exists
  let closer: Pick<User, "id" | "name" | "image"> | null = null;
  if (thread.closedById) {
    const [closerResult] = await database
      .select({
        id: user.id,
        name: user.name,
        image: user.image,
      })
      .from(user)
      .where(eq(user.id, thread.closedById))
      .limit(1);
    closer = closerResult || null;
  }

  // Get participants
  const participants = await findTaskThreadParticipants(id);

  // Get last message
  const [lastMessage] = await database
    .select({
      id: taskThreadMessage.id,
      threadId: taskThreadMessage.threadId,
      senderId: taskThreadMessage.senderId,
      content: taskThreadMessage.content,
      originalMessageId: taskThreadMessage.originalMessageId,
      isSystemMessage: taskThreadMessage.isSystemMessage,
      readBy: taskThreadMessage.readBy,
      createdAt: taskThreadMessage.createdAt,
      updatedAt: taskThreadMessage.updatedAt,
    })
    .from(taskThreadMessage)
    .where(eq(taskThreadMessage.threadId, id))
    .orderBy(desc(taskThreadMessage.createdAt))
    .limit(1);

  let lastMessageWithSender: TaskThreadMessageWithSender | null = null;
  if (lastMessage) {
    const [messageSender] = await database
      .select({
        id: user.id,
        name: user.name,
        image: user.image,
      })
      .from(user)
      .where(eq(user.id, lastMessage.senderId))
      .limit(1);

    lastMessageWithSender = {
      ...lastMessage,
      sender: messageSender,
    };
  }

  return {
    ...thread,
    createdBy: creator,
    closedBy: closer,
    participants,
    lastMessage: lastMessageWithSender,
  };
}

export async function findTaskThreadsByExternalTaskId(
  externalTaskId: string
): Promise<TaskThread[]> {
  const results = await database
    .select()
    .from(taskThread)
    .where(eq(taskThread.externalTaskId, externalTaskId))
    .orderBy(desc(taskThread.lastActivityAt));

  return results;
}

export async function findTaskThreadsByUserId(
  userId: string
): Promise<TaskThreadWithDetails[]> {
  // Find threads where user is a participant
  const participantThreadIds = await database
    .select({ threadId: taskThreadParticipant.threadId })
    .from(taskThreadParticipant)
    .where(eq(taskThreadParticipant.userId, userId));

  const threadIds = participantThreadIds.map((p) => p.threadId);
  if (threadIds.length === 0) return [];

  const threads = await database
    .select()
    .from(taskThread)
    .where(inArray(taskThread.id, threadIds))
    .orderBy(desc(taskThread.lastActivityAt));

  // Get details for each thread
  const threadsWithDetails: TaskThreadWithDetails[] = [];
  for (const thread of threads) {
    const details = await findTaskThreadByIdWithDetails(thread.id);
    if (details) {
      threadsWithDetails.push(details);
    }
  }

  return threadsWithDetails;
}

export async function updateTaskThread(
  id: string,
  data: UpdateTaskThreadData
): Promise<TaskThread> {
  const [updated] = await database
    .update(taskThread)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(taskThread.id, id))
    .returning();

  return updated;
}

export async function closeTaskThread(
  id: string,
  closedById: string,
  closedReason?: string
): Promise<TaskThread> {
  return updateTaskThread(id, {
    status: "closed",
    closedById,
    closedAt: new Date(),
    closedReason,
  });
}

export async function resolveTaskThread(
  id: string,
  closedById: string,
  closedReason?: string
): Promise<TaskThread> {
  return updateTaskThread(id, {
    status: "resolved",
    closedById,
    closedAt: new Date(),
    closedReason,
  });
}

export async function reopenTaskThread(id: string): Promise<TaskThread> {
  return updateTaskThread(id, {
    status: "open",
    closedById: null,
    closedAt: null,
    closedReason: null,
  });
}

export async function deleteTaskThread(id: string): Promise<void> {
  await database.delete(taskThread).where(eq(taskThread.id, id));
}

// =============================================================================
// Task Thread Message Data Access
// =============================================================================

export async function createTaskThreadMessage(
  data: CreateTaskThreadMessageData
): Promise<TaskThreadMessage> {
  const [newMessage] = await database
    .insert(taskThreadMessage)
    .values(data)
    .returning();

  // Update thread stats
  await database
    .update(taskThread)
    .set({
      messageCount: sql`${taskThread.messageCount} + 1`,
      lastActivityAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(taskThread.id, data.threadId));

  return newMessage;
}

export async function findTaskThreadMessages(
  threadId: string,
  limit: number = 50,
  offset: number = 0
): Promise<TaskThreadMessageWithSender[]> {
  const results = await database
    .select({
      id: taskThreadMessage.id,
      threadId: taskThreadMessage.threadId,
      senderId: taskThreadMessage.senderId,
      content: taskThreadMessage.content,
      originalMessageId: taskThreadMessage.originalMessageId,
      isSystemMessage: taskThreadMessage.isSystemMessage,
      readBy: taskThreadMessage.readBy,
      createdAt: taskThreadMessage.createdAt,
      updatedAt: taskThreadMessage.updatedAt,
      sender: {
        id: user.id,
        name: user.name,
        image: user.image,
      },
    })
    .from(taskThreadMessage)
    .innerJoin(user, eq(taskThreadMessage.senderId, user.id))
    .where(eq(taskThreadMessage.threadId, threadId))
    .orderBy(desc(taskThreadMessage.createdAt))
    .limit(limit)
    .offset(offset);

  // Reverse to get chronological order
  return results.reverse();
}

export async function markTaskThreadMessagesAsRead(
  threadId: string,
  userId: string
): Promise<void> {
  // Get unread messages
  const messages = await database
    .select()
    .from(taskThreadMessage)
    .where(eq(taskThreadMessage.threadId, threadId));

  for (const msg of messages) {
    const readBy = msg.readBy ? JSON.parse(msg.readBy) : {};
    if (!readBy[userId]) {
      readBy[userId] = new Date().toISOString();
      await database
        .update(taskThreadMessage)
        .set({ readBy: JSON.stringify(readBy) })
        .where(eq(taskThreadMessage.id, msg.id));
    }
  }

  // Update participant's last read
  await database
    .update(taskThreadParticipant)
    .set({ lastReadAt: new Date() })
    .where(
      and(
        eq(taskThreadParticipant.threadId, threadId),
        eq(taskThreadParticipant.userId, userId)
      )
    );
}

// =============================================================================
// Task Thread Participant Data Access
// =============================================================================

export async function addTaskThreadParticipant(
  data: CreateTaskThreadParticipantData
): Promise<TaskThreadParticipant> {
  // Check if already a participant
  const existing = await database
    .select()
    .from(taskThreadParticipant)
    .where(
      and(
        eq(taskThreadParticipant.threadId, data.threadId),
        eq(taskThreadParticipant.userId, data.userId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  const [newParticipant] = await database
    .insert(taskThreadParticipant)
    .values(data)
    .returning();

  // Update participant count
  await database
    .update(taskThread)
    .set({
      participantCount: sql`${taskThread.participantCount} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(taskThread.id, data.threadId));

  return newParticipant;
}

export async function findTaskThreadParticipants(
  threadId: string
): Promise<TaskThreadParticipantWithUser[]> {
  const results = await database
    .select({
      id: taskThreadParticipant.id,
      threadId: taskThreadParticipant.threadId,
      userId: taskThreadParticipant.userId,
      joinedAt: taskThreadParticipant.joinedAt,
      lastReadAt: taskThreadParticipant.lastReadAt,
      isMuted: taskThreadParticipant.isMuted,
      createdAt: taskThreadParticipant.createdAt,
      user: {
        id: user.id,
        name: user.name,
        image: user.image,
      },
    })
    .from(taskThreadParticipant)
    .innerJoin(user, eq(taskThreadParticipant.userId, user.id))
    .where(eq(taskThreadParticipant.threadId, threadId))
    .orderBy(taskThreadParticipant.joinedAt);

  return results;
}

export async function isUserParticipantInThread(
  threadId: string,
  userId: string
): Promise<boolean> {
  const [result] = await database
    .select()
    .from(taskThreadParticipant)
    .where(
      and(
        eq(taskThreadParticipant.threadId, threadId),
        eq(taskThreadParticipant.userId, userId)
      )
    )
    .limit(1);

  return result !== undefined;
}

export async function removeTaskThreadParticipant(
  threadId: string,
  userId: string
): Promise<void> {
  await database
    .delete(taskThreadParticipant)
    .where(
      and(
        eq(taskThreadParticipant.threadId, threadId),
        eq(taskThreadParticipant.userId, userId)
      )
    );

  // Update participant count
  await database
    .update(taskThread)
    .set({
      participantCount: sql`GREATEST(${taskThread.participantCount} - 1, 0)`,
      updatedAt: new Date(),
    })
    .where(eq(taskThread.id, threadId));
}

export async function updateParticipantMuteStatus(
  threadId: string,
  userId: string,
  isMuted: boolean
): Promise<void> {
  await database
    .update(taskThreadParticipant)
    .set({ isMuted })
    .where(
      and(
        eq(taskThreadParticipant.threadId, threadId),
        eq(taskThreadParticipant.userId, userId)
      )
    );
}

// =============================================================================
// Utility Functions
// =============================================================================

export async function getUnreadThreadCount(userId: string): Promise<number> {
  // Get participant records for user
  const participations = await database
    .select({
      threadId: taskThreadParticipant.threadId,
      lastReadAt: taskThreadParticipant.lastReadAt,
    })
    .from(taskThreadParticipant)
    .where(
      and(
        eq(taskThreadParticipant.userId, userId),
        eq(taskThreadParticipant.isMuted, false)
      )
    );

  let unreadCount = 0;
  for (const participation of participations) {
    // Count messages after last read
    const [result] = await database
      .select({ count: sql<number>`count(*)::int` })
      .from(taskThreadMessage)
      .where(
        and(
          eq(taskThreadMessage.threadId, participation.threadId),
          participation.lastReadAt
            ? sql`${taskThreadMessage.createdAt} > ${participation.lastReadAt}`
            : sql`1=1`
        )
      );

    if (result && result.count > 0) {
      unreadCount++;
    }
  }

  return unreadCount;
}
