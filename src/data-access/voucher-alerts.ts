/**
 * Voucher Alert Monitor Data Access Layer
 *
 * Provides database queries for the voucher alert monitoring service.
 * Handles queries for vouchers awaiting receipts and overdue reconciliations.
 */

import { eq, desc, count, and, or, isNull, lte, sql } from "drizzle-orm";
import { database } from "~/db";
import {
  expenseVoucher,
  user,
  type ExpenseVoucher,
} from "~/db/schema";

// =============================================================================
// Types
// =============================================================================

export type VoucherAlertType =
  | "receipt_pending"
  | "receipt_overdue"
  | "reconciliation_pending"
  | "reconciliation_overdue"
  | "escalation";

export interface VoucherAlertConfig {
  userId: string;
  userName: string;
  userEmail: string;
  timezone: string;
  receiptReminderDays: number; // Days after disbursement to remind for receipt
  receiptOverdueDays: number; // Days after disbursement to mark receipt as overdue
  reconciliationReminderDays: number; // Days after posting to remind for reconciliation
  reconciliationOverdueDays: number; // Days after posting to mark reconciliation as overdue
  escalationEnabled: boolean;
  supervisorId: string | null;
  supervisorName: string | null;
  supervisorEmail: string | null;
  deliveryMethod: "push" | "email" | "both" | "in_app";
  quietHoursStart: string | null; // HH:mm format
  quietHoursEnd: string | null; // HH:mm format
  workingDays: string; // JSON array of days [1,2,3,4,5] (Mon-Fri)
}

export interface VoucherForAlert {
  id: string;
  voucherNumber: string;
  amount: string;
  currency: string;
  description: string;
  vendorName: string | null;
  status: string;
  reconciliationStatus: string;
  postingStatus: string;
  submitterId: string;
  submitterName: string;
  submitterEmail: string;
  currentApproverId: string | null;
  approverName: string | null;
  approverEmail: string | null;
  hasReceipt: boolean;
  receiptAttachments: string | null;
  disbursedAt: Date | null;
  postedAt: Date | null;
  createdAt: Date;
  daysSinceDisbursement: number | null;
  daysSincePosting: number | null;
}

export interface VoucherAlertLog {
  id: string;
  voucherId: string;
  voucherNumber: string;
  userId: string;
  alertType: VoucherAlertType;
  status: "pending" | "sent" | "failed" | "delivered";
  escalationLevel: number;
  escalatedToUserId: string | null;
  daysPending: number | null;
  scheduledFor: Date;
  sentAt: Date | null;
  failedAt: Date | null;
  errorMessage: string | null;
  pushMessageId: string | null;
  metadata: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// User Alert Configuration Queries
// =============================================================================

/**
 * Get users with voucher alert monitoring enabled
 * For now, this returns users who have submitted vouchers that need monitoring
 */
export async function getUsersForVoucherAlerts(): Promise<VoucherAlertConfig[]> {
  // Get distinct submitters who have vouchers that need monitoring
  // These are vouchers that are disbursed but missing receipts OR posted but not reconciled
  const usersWithPendingVouchers = await database
    .selectDistinct({
      userId: expenseVoucher.submitterId,
    })
    .from(expenseVoucher)
    .where(
      or(
        // Disbursed but no receipt
        and(
          eq(expenseVoucher.status, "disbursed"),
          or(
            isNull(expenseVoucher.receiptAttachments),
            eq(expenseVoucher.receiptAttachments, ""),
            eq(expenseVoucher.receiptAttachments, "[]")
          )
        ),
        // Posted but not reconciled
        and(
          eq(expenseVoucher.postingStatus, "posted"),
          eq(expenseVoucher.reconciliationStatus, "unreconciled")
        )
      )
    );

  // Get user details for each submitter
  const configs: VoucherAlertConfig[] = [];

  for (const { userId } of usersWithPendingVouchers) {
    const [userRecord] = await database
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
      })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (userRecord) {
      // Default configuration - in a real system, this would come from a user_alert_preferences table
      configs.push({
        userId: userRecord.id,
        userName: userRecord.name,
        userEmail: userRecord.email,
        timezone: "America/New_York", // Default timezone
        receiptReminderDays: 3, // Remind after 3 days
        receiptOverdueDays: 7, // Overdue after 7 days
        reconciliationReminderDays: 5, // Remind after 5 days
        reconciliationOverdueDays: 14, // Overdue after 14 days
        escalationEnabled: true,
        supervisorId: null, // Would be populated from org hierarchy
        supervisorName: null,
        supervisorEmail: null,
        deliveryMethod: "push",
        quietHoursStart: "22:00",
        quietHoursEnd: "08:00",
        workingDays: JSON.stringify([1, 2, 3, 4, 5]), // Mon-Fri
      });
    }
  }

  return configs;
}

/**
 * Count users with voucher alerts enabled
 */
export async function countUsersWithPendingVouchers(): Promise<number> {
  const result = await database
    .selectDistinct({
      userId: expenseVoucher.submitterId,
    })
    .from(expenseVoucher)
    .where(
      or(
        // Disbursed but no receipt
        and(
          eq(expenseVoucher.status, "disbursed"),
          or(
            isNull(expenseVoucher.receiptAttachments),
            eq(expenseVoucher.receiptAttachments, ""),
            eq(expenseVoucher.receiptAttachments, "[]")
          )
        ),
        // Posted but not reconciled
        and(
          eq(expenseVoucher.postingStatus, "posted"),
          eq(expenseVoucher.reconciliationStatus, "unreconciled")
        )
      )
    );

  return result.length;
}

// =============================================================================
// Voucher Query Functions
// =============================================================================

/**
 * Get vouchers that are disbursed but missing receipts
 */
export async function getVouchersAwaitingReceipts(
  userId?: string,
  options: { limit?: number; offset?: number } = {}
): Promise<VoucherForAlert[]> {
  const { limit = 100, offset = 0 } = options;

  const conditions = [
    eq(expenseVoucher.status, "disbursed"),
    or(
      isNull(expenseVoucher.receiptAttachments),
      eq(expenseVoucher.receiptAttachments, ""),
      eq(expenseVoucher.receiptAttachments, "[]")
    ),
  ];

  if (userId) {
    conditions.push(eq(expenseVoucher.submitterId, userId));
  }

  const vouchers = await database
    .select({
      id: expenseVoucher.id,
      voucherNumber: expenseVoucher.voucherNumber,
      amount: expenseVoucher.amount,
      currency: expenseVoucher.currency,
      description: expenseVoucher.description,
      vendorName: expenseVoucher.vendorName,
      status: expenseVoucher.status,
      reconciliationStatus: expenseVoucher.reconciliationStatus,
      postingStatus: expenseVoucher.postingStatus,
      submitterId: expenseVoucher.submitterId,
      currentApproverId: expenseVoucher.currentApproverId,
      receiptAttachments: expenseVoucher.receiptAttachments,
      paymentDate: expenseVoucher.paymentDate,
      postedAt: expenseVoucher.postedAt,
      createdAt: expenseVoucher.createdAt,
      submitterName: user.name,
      submitterEmail: user.email,
    })
    .from(expenseVoucher)
    .innerJoin(user, eq(expenseVoucher.submitterId, user.id))
    .where(and(...conditions))
    .orderBy(expenseVoucher.paymentDate)
    .limit(limit)
    .offset(offset);

  return vouchers.map((v) => ({
    id: v.id,
    voucherNumber: v.voucherNumber,
    amount: v.amount,
    currency: v.currency,
    description: v.description,
    vendorName: v.vendorName,
    status: v.status,
    reconciliationStatus: v.reconciliationStatus,
    postingStatus: v.postingStatus,
    submitterId: v.submitterId,
    submitterName: v.submitterName,
    submitterEmail: v.submitterEmail,
    currentApproverId: v.currentApproverId,
    approverName: null,
    approverEmail: null,
    hasReceipt: false,
    receiptAttachments: v.receiptAttachments,
    disbursedAt: v.paymentDate,
    postedAt: v.postedAt,
    createdAt: v.createdAt,
    daysSinceDisbursement: v.paymentDate
      ? Math.floor((Date.now() - v.paymentDate.getTime()) / (1000 * 60 * 60 * 24))
      : null,
    daysSincePosting: v.postedAt
      ? Math.floor((Date.now() - v.postedAt.getTime()) / (1000 * 60 * 60 * 24))
      : null,
  }));
}

/**
 * Get vouchers that are posted but not reconciled
 */
export async function getVouchersPendingReconciliation(
  userId?: string,
  options: { limit?: number; offset?: number } = {}
): Promise<VoucherForAlert[]> {
  const { limit = 100, offset = 0 } = options;

  const conditions = [
    eq(expenseVoucher.postingStatus, "posted"),
    eq(expenseVoucher.reconciliationStatus, "unreconciled"),
  ];

  if (userId) {
    conditions.push(eq(expenseVoucher.submitterId, userId));
  }

  const vouchers = await database
    .select({
      id: expenseVoucher.id,
      voucherNumber: expenseVoucher.voucherNumber,
      amount: expenseVoucher.amount,
      currency: expenseVoucher.currency,
      description: expenseVoucher.description,
      vendorName: expenseVoucher.vendorName,
      status: expenseVoucher.status,
      reconciliationStatus: expenseVoucher.reconciliationStatus,
      postingStatus: expenseVoucher.postingStatus,
      submitterId: expenseVoucher.submitterId,
      currentApproverId: expenseVoucher.currentApproverId,
      receiptAttachments: expenseVoucher.receiptAttachments,
      paymentDate: expenseVoucher.paymentDate,
      postedAt: expenseVoucher.postedAt,
      createdAt: expenseVoucher.createdAt,
      submitterName: user.name,
      submitterEmail: user.email,
    })
    .from(expenseVoucher)
    .innerJoin(user, eq(expenseVoucher.submitterId, user.id))
    .where(and(...conditions))
    .orderBy(expenseVoucher.postedAt)
    .limit(limit)
    .offset(offset);

  return vouchers.map((v) => ({
    id: v.id,
    voucherNumber: v.voucherNumber,
    amount: v.amount,
    currency: v.currency,
    description: v.description,
    vendorName: v.vendorName,
    status: v.status,
    reconciliationStatus: v.reconciliationStatus,
    postingStatus: v.postingStatus,
    submitterId: v.submitterId,
    submitterName: v.submitterName,
    submitterEmail: v.submitterEmail,
    currentApproverId: v.currentApproverId,
    approverName: null,
    approverEmail: null,
    hasReceipt: !!(v.receiptAttachments && v.receiptAttachments !== "[]"),
    receiptAttachments: v.receiptAttachments,
    disbursedAt: v.paymentDate,
    postedAt: v.postedAt,
    createdAt: v.createdAt,
    daysSinceDisbursement: v.paymentDate
      ? Math.floor((Date.now() - v.paymentDate.getTime()) / (1000 * 60 * 60 * 24))
      : null,
    daysSincePosting: v.postedAt
      ? Math.floor((Date.now() - v.postedAt.getTime()) / (1000 * 60 * 60 * 24))
      : null,
  }));
}

/**
 * Get all vouchers requiring alerts for a user
 */
export async function getVouchersRequiringAlerts(
  userId: string,
  config: VoucherAlertConfig
): Promise<{ voucher: VoucherForAlert; alertType: VoucherAlertType }[]> {
  const results: { voucher: VoucherForAlert; alertType: VoucherAlertType }[] = [];

  // Get vouchers awaiting receipts
  const awaitingReceipts = await getVouchersAwaitingReceipts(userId);
  for (const voucher of awaitingReceipts) {
    if (voucher.daysSinceDisbursement !== null) {
      if (voucher.daysSinceDisbursement >= config.receiptOverdueDays) {
        results.push({ voucher, alertType: "receipt_overdue" });
      } else if (voucher.daysSinceDisbursement >= config.receiptReminderDays) {
        results.push({ voucher, alertType: "receipt_pending" });
      }
    }
  }

  // Get vouchers pending reconciliation
  const pendingReconciliation = await getVouchersPendingReconciliation(userId);
  for (const voucher of pendingReconciliation) {
    if (voucher.daysSincePosting !== null) {
      if (voucher.daysSincePosting >= config.reconciliationOverdueDays) {
        results.push({ voucher, alertType: "reconciliation_overdue" });
      } else if (voucher.daysSincePosting >= config.reconciliationReminderDays) {
        results.push({ voucher, alertType: "reconciliation_pending" });
      }
    }
  }

  return results;
}

// =============================================================================
// Alert Log Functions (using in-memory tracking for now)
// =============================================================================

// In-memory alert tracking (in production, this would use a database table)
const alertSentTracker = new Map<string, Date>();

/**
 * Check if an alert was already sent recently (within 24 hours)
 */
export function wasAlertSentRecently(
  voucherId: string,
  alertType: VoucherAlertType,
  hoursThreshold: number = 24
): boolean {
  const key = `${voucherId}:${alertType}`;
  const lastSent = alertSentTracker.get(key);

  if (!lastSent) return false;

  const hoursSinceLastSent =
    (Date.now() - lastSent.getTime()) / (1000 * 60 * 60);
  return hoursSinceLastSent < hoursThreshold;
}

/**
 * Record that an alert was sent
 */
export function recordAlertSent(
  voucherId: string,
  alertType: VoucherAlertType
): void {
  const key = `${voucherId}:${alertType}`;
  alertSentTracker.set(key, new Date());
}

/**
 * Check if escalation should be triggered
 */
export function shouldEscalate(
  voucherId: string,
  alertType: VoucherAlertType,
  config: VoucherAlertConfig,
  daysPending: number
): { shouldEscalate: boolean; escalationLevel: number } {
  // Escalate if:
  // 1. Escalation is enabled
  // 2. Supervisor is configured
  // 3. Alert is overdue type
  // 4. Has been pending for a significant time

  if (!config.escalationEnabled || !config.supervisorId) {
    return { shouldEscalate: false, escalationLevel: 0 };
  }

  // Only escalate overdue alerts
  if (alertType !== "receipt_overdue" && alertType !== "reconciliation_overdue") {
    return { shouldEscalate: false, escalationLevel: 0 };
  }

  // Escalation thresholds
  const escalationThresholds = {
    receipt_overdue: config.receiptOverdueDays * 2, // Escalate after 2x overdue days
    reconciliation_overdue: config.reconciliationOverdueDays * 1.5, // Escalate after 1.5x overdue days
  };

  const threshold = escalationThresholds[alertType] || 14;

  if (daysPending >= threshold) {
    // Calculate escalation level based on how far past threshold
    const levelMultiplier = Math.floor(daysPending / threshold);
    return {
      shouldEscalate: true,
      escalationLevel: Math.min(levelMultiplier, 3), // Max level 3
    };
  }

  return { shouldEscalate: false, escalationLevel: 0 };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if current time is within quiet hours for a timezone
 */
export function isWithinQuietHours(
  timezone: string,
  quietHoursStart: string | null,
  quietHoursEnd: string | null
): boolean {
  if (!quietHoursStart || !quietHoursEnd) return false;

  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: timezone,
    });
    const currentTime = formatter.format(now);

    const [currentHour, currentMinute] = currentTime.split(":").map(Number);
    const [startHour, startMinute] = quietHoursStart.split(":").map(Number);
    const [endHour, endMinute] = quietHoursEnd.split(":").map(Number);

    const currentMinutes = currentHour * 60 + currentMinute;
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    // Handle overnight quiet hours (e.g., 22:00 - 08:00)
    if (startMinutes > endMinutes) {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }

    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } catch {
    return false;
  }
}

/**
 * Check if today is a working day for the user
 */
export function isWorkingDay(timezone: string, workingDays: string): boolean {
  try {
    const days = JSON.parse(workingDays) as number[];
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      timeZone: timezone,
    });
    const dayName = formatter.format(now);

    const dayMap: Record<string, number> = {
      Sunday: 0,
      Monday: 1,
      Tuesday: 2,
      Wednesday: 3,
      Thursday: 4,
      Friday: 5,
      Saturday: 6,
    };

    const currentDay = dayMap[dayName];
    return days.includes(currentDay);
  } catch {
    return true; // Default to working day if parsing fails
  }
}

/**
 * Get approvers for escalation
 */
export async function getApproversForVoucher(
  voucherId: string
): Promise<{ id: string; name: string; email: string }[]> {
  const voucher = await database
    .select({
      currentApproverId: expenseVoucher.currentApproverId,
      finalApproverId: expenseVoucher.finalApproverId,
    })
    .from(expenseVoucher)
    .where(eq(expenseVoucher.id, voucherId))
    .limit(1);

  if (!voucher.length) return [];

  const approverIds = [
    voucher[0].currentApproverId,
    voucher[0].finalApproverId,
  ].filter((id): id is string => !!id);

  if (approverIds.length === 0) return [];

  const approvers = await database
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
    })
    .from(user)
    .where(sql`${user.id} IN ${approverIds}`);

  return approvers;
}
