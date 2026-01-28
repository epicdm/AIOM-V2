/**
 * Gateway Message Types
 *
 * Unified message interface for multi-channel assistant gateway.
 * Supports Telegram, web chat, and future channels (WhatsApp, SMS, etc.)
 */

/**
 * Supported messaging channels
 */
export type GatewayChannel = "telegram" | "web" | "whatsapp" | "sms";

/**
 * Gateway message stored in database
 *
 * Represents an inbound message from any channel, normalized into
 * a common format for processing, persistence, and audit trail.
 */
export interface GatewayMessage {
  /** Unique message ID (UUID) */
  id: string;

  /** Tenant ID this message belongs to */
  tenantId: string;

  /** Channel this message came from */
  channel: GatewayChannel;

  /** External chat/conversation ID (channel-specific) */
  externalChatId: string;

  /** External user ID (channel-specific) */
  externalUserId: string;

  /** External message ID (channel-specific, nullable for non-message updates) */
  externalMessageId: string | null;

  /** Deduplication key (unique, prevents duplicate processing) */
  dedupeKey: string;

  /** Message text content (nullable for non-text messages) */
  text: string | null;

  /** Raw message payload from channel (JSON) */
  raw: Record<string, unknown>;

  /** When message was received by our webhook */
  receivedAt: Date;

  /** When record was created in our database */
  createdAt: Date;
}

/**
 * Data for creating a new gateway message
 */
export interface CreateGatewayMessageData {
  id: string;
  tenantId: string;
  channel: GatewayChannel;
  externalChatId: string;
  externalUserId: string;
  externalMessageId: string | null;
  dedupeKey: string;
  text: string | null;
  raw: Record<string, unknown>;
  receivedAt: Date;
}

/**
 * Result of inserting a gateway message
 */
export interface InsertGatewayMessageResult {
  /** Whether the message was inserted (false if duplicate) */
  inserted: boolean;

  /** Message ID if inserted, undefined if duplicate */
  id?: string;

  /** Message data if inserted */
  message?: GatewayMessage;
}
