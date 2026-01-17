/**
 * Proactive Monitoring Engine Service
 *
 * Main service that orchestrates health checks across all monitored categories
 * and generates alerts for anomalies. Runs periodic checks via cron job.
 *
 * Features:
 * - Monitors tasks, expenses, financial position, customer issues, team capacity
 * - Detects anomalies using configurable thresholds
 * - Generates alerts with appropriate severity levels
 * - Respects quiet hours and working days
 * - Sends notifications via push, email, or in-app
 */

import { nanoid } from "nanoid";
import {
  getTaskHealthMetrics,
  getExpenseHealthMetrics,
  getFinancialHealthMetrics,
  getCustomerIssueMetrics,
  getTeamCapacityMetrics,
  isWithinQuietHours,
  isWorkingDay,
} from "~/data-access/proactive-monitoring";
import { getPushNotificationService } from "~/lib/push-notification/service";
import type { PushNotificationPayload } from "~/lib/push-notification/types";
import {
  type HealthCheckCategory,
  type HealthCheckResult,
  type HealthStatus,
  type AnomalyDetection,
  type AlertSeverity,
  type AlertType,
  type MonitoringAlert,
  type MonitoringProcessResult,
  type MonitoringError,
  type MonitoringStats,
  type MonitoringConfig,
  type MonitoringThresholds,
  DEFAULT_MONITORING_CONFIG,
  DEFAULT_MONITORING_THRESHOLDS,
} from "./types";

// =============================================================================
// Proactive Monitoring Engine Service
// =============================================================================

export class ProactiveMonitoringService {
  private isProcessing = false;
  private lastProcessedAt?: Date;
  private config: MonitoringConfig;
  private alertHistory: MonitoringAlert[] = [];
  private healthCheckHistory: Map<HealthCheckCategory, HealthCheckResult[]> = new Map();

  constructor(config?: Partial<MonitoringConfig>) {
    this.config = {
      ...DEFAULT_MONITORING_CONFIG,
      ...config,
      thresholds: {
        ...DEFAULT_MONITORING_THRESHOLDS,
        ...(config?.thresholds || {}),
      },
    };
  }

  /**
   * Run all health checks and generate alerts
   * Main entry point called by cron job
   */
  async runHealthChecks(): Promise<MonitoringProcessResult> {
    if (this.isProcessing) {
      console.log("Proactive monitoring is already processing, skipping...");
      return {
        timestamp: new Date(),
        duration: 0,
        healthChecks: [],
        alertsGenerated: 0,
        notificationsSent: 0,
        errors: [],
      };
    }

    // Check quiet hours and working days
    if (this.config.quietHours.enabled) {
      if (
        isWithinQuietHours(
          this.config.quietHours.timezone,
          this.config.quietHours.start,
          this.config.quietHours.end
        )
      ) {
        console.log("Proactive monitoring: within quiet hours, skipping...");
        return {
          timestamp: new Date(),
          duration: 0,
          healthChecks: [],
          alertsGenerated: 0,
          notificationsSent: 0,
          errors: [],
        };
      }
    }

    if (!isWorkingDay(this.config.quietHours.timezone, this.config.workingDays)) {
      console.log("Proactive monitoring: not a working day, skipping...");
      return {
        timestamp: new Date(),
        duration: 0,
        healthChecks: [],
        alertsGenerated: 0,
        notificationsSent: 0,
        errors: [],
      };
    }

    this.isProcessing = true;
    const startTime = Date.now();
    const errors: MonitoringError[] = [];
    const healthChecks: HealthCheckResult[] = [];
    let alertsGenerated = 0;
    let notificationsSent = 0;

    try {
      console.log("Starting proactive health monitoring...");

      // Run health checks for each category
      const categories: HealthCheckCategory[] = [
        "tasks",
        "expenses",
        "financial",
        "customer_issues",
        "team_capacity",
      ];

      for (const category of categories) {
        try {
          const result = await this.runCategoryHealthCheck(category);
          healthChecks.push(result);

          // Store in history
          const history = this.healthCheckHistory.get(category) || [];
          history.push(result);
          // Keep last 100 results
          if (history.length > 100) history.shift();
          this.healthCheckHistory.set(category, history);

          // Process anomalies and generate alerts
          for (const anomaly of result.anomalies) {
            const alert = await this.createAlert(anomaly, category);
            this.alertHistory.push(alert);
            alertsGenerated++;

            // Send notifications
            const notifCount = await this.sendAlertNotifications(alert);
            notificationsSent += notifCount;
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          errors.push({
            category,
            operation: "health_check",
            error: errorMessage,
            timestamp: new Date(),
          });
          console.error(`Error in ${category} health check:`, error);
        }
      }

      this.lastProcessedAt = new Date();
      console.log(
        `Proactive monitoring complete: ${healthChecks.length} checks, ` +
        `${alertsGenerated} alerts, ${notificationsSent} notifications`
      );
    } finally {
      this.isProcessing = false;
    }

    return {
      timestamp: new Date(),
      duration: Date.now() - startTime,
      healthChecks,
      alertsGenerated,
      notificationsSent,
      errors,
    };
  }

  /**
   * Run health check for a specific category
   */
  private async runCategoryHealthCheck(
    category: HealthCheckCategory
  ): Promise<HealthCheckResult> {
    const anomalies: AnomalyDetection[] = [];
    let score = 100;
    let status: HealthStatus = "healthy";

    switch (category) {
      case "tasks":
        return this.checkTasksHealth();
      case "expenses":
        return this.checkExpensesHealth();
      case "financial":
        return this.checkFinancialHealth();
      case "customer_issues":
        return this.checkCustomerIssuesHealth();
      case "team_capacity":
        return this.checkTeamCapacityHealth();
      default:
        return {
          category,
          status: "unknown",
          score: 0,
          metrics: [],
          anomalies: [],
          lastChecked: new Date(),
        };
    }
  }

  /**
   * Check tasks health
   */
  private async checkTasksHealth(): Promise<HealthCheckResult> {
    const metrics = await getTaskHealthMetrics();
    const thresholds = this.config.thresholds.tasks;
    const anomalies: AnomalyDetection[] = [];
    let score = 100;

    // Check overdue percentage
    if (metrics.overduePercentage >= thresholds.overduePercentageCritical) {
      score -= 40;
      anomalies.push({
        id: nanoid(),
        type: "tasks_overdue_spike",
        severity: "critical",
        title: "Critical: High Overdue Task Rate",
        description: `${metrics.overduePercentage.toFixed(1)}% of tasks are overdue (${metrics.overdueTasks} of ${metrics.totalTasks})`,
        metric: "overdue_percentage",
        currentValue: metrics.overduePercentage,
        expectedValue: thresholds.overduePercentageWarning,
        deviation: ((metrics.overduePercentage - thresholds.overduePercentageWarning) / thresholds.overduePercentageWarning) * 100,
        detectedAt: new Date(),
        suggestedAction: "Review overdue tasks and reassign or update deadlines",
      });
    } else if (metrics.overduePercentage >= thresholds.overduePercentageWarning) {
      score -= 20;
      anomalies.push({
        id: nanoid(),
        type: "tasks_overdue_spike",
        severity: "medium",
        title: "Warning: Elevated Overdue Task Rate",
        description: `${metrics.overduePercentage.toFixed(1)}% of tasks are overdue (${metrics.overdueTasks} of ${metrics.totalTasks})`,
        metric: "overdue_percentage",
        currentValue: metrics.overduePercentage,
        expectedValue: thresholds.overduePercentageWarning,
        deviation: ((metrics.overduePercentage - thresholds.overduePercentageWarning) / thresholds.overduePercentageWarning) * 100,
        detectedAt: new Date(),
        suggestedAction: "Review overdue tasks and prioritize completion",
      });
    }

    // Check blocked tasks
    if (metrics.blockedTasks > 0) {
      const blockedPercentage = (metrics.blockedTasks / Math.max(metrics.totalTasks, 1)) * 100;
      if (blockedPercentage > 10) {
        score -= 15;
        anomalies.push({
          id: nanoid(),
          type: "tasks_blocked_increase",
          severity: "medium",
          title: "Multiple Blocked Tasks",
          description: `${metrics.blockedTasks} tasks are currently blocked (${blockedPercentage.toFixed(1)}%)`,
          metric: "blocked_tasks",
          currentValue: metrics.blockedTasks,
          expectedValue: 0,
          deviation: 100,
          detectedAt: new Date(),
          suggestedAction: "Identify blockers and resolve dependencies",
        });
      }
    }

    // Check task assignment imbalance
    if (metrics.tasksByUser.length > 0) {
      const maxTasks = Math.max(...metrics.tasksByUser.map((u) => u.taskCount));
      const minTasks = Math.min(...metrics.tasksByUser.map((u) => u.taskCount));
      if (maxTasks > thresholds.maxTasksPerUser) {
        score -= 10;
        const overloadedUsers = metrics.tasksByUser.filter(
          (u) => u.taskCount > thresholds.maxTasksPerUser
        );
        anomalies.push({
          id: nanoid(),
          type: "tasks_assignment_imbalance",
          severity: "low",
          title: "Task Assignment Imbalance",
          description: `${overloadedUsers.length} team member(s) have more than ${thresholds.maxTasksPerUser} tasks assigned`,
          metric: "max_tasks_per_user",
          currentValue: maxTasks,
          expectedValue: thresholds.maxTasksPerUser,
          deviation: ((maxTasks - thresholds.maxTasksPerUser) / thresholds.maxTasksPerUser) * 100,
          detectedAt: new Date(),
          affectedEntities: overloadedUsers.map((u) => ({
            type: "user" as const,
            id: u.userId,
            name: u.userName,
          })),
          suggestedAction: "Redistribute tasks among team members",
        });
      }
    }

    const status: HealthStatus = score >= 80 ? "healthy" : score >= 50 ? "warning" : "critical";

    return {
      category: "tasks",
      status,
      score: Math.max(0, score),
      metrics: [
        { name: "Total Tasks", value: metrics.totalTasks },
        { name: "Overdue Tasks", value: metrics.overdueTasks, threshold: { warning: thresholds.overduePercentageWarning, critical: thresholds.overduePercentageCritical } },
        { name: "Overdue Percentage", value: metrics.overduePercentage, unit: "%" },
        { name: "Completed Today", value: metrics.completedToday },
        { name: "Completed This Week", value: metrics.completedThisWeek },
        { name: "Pending Tasks", value: metrics.pendingTasks },
        { name: "In Progress", value: metrics.inProgressTasks },
        { name: "Blocked Tasks", value: metrics.blockedTasks },
      ],
      anomalies,
      lastChecked: new Date(),
    };
  }

  /**
   * Check expenses health
   */
  private async checkExpensesHealth(): Promise<HealthCheckResult> {
    const metrics = await getExpenseHealthMetrics();
    const thresholds = this.config.thresholds.expenses;
    const anomalies: AnomalyDetection[] = [];
    let score = 100;

    // Check pending approval backlog
    if (metrics.oldestPendingDays !== null) {
      if (metrics.oldestPendingDays >= thresholds.pendingApprovalDaysCritical) {
        score -= 30;
        anomalies.push({
          id: nanoid(),
          type: "expenses_pending_approval_backlog",
          severity: "high",
          title: "Critical Expense Approval Backlog",
          description: `${metrics.totalPendingApproval} expenses pending approval, oldest is ${metrics.oldestPendingDays} days old`,
          metric: "oldest_pending_days",
          currentValue: metrics.oldestPendingDays,
          expectedValue: thresholds.pendingApprovalDaysWarning,
          deviation: ((metrics.oldestPendingDays - thresholds.pendingApprovalDaysWarning) / thresholds.pendingApprovalDaysWarning) * 100,
          detectedAt: new Date(),
          suggestedAction: "Review and process pending expense approvals",
        });
      } else if (metrics.oldestPendingDays >= thresholds.pendingApprovalDaysWarning) {
        score -= 15;
        anomalies.push({
          id: nanoid(),
          type: "expenses_pending_approval_backlog",
          severity: "medium",
          title: "Expense Approval Delays",
          description: `${metrics.totalPendingApproval} expenses pending approval, oldest is ${metrics.oldestPendingDays} days old`,
          metric: "oldest_pending_days",
          currentValue: metrics.oldestPendingDays,
          expectedValue: thresholds.pendingApprovalDaysWarning,
          deviation: ((metrics.oldestPendingDays - thresholds.pendingApprovalDaysWarning) / thresholds.pendingApprovalDaysWarning) * 100,
          detectedAt: new Date(),
          suggestedAction: "Review pending expense requests",
        });
      }
    }

    // Check missing receipts
    if (metrics.totalAwaitingReceipts > 0) {
      score -= 10;
      anomalies.push({
        id: nanoid(),
        type: "expenses_missing_receipts",
        severity: "low",
        title: "Expenses Awaiting Receipts",
        description: `${metrics.totalAwaitingReceipts} disbursed expenses are awaiting receipt uploads`,
        metric: "awaiting_receipts",
        currentValue: metrics.totalAwaitingReceipts,
        expectedValue: 0,
        deviation: 100,
        detectedAt: new Date(),
        suggestedAction: "Send reminders for receipt uploads",
      });
    }

    // Check unusual amounts
    if (metrics.largeExpenses.length > 0) {
      anomalies.push({
        id: nanoid(),
        type: "expenses_unusual_amount",
        severity: "info",
        title: "Large Expense Requests",
        description: `${metrics.largeExpenses.length} expense(s) exceed typical amounts`,
        metric: "large_expenses",
        currentValue: metrics.largeExpenses.length,
        expectedValue: 0,
        deviation: 100,
        detectedAt: new Date(),
        affectedEntities: metrics.largeExpenses.map((e) => ({
          type: "expense" as const,
          id: e.id,
          name: `${e.purpose} ($${e.amount.toFixed(2)})`,
        })),
        suggestedAction: "Review large expense requests for compliance",
      });
    }

    const status: HealthStatus = score >= 80 ? "healthy" : score >= 50 ? "warning" : "critical";

    return {
      category: "expenses",
      status,
      score: Math.max(0, score),
      metrics: [
        { name: "Pending Approval", value: metrics.totalPendingApproval },
        { name: "Oldest Pending (days)", value: metrics.oldestPendingDays || 0 },
        { name: "Awaiting Receipts", value: metrics.totalAwaitingReceipts },
        { name: "Pending Reconciliation", value: metrics.totalPendingReconciliation },
        { name: "Total Pending Amount", value: metrics.totalAmountPending, unit: "USD" },
        { name: "Avg Approval Time (hrs)", value: metrics.averageApprovalTime || 0 },
      ],
      anomalies,
      lastChecked: new Date(),
    };
  }

  /**
   * Check financial health
   */
  private async checkFinancialHealth(): Promise<HealthCheckResult> {
    const metrics = await getFinancialHealthMetrics();
    const thresholds = this.config.thresholds.financial;
    const anomalies: AnomalyDetection[] = [];
    let score = 100;

    // Check AR aging
    if (metrics.overdueInvoicesCount > 0) {
      const overduePercentage = metrics.totalAROutstanding > 0
        ? (metrics.overdueInvoicesAmount / metrics.totalAROutstanding) * 100
        : 0;

      if (overduePercentage > 30) {
        score -= 25;
        anomalies.push({
          id: nanoid(),
          type: "financial_ar_aging",
          severity: "high",
          title: "High AR Aging",
          description: `${metrics.overdueInvoicesCount} overdue invoices totaling $${metrics.overdueInvoicesAmount.toFixed(2)}`,
          metric: "overdue_invoices_amount",
          currentValue: metrics.overdueInvoicesAmount,
          expectedValue: 0,
          deviation: overduePercentage,
          detectedAt: new Date(),
          suggestedAction: "Follow up on overdue customer invoices",
        });
      }
    }

    const status: HealthStatus = score >= 80 ? "healthy" : score >= 50 ? "warning" : "critical";

    return {
      category: "financial",
      status,
      score: Math.max(0, score),
      metrics: [
        { name: "AR Outstanding", value: metrics.totalAROutstanding, unit: "USD" },
        { name: "Overdue Invoices", value: metrics.overdueInvoicesCount },
        { name: "Overdue Amount", value: metrics.overdueInvoicesAmount, unit: "USD" },
        { name: "AP Outstanding", value: metrics.totalAPOutstanding, unit: "USD" },
      ],
      anomalies,
      lastChecked: new Date(),
      details: "Financial metrics based on available local data. Full integration with Odoo ERP pending.",
    };
  }

  /**
   * Check customer issues health
   */
  private async checkCustomerIssuesHealth(): Promise<HealthCheckResult> {
    const metrics = await getCustomerIssueMetrics();
    const thresholds = this.config.thresholds.customerIssues;
    const anomalies: AnomalyDetection[] = [];
    let score = 100;

    // Check unresolved escalations
    if (metrics.unresolvedEscalations > 0) {
      score -= 20;
      anomalies.push({
        id: nanoid(),
        type: "customer_unresolved_escalations",
        severity: "high",
        title: "Unresolved Customer Escalations",
        description: `${metrics.unresolvedEscalations} customer escalation(s) require attention`,
        metric: "unresolved_escalations",
        currentValue: metrics.unresolvedEscalations,
        expectedValue: 0,
        deviation: 100,
        detectedAt: new Date(),
        suggestedAction: "Review and address escalated customer issues",
      });
    }

    // Check missed follow-ups
    if (metrics.missedFollowUps > 0) {
      score -= 15;
      anomalies.push({
        id: nanoid(),
        type: "customer_follow_up_missed",
        severity: "medium",
        title: "Missed Customer Follow-ups",
        description: `${metrics.missedFollowUps} scheduled follow-up(s) have been missed`,
        metric: "missed_follow_ups",
        currentValue: metrics.missedFollowUps,
        expectedValue: 0,
        deviation: 100,
        detectedAt: new Date(),
        suggestedAction: "Complete pending customer follow-ups",
      });
    }

    // Check negative sentiment trend
    const negativeSentiment = metrics.issuesBySentiment.find(
      (s) => s.sentiment === "negative" || s.sentiment === "very_negative"
    );
    if (negativeSentiment && negativeSentiment.count > 5) {
      score -= 10;
      anomalies.push({
        id: nanoid(),
        type: "customer_sentiment_decline",
        severity: "medium",
        title: "Elevated Negative Customer Sentiment",
        description: `${negativeSentiment.count} interactions with negative sentiment detected`,
        metric: "negative_sentiment_count",
        currentValue: negativeSentiment.count,
        expectedValue: 0,
        deviation: 100,
        detectedAt: new Date(),
        suggestedAction: "Analyze negative interactions and improve customer experience",
      });
    }

    const status: HealthStatus = score >= 80 ? "healthy" : score >= 50 ? "warning" : "critical";

    return {
      category: "customer_issues",
      status,
      score: Math.max(0, score),
      metrics: [
        { name: "Open Issues", value: metrics.totalOpenIssues },
        { name: "Unresolved Escalations", value: metrics.unresolvedEscalations },
        { name: "Missed Follow-ups", value: metrics.missedFollowUps },
        { name: "Avg Resolution Time (hrs)", value: metrics.averageResolutionTime || 0 },
      ],
      anomalies,
      lastChecked: new Date(),
    };
  }

  /**
   * Check team capacity health
   */
  private async checkTeamCapacityHealth(): Promise<HealthCheckResult> {
    const metrics = await getTeamCapacityMetrics();
    const thresholds = this.config.thresholds.teamCapacity;
    const anomalies: AnomalyDetection[] = [];
    let score = 100;

    // Check overloaded members
    if (metrics.overloadedMembers.length > 0) {
      score -= 20;
      anomalies.push({
        id: nanoid(),
        type: "team_overload",
        severity: "high",
        title: "Team Members Overloaded",
        description: `${metrics.overloadedMembers.length} team member(s) have task loads exceeding capacity`,
        metric: "overloaded_members",
        currentValue: metrics.overloadedMembers.length,
        expectedValue: 0,
        deviation: 100,
        detectedAt: new Date(),
        affectedEntities: metrics.overloadedMembers.map((m) => ({
          type: "user" as const,
          id: m.userId,
          name: `${m.userName} (${m.taskCount}/${m.maxCapacity} tasks)`,
        })),
        suggestedAction: "Redistribute tasks or prioritize workload for overloaded team members",
      });
    }

    // Check underutilized members
    if (metrics.underutilizedMembers.length > 0 && metrics.totalTeamMembers > 3) {
      anomalies.push({
        id: nanoid(),
        type: "team_underutilized",
        severity: "info",
        title: "Underutilized Team Capacity",
        description: `${metrics.underutilizedMembers.length} team member(s) have lower than average task loads`,
        metric: "underutilized_members",
        currentValue: metrics.underutilizedMembers.length,
        expectedValue: 0,
        deviation: 100,
        detectedAt: new Date(),
        affectedEntities: metrics.underutilizedMembers.map((m) => ({
          type: "user" as const,
          id: m.userId,
          name: `${m.userName} (${m.taskCount} tasks)`,
        })),
        suggestedAction: "Consider assigning more tasks to underutilized team members",
      });
    }

    const status: HealthStatus = score >= 80 ? "healthy" : score >= 50 ? "warning" : "critical";

    return {
      category: "team_capacity",
      status,
      score: Math.max(0, score),
      metrics: [
        { name: "Team Members", value: metrics.totalTeamMembers },
        { name: "Avg Task Load", value: metrics.averageTaskLoad },
        { name: "Overloaded Members", value: metrics.overloadedMembers.length },
        { name: "Underutilized Members", value: metrics.underutilizedMembers.length },
      ],
      anomalies,
      lastChecked: new Date(),
    };
  }

  /**
   * Create an alert from an anomaly detection
   */
  private async createAlert(
    anomaly: AnomalyDetection,
    category: HealthCheckCategory
  ): Promise<MonitoringAlert> {
    return {
      id: nanoid(),
      type: anomaly.type,
      severity: anomaly.severity,
      category,
      title: anomaly.title,
      message: anomaly.description,
      data: {
        metric: anomaly.metric,
        currentValue: anomaly.currentValue,
        expectedValue: anomaly.expectedValue,
        deviation: anomaly.deviation,
        affectedEntities: anomaly.affectedEntities,
        suggestedAction: anomaly.suggestedAction,
      },
      createdAt: new Date(),
      notificationsSent: [],
    };
  }

  /**
   * Send notifications for an alert
   */
  private async sendAlertNotifications(alert: MonitoringAlert): Promise<number> {
    let notificationsSent = 0;

    // Find recipients for this category and severity
    const recipients = this.config.alertRecipients.filter(
      (r) =>
        r.category === alert.category &&
        r.notifyOnSeverity.includes(alert.severity)
    );

    if (recipients.length === 0) {
      // No configured recipients, skip notification
      return 0;
    }

    const pushService = getPushNotificationService();

    for (const recipientConfig of recipients) {
      for (const userId of recipientConfig.userIds) {
        try {
          const payload: PushNotificationPayload = {
            title: this.getAlertIcon(alert.severity) + " " + alert.title,
            body: alert.message,
            icon: "/icons/monitoring-alert-icon.png",
            badge: "/icons/badge.png",
            clickAction: `/dashboard/monitoring?alertId=${alert.id}`,
            priority: alert.severity === "critical" || alert.severity === "high" ? "high" : "normal",
            data: {
              type: "monitoring_alert",
              alertId: alert.id,
              category: alert.category,
              severity: alert.severity,
              timestamp: new Date().toISOString(),
            },
          };

          const result = await pushService.queueNotification({
            userId,
            payload,
          });

          alert.notificationsSent.push({
            userId,
            method: "push",
            sentAt: new Date(),
            status: result.success ? "sent" : "failed",
            messageId: result.messageId,
            error: result.error,
          });

          if (result.success) {
            notificationsSent++;
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          alert.notificationsSent.push({
            userId,
            method: "push",
            sentAt: new Date(),
            status: "failed",
            error: errorMessage,
          });
        }
      }
    }

    return notificationsSent;
  }

  /**
   * Get icon for alert severity
   */
  private getAlertIcon(severity: AlertSeverity): string {
    switch (severity) {
      case "critical":
        return "🚨";
      case "high":
        return "⚠️";
      case "medium":
        return "⚡";
      case "low":
        return "📋";
      case "info":
        return "ℹ️";
      default:
        return "🔔";
    }
  }

  /**
   * Get service statistics
   */
  async getStats(): Promise<MonitoringStats> {
    const categoryScores: MonitoringStats["categoryScores"] = [];

    for (const [category, history] of this.healthCheckHistory) {
      const latest = history[history.length - 1];
      if (latest) {
        categoryScores.push({
          category,
          score: latest.score,
          status: latest.status,
        });
      }
    }

    const averageScore =
      categoryScores.length > 0
        ? categoryScores.reduce((sum, c) => sum + c.score, 0) / categoryScores.length
        : 100;

    const todayAlerts = this.alertHistory.filter((a) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return a.createdAt >= today;
    });

    return {
      isProcessing: this.isProcessing,
      lastProcessedAt: this.lastProcessedAt,
      totalChecksToday: Array.from(this.healthCheckHistory.values())
        .flat()
        .filter((h) => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return h.lastChecked >= today;
        }).length,
      alertsGeneratedToday: todayAlerts.length,
      averageHealthScore: averageScore,
      categoryScores,
    };
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(limit: number = 20): MonitoringAlert[] {
    return this.alertHistory
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string, userId: string): boolean {
    const alert = this.alertHistory.find((a) => a.id === alertId);
    if (alert) {
      alert.acknowledgedAt = new Date();
      alert.acknowledgedBy = userId;
      return true;
    }
    return false;
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alertHistory.find((a) => a.id === alertId);
    if (alert) {
      alert.resolvedAt = new Date();
      return true;
    }
    return false;
  }

  /**
   * Update monitoring configuration
   */
  updateConfig(config: Partial<MonitoringConfig>): void {
    this.config = {
      ...this.config,
      ...config,
      thresholds: {
        ...this.config.thresholds,
        ...(config.thresholds || {}),
      },
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): MonitoringConfig {
    return { ...this.config };
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let proactiveMonitoringService: ProactiveMonitoringService | null = null;

/**
 * Get the proactive monitoring service instance
 */
export function getProactiveMonitoringService(): ProactiveMonitoringService {
  if (!proactiveMonitoringService) {
    proactiveMonitoringService = new ProactiveMonitoringService();
  }
  return proactiveMonitoringService;
}

/**
 * Run health checks (convenience function)
 */
export async function runProactiveHealthChecks(): Promise<MonitoringProcessResult> {
  const service = getProactiveMonitoringService();
  return service.runHealthChecks();
}
