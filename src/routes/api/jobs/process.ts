/**
 * Job Queue Process API Route
 *
 * POST /api/jobs/process - Trigger job processing (for cron jobs)
 */

import { createFileRoute } from "@tanstack/react-router";
import {
  getJobQueueClient,
  initializeJobQueueWithHandlers,
  getQueueStats,
} from "~/lib/job-queue";

// API key for job queue operations
const JOB_QUEUE_API_KEY = process.env.JOB_QUEUE_API_KEY;

export const Route = createFileRoute("/api/jobs/process")({
  server: {
    handlers: {
      /**
       * POST /api/jobs/process
       * Process pending jobs (designed for cron job triggering)
       *
       * Headers:
       * - Authorization: Bearer <API_KEY>
       *
       * Query Parameters:
       * - limit: Maximum number of jobs to process (default: 10)
       *
       * Response:
       * - 200: { success: true, processed: number, ... }
       * - 401: { error: "Unauthorized" }
       * - 500: { error: "Processing failed" }
       */
      POST: async ({ request }) => {
        // Verify API key
        const authHeader = request.headers.get("Authorization");
        const apiKey = authHeader?.replace("Bearer ", "");

        if (JOB_QUEUE_API_KEY && apiKey !== JOB_QUEUE_API_KEY) {
          console.warn("Unauthorized attempt to process jobs");
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const url = new URL(request.url);
        const limit = parseInt(url.searchParams.get("limit") || "10", 10);
        const workerId = `api-worker-${Date.now()}`;

        try {
          console.log(`[JobProcessAPI] Starting job processing (limit: ${limit})...`);

          // Initialize the job queue with handlers
          await initializeJobQueueWithHandlers();

          const client = getJobQueueClient();
          const results = {
            processed: 0,
            successful: 0,
            failed: 0,
            errors: [] as Array<{ jobId: string; error: string }>,
          };

          // Process jobs up to the limit
          for (let i = 0; i < limit; i++) {
            const job = await client.fetchNextJob(workerId);

            if (!job) {
              console.log(`[JobProcessAPI] No more jobs available after ${i} jobs`);
              break;
            }

            results.processed++;

            try {
              const result = await client.processJob(job, workerId);

              if (result.success) {
                results.successful++;
              } else {
                results.failed++;
                results.errors.push({
                  jobId: job.id,
                  error: result.error || "Unknown error",
                });
              }
            } catch (error) {
              results.failed++;
              results.errors.push({
                jobId: job.id,
                error: error instanceof Error ? error.message : "Unknown error",
              });
            }
          }

          // Clean up stale jobs
          const staleCleanedUp = await client.cleanupStaleJobs();
          if (staleCleanedUp > 0) {
            console.log(`[JobProcessAPI] Cleaned up ${staleCleanedUp} stale jobs`);
          }

          // Get updated stats
          const stats = await getQueueStats();

          console.log(
            `[JobProcessAPI] Processing complete: ${results.processed} processed, ` +
              `${results.successful} successful, ${results.failed} failed`
          );

          return Response.json({
            success: true,
            processed: results.processed,
            successful: results.successful,
            failed: results.failed,
            errors: results.errors.length > 0 ? results.errors : undefined,
            staleCleanedUp,
            queueStats: {
              pending: stats.pending,
              processing: stats.processing,
              failed: stats.failed,
            },
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error("[JobProcessAPI] Error processing jobs:", error);
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
       * GET /api/jobs/process
       * Health check endpoint
       */
      GET: async () => {
        try {
          const stats = await getQueueStats();

          return Response.json({
            status: "ok",
            service: "job-queue-processor",
            queueStats: {
              pending: stats.pending,
              processing: stats.processing,
              completed: stats.completed,
              failed: stats.failed,
            },
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error("[JobProcessAPI] Health check error:", error);
          return Response.json({
            status: "error",
            service: "job-queue-processor",
            error: error instanceof Error ? error.message : "Unknown error",
            timestamp: new Date().toISOString(),
          });
        }
      },
    },
  },
});
