/**
 * Anomaly Detection Analysis API Route
 *
 * Provides REST endpoints for running anomaly analysis:
 * - POST: Analyze a value for anomalies
 * - GET: Get detection statistics and configuration
 */

import { createFileRoute } from "@tanstack/react-router";
import { auth } from "~/utils/auth";
import { nanoid } from "nanoid";
import {
  findMetricDataPoints,
  createAnomalyAlert,
  createMetricDataPoint,
  getAnomalyAlertStats,
  getAnomalyTrend,
} from "~/data-access/anomaly-detection";
import {
  getAnomalyDetectionService,
} from "~/lib/anomaly-detection-service/service";
import type {
  AnomalyCategory,
  AnomalyAlgorithm,
} from "~/lib/anomaly-detection-service/types";
import {
  ANOMALY_CATEGORIES,
  ANOMALY_SEVERITIES,
  ANOMALY_STATUSES,
  ANOMALY_ALGORITHMS,
} from "~/lib/anomaly-detection-service/types";

export const Route = createFileRoute("/api/anomaly-detection/analyze")({
  server: {
    handlers: {
      /**
       * GET /api/anomaly-detection/analyze
       * Get detection statistics and configuration
       *
       * Response:
       * - 200: { stats: {...}, config: {...}, enums: {...} }
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

          const service = getAnomalyDetectionService();
          const serviceStats = service.getStats();
          const config = service.getConfig();

          const [dbStats, trend] = await Promise.all([
            getAnomalyAlertStats(),
            getAnomalyTrend(7),
          ]);

          return Response.json({
            stats: {
              database: dbStats,
              service: {
                isRunning: serviceStats.isRunning,
                lastRunAt: serviceStats.lastRunAt?.toISOString(),
                lastRunDuration: serviceStats.lastRunDuration,
                totalAnomaliesDetected: serviceStats.totalAnomaliesDetected,
                totalAlertsActive: serviceStats.totalAlertsActive,
                totalAlertsPending: serviceStats.totalAlertsPending,
                totalAlertsResolved: serviceStats.totalAlertsResolved,
              },
              trend,
            },
            config: {
              enabled: config.enabled,
              defaultAlgorithm: config.defaultAlgorithm,
              defaultAnalysisWindowDays: config.defaultAnalysisWindowDays,
              minimumDataPoints: config.minimumDataPoints,
              detectionIntervalMinutes: config.detectionIntervalMinutes,
            },
            enums: {
              categories: [...ANOMALY_CATEGORIES],
              severities: [...ANOMALY_SEVERITIES],
              statuses: [...ANOMALY_STATUSES],
              algorithms: [...ANOMALY_ALGORITHMS],
            },
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error("Error getting anomaly stats:", error);
          return Response.json(
            {
              error: "Failed to get statistics",
              message: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
          );
        }
      },

      /**
       * POST /api/anomaly-detection/analyze
       * Analyze a value for anomalies
       *
       * Body:
       * - value: number (required)
       * - category: string (required)
       * - metric: string (required)
       * - algorithm?: string (optional, defaults to ensemble)
       * - entityId?: string (optional)
       * - entityType?: string (optional)
       * - historicalDays?: number (optional, default 30)
       * - recordDataPoint?: boolean (optional, if true, also records the data point)
       *
       * Response:
       * - 200: { isAnomaly: boolean, result?: {...}, alertId?: string }
       * - 400: { error: "Invalid request" }
       * - 401: { error: "Unauthorized" }
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
          const {
            value,
            category,
            metric,
            algorithm,
            entityId,
            entityType,
            historicalDays = 30,
            recordDataPoint = false,
          } = body;

          // Validate required fields
          if (typeof value !== "number") {
            return Response.json(
              { error: "value is required and must be a number" },
              { status: 400 }
            );
          }
          if (!category || !ANOMALY_CATEGORIES.includes(category as AnomalyCategory)) {
            return Response.json(
              { error: `category is required and must be one of: ${ANOMALY_CATEGORIES.join(", ")}` },
              { status: 400 }
            );
          }
          if (!metric || typeof metric !== "string") {
            return Response.json(
              { error: "metric is required and must be a string" },
              { status: 400 }
            );
          }
          if (algorithm && !ANOMALY_ALGORITHMS.includes(algorithm as AnomalyAlgorithm)) {
            return Response.json(
              { error: `algorithm must be one of: ${ANOMALY_ALGORITHMS.join(", ")}` },
              { status: 400 }
            );
          }

          // Record data point if requested
          if (recordDataPoint) {
            await createMetricDataPoint({
              id: `mdp_${nanoid()}`,
              category,
              metricName: metric,
              value,
              entityType,
              entityId,
              timestamp: new Date(),
            });
          }

          // Get historical data points
          const endDate = new Date();
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - historicalDays);

          const historicalData = await findMetricDataPoints(
            category,
            metric,
            startDate,
            endDate,
            entityType,
            entityId
          );

          // Convert to DataPoint format
          const dataPoints = historicalData.map((p) => ({
            timestamp: p.timestamp,
            value: p.value,
            metadata: p.metadata ? JSON.parse(p.metadata) : undefined,
          }));

          // Run analysis
          const service = getAnomalyDetectionService();
          const result = service.analyzeValue(value, dataPoints, {
            category: category as AnomalyCategory,
            metric,
            algorithm: algorithm as AnomalyAlgorithm | undefined,
            entityId,
            entityType,
            userId: session.user.id,
          });

          if (result) {
            // Create alert in database
            const alert = await createAnomalyAlert({
              id: result.id,
              algorithm: result.algorithm,
              category: result.category,
              severity: result.severity,
              status: "detected",
              anomalyScore: result.score,
              confidenceScore: result.confidence,
              title: result.title,
              description: result.description,
              metric: result.metric,
              observedValue: result.observedValue,
              expectedValue: result.expectedValue,
              deviation: result.deviation,
              statisticalContext: JSON.stringify(result.statisticalContext),
              entityId: result.entityId,
              entityType: result.entityType,
              userId: result.userId,
              suggestedActions: JSON.stringify(result.suggestedActions),
              relatedDataPoints: JSON.stringify(result.relatedDataPoints),
              detectedAt: result.detectedAt,
            });

            return Response.json({
              isAnomaly: true,
              result: {
                ...result,
                detectedAt: result.detectedAt.toISOString(),
              },
              alertId: alert.id,
              dataPointsAnalyzed: dataPoints.length,
              timestamp: new Date().toISOString(),
            });
          }

          return Response.json({
            isAnomaly: false,
            result: null,
            alertId: null,
            dataPointsAnalyzed: dataPoints.length,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error("Error analyzing value:", error);
          return Response.json(
            {
              error: "Failed to analyze value",
              message: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
          );
        }
      },
    },
  },
});
