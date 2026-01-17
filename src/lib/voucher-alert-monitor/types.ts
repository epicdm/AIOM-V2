/**
 * Voucher Alert Monitor Types
 *
 * Type definitions for the voucher alert monitoring service.
 */

export type VoucherAlertType =
  | "receipt_pending"
  | "receipt_overdue"
  | "reconciliation_pending"
  | "reconciliation_overdue"
  | "escalation";

export interface VoucherAlertProcessResult {
  processed: number;
  alertsSent: number;
  escalationsSent: number;
  skipped: number;
  errors: Array<{
    userId?: string;
    voucherId?: string;
    error: string;
  }>;
}

export interface VoucherAlertDeliveryResult {
  success: boolean;
  alertId?: string;
  pushMessageId?: string;
  error?: string;
  skipped?: boolean;
  skipReason?: string;
}

export interface VoucherAlertNotification {
  title: string;
  body: string;
  priority: "low" | "normal" | "high" | "urgent";
  actionUrl: string;
  data: Record<string, string>;
}

export interface VoucherAlertStats {
  usersWithPendingVouchers: number;
  isProcessing: boolean;
  lastProcessedAt?: Date;
}
