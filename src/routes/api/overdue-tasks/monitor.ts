/**
 * Overdue Task Monitor Processing API Route
 *
 * This endpoint monitors overdue tasks and triggers escalation notifications
 * through configurable rules and supervisor alerts. It should be called by a
 * cron job or scheduler at regular intervals (e.g., every 15 minutes).
 *
 * Security: Protected by a secret API key to prevent unauthorized access.
 *
 * Cron Job Setup Examples:
 * - Vercel Cron: Add to vercel.json with cron schedule every 15 minutes
 * - GitHub Actions: Use schedule trigger with curl to POST to this endpoint
 * - External cron service: POST to this endpoint with Authorization header
 *
 * The endpoint monitors:
 * - Overdue tasks based on configurable escalation rules
 * - Tasks requiring supervisor escalation
 * - Critical tasks needing immediate attention
 */

import { createFileRoute } from "@tanstack/react-router";
import {
  processOverdueTasks,
  getOverdueTaskMonitorService,
  type MonitorConfig,
  DEFAULT_ESCALATION_RULES,
} from "~/lib/overdue-task-monitor";

// API key for overdue task monitor processing - should be set in environment
const OVERDUE_TASK_MONITOR_API_KEY = process.env.OVERDUE_TASK_MONITOR_API_KEY;

export const Route = createFileRoute("/api/overdue-tasks/monitor")({
  server: {
    handlers: {
      /**
       * POST /api/overdue-tasks/monitor
       * Process overdue task monitoring and send escalation notifications
       *
       * Headers:
       * - Authorization: Bearer <API_KEY>
       *
       * Body (optional):
       * - highPriorityOnly: boolean - Only process high priority tasks
       * - projectIds: number[] - Filter to specific projects
       * - maxTasksPerRun: number - Maximum tasks to process
       *
       * Response:
       * - 200: { success: true, processed: number, overdueTasksFound: number, ... }
       * - 401: { error: "Unauthorized" }
       * - 500: { error: "Processing failed" }
       */
      POST: async ({ request }) => {
        // Verify API key
        const authHeader = request.headers.get("Authorization");
        const apiKey = authHeader?.replace("Bearer ", "");

        // If API key is configured, require it
        // In development (no key set), allow access
        if (OVERDUE_TASK_MONITOR_API_KEY && apiKey !== OVERDUE_TASK_MONITOR_API_KEY) {
          console.warn("Unauthorized attempt to process overdue task monitor");
          return Response.json(
            { error: "Unauthorized" },
            { status: 401 }
          );
        }

        try {
          console.log("Processing overdue task monitor via API...");

          // Parse optional config from request body
          let config: MonitorConfig | undefined;
          try {
            const body = await request.json();
            if (body && typeof body === "object") {
              config = {
                highPriorityOnly: body.highPriorityOnly,
                projectIds: body.projectIds,
                maxTasksPerRun: body.maxTasksPerRun,
              };
            }
          } catch {
            // No body or invalid JSON, use defaults
          }

          const result = await processOverdueTasks(config);

          console.log(
            `Overdue task monitor processed: ${result.processed} users, ` +
            `${result.overdueTasksFound} overdue tasks, ` +
            `${result.assigneeNotificationsSent} assignee notifications, ` +
            `${result.supervisorAlertsSent} supervisor alerts, ` +
            `${result.skipped} skipped`
          );

          // Log errors for debugging
          if (result.errors.length > 0) {
            console.error("Overdue task monitor errors:", result.errors);
          }

          return Response.json({
            success: true,
            processed: result.processed,
            overdueTasksFound: result.overdueTasksFound,
            assigneeNotificationsSent: result.assigneeNotificationsSent,
            supervisorAlertsSent: result.supervisorAlertsSent,
            skipped: result.skipped,
            errors: result.errors.length > 0 ? result.errors : undefined,
            timestamp: result.processedAt.toISOString(),
          });
        } catch (error) {
          console.error("Error processing overdue task monitor:", error);
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
       * GET /api/overdue-tasks/monitor
       * Health check and status endpoint
       *
       * Query Parameters:
       * - includeRules: boolean (default: false) - Include escalation rules in response
       *
       * Response:
       * - 200: { status: "ok", service: "overdue-task-monitor", ... }
       */
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const includeRules = url.searchParams.get("includeRules") === "true";

          const service = getOverdueTaskMonitorService();
          const stats = await service.getStats();

          const response: Record<string, unknown> = {
            status: "ok",
            service: "overdue-task-monitor",
            enabledUsers: stats.enabledUsers,
            currentOverdueTasks: stats.currentOverdueTasks,
            criticalTasks: stats.criticalTasks,
            isProcessing: stats.isProcessing,
            lastProcessedAt: stats.lastProcessedAt?.toISOString() || null,
            timestamp: new Date().toISOString(),
          };

          if (includeRules) {
            response.escalationRules = service.getEscalationRules();
          }

          return Response.json(response);
        } catch (error) {
          console.error("Error getting overdue task monitor status:", error);
          return Response.json({
            status: "error",
            service: "overdue-task-monitor",
            error: error instanceof Error ? error.message : "Unknown error",
            timestamp: new Date().toISOString(),
          });
        }
      },

      /**
       * PUT /api/overdue-tasks/monitor
       * Update escalation rules configuration
       *
       * Headers:
       * - Authorization: Bearer <API_KEY>
       *
       * Body:
       * - escalationRules: EscalationRule[] - Custom escalation rules
       *
       * Response:
       * - 200: { success: true, rules: EscalationRule[] }
       * - 401: { error: "Unauthorized" }
       * - 400: { error: "Invalid request body" }
       */
      PUT: async ({ request }) => {
        // Verify API key
        const authHeader = request.headers.get("Authorization");
        const apiKey = authHeader?.replace("Bearer ", "");

        if (OVERDUE_TASK_MONITOR_API_KEY && apiKey !== OVERDUE_TASK_MONITOR_API_KEY) {
          console.warn("Unauthorized attempt to update escalation rules");
          return Response.json(
            { error: "Unauthorized" },
            { status: 401 }
          );
        }

        try {
          const body = await request.json();

          if (!body || !body.escalationRules || !Array.isArray(body.escalationRules)) {
            return Response.json(
              { error: "Invalid request body", message: "escalationRules array is required" },
              { status: 400 }
            );
          }

          // Validate escalation rules
          for (const rule of body.escalationRules) {
            if (!rule.id || !rule.name || typeof rule.hoursOverdueThreshold !== "number") {
              return Response.json(
                { error: "Invalid escalation rule", message: "Each rule must have id, name, and hoursOverdueThreshold" },
                { status: 400 }
              );
            }
          }

          const service = getOverdueTaskMonitorService();
          service.setEscalationRules(body.escalationRules);

          return Response.json({
            success: true,
            rules: service.getEscalationRules(),
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error("Error updating escalation rules:", error);
          return Response.json(
            {
              error: "Failed to update rules",
              message: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
          );
        }
      },

      /**
       * DELETE /api/overdue-tasks/monitor
       * Reset escalation rules to defaults
       *
       * Headers:
       * - Authorization: Bearer <API_KEY>
       *
       * Response:
       * - 200: { success: true, rules: EscalationRule[] }
       * - 401: { error: "Unauthorized" }
       */
      DELETE: async ({ request }) => {
        // Verify API key
        const authHeader = request.headers.get("Authorization");
        const apiKey = authHeader?.replace("Bearer ", "");

        if (OVERDUE_TASK_MONITOR_API_KEY && apiKey !== OVERDUE_TASK_MONITOR_API_KEY) {
          console.warn("Unauthorized attempt to reset escalation rules");
          return Response.json(
            { error: "Unauthorized" },
            { status: 401 }
          );
        }

        try {
          const service = getOverdueTaskMonitorService();
          service.setEscalationRules(DEFAULT_ESCALATION_RULES);

          return Response.json({
            success: true,
            message: "Escalation rules reset to defaults",
            rules: service.getEscalationRules(),
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error("Error resetting escalation rules:", error);
          return Response.json(
            {
              error: "Failed to reset rules",
              message: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
          );
        }
      },
    },
  },
});
