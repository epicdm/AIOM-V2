/**
 * Anomaly Detection Service
 *
 * ML-powered service for detecting unusual patterns in:
 * - Expenses
 * - Transactions
 * - Task completion rates
 * - User behavior
 *
 * This service uses statistical methods (Z-score, IQR, Moving Average)
 * and ML techniques (Isolation Forest) to identify anomalies and generate alerts.
 */

// Export types
export * from "./types";

// Export algorithms
export {
  calculateMean,
  calculateStandardDeviation,
  calculateMedian,
  calculatePercentile,
  calculateIQR,
  calculateStatisticalContext,
  detectWithZScore,
  detectWithIQR,
  detectWithMovingAverage,
  detectWithIsolationForest,
  detectWithEnsemble,
  getDetectionFunction,
} from "./algorithms";

// Export service
export {
  AnomalyDetectionService,
  getAnomalyDetectionService,
  createAnomalyDetectionService,
} from "./service";
