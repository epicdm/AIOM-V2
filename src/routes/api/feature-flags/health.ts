/**
 * Feature Flag Service Health Check API Route
 *
 * Returns the health status of the feature flag service including:
 * - Cache statistics
 * - Connected SSE clients
 * - Service uptime
 *
 * Authentication: None required (for monitoring tools)
 * Method: GET
 */

import { createFileRoute } from "@tanstack/react-router";
import { getFeatureFlagService } from "~/lib/feature-flag-service";

export const Route = createFileRoute("/api/feature-flags/health")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const service = getFeatureFlagService();
          const health = service.getHealthStatus();
          const cacheStats = service.getCacheStats();

          return Response.json({
            status: "ok",
            service: "feature-flag-service",
            timestamp: new Date().toISOString(),
            health: {
              healthy: health.healthy,
              uptime: health.uptime,
              uptimeFormatted: formatUptime(health.uptime),
            },
            cache: {
              size: cacheStats.size,
              hits: cacheStats.hits,
              misses: cacheStats.misses,
              hitRate: `${(cacheStats.hitRate * 100).toFixed(2)}%`,
              evictions: cacheStats.evictions,
            },
            realtime: {
              connectedClients: health.connectedClients,
            },
          });
        } catch (error) {
          console.error("Feature flag health check error:", error);
          return Response.json(
            {
              status: "error",
              service: "feature-flag-service",
              timestamp: new Date().toISOString(),
              error: "Health check failed",
            },
            { status: 500 }
          );
        }
      },
    },
  },
});

/**
 * Format uptime in human-readable format
 */
function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}
