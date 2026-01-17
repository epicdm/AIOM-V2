import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authenticatedMiddleware } from "./middleware";
import {
  getMatchedVouchersWithRequests,
  getUnmatchedExpenseRequests,
  getUnmatchedVouchers,
  linkVoucherToRequest,
  unlinkVoucherFromRequest,
  reconcileMatch,
  markWithDiscrepancies,
  getReconciliationStats,
  type ReconciliationFilters,
} from "~/data-access/expense-reconciliation";

// Zod schemas for validation
const reconciliationFiltersSchema = z.object({
  reconciliationStatus: z.enum(["unreconciled", "partially_reconciled", "reconciled", "disputed"]).optional(),
  hasDiscrepancies: z.boolean().optional(),
  searchQuery: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().min(0).optional(),
});

// Get matched vouchers with requests
export const getMatchedVouchersWithRequestsFn = createServerFn()
  .inputValidator(reconciliationFiltersSchema.optional())
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    const filters: ReconciliationFilters = {
      reconciliationStatus: data?.reconciliationStatus,
      hasDiscrepancies: data?.hasDiscrepancies,
      searchQuery: data?.searchQuery,
      dateFrom: data?.dateFrom ? new Date(data.dateFrom) : undefined,
      dateTo: data?.dateTo ? new Date(data.dateTo) : undefined,
      limit: data?.limit,
      offset: data?.offset,
    };

    return await getMatchedVouchersWithRequests(filters);
  });

// Get unmatched expense requests
export const getUnmatchedExpenseRequestsFn = createServerFn()
  .inputValidator(reconciliationFiltersSchema.optional())
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    const filters: ReconciliationFilters = {
      reconciliationStatus: data?.reconciliationStatus,
      hasDiscrepancies: data?.hasDiscrepancies,
      searchQuery: data?.searchQuery,
      dateFrom: data?.dateFrom ? new Date(data.dateFrom) : undefined,
      dateTo: data?.dateTo ? new Date(data.dateTo) : undefined,
      limit: data?.limit,
      offset: data?.offset,
    };

    return await getUnmatchedExpenseRequests(filters);
  });

// Get unmatched vouchers
export const getUnmatchedVouchersFn = createServerFn()
  .inputValidator(reconciliationFiltersSchema.optional())
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    const filters: ReconciliationFilters = {
      reconciliationStatus: data?.reconciliationStatus,
      hasDiscrepancies: data?.hasDiscrepancies,
      searchQuery: data?.searchQuery,
      dateFrom: data?.dateFrom ? new Date(data.dateFrom) : undefined,
      dateTo: data?.dateTo ? new Date(data.dateTo) : undefined,
      limit: data?.limit,
      offset: data?.offset,
    };

    return await getUnmatchedVouchers(filters);
  });

// Link voucher to request (manual matching)
const linkVoucherToRequestSchema = z.object({
  voucherId: z.string().min(1, "Voucher ID is required"),
  expenseRequestId: z.string().min(1, "Expense request ID is required"),
});

export const linkVoucherToRequestFn = createServerFn()
  .inputValidator(linkVoucherToRequestSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    const result = await linkVoucherToRequest(data.voucherId, data.expenseRequestId);
    return result;
  });

// Unlink voucher from request
const unlinkVoucherFromRequestSchema = z.object({
  voucherId: z.string().min(1, "Voucher ID is required"),
});

export const unlinkVoucherFromRequestFn = createServerFn()
  .inputValidator(unlinkVoucherFromRequestSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    const result = await unlinkVoucherFromRequest(data.voucherId);
    return result;
  });

// Reconcile a match
const reconcileMatchSchema = z.object({
  voucherId: z.string().min(1, "Voucher ID is required"),
  reference: z.string().min(1, "Reconciliation reference is required"),
  notes: z.string().optional(),
});

export const reconcileMatchFn = createServerFn()
  .inputValidator(reconcileMatchSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const result = await reconcileMatch(
      data.voucherId,
      context.userId,
      data.reference,
      data.notes
    );
    return result;
  });

// Mark with discrepancies
const markWithDiscrepanciesSchema = z.object({
  voucherId: z.string().min(1, "Voucher ID is required"),
  notes: z.string().min(1, "Notes describing discrepancies are required"),
});

export const markWithDiscrepanciesFn = createServerFn()
  .inputValidator(markWithDiscrepanciesSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    const result = await markWithDiscrepancies(data.voucherId, data.notes);
    return result;
  });

// Get reconciliation statistics
export const getReconciliationStatsFn = createServerFn({
  method: "GET",
})
  .middleware([authenticatedMiddleware])
  .handler(async () => {
    return await getReconciliationStats();
  });
