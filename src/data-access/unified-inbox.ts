import { eq, desc, and, sql, count, or, inArray, like, gt } from "drizzle-orm";
import { database } from "~/db";
import {
  unifiedInboxThread,
  conversation,
  message,
  notification,
  odooChannel,
  odooMessage,
  user,
  type UnifiedInboxThread,
  type CreateUnifiedInboxThreadData,
  type UpdateUnifiedInboxThreadData,
  type UnifiedInboxSourceType,
  type UnifiedInboxThreadStatus,
  type UnifiedInboxMessage,
  type UnifiedInboxSummary,
  type UnifiedInboxFilter,
  type UnifiedInboxThreadWithMessages,
  type User,
} from "~/db/schema";

// =============================================================================
// Unified Inbox Thread Operations
// =============================================================================

/**
 * Find a unified inbox thread by ID
 */
export async function findUnifiedInboxThreadById(
  id: string
): Promise<UnifiedInboxThread | null> {
  const [result] = await database
    .select()
    .from(unifiedInboxThread)
    .where(eq(unifiedInboxThread.id, id))
    .limit(1);

  return result || null;
}

/**
 * Find a unified inbox thread by source type and source ID
 */
export async function findUnifiedInboxThreadBySource(
  userId: string,
  sourceType: UnifiedInboxSourceType,
  sourceId: string
): Promise<UnifiedInboxThread | null> {
  const [result] = await database
    .select()
    .from(unifiedInboxThread)
    .where(
      and(
        eq(unifiedInboxThread.userId, userId),
        eq(unifiedInboxThread.sourceType, sourceType),
        eq(unifiedInboxThread.sourceId, sourceId)
      )
    )
    .limit(1);

  return result || null;
}

/**
 * Create a new unified inbox thread
 */
export async function createUnifiedInboxThread(
  data: CreateUnifiedInboxThreadData
): Promise<UnifiedInboxThread> {
  const [newThread] = await database
    .insert(unifiedInboxThread)
    .values(data)
    .returning();

  return newThread;
}

/**
 * Update a unified inbox thread
 */
export async function updateUnifiedInboxThread(
  id: string,
  data: UpdateUnifiedInboxThreadData
): Promise<UnifiedInboxThread | null> {
  const [updated] = await database
    .update(unifiedInboxThread)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(unifiedInboxThread.id, id))
    .returning();

  return updated || null;
}

/**
 * Get or create a unified inbox thread for a source
 */
export async function getOrCreateUnifiedInboxThread(
  userId: string,
  sourceType: UnifiedInboxSourceType,
  sourceId: string,
  title: string,
  options?: {
    subtitle?: string;
    avatarUrl?: string;
  }
): Promise<UnifiedInboxThread> {
  const existing = await findUnifiedInboxThreadBySource(userId, sourceType, sourceId);
  if (existing) {
    return existing;
  }

  return await createUnifiedInboxThread({
    id: crypto.randomUUID(),
    userId,
    sourceType,
    sourceId,
    title,
    subtitle: options?.subtitle,
    avatarUrl: options?.avatarUrl,
    status: "active",
    unreadCount: 0,
    isPinned: false,
    isMuted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSyncedAt: new Date(),
  });
}

/**
 * Find all unified inbox threads for a user with filtering
 */
export async function findUserUnifiedInboxThreads(
  userId: string,
  filter?: UnifiedInboxFilter
): Promise<UnifiedInboxThread[]> {
  const conditions = [eq(unifiedInboxThread.userId, userId)];

  // Apply source type filter
  if (filter?.sourceTypes && filter.sourceTypes.length > 0) {
    conditions.push(inArray(unifiedInboxThread.sourceType, filter.sourceTypes));
  }

  // Apply status filter
  if (filter?.status && filter.status.length > 0) {
    conditions.push(inArray(unifiedInboxThread.status, filter.status));
  }

  // Apply unread only filter
  if (filter?.unreadOnly) {
    conditions.push(gt(unifiedInboxThread.unreadCount, 0));
  }

  // Apply pinned only filter
  if (filter?.pinnedOnly) {
    conditions.push(eq(unifiedInboxThread.isPinned, true));
  }

  // Apply search filter
  if (filter?.searchQuery) {
    conditions.push(
      or(
        like(unifiedInboxThread.title, `%${filter.searchQuery}%`),
        like(unifiedInboxThread.subtitle, `%${filter.searchQuery}%`),
        like(unifiedInboxThread.lastMessagePreview, `%${filter.searchQuery}%`)
      )!
    );
  }

  const results = await database
    .select()
    .from(unifiedInboxThread)
    .where(and(...conditions))
    .orderBy(
      desc(unifiedInboxThread.isPinned),
      desc(unifiedInboxThread.lastMessageAt)
    )
    .limit(filter?.limit ?? 50)
    .offset(filter?.offset ?? 0);

  return results;
}

/**
 * Update thread metadata (title, subtitle, avatar)
 */
export async function updateUnifiedInboxThreadMetadata(
  threadId: string,
  metadata: {
    title?: string;
    subtitle?: string;
    avatarUrl?: string;
    lastMessagePreview?: string;
    lastMessageAt?: Date;
  }
): Promise<UnifiedInboxThread | null> {
  return await updateUnifiedInboxThread(threadId, metadata);
}

/**
 * Increment unread count for a thread
 */
export async function incrementUnreadCount(
  threadId: string,
  amount: number = 1
): Promise<void> {
  await database
    .update(unifiedInboxThread)
    .set({
      unreadCount: sql`${unifiedInboxThread.unreadCount} + ${amount}`,
      updatedAt: new Date(),
    })
    .where(eq(unifiedInboxThread.id, threadId));
}

/**
 * Reset unread count for a thread (mark as read)
 */
export async function markThreadAsRead(threadId: string): Promise<void> {
  await database
    .update(unifiedInboxThread)
    .set({
      unreadCount: 0,
      updatedAt: new Date(),
    })
    .where(eq(unifiedInboxThread.id, threadId));
}

/**
 * Toggle pin status for a thread
 */
export async function toggleThreadPinned(
  threadId: string,
  isPinned: boolean
): Promise<UnifiedInboxThread | null> {
  return await updateUnifiedInboxThread(threadId, { isPinned });
}

/**
 * Toggle mute status for a thread
 */
export async function toggleThreadMuted(
  threadId: string,
  isMuted: boolean
): Promise<UnifiedInboxThread | null> {
  return await updateUnifiedInboxThread(threadId, { isMuted });
}

/**
 * Archive a thread
 */
export async function archiveThread(
  threadId: string
): Promise<UnifiedInboxThread | null> {
  return await updateUnifiedInboxThread(threadId, { status: "archived" });
}

/**
 * Delete a unified inbox thread
 */
export async function deleteUnifiedInboxThread(threadId: string): Promise<boolean> {
  const [deleted] = await database
    .delete(unifiedInboxThread)
    .where(eq(unifiedInboxThread.id, threadId))
    .returning();

  return deleted !== undefined;
}

// =============================================================================
// Unified Inbox Summary and Aggregation
// =============================================================================

/**
 * Get total unread count across all threads for a user
 */
export async function getTotalUnreadCount(userId: string): Promise<number> {
  const [result] = await database
    .select({
      total: sql<number>`COALESCE(SUM(${unifiedInboxThread.unreadCount}), 0)::int`,
    })
    .from(unifiedInboxThread)
    .where(
      and(
        eq(unifiedInboxThread.userId, userId),
        eq(unifiedInboxThread.status, "active"),
        eq(unifiedInboxThread.isMuted, false)
      )
    );

  return result?.total ?? 0;
}

/**
 * Get unread count by source type
 */
export async function getUnreadCountBySourceType(
  userId: string
): Promise<Record<UnifiedInboxSourceType, number>> {
  const results = await database
    .select({
      sourceType: unifiedInboxThread.sourceType,
      count: sql<number>`COALESCE(SUM(${unifiedInboxThread.unreadCount}), 0)::int`,
    })
    .from(unifiedInboxThread)
    .where(
      and(
        eq(unifiedInboxThread.userId, userId),
        eq(unifiedInboxThread.status, "active"),
        eq(unifiedInboxThread.isMuted, false)
      )
    )
    .groupBy(unifiedInboxThread.sourceType);

  const counts: Record<UnifiedInboxSourceType, number> = {
    direct_message: 0,
    odoo_discuss: 0,
    system_notification: 0,
    push_notification: 0,
  };

  for (const result of results) {
    counts[result.sourceType as UnifiedInboxSourceType] = result.count;
  }

  return counts;
}

/**
 * Get unified inbox summary for a user
 */
export async function getUnifiedInboxSummary(
  userId: string
): Promise<UnifiedInboxSummary> {
  const [totalUnread, countsByType, recentThreads] = await Promise.all([
    getTotalUnreadCount(userId),
    getUnreadCountBySourceType(userId),
    findUserUnifiedInboxThreads(userId, { limit: 5 }),
  ]);

  return {
    totalUnreadCount: totalUnread,
    directMessageUnreadCount: countsByType.direct_message,
    odooDiscussUnreadCount: countsByType.odoo_discuss,
    notificationUnreadCount:
      countsByType.system_notification + countsByType.push_notification,
    recentThreads: recentThreads.map((thread) => ({
      id: thread.id,
      sourceType: thread.sourceType as UnifiedInboxSourceType,
      title: thread.title,
      unreadCount: thread.unreadCount,
      lastMessagePreview: thread.lastMessagePreview ?? undefined,
      lastMessageAt: thread.lastMessageAt ?? undefined,
    })),
  };
}

// =============================================================================
// Sync Threads from Source Data
// =============================================================================

/**
 * Sync unified inbox threads from direct message conversations
 */
export async function syncDirectMessageThreads(userId: string): Promise<number> {
  // Get all conversations where user is a participant
  const conversations = await database
    .select({
      id: conversation.id,
      participant1Id: conversation.participant1Id,
      participant2Id: conversation.participant2Id,
      lastMessageAt: conversation.lastMessageAt,
    })
    .from(conversation)
    .where(
      or(
        eq(conversation.participant1Id, userId),
        eq(conversation.participant2Id, userId)
      )
    );

  let syncedCount = 0;

  for (const conv of conversations) {
    const otherParticipantId =
      conv.participant1Id === userId ? conv.participant2Id : conv.participant1Id;

    // Get other participant info
    const [otherUser] = await database
      .select({
        id: user.id,
        name: user.name,
        image: user.image,
      })
      .from(user)
      .where(eq(user.id, otherParticipantId))
      .limit(1);

    // Get last message
    const [lastMsg] = await database
      .select({
        content: message.content,
        createdAt: message.createdAt,
      })
      .from(message)
      .where(eq(message.conversationId, conv.id))
      .orderBy(desc(message.createdAt))
      .limit(1);

    // Get unread count
    const [unreadResult] = await database
      .select({ count: sql<number>`count(*)::int` })
      .from(message)
      .where(
        and(
          eq(message.conversationId, conv.id),
          eq(message.isRead, false),
          sql`${message.senderId} != ${userId}`
        )
      );

    // Get or create thread
    const thread = await getOrCreateUnifiedInboxThread(
      userId,
      "direct_message",
      conv.id,
      otherUser?.name ?? "Unknown User",
      { avatarUrl: otherUser?.image ?? undefined }
    );

    // Update thread with latest info
    await updateUnifiedInboxThread(thread.id, {
      title: otherUser?.name ?? "Unknown User",
      avatarUrl: otherUser?.image ?? undefined,
      lastMessageAt: lastMsg?.createdAt ?? conv.lastMessageAt,
      lastMessagePreview: lastMsg?.content?.substring(0, 100),
      unreadCount: unreadResult?.count ?? 0,
    });

    syncedCount++;
  }

  return syncedCount;
}

/**
 * Sync unified inbox threads from Odoo Discuss channels
 */
export async function syncOdooDiscussThreads(userId: string): Promise<number> {
  const channels = await database
    .select()
    .from(odooChannel)
    .where(eq(odooChannel.userId, userId));

  let syncedCount = 0;

  for (const channel of channels) {
    // Get last message for this channel
    const [lastMsg] = await database
      .select({
        body: odooMessage.body,
        createdAt: odooMessage.createdAt,
      })
      .from(odooMessage)
      .where(eq(odooMessage.channelId, channel.id))
      .orderBy(desc(odooMessage.createdAt))
      .limit(1);

    // Get or create thread
    const thread = await getOrCreateUnifiedInboxThread(
      userId,
      "odoo_discuss",
      channel.id,
      channel.name,
      {
        subtitle: channel.description ?? undefined,
        avatarUrl: channel.image ?? undefined,
      }
    );

    // Strip HTML from message body for preview
    const plainTextPreview = lastMsg?.body
      ? lastMsg.body.replace(/<[^>]*>/g, "").substring(0, 100)
      : undefined;

    // Update thread with latest info
    await updateUnifiedInboxThread(thread.id, {
      title: channel.name,
      subtitle: channel.description ?? undefined,
      avatarUrl: channel.image ?? undefined,
      lastMessageAt: lastMsg?.createdAt ?? channel.updatedAt,
      lastMessagePreview: plainTextPreview,
      unreadCount: channel.unreadCount,
    });

    syncedCount++;
  }

  return syncedCount;
}

/**
 * Sync unified inbox threads from system notifications
 * Groups notifications by type for thread-like experience
 */
export async function syncNotificationThreads(userId: string): Promise<number> {
  // Get notification types with unread counts
  const notificationTypes = await database
    .select({
      type: notification.type,
      count: sql<number>`count(*)::int`,
      latestCreatedAt: sql<Date>`max(${notification.createdAt})`,
    })
    .from(notification)
    .where(eq(notification.userId, userId))
    .groupBy(notification.type);

  let syncedCount = 0;

  for (const notifType of notificationTypes) {
    // Get unread count for this type
    const [unreadResult] = await database
      .select({ count: sql<number>`count(*)::int` })
      .from(notification)
      .where(
        and(
          eq(notification.userId, userId),
          eq(notification.type, notifType.type),
          eq(notification.isRead, false)
        )
      );

    // Get latest notification for preview
    const [latest] = await database
      .select()
      .from(notification)
      .where(
        and(eq(notification.userId, userId), eq(notification.type, notifType.type))
      )
      .orderBy(desc(notification.createdAt))
      .limit(1);

    // Create thread ID from notification type
    const threadSourceId = `notification_${notifType.type}`;

    // Get or create thread
    const thread = await getOrCreateUnifiedInboxThread(
      userId,
      "system_notification",
      threadSourceId,
      getNotificationTypeTitle(notifType.type)
    );

    // Update thread with latest info
    await updateUnifiedInboxThread(thread.id, {
      lastMessageAt: notifType.latestCreatedAt,
      lastMessagePreview: latest?.title ?? undefined,
      unreadCount: unreadResult?.count ?? 0,
    });

    syncedCount++;
  }

  return syncedCount;
}

/**
 * Get display title for notification type
 */
function getNotificationTypeTitle(type: string): string {
  const titles: Record<string, string> = {
    comment: "Comments",
    reaction: "Reactions",
    message: "Messages",
    system: "System Notifications",
    expense: "Expense Updates",
    approval: "Approval Requests",
  };
  return titles[type] ?? `${type.charAt(0).toUpperCase()}${type.slice(1)} Notifications`;
}

/**
 * Sync all unified inbox threads for a user
 */
export async function syncAllUnifiedInboxThreads(userId: string): Promise<{
  directMessages: number;
  odooDiscuss: number;
  notifications: number;
  total: number;
}> {
  const [directMessages, odooDiscuss, notifications] = await Promise.all([
    syncDirectMessageThreads(userId),
    syncOdooDiscussThreads(userId),
    syncNotificationThreads(userId),
  ]);

  return {
    directMessages,
    odooDiscuss,
    notifications,
    total: directMessages + odooDiscuss + notifications,
  };
}

// =============================================================================
// Get Messages for Thread
// =============================================================================

/**
 * Get messages for a unified inbox thread
 */
export async function getMessagesForThread(
  thread: UnifiedInboxThread,
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<UnifiedInboxMessage[]> {
  switch (thread.sourceType) {
    case "direct_message":
      return await getDirectMessages(thread.sourceId, userId, limit, offset);
    case "odoo_discuss":
      return await getOdooDiscussMessages(thread.sourceId, userId, limit, offset);
    case "system_notification":
      return await getNotificationMessages(thread.sourceId, userId, limit, offset);
    default:
      return [];
  }
}

/**
 * Get direct messages for a conversation
 */
async function getDirectMessages(
  conversationId: string,
  userId: string,
  limit: number,
  offset: number
): Promise<UnifiedInboxMessage[]> {
  const messages = await database
    .select({
      id: message.id,
      content: message.content,
      senderId: message.senderId,
      isRead: message.isRead,
      readAt: message.readAt,
      createdAt: message.createdAt,
      senderName: user.name,
      senderImage: user.image,
    })
    .from(message)
    .innerJoin(user, eq(message.senderId, user.id))
    .where(eq(message.conversationId, conversationId))
    .orderBy(desc(message.createdAt))
    .limit(limit)
    .offset(offset);

  // Get or create thread
  const thread = await findUnifiedInboxThreadBySource(
    userId,
    "direct_message",
    conversationId
  );

  return messages.reverse().map((msg) => ({
    id: msg.id,
    threadId: thread?.id ?? "",
    sourceType: "direct_message" as UnifiedInboxSourceType,
    sourceMessageId: msg.id,
    content: msg.content,
    authorId: msg.senderId,
    authorName: msg.senderName,
    authorAvatarUrl: msg.senderImage ?? undefined,
    isOwnMessage: msg.senderId === userId,
    isRead: msg.isRead,
    readAt: msg.readAt ?? undefined,
    hasAttachments: false,
    createdAt: msg.createdAt,
  }));
}

/**
 * Get Odoo Discuss messages for a channel
 */
async function getOdooDiscussMessages(
  channelId: string,
  userId: string,
  limit: number,
  offset: number
): Promise<UnifiedInboxMessage[]> {
  const messages = await database
    .select()
    .from(odooMessage)
    .where(eq(odooMessage.channelId, channelId))
    .orderBy(desc(odooMessage.createdAt))
    .limit(limit)
    .offset(offset);

  // Get thread
  const thread = await findUnifiedInboxThreadBySource(
    userId,
    "odoo_discuss",
    channelId
  );

  // Get channel to check user's Odoo ID
  const [channel] = await database
    .select()
    .from(odooChannel)
    .where(eq(odooChannel.id, channelId))
    .limit(1);

  return messages.reverse().map((msg) => {
    // Parse attachments if present
    let attachments;
    if (msg.attachments) {
      try {
        const parsed = JSON.parse(msg.attachments);
        attachments = parsed.map((att: { id: number; name: string; mimetype: string; fileSize: number; url: string }) => ({
          id: String(att.id),
          name: att.name,
          mimeType: att.mimetype,
          size: att.fileSize,
          url: att.url,
        }));
      } catch {
        attachments = undefined;
      }
    }

    return {
      id: msg.id,
      threadId: thread?.id ?? "",
      sourceType: "odoo_discuss" as UnifiedInboxSourceType,
      sourceMessageId: msg.id,
      content: msg.body.replace(/<[^>]*>/g, ""), // Strip HTML for plain text
      contentHtml: msg.body,
      authorId: String(msg.authorOdooId ?? ""),
      authorName: msg.authorName ?? "Unknown",
      authorEmail: msg.authorEmail ?? undefined,
      isOwnMessage: false, // Would need to match Odoo user ID
      isRead: true, // Odoo messages don't have per-user read status in our cache
      hasAttachments: msg.hasAttachments,
      attachments,
      createdAt: msg.createdAt,
    };
  });
}

/**
 * Get notification messages grouped by type
 */
async function getNotificationMessages(
  sourceId: string,
  userId: string,
  limit: number,
  offset: number
): Promise<UnifiedInboxMessage[]> {
  // Extract notification type from source ID (format: notification_<type>)
  const notificationType = sourceId.replace("notification_", "");

  const notifications = await database
    .select()
    .from(notification)
    .where(
      and(eq(notification.userId, userId), eq(notification.type, notificationType))
    )
    .orderBy(desc(notification.createdAt))
    .limit(limit)
    .offset(offset);

  // Get thread
  const thread = await findUnifiedInboxThreadBySource(
    userId,
    "system_notification",
    sourceId
  );

  return notifications.reverse().map((notif) => ({
    id: notif.id,
    threadId: thread?.id ?? "",
    sourceType: "system_notification" as UnifiedInboxSourceType,
    sourceMessageId: notif.id,
    content: notif.content ?? notif.title,
    authorId: "system",
    authorName: "System",
    isOwnMessage: false,
    isRead: notif.isRead,
    readAt: notif.readAt ?? undefined,
    hasAttachments: false,
    createdAt: notif.createdAt,
  }));
}

/**
 * Get thread with messages
 */
export async function getUnifiedInboxThreadWithMessages(
  threadId: string,
  userId: string,
  messageLimit: number = 50
): Promise<UnifiedInboxThreadWithMessages | null> {
  const thread = await findUnifiedInboxThreadById(threadId);
  if (!thread || thread.userId !== userId) {
    return null;
  }

  const messages = await getMessagesForThread(thread, userId, messageLimit, 0);

  // Get participant info for direct messages
  let participant;
  if (thread.sourceType === "direct_message") {
    const [conv] = await database
      .select()
      .from(conversation)
      .where(eq(conversation.id, thread.sourceId))
      .limit(1);

    if (conv) {
      const otherParticipantId =
        conv.participant1Id === userId ? conv.participant2Id : conv.participant1Id;

      const [otherUser] = await database
        .select({
          id: user.id,
          name: user.name,
          image: user.image,
        })
        .from(user)
        .where(eq(user.id, otherParticipantId))
        .limit(1);

      participant = otherUser ?? undefined;
    }
  }

  return {
    ...thread,
    messages,
    participant,
  };
}
