/**
 * TransferDialog Component
 *
 * Dialog for transferring funds to another user.
 * Supports transfer by user ID or email.
 */

import * as React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Send,
  Loader2,
  CheckCircle,
  AlertCircle,
  User,
  DollarSign,
  MessageSquare,
} from "lucide-react";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { cn } from "~/lib/utils";
import { useTransferFunds } from "~/hooks/useWalletBalance";

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

// Validation schema
const transferSchema = z.object({
  recipientId: z.string().min(1, "Recipient is required"),
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine(
      (val) => {
        const num = parseFloat(val);
        return !isNaN(num) && num > 0;
      },
      { message: "Please enter a valid amount" }
    )
    .refine(
      (val) => {
        const num = parseFloat(val);
        return num >= 0.01;
      },
      { message: "Minimum amount is $0.01" }
    ),
  description: z.string().max(200).optional(),
});

type TransferFormData = z.infer<typeof transferSchema>;

interface TransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency?: string;
  availableBalance?: string;
}

export function TransferDialog({
  open,
  onOpenChange,
  currency = "USD",
  availableBalance = "0.00",
}: TransferDialogProps) {
  const [showSuccess, setShowSuccess] = React.useState(false);
  const [transferAmount, setTransferAmount] = React.useState("");

  const transferFunds = useTransferFunds();

  const form = useForm<TransferFormData>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      recipientId: "",
      amount: "",
      description: "",
    },
  });

  // Watch amount for validation against available balance
  const watchedAmount = form.watch("amount");
  const hasInsufficientFunds =
    parseFloat(watchedAmount || "0") > parseFloat(availableBalance);

  // Handle form submission
  const onSubmit = async (data: TransferFormData) => {
    if (hasInsufficientFunds) {
      form.setError("amount", {
        type: "manual",
        message: "Insufficient funds",
      });
      return;
    }

    try {
      await transferFunds.mutateAsync({
        destinationUserId: data.recipientId,
        amount: data.amount,
        description: data.description || "Wallet transfer",
        idempotencyKey: `transfer-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      });

      setTransferAmount(data.amount);
      setShowSuccess(true);

      // Close dialog after showing success
      setTimeout(() => {
        setShowSuccess(false);
        setTransferAmount("");
        form.reset();
        onOpenChange(false);
      }, 2500);
    } catch (error) {
      // Error is handled by the mutation hook
    }
  };

  // Reset state when dialog closes
  React.useEffect(() => {
    if (!open) {
      form.reset();
      setShowSuccess(false);
      setTransferAmount("");
    }
  }, [open, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="transfer-dialog">
        {showSuccess ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="rounded-full bg-green-500/10 p-4 mb-4">
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Transfer Successful!</h3>
            <p className="text-muted-foreground text-center">
              {formatCurrency(transferAmount, currency)} has been sent
              successfully.
            </p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Send className="h-5 w-5 text-blue-500" />
                Send Money
              </DialogTitle>
              <DialogDescription>
                Transfer funds to another user instantly.
              </DialogDescription>
            </DialogHeader>

            {/* Available Balance Display */}
            <div className="bg-muted/50 rounded-lg p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Available Balance
                </p>
                <p className="text-xl font-bold" data-testid="available-balance-display">
                  {formatCurrency(availableBalance, currency)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground/50" />
            </div>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                {/* Recipient */}
                <FormField
                  control={form.control}
                  name="recipientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recipient</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            {...field}
                            placeholder="Enter user ID or email"
                            className="pl-10"
                            data-testid="recipient-input"
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Enter the recipient's user ID or email address
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Amount */}
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            $
                          </span>
                          <Input
                            {...field}
                            type="number"
                            step="0.01"
                            min="0.01"
                            placeholder="0.00"
                            className={cn(
                              "pl-7",
                              hasInsufficientFunds && "border-red-500"
                            )}
                            data-testid="amount-input"
                          />
                        </div>
                      </FormControl>
                      {hasInsufficientFunds && (
                        <p className="text-sm text-red-500 flex items-center gap-1">
                          <AlertCircle className="h-4 w-4" />
                          Insufficient funds
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Note (Optional)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Textarea
                            {...field}
                            placeholder="Add a note for the recipient..."
                            className="pl-10 min-h-[80px]"
                            maxLength={200}
                            data-testid="description-input"
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        {field.value?.length || 0}/200 characters
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Transfer Summary */}
                {watchedAmount && parseFloat(watchedAmount) > 0 && (
                  <div
                    className="bg-primary/5 border border-primary/20 rounded-lg p-3"
                    data-testid="transfer-summary"
                  >
                    <p className="text-sm font-medium text-primary">
                      Transfer Summary
                    </p>
                    <div className="flex justify-between mt-2 text-sm">
                      <span className="text-muted-foreground">Amount</span>
                      <span className="font-medium">
                        {formatCurrency(watchedAmount, currency)}
                      </span>
                    </div>
                    <div className="flex justify-between mt-1 text-sm">
                      <span className="text-muted-foreground">Fee</span>
                      <span className="font-medium text-green-600">Free</span>
                    </div>
                    <div className="border-t mt-2 pt-2 flex justify-between text-sm">
                      <span className="font-medium">Total</span>
                      <span className="font-bold">
                        {formatCurrency(watchedAmount, currency)}
                      </span>
                    </div>
                  </div>
                )}

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
                    disabled={
                      transferFunds.isPending ||
                      !form.formState.isValid ||
                      hasInsufficientFunds
                    }
                    className="gap-2"
                    data-testid="submit-transfer"
                  >
                    {transferFunds.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Send Money
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
