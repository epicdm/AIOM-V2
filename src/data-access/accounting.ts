/**
 * Accounting Data Access Layer
 *
 * Provides data access functions for querying accounting data from Odoo ERP.
 * Includes AP/AR balances, invoice status, payment terms, and aging reports.
 */

import {
  type OdooDomain,
  type SearchReadOptions,
  type AccountMove,
  type AccountMoveLine,
  type AccountPaymentTerm,
  type AccountPayment,
  type ResPartner,
  type AccountingBalance,
  type AgingReportEntry,
  type AgingReport,
  type InvoiceSummary,
  type FinancialSnapshot,
} from "~/lib/odoo";
import { getOdooClient } from "./odoo";

// =============================================================================
// Constants
// =============================================================================

const INVOICE_FIELDS = [
  "id",
  "name",
  "partner_id",
  "move_type",
  "state",
  "invoice_date",
  "invoice_date_due",
  "amount_untaxed",
  "amount_tax",
  "amount_total",
  "amount_residual",
  "payment_state",
  "currency_id",
  "ref",
  "invoice_payment_term_id",
];

const MOVE_LINE_FIELDS = [
  "id",
  "name",
  "move_id",
  "account_id",
  "partner_id",
  "date",
  "date_maturity",
  "debit",
  "credit",
  "balance",
  "amount_residual",
  "reconciled",
  "parent_state",
  "currency_id",
];

const PAYMENT_TERM_FIELDS = [
  "id",
  "name",
  "active",
  "note",
  "sequence",
  "display_on_invoice",
];

// =============================================================================
// Invoice Operations
// =============================================================================

/**
 * Finds customer invoices (AR)
 */
export async function findCustomerInvoices(
  domain: OdooDomain = [],
  options: SearchReadOptions = {}
): Promise<AccountMove[]> {
  const client = await getOdooClient();

  const invoiceDomain: OdooDomain = [
    ["move_type", "in", ["out_invoice", "out_refund"]],
    ["state", "=", "posted"],
    ...domain,
  ];

  return client.searchRead<AccountMove>("account.move", invoiceDomain, {
    fields: options.fields || INVOICE_FIELDS,
    ...options,
  });
}

/**
 * Finds vendor bills (AP)
 */
export async function findVendorBills(
  domain: OdooDomain = [],
  options: SearchReadOptions = {}
): Promise<AccountMove[]> {
  const client = await getOdooClient();

  const billDomain: OdooDomain = [
    ["move_type", "in", ["in_invoice", "in_refund"]],
    ["state", "=", "posted"],
    ...domain,
  ];

  return client.searchRead<AccountMove>("account.move", billDomain, {
    fields: options.fields || INVOICE_FIELDS,
    ...options,
  });
}

/**
 * Finds open (unpaid) customer invoices
 */
export async function findOpenCustomerInvoices(
  options: SearchReadOptions = {}
): Promise<AccountMove[]> {
  return findCustomerInvoices(
    [["payment_state", "in", ["not_paid", "partial"]]],
    options
  );
}

/**
 * Finds open (unpaid) vendor bills
 */
export async function findOpenVendorBills(
  options: SearchReadOptions = {}
): Promise<AccountMove[]> {
  return findVendorBills(
    [["payment_state", "in", ["not_paid", "partial"]]],
    options
  );
}

/**
 * Finds overdue customer invoices
 */
export async function findOverdueCustomerInvoices(
  asOfDate?: string,
  options: SearchReadOptions = {}
): Promise<AccountMove[]> {
  const dateToCheck = asOfDate || new Date().toISOString().split("T")[0];

  return findCustomerInvoices(
    [
      ["payment_state", "in", ["not_paid", "partial"]],
      ["invoice_date_due", "<", dateToCheck],
    ],
    options
  );
}

/**
 * Finds overdue vendor bills
 */
export async function findOverdueVendorBills(
  asOfDate?: string,
  options: SearchReadOptions = {}
): Promise<AccountMove[]> {
  const dateToCheck = asOfDate || new Date().toISOString().split("T")[0];

  return findVendorBills(
    [
      ["payment_state", "in", ["not_paid", "partial"]],
      ["invoice_date_due", "<", dateToCheck],
    ],
    options
  );
}

/**
 * Finds invoices by partner (customer or vendor)
 */
export async function findInvoicesByPartner(
  partnerId: number,
  moveType: "customer" | "vendor" | "all" = "all",
  options: SearchReadOptions = {}
): Promise<AccountMove[]> {
  const client = await getOdooClient();

  const domain: OdooDomain = [
    ["partner_id", "=", partnerId],
    ["state", "=", "posted"],
  ];

  if (moveType === "customer") {
    domain.push(["move_type", "in", ["out_invoice", "out_refund"]]);
  } else if (moveType === "vendor") {
    domain.push(["move_type", "in", ["in_invoice", "in_refund"]]);
  } else {
    domain.push([
      "move_type",
      "in",
      ["out_invoice", "out_refund", "in_invoice", "in_refund"],
    ]);
  }

  return client.searchRead<AccountMove>("account.move", domain, {
    fields: options.fields || INVOICE_FIELDS,
    order: "invoice_date desc",
    ...options,
  });
}

/**
 * Gets invoice by ID
 */
export async function findInvoiceById(
  invoiceId: number
): Promise<AccountMove | null> {
  const client = await getOdooClient();
  const results = await client.read<AccountMove>("account.move", [invoiceId], {
    fields: INVOICE_FIELDS,
  });
  return results[0] || null;
}

// =============================================================================
// Payment Term Operations
// =============================================================================

/**
 * Finds all active payment terms
 */
export async function findPaymentTerms(
  options: SearchReadOptions = {}
): Promise<AccountPaymentTerm[]> {
  const client = await getOdooClient();

  return client.searchRead<AccountPaymentTerm>(
    "account.payment.term",
    [["active", "=", true]],
    {
      fields: options.fields || PAYMENT_TERM_FIELDS,
      order: "sequence, name",
      ...options,
    }
  );
}

/**
 * Gets payment term by ID
 */
export async function findPaymentTermById(
  paymentTermId: number
): Promise<AccountPaymentTerm | null> {
  const client = await getOdooClient();
  const results = await client.read<AccountPaymentTerm>(
    "account.payment.term",
    [paymentTermId],
    { fields: PAYMENT_TERM_FIELDS }
  );
  return results[0] || null;
}

// =============================================================================
// Payment Operations
// =============================================================================

/**
 * Finds payments matching criteria
 */
export async function findPayments(
  domain: OdooDomain = [],
  options: SearchReadOptions = {}
): Promise<AccountPayment[]> {
  const client = await getOdooClient();

  return client.searchRead<AccountPayment>("account.payment", domain, {
    fields: options.fields || [
      "id",
      "name",
      "payment_type",
      "partner_type",
      "partner_id",
      "amount",
      "currency_id",
      "date",
      "journal_id",
      "state",
      "ref",
      "is_reconciled",
    ],
    order: "date desc",
    ...options,
  });
}

/**
 * Finds payments for a specific partner
 */
export async function findPaymentsByPartner(
  partnerId: number,
  options: SearchReadOptions = {}
): Promise<AccountPayment[]> {
  return findPayments(
    [
      ["partner_id", "=", partnerId],
      ["state", "=", "posted"],
    ],
    options
  );
}

// =============================================================================
// Balance Calculations
// =============================================================================

/**
 * Calculates AR/AP balance for a specific partner
 */
export async function getPartnerBalance(
  partnerId: number
): Promise<AccountingBalance> {
  const client = await getOdooClient();

  // Get partner info
  const partners = await client.read<ResPartner>("res.partner", [partnerId], {
    fields: ["id", "name"],
  });

  const partnerName = partners[0]?.name || `Partner ${partnerId}`;

  // Get open customer invoices (AR)
  const customerInvoices = await findCustomerInvoices([
    ["partner_id", "=", partnerId],
    ["payment_state", "in", ["not_paid", "partial"]],
  ]);

  // Get open vendor bills (AP)
  const vendorBills = await findVendorBills([
    ["partner_id", "=", partnerId],
    ["payment_state", "in", ["not_paid", "partial"]],
  ]);

  // Calculate totals
  const totalReceivable = customerInvoices.reduce((sum, inv) => {
    const residual = inv.amount_residual ?? 0;
    // out_refund reduces receivable
    return inv.move_type === "out_refund" ? sum - residual : sum + residual;
  }, 0);

  const totalPayable = vendorBills.reduce((sum, inv) => {
    const residual = inv.amount_residual ?? 0;
    // in_refund reduces payable
    return inv.move_type === "in_refund" ? sum - residual : sum + residual;
  }, 0);

  // Calculate overdue amount
  const today = new Date().toISOString().split("T")[0];
  const overdueAmount = [...customerInvoices, ...vendorBills]
    .filter(
      (inv) => inv.invoice_date_due && inv.invoice_date_due < today
    )
    .reduce((sum, inv) => sum + (inv.amount_residual ?? 0), 0);

  // Get currency from first invoice or default
  const firstInvoice = customerInvoices[0] || vendorBills[0];
  const currency =
    firstInvoice?.currency_id && Array.isArray(firstInvoice.currency_id)
      ? firstInvoice.currency_id[1]
      : "USD";

  return {
    partnerId,
    partnerName,
    totalReceivable,
    totalPayable,
    openInvoicesCount: customerInvoices.length + vendorBills.length,
    overdueAmount,
    currency,
  };
}

/**
 * Gets AR balances for all customers with open invoices
 */
export async function getReceivablesBalances(
  options: SearchReadOptions = {}
): Promise<AccountingBalance[]> {
  // Get all open customer invoices
  const invoices = await findOpenCustomerInvoices(options);

  // Group by partner
  const partnerBalances = new Map<number, AccountingBalance>();

  const today = new Date().toISOString().split("T")[0];

  for (const inv of invoices) {
    if (!inv.partner_id || !Array.isArray(inv.partner_id)) continue;

    const [partnerId, partnerName] = inv.partner_id;
    const residual = inv.amount_residual ?? 0;
    const adjustedResidual = inv.move_type === "out_refund" ? -residual : residual;

    const currency =
      inv.currency_id && Array.isArray(inv.currency_id)
        ? inv.currency_id[1]
        : "USD";

    const existing = partnerBalances.get(partnerId);

    if (existing) {
      existing.totalReceivable += adjustedResidual;
      existing.openInvoicesCount += 1;
      if (inv.invoice_date_due && inv.invoice_date_due < today) {
        existing.overdueAmount += residual;
      }
    } else {
      const isOverdue = inv.invoice_date_due && inv.invoice_date_due < today;
      partnerBalances.set(partnerId, {
        partnerId,
        partnerName,
        totalReceivable: adjustedResidual,
        totalPayable: 0,
        openInvoicesCount: 1,
        overdueAmount: isOverdue ? residual : 0,
        currency,
      });
    }
  }

  return Array.from(partnerBalances.values()).sort(
    (a, b) => b.totalReceivable - a.totalReceivable
  );
}

/**
 * Gets AP balances for all vendors with open bills
 */
export async function getPayablesBalances(
  options: SearchReadOptions = {}
): Promise<AccountingBalance[]> {
  // Get all open vendor bills
  const bills = await findOpenVendorBills(options);

  // Group by partner
  const partnerBalances = new Map<number, AccountingBalance>();

  const today = new Date().toISOString().split("T")[0];

  for (const inv of bills) {
    if (!inv.partner_id || !Array.isArray(inv.partner_id)) continue;

    const [partnerId, partnerName] = inv.partner_id;
    const residual = inv.amount_residual ?? 0;
    const adjustedResidual = inv.move_type === "in_refund" ? -residual : residual;

    const currency =
      inv.currency_id && Array.isArray(inv.currency_id)
        ? inv.currency_id[1]
        : "USD";

    const existing = partnerBalances.get(partnerId);

    if (existing) {
      existing.totalPayable += adjustedResidual;
      existing.openInvoicesCount += 1;
      if (inv.invoice_date_due && inv.invoice_date_due < today) {
        existing.overdueAmount += residual;
      }
    } else {
      const isOverdue = inv.invoice_date_due && inv.invoice_date_due < today;
      partnerBalances.set(partnerId, {
        partnerId,
        partnerName,
        totalReceivable: 0,
        totalPayable: adjustedResidual,
        openInvoicesCount: 1,
        overdueAmount: isOverdue ? residual : 0,
        currency,
      });
    }
  }

  return Array.from(partnerBalances.values()).sort(
    (a, b) => b.totalPayable - a.totalPayable
  );
}

// =============================================================================
// Aging Reports
// =============================================================================

/**
 * Generates an aging report for receivables or payables
 */
export async function generateAgingReport(
  type: "receivable" | "payable",
  asOfDate?: string
): Promise<AgingReport> {
  const today = asOfDate || new Date().toISOString().split("T")[0];
  const asOfDateObj = new Date(today);

  // Get open invoices/bills
  const invoices =
    type === "receivable"
      ? await findOpenCustomerInvoices()
      : await findOpenVendorBills();

  // Group by partner and calculate aging buckets
  const partnerAging = new Map<number, AgingReportEntry>();

  for (const inv of invoices) {
    if (!inv.partner_id || !Array.isArray(inv.partner_id)) continue;

    const [partnerId, partnerName] = inv.partner_id;
    const residual = inv.amount_residual ?? 0;
    const isRefund =
      inv.move_type === "out_refund" || inv.move_type === "in_refund";
    const adjustedResidual = isRefund ? -residual : residual;

    // Calculate days overdue
    const dueDate = inv.invoice_date_due
      ? new Date(inv.invoice_date_due)
      : asOfDateObj;
    const daysOverdue = Math.floor(
      (asOfDateObj.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const currency =
      inv.currency_id && Array.isArray(inv.currency_id)
        ? inv.currency_id[1]
        : "USD";

    const existing = partnerAging.get(partnerId) || {
      partnerId,
      partnerName,
      current: 0,
      period1: 0,
      period2: 0,
      period3: 0,
      older: 0,
      total: 0,
      currency,
    };

    // Assign to appropriate bucket
    if (daysOverdue <= 0) {
      existing.current += adjustedResidual;
    } else if (daysOverdue <= 30) {
      existing.current += adjustedResidual;
    } else if (daysOverdue <= 60) {
      existing.period1 += adjustedResidual;
    } else if (daysOverdue <= 90) {
      existing.period2 += adjustedResidual;
    } else if (daysOverdue <= 120) {
      existing.period3 += adjustedResidual;
    } else {
      existing.older += adjustedResidual;
    }

    existing.total += adjustedResidual;
    partnerAging.set(partnerId, existing);
  }

  const entries = Array.from(partnerAging.values()).sort(
    (a, b) => b.total - a.total
  );

  // Calculate totals
  const totals = entries.reduce(
    (acc, entry) => ({
      current: acc.current + entry.current,
      period1: acc.period1 + entry.period1,
      period2: acc.period2 + entry.period2,
      period3: acc.period3 + entry.period3,
      older: acc.older + entry.older,
      total: acc.total + entry.total,
      currency: entry.currency || acc.currency,
    }),
    { current: 0, period1: 0, period2: 0, period3: 0, older: 0, total: 0, currency: "USD" }
  );

  return {
    type,
    asOfDate: today,
    entries,
    totals,
  };
}

// =============================================================================
// Invoice Summary
// =============================================================================

/**
 * Converts AccountMove to InvoiceSummary
 */
function toInvoiceSummary(inv: AccountMove): InvoiceSummary {
  const today = new Date();
  const dueDate = inv.invoice_date_due ? new Date(inv.invoice_date_due) : null;

  let daysOverdue: number | null = null;
  if (
    dueDate &&
    inv.payment_state !== "paid" &&
    inv.payment_state !== "reversed"
  ) {
    const diff = Math.floor(
      (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    daysOverdue = diff > 0 ? diff : null;
  }

  return {
    id: inv.id,
    name: inv.name,
    partnerId: Array.isArray(inv.partner_id) ? inv.partner_id[0] : 0,
    partnerName: Array.isArray(inv.partner_id) ? inv.partner_id[1] : "Unknown",
    invoiceDate: inv.invoice_date || null,
    dueDate: inv.invoice_date_due || null,
    amountTotal: inv.amount_total ?? 0,
    amountResidual: inv.amount_residual ?? 0,
    paymentState: inv.payment_state || "not_paid",
    state: inv.state || "draft",
    moveType: inv.move_type || "entry",
    daysOverdue,
    currency:
      inv.currency_id && Array.isArray(inv.currency_id)
        ? inv.currency_id[1]
        : "USD",
  };
}

/**
 * Gets invoice summaries with filtering and pagination
 */
export async function getInvoiceSummaries(options: {
  type?: "customer" | "vendor" | "all";
  status?: "open" | "paid" | "overdue" | "all";
  partnerId?: number;
  limit?: number;
  offset?: number;
}): Promise<{ invoices: InvoiceSummary[]; totalCount: number }> {
  const { type = "all", status = "all", partnerId, limit = 50, offset = 0 } = options;

  const domain: OdooDomain = [["state", "=", "posted"]];

  // Filter by type
  if (type === "customer") {
    domain.push(["move_type", "in", ["out_invoice", "out_refund"]]);
  } else if (type === "vendor") {
    domain.push(["move_type", "in", ["in_invoice", "in_refund"]]);
  } else {
    domain.push([
      "move_type",
      "in",
      ["out_invoice", "out_refund", "in_invoice", "in_refund"],
    ]);
  }

  // Filter by partner
  if (partnerId) {
    domain.push(["partner_id", "=", partnerId]);
  }

  // Filter by status
  const today = new Date().toISOString().split("T")[0];
  if (status === "open") {
    domain.push(["payment_state", "in", ["not_paid", "partial"]]);
  } else if (status === "paid") {
    domain.push(["payment_state", "=", "paid"]);
  } else if (status === "overdue") {
    domain.push(["payment_state", "in", ["not_paid", "partial"]]);
    domain.push(["invoice_date_due", "<", today]);
  }

  const client = await getOdooClient();

  // Get total count
  const totalCount = await client.searchCount("account.move", domain);

  // Get invoices
  const invoices = await client.searchRead<AccountMove>("account.move", domain, {
    fields: INVOICE_FIELDS,
    order: "invoice_date desc",
    limit,
    offset,
  });

  return {
    invoices: invoices.map(toInvoiceSummary),
    totalCount,
  };
}

// =============================================================================
// Financial Snapshot
// =============================================================================

/**
 * Generates a comprehensive financial snapshot for AIOM intelligence
 */
export async function getFinancialSnapshot(): Promise<FinancialSnapshot> {
  const today = new Date().toISOString().split("T")[0];

  // Get open invoices and bills
  const [openInvoices, openBills, overdueInvoices, overdueBills] =
    await Promise.all([
      findOpenCustomerInvoices(),
      findOpenVendorBills(),
      findOverdueCustomerInvoices(today),
      findOverdueVendorBills(today),
    ]);

  // Calculate totals
  const totalReceivables = openInvoices.reduce((sum, inv) => {
    const residual = inv.amount_residual ?? 0;
    return inv.move_type === "out_refund" ? sum - residual : sum + residual;
  }, 0);

  const totalPayables = openBills.reduce((sum, inv) => {
    const residual = inv.amount_residual ?? 0;
    return inv.move_type === "in_refund" ? sum - residual : sum + residual;
  }, 0);

  const overdueReceivables = overdueInvoices.reduce((sum, inv) => {
    const residual = inv.amount_residual ?? 0;
    return inv.move_type === "out_refund" ? sum - residual : sum + residual;
  }, 0);

  const overduePayables = overdueBills.reduce((sum, inv) => {
    const residual = inv.amount_residual ?? 0;
    return inv.move_type === "in_refund" ? sum - residual : sum + residual;
  }, 0);

  // Get top partners by receivables
  const receivablesByPartner = new Map<
    number,
    { id: number; name: string; amount: number }
  >();
  for (const inv of openInvoices) {
    if (!inv.partner_id || !Array.isArray(inv.partner_id)) continue;
    const [id, name] = inv.partner_id;
    const residual = inv.amount_residual ?? 0;
    const amount = inv.move_type === "out_refund" ? -residual : residual;
    const existing = receivablesByPartner.get(id);
    if (existing) {
      existing.amount += amount;
    } else {
      receivablesByPartner.set(id, { id, name, amount });
    }
  }

  // Get top partners by payables
  const payablesByPartner = new Map<
    number,
    { id: number; name: string; amount: number }
  >();
  for (const inv of openBills) {
    if (!inv.partner_id || !Array.isArray(inv.partner_id)) continue;
    const [id, name] = inv.partner_id;
    const residual = inv.amount_residual ?? 0;
    const amount = inv.move_type === "in_refund" ? -residual : residual;
    const existing = payablesByPartner.get(id);
    if (existing) {
      existing.amount += amount;
    } else {
      payablesByPartner.set(id, { id, name, amount });
    }
  }

  const topReceivablePartners = Array.from(receivablesByPartner.values())
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const topPayablePartners = Array.from(payablesByPartner.values())
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  // Determine currency from first invoice
  const firstInvoice = openInvoices[0] || openBills[0];
  const currency =
    firstInvoice?.currency_id && Array.isArray(firstInvoice.currency_id)
      ? firstInvoice.currency_id[1]
      : "USD";

  return {
    asOfDate: today,
    totalReceivables,
    totalPayables,
    netPosition: totalReceivables - totalPayables,
    overdueReceivables,
    overduePayables,
    openInvoicesCount: openInvoices.length,
    openBillsCount: openBills.length,
    averageDaysToPayReceivables: null, // Would require historical data
    averageDaysToPayPayables: null, // Would require historical data
    topReceivablePartners,
    topPayablePartners,
    currency,
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Counts invoices by type and status
 */
export async function countInvoices(options: {
  type?: "customer" | "vendor" | "all";
  status?: "open" | "paid" | "overdue" | "all";
}): Promise<number> {
  const { type = "all", status = "all" } = options;

  const domain: OdooDomain = [["state", "=", "posted"]];

  if (type === "customer") {
    domain.push(["move_type", "in", ["out_invoice", "out_refund"]]);
  } else if (type === "vendor") {
    domain.push(["move_type", "in", ["in_invoice", "in_refund"]]);
  } else {
    domain.push([
      "move_type",
      "in",
      ["out_invoice", "out_refund", "in_invoice", "in_refund"],
    ]);
  }

  const today = new Date().toISOString().split("T")[0];
  if (status === "open") {
    domain.push(["payment_state", "in", ["not_paid", "partial"]]);
  } else if (status === "paid") {
    domain.push(["payment_state", "=", "paid"]);
  } else if (status === "overdue") {
    domain.push(["payment_state", "in", ["not_paid", "partial"]]);
    domain.push(["invoice_date_due", "<", today]);
  }

  const client = await getOdooClient();
  return client.searchCount("account.move", domain);
}

/**
 * Gets total AR amount
 */
export async function getTotalReceivables(): Promise<number> {
  const invoices = await findOpenCustomerInvoices();
  return invoices.reduce((sum, inv) => {
    const residual = inv.amount_residual ?? 0;
    return inv.move_type === "out_refund" ? sum - residual : sum + residual;
  }, 0);
}

/**
 * Gets total AP amount
 */
export async function getTotalPayables(): Promise<number> {
  const bills = await findOpenVendorBills();
  return bills.reduce((sum, inv) => {
    const residual = inv.amount_residual ?? 0;
    return inv.move_type === "in_refund" ? sum - residual : sum + residual;
  }, 0);
}
