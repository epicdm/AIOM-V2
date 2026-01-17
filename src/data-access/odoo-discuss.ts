/**
 * Data Access Layer for Odoo Discuss
 *
 * Provides database operations for Odoo Discuss channels, messages,
 * and subscription management.
 */

import { eq, and, desc, sql, count, asc } from "drizzle-orm";
import { database } from "~/db";
import {
  odooChannel,
  odooMessage,
  odooDiscussSubscription,
  type OdooChannel,
  type CreateOdooChannelData,
  type UpdateOdooChannelData,
  type OdooMessage,
  type CreateOdooMessageData,
  type OdooDiscussSubscription,
  type CreateOdooDiscussSubscriptionData,
  type UpdateOdooDiscussSubscriptionData,
} from "~/db/schema";

// =============================================================================
// Channel Operations
// =============================================================================

/**
 * Find all channels for a user
 */
export async function findUserChannels(
  userId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<OdooChannel[]> {
  const { limit = 50, offset = 0 } = options;

  return database
    .select()
    .from(odooChannel)
    .where(eq(odooChannel.userId, userId))
    .orderBy(desc(odooChannel.updatedAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Find a channel by ID
 */
export async function findChannelById(id: string): Promise<OdooChannel | null> {
  const [result] = await database
    .select()
    .from(odooChannel)
    .where(eq(odooChannel.id, id))
    .limit(1);

  return result || null;
}

/**
 * Find a channel by Odoo ID and user ID
 */
export async function findChannelByOdooId(
  odooId: number,
  userId: string
): Promise<OdooChannel | null> {
  const [result] = await database
    .select()
    .from(odooChannel)
    .where(
      and(
        eq(odooChannel.odooId, odooId),
        eq(odooChannel.userId, userId)
      )
    )
    .limit(1);

  return result || null;
}

/**
 * Create a new channel
 */
export async function createChannel(
  data: CreateOdooChannelData
): Promise<OdooChannel> {
  const [result] = await database
    .insert(odooChannel)
    .values(data)
    .returning();

  return result;
}

/**
 * Update a channel
 */
export async function updateChannel(
  id: string,
  data: UpdateOdooChannelData
): Promise<OdooChannel | null> {
  const [result] = await database
    .update(odooChannel)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(odooChannel.id, id))
    .returning();

  return result || null;
}

/**
 * Upsert a channel (create or update based on Odoo ID)
 */
export async function upsertChannel(
  odooId: number,
  userId: string,
  data: Omit<CreateOdooChannelData, "id" | "odooId" | "userId">
): Promise<OdooChannel> {
  const existing = await findChannelByOdooId(odooId, userId);

  if (existing) {
    const updated = await updateChannel(existing.id, data);
    return updated!;
  }

  return createChannel({
    id: crypto.randomUUID(),
    odooId,
    userId,
    ...data,
  });
}

/**
 * Delete a channel
 */
export async function deleteChannel(id: string): Promise<boolean> {
  const result = await database
    .delete(odooChannel)
    .where(eq(odooChannel.id, id))
    .returning();

  return result.length > 0;
}

/**
 * Get total unread count across all channels for a user
 */
export async function getTotalUnreadCount(userId: string): Promise<number> {
  const [result] = await database
    .select({ total: sql<number>`COALESCE(SUM(${odooChannel.unreadCount}), 0)::int` })
    .from(odooChannel)
    .where(eq(odooChannel.userId, userId));

  return result?.total ?? 0;
}

/**
 * Update channel sync status
 */
export async function updateChannelSyncStatus(
  id: string,
  status: string,
  error?: string
): Promise<void> {
  await database
    .update(odooChannel)
    .set({
      syncStatus: status,
      syncError: error || null,
      lastSyncedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(odooChannel.id, id));
}

// =============================================================================
// Message Operations
// =============================================================================

/**
 * Find messages by channel ID
 */
export async function findMessagesByChannelId(
  channelId: string,
  options: { limit?: number; offset?: number; beforeId?: string } = {}
): Promise<OdooMessage[]> {
  const { limit = 50, offset = 0 } = options;

  const query = database
    .select()
    .from(odooMessage)
    .where(eq(odooMessage.channelId, channelId))
    .orderBy(desc(odooMessage.createdAt))
    .limit(limit)
    .offset(offset);

  const results = await query;

  // Return in chronological order (oldest first)
  return results.reverse();
}

/**
 * Find a message by ID
 */
export async function findMessageById(id: string): Promise<OdooMessage | null> {
  const [result] = await database
    .select()
    .from(odooMessage)
    .where(eq(odooMessage.id, id))
    .limit(1);

  return result || null;
}

/**
 * Find a message by Odoo ID
 */
export async function findMessageByOdooId(
  odooId: number
): Promise<OdooMessage | null> {
  const [result] = await database
    .select()
    .from(odooMessage)
    .where(eq(odooMessage.odooId, odooId))
    .limit(1);

  return result || null;
}

/**
 * Create a new message
 */
export async function createMessage(
  data: CreateOdooMessageData
): Promise<OdooMessage> {
  const [result] = await database
    .insert(odooMessage)
    .values(data)
    .returning();

  return result;
}

/**
 * Create multiple messages
 */
export async function createMessages(
  messages: CreateOdooMessageData[]
): Promise<OdooMessage[]> {
  if (messages.length === 0) return [];

  return database
    .insert(odooMessage)
    .values(messages)
    .returning();
}

/**
 * Upsert a message (create or update based on Odoo ID)
 */
export async function upsertMessage(
  odooId: number,
  data: Omit<CreateOdooMessageData, "id" | "odooId">
): Promise<OdooMessage> {
  const existing = await findMessageByOdooId(odooId);

  if (existing) {
    // Messages are immutable in Odoo, so we just return existing
    return existing;
  }

  return createMessage({
    id: crypto.randomUUID(),
    odooId,
    ...data,
  });
}

/**
 * Count messages in a channel
 */
export async function countMessagesByChannelId(
  channelId: string
): Promise<number> {
  const [result] = await database
    .select({ count: count() })
    .from(odooMessage)
    .where(eq(odooMessage.channelId, channelId));

  return result?.count ?? 0;
}

/**
 * Get the latest message in a channel
 */
export async function getLatestMessageInChannel(
  channelId: string
): Promise<OdooMessage | null> {
  const [result] = await database
    .select()
    .from(odooMessage)
    .where(eq(odooMessage.channelId, channelId))
    .orderBy(desc(odooMessage.odooId))
    .limit(1);

  return result || null;
}

/**
 * Delete messages older than a certain date for a channel
 */
export async function deleteOldMessages(
  channelId: string,
  beforeDate: Date
): Promise<number> {
  const result = await database
    .delete(odooMessage)
    .where(
      and(
        eq(odooMessage.channelId, channelId),
        sql`${odooMessage.createdAt} < ${beforeDate}`
      )
    )
    .returning();

  return result.length;
}

// =============================================================================
// Subscription Operations
// =============================================================================

/**
 * Find subscription by user ID
 */
export async function findSubscriptionByUserId(
  userId: string
): Promise<OdooDiscussSubscription | null> {
  const [result] = await database
    .select()
    .from(odooDiscussSubscription)
    .where(eq(odooDiscussSubscription.userId, userId))
    .limit(1);

  return result || null;
}

/**
 * Create a subscription
 */
export async function createSubscription(
  data: CreateOdooDiscussSubscriptionData
): Promise<OdooDiscussSubscription> {
  const [result] = await database
    .insert(odooDiscussSubscription)
    .values(data)
    .returning();

  return result;
}

/**
 * Update a subscription
 */
export async function updateSubscription(
  id: string,
  data: UpdateOdooDiscussSubscriptionData
): Promise<OdooDiscussSubscription | null> {
  const [result] = await database
    .update(odooDiscussSubscription)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(odooDiscussSubscription.id, id))
    .returning();

  return result || null;
}

/**
 * Upsert subscription (create or update)
 */
export async function upsertSubscription(
  userId: string,
  data: Omit<CreateOdooDiscussSubscriptionData, "id" | "userId">
): Promise<OdooDiscussSubscription> {
  const existing = await findSubscriptionByUserId(userId);

  if (existing) {
    const updated = await updateSubscription(existing.id, data);
    return updated!;
  }

  return createSubscription({
    id: crypto.randomUUID(),
    userId,
    ...data,
  });
}

/**
 * Update polling status
 */
export async function updatePollingStatus(
  userId: string,
  lastPollingId: number,
  error?: string
): Promise<void> {
  const subscription = await findSubscriptionByUserId(userId);

  if (!subscription) return;

  await database
    .update(odooDiscussSubscription)
    .set({
      lastPollingId,
      lastPollAt: new Date(),
      errorCount: error ? subscription.errorCount + 1 : 0,
      lastError: error || null,
      updatedAt: new Date(),
    })
    .where(eq(odooDiscussSubscription.id, subscription.id));
}

/**
 * Activate/deactivate subscription
 */
export async function setSubscriptionActive(
  userId: string,
  isActive: boolean
): Promise<void> {
  const subscription = await findSubscriptionByUserId(userId);

  if (!subscription) {
    // Create new subscription if not exists
    await createSubscription({
      id: crypto.randomUUID(),
      userId,
      isActive,
    });
    return;
  }

  await database
    .update(odooDiscussSubscription)
    .set({
      isActive,
      updatedAt: new Date(),
    })
    .where(eq(odooDiscussSubscription.id, subscription.id));
}

// =============================================================================
// Sync Operations
// =============================================================================

/**
 * Sync channels from Odoo to local database
 */
export async function syncChannelsFromOdoo(
  userId: string,
  channels: Array<{
    odooId: number;
    name: string;
    description?: string;
    channelType?: string;
    memberCount?: number;
    unreadCount?: number;
    isMember?: boolean;
    image?: string;
    odooCreatedAt?: Date;
    odooUpdatedAt?: Date;
  }>
): Promise<OdooChannel[]> {
  const results: OdooChannel[] = [];

  for (const channel of channels) {
    const result = await upsertChannel(channel.odooId, userId, {
      name: channel.name,
      description: channel.description || null,
      channelType: channel.channelType || "channel",
      memberCount: channel.memberCount || 0,
      unreadCount: channel.unreadCount || 0,
      isMember: channel.isMember ?? true,
      image: channel.image || null,
      odooCreatedAt: channel.odooCreatedAt || null,
      odooUpdatedAt: channel.odooUpdatedAt || null,
      syncStatus: "synced",
      lastSyncedAt: new Date(),
    });
    results.push(result);
  }

  return results;
}

/**
 * Sync messages from Odoo to local database
 */
export async function syncMessagesFromOdoo(
  channelId: string,
  messages: Array<{
    odooId: number;
    body: string;
    messageType?: string;
    authorOdooId?: number;
    authorName?: string;
    authorEmail?: string;
    isStarred?: boolean;
    hasAttachments?: boolean;
    attachmentCount?: number;
    attachments?: string;
    odooCreatedAt?: Date;
  }>
): Promise<OdooMessage[]> {
  const results: OdooMessage[] = [];

  for (const message of messages) {
    const result = await upsertMessage(message.odooId, {
      channelId,
      body: message.body,
      messageType: message.messageType || "comment",
      authorOdooId: message.authorOdooId || null,
      authorName: message.authorName || null,
      authorEmail: message.authorEmail || null,
      isStarred: message.isStarred ?? false,
      hasAttachments: message.hasAttachments ?? false,
      attachmentCount: message.attachmentCount || 0,
      attachments: message.attachments || null,
      odooCreatedAt: message.odooCreatedAt || null,
    });
    results.push(result);
  }

  // Update channel's last message ID
  if (results.length > 0) {
    const lastMessage = results[results.length - 1];
    await database
      .update(odooChannel)
      .set({
        lastMessageOdooId: lastMessage.odooId,
        updatedAt: new Date(),
      })
      .where(eq(odooChannel.id, channelId));
  }

  return results;
}
