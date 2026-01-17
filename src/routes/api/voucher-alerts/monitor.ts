/**
 * Voucher Alert Monitor Processing API Route
 *
 * This endpoint processes voucher alerts for all users with vouchers awaiting receipts
 * or pending reconciliation. It should be called by a cron job or scheduler at regular
 * intervals (e.g., every 15 minutes).
 *
 * Security: Protected by a secret API key to prevent unauthorized access.
 *
 * Cron Job Setup Examples:
 * - Vercel Cron: Add to vercel.json with cron schedule every 15 minutes
 * - GitHub Actions: Use schedule trigger with curl to POST to this endpoint
 * - External cron service: POST to this endpoint with Authorization header
 *
 * The endpoint monitors:
 * - Vouchers awaiting receipt uploads
 * - Vouchers pending reconciliation
 * - Overdue items requiring escalation
 */

import { createFileRoute } from "@tanstack/react-router";
import {
  processVoucherAlerts,
  getVoucherAlertMonitorService,
} from "~/lib/voucher-alert-monitor";

// API key for voucher alert processing - should be set in environment
const VOUCHER_ALERT_MONITOR_API_KEY = process.env.VOUCHER_ALERT_MONITOR_API_KEY;

export const Route = createFileRoute("/api/voucher-alerts/monitor")({
  server: {
    handlers: {
      /**
       * POST /api/voucher-alerts/monitor
       * Process voucher alerts for all users with pending vouchers
       *
       * Headers:
       * - Authorization: Bearer <API_KEY>
       *
       * Response:
       * - 200: { success: true, processed: number, alertsSent: number, escalationsSent: number, skipped: number }
       * - 401: { error: "Unauthorized" }
       * - 500: { error: "Processing failed" }
       */
      POST: async ({ request }) => {
        // Verify API key
        const authHeader = request.headers.get("Authorization");
        const apiKey = authHeader?.replace("Bearer ", "");

        // If API key is configured, require it
        // In development (no key set), allow access
        if (VOUCHER_ALERT_MONITOR_API_KEY && apiKey !== VOUCHER_ALERT_MONITOR_API_KEY) {
          console.warn("Unauthorized attempt to process voucher alerts");
          return Response.json(
            { error: "Unauthorized" },
            { status: 401 }
          );
        }

        try {
          console.log("Processing voucher alerts via API...");
          const result = await processVoucherAlerts();

          console.log(
            `Voucher alerts processed: ${result.processed} users, ` +
            `${result.alertsSent} alerts sent, ${result.escalationsSent} escalations, ${result.skipped} skipped`
          );

          // Log errors for debugging
          if (result.errors.length > 0) {
            console.error("Voucher alert errors:", result.errors);
          }

          return Response.json({
            success: true,
            processed: result.processed,
            alertsSent: result.alertsSent,
            escalationsSent: result.escalationsSent,
            skipped: result.skipped,
            errors: result.errors.length > 0 ? result.errors : undefined,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error("Error processing voucher alerts:", error);
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
       * GET /api/voucher-alerts/monitor
       * Health check and status endpoint
       *
       * Response:
       * - 200: { status: "ok", service: "voucher-alert-monitor", usersWithPendingVouchers: number, isProcessing: boolean }
       */
      GET: async () => {
        try {
          const service = getVoucherAlertMonitorService();
          const stats = await service.getStats();

          return Response.json({
            status: "ok",
            service: "voucher-alert-monitor",
            usersWithPendingVouchers: stats.usersWithPendingVouchers,
            isProcessing: stats.isProcessing,
            lastProcessedAt: stats.lastProcessedAt?.toISOString(),
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error("Error getting voucher alert monitor status:", error);
          return Response.json({
            status: "error",
            service: "voucher-alert-monitor",
            error: error instanceof Error ? error.message : "Unknown error",
            timestamp: new Date().toISOString(),
          });
        }
      },
    },
  },
});
