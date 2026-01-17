import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import {
  Loader2,
  DollarSign,
  FileText,
  Upload,
  AlertTriangle,
  Send,
} from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { FileUpload } from "~/components/ui/file-upload";
import { useGetUploadUrl, useConfirmUpload } from "~/hooks/useStorage";
import {
  EXPENSE_CURRENCIES,
  EXPENSE_URGENCY_LEVELS,
  type ExpenseCurrency,
  type ExpenseUrgency,
} from "~/fn/expense-requests";

// Form validation schema
export const expenseRequestFormSchema = z.object({
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine(
      (val) => {
        const num = parseFloat(val);
        return !isNaN(num) && num > 0;
      },
      { message: "Amount must be a positive number" }
    )
    .refine(
      (val) => {
        const num = parseFloat(val);
        return num <= 1000000;
      },
      { message: "Amount cannot exceed 1,000,000" }
    ),
  currency: z.enum(EXPENSE_CURRENCIES),
  purpose: z
    .string()
    .min(1, "Purpose is required")
    .max(200, "Purpose must be less than 200 characters"),
  description: z
    .string()
    .max(5000, "Description must be less than 5000 characters")
    .optional()
    .or(z.literal("")),
  urgency: z.enum(EXPENSE_URGENCY_LEVELS),
  receiptUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
});

export type ExpenseRequestFormData = z.infer<typeof expenseRequestFormSchema>;

export interface ExpenseRequestSubmitData {
  amount: string;
  currency: ExpenseCurrency;
  purpose: string;
  description?: string;
  urgency?: ExpenseUrgency;
  receiptUrl?: string;
}

const CURRENCY_SYMBOLS: Record<ExpenseCurrency, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  CAD: "C$",
  AUD: "A$",
};

const URGENCY_LABELS: Record<ExpenseUrgency, string> = {
  low: "Low Priority",
  medium: "Medium Priority",
  high: "High Priority",
  critical: "Critical - Urgent",
};

const URGENCY_DESCRIPTIONS: Record<ExpenseUrgency, string> = {
  low: "Can wait 1-2 weeks for processing",
  medium: "Should be processed within a week",
  high: "Needs attention within 2-3 business days",
  critical: "Requires immediate attention",
};

const URGENCY_COLORS: Record<ExpenseUrgency, string> = {
  low: "text-muted-foreground",
  medium: "text-blue-600 dark:text-blue-400",
  high: "text-orange-600 dark:text-orange-400",
  critical: "text-red-600 dark:text-red-400",
};

interface ExpenseRequestFormProps {
  defaultValues?: Partial<ExpenseRequestFormData>;
  onSubmit: (data: ExpenseRequestSubmitData) => void | Promise<void>;
  isPending?: boolean;
  submitLabel?: string;
  onCancel?: () => void;
  cancelLabel?: string;
}

export function ExpenseRequestForm({
  defaultValues,
  onSubmit,
  isPending = false,
  submitLabel = "Submit Request",
  onCancel,
  cancelLabel = "Cancel",
}: ExpenseRequestFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const getUploadUrl = useGetUploadUrl();
  const confirmUpload = useConfirmUpload();

  const form = useForm<ExpenseRequestFormData>({
    resolver: zodResolver(expenseRequestFormSchema),
    defaultValues: {
      amount: "",
      currency: "USD",
      purpose: "",
      description: "",
      urgency: "medium",
      receiptUrl: "",
      ...defaultValues,
    },
  });

  const selectedCurrency = form.watch("currency");
  const selectedUrgency = form.watch("urgency");
  const currencySymbol = CURRENCY_SYMBOLS[selectedCurrency];

  const handleFileSelect = (files: File[]) => {
    if (files.length > 0) {
      setFile(files[0]);
    } else {
      setFile(null);
    }
  };

  const handleSubmit = async (data: ExpenseRequestFormData) => {
    let receiptUrl = data.receiptUrl;

    // Upload file if present
    if (file) {
      setIsUploading(true);
      try {
        // Get presigned URL for upload
        const uploadData = await getUploadUrl.mutateAsync({
          fileName: file.name,
          fileType: file.type,
          folder: "expense-receipts",
        });

        // Upload file directly to storage
        await fetch(uploadData.uploadUrl, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": file.type,
          },
        });

        // Confirm upload
        await confirmUpload.mutateAsync({ key: uploadData.key });

        // Use the storage key for the receipt (will be resolved to URL when needed)
        receiptUrl = uploadData.key;
      } catch (error) {
        console.error("Upload failed:", error);
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    await onSubmit({
      amount: data.amount,
      currency: data.currency,
      purpose: data.purpose,
      description: data.description || undefined,
      urgency: data.urgency,
      receiptUrl: receiptUrl || undefined,
    });
  };

  const isSubmitting = isPending || isUploading;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-6"
      >
        {/* Amount and Currency Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel className="text-base font-medium">Amount *</FormLabel>
                <FormControl>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                      {currencySymbol}
                    </span>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      className="h-11 text-base pl-8"
                      disabled={isSubmitting}
                      {...field}
                      onChange={(e) => {
                        // Allow only numbers and decimal point
                        const value = e.target.value.replace(/[^0-9.]/g, "");
                        // Ensure only one decimal point
                        const parts = value.split(".");
                        if (parts.length > 2) {
                          return;
                        }
                        // Limit decimal places to 2
                        if (parts[1] && parts[1].length > 2) {
                          return;
                        }
                        field.onChange(value);
                      }}
                    />
                  </div>
                </FormControl>
                <FormDescription>
                  Enter the expense amount
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="currency"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base font-medium">Currency</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={isSubmitting}
                >
                  <FormControl>
                    <SelectTrigger className="w-full h-11">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {EXPENSE_CURRENCIES.map((currency) => (
                      <SelectItem key={currency} value={currency}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{CURRENCY_SYMBOLS[currency]}</span>
                          <span>{currency}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Purpose */}
        <FormField
          control={form.control}
          name="purpose"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-medium">Purpose *</FormLabel>
              <FormControl>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Brief description of the expense purpose"
                    className="h-11 text-base pl-10"
                    disabled={isSubmitting}
                    {...field}
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

        {/* Urgency */}
        <FormField
          control={form.control}
          name="urgency"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-medium">Urgency Level</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled={isSubmitting}
              >
                <FormControl>
                  <SelectTrigger className="w-full h-11">
                    <SelectValue placeholder="Select urgency level" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {EXPENSE_URGENCY_LEVELS.map((urgency) => (
                    <SelectItem key={urgency} value={urgency}>
                      <div className="flex items-center gap-2">
                        {urgency === "critical" && (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        )}
                        <span className={URGENCY_COLORS[urgency]}>
                          {URGENCY_LABELS[urgency]}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription className={selectedUrgency ? URGENCY_COLORS[selectedUrgency] : ""}>
                {selectedUrgency ? URGENCY_DESCRIPTIONS[selectedUrgency] : "Select the urgency level for this request"}
              </FormDescription>
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
              <FormLabel className="text-base font-medium">
                Additional Details
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Provide additional context or details about this expense (optional)"
                  className="min-h-[120px] text-base resize-none"
                  disabled={isSubmitting}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                {field.value?.length || 0}/5000 characters
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Supporting Documentation */}
        <div className="space-y-3">
          <FormLabel className="text-base font-medium">
            Supporting Documentation
          </FormLabel>
          <FileUpload
            onFilesSelected={handleFileSelect}
            accept={{
              "image/*": [".jpg", ".jpeg", ".png", ".gif", ".webp"],
              "application/pdf": [".pdf"],
            }}
            maxFiles={1}
            maxSize={10 * 1024 * 1024} // 10MB
            disabled={isSubmitting}
          >
            <div className="space-y-4">
              <div className="mx-auto w-12 h-12 text-muted-foreground">
                <Upload className="w-full h-full" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  Upload receipt or invoice
                </p>
                <p className="text-xs text-muted-foreground">
                  Drag and drop or click to browse
                </p>
                <p className="text-xs text-muted-foreground">
                  Supports: PDF, JPG, PNG, GIF (Max 10MB)
                </p>
              </div>
            </div>
          </FileUpload>
        </div>

        {/* Or External URL */}
        <FormField
          control={form.control}
          name="receiptUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-medium">
                Or Receipt URL
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="https://..."
                  className="h-11 text-base"
                  disabled={isSubmitting || !!file}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                {file
                  ? "A file is selected for upload. Clear it to use a URL instead."
                  : "Link to receipt or invoice document"}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Action Buttons */}
        <div className="flex flex-col gap-4 pt-4 border-t border-border">
          <div className="flex gap-3">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                disabled={isSubmitting}
                onClick={onCancel}
              >
                {cancelLabel}
              </Button>
            )}
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isUploading ? "Uploading..." : "Submitting..."}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {submitLabel}
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
