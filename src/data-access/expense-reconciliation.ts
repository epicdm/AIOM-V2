import { eq, desc, and, or, ilike, sql, isNull, isNotNull, SQL } from "drizzle-orm";
import { database } from "~/db";
import {
  expenseVoucher,
  expenseRequest,
  user,
  type ExpenseVoucher,
  type ExpenseRequest,
  type ReconciliationStatus,
} from "~/db/schema";

// Type for expense request with requester info
export type ExpenseRequestWithUser = ExpenseRequest & {
  requester: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
};

// Type for expense voucher with submitter info
export type ExpenseVoucherWithUser = ExpenseVoucher & {
  submitter: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
};

// Type for a matched pair (expense request + voucher)
export type ReconciliationMatch = {
  id: string;
  expenseRequest: ExpenseRequestWithUser;
  expenseVoucher: ExpenseVoucherWithUser;
  discrepancies: DiscrepancyInfo[];
  matchConfidence: "high" | "medium" | "low";
  isReconciled: boolean;
  reconciliationDate?: Date;
  reconciliationNotes?: string;
};

// Type for discrepancy information
export type DiscrepancyInfo = {
  field: string;
  fieldLabel: string;
  requestValue: string | number | null;
  voucherValue: string | number | null;
  severity: "critical" | "warning" | "info";
  message: string;
};

// Type for unmatched expense request
export type UnmatchedExpenseRequest = {
  expenseRequest: ExpenseRequestWithUser;
  suggestedVouchers: ExpenseVoucherWithUser[];
};

// Type for unmatched voucher
export type UnmatchedVoucher = {
  expenseVoucher: ExpenseVoucherWithUser;
  suggestedRequests: ExpenseRequestWithUser[];
};

// Filters for reconciliation queries
export interface ReconciliationFilters {
  reconciliationStatus?: ReconciliationStatus;
  hasDiscrepancies?: boolean;
  searchQuery?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Get all expense vouchers that are linked to expense requests (matched)
 * Returns pairs for reconciliation
 */
export async function getMatchedVouchersWithRequests(
  filters: ReconciliationFilters = {}
): Promise<ReconciliationMatch[]> {
  const {
    reconciliationStatus,
    searchQuery,
    dateFrom,
    dateTo,
    limit = 50,
    offset = 0,
  } = filters;

  const conditions: SQL[] = [isNotNull(expenseVoucher.expenseRequestId)];

  if (reconciliationStatus) {
    conditions.push(eq(expenseVoucher.reconciliationStatus, reconciliationStatus));
  }

  if (dateFrom) {
    conditions.push(sql`${expenseVoucher.createdAt} >= ${dateFrom}`);
  }

  if (dateTo) {
    conditions.push(sql`${expenseVoucher.createdAt} <= ${dateTo}`);
  }

  if (searchQuery && searchQuery.trim()) {
    const searchTerm = `%${searchQuery.trim()}%`;
    const searchCondition = or(
      ilike(expenseVoucher.voucherNumber, searchTerm),
      ilike(expenseVoucher.description, searchTerm),
      ilike(expenseVoucher.vendorName ?? "", searchTerm)
    );
    if (searchCondition) {
      conditions.push(searchCondition);
    }
  }

  // Fetch vouchers with their linked expense requests using joins
  const results = await database
    .select({
      voucher: expenseVoucher,
      submitter: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      },
    })
    .from(expenseVoucher)
    .innerJoin(user, eq(expenseVoucher.submitterId, user.id))
    .where(and(...conditions))
    .orderBy(desc(expenseVoucher.createdAt))
    .limit(limit)
    .offset(offset);

  // For each voucher, fetch the linked expense request
  const matches: ReconciliationMatch[] = [];

  for (const result of results) {
    if (!result.voucher.expenseRequestId) continue;

    const requestResult = await database
      .select({
        request: expenseRequest,
        requester: {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        },
      })
      .from(expenseRequest)
      .innerJoin(user, eq(expenseRequest.requesterId, user.id))
      .where(eq(expenseRequest.id, result.voucher.expenseRequestId))
      .limit(1);

    if (requestResult.length === 0) continue;

    const request = {
      ...requestResult[0].request,
      requester: requestResult[0].requester,
    } as ExpenseRequestWithUser;

    const voucher = {
      ...result.voucher,
      submitter: result.submitter,
    } as ExpenseVoucherWithUser;

    const discrepancies = analyzeDiscrepancies(request, voucher);
    const matchConfidence = calculateMatchConfidence(discrepancies);

    matches.push({
      id: `${request.id}-${voucher.id}`,
      expenseRequest: request,
      expenseVoucher: voucher,
      discrepancies,
      matchConfidence,
      isReconciled: voucher.reconciliationStatus === "reconciled",
      reconciliationDate: voucher.reconciliationDate ?? undefined,
      reconciliationNotes: voucher.reconciliationNotes ?? undefined,
    });
  }

  return matches;
}

/**
 * Get expense requests that are not linked to any voucher
 */
export async function getUnmatchedExpenseRequests(
  filters: ReconciliationFilters = {}
): Promise<UnmatchedExpenseRequest[]> {
  const { searchQuery, limit = 50, offset = 0 } = filters;

  // Get all expense request IDs that are linked to vouchers
  const linkedRequestIds = await database
    .select({ id: expenseVoucher.expenseRequestId })
    .from(expenseVoucher)
    .where(isNotNull(expenseVoucher.expenseRequestId));

  const linkedIds = linkedRequestIds
    .map((r) => r.id)
    .filter((id): id is string => id !== null);

  // Build conditions for unmatched requests
  const conditions: SQL[] = [
    or(
      eq(expenseRequest.status, "approved"),
      eq(expenseRequest.status, "disbursed")
    )!,
  ];

  if (linkedIds.length > 0) {
    conditions.push(sql`${expenseRequest.id} NOT IN (${sql.join(linkedIds.map(id => sql`${id}`), sql`, `)})`);
  }

  if (searchQuery && searchQuery.trim()) {
    const searchTerm = `%${searchQuery.trim()}%`;
    const searchCondition = or(
      ilike(expenseRequest.purpose, searchTerm),
      ilike(expenseRequest.description ?? "", searchTerm)
    );
    if (searchCondition) {
      conditions.push(searchCondition);
    }
  }

  // Get requests that are approved/disbursed but not linked
  const requestResults = await database
    .select({
      request: expenseRequest,
      requester: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      },
    })
    .from(expenseRequest)
    .innerJoin(user, eq(expenseRequest.requesterId, user.id))
    .where(and(...conditions))
    .orderBy(desc(expenseRequest.createdAt))
    .limit(limit)
    .offset(offset);

  // For each unmatched request, find suggested vouchers
  const results: UnmatchedExpenseRequest[] = [];

  for (const { request, requester } of requestResults) {
    const requestWithUser = {
      ...request,
      requester,
    } as ExpenseRequestWithUser;

    // Find vouchers that might match this request
    const suggestedVouchers = await findSuggestedVouchersForRequest(request);

    results.push({
      expenseRequest: requestWithUser,
      suggestedVouchers,
    });
  }

  return results;
}

/**
 * Get expense vouchers that are not linked to any expense request
 */
export async function getUnmatchedVouchers(
  filters: ReconciliationFilters = {}
): Promise<UnmatchedVoucher[]> {
  const { reconciliationStatus, searchQuery, limit = 50, offset = 0 } = filters;

  const conditions: SQL[] = [isNull(expenseVoucher.expenseRequestId)];

  if (reconciliationStatus) {
    conditions.push(eq(expenseVoucher.reconciliationStatus, reconciliationStatus));
  }

  if (searchQuery && searchQuery.trim()) {
    const searchTerm = `%${searchQuery.trim()}%`;
    const searchCondition = or(
      ilike(expenseVoucher.voucherNumber, searchTerm),
      ilike(expenseVoucher.description, searchTerm),
      ilike(expenseVoucher.vendorName ?? "", searchTerm)
    );
    if (searchCondition) {
      conditions.push(searchCondition);
    }
  }

  const voucherResults = await database
    .select({
      voucher: expenseVoucher,
      submitter: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      },
    })
    .from(expenseVoucher)
    .innerJoin(user, eq(expenseVoucher.submitterId, user.id))
    .where(and(...conditions))
    .orderBy(desc(expenseVoucher.createdAt))
    .limit(limit)
    .offset(offset);

  // For each unmatched voucher, find suggested requests
  const results: UnmatchedVoucher[] = [];

  for (const { voucher, submitter } of voucherResults) {
    const voucherWithUser = {
      ...voucher,
      submitter,
    } as ExpenseVoucherWithUser;

    const suggestedRequests = await findSuggestedRequestsForVoucher(voucher);

    results.push({
      expenseVoucher: voucherWithUser,
      suggestedRequests,
    });
  }

  return results;
}

/**
 * Link a voucher to an expense request for manual reconciliation
 */
export async function linkVoucherToRequest(
  voucherId: string,
  expenseRequestId: string
): Promise<ExpenseVoucher | null> {
  const [result] = await database
    .update(expenseVoucher)
    .set({
      expenseRequestId,
      updatedAt: new Date(),
    })
    .where(eq(expenseVoucher.id, voucherId))
    .returning();

  return result || null;
}

/**
 * Unlink a voucher from its expense request
 */
export async function unlinkVoucherFromRequest(
  voucherId: string
): Promise<ExpenseVoucher | null> {
  const [result] = await database
    .update(expenseVoucher)
    .set({
      expenseRequestId: null,
      updatedAt: new Date(),
    })
    .where(eq(expenseVoucher.id, voucherId))
    .returning();

  return result || null;
}

/**
 * Mark a matched pair as reconciled
 */
export async function reconcileMatch(
  voucherId: string,
  reconciledById: string,
  reference: string,
  notes?: string
): Promise<ExpenseVoucher | null> {
  const [result] = await database
    .update(expenseVoucher)
    .set({
      reconciliationStatus: "reconciled",
      reconciliationDate: new Date(),
      reconciledById,
      reconciliationReference: reference,
      reconciliationNotes: notes,
      updatedAt: new Date(),
    })
    .where(eq(expenseVoucher.id, voucherId))
    .returning();

  return result || null;
}

/**
 * Mark a matched pair as having discrepancies
 */
export async function markWithDiscrepancies(
  voucherId: string,
  notes: string
): Promise<ExpenseVoucher | null> {
  const [result] = await database
    .update(expenseVoucher)
    .set({
      reconciliationStatus: "discrepancy",
      reconciliationNotes: notes,
      updatedAt: new Date(),
    })
    .where(eq(expenseVoucher.id, voucherId))
    .returning();

  return result || null;
}

/**
 * Get reconciliation statistics
 */
export async function getReconciliationStats(): Promise<{
  totalMatched: number;
  reconciled: number;
  withDiscrepancies: number;
  unreconciled: number;
  unmatchedRequests: number;
  unmatchedVouchers: number;
}> {
  // Count matched vouchers by status
  const matchedStats = await database
    .select({
      status: expenseVoucher.reconciliationStatus,
      count: sql<number>`count(*)::int`,
    })
    .from(expenseVoucher)
    .where(isNotNull(expenseVoucher.expenseRequestId))
    .groupBy(expenseVoucher.reconciliationStatus);

  // Count unmatched vouchers
  const [unmatchedVouchersResult] = await database
    .select({ count: sql<number>`count(*)::int` })
    .from(expenseVoucher)
    .where(isNull(expenseVoucher.expenseRequestId));

  // Count linked request IDs
  const linkedRequestIds = await database
    .select({ id: expenseVoucher.expenseRequestId })
    .from(expenseVoucher)
    .where(isNotNull(expenseVoucher.expenseRequestId));

  const linkedIds = linkedRequestIds
    .map((r) => r.id)
    .filter((id): id is string => id !== null);

  // Count unmatched requests (approved/disbursed but not linked)
  let unmatchedRequestsCount = 0;
  if (linkedIds.length > 0) {
    const [unmatchedRequestsResult] = await database
      .select({ count: sql<number>`count(*)::int` })
      .from(expenseRequest)
      .where(
        and(
          or(
            eq(expenseRequest.status, "approved"),
            eq(expenseRequest.status, "disbursed")
          ),
          sql`${expenseRequest.id} NOT IN (${sql.join(linkedIds.map(id => sql`${id}`), sql`, `)})`
        )
      );
    unmatchedRequestsCount = unmatchedRequestsResult?.count || 0;
  } else {
    const [unmatchedRequestsResult] = await database
      .select({ count: sql<number>`count(*)::int` })
      .from(expenseRequest)
      .where(
        or(
          eq(expenseRequest.status, "approved"),
          eq(expenseRequest.status, "disbursed")
        )
      );
    unmatchedRequestsCount = unmatchedRequestsResult?.count || 0;
  }

  const statsMap: Record<string, number> = {};
  matchedStats.forEach((s) => {
    statsMap[s.status] = s.count;
  });

  const totalMatched = Object.values(statsMap).reduce((a, b) => a + b, 0);

  return {
    totalMatched,
    reconciled: statsMap["reconciled"] || 0,
    withDiscrepancies: statsMap["discrepancy"] || 0,
    unreconciled: statsMap["unreconciled"] || 0,
    unmatchedRequests: unmatchedRequestsCount,
    unmatchedVouchers: unmatchedVouchersResult?.count || 0,
  };
}

// =============================================================================
// Helper functions
// =============================================================================

/**
 * Analyze discrepancies between an expense request and voucher
 */
function analyzeDiscrepancies(
  request: ExpenseRequest,
  voucher: ExpenseVoucher
): DiscrepancyInfo[] {
  const discrepancies: DiscrepancyInfo[] = [];

  // Compare amounts
  const requestAmount = parseFloat(request.amount);
  const voucherAmount = parseFloat(voucher.amount);

  if (requestAmount !== voucherAmount) {
    const difference = Math.abs(requestAmount - voucherAmount);
    const percentDiff = (difference / requestAmount) * 100;

    discrepancies.push({
      field: "amount",
      fieldLabel: "Amount",
      requestValue: request.amount,
      voucherValue: voucher.amount,
      severity: percentDiff > 10 ? "critical" : percentDiff > 5 ? "warning" : "info",
      message: `Amount mismatch: Request ${request.currency} ${request.amount} vs Voucher ${voucher.currency} ${voucher.amount} (${percentDiff.toFixed(1)}% difference)`,
    });
  }

  // Compare currency
  if (request.currency !== voucher.currency) {
    discrepancies.push({
      field: "currency",
      fieldLabel: "Currency",
      requestValue: request.currency,
      voucherValue: voucher.currency,
      severity: "critical",
      message: `Currency mismatch: Request ${request.currency} vs Voucher ${voucher.currency}`,
    });
  }

  // Compare requester vs submitter (check if same user submitted both)
  if (request.requesterId !== voucher.submitterId) {
    discrepancies.push({
      field: "submitter",
      fieldLabel: "Submitted By",
      requestValue: request.requesterId,
      voucherValue: voucher.submitterId,
      severity: "info",
      message: "Request and voucher were submitted by different users",
    });
  }

  return discrepancies;
}

/**
 * Calculate match confidence based on discrepancies
 */
function calculateMatchConfidence(
  discrepancies: DiscrepancyInfo[]
): "high" | "medium" | "low" {
  if (discrepancies.length === 0) {
    return "high";
  }

  const hasCritical = discrepancies.some((d) => d.severity === "critical");
  const hasWarning = discrepancies.some((d) => d.severity === "warning");

  if (hasCritical) {
    return "low";
  }

  if (hasWarning) {
    return "medium";
  }

  return "high";
}

/**
 * Find suggested vouchers for an unmatched expense request
 */
async function findSuggestedVouchersForRequest(
  request: ExpenseRequest
): Promise<ExpenseVoucherWithUser[]> {
  // Find vouchers with similar amount (within 10%)
  const requestAmount = parseFloat(request.amount);
  const minAmount = requestAmount * 0.9;
  const maxAmount = requestAmount * 1.1;

  const results = await database
    .select({
      voucher: expenseVoucher,
      submitter: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      },
    })
    .from(expenseVoucher)
    .innerJoin(user, eq(expenseVoucher.submitterId, user.id))
    .where(
      and(
        isNull(expenseVoucher.expenseRequestId),
        eq(expenseVoucher.currency, request.currency),
        sql`CAST(${expenseVoucher.amount} AS DECIMAL) BETWEEN ${minAmount} AND ${maxAmount}`
      )
    )
    .orderBy(desc(expenseVoucher.createdAt))
    .limit(5);

  return results.map(({ voucher, submitter }) => ({
    ...voucher,
    submitter,
  })) as ExpenseVoucherWithUser[];
}

/**
 * Find suggested requests for an unmatched voucher
 */
async function findSuggestedRequestsForVoucher(
  voucher: ExpenseVoucher
): Promise<ExpenseRequestWithUser[]> {
  // Find requests with similar amount (within 10%)
  const voucherAmount = parseFloat(voucher.amount);
  const minAmount = voucherAmount * 0.9;
  const maxAmount = voucherAmount * 1.1;

  // Get all expense request IDs that are linked to vouchers
  const linkedRequestIds = await database
    .select({ id: expenseVoucher.expenseRequestId })
    .from(expenseVoucher)
    .where(isNotNull(expenseVoucher.expenseRequestId));

  const linkedIds = linkedRequestIds
    .map((r) => r.id)
    .filter((id): id is string => id !== null);

  const conditions: SQL[] = [
    or(
      eq(expenseRequest.status, "approved"),
      eq(expenseRequest.status, "disbursed")
    )!,
    eq(expenseRequest.currency, voucher.currency),
    sql`CAST(${expenseRequest.amount} AS DECIMAL) BETWEEN ${minAmount} AND ${maxAmount}`,
  ];

  if (linkedIds.length > 0) {
    conditions.push(sql`${expenseRequest.id} NOT IN (${sql.join(linkedIds.map(id => sql`${id}`), sql`, `)})`);
  }

  const results = await database
    .select({
      request: expenseRequest,
      requester: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      },
    })
    .from(expenseRequest)
    .innerJoin(user, eq(expenseRequest.requesterId, user.id))
    .where(and(...conditions))
    .orderBy(desc(expenseRequest.createdAt))
    .limit(5);

  return results.map(({ request, requester }) => ({
    ...request,
    requester,
  })) as ExpenseRequestWithUser[];
}
