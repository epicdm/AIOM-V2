/**
 * Proactive Monitoring Alerts API Route
 *
 * Provides endpoints for managing monitoring alerts:
 * - List recent alerts
 * - Acknowledge alerts
 * - Resolve alerts
 */

import { createFileRoute } from "@tanstack/react-router";
import { getProactiveMonitoringService } from "~/lib/proactive-monitoring-engine";

export const Route = createFileRoute("/api/monitoring/alerts")({
  server: {
    handlers: {
      /**
       * GET /api/monitoring/alerts
       * List recent alerts with optional filters
       *
       * Query params:
       * - limit: number (default 50)
       * - category: string (optional filter)
       * - severity: string (optional filter)
       * - unresolved: boolean (optional, only unresolved alerts)
       *
       * Response:
       * - 200: { alerts: [...], total: number }
       */
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const limit = parseInt(url.searchParams.get("limit") || "50", 10);
          const category = url.searchParams.get("category");
          const severity = url.searchParams.get("severity");
          const unresolvedOnly = url.searchParams.get("unresolved") === "true";

          const service = getProactiveMonitoringService();
          let alerts = service.getRecentAlerts(100); // Get more than needed for filtering

          // Apply filters
          if (category) {
            alerts = alerts.filter((a) => a.category === category);
          }
          if (severity) {
            alerts = alerts.filter((a) => a.severity === severity);
          }
          if (unresolvedOnly) {
            alerts = alerts.filter((a) => !a.resolvedAt);
          }

          // Apply limit
          const limitedAlerts = alerts.slice(0, limit);

          return Response.json({
            alerts: limitedAlerts.map((alert) => ({
              id: alert.id,
              type: alert.type,
              severity: alert.severity,
              category: alert.category,
              title: alert.title,
              message: alert.message,
              data: alert.data,
              createdAt: alert.createdAt.toISOString(),
              acknowledgedAt: alert.acknowledgedAt?.toISOString(),
              acknowledgedBy: alert.acknowledgedBy,
              resolvedAt: alert.resolvedAt?.toISOString(),
              notificationsSent: alert.notificationsSent.length,
            })),
            total: alerts.length,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error("Error getting monitoring alerts:", error);
          return Response.json(
            {
              error: "Failed to get alerts",
              message: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
          );
        }
      },

      /**
       * POST /api/monitoring/alerts
       * Acknowledge or resolve an alert
       *
       * Body:
       * - alertId: string (required)
       * - action: "acknowledge" | "resolve" (required)
       * - userId: string (required for acknowledge)
       *
       * Response:
       * - 200: { success: true, alertId: string, action: string }
       * - 400: { error: "Invalid request" }
       * - 404: { error: "Alert not found" }
       */
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const { alertId, action, userId } = body;

          if (!alertId || !action) {
            return Response.json(
              { error: "alertId and action are required" },
              { status: 400 }
            );
          }

          if (!["acknowledge", "resolve"].includes(action)) {
            return Response.json(
              { error: "action must be 'acknowledge' or 'resolve'" },
              { status: 400 }
            );
          }

          if (action === "acknowledge" && !userId) {
            return Response.json(
              { error: "userId is required for acknowledge action" },
              { status: 400 }
            );
          }

          const service = getProactiveMonitoringService();
          let success = false;

          if (action === "acknowledge") {
            success = service.acknowledgeAlert(alertId, userId);
          } else if (action === "resolve") {
            success = service.resolveAlert(alertId);
          }

          if (!success) {
            return Response.json(
              { error: "Alert not found" },
              { status: 404 }
            );
          }

          return Response.json({
            success: true,
            alertId,
            action,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error("Error updating alert:", error);
          return Response.json(
            {
              error: "Failed to update alert",
              message: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
          );
        }
      },
    },
  },
});
