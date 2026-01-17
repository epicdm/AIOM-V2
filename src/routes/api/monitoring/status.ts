/**
 * Proactive Monitoring Status API Route
 *
 * Provides detailed status information about the monitoring system,
 * including health scores for each category and recent alerts.
 */

import { createFileRoute } from "@tanstack/react-router";
import { getProactiveMonitoringService } from "~/lib/proactive-monitoring-engine";

export const Route = createFileRoute("/api/monitoring/status")({
  server: {
    handlers: {
      /**
       * GET /api/monitoring/status
       * Get detailed monitoring status and dashboard data
       *
       * Response:
       * - 200: { overallStatus, overallScore, categories: [...], recentAlerts: [...] }
       */
      GET: async () => {
        try {
          const service = getProactiveMonitoringService();
          const stats = await service.getStats();
          const recentAlerts = service.getRecentAlerts(20);

          // Calculate overall status
          const overallScore = stats.averageHealthScore;
          const overallStatus =
            overallScore >= 80
              ? "healthy"
              : overallScore >= 50
                ? "warning"
                : "critical";

          // Group alerts by category
          const alertsByCategory = new Map<string, number>();
          for (const alert of recentAlerts) {
            if (!alert.resolvedAt) {
              alertsByCategory.set(
                alert.category,
                (alertsByCategory.get(alert.category) || 0) + 1
              );
            }
          }

          return Response.json({
            overallStatus,
            overallScore: Math.round(overallScore),
            lastUpdated: stats.lastProcessedAt?.toISOString() || null,
            isProcessing: stats.isProcessing,
            categories: stats.categoryScores.map((cs) => ({
              category: cs.category,
              status: cs.status,
              score: cs.score,
              activeAlerts: alertsByCategory.get(cs.category) || 0,
            })),
            summary: {
              totalChecksToday: stats.totalChecksToday,
              alertsGeneratedToday: stats.alertsGeneratedToday,
              activeAlerts: recentAlerts.filter((a) => !a.resolvedAt).length,
              acknowledgedAlerts: recentAlerts.filter(
                (a) => a.acknowledgedAt && !a.resolvedAt
              ).length,
            },
            recentAlerts: recentAlerts.map((alert) => ({
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
            })),
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error("Error getting monitoring status:", error);
          return Response.json(
            {
              error: "Failed to get monitoring status",
              message: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
          );
        }
      },
    },
  },
});
