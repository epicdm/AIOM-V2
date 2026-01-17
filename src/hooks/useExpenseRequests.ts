import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  expenseRequestQueryOptions,
  expenseRequestsQueryOptions,
  expenseRequestsCountQueryOptions,
  pendingExpenseRequestsQueryOptions,
  myExpenseRequestsQueryOptions,
  type ExpenseRequestsQueryParams,
} from "~/queries/expense-requests";
import {
  createExpenseRequestFn,
  updateExpenseRequestFn,
  deleteExpenseRequestFn,
  approveExpenseRequestFn,
  rejectExpenseRequestFn,
  disburseExpenseRequestFn,
  type ExpenseCurrency,
} from "~/fn/expense-requests";
import { getErrorMessage } from "~/utils/error";
import type { ExpenseRequestStatus } from "~/db/schema";

// Query hooks

/**
 * Get a single expense request by ID
 */
export function useExpenseRequest(id: string, enabled = true) {
  return useQuery({
    ...expenseRequestQueryOptions(id),
    enabled: enabled && !!id,
  });
}

/**
 * Get all expense requests with optional filters
 */
export function useExpenseRequests(params?: ExpenseRequestsQueryParams, enabled = true) {
  return useQuery({
    ...expenseRequestsQueryOptions(params),
    enabled,
  });
}

/**
 * Get count of expense requests with optional filters
 */
export function useExpenseRequestsCount(params?: ExpenseRequestsQueryParams, enabled = true) {
  return useQuery({
    ...expenseRequestsCountQueryOptions(params),
    enabled,
  });
}

/**
 * Get pending expense requests (for approval queue)
 */
export function usePendingExpenseRequests(
  params?: { limit?: number; offset?: number },
  enabled = true
) {
  return useQuery({
    ...pendingExpenseRequestsQueryOptions(params),
    enabled,
  });
}

/**
 * Get current user's expense requests
 */
export function useMyExpenseRequests(
  params?: { status?: ExpenseRequestStatus; limit?: number; offset?: number },
  enabled = true
) {
  return useQuery({
    ...myExpenseRequestsQueryOptions(params),
    enabled,
  });
}

// Mutation hooks

interface CreateExpenseRequestData {
  amount: string;
  currency?: ExpenseCurrency;
  purpose: string;
  description?: string;
  receiptUrl?: string;
}

/**
 * Create a new expense request
 */
export function useCreateExpenseRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateExpenseRequestData) =>
      createExpenseRequestFn({ data }),
    onSuccess: () => {
      toast.success("Expense request created!", {
        description: "Your expense request has been submitted for approval.",
      });
      // Invalidate expense request queries
      queryClient.invalidateQueries({ queryKey: ["expense-requests"] });
    },
    onError: (error) => {
      toast.error("Failed to create expense request", {
        description: getErrorMessage(error),
      });
    },
  });
}

interface UpdateExpenseRequestData {
  id: string;
  amount?: string;
  currency?: ExpenseCurrency;
  purpose?: string;
  description?: string;
  receiptUrl?: string;
}

/**
 * Update an existing expense request
 */
export function useUpdateExpenseRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateExpenseRequestData) =>
      updateExpenseRequestFn({ data }),
    onSuccess: (_, variables) => {
      toast.success("Expense request updated!", {
        description: "Your changes have been saved.",
      });
      // Invalidate expense request queries
      queryClient.invalidateQueries({ queryKey: ["expense-requests"] });
      queryClient.invalidateQueries({ queryKey: ["expense-request", variables.id] });
    },
    onError: (error) => {
      toast.error("Failed to update expense request", {
        description: getErrorMessage(error),
      });
    },
  });
}

/**
 * Delete an expense request
 */
export function useDeleteExpenseRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteExpenseRequestFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Expense request deleted!", {
        description: "The expense request has been removed.",
      });
      // Invalidate expense request queries
      queryClient.invalidateQueries({ queryKey: ["expense-requests"] });
    },
    onError: (error) => {
      toast.error("Failed to delete expense request", {
        description: getErrorMessage(error),
      });
    },
  });
}

/**
 * Approve an expense request
 */
export function useApproveExpenseRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => approveExpenseRequestFn({ data: { id } }),
    onSuccess: (_, id) => {
      toast.success("Expense request approved!", {
        description: "The expense request has been approved.",
      });
      // Invalidate expense request queries
      queryClient.invalidateQueries({ queryKey: ["expense-requests"] });
      queryClient.invalidateQueries({ queryKey: ["expense-request", id] });
    },
    onError: (error) => {
      toast.error("Failed to approve expense request", {
        description: getErrorMessage(error),
      });
    },
  });
}

interface RejectExpenseRequestData {
  id: string;
  rejectionReason?: string;
}

/**
 * Reject an expense request
 */
export function useRejectExpenseRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RejectExpenseRequestData) =>
      rejectExpenseRequestFn({ data }),
    onSuccess: (_, variables) => {
      toast.success("Expense request rejected", {
        description: "The expense request has been rejected.",
      });
      // Invalidate expense request queries
      queryClient.invalidateQueries({ queryKey: ["expense-requests"] });
      queryClient.invalidateQueries({ queryKey: ["expense-request", variables.id] });
    },
    onError: (error) => {
      toast.error("Failed to reject expense request", {
        description: getErrorMessage(error),
      });
    },
  });
}

/**
 * Mark an expense request as disbursed
 */
export function useDisburseExpenseRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => disburseExpenseRequestFn({ data: { id } }),
    onSuccess: (_, id) => {
      toast.success("Expense disbursed!", {
        description: "The expense has been marked as disbursed.",
      });
      // Invalidate expense request queries
      queryClient.invalidateQueries({ queryKey: ["expense-requests"] });
      queryClient.invalidateQueries({ queryKey: ["expense-request", id] });
    },
    onError: (error) => {
      toast.error("Failed to disburse expense", {
        description: getErrorMessage(error),
      });
    },
  });
}
