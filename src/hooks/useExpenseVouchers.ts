import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  expenseVoucherQueryOptions,
  expenseVoucherDetailsQueryOptions,
  expenseVouchersQueryOptions,
  expenseVouchersCountQueryOptions,
  myExpenseVouchersQueryOptions,
  pendingApprovalVouchersQueryOptions,
  vouchersPendingGLPostingQueryOptions,
  unreconciledVouchersQueryOptions,
  type ExpenseVouchersQueryParams,
} from "~/queries/expense-vouchers";
import {
  createExpenseVoucherFn,
  updateExpenseVoucherFn,
  deleteExpenseVoucherFn,
  submitExpenseVoucherForApprovalFn,
  approveExpenseVoucherFn,
  rejectExpenseVoucherFn,
  postExpenseVoucherToGLFn,
  reconcileExpenseVoucherFn,
  voidExpenseVoucherFn,
  addReceiptAttachmentFn,
  removeReceiptAttachmentFn,
  type ExpenseVoucherCurrency,
  type ExpenseCategory,
  type PaymentMethod,
} from "~/fn/expense-vouchers";
import { getErrorMessage } from "~/utils/error";
import type {
  ExpenseVoucherStatus,
  ApprovalChainStep,
  ReceiptAttachment,
} from "~/db/schema";

// Query hooks

/**
 * Get a single expense voucher by ID
 */
export function useExpenseVoucher(id: string, enabled = true) {
  return useQuery({
    ...expenseVoucherQueryOptions(id),
    enabled: enabled && !!id,
  });
}

/**
 * Get a single expense voucher by ID with full details
 */
export function useExpenseVoucherDetails(id: string, enabled = true) {
  return useQuery({
    ...expenseVoucherDetailsQueryOptions(id),
    enabled: enabled && !!id,
  });
}

/**
 * Get all expense vouchers with optional filters
 */
export function useExpenseVouchers(params?: ExpenseVouchersQueryParams, enabled = true) {
  return useQuery({
    ...expenseVouchersQueryOptions(params),
    enabled,
  });
}

/**
 * Get count of expense vouchers with optional filters
 */
export function useExpenseVouchersCount(params?: ExpenseVouchersQueryParams, enabled = true) {
  return useQuery({
    ...expenseVouchersCountQueryOptions(params),
    enabled,
  });
}

/**
 * Get current user's expense vouchers
 */
export function useMyExpenseVouchers(
  params?: { status?: ExpenseVoucherStatus; limit?: number; offset?: number },
  enabled = true
) {
  return useQuery({
    ...myExpenseVouchersQueryOptions(params),
    enabled,
  });
}

/**
 * Get pending approval vouchers for current user
 */
export function usePendingApprovalVouchers(
  params?: { limit?: number; offset?: number },
  enabled = true
) {
  return useQuery({
    ...pendingApprovalVouchersQueryOptions(params),
    enabled,
  });
}

/**
 * Get vouchers pending GL posting
 */
export function useVouchersPendingGLPosting(
  params?: { limit?: number; offset?: number },
  enabled = true
) {
  return useQuery({
    ...vouchersPendingGLPostingQueryOptions(params),
    enabled,
  });
}

/**
 * Get unreconciled vouchers
 */
export function useUnreconciledVouchers(
  params?: { limit?: number; offset?: number },
  enabled = true
) {
  return useQuery({
    ...unreconciledVouchersQueryOptions(params),
    enabled,
  });
}

// Mutation hooks

interface CreateExpenseVoucherData {
  expenseRequestId?: string;
  amount: string;
  currency?: ExpenseVoucherCurrency;
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

/**
 * Create a new expense voucher
 */
export function useCreateExpenseVoucher() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateExpenseVoucherData) =>
      createExpenseVoucherFn({ data }),
    onSuccess: () => {
      toast.success("Expense voucher created!", {
        description: "Your expense voucher has been saved as a draft.",
      });
      queryClient.invalidateQueries({ queryKey: ["expense-vouchers"] });
    },
    onError: (error) => {
      toast.error("Failed to create expense voucher", {
        description: getErrorMessage(error),
      });
    },
  });
}

interface UpdateExpenseVoucherData {
  id: string;
  amount?: string;
  currency?: ExpenseVoucherCurrency;
  description?: string;
  vendorName?: string | null;
  vendorId?: string | null;
  glAccountCode?: string | null;
  glAccountName?: string | null;
  costCenter?: string | null;
  department?: string | null;
  projectCode?: string | null;
  paymentMethod?: PaymentMethod | null;
  paymentReference?: string | null;
  paymentDate?: string | null;
  bankAccountId?: string | null;
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
  notes?: string | null;
  externalReference?: string | null;
  tags?: string[];
}

/**
 * Update an existing expense voucher
 */
export function useUpdateExpenseVoucher() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateExpenseVoucherData) =>
      updateExpenseVoucherFn({ data }),
    onSuccess: (_, variables) => {
      toast.success("Expense voucher updated!", {
        description: "Your changes have been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ["expense-vouchers"] });
      queryClient.invalidateQueries({ queryKey: ["expense-voucher", variables.id] });
    },
    onError: (error) => {
      toast.error("Failed to update expense voucher", {
        description: getErrorMessage(error),
      });
    },
  });
}

/**
 * Delete an expense voucher
 */
export function useDeleteExpenseVoucher() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteExpenseVoucherFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Expense voucher deleted!", {
        description: "The expense voucher has been removed.",
      });
      queryClient.invalidateQueries({ queryKey: ["expense-vouchers"] });
    },
    onError: (error) => {
      toast.error("Failed to delete expense voucher", {
        description: getErrorMessage(error),
      });
    },
  });
}

interface SubmitForApprovalData {
  id: string;
  approvalChain: ApprovalChainStep[];
}

/**
 * Submit an expense voucher for approval
 */
export function useSubmitExpenseVoucherForApproval() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SubmitForApprovalData) =>
      submitExpenseVoucherForApprovalFn({ data }),
    onSuccess: (_, variables) => {
      toast.success("Expense voucher submitted!", {
        description: "Your voucher has been submitted for approval.",
      });
      queryClient.invalidateQueries({ queryKey: ["expense-vouchers"] });
      queryClient.invalidateQueries({ queryKey: ["expense-voucher", variables.id] });
    },
    onError: (error) => {
      toast.error("Failed to submit expense voucher", {
        description: getErrorMessage(error),
      });
    },
  });
}

interface ApproveVoucherData {
  id: string;
  comments?: string;
}

/**
 * Approve an expense voucher
 */
export function useApproveExpenseVoucher() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ApproveVoucherData) =>
      approveExpenseVoucherFn({ data }),
    onSuccess: (_, variables) => {
      toast.success("Expense voucher approved!", {
        description: "The voucher has been approved.",
      });
      queryClient.invalidateQueries({ queryKey: ["expense-vouchers"] });
      queryClient.invalidateQueries({ queryKey: ["expense-voucher", variables.id] });
    },
    onError: (error) => {
      toast.error("Failed to approve expense voucher", {
        description: getErrorMessage(error),
      });
    },
  });
}

interface RejectVoucherData {
  id: string;
  reason: string;
  comments?: string;
}

/**
 * Reject an expense voucher
 */
export function useRejectExpenseVoucher() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RejectVoucherData) =>
      rejectExpenseVoucherFn({ data }),
    onSuccess: (_, variables) => {
      toast.success("Expense voucher rejected", {
        description: "The voucher has been rejected.",
      });
      queryClient.invalidateQueries({ queryKey: ["expense-vouchers"] });
      queryClient.invalidateQueries({ queryKey: ["expense-voucher", variables.id] });
    },
    onError: (error) => {
      toast.error("Failed to reject expense voucher", {
        description: getErrorMessage(error),
      });
    },
  });
}

interface PostToGLData {
  id: string;
  journalEntryId: string;
  postingReference: string;
}

/**
 * Post an expense voucher to GL
 */
export function usePostExpenseVoucherToGL() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: PostToGLData) =>
      postExpenseVoucherToGLFn({ data }),
    onSuccess: (_, variables) => {
      toast.success("Voucher posted to GL!", {
        description: "The expense voucher has been posted to the General Ledger.",
      });
      queryClient.invalidateQueries({ queryKey: ["expense-vouchers"] });
      queryClient.invalidateQueries({ queryKey: ["expense-voucher", variables.id] });
    },
    onError: (error) => {
      toast.error("Failed to post voucher to GL", {
        description: getErrorMessage(error),
      });
    },
  });
}

interface ReconcileVoucherData {
  id: string;
  reference: string;
  notes?: string;
}

/**
 * Reconcile an expense voucher
 */
export function useReconcileExpenseVoucher() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ReconcileVoucherData) =>
      reconcileExpenseVoucherFn({ data }),
    onSuccess: (_, variables) => {
      toast.success("Voucher reconciled!", {
        description: "The expense voucher has been reconciled.",
      });
      queryClient.invalidateQueries({ queryKey: ["expense-vouchers"] });
      queryClient.invalidateQueries({ queryKey: ["expense-voucher", variables.id] });
    },
    onError: (error) => {
      toast.error("Failed to reconcile voucher", {
        description: getErrorMessage(error),
      });
    },
  });
}

interface VoidVoucherData {
  id: string;
  reason: string;
}

/**
 * Void an expense voucher
 */
export function useVoidExpenseVoucher() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: VoidVoucherData) =>
      voidExpenseVoucherFn({ data }),
    onSuccess: (_, variables) => {
      toast.success("Voucher voided", {
        description: "The expense voucher has been voided.",
      });
      queryClient.invalidateQueries({ queryKey: ["expense-vouchers"] });
      queryClient.invalidateQueries({ queryKey: ["expense-voucher", variables.id] });
    },
    onError: (error) => {
      toast.error("Failed to void voucher", {
        description: getErrorMessage(error),
      });
    },
  });
}

interface AddReceiptAttachmentData {
  id: string;
  attachment: ReceiptAttachment;
}

/**
 * Add a receipt attachment to an expense voucher
 */
export function useAddReceiptAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AddReceiptAttachmentData) =>
      addReceiptAttachmentFn({ data }),
    onSuccess: (_, variables) => {
      toast.success("Attachment added!", {
        description: "The receipt has been attached to the voucher.",
      });
      queryClient.invalidateQueries({ queryKey: ["expense-voucher", variables.id] });
    },
    onError: (error) => {
      toast.error("Failed to add attachment", {
        description: getErrorMessage(error),
      });
    },
  });
}

interface RemoveReceiptAttachmentData {
  id: string;
  attachmentId: string;
}

/**
 * Remove a receipt attachment from an expense voucher
 */
export function useRemoveReceiptAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RemoveReceiptAttachmentData) =>
      removeReceiptAttachmentFn({ data }),
    onSuccess: (_, variables) => {
      toast.success("Attachment removed!", {
        description: "The receipt has been removed from the voucher.",
      });
      queryClient.invalidateQueries({ queryKey: ["expense-voucher", variables.id] });
    },
    onError: (error) => {
      toast.error("Failed to remove attachment", {
        description: getErrorMessage(error),
      });
    },
  });
}
