import { queryOptions } from "@tanstack/react-query";
import {
  getExpenseVoucherByIdFn,
  getExpenseVoucherDetailsFn,
  getExpenseVouchersFn,
  getExpenseVouchersCountFn,
  getMyExpenseVouchersFn,
  getPendingApprovalVouchersFn,
  getVouchersPendingGLPostingFn,
  getUnreconciledVouchersFn,
} from "~/fn/expense-vouchers";
import type {
  ExpenseVoucherStatus,
  ReconciliationStatus,
  PostingStatus,
} from "~/db/schema";

export const expenseVoucherQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["expense-voucher", id],
    queryFn: () => getExpenseVoucherByIdFn({ data: { id } }),
  });

export const expenseVoucherDetailsQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["expense-voucher", id, "details"],
    queryFn: () => getExpenseVoucherDetailsFn({ data: { id } }),
  });

export interface ExpenseVouchersQueryParams {
  status?: ExpenseVoucherStatus;
  reconciliationStatus?: ReconciliationStatus;
  postingStatus?: PostingStatus;
  submitterId?: string;
  currentApproverId?: string;
  glAccountCode?: string;
  vendorId?: string;
  searchQuery?: string;
  limit?: number;
  offset?: number;
}

export const expenseVouchersQueryOptions = (params?: ExpenseVouchersQueryParams) =>
  queryOptions({
    queryKey: ["expense-vouchers", params],
    queryFn: () => getExpenseVouchersFn({ data: params }),
  });

export const expenseVouchersCountQueryOptions = (params?: ExpenseVouchersQueryParams) =>
  queryOptions({
    queryKey: ["expense-vouchers", "count", params],
    queryFn: () => getExpenseVouchersCountFn({ data: params }),
  });

export const myExpenseVouchersQueryOptions = (params?: {
  status?: ExpenseVoucherStatus;
  limit?: number;
  offset?: number;
}) =>
  queryOptions({
    queryKey: ["expense-vouchers", "my", params],
    queryFn: () => getMyExpenseVouchersFn({ data: params }),
  });

export const pendingApprovalVouchersQueryOptions = (params?: {
  limit?: number;
  offset?: number;
}) =>
  queryOptions({
    queryKey: ["expense-vouchers", "pending-approval", params],
    queryFn: () => getPendingApprovalVouchersFn({ data: params }),
  });

export const vouchersPendingGLPostingQueryOptions = (params?: {
  limit?: number;
  offset?: number;
}) =>
  queryOptions({
    queryKey: ["expense-vouchers", "pending-gl-posting", params],
    queryFn: () => getVouchersPendingGLPostingFn({ data: params }),
  });

export const unreconciledVouchersQueryOptions = (params?: {
  limit?: number;
  offset?: number;
}) =>
  queryOptions({
    queryKey: ["expense-vouchers", "unreconciled", params],
    queryFn: () => getUnreconciledVouchersFn({ data: params }),
  });
