import { queryOptions } from "@tanstack/react-query";
import {
  getExpenseRequestByIdFn,
  getExpenseRequestsFn,
  getExpenseRequestsCountFn,
  getPendingExpenseRequestsFn,
  getMyExpenseRequestsFn,
} from "~/fn/expense-requests";
import type { ExpenseRequestStatus } from "~/db/schema";

export const expenseRequestQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["expense-request", id],
    queryFn: () => getExpenseRequestByIdFn({ data: { id } }),
  });

export interface ExpenseRequestsQueryParams {
  status?: ExpenseRequestStatus;
  requesterId?: string;
  approverId?: string;
  searchQuery?: string;
  limit?: number;
  offset?: number;
}

export const expenseRequestsQueryOptions = (params?: ExpenseRequestsQueryParams) =>
  queryOptions({
    queryKey: ["expense-requests", params],
    queryFn: () => getExpenseRequestsFn({ data: params }),
  });

export const expenseRequestsCountQueryOptions = (params?: ExpenseRequestsQueryParams) =>
  queryOptions({
    queryKey: ["expense-requests", "count", params],
    queryFn: () => getExpenseRequestsCountFn({ data: params }),
  });

export const pendingExpenseRequestsQueryOptions = (params?: { limit?: number; offset?: number }) =>
  queryOptions({
    queryKey: ["expense-requests", "pending", params],
    queryFn: () => getPendingExpenseRequestsFn({ data: params }),
  });

export const myExpenseRequestsQueryOptions = (params?: {
  status?: ExpenseRequestStatus;
  limit?: number;
  offset?: number;
}) =>
  queryOptions({
    queryKey: ["expense-requests", "my", params],
    queryFn: () => getMyExpenseRequestsFn({ data: params }),
  });
