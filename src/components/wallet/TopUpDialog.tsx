/**
 * TopUpDialog Component
 *
 * Dialog for adding funds to the wallet.
 * Supports preset amounts and custom amounts.
 */

import * as React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CreditCard,
  Banknote,
  Loader2,
  CheckCircle,
  AlertCircle,
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
import { Label } from "~/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { cn } from "~/lib/utils";
import { useCreditWallet } from "~/hooks/useWalletBalance";

// Currency formatting helper
function formatCurrency(amount: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Validation schema
const topUpSchema = z.object({
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
        return num >= 1;
      },
      { message: "Minimum amount is $1" }
    )
    .refine(
      (val) => {
        const num = parseFloat(val);
        return num <= 10000;
      },
      { message: "Maximum amount is $10,000" }
    ),
});

type TopUpFormData = z.infer<typeof topUpSchema>;

// Preset amounts
const PRESET_AMOUNTS = [10, 25, 50, 100, 250, 500];

interface TopUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency?: string;
}

export function TopUpDialog({
  open,
  onOpenChange,
  currency = "USD",
}: TopUpDialogProps) {
  const [selectedPreset, setSelectedPreset] = React.useState<number | null>(
    null
  );
  const [showSuccess, setShowSuccess] = React.useState(false);

  const creditWallet = useCreditWallet();

  const form = useForm<TopUpFormData>({
    resolver: zodResolver(topUpSchema),
    defaultValues: {
      amount: "",
    },
  });

  // Handle preset amount selection
  const handlePresetSelect = (amount: number) => {
    setSelectedPreset(amount);
    form.setValue("amount", amount.toString(), { shouldValidate: true });
  };

  // Handle custom amount input
  const handleCustomAmountChange = (value: string) => {
    setSelectedPreset(null);
    form.setValue("amount", value, { shouldValidate: true });
  };

  // Handle form submission
  const onSubmit = async (data: TopUpFormData) => {
    try {
      await creditWallet.mutateAsync({
        amount: data.amount,
        type: "deposit",
        description: "Wallet top-up",
        idempotencyKey: `topup-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      });

      setShowSuccess(true);

      // Close dialog after showing success
      setTimeout(() => {
        setShowSuccess(false);
        form.reset();
        setSelectedPreset(null);
        onOpenChange(false);
      }, 2000);
    } catch (error) {
      // Error is handled by the mutation hook
    }
  };

  // Reset state when dialog closes
  React.useEffect(() => {
    if (!open) {
      form.reset();
      setSelectedPreset(null);
      setShowSuccess(false);
    }
  }, [open, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="topup-dialog">
        {showSuccess ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="rounded-full bg-green-500/10 p-4 mb-4">
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Top-Up Successful!</h3>
            <p className="text-muted-foreground text-center">
              Your wallet has been credited with{" "}
              {formatCurrency(parseFloat(form.getValues("amount")), currency)}
            </p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Banknote className="h-5 w-5 text-green-500" />
                Top Up Wallet
              </DialogTitle>
              <DialogDescription>
                Add funds to your wallet. Select a preset amount or enter a
                custom amount.
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                {/* Preset Amounts */}
                <div className="space-y-2">
                  <Label>Quick Select</Label>
                  <div
                    className="grid grid-cols-3 gap-2"
                    data-testid="preset-amounts"
                  >
                    {PRESET_AMOUNTS.map((amount) => (
                      <Button
                        key={amount}
                        type="button"
                        variant={
                          selectedPreset === amount ? "default" : "outline"
                        }
                        className={cn(
                          "h-12",
                          selectedPreset === amount && "ring-2 ring-primary"
                        )}
                        onClick={() => handlePresetSelect(amount)}
                        data-testid={`preset-amount-${amount}`}
                      >
                        {formatCurrency(amount, currency)}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Custom Amount */}
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custom Amount</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            $
                          </span>
                          <Input
                            {...field}
                            type="number"
                            step="0.01"
                            min="1"
                            max="10000"
                            placeholder="0.00"
                            className="pl-7"
                            onChange={(e) =>
                              handleCustomAmountChange(e.target.value)
                            }
                            data-testid="custom-amount-input"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Info Banner */}
                <div className="bg-muted/50 rounded-lg p-3 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium">Demo Mode</p>
                    <p>
                      This is a demonstration. In production, this would
                      integrate with a payment provider.
                    </p>
                  </div>
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
                    type="submit"
                    disabled={creditWallet.isPending || !form.formState.isValid}
                    className="gap-2"
                    data-testid="submit-topup"
                  >
                    {creditWallet.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4" />
                        Add Funds
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
