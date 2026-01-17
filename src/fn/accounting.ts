/**
 * Server Functions for Accounting Data
 *
 * Provides server-side functions for querying accounting data from Odoo ERP.
 * Includes AP/AR balances, invoice status, payment terms, and aging reports.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authenticatedMiddleware } from "./middleware";
import { privateEnv } from "~/config/privateEnv";
import { initOdooClient } from "~/data-access/odoo";
import {
  findCustomerInvoices,
  findVendorBills,
  findOpenCustomerInvoices,
  findOpenVendorBills,
  findOverdueCustomerInvoices,
  findOverdueVendorBills,
  findInvoicesByPartner,
  findInvoiceById,
  findPaymentTerms,
  findPaymentTermById,
  findPayments,
  findPaymentsByPartner,
  getPartnerBalance,
  getReceivablesBalances,
  getPayablesBalances,
  generateAgingReport,
  getInvoiceSummaries,
  getFinancialSnapshot,
  countInvoices,
  getTotalReceivables,
  getTotalPayables,
} from "~/data-access/accounting";

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Gets the Odoo configuration and initializes client
 */
async function ensureOdooClient() {
  const url = privateEnv.ODOO_URL;
  const database = privateEnv.ODOO_DATABASE;
  const username = privateEnv.ODOO_USERNAME;
  const password = privateEnv.ODOO_PASSWORD;

  if (!url || !database || !username || !password) {
    throw new Error(
      "Odoo configuration is incomplete. Please check environment variables."
    );
  }

  await initOdooClient({ url, database, username, password });
}

// =============================================================================
// Invoice Functions
// =============================================================================

/**
 * Get customer invoices (AR)
 */
export const getCustomerInvoicesFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z
      .object({
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      })
      .optional()
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    await ensureOdooClient();
    const options = data || { limit: 50, offset: 0 };
    const invoices = await findCustomerInvoices([], options);
    return { invoices };
  });

/**
 * Get vendor bills (AP)
 */
export const getVendorBillsFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z
      .object({
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      })
      .optional()
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    await ensureOdooClient();
    const options = data || { limit: 50, offset: 0 };
    const bills = await findVendorBills([], options);
    return { bills };
  });

/**
 * Get open customer invoices
 */
export const getOpenCustomerInvoicesFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z
      .object({
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      })
      .optional()
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    await ensureOdooClient();
    const options = data || { limit: 50, offset: 0 };
    const invoices = await findOpenCustomerInvoices(options);
    return { invoices };
  });

/**
 * Get open vendor bills
 */
export const getOpenVendorBillsFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z
      .object({
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      })
      .optional()
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    await ensureOdooClient();
    const options = data || { limit: 50, offset: 0 };
    const bills = await findOpenVendorBills(options);
    return { bills };
  });

/**
 * Get overdue customer invoices
 */
export const getOverdueCustomerInvoicesFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z
      .object({
        asOfDate: z.string().optional(),
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      })
      .optional()
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    await ensureOdooClient();
    const { asOfDate, limit = 50, offset = 0 } = data || {};
    const invoices = await findOverdueCustomerInvoices(asOfDate, {
      limit,
      offset,
    });
    return { invoices };
  });

/**
 * Get overdue vendor bills
 */
export const getOverdueVendorBillsFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z
      .object({
        asOfDate: z.string().optional(),
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      })
      .optional()
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    await ensureOdooClient();
    const { asOfDate, limit = 50, offset = 0 } = data || {};
    const bills = await findOverdueVendorBills(asOfDate, { limit, offset });
    return { bills };
  });

/**
 * Get invoices by partner
 */
export const getInvoicesByPartnerFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      partnerId: z.number().int().positive("Invalid partner ID"),
      type: z.enum(["customer", "vendor", "all"]).optional().default("all"),
      limit: z.number().optional().default(50),
      offset: z.number().optional().default(0),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    await ensureOdooClient();
    const invoices = await findInvoicesByPartner(data.partnerId, data.type, {
      limit: data.limit,
      offset: data.offset,
    });
    return { invoices };
  });

/**
 * Get invoice by ID
 */
export const getInvoiceByIdFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      invoiceId: z.number().int().positive("Invalid invoice ID"),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    await ensureOdooClient();
    const invoice = await findInvoiceById(data.invoiceId);

    if (!invoice) {
      throw new Error("Invoice not found");
    }

    return { invoice };
  });

/**
 * Get invoice summaries with filtering
 */
export const getInvoiceSummariesFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z
      .object({
        type: z.enum(["customer", "vendor", "all"]).optional().default("all"),
        status: z.enum(["open", "paid", "overdue", "all"]).optional().default("all"),
        partnerId: z.number().int().positive().optional(),
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      })
      .optional()
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    await ensureOdooClient();
    const options = data || {};
    const result = await getInvoiceSummaries(options);
    return result;
  });

// =============================================================================
// Payment Term Functions
// =============================================================================

/**
 * Get all payment terms
 */
export const getPaymentTermsFn = createServerFn({
  method: "GET",
})
  .middleware([authenticatedMiddleware])
  .handler(async () => {
    await ensureOdooClient();
    const paymentTerms = await findPaymentTerms();
    return { paymentTerms };
  });

/**
 * Get payment term by ID
 */
export const getPaymentTermByIdFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      paymentTermId: z.number().int().positive("Invalid payment term ID"),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    await ensureOdooClient();
    const paymentTerm = await findPaymentTermById(data.paymentTermId);

    if (!paymentTerm) {
      throw new Error("Payment term not found");
    }

    return { paymentTerm };
  });

// =============================================================================
// Payment Functions
// =============================================================================

/**
 * Get payments
 */
export const getPaymentsFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z
      .object({
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      })
      .optional()
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    await ensureOdooClient();
    const options = data || { limit: 50, offset: 0 };
    const payments = await findPayments([], options);
    return { payments };
  });

/**
 * Get payments by partner
 */
export const getPaymentsByPartnerFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      partnerId: z.number().int().positive("Invalid partner ID"),
      limit: z.number().optional().default(50),
      offset: z.number().optional().default(0),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    await ensureOdooClient();
    const payments = await findPaymentsByPartner(data.partnerId, {
      limit: data.limit,
      offset: data.offset,
    });
    return { payments };
  });

// =============================================================================
// Balance Functions
// =============================================================================

/**
 * Get partner balance (AR/AP)
 */
export const getPartnerBalanceFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      partnerId: z.number().int().positive("Invalid partner ID"),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    await ensureOdooClient();
    const balance = await getPartnerBalance(data.partnerId);
    return { balance };
  });

/**
 * Get all receivables balances (AR by customer)
 */
export const getReceivablesBalancesFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z
      .object({
        limit: z.number().optional().default(100),
      })
      .optional()
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    await ensureOdooClient();
    const options = data || { limit: 100 };
    const balances = await getReceivablesBalances(options);
    return { balances };
  });

/**
 * Get all payables balances (AP by vendor)
 */
export const getPayablesBalancesFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z
      .object({
        limit: z.number().optional().default(100),
      })
      .optional()
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    await ensureOdooClient();
    const options = data || { limit: 100 };
    const balances = await getPayablesBalances(options);
    return { balances };
  });

/**
 * Get total receivables amount
 */
export const getTotalReceivablesFn = createServerFn({
  method: "GET",
})
  .middleware([authenticatedMiddleware])
  .handler(async () => {
    await ensureOdooClient();
    const total = await getTotalReceivables();
    return { total };
  });

/**
 * Get total payables amount
 */
export const getTotalPayablesFn = createServerFn({
  method: "GET",
})
  .middleware([authenticatedMiddleware])
  .handler(async () => {
    await ensureOdooClient();
    const total = await getTotalPayables();
    return { total };
  });

// =============================================================================
// Aging Report Functions
// =============================================================================

/**
 * Get receivables aging report
 */
export const getReceivablesAgingReportFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z
      .object({
        asOfDate: z.string().optional(),
      })
      .optional()
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    await ensureOdooClient();
    const report = await generateAgingReport("receivable", data?.asOfDate);
    return { report };
  });

/**
 * Get payables aging report
 */
export const getPayablesAgingReportFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z
      .object({
        asOfDate: z.string().optional(),
      })
      .optional()
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    await ensureOdooClient();
    const report = await generateAgingReport("payable", data?.asOfDate);
    return { report };
  });

// =============================================================================
// Financial Snapshot Functions
// =============================================================================

/**
 * Get financial snapshot for AIOM intelligence
 */
export const getFinancialSnapshotFn = createServerFn({
  method: "GET",
})
  .middleware([authenticatedMiddleware])
  .handler(async () => {
    await ensureOdooClient();
    const snapshot = await getFinancialSnapshot();
    return { snapshot };
  });

// =============================================================================
// Count Functions
// =============================================================================

/**
 * Count invoices by type and status
 */
export const countInvoicesFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z
      .object({
        type: z.enum(["customer", "vendor", "all"]).optional().default("all"),
        status: z.enum(["open", "paid", "overdue", "all"]).optional().default("all"),
      })
      .optional()
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    await ensureOdooClient();
    const options = data || {};
    const count = await countInvoices(options);
    return { count };
  });
