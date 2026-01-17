/**
 * Job Queue Status API Route
 *
 * GET /api/jobs/status - Get job status by ID
 * GET /api/jobs/status?stats=true - Get queue statistics
 */

import { createFileRoute } from "@tanstack/react-router";
import { getJob, getQueueStats } from "~/lib/job-queue";

// API key for job queue operations
const JOB_QUEUE_API_KEY = process.env.JOB_QUEUE_API_KEY;

export const Route = createFileRoute("/api/jobs/status")({
  server: {
    handlers: {
      /**
       * GET /api/jobs/status
       * Get job status or queue statistics
       *
       * Query Parameters:
       * - id: Job ID to get status for
       * - stats: If "true", return queue statistics instead
       *
       * Headers:
       * - Authorization: Bearer <API_KEY> (optional for stats, required for specific job)
       *
       * Response:
       * - 200: Job status or queue statistics
       * - 401: { error: "Unauthorized" }
       * - 404: { error: "Job not found" }
       * - 500: { error: "Failed to get status" }
       */
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const jobId = url.searchParams.get("id");
        const wantStats = url.searchParams.get("stats") === "true";

        // Verify API key for specific job queries
        if (jobId && !wantStats) {
          const authHeader = request.headers.get("Authorization");
          const apiKey = authHeader?.replace("Bearer ", "");

          if (JOB_QUEUE_API_KEY && apiKey !== JOB_QUEUE_API_KEY) {
            console.warn("Unauthorized attempt to get job status");
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          }
        }

        try {
          // Return queue statistics
          if (wantStats) {
            const stats = await getQueueStats();

            return Response.json({
              success: true,
              stats,
              timestamp: new Date().toISOString(),
            });
          }

          // Return specific job status
          if (jobId) {
            const job = await getJob(jobId);

            if (!job) {
              return Response.json({ error: "Job not found" }, { status: 404 });
            }

            return Response.json({
              success: true,
              job: {
                id: job.id,
                type: job.type,
                name: job.name,
                status: job.status,
                priority: job.priority,
                progress: job.progress,
                progressMessage: job.progressMessage,
                retryCount: job.retryCount,
                maxRetries: job.maxRetries,
                lastError: job.lastError,
                scheduledFor: job.scheduledFor?.toISOString(),
                createdAt: job.createdAt.toISOString(),
                startedAt: job.startedAt?.toISOString(),
                completedAt: job.completedAt?.toISOString(),
                userId: job.userId,
                referenceType: job.referenceType,
                referenceId: job.referenceId,
              },
              timestamp: new Date().toISOString(),
            });
          }

          // Default: return queue health
          const stats = await getQueueStats();

          return Response.json({
            success: true,
            status: "ok",
            service: "job-queue",
            summary: {
              pending: stats.pending,
              processing: stats.processing,
              failed: stats.failed,
              total: stats.total,
            },
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error("Error getting job status:", error);
          return Response.json(
            {
              error: "Failed to get status",
              message: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
          );
        }
      },
    },
  },
});
