/**
 * TransactionReceiptDialog Component
 *
 * A dialog component that displays detailed transaction information as a receipt.
 * Includes all transaction details, metadata, and print/download functionality.
 */

import * as React from "react";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCircle,
  XCircle,
  RotateCcw,
  RefreshCw,
  Receipt,
  Smartphone,
  Wallet,
  Download,
  Printer,
  Copy,
  Check,
  Calendar,
  Hash,
  FileText,
  CreditCard,
  AlertCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import type { WalletTransaction } from "~/db/schema";
import { format } from "date-fns";
import { toast } from "sonner";

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

// Transaction type configuration
const transactionTypeConfig: Record<
  string,
  {
    label: string;
    icon: React.ElementType;
    colorClass: string;
    bgClass: string;
    isCredit: boolean;
  }
> = {
  deposit: {
    label: "Deposit",
    icon: ArrowDownLeft,
    colorClass: "text-green-600 dark:text-green-400",
    bgClass: "bg-green-500/10",
    isCredit: true,
  },
  withdrawal: {
    label: "Withdrawal",
    icon: ArrowUpRight,
    colorClass: "text-red-600 dark:text-red-400",
    bgClass: "bg-red-500/10",
    isCredit: false,
  },
  transfer_in: {
    label: "Received Transfer",
    icon: ArrowDownLeft,
    colorClass: "text-green-600 dark:text-green-400",
    bgClass: "bg-green-500/10",
    isCredit: true,
  },
  transfer_out: {
    label: "Sent Transfer",
    icon: ArrowUpRight,
    colorClass: "text-red-600 dark:text-red-400",
    bgClass: "bg-red-500/10",
    isCredit: false,
  },
  expense_disbursement: {
    label: "Expense Disbursement",
    icon: Receipt,
    colorClass: "text-orange-600 dark:text-orange-400",
    bgClass: "bg-orange-500/10",
    isCredit: false,
  },
  expense_refund: {
    label: "Expense Refund",
    icon: RotateCcw,
    colorClass: "text-green-600 dark:text-green-400",
    bgClass: "bg-green-500/10",
    isCredit: true,
  },
  airtime_purchase: {
    label: "Airtime Purchase",
    icon: Smartphone,
    colorClass: "text-purple-600 dark:text-purple-400",
    bgClass: "bg-purple-500/10",
    isCredit: false,
  },
  adjustment: {
    label: "Balance Adjustment",
    icon: RefreshCw,
    colorClass: "text-blue-600 dark:text-blue-400",
    bgClass: "bg-blue-500/10",
    isCredit: true,
  },
  fee: {
    label: "Service Fee",
    icon: Wallet,
    colorClass: "text-gray-600 dark:text-gray-400",
    bgClass: "bg-gray-500/10",
    isCredit: false,
  },
  reversal: {
    label: "Transaction Reversal",
    icon: RotateCcw,
    colorClass: "text-amber-600 dark:text-amber-400",
    bgClass: "bg-amber-500/10",
    isCredit: true,
  },
};

// Status configuration with descriptions
const statusConfig: Record<
  string,
  {
    icon: React.ElementType;
    colorClass: string;
    bgClass: string;
    label: string;
    description: string;
  }
> = {
  completed: {
    icon: CheckCircle,
    colorClass: "text-green-600 dark:text-green-400",
    bgClass: "bg-green-500/10",
    label: "Completed",
    description: "Transaction has been successfully processed",
  },
  pending: {
    icon: Clock,
    colorClass: "text-amber-600 dark:text-amber-400",
    bgClass: "bg-amber-500/10",
    label: "Pending",
    description: "Transaction is awaiting processing",
  },
  processing: {
    icon: RefreshCw,
    colorClass: "text-blue-600 dark:text-blue-400",
    bgClass: "bg-blue-500/10",
    label: "Processing",
    description: "Transaction is currently being processed",
  },
  failed: {
    icon: XCircle,
    colorClass: "text-red-600 dark:text-red-400",
    bgClass: "bg-red-500/10",
    label: "Failed",
    description: "Transaction could not be completed",
  },
  reversed: {
    icon: RotateCcw,
    colorClass: "text-amber-600 dark:text-amber-400",
    bgClass: "bg-amber-500/10",
    label: "Reversed",
    description: "Transaction has been reversed",
  },
  cancelled: {
    icon: XCircle,
    colorClass: "text-gray-600 dark:text-gray-400",
    bgClass: "bg-gray-500/10",
    label: "Cancelled",
    description: "Transaction was cancelled",
  },
};

interface TransactionReceiptDialogProps {
  transaction: WalletTransaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DetailRowProps {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  className?: string;
}

function DetailRow({ icon: Icon, label, value, className }: DetailRowProps) {
  return (
    <div className={cn("flex items-start gap-3 py-2", className)}>
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium break-words">{value}</p>
      </div>
    </div>
  );
}

export function TransactionReceiptDialog({
  transaction,
  open,
  onOpenChange,
}: TransactionReceiptDialogProps) {
  const [copied, setCopied] = React.useState(false);

  if (!transaction) return null;

  const typeConfig = transactionTypeConfig[transaction.type] ?? {
    label: transaction.type,
    icon: Wallet,
    colorClass: "text-gray-600",
    bgClass: "bg-gray-500/10",
    isCredit: false,
  };

  const statusConf = statusConfig[transaction.status] ?? {
    icon: Clock,
    colorClass: "text-gray-500",
    bgClass: "bg-gray-500/10",
    label: transaction.status,
    description: "",
  };

  const TypeIcon = typeConfig.icon;
  const StatusIcon = statusConf.icon;
  const isCredit = typeConfig.isCredit;

  // Copy transaction ID to clipboard
  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(transaction.id);
      setCopied(true);
      toast.success("Transaction ID copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy transaction ID");
    }
  };

  // Generate receipt text for printing/download
  const generateReceiptText = () => {
    const lines = [
      "================================",
      "       TRANSACTION RECEIPT       ",
      "================================",
      "",
      `Transaction ID: ${transaction.id}`,
      `Date: ${format(new Date(transaction.createdAt), "PPpp")}`,
      "",
      `Type: ${typeConfig.label}`,
      `Status: ${statusConf.label}`,
      "",
      `Amount: ${isCredit ? "+" : "-"}${formatCurrency(transaction.amount, transaction.currency)}`,
    ];

    if (transaction.fee && parseFloat(transaction.fee) > 0) {
      lines.push(`Fee: ${formatCurrency(transaction.fee, transaction.currency)}`);
    }

    if (transaction.description) {
      lines.push("", `Description: ${transaction.description}`);
    }

    if (transaction.reference) {
      lines.push(`Reference: ${transaction.reference}`);
    }

    if (transaction.completedAt) {
      lines.push("", `Completed: ${format(new Date(transaction.completedAt), "PPpp")}`);
    }

    if (transaction.errorMessage) {
      lines.push("", `Error: ${transaction.errorMessage}`);
    }

    if (transaction.reversalReason) {
      lines.push("", `Reversal Reason: ${transaction.reversalReason}`);
    }

    lines.push("", "================================");

    return lines.join("\n");
  };

  // Handle print
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Unable to open print window. Please check your popup blocker.");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Transaction Receipt - ${transaction.id}</title>
          <style>
            body {
              font-family: 'Courier New', monospace;
              padding: 20px;
              max-width: 400px;
              margin: 0 auto;
            }
            h1 { font-size: 14px; text-align: center; margin-bottom: 20px; }
            .section { margin: 15px 0; }
            .row { display: flex; justify-content: space-between; margin: 5px 0; }
            .label { color: #666; }
            .value { font-weight: bold; text-align: right; }
            .divider { border-top: 1px dashed #ccc; margin: 15px 0; }
            .amount { font-size: 18px; text-align: center; margin: 20px 0; }
            .credit { color: green; }
            .debit { color: #333; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <h1>TRANSACTION RECEIPT</h1>
          <div class="divider"></div>
          <div class="section">
            <div class="row"><span class="label">Transaction ID:</span></div>
            <div class="value" style="font-size: 10px; word-break: break-all;">${transaction.id}</div>
          </div>
          <div class="row">
            <span class="label">Date:</span>
            <span class="value">${format(new Date(transaction.createdAt), "PP")}</span>
          </div>
          <div class="row">
            <span class="label">Time:</span>
            <span class="value">${format(new Date(transaction.createdAt), "p")}</span>
          </div>
          <div class="divider"></div>
          <div class="row">
            <span class="label">Type:</span>
            <span class="value">${typeConfig.label}</span>
          </div>
          <div class="row">
            <span class="label">Status:</span>
            <span class="value">${statusConf.label}</span>
          </div>
          <div class="divider"></div>
          <div class="amount ${isCredit ? "credit" : "debit"}">
            ${isCredit ? "+" : "-"}${formatCurrency(transaction.amount, transaction.currency)}
          </div>
          ${transaction.fee && parseFloat(transaction.fee) > 0 ? `
            <div class="row">
              <span class="label">Fee:</span>
              <span class="value">${formatCurrency(transaction.fee, transaction.currency)}</span>
            </div>
          ` : ""}
          ${transaction.description ? `
            <div class="divider"></div>
            <div class="section">
              <div class="label">Description:</div>
              <div>${transaction.description}</div>
            </div>
          ` : ""}
          ${transaction.reference ? `
            <div class="row">
              <span class="label">Reference:</span>
              <span class="value">${transaction.reference}</span>
            </div>
          ` : ""}
          <div class="divider"></div>
          <div style="text-align: center; font-size: 10px; color: #999;">
            Thank you for using our service
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  // Handle download as text file
  const handleDownload = () => {
    const content = generateReceiptText();
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `receipt-${transaction.id.slice(0, 8)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Receipt downloaded");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        data-testid="transaction-receipt-dialog"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className={cn("p-2 rounded-full shrink-0", typeConfig.bgClass)}>
              <TypeIcon className={cn("h-4 w-4", typeConfig.colorClass)} />
            </div>
            <span>Transaction Receipt</span>
          </DialogTitle>
          <DialogDescription>
            View detailed information about this transaction
          </DialogDescription>
        </DialogHeader>

        {/* Amount Display */}
        <div className="text-center py-4 border-b">
          <p
            className={cn(
              "text-3xl font-bold",
              isCredit ? "text-green-600 dark:text-green-400" : "text-foreground"
            )}
            data-testid="receipt-amount"
          >
            {isCredit ? "+" : "-"}
            {formatCurrency(transaction.amount, transaction.currency)}
          </p>
          <p className="text-sm text-muted-foreground mt-1">{typeConfig.label}</p>
        </div>

        {/* Status Badge */}
        <div className="flex items-center justify-center gap-2 py-2">
          <Badge
            variant="outline"
            className={cn("gap-1.5", statusConf.bgClass)}
            data-testid="receipt-status"
          >
            <StatusIcon className={cn("h-3 w-3", statusConf.colorClass)} />
            {statusConf.label}
          </Badge>
        </div>

        {/* Transaction Details */}
        <div className="space-y-1 border rounded-lg p-3 bg-muted/30">
          <DetailRow
            icon={Hash}
            label="Transaction ID"
            value={
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs truncate">{transaction.id}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={handleCopyId}
                  data-testid="copy-transaction-id"
                >
                  {copied ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
            }
          />

          <DetailRow
            icon={Calendar}
            label="Date & Time"
            value={format(new Date(transaction.createdAt), "PPpp")}
          />

          {transaction.fee && parseFloat(transaction.fee) > 0 && (
            <DetailRow
              icon={CreditCard}
              label="Transaction Fee"
              value={formatCurrency(transaction.fee, transaction.currency)}
            />
          )}

          {transaction.description && (
            <DetailRow
              icon={FileText}
              label="Description"
              value={transaction.description}
            />
          )}

          {transaction.reference && (
            <DetailRow
              icon={Hash}
              label="Reference"
              value={transaction.reference}
            />
          )}

          {transaction.completedAt && (
            <DetailRow
              icon={CheckCircle}
              label="Completed At"
              value={format(new Date(transaction.completedAt), "PPpp")}
            />
          )}

          {transaction.errorMessage && (
            <DetailRow
              icon={AlertCircle}
              label="Error"
              value={
                <span className="text-red-500">{transaction.errorMessage}</span>
              }
            />
          )}

          {transaction.reversalReason && (
            <DetailRow
              icon={RotateCcw}
              label="Reversal Reason"
              value={transaction.reversalReason}
            />
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={handlePrint}
            data-testid="print-receipt"
          >
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={handleDownload}
            data-testid="download-receipt"
          >
            <Download className="h-4 w-4" />
            Download
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
