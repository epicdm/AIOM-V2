// Communication Analytics Schema
// Tracks response times, message volumes, and communication patterns

import { pgTable, text, timestamp, boolean, index, integer, real, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user, conversation, message } from "./schema";

// =============================================================================
// Communication Analytics - Response times, volumes, and patterns
// =============================================================================

// Communication Metric Type - Types of metrics being tracked
export type CommunicationMetricType =
  | "response_time"          // Time to respond to a message
  | "message_volume"         // Number of messages in a period
  | "conversation_activity"  // Activity level in conversations
  | "user_engagement"        // User participation metrics
  | "peak_hours"            // Peak communication hours
  | "bottleneck";           // Communication bottlenecks

// Bottleneck Severity Types
export type BottleneckSeverity = "low" | "medium" | "high" | "critical";

// Communication Analytics Event table - Individual communication events
export const communicationAnalyticsEvent = pgTable(
  "communication_analytics_event",
  {
    id: text("id").primaryKey(),

    // Event type and identification
    eventType: text("event_type").notNull(), // CommunicationMetricType

    // Related entities
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    conversationId: text("conversation_id")
      .references(() => conversation.id, { onDelete: "set null" }),
    messageId: text("message_id")
      .references(() => message.id, { onDelete: "set null" }),

    // Metric values
    responseTimeMs: integer("response_time_ms"), // Response time in milliseconds
    messageCount: integer("message_count"), // Number of messages
    wordCount: integer("word_count"), // Word count in message

    // Context
    isInitialMessage: boolean("is_initial_message").$default(() => false), // Is this the first message in conversation
    hasAttachments: boolean("has_attachments").$default(() => false),

    // Timestamps
    eventTimestamp: timestamp("event_timestamp")
      .$defaultFn(() => new Date())
      .notNull(),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("idx_comm_analytics_event_user_id").on(table.userId),
    index("idx_comm_analytics_event_conversation_id").on(table.conversationId),
    index("idx_comm_analytics_event_type").on(table.eventType),
    index("idx_comm_analytics_event_timestamp").on(table.eventTimestamp),
    index("idx_comm_analytics_event_user_timestamp").on(table.userId, table.eventTimestamp),
  ]
);

// Communication Analytics Aggregate table - Aggregated metrics over time periods
export const communicationAnalyticsAggregate = pgTable(
  "communication_analytics_aggregate",
  {
    id: text("id").primaryKey(),

    // Aggregation scope
    userId: text("user_id")
      .references(() => user.id, { onDelete: "cascade" }),
    conversationId: text("conversation_id")
      .references(() => conversation.id, { onDelete: "set null" }),

    // Time period
    periodType: text("period_type").notNull(), // "hourly" | "daily" | "weekly" | "monthly"
    periodStart: timestamp("period_start").notNull(),
    periodEnd: timestamp("period_end").notNull(),

    // Message volume metrics
    totalMessages: integer("total_messages").$default(() => 0).notNull(),
    sentMessages: integer("sent_messages").$default(() => 0).notNull(),
    receivedMessages: integer("received_messages").$default(() => 0).notNull(),

    // Response time metrics (in milliseconds)
    avgResponseTimeMs: real("avg_response_time_ms"),
    minResponseTimeMs: integer("min_response_time_ms"),
    maxResponseTimeMs: integer("max_response_time_ms"),
    medianResponseTimeMs: integer("median_response_time_ms"),
    p95ResponseTimeMs: integer("p95_response_time_ms"), // 95th percentile

    // Activity metrics
    totalConversations: integer("total_conversations").$default(() => 0).notNull(),
    activeConversations: integer("active_conversations").$default(() => 0).notNull(),
    newConversations: integer("new_conversations").$default(() => 0).notNull(),

    // Engagement metrics
    totalWordsSent: integer("total_words_sent").$default(() => 0).notNull(),
    avgWordsPerMessage: real("avg_words_per_message"),
    readRate: real("read_rate"), // Percentage of messages read

    // Peak hours (JSON array of hour numbers 0-23)
    peakHours: jsonb("peak_hours").$type<number[]>(),

    // Timestamps
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("idx_comm_analytics_agg_user_id").on(table.userId),
    index("idx_comm_analytics_agg_conversation_id").on(table.conversationId),
    index("idx_comm_analytics_agg_period").on(table.periodType, table.periodStart),
    index("idx_comm_analytics_agg_user_period").on(table.userId, table.periodType, table.periodStart),
  ]
);

// Communication Bottleneck table - Detected communication bottlenecks
export const communicationBottleneck = pgTable(
  "communication_bottleneck",
  {
    id: text("id").primaryKey(),

    // Bottleneck identification
    bottleneckType: text("bottleneck_type").notNull(), // "slow_response" | "low_engagement" | "message_backlog" | "inactive_conversation"
    severity: text("severity").$default(() => "medium").notNull(), // BottleneckSeverity

    // Related entities
    userId: text("user_id")
      .references(() => user.id, { onDelete: "set null" }),
    conversationId: text("conversation_id")
      .references(() => conversation.id, { onDelete: "set null" }),

    // Bottleneck details
    title: text("title").notNull(),
    description: text("description").notNull(),

    // Metrics that triggered the bottleneck
    metricName: text("metric_name").notNull(),
    currentValue: real("current_value").notNull(),
    thresholdValue: real("threshold_value").notNull(),
    deviation: real("deviation"), // How far from threshold

    // Impact assessment
    impactScore: real("impact_score"), // 0-100, higher = more impactful
    affectedUsersCount: integer("affected_users_count").$default(() => 0),

    // Suggestions for resolution (JSON array)
    suggestions: jsonb("suggestions").$type<string[]>(),

    // Status tracking
    status: text("status").$default(() => "detected").notNull(), // "detected" | "acknowledged" | "investigating" | "resolved" | "dismissed"
    acknowledgedAt: timestamp("acknowledged_at"),
    acknowledgedById: text("acknowledged_by_id")
      .references(() => user.id, { onDelete: "set null" }),
    resolvedAt: timestamp("resolved_at"),
    resolvedById: text("resolved_by_id")
      .references(() => user.id, { onDelete: "set null" }),

    // Timestamps
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
    index("idx_comm_bottleneck_user_id").on(table.userId),
    index("idx_comm_bottleneck_conversation_id").on(table.conversationId),
    index("idx_comm_bottleneck_severity").on(table.severity),
    index("idx_comm_bottleneck_status").on(table.status),
    index("idx_comm_bottleneck_detected_at").on(table.detectedAt),
    index("idx_comm_bottleneck_type_status").on(table.bottleneckType, table.status),
  ]
);

// Communication Pattern table - Detected communication patterns
export const communicationPattern = pgTable(
  "communication_pattern",
  {
    id: text("id").primaryKey(),

    // Pattern identification
    patternType: text("pattern_type").notNull(), // "frequent_pair" | "inactive_period" | "burst_activity" | "declining_engagement"

    // Related entities (optional - pattern could be org-wide)
    userId: text("user_id")
      .references(() => user.id, { onDelete: "cascade" }),
    conversationId: text("conversation_id")
      .references(() => conversation.id, { onDelete: "set null" }),

    // Pattern details
    title: text("title").notNull(),
    description: text("description").notNull(),

    // Pattern metrics (JSON - varies by pattern type)
    patternData: jsonb("pattern_data").$type<Record<string, unknown>>(),

    // Confidence and frequency
    confidence: real("confidence"), // 0-1, how confident we are in the pattern
    occurrenceCount: integer("occurrence_count").$default(() => 1).notNull(),

    // Time range for pattern detection
    observationStartDate: timestamp("observation_start_date").notNull(),
    observationEndDate: timestamp("observation_end_date").notNull(),

    // Timestamps
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
    index("idx_comm_pattern_user_id").on(table.userId),
    index("idx_comm_pattern_conversation_id").on(table.conversationId),
    index("idx_comm_pattern_type").on(table.patternType),
    index("idx_comm_pattern_detected_at").on(table.detectedAt),
  ]
);

// =============================================================================
// Relations
// =============================================================================

export const communicationAnalyticsEventRelations = relations(communicationAnalyticsEvent, ({ one }) => ({
  user: one(user, {
    fields: [communicationAnalyticsEvent.userId],
    references: [user.id],
  }),
  conversation: one(conversation, {
    fields: [communicationAnalyticsEvent.conversationId],
    references: [conversation.id],
  }),
  message: one(message, {
    fields: [communicationAnalyticsEvent.messageId],
    references: [message.id],
  }),
}));

export const communicationAnalyticsAggregateRelations = relations(communicationAnalyticsAggregate, ({ one }) => ({
  user: one(user, {
    fields: [communicationAnalyticsAggregate.userId],
    references: [user.id],
  }),
  conversation: one(conversation, {
    fields: [communicationAnalyticsAggregate.conversationId],
    references: [conversation.id],
  }),
}));

export const communicationBottleneckRelations = relations(communicationBottleneck, ({ one }) => ({
  user: one(user, {
    fields: [communicationBottleneck.userId],
    references: [user.id],
    relationName: "bottleneckSubject",
  }),
  conversation: one(conversation, {
    fields: [communicationBottleneck.conversationId],
    references: [conversation.id],
  }),
  acknowledgedBy: one(user, {
    fields: [communicationBottleneck.acknowledgedById],
    references: [user.id],
    relationName: "bottleneckAcknowledger",
  }),
  resolvedBy: one(user, {
    fields: [communicationBottleneck.resolvedById],
    references: [user.id],
    relationName: "bottleneckResolver",
  }),
}));

export const communicationPatternRelations = relations(communicationPattern, ({ one }) => ({
  user: one(user, {
    fields: [communicationPattern.userId],
    references: [user.id],
  }),
  conversation: one(conversation, {
    fields: [communicationPattern.conversationId],
    references: [conversation.id],
  }),
}));

// =============================================================================
// Type Exports
// =============================================================================

export type CommunicationAnalyticsEvent = typeof communicationAnalyticsEvent.$inferSelect;
export type CreateCommunicationAnalyticsEventData = typeof communicationAnalyticsEvent.$inferInsert;

export type CommunicationAnalyticsAggregate = typeof communicationAnalyticsAggregate.$inferSelect;
export type CreateCommunicationAnalyticsAggregateData = typeof communicationAnalyticsAggregate.$inferInsert;
export type UpdateCommunicationAnalyticsAggregateData = Partial<
  Omit<CreateCommunicationAnalyticsAggregateData, "id" | "createdAt">
>;

export type CommunicationBottleneck = typeof communicationBottleneck.$inferSelect;
export type CreateCommunicationBottleneckData = typeof communicationBottleneck.$inferInsert;
export type UpdateCommunicationBottleneckData = Partial<
  Omit<CreateCommunicationBottleneckData, "id" | "createdAt" | "detectedAt">
>;

export type CommunicationPattern = typeof communicationPattern.$inferSelect;
export type CreateCommunicationPatternData = typeof communicationPattern.$inferInsert;
export type UpdateCommunicationPatternData = Partial<
  Omit<CreateCommunicationPatternData, "id" | "createdAt" | "detectedAt">
>;

// =============================================================================
// Constants
// =============================================================================

export const COMMUNICATION_METRIC_TYPES = [
  "response_time",
  "message_volume",
  "conversation_activity",
  "user_engagement",
  "peak_hours",
  "bottleneck",
] as const;

export const BOTTLENECK_SEVERITIES = ["low", "medium", "high", "critical"] as const;

export const BOTTLENECK_TYPES = [
  "slow_response",
  "low_engagement",
  "message_backlog",
  "inactive_conversation",
] as const;

export const BOTTLENECK_STATUSES = [
  "detected",
  "acknowledged",
  "investigating",
  "resolved",
  "dismissed",
] as const;

export const PATTERN_TYPES = [
  "frequent_pair",
  "inactive_period",
  "burst_activity",
  "declining_engagement",
] as const;

export const PERIOD_TYPES = ["hourly", "daily", "weekly", "monthly"] as const;
