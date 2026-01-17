import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { ExpenseVoucherForm, type ExpenseVoucherSubmitData } from "~/components/ExpenseVoucherForm";
import { useCreateExpenseVoucher } from "~/hooks/useExpenseVouchers";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/vouchers/create")({
  component: CreateVoucherPage,
});

function CreateVoucherPage() {
  const navigate = useNavigate();
  const createVoucher = useCreateExpenseVoucher();

  const handleSubmit = async (data: ExpenseVoucherSubmitData) => {
    try {
      await createVoucher.mutateAsync(data);
      navigate({ to: "/dashboard/vouchers" });
    } catch (error) {
      // Error is handled by the hook
      console.error("Failed to create voucher:", error);
    }
  };

  const handleSaveDraft = async (data: ExpenseVoucherSubmitData) => {
    try {
      await createVoucher.mutateAsync(data);
      toast.success("Draft saved!", {
        description: "Your expense voucher draft has been saved.",
      });
      navigate({ to: "/dashboard/vouchers" });
    } catch (error) {
      // Error is handled by the hook
      console.error("Failed to save draft:", error);
    }
  };

  const handleCancel = () => {
    navigate({ to: "/dashboard/vouchers" });
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCancel}
            data-testid="back-button"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Create Expense Voucher</h1>
            <p className="text-muted-foreground mt-1">
              Record a new expense voucher with receipt attachments and GL account details
            </p>
          </div>
        </div>

        {/* Form Card */}
        <Card>
          <CardHeader>
            <CardTitle>Voucher Details</CardTitle>
            <CardDescription>
              Fill in the expense voucher information. Required fields are marked with *.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ExpenseVoucherForm
              onSubmit={handleSubmit}
              onSaveDraft={handleSaveDraft}
              onCancel={handleCancel}
              isPending={createVoucher.isPending}
              submitLabel="Create Voucher"
              cancelLabel="Cancel"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
