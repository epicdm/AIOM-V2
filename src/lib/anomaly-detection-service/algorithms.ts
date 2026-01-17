/**
 * Anomaly Detection Algorithms
 *
 * Statistical and ML-based algorithms for detecting anomalies in time-series data.
 * Implements Z-score, IQR, Moving Average, and ensemble methods.
 */

import type {
  DataPoint,
  StatisticalContext,
  AnomalyAlgorithm,
  AnomalySeverity,
  CategoryThreshold,
} from "./types";

// =============================================================================
// Statistical Utility Functions
// =============================================================================

/**
 * Calculate the mean (average) of an array of numbers
 */
export function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Calculate the standard deviation of an array of numbers
 */
export function calculateStandardDeviation(values: number[], mean?: number): number {
  if (values.length === 0) return 0;
  const avg = mean ?? calculateMean(values);
  const squaredDiffs = values.map((val) => Math.pow(val - avg, 2));
  const avgSquaredDiff = calculateMean(squaredDiffs);
  return Math.sqrt(avgSquaredDiff);
}

/**
 * Calculate the median of an array of numbers
 */
export function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Calculate a specific percentile of an array of numbers
 */
export function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (percentile / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

/**
 * Calculate the Interquartile Range (IQR)
 */
export function calculateIQR(values: number[]): { q1: number; q3: number; iqr: number } {
  const q1 = calculatePercentile(values, 25);
  const q3 = calculatePercentile(values, 75);
  return { q1, q3, iqr: q3 - q1 };
}

/**
 * Calculate full statistical context for a dataset
 */
export function calculateStatisticalContext(
  dataPoints: DataPoint[],
  windowDays: number = 30
): StatisticalContext {
  const values = dataPoints.map((dp) => dp.value);

  if (values.length === 0) {
    return {
      mean: 0,
      standardDeviation: 0,
      median: 0,
      q1: 0,
      q3: 0,
      iqr: 0,
      sampleSize: 0,
      windowDays,
    };
  }

  const mean = calculateMean(values);
  const standardDeviation = calculateStandardDeviation(values, mean);
  const median = calculateMedian(values);
  const { q1, q3, iqr } = calculateIQR(values);

  return {
    mean,
    standardDeviation,
    median,
    q1,
    q3,
    iqr,
    sampleSize: values.length,
    windowDays,
  };
}

// =============================================================================
// Z-Score Detection Algorithm
// =============================================================================

export interface ZScoreResult {
  isAnomaly: boolean;
  zScore: number;
  severity: AnomalySeverity;
  confidence: number;
}

/**
 * Detect anomalies using Z-score method
 * Z-score measures how many standard deviations a value is from the mean
 */
export function detectWithZScore(
  value: number,
  dataPoints: DataPoint[],
  thresholds: CategoryThreshold
): ZScoreResult {
  const values = dataPoints.map((dp) => dp.value);
  const mean = calculateMean(values);
  const stdDev = calculateStandardDeviation(values, mean);

  // Avoid division by zero
  if (stdDev === 0) {
    return {
      isAnomaly: value !== mean,
      zScore: value !== mean ? Infinity : 0,
      severity: value !== mean ? "high" : "low",
      confidence: value !== mean ? 1 : 0,
    };
  }

  const zScore = Math.abs((value - mean) / stdDev);

  let severity: AnomalySeverity = "low";
  let isAnomaly = false;

  if (zScore >= thresholds.criticalZScore) {
    severity = "critical";
    isAnomaly = true;
  } else if (zScore >= thresholds.warningZScore) {
    severity = "high";
    isAnomaly = true;
  } else if (zScore >= thresholds.warningZScore * 0.75) {
    severity = "medium";
    isAnomaly = true;
  } else if (zScore >= thresholds.warningZScore * 0.5) {
    severity = "low";
    // Only flag as anomaly if significantly different
    isAnomaly = zScore >= 1.5;
  }

  // Confidence based on how far above the threshold
  const confidence = Math.min(
    1,
    isAnomaly ? (zScore - thresholds.warningZScore * 0.5) / thresholds.criticalZScore : 0
  );

  return { isAnomaly, zScore, severity, confidence };
}

// =============================================================================
// IQR (Interquartile Range) Detection Algorithm
// =============================================================================

export interface IQRResult {
  isAnomaly: boolean;
  iqrScore: number;
  severity: AnomalySeverity;
  confidence: number;
  lowerBound: number;
  upperBound: number;
}

/**
 * Detect anomalies using IQR method
 * More robust to outliers than Z-score
 */
export function detectWithIQR(
  value: number,
  dataPoints: DataPoint[],
  thresholds: CategoryThreshold
): IQRResult {
  const values = dataPoints.map((dp) => dp.value);
  const { q1, q3, iqr } = calculateIQR(values);

  // Calculate bounds
  const warningLower = q1 - thresholds.warningIqrMultiplier * iqr;
  const warningUpper = q3 + thresholds.warningIqrMultiplier * iqr;
  const criticalLower = q1 - thresholds.criticalIqrMultiplier * iqr;
  const criticalUpper = q3 + thresholds.criticalIqrMultiplier * iqr;

  // Calculate how many IQRs the value is from the bounds
  let iqrScore = 0;
  if (value < q1) {
    iqrScore = (q1 - value) / (iqr || 1);
  } else if (value > q3) {
    iqrScore = (value - q3) / (iqr || 1);
  }

  let severity: AnomalySeverity = "low";
  let isAnomaly = false;

  if (value < criticalLower || value > criticalUpper) {
    severity = "critical";
    isAnomaly = true;
  } else if (value < warningLower || value > warningUpper) {
    severity = "high";
    isAnomaly = true;
  } else if (iqrScore >= thresholds.warningIqrMultiplier * 0.75) {
    severity = "medium";
    isAnomaly = true;
  }

  // Confidence based on distance from bounds
  const confidence = Math.min(1, isAnomaly ? iqrScore / thresholds.criticalIqrMultiplier : 0);

  return {
    isAnomaly,
    iqrScore,
    severity,
    confidence,
    lowerBound: warningLower,
    upperBound: warningUpper,
  };
}

// =============================================================================
// Moving Average Detection Algorithm
// =============================================================================

export interface MovingAverageResult {
  isAnomaly: boolean;
  deviationPercent: number;
  severity: AnomalySeverity;
  confidence: number;
  movingAverage: number;
}

/**
 * Detect anomalies using Moving Average method
 * Good for detecting sudden changes in time-series data
 */
export function detectWithMovingAverage(
  value: number,
  dataPoints: DataPoint[],
  thresholds: CategoryThreshold,
  windowSize: number = 7
): MovingAverageResult {
  // Sort by timestamp and get the most recent windowSize points
  const sorted = [...dataPoints].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  const recentPoints = sorted.slice(0, windowSize);

  if (recentPoints.length === 0) {
    return {
      isAnomaly: false,
      deviationPercent: 0,
      severity: "low",
      confidence: 0,
      movingAverage: value,
    };
  }

  const movingAverage = calculateMean(recentPoints.map((dp) => dp.value));

  // Avoid division by zero
  if (movingAverage === 0) {
    return {
      isAnomaly: value !== 0,
      deviationPercent: value !== 0 ? Infinity : 0,
      severity: value !== 0 ? "high" : "low",
      confidence: value !== 0 ? 1 : 0,
      movingAverage: 0,
    };
  }

  const deviationPercent = Math.abs((value - movingAverage) / movingAverage) * 100;

  let severity: AnomalySeverity = "low";
  let isAnomaly = false;

  if (deviationPercent >= thresholds.criticalDeviationPercent) {
    severity = "critical";
    isAnomaly = true;
  } else if (deviationPercent >= thresholds.warningDeviationPercent) {
    severity = "high";
    isAnomaly = true;
  } else if (deviationPercent >= thresholds.warningDeviationPercent * 0.75) {
    severity = "medium";
    isAnomaly = true;
  } else if (deviationPercent >= thresholds.warningDeviationPercent * 0.5) {
    severity = "low";
    isAnomaly = deviationPercent >= 50; // At least 50% deviation
  }

  const confidence = Math.min(
    1,
    isAnomaly
      ? (deviationPercent - thresholds.warningDeviationPercent * 0.5) /
          thresholds.criticalDeviationPercent
      : 0
  );

  return { isAnomaly, deviationPercent, severity, confidence, movingAverage };
}

// =============================================================================
// Isolation Forest (Simplified Implementation)
// =============================================================================

export interface IsolationForestResult {
  isAnomaly: boolean;
  isolationScore: number; // 0-1, higher = more anomalous
  severity: AnomalySeverity;
  confidence: number;
}

/**
 * Simplified Isolation Forest implementation
 * In a full implementation, this would use actual tree structures
 * This approximation uses path length estimation
 */
export function detectWithIsolationForest(
  value: number,
  dataPoints: DataPoint[],
  contamination: number = 0.1 // Expected proportion of outliers
): IsolationForestResult {
  const values = dataPoints.map((dp) => dp.value);
  const n = values.length;

  if (n < 2) {
    return {
      isAnomaly: false,
      isolationScore: 0,
      severity: "low",
      confidence: 0,
    };
  }

  // Calculate how "isolated" the value is
  // Using a simplified approach based on distance from center
  const mean = calculateMean(values);
  const stdDev = calculateStandardDeviation(values, mean);

  // Estimate path length using distance from mean normalized by std dev
  const normalizedDistance = stdDev > 0 ? Math.abs(value - mean) / stdDev : 0;

  // Convert to isolation score (0-1)
  // Higher score = more isolated = more anomalous
  const isolationScore = 1 - Math.exp(-normalizedDistance / 2);

  // Determine threshold based on contamination parameter
  const threshold = 1 - contamination;

  const isAnomaly = isolationScore > threshold;

  let severity: AnomalySeverity = "low";
  if (isolationScore > 0.95) {
    severity = "critical";
  } else if (isolationScore > 0.85) {
    severity = "high";
  } else if (isolationScore > 0.75) {
    severity = "medium";
  }

  const confidence = isAnomaly ? Math.min(1, (isolationScore - threshold) / (1 - threshold)) : 0;

  return { isAnomaly, isolationScore, severity, confidence };
}

// =============================================================================
// Ensemble Detection (Combines Multiple Methods)
// =============================================================================

export interface EnsembleResult {
  isAnomaly: boolean;
  ensembleScore: number; // 0-100
  severity: AnomalySeverity;
  confidence: number;
  algorithmResults: {
    algorithm: AnomalyAlgorithm;
    isAnomaly: boolean;
    score: number;
    severity: AnomalySeverity;
  }[];
}

/**
 * Ensemble detection combining multiple algorithms
 * Uses weighted voting to determine final result
 */
export function detectWithEnsemble(
  value: number,
  dataPoints: DataPoint[],
  thresholds: CategoryThreshold,
  weights: { zscore: number; iqr: number; movingAverage: number; isolationForest: number } = {
    zscore: 0.3,
    iqr: 0.25,
    movingAverage: 0.25,
    isolationForest: 0.2,
  }
): EnsembleResult {
  // Run all detection algorithms
  const zscoreResult = detectWithZScore(value, dataPoints, thresholds);
  const iqrResult = detectWithIQR(value, dataPoints, thresholds);
  const maResult = detectWithMovingAverage(value, dataPoints, thresholds);
  const ifResult = detectWithIsolationForest(value, dataPoints);

  const algorithmResults: EnsembleResult["algorithmResults"] = [
    {
      algorithm: "zscore",
      isAnomaly: zscoreResult.isAnomaly,
      score: zscoreResult.zScore * 20, // Normalize to ~0-100 scale
      severity: zscoreResult.severity,
    },
    {
      algorithm: "iqr",
      isAnomaly: iqrResult.isAnomaly,
      score: iqrResult.iqrScore * 20,
      severity: iqrResult.severity,
    },
    {
      algorithm: "moving_average",
      isAnomaly: maResult.isAnomaly,
      score: maResult.deviationPercent / 2, // Already 0-100+
      severity: maResult.severity,
    },
    {
      algorithm: "isolation_forest",
      isAnomaly: ifResult.isAnomaly,
      score: ifResult.isolationScore * 100,
      severity: ifResult.severity,
    },
  ];

  // Calculate weighted ensemble score
  const ensembleScore =
    weights.zscore * algorithmResults[0].score +
    weights.iqr * algorithmResults[1].score +
    weights.movingAverage * algorithmResults[2].score +
    weights.isolationForest * algorithmResults[3].score;

  // Count anomaly votes with weights
  const anomalyWeight =
    (zscoreResult.isAnomaly ? weights.zscore : 0) +
    (iqrResult.isAnomaly ? weights.iqr : 0) +
    (maResult.isAnomaly ? weights.movingAverage : 0) +
    (ifResult.isAnomaly ? weights.isolationForest : 0);

  // Require at least 50% weighted vote for anomaly
  const isAnomaly = anomalyWeight >= 0.5;

  // Determine severity by highest severity among voting algorithms
  const severityOrder: Record<AnomalySeverity, number> = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4,
  };

  let maxSeverity: AnomalySeverity = "low";
  for (const result of algorithmResults) {
    if (result.isAnomaly && severityOrder[result.severity] > severityOrder[maxSeverity]) {
      maxSeverity = result.severity;
    }
  }

  // Confidence is the weighted average of individual confidences
  const confidence =
    (weights.zscore * zscoreResult.confidence +
      weights.iqr * iqrResult.confidence +
      weights.movingAverage * maResult.confidence +
      weights.isolationForest * ifResult.confidence) /
    (weights.zscore + weights.iqr + weights.movingAverage + weights.isolationForest);

  return {
    isAnomaly,
    ensembleScore: Math.min(100, ensembleScore),
    severity: isAnomaly ? maxSeverity : "low",
    confidence,
    algorithmResults,
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get the appropriate detection function based on algorithm type
 */
export function getDetectionFunction(
  algorithm: AnomalyAlgorithm
): (value: number, dataPoints: DataPoint[], thresholds: CategoryThreshold) => {
  isAnomaly: boolean;
  score: number;
  severity: AnomalySeverity;
  confidence: number;
} {
  switch (algorithm) {
    case "zscore":
      return (value, dataPoints, thresholds) => {
        const result = detectWithZScore(value, dataPoints, thresholds);
        return {
          isAnomaly: result.isAnomaly,
          score: result.zScore * 20,
          severity: result.severity,
          confidence: result.confidence,
        };
      };
    case "iqr":
      return (value, dataPoints, thresholds) => {
        const result = detectWithIQR(value, dataPoints, thresholds);
        return {
          isAnomaly: result.isAnomaly,
          score: result.iqrScore * 20,
          severity: result.severity,
          confidence: result.confidence,
        };
      };
    case "moving_average":
      return (value, dataPoints, thresholds) => {
        const result = detectWithMovingAverage(value, dataPoints, thresholds);
        return {
          isAnomaly: result.isAnomaly,
          score: result.deviationPercent / 2,
          severity: result.severity,
          confidence: result.confidence,
        };
      };
    case "isolation_forest":
      return (value, dataPoints) => {
        const result = detectWithIsolationForest(value, dataPoints);
        return {
          isAnomaly: result.isAnomaly,
          score: result.isolationScore * 100,
          severity: result.severity,
          confidence: result.confidence,
        };
      };
    case "ensemble":
    case "seasonal":
    default:
      return (value, dataPoints, thresholds) => {
        const result = detectWithEnsemble(value, dataPoints, thresholds);
        return {
          isAnomaly: result.isAnomaly,
          score: result.ensembleScore,
          severity: result.severity,
          confidence: result.confidence,
        };
      };
  }
}
