// This file contains the schema additions for anomaly detection
// Copy the content below and paste it at the end of src/db/schema.ts

/*
// =============================================================================
// ML-Powered Anomaly Detection - Alerts and Metrics Tracking
// =============================================================================

// Anomaly category types
export type AnomalyCategoryType =
  | "expense" // Expense amount, frequency, patterns
  | "transaction" // Financial transaction patterns
  | "task_completion" // Task completion rate changes
  | "user_behavior" // Login patterns, activity anomalies
  | "system"; // System metrics anomalies

// Anomaly severity types
export type AnomalySeverityType = "low" | "medium" | "high" | "critical";

// Anomaly status types
export type AnomalyStatusType =
  | "detected" // Just detected, pending review
  | "investigating" // Being investigated
  | "confirmed" // Confirmed as actual anomaly
  | "dismissed" // Dismissed as false positive
  | "resolved"; // Issue has been resolved

// Anomaly algorithm types
export type AnomalyAlgorithmType =
  | "zscore" // Z-score based detection
  | "iqr" // Interquartile Range method
  | "moving_average" // Moving average with deviation threshold
  | "isolation_forest" // Isolation Forest (ML-based)
  | "seasonal" // Seasonal decomposition
  | "ensemble"; // Combination of multiple methods
*/

import { pgTable, text, timestamp, boolean, index, integer, real } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./schema";

// Anomaly Alert table - Stores detected anomalies and their status
export const anomalyAlert = pgTable(
  "anomaly_alert",
  {
    id: text("id").primaryKey(),

    // Detection metadata
    algorithm: text("algorithm").notNull(),
    category: text("category").notNull(),
    severity: text("severity").$default(() => "medium").notNull(),
    status: text("status").$default(() => "detected").notNull(),

    // Scores
    anomalyScore: real("anomaly_score").notNull(), // 0-100, higher = more anomalous
    confidenceScore: real("confidence_score").notNull(), // 0-1

    // Alert details
    title: text("title").notNull(),
    description: text("description").notNull(),
    metric: text("metric").notNull(),

    // Values
    observedValue: real("observed_value").notNull(),
    expectedValue: real("expected_value").notNull(),
    deviation: real("deviation").notNull(), // Standard deviations or percentage

    // Statistical context (JSON)
    statisticalContext: text("statistical_context"), // JSON: mean, std, median, etc.

    // Entity references
    entityId: text("entity_id"),
    entityType: text("entity_type"),
    userId: text("user_id")
      .references(() => user.id, { onDelete: "set null" }),

    // Suggested actions (JSON array)
    suggestedActions: text("suggested_actions"), // JSON array of strings

    // Related data points (JSON array)
    relatedDataPoints: text("related_data_points"), // JSON array of data points

    // Status tracking
    acknowledgedAt: timestamp("acknowledged_at"),
    acknowledgedById: text("acknowledged_by_id")
      .references(() => user.id, { onDelete: "set null" }),
    resolvedAt: timestamp("resolved_at"),
    resolvedById: text("resolved_by_id")
      .references(() => user.id, { onDelete: "set null" }),
    dismissedAt: timestamp("dismissed_at"),
    dismissedById: text("dismissed_by_id")
      .references(() => user.id, { onDelete: "set null" }),
    dismissalReason: text("dismissal_reason"),

    // Investigation notes
    notes: text("notes"),
    investigationFindings: text("investigation_findings"),

    // Notifications sent (JSON array)
    notificationsSent: text("notifications_sent"), // JSON array

    // Standard timestamps
    detectedAt: timestamp("detected_at")
      .$defaultFn(() => new Date())
      .notNull(),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("idx_anomaly_alert_category").on(table.category),
    index("idx_anomaly_alert_severity").on(table.severity),
    index("idx_anomaly_alert_status").on(table.status),
    index("idx_anomaly_alert_entity").on(table.entityType, table.entityId),
    index("idx_anomaly_alert_user_id").on(table.userId),
    index("idx_anomaly_alert_detected_at").on(table.detectedAt),
    index("idx_anomaly_alert_category_status").on(table.category, table.status),
  ]
);

// Metric Baseline table - Stores statistical baselines for metrics
export const metricBaseline = pgTable(
  "metric_baseline",
  {
    id: text("id").primaryKey(),
    category: text("category").notNull(),
    metricName: text("metric_name").notNull(),

    // Optional entity scope
    entityId: text("entity_id"),
    entityType: text("entity_type"),

    // Statistical baseline values
    mean: real("mean").notNull(),
    standardDeviation: real("standard_deviation").notNull(),
    median: real("median").notNull(),
    q1: real("q1").notNull(), // 25th percentile
    q3: real("q3").notNull(), // 75th percentile
    minValue: real("min_value").notNull(),
    maxValue: real("max_value").notNull(),

    // Seasonal patterns (JSON arrays)
    dailyPattern: text("daily_pattern"), // JSON: 24 values for hourly pattern
    weeklyPattern: text("weekly_pattern"), // JSON: 7 values for daily pattern
    monthlyPattern: text("monthly_pattern"), // JSON: 12 values for monthly pattern

    // Thresholds
    warningThreshold: real("warning_threshold").notNull(),
    criticalThreshold: real("critical_threshold").notNull(),

    // Metadata
    sampleSize: integer("sample_size").notNull(),
    windowDays: integer("window_days").$default(() => 30).notNull(),

    // Validity period
    validFrom: timestamp("valid_from")
      .$defaultFn(() => new Date())
      .notNull(),
    validUntil: timestamp("valid_until").notNull(),

    // Standard timestamps
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("idx_metric_baseline_category").on(table.category),
    index("idx_metric_baseline_metric").on(table.metricName),
    index("idx_metric_baseline_entity").on(table.entityType, table.entityId),
    index("idx_metric_baseline_validity").on(table.validFrom, table.validUntil),
  ]
);

// Detection Rule table - Configurable rules for anomaly detection
export const detectionRule = pgTable(
  "detection_rule",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    category: text("category").notNull(),
    algorithm: text("algorithm").notNull(),
    enabled: boolean("enabled").$default(() => true).notNull(),

    // Thresholds
    warningThreshold: real("warning_threshold").notNull(),
    criticalThreshold: real("critical_threshold").notNull(),

    // Algorithm parameters (JSON)
    parameters: text("parameters"), // JSON: algorithm-specific parameters

    // Scheduling
    checkIntervalMinutes: integer("check_interval_minutes").$default(() => 15).notNull(),
    lastCheckedAt: timestamp("last_checked_at"),

    // Notification settings
    notifyOnSeverity: text("notify_on_severity"), // JSON array of severities
    recipientUserIds: text("recipient_user_ids"), // JSON array of user IDs

    // Created by
    createdById: text("created_by_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    // Standard timestamps
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("idx_detection_rule_category").on(table.category),
    index("idx_detection_rule_enabled").on(table.enabled),
    index("idx_detection_rule_last_checked").on(table.lastCheckedAt),
  ]
);

// Detection Run table - Logs of anomaly detection runs
export const detectionRun = pgTable(
  "detection_run",
  {
    id: text("id").primaryKey(),
    status: text("status").$default(() => "running").notNull(),

    // Timing
    startedAt: timestamp("started_at")
      .$defaultFn(() => new Date())
      .notNull(),
    completedAt: timestamp("completed_at"),
    durationMs: integer("duration_ms"),

    // Results
    rulesExecuted: integer("rules_executed").$default(() => 0).notNull(),
    dataPointsAnalyzed: integer("data_points_analyzed").$default(() => 0).notNull(),
    anomaliesDetected: integer("anomalies_detected").$default(() => 0).notNull(),
    alertsGenerated: integer("alerts_generated").$default(() => 0).notNull(),

    // Errors (JSON array)
    errors: text("errors"), // JSON array of error objects
  },
  (table) => [
    index("idx_detection_run_status").on(table.status),
    index("idx_detection_run_started_at").on(table.startedAt),
  ]
);

// Metric Data Point table - Stores time-series data for anomaly detection
export const metricDataPoint = pgTable(
  "metric_data_point",
  {
    id: text("id").primaryKey(),
    category: text("category").notNull(),
    metricName: text("metric_name").notNull(),

    // Optional entity scope
    entityId: text("entity_id"),
    entityType: text("entity_type"),

    // The data point value
    value: real("value").notNull(),
    timestamp: timestamp("timestamp")
      .$defaultFn(() => new Date())
      .notNull(),

    // Additional metadata (JSON)
    metadata: text("metadata"),
  },
  (table) => [
    index("idx_metric_data_point_category").on(table.category),
    index("idx_metric_data_point_metric").on(table.metricName),
    index("idx_metric_data_point_timestamp").on(table.timestamp),
    index("idx_metric_data_point_entity").on(table.entityType, table.entityId),
    index("idx_metric_data_point_category_timestamp").on(table.category, table.timestamp),
  ]
);

// Anomaly Alert Relations
export const anomalyAlertRelations = relations(anomalyAlert, ({ one }) => ({
  user: one(user, {
    fields: [anomalyAlert.userId],
    references: [user.id],
    relationName: "anomalyAlertSubject",
  }),
  acknowledgedBy: one(user, {
    fields: [anomalyAlert.acknowledgedById],
    references: [user.id],
    relationName: "anomalyAlertAcknowledger",
  }),
  resolvedBy: one(user, {
    fields: [anomalyAlert.resolvedById],
    references: [user.id],
    relationName: "anomalyAlertResolver",
  }),
  dismissedBy: one(user, {
    fields: [anomalyAlert.dismissedById],
    references: [user.id],
    relationName: "anomalyAlertDismisser",
  }),
}));

// Detection Rule Relations
export const detectionRuleRelations = relations(detectionRule, ({ one }) => ({
  createdBy: one(user, {
    fields: [detectionRule.createdById],
    references: [user.id],
  }),
}));

// Anomaly Detection Type Exports
export type AnomalyAlertRecord = typeof anomalyAlert.$inferSelect;
export type CreateAnomalyAlertData = typeof anomalyAlert.$inferInsert;
export type UpdateAnomalyAlertData = Partial<
  Omit<CreateAnomalyAlertData, "id" | "createdAt" | "detectedAt">
>;

export type MetricBaselineRecord = typeof metricBaseline.$inferSelect;
export type CreateMetricBaselineData = typeof metricBaseline.$inferInsert;
export type UpdateMetricBaselineData = Partial<
  Omit<CreateMetricBaselineData, "id" | "createdAt">
>;

export type DetectionRuleRecord = typeof detectionRule.$inferSelect;
export type CreateDetectionRuleData = typeof detectionRule.$inferInsert;
export type UpdateDetectionRuleData = Partial<
  Omit<CreateDetectionRuleData, "id" | "createdAt" | "createdById">
>;

export type DetectionRunRecord = typeof detectionRun.$inferSelect;
export type CreateDetectionRunData = typeof detectionRun.$inferInsert;
export type UpdateDetectionRunData = Partial<
  Omit<CreateDetectionRunData, "id" | "startedAt">
>;

export type MetricDataPointRecord = typeof metricDataPoint.$inferSelect;
export type CreateMetricDataPointData = typeof metricDataPoint.$inferInsert;

// Anomaly Detection Constants
export const ANOMALY_CATEGORIES = ["expense", "transaction", "task_completion", "user_behavior", "system"] as const;
export const ANOMALY_SEVERITIES = ["low", "medium", "high", "critical"] as const;
export const ANOMALY_STATUSES = ["detected", "investigating", "confirmed", "dismissed", "resolved"] as const;
export const ANOMALY_ALGORITHMS = ["zscore", "iqr", "moving_average", "isolation_forest", "seasonal", "ensemble"] as const;
