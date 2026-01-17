/**
 * Expense Compliance Monitor Service
 *
 * Main service that monitors expense requests for policy violations,
 * missing documentation, and approval delays. Flags suspicious patterns.
 *
 * Features:
 * - Checks expense amounts against policy limits
 * - Detects potential duplicate expenses
 * - Monitors approval workflow bottlenecks
 * - Tracks missing documentation (receipts, descriptions, GL mapping)
 * - Identifies suspicious spending patterns
 * - Sends notifications for compliance violations
 */

import { nanoid } from "nanoid";
import {
  getPolicyViolationMetrics,
  getApprovalWorkflowMetrics,
  getDocumentationMetrics,
  getSuspiciousPatternMetrics,
  isWithinQuietHours,
  isWorkingDay,
} from "~/data-access/expense-compliance";
import { getPushNotificationService } from "~/lib/push-notification/service";
import type { PushNotificationPayload } from "~/lib/push-notification/types";
import {
  type ComplianceCheckCategory,
  type ComplianceCheckResult,
  type ComplianceStatus,
  type ComplianceViolation,
  type ComplianceSeverity,
  type ComplianceAlertType,
  type ComplianceAlert,
  type ComplianceProcessResult,
  type ComplianceError,
  type ComplianceStats,
  type ComplianceMonitorConfig,
  type ComplianceThresholds,
  DEFAULT_COMPLIANCE_CONFIG,
  DEFAULT_COMPLIANCE_THRESHOLDS,
} from "./types";

// =============================================================================
// Expense Compliance Monitor Service
// =============================================================================

export class ExpenseComplianceMonitorService {
  private isProcessing = false;
  private lastProcessedAt?: Date;
  private config: ComplianceMonitorConfig;
  private alertHistory: ComplianceAlert[] = [];
  private checkHistory: Map<ComplianceCheckCategory, ComplianceCheckResult[]> = new Map();

  constructor(config?: Partial<ComplianceMonitorConfig>) {
    this.config = {
      ...DEFAULT_COMPLIANCE_CONFIG,
      ...config,
      thresholds: {
        ...DEFAULT_COMPLIANCE_THRESHOLDS,
        ...(config?.thresholds || {}),
      },
    };
  }

  /**
   * Run all compliance checks and generate alerts
   * Main entry point called by cron job
   */
  async runComplianceChecks(): Promise<ComplianceProcessResult> {
    if (this.isProcessing) {
      console.log("Expense compliance monitoring is already processing, skipping...");
      return {
        timestamp: new Date(),
        duration: 0,
        checksRun: 0,
        violationsFound: 0,
        alertsGenerated: 0,
        notificationsSent: 0,
        checkResults: [],
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
        console.log("Expense compliance monitoring: within quiet hours, skipping...");
        return {
          timestamp: new Date(),
          duration: 0,
          checksRun: 0,
          violationsFound: 0,
          alertsGenerated: 0,
          notificationsSent: 0,
          checkResults: [],
          errors: [],
        };
      }
    }

    if (!isWorkingDay(this.config.quietHours.timezone, this.config.workingDays)) {
      console.log("Expense compliance monitoring: not a working day, skipping...");
      return {
        timestamp: new Date(),
        duration: 0,
        checksRun: 0,
        violationsFound: 0,
        alertsGenerated: 0,
        notificationsSent: 0,
        checkResults: [],
        errors: [],
      };
    }

    this.isProcessing = true;
    const startTime = Date.now();
    const errors: ComplianceError[] = [];
    const checkResults: ComplianceCheckResult[] = [];
    let violationsFound = 0;
    let alertsGenerated = 0;
    let notificationsSent = 0;

    try {
      console.log("Starting expense compliance monitoring...");

      // Run compliance checks for each category
      const categories: ComplianceCheckCategory[] = [
        "policy_adherence",
        "approval_workflow",
        "documentation",
        "suspicious_patterns",
      ];

      for (const category of categories) {
        try {
          const result = await this.runCategoryCheck(category);
          checkResults.push(result);

          // Store in history
          const history = this.checkHistory.get(category) || [];
          history.push(result);
          // Keep last 100 results
          if (history.length > 100) history.shift();
          this.checkHistory.set(category, history);

          // Count violations and generate alerts
          violationsFound += result.violations.length;

          for (const violation of result.violations) {
            const alert = await this.createAlert(violation, category);
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
            operation: "compliance_check",
            error: errorMessage,
            timestamp: new Date(),
          });
          console.error(`Error in ${category} compliance check:`, error);
        }
      }

      this.lastProcessedAt = new Date();
      console.log(
        `Expense compliance monitoring complete: ${checkResults.length} checks, ` +
        `${violationsFound} violations, ${alertsGenerated} alerts, ${notificationsSent} notifications`
      );
    } finally {
      this.isProcessing = false;
    }

    return {
      timestamp: new Date(),
      duration: Date.now() - startTime,
      checksRun: checkResults.length,
      violationsFound,
      alertsGenerated,
      notificationsSent,
      checkResults,
      errors,
    };
  }

  /**
   * Run compliance check for a specific category
   */
  private async runCategoryCheck(
    category: ComplianceCheckCategory
  ): Promise<ComplianceCheckResult> {
    switch (category) {
      case "policy_adherence":
        return this.checkPolicyAdherence();
      case "approval_workflow":
        return this.checkApprovalWorkflow();
      case "documentation":
        return this.checkDocumentation();
      case "suspicious_patterns":
        return this.checkSuspiciousPatterns();
      default:
        return {
          category,
          status: "unknown",
          score: 0,
          violations: [],
          metrics: [],
          lastChecked: new Date(),
        };
    }
  }

  /**
   * Check policy adherence
   */
  private async checkPolicyAdherence(): Promise<ComplianceCheckResult> {
    const thresholds = this.config.thresholds.policyAdherence;
    const violations: ComplianceViolation[] = [];
    let score = 100;

    const metrics = await getPolicyViolationMetrics(
      thresholds.maxExpenseAmount,
      thresholds.duplicateWindowDays,
      thresholds.duplicateAmountTolerance
    );

    // Check high amount expenses
    if (metrics.highAmountExpenses.length > 0) {
      score -= Math.min(30, metrics.highAmountExpenses.length * 5);
      violations.push({
        id: nanoid(),
        type: "policy_amount_exceeded",
        severity: metrics.highAmountExpenses.length > 5 ? "high" : "medium",
        title: "Expense Amount Exceeds Policy Limit",
        description: `${metrics.highAmountExpenses.length} expense(s) exceed the policy limit of $${thresholds.maxExpenseAmount.toLocaleString()}`,
        affectedExpenseIds: metrics.highAmountExpenses.map((e) => e.id),
        affectedUserIds: [...new Set(metrics.highAmountExpenses.map((e) => e.requesterId))],
        suggestedAction: "Review and approve high-value expenses or update policy limits",
        detectedAt: new Date(),
        metadata: {
          expenses: metrics.highAmountExpenses,
          policyLimit: thresholds.maxExpenseAmount,
        },
      });
    }

    // Check potential duplicates
    if (metrics.potentialDuplicates.length > 0) {
      score -= Math.min(25, metrics.potentialDuplicates.length * 5);
      violations.push({
        id: nanoid(),
        type: "policy_duplicate_expense",
        severity: metrics.potentialDuplicates.length > 3 ? "high" : "medium",
        title: "Potential Duplicate Expenses Detected",
        description: `${metrics.potentialDuplicates.length} potential duplicate expense(s) found within ${thresholds.duplicateWindowDays} days`,
        affectedExpenseIds: [
          ...new Set([
            ...metrics.potentialDuplicates.map((d) => d.expenseId1),
            ...metrics.potentialDuplicates.map((d) => d.expenseId2),
          ]),
        ],
        affectedUserIds: [...new Set(metrics.potentialDuplicates.map((d) => d.requesterId))],
        suggestedAction: "Review flagged expenses and verify they are not duplicates",
        detectedAt: new Date(),
        metadata: {
          duplicates: metrics.potentialDuplicates,
        },
      });
    }

    const status: ComplianceStatus = score >= 80 ? "healthy" : score >= 50 ? "warning" : "critical";

    return {
      category: "policy_adherence",
      status,
      score: Math.max(0, score),
      violations,
      metrics: [
        { name: "High Amount Expenses", value: metrics.highAmountExpenses.length },
        { name: "Potential Duplicates", value: metrics.potentialDuplicates.length },
        { name: "Total Policy Violations", value: metrics.totalPolicyViolations },
        { name: "Policy Limit", value: thresholds.maxExpenseAmount, unit: "USD" },
      ],
      lastChecked: new Date(),
    };
  }

  /**
   * Check approval workflow health
   */
  private async checkApprovalWorkflow(): Promise<ComplianceCheckResult> {
    const thresholds = this.config.thresholds.approvalWorkflow;
    const violations: ComplianceViolation[] = [];
    let score = 100;

    const metrics = await getApprovalWorkflowMetrics(
      thresholds.pendingApprovalWarningDays,
      thresholds.pendingApprovalCriticalDays,
      thresholds.approverBottleneckCount
    );

    // Check approval delays
    const criticalDelays = metrics.pendingApprovals.filter(
      (a) => a.daysPending >= thresholds.pendingApprovalCriticalDays
    );
    const warningDelays = metrics.pendingApprovals.filter(
      (a) =>
        a.daysPending >= thresholds.pendingApprovalWarningDays &&
        a.daysPending < thresholds.pendingApprovalCriticalDays
    );

    if (criticalDelays.length > 0) {
      score -= Math.min(35, criticalDelays.length * 5);
      violations.push({
        id: nanoid(),
        type: "approval_delay",
        severity: "critical",
        title: "Critical Approval Delays",
        description: `${criticalDelays.length} expense(s) have been pending approval for ${thresholds.pendingApprovalCriticalDays}+ days`,
        affectedExpenseIds: criticalDelays.map((a) => a.id),
        affectedUserIds: [
          ...new Set([
            ...criticalDelays.map((a) => a.currentApproverId).filter(Boolean) as string[],
            ...criticalDelays.map((a) => a.submitterId),
          ]),
        ],
        suggestedAction: "Escalate delayed approvals and review approval workflow",
        detectedAt: new Date(),
        metadata: {
          delayedApprovals: criticalDelays,
        },
      });
    }

    if (warningDelays.length > 0) {
      score -= Math.min(20, warningDelays.length * 3);
      violations.push({
        id: nanoid(),
        type: "approval_delay",
        severity: "medium",
        title: "Approval Delays Detected",
        description: `${warningDelays.length} expense(s) have been pending approval for ${thresholds.pendingApprovalWarningDays}+ days`,
        affectedExpenseIds: warningDelays.map((a) => a.id),
        affectedUserIds: [
          ...new Set([
            ...warningDelays.map((a) => a.currentApproverId).filter(Boolean) as string[],
            ...warningDelays.map((a) => a.submitterId),
          ]),
        ],
        suggestedAction: "Send reminders to approvers",
        detectedAt: new Date(),
        metadata: {
          delayedApprovals: warningDelays,
        },
      });
    }

    // Check approver bottlenecks
    if (metrics.approverBottlenecks.length > 0) {
      score -= Math.min(20, metrics.approverBottlenecks.length * 5);
      violations.push({
        id: nanoid(),
        type: "approval_bottleneck",
        severity: "high",
        title: "Approver Bottleneck Detected",
        description: `${metrics.approverBottlenecks.length} approver(s) have ${thresholds.approverBottleneckCount}+ pending approvals`,
        affectedExpenseIds: [],
        affectedUserIds: metrics.approverBottlenecks.map((b) => b.approverId),
        suggestedAction: "Redistribute approval workload or add additional approvers",
        detectedAt: new Date(),
        metadata: {
          bottlenecks: metrics.approverBottlenecks,
        },
      });
    }

    const status: ComplianceStatus = score >= 80 ? "healthy" : score >= 50 ? "warning" : "critical";

    return {
      category: "approval_workflow",
      status,
      score: Math.max(0, score),
      violations,
      metrics: [
        { name: "Total Pending Approvals", value: metrics.pendingApprovals.length },
        { name: "Critical Delays", value: criticalDelays.length },
        { name: "Warning Delays", value: warningDelays.length },
        { name: "Approver Bottlenecks", value: metrics.approverBottlenecks.length },
        {
          name: "Avg Approval Time",
          value: metrics.averageApprovalTimeDays
            ? Math.round(metrics.averageApprovalTimeDays * 10) / 10
            : 0,
          unit: "days",
        },
      ],
      lastChecked: new Date(),
    };
  }

  /**
   * Check documentation completeness
   */
  private async checkDocumentation(): Promise<ComplianceCheckResult> {
    const thresholds = this.config.thresholds.documentation;
    const violations: ComplianceViolation[] = [];
    let score = 100;

    const metrics = await getDocumentationMetrics(
      thresholds.receiptRequiredAboveAmount,
      thresholds.missingReceiptWarningDays
    );

    // Check missing receipts
    const criticalMissingReceipts = metrics.missingReceipts.filter(
      (r) => r.daysSinceDisbursement >= thresholds.missingReceiptCriticalDays
    );
    const warningMissingReceipts = metrics.missingReceipts.filter(
      (r) =>
        r.daysSinceDisbursement >= thresholds.missingReceiptWarningDays &&
        r.daysSinceDisbursement < thresholds.missingReceiptCriticalDays
    );

    if (criticalMissingReceipts.length > 0) {
      score -= Math.min(30, criticalMissingReceipts.length * 5);
      violations.push({
        id: nanoid(),
        type: "missing_receipt",
        severity: "high",
        title: "Critical: Missing Receipts",
        description: `${criticalMissingReceipts.length} expense(s) are missing receipts for ${thresholds.missingReceiptCriticalDays}+ days`,
        affectedExpenseIds: criticalMissingReceipts.map((r) => r.id),
        affectedUserIds: [...new Set(criticalMissingReceipts.map((r) => r.submitterId))],
        suggestedAction: "Urgently request receipt uploads from submitters",
        detectedAt: new Date(),
        metadata: {
          missingReceipts: criticalMissingReceipts,
        },
      });
    }

    if (warningMissingReceipts.length > 0) {
      score -= Math.min(15, warningMissingReceipts.length * 3);
      violations.push({
        id: nanoid(),
        type: "missing_receipt",
        severity: "medium",
        title: "Missing Receipts Warning",
        description: `${warningMissingReceipts.length} expense(s) are awaiting receipt uploads`,
        affectedExpenseIds: warningMissingReceipts.map((r) => r.id),
        affectedUserIds: [...new Set(warningMissingReceipts.map((r) => r.submitterId))],
        suggestedAction: "Send reminders for receipt uploads",
        detectedAt: new Date(),
        metadata: {
          missingReceipts: warningMissingReceipts,
        },
      });
    }

    // Check missing descriptions
    if (metrics.missingDescriptions.length > 0) {
      score -= Math.min(15, metrics.missingDescriptions.length * 2);
      violations.push({
        id: nanoid(),
        type: "missing_description",
        severity: "low",
        title: "Incomplete Expense Descriptions",
        description: `${metrics.missingDescriptions.length} expense(s) have missing or inadequate descriptions`,
        affectedExpenseIds: metrics.missingDescriptions.map((d) => d.id),
        affectedUserIds: [...new Set(metrics.missingDescriptions.map((d) => d.submitterId))],
        suggestedAction: "Request detailed descriptions for flagged expenses",
        detectedAt: new Date(),
        metadata: {
          expenses: metrics.missingDescriptions,
        },
      });
    }

    // Check incomplete GL mapping
    if (metrics.incompleteGLMapping.length > 0) {
      score -= Math.min(15, metrics.incompleteGLMapping.length * 2);
      violations.push({
        id: nanoid(),
        type: "incomplete_gl_mapping",
        severity: "medium",
        title: "Incomplete GL Account Mapping",
        description: `${metrics.incompleteGLMapping.length} expense(s) have incomplete GL account information`,
        affectedExpenseIds: metrics.incompleteGLMapping.map((g) => g.id),
        affectedUserIds: [],
        suggestedAction: "Complete GL account mapping before posting",
        detectedAt: new Date(),
        metadata: {
          expenses: metrics.incompleteGLMapping,
        },
      });
    }

    const status: ComplianceStatus = score >= 80 ? "healthy" : score >= 50 ? "warning" : "critical";

    return {
      category: "documentation",
      status,
      score: Math.max(0, score),
      violations,
      metrics: [
        { name: "Missing Receipts (Critical)", value: criticalMissingReceipts.length },
        { name: "Missing Receipts (Warning)", value: warningMissingReceipts.length },
        { name: "Incomplete Descriptions", value: metrics.missingDescriptions.length },
        { name: "Incomplete GL Mapping", value: metrics.incompleteGLMapping.length },
        {
          name: "Documentation Completeness",
          value: Math.round(metrics.documentationCompleteness),
          unit: "%",
        },
      ],
      lastChecked: new Date(),
    };
  }

  /**
   * Check for suspicious patterns
   */
  private async checkSuspiciousPatterns(): Promise<ComplianceCheckResult> {
    const thresholds = this.config.thresholds.suspiciousPatterns;
    const violations: ComplianceViolation[] = [];
    let score = 100;

    const metrics = await getSuspiciousPatternMetrics(
      thresholds.roundAmountPercentage,
      thresholds.frequentExpenseThreshold,
      thresholds.splitTransactionWindowHours,
      thresholds.splitTransactionAmountThreshold,
      thresholds.weekendExpenseThreshold
    );

    // Check round amount patterns
    if (metrics.roundAmountExpenses.length > 0) {
      score -= Math.min(15, metrics.roundAmountExpenses.length * 3);
      violations.push({
        id: nanoid(),
        type: "suspicious_pattern_round_amounts",
        severity: "low",
        title: "Unusual Round Amount Pattern",
        description: `${metrics.roundAmountExpenses.length} user(s) have ${thresholds.roundAmountPercentage}%+ round-number expenses`,
        affectedExpenseIds: [],
        affectedUserIds: metrics.roundAmountExpenses.map((r) => r.userId),
        suggestedAction: "Review expenses for these users for potential policy abuse",
        detectedAt: new Date(),
        metadata: {
          users: metrics.roundAmountExpenses,
        },
      });
    }

    // Check frequent submitters
    if (metrics.frequentSubmitters.length > 0) {
      score -= Math.min(20, metrics.frequentSubmitters.length * 3);
      violations.push({
        id: nanoid(),
        type: "suspicious_pattern_frequency",
        severity: "medium",
        title: "High Expense Submission Frequency",
        description: `${metrics.frequentSubmitters.length} instance(s) of users submitting ${thresholds.frequentExpenseThreshold}+ expenses in a single day`,
        affectedExpenseIds: [],
        affectedUserIds: [...new Set(metrics.frequentSubmitters.map((f) => f.userId))],
        suggestedAction: "Review high-frequency submissions for potential misuse",
        detectedAt: new Date(),
        metadata: {
          submissions: metrics.frequentSubmitters,
        },
      });
    }

    // Check potential split transactions
    if (metrics.potentialSplitTransactions.length > 0) {
      score -= Math.min(25, metrics.potentialSplitTransactions.length * 5);
      violations.push({
        id: nanoid(),
        type: "suspicious_pattern_split_transactions",
        severity: "high",
        title: "Potential Split Transaction Detected",
        description: `${metrics.potentialSplitTransactions.length} instance(s) of potential transaction splitting to avoid limits`,
        affectedExpenseIds: metrics.potentialSplitTransactions.flatMap((s) =>
          s.transactions.map((t) => t.id)
        ),
        affectedUserIds: [...new Set(metrics.potentialSplitTransactions.map((s) => s.userId))],
        suggestedAction: "Investigate flagged transactions for policy circumvention",
        detectedAt: new Date(),
        metadata: {
          splitTransactions: metrics.potentialSplitTransactions,
        },
      });
    }

    // Check weekend expenses
    if (metrics.weekendExpenses.length > 0) {
      score -= Math.min(10, metrics.weekendExpenses.length * 2);
      violations.push({
        id: nanoid(),
        type: "suspicious_pattern_weekend_expenses",
        severity: "info",
        title: "Elevated Weekend Expenses",
        description: `${metrics.weekendExpenses.length} user(s) have ${thresholds.weekendExpenseThreshold}+ expenses submitted on weekends`,
        affectedExpenseIds: [],
        affectedUserIds: metrics.weekendExpenses.map((w) => w.userId),
        suggestedAction: "Verify weekend expense legitimacy if unusual for business",
        detectedAt: new Date(),
        metadata: {
          users: metrics.weekendExpenses,
        },
      });
    }

    const status: ComplianceStatus = score >= 80 ? "healthy" : score >= 50 ? "warning" : "critical";

    return {
      category: "suspicious_patterns",
      status,
      score: Math.max(0, score),
      violations,
      metrics: [
        { name: "Round Amount Patterns", value: metrics.roundAmountExpenses.length },
        { name: "Frequent Submitters", value: metrics.frequentSubmitters.length },
        { name: "Potential Split Transactions", value: metrics.potentialSplitTransactions.length },
        { name: "Weekend Expense Users", value: metrics.weekendExpenses.length },
      ],
      lastChecked: new Date(),
    };
  }

  /**
   * Create an alert from a violation
   */
  private async createAlert(
    violation: ComplianceViolation,
    category: ComplianceCheckCategory
  ): Promise<ComplianceAlert> {
    return {
      id: nanoid(),
      type: violation.type,
      severity: violation.severity,
      category,
      title: violation.title,
      message: violation.description,
      data: {
        affectedExpenseIds: violation.affectedExpenseIds,
        affectedUserIds: violation.affectedUserIds,
        suggestedAction: violation.suggestedAction,
        metadata: violation.metadata,
      },
      createdAt: new Date(),
      notificationsSent: [],
    };
  }

  /**
   * Send notifications for an alert
   */
  private async sendAlertNotifications(alert: ComplianceAlert): Promise<number> {
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
            icon: "/icons/compliance-alert-icon.png",
            badge: "/icons/badge.png",
            clickAction: `/dashboard/compliance?alertId=${alert.id}`,
            priority: alert.severity === "critical" || alert.severity === "high" ? "high" : "normal",
            data: {
              type: "compliance_alert",
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
  private getAlertIcon(severity: ComplianceSeverity): string {
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
  async getStats(): Promise<ComplianceStats> {
    const categoryScores: ComplianceStats["categoryScores"] = [];

    for (const [category, history] of this.checkHistory) {
      const latest = history[history.length - 1];
      if (latest) {
        categoryScores.push({
          category,
          score: latest.score,
          status: latest.status,
          violationCount: latest.violations.length,
        });
      }
    }

    const overallScore =
      categoryScores.length > 0
        ? categoryScores.reduce((sum, c) => sum + c.score, 0) / categoryScores.length
        : 100;

    const todayAlerts = this.alertHistory.filter((a) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return a.createdAt >= today;
    });

    const todayViolations = Array.from(this.checkHistory.values())
      .flat()
      .filter((h) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return h.lastChecked >= today;
      })
      .reduce((sum, h) => sum + h.violations.length, 0);

    return {
      isProcessing: this.isProcessing,
      lastProcessedAt: this.lastProcessedAt,
      totalChecksToday: Array.from(this.checkHistory.values())
        .flat()
        .filter((h) => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return h.lastChecked >= today;
        }).length,
      violationsFoundToday: todayViolations,
      alertsGeneratedToday: todayAlerts.length,
      overallComplianceScore: overallScore,
      categoryScores,
    };
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(limit: number = 20): ComplianceAlert[] {
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
   * Update configuration
   */
  updateConfig(config: Partial<ComplianceMonitorConfig>): void {
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
  getConfig(): ComplianceMonitorConfig {
    return { ...this.config };
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let expenseComplianceMonitorService: ExpenseComplianceMonitorService | null = null;

/**
 * Get the expense compliance monitor service instance
 */
export function getExpenseComplianceMonitorService(): ExpenseComplianceMonitorService {
  if (!expenseComplianceMonitorService) {
    expenseComplianceMonitorService = new ExpenseComplianceMonitorService();
  }
  return expenseComplianceMonitorService;
}

/**
 * Run compliance checks (convenience function)
 */
export async function runExpenseComplianceChecks(): Promise<ComplianceProcessResult> {
  const service = getExpenseComplianceMonitorService();
  return service.runComplianceChecks();
}
