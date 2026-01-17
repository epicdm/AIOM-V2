/**
 * Recording Retention Enforcement API Route
 *
 * This endpoint enforces retention policies on expired recordings.
 * It should be called by a cron job or scheduler at regular intervals.
 *
 * Security: Protected by a secret API key to prevent unauthorized access.
 *
 * Cron Job Setup Examples:
 * - Vercel Cron: Add to vercel.json with daily schedule
 * - GitHub Actions: Use schedule trigger with curl
 * - External cron service: POST to this endpoint with Authorization header
 */

import { createFileRoute } from "@tanstack/react-router";
import {
  enforceRetention,
  retryFailedRecordings,
  getRecordingStats,
} from "~/lib/fusionpbx-recording-service";

// API key for retention enforcement - should be set in environment
const RECORDING_API_KEY = process.env.RECORDING_API_KEY;

export const Route = createFileRoute("/api/recording/retention")({
  server: {
    handlers: {
      /**
       * POST /api/recording/retention
       * Enforce retention policies on expired recordings
       *
       * Headers:
       * - Authorization: Bearer <API_KEY>
       *
       * Query Parameters:
       * - dryRun: If "true", don't actually delete (just report what would be deleted)
       * - retryFailed: If "true", also retry failed recordings
       * - batchSize: Number of recordings to process per batch (default: 100)
       * - maxRecordings: Maximum recordings to process (default: 1000)
       *
       * Response:
       * - 200: { success: true, retention: {...}, retries?: {...} }
       * - 401: { error: "Unauthorized" }
       * - 500: { error: "Processing failed" }
       */
      POST: async ({ request }) => {
        // Verify API key
        const authHeader = request.headers.get("Authorization");
        const apiKey = authHeader?.replace("Bearer ", "");

        // If API key is configured, require it
        if (RECORDING_API_KEY && apiKey !== RECORDING_API_KEY) {
          console.warn("Unauthorized attempt to run retention enforcement");
          return Response.json(
            { error: "Unauthorized" },
            { status: 401 }
          );
        }

        try {
          // Parse query parameters
          const url = new URL(request.url);
          const dryRun = url.searchParams.get("dryRun") === "true";
          const retryFailed = url.searchParams.get("retryFailed") === "true";
          const batchSize = parseInt(url.searchParams.get("batchSize") || "100", 10);
          const maxRecordings = parseInt(url.searchParams.get("maxRecordings") || "1000", 10);

          console.log("Running retention enforcement...", {
            dryRun,
            retryFailed,
            batchSize,
            maxRecordings,
          });

          // Enforce retention
          const retentionResult = await enforceRetention({
            dryRun,
            batchSize,
            maxRecordings,
          });

          console.log(
            `Retention enforcement complete: ${retentionResult.processed} processed, ` +
            `${retentionResult.deleted} deleted, ${retentionResult.failed} failed`
          );

          // Optionally retry failed recordings
          let retryResult = null;
          if (retryFailed) {
            console.log("Retrying failed recordings...");
            retryResult = await retryFailedRecordings();
            console.log(
              `Retry complete: ${retryResult.processed} processed, ` +
              `${retryResult.successful} successful, ${retryResult.failed} failed`
            );
          }

          return Response.json({
            success: true,
            retention: {
              processed: retentionResult.processed,
              deleted: retentionResult.deleted,
              archived: retentionResult.archived,
              failed: retentionResult.failed,
              dryRun,
              errors: retentionResult.errors.length > 0
                ? retentionResult.errors.slice(0, 10) // Limit errors in response
                : undefined,
            },
            retries: retryResult
              ? {
                  processed: retryResult.processed,
                  successful: retryResult.successful,
                  failed: retryResult.failed,
                }
              : undefined,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error("Error running retention enforcement:", error);
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
       * GET /api/recording/retention
       * Get retention statistics and status
       *
       * Response:
       * - 200: { status: "ok", stats: {...} }
       */
      GET: async () => {
        try {
          const stats = await getRecordingStats();

          return Response.json({
            status: "ok",
            service: "recording-retention",
            stats: {
              totalRecordings: stats.totalRecordings,
              pendingRecordings: stats.pendingRecordings,
              encryptedRecordings: stats.encryptedRecordings,
              failedRecordings: stats.failedRecordings,
              totalStorageBytes: stats.totalStorageBytes,
              recordingsExpiringWithin7Days: stats.recordingsExpiringWithin7Days,
              activeRetentionPolicies: stats.activeRetentionPolicies,
              activeEncryptionKeys: stats.activeEncryptionKeys,
            },
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error("Error getting retention status:", error);
          return Response.json({
            status: "error",
            service: "recording-retention",
            error: error instanceof Error ? error.message : "Unknown error",
            timestamp: new Date().toISOString(),
          });
        }
      },
    },
  },
});
