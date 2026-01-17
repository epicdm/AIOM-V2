import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authenticatedMiddleware } from "./middleware";
import {
  createExpenseRequest,
  updateExpenseRequest,
  deleteExpenseRequest,
  findExpenseRequestById,
  findExpenseRequestByIdWithUsers,
  getAllExpenseRequests,
  getExpenseRequestsCount,
  approveExpenseRequest,
  rejectExpenseRequest,
  disburseExpenseRequest,
  getPendingExpenseRequests,
  getExpenseRequestsByRequester,
  type ExpenseRequestFilters,
} from "~/data-access/expense-requests";

// Constants for expense request
export const EXPENSE_CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD"] as const;
export type ExpenseCurrency = (typeof EXPENSE_CURRENCIES)[number];

export const EXPENSE_URGENCY_LEVELS = ["low", "medium", "high", "critical"] as const;
export type ExpenseUrgency = (typeof EXPENSE_URGENCY_LEVELS)[number];

// Validation schema for creating expense requests
const createExpenseRequestSchema = z.object({
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine(
      (val) => {
        const num = parseFloat(val);
        return !isNaN(num) && num > 0;
      },
      { message: "Amount must be a positive number" }
    ),
  currency: z.enum(EXPENSE_CURRENCIES).default("USD"),
  purpose: z
    .string()
    .min(1, "Purpose is required")
    .max(200, "Purpose must be less than 200 characters"),
  description: z
    .string()
    .max(5000, "Description must be less than 5000 characters")
    .optional()
    .or(z.literal("")),
  receiptUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
});

// Create expense request server function
export const createExpenseRequestFn = createServerFn({
  method: "POST",
})
  .inputValidator(createExpenseRequestSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const expenseData = {
      id: crypto.randomUUID(),
      amount: data.amount,
      currency: data.currency,
      purpose: data.purpose,
      description: data.description || null,
      receiptUrl: data.receiptUrl || null,
      requesterId: context.userId,
      status: "pending" as const,
    };

    const newExpenseRequest = await createExpenseRequest(expenseData);
    return newExpenseRequest;
  });

// Get expense request by ID
export const getExpenseRequestByIdFn = createServerFn({
  method: "GET",
})
  .inputValidator(z.object({ id: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    const expenseRequest = await findExpenseRequestByIdWithUsers(data.id);
    if (!expenseRequest) {
      throw new Error("Expense request not found");
    }
    return expenseRequest;
  });

// Get all expense requests with filters
const getExpenseRequestsSchema = z.object({
  status: z.enum(["pending", "approved", "rejected", "disbursed"]).optional(),
  requesterId: z.string().optional(),
  approverId: z.string().optional(),
  searchQuery: z.string().optional(),
  limit: z.number().int().positive().max(100).optional().default(50),
  offset: z.number().int().min(0).optional().default(0),
});

export const getExpenseRequestsFn = createServerFn()
  .inputValidator(getExpenseRequestsSchema.optional())
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    const filters: ExpenseRequestFilters = {
      status: data?.status,
      requesterId: data?.requesterId,
      approverId: data?.approverId,
      searchQuery: data?.searchQuery,
      limit: data?.limit ?? 50,
      offset: data?.offset ?? 0,
    };
    return await getAllExpenseRequests(filters);
  });

// Get expense requests count
export const getExpenseRequestsCountFn = createServerFn()
  .inputValidator(getExpenseRequestsSchema.optional())
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    const filters: ExpenseRequestFilters = {
      status: data?.status,
      requesterId: data?.requesterId,
      approverId: data?.approverId,
      searchQuery: data?.searchQuery,
    };
    return await getExpenseRequestsCount(filters);
  });

// Get pending expense requests
export const getPendingExpenseRequestsFn = createServerFn()
  .inputValidator(
    z
      .object({
        limit: z.number().int().positive().max(100).optional().default(50),
        offset: z.number().int().min(0).optional().default(0),
      })
      .optional()
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    return await getPendingExpenseRequests({
      limit: data?.limit ?? 50,
      offset: data?.offset ?? 0,
    });
  });

// Get user's expense requests
export const getMyExpenseRequestsFn = createServerFn()
  .inputValidator(
    z
      .object({
        status: z.enum(["pending", "approved", "rejected", "disbursed"]).optional(),
        limit: z.number().int().positive().max(100).optional().default(50),
        offset: z.number().int().min(0).optional().default(0),
      })
      .optional()
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    return await getExpenseRequestsByRequester(context.userId, {
      status: data?.status,
      limit: data?.limit ?? 50,
      offset: data?.offset ?? 0,
    });
  });

// Update expense request schema
const updateExpenseRequestSchema = z.object({
  id: z.string(),
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine(
      (val) => {
        const num = parseFloat(val);
        return !isNaN(num) && num > 0;
      },
      { message: "Amount must be a positive number" }
    )
    .optional(),
  currency: z.enum(EXPENSE_CURRENCIES).optional(),
  purpose: z
    .string()
    .min(1, "Purpose is required")
    .max(200, "Purpose must be less than 200 characters")
    .optional(),
  description: z
    .string()
    .max(5000, "Description must be less than 5000 characters")
    .optional()
    .or(z.literal("")),
  receiptUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
});

// Update expense request
export const updateExpenseRequestFn = createServerFn({
  method: "POST",
})
  .inputValidator(updateExpenseRequestSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // Check expense request exists
    const existingRequest = await findExpenseRequestById(data.id);
    if (!existingRequest) {
      throw new Error("Expense request not found");
    }

    // Only the requester can update their own pending requests
    if (existingRequest.requesterId !== context.userId) {
      throw new Error("You can only update your own expense requests");
    }

    if (existingRequest.status !== "pending") {
      throw new Error("Only pending expense requests can be updated");
    }

    const updateData = {
      ...(data.amount !== undefined && { amount: data.amount }),
      ...(data.currency !== undefined && { currency: data.currency }),
      ...(data.purpose !== undefined && { purpose: data.purpose }),
      ...(data.description !== undefined && { description: data.description || null }),
      ...(data.receiptUrl !== undefined && { receiptUrl: data.receiptUrl || null }),
    };

    const updatedRequest = await updateExpenseRequest(data.id, updateData);
    return updatedRequest;
  });

// Delete expense request
export const deleteExpenseRequestFn = createServerFn({
  method: "POST",
})
  .inputValidator(z.object({ id: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // Check expense request exists
    const existingRequest = await findExpenseRequestById(data.id);
    if (!existingRequest) {
      throw new Error("Expense request not found");
    }

    // Only the requester can delete their own pending requests
    if (existingRequest.requesterId !== context.userId) {
      throw new Error("You can only delete your own expense requests");
    }

    if (existingRequest.status !== "pending") {
      throw new Error("Only pending expense requests can be deleted");
    }

    await deleteExpenseRequest(data.id);
    return { success: true };
  });

// Approve expense request
export const approveExpenseRequestFn = createServerFn({
  method: "POST",
})
  .inputValidator(z.object({ id: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // Check expense request exists
    const existingRequest = await findExpenseRequestById(data.id);
    if (!existingRequest) {
      throw new Error("Expense request not found");
    }

    if (existingRequest.status !== "pending") {
      throw new Error("Only pending expense requests can be approved");
    }

    // Prevent self-approval
    if (existingRequest.requesterId === context.userId) {
      throw new Error("You cannot approve your own expense request");
    }

    const approvedRequest = await approveExpenseRequest(data.id, context.userId);
    return approvedRequest;
  });

// Reject expense request
const rejectExpenseRequestSchema = z.object({
  id: z.string(),
  rejectionReason: z
    .string()
    .max(1000, "Rejection reason must be less than 1000 characters")
    .optional()
    .or(z.literal("")),
});

export const rejectExpenseRequestFn = createServerFn({
  method: "POST",
})
  .inputValidator(rejectExpenseRequestSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // Check expense request exists
    const existingRequest = await findExpenseRequestById(data.id);
    if (!existingRequest) {
      throw new Error("Expense request not found");
    }

    if (existingRequest.status !== "pending") {
      throw new Error("Only pending expense requests can be rejected");
    }

    // Prevent self-rejection
    if (existingRequest.requesterId === context.userId) {
      throw new Error("You cannot reject your own expense request");
    }

    const rejectedRequest = await rejectExpenseRequest(
      data.id,
      context.userId,
      data.rejectionReason || undefined
    );
    return rejectedRequest;
  });

// Disburse expense request
export const disburseExpenseRequestFn = createServerFn({
  method: "POST",
})
  .inputValidator(z.object({ id: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    // Check expense request exists
    const existingRequest = await findExpenseRequestById(data.id);
    if (!existingRequest) {
      throw new Error("Expense request not found");
    }

    if (existingRequest.status !== "approved") {
      throw new Error("Only approved expense requests can be disbursed");
    }

    const disbursedRequest = await disburseExpenseRequest(data.id);
    return disbursedRequest;
  });
