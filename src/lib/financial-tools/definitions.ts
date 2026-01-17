/**
 * Financial Operation Tools
 *
 * Tools for querying balances, payment status, aging reports, and initiating payment workflows.
 * Provides conversational access to financial data through Claude.
 */

import type { ToolDefinition, ToolResult } from "../tool-registry";
import { createSummaryFormatter, createTableFormatter } from "../tool-registry";
import {
  getFinancialSnapshot,
  getPartnerBalance,
  getReceivablesBalances,
  getPayablesBalances,
  generateAgingReport,
  getInvoiceSummaries,
  findPayments,
  findPaymentsByPartner,
  findInvoiceById,
  countInvoices,
  getTotalReceivables,
  getTotalPayables,
} from "~/data-access/accounting";
import type {
  FinancialSnapshot,
  AccountingBalance,
  AgingReport,
  InvoiceSummary,
  AccountPayment,
} from "~/lib/odoo";

// =============================================================================
// Type Definitions for Tool Inputs/Outputs
// =============================================================================

interface GetFinancialSnapshotInput {
  // No input required - returns current snapshot
}

interface GetPartnerBalanceInput {
  partnerId: number;
}

interface GetBalancesInput {
  type: "receivables" | "payables";
  limit?: number;
}

interface GetAgingReportInput {
  type: "receivable" | "payable";
  asOfDate?: string;
}

interface GetInvoicesInput {
  type?: "customer" | "vendor" | "all";
  status?: "open" | "paid" | "overdue" | "all";
  partnerId?: number;
  limit?: number;
  offset?: number;
}

interface GetInvoiceByIdInput {
  invoiceId: number;
}

interface GetPaymentsInput {
  partnerId?: number;
  limit?: number;
}

interface GetInvoiceCountInput {
  type?: "customer" | "vendor" | "all";
  status?: "open" | "paid" | "overdue" | "all";
}

interface GetTotalsInput {
  type: "receivables" | "payables" | "both";
}

// =============================================================================
// Financial Snapshot Tool
// =============================================================================

export const getFinancialSnapshotTool: ToolDefinition<
  GetFinancialSnapshotInput,
  FinancialSnapshot
> = {
  id: "financial-snapshot",
  name: "Financial Snapshot",
  description:
    "Get a comprehensive financial snapshot including total receivables, payables, net position, overdue amounts, and top partners. Use this tool when you need an overview of the company's financial position or to answer questions about overall AR/AP status.",
  version: "1.0.0",
  category: "data",
  permission: "user",
  enabled: true,
  tags: ["finance", "accounting", "ar", "ap", "balance", "overview"],
  inputSchema: {
    type: "object",
    properties: {},
  },
  handler: async (input, context): Promise<ToolResult<FinancialSnapshot>> => {
    try {
      const snapshot = await getFinancialSnapshot();
      return {
        success: true,
        data: snapshot,
        metadata: {
          executionTimeMs: 0,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "FINANCIAL_SNAPSHOT_ERROR",
          message: error instanceof Error ? error.message : "Failed to get financial snapshot",
          retryable: true,
        },
      };
    }
  },
  formatter: createSummaryFormatter<FinancialSnapshot>([
    { key: "asOfDate", label: "As of Date" },
    { key: "totalReceivables", label: "Total Receivables" },
    { key: "totalPayables", label: "Total Payables" },
    { key: "netPosition", label: "Net Position" },
    { key: "overdueReceivables", label: "Overdue Receivables" },
    { key: "overduePayables", label: "Overdue Payables" },
    { key: "openInvoicesCount", label: "Open Invoices" },
    { key: "openBillsCount", label: "Open Bills" },
    { key: "currency", label: "Currency" },
  ]),
};

// =============================================================================
// Partner Balance Tool
// =============================================================================

export const getPartnerBalanceTool: ToolDefinition<
  GetPartnerBalanceInput,
  AccountingBalance
> = {
  id: "partner-balance",
  name: "Partner Balance",
  description:
    "Get the accounts receivable and payable balance for a specific partner (customer or vendor). Use this when asked about what a specific customer owes or what is owed to a vendor.",
  version: "1.0.0",
  category: "data",
  permission: "user",
  enabled: true,
  tags: ["finance", "accounting", "partner", "balance", "ar", "ap"],
  inputSchema: {
    type: "object",
    properties: {
      partnerId: {
        type: "integer",
        description: "The Odoo partner ID to get balance for",
      },
    },
    required: ["partnerId"],
  },
  handler: async (input, context): Promise<ToolResult<AccountingBalance>> => {
    try {
      const balance = await getPartnerBalance(input.partnerId);
      return {
        success: true,
        data: balance,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "PARTNER_BALANCE_ERROR",
          message: error instanceof Error ? error.message : "Failed to get partner balance",
          retryable: true,
        },
      };
    }
  },
  formatter: createSummaryFormatter<AccountingBalance>([
    { key: "partnerName", label: "Partner" },
    { key: "totalReceivable", label: "Accounts Receivable" },
    { key: "totalPayable", label: "Accounts Payable" },
    { key: "openInvoicesCount", label: "Open Invoices" },
    { key: "overdueAmount", label: "Overdue Amount" },
    { key: "currency", label: "Currency" },
  ]),
};

// =============================================================================
// Balances List Tool
// =============================================================================

export const getBalancesTool: ToolDefinition<
  GetBalancesInput,
  { balances: AccountingBalance[]; type: string }
> = {
  id: "balances-list",
  name: "Balances List",
  description:
    "Get a list of all customer receivables or vendor payables balances. Use this when asked for a list of what customers owe (receivables) or what is owed to vendors (payables).",
  version: "1.0.0",
  category: "data",
  permission: "user",
  enabled: true,
  tags: ["finance", "accounting", "balance", "ar", "ap", "list"],
  inputSchema: {
    type: "object",
    properties: {
      type: {
        type: "string",
        description: "Type of balances to retrieve: 'receivables' for customer AR or 'payables' for vendor AP",
        enum: ["receivables", "payables"],
      },
      limit: {
        type: "integer",
        description: "Maximum number of results to return (default 100)",
        default: 100,
        minimum: 1,
        maximum: 500,
      },
    },
    required: ["type"],
  },
  handler: async (
    input,
    context
  ): Promise<ToolResult<{ balances: AccountingBalance[]; type: string }>> => {
    try {
      const limit = input.limit ?? 100;
      const balances =
        input.type === "receivables"
          ? await getReceivablesBalances({ limit })
          : await getPayablesBalances({ limit });

      return {
        success: true,
        data: {
          balances,
          type: input.type,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "BALANCES_LIST_ERROR",
          message: error instanceof Error ? error.message : "Failed to get balances list",
          retryable: true,
        },
      };
    }
  },
};

// =============================================================================
// Aging Report Tool
// =============================================================================

export const getAgingReportTool: ToolDefinition<GetAgingReportInput, AgingReport> = {
  id: "aging-report",
  name: "Aging Report",
  description:
    "Generate an aging report for receivables or payables. Shows amounts grouped by aging buckets (current, 1-30 days, 31-60 days, 61-90 days, 91-120 days, 120+ days). Use this for analyzing overdue invoices/bills and collections priorities.",
  version: "1.0.0",
  category: "analysis",
  permission: "user",
  enabled: true,
  tags: ["finance", "accounting", "aging", "report", "ar", "ap", "overdue"],
  inputSchema: {
    type: "object",
    properties: {
      type: {
        type: "string",
        description: "Type of aging report: 'receivable' for customer AR or 'payable' for vendor AP",
        enum: ["receivable", "payable"],
      },
      asOfDate: {
        type: "string",
        description: "Date to calculate aging as of (YYYY-MM-DD format). Defaults to today.",
      },
    },
    required: ["type"],
  },
  handler: async (input, context): Promise<ToolResult<AgingReport>> => {
    try {
      const report = await generateAgingReport(input.type, input.asOfDate);
      return {
        success: true,
        data: report,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "AGING_REPORT_ERROR",
          message: error instanceof Error ? error.message : "Failed to generate aging report",
          retryable: true,
        },
      };
    }
  },
};

// =============================================================================
// Invoice List Tool
// =============================================================================

export const getInvoicesTool: ToolDefinition<
  GetInvoicesInput,
  { invoices: InvoiceSummary[]; totalCount: number }
> = {
  id: "invoices-list",
  name: "Invoices List",
  description:
    "Get a list of invoices and bills with filtering options. Use this to find specific invoices, check invoice status, or list open/overdue invoices.",
  version: "1.0.0",
  category: "data",
  permission: "user",
  enabled: true,
  tags: ["finance", "accounting", "invoice", "bill", "list"],
  inputSchema: {
    type: "object",
    properties: {
      type: {
        type: "string",
        description: "Filter by type: 'customer' for sales invoices, 'vendor' for purchase bills, 'all' for both",
        enum: ["customer", "vendor", "all"],
        default: "all",
      },
      status: {
        type: "string",
        description: "Filter by status: 'open' for unpaid, 'paid' for fully paid, 'overdue' for past due date, 'all' for any status",
        enum: ["open", "paid", "overdue", "all"],
        default: "all",
      },
      partnerId: {
        type: "integer",
        description: "Filter by partner ID to get invoices for a specific customer or vendor",
      },
      limit: {
        type: "integer",
        description: "Maximum number of invoices to return (default 50)",
        default: 50,
        minimum: 1,
        maximum: 200,
      },
      offset: {
        type: "integer",
        description: "Number of invoices to skip for pagination (default 0)",
        default: 0,
        minimum: 0,
      },
    },
  },
  handler: async (
    input,
    context
  ): Promise<ToolResult<{ invoices: InvoiceSummary[]; totalCount: number }>> => {
    try {
      const result = await getInvoiceSummaries({
        type: input.type,
        status: input.status,
        partnerId: input.partnerId,
        limit: input.limit ?? 50,
        offset: input.offset ?? 0,
      });
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "INVOICES_LIST_ERROR",
          message: error instanceof Error ? error.message : "Failed to get invoices list",
          retryable: true,
        },
      };
    }
  },
};

// =============================================================================
// Invoice Detail Tool
// =============================================================================

export const getInvoiceByIdTool: ToolDefinition<
  GetInvoiceByIdInput,
  { invoice: Record<string, unknown> | null }
> = {
  id: "invoice-detail",
  name: "Invoice Detail",
  description:
    "Get detailed information about a specific invoice or bill by its ID. Use this when you need full details about a particular invoice.",
  version: "1.0.0",
  category: "data",
  permission: "user",
  enabled: true,
  tags: ["finance", "accounting", "invoice", "detail"],
  inputSchema: {
    type: "object",
    properties: {
      invoiceId: {
        type: "integer",
        description: "The Odoo invoice/bill ID to retrieve",
      },
    },
    required: ["invoiceId"],
  },
  handler: async (
    input,
    context
  ): Promise<ToolResult<{ invoice: Record<string, unknown> | null }>> => {
    try {
      const invoice = await findInvoiceById(input.invoiceId);
      if (!invoice) {
        return {
          success: false,
          error: {
            code: "INVOICE_NOT_FOUND",
            message: `Invoice with ID ${input.invoiceId} not found`,
            retryable: false,
          },
        };
      }
      return {
        success: true,
        data: { invoice: invoice as unknown as Record<string, unknown> },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "INVOICE_DETAIL_ERROR",
          message: error instanceof Error ? error.message : "Failed to get invoice details",
          retryable: true,
        },
      };
    }
  },
};

// =============================================================================
// Payments List Tool
// =============================================================================

export const getPaymentsTool: ToolDefinition<
  GetPaymentsInput,
  { payments: AccountPayment[] }
> = {
  id: "payments-list",
  name: "Payments List",
  description:
    "Get a list of payments. Can be filtered by partner to see payment history for a specific customer or vendor. Use this to check payment status or review payment history.",
  version: "1.0.0",
  category: "data",
  permission: "user",
  enabled: true,
  tags: ["finance", "accounting", "payment", "history"],
  inputSchema: {
    type: "object",
    properties: {
      partnerId: {
        type: "integer",
        description: "Filter payments by partner ID. If not provided, returns all recent payments.",
      },
      limit: {
        type: "integer",
        description: "Maximum number of payments to return (default 50)",
        default: 50,
        minimum: 1,
        maximum: 200,
      },
    },
  },
  handler: async (
    input,
    context
  ): Promise<ToolResult<{ payments: AccountPayment[] }>> => {
    try {
      const limit = input.limit ?? 50;
      let payments: AccountPayment[];

      if (input.partnerId) {
        payments = await findPaymentsByPartner(input.partnerId, { limit });
      } else {
        payments = await findPayments([["state", "=", "posted"]], { limit });
      }

      return {
        success: true,
        data: { payments },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "PAYMENTS_LIST_ERROR",
          message: error instanceof Error ? error.message : "Failed to get payments list",
          retryable: true,
        },
      };
    }
  },
};

// =============================================================================
// Invoice Count Tool
// =============================================================================

export const getInvoiceCountTool: ToolDefinition<
  GetInvoiceCountInput,
  { count: number; type: string; status: string }
> = {
  id: "invoice-count",
  name: "Invoice Count",
  description:
    "Get the count of invoices or bills by type and status. Use this for quick summaries like 'how many open invoices' or 'number of overdue bills'.",
  version: "1.0.0",
  category: "data",
  permission: "user",
  enabled: true,
  tags: ["finance", "accounting", "invoice", "count", "summary"],
  inputSchema: {
    type: "object",
    properties: {
      type: {
        type: "string",
        description: "Type of invoices to count: 'customer' for sales invoices, 'vendor' for purchase bills, 'all' for both",
        enum: ["customer", "vendor", "all"],
        default: "all",
      },
      status: {
        type: "string",
        description: "Status filter: 'open' for unpaid, 'paid' for fully paid, 'overdue' for past due, 'all' for any",
        enum: ["open", "paid", "overdue", "all"],
        default: "all",
      },
    },
  },
  handler: async (
    input,
    context
  ): Promise<ToolResult<{ count: number; type: string; status: string }>> => {
    try {
      const type = input.type ?? "all";
      const status = input.status ?? "all";
      const count = await countInvoices({ type, status });
      return {
        success: true,
        data: { count, type, status },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "INVOICE_COUNT_ERROR",
          message: error instanceof Error ? error.message : "Failed to count invoices",
          retryable: true,
        },
      };
    }
  },
};

// =============================================================================
// Financial Totals Tool
// =============================================================================

export const getFinancialTotalsTool: ToolDefinition<
  GetTotalsInput,
  { totalReceivables?: number; totalPayables?: number; netPosition?: number; currency: string }
> = {
  id: "financial-totals",
  name: "Financial Totals",
  description:
    "Get total receivables, payables, or both with net position. Use this for quick answers about total amounts owed to or by the company.",
  version: "1.0.0",
  category: "data",
  permission: "user",
  enabled: true,
  tags: ["finance", "accounting", "totals", "ar", "ap"],
  inputSchema: {
    type: "object",
    properties: {
      type: {
        type: "string",
        description: "What to calculate: 'receivables' for total AR, 'payables' for total AP, 'both' for AR, AP and net position",
        enum: ["receivables", "payables", "both"],
      },
    },
    required: ["type"],
  },
  handler: async (
    input,
    context
  ): Promise<ToolResult<{ totalReceivables?: number; totalPayables?: number; netPosition?: number; currency: string }>> => {
    try {
      let totalReceivables: number | undefined;
      let totalPayables: number | undefined;
      let netPosition: number | undefined;

      if (input.type === "receivables" || input.type === "both") {
        totalReceivables = await getTotalReceivables();
      }
      if (input.type === "payables" || input.type === "both") {
        totalPayables = await getTotalPayables();
      }
      if (input.type === "both" && totalReceivables !== undefined && totalPayables !== undefined) {
        netPosition = totalReceivables - totalPayables;
      }

      return {
        success: true,
        data: {
          totalReceivables,
          totalPayables,
          netPosition,
          currency: "USD", // Default currency
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "FINANCIAL_TOTALS_ERROR",
          message: error instanceof Error ? error.message : "Failed to get financial totals",
          retryable: true,
        },
      };
    }
  },
};

// =============================================================================
// Export All Tools
// =============================================================================

export const financialTools = [
  getFinancialSnapshotTool,
  getPartnerBalanceTool,
  getBalancesTool,
  getAgingReportTool,
  getInvoicesTool,
  getInvoiceByIdTool,
  getPaymentsTool,
  getInvoiceCountTool,
  getFinancialTotalsTool,
];

/**
 * Get count of financial tools
 */
export function getFinancialToolCount(): number {
  return financialTools.length;
}
