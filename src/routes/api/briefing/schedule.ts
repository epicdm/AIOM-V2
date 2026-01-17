/**
 * Scheduled Briefing Processing API Route
 *
 * This endpoint processes scheduled briefings for all users due for delivery.
 * It should be called by a cron job or scheduler at regular intervals (e.g., every 15 minutes).
 *
 * Security: Protected by a secret API key to prevent unauthorized access.
 *
 * Cron Job Setup Examples:
 * - Vercel Cron: Add to vercel.json with cron schedule every 15 minutes
 * - GitHub Actions: Use schedule trigger with curl to POST to this endpoint
 * - External cron service: POST to this endpoint with Authorization header
 *
 * The endpoint processes users based on their configured:
 * - Delivery time (in their local timezone)
 * - Timezone preference
 * - Days of week for delivery
 */

import { createFileRoute } from "@tanstack/react-router";
import { processScheduledBriefings, getBriefingSchedulerService } from "~/lib/briefing-scheduler";

// API key for scheduled briefing processing - should be set in environment
const BRIEFING_SCHEDULER_API_KEY = process.env.BRIEFING_SCHEDULER_API_KEY;

export const Route = createFileRoute("/api/briefing/schedule")({
  server: {
    handlers: {
      /**
       * POST /api/briefing/schedule
       * Process scheduled briefings for all users due for delivery
       *
       * Headers:
       * - Authorization: Bearer <API_KEY>
       *
       * Response:
       * - 200: { success: true, processed: number, successful: number, failed: number, skipped: number }
       * - 401: { error: "Unauthorized" }
       * - 500: { error: "Processing failed" }
       */
      POST: async ({ request }) => {
        // Verify API key
        const authHeader = request.headers.get("Authorization");
        const apiKey = authHeader?.replace("Bearer ", "");

        // If API key is configured, require it
        // In development (no key set), allow access
        if (BRIEFING_SCHEDULER_API_KEY && apiKey !== BRIEFING_SCHEDULER_API_KEY) {
          console.warn("Unauthorized attempt to process scheduled briefings");
          return Response.json(
            { error: "Unauthorized" },
            { status: 401 }
          );
        }

        try {
          console.log("Processing scheduled briefings via API...");
          const result = await processScheduledBriefings();

          console.log(
            `Scheduled briefings processed: ${result.processed} total, ` +
            `${result.successful} successful, ${result.failed} failed, ${result.skipped} skipped`
          );

          // Log errors for debugging
          if (result.errors.length > 0) {
            console.error("Briefing delivery errors:", result.errors);
          }

          return Response.json({
            success: true,
            processed: result.processed,
            successful: result.successful,
            failed: result.failed,
            skipped: result.skipped,
            errors: result.errors.length > 0 ? result.errors : undefined,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error("Error processing scheduled briefings:", error);
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
       * GET /api/briefing/schedule
       * Health check and status endpoint
       *
       * Response:
       * - 200: { status: "ok", service: "briefing-scheduler", enabledUsers: number, isProcessing: boolean }
       */
      GET: async () => {
        try {
          const service = getBriefingSchedulerService();
          const stats = await service.getSchedulerStats();

          return Response.json({
            status: "ok",
            service: "briefing-scheduler",
            enabledUsers: stats.enabledUsers,
            isProcessing: stats.isProcessing,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error("Error getting scheduler status:", error);
          return Response.json({
            status: "error",
            service: "briefing-scheduler",
            error: error instanceof Error ? error.message : "Unknown error",
            timestamp: new Date().toISOString(),
          });
        }
      },
    },
  },
});
