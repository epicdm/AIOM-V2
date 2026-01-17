/**
 * Proactive Monitoring Engine Types
 *
 * Type definitions for the health check and anomaly detection system.
 */

// =============================================================================
// Health Check Types
// =============================================================================

export type HealthCheckCategory =
  | "tasks"
  | "expenses"
  | "financial"
  | "customer_issues"
  | "team_capacity";

export type HealthStatus = "healthy" | "warning" | "critical" | "unknown";

export type AlertSeverity = "info" | "low" | "medium" | "high" | "critical";

export type AlertType =
  // Task alerts
  | "tasks_overdue_spike"
  | "tasks_completion_rate_drop"
  | "tasks_blocked_increase"
  | "tasks_assignment_imbalance"
  // Expense alerts
  | "expenses_pending_approval_backlog"
  | "expenses_unusual_amount"
  | "expenses_missing_receipts"
  | "expenses_budget_threshold"
  // Financial alerts
  | "financial_ar_aging"
  | "financial_ap_overdue"
  | "financial_cash_flow_concern"
  | "financial_invoice_overdue"
  // Customer issue alerts
  | "customer_unresolved_escalations"
  | "customer_sentiment_decline"
  | "customer_follow_up_missed"
  | "customer_response_time_high"
  // Team capacity alerts
  | "team_overload"
  | "team_underutilized"
  | "team_bottleneck";

// =============================================================================
// Health Check Result Types
// =============================================================================

export interface HealthCheckMetric {
  name: string;
  value: number;
  unit?: string;
  threshold?: {
    warning: number;
    critical: number;
  };
  trend?: "improving" | "stable" | "declining";
  comparisonValue?: number;
  comparisonPeriod?: string;
}

export interface HealthCheckResult {
  category: HealthCheckCategory;
  status: HealthStatus;
  score: number; // 0-100
  metrics: HealthCheckMetric[];
  anomalies: AnomalyDetection[];
  lastChecked: Date;
  details?: string;
}

export interface AnomalyDetection {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  metric: string;
  currentValue: number;
  expectedValue: number;
  deviation: number; // Percentage deviation from expected
  detectedAt: Date;
  affectedEntities?: AffectedEntity[];
  suggestedAction?: string;
}

export interface AffectedEntity {
  type: "user" | "task" | "expense" | "customer" | "voucher";
  id: string;
  name: string;
}

// =============================================================================
// Alert Types
// =============================================================================

export interface MonitoringAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  category: HealthCheckCategory;
  title: string;
  message: string;
  data: Record<string, unknown>;
  createdAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  acknowledgedBy?: string;
  notificationsSent: AlertNotificationRecord[];
}

export interface AlertNotificationRecord {
  userId: string;
  method: "push" | "email" | "in_app";
  sentAt: Date;
  status: "pending" | "sent" | "delivered" | "failed";
  messageId?: string;
  error?: string;
}

// =============================================================================
// Monitoring Configuration Types
// =============================================================================

export interface MonitoringThresholds {
  tasks: {
    overduePercentageWarning: number;
    overduePercentageCritical: number;
    completionRateDropWarning: number;
    completionRateDropCritical: number;
    maxTasksPerUser: number;
  };
  expenses: {
    pendingApprovalDaysWarning: number;
    pendingApprovalDaysCritical: number;
    unusualAmountMultiplier: number;
    missingReceiptsDaysWarning: number;
    budgetThresholdWarning: number;
    budgetThresholdCritical: number;
  };
  financial: {
    arAgingDaysWarning: number;
    arAgingDaysCritical: number;
    apOverdueDaysWarning: number;
    cashFlowDaysWarning: number;
  };
  customerIssues: {
    unresolvedEscalationHoursWarning: number;
    unresolvedEscalationHoursCritical: number;
    missedFollowUpHoursWarning: number;
    responseTimeHoursWarning: number;
  };
  teamCapacity: {
    overloadPercentageWarning: number;
    overloadPercentageCritical: number;
    underutilizedPercentage: number;
  };
}

export interface MonitoringConfig {
  enabled: boolean;
  checkIntervalMinutes: number;
  thresholds: MonitoringThresholds;
  alertRecipients: {
    category: HealthCheckCategory;
    userIds: string[];
    notifyOnSeverity: AlertSeverity[];
  }[];
  quietHours: {
    enabled: boolean;
    start: string; // HH:mm
    end: string; // HH:mm
    timezone: string;
  };
  workingDays: number[]; // 0-6 (Sunday-Saturday)
}

// =============================================================================
// Process Result Types
// =============================================================================

export interface MonitoringProcessResult {
  timestamp: Date;
  duration: number; // milliseconds
  healthChecks: HealthCheckResult[];
  alertsGenerated: number;
  notificationsSent: number;
  errors: MonitoringError[];
}

export interface MonitoringError {
  category?: HealthCheckCategory;
  operation: string;
  error: string;
  timestamp: Date;
}

// =============================================================================
// Dashboard / Summary Types
// =============================================================================

export interface MonitoringDashboard {
  overallStatus: HealthStatus;
  overallScore: number;
  lastUpdated: Date;
  categories: {
    category: HealthCheckCategory;
    status: HealthStatus;
    score: number;
    activeAlerts: number;
    lastChecked: Date;
  }[];
  recentAlerts: MonitoringAlert[];
  trendData: {
    period: string;
    scores: {
      category: HealthCheckCategory;
      scores: number[];
    }[];
  };
}

export interface MonitoringStats {
  isProcessing: boolean;
  lastProcessedAt?: Date;
  totalChecksToday: number;
  alertsGeneratedToday: number;
  averageHealthScore: number;
  categoryScores: {
    category: HealthCheckCategory;
    score: number;
    status: HealthStatus;
  }[];
}

// =============================================================================
// Default Configuration
// =============================================================================

export const DEFAULT_MONITORING_THRESHOLDS: MonitoringThresholds = {
  tasks: {
    overduePercentageWarning: 15,
    overduePercentageCritical: 30,
    completionRateDropWarning: 20,
    completionRateDropCritical: 40,
    maxTasksPerUser: 15,
  },
  expenses: {
    pendingApprovalDaysWarning: 3,
    pendingApprovalDaysCritical: 7,
    unusualAmountMultiplier: 3,
    missingReceiptsDaysWarning: 5,
    budgetThresholdWarning: 80,
    budgetThresholdCritical: 95,
  },
  financial: {
    arAgingDaysWarning: 30,
    arAgingDaysCritical: 60,
    apOverdueDaysWarning: 15,
    cashFlowDaysWarning: 30,
  },
  customerIssues: {
    unresolvedEscalationHoursWarning: 24,
    unresolvedEscalationHoursCritical: 48,
    missedFollowUpHoursWarning: 4,
    responseTimeHoursWarning: 2,
  },
  teamCapacity: {
    overloadPercentageWarning: 80,
    overloadPercentageCritical: 100,
    underutilizedPercentage: 30,
  },
};

export const DEFAULT_MONITORING_CONFIG: MonitoringConfig = {
  enabled: true,
  checkIntervalMinutes: 15,
  thresholds: DEFAULT_MONITORING_THRESHOLDS,
  alertRecipients: [],
  quietHours: {
    enabled: true,
    start: "22:00",
    end: "08:00",
    timezone: "America/New_York",
  },
  workingDays: [1, 2, 3, 4, 5], // Monday to Friday
};
