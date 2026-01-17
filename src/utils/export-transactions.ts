/**
 * Transaction Export Utilities
 *
 * Functions to export wallet transactions to various formats (CSV, PDF text).
 */

import { format } from "date-fns";
import type { WalletTransaction } from "~/db/schema";

// Currency formatting helper
function formatCurrency(
  amount: string | number,
  currency: string = "USD"
): string {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
  }).format(numAmount);
}

// Transaction type labels
const transactionTypeLabels: Record<string, string> = {
  deposit: "Deposit",
  withdrawal: "Withdrawal",
  transfer_in: "Received Transfer",
  transfer_out: "Sent Transfer",
  expense_disbursement: "Expense Disbursement",
  expense_refund: "Expense Refund",
  airtime_purchase: "Airtime Purchase",
  adjustment: "Balance Adjustment",
  fee: "Service Fee",
  reversal: "Transaction Reversal",
};

// Transaction status labels
const transactionStatusLabels: Record<string, string> = {
  completed: "Completed",
  pending: "Pending",
  processing: "Processing",
  failed: "Failed",
  reversed: "Reversed",
  cancelled: "Cancelled",
};

// Check if transaction is a credit
const isCreditTransaction = (type: string): boolean => {
  const creditTypes = [
    "deposit",
    "transfer_in",
    "expense_refund",
    "adjustment",
    "reversal",
  ];
  return creditTypes.includes(type);
};

/**
 * Export transactions to CSV format
 */
export function exportToCSV(transactions: WalletTransaction[]): string {
  // CSV Headers
  const headers = [
    "Transaction ID",
    "Date",
    "Type",
    "Status",
    "Direction",
    "Amount",
    "Fee",
    "Currency",
    "Description",
    "Reference",
    "Completed At",
    "Error Message",
    "Reversal Reason",
  ];

  // Build CSV rows
  const rows = transactions.map((tx) => {
    const isCredit = isCreditTransaction(tx.type);
    return [
      tx.id,
      format(new Date(tx.createdAt), "yyyy-MM-dd HH:mm:ss"),
      transactionTypeLabels[tx.type] || tx.type,
      transactionStatusLabels[tx.status] || tx.status,
      isCredit ? "Credit" : "Debit",
      `${isCredit ? "" : "-"}${tx.amount}`,
      tx.fee || "0",
      tx.currency,
      tx.description || "",
      tx.reference || "",
      tx.completedAt
        ? format(new Date(tx.completedAt), "yyyy-MM-dd HH:mm:ss")
        : "",
      tx.errorMessage || "",
      tx.reversalReason || "",
    ];
  });

  // Escape CSV values
  const escapeCSV = (value: string): string => {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  // Build CSV content
  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => escapeCSV(String(cell))).join(",")),
  ].join("\n");

  return csvContent;
}

/**
 * Download transactions as CSV file
 */
export function downloadTransactionsCSV(
  transactions: WalletTransaction[],
  filename?: string
): void {
  const csvContent = exportToCSV(transactions);
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download =
    filename || `transactions-${format(new Date(), "yyyy-MM-dd")}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate transaction summary statistics
 */
export function generateTransactionSummary(transactions: WalletTransaction[]): {
  totalCredits: number;
  totalDebits: number;
  netChange: number;
  totalFees: number;
  transactionCount: number;
  completedCount: number;
  pendingCount: number;
  failedCount: number;
  currency: string;
} {
  let totalCredits = 0;
  let totalDebits = 0;
  let totalFees = 0;
  let completedCount = 0;
  let pendingCount = 0;
  let failedCount = 0;
  const currency = transactions[0]?.currency || "USD";

  transactions.forEach((tx) => {
    const amount = parseFloat(tx.amount);
    const fee = parseFloat(tx.fee || "0");

    if (isCreditTransaction(tx.type)) {
      totalCredits += amount;
    } else {
      totalDebits += amount;
    }

    totalFees += fee;

    if (tx.status === "completed") completedCount++;
    else if (tx.status === "pending" || tx.status === "processing")
      pendingCount++;
    else if (tx.status === "failed" || tx.status === "cancelled")
      failedCount++;
  });

  return {
    totalCredits,
    totalDebits,
    netChange: totalCredits - totalDebits,
    totalFees,
    transactionCount: transactions.length,
    completedCount,
    pendingCount,
    failedCount,
    currency,
  };
}

/**
 * Export transactions to a printable text report
 */
export function exportToTextReport(
  transactions: WalletTransaction[],
  dateRange?: { from?: Date; to?: Date }
): string {
  const summary = generateTransactionSummary(transactions);

  const lines: string[] = [
    "═══════════════════════════════════════════════════════════════",
    "                    TRANSACTION REPORT                          ",
    "═══════════════════════════════════════════════════════════════",
    "",
    `Generated: ${format(new Date(), "PPpp")}`,
  ];

  if (dateRange?.from || dateRange?.to) {
    const fromStr = dateRange.from ? format(dateRange.from, "PP") : "All time";
    const toStr = dateRange.to ? format(dateRange.to, "PP") : "Present";
    lines.push(`Period: ${fromStr} - ${toStr}`);
  }

  lines.push(
    "",
    "───────────────────────────────────────────────────────────────",
    "                         SUMMARY                                ",
    "───────────────────────────────────────────────────────────────",
    "",
    `Total Transactions:  ${summary.transactionCount}`,
    `Completed:           ${summary.completedCount}`,
    `Pending:             ${summary.pendingCount}`,
    `Failed/Cancelled:    ${summary.failedCount}`,
    "",
    `Total Credits:       ${formatCurrency(summary.totalCredits, summary.currency)}`,
    `Total Debits:        ${formatCurrency(summary.totalDebits, summary.currency)}`,
    `Total Fees:          ${formatCurrency(summary.totalFees, summary.currency)}`,
    `Net Change:          ${formatCurrency(summary.netChange, summary.currency)}`,
    "",
    "───────────────────────────────────────────────────────────────",
    "                       TRANSACTIONS                              ",
    "───────────────────────────────────────────────────────────────",
    ""
  );

  transactions.forEach((tx, index) => {
    const isCredit = isCreditTransaction(tx.type);
    lines.push(
      `${index + 1}. ${transactionTypeLabels[tx.type] || tx.type}`,
      `   ID: ${tx.id}`,
      `   Date: ${format(new Date(tx.createdAt), "PPpp")}`,
      `   Amount: ${isCredit ? "+" : "-"}${formatCurrency(tx.amount, tx.currency)}`,
      `   Status: ${transactionStatusLabels[tx.status] || tx.status}`
    );

    if (tx.description) {
      lines.push(`   Description: ${tx.description}`);
    }

    if (tx.reference) {
      lines.push(`   Reference: ${tx.reference}`);
    }

    lines.push("");
  });

  lines.push(
    "═══════════════════════════════════════════════════════════════",
    "                      END OF REPORT                              ",
    "═══════════════════════════════════════════════════════════════"
  );

  return lines.join("\n");
}

/**
 * Download transactions as text report
 */
export function downloadTransactionsReport(
  transactions: WalletTransaction[],
  dateRange?: { from?: Date; to?: Date },
  filename?: string
): void {
  const content = exportToTextReport(transactions, dateRange);
  const blob = new Blob([content], { type: "text/plain;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download =
    filename || `transaction-report-${format(new Date(), "yyyy-MM-dd")}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
