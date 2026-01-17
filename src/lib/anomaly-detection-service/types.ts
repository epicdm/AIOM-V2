/**
 * Anomaly Detection Service Types
 *
 * Type definitions for the ML-powered anomaly detection system.
 * This service uses statistical methods (Z-score, IQR, Moving Average) and
 * ML techniques to detect unusual patterns in expenses, transactions,
 * task completion rates, and user behavior.
 */

// =============================================================================
// Anomaly Detection Algorithm Types
// =============================================================================

export type AnomalyAlgorithm =
  | "zscore" // Z-score based detection (standard deviations from mean)
  | "iqr" // Interquartile Range method (robust to outliers)
  | "moving_average" // Moving average with deviation threshold
  | "isolation_forest" // Isolation Forest (ML-based)
  | "seasonal" // Seasonal decomposition (for time-series)
  | "ensemble"; // Combination of multiple methods

export type AnomalyCategory =
  | "expense" // Expense amount, frequency, patterns
  | "transaction" // Financial transaction patterns
  | "task_completion" // Task completion rate changes
  | "user_behavior" // Login patterns, activity anomalies
  | "system"; // System metrics anomalies

export type AnomalySeverity = "low" | "medium" | "high" | "critical";

export type AnomalyStatus =
  | "detected" // Just detected, pending review
  | "investigating" // Being investigated
  | "confirmed" // Confirmed as actual anomaly
  | "dismissed" // Dismissed as false positive
  | "resolved"; // Issue has been resolved

// =============================================================================
// Data Point Types
// =============================================================================

export interface DataPoint {
  timestamp: Date;
  value: number;
  metadata?: Record<string, unknown>;
}

export interface TimeSeriesData {
  seriesId: string;
  category: AnomalyCategory;
  dataPoints: DataPoint[];
  entityId?: string;
  entityType?: string;
}

// =============================================================================
// Anomaly Detection Result Types
// =============================================================================

export interface AnomalyDetectionResult {
  id: string;
  algorithm: AnomalyAlgorithm;
  category: AnomalyCategory;
  severity: AnomalySeverity;
  score: number; // Anomaly score (0-100, higher = more anomalous)
  confidence: number; // Confidence level (0-1)
  detectedAt: Date;

  // Values
  observedValue: number;
  expectedValue: number;
  deviation: number; // How far from expected (in standard deviations or percentage)

  // Context
  title: string;
  description: string;
  metric: string;

  // Entity information
  entityId?: string;
  entityType?: string;
  userId?: string;

  // Statistical context
  statisticalContext: StatisticalContext;

  // Suggested actions
  suggestedActions: string[];

  // Related data points
  relatedDataPoints?: DataPoint[];
}

export interface StatisticalContext {
  mean: number;
  standardDeviation: number;
  median: number;
  q1: number; // 25th percentile
  q3: number; // 75th percentile
  iqr: number; // Interquartile range
  sampleSize: number;
  windowDays: number; // Analysis window in days
}

// =============================================================================
// Anomaly Alert Types
// =============================================================================

export interface AnomalyAlert {
  id: string;
  detectionResult: AnomalyDetectionResult;
  status: AnomalyStatus;
  category: AnomalyCategory;
  severity: AnomalySeverity;

  // Alert metadata
  title: string;
  message: string;
  data: Record<string, unknown>;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  dismissedAt?: Date;
  dismissedBy?: string;
  dismissalReason?: string;

  // Notifications
  notificationsSent: AlertNotification[];

  // Investigation notes
  notes?: string;
  investigationFindings?: string;
}

export interface AlertNotification {
  userId: string;
  method: "push" | "email" | "in_app";
  sentAt: Date;
  status: "pending" | "sent" | "delivered" | "failed";
  messageId?: string;
  error?: string;
}

// =============================================================================
// Metric Baseline Types
// =============================================================================

export interface MetricBaseline {
  id: string;
  category: AnomalyCategory;
  metricName: string;
  entityId?: string;
  entityType?: string;

  // Statistical baseline
  mean: number;
  standardDeviation: number;
  median: number;
  q1: number;
  q3: number;
  min: number;
  max: number;

  // Seasonal patterns (if applicable)
  dailyPattern?: number[]; // 24 values for hourly pattern
  weeklyPattern?: number[]; // 7 values for daily pattern
  monthlyPattern?: number[]; // 12 values for monthly pattern

  // Thresholds
  warningThreshold: number;
  criticalThreshold: number;

  // Metadata
  sampleSize: number;
  lastUpdated: Date;
  validFrom: Date;
  validUntil: Date;
}

// =============================================================================
// Detection Rule Types
// =============================================================================

export interface DetectionRule {
  id: string;
  name: string;
  description: string;
  category: AnomalyCategory;
  algorithm: AnomalyAlgorithm;
  enabled: boolean;

  // Thresholds
  warningThreshold: number;
  criticalThreshold: number;

  // Algorithm-specific parameters
  parameters: DetectionRuleParameters;

  // Scheduling
  checkIntervalMinutes: number;
  lastChecked?: Date;

  // Actions
  notifyOnSeverity: AnomalySeverity[];
  recipientUserIds: string[];

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface DetectionRuleParameters {
  // Z-score parameters
  zscoreThreshold?: number;

  // IQR parameters
  iqrMultiplier?: number;

  // Moving average parameters
  movingAverageWindow?: number;
  deviationThreshold?: number;

  // Time window
  analysisWindowDays?: number;
  minimumDataPoints?: number;

  // Isolation Forest parameters
  contamination?: number;
  nEstimators?: number;

  // Seasonal parameters
  seasonalPeriod?: number;
}

// =============================================================================
// Detection Run Types
// =============================================================================

export interface DetectionRun {
  id: string;
  startedAt: Date;
  completedAt?: Date;
  duration?: number; // milliseconds
  status: "running" | "completed" | "failed";

  // Results
  rulesExecuted: number;
  dataPointsAnalyzed: number;
  anomaliesDetected: number;
  alertsGenerated: number;

  // Errors
  errors: DetectionError[];
}

export interface DetectionError {
  ruleId?: string;
  category?: AnomalyCategory;
  operation: string;
  message: string;
  timestamp: Date;
}

// =============================================================================
// Service Configuration Types
// =============================================================================

export interface AnomalyDetectionConfig {
  enabled: boolean;

  // Detection settings
  defaultAlgorithm: AnomalyAlgorithm;
  defaultAnalysisWindowDays: number;
  minimumDataPoints: number;

  // Default thresholds
  defaultThresholds: {
    expense: CategoryThreshold;
    transaction: CategoryThreshold;
    task_completion: CategoryThreshold;
    user_behavior: CategoryThreshold;
    system: CategoryThreshold;
  };

  // Scheduling
  detectionIntervalMinutes: number;
  baselineUpdateIntervalHours: number;

  // Notification settings
  quietHours: {
    enabled: boolean;
    start: string; // HH:mm
    end: string; // HH:mm
    timezone: string;
  };

  // Performance settings
  maxConcurrentAnalyses: number;
  batchSize: number;
}

export interface CategoryThreshold {
  warningZScore: number;
  criticalZScore: number;
  warningIqrMultiplier: number;
  criticalIqrMultiplier: number;
  warningDeviationPercent: number;
  criticalDeviationPercent: number;
}

// =============================================================================
// Stats and Dashboard Types
// =============================================================================

export interface AnomalyDetectionStats {
  isRunning: boolean;
  lastRunAt?: Date;
  lastRunDuration?: number;

  // Totals
  totalAnomaliesDetected: number;
  totalAlertsActive: number;
  totalAlertsPending: number;
  totalAlertsResolved: number;

  // By category
  anomaliesByCategory: {
    category: AnomalyCategory;
    count: number;
    pendingCount: number;
  }[];

  // By severity
  anomaliesBySeverity: {
    severity: AnomalySeverity;
    count: number;
  }[];

  // Recent
  recentAnomalies: AnomalyDetectionResult[];
  recentAlerts: AnomalyAlert[];

  // Trends
  detectionTrend: {
    date: string;
    count: number;
  }[];
}

// =============================================================================
// Default Configuration
// =============================================================================

export const DEFAULT_ANOMALY_DETECTION_CONFIG: AnomalyDetectionConfig = {
  enabled: true,

  defaultAlgorithm: "ensemble",
  defaultAnalysisWindowDays: 30,
  minimumDataPoints: 10,

  defaultThresholds: {
    expense: {
      warningZScore: 2.0,
      criticalZScore: 3.0,
      warningIqrMultiplier: 1.5,
      criticalIqrMultiplier: 3.0,
      warningDeviationPercent: 100,
      criticalDeviationPercent: 200,
    },
    transaction: {
      warningZScore: 2.5,
      criticalZScore: 3.5,
      warningIqrMultiplier: 1.5,
      criticalIqrMultiplier: 3.0,
      warningDeviationPercent: 150,
      criticalDeviationPercent: 300,
    },
    task_completion: {
      warningZScore: 2.0,
      criticalZScore: 2.5,
      warningIqrMultiplier: 1.5,
      criticalIqrMultiplier: 2.0,
      warningDeviationPercent: 30,
      criticalDeviationPercent: 50,
    },
    user_behavior: {
      warningZScore: 2.0,
      criticalZScore: 3.0,
      warningIqrMultiplier: 1.5,
      criticalIqrMultiplier: 2.5,
      warningDeviationPercent: 100,
      criticalDeviationPercent: 200,
    },
    system: {
      warningZScore: 2.0,
      criticalZScore: 3.0,
      warningIqrMultiplier: 1.5,
      criticalIqrMultiplier: 2.5,
      warningDeviationPercent: 50,
      criticalDeviationPercent: 100,
    },
  },

  detectionIntervalMinutes: 15,
  baselineUpdateIntervalHours: 24,

  quietHours: {
    enabled: true,
    start: "22:00",
    end: "08:00",
    timezone: "America/New_York",
  },

  maxConcurrentAnalyses: 5,
  batchSize: 100,
};

// =============================================================================
// Algorithm Constants
// =============================================================================

export const ANOMALY_ALGORITHMS: readonly AnomalyAlgorithm[] = [
  "zscore",
  "iqr",
  "moving_average",
  "isolation_forest",
  "seasonal",
  "ensemble",
] as const;

export const ANOMALY_CATEGORIES: readonly AnomalyCategory[] = [
  "expense",
  "transaction",
  "task_completion",
  "user_behavior",
  "system",
] as const;

export const ANOMALY_SEVERITIES: readonly AnomalySeverity[] = [
  "low",
  "medium",
  "high",
  "critical",
] as const;

export const ANOMALY_STATUSES: readonly AnomalyStatus[] = [
  "detected",
  "investigating",
  "confirmed",
  "dismissed",
  "resolved",
] as const;
