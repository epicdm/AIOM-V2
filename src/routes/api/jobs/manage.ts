/**
 * Job Queue Management API Route
 *
 * POST /api/jobs/manage - Manage jobs (cancel, retry, delete)
 */

import { createFileRoute } from "@tanstack/react-router";
import { cancelJob, retryJob, getJobQueueClient } from "~/lib/job-queue";

// API key for job queue operations
const JOB_QUEUE_API_KEY = process.env.JOB_QUEUE_API_KEY;

type ManageAction = "cancel" | "retry" | "delete";

interface ManageRequestBody {
  action: ManageAction;
  jobId: string;
}

export const Route = createFileRoute("/api/jobs/manage")({
  server: {
    handlers: {
      /**
       * POST /api/jobs/manage
       * Manage a job (cancel, retry, delete)
       *
       * Headers:
       * - Authorization: Bearer <API_KEY>
       *
       * Body:
       * - action: "cancel" | "retry" | "delete" (required)
       * - jobId: string (required)
       *
       * Response:
       * - 200: { success: true, action: string, jobId: string }
       * - 400: { error: "Invalid request" }
       * - 401: { error: "Unauthorized" }
       * - 404: { error: "Job not found or action not applicable" }
       * - 500: { error: "Failed to manage job" }
       */
      POST: async ({ request }) => {
        // Verify API key
        const authHeader = request.headers.get("Authorization");
        const apiKey = authHeader?.replace("Bearer ", "");

        if (JOB_QUEUE_API_KEY && apiKey !== JOB_QUEUE_API_KEY) {
          console.warn("Unauthorized attempt to manage job");
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        try {
          const body = (await request.json()) as ManageRequestBody;

          // Validate required fields
          if (!body.action || !body.jobId) {
            return Response.json(
              { error: "Invalid request: action and jobId are required" },
              { status: 400 }
            );
          }

          // Validate action
          const validActions: ManageAction[] = ["cancel", "retry", "delete"];
          if (!validActions.includes(body.action)) {
            return Response.json(
              {
                error: `Invalid action: must be one of ${validActions.join(", ")}`,
              },
              { status: 400 }
            );
          }

          let success = false;

          switch (body.action) {
            case "cancel":
              success = await cancelJob(body.jobId);
              break;

            case "retry":
              success = await retryJob(body.jobId);
              break;

            case "delete": {
              const client = getJobQueueClient();
              success = await client.deleteJob(body.jobId);
              break;
            }
          }

          if (!success) {
            return Response.json(
              {
                error: "Job not found or action not applicable",
                details: `The ${body.action} action could not be performed on job ${body.jobId}`,
              },
              { status: 404 }
            );
          }

          console.log(`Job ${body.action}ed: ${body.jobId}`);

          return Response.json({
            success: true,
            action: body.action,
            jobId: body.jobId,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error("Error managing job:", error);
          return Response.json(
            {
              error: "Failed to manage job",
              message: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
          );
        }
      },
    },
  },
});
