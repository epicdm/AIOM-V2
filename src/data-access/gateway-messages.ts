/**
 * Gateway Messages Data Access Layer
 *
 * Handles persistence and retrieval of multi-channel assistant gateway messages.
 * Provides idempotent insert with deduplication.
 */

import { database } from "~/db";
import { gatewayMessage } from "~/db/schema";
import { eq, and, desc } from "drizzle-orm";
import type {
  CreateGatewayMessageData,
  InsertGatewayMessageResult,
  GatewayMessage,
} from "~/lib/gateway/types";

/**
 * Insert a gateway message with idempotency (dedupe by dedupeKey)
 *
 * Uses onConflictDoNothing to prevent duplicate inserts for the same dedupeKey.
 * Returns whether the message was inserted or was a duplicate.
 *
 * @param data - Gateway message data to insert
 * @returns Result indicating if message was inserted and the message ID
 */
export async function insertGatewayMessageIfNew(
  data: CreateGatewayMessageData
): Promise<InsertGatewayMessageResult> {
  try {
    // Attempt insert with conflict handling on dedupe_key
    const result = await database
      .insert(gatewayMessage)
      .values({
        id: data.id,
        tenantId: data.tenantId,
        channel: data.channel,
        externalChatId: data.externalChatId,
        externalUserId: data.externalUserId,
        externalMessageId: data.externalMessageId,
        dedupeKey: data.dedupeKey,
        text: data.text,
        raw: data.raw,
        receivedAt: data.receivedAt,
        createdAt: new Date(),
      })
      .onConflictDoNothing({ target: gatewayMessage.dedupeKey })
      .returning();

    // If result is empty, dedupe key already exists (duplicate)
    if (result.length === 0) {
      return {
        inserted: false,
      };
    }

    // Message inserted successfully
    return {
      inserted: true,
      id: result[0].id,
      message: result[0] as GatewayMessage,
    };
  } catch (error) {
    console.error("[GatewayMessages] Failed to insert message:", error);
    throw error;
  }
}

/**
 * Get gateway messages for a tenant and channel
 *
 * @param tenantId - Tenant ID
 * @param channel - Channel type
 * @param options - Query options (limit, offset)
 * @returns Array of gateway messages
 */
export async function getGatewayMessagesByTenantAndChannel(
  tenantId: string,
  channel: string,
  options?: { limit?: number; offset?: number }
): Promise<GatewayMessage[]> {
  const query = database
    .select()
    .from(gatewayMessage)
    .where(and(eq(gatewayMessage.tenantId, tenantId), eq(gatewayMessage.channel, channel)))
    .orderBy(desc(gatewayMessage.receivedAt));

  if (options?.limit) {
    query.limit(options.limit);
  }

  if (options?.offset) {
    query.offset(options.offset);
  }

  return query as Promise<GatewayMessage[]>;
}

/**
 * Get gateway messages for a specific chat
 *
 * @param tenantId - Tenant ID
 * @param channel - Channel type
 * @param externalChatId - External chat ID
 * @param options - Query options (limit, offset)
 * @returns Array of gateway messages
 */
export async function getGatewayMessagesByChat(
  tenantId: string,
  channel: string,
  externalChatId: string,
  options?: { limit?: number; offset?: number }
): Promise<GatewayMessage[]> {
  const query = database
    .select()
    .from(gatewayMessage)
    .where(
      and(
        eq(gatewayMessage.tenantId, tenantId),
        eq(gatewayMessage.channel, channel),
        eq(gatewayMessage.externalChatId, externalChatId)
      )
    )
    .orderBy(desc(gatewayMessage.receivedAt));

  if (options?.limit) {
    query.limit(options.limit);
  }

  if (options?.offset) {
    query.offset(options.offset);
  }

  return query as Promise<GatewayMessage[]>;
}

/**
 * Get a gateway message by ID
 *
 * @param id - Message ID
 * @returns Gateway message or null if not found
 */
export async function getGatewayMessageById(id: string): Promise<GatewayMessage | null> {
  const result = await database
    .select()
    .from(gatewayMessage)
    .where(eq(gatewayMessage.id, id))
    .limit(1);

  return (result[0] as GatewayMessage) || null;
}

/**
 * Get a gateway message by dedupe key
 *
 * @param dedupeKey - Dedupe key
 * @returns Gateway message or null if not found
 */
export async function getGatewayMessageByDedupeKey(
  dedupeKey: string
): Promise<GatewayMessage | null> {
  const result = await database
    .select()
    .from(gatewayMessage)
    .where(eq(gatewayMessage.dedupeKey, dedupeKey))
    .limit(1);

  return (result[0] as GatewayMessage) || null;
}
