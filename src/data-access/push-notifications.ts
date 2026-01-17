import { eq, desc, and, count, or, lt, isNull, inArray } from "drizzle-orm";
import { database } from "~/db";
import {
  deviceToken,
  pushMessage,
  deliveryTracking,
  user,
  type DeviceToken,
  type CreateDeviceTokenData,
  type UpdateDeviceTokenData,
  type PushMessage,
  type CreatePushMessageData,
  type UpdatePushMessageData,
  type DeliveryTracking,
  type CreateDeliveryTrackingData,
  type UpdateDeliveryTrackingData,
  type User,
  type WebPushKeys,
} from "~/db/schema";

// =============================================================================
// Device Token Operations
// =============================================================================

export type { DeviceToken, CreateDeviceTokenData, UpdateDeviceTokenData, PushMessage, CreatePushMessageData, UpdatePushMessageData, DeliveryTracking, CreateDeliveryTrackingData, UpdateDeliveryTrackingData, WebPushKeys };

export type DeviceTokenWithUser = DeviceToken & {
  user: Pick<User, "id" | "name" | "email">;
};

/**
 * Register a new device token for push notifications
 */
export async function createDeviceToken(
  tokenData: CreateDeviceTokenData
): Promise<DeviceToken> {
  const [newToken] = await database
    .insert(deviceToken)
    .values(tokenData)
    .returning();

  return newToken;
}

/**
 * Find a device token by ID
 */
export async function findDeviceTokenById(
  id: string
): Promise<DeviceToken | null> {
  const [result] = await database
    .select()
    .from(deviceToken)
    .where(eq(deviceToken.id, id))
    .limit(1);

  return result || null;
}

/**
 * Find a device token by the token value
 */
export async function findDeviceTokenByToken(
  token: string
): Promise<DeviceToken | null> {
  const [result] = await database
    .select()
    .from(deviceToken)
    .where(eq(deviceToken.token, token))
    .limit(1);

  return result || null;
}

/**
 * Find all active device tokens for a user
 */
export async function findUserDeviceTokens(
  userId: string,
  tokenType?: "web_push" | "fcm"
): Promise<DeviceToken[]> {
  const conditions = [
    eq(deviceToken.userId, userId),
    eq(deviceToken.isActive, true),
  ];

  if (tokenType) {
    conditions.push(eq(deviceToken.tokenType, tokenType));
  }

  const results = await database
    .select()
    .from(deviceToken)
    .where(and(...conditions))
    .orderBy(desc(deviceToken.lastUsedAt));

  return results;
}

/**
 * Update a device token
 */
export async function updateDeviceToken(
  id: string,
  userId: string,
  data: UpdateDeviceTokenData
): Promise<DeviceToken | null> {
  const [updated] = await database
    .update(deviceToken)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(and(eq(deviceToken.id, id), eq(deviceToken.userId, userId)))
    .returning();

  return updated || null;
}

/**
 * Update last used timestamp for a device token
 */
export async function updateDeviceTokenLastUsed(
  id: string
): Promise<void> {
  await database
    .update(deviceToken)
    .set({
      lastUsedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(deviceToken.id, id));
}

/**
 * Deactivate a device token
 */
export async function deactivateDeviceToken(
  id: string,
  userId: string
): Promise<boolean> {
  const [updated] = await database
    .update(deviceToken)
    .set({
      isActive: false,
      updatedAt: new Date(),
    })
    .where(and(eq(deviceToken.id, id), eq(deviceToken.userId, userId)))
    .returning();

  return updated !== undefined;
}

/**
 * Deactivate a device token by token value (used when token becomes invalid)
 */
export async function deactivateDeviceTokenByValue(
  token: string
): Promise<boolean> {
  const [updated] = await database
    .update(deviceToken)
    .set({
      isActive: false,
      updatedAt: new Date(),
    })
    .where(eq(deviceToken.token, token))
    .returning();

  return updated !== undefined;
}

/**
 * Delete a device token
 */
export async function deleteDeviceToken(
  id: string,
  userId: string
): Promise<boolean> {
  const [deleted] = await database
    .delete(deviceToken)
    .where(and(eq(deviceToken.id, id), eq(deviceToken.userId, userId)))
    .returning();

  return deleted !== undefined;
}

/**
 * Count active device tokens for a user
 */
export async function countUserDeviceTokens(userId: string): Promise<number> {
  const [result] = await database
    .select({ count: count() })
    .from(deviceToken)
    .where(and(eq(deviceToken.userId, userId), eq(deviceToken.isActive, true)));

  return result?.count ?? 0;
}

// =============================================================================
// Push Message Operations
// =============================================================================

export type PushMessageWithDeliveries = PushMessage & {
  deliveryCount: number;
  successCount: number;
  failureCount: number;
};

/**
 * Create a new push message
 */
export async function createPushMessage(
  messageData: CreatePushMessageData
): Promise<PushMessage> {
  const [newMessage] = await database
    .insert(pushMessage)
    .values(messageData)
    .returning();

  return newMessage;
}

/**
 * Find a push message by ID
 */
export async function findPushMessageById(
  id: string
): Promise<PushMessage | null> {
  const [result] = await database
    .select()
    .from(pushMessage)
    .where(eq(pushMessage.id, id))
    .limit(1);

  return result || null;
}

/**
 * Find push messages for a user
 */
export async function findUserPushMessages(
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<PushMessage[]> {
  const results = await database
    .select()
    .from(pushMessage)
    .where(eq(pushMessage.userId, userId))
    .orderBy(desc(pushMessage.createdAt))
    .limit(limit)
    .offset(offset);

  return results;
}

/**
 * Find pending push messages ready to be sent
 */
export async function findPendingPushMessages(
  limit: number = 100
): Promise<PushMessage[]> {
  const now = new Date();

  const results = await database
    .select()
    .from(pushMessage)
    .where(
      and(
        eq(pushMessage.status, "pending"),
        or(
          isNull(pushMessage.scheduledAt),
          lt(pushMessage.scheduledAt, now)
        )
      )
    )
    .orderBy(pushMessage.createdAt)
    .limit(limit);

  return results;
}

/**
 * Update a push message
 */
export async function updatePushMessage(
  id: string,
  data: UpdatePushMessageData
): Promise<PushMessage | null> {
  const [updated] = await database
    .update(pushMessage)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(pushMessage.id, id))
    .returning();

  return updated || null;
}

/**
 * Mark a push message as processing
 */
export async function markPushMessageAsQueued(
  id: string
): Promise<PushMessage | null> {
  const [updated] = await database
    .update(pushMessage)
    .set({
      status: "queued",
      updatedAt: new Date(),
    })
    .where(eq(pushMessage.id, id))
    .returning();

  return updated || null;
}

/**
 * Mark a push message as sent
 */
export async function markPushMessageAsSent(
  id: string
): Promise<PushMessage | null> {
  const [updated] = await database
    .update(pushMessage)
    .set({
      status: "sent",
      processedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(pushMessage.id, id))
    .returning();

  return updated || null;
}

/**
 * Mark a push message as failed
 */
export async function markPushMessageAsFailed(
  id: string,
  errorMessage: string
): Promise<PushMessage | null> {
  const message = await findPushMessageById(id);
  if (!message) return null;

  const [updated] = await database
    .update(pushMessage)
    .set({
      status: message.retryCount >= message.maxRetries ? "failed" : "pending",
      errorMessage,
      retryCount: message.retryCount + 1,
      processedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(pushMessage.id, id))
    .returning();

  return updated || null;
}

/**
 * Delete a push message
 */
export async function deletePushMessage(id: string): Promise<boolean> {
  const [deleted] = await database
    .delete(pushMessage)
    .where(eq(pushMessage.id, id))
    .returning();

  return deleted !== undefined;
}

// =============================================================================
// Delivery Tracking Operations
// =============================================================================

/**
 * Create a new delivery tracking record
 */
export async function createDeliveryTracking(
  trackingData: CreateDeliveryTrackingData
): Promise<DeliveryTracking> {
  const [newTracking] = await database
    .insert(deliveryTracking)
    .values(trackingData)
    .returning();

  return newTracking;
}

/**
 * Create multiple delivery tracking records
 */
export async function createDeliveryTrackingBatch(
  trackingDataList: CreateDeliveryTrackingData[]
): Promise<DeliveryTracking[]> {
  if (trackingDataList.length === 0) return [];

  const newTrackings = await database
    .insert(deliveryTracking)
    .values(trackingDataList)
    .returning();

  return newTrackings;
}

/**
 * Find delivery tracking by ID
 */
export async function findDeliveryTrackingById(
  id: string
): Promise<DeliveryTracking | null> {
  const [result] = await database
    .select()
    .from(deliveryTracking)
    .where(eq(deliveryTracking.id, id))
    .limit(1);

  return result || null;
}

/**
 * Find delivery trackings for a push message
 */
export async function findDeliveryTrackingsByMessageId(
  pushMessageId: string
): Promise<DeliveryTracking[]> {
  const results = await database
    .select()
    .from(deliveryTracking)
    .where(eq(deliveryTracking.pushMessageId, pushMessageId))
    .orderBy(desc(deliveryTracking.createdAt));

  return results;
}

/**
 * Update delivery tracking
 */
export async function updateDeliveryTracking(
  id: string,
  data: UpdateDeliveryTrackingData
): Promise<DeliveryTracking | null> {
  const [updated] = await database
    .update(deliveryTracking)
    .set(data)
    .where(eq(deliveryTracking.id, id))
    .returning();

  return updated || null;
}

/**
 * Mark delivery as sent
 */
export async function markDeliveryAsSent(
  id: string,
  providerMessageId?: string,
  providerResponse?: string
): Promise<DeliveryTracking | null> {
  const [updated] = await database
    .update(deliveryTracking)
    .set({
      status: "delivered",
      sentAt: new Date(),
      deliveredAt: new Date(),
      providerMessageId,
      providerResponse,
    })
    .where(eq(deliveryTracking.id, id))
    .returning();

  return updated || null;
}

/**
 * Mark delivery as failed
 */
export async function markDeliveryAsFailed(
  id: string,
  errorCode: string,
  errorMessage: string
): Promise<DeliveryTracking | null> {
  const [updated] = await database
    .update(deliveryTracking)
    .set({
      status: "failed",
      failedAt: new Date(),
      errorCode,
      errorMessage,
    })
    .where(eq(deliveryTracking.id, id))
    .returning();

  return updated || null;
}

/**
 * Get delivery statistics for a push message
 */
export async function getDeliveryStats(pushMessageId: string): Promise<{
  total: number;
  pending: number;
  delivered: number;
  failed: number;
}> {
  const trackings = await findDeliveryTrackingsByMessageId(pushMessageId);

  return {
    total: trackings.length,
    pending: trackings.filter((t) => t.status === "pending").length,
    delivered: trackings.filter((t) => t.status === "delivered").length,
    failed: trackings.filter((t) => t.status === "failed").length,
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get all active device tokens for sending notifications
 */
export async function getActiveDeviceTokensForUsers(
  userIds: string[]
): Promise<DeviceToken[]> {
  if (userIds.length === 0) return [];

  const results = await database
    .select()
    .from(deviceToken)
    .where(
      and(
        inArray(deviceToken.userId, userIds),
        eq(deviceToken.isActive, true)
      )
    );

  return results;
}

/**
 * Parse web push keys from JSON string
 */
export function parseWebPushKeys(keysJson: string | null): WebPushKeys | null {
  if (!keysJson) return null;
  try {
    return JSON.parse(keysJson) as WebPushKeys;
  } catch {
    return null;
  }
}

/**
 * Stringify web push keys to JSON
 */
export function stringifyWebPushKeys(keys: WebPushKeys): string {
  return JSON.stringify(keys);
}
