// Communication Analytics Service
// Provides analytics on response times, message volumes, and communication patterns

import {
  getCommunicationAnalyticsSummary,
  getTeamCommunicationAnalytics,
  createBottleneck,
  findActiveBottlenecks,
  updateBottleneckStatus,
  calculateResponseTimeStats,
  calculateMessageVolumeStats,
  calculateConversationStats,
  calculatePeakHours,
} from "~/data-access/communication-analytics";
import type {
  CommunicationAnalyticsSummary,
  TeamCommunicationAnalytics,
  DetectedBottleneck,
  BottleneckDetectionConfig,
  CommunicationTrendPoint,
} from "./types";
import { DEFAULT_BOTTLENECK_CONFIG } from "./types";

/**
 * Communication Analytics Service
 * Provides comprehensive analytics for team communication patterns
 */
export class CommunicationAnalyticsService {
  private config: BottleneckDetectionConfig;

  constructor(config: Partial<BottleneckDetectionConfig> = {}) {
    this.config = { ...DEFAULT_BOTTLENECK_CONFIG, ...config };
  }

  /**
   * Get comprehensive communication analytics for a specific user
   */
  async getUserAnalytics(
    userId: string,
    days: number = 7
  ): Promise<CommunicationAnalyticsSummary> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const summary = await getCommunicationAnalyticsSummary(userId, days);

    return {
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        days,
      },
      responseTime: {
        avgMs: summary.responseTime.avgMs,
        minMs: summary.responseTime.minMs,
        maxMs: summary.responseTime.maxMs,
        medianMs: null, // TODO: Calculate median
        p95Ms: null, // TODO: Calculate P95
        trend: summary.responseTime.trend,
        trendPercentage: null,
      },
      messageVolume: {
        total: summary.messageVolume.total,
        sent: summary.messageVolume.sent,
        received: summary.messageVolume.received,
        dailyAverage: summary.messageVolume.dailyAverage,
        weeklyAverage: Math.round(summary.messageVolume.dailyAverage * 7),
        trend: "stable",
        trendPercentage: null,
      },
      conversations: {
        totalConversations: summary.activity.totalConversations,
        activeConversations: summary.activity.activeConversations,
        newConversations: summary.activity.newConversations,
        avgMessagesPerConversation:
          summary.activity.activeConversations > 0
            ? Math.round(summary.messageVolume.total / summary.activity.activeConversations)
            : 0,
      },
      engagement: {
        avgWordsPerMessage: null, // TODO: Calculate from data
        readRate: null, // TODO: Calculate from data
        responseRate: null, // TODO: Calculate from data
        peakHours: summary.peakHours,
      },
      bottlenecks: {
        total: summary.bottlenecks.total,
        bySeverity: {
          critical: summary.bottlenecks.critical,
          high: summary.bottlenecks.high,
          medium: summary.bottlenecks.medium,
          low: summary.bottlenecks.low,
        },
        byType: {},
      },
    };
  }

  /**
   * Get team-wide communication analytics
   */
  async getTeamAnalytics(days: number = 7): Promise<TeamCommunicationAnalytics> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const teamData = await getTeamCommunicationAnalytics(days);

    return {
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        days,
      },
      overview: {
        totalMessages: teamData.totalMessages,
        avgResponseTimeMs: teamData.avgResponseTimeMs,
        activeUsers: teamData.activeUsers,
        activeConversations: teamData.activeConversations,
      },
      topCommunicators: teamData.topCommunicators.map((c) => ({
        userId: c.userId,
        userName: c.userName,
        messageCount: c.messageCount,
        avgResponseTimeMs: null,
        engagementScore: this.calculateEngagementScore(c.messageCount, days),
      })),
      bottlenecks: teamData.bottlenecks.map((b) => ({
        id: b.id,
        type: b.bottleneckType,
        severity: b.severity,
        title: b.title,
        description: b.description,
        affectedUser: b.userId || undefined,
      })),
      patterns: [],
    };
  }

  /**
   * Detect communication bottlenecks
   */
  async detectBottlenecks(userId?: string): Promise<DetectedBottleneck[]> {
    const bottlenecks: DetectedBottleneck[] = [];
    const days = 7;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    if (userId) {
      // Check for slow response times
      const responseStats = await calculateResponseTimeStats(userId, startDate, endDate);
      if (
        responseStats.avgResponseTimeMs &&
        responseStats.avgResponseTimeMs > this.config.slowResponseThresholdMs
      ) {
        const severity = this.calculateSeverity(
          responseStats.avgResponseTimeMs,
          this.config.slowResponseThresholdMs,
          [1.5, 2, 3] // 1.5x = medium, 2x = high, 3x = critical
        );

        bottlenecks.push({
          type: "slow_response",
          severity,
          title: "Slow Response Time Detected",
          description: `Average response time (${this.formatDuration(
            responseStats.avgResponseTimeMs
          )}) exceeds the threshold of ${this.formatDuration(
            this.config.slowResponseThresholdMs
          )}`,
          userId,
          metricName: "average_response_time_ms",
          currentValue: responseStats.avgResponseTimeMs,
          thresholdValue: this.config.slowResponseThresholdMs,
          suggestions: [
            "Set dedicated time blocks for responding to messages",
            "Enable notifications for high-priority conversations",
            "Consider using quick reply templates for common questions",
          ],
        });
      }

      // Check for low engagement
      const volumeStats = await calculateMessageVolumeStats(userId, startDate, endDate);
      const engagementScore = this.calculateEngagementScore(volumeStats.totalMessages, days);
      if (engagementScore < this.config.lowEngagementThreshold) {
        bottlenecks.push({
          type: "low_engagement",
          severity: "medium",
          title: "Low Communication Engagement",
          description: `Engagement score (${engagementScore}) is below the threshold of ${this.config.lowEngagementThreshold}`,
          userId,
          metricName: "engagement_score",
          currentValue: engagementScore,
          thresholdValue: this.config.lowEngagementThreshold,
          suggestions: [
            "Schedule regular check-ins with team members",
            "Participate in group conversations more actively",
            "Set reminders to follow up on pending discussions",
          ],
        });
      }
    }

    return bottlenecks;
  }

  /**
   * Get communication trends over time
   */
  async getTrends(
    userId: string,
    days: number = 30
  ): Promise<CommunicationTrendPoint[]> {
    const trends: CommunicationTrendPoint[] = [];
    const endDate = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(endDate.getDate() - i);
      const dayStart = new Date(date.setHours(0, 0, 0, 0));
      const dayEnd = new Date(date.setHours(23, 59, 59, 999));

      const [volumeStats, responseStats, conversationStats] = await Promise.all([
        calculateMessageVolumeStats(userId, dayStart, dayEnd),
        calculateResponseTimeStats(userId, dayStart, dayEnd),
        calculateConversationStats(userId, dayStart, dayEnd),
      ]);

      trends.push({
        date: dayStart.toISOString().split("T")[0],
        messageCount: volumeStats.totalMessages,
        avgResponseTimeMs: responseStats.avgResponseTimeMs,
        activeConversations: conversationStats.activeConversations,
      });
    }

    return trends;
  }

  /**
   * Save detected bottlenecks to database
   */
  async saveBottlenecks(bottlenecks: DetectedBottleneck[]): Promise<void> {
    for (const bottleneck of bottlenecks) {
      await createBottleneck({
        id: crypto.randomUUID(),
        bottleneckType: bottleneck.type,
        severity: bottleneck.severity,
        title: bottleneck.title,
        description: bottleneck.description,
        userId: bottleneck.userId || null,
        conversationId: bottleneck.conversationId || null,
        metricName: bottleneck.metricName,
        currentValue: bottleneck.currentValue,
        thresholdValue: bottleneck.thresholdValue,
        suggestions: bottleneck.suggestions,
        status: "detected",
        detectedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  /**
   * Get active bottlenecks for a user or team
   */
  async getActiveBottlenecks(userId?: string) {
    return findActiveBottlenecks(userId);
  }

  /**
   * Acknowledge a bottleneck
   */
  async acknowledgeBottleneck(bottleneckId: string, userId: string) {
    return updateBottleneckStatus(bottleneckId, "acknowledged", userId);
  }

  /**
   * Resolve a bottleneck
   */
  async resolveBottleneck(bottleneckId: string, userId: string) {
    return updateBottleneckStatus(bottleneckId, "resolved", userId);
  }

  /**
   * Dismiss a bottleneck
   */
  async dismissBottleneck(bottleneckId: string, userId: string) {
    return updateBottleneckStatus(bottleneckId, "dismissed", userId);
  }

  // =============================================================================
  // Private Helper Methods
  // =============================================================================

  private calculateEngagementScore(messageCount: number, days: number): number {
    // Simple engagement score based on daily message activity
    // 0-100 scale where 100 is highly engaged
    const dailyAverage = messageCount / days;

    // Score calculation:
    // 0 messages/day = 0
    // 5 messages/day = 50
    // 10+ messages/day = 100
    const score = Math.min(100, dailyAverage * 10);
    return Math.round(score);
  }

  private calculateSeverity(
    value: number,
    threshold: number,
    multipliers: [number, number, number]
  ): "low" | "medium" | "high" | "critical" {
    const ratio = value / threshold;

    if (ratio >= multipliers[2]) return "critical";
    if (ratio >= multipliers[1]) return "high";
    if (ratio >= multipliers[0]) return "medium";
    return "low";
  }

  private formatDuration(ms: number): string {
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
    if (ms < 86400000) return `${(ms / 3600000).toFixed(1)}h`;
    return `${(ms / 86400000).toFixed(1)}d`;
  }
}

// Export singleton instance with default config
export const communicationAnalyticsService = new CommunicationAnalyticsService();
