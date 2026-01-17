import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link2, CheckCircle, AlertTriangle, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import type { ReconciliationMatch, ExpenseVoucherWithUser, ExpenseRequestWithUser } from "~/data-access/expense-reconciliation";

// Schema for reconciliation form
const reconcileFormSchema = z.object({
  reference: z.string().min(1, "Reconciliation reference is required"),
  notes: z.string().optional(),
});

type ReconcileFormData = z.infer<typeof reconcileFormSchema>;

// Schema for discrepancy form
const discrepancyFormSchema = z.object({
  notes: z.string().min(1, "Please describe the discrepancy"),
});

type DiscrepancyFormData = z.infer<typeof discrepancyFormSchema>;

// Schema for manual link form
const linkFormSchema = z.object({
  searchQuery: z.string().optional(),
});

type LinkFormData = z.infer<typeof linkFormSchema>;

// Reconcile Dialog
interface ReconcileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  match: ReconciliationMatch | null;
  onConfirm: (data: ReconcileFormData) => void;
  isLoading?: boolean;
}

export function ReconcileDialog({
  open,
  onOpenChange,
  match,
  onConfirm,
  isLoading,
}: ReconcileDialogProps) {
  const form = useForm<ReconcileFormData>({
    resolver: zodResolver(reconcileFormSchema),
    defaultValues: {
      reference: "",
      notes: "",
    },
  });

  const handleSubmit = (data: ReconcileFormData) => {
    onConfirm(data);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Reconcile Expense
          </DialogTitle>
          <DialogDescription>
            Mark this matched expense as reconciled. This confirms that the expense
            request and voucher have been verified and match.
          </DialogDescription>
        </DialogHeader>

        {match && (
          <div className="p-3 rounded-lg bg-muted/50 border text-sm">
            <div className="flex justify-between mb-2">
              <span className="text-muted-foreground">Voucher</span>
              <span className="font-mono">{match.expenseVoucher.voucherNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-semibold">
                {match.expenseVoucher.currency} {parseFloat(match.expenseVoucher.amount).toLocaleString()}
              </span>
            </div>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="reference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reconciliation Reference *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Bank statement ref, journal entry #"
                      data-testid="reconciliation-reference-input"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes about the reconciliation..."
                      className="resize-none"
                      rows={3}
                      data-testid="reconciliation-notes-input"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} data-testid="confirm-reconcile-button">
                {isLoading ? "Reconciling..." : "Confirm Reconciliation"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Mark Discrepancy Dialog
interface MarkDiscrepancyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  match: ReconciliationMatch | null;
  onConfirm: (data: DiscrepancyFormData) => void;
  isLoading?: boolean;
}

export function MarkDiscrepancyDialog({
  open,
  onOpenChange,
  match,
  onConfirm,
  isLoading,
}: MarkDiscrepancyDialogProps) {
  const form = useForm<DiscrepancyFormData>({
    resolver: zodResolver(discrepancyFormSchema),
    defaultValues: {
      notes: "",
    },
  });

  const handleSubmit = (data: DiscrepancyFormData) => {
    onConfirm(data);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Flag Discrepancy
          </DialogTitle>
          <DialogDescription>
            Flag this matched expense as having discrepancies that need to be
            resolved before reconciliation.
          </DialogDescription>
        </DialogHeader>

        {match && match.discrepancies.length > 0 && (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
            <h4 className="text-sm font-medium text-amber-800 mb-2">
              Detected Discrepancies
            </h4>
            <ul className="space-y-1 text-sm text-amber-700">
              {match.discrepancies.map((d, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                  {d.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Describe the Issue *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the discrepancy and any action needed..."
                      className="resize-none"
                      rows={4}
                      data-testid="discrepancy-notes-input"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={isLoading}
                data-testid="confirm-discrepancy-button"
              >
                {isLoading ? "Flagging..." : "Flag Discrepancy"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Manual Link Dialog - For linking unmatched items
interface ManualLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceType: "request" | "voucher";
  sourceItem: ExpenseRequestWithUser | ExpenseVoucherWithUser | null;
  suggestions: (ExpenseVoucherWithUser | ExpenseRequestWithUser)[];
  onLink: (targetId: string) => void;
  isLoading?: boolean;
}

export function ManualLinkDialog({
  open,
  onOpenChange,
  sourceType,
  sourceItem,
  suggestions,
  onLink,
  isLoading,
}: ManualLinkDialogProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const handleConfirm = () => {
    if (selectedId) {
      onLink(selectedId);
      setSelectedId(null);
      setSearchQuery("");
    }
  };

  const formatCurrency = (amount: string, currency: string) => {
    const symbols: Record<string, string> = {
      USD: "$",
      EUR: "€",
      GBP: "£",
      CAD: "C$",
      AUD: "A$",
    };
    return `${symbols[currency] || currency}${parseFloat(amount).toLocaleString()}`;
  };

  const filteredSuggestions = suggestions.filter((item) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    if ("voucherNumber" in item) {
      return (
        item.voucherNumber.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query)
      );
    }
    return item.purpose.toLowerCase().includes(query);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Link {sourceType === "request" ? "Expense Request" : "Voucher"}
          </DialogTitle>
          <DialogDescription>
            Select a {sourceType === "request" ? "voucher" : "request"} to link
            with this {sourceType === "request" ? "expense request" : "voucher"}.
          </DialogDescription>
        </DialogHeader>

        {/* Source Item Summary */}
        {sourceItem && (
          <div className="p-3 rounded-lg bg-muted/50 border text-sm">
            <div className="flex justify-between mb-1">
              <span className="text-muted-foreground">
                {sourceType === "request" ? "Request" : "Voucher"}
              </span>
              <span className="font-medium">
                {"voucherNumber" in sourceItem
                  ? sourceItem.voucherNumber
                  : sourceItem.purpose.slice(0, 30) + (sourceItem.purpose.length > 30 ? "..." : "")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-semibold">
                {formatCurrency(sourceItem.amount, sourceItem.currency)}
              </span>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Search ${sourceType === "request" ? "vouchers" : "requests"}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="link-search-input"
          />
        </div>

        {/* Suggestions List */}
        <div className="flex-1 overflow-y-auto space-y-2 min-h-[200px]">
          {filteredSuggestions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No matching {sourceType === "request" ? "vouchers" : "requests"} found
            </div>
          ) : (
            filteredSuggestions.map((item) => {
              const isVoucher = "voucherNumber" in item;
              const itemId = item.id;

              return (
                <Card
                  key={itemId}
                  className={cn(
                    "cursor-pointer transition-colors",
                    selectedId === itemId
                      ? "border-primary bg-primary/5"
                      : "hover:border-muted-foreground/50"
                  )}
                  onClick={() => setSelectedId(itemId)}
                  data-testid={`suggestion-${itemId}`}
                >
                  <CardContent className="p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {isVoucher
                              ? (item as ExpenseVoucherWithUser).voucherNumber
                              : (item as ExpenseRequestWithUser).purpose.slice(0, 40)}
                          </span>
                          {selectedId === itemId && (
                            <Badge className="bg-primary">Selected</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {isVoucher
                            ? (item as ExpenseVoucherWithUser).description.slice(0, 50)
                            : (item as ExpenseRequestWithUser).description?.slice(0, 50) || "No description"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {formatCurrency(item.amount, item.currency)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {isVoucher
                            ? (item as ExpenseVoucherWithUser).submitter.name
                            : (item as ExpenseRequestWithUser).requester.name}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedId || isLoading}
            data-testid="confirm-link-button"
          >
            {isLoading ? "Linking..." : "Link Selected"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
