/**
 * React Hooks for Accounting Data
 *
 * Provides React hooks for fetching and managing accounting data
 * from Odoo ERP using TanStack Query.
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  customerInvoicesQueryOptions,
  vendorBillsQueryOptions,
  openCustomerInvoicesQueryOptions,
  openVendorBillsQueryOptions,
  overdueCustomerInvoicesQueryOptions,
  overdueVendorBillsQueryOptions,
  invoicesByPartnerQueryOptions,
  invoiceByIdQueryOptions,
  invoiceSummariesQueryOptions,
  paymentTermsQueryOptions,
  paymentTermByIdQueryOptions,
  paymentsQueryOptions,
  paymentsByPartnerQueryOptions,
  partnerBalanceQueryOptions,
  receivablesBalancesQueryOptions,
  payablesBalancesQueryOptions,
  totalReceivablesQueryOptions,
  totalPayablesQueryOptions,
  receivablesAgingReportQueryOptions,
  payablesAgingReportQueryOptions,
  financialSnapshotQueryOptions,
  invoiceCountQueryOptions,
} from "~/queries/accounting";

// =============================================================================
// Invoice Hooks
// =============================================================================

/**
 * Hook for fetching customer invoices (AR)
 */
export function useCustomerInvoices(
  limit: number = 50,
  offset: number = 0,
  enabled: boolean = true
) {
  return useQuery({
    ...customerInvoicesQueryOptions(limit, offset),
    enabled,
  });
}

/**
 * Hook for fetching vendor bills (AP)
 */
export function useVendorBills(
  limit: number = 50,
  offset: number = 0,
  enabled: boolean = true
) {
  return useQuery({
    ...vendorBillsQueryOptions(limit, offset),
    enabled,
  });
}

/**
 * Hook for fetching open customer invoices
 */
export function useOpenCustomerInvoices(
  limit: number = 50,
  offset: number = 0,
  enabled: boolean = true
) {
  return useQuery({
    ...openCustomerInvoicesQueryOptions(limit, offset),
    enabled,
  });
}

/**
 * Hook for fetching open vendor bills
 */
export function useOpenVendorBills(
  limit: number = 50,
  offset: number = 0,
  enabled: boolean = true
) {
  return useQuery({
    ...openVendorBillsQueryOptions(limit, offset),
    enabled,
  });
}

/**
 * Hook for fetching overdue customer invoices
 */
export function useOverdueCustomerInvoices(
  asOfDate?: string,
  limit: number = 50,
  offset: number = 0,
  enabled: boolean = true
) {
  return useQuery({
    ...overdueCustomerInvoicesQueryOptions(asOfDate, limit, offset),
    enabled,
  });
}

/**
 * Hook for fetching overdue vendor bills
 */
export function useOverdueVendorBills(
  asOfDate?: string,
  limit: number = 50,
  offset: number = 0,
  enabled: boolean = true
) {
  return useQuery({
    ...overdueVendorBillsQueryOptions(asOfDate, limit, offset),
    enabled,
  });
}

/**
 * Hook for fetching invoices by partner
 */
export function useInvoicesByPartner(
  partnerId: number,
  type: "customer" | "vendor" | "all" = "all",
  limit: number = 50,
  offset: number = 0,
  enabled: boolean = true
) {
  return useQuery({
    ...invoicesByPartnerQueryOptions(partnerId, type, limit, offset),
    enabled: enabled && partnerId > 0,
  });
}

/**
 * Hook for fetching a single invoice by ID
 */
export function useInvoiceById(invoiceId: number, enabled: boolean = true) {
  return useQuery({
    ...invoiceByIdQueryOptions(invoiceId),
    enabled: enabled && invoiceId > 0,
  });
}

/**
 * Hook for fetching invoice summaries with filtering
 */
export function useInvoiceSummaries(
  options?: {
    type?: "customer" | "vendor" | "all";
    status?: "open" | "paid" | "overdue" | "all";
    partnerId?: number;
    limit?: number;
    offset?: number;
  },
  enabled: boolean = true
) {
  return useQuery({
    ...invoiceSummariesQueryOptions(options),
    enabled,
  });
}

// =============================================================================
// Payment Term Hooks
// =============================================================================

/**
 * Hook for fetching all payment terms
 */
export function usePaymentTerms(enabled: boolean = true) {
  return useQuery({
    ...paymentTermsQueryOptions(),
    enabled,
  });
}

/**
 * Hook for fetching a single payment term by ID
 */
export function usePaymentTermById(
  paymentTermId: number,
  enabled: boolean = true
) {
  return useQuery({
    ...paymentTermByIdQueryOptions(paymentTermId),
    enabled: enabled && paymentTermId > 0,
  });
}

// =============================================================================
// Payment Hooks
// =============================================================================

/**
 * Hook for fetching payments
 */
export function usePayments(
  limit: number = 50,
  offset: number = 0,
  enabled: boolean = true
) {
  return useQuery({
    ...paymentsQueryOptions(limit, offset),
    enabled,
  });
}

/**
 * Hook for fetching payments by partner
 */
export function usePaymentsByPartner(
  partnerId: number,
  limit: number = 50,
  offset: number = 0,
  enabled: boolean = true
) {
  return useQuery({
    ...paymentsByPartnerQueryOptions(partnerId, limit, offset),
    enabled: enabled && partnerId > 0,
  });
}

// =============================================================================
// Balance Hooks
// =============================================================================

/**
 * Hook for fetching partner balance (AR/AP)
 */
export function usePartnerBalance(partnerId: number, enabled: boolean = true) {
  return useQuery({
    ...partnerBalanceQueryOptions(partnerId),
    enabled: enabled && partnerId > 0,
  });
}

/**
 * Hook for fetching all receivables balances (AR by customer)
 */
export function useReceivablesBalances(
  limit: number = 100,
  enabled: boolean = true
) {
  return useQuery({
    ...receivablesBalancesQueryOptions(limit),
    enabled,
  });
}

/**
 * Hook for fetching all payables balances (AP by vendor)
 */
export function usePayablesBalances(
  limit: number = 100,
  enabled: boolean = true
) {
  return useQuery({
    ...payablesBalancesQueryOptions(limit),
    enabled,
  });
}

/**
 * Hook for fetching total receivables amount
 */
export function useTotalReceivables(enabled: boolean = true) {
  return useQuery({
    ...totalReceivablesQueryOptions(),
    enabled,
  });
}

/**
 * Hook for fetching total payables amount
 */
export function useTotalPayables(enabled: boolean = true) {
  return useQuery({
    ...totalPayablesQueryOptions(),
    enabled,
  });
}

// =============================================================================
// Aging Report Hooks
// =============================================================================

/**
 * Hook for fetching receivables aging report
 */
export function useReceivablesAgingReport(
  asOfDate?: string,
  enabled: boolean = true
) {
  return useQuery({
    ...receivablesAgingReportQueryOptions(asOfDate),
    enabled,
  });
}

/**
 * Hook for fetching payables aging report
 */
export function usePayablesAgingReport(
  asOfDate?: string,
  enabled: boolean = true
) {
  return useQuery({
    ...payablesAgingReportQueryOptions(asOfDate),
    enabled,
  });
}

// =============================================================================
// Financial Snapshot Hooks
// =============================================================================

/**
 * Hook for fetching financial snapshot for AIOM intelligence
 */
export function useFinancialSnapshot(enabled: boolean = true) {
  return useQuery({
    ...financialSnapshotQueryOptions(),
    enabled,
  });
}

// =============================================================================
// Count Hooks
// =============================================================================

/**
 * Hook for counting invoices by type and status
 */
export function useInvoiceCount(
  options?: {
    type?: "customer" | "vendor" | "all";
    status?: "open" | "paid" | "overdue" | "all";
  },
  enabled: boolean = true
) {
  return useQuery({
    ...invoiceCountQueryOptions(options),
    enabled,
  });
}

// =============================================================================
// Invalidation Hooks
// =============================================================================

/**
 * Hook for invalidating accounting queries
 * Useful after making changes that affect accounting data
 */
export function useInvalidateAccountingQueries() {
  const queryClient = useQueryClient();

  return {
    /**
     * Invalidate all accounting queries
     */
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: ["accounting"] });
    },

    /**
     * Invalidate invoice queries
     */
    invalidateInvoices: () => {
      queryClient.invalidateQueries({ queryKey: ["accounting", "invoices"] });
      queryClient.invalidateQueries({ queryKey: ["accounting", "invoice"] });
    },

    /**
     * Invalidate balance queries
     */
    invalidateBalances: () => {
      queryClient.invalidateQueries({ queryKey: ["accounting", "balances"] });
      queryClient.invalidateQueries({ queryKey: ["accounting", "balance"] });
      queryClient.invalidateQueries({ queryKey: ["accounting", "totals"] });
    },

    /**
     * Invalidate aging report queries
     */
    invalidateAgingReports: () => {
      queryClient.invalidateQueries({ queryKey: ["accounting", "aging"] });
    },

    /**
     * Invalidate financial snapshot
     */
    invalidateFinancialSnapshot: () => {
      queryClient.invalidateQueries({
        queryKey: ["accounting", "financial-snapshot"],
      });
    },

    /**
     * Invalidate payment queries
     */
    invalidatePayments: () => {
      queryClient.invalidateQueries({ queryKey: ["accounting", "payments"] });
    },

    /**
     * Invalidate payment term queries
     */
    invalidatePaymentTerms: () => {
      queryClient.invalidateQueries({
        queryKey: ["accounting", "payment-terms"],
      });
      queryClient.invalidateQueries({
        queryKey: ["accounting", "payment-term"],
      });
    },
  };
}

// =============================================================================
// Combined Dashboard Hook
// =============================================================================

/**
 * Hook for fetching all data needed for an accounting dashboard
 * Returns financial snapshot, receivables balances, payables balances
 */
export function useAccountingDashboard(enabled: boolean = true) {
  const financialSnapshot = useFinancialSnapshot(enabled);
  const receivablesBalances = useReceivablesBalances(10, enabled);
  const payablesBalances = usePayablesBalances(10, enabled);
  const overdueInvoices = useOverdueCustomerInvoices(undefined, 5, 0, enabled);
  const overdueBills = useOverdueVendorBills(undefined, 5, 0, enabled);

  return {
    financialSnapshot,
    receivablesBalances,
    payablesBalances,
    overdueInvoices,
    overdueBills,
    isLoading:
      financialSnapshot.isLoading ||
      receivablesBalances.isLoading ||
      payablesBalances.isLoading,
    isError:
      financialSnapshot.isError ||
      receivablesBalances.isError ||
      payablesBalances.isError,
    error:
      financialSnapshot.error ||
      receivablesBalances.error ||
      payablesBalances.error,
  };
}
