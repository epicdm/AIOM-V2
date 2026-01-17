/**
 * Task Reminder Scheduler Service
 *
 * Main service that orchestrates automated task reminder processing.
 * Handles context-aware timing, escalation to supervisors, and notification dispatch.
 *
 * Features:
 * - Timezone-aware scheduling
 * - Context-aware timing (quiet hours, working days)
 * - Smart reminders for upcoming and overdue tasks
 * - Escalation to supervisors for overdue tasks
 * - Multiple delivery methods (push, email, in-app)
 * - Delivery tracking and logging
 */

import { nanoid } from "nanoid";
import {
  getUsersForTaskReminders,
  createTaskReminderLog,
  markReminderLogAsSent,
  markReminderLogAsFailed,
  recordReminderSent,
  recordEscalation,
  shouldSendReminder,
  shouldEscalate,
  countEnabledTaskReminderUsers,
  isWithinQuietHours,
  isWorkingDay,
  type UserForTaskReminders,
  type TaskReminderType,
} from "~/data-access/task-reminders";
import {
  getOverdueTasksForDashboard,
  getTasksDueToday,
  getTasksDueThisWeek,
  type DashboardTaskSummary,
} from "~/data-access/odoo-tasks";
import { getPushNotificationService } from "~/lib/push-notification/service";
import type { PushNotificationPayload } from "~/lib/push-notification/types";

// =============================================================================
// Types
// =============================================================================

export interface SchedulerProcessResult {
  processed: number;
  remindersCreated: number;
  remindersSent: number;
  escalationsSent: number;
  skipped: number;
  errors: Array<{
    userId: string;
    taskId?: number;
    error: string;
  }>;
}

export interface ReminderDeliveryResult {
  success: boolean;
  logId?: string;
  pushMessageId?: string;
  error?: string;
  skipped?: boolean;
  skipReason?: string;
}

export interface TaskWithReminder {
  task: DashboardTaskSummary;
  reminderType: TaskReminderType;
  hoursOverdue?: number;
}

// =============================================================================
// Task Reminder Scheduler Service
// =============================================================================

export class TaskReminderSchedulerService {
  private isProcessing = false;

  /**
   * Process task reminders for all enabled users
   * This is the main entry point called by the cron job
   */
  async processTaskReminders(): Promise<SchedulerProcessResult> {
    if (this.isProcessing) {
      console.log("Task reminder scheduler is already processing, skipping...");
      return {
        processed: 0,
        remindersCreated: 0,
        remindersSent: 0,
        escalationsSent: 0,
        skipped: 0,
        errors: [],
      };
    }

    this.isProcessing = true;
    const result: SchedulerProcessResult = {
      processed: 0,
      remindersCreated: 0,
      remindersSent: 0,
      escalationsSent: 0,
      skipped: 0,
      errors: [],
    };

    try {
      console.log("Starting task reminder processing...");

      // Get all users with task reminders enabled
      const usersForReminders = await getUsersForTaskReminders();
      console.log(`Found ${usersForReminders.length} users with task reminders enabled`);

      for (const userConfig of usersForReminders) {
        result.processed++;

        try {
          const userResult = await this.processUserReminders(userConfig);

          result.remindersCreated += userResult.remindersCreated;
          result.remindersSent += userResult.remindersSent;
          result.escalationsSent += userResult.escalationsSent;
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
          console.error(`Error processing reminders for user ${userConfig.userId}:`, error);
        }
      }

      console.log(
        `Task reminder processing complete: ${result.processed} users processed, ` +
        `${result.remindersSent} reminders sent, ${result.escalationsSent} escalations, ${result.skipped} skipped`
      );
    } finally {
      this.isProcessing = false;
    }

    return result;
  }

  /**
   * Process reminders for a specific user
   */
  async processUserReminders(
    userConfig: UserForTaskReminders
  ): Promise<SchedulerProcessResult> {
    const result: SchedulerProcessResult = {
      processed: 0,
      remindersCreated: 0,
      remindersSent: 0,
      escalationsSent: 0,
      skipped: 0,
      errors: [],
    };

    // Check if within quiet hours
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
      // Get tasks that need reminders
      const tasksForReminders = await this.getTasksForReminders(userConfig);

      for (const taskWithReminder of tasksForReminders) {
        result.processed++;

        try {
          const deliveryResult = await this.processTaskReminder(
            userConfig,
            taskWithReminder
          );

          if (deliveryResult.skipped) {
            result.skipped++;
          } else if (deliveryResult.success) {
            result.remindersCreated++;
            result.remindersSent++;

            if (taskWithReminder.reminderType === "escalation") {
              result.escalationsSent++;
            }
          } else {
            result.errors.push({
              userId: userConfig.userId,
              taskId: taskWithReminder.task.id,
              error: deliveryResult.error || "Unknown error",
            });
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          result.errors.push({
            userId: userConfig.userId,
            taskId: taskWithReminder.task.id,
            error: errorMessage,
          });
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      result.errors.push({
        userId: userConfig.userId,
        error: `Failed to get tasks: ${errorMessage}`,
      });
    }

    return result;
  }

  /**
   * Get tasks that need reminders for a user
   */
  private async getTasksForReminders(
    userConfig: UserForTaskReminders
  ): Promise<TaskWithReminder[]> {
    const tasksForReminders: TaskWithReminder[] = [];

    try {
      // Get overdue tasks
      const overdueResult = await getOverdueTasksForDashboard({
        limit: 50,
      });

      for (const task of overdueResult.tasks) {
        if (task.isOverdue && task.daysUntilDeadline !== null) {
          const hoursOverdue = Math.abs(task.daysUntilDeadline) * 24;

          // Check if should escalate
          const escalationCheck = await shouldEscalate(
            userConfig.userId,
            task.id,
            userConfig,
            hoursOverdue
          );

          if (escalationCheck.shouldEscalate) {
            tasksForReminders.push({
              task,
              reminderType: "escalation",
              hoursOverdue,
            });
          } else {
            // Check if regular overdue reminder
            const reminderCheck = await shouldSendReminder(
              userConfig.userId,
              task.id,
              userConfig,
              true
            );

            if (reminderCheck.shouldSend) {
              tasksForReminders.push({
                task,
                reminderType: "overdue",
                hoursOverdue,
              });
            }
          }
        }
      }

      // Get tasks due today for upcoming reminders
      const dueTodayResult = await getTasksDueToday({
        limit: 50,
      });

      for (const task of dueTodayResult.tasks) {
        // Check if should send upcoming reminder
        const reminderCheck = await shouldSendReminder(
          userConfig.userId,
          task.id,
          userConfig,
          false
        );

        if (reminderCheck.shouldSend) {
          tasksForReminders.push({
            task,
            reminderType: "upcoming",
          });
        }
      }

      // Get tasks due this week (within upcoming reminder hours)
      const dueThisWeekResult = await getTasksDueThisWeek({
        limit: 50,
      });

      for (const task of dueThisWeekResult.tasks) {
        // Check if within upcoming reminder window
        if (task.daysUntilDeadline !== null && task.daysUntilDeadline > 0) {
          const hoursUntilDeadline = task.daysUntilDeadline * 24;

          if (hoursUntilDeadline <= userConfig.upcomingReminderHours) {
            const reminderCheck = await shouldSendReminder(
              userConfig.userId,
              task.id,
              userConfig,
              false
            );

            if (reminderCheck.shouldSend) {
              tasksForReminders.push({
                task,
                reminderType: "upcoming",
              });
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error getting tasks for user ${userConfig.userId}:`, error);
      throw error;
    }

    return tasksForReminders;
  }

  /**
   * Process a single task reminder
   */
  private async processTaskReminder(
    userConfig: UserForTaskReminders,
    taskWithReminder: TaskWithReminder
  ): Promise<ReminderDeliveryResult> {
    const { task, reminderType, hoursOverdue } = taskWithReminder;

    // Determine recipient (user or supervisor for escalation)
    let recipientId = userConfig.userId;
    let recipientName = userConfig.userName;
    let escalatedToUserId: string | null = null;
    let escalationLevel = 0;

    if (reminderType === "escalation" && userConfig.supervisorId) {
      recipientId = userConfig.supervisorId;
      recipientName = userConfig.supervisorName || "Supervisor";
      escalatedToUserId = userConfig.supervisorId;

      // Get and record escalation level
      const escalationCheck = await shouldEscalate(
        userConfig.userId,
        task.id,
        userConfig,
        hoursOverdue || 0
      );
      escalationLevel = escalationCheck.newLevel;
    }

    // Create reminder log entry
    const logEntry = await createTaskReminderLog({
      id: nanoid(),
      userId: userConfig.userId,
      taskId: task.id,
      taskName: task.name,
      taskDeadline: task.deadline ? new Date(task.deadline) : null,
      projectId: task.projectId,
      projectName: task.projectName,
      reminderType,
      status: "pending",
      escalationLevel,
      escalatedToUserId,
      hoursOverdue: hoursOverdue ? Math.round(hoursOverdue) : null,
      scheduledFor: new Date(),
      metadata: JSON.stringify({
        stageName: task.stageName,
        assigneeNames: task.assigneeNames,
        priority: task.priority,
      }),
    });

    try {
      let pushMessageId: string | undefined;

      switch (userConfig.deliveryMethod) {
        case "push":
          pushMessageId = await this.sendPushNotification(
            recipientId,
            recipientName,
            task,
            reminderType,
            hoursOverdue,
            escalationLevel
          );
          break;
        case "email":
          // Email delivery not implemented yet
          console.log(`Email delivery requested but not implemented`);
          break;
        case "both":
          pushMessageId = await this.sendPushNotification(
            recipientId,
            recipientName,
            task,
            reminderType,
            hoursOverdue,
            escalationLevel
          );
          // Email would be sent here too
          break;
        case "in_app":
          // In-app notification only - no push
          break;
      }

      // Mark log as sent
      await markReminderLogAsSent(logEntry.id, pushMessageId);

      // Record reminder sent
      await recordReminderSent(userConfig.userId, task.id, reminderType);

      // Record escalation if applicable
      if (reminderType === "escalation") {
        await recordEscalation(userConfig.userId, task.id, escalationLevel);
      }

      return {
        success: true,
        logId: logEntry.id,
        pushMessageId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      await markReminderLogAsFailed(logEntry.id, errorMessage);

      return {
        success: false,
        logId: logEntry.id,
        error: errorMessage,
      };
    }
  }

  /**
   * Send a push notification for the task reminder
   */
  private async sendPushNotification(
    userId: string,
    userName: string,
    task: DashboardTaskSummary,
    reminderType: TaskReminderType,
    hoursOverdue?: number,
    escalationLevel?: number
  ): Promise<string | undefined> {
    const pushService = getPushNotificationService();

    const { title, body } = this.formatNotificationContent(
      userName,
      task,
      reminderType,
      hoursOverdue,
      escalationLevel
    );

    const payload: PushNotificationPayload = {
      title,
      body,
      icon: "/icons/task-reminder-icon.png",
      badge: "/icons/badge.png",
      clickAction: "/dashboard/tasks",
      priority: reminderType === "escalation" ? "high" : "normal",
      data: {
        type: "task_reminder",
        reminderType,
        taskId: task.id.toString(),
        taskName: task.name,
        projectId: task.projectId !== null ? task.projectId.toString() : "",
        escalationLevel: escalationLevel !== undefined ? escalationLevel.toString() : "0",
        timestamp: new Date().toISOString(),
      },
    };

    const result = await pushService.queueNotification({
      userId,
      payload,
    });

    return result.messageId;
  }

  /**
   * Format notification content based on reminder type
   */
  private formatNotificationContent(
    userName: string,
    task: DashboardTaskSummary,
    reminderType: TaskReminderType,
    hoursOverdue?: number,
    escalationLevel?: number
  ): { title: string; body: string } {
    const firstName = userName.split(" ")[0];
    const projectInfo = task.projectName ? ` (${task.projectName})` : "";

    switch (reminderType) {
      case "upcoming":
        return {
          title: `Task Due Soon`,
          body: `"${task.name}"${projectInfo} is due ${task.deadlineFormatted}. Don't forget to complete it!`,
        };

      case "overdue":
        const daysOverdue = hoursOverdue ? Math.ceil(hoursOverdue / 24) : 0;
        return {
          title: `Overdue Task Reminder`,
          body: `"${task.name}"${projectInfo} is ${daysOverdue} day${daysOverdue > 1 ? "s" : ""} overdue. Please update the status.`,
        };

      case "escalation":
        const escalationPrefix = escalationLevel && escalationLevel > 1 ? `[Level ${escalationLevel}] ` : "";
        return {
          title: `${escalationPrefix}Task Escalation Alert`,
          body: `"${task.name}"${projectInfo} assigned to your team is significantly overdue (${hoursOverdue ? Math.ceil(hoursOverdue / 24) : 0}+ days). Action required.`,
        };

      default:
        return {
          title: "Task Reminder",
          body: `Reminder about "${task.name}"${projectInfo}`,
        };
    }
  }

  /**
   * Get scheduler statistics
   */
  async getSchedulerStats(): Promise<{
    enabledUsers: number;
    isProcessing: boolean;
  }> {
    const enabledUsers = await countEnabledTaskReminderUsers();
    return {
      enabledUsers,
      isProcessing: this.isProcessing,
    };
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let taskReminderSchedulerService: TaskReminderSchedulerService | null = null;

/**
 * Get the task reminder scheduler service instance
 */
export function getTaskReminderSchedulerService(): TaskReminderSchedulerService {
  if (!taskReminderSchedulerService) {
    taskReminderSchedulerService = new TaskReminderSchedulerService();
  }
  return taskReminderSchedulerService;
}

/**
 * Process task reminders (convenience function)
 */
export async function processTaskReminders(): Promise<SchedulerProcessResult> {
  const service = getTaskReminderSchedulerService();
  return service.processTaskReminders();
}
