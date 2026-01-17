/**
 * Reporting Dashboard Schema Extension
 *
 * This file contains the database schema for the comprehensive reporting dashboard
 * with customizable charts, KPI tracking, export capabilities, and scheduled delivery.
 */

import { pgTable, text, timestamp, boolean, index, integer, real, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./schema";

// =============================================================================
// Report Types
// =============================================================================

// Report type - predefined report types
export type ReportType =
  | "sales_performance"
  | "expense_summary"
  | "call_analytics"
  | "task_completion"
  | "financial_overview"
  | "team_productivity"
  | "custom";

// Report status
export type ReportStatus = "draft" | "active" | "archived";

// Report schedule frequency
export type ReportScheduleFrequency = "daily" | "weekly" | "monthly" | "quarterly";

// Export format types
export type ReportExportFormat = "pdf" | "csv" | "xlsx" | "json";

// Report chart types
export type ReportChartType = "bar" | "line" | "area" | "pie" | "donut" | "table" | "kpi";

// =============================================================================
// Report Definition table - Stores report templates/definitions
// =============================================================================

export const reportDefinition = pgTable(
  "report_definition",
  {
    id: text("id").primaryKey(),
    // Report identification
    name: text("name").notNull(),
    description: text("description"),
    type: text("type").$default(() => "custom").notNull(),

    // Owner and permissions
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    isPublic: boolean("is_public").$default(() => false).notNull(),

    // Report configuration stored as JSON
    // Contains: charts config, KPIs, filters, date range settings, etc.
    config: jsonb("config").notNull(),

    // Layout configuration for the report
    layout: jsonb("layout"), // Grid positions, sizes, etc.

    // Status
    status: text("status").$default(() => "active").notNull(),

    // Standard timestamps
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("idx_report_definition_created_by").on(table.createdBy),
    index("idx_report_definition_type").on(table.type),
    index("idx_report_definition_status").on(table.status),
    index("idx_report_definition_is_public").on(table.isPublic),
  ]
);

// =============================================================================
// Report Schedule table - For scheduled report delivery
// =============================================================================

export const reportSchedule = pgTable(
  "report_schedule",
  {
    id: text("id").primaryKey(),
    // Reference to report definition
    reportDefinitionId: text("report_definition_id")
      .notNull()
      .references(() => reportDefinition.id, { onDelete: "cascade" }),

    // User who owns this schedule
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    // Schedule configuration
    isEnabled: boolean("is_enabled").$default(() => true).notNull(),
    frequency: text("frequency").$default(() => "weekly").notNull(),

    // For weekly: day of week (0-6, Sunday=0)
    // For monthly: day of month (1-31)
    dayOfWeek: integer("day_of_week"),
    dayOfMonth: integer("day_of_month"),

    // Time of delivery
    deliveryTime: text("delivery_time").$default(() => "09:00").notNull(),
    timezone: text("timezone").$default(() => "UTC").notNull(),

    // Delivery method
    deliveryMethod: text("delivery_method").$default(() => "email").notNull(),

    // Recipients (JSON array of email addresses or user IDs)
    recipients: jsonb("recipients"),

    // Export format for the scheduled report
    exportFormat: text("export_format").$default(() => "pdf").notNull(),

    // Tracking
    lastDeliveredAt: timestamp("last_delivered_at"),
    nextDeliveryAt: timestamp("next_delivery_at"),
    consecutiveFailures: integer("consecutive_failures").$default(() => 0).notNull(),
    lastErrorMessage: text("last_error_message"),

    // Standard timestamps
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("idx_report_schedule_report_definition_id").on(table.reportDefinitionId),
    index("idx_report_schedule_user_id").on(table.userId),
    index("idx_report_schedule_is_enabled").on(table.isEnabled),
    index("idx_report_schedule_next_delivery_at").on(table.nextDeliveryAt),
  ]
);

// =============================================================================
// Report Snapshot table - Stores generated report snapshots
// =============================================================================

export const reportSnapshot = pgTable(
  "report_snapshot",
  {
    id: text("id").primaryKey(),
    reportDefinitionId: text("report_definition_id")
      .notNull()
      .references(() => reportDefinition.id, { onDelete: "cascade" }),
    generatedBy: text("generated_by")
      .references(() => user.id, { onDelete: "set null" }),
    scheduleId: text("schedule_id")
      .references(() => reportSchedule.id, { onDelete: "set null" }),
    data: jsonb("data").notNull(),
    dateRangeStart: timestamp("date_range_start").notNull(),
    dateRangeEnd: timestamp("date_range_end").notNull(),
    exportFormat: text("export_format"),
    exportUrl: text("export_url"),
    generatedAt: timestamp("generated_at")
      .$defaultFn(() => new Date())
      .notNull(),
    expiresAt: timestamp("expires_at"),
  },
  (table) => [
    index("idx_report_snapshot_report_definition_id").on(table.reportDefinitionId),
    index("idx_report_snapshot_generated_by").on(table.generatedBy),
    index("idx_report_snapshot_generated_at").on(table.generatedAt),
  ]
);

// =============================================================================
// Report KPI table - Store KPI definitions and tracking
// =============================================================================

export const reportKpi = pgTable(
  "report_kpi",
  {
    id: text("id").primaryKey(),
    reportDefinitionId: text("report_definition_id")
      .references(() => reportDefinition.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    calculation: jsonb("calculation").notNull(),
    format: text("format").$default(() => "number").notNull(),
    unit: text("unit"),
    targetValue: real("target_value"),
    warningThreshold: real("warning_threshold"),
    criticalThreshold: real("critical_threshold"),
    thresholdDirection: text("threshold_direction").$default(() => "above").notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("idx_report_kpi_report_definition_id").on(table.reportDefinitionId),
    index("idx_report_kpi_created_by").on(table.createdBy),
  ]
);

// =============================================================================
// Report Delivery Log table - Track report deliveries
// =============================================================================

export const reportDeliveryLog = pgTable(
  "report_delivery_log",
  {
    id: text("id").primaryKey(),
    scheduleId: text("schedule_id")
      .notNull()
      .references(() => reportSchedule.id, { onDelete: "cascade" }),
    snapshotId: text("snapshot_id")
      .references(() => reportSnapshot.id, { onDelete: "set null" }),
    status: text("status").$default(() => "pending").notNull(),
    deliveryMethod: text("delivery_method").notNull(),
    recipients: jsonb("recipients").notNull(),
    deliveredAt: timestamp("delivered_at"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("idx_report_delivery_log_schedule_id").on(table.scheduleId),
    index("idx_report_delivery_log_status").on(table.status),
  ]
);

// =============================================================================
// Relations
// =============================================================================

export const reportDefinitionRelations = relations(reportDefinition, ({ one, many }) => ({
  creator: one(user, { fields: [reportDefinition.createdBy], references: [user.id] }),
  schedules: many(reportSchedule),
  snapshots: many(reportSnapshot),
  kpis: many(reportKpi),
}));

export const reportScheduleRelations = relations(reportSchedule, ({ one, many }) => ({
  reportDefinition: one(reportDefinition, { fields: [reportSchedule.reportDefinitionId], references: [reportDefinition.id] }),
  user: one(user, { fields: [reportSchedule.userId], references: [user.id] }),
  deliveryLogs: many(reportDeliveryLog),
}));

export const reportSnapshotRelations = relations(reportSnapshot, ({ one }) => ({
  reportDefinition: one(reportDefinition, { fields: [reportSnapshot.reportDefinitionId], references: [reportDefinition.id] }),
  generatedByUser: one(user, { fields: [reportSnapshot.generatedBy], references: [user.id] }),
  schedule: one(reportSchedule, { fields: [reportSnapshot.scheduleId], references: [reportSchedule.id] }),
}));

export const reportKpiRelations = relations(reportKpi, ({ one }) => ({
  reportDefinition: one(reportDefinition, { fields: [reportKpi.reportDefinitionId], references: [reportDefinition.id] }),
  creator: one(user, { fields: [reportKpi.createdBy], references: [user.id] }),
}));

export const reportDeliveryLogRelations = relations(reportDeliveryLog, ({ one }) => ({
  schedule: one(reportSchedule, { fields: [reportDeliveryLog.scheduleId], references: [reportSchedule.id] }),
  snapshot: one(reportSnapshot, { fields: [reportDeliveryLog.snapshotId], references: [reportSnapshot.id] }),
}));

// =============================================================================
// Type Exports
// =============================================================================

export type ReportDefinition = typeof reportDefinition.$inferSelect;
export type CreateReportDefinitionData = typeof reportDefinition.$inferInsert;
export type UpdateReportDefinitionData = Partial<Omit<CreateReportDefinitionData, "id" | "createdAt" | "createdBy">>;

export type ReportSchedule = typeof reportSchedule.$inferSelect;
export type CreateReportScheduleData = typeof reportSchedule.$inferInsert;
export type UpdateReportScheduleData = Partial<Omit<CreateReportScheduleData, "id" | "createdAt">>;

export type ReportSnapshot = typeof reportSnapshot.$inferSelect;
export type CreateReportSnapshotData = typeof reportSnapshot.$inferInsert;

export type ReportKpi = typeof reportKpi.$inferSelect;
export type CreateReportKpiData = typeof reportKpi.$inferInsert;
export type UpdateReportKpiData = Partial<Omit<CreateReportKpiData, "id" | "createdAt" | "createdBy">>;

export type ReportDeliveryLog = typeof reportDeliveryLog.$inferSelect;
export type CreateReportDeliveryLogData = typeof reportDeliveryLog.$inferInsert;

// =============================================================================
// Constants
// =============================================================================

export const REPORT_TYPES = ["sales_performance", "expense_summary", "call_analytics", "task_completion", "financial_overview", "team_productivity", "custom"] as const;
export const REPORT_STATUSES = ["draft", "active", "archived"] as const;
export const REPORT_SCHEDULE_FREQUENCIES = ["daily", "weekly", "monthly", "quarterly"] as const;
export const REPORT_EXPORT_FORMATS = ["pdf", "csv", "xlsx", "json"] as const;
export const REPORT_CHART_TYPES = ["bar", "line", "area", "pie", "donut", "table", "kpi"] as const;

// =============================================================================
// Config Types for JSON fields
// =============================================================================

export interface ReportChartConfig {
  id: string;
  type: ReportChartType;
  title: string;
  dataSource: string; // Which data query to use
  xAxis?: string;
  yAxis?: string;
  series?: string[];
  colorScheme?: string;
  showLegend?: boolean;
  showValues?: boolean;
}

export interface ReportKpiConfig {
  id: string;
  name: string;
  dataSource: string;
  aggregation: "sum" | "avg" | "count" | "min" | "max";
  format: "number" | "currency" | "percentage" | "duration";
  targetValue?: number;
  comparison?: "previous_period" | "same_period_last_year" | "target";
}

export interface ReportFilterConfig {
  id: string;
  field: string;
  type: "date_range" | "select" | "multi_select" | "text";
  label: string;
  defaultValue?: unknown;
  options?: { label: string; value: string }[];
}

export interface ReportConfig {
  charts: ReportChartConfig[];
  kpis: ReportKpiConfig[];
  filters: ReportFilterConfig[];
  dateRange: {
    type: "preset" | "custom";
    preset?: "today" | "yesterday" | "last_7_days" | "last_30_days" | "this_month" | "last_month" | "this_quarter" | "last_quarter" | "this_year" | "last_year";
    customStart?: string;
    customEnd?: string;
  };
  refreshInterval?: number; // In seconds, 0 = no auto refresh
}

export interface ReportLayoutItem {
  id: string;
  type: "chart" | "kpi";
  chartId?: string;
  kpiId?: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ReportLayout {
  columns: number;
  items: ReportLayoutItem[];
}
