/**
 * FusionPBX Recording Webhook API Route
 *
 * This endpoint receives webhook events from FusionPBX when recordings are available.
 * It processes the recordings by:
 * 1. Downloading from FusionPBX
 * 2. Encrypting the content
 * 3. Storing in cloud storage
 * 4. Applying retention policies
 *
 * Security: Protected by a webhook secret to prevent unauthorized access.
 *
 * Webhook Events:
 * - recording_started: Call recording has started
 * - recording_stopped: Call recording has stopped
 * - recording_available: Recording file is ready for download
 */

import { createFileRoute } from "@tanstack/react-router";
import {
  processWebhook,
  getFusionPBXRecordingService,
  type FusionPBXRecordingWebhookPayload,
} from "~/lib/fusionpbx-recording-service";
import crypto from "crypto";

// Webhook secret for authentication
const FUSIONPBX_WEBHOOK_SECRET = process.env.FUSIONPBX_WEBHOOK_SECRET;

/**
 * Verify webhook signature (HMAC-SHA256)
 */
function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  // Use timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

export const Route = createFileRoute("/api/recording/webhook")({
  server: {
    handlers: {
      /**
       * POST /api/recording/webhook
       * Process FusionPBX recording webhook events
       *
       * Headers:
       * - X-FusionPBX-Signature: HMAC-SHA256 signature of the payload
       * - Content-Type: application/json
       *
       * Body: FusionPBX webhook payload
       *
       * Response:
       * - 200: { success: true, message: string, recordingId?: string }
       * - 400: { error: "Invalid payload" }
       * - 401: { error: "Unauthorized" }
       * - 500: { error: "Processing failed" }
       */
      POST: async ({ request }) => {
        try {
          // Get raw body for signature verification
          const rawBody = await request.text();

          // Verify webhook signature if secret is configured
          if (FUSIONPBX_WEBHOOK_SECRET) {
            const signature = request.headers.get("X-FusionPBX-Signature");

            if (!verifyWebhookSignature(rawBody, signature, FUSIONPBX_WEBHOOK_SECRET)) {
              console.warn("Invalid webhook signature from FusionPBX");
              return Response.json(
                { error: "Unauthorized", message: "Invalid signature" },
                { status: 401 }
              );
            }
          }

          // Parse the payload
          let payload: FusionPBXRecordingWebhookPayload;
          try {
            payload = JSON.parse(rawBody);
          } catch {
            return Response.json(
              { error: "Invalid payload", message: "Failed to parse JSON" },
              { status: 400 }
            );
          }

          // Validate required fields
          if (!payload.event || !payload.call_uuid) {
            return Response.json(
              { error: "Invalid payload", message: "Missing required fields: event, call_uuid" },
              { status: 400 }
            );
          }

          console.log(`Processing FusionPBX webhook: ${payload.event} for call ${payload.call_uuid}`);

          // Process the webhook
          const result = await processWebhook(payload);

          if (!result.success) {
            console.error("Webhook processing failed:", result.error);
            return Response.json(
              {
                success: false,
                error: "Processing failed",
                message: result.error,
              },
              { status: 500 }
            );
          }

          console.log(`Webhook processed successfully: ${result.message}`);

          return Response.json({
            success: true,
            message: result.message,
            recordingId: result.recordingId,
            callRecordId: result.callRecordId,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error("Error processing FusionPBX webhook:", error);
          return Response.json(
            {
              error: "Processing failed",
              message: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
          );
        }
      },

      /**
       * GET /api/recording/webhook
       * Health check and status endpoint for the webhook
       *
       * Response:
       * - 200: { status: "ok", service: "fusionpbx-recording-webhook", ... }
       */
      GET: async () => {
        try {
          const service = getFusionPBXRecordingService();
          const stats = await service.getStats();

          return Response.json({
            status: "ok",
            service: "fusionpbx-recording-webhook",
            webhookSecretConfigured: !!FUSIONPBX_WEBHOOK_SECRET,
            stats: {
              totalRecordings: stats.totalRecordings,
              pendingRecordings: stats.pendingRecordings,
              encryptedRecordings: stats.encryptedRecordings,
              failedRecordings: stats.failedRecordings,
              recordingsExpiringWithin7Days: stats.recordingsExpiringWithin7Days,
            },
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error("Error getting webhook status:", error);
          return Response.json({
            status: "error",
            service: "fusionpbx-recording-webhook",
            error: error instanceof Error ? error.message : "Unknown error",
            timestamp: new Date().toISOString(),
          });
        }
      },
    },
  },
});
