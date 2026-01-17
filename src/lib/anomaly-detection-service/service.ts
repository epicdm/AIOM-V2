/**
 * Anomaly Detection Service
 *
 * ML-powered service for detecting unusual patterns in expenses, transactions,
 * task completion rates, and user behavior with alert generation.
 */

import { nanoid } from "nanoid";
import type {
  AnomalyAlgorithm,
  AnomalyCategory,
  AnomalySeverity,
  AnomalyStatus,
  AnomalyDetectionResult,
  AnomalyAlert,
  AlertNotification,
  DataPoint,
  TimeSeriesData,
  StatisticalContext,
  AnomalyDetectionConfig,
  AnomalyDetectionStats,
  DetectionRun,
  DetectionError,
  CategoryThreshold,
} from "./types";
import {
  DEFAULT_ANOMALY_DETECTION_CONFIG,
} from "./types";
import {
  calculateStatisticalContext,
  detectWithEnsemble,
  detectWithZScore,
  detectWithIQR,
  detectWithMovingAverage,
  detectWithIsolationForest,
  getDetectionFunction,
} from "./algorithms";

// =============================================================================
// Anomaly Detection Service Class
// =============================================================================

export class AnomalyDetectionService {
  private config: AnomalyDetectionConfig;
  private isRunning = false;
  private lastRunAt?: Date;
  private lastRunDuration?: number;
  private alertHistory: AnomalyAlert[] = [];
  private detectionHistory: AnomalyDetectionResult[] = [];
  private runHistory: DetectionRun[] = [];

  constructor(config?: Partial<AnomalyDetectionConfig>) {
    this.config = {
      ...DEFAULT_ANOMALY_DETECTION_CONFIG,
      ...config,
      defaultThresholds: {
        ...DEFAULT_ANOMALY_DETECTION_CONFIG.defaultThresholds,
        ...(config?.defaultThresholds || {}),
      },
    };
  }

  // ===========================================================================
  // Core Detection Methods
  // ===========================================================================

  /**
   * Analyze a single value against historical data
   */
  analyzeValue(
    value: number,
    historicalData: DataPoint[],
    options: {
      category: AnomalyCategory;
      metric: string;
      algorithm?: AnomalyAlgorithm;
      entityId?: string;
      entityType?: string;
      userId?: string;
    }
  ): AnomalyDetectionResult | null {
    if (!this.config.enabled) {
      return null;
    }

    if (historicalData.length < this.config.minimumDataPoints) {
      console.log(
        `Insufficient data points for anomaly detection: ${historicalData.length} < ${this.config.minimumDataPoints}`
      );
      return null;
    }

    const algorithm = options.algorithm || this.config.defaultAlgorithm;
    const thresholds = this.config.defaultThresholds[options.category];
    const statisticalContext = calculateStatisticalContext(
      historicalData,
      this.config.defaultAnalysisWindowDays
    );

    // Run detection
    let detectionResult: {
      isAnomaly: boolean;
      score: number;
      severity: AnomalySeverity;
      confidence: number;
    };

    switch (algorithm) {
      case "zscore": {
        const result = detectWithZScore(value, historicalData, thresholds);
        detectionResult = {
          isAnomaly: result.isAnomaly,
          score: Math.min(100, result.zScore * 20),
          severity: result.severity,
          confidence: result.confidence,
        };
        break;
      }
      case "iqr": {
        const result = detectWithIQR(value, historicalData, thresholds);
        detectionResult = {
          isAnomaly: result.isAnomaly,
          score: Math.min(100, result.iqrScore * 20),
          severity: result.severity,
          confidence: result.confidence,
        };
        break;
      }
      case "moving_average": {
        const result = detectWithMovingAverage(value, historicalData, thresholds);
        detectionResult = {
          isAnomaly: result.isAnomaly,
          score: Math.min(100, result.deviationPercent / 2),
          severity: result.severity,
          confidence: result.confidence,
        };
        break;
      }
      case "isolation_forest": {
        const result = detectWithIsolationForest(value, historicalData);
        detectionResult = {
          isAnomaly: result.isAnomaly,
          score: result.isolationScore * 100,
          severity: result.severity,
          confidence: result.confidence,
        };
        break;
      }
      case "ensemble":
      default: {
        const result = detectWithEnsemble(value, historicalData, thresholds);
        detectionResult = {
          isAnomaly: result.isAnomaly,
          score: result.ensembleScore,
          severity: result.severity,
          confidence: result.confidence,
        };
        break;
      }
    }

    if (!detectionResult.isAnomaly) {
      return null;
    }

    // Create detection result
    const result: AnomalyDetectionResult = {
      id: nanoid(),
      algorithm,
      category: options.category,
      severity: detectionResult.severity,
      score: detectionResult.score,
      confidence: detectionResult.confidence,
      detectedAt: new Date(),
      observedValue: value,
      expectedValue: statisticalContext.mean,
      deviation:
        statisticalContext.standardDeviation > 0
          ? (value - statisticalContext.mean) / statisticalContext.standardDeviation
          : 0,
      title: this.generateTitle(options.category, options.metric, detectionResult.severity),
      description: this.generateDescription(
        options.category,
        options.metric,
        value,
        statisticalContext.mean,
        detectionResult.severity
      ),
      metric: options.metric,
      entityId: options.entityId,
      entityType: options.entityType,
      userId: options.userId,
      statisticalContext,
      suggestedActions: this.generateSuggestedActions(
        options.category,
        detectionResult.severity
      ),
      relatedDataPoints: historicalData.slice(-10), // Last 10 points for context
    };

    this.detectionHistory.push(result);
    return result;
  }

  /**
   * Analyze a time series dataset
   */
  analyzeTimeSeries(timeSeries: TimeSeriesData): AnomalyDetectionResult[] {
    const results: AnomalyDetectionResult[] = [];

    if (timeSeries.dataPoints.length < this.config.minimumDataPoints + 1) {
      return results;
    }

    // Analyze the most recent data point against historical data
    const sortedPoints = [...timeSeries.dataPoints].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    const latestPoint = sortedPoints[0];
    const historicalPoints = sortedPoints.slice(1);

    const result = this.analyzeValue(latestPoint.value, historicalPoints, {
      category: timeSeries.category,
      metric: timeSeries.seriesId,
      entityId: timeSeries.entityId,
      entityType: timeSeries.entityType,
    });

    if (result) {
      results.push(result);
    }

    return results;
  }

  /**
   * Batch analyze multiple time series
   */
  async batchAnalyze(
    timeSeriesList: TimeSeriesData[]
  ): Promise<{ results: AnomalyDetectionResult[]; run: DetectionRun }> {
    const runId = nanoid();
    const startedAt = new Date();
    const errors: DetectionError[] = [];
    const allResults: AnomalyDetectionResult[] = [];
    let dataPointsAnalyzed = 0;

    this.isRunning = true;

    try {
      for (const timeSeries of timeSeriesList) {
        try {
          const results = this.analyzeTimeSeries(timeSeries);
          allResults.push(...results);
          dataPointsAnalyzed += timeSeries.dataPoints.length;
        } catch (error) {
          errors.push({
            category: timeSeries.category,
            operation: "analyze_time_series",
            message: error instanceof Error ? error.message : "Unknown error",
            timestamp: new Date(),
          });
        }
      }

      const completedAt = new Date();
      const run: DetectionRun = {
        id: runId,
        startedAt,
        completedAt,
        duration: completedAt.getTime() - startedAt.getTime(),
        status: "completed",
        rulesExecuted: timeSeriesList.length,
        dataPointsAnalyzed,
        anomaliesDetected: allResults.length,
        alertsGenerated: 0, // Will be updated after alert creation
        errors,
      };

      this.runHistory.push(run);
      this.lastRunAt = completedAt;
      this.lastRunDuration = run.duration;

      return { results: allResults, run };
    } finally {
      this.isRunning = false;
    }
  }

  // ===========================================================================
  // Alert Management
  // ===========================================================================

  /**
   * Create an alert from a detection result
   */
  createAlert(detectionResult: AnomalyDetectionResult): AnomalyAlert {
    const alert: AnomalyAlert = {
      id: nanoid(),
      detectionResult,
      status: "detected",
      category: detectionResult.category,
      severity: detectionResult.severity,
      title: detectionResult.title,
      message: detectionResult.description,
      data: {
        metric: detectionResult.metric,
        observedValue: detectionResult.observedValue,
        expectedValue: detectionResult.expectedValue,
        deviation: detectionResult.deviation,
        score: detectionResult.score,
        confidence: detectionResult.confidence,
        statisticalContext: detectionResult.statisticalContext,
        suggestedActions: detectionResult.suggestedActions,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      notificationsSent: [],
    };

    this.alertHistory.push(alert);
    return alert;
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string, userId: string): boolean {
    const alert = this.alertHistory.find((a) => a.id === alertId);
    if (!alert) return false;

    alert.acknowledgedAt = new Date();
    alert.acknowledgedBy = userId;
    alert.status = "investigating";
    alert.updatedAt = new Date();
    return true;
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string, userId: string, findings?: string): boolean {
    const alert = this.alertHistory.find((a) => a.id === alertId);
    if (!alert) return false;

    alert.resolvedAt = new Date();
    alert.resolvedBy = userId;
    alert.status = "resolved";
    alert.investigationFindings = findings;
    alert.updatedAt = new Date();
    return true;
  }

  /**
   * Dismiss an alert as false positive
   */
  dismissAlert(alertId: string, userId: string, reason: string): boolean {
    const alert = this.alertHistory.find((a) => a.id === alertId);
    if (!alert) return false;

    alert.dismissedAt = new Date();
    alert.dismissedBy = userId;
    alert.dismissalReason = reason;
    alert.status = "dismissed";
    alert.updatedAt = new Date();
    return true;
  }

  /**
   * Confirm an alert as a true anomaly
   */
  confirmAlert(alertId: string, notes?: string): boolean {
    const alert = this.alertHistory.find((a) => a.id === alertId);
    if (!alert) return false;

    alert.status = "confirmed";
    alert.notes = notes;
    alert.updatedAt = new Date();
    return true;
  }

  /**
   * Add a notification record to an alert
   */
  addNotificationRecord(alertId: string, notification: AlertNotification): boolean {
    const alert = this.alertHistory.find((a) => a.id === alertId);
    if (!alert) return false;

    alert.notificationsSent.push(notification);
    alert.updatedAt = new Date();
    return true;
  }

  // ===========================================================================
  // Data Retrieval Methods
  // ===========================================================================

  /**
   * Get recent alerts
   */
  getRecentAlerts(
    limit: number = 20,
    filters?: {
      category?: AnomalyCategory;
      severity?: AnomalySeverity;
      status?: AnomalyStatus;
    }
  ): AnomalyAlert[] {
    let alerts = [...this.alertHistory];

    if (filters?.category) {
      alerts = alerts.filter((a) => a.category === filters.category);
    }
    if (filters?.severity) {
      alerts = alerts.filter((a) => a.severity === filters.severity);
    }
    if (filters?.status) {
      alerts = alerts.filter((a) => a.status === filters.status);
    }

    return alerts
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  /**
   * Get alert by ID
   */
  getAlert(alertId: string): AnomalyAlert | undefined {
    return this.alertHistory.find((a) => a.id === alertId);
  }

  /**
   * Get recent detection results
   */
  getRecentDetections(limit: number = 20): AnomalyDetectionResult[] {
    return [...this.detectionHistory]
      .sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime())
      .slice(0, limit);
  }

  /**
   * Get service statistics
   */
  getStats(): AnomalyDetectionStats {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const todayAlerts = this.alertHistory.filter((a) => a.createdAt >= todayStart);
    const pendingAlerts = this.alertHistory.filter(
      (a) => a.status === "detected" || a.status === "investigating"
    );
    const resolvedAlerts = this.alertHistory.filter((a) => a.status === "resolved");

    // Count by category
    const categoryCounts: Record<AnomalyCategory, { count: number; pendingCount: number }> = {
      expense: { count: 0, pendingCount: 0 },
      transaction: { count: 0, pendingCount: 0 },
      task_completion: { count: 0, pendingCount: 0 },
      user_behavior: { count: 0, pendingCount: 0 },
      system: { count: 0, pendingCount: 0 },
    };

    for (const alert of this.alertHistory) {
      categoryCounts[alert.category].count++;
      if (alert.status === "detected" || alert.status === "investigating") {
        categoryCounts[alert.category].pendingCount++;
      }
    }

    // Count by severity
    const severityCounts: Record<AnomalySeverity, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    for (const alert of this.alertHistory) {
      severityCounts[alert.severity]++;
    }

    // Detection trend (last 7 days)
    const trend: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

      const count = this.alertHistory.filter(
        (a) => a.createdAt >= dayStart && a.createdAt < dayEnd
      ).length;

      trend.push({ date: dateStr, count });
    }

    return {
      isRunning: this.isRunning,
      lastRunAt: this.lastRunAt,
      lastRunDuration: this.lastRunDuration,
      totalAnomaliesDetected: this.detectionHistory.length,
      totalAlertsActive: pendingAlerts.length,
      totalAlertsPending: this.alertHistory.filter((a) => a.status === "detected").length,
      totalAlertsResolved: resolvedAlerts.length,
      anomaliesByCategory: Object.entries(categoryCounts).map(([category, counts]) => ({
        category: category as AnomalyCategory,
        count: counts.count,
        pendingCount: counts.pendingCount,
      })),
      anomaliesBySeverity: Object.entries(severityCounts).map(([severity, count]) => ({
        severity: severity as AnomalySeverity,
        count,
      })),
      recentAnomalies: this.getRecentDetections(5),
      recentAlerts: this.getRecentAlerts(5),
      detectionTrend: trend,
    };
  }

  // ===========================================================================
  // Configuration Methods
  // ===========================================================================

  /**
   * Update service configuration
   */
  updateConfig(config: Partial<AnomalyDetectionConfig>): void {
    this.config = {
      ...this.config,
      ...config,
      defaultThresholds: {
        ...this.config.defaultThresholds,
        ...(config.defaultThresholds || {}),
      },
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): AnomalyDetectionConfig {
    return { ...this.config };
  }

  /**
   * Get thresholds for a specific category
   */
  getCategoryThresholds(category: AnomalyCategory): CategoryThreshold {
    return this.config.defaultThresholds[category];
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  /**
   * Generate a title for an anomaly alert
   */
  private generateTitle(
    category: AnomalyCategory,
    metric: string,
    severity: AnomalySeverity
  ): string {
    const severityLabels: Record<AnomalySeverity, string> = {
      low: "Minor",
      medium: "Moderate",
      high: "Significant",
      critical: "Critical",
    };

    const categoryLabels: Record<AnomalyCategory, string> = {
      expense: "Expense",
      transaction: "Transaction",
      task_completion: "Task Completion",
      user_behavior: "User Behavior",
      system: "System",
    };

    return `${severityLabels[severity]} ${categoryLabels[category]} Anomaly: ${metric}`;
  }

  /**
   * Generate a description for an anomaly
   */
  private generateDescription(
    category: AnomalyCategory,
    metric: string,
    observedValue: number,
    expectedValue: number,
    severity: AnomalySeverity
  ): string {
    const percentChange =
      expectedValue !== 0
        ? Math.abs(((observedValue - expectedValue) / expectedValue) * 100).toFixed(1)
        : "N/A";
    const direction = observedValue > expectedValue ? "higher" : "lower";

    const categoryDescriptions: Record<AnomalyCategory, string> = {
      expense: "expense pattern",
      transaction: "transaction pattern",
      task_completion: "task completion rate",
      user_behavior: "user activity pattern",
      system: "system metric",
    };

    return (
      `Detected unusual ${categoryDescriptions[category]} for ${metric}. ` +
      `Observed value (${observedValue.toFixed(2)}) is ${percentChange}% ${direction} ` +
      `than expected (${expectedValue.toFixed(2)}). ` +
      `Severity: ${severity.toUpperCase()}.`
    );
  }

  /**
   * Generate suggested actions based on category and severity
   */
  private generateSuggestedActions(
    category: AnomalyCategory,
    severity: AnomalySeverity
  ): string[] {
    const baseActions: Record<AnomalyCategory, string[]> = {
      expense: [
        "Review the expense details and supporting documentation",
        "Verify the expense against company policy",
        "Contact the expense submitter for clarification",
      ],
      transaction: [
        "Review transaction details and verify authenticity",
        "Check for duplicate transactions",
        "Verify against bank statements",
      ],
      task_completion: [
        "Review task assignments and workload distribution",
        "Check for blockers affecting task completion",
        "Assess team capacity and resource allocation",
      ],
      user_behavior: [
        "Review user activity logs",
        "Verify user identity and access permissions",
        "Check for potential security concerns",
      ],
      system: [
        "Review system logs for errors or issues",
        "Check system performance metrics",
        "Verify infrastructure health",
      ],
    };

    const severityActions: Record<AnomalySeverity, string[]> = {
      low: ["Monitor for continued deviation"],
      medium: ["Investigate within 24 hours"],
      high: ["Investigate immediately", "Notify relevant stakeholders"],
      critical: [
        "Investigate immediately",
        "Escalate to management",
        "Consider temporary restrictions if security-related",
      ],
    };

    return [...baseActions[category], ...severityActions[severity]];
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let anomalyDetectionService: AnomalyDetectionService | null = null;

/**
 * Get the anomaly detection service instance
 */
export function getAnomalyDetectionService(
  config?: Partial<AnomalyDetectionConfig>
): AnomalyDetectionService {
  if (!anomalyDetectionService) {
    anomalyDetectionService = new AnomalyDetectionService(config);
  } else if (config) {
    anomalyDetectionService.updateConfig(config);
  }
  return anomalyDetectionService;
}

/**
 * Create a new anomaly detection service instance (for testing)
 */
export function createAnomalyDetectionService(
  config?: Partial<AnomalyDetectionConfig>
): AnomalyDetectionService {
  return new AnomalyDetectionService(config);
}
