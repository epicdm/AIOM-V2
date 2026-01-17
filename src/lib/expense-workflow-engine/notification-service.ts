/**
 * Expense Workflow Notification Service
 *
 * Handles sending notifications at each stage of the expense workflow.
 * Integrates with the existing notification system and push notification infrastructure.
 */

import {
  getPendingNotifications,
  markNotificationSent,
  markNotificationDelivered,
  markNotificationFailed,
} from "~/data-access/expense-workflow";
import { createNotification } from "~/data-access/notifications";
import { findUserById } from "~/data-access/users";
import type { ExpenseWorkflowNotificationQueue } from "~/db/schema";

/**
 * Notification templates for different workflow events
 */
export const NOTIFICATION_TEMPLATES = {
  // Approval flow
  approval_request: {
    titleTemplate: "Expense Approval Required",
    bodyTemplate: (data: Record<string, unknown>) =>
      `You have a new expense voucher ${data.voucherNumber} for ${data.amount} awaiting your approval.`,
    priority: "high" as const,
  },
  approved: {
    titleTemplate: "Expense Approved",
    bodyTemplate: (data: Record<string, unknown>) =>
      `Your expense voucher ${data.voucherNumber} for ${data.amount} has been approved.`,
    priority: "normal" as const,
  },
  rejected: {
    titleTemplate: "Expense Rejected",
    bodyTemplate: (data: Record<string, unknown>) =>
      `Your expense voucher ${data.voucherNumber} has been rejected. Reason: ${data.reason || "No reason provided"}`,
    priority: "high" as const,
  },
  returned_for_revision: {
    titleTemplate: "Expense Returned for Revision",
    bodyTemplate: (data: Record<string, unknown>) =>
      `Your expense voucher ${data.voucherNumber} has been returned for revision. Reason: ${data.reason || "Please review and resubmit"}`,
    priority: "high" as const,
  },

  // Disbursement flow
  disbursement_initiated: {
    titleTemplate: "Disbursement Initiated",
    bodyTemplate: (data: Record<string, unknown>) =>
      `Disbursement has been initiated for expense voucher ${data.voucherNumber}.`,
    priority: "normal" as const,
  },
  disbursed: {
    titleTemplate: "Expense Disbursed",
    bodyTemplate: (data: Record<string, unknown>) =>
      `Your expense voucher ${data.voucherNumber} for ${data.amount} has been disbursed.`,
    priority: "normal" as const,
  },

  // Receipt flow
  receipt_requested: {
    titleTemplate: "Receipt Required",
    bodyTemplate: (data: Record<string, unknown>) =>
      `Please upload a receipt for expense voucher ${data.voucherNumber}.`,
    priority: "high" as const,
  },
  receipt_uploaded: {
    titleTemplate: "Receipt Uploaded",
    bodyTemplate: (data: Record<string, unknown>) =>
      `Receipt has been uploaded for expense voucher ${data.voucherNumber}.`,
    priority: "low" as const,
  },

  // Reconciliation flow
  reconciliation_started: {
    titleTemplate: "Reconciliation Started",
    bodyTemplate: (data: Record<string, unknown>) =>
      `Expense voucher ${data.voucherNumber} is now being reconciled.`,
    priority: "low" as const,
  },
  reconciled: {
    titleTemplate: "Expense Reconciled",
    bodyTemplate: (data: Record<string, unknown>) =>
      `Expense voucher ${data.voucherNumber} has been reconciled.`,
    priority: "low" as const,
  },

  // GL Posting flow
  gl_posting_initiated: {
    titleTemplate: "GL Posting Initiated",
    bodyTemplate: (data: Record<string, unknown>) =>
      `GL posting has been initiated for expense voucher ${data.voucherNumber}.`,
    priority: "low" as const,
  },
  gl_posted: {
    titleTemplate: "Posted to General Ledger",
    bodyTemplate: (data: Record<string, unknown>) =>
      `Expense voucher ${data.voucherNumber} has been posted to the general ledger.`,
    priority: "low" as const,
  },
  gl_posting_failed: {
    titleTemplate: "GL Posting Failed",
    bodyTemplate: (data: Record<string, unknown>) =>
      `GL posting failed for expense voucher ${data.voucherNumber}. Error: ${data.error || "Unknown error"}`,
    priority: "urgent" as const,
  },

  // Other notifications
  escalation: {
    titleTemplate: "Expense Escalated",
    bodyTemplate: (data: Record<string, unknown>) =>
      `Expense voucher ${data.voucherNumber} has been escalated to you. Reason: ${data.reason || "Pending action required"}`,
    priority: "urgent" as const,
  },
  reminder: {
    titleTemplate: "Action Required: Expense Pending",
    bodyTemplate: (data: Record<string, unknown>) =>
      `Expense voucher ${data.voucherNumber} for ${data.amount} is awaiting your action.`,
    priority: "high" as const,
  },
  voided: {
    titleTemplate: "Expense Voided",
    bodyTemplate: (data: Record<string, unknown>) =>
      `Expense voucher ${data.voucherNumber} has been voided. Reason: ${data.reason || "No reason provided"}`,
    priority: "normal" as const,
  },
  comment_added: {
    titleTemplate: "New Comment on Expense",
    bodyTemplate: (data: Record<string, unknown>) =>
      `${data.commenterName || "Someone"} commented on expense voucher ${data.voucherNumber}.`,
    priority: "low" as const,
  },
};

export type NotificationType = keyof typeof NOTIFICATION_TEMPLATES;

/**
 * Process pending workflow notifications
 * This should be called periodically (e.g., via cron job or queue processor)
 */
export async function processPendingNotifications(batchSize: number = 50): Promise<{
  processed: number;
  sent: number;
  failed: number;
}> {
  const pendingNotifications = await getPendingNotifications(batchSize);
  let sent = 0;
  let failed = 0;

  for (const notification of pendingNotifications) {
    try {
      await sendNotification(notification);
      await markNotificationSent(notification.id);
      sent++;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      await markNotificationFailed(notification.id, errorMessage);
      failed++;
    }
  }

  return {
    processed: pendingNotifications.length,
    sent,
    failed,
  };
}

/**
 * Send a single notification
 */
async function sendNotification(
  queuedNotification: ExpenseWorkflowNotificationQueue
): Promise<void> {
  // Create in-app notification
  await createNotification({
    id: crypto.randomUUID(),
    userId: queuedNotification.recipientId,
    type: `expense_workflow_${queuedNotification.notificationType}`,
    title: queuedNotification.title,
    content: queuedNotification.body,
    relatedId: queuedNotification.voucherId,
    relatedType: "expense_voucher",
  });

  // Mark as delivered (for in-app notification)
  await markNotificationDelivered(queuedNotification.id);
}

/**
 * Get notification template for an event type
 */
export function getNotificationTemplate(
  notificationType: string
): (typeof NOTIFICATION_TEMPLATES)[NotificationType] | null {
  return NOTIFICATION_TEMPLATES[notificationType as NotificationType] || null;
}

/**
 * Build notification content from template and data
 */
export function buildNotificationContent(
  notificationType: NotificationType,
  data: Record<string, unknown>
): { title: string; body: string; priority: string } {
  const template = NOTIFICATION_TEMPLATES[notificationType];
  if (!template) {
    return {
      title: "Expense Notification",
      body: "You have a notification regarding an expense.",
      priority: "normal",
    };
  }

  return {
    title: template.titleTemplate,
    body: template.bodyTemplate(data),
    priority: template.priority,
  };
}

/**
 * Schedule a reminder notification
 */
export async function scheduleReminder(
  workflowInstanceId: string,
  voucherId: string,
  recipientId: string,
  voucherNumber: string,
  amount: string,
  delayHours: number = 24
): Promise<void> {
  const { queueWorkflowNotification } = await import("~/data-access/expense-workflow");

  const scheduledFor = new Date();
  scheduledFor.setHours(scheduledFor.getHours() + delayHours);

  const content = buildNotificationContent("reminder", {
    voucherNumber,
    amount,
  });

  await queueWorkflowNotification(
    workflowInstanceId,
    voucherId,
    recipientId,
    "reminder",
    content.title,
    content.body,
    `/dashboard/approvals/${voucherId}`,
    content.priority as "low" | "normal" | "high" | "urgent",
    scheduledFor
  );
}

/**
 * Cancel all pending reminders for a workflow
 */
export async function cancelPendingReminders(
  workflowInstanceId: string
): Promise<number> {
  const { cancelWorkflowNotifications } = await import("~/data-access/expense-workflow");
  return await cancelWorkflowNotifications(workflowInstanceId);
}
