/**
 * Expense Compliance Data Access Layer
 *
 * Provides database queries for compliance monitoring:
 * - Policy violations detection
 * - Approval workflow health
 * - Documentation completeness
 * - Suspicious pattern detection
 */

import { eq, and, or, isNull, sql, gte, lte, desc, count } from "drizzle-orm";
import { database } from "~/db";
import {
  user,
  expenseRequest,
  expenseVoucher,
  expenseVoucherApprovalHistory,
} from "~/db/schema";

// =============================================================================
// Types
// =============================================================================

export interface PolicyViolationMetrics {
  highAmountExpenses: {
    id: string;
    amount: number;
    purpose: string;
    requesterId: string;
    requesterName: string;
    createdAt: Date;
  }[];
  potentialDuplicates: {
    expenseId1: string;
    expenseId2: string;
    amount: number;
    purpose: string;
    requesterId: string;
    daysBetween: number;
  }[];
  totalPolicyViolations: number;
}

export interface ApprovalWorkflowMetrics {
  pendingApprovals: {
    id: string;
    voucherNumber: string;
    amount: string;
    daysPending: number;
    currentApproverId: string | null;
    approverName: string | null;
    submitterId: string;
    submitterName: string;
  }[];
  approverBottlenecks: {
    approverId: string;
    approverName: string;
    pendingCount: number;
    oldestPendingDays: number;
  }[];
  averageApprovalTimeDays: number | null;
  approvalDelayCount: number;
}

export interface DocumentationMetrics {
  missingReceipts: {
    id: string;
    voucherNumber: string;
    amount: string;
    daysSinceDisbursement: number;
    submitterId: string;
    submitterName: string;
  }[];
  missingDescriptions: {
    id: string;
    voucherNumber: string;
    amount: string;
    submitterId: string;
  }[];
  incompleteGLMapping: {
    id: string;
    voucherNumber: string;
    amount: string;
    missingFields: string[];
  }[];
  documentationCompleteness: number; // Percentage
}

export interface SuspiciousPatternMetrics {
  roundAmountExpenses: {
    userId: string;
    userName: string;
    roundAmountCount: number;
    totalExpenseCount: number;
    percentage: number;
  }[];
  frequentSubmitters: {
    userId: string;
    userName: string;
    date: string;
    expenseCount: number;
  }[];
  potentialSplitTransactions: {
    userId: string;
    userName: string;
    transactions: { id: string; amount: number; createdAt: Date }[];
    totalAmount: number;
  }[];
  weekendExpenses: {
    userId: string;
    userName: string;
    weekendExpenseCount: number;
  }[];
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if current time is within quiet hours
 */
export function isWithinQuietHours(
  timezone: string,
  startTime: string,
  endTime: string
): boolean {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const currentTime = formatter.format(now);

    const [currentHour, currentMinute] = currentTime.split(":").map(Number);
    const [startHour, startMinute] = startTime.split(":").map(Number);
    const [endHour, endMinute] = endTime.split(":").map(Number);

    const current = currentHour * 60 + currentMinute;
    const start = startHour * 60 + startMinute;
    const end = endHour * 60 + endMinute;

    if (start <= end) {
      // Same day range (e.g., 09:00 - 17:00)
      return current >= start && current < end;
    } else {
      // Overnight range (e.g., 22:00 - 08:00)
      return current >= start || current < end;
    }
  } catch (error) {
    console.error("Error checking quiet hours:", error);
    return false;
  }
}

/**
 * Check if today is a working day
 */
export function isWorkingDay(timezone: string, workingDays: number[]): boolean {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
    });
    const dayName = formatter.format(now);

    // Map day names to numbers (0 = Sunday, 6 = Saturday)
    const dayMap: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };

    const currentDay = dayMap[dayName] ?? 0;
    return workingDays.includes(currentDay);
  } catch (error) {
    console.error("Error checking working day:", error);
    return true; // Default to working day
  }
}

// =============================================================================
// Policy Violation Queries
// =============================================================================

/**
 * Get policy violation metrics
 */
export async function getPolicyViolationMetrics(
  maxAmount: number,
  duplicateWindowDays: number,
  duplicateAmountTolerance: number
): Promise<PolicyViolationMetrics> {
  const now = new Date();
  const duplicateWindowStart = new Date(now);
  duplicateWindowStart.setDate(duplicateWindowStart.getDate() - duplicateWindowDays);

  // Get high amount expenses
  const highAmountExpenses = await database
    .select({
      id: expenseRequest.id,
      amount: expenseRequest.amount,
      purpose: expenseRequest.purpose,
      requesterId: expenseRequest.requesterId,
      requesterName: user.name,
      createdAt: expenseRequest.createdAt,
    })
    .from(expenseRequest)
    .innerJoin(user, eq(expenseRequest.requesterId, user.id))
    .where(
      and(
        sql`CAST(${expenseRequest.amount} AS DECIMAL) > ${maxAmount}`,
        eq(expenseRequest.status, "pending")
      )
    )
    .orderBy(desc(sql`CAST(${expenseRequest.amount} AS DECIMAL)`))
    .limit(50);

  // Get recent expenses for duplicate detection
  const recentExpenses = await database
    .select({
      id: expenseRequest.id,
      amount: expenseRequest.amount,
      purpose: expenseRequest.purpose,
      requesterId: expenseRequest.requesterId,
      createdAt: expenseRequest.createdAt,
    })
    .from(expenseRequest)
    .where(gte(expenseRequest.createdAt, duplicateWindowStart))
    .orderBy(desc(expenseRequest.createdAt));

  // Find potential duplicates (same user, similar amount, within window)
  const potentialDuplicates: PolicyViolationMetrics["potentialDuplicates"] = [];

  for (let i = 0; i < recentExpenses.length; i++) {
    for (let j = i + 1; j < recentExpenses.length; j++) {
      const exp1 = recentExpenses[i];
      const exp2 = recentExpenses[j];

      if (exp1.requesterId !== exp2.requesterId) continue;

      const amount1 = parseFloat(exp1.amount || "0");
      const amount2 = parseFloat(exp2.amount || "0");
      const percentDiff = Math.abs(amount1 - amount2) / Math.max(amount1, amount2) * 100;

      if (percentDiff <= duplicateAmountTolerance) {
        const daysBetween = Math.floor(
          (exp1.createdAt.getTime() - exp2.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        );

        potentialDuplicates.push({
          expenseId1: exp1.id,
          expenseId2: exp2.id,
          amount: amount1,
          purpose: exp1.purpose,
          requesterId: exp1.requesterId,
          daysBetween: Math.abs(daysBetween),
        });
      }
    }
  }

  return {
    highAmountExpenses: highAmountExpenses.map((e) => ({
      ...e,
      amount: parseFloat(e.amount || "0"),
    })),
    potentialDuplicates: potentialDuplicates.slice(0, 20), // Limit results
    totalPolicyViolations: highAmountExpenses.length + potentialDuplicates.length,
  };
}

// =============================================================================
// Approval Workflow Queries
// =============================================================================

/**
 * Get approval workflow metrics
 */
export async function getApprovalWorkflowMetrics(
  warningDays: number,
  criticalDays: number,
  bottleneckCount: number
): Promise<ApprovalWorkflowMetrics> {
  const now = new Date();

  // Get vouchers pending approval
  const pendingVouchers = await database
    .select({
      id: expenseVoucher.id,
      voucherNumber: expenseVoucher.voucherNumber,
      amount: expenseVoucher.amount,
      currentApproverId: expenseVoucher.currentApproverId,
      submitterId: expenseVoucher.submitterId,
      submittedAt: expenseVoucher.submittedAt,
      createdAt: expenseVoucher.createdAt,
    })
    .from(expenseVoucher)
    .where(eq(expenseVoucher.status, "pending_approval"));

  // Get user names for approvers and submitters
  const userIds = [
    ...new Set([
      ...pendingVouchers.map((v) => v.currentApproverId).filter(Boolean),
      ...pendingVouchers.map((v) => v.submitterId),
    ]),
  ] as string[];

  const users = userIds.length > 0
    ? await database
        .select({ id: user.id, name: user.name })
        .from(user)
        .where(sql`${user.id} IN (${sql.join(userIds.map(id => sql`${id}`), sql`, `)})`)
    : [];

  const userNameMap = new Map(users.map((u) => [u.id, u.name]));

  const pendingApprovals = pendingVouchers.map((v) => {
    const submittedDate = v.submittedAt || v.createdAt;
    const daysPending = Math.floor(
      (now.getTime() - submittedDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    return {
      id: v.id,
      voucherNumber: v.voucherNumber,
      amount: v.amount,
      daysPending,
      currentApproverId: v.currentApproverId,
      approverName: v.currentApproverId ? userNameMap.get(v.currentApproverId) || null : null,
      submitterId: v.submitterId,
      submitterName: userNameMap.get(v.submitterId) || "Unknown",
    };
  });

  // Calculate approver bottlenecks
  const approverCounts = new Map<string, { count: number; oldestDays: number }>();

  for (const approval of pendingApprovals) {
    if (approval.currentApproverId) {
      const current = approverCounts.get(approval.currentApproverId) || { count: 0, oldestDays: 0 };
      approverCounts.set(approval.currentApproverId, {
        count: current.count + 1,
        oldestDays: Math.max(current.oldestDays, approval.daysPending),
      });
    }
  }

  const approverBottlenecks = Array.from(approverCounts.entries())
    .filter(([_, data]) => data.count >= bottleneckCount)
    .map(([approverId, data]) => ({
      approverId,
      approverName: userNameMap.get(approverId) || "Unknown",
      pendingCount: data.count,
      oldestPendingDays: data.oldestDays,
    }))
    .sort((a, b) => b.pendingCount - a.pendingCount);

  // Calculate average approval time
  const approvedVouchers = await database
    .select({
      submittedAt: expenseVoucher.submittedAt,
      approvedAt: expenseVoucher.approvedAt,
      createdAt: expenseVoucher.createdAt,
    })
    .from(expenseVoucher)
    .where(
      and(
        eq(expenseVoucher.status, "approved"),
        sql`${expenseVoucher.approvedAt} IS NOT NULL`
      )
    )
    .limit(100);

  const approvalTimes = approvedVouchers
    .filter((v) => v.approvedAt && (v.submittedAt || v.createdAt))
    .map((v) => {
      const startDate = v.submittedAt || v.createdAt;
      return (v.approvedAt!.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    });

  const averageApprovalTimeDays =
    approvalTimes.length > 0
      ? approvalTimes.reduce((sum, t) => sum + t, 0) / approvalTimes.length
      : null;

  // Count approval delays
  const approvalDelayCount = pendingApprovals.filter(
    (a) => a.daysPending >= warningDays
  ).length;

  return {
    pendingApprovals: pendingApprovals.sort((a, b) => b.daysPending - a.daysPending),
    approverBottlenecks,
    averageApprovalTimeDays,
    approvalDelayCount,
  };
}

// =============================================================================
// Documentation Queries
// =============================================================================

/**
 * Get documentation completeness metrics
 */
export async function getDocumentationMetrics(
  receiptRequiredAboveAmount: number,
  missingReceiptWarningDays: number
): Promise<DocumentationMetrics> {
  const now = new Date();
  const warningDate = new Date(now);
  warningDate.setDate(warningDate.getDate() - missingReceiptWarningDays);

  // Get vouchers missing receipts (disbursed but no receipt uploaded)
  const vouchersMissingReceipts = await database
    .select({
      id: expenseVoucher.id,
      voucherNumber: expenseVoucher.voucherNumber,
      amount: expenseVoucher.amount,
      submitterId: expenseVoucher.submitterId,
      submitterName: user.name,
      approvedAt: expenseVoucher.approvedAt,
      createdAt: expenseVoucher.createdAt,
    })
    .from(expenseVoucher)
    .innerJoin(user, eq(expenseVoucher.submitterId, user.id))
    .where(
      and(
        or(
          eq(expenseVoucher.status, "approved"),
          eq(expenseVoucher.status, "posted")
        ),
        sql`CAST(${expenseVoucher.amount} AS DECIMAL) > ${receiptRequiredAboveAmount}`,
        or(
          isNull(expenseVoucher.receiptAttachments),
          eq(expenseVoucher.receiptAttachments, ""),
          eq(expenseVoucher.receiptAttachments, "[]")
        )
      )
    );

  const missingReceipts = vouchersMissingReceipts.map((v) => {
    const approvalDate = v.approvedAt || v.createdAt;
    const daysSinceDisbursement = Math.floor(
      (now.getTime() - approvalDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    return {
      id: v.id,
      voucherNumber: v.voucherNumber,
      amount: v.amount,
      daysSinceDisbursement,
      submitterId: v.submitterId,
      submitterName: v.submitterName,
    };
  });

  // Get vouchers with missing or empty descriptions
  const vouchersMissingDescription = await database
    .select({
      id: expenseVoucher.id,
      voucherNumber: expenseVoucher.voucherNumber,
      amount: expenseVoucher.amount,
      submitterId: expenseVoucher.submitterId,
    })
    .from(expenseVoucher)
    .where(
      and(
        or(
          eq(expenseVoucher.status, "pending_approval"),
          eq(expenseVoucher.status, "draft")
        ),
        or(
          isNull(expenseVoucher.description),
          eq(expenseVoucher.description, ""),
          sql`LENGTH(TRIM(${expenseVoucher.description})) < 10`
        )
      )
    )
    .limit(50);

  // Get vouchers with incomplete GL mapping
  const vouchersIncompleteGL = await database
    .select({
      id: expenseVoucher.id,
      voucherNumber: expenseVoucher.voucherNumber,
      amount: expenseVoucher.amount,
      glAccountCode: expenseVoucher.glAccountCode,
      costCenter: expenseVoucher.costCenter,
      department: expenseVoucher.department,
    })
    .from(expenseVoucher)
    .where(
      and(
        or(
          eq(expenseVoucher.status, "pending_approval"),
          eq(expenseVoucher.status, "approved")
        ),
        or(
          isNull(expenseVoucher.glAccountCode),
          eq(expenseVoucher.glAccountCode, "")
        )
      )
    )
    .limit(50);

  const incompleteGLMapping = vouchersIncompleteGL.map((v) => {
    const missingFields: string[] = [];
    if (!v.glAccountCode) missingFields.push("GL Account Code");
    if (!v.costCenter) missingFields.push("Cost Center");
    if (!v.department) missingFields.push("Department");
    return {
      id: v.id,
      voucherNumber: v.voucherNumber,
      amount: v.amount,
      missingFields,
    };
  });

  // Calculate documentation completeness
  const totalVouchers = await database
    .select({ count: count() })
    .from(expenseVoucher)
    .where(
      or(
        eq(expenseVoucher.status, "pending_approval"),
        eq(expenseVoucher.status, "approved"),
        eq(expenseVoucher.status, "posted")
      )
    );

  const totalCount = totalVouchers[0]?.count || 0;
  const incompleteCount =
    missingReceipts.length +
    vouchersMissingDescription.length +
    incompleteGLMapping.length;

  const documentationCompleteness =
    totalCount > 0
      ? Math.max(0, ((totalCount - incompleteCount) / totalCount) * 100)
      : 100;

  return {
    missingReceipts: missingReceipts.sort(
      (a, b) => b.daysSinceDisbursement - a.daysSinceDisbursement
    ),
    missingDescriptions: vouchersMissingDescription,
    incompleteGLMapping,
    documentationCompleteness,
  };
}

// =============================================================================
// Suspicious Pattern Queries
// =============================================================================

/**
 * Get suspicious pattern metrics
 */
export async function getSuspiciousPatternMetrics(
  roundAmountPercentage: number,
  frequentExpenseThreshold: number,
  splitTransactionWindowHours: number,
  splitTransactionAmountThreshold: number,
  weekendExpenseThreshold: number
): Promise<SuspiciousPatternMetrics> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const oneWeekAgo = new Date(now);
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  // Get recent expenses with user info
  const recentExpenses = await database
    .select({
      id: expenseRequest.id,
      amount: expenseRequest.amount,
      requesterId: expenseRequest.requesterId,
      requesterName: user.name,
      createdAt: expenseRequest.createdAt,
    })
    .from(expenseRequest)
    .innerJoin(user, eq(expenseRequest.requesterId, user.id))
    .where(gte(expenseRequest.createdAt, thirtyDaysAgo))
    .orderBy(desc(expenseRequest.createdAt));

  // Detect round amount patterns per user
  const userExpenses = new Map<
    string,
    { name: string; total: number; round: number }
  >();

  for (const exp of recentExpenses) {
    const amount = parseFloat(exp.amount || "0");
    const isRound = amount > 0 && amount % 10 === 0;
    const current = userExpenses.get(exp.requesterId) || {
      name: exp.requesterName,
      total: 0,
      round: 0,
    };
    userExpenses.set(exp.requesterId, {
      name: current.name,
      total: current.total + 1,
      round: isRound ? current.round + 1 : current.round,
    });
  }

  const roundAmountExpenses = Array.from(userExpenses.entries())
    .map(([userId, data]) => ({
      userId,
      userName: data.name,
      roundAmountCount: data.round,
      totalExpenseCount: data.total,
      percentage: data.total > 0 ? (data.round / data.total) * 100 : 0,
    }))
    .filter((u) => u.percentage >= roundAmountPercentage && u.totalExpenseCount >= 5);

  // Detect frequent submitters (multiple expenses in same day)
  const expensesByUserDate = new Map<string, Map<string, number>>();
  const userNames = new Map<string, string>();

  for (const exp of recentExpenses) {
    const dateKey = exp.createdAt.toISOString().split("T")[0];
    userNames.set(exp.requesterId, exp.requesterName);

    if (!expensesByUserDate.has(exp.requesterId)) {
      expensesByUserDate.set(exp.requesterId, new Map());
    }
    const userDates = expensesByUserDate.get(exp.requesterId)!;
    userDates.set(dateKey, (userDates.get(dateKey) || 0) + 1);
  }

  const frequentSubmitters: SuspiciousPatternMetrics["frequentSubmitters"] = [];

  for (const [userId, dates] of expensesByUserDate) {
    for (const [date, count] of dates) {
      if (count >= frequentExpenseThreshold) {
        frequentSubmitters.push({
          userId,
          userName: userNames.get(userId) || "Unknown",
          date,
          expenseCount: count,
        });
      }
    }
  }

  // Detect potential split transactions
  const splitWindowMs = splitTransactionWindowHours * 60 * 60 * 1000;
  const potentialSplitTransactions: SuspiciousPatternMetrics["potentialSplitTransactions"] =
    [];

  // Group expenses by user
  const expensesByUser = new Map<
    string,
    { id: string; amount: number; createdAt: Date }[]
  >();

  for (const exp of recentExpenses) {
    if (!expensesByUser.has(exp.requesterId)) {
      expensesByUser.set(exp.requesterId, []);
    }
    expensesByUser.get(exp.requesterId)!.push({
      id: exp.id,
      amount: parseFloat(exp.amount || "0"),
      createdAt: exp.createdAt,
    });
  }

  for (const [userId, expenses] of expensesByUser) {
    // Sort by time
    const sorted = expenses.sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );

    // Find clusters of expenses within window
    let i = 0;
    while (i < sorted.length) {
      const cluster: typeof sorted = [sorted[i]];
      let j = i + 1;

      while (
        j < sorted.length &&
        sorted[j].createdAt.getTime() - sorted[i].createdAt.getTime() <=
          splitWindowMs
      ) {
        cluster.push(sorted[j]);
        j++;
      }

      if (cluster.length >= 3) {
        const totalAmount = cluster.reduce((sum, e) => sum + e.amount, 0);
        if (totalAmount >= splitTransactionAmountThreshold) {
          potentialSplitTransactions.push({
            userId,
            userName: userNames.get(userId) || "Unknown",
            transactions: cluster,
            totalAmount,
          });
        }
      }

      i = j;
    }
  }

  // Detect weekend expenses
  const weekendExpensesByUser = new Map<string, number>();

  for (const exp of recentExpenses) {
    if (exp.createdAt < oneWeekAgo) continue;

    const dayOfWeek = exp.createdAt.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      // Sunday or Saturday
      weekendExpensesByUser.set(
        exp.requesterId,
        (weekendExpensesByUser.get(exp.requesterId) || 0) + 1
      );
    }
  }

  const weekendExpenses = Array.from(weekendExpensesByUser.entries())
    .filter(([_, count]) => count >= weekendExpenseThreshold)
    .map(([userId, count]) => ({
      userId,
      userName: userNames.get(userId) || "Unknown",
      weekendExpenseCount: count,
    }));

  return {
    roundAmountExpenses,
    frequentSubmitters: frequentSubmitters.slice(0, 20),
    potentialSplitTransactions: potentialSplitTransactions.slice(0, 10),
    weekendExpenses,
  };
}

// =============================================================================
// Summary Queries
// =============================================================================

/**
 * Count total compliance issues for stats
 */
export async function getComplianceIssueCounts(): Promise<{
  policyViolations: number;
  approvalDelays: number;
  documentationIssues: number;
  suspiciousPatterns: number;
}> {
  // Quick counts for dashboard
  const pendingApprovals = await database
    .select({ count: count() })
    .from(expenseVoucher)
    .where(eq(expenseVoucher.status, "pending_approval"));

  const missingReceipts = await database
    .select({ count: count() })
    .from(expenseVoucher)
    .where(
      and(
        or(
          eq(expenseVoucher.status, "approved"),
          eq(expenseVoucher.status, "posted")
        ),
        or(
          isNull(expenseVoucher.receiptAttachments),
          eq(expenseVoucher.receiptAttachments, ""),
          eq(expenseVoucher.receiptAttachments, "[]")
        )
      )
    );

  return {
    policyViolations: 0, // Would need more complex query
    approvalDelays: pendingApprovals[0]?.count || 0,
    documentationIssues: missingReceipts[0]?.count || 0,
    suspiciousPatterns: 0, // Would need more complex query
  };
}
