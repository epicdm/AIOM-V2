/**
 * TanStack Query Options for Accounting Data
 *
 * Provides query configurations for fetching accounting data
 * from Odoo ERP with caching and refetch strategies.
 */

import { queryOptions } from "@tanstack/react-query";
import {
  getCustomerInvoicesFn,
  getVendorBillsFn,
  getOpenCustomerInvoicesFn,
  getOpenVendorBillsFn,
  getOverdueCustomerInvoicesFn,
  getOverdueVendorBillsFn,
  getInvoicesByPartnerFn,
  getInvoiceByIdFn,
  getInvoiceSummariesFn,
  getPaymentTermsFn,
  getPaymentTermByIdFn,
  getPaymentsFn,
  getPaymentsByPartnerFn,
  getPartnerBalanceFn,
  getReceivablesBalancesFn,
  getPayablesBalancesFn,
  getTotalReceivablesFn,
  getTotalPayablesFn,
  getReceivablesAgingReportFn,
  getPayablesAgingReportFn,
  getFinancialSnapshotFn,
  countInvoicesFn,
} from "~/fn/accounting";

// =============================================================================
// Invoice Query Options
// =============================================================================

export const customerInvoicesQueryOptions = (
  limit: number = 50,
  offset: number = 0
) =>
  queryOptions({
    queryKey: ["accounting", "invoices", "customer", { limit, offset }],
    queryFn: () => getCustomerInvoicesFn({ data: { limit, offset } }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

export const vendorBillsQueryOptions = (
  limit: number = 50,
  offset: number = 0
) =>
  queryOptions({
    queryKey: ["accounting", "invoices", "vendor", { limit, offset }],
    queryFn: () => getVendorBillsFn({ data: { limit, offset } }),
    staleTime: 5 * 60 * 1000,
  });

export const openCustomerInvoicesQueryOptions = (
  limit: number = 50,
  offset: number = 0
) =>
  queryOptions({
    queryKey: ["accounting", "invoices", "customer", "open", { limit, offset }],
    queryFn: () => getOpenCustomerInvoicesFn({ data: { limit, offset } }),
    staleTime: 2 * 60 * 1000, // 2 minutes for open items
  });

export const openVendorBillsQueryOptions = (
  limit: number = 50,
  offset: number = 0
) =>
  queryOptions({
    queryKey: ["accounting", "invoices", "vendor", "open", { limit, offset }],
    queryFn: () => getOpenVendorBillsFn({ data: { limit, offset } }),
    staleTime: 2 * 60 * 1000,
  });

export const overdueCustomerInvoicesQueryOptions = (
  asOfDate?: string,
  limit: number = 50,
  offset: number = 0
) =>
  queryOptions({
    queryKey: [
      "accounting",
      "invoices",
      "customer",
      "overdue",
      { asOfDate, limit, offset },
    ],
    queryFn: () =>
      getOverdueCustomerInvoicesFn({ data: { asOfDate, limit, offset } }),
    staleTime: 2 * 60 * 1000,
  });

export const overdueVendorBillsQueryOptions = (
  asOfDate?: string,
  limit: number = 50,
  offset: number = 0
) =>
  queryOptions({
    queryKey: [
      "accounting",
      "invoices",
      "vendor",
      "overdue",
      { asOfDate, limit, offset },
    ],
    queryFn: () =>
      getOverdueVendorBillsFn({ data: { asOfDate, limit, offset } }),
    staleTime: 2 * 60 * 1000,
  });

export const invoicesByPartnerQueryOptions = (
  partnerId: number,
  type: "customer" | "vendor" | "all" = "all",
  limit: number = 50,
  offset: number = 0
) =>
  queryOptions({
    queryKey: [
      "accounting",
      "invoices",
      "partner",
      partnerId,
      { type, limit, offset },
    ],
    queryFn: () =>
      getInvoicesByPartnerFn({ data: { partnerId, type, limit, offset } }),
    staleTime: 5 * 60 * 1000,
  });

export const invoiceByIdQueryOptions = (invoiceId: number) =>
  queryOptions({
    queryKey: ["accounting", "invoice", invoiceId],
    queryFn: () => getInvoiceByIdFn({ data: { invoiceId } }),
    staleTime: 5 * 60 * 1000,
  });

export const invoiceSummariesQueryOptions = (options?: {
  type?: "customer" | "vendor" | "all";
  status?: "open" | "paid" | "overdue" | "all";
  partnerId?: number;
  limit?: number;
  offset?: number;
}) =>
  queryOptions({
    queryKey: ["accounting", "invoices", "summaries", options],
    queryFn: () => getInvoiceSummariesFn({ data: options }),
    staleTime: 2 * 60 * 1000,
  });

// =============================================================================
// Payment Term Query Options
// =============================================================================

export const paymentTermsQueryOptions = () =>
  queryOptions({
    queryKey: ["accounting", "payment-terms"],
    queryFn: () => getPaymentTermsFn(),
    staleTime: 30 * 60 * 1000, // 30 minutes - rarely changes
  });

export const paymentTermByIdQueryOptions = (paymentTermId: number) =>
  queryOptions({
    queryKey: ["accounting", "payment-term", paymentTermId],
    queryFn: () => getPaymentTermByIdFn({ data: { paymentTermId } }),
    staleTime: 30 * 60 * 1000,
  });

// =============================================================================
// Payment Query Options
// =============================================================================

export const paymentsQueryOptions = (
  limit: number = 50,
  offset: number = 0
) =>
  queryOptions({
    queryKey: ["accounting", "payments", { limit, offset }],
    queryFn: () => getPaymentsFn({ data: { limit, offset } }),
    staleTime: 5 * 60 * 1000,
  });

export const paymentsByPartnerQueryOptions = (
  partnerId: number,
  limit: number = 50,
  offset: number = 0
) =>
  queryOptions({
    queryKey: ["accounting", "payments", "partner", partnerId, { limit, offset }],
    queryFn: () => getPaymentsByPartnerFn({ data: { partnerId, limit, offset } }),
    staleTime: 5 * 60 * 1000,
  });

// =============================================================================
// Balance Query Options
// =============================================================================

export const partnerBalanceQueryOptions = (partnerId: number) =>
  queryOptions({
    queryKey: ["accounting", "balance", "partner", partnerId],
    queryFn: () => getPartnerBalanceFn({ data: { partnerId } }),
    staleTime: 2 * 60 * 1000,
  });

export const receivablesBalancesQueryOptions = (limit: number = 100) =>
  queryOptions({
    queryKey: ["accounting", "balances", "receivables", { limit }],
    queryFn: () => getReceivablesBalancesFn({ data: { limit } }),
    staleTime: 2 * 60 * 1000,
  });

export const payablesBalancesQueryOptions = (limit: number = 100) =>
  queryOptions({
    queryKey: ["accounting", "balances", "payables", { limit }],
    queryFn: () => getPayablesBalancesFn({ data: { limit } }),
    staleTime: 2 * 60 * 1000,
  });

export const totalReceivablesQueryOptions = () =>
  queryOptions({
    queryKey: ["accounting", "totals", "receivables"],
    queryFn: () => getTotalReceivablesFn(),
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  });

export const totalPayablesQueryOptions = () =>
  queryOptions({
    queryKey: ["accounting", "totals", "payables"],
    queryFn: () => getTotalPayablesFn(),
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

// =============================================================================
// Aging Report Query Options
// =============================================================================

export const receivablesAgingReportQueryOptions = (asOfDate?: string) =>
  queryOptions({
    queryKey: ["accounting", "aging", "receivables", { asOfDate }],
    queryFn: () => getReceivablesAgingReportFn({ data: { asOfDate } }),
    staleTime: 5 * 60 * 1000,
  });

export const payablesAgingReportQueryOptions = (asOfDate?: string) =>
  queryOptions({
    queryKey: ["accounting", "aging", "payables", { asOfDate }],
    queryFn: () => getPayablesAgingReportFn({ data: { asOfDate } }),
    staleTime: 5 * 60 * 1000,
  });

// =============================================================================
// Financial Snapshot Query Options
// =============================================================================

export const financialSnapshotQueryOptions = () =>
  queryOptions({
    queryKey: ["accounting", "financial-snapshot"],
    queryFn: () => getFinancialSnapshotFn(),
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  });

// =============================================================================
// Count Query Options
// =============================================================================

export const invoiceCountQueryOptions = (options?: {
  type?: "customer" | "vendor" | "all";
  status?: "open" | "paid" | "overdue" | "all";
}) =>
  queryOptions({
    queryKey: ["accounting", "invoices", "count", options],
    queryFn: () => countInvoicesFn({ data: options }),
    staleTime: 2 * 60 * 1000,
  });
