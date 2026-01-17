/**
 * Anomaly Detection Data Access Layer
 *
 * Database operations for anomaly detection:
 * - Anomaly alerts CRUD
 * - Metric baselines CRUD
 * - Detection rules CRUD
 * - Detection runs logging
 * - Metric data points storage
 */

import { eq, desc, and, sql, count, between, isNull, gte, lte, or, inArray } from "drizzle-orm";
import { database } from "~/db";
import {
  anomalyAlert,
  metricBaseline,
  detectionRule,
  detectionRun,
  metricDataPoint,
  type AnomalyAlertRecord,
  type CreateAnomalyAlertData,
  type UpdateAnomalyAlertData,
  type MetricBaselineRecord,
  type CreateMetricBaselineData,
  type UpdateMetricBaselineData,
  type DetectionRuleRecord,
  type CreateDetectionRuleData,
  type UpdateDetectionRuleData,
  type DetectionRunRecord,
  type CreateDetectionRunData,
  type UpdateDetectionRunData,
  type MetricDataPointRecord,
  type CreateMetricDataPointData,
} from "~/db/anomaly-schema-additions";
import { user, type User } from "~/db/schema";

// =============================================================================
// Types
// =============================================================================

export type AnomalyAlertWithUser = AnomalyAlertRecord & {
  user?: Pick<User, "id" | "name" | "image"> | null;
  acknowledgedBy?: Pick<User, "id" | "name" | "image"> | null;
  resolvedBy?: Pick<User, "id" | "name" | "image"> | null;
  dismissedBy?: Pick<User, "id" | "name" | "image"> | null;
};

export type DetectionRuleWithCreator = DetectionRuleRecord & {
  createdBy: Pick<User, "id" | "name" | "image">;
};

export interface AnomalyAlertFilters {
  category?: string;
  severity?: string;
  status?: string;
  userId?: string;
  entityType?: string;
  entityId?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface MetricBaselineFilters {
  category?: string;
  metricName?: string;
  entityType?: string;
  entityId?: string;
  validOnly?: boolean;
}

export interface DetectionRuleFilters {
  category?: string;
  algorithm?: string;
  enabled?: boolean;
  createdById?: string;
}

// =============================================================================
// Anomaly Alert Functions
// =============================================================================

/**
 * Create a new anomaly alert
 */
export async function createAnomalyAlert(
  data: CreateAnomalyAlertData
): Promise<AnomalyAlertRecord> {
  const [newAlert] = await database
    .insert(anomalyAlert)
    .values(data)
    .returning();

  return newAlert;
}

/**
 * Find anomaly alert by ID
 */
export async function findAnomalyAlertById(
  id: string
): Promise<AnomalyAlertWithUser | null> {
  const results = await database
    .select({
      alert: anomalyAlert,
      user: {
        id: user.id,
        name: user.name,
        image: user.image,
      },
    })
    .from(anomalyAlert)
    .leftJoin(user, eq(anomalyAlert.userId, user.id))
    .where(eq(anomalyAlert.id, id))
    .limit(1);

  if (results.length === 0) return null;

  const result = results[0];
  return {
    ...result.alert,
    user: result.user,
  };
}

/**
 * Find anomaly alerts with filters
 */
export async function findAnomalyAlerts(
  filters: AnomalyAlertFilters = {},
  limit: number = 50,
  offset: number = 0
): Promise<AnomalyAlertWithUser[]> {
  const conditions = [];

  if (filters.category) {
    conditions.push(eq(anomalyAlert.category, filters.category));
  }
  if (filters.severity) {
    conditions.push(eq(anomalyAlert.severity, filters.severity));
  }
  if (filters.status) {
    conditions.push(eq(anomalyAlert.status, filters.status));
  }
  if (filters.userId) {
    conditions.push(eq(anomalyAlert.userId, filters.userId));
  }
  if (filters.entityType) {
    conditions.push(eq(anomalyAlert.entityType, filters.entityType));
  }
  if (filters.entityId) {
    conditions.push(eq(anomalyAlert.entityId, filters.entityId));
  }
  if (filters.startDate) {
    conditions.push(gte(anomalyAlert.detectedAt, filters.startDate));
  }
  if (filters.endDate) {
    conditions.push(lte(anomalyAlert.detectedAt, filters.endDate));
  }

  const results = await database
    .select({
      alert: anomalyAlert,
      user: {
        id: user.id,
        name: user.name,
        image: user.image,
      },
    })
    .from(anomalyAlert)
    .leftJoin(user, eq(anomalyAlert.userId, user.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(anomalyAlert.detectedAt))
    .limit(limit)
    .offset(offset);

  return results.map((r) => ({
    ...r.alert,
    user: r.user,
  }));
}

/**
 * Find unresolved anomaly alerts (status is detected or investigating)
 */
export async function findUnresolvedAlerts(
  limit: number = 50
): Promise<AnomalyAlertWithUser[]> {
  return findAnomalyAlerts(
    {},
    limit,
    0
  ).then((alerts) =>
    alerts.filter((a) => a.status === "detected" || a.status === "investigating")
  );
}

/**
 * Count anomaly alerts by status
 */
export async function countAnomalyAlertsByStatus(): Promise<
  { status: string; count: number }[]
> {
  const results = await database
    .select({
      status: anomalyAlert.status,
      count: count(),
    })
    .from(anomalyAlert)
    .groupBy(anomalyAlert.status);

  return results;
}

/**
 * Count anomaly alerts by category
 */
export async function countAnomalyAlertsByCategory(): Promise<
  { category: string; count: number }[]
> {
  const results = await database
    .select({
      category: anomalyAlert.category,
      count: count(),
    })
    .from(anomalyAlert)
    .groupBy(anomalyAlert.category);

  return results;
}

/**
 * Count anomaly alerts by severity
 */
export async function countAnomalyAlertsBySeverity(): Promise<
  { severity: string; count: number }[]
> {
  const results = await database
    .select({
      severity: anomalyAlert.severity,
      count: count(),
    })
    .from(anomalyAlert)
    .groupBy(anomalyAlert.severity);

  return results;
}

/**
 * Update an anomaly alert
 */
export async function updateAnomalyAlert(
  id: string,
  data: UpdateAnomalyAlertData
): Promise<AnomalyAlertRecord | null> {
  const [updated] = await database
    .update(anomalyAlert)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(anomalyAlert.id, id))
    .returning();

  return updated || null;
}

/**
 * Acknowledge an anomaly alert
 */
export async function acknowledgeAnomalyAlert(
  id: string,
  userId: string
): Promise<AnomalyAlertRecord | null> {
  return updateAnomalyAlert(id, {
    status: "investigating",
    acknowledgedAt: new Date(),
    acknowledgedById: userId,
  });
}

/**
 * Resolve an anomaly alert
 */
export async function resolveAnomalyAlert(
  id: string,
  userId: string,
  findings?: string
): Promise<AnomalyAlertRecord | null> {
  return updateAnomalyAlert(id, {
    status: "resolved",
    resolvedAt: new Date(),
    resolvedById: userId,
    investigationFindings: findings,
  });
}

/**
 * Dismiss an anomaly alert
 */
export async function dismissAnomalyAlert(
  id: string,
  userId: string,
  reason: string
): Promise<AnomalyAlertRecord | null> {
  return updateAnomalyAlert(id, {
    status: "dismissed",
    dismissedAt: new Date(),
    dismissedById: userId,
    dismissalReason: reason,
  });
}

/**
 * Confirm an anomaly alert
 */
export async function confirmAnomalyAlert(
  id: string,
  notes?: string
): Promise<AnomalyAlertRecord | null> {
  return updateAnomalyAlert(id, {
    status: "confirmed",
    notes,
  });
}

/**
 * Delete an anomaly alert
 */
export async function deleteAnomalyAlert(id: string): Promise<boolean> {
  const [deleted] = await database
    .delete(anomalyAlert)
    .where(eq(anomalyAlert.id, id))
    .returning();

  return deleted !== undefined;
}

// =============================================================================
// Metric Baseline Functions
// =============================================================================

/**
 * Create a new metric baseline
 */
export async function createMetricBaseline(
  data: CreateMetricBaselineData
): Promise<MetricBaselineRecord> {
  const [newBaseline] = await database
    .insert(metricBaseline)
    .values(data)
    .returning();

  return newBaseline;
}

/**
 * Find metric baseline by ID
 */
export async function findMetricBaselineById(
  id: string
): Promise<MetricBaselineRecord | null> {
  const [result] = await database
    .select()
    .from(metricBaseline)
    .where(eq(metricBaseline.id, id))
    .limit(1);

  return result || null;
}

/**
 * Find metric baseline for a specific metric
 */
export async function findMetricBaselineForMetric(
  category: string,
  metricName: string,
  entityType?: string,
  entityId?: string
): Promise<MetricBaselineRecord | null> {
  const conditions = [
    eq(metricBaseline.category, category),
    eq(metricBaseline.metricName, metricName),
  ];

  if (entityType) {
    conditions.push(eq(metricBaseline.entityType, entityType));
  } else {
    conditions.push(isNull(metricBaseline.entityType));
  }

  if (entityId) {
    conditions.push(eq(metricBaseline.entityId, entityId));
  } else {
    conditions.push(isNull(metricBaseline.entityId));
  }

  // Get valid baseline (current date is between validFrom and validUntil)
  const now = new Date();
  conditions.push(lte(metricBaseline.validFrom, now));
  conditions.push(gte(metricBaseline.validUntil, now));

  const [result] = await database
    .select()
    .from(metricBaseline)
    .where(and(...conditions))
    .orderBy(desc(metricBaseline.createdAt))
    .limit(1);

  return result || null;
}

/**
 * Find metric baselines with filters
 */
export async function findMetricBaselines(
  filters: MetricBaselineFilters = {},
  limit: number = 50,
  offset: number = 0
): Promise<MetricBaselineRecord[]> {
  const conditions = [];

  if (filters.category) {
    conditions.push(eq(metricBaseline.category, filters.category));
  }
  if (filters.metricName) {
    conditions.push(eq(metricBaseline.metricName, filters.metricName));
  }
  if (filters.entityType) {
    conditions.push(eq(metricBaseline.entityType, filters.entityType));
  }
  if (filters.entityId) {
    conditions.push(eq(metricBaseline.entityId, filters.entityId));
  }
  if (filters.validOnly) {
    const now = new Date();
    conditions.push(lte(metricBaseline.validFrom, now));
    conditions.push(gte(metricBaseline.validUntil, now));
  }

  const results = await database
    .select()
    .from(metricBaseline)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(metricBaseline.createdAt))
    .limit(limit)
    .offset(offset);

  return results;
}

/**
 * Update a metric baseline
 */
export async function updateMetricBaseline(
  id: string,
  data: UpdateMetricBaselineData
): Promise<MetricBaselineRecord | null> {
  const [updated] = await database
    .update(metricBaseline)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(metricBaseline.id, id))
    .returning();

  return updated || null;
}

/**
 * Delete a metric baseline
 */
export async function deleteMetricBaseline(id: string): Promise<boolean> {
  const [deleted] = await database
    .delete(metricBaseline)
    .where(eq(metricBaseline.id, id))
    .returning();

  return deleted !== undefined;
}

/**
 * Upsert metric baseline (update if exists, create if not)
 */
export async function upsertMetricBaseline(
  category: string,
  metricName: string,
  data: Omit<CreateMetricBaselineData, "id" | "category" | "metricName">,
  entityType?: string,
  entityId?: string
): Promise<MetricBaselineRecord> {
  // Try to find existing baseline
  const existing = await findMetricBaselineForMetric(
    category,
    metricName,
    entityType,
    entityId
  );

  if (existing) {
    // Update existing
    const updated = await updateMetricBaseline(existing.id, data);
    return updated!;
  }

  // Create new
  return createMetricBaseline({
    ...data,
    id: `mb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    category,
    metricName,
    entityType,
    entityId,
  });
}

// =============================================================================
// Detection Rule Functions
// =============================================================================

/**
 * Create a new detection rule
 */
export async function createDetectionRule(
  data: CreateDetectionRuleData
): Promise<DetectionRuleRecord> {
  const [newRule] = await database
    .insert(detectionRule)
    .values(data)
    .returning();

  return newRule;
}

/**
 * Find detection rule by ID
 */
export async function findDetectionRuleById(
  id: string
): Promise<DetectionRuleWithCreator | null> {
  const results = await database
    .select({
      rule: detectionRule,
      createdBy: {
        id: user.id,
        name: user.name,
        image: user.image,
      },
    })
    .from(detectionRule)
    .innerJoin(user, eq(detectionRule.createdById, user.id))
    .where(eq(detectionRule.id, id))
    .limit(1);

  if (results.length === 0) return null;

  const result = results[0];
  return {
    ...result.rule,
    createdBy: result.createdBy,
  };
}

/**
 * Find detection rules with filters
 */
export async function findDetectionRules(
  filters: DetectionRuleFilters = {},
  limit: number = 50,
  offset: number = 0
): Promise<DetectionRuleWithCreator[]> {
  const conditions = [];

  if (filters.category) {
    conditions.push(eq(detectionRule.category, filters.category));
  }
  if (filters.algorithm) {
    conditions.push(eq(detectionRule.algorithm, filters.algorithm));
  }
  if (filters.enabled !== undefined) {
    conditions.push(eq(detectionRule.enabled, filters.enabled));
  }
  if (filters.createdById) {
    conditions.push(eq(detectionRule.createdById, filters.createdById));
  }

  const results = await database
    .select({
      rule: detectionRule,
      createdBy: {
        id: user.id,
        name: user.name,
        image: user.image,
      },
    })
    .from(detectionRule)
    .innerJoin(user, eq(detectionRule.createdById, user.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(detectionRule.createdAt))
    .limit(limit)
    .offset(offset);

  return results.map((r) => ({
    ...r.rule,
    createdBy: r.createdBy,
  }));
}

/**
 * Find enabled detection rules due for checking
 */
export async function findDueDetectionRules(): Promise<DetectionRuleRecord[]> {
  const now = new Date();

  const results = await database
    .select()
    .from(detectionRule)
    .where(
      and(
        eq(detectionRule.enabled, true),
        or(
          isNull(detectionRule.lastCheckedAt),
          sql`${detectionRule.lastCheckedAt} + INTERVAL '1 minute' * ${detectionRule.checkIntervalMinutes} <= ${now}`
        )
      )
    )
    .orderBy(detectionRule.lastCheckedAt);

  return results;
}

/**
 * Update a detection rule
 */
export async function updateDetectionRule(
  id: string,
  data: UpdateDetectionRuleData
): Promise<DetectionRuleRecord | null> {
  const [updated] = await database
    .update(detectionRule)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(detectionRule.id, id))
    .returning();

  return updated || null;
}

/**
 * Update detection rule last checked timestamp
 */
export async function updateDetectionRuleLastChecked(
  id: string
): Promise<DetectionRuleRecord | null> {
  return updateDetectionRule(id, {
    lastCheckedAt: new Date(),
  });
}

/**
 * Enable or disable a detection rule
 */
export async function setDetectionRuleEnabled(
  id: string,
  enabled: boolean
): Promise<DetectionRuleRecord | null> {
  return updateDetectionRule(id, { enabled });
}

/**
 * Delete a detection rule
 */
export async function deleteDetectionRule(id: string): Promise<boolean> {
  const [deleted] = await database
    .delete(detectionRule)
    .where(eq(detectionRule.id, id))
    .returning();

  return deleted !== undefined;
}

// =============================================================================
// Detection Run Functions
// =============================================================================

/**
 * Create a new detection run
 */
export async function createDetectionRun(
  data: CreateDetectionRunData
): Promise<DetectionRunRecord> {
  const [newRun] = await database
    .insert(detectionRun)
    .values(data)
    .returning();

  return newRun;
}

/**
 * Find detection run by ID
 */
export async function findDetectionRunById(
  id: string
): Promise<DetectionRunRecord | null> {
  const [result] = await database
    .select()
    .from(detectionRun)
    .where(eq(detectionRun.id, id))
    .limit(1);

  return result || null;
}

/**
 * Find recent detection runs
 */
export async function findRecentDetectionRuns(
  limit: number = 20
): Promise<DetectionRunRecord[]> {
  const results = await database
    .select()
    .from(detectionRun)
    .orderBy(desc(detectionRun.startedAt))
    .limit(limit);

  return results;
}

/**
 * Update a detection run
 */
export async function updateDetectionRun(
  id: string,
  data: UpdateDetectionRunData
): Promise<DetectionRunRecord | null> {
  const [updated] = await database
    .update(detectionRun)
    .set(data)
    .where(eq(detectionRun.id, id))
    .returning();

  return updated || null;
}

/**
 * Complete a detection run
 */
export async function completeDetectionRun(
  id: string,
  results: {
    rulesExecuted: number;
    dataPointsAnalyzed: number;
    anomaliesDetected: number;
    alertsGenerated: number;
    errors?: string[];
  }
): Promise<DetectionRunRecord | null> {
  const completedAt = new Date();
  const run = await findDetectionRunById(id);

  if (!run) return null;

  const durationMs = completedAt.getTime() - run.startedAt.getTime();

  return updateDetectionRun(id, {
    status: "completed",
    completedAt,
    durationMs,
    ...results,
    errors: results.errors ? JSON.stringify(results.errors) : undefined,
  });
}

/**
 * Fail a detection run
 */
export async function failDetectionRun(
  id: string,
  errors: string[]
): Promise<DetectionRunRecord | null> {
  const completedAt = new Date();
  const run = await findDetectionRunById(id);

  if (!run) return null;

  const durationMs = completedAt.getTime() - run.startedAt.getTime();

  return updateDetectionRun(id, {
    status: "failed",
    completedAt,
    durationMs,
    errors: JSON.stringify(errors),
  });
}

// =============================================================================
// Metric Data Point Functions
// =============================================================================

/**
 * Create a new metric data point
 */
export async function createMetricDataPoint(
  data: CreateMetricDataPointData
): Promise<MetricDataPointRecord> {
  const [newPoint] = await database
    .insert(metricDataPoint)
    .values(data)
    .returning();

  return newPoint;
}

/**
 * Create multiple metric data points in batch
 */
export async function createMetricDataPoints(
  dataPoints: CreateMetricDataPointData[]
): Promise<MetricDataPointRecord[]> {
  if (dataPoints.length === 0) return [];

  const results = await database
    .insert(metricDataPoint)
    .values(dataPoints)
    .returning();

  return results;
}

/**
 * Find metric data points for analysis
 */
export async function findMetricDataPoints(
  category: string,
  metricName: string,
  startDate: Date,
  endDate: Date,
  entityType?: string,
  entityId?: string
): Promise<MetricDataPointRecord[]> {
  const conditions = [
    eq(metricDataPoint.category, category),
    eq(metricDataPoint.metricName, metricName),
    gte(metricDataPoint.timestamp, startDate),
    lte(metricDataPoint.timestamp, endDate),
  ];

  if (entityType) {
    conditions.push(eq(metricDataPoint.entityType, entityType));
  }
  if (entityId) {
    conditions.push(eq(metricDataPoint.entityId, entityId));
  }

  const results = await database
    .select()
    .from(metricDataPoint)
    .where(and(...conditions))
    .orderBy(desc(metricDataPoint.timestamp));

  return results;
}

/**
 * Find recent metric data points for a specific metric
 */
export async function findRecentMetricDataPoints(
  category: string,
  metricName: string,
  days: number = 30,
  entityType?: string,
  entityId?: string
): Promise<MetricDataPointRecord[]> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return findMetricDataPoints(
    category,
    metricName,
    startDate,
    endDate,
    entityType,
    entityId
  );
}

/**
 * Delete old metric data points (cleanup)
 */
export async function deleteOldMetricDataPoints(
  olderThanDays: number = 90
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  const deleted = await database
    .delete(metricDataPoint)
    .where(lte(metricDataPoint.timestamp, cutoffDate))
    .returning();

  return deleted.length;
}

// =============================================================================
// Aggregation Functions
// =============================================================================

/**
 * Get anomaly alert statistics
 */
export async function getAnomalyAlertStats(): Promise<{
  total: number;
  byStatus: { status: string; count: number }[];
  byCategory: { category: string; count: number }[];
  bySeverity: { severity: string; count: number }[];
  todayCount: number;
  weekCount: number;
}> {
  const [byStatus, byCategory, bySeverity] = await Promise.all([
    countAnomalyAlertsByStatus(),
    countAnomalyAlertsByCategory(),
    countAnomalyAlertsBySeverity(),
  ]);

  const total = byStatus.reduce((sum, s) => sum + s.count, 0);

  // Count for today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [todayResult] = await database
    .select({ count: count() })
    .from(anomalyAlert)
    .where(gte(anomalyAlert.detectedAt, today));

  // Count for this week
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  weekStart.setHours(0, 0, 0, 0);

  const [weekResult] = await database
    .select({ count: count() })
    .from(anomalyAlert)
    .where(gte(anomalyAlert.detectedAt, weekStart));

  return {
    total,
    byStatus,
    byCategory,
    bySeverity,
    todayCount: todayResult?.count ?? 0,
    weekCount: weekResult?.count ?? 0,
  };
}

/**
 * Get anomaly trend data (daily counts for the last N days)
 */
export async function getAnomalyTrend(
  days: number = 30
): Promise<{ date: string; count: number; bySeverity: Record<string, number> }[]> {
  const results: { date: string; count: number; bySeverity: Record<string, number> }[] = [];

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const alerts = await findAnomalyAlerts({
    startDate,
    endDate,
  }, 10000, 0);

  // Group by date
  const byDate = new Map<string, AnomalyAlertRecord[]>();
  for (const alert of alerts) {
    const dateStr = alert.detectedAt.toISOString().split("T")[0];
    if (!byDate.has(dateStr)) {
      byDate.set(dateStr, []);
    }
    byDate.get(dateStr)!.push(alert);
  }

  // Build trend data
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split("T")[0];

    const dayAlerts = byDate.get(dateStr) || [];
    const bySeverity: Record<string, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    for (const alert of dayAlerts) {
      bySeverity[alert.severity] = (bySeverity[alert.severity] || 0) + 1;
    }

    results.push({
      date: dateStr,
      count: dayAlerts.length,
      bySeverity,
    });
  }

  return results;
}
