import { eq, and, desc, sql, count, gte, lte, avg, min, max, sum } from "drizzle-orm";
import { database } from "~/db";
import {
  communicationAnalyticsEvent,
  communicationAnalyticsAggregate,
  communicationBottleneck,
  communicationPattern,
  type CommunicationAnalyticsEvent,
  type CreateCommunicationAnalyticsEventData,
  type CommunicationAnalyticsAggregate,
  type CreateCommunicationAnalyticsAggregateData,
  type UpdateCommunicationAnalyticsAggregateData,
  type CommunicationBottleneck,
  type CreateCommunicationBottleneckData,
  type UpdateCommunicationBottleneckData,
  type CommunicationPattern,
  type CreateCommunicationPatternData,
} from "~/db/communication-analytics-schema";
import { message, conversation, user } from "~/db/schema";

// =============================================================================
// Communication Analytics Event Operations
// =============================================================================

export async function createAnalyticsEvent(
  data: CreateCommunicationAnalyticsEventData
): Promise<CommunicationAnalyticsEvent> {
  const [newEvent] = await database
    .insert(communicationAnalyticsEvent)
    .values(data)
    .returning();

  return newEvent;
}

export async function findAnalyticsEventsByUserId(
  userId: string,
  startDate?: Date,
  endDate?: Date,
  limit: number = 100
): Promise<CommunicationAnalyticsEvent[]> {
  const conditions = [eq(communicationAnalyticsEvent.userId, userId)];

  if (startDate) {
    conditions.push(gte(communicationAnalyticsEvent.eventTimestamp, startDate));
  }
  if (endDate) {
    conditions.push(lte(communicationAnalyticsEvent.eventTimestamp, endDate));
  }

  return database
    .select()
    .from(communicationAnalyticsEvent)
    .where(and(...conditions))
    .orderBy(desc(communicationAnalyticsEvent.eventTimestamp))
    .limit(limit);
}

// =============================================================================
// Communication Analytics Aggregate Operations
// =============================================================================

export async function createOrUpdateAggregate(
  data: CreateCommunicationAnalyticsAggregateData
): Promise<CommunicationAnalyticsAggregate> {
  const [result] = await database
    .insert(communicationAnalyticsAggregate)
    .values(data)
    .onConflictDoUpdate({
      target: [communicationAnalyticsAggregate.id],
      set: {
        totalMessages: data.totalMessages,
        sentMessages: data.sentMessages,
        receivedMessages: data.receivedMessages,
        avgResponseTimeMs: data.avgResponseTimeMs,
        minResponseTimeMs: data.minResponseTimeMs,
        maxResponseTimeMs: data.maxResponseTimeMs,
        medianResponseTimeMs: data.medianResponseTimeMs,
        p95ResponseTimeMs: data.p95ResponseTimeMs,
        totalConversations: data.totalConversations,
        activeConversations: data.activeConversations,
        newConversations: data.newConversations,
        totalWordsSent: data.totalWordsSent,
        avgWordsPerMessage: data.avgWordsPerMessage,
        readRate: data.readRate,
        peakHours: data.peakHours,
        updatedAt: new Date(),
      },
    })
    .returning();

  return result;
}

export async function findAggregatesByUserId(
  userId: string,
  periodType: string,
  startDate?: Date,
  endDate?: Date
): Promise<CommunicationAnalyticsAggregate[]> {
  const conditions = [
    eq(communicationAnalyticsAggregate.userId, userId),
    eq(communicationAnalyticsAggregate.periodType, periodType),
  ];

  if (startDate) {
    conditions.push(gte(communicationAnalyticsAggregate.periodStart, startDate));
  }
  if (endDate) {
    conditions.push(lte(communicationAnalyticsAggregate.periodEnd, endDate));
  }

  return database
    .select()
    .from(communicationAnalyticsAggregate)
    .where(and(...conditions))
    .orderBy(desc(communicationAnalyticsAggregate.periodStart));
}

export async function getLatestAggregate(
  userId: string,
  periodType: string
): Promise<CommunicationAnalyticsAggregate | null> {
  const [result] = await database
    .select()
    .from(communicationAnalyticsAggregate)
    .where(
      and(
        eq(communicationAnalyticsAggregate.userId, userId),
        eq(communicationAnalyticsAggregate.periodType, periodType)
      )
    )
    .orderBy(desc(communicationAnalyticsAggregate.periodStart))
    .limit(1);

  return result || null;
}

// =============================================================================
// Communication Bottleneck Operations
// =============================================================================

export async function createBottleneck(
  data: CreateCommunicationBottleneckData
): Promise<CommunicationBottleneck> {
  const [newBottleneck] = await database
    .insert(communicationBottleneck)
    .values(data)
    .returning();

  return newBottleneck;
}

export async function findActiveBottlenecks(
  userId?: string,
  limit: number = 50
): Promise<CommunicationBottleneck[]> {
  const conditions = [
    sql`${communicationBottleneck.status} IN ('detected', 'acknowledged', 'investigating')`,
  ];

  if (userId) {
    conditions.push(eq(communicationBottleneck.userId, userId));
  }

  return database
    .select()
    .from(communicationBottleneck)
    .where(and(...conditions))
    .orderBy(desc(communicationBottleneck.detectedAt))
    .limit(limit);
}

export async function updateBottleneckStatus(
  id: string,
  status: string,
  userId?: string
): Promise<CommunicationBottleneck | null> {
  const updateData: UpdateCommunicationBottleneckData = {
    status,
    updatedAt: new Date(),
  };

  if (status === "acknowledged" && userId) {
    updateData.acknowledgedAt = new Date();
    updateData.acknowledgedById = userId;
  } else if (status === "resolved" && userId) {
    updateData.resolvedAt = new Date();
    updateData.resolvedById = userId;
  }

  const [result] = await database
    .update(communicationBottleneck)
    .set(updateData)
    .where(eq(communicationBottleneck.id, id))
    .returning();

  return result || null;
}

export async function countBottlenecksBySeverity(): Promise<
  { severity: string; count: number }[]
> {
  const results = await database
    .select({
      severity: communicationBottleneck.severity,
      count: count(),
    })
    .from(communicationBottleneck)
    .where(
      sql`${communicationBottleneck.status} IN ('detected', 'acknowledged', 'investigating')`
    )
    .groupBy(communicationBottleneck.severity);

  return results;
}

// =============================================================================
// Communication Pattern Operations
// =============================================================================

export async function createPattern(
  data: CreateCommunicationPatternData
): Promise<CommunicationPattern> {
  const [newPattern] = await database
    .insert(communicationPattern)
    .values(data)
    .returning();

  return newPattern;
}

export async function findPatternsByUserId(
  userId: string,
  limit: number = 50
): Promise<CommunicationPattern[]> {
  return database
    .select()
    .from(communicationPattern)
    .where(eq(communicationPattern.userId, userId))
    .orderBy(desc(communicationPattern.detectedAt))
    .limit(limit);
}

// =============================================================================
// Analytics Calculation Functions
// =============================================================================

/**
 * Calculate response time statistics from messages
 */
export async function calculateResponseTimeStats(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  avgResponseTimeMs: number | null;
  minResponseTimeMs: number | null;
  maxResponseTimeMs: number | null;
  totalResponses: number;
}> {
  // Get all messages in conversations involving this user
  const conversationsQuery = database
    .select({ id: conversation.id })
    .from(conversation)
    .where(
      sql`${conversation.participant1Id} = ${userId} OR ${conversation.participant2Id} = ${userId}`
    );

  // This query finds messages that are responses (not the first message in a sequence)
  // and calculates the time difference
  const result = await database.execute(sql`
    WITH message_pairs AS (
      SELECT
        m.id,
        m.conversation_id,
        m.sender_id,
        m.created_at,
        LAG(m.created_at) OVER (
          PARTITION BY m.conversation_id
          ORDER BY m.created_at
        ) as prev_message_time,
        LAG(m.sender_id) OVER (
          PARTITION BY m.conversation_id
          ORDER BY m.created_at
        ) as prev_sender_id
      FROM message m
      WHERE m.conversation_id IN (
        SELECT id FROM conversation
        WHERE participant1_id = ${userId} OR participant2_id = ${userId}
      )
      AND m.created_at >= ${startDate}
      AND m.created_at <= ${endDate}
    )
    SELECT
      AVG(EXTRACT(EPOCH FROM (created_at - prev_message_time)) * 1000)::real as avg_response_time_ms,
      MIN(EXTRACT(EPOCH FROM (created_at - prev_message_time)) * 1000)::integer as min_response_time_ms,
      MAX(EXTRACT(EPOCH FROM (created_at - prev_message_time)) * 1000)::integer as max_response_time_ms,
      COUNT(*)::integer as total_responses
    FROM message_pairs
    WHERE prev_message_time IS NOT NULL
    AND sender_id = ${userId}
    AND prev_sender_id != ${userId}
  `);

  const row = result.rows[0] as {
    avg_response_time_ms: number | null;
    min_response_time_ms: number | null;
    max_response_time_ms: number | null;
    total_responses: number;
  };

  return {
    avgResponseTimeMs: row?.avg_response_time_ms || null,
    minResponseTimeMs: row?.min_response_time_ms || null,
    maxResponseTimeMs: row?.max_response_time_ms || null,
    totalResponses: row?.total_responses || 0,
  };
}

/**
 * Calculate message volume statistics
 */
export async function calculateMessageVolumeStats(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  totalMessages: number;
  sentMessages: number;
  receivedMessages: number;
  avgWordsPerMessage: number | null;
}> {
  // Count sent messages
  const [sentResult] = await database
    .select({ count: count() })
    .from(message)
    .where(
      and(
        eq(message.senderId, userId),
        gte(message.createdAt, startDate),
        lte(message.createdAt, endDate)
      )
    );

  // Count received messages (in conversations where user is participant but not sender)
  const receivedResult = await database.execute(sql`
    SELECT COUNT(*)::integer as count
    FROM message m
    JOIN conversation c ON m.conversation_id = c.id
    WHERE (c.participant1_id = ${userId} OR c.participant2_id = ${userId})
    AND m.sender_id != ${userId}
    AND m.created_at >= ${startDate}
    AND m.created_at <= ${endDate}
  `);

  // Calculate average words per message for sent messages
  const avgWordsResult = await database.execute(sql`
    SELECT AVG(array_length(regexp_split_to_array(content, '\s+'), 1))::real as avg_words
    FROM message
    WHERE sender_id = ${userId}
    AND created_at >= ${startDate}
    AND created_at <= ${endDate}
  `);

  const sentMessages = sentResult?.count ?? 0;
  const receivedMessages = (receivedResult.rows[0] as { count: number })?.count ?? 0;
  const avgWords = (avgWordsResult.rows[0] as { avg_words: number | null })?.avg_words;

  return {
    totalMessages: sentMessages + receivedMessages,
    sentMessages,
    receivedMessages,
    avgWordsPerMessage: avgWords,
  };
}

/**
 * Calculate conversation activity statistics
 */
export async function calculateConversationStats(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  totalConversations: number;
  activeConversations: number;
  newConversations: number;
}> {
  // Total conversations
  const [totalResult] = await database
    .select({ count: count() })
    .from(conversation)
    .where(
      sql`${conversation.participant1Id} = ${userId} OR ${conversation.participant2Id} = ${userId}`
    );

  // Active conversations (have messages in the period)
  const activeResult = await database.execute(sql`
    SELECT COUNT(DISTINCT c.id)::integer as count
    FROM conversation c
    JOIN message m ON m.conversation_id = c.id
    WHERE (c.participant1_id = ${userId} OR c.participant2_id = ${userId})
    AND m.created_at >= ${startDate}
    AND m.created_at <= ${endDate}
  `);

  // New conversations in period
  const [newResult] = await database
    .select({ count: count() })
    .from(conversation)
    .where(
      and(
        sql`${conversation.participant1Id} = ${userId} OR ${conversation.participant2Id} = ${userId}`,
        gte(conversation.createdAt, startDate),
        lte(conversation.createdAt, endDate)
      )
    );

  return {
    totalConversations: totalResult?.count ?? 0,
    activeConversations: (activeResult.rows[0] as { count: number })?.count ?? 0,
    newConversations: newResult?.count ?? 0,
  };
}

/**
 * Calculate peak communication hours
 */
export async function calculatePeakHours(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<number[]> {
  const result = await database.execute(sql`
    SELECT
      EXTRACT(HOUR FROM created_at)::integer as hour,
      COUNT(*)::integer as message_count
    FROM message
    WHERE sender_id = ${userId}
    AND created_at >= ${startDate}
    AND created_at <= ${endDate}
    GROUP BY EXTRACT(HOUR FROM created_at)
    ORDER BY message_count DESC
    LIMIT 3
  `);

  return (result.rows as { hour: number; message_count: number }[]).map((row) => row.hour);
}

/**
 * Get comprehensive communication analytics summary for a user
 */
export async function getCommunicationAnalyticsSummary(
  userId: string,
  days: number = 7
): Promise<{
  responseTime: {
    avgMs: number | null;
    minMs: number | null;
    maxMs: number | null;
    trend: "improving" | "declining" | "stable";
  };
  messageVolume: {
    total: number;
    sent: number;
    received: number;
    dailyAverage: number;
  };
  activity: {
    totalConversations: number;
    activeConversations: number;
    newConversations: number;
  };
  peakHours: number[];
  bottlenecks: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const prevEndDate = new Date(startDate);
  const prevStartDate = new Date(prevEndDate);
  prevStartDate.setDate(prevStartDate.getDate() - days);

  // Get current period stats
  const [responseStats, volumeStats, conversationStats, peakHours] = await Promise.all([
    calculateResponseTimeStats(userId, startDate, endDate),
    calculateMessageVolumeStats(userId, startDate, endDate),
    calculateConversationStats(userId, startDate, endDate),
    calculatePeakHours(userId, startDate, endDate),
  ]);

  // Get previous period for trend calculation
  const prevResponseStats = await calculateResponseTimeStats(userId, prevStartDate, prevEndDate);

  // Calculate trend
  let trend: "improving" | "declining" | "stable" = "stable";
  if (responseStats.avgResponseTimeMs && prevResponseStats.avgResponseTimeMs) {
    const change =
      (responseStats.avgResponseTimeMs - prevResponseStats.avgResponseTimeMs) /
      prevResponseStats.avgResponseTimeMs;
    if (change < -0.1) trend = "improving"; // Response time decreased by more than 10%
    else if (change > 0.1) trend = "declining"; // Response time increased by more than 10%
  }

  // Get bottleneck counts
  const bottleneckCounts = await countBottlenecksBySeverity();
  const bottlenecksByLevel = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };
  let totalBottlenecks = 0;
  bottleneckCounts.forEach((b) => {
    bottlenecksByLevel[b.severity as keyof typeof bottlenecksByLevel] = b.count;
    totalBottlenecks += b.count;
  });

  return {
    responseTime: {
      avgMs: responseStats.avgResponseTimeMs,
      minMs: responseStats.minResponseTimeMs,
      maxMs: responseStats.maxResponseTimeMs,
      trend,
    },
    messageVolume: {
      total: volumeStats.totalMessages,
      sent: volumeStats.sentMessages,
      received: volumeStats.receivedMessages,
      dailyAverage: Math.round(volumeStats.totalMessages / days),
    },
    activity: {
      totalConversations: conversationStats.totalConversations,
      activeConversations: conversationStats.activeConversations,
      newConversations: conversationStats.newConversations,
    },
    peakHours,
    bottlenecks: {
      total: totalBottlenecks,
      ...bottlenecksByLevel,
    },
  };
}

/**
 * Get team-wide communication analytics summary
 */
export async function getTeamCommunicationAnalytics(
  days: number = 7
): Promise<{
  totalMessages: number;
  avgResponseTimeMs: number | null;
  activeUsers: number;
  activeConversations: number;
  topCommunicators: Array<{
    userId: string;
    userName: string;
    messageCount: number;
  }>;
  bottlenecks: Array<CommunicationBottleneck>;
}> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Total messages
  const [totalResult] = await database
    .select({ count: count() })
    .from(message)
    .where(and(gte(message.createdAt, startDate), lte(message.createdAt, endDate)));

  // Active users
  const activeUsersResult = await database.execute(sql`
    SELECT COUNT(DISTINCT sender_id)::integer as count
    FROM message
    WHERE created_at >= ${startDate}
    AND created_at <= ${endDate}
  `);

  // Active conversations
  const activeConvsResult = await database.execute(sql`
    SELECT COUNT(DISTINCT conversation_id)::integer as count
    FROM message
    WHERE created_at >= ${startDate}
    AND created_at <= ${endDate}
  `);

  // Top communicators
  const topCommunicators = await database.execute(sql`
    SELECT
      m.sender_id as user_id,
      u.name as user_name,
      COUNT(*)::integer as message_count
    FROM message m
    JOIN "user" u ON m.sender_id = u.id
    WHERE m.created_at >= ${startDate}
    AND m.created_at <= ${endDate}
    GROUP BY m.sender_id, u.name
    ORDER BY message_count DESC
    LIMIT 5
  `);

  // Get active bottlenecks
  const bottlenecks = await findActiveBottlenecks(undefined, 10);

  // Calculate overall average response time
  const avgResponseResult = await database.execute(sql`
    WITH message_pairs AS (
      SELECT
        m.id,
        m.conversation_id,
        m.sender_id,
        m.created_at,
        LAG(m.created_at) OVER (
          PARTITION BY m.conversation_id
          ORDER BY m.created_at
        ) as prev_message_time,
        LAG(m.sender_id) OVER (
          PARTITION BY m.conversation_id
          ORDER BY m.created_at
        ) as prev_sender_id
      FROM message m
      WHERE m.created_at >= ${startDate}
      AND m.created_at <= ${endDate}
    )
    SELECT
      AVG(EXTRACT(EPOCH FROM (created_at - prev_message_time)) * 1000)::real as avg_response_time_ms
    FROM message_pairs
    WHERE prev_message_time IS NOT NULL
    AND prev_sender_id != sender_id
  `);

  return {
    totalMessages: totalResult?.count ?? 0,
    avgResponseTimeMs:
      (avgResponseResult.rows[0] as { avg_response_time_ms: number | null })
        ?.avg_response_time_ms || null,
    activeUsers: (activeUsersResult.rows[0] as { count: number })?.count ?? 0,
    activeConversations: (activeConvsResult.rows[0] as { count: number })?.count ?? 0,
    topCommunicators: (
      topCommunicators.rows as Array<{
        user_id: string;
        user_name: string;
        message_count: number;
      }>
    ).map((row) => ({
      userId: row.user_id,
      userName: row.user_name,
      messageCount: row.message_count,
    })),
    bottlenecks,
  };
}
