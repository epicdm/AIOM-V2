import { pgTable, text, timestamp, integer, jsonb, boolean, decimal } from "drizzle-orm/pg-core";
import { user } from "./schema";

// Monitoring jobs configuration
export const monitoringJobs = pgTable("monitoring_jobs", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  schedule: text("schedule").notNull(), // cron expression
  analyzerType: text("analyzer_type").notNull(), // financial, sales, operations, customer
  config: jsonb("config").$type<{
    thresholds?: Record<string, number>;
    parameters?: Record<string, any>;
  }>(),
  enabled: boolean("enabled").notNull().default(true),
  lastRunAt: timestamp("last_run_at"),
  nextRunAt: timestamp("next_run_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Analysis results
export const analysisResults = pgTable("analysis_results", {
  id: text("id").primaryKey(),
  jobId: text("job_id")
    .notNull()
    .references(() => monitoringJobs.id, { onDelete: "cascade" }),
  runAt: timestamp("run_at").notNull().defaultNow(),
  status: text("status").notNull(), // success, failed, partial
  insights: jsonb("insights").$type<
    Array<{
      metric: string;
      value: number | string;
      label: string;
      trend?: "up" | "down" | "stable";
      severity?: "good" | "warning" | "critical";
    }>
  >(),
  metrics: jsonb("metrics").$type<Record<string, any>>(),
  alertsGenerated: integer("alerts_generated").notNull().default(0),
  durationMs: integer("duration_ms").notNull(),
  cost: decimal("cost", { precision: 10, scale: 6 }),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Alerts
export const alerts = pgTable("alerts", {
  id: text("id").primaryKey(),
  analysisResultId: text("analysis_result_id").references(() => analysisResults.id, {
    onDelete: "cascade",
  }),
  type: text("type").notNull(), // financial, sales, operations, customer
  priority: text("priority").notNull(), // critical, high, medium, low
  title: text("title").notNull(),
  description: text("description").notNull(),
  data: jsonb("data").$type<Record<string, any>>(),
  status: text("status").notNull().default("new"), // new, acknowledged, resolved, dismissed
  acknowledgedBy: text("acknowledged_by").references(() => user.id),
  acknowledgedAt: timestamp("acknowledged_at"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Daily briefings
export const dailyBriefings = pgTable("daily_briefings", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
  date: timestamp("date").notNull(),
  content: text("content").notNull(), // markdown/HTML formatted briefing
  insightsCount: integer("insights_count").notNull().default(0),
  alertsCount: integer("alerts_count").notNull().default(0),
  recommendationsCount: integer("recommendations_count").notNull().default(0),
  deliveredAt: timestamp("delivered_at"),
  deliveryMethod: text("delivery_method"), // email, in_app, sms
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Autonomous actions (Action Protocol v1.1)
export const autonomousActions = pgTable("autonomous_actions", {
  id: text("id").primaryKey(),
  actionType: text("action_type").notNull(), // create_task, send_email, update_record, etc.
  targetSystem: text("target_system").notNull(), // odoo, internal, external
  targetId: text("target_id"), // record ID in target system
  description: text("description").notNull(),
  parameters: jsonb("parameters").$type<Record<string, any>>(),
  decisionReasoning: text("decision_reasoning"), // AI explanation
  requiresApproval: boolean("requires_approval").notNull().default(true),
  approvedBy: text("approved_by").references(() => user.id),
  approvedAt: timestamp("approved_at"),
  executedAt: timestamp("executed_at"),
  status: text("status").notNull().default("pending"), // pending, approved, rejected, executed, failed
  result: jsonb("result").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),

  // Action Protocol v1.1 fields
  actionProtocol: jsonb("action_protocol").$type<Record<string, any>>(), // Full v1.1 protocol
  orgId: text("org_id").notNull().default("default-org"),
  idempotencyKey: text("idempotency_key"), // org:action_type:scope:yyyy-mm-dd
  expiresAt: timestamp("expires_at"),
  riskLevel: text("risk_level"), // low, medium, high, critical
  safeOperation: text("safe_operation"), // send_email, create_odoo_task, etc.
  analysisId: text("analysis_id").references(() => analysisResults.id, { onDelete: "set null" }),
});

// Alert rules (user-configurable thresholds)
export const alertRules = pgTable("alert_rules", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => user.id, { onDelete: "cascade" }), // null for org-wide
  ruleType: text("rule_type").notNull(), // cash_runway, ar_aging, inventory_level, etc.
  condition: jsonb("condition").$type<Record<string, any>>(), // threshold values
  enabled: boolean("enabled").notNull().default(true),
  notificationChannels: jsonb("notification_channels").$type<string[]>(), // email, sms, slack, etc.
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// AI COO usage analytics
export const aiCooUsage = pgTable("ai_coo_usage", {
  id: text("id").primaryKey(),
  feature: text("feature").notNull(), // monitoring, briefing, alert_generation, etc.
  tokensUsed: integer("tokens_used").notNull(),
  cost: decimal("cost", { precision: 10, scale: 6 }).notNull(),
  durationMs: integer("duration_ms").notNull(),
  success: boolean("success").notNull(),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Outreach state (anti-spam tracking)
export const outreachState = pgTable("outreach_state", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull(),
  partnerId: text("partner_id").notNull(), // Odoo partner ID as string
  contextType: text("context_type").notNull(), // invoice, deal, project, customer
  contextId: text("context_id").notNull(), // Record ID in context system
  lastSentAt: timestamp("last_sent_at"),
  nextAllowedAt: timestamp("next_allowed_at"),
  attemptCount: integer("attempt_count").notNull().default(0),
  sequenceState: text("sequence_state"), // JSON string for follow-up sequences
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Domain events (event-driven architecture)
export const domainEvents = pgTable("domain_events", {
  id: text("id").primaryKey(),
  type: text("type").notNull(), // analysis_completed, action_executed, alert_created
  payload: jsonb("payload").$type<Record<string, any>>().notNull(),
  handled: boolean("handled").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
