import { useForm, useFieldArray, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import {
  Loader2,
  DollarSign,
  FileText,
  Upload,
  Plus,
  Trash2,
  Building2,
  CreditCard,
  Receipt,
  Link2,
  Tag,
  Send,
  Save,
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
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { useGetUploadUrl, useConfirmUpload } from "~/hooks/useStorage";
import {
  EXPENSE_VOUCHER_CURRENCIES,
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
  type ExpenseVoucherCurrency,
  type ExpenseCategory,
  type PaymentMethod,
} from "~/fn/expense-vouchers";
import type { ReceiptAttachment } from "~/db/schema";

// Currency symbols for display
const CURRENCY_SYMBOLS: Record<ExpenseVoucherCurrency, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  CAD: "C$",
  AUD: "A$",
  JPY: "¥",
  CHF: "CHF",
};

// Category labels for display
const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  travel: "Travel",
  meals: "Meals & Entertainment",
  supplies: "Office Supplies",
  equipment: "Equipment",
  software: "Software & Subscriptions",
  professional_services: "Professional Services",
  marketing: "Marketing",
  utilities: "Utilities",
  rent: "Rent & Lease",
  insurance: "Insurance",
  other: "Other",
};

// Payment method labels
const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  check: "Check",
  wire_transfer: "Wire Transfer",
  credit_card: "Credit Card",
  debit_card: "Debit Card",
  ach: "ACH Transfer",
  paypal: "PayPal",
  other: "Other",
};

// Sample GL Accounts (in a real app, these would come from an API)
const GL_ACCOUNTS = [
  { code: "6010", name: "Travel Expenses" },
  { code: "6020", name: "Meals & Entertainment" },
  { code: "6030", name: "Office Supplies" },
  { code: "6040", name: "Equipment & Tools" },
  { code: "6050", name: "Software & Subscriptions" },
  { code: "6060", name: "Professional Services" },
  { code: "6070", name: "Marketing Expenses" },
  { code: "6080", name: "Utilities" },
  { code: "6090", name: "Rent & Lease" },
  { code: "6100", name: "Insurance" },
  { code: "6999", name: "Miscellaneous Expenses" },
];

// Line item validation schema
const lineItemSchema = z.object({
  id: z.string(),
  lineNumber: z.number().int().positive(),
  description: z.string().min(1, "Description is required"),
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine(
      (val) => {
        const num = parseFloat(val);
        return !isNaN(num) && num > 0;
      },
      { message: "Amount must be a positive number" }
    ),
  quantity: z.string().optional().default("1"),
  unitPrice: z.string().optional(),
  glAccountCode: z.string().optional(),
  glAccountName: z.string().optional(),
  costCenter: z.string().optional(),
  department: z.string().optional(),
  projectCode: z.string().optional(),
  taxCode: z.string().optional(),
  taxAmount: z.string().optional(),
  taxRate: z.string().optional(),
  expenseCategory: z.enum(EXPENSE_CATEGORIES).optional(),
});

// Form validation schema
export const expenseVoucherFormSchema = z.object({
  expenseRequestId: z.string().optional(),
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
        return num <= 10000000;
      },
      { message: "Amount cannot exceed 10,000,000" }
    ),
  currency: z.enum(EXPENSE_VOUCHER_CURRENCIES),
  description: z
    .string()
    .min(1, "Description is required")
    .max(5000, "Description must be less than 5000 characters"),
  vendorName: z.string().optional().or(z.literal("")),
  vendorId: z.string().optional().or(z.literal("")),

  // GL mapping
  glAccountCode: z.string().optional().or(z.literal("")),
  glAccountName: z.string().optional().or(z.literal("")),
  costCenter: z.string().optional().or(z.literal("")),
  department: z.string().optional().or(z.literal("")),
  projectCode: z.string().optional().or(z.literal("")),

  // Payment details
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
  paymentReference: z.string().optional().or(z.literal("")),
  paymentDate: z.string().optional().or(z.literal("")),
  bankAccountId: z.string().optional().or(z.literal("")),

  // Line items
  lineItems: z.array(lineItemSchema).optional(),

  // Additional metadata
  notes: z.string().optional().or(z.literal("")),
  externalReference: z.string().optional().or(z.literal("")),
  tags: z.string().optional().or(z.literal("")), // Comma-separated tags
});

export type ExpenseVoucherFormData = z.infer<typeof expenseVoucherFormSchema>;

export interface ExpenseVoucherSubmitData {
  expenseRequestId?: string;
  amount: string;
  currency: ExpenseVoucherCurrency;
  description: string;
  vendorName?: string;
  vendorId?: string;
  glAccountCode?: string;
  glAccountName?: string;
  costCenter?: string;
  department?: string;
  projectCode?: string;
  paymentMethod?: PaymentMethod;
  paymentReference?: string;
  paymentDate?: string;
  bankAccountId?: string;
  receiptAttachments?: ReceiptAttachment[];
  lineItems?: Array<{
    id: string;
    lineNumber: number;
    description: string;
    amount: string;
    quantity?: string;
    unitPrice?: string;
    glAccountCode?: string;
    glAccountName?: string;
    costCenter?: string;
    department?: string;
    projectCode?: string;
    taxCode?: string;
    taxAmount?: string;
    taxRate?: string;
    expenseCategory?: ExpenseCategory;
  }>;
  notes?: string;
  externalReference?: string;
  tags?: string[];
}

interface ExpenseVoucherFormProps {
  defaultValues?: Partial<ExpenseVoucherFormData>;
  expenseRequests?: Array<{ id: string; purpose: string; amount: string }>;
  onSubmit: (data: ExpenseVoucherSubmitData) => void | Promise<void>;
  isPending?: boolean;
  submitLabel?: string;
  onCancel?: () => void;
  cancelLabel?: string;
  onSaveDraft?: (data: ExpenseVoucherSubmitData) => void | Promise<void>;
}

export function ExpenseVoucherForm({
  defaultValues,
  expenseRequests = [],
  onSubmit,
  isPending = false,
  submitLabel = "Submit Voucher",
  onCancel,
  cancelLabel = "Cancel",
  onSaveDraft,
}: ExpenseVoucherFormProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedAttachments, setUploadedAttachments] = useState<ReceiptAttachment[]>([]);
  const getUploadUrl = useGetUploadUrl();
  const confirmUpload = useConfirmUpload();

  const form = useForm({
    resolver: zodResolver(expenseVoucherFormSchema),
    defaultValues: {
      expenseRequestId: "",
      amount: "",
      currency: "USD",
      description: "",
      vendorName: "",
      vendorId: "",
      glAccountCode: "",
      glAccountName: "",
      costCenter: "",
      department: "",
      projectCode: "",
      paymentMethod: undefined,
      paymentReference: "",
      paymentDate: "",
      bankAccountId: "",
      lineItems: [],
      notes: "",
      externalReference: "",
      tags: "",
      ...defaultValues,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lineItems",
  });

  const selectedCurrency = form.watch("currency");
  const currencySymbol = CURRENCY_SYMBOLS[selectedCurrency];
  const selectedGLAccount = form.watch("glAccountCode");

  const handleFileSelect = (selectedFiles: File[]) => {
    setFiles((prev) => [...prev, ...selectedFiles]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGLAccountChange = (code: string) => {
    const account = GL_ACCOUNTS.find((acc) => acc.code === code);
    form.setValue("glAccountCode", code);
    form.setValue("glAccountName", account?.name || "");
  };

  const addLineItem = () => {
    append({
      id: crypto.randomUUID(),
      lineNumber: fields.length + 1,
      description: "",
      amount: "",
      quantity: "1",
      unitPrice: "",
      glAccountCode: selectedGLAccount || "",
      glAccountName: form.watch("glAccountName") || "",
      costCenter: form.watch("costCenter") || "",
      department: form.watch("department") || "",
      projectCode: form.watch("projectCode") || "",
      taxCode: "",
      taxAmount: "",
      taxRate: "",
      expenseCategory: undefined,
    });
  };

  const handleSubmit = async (data: z.infer<typeof expenseVoucherFormSchema>, isDraft = false) => {
    const attachments: ReceiptAttachment[] = [...uploadedAttachments];

    // Upload new files if present
    if (files.length > 0) {
      setIsUploading(true);
      try {
        for (const file of files) {
          // Get presigned URL for upload
          const uploadData = await getUploadUrl.mutateAsync({
            fileName: file.name,
            fileType: file.type,
            folder: "expense-vouchers",
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

          // Add to attachments
          attachments.push({
            id: crypto.randomUUID(),
            fileName: file.name,
            fileUrl: uploadData.key,
            fileSize: file.size,
            mimeType: file.type,
            uploadedAt: new Date().toISOString(),
            uploadedBy: "", // Will be set on server
          });
        }
      } catch (error) {
        console.error("Upload failed:", error);
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    // Parse tags from comma-separated string
    const tags = data.tags
      ? data.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
      : undefined;

    const submitData: ExpenseVoucherSubmitData = {
      expenseRequestId: data.expenseRequestId || undefined,
      amount: data.amount,
      currency: data.currency,
      description: data.description,
      vendorName: data.vendorName || undefined,
      vendorId: data.vendorId || undefined,
      glAccountCode: data.glAccountCode || undefined,
      glAccountName: data.glAccountName || undefined,
      costCenter: data.costCenter || undefined,
      department: data.department || undefined,
      projectCode: data.projectCode || undefined,
      paymentMethod: data.paymentMethod || undefined,
      paymentReference: data.paymentReference || undefined,
      paymentDate: data.paymentDate || undefined,
      bankAccountId: data.bankAccountId || undefined,
      receiptAttachments: attachments.length > 0 ? attachments : undefined,
      lineItems: data.lineItems?.length ? data.lineItems : undefined,
      notes: data.notes || undefined,
      externalReference: data.externalReference || undefined,
      tags,
    };

    if (isDraft && onSaveDraft) {
      await onSaveDraft(submitData);
    } else {
      await onSubmit(submitData);
    }
  };

  const isSubmitting = isPending || isUploading;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data) => handleSubmit(data, false))}
        className="space-y-8"
      >
        {/* Link to Expense Request Section */}
        {expenseRequests.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Link2 className="h-5 w-5" />
                Link to Expense Request
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="expenseRequestId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expense Request (Optional)</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select an expense request to link" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {expenseRequests.map((request) => (
                          <SelectItem key={request.id} value={request.id}>
                            {request.purpose} - ${request.amount}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Link this voucher to an approved expense request for reconciliation
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        )}

        {/* Basic Information Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="h-5 w-5" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
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
                          className="h-11 text-base pl-12"
                          disabled={isSubmitting}
                          {...field}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9.]/g, "");
                            const parts = value.split(".");
                            if (parts.length > 2) return;
                            if (parts[1] && parts[1].length > 2) return;
                            field.onChange(value);
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>Total voucher amount</FormDescription>
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
                        {EXPENSE_VOUCHER_CURRENCIES.map((currency) => (
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

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">Description *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the expense (e.g., Office supplies purchase, Business travel expenses)"
                      className="min-h-[100px] text-base resize-none"
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

            {/* Vendor Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="vendorName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">Vendor/Payee Name</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Enter vendor name"
                          className="h-11 text-base pl-10"
                          disabled={isSubmitting}
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vendorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">Vendor ID</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="External vendor ID (optional)"
                        className="h-11 text-base"
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* GL Account Selection Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5" />
              GL Account & Cost Allocation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* GL Account Selection */}
            <FormField
              control={form.control}
              name="glAccountCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">GL Account</FormLabel>
                  <Select
                    onValueChange={handleGLAccountChange}
                    value={field.value}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full h-11">
                        <SelectValue placeholder="Select GL account" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {GL_ACCOUNTS.map((account) => (
                        <SelectItem key={account.code} value={account.code}>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-medium">{account.code}</span>
                            <span className="text-muted-foreground">-</span>
                            <span>{account.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Select the General Ledger account for posting
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Cost Allocation */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="costCenter"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost Center</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., CC-001"
                        className="h-11"
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Engineering"
                        className="h-11"
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="projectCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Code</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., PRJ-2024-001"
                        className="h-11"
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Payment Information Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="h-5 w-5" />
              Payment Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full h-11">
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PAYMENT_METHODS.map((method) => (
                          <SelectItem key={method} value={method}>
                            {PAYMENT_METHOD_LABELS[method]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentReference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Reference</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Check #, Transaction ID, etc."
                        className="h-11"
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="paymentDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        className="h-11"
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bankAccountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bank Account</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Bank account reference"
                        className="h-11"
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Line Items Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5" />
                Line Items
              </CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addLineItem}
                disabled={isSubmitting}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Line Item
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {fields.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No line items added yet.</p>
                <p className="text-xs">Click "Add Line Item" to add detailed expense breakdown.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="p-4 border rounded-lg space-y-4 bg-muted/30"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        Line Item #{index + 1}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                        disabled={isSubmitting}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name={`lineItems.${index}.description`}
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Description *</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Item description"
                                disabled={isSubmitting}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`lineItems.${index}.amount`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Amount *</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                                  {currencySymbol}
                                </span>
                                <Input
                                  placeholder="0.00"
                                  className="pl-8"
                                  disabled={isSubmitting}
                                  {...field}
                                  onChange={(e) => {
                                    const value = e.target.value.replace(/[^0-9.]/g, "");
                                    field.onChange(value);
                                  }}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <FormField
                        control={form.control}
                        name={`lineItems.${index}.expenseCategory`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                              disabled={isSubmitting}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {EXPENSE_CATEGORIES.map((category) => (
                                  <SelectItem key={category} value={category}>
                                    {CATEGORY_LABELS[category]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`lineItems.${index}.glAccountCode`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>GL Account</FormLabel>
                            <Select
                              onValueChange={(value) => {
                                field.onChange(value);
                                const account = GL_ACCOUNTS.find((a) => a.code === value);
                                form.setValue(
                                  `lineItems.${index}.glAccountName`,
                                  account?.name || ""
                                );
                              }}
                              value={field.value}
                              disabled={isSubmitting}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {GL_ACCOUNTS.map((account) => (
                                  <SelectItem key={account.code} value={account.code}>
                                    {account.code}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`lineItems.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Quantity</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="1"
                                disabled={isSubmitting}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`lineItems.${index}.unitPrice`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Unit Price</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="0.00"
                                disabled={isSubmitting}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Receipt Attachments Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Receipt className="h-5 w-5" />
              Receipt Attachments
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FileUpload
              onFilesSelected={handleFileSelect}
              accept={{
                "image/*": [".jpg", ".jpeg", ".png", ".gif", ".webp"],
                "application/pdf": [".pdf"],
              }}
              maxFiles={10}
              maxSize={10 * 1024 * 1024}
              multiple
              disabled={isSubmitting}
            >
              <div className="space-y-4">
                <div className="mx-auto w-12 h-12 text-muted-foreground">
                  <Upload className="w-full h-full" />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Upload receipts or invoices</p>
                  <p className="text-xs text-muted-foreground">
                    Drag and drop or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Supports: PDF, JPG, PNG, GIF (Max 10MB each)
                  </p>
                </div>
              </div>
            </FileUpload>

            {/* Display uploaded/selected files */}
            {(files.length > 0 || uploadedAttachments.length > 0) && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Attached Files:</p>
                {uploadedAttachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between p-2 bg-muted rounded-md"
                  >
                    <span className="text-sm truncate">{attachment.fileName}</span>
                    <span className="text-xs text-muted-foreground">Uploaded</span>
                  </div>
                ))}
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-muted rounded-md"
                  >
                    <span className="text-sm truncate">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      disabled={isSubmitting}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Additional Information Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Tag className="h-5 w-5" />
              Additional Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Internal Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any internal notes or comments (optional)"
                      className="min-h-[80px] resize-none"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="externalReference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>External Reference</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="PO#, Invoice#, etc."
                        className="h-11"
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="travel, Q1, marketing (comma-separated)"
                        className="h-11"
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>Separate tags with commas</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col gap-4 pt-4 border-t border-border">
          <div className="flex gap-3 flex-wrap">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                className="flex-1 min-w-[120px]"
                disabled={isSubmitting}
                onClick={onCancel}
              >
                {cancelLabel}
              </Button>
            )}
            {onSaveDraft && (
              <Button
                type="button"
                variant="secondary"
                className="flex-1 min-w-[120px]"
                disabled={isSubmitting}
                onClick={() => form.handleSubmit((data) => handleSubmit(data, true))()}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Draft
                  </>
                )}
              </Button>
            )}
            <Button
              type="submit"
              className="flex-1 min-w-[120px]"
              disabled={isSubmitting}
            >
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
