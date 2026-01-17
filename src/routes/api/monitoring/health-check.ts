/**
 * Proactive Monitoring Health Check API Route
 *
 * This endpoint runs health checks across all monitored categories and generates
 * alerts for anomalies. It should be called by a cron job at regular intervals
 * (e.g., every 15 minutes).
 *
 * Security: Protected by a secret API key to prevent unauthorized access.
 *
 * Cron Job Setup Examples:
 * - Vercel Cron: Add to vercel.json with cron schedule
 * - GitHub Actions: Use schedule trigger with curl to POST to this endpoint
 * - External cron service: POST to this endpoint with Authorization header
 *
 * The endpoint monitors:
 * - Tasks: overdue tasks, blocked tasks, assignment imbalance
 * - Expenses: pending approvals, missing receipts, unusual amounts
 * - Financial: AR/AP aging, overdue invoices
 * - Customer Issues: unresolved escalations, missed follow-ups
 * - Team Capacity: overloaded/underutilized team members
 */

import { createFileRoute } from "@tanstack/react-router";
import {
  runProactiveHealthChecks,
  getProactiveMonitoringService,
} from "~/lib/proactive-monitoring-engine";

// API key for monitoring - should be set in environment
const PROACTIVE_MONITORING_API_KEY = process.env.PROACTIVE_MONITORING_API_KEY;

export const Route = createFileRoute("/api/monitoring/health-check")({
  server: {
    handlers: {
      /**
       * POST /api/monitoring/health-check
       * Run all health checks and generate alerts
       *
       * Headers:
       * - Authorization: Bearer <API_KEY>
       *
       * Response:
       * - 200: { success: true, healthChecks: [...], alertsGenerated: number, notificationsSent: number }
       * - 401: { error: "Unauthorized" }
       * - 500: { error: "Health check failed" }
       */
      POST: async ({ request }) => {
        // Verify API key
        const authHeader = request.headers.get("Authorization");
        const apiKey = authHeader?.replace("Bearer ", "");

        // If API key is configured, require it
        // In development (no key set), allow access
        if (PROACTIVE_MONITORING_API_KEY && apiKey !== PROACTIVE_MONITORING_API_KEY) {
          console.warn("Unauthorized attempt to run proactive monitoring health checks");
          return Response.json(
            { error: "Unauthorized" },
            { status: 401 }
          );
        }

        try {
          console.log("Running proactive health checks via API...");
          const result = await runProactiveHealthChecks();

          console.log(
            `Health checks complete: ${result.healthChecks.length} categories, ` +
            `${result.alertsGenerated} alerts, ${result.notificationsSent} notifications, ` +
            `${result.duration}ms`
          );

          // Log errors for debugging
          if (result.errors.length > 0) {
            console.error("Health check errors:", result.errors);
          }

          return Response.json({
            success: true,
            timestamp: result.timestamp.toISOString(),
            duration: result.duration,
            healthChecks: result.healthChecks.map((hc) => ({
              category: hc.category,
              status: hc.status,
              score: hc.score,
              metricsCount: hc.metrics.length,
              anomaliesCount: hc.anomalies.length,
              lastChecked: hc.lastChecked.toISOString(),
            })),
            alertsGenerated: result.alertsGenerated,
            notificationsSent: result.notificationsSent,
            errors: result.errors.length > 0 ? result.errors : undefined,
          });
        } catch (error) {
          console.error("Error running proactive health checks:", error);
          return Response.json(
            {
              error: "Health check failed",
              message: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
          );
        }
      },

      /**
       * GET /api/monitoring/health-check
       * Get current health status and statistics
       *
       * Response:
       * - 200: { status: "ok", stats: {...}, recentAlerts: [...] }
       */
      GET: async () => {
        try {
          const service = getProactiveMonitoringService();
          const stats = await service.getStats();
          const recentAlerts = service.getRecentAlerts(10);

          return Response.json({
            status: "ok",
            service: "proactive-monitoring-engine",
            stats: {
              isProcessing: stats.isProcessing,
              lastProcessedAt: stats.lastProcessedAt?.toISOString(),
              totalChecksToday: stats.totalChecksToday,
              alertsGeneratedToday: stats.alertsGeneratedToday,
              averageHealthScore: Math.round(stats.averageHealthScore),
              categoryScores: stats.categoryScores,
            },
            recentAlerts: recentAlerts.map((alert) => ({
              id: alert.id,
              type: alert.type,
              severity: alert.severity,
              category: alert.category,
              title: alert.title,
              message: alert.message,
              createdAt: alert.createdAt.toISOString(),
              acknowledgedAt: alert.acknowledgedAt?.toISOString(),
              resolvedAt: alert.resolvedAt?.toISOString(),
            })),
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error("Error getting monitoring status:", error);
          return Response.json({
            status: "error",
            service: "proactive-monitoring-engine",
            error: error instanceof Error ? error.message : "Unknown error",
            timestamp: new Date().toISOString(),
          });
        }
      },
    },
  },
});
