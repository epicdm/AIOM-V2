/**
 * Push Notification Queue Processing API Route
 *
 * This endpoint processes the push notification queue.
 * It should be called by a cron job or scheduler at regular intervals.
 *
 * Security: Protected by a secret API key to prevent unauthorized access.
 */

import { createFileRoute } from "@tanstack/react-router";
import { getPushNotificationService } from "~/lib/push-notification/service";

// API key for queue processing - should be set in environment
const QUEUE_PROCESS_API_KEY = process.env.PUSH_QUEUE_API_KEY;

export const Route = createFileRoute("/api/push/process-queue")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Verify API key
        const authHeader = request.headers.get("Authorization");
        const apiKey = authHeader?.replace("Bearer ", "");

        // If API key is not set, allow access (for development)
        // In production, this should be required
        if (QUEUE_PROCESS_API_KEY && apiKey !== QUEUE_PROCESS_API_KEY) {
          return Response.json(
            { error: "Unauthorized" },
            { status: 401 }
          );
        }

        try {
          const service = getPushNotificationService();
          const result = await service.processQueue();

          console.log(
            `Push queue processed: ${result.processed} messages, ` +
            `${result.successful} successful, ${result.failed} failed`
          );

          return Response.json({
            success: true,
            processed: result.processed,
            successful: result.successful,
            failed: result.failed,
          });
        } catch (error) {
          console.error("Error processing push queue:", error);
          return Response.json(
            { error: "Queue processing failed" },
            { status: 500 }
          );
        }
      },

      // GET endpoint for health check
      GET: async () => {
        return Response.json({
          status: "ok",
          service: "push-notification-queue",
          timestamp: new Date().toISOString(),
        });
      },
    },
  },
});
