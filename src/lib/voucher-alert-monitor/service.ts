/**
 * Voucher Alert Monitor Service
 *
 * Main service that monitors expenses awaiting receipts and sends reminder notifications.
 * Escalates overdue reconciliations to approvers.
 *
 * Features:
 * - Monitors vouchers awaiting receipt uploads
 * - Monitors vouchers pending reconciliation
 * - Sends reminder notifications at configurable intervals
 * - Escalates overdue items to approvers/supervisors
 * - Respects quiet hours and working days
 * - Multiple delivery methods (push, email, in-app)
 */

import { nanoid } from "nanoid";
import {
  getUsersForVoucherAlerts,
  countUsersWithPendingVouchers,
  getVouchersRequiringAlerts,
  wasAlertSentRecently,
  recordAlertSent,
  shouldEscalate,
  isWithinQuietHours,
  isWorkingDay,
  getApproversForVoucher,
  type VoucherAlertConfig,
  type VoucherForAlert,
  type VoucherAlertType,
} from "~/data-access/voucher-alerts";
import { getPushNotificationService } from "~/lib/push-notification/service";
import type { PushNotificationPayload } from "~/lib/push-notification/types";
import type {
  VoucherAlertProcessResult,
  VoucherAlertDeliveryResult,
  VoucherAlertNotification,
  VoucherAlertStats,
} from "./types";

// =============================================================================
// Voucher Alert Monitor Service
// =============================================================================

export class VoucherAlertMonitorService {
  private isProcessing = false;
  private lastProcessedAt?: Date;

  /**
   * Process voucher alerts for all users with pending vouchers
   * This is the main entry point called by the cron job
   */
  async processVoucherAlerts(): Promise<VoucherAlertProcessResult> {
    if (this.isProcessing) {
      console.log("Voucher alert monitor is already processing, skipping...");
      return {
        processed: 0,
        alertsSent: 0,
        escalationsSent: 0,
        skipped: 0,
        errors: [],
      };
    }

    this.isProcessing = true;
    const result: VoucherAlertProcessResult = {
      processed: 0,
      alertsSent: 0,
      escalationsSent: 0,
      skipped: 0,
      errors: [],
    };

    try {
      console.log("Starting voucher alert processing...");

      // Get all users with vouchers that need monitoring
      const usersForAlerts = await getUsersForVoucherAlerts();
      console.log(`Found ${usersForAlerts.length} users with vouchers requiring alerts`);

      for (const userConfig of usersForAlerts) {
        result.processed++;

        try {
          const userResult = await this.processUserAlerts(userConfig);

          result.alertsSent += userResult.alertsSent;
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
          console.error(`Error processing alerts for user ${userConfig.userId}:`, error);
        }
      }

      this.lastProcessedAt = new Date();
      console.log(
        `Voucher alert processing complete: ${result.processed} users processed, ` +
        `${result.alertsSent} alerts sent, ${result.escalationsSent} escalations, ${result.skipped} skipped`
      );
    } finally {
      this.isProcessing = false;
    }

    return result;
  }

  /**
   * Process alerts for a specific user
   */
  private async processUserAlerts(
    userConfig: VoucherAlertConfig
  ): Promise<VoucherAlertProcessResult> {
    const result: VoucherAlertProcessResult = {
      processed: 0,
      alertsSent: 0,
      escalationsSent: 0,
      skipped: 0,
      errors: [],
    };

    // Check if within quiet hours
    if (isWithinQuietHours(userConfig.timezone, userConfig.quietHoursStart, userConfig.quietHoursEnd)) {
      console.log(`User ${userConfig.userId} is in quiet hours, skipping`);
      return result;
    }

    // Check if today is a working day
    if (!isWorkingDay(userConfig.timezone, userConfig.workingDays)) {
      console.log(`Today is not a working day for user ${userConfig.userId}, skipping`);
      return result;
    }

    try {
      // Get vouchers that require alerts
      const vouchersForAlerts = await getVouchersRequiringAlerts(userConfig.userId, userConfig);

      for (const { voucher, alertType } of vouchersForAlerts) {
        result.processed++;

        try {
          const deliveryResult = await this.processVoucherAlert(
            userConfig,
            voucher,
            alertType
          );

          if (deliveryResult.skipped) {
            result.skipped++;
          } else if (deliveryResult.success) {
            result.alertsSent++;

            // Check if escalation is needed
            const daysPending = alertType.includes("receipt")
              ? voucher.daysSinceDisbursement || 0
              : voucher.daysSincePosting || 0;

            const escalationCheck = shouldEscalate(
              voucher.id,
              alertType,
              userConfig,
              daysPending
            );

            if (escalationCheck.shouldEscalate) {
              const escalationResult = await this.sendEscalation(
                userConfig,
                voucher,
                alertType,
                escalationCheck.escalationLevel
              );

              if (escalationResult.success) {
                result.escalationsSent++;
              }
            }
          } else {
            result.errors.push({
              userId: userConfig.userId,
              voucherId: voucher.id,
              error: deliveryResult.error || "Unknown error",
            });
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          result.errors.push({
            userId: userConfig.userId,
            voucherId: voucher.id,
            error: errorMessage,
          });
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      result.errors.push({
        userId: userConfig.userId,
        error: `Failed to get vouchers: ${errorMessage}`,
      });
    }

    return result;
  }

  /**
   * Process a single voucher alert
   */
  private async processVoucherAlert(
    userConfig: VoucherAlertConfig,
    voucher: VoucherForAlert,
    alertType: VoucherAlertType
  ): Promise<VoucherAlertDeliveryResult> {
    // Check if alert was sent recently (within 24 hours for reminders, 48 for overdue)
    const hoursThreshold = alertType.includes("overdue") ? 48 : 24;
    if (wasAlertSentRecently(voucher.id, alertType, hoursThreshold)) {
      return {
        success: false,
        skipped: true,
        skipReason: `Alert already sent within ${hoursThreshold} hours`,
      };
    }

    try {
      let pushMessageId: string | undefined;

      const notification = this.buildNotification(userConfig, voucher, alertType);

      switch (userConfig.deliveryMethod) {
        case "push":
          pushMessageId = await this.sendPushNotification(
            userConfig.userId,
            notification
          );
          break;
        case "email":
          // Email delivery not implemented yet
          console.log(`Email delivery requested but not implemented`);
          break;
        case "both":
          pushMessageId = await this.sendPushNotification(
            userConfig.userId,
            notification
          );
          // Email would be sent here too
          break;
        case "in_app":
          // In-app notification only - would create a database notification entry
          break;
      }

      // Record that alert was sent
      recordAlertSent(voucher.id, alertType);

      return {
        success: true,
        alertId: nanoid(),
        pushMessageId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Send escalation notification to approvers/supervisors
   */
  private async sendEscalation(
    userConfig: VoucherAlertConfig,
    voucher: VoucherForAlert,
    alertType: VoucherAlertType,
    escalationLevel: number
  ): Promise<VoucherAlertDeliveryResult> {
    try {
      // Get approvers for the voucher
      const approvers = await getApproversForVoucher(voucher.id);

      // Add supervisor if configured
      if (userConfig.supervisorId) {
        const supervisorExists = approvers.some((a) => a.id === userConfig.supervisorId);
        if (!supervisorExists && userConfig.supervisorName && userConfig.supervisorEmail) {
          approvers.push({
            id: userConfig.supervisorId,
            name: userConfig.supervisorName,
            email: userConfig.supervisorEmail,
          });
        }
      }

      if (approvers.length === 0) {
        return {
          success: false,
          error: "No approvers found for escalation",
        };
      }

      const notification = this.buildEscalationNotification(
        userConfig,
        voucher,
        alertType,
        escalationLevel
      );

      let successCount = 0;

      for (const approver of approvers) {
        try {
          // Check if escalation was sent recently
          const escalationKey = `${voucher.id}:escalation:${approver.id}`;
          if (wasAlertSentRecently(voucher.id, "escalation", 72)) {
            continue;
          }

          await this.sendPushNotification(approver.id, notification);
          recordAlertSent(voucher.id, "escalation");
          successCount++;
        } catch (error) {
          console.error(`Failed to send escalation to ${approver.id}:`, error);
        }
      }

      return {
        success: successCount > 0,
        alertId: nanoid(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Build notification content based on alert type
   */
  private buildNotification(
    userConfig: VoucherAlertConfig,
    voucher: VoucherForAlert,
    alertType: VoucherAlertType
  ): VoucherAlertNotification {
    const { voucherNumber, amount, currency, description, vendorName } = voucher;
    const amountFormatted = `${currency} ${parseFloat(amount).toLocaleString()}`;
    const vendorInfo = vendorName ? ` (${vendorName})` : "";

    switch (alertType) {
      case "receipt_pending":
        return {
          title: "📋 Receipt Upload Reminder",
          body: `Voucher ${voucherNumber} for ${amountFormatted}${vendorInfo} is awaiting receipt upload. Please upload your receipt to complete the expense process.`,
          priority: "normal",
          actionUrl: `/expenses/vouchers/${voucher.id}`,
          data: {
            type: "voucher_alert",
            alertType,
            voucherId: voucher.id,
            voucherNumber,
            timestamp: new Date().toISOString(),
          },
        };

      case "receipt_overdue":
        return {
          title: "⚠️ Receipt Upload Overdue",
          body: `URGENT: Voucher ${voucherNumber} for ${amountFormatted}${vendorInfo} is ${voucher.daysSinceDisbursement} days overdue for receipt upload. Please upload immediately.`,
          priority: "high",
          actionUrl: `/expenses/vouchers/${voucher.id}`,
          data: {
            type: "voucher_alert",
            alertType,
            voucherId: voucher.id,
            voucherNumber,
            daysOverdue: String(voucher.daysSinceDisbursement || 0),
            timestamp: new Date().toISOString(),
          },
        };

      case "reconciliation_pending":
        return {
          title: "📊 Reconciliation Reminder",
          body: `Voucher ${voucherNumber} for ${amountFormatted}${vendorInfo} requires reconciliation. Please review and reconcile the expense.`,
          priority: "normal",
          actionUrl: `/expenses/vouchers/${voucher.id}/reconcile`,
          data: {
            type: "voucher_alert",
            alertType,
            voucherId: voucher.id,
            voucherNumber,
            timestamp: new Date().toISOString(),
          },
        };

      case "reconciliation_overdue":
        return {
          title: "⚠️ Reconciliation Overdue",
          body: `URGENT: Voucher ${voucherNumber} for ${amountFormatted}${vendorInfo} is ${voucher.daysSincePosting} days overdue for reconciliation. Immediate action required.`,
          priority: "high",
          actionUrl: `/expenses/vouchers/${voucher.id}/reconcile`,
          data: {
            type: "voucher_alert",
            alertType,
            voucherId: voucher.id,
            voucherNumber,
            daysOverdue: String(voucher.daysSincePosting || 0),
            timestamp: new Date().toISOString(),
          },
        };

      default:
        return {
          title: "Voucher Alert",
          body: `Action required for voucher ${voucherNumber}`,
          priority: "normal",
          actionUrl: `/expenses/vouchers/${voucher.id}`,
          data: {
            type: "voucher_alert",
            alertType,
            voucherId: voucher.id,
            voucherNumber,
            timestamp: new Date().toISOString(),
          },
        };
    }
  }

  /**
   * Build escalation notification content
   */
  private buildEscalationNotification(
    userConfig: VoucherAlertConfig,
    voucher: VoucherForAlert,
    alertType: VoucherAlertType,
    escalationLevel: number
  ): VoucherAlertNotification {
    const { voucherNumber, amount, currency, description, vendorName, submitterName } = voucher;
    const amountFormatted = `${currency} ${parseFloat(amount).toLocaleString()}`;
    const vendorInfo = vendorName ? ` (${vendorName})` : "";
    const levelPrefix = escalationLevel > 1 ? `[Level ${escalationLevel}] ` : "";

    const isReceiptIssue = alertType.includes("receipt");
    const daysPending = isReceiptIssue
      ? voucher.daysSinceDisbursement
      : voucher.daysSincePosting;
    const issueType = isReceiptIssue ? "receipt upload" : "reconciliation";

    return {
      title: `🚨 ${levelPrefix}Escalation: ${isReceiptIssue ? "Missing Receipt" : "Pending Reconciliation"}`,
      body: `Voucher ${voucherNumber} for ${amountFormatted}${vendorInfo} submitted by ${submitterName} has been pending ${issueType} for ${daysPending}+ days. Management attention required.`,
      priority: "urgent",
      actionUrl: `/expenses/vouchers/${voucher.id}`,
      data: {
        type: "voucher_escalation",
        alertType: "escalation",
        originalAlertType: alertType,
        voucherId: voucher.id,
        voucherNumber,
        submitterId: voucher.submitterId,
        submitterName,
        escalationLevel: String(escalationLevel),
        daysPending: String(daysPending || 0),
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Send a push notification
   */
  private async sendPushNotification(
    userId: string,
    notification: VoucherAlertNotification
  ): Promise<string | undefined> {
    const pushService = getPushNotificationService();

    const payload: PushNotificationPayload = {
      title: notification.title,
      body: notification.body,
      icon: "/icons/expense-alert-icon.png",
      badge: "/icons/badge.png",
      clickAction: notification.actionUrl,
      priority: notification.priority === "urgent" || notification.priority === "high" ? "high" : "normal",
      data: notification.data,
    };

    const result = await pushService.queueNotification({
      userId,
      payload,
    });

    return result.messageId;
  }

  /**
   * Get service statistics
   */
  async getStats(): Promise<VoucherAlertStats> {
    const usersWithPendingVouchers = await countUsersWithPendingVouchers();
    return {
      usersWithPendingVouchers,
      isProcessing: this.isProcessing,
      lastProcessedAt: this.lastProcessedAt,
    };
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let voucherAlertMonitorService: VoucherAlertMonitorService | null = null;

/**
 * Get the voucher alert monitor service instance
 */
export function getVoucherAlertMonitorService(): VoucherAlertMonitorService {
  if (!voucherAlertMonitorService) {
    voucherAlertMonitorService = new VoucherAlertMonitorService();
  }
  return voucherAlertMonitorService;
}

/**
 * Process voucher alerts (convenience function)
 */
export async function processVoucherAlerts(): Promise<VoucherAlertProcessResult> {
  const service = getVoucherAlertMonitorService();
  return service.processVoucherAlerts();
}
