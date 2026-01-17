// Communication Analytics Service Types

export interface ResponseTimeMetrics {
  avgMs: number | null;
  minMs: number | null;
  maxMs: number | null;
  medianMs: number | null;
  p95Ms: number | null;
  trend: "improving" | "declining" | "stable";
  trendPercentage: number | null;
}

export interface MessageVolumeMetrics {
  total: number;
  sent: number;
  received: number;
  dailyAverage: number;
  weeklyAverage: number;
  trend: "increasing" | "decreasing" | "stable";
  trendPercentage: number | null;
}

export interface ConversationMetrics {
  totalConversations: number;
  activeConversations: number;
  newConversations: number;
  avgMessagesPerConversation: number;
}

export interface EngagementMetrics {
  avgWordsPerMessage: number | null;
  readRate: number | null; // Percentage of messages read
  responseRate: number | null; // Percentage of messages that get responses
  peakHours: number[]; // Top 3 hours with most activity
}

export interface BottleneckSummary {
  total: number;
  bySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  byType: Record<string, number>;
}

export interface UserCommunicationProfile {
  userId: string;
  userName: string;
  messageCount: number;
  avgResponseTimeMs: number | null;
  engagementScore: number; // 0-100
}

export interface CommunicationAnalyticsSummary {
  period: {
    startDate: string;
    endDate: string;
    days: number;
  };
  responseTime: ResponseTimeMetrics;
  messageVolume: MessageVolumeMetrics;
  conversations: ConversationMetrics;
  engagement: EngagementMetrics;
  bottlenecks: BottleneckSummary;
}

export interface TeamCommunicationAnalytics {
  period: {
    startDate: string;
    endDate: string;
    days: number;
  };
  overview: {
    totalMessages: number;
    avgResponseTimeMs: number | null;
    activeUsers: number;
    activeConversations: number;
  };
  topCommunicators: UserCommunicationProfile[];
  bottlenecks: Array<{
    id: string;
    type: string;
    severity: string;
    title: string;
    description: string;
    affectedUser?: string;
  }>;
  patterns: Array<{
    type: string;
    title: string;
    description: string;
    confidence: number;
  }>;
}

export interface CommunicationTrendPoint {
  date: string;
  messageCount: number;
  avgResponseTimeMs: number | null;
  activeConversations: number;
}

export interface BottleneckDetectionConfig {
  slowResponseThresholdMs: number; // Threshold for slow response alert (default: 1 hour)
  inactiveConversationDays: number; // Days without activity to flag (default: 7)
  messageBacklogThreshold: number; // Unread messages threshold (default: 10)
  lowEngagementThreshold: number; // Engagement score threshold (default: 20)
}

export const DEFAULT_BOTTLENECK_CONFIG: BottleneckDetectionConfig = {
  slowResponseThresholdMs: 3600000, // 1 hour
  inactiveConversationDays: 7,
  messageBacklogThreshold: 10,
  lowEngagementThreshold: 20,
};

export interface DetectedBottleneck {
  type: "slow_response" | "low_engagement" | "message_backlog" | "inactive_conversation";
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  userId?: string;
  conversationId?: string;
  metricName: string;
  currentValue: number;
  thresholdValue: number;
  suggestions: string[];
}
