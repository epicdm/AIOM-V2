/**
 * Telegram Webhook API Route
 *
 * POST /api/telegram/webhook - Receive incoming Telegram updates
 *
 * Feature-flagged: Requires TELEGRAM_CHANNEL_ENABLED=true
 * Secret-gated: Validates X-Telegram-Bot-Api-Secret-Token header
 * Normalizes Telegram updates into internal format
 * Performs tenant routing (stub - no tool execution yet)
 */

import { createFileRoute } from "@tanstack/react-router";
import { insertGatewayMessageIfNew } from "~/data-access/gateway-messages";
import type { CreateGatewayMessageData } from "~/lib/gateway/types";

/**
 * Normalized Telegram message format
 */
interface NormalizedTelegramMessage {
  channel: "telegram";
  telegramUpdateId: number;
  telegramChatId: number;
  telegramUserId: number;
  telegramUsername?: string;
  text: string;
  messageId: number;
  receivedAt: string;
  tenantId?: string;
}

/**
 * Telegram Update structure (minimal subset)
 */
interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    date: number;
    chat: {
      id: number;
      type: string;
    };
    from?: {
      id: number;
      username?: string;
      first_name?: string;
    };
    text?: string;
  };
}

/**
 * Resolve tenant ID from chat ID using environment-configured mapping
 */
function resolveTenantId(chatId: number): string | null {
  // Try TELEGRAM_TENANT_MAP first (JSON mapping: chatId → tenantId)
  const tenantMapJson = process.env.TELEGRAM_TENANT_MAP;
  if (tenantMapJson) {
    try {
      const tenantMap = JSON.parse(tenantMapJson) as Record<string, string>;
      const chatIdStr = chatId.toString();
      if (tenantMap[chatIdStr]) {
        return tenantMap[chatIdStr];
      }
    } catch (error) {
      console.error("[TelegramWebhook] Failed to parse TELEGRAM_TENANT_MAP:", error);
    }
  }

  // Fallback to TELEGRAM_DEFAULT_TENANT_ID
  const defaultTenantId = process.env.TELEGRAM_DEFAULT_TENANT_ID;
  if (defaultTenantId) {
    return defaultTenantId;
  }

  return null;
}

export const Route = createFileRoute("/api/telegram/webhook")({
  server: {
    handlers: {
      /**
       * POST /api/telegram/webhook
       * Receive and normalize incoming Telegram updates
       *
       * Headers:
       * - X-Telegram-Bot-Api-Secret-Token: Secret token for authentication
       *
       * Body:
       * - Telegram Update JSON
       *
       * Response:
       * - 200: { ok: true, normalized: NormalizedTelegramMessage } or { ok: true, ignored: true, reason: string }
       * - 401: { error: "Unauthorized" }
       * - 404: { error: "Telegram channel disabled" }
       * - 400: { error: "Invalid request" }
       */
      POST: async ({ request }) => {
        // Feature flag gate: Telegram channel must be explicitly enabled
        if (process.env.TELEGRAM_CHANNEL_ENABLED !== "true") {
          console.log("[TelegramWebhook] Request blocked: TELEGRAM_CHANNEL_ENABLED not set to true");
          return Response.json(
            { error: "Telegram channel disabled" },
            { status: 404 }
          );
        }

        // Secret verification: Validate Telegram webhook secret token
        const providedSecret = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
        const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

        if (!expectedSecret) {
          console.error("[TelegramWebhook] TELEGRAM_WEBHOOK_SECRET not configured");
          return Response.json(
            { error: "Telegram webhook not configured" },
            { status: 404 }
          );
        }

        if (!providedSecret || providedSecret !== expectedSecret) {
          console.warn("[TelegramWebhook] Unauthorized request: invalid or missing secret");
          return Response.json(
            { error: "Unauthorized" },
            { status: 401 }
          );
        }

        // Parse Telegram Update JSON
        let update: TelegramUpdate;
        try {
          update = await request.json();
        } catch (error) {
          console.error("[TelegramWebhook] Failed to parse request body:", error);
          return Response.json(
            { error: "Invalid request body" },
            { status: 400 }
          );
        }

        // Validate update structure
        if (!update.update_id) {
          console.error("[TelegramWebhook] Missing update_id in request");
          return Response.json(
            { error: "Invalid Telegram update: missing update_id" },
            { status: 400 }
          );
        }

        // Only process text messages for now
        if (!update.message?.text) {
          console.log(`[TelegramWebhook] Ignoring non-text update: ${update.update_id}`);
          return Response.json({
            ok: true,
            ignored: true,
            reason: "non_text_message",
            updateId: update.update_id,
          });
        }

        const message = update.message;
        const chatId = message.chat.id;
        const userId = message.from?.id;

        if (!userId) {
          console.error("[TelegramWebhook] Missing user ID in message");
          return Response.json(
            { error: "Invalid message: missing user ID" },
            { status: 400 }
          );
        }

        // Tenant routing stub
        const tenantId = resolveTenantId(chatId);

        if (!tenantId) {
          console.log(`[TelegramWebhook] Unmapped chat ID: ${chatId}, ignoring message`);
          return Response.json({
            ok: true,
            ignored: true,
            reason: "unmapped_chat",
            updateId: update.update_id,
            chatId: chatId,
          });
        }

        // Normalize Telegram message into internal format
        const normalized: NormalizedTelegramMessage = {
          channel: "telegram",
          telegramUpdateId: update.update_id,
          telegramChatId: chatId,
          telegramUserId: userId,
          telegramUsername: message.from?.username,
          text: message.text!, // Already validated non-null above
          messageId: message.message_id,
          receivedAt: new Date().toISOString(),
          tenantId: tenantId,
        };

        console.log(
          `[TelegramWebhook] Normalized message from chat ${chatId} (tenant: ${tenantId}):`,
          {
            updateId: normalized.telegramUpdateId,
            messageId: normalized.messageId,
            text: normalized.text.substring(0, 50) + (normalized.text.length > 50 ? "..." : ""),
          }
        );

        // PM STEP 26: Persist message to gateway_message table
        // Compute dedupe key for idempotency
        const dedupeKey = message.message_id
          ? `telegram:${tenantId}:${chatId}:${message.message_id}`
          : `telegram:${tenantId}:update:${update.update_id}`;

        const gatewayMessageData: CreateGatewayMessageData = {
          id: `gw_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          tenantId: tenantId,
          channel: "telegram",
          externalChatId: chatId.toString(),
          externalUserId: userId.toString(),
          externalMessageId: message.message_id.toString(),
          dedupeKey: dedupeKey,
          text: message.text!,
          raw: update as unknown as Record<string, unknown>,
          receivedAt: new Date(message.date * 1000), // Telegram date is Unix timestamp
        };

        const insertResult = await insertGatewayMessageIfNew(gatewayMessageData);

        if (insertResult.inserted) {
          console.log(
            `[TelegramWebhook] Message persisted: ${insertResult.id} (dedupe: ${dedupeKey})`
          );
        } else {
          console.log(
            `[TelegramWebhook] Duplicate message ignored (dedupe: ${dedupeKey})`
          );
        }

        // TODO (PM STEP 27): Execute tools based on message content

        return Response.json({
          ok: true,
          normalized: normalized,
          persisted: insertResult.inserted,
          gatewayMessageId: insertResult.id,
          dedupeKey: dedupeKey,
          // Include routing info for debugging
          routing: {
            tenantId: tenantId,
            chatId: chatId,
            userId: userId,
          },
        });
      },

      /**
       * GET /api/telegram/webhook
       * Health check for Telegram webhook endpoint
       */
      GET: async () => {
        const enabled = process.env.TELEGRAM_CHANNEL_ENABLED === "true";
        const secretConfigured = !!process.env.TELEGRAM_WEBHOOK_SECRET;

        return Response.json({
          status: enabled ? "enabled" : "disabled",
          service: "telegram-webhook",
          configured: {
            enabled: enabled,
            secret: secretConfigured,
            tenantMap: !!process.env.TELEGRAM_TENANT_MAP,
            defaultTenant: !!process.env.TELEGRAM_DEFAULT_TENANT_ID,
          },
          timestamp: new Date().toISOString(),
        });
      },
    },
  },
});
