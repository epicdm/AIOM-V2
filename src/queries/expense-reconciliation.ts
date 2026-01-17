import { queryOptions } from "@tanstack/react-query";
import {
  getMatchedVouchersWithRequestsFn,
  getUnmatchedExpenseRequestsFn,
  getUnmatchedVouchersFn,
  getReconciliationStatsFn,
} from "~/fn/expense-reconciliation";
import type { ReconciliationStatus } from "~/db/schema";

export interface ReconciliationQueryParams {
  reconciliationStatus?: ReconciliationStatus;
  hasDiscrepancies?: boolean;
  searchQuery?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

export const matchedVouchersQueryOptions = (params?: ReconciliationQueryParams) =>
  queryOptions({
    queryKey: ["expense-reconciliation", "matched", params],
    queryFn: () => getMatchedVouchersWithRequestsFn({ data: params }),
  });

export const unmatchedExpenseRequestsQueryOptions = (params?: ReconciliationQueryParams) =>
  queryOptions({
    queryKey: ["expense-reconciliation", "unmatched-requests", params],
    queryFn: () => getUnmatchedExpenseRequestsFn({ data: params }),
  });

export const unmatchedVouchersQueryOptions = (params?: ReconciliationQueryParams) =>
  queryOptions({
    queryKey: ["expense-reconciliation", "unmatched-vouchers", params],
    queryFn: () => getUnmatchedVouchersFn({ data: params }),
  });

export const reconciliationStatsQueryOptions = () =>
  queryOptions({
    queryKey: ["expense-reconciliation", "stats"],
    queryFn: () => getReconciliationStatsFn(),
  });
