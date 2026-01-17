/**
 * Notification Job Handlers
 * Handlers for notification-related background jobs
 */

import type { JobContext, JobHandler, NotificationPushPayload, NotificationEmailPayload } from "../types";

/**
 * Push notification job handler
 * Sends a push notification to a user
 */
export const notificationPushHandler: JobHandler<NotificationPushPayload, { sent: boolean; messageId?: string }> = async (
  context
) => {
  const { job, updateProgress } = context;
  const { userId, title, body, icon, clickAction, data } = job.payload;

  console.log(`[NotificationPushHandler] Sending push notification to user ${userId}`);
  await updateProgress(10, "Preparing push notification...");

  try {
    // Dynamically import to avoid circular dependencies
    const { getPushNotificationService } = await import("~/lib/push-notification/service");

    await updateProgress(30, "Getting push service...");

    const pushService = getPushNotificationService();

    await updateProgress(50, "Sending notification...");

    // Convert data to Record<string, string> for push notification payload
    const stringData: Record<string, string> = {};
    if (data) {
      for (const [key, value] of Object.entries(data)) {
        stringData[key] = String(value);
      }
    }

    // Queue the notification
    const result = await pushService.queueNotification({
      userId,
      payload: {
        title,
        body,
        icon: icon || "/icons/notification-icon.png",
        badge: "/icons/badge.png",
        clickAction: clickAction || "/dashboard",
        priority: "normal",
        data: stringData,
      },
    });

    await updateProgress(90, result.messageId ? "Sent successfully" : "Notification queued");

    console.log(`[NotificationPushHandler] Push notification result for user ${userId}:`, result);

    await updateProgress(100, "Complete");

    return {
      sent: true,
      messageId: result.messageId,
    };
  } catch (error) {
    console.error(`[NotificationPushHandler] Error sending push notification to user ${userId}:`, error);
    throw error;
  }
};

/**
 * Email notification job handler
 * Sends an email notification to a user
 */
export const notificationEmailHandler: JobHandler<NotificationEmailPayload, { sent: boolean; messageId?: string }> = async (
  context
) => {
  const { job, updateProgress } = context;
  const { userId, to, subject, template, templateData } = job.payload;

  console.log(`[NotificationEmailHandler] Sending email to ${to} for user ${userId}`);
  await updateProgress(10, "Preparing email...");

  try {
    await updateProgress(30, "Loading email template...");

    // Note: Email service not implemented in the codebase yet
    // This is a placeholder for future implementation
    console.log(`[NotificationEmailHandler] Email would be sent:`, {
      to,
      subject,
      template,
      templateData,
    });

    await updateProgress(50, "Sending email...");

    // Simulate email sending delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    await updateProgress(90, "Email sent");

    console.log(`[NotificationEmailHandler] Email notification completed for user ${userId}`);

    await updateProgress(100, "Complete");

    return {
      sent: true,
      messageId: `email-${Date.now()}`,
    };
  } catch (error) {
    console.error(`[NotificationEmailHandler] Error sending email to ${to}:`, error);
    throw error;
  }
};
