/**
 * Task Reminders Processing API Route
 *
 * This endpoint processes task reminders for all users with reminders enabled.
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
 * - Upcoming reminder timing (hours before deadline)
 * - Overdue reminder frequency
 * - Timezone preference
 * - Quiet hours and working days
 * - Escalation settings
 */

import { createFileRoute } from "@tanstack/react-router";
import {
  processTaskReminders,
  getTaskReminderSchedulerService,
} from "~/lib/task-reminder-scheduler";

// API key for task reminder processing - should be set in environment
const TASK_REMINDER_API_KEY = process.env.TASK_REMINDER_API_KEY;

export const Route = createFileRoute("/api/tasks/reminders")({
  server: {
    handlers: {
      /**
       * POST /api/tasks/reminders
       * Process task reminders for all users with reminders enabled
       *
       * Headers:
       * - Authorization: Bearer <API_KEY>
       *
       * Response:
       * - 200: { success: true, processed: number, remindersSent: number, escalationsSent: number, skipped: number }
       * - 401: { error: "Unauthorized" }
       * - 500: { error: "Processing failed" }
       */
      POST: async ({ request }) => {
        // Verify API key
        const authHeader = request.headers.get("Authorization");
        const apiKey = authHeader?.replace("Bearer ", "");

        // If API key is configured, require it
        // In development (no key set), allow access
        if (TASK_REMINDER_API_KEY && apiKey !== TASK_REMINDER_API_KEY) {
          console.warn("Unauthorized attempt to process task reminders");
          return Response.json(
            { error: "Unauthorized" },
            { status: 401 }
          );
        }

        try {
          console.log("Processing task reminders via API...");
          const result = await processTaskReminders();

          console.log(
            `Task reminders processed: ${result.processed} users, ` +
            `${result.remindersSent} reminders sent, ${result.escalationsSent} escalations, ${result.skipped} skipped`
          );

          // Log errors for debugging
          if (result.errors.length > 0) {
            console.error("Task reminder errors:", result.errors);
          }

          return Response.json({
            success: true,
            processed: result.processed,
            remindersCreated: result.remindersCreated,
            remindersSent: result.remindersSent,
            escalationsSent: result.escalationsSent,
            skipped: result.skipped,
            errors: result.errors.length > 0 ? result.errors : undefined,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error("Error processing task reminders:", error);
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
       * GET /api/tasks/reminders
       * Health check and status endpoint
       *
       * Response:
       * - 200: { status: "ok", service: "task-reminder-scheduler", enabledUsers: number, isProcessing: boolean }
       */
      GET: async () => {
        try {
          const service = getTaskReminderSchedulerService();
          const stats = await service.getSchedulerStats();

          return Response.json({
            status: "ok",
            service: "task-reminder-scheduler",
            enabledUsers: stats.enabledUsers,
            isProcessing: stats.isProcessing,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error("Error getting task reminder scheduler status:", error);
          return Response.json({
            status: "error",
            service: "task-reminder-scheduler",
            error: error instanceof Error ? error.message : "Unknown error",
            timestamp: new Date().toISOString(),
          });
        }
      },
    },
  },
});
