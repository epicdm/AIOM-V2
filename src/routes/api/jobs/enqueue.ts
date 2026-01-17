/**
 * Job Queue Enqueue API Route
 *
 * POST /api/jobs/enqueue - Enqueue a new job
 */

import { createFileRoute } from "@tanstack/react-router";
import { enqueueJob } from "~/lib/job-queue";
import type { JobType, JobPriority } from "~/db/schema";

// API key for job queue operations
const JOB_QUEUE_API_KEY = process.env.JOB_QUEUE_API_KEY;

interface EnqueueRequestBody {
  type: JobType;
  name: string;
  payload: unknown;
  priority?: JobPriority;
  scheduledFor?: string; // ISO date string
  maxRetries?: number;
  retryDelay?: number;
  processingTimeout?: number;
  userId?: string;
  referenceId?: string;
  referenceType?: string;
}

export const Route = createFileRoute("/api/jobs/enqueue")({
  server: {
    handlers: {
      /**
       * POST /api/jobs/enqueue
       * Enqueue a new background job
       *
       * Headers:
       * - Authorization: Bearer <API_KEY>
       *
       * Body:
       * - type: JobType (required)
       * - name: string (required)
       * - payload: object (required)
       * - priority: "critical" | "high" | "normal" | "low" (optional)
       * - scheduledFor: ISO date string (optional)
       * - maxRetries: number (optional)
       * - userId: string (optional)
       * - referenceId: string (optional)
       * - referenceType: string (optional)
       *
       * Response:
       * - 200: { success: true, jobId: string }
       * - 400: { error: "Invalid request" }
       * - 401: { error: "Unauthorized" }
       * - 500: { error: "Failed to enqueue job" }
       */
      POST: async ({ request }) => {
        // Verify API key in production
        const authHeader = request.headers.get("Authorization");
        const apiKey = authHeader?.replace("Bearer ", "");

        if (JOB_QUEUE_API_KEY && apiKey !== JOB_QUEUE_API_KEY) {
          console.warn("Unauthorized attempt to enqueue job");
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        try {
          const body = (await request.json()) as EnqueueRequestBody;

          // Validate required fields
          if (!body.type || !body.name || body.payload === undefined) {
            return Response.json(
              { error: "Invalid request: type, name, and payload are required" },
              { status: 400 }
            );
          }

          // Enqueue the job
          const result = await enqueueJob({
            type: body.type,
            name: body.name,
            payload: body.payload,
            priority: body.priority,
            scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : undefined,
            maxRetries: body.maxRetries,
            retryDelay: body.retryDelay,
            processingTimeout: body.processingTimeout,
            userId: body.userId,
            referenceId: body.referenceId,
            referenceType: body.referenceType,
          });

          if (!result.success) {
            return Response.json(
              { error: result.error || "Failed to enqueue job" },
              { status: 500 }
            );
          }

          console.log(`Job enqueued: ${result.jobId} (${body.type})`);

          return Response.json({
            success: true,
            jobId: result.jobId,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error("Error enqueueing job:", error);
          return Response.json(
            {
              error: "Failed to enqueue job",
              message: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
          );
        }
      },
    },
  },
});
