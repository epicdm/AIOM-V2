/**
 * Overdue Task Monitor Service
 *
 * Monitors overdue tasks and triggers escalation notifications
 * through configurable rules and supervisor alerts.
 */

import { nanoid } from "nanoid";
import {
  getUsersForTaskReminders,
  createTaskReminderLog,
  markReminderLogAsSent,
  markReminderLogAsFailed,
  recordReminderSent,
  recordEscalation,
  findTaskReminderState,
  countEnabledTaskReminderUsers,
  isWithinQuietHours,
  isWorkingDay,
  type UserForTaskReminders,
} from "~/data-access/task-reminders";
import {
  getOverdueTasksForDashboard,
  getTaskStatistics,
  type DashboardTaskSummary,
} from "~/data-access/odoo-tasks";
import { getPushNotificationService } from "~/lib/push-notification/service";
import type { PushNotificationPayload } from "~/lib/push-notification/types";
import {
  type EscalationRule,
  type EscalationSeverity,
  type OverdueTaskWithMetrics,
  type SupervisorAlert,
  type MonitorProcessResult,
  type MonitorStats,
  type MonitorConfig,
  DEFAULT_ESCALATION_RULES,
} from "./types";

// =============================================================================
// Overdue Task Monitor Service
// =============================================================================

export class OverdueTaskMonitorService {
  private isProcessing = false;
  private lastProcessedAt: Date | null = null;
  private escalationRules: EscalationRule[];

  constructor(config?: MonitorConfig) {
    this.escalationRules = config?.escalationRules || DEFAULT_ESCALATION_RULES;
  }

  /**
   * Process overdue tasks for all enabled users
   * Main entry point called by cron job
   */
  async processOverdueTasks(config?: MonitorConfig): Promise<MonitorProcessResult> {
    if (this.isProcessing) {
      console.log("Overdue task monitor is already processing, skipping...");
      return {
        processed: 0,
        overdueTasksFound: 0,
        assigneeNotificationsSent: 0,
        supervisorAlertsSent: 0,
        skipped: 0,
        errors: [],
        processedAt: new Date(),
      };
    }

    this.isProcessing = true;
    const result: MonitorProcessResult = {
      processed: 0,
      overdueTasksFound: 0,
      assigneeNotificationsSent: 0,
      supervisorAlertsSent: 0,
      skipped: 0,
      errors: [],
      processedAt: new Date(),
    };

    try {
      console.log("Starting overdue task monitor processing...");

      // Get all users with task reminders enabled
      const usersForReminders = await getUsersForTaskReminders();
      console.log(`Found ${usersForReminders.length} users with monitoring enabled`);

      // Group users by supervisor for batch supervisor alerts
      const supervisorAlerts = new Map<string, SupervisorAlert>();

      for (const userConfig of usersForReminders) {
        result.processed++;

        try {
          const userResult = await this.processUserOverdueTasks(
            userConfig,
            supervisorAlerts,
            config
          );

          result.overdueTasksFound += userResult.overdueTasksFound;
          result.assigneeNotificationsSent += userResult.assigneeNotificationsSent;
          result.skipped += userResult.skipped;

          if (userResult.errors.length > 0) {
            result.errors.push(...userResult.errors);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          result.errors.push({
            userId: userConfig.userId,
            error: errorMessage,
          });
          console.error(`Error processing overdue tasks for user ${userConfig.userId}:`, error);
        }
      }

      // Send batched supervisor alerts
      const supervisorResult = await this.sendSupervisorAlerts(supervisorAlerts);
      result.supervisorAlertsSent = supervisorResult.sent;
      if (supervisorResult.errors.length > 0) {
        result.errors.push(...supervisorResult.errors);
      }

      this.lastProcessedAt = new Date();

      console.log(
        `Overdue task monitor complete: ${result.processed} users, ` +
        `${result.overdueTasksFound} overdue tasks, ` +
        `${result.assigneeNotificationsSent} assignee notifications, ` +
        `${result.supervisorAlertsSent} supervisor alerts`
      );
    } finally {
      this.isProcessing = false;
    }

    return result;
  }

  /**
   * Process overdue tasks for a specific user
   */
  private async processUserOverdueTasks(
    userConfig: UserForTaskReminders,
    supervisorAlerts: Map<string, SupervisorAlert>,
    config?: MonitorConfig
  ): Promise<Omit<MonitorProcessResult, "supervisorAlertsSent" | "processedAt">> {
    const result = {
      processed: 0,
      overdueTasksFound: 0,
      assigneeNotificationsSent: 0,
      skipped: 0,
      errors: [] as MonitorProcessResult["errors"],
    };

    // Check if within quiet hours (respect user preferences)
    if (isWithinQuietHours(userConfig.timezone, userConfig.quietHours)) {
      console.log(`User ${userConfig.userId} is in quiet hours, skipping`);
      return result;
    }

    // Check if today is a working day
    if (!isWorkingDay(userConfig.timezone, userConfig.workingDays)) {
      console.log(`Today is not a working day for user ${userConfig.userId}, skipping`);
      return result;
    }

    try {
      // Get overdue tasks
      const overdueResult = await getOverdueTasksForDashboard({
        limit: config?.maxTasksPerRun || 100,
      });

      const overdueTasksWithMetrics: OverdueTaskWithMetrics[] = [];

      for (const task of overdueResult.tasks) {
        if (!task.isOverdue || task.daysUntilDeadline === null) continue;

        // Filter by priority if configured
        if (config?.highPriorityOnly && task.priority !== "1") continue;

        // Filter by project if configured
        if (config?.projectIds && task.projectId !== null) {
          if (!config.projectIds.includes(task.projectId)) continue;
        }

        result.overdueTasksFound++;

        const hoursOverdue = Math.abs(task.daysUntilDeadline) * 24;
        const taskWithMetrics = await this.buildTaskMetrics(
          task,
          hoursOverdue,
          userConfig
        );

        overdueTasksWithMetrics.push(taskWithMetrics);

        // Send notification to assignee if needed
        if (taskWithMetrics.shouldNotify && taskWithMetrics.matchedRule) {
          if (taskWithMetrics.matchedRule.notifyAssignee) {
            try {
              await this.sendAssigneeNotification(userConfig, taskWithMetrics);
              result.assigneeNotificationsSent++;
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : "Unknown error";
              result.errors.push({
                userId: userConfig.userId,
                taskId: task.id,
                error: errorMessage,
              });
            }
          }

          // Add to supervisor alerts if needed
          if (
            taskWithMetrics.matchedRule.notifySupervisor &&
            userConfig.enableEscalation &&
            userConfig.supervisorId
          ) {
            this.addToSupervisorAlerts(
              supervisorAlerts,
              userConfig,
              taskWithMetrics
            );
          }
        } else {
          result.skipped++;
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      result.errors.push({
        userId: userConfig.userId,
        error: `Failed to get overdue tasks: ${errorMessage}`,
      });
    }

    return result;
  }

  /**
   * Build task metrics with escalation information
   */
  private async buildTaskMetrics(
    task: DashboardTaskSummary,
    hoursOverdue: number,
    userConfig: UserForTaskReminders
  ): Promise<OverdueTaskWithMetrics> {
    // Find matching escalation rule (highest severity that matches)
    const matchedRule = this.findMatchingEscalationRule(hoursOverdue);
    const escalationLevel = this.calculateEscalationLevel(hoursOverdue);

    // Check if we should notify based on frequency
    const state = await findTaskReminderState(userConfig.userId, task.id);
    let shouldNotify = true;
    let lastNotificationAt: Date | null = null;

    if (state) {
      lastNotificationAt = state.lastReminderAt;

      if (state.isMuted) {
        shouldNotify = false;
      } else if (state.snoozedUntil && state.snoozedUntil > new Date()) {
        shouldNotify = false;
      } else if (state.lastReminderAt && matchedRule) {
        const hoursSinceLastNotification =
          (Date.now() - state.lastReminderAt.getTime()) / (1000 * 60 * 60);

        if (hoursSinceLastNotification < matchedRule.notificationFrequencyHours) {
          shouldNotify = false;
        }
      }
    }

    return {
      taskId: task.id,
      taskName: task.name,
      projectId: task.projectId,
      projectName: task.projectName,
      deadline: task.deadline,
      hoursOverdue,
      daysOverdue: Math.ceil(hoursOverdue / 24),
      priority: task.priority,
      stageName: task.stageName,
      assigneeIds: task.assigneeIds,
      assigneeNames: task.assigneeNames,
      escalationLevel,
      lastNotificationAt,
      matchedRule,
      shouldNotify,
    };
  }

  /**
   * Find the matching escalation rule for hours overdue
   */
  private findMatchingEscalationRule(hoursOverdue: number): EscalationRule | null {
    // Sort rules by threshold descending to find highest matching
    const sortedRules = [...this.escalationRules]
      .filter((r) => r.isEnabled)
      .sort((a, b) => b.hoursOverdueThreshold - a.hoursOverdueThreshold);

    for (const rule of sortedRules) {
      if (hoursOverdue >= rule.hoursOverdueThreshold) {
        return rule;
      }
    }

    return null;
  }

  /**
   * Calculate escalation level (0-4) based on hours overdue
   */
  private calculateEscalationLevel(hoursOverdue: number): number {
    if (hoursOverdue >= 120) return 4; // Critical
    if (hoursOverdue >= 72) return 3;  // High
    if (hoursOverdue >= 48) return 2;  // Medium
    if (hoursOverdue >= 24) return 1;  // Low
    return 0;
  }

  /**
   * Send notification to task assignee
   */
  private async sendAssigneeNotification(
    userConfig: UserForTaskReminders,
    task: OverdueTaskWithMetrics
  ): Promise<void> {
    if (!task.matchedRule?.sendPushNotification) return;

    const pushService = getPushNotificationService();
    const { title, body } = this.formatAssigneeNotification(task);

    const payload: PushNotificationPayload = {
      title,
      body,
      icon: "/icons/overdue-task-icon.png",
      badge: "/icons/badge.png",
      clickAction: "/dashboard/tasks",
      priority: task.matchedRule.severity === "critical" ? "high" : "normal",
      data: {
        type: "overdue_task_alert",
        taskId: task.taskId.toString(),
        taskName: task.taskName,
        projectId: task.projectId?.toString() || "",
        escalationLevel: task.escalationLevel.toString(),
        severity: task.matchedRule.severity,
        hoursOverdue: task.hoursOverdue.toString(),
        timestamp: new Date().toISOString(),
      },
    };

    // Create log entry
    const logEntry = await createTaskReminderLog({
      id: nanoid(),
      userId: userConfig.userId,
      taskId: task.taskId,
      taskName: task.taskName,
      taskDeadline: task.deadline ? new Date(task.deadline) : null,
      projectId: task.projectId,
      projectName: task.projectName,
      reminderType: "overdue",
      status: "pending",
      escalationLevel: task.escalationLevel,
      hoursOverdue: Math.round(task.hoursOverdue),
      scheduledFor: new Date(),
      metadata: JSON.stringify({
        ruleName: task.matchedRule?.name,
        severity: task.matchedRule?.severity,
      }),
    });

    try {
      const result = await pushService.queueNotification({
        userId: userConfig.userId,
        payload,
      });

      await markReminderLogAsSent(logEntry.id, result.messageId);
      await recordReminderSent(userConfig.userId, task.taskId, "overdue");

      // Record escalation level
      await recordEscalation(userConfig.userId, task.taskId, task.escalationLevel);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      await markReminderLogAsFailed(logEntry.id, errorMessage);
      throw error;
    }
  }

  /**
   * Add task to supervisor alerts batch
   */
  private addToSupervisorAlerts(
    alerts: Map<string, SupervisorAlert>,
    userConfig: UserForTaskReminders,
    task: OverdueTaskWithMetrics
  ): void {
    if (!userConfig.supervisorId) return;

    const alertKey = `${userConfig.supervisorId}-${userConfig.userId}`;
    let alert = alerts.get(alertKey);

    if (!alert) {
      alert = {
        supervisorId: userConfig.supervisorId,
        supervisorName: userConfig.supervisorName || "Supervisor",
        supervisorEmail: userConfig.supervisorEmail || "",
        teamMemberId: userConfig.userId,
        teamMemberName: userConfig.userName,
        overdueTasks: [],
        totalHoursOverdue: 0,
        maxEscalationLevel: 0,
        severity: "low",
      };
      alerts.set(alertKey, alert);
    }

    alert.overdueTasks.push(task);
    alert.totalHoursOverdue += task.hoursOverdue;

    if (task.escalationLevel > alert.maxEscalationLevel) {
      alert.maxEscalationLevel = task.escalationLevel;
      alert.severity = task.matchedRule?.severity || this.getSeverityFromLevel(task.escalationLevel);
    }
  }

  /**
   * Get severity from escalation level
   */
  private getSeverityFromLevel(level: number): EscalationSeverity {
    switch (level) {
      case 4: return "critical";
      case 3: return "high";
      case 2: return "medium";
      default: return "low";
    }
  }

  /**
   * Send batched supervisor alerts
   */
  private async sendSupervisorAlerts(
    alerts: Map<string, SupervisorAlert>
  ): Promise<{ sent: number; errors: MonitorProcessResult["errors"] }> {
    let sent = 0;
    const errors: MonitorProcessResult["errors"] = [];

    for (const alert of alerts.values()) {
      // Only send if there are meaningful overdue tasks
      if (alert.overdueTasks.length === 0) continue;
      if (alert.maxEscalationLevel < 2) continue; // Only escalate level 2+

      try {
        await this.sendSupervisorNotification(alert);
        sent++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        errors.push({
          userId: alert.supervisorId,
          error: `Failed to send supervisor alert: ${errorMessage}`,
        });
      }
    }

    return { sent, errors };
  }

  /**
   * Send notification to supervisor
   */
  private async sendSupervisorNotification(alert: SupervisorAlert): Promise<void> {
    const pushService = getPushNotificationService();
    const { title, body } = this.formatSupervisorNotification(alert);

    const payload: PushNotificationPayload = {
      title,
      body,
      icon: "/icons/supervisor-alert-icon.png",
      badge: "/icons/badge-urgent.png",
      clickAction: "/dashboard/team-tasks",
      priority: alert.severity === "critical" || alert.severity === "high" ? "high" : "normal",
      data: {
        type: "supervisor_escalation_alert",
        teamMemberId: alert.teamMemberId,
        teamMemberName: alert.teamMemberName,
        taskCount: alert.overdueTasks.length.toString(),
        maxEscalationLevel: alert.maxEscalationLevel.toString(),
        severity: alert.severity,
        totalHoursOverdue: Math.round(alert.totalHoursOverdue).toString(),
        timestamp: new Date().toISOString(),
      },
    };

    // Create escalation log
    const logEntry = await createTaskReminderLog({
      id: nanoid(),
      userId: alert.teamMemberId,
      taskId: alert.overdueTasks[0]?.taskId || 0,
      taskName: `${alert.overdueTasks.length} overdue tasks`,
      reminderType: "escalation",
      status: "pending",
      escalationLevel: alert.maxEscalationLevel,
      escalatedToUserId: alert.supervisorId,
      hoursOverdue: Math.round(alert.totalHoursOverdue / alert.overdueTasks.length),
      scheduledFor: new Date(),
      metadata: JSON.stringify({
        taskCount: alert.overdueTasks.length,
        taskIds: alert.overdueTasks.map((t) => t.taskId),
        severity: alert.severity,
      }),
    });

    try {
      const result = await pushService.queueNotification({
        userId: alert.supervisorId,
        payload,
      });

      await markReminderLogAsSent(logEntry.id, result.messageId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      await markReminderLogAsFailed(logEntry.id, errorMessage);
      throw error;
    }
  }

  /**
   * Format notification for assignee
   */
  private formatAssigneeNotification(task: OverdueTaskWithMetrics): {
    title: string;
    body: string;
  } {
    const projectInfo = task.projectName ? ` (${task.projectName})` : "";
    const severityPrefix = task.matchedRule?.severity === "critical"
      ? "[CRITICAL] "
      : task.matchedRule?.severity === "high"
        ? "[URGENT] "
        : "";

    return {
      title: `${severityPrefix}Overdue Task Alert`,
      body: `"${task.taskName}"${projectInfo} is ${task.daysOverdue} day${task.daysOverdue > 1 ? "s" : ""} overdue. Please update or complete this task.`,
    };
  }

  /**
   * Format notification for supervisor
   */
  private formatSupervisorNotification(alert: SupervisorAlert): {
    title: string;
    body: string;
  } {
    const severityPrefix = alert.severity === "critical"
      ? "[CRITICAL] "
      : alert.severity === "high"
        ? "[URGENT] "
        : "";

    const taskCount = alert.overdueTasks.length;
    const avgDaysOverdue = Math.ceil(alert.totalHoursOverdue / taskCount / 24);

    return {
      title: `${severityPrefix}Team Task Escalation`,
      body: `${alert.teamMemberName} has ${taskCount} overdue task${taskCount > 1 ? "s" : ""} (avg ${avgDaysOverdue} days overdue). Supervisor action recommended.`,
    };
  }

  /**
   * Get monitor statistics
   */
  async getStats(): Promise<MonitorStats> {
    const enabledUsers = await countEnabledTaskReminderUsers();

    let currentOverdueTasks = 0;
    let criticalTasks = 0;

    try {
      const stats = await getTaskStatistics();
      currentOverdueTasks = stats.overdueTasks;

      // Critical tasks estimation based on overdue count
      // In production, this would query specific escalation levels
      criticalTasks = Math.floor(stats.overdueTasks * 0.2);
    } catch (error) {
      console.error("Error getting task statistics:", error);
    }

    return {
      enabledUsers,
      currentOverdueTasks,
      criticalTasks,
      isProcessing: this.isProcessing,
      lastProcessedAt: this.lastProcessedAt,
    };
  }

  /**
   * Get current escalation rules
   */
  getEscalationRules(): EscalationRule[] {
    return this.escalationRules;
  }

  /**
   * Update escalation rules
   */
  setEscalationRules(rules: EscalationRule[]): void {
    this.escalationRules = rules;
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let overdueTaskMonitorService: OverdueTaskMonitorService | null = null;

/**
 * Get the overdue task monitor service instance
 */
export function getOverdueTaskMonitorService(): OverdueTaskMonitorService {
  if (!overdueTaskMonitorService) {
    overdueTaskMonitorService = new OverdueTaskMonitorService();
  }
  return overdueTaskMonitorService;
}

/**
 * Process overdue tasks (convenience function)
 */
export async function processOverdueTasks(
  config?: MonitorConfig
): Promise<MonitorProcessResult> {
  const service = getOverdueTaskMonitorService();
  return service.processOverdueTasks(config);
}
