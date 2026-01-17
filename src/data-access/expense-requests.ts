import { eq, desc, count, and, or, ilike } from "drizzle-orm";
import { database } from "~/db";
import {
  expenseRequest,
  user,
  type ExpenseRequest,
  type CreateExpenseRequestData,
  type UpdateExpenseRequestData,
  type ExpenseRequestStatus,
} from "~/db/schema";

// Type for expense request with requester and approver user info
export type ExpenseRequestWithUsers = ExpenseRequest & {
  requester: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
  approver: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  } | null;
};

export interface ExpenseRequestFilters {
  status?: ExpenseRequestStatus;
  requesterId?: string;
  approverId?: string;
  searchQuery?: string;
  limit?: number;
  offset?: number;
}

/**
 * Create a new expense request
 */
export async function createExpenseRequest(
  data: CreateExpenseRequestData
): Promise<ExpenseRequest> {
  const [result] = await database
    .insert(expenseRequest)
    .values({
      ...data,
      updatedAt: new Date(),
    })
    .returning();

  return result;
}

/**
 * Find an expense request by ID
 */
export async function findExpenseRequestById(
  id: string
): Promise<ExpenseRequest | null> {
  const [result] = await database
    .select()
    .from(expenseRequest)
    .where(eq(expenseRequest.id, id))
    .limit(1);

  return result || null;
}

/**
 * Find an expense request by ID with requester and approver user info
 */
export async function findExpenseRequestByIdWithUsers(
  id: string
): Promise<ExpenseRequestWithUsers | null> {
  const result = await database.query.expenseRequest.findFirst({
    where: eq(expenseRequest.id, id),
    with: {
      requester: {
        columns: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      approver: {
        columns: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });

  return result as ExpenseRequestWithUsers | null;
}

/**
 * Update an expense request
 */
export async function updateExpenseRequest(
  id: string,
  data: UpdateExpenseRequestData
): Promise<ExpenseRequest | null> {
  const [result] = await database
    .update(expenseRequest)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(expenseRequest.id, id))
    .returning();

  return result || null;
}

/**
 * Delete an expense request
 */
export async function deleteExpenseRequest(id: string): Promise<boolean> {
  const result = await database
    .delete(expenseRequest)
    .where(eq(expenseRequest.id, id))
    .returning();

  return result.length > 0;
}

/**
 * Get all expense requests with optional filters
 */
export async function getAllExpenseRequests(
  filters: ExpenseRequestFilters = {}
): Promise<ExpenseRequest[]> {
  const { status, requesterId, approverId, searchQuery, limit = 50, offset = 0 } = filters;

  const conditions = [];

  if (status) {
    conditions.push(eq(expenseRequest.status, status));
  }

  if (requesterId) {
    conditions.push(eq(expenseRequest.requesterId, requesterId));
  }

  if (approverId) {
    conditions.push(eq(expenseRequest.approverId, approverId));
  }

  if (searchQuery && searchQuery.trim()) {
    const searchTerm = `%${searchQuery.trim()}%`;
    conditions.push(
      or(
        ilike(expenseRequest.purpose, searchTerm),
        ilike(expenseRequest.description ?? "", searchTerm)
      )
    );
  }

  const query = database
    .select()
    .from(expenseRequest)
    .orderBy(desc(expenseRequest.createdAt))
    .limit(limit)
    .offset(offset);

  if (conditions.length > 0) {
    return await query.where(and(...conditions));
  }

  return await query;
}

/**
 * Get expense requests count with optional filters
 */
export async function getExpenseRequestsCount(
  filters: ExpenseRequestFilters = {}
): Promise<number> {
  const { status, requesterId, approverId, searchQuery } = filters;

  const conditions = [];

  if (status) {
    conditions.push(eq(expenseRequest.status, status));
  }

  if (requesterId) {
    conditions.push(eq(expenseRequest.requesterId, requesterId));
  }

  if (approverId) {
    conditions.push(eq(expenseRequest.approverId, approverId));
  }

  if (searchQuery && searchQuery.trim()) {
    const searchTerm = `%${searchQuery.trim()}%`;
    conditions.push(
      or(
        ilike(expenseRequest.purpose, searchTerm),
        ilike(expenseRequest.description ?? "", searchTerm)
      )
    );
  }

  const query = database.select({ count: count() }).from(expenseRequest);

  if (conditions.length > 0) {
    const results = await query.where(and(...conditions));
    return results[0]?.count || 0;
  }

  const results = await query;
  return results[0]?.count || 0;
}

/**
 * Approve an expense request
 */
export async function approveExpenseRequest(
  id: string,
  approverId: string
): Promise<ExpenseRequest | null> {
  return await updateExpenseRequest(id, {
    status: "approved",
    approverId,
    approvedAt: new Date(),
  });
}

/**
 * Reject an expense request
 */
export async function rejectExpenseRequest(
  id: string,
  approverId: string,
  rejectionReason?: string
): Promise<ExpenseRequest | null> {
  return await updateExpenseRequest(id, {
    status: "rejected",
    approverId,
    rejectedAt: new Date(),
    rejectionReason,
  });
}

/**
 * Mark an expense request as disbursed
 */
export async function disburseExpenseRequest(
  id: string
): Promise<ExpenseRequest | null> {
  return await updateExpenseRequest(id, {
    status: "disbursed",
    disbursedAt: new Date(),
  });
}

/**
 * Get expense requests for a specific user (as requester)
 */
export async function getExpenseRequestsByRequester(
  requesterId: string,
  filters: Omit<ExpenseRequestFilters, "requesterId"> = {}
): Promise<ExpenseRequest[]> {
  return await getAllExpenseRequests({ ...filters, requesterId });
}

/**
 * Get expense requests assigned to a specific approver
 */
export async function getExpenseRequestsByApprover(
  approverId: string,
  filters: Omit<ExpenseRequestFilters, "approverId"> = {}
): Promise<ExpenseRequest[]> {
  return await getAllExpenseRequests({ ...filters, approverId });
}

/**
 * Get pending expense requests (for approval queue)
 */
export async function getPendingExpenseRequests(
  filters: Omit<ExpenseRequestFilters, "status"> = {}
): Promise<ExpenseRequest[]> {
  return await getAllExpenseRequests({ ...filters, status: "pending" });
}
