/**
 * Anomaly Detection Alerts API Route
 *
 * Provides REST endpoints for managing anomaly alerts:
 * - GET: List alerts with filters
 * - POST: Manage alert status (acknowledge, resolve, dismiss, confirm)
 */

import { createFileRoute } from "@tanstack/react-router";
import { auth } from "~/utils/auth";
import {
  findAnomalyAlerts,
  findAnomalyAlertById,
  acknowledgeAnomalyAlert,
  resolveAnomalyAlert,
  dismissAnomalyAlert,
  confirmAnomalyAlert,
  getAnomalyAlertStats,
  type AnomalyAlertFilters,
} from "~/data-access/anomaly-detection";

export const Route = createFileRoute("/api/anomaly-detection/alerts")({
  server: {
    handlers: {
      /**
       * GET /api/anomaly-detection/alerts
       * List anomaly alerts with optional filters
       *
       * Query params:
       * - category: string (expense, transaction, task_completion, user_behavior, system)
       * - severity: string (low, medium, high, critical)
       * - status: string (detected, investigating, confirmed, dismissed, resolved)
       * - limit: number (default 50, max 100)
       * - offset: number (default 0)
       *
       * Response:
       * - 200: { alerts: [...], total: number, stats: {...} }
       * - 401: { error: "Unauthorized" }
       */
      GET: async ({ request }) => {
        try {
          // Authenticate request
          const session = await auth.api.getSession({ headers: request.headers });
          if (!session) {
            return Response.json(
              { error: "Unauthorized" },
              { status: 401 }
            );
          }

          const url = new URL(request.url);
          const category = url.searchParams.get("category") || undefined;
          const severity = url.searchParams.get("severity") || undefined;
          const status = url.searchParams.get("status") || undefined;
          const userId = url.searchParams.get("userId") || undefined;
          const entityType = url.searchParams.get("entityType") || undefined;
          const entityId = url.searchParams.get("entityId") || undefined;
          const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 100);
          const offset = parseInt(url.searchParams.get("offset") || "0", 10);

          const filters: AnomalyAlertFilters = {
            category,
            severity,
            status,
            userId,
            entityType,
            entityId,
          };

          const [alerts, stats] = await Promise.all([
            findAnomalyAlerts(filters, limit, offset),
            getAnomalyAlertStats(),
          ]);

          return Response.json({
            alerts: alerts.map((alert) => ({
              ...alert,
              statisticalContext: alert.statisticalContext
                ? JSON.parse(alert.statisticalContext)
                : null,
              suggestedActions: alert.suggestedActions
                ? JSON.parse(alert.suggestedActions)
                : [],
              relatedDataPoints: alert.relatedDataPoints
                ? JSON.parse(alert.relatedDataPoints)
                : [],
              notificationsSent: alert.notificationsSent
                ? JSON.parse(alert.notificationsSent)
                : [],
            })),
            total: stats.total,
            stats: {
              byStatus: stats.byStatus,
              byCategory: stats.byCategory,
              bySeverity: stats.bySeverity,
              todayCount: stats.todayCount,
              weekCount: stats.weekCount,
            },
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error("Error getting anomaly alerts:", error);
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
       * POST /api/anomaly-detection/alerts
       * Manage alert status
       *
       * Body:
       * - alertId: string (required)
       * - action: "acknowledge" | "resolve" | "dismiss" | "confirm" (required)
       * - reason?: string (required for dismiss)
       * - findings?: string (optional for resolve)
       * - notes?: string (optional for confirm)
       *
       * Response:
       * - 200: { success: true, alert: {...} }
       * - 400: { error: "Invalid request" }
       * - 401: { error: "Unauthorized" }
       * - 404: { error: "Alert not found" }
       */
      POST: async ({ request }) => {
        try {
          // Authenticate request
          const session = await auth.api.getSession({ headers: request.headers });
          if (!session) {
            return Response.json(
              { error: "Unauthorized" },
              { status: 401 }
            );
          }

          const body = await request.json();
          const { alertId, action, reason, findings, notes } = body;

          if (!alertId || !action) {
            return Response.json(
              { error: "alertId and action are required" },
              { status: 400 }
            );
          }

          const validActions = ["acknowledge", "resolve", "dismiss", "confirm"];
          if (!validActions.includes(action)) {
            return Response.json(
              { error: `action must be one of: ${validActions.join(", ")}` },
              { status: 400 }
            );
          }

          // Verify alert exists
          const existingAlert = await findAnomalyAlertById(alertId);
          if (!existingAlert) {
            return Response.json(
              { error: "Alert not found" },
              { status: 404 }
            );
          }

          let updatedAlert;
          const userId = session.user.id;

          switch (action) {
            case "acknowledge":
              updatedAlert = await acknowledgeAnomalyAlert(alertId, userId);
              break;

            case "resolve":
              updatedAlert = await resolveAnomalyAlert(alertId, userId, findings);
              break;

            case "dismiss":
              if (!reason) {
                return Response.json(
                  { error: "reason is required for dismiss action" },
                  { status: 400 }
                );
              }
              updatedAlert = await dismissAnomalyAlert(alertId, userId, reason);
              break;

            case "confirm":
              updatedAlert = await confirmAnomalyAlert(alertId, notes);
              break;
          }

          if (!updatedAlert) {
            return Response.json(
              { error: "Failed to update alert" },
              { status: 500 }
            );
          }

          return Response.json({
            success: true,
            alert: {
              ...updatedAlert,
              statisticalContext: updatedAlert.statisticalContext
                ? JSON.parse(updatedAlert.statisticalContext)
                : null,
              suggestedActions: updatedAlert.suggestedActions
                ? JSON.parse(updatedAlert.suggestedActions)
                : [],
            },
            action,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error("Error updating anomaly alert:", error);
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
