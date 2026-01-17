import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authenticatedMiddleware } from "./middleware";
import {
  createExpenseVoucher,
  updateExpenseVoucher,
  deleteExpenseVoucher,
  findExpenseVoucherById,
  findExpenseVoucherByIdWithUsers,
  findExpenseVoucherByIdWithDetails,
  getAllExpenseVouchers,
  getExpenseVouchersCount,
  submitExpenseVoucherForApproval,
  approveExpenseVoucher,
  rejectExpenseVoucher,
  postExpenseVoucherToGL,
  markExpenseVoucherPostingFailed,
  reconcileExpenseVoucher,
  voidExpenseVoucher,
  createExpenseVoucherLineItems,
  deleteExpenseVoucherLineItems,
  createApprovalHistoryEntry,
  getPendingApprovalVouchersForApprover,
  getExpenseVouchersBySubmitter,
  getVouchersPendingGLPosting,
  getUnreconciledVouchers,
  type ExpenseVoucherFilters,
} from "~/data-access/expense-vouchers";
import type { ApprovalChainStep, ReceiptAttachment } from "~/db/schema";
import { auditLog } from "~/lib/audit-logging-service";
import { triggerAutoGLPostingAfterApproval, triggerAutoGLPostingAfterReconciliation } from "./expense-gl-posting";

// Constants for expense vouchers
export const EXPENSE_VOUCHER_CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "CHF"] as const;
export type ExpenseVoucherCurrency = (typeof EXPENSE_VOUCHER_CURRENCIES)[number];

export const EXPENSE_CATEGORIES = [
  "travel",
  "meals",
  "supplies",
  "equipment",
  "software",
  "professional_services",
  "marketing",
  "utilities",
  "rent",
  "insurance",
  "other",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const PAYMENT_METHODS = [
  "cash",
  "check",
  "wire_transfer",
  "credit_card",
  "debit_card",
  "ach",
  "paypal",
  "other",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

// Zod schemas for validation
const receiptAttachmentSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  fileUrl: z.string().url(),
  fileSize: z.number(),
  mimeType: z.string(),
  uploadedAt: z.string(),
  uploadedBy: z.string(),
});

const approvalChainStepSchema = z.object({
  userId: z.string(),
  name: z.string(),
  email: z.string().email(),
  role: z.string(),
  order: z.number().int().positive(),
  status: z.enum(["pending", "approved", "rejected", "skipped"]),
  actionAt: z.string().optional(),
  comments: z.string().optional(),
});

const lineItemSchema = z.object({
  id: z.string(),
  lineNumber: z.number().int().positive(),
  description: z.string().min(1, "Line item description is required"),
  amount: z.string().refine(
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

// Validation schema for creating expense vouchers
const createExpenseVoucherSchema = z.object({
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
    ),
  currency: z.enum(EXPENSE_VOUCHER_CURRENCIES).default("USD"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(5000, "Description must be less than 5000 characters"),
  vendorName: z.string().optional(),
  vendorId: z.string().optional(),

  // GL mapping
  glAccountCode: z.string().optional(),
  glAccountName: z.string().optional(),
  costCenter: z.string().optional(),
  department: z.string().optional(),
  projectCode: z.string().optional(),

  // Payment details
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
  paymentReference: z.string().optional(),
  paymentDate: z.string().optional(),
  bankAccountId: z.string().optional(),

  // Attachments
  receiptAttachments: z.array(receiptAttachmentSchema).optional(),

  // Line items
  lineItems: z.array(lineItemSchema).optional(),

  // Additional metadata
  notes: z.string().optional(),
  externalReference: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

// Create expense voucher server function
export const createExpenseVoucherFn = createServerFn({
  method: "POST",
})
  .inputValidator(createExpenseVoucherSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const voucherData = {
      id: crypto.randomUUID(),
      expenseRequestId: data.expenseRequestId || null,
      amount: data.amount,
      currency: data.currency,
      description: data.description,
      vendorName: data.vendorName || null,
      vendorId: data.vendorId || null,
      glAccountCode: data.glAccountCode || null,
      glAccountName: data.glAccountName || null,
      costCenter: data.costCenter || null,
      department: data.department || null,
      projectCode: data.projectCode || null,
      paymentMethod: data.paymentMethod || null,
      paymentReference: data.paymentReference || null,
      paymentDate: data.paymentDate ? new Date(data.paymentDate) : null,
      bankAccountId: data.bankAccountId || null,
      receiptAttachments: data.receiptAttachments
        ? JSON.stringify(data.receiptAttachments)
        : null,
      notes: data.notes || null,
      externalReference: data.externalReference || null,
      tags: data.tags ? JSON.stringify(data.tags) : null,
      submitterId: context.userId,
      status: "draft" as const,
    };

    const newVoucher = await createExpenseVoucher(voucherData);

    // Create line items if provided
    if (data.lineItems && data.lineItems.length > 0) {
      const lineItemsData = data.lineItems.map((item) => ({
        id: item.id,
        voucherId: newVoucher.id,
        lineNumber: item.lineNumber,
        description: item.description,
        amount: item.amount,
        quantity: item.quantity || "1",
        unitPrice: item.unitPrice || null,
        glAccountCode: item.glAccountCode || null,
        glAccountName: item.glAccountName || null,
        costCenter: item.costCenter || null,
        department: item.department || null,
        projectCode: item.projectCode || null,
        taxCode: item.taxCode || null,
        taxAmount: item.taxAmount || null,
        taxRate: item.taxRate || null,
        expenseCategory: item.expenseCategory || null,
      }));

      await createExpenseVoucherLineItems(lineItemsData);
    }

    return newVoucher;
  });

// Get expense voucher by ID
export const getExpenseVoucherByIdFn = createServerFn({
  method: "GET",
})
  .inputValidator(z.object({ id: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    const voucher = await findExpenseVoucherByIdWithUsers(data.id);
    if (!voucher) {
      throw new Error("Expense voucher not found");
    }
    return voucher;
  });

// Get expense voucher with full details
export const getExpenseVoucherDetailsFn = createServerFn({
  method: "GET",
})
  .inputValidator(z.object({ id: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    const voucher = await findExpenseVoucherByIdWithDetails(data.id);
    if (!voucher) {
      throw new Error("Expense voucher not found");
    }
    return voucher;
  });

// Get all expense vouchers with filters
const getExpenseVouchersSchema = z.object({
  status: z.enum(["draft", "pending_approval", "approved", "rejected", "posted", "voided"]).optional(),
  reconciliationStatus: z.enum(["unreconciled", "partially_reconciled", "reconciled", "disputed"]).optional(),
  postingStatus: z.enum(["not_posted", "pending", "posted", "failed", "reversed"]).optional(),
  submitterId: z.string().optional(),
  currentApproverId: z.string().optional(),
  glAccountCode: z.string().optional(),
  vendorId: z.string().optional(),
  searchQuery: z.string().optional(),
  limit: z.number().int().positive().max(100).optional().default(50),
  offset: z.number().int().min(0).optional().default(0),
});

export const getExpenseVouchersFn = createServerFn()
  .inputValidator(getExpenseVouchersSchema.optional())
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    const filters: ExpenseVoucherFilters = {
      status: data?.status,
      reconciliationStatus: data?.reconciliationStatus,
      postingStatus: data?.postingStatus,
      submitterId: data?.submitterId,
      currentApproverId: data?.currentApproverId,
      glAccountCode: data?.glAccountCode,
      vendorId: data?.vendorId,
      searchQuery: data?.searchQuery,
      limit: data?.limit ?? 50,
      offset: data?.offset ?? 0,
    };
    return await getAllExpenseVouchers(filters);
  });

// Get expense vouchers count
export const getExpenseVouchersCountFn = createServerFn()
  .inputValidator(getExpenseVouchersSchema.optional())
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    const filters: ExpenseVoucherFilters = {
      status: data?.status,
      reconciliationStatus: data?.reconciliationStatus,
      postingStatus: data?.postingStatus,
      submitterId: data?.submitterId,
      currentApproverId: data?.currentApproverId,
      glAccountCode: data?.glAccountCode,
      vendorId: data?.vendorId,
      searchQuery: data?.searchQuery,
    };
    return await getExpenseVouchersCount(filters);
  });

// Get user's expense vouchers
export const getMyExpenseVouchersFn = createServerFn()
  .inputValidator(
    z
      .object({
        status: z.enum(["draft", "pending_approval", "approved", "rejected", "posted", "voided"]).optional(),
        limit: z.number().int().positive().max(100).optional().default(50),
        offset: z.number().int().min(0).optional().default(0),
      })
      .optional()
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    return await getExpenseVouchersBySubmitter(context.userId, {
      status: data?.status,
      limit: data?.limit ?? 50,
      offset: data?.offset ?? 0,
    });
  });

// Get pending approval vouchers for current user
export const getPendingApprovalVouchersFn = createServerFn()
  .inputValidator(
    z
      .object({
        limit: z.number().int().positive().max(100).optional().default(50),
        offset: z.number().int().min(0).optional().default(0),
      })
      .optional()
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    return await getPendingApprovalVouchersForApprover(context.userId, {
      limit: data?.limit ?? 50,
      offset: data?.offset ?? 0,
    });
  });

// Update expense voucher
const updateExpenseVoucherSchema = z.object({
  id: z.string(),
  amount: z
    .string()
    .refine(
      (val) => {
        const num = parseFloat(val);
        return !isNaN(num) && num > 0;
      },
      { message: "Amount must be a positive number" }
    )
    .optional(),
  currency: z.enum(EXPENSE_VOUCHER_CURRENCIES).optional(),
  description: z
    .string()
    .min(1, "Description is required")
    .max(5000, "Description must be less than 5000 characters")
    .optional(),
  vendorName: z.string().optional().nullable(),
  vendorId: z.string().optional().nullable(),
  glAccountCode: z.string().optional().nullable(),
  glAccountName: z.string().optional().nullable(),
  costCenter: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  projectCode: z.string().optional().nullable(),
  paymentMethod: z.enum(PAYMENT_METHODS).optional().nullable(),
  paymentReference: z.string().optional().nullable(),
  paymentDate: z.string().optional().nullable(),
  bankAccountId: z.string().optional().nullable(),
  receiptAttachments: z.array(receiptAttachmentSchema).optional(),
  notes: z.string().optional().nullable(),
  externalReference: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  lineItems: z.array(lineItemSchema).optional(),
});

export const updateExpenseVoucherFn = createServerFn({
  method: "POST",
})
  .inputValidator(updateExpenseVoucherSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // Check voucher exists
    const existingVoucher = await findExpenseVoucherById(data.id);
    if (!existingVoucher) {
      throw new Error("Expense voucher not found");
    }

    // Only the submitter can update their own draft vouchers
    if (existingVoucher.submitterId !== context.userId) {
      throw new Error("You can only update your own expense vouchers");
    }

    if (existingVoucher.status !== "draft") {
      throw new Error("Only draft expense vouchers can be updated");
    }

    const updateData: Record<string, unknown> = {};

    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.vendorName !== undefined) updateData.vendorName = data.vendorName;
    if (data.vendorId !== undefined) updateData.vendorId = data.vendorId;
    if (data.glAccountCode !== undefined) updateData.glAccountCode = data.glAccountCode;
    if (data.glAccountName !== undefined) updateData.glAccountName = data.glAccountName;
    if (data.costCenter !== undefined) updateData.costCenter = data.costCenter;
    if (data.department !== undefined) updateData.department = data.department;
    if (data.projectCode !== undefined) updateData.projectCode = data.projectCode;
    if (data.paymentMethod !== undefined) updateData.paymentMethod = data.paymentMethod;
    if (data.paymentReference !== undefined) updateData.paymentReference = data.paymentReference;
    if (data.paymentDate !== undefined)
      updateData.paymentDate = data.paymentDate ? new Date(data.paymentDate) : null;
    if (data.bankAccountId !== undefined) updateData.bankAccountId = data.bankAccountId;
    if (data.receiptAttachments !== undefined)
      updateData.receiptAttachments = JSON.stringify(data.receiptAttachments);
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.externalReference !== undefined) updateData.externalReference = data.externalReference;
    if (data.tags !== undefined) updateData.tags = JSON.stringify(data.tags);

    const updatedVoucher = await updateExpenseVoucher(data.id, updateData);

    // Update line items if provided
    if (data.lineItems) {
      await deleteExpenseVoucherLineItems(data.id);
      if (data.lineItems.length > 0) {
        const lineItemsData = data.lineItems.map((item) => ({
          id: item.id,
          voucherId: data.id,
          lineNumber: item.lineNumber,
          description: item.description,
          amount: item.amount,
          quantity: item.quantity || "1",
          unitPrice: item.unitPrice || null,
          glAccountCode: item.glAccountCode || null,
          glAccountName: item.glAccountName || null,
          costCenter: item.costCenter || null,
          department: item.department || null,
          projectCode: item.projectCode || null,
          taxCode: item.taxCode || null,
          taxAmount: item.taxAmount || null,
          taxRate: item.taxRate || null,
          expenseCategory: item.expenseCategory || null,
        }));
        await createExpenseVoucherLineItems(lineItemsData);
      }
    }

    return updatedVoucher;
  });

// Delete expense voucher
export const deleteExpenseVoucherFn = createServerFn({
  method: "POST",
})
  .inputValidator(z.object({ id: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const existingVoucher = await findExpenseVoucherById(data.id);
    if (!existingVoucher) {
      throw new Error("Expense voucher not found");
    }

    // Only the submitter can delete their own draft vouchers
    if (existingVoucher.submitterId !== context.userId) {
      throw new Error("You can only delete your own expense vouchers");
    }

    if (existingVoucher.status !== "draft") {
      throw new Error("Only draft expense vouchers can be deleted");
    }

    await deleteExpenseVoucher(data.id);
    return { success: true };
  });

// Submit expense voucher for approval
const submitForApprovalSchema = z.object({
  id: z.string(),
  approvalChain: z.array(approvalChainStepSchema).min(1, "At least one approver is required"),
});

export const submitExpenseVoucherForApprovalFn = createServerFn({
  method: "POST",
})
  .inputValidator(submitForApprovalSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const existingVoucher = await findExpenseVoucherById(data.id);
    if (!existingVoucher) {
      throw new Error("Expense voucher not found");
    }

    if (existingVoucher.submitterId !== context.userId) {
      throw new Error("You can only submit your own expense vouchers");
    }

    if (existingVoucher.status !== "draft") {
      throw new Error("Only draft expense vouchers can be submitted for approval");
    }

    // Sort approval chain by order
    const sortedChain = [...data.approvalChain].sort((a, b) => a.order - b.order);

    const submittedVoucher = await submitExpenseVoucherForApproval(data.id, sortedChain);

    // Create approval history entry
    await createApprovalHistoryEntry({
      id: crypto.randomUUID(),
      voucherId: data.id,
      approverId: context.userId,
      approverRole: "submitter",
      action: "submitted",
      stepNumber: 0,
      previousStatus: "draft",
      newStatus: "pending_approval",
    });

    return submittedVoucher;
  });

// Approve expense voucher
const approveVoucherSchema = z.object({
  id: z.string(),
  comments: z.string().max(1000).optional(),
});

export const approveExpenseVoucherFn = createServerFn({
  method: "POST",
})
  .inputValidator(approveVoucherSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const existingVoucher = await findExpenseVoucherById(data.id);
    if (!existingVoucher) {
      throw new Error("Expense voucher not found");
    }

    if (existingVoucher.status !== "pending_approval") {
      throw new Error("Only pending approval vouchers can be approved");
    }

    // Prevent self-approval
    if (existingVoucher.submitterId === context.userId) {
      throw new Error("You cannot approve your own expense voucher");
    }

    // Verify current approver
    if (existingVoucher.currentApproverId !== context.userId) {
      throw new Error("You are not the current approver for this voucher");
    }

    const previousStatus = existingVoucher.status;
    const approvedVoucher = await approveExpenseVoucher(data.id, context.userId, data.comments);

    // Create approval history entry
    await createApprovalHistoryEntry({
      id: crypto.randomUUID(),
      voucherId: data.id,
      approverId: context.userId,
      approverRole: "approver",
      action: "approved",
      stepNumber: existingVoucher.currentApprovalStep,
      comments: data.comments,
      previousStatus,
      newStatus: approvedVoucher?.status || "approved",
    });

    // Log approval action to audit trail
    await auditLog.logApproval(
      "approval.approved",
      {
        actorId: context.userId,
        actorType: "user",
      },
      {
        resourceType: "expense_voucher",
        resourceId: data.id,
      },
      {
        previousState: { status: previousStatus },
        newState: { status: approvedVoucher?.status || "approved" },
        changedFields: ["status", "currentApprovalStep"],
        description: `Expense voucher approved${data.comments ? `: ${data.comments}` : ""}`,
      },
      {
        metadata: {
          amount: existingVoucher.amount,
          currency: existingVoucher.currency,
          submitterId: existingVoucher.submitterId,
          approvalStep: existingVoucher.currentApprovalStep,
        },
        tags: ["financial", "approval", "expense"],
      }
    );

    // Trigger automatic GL posting if voucher is fully approved
    if (approvedVoucher?.status === "approved") {
      // Fire and forget - don't block approval on GL posting
      triggerAutoGLPostingAfterApproval(data.id, true).catch((err) => {
        console.error("Auto GL posting after approval failed:", err);
      });
    }

    return approvedVoucher;
  });

// Reject expense voucher
const rejectVoucherSchema = z.object({
  id: z.string(),
  reason: z.string().min(1, "Rejection reason is required").max(1000),
  comments: z.string().max(1000).optional(),
});

export const rejectExpenseVoucherFn = createServerFn({
  method: "POST",
})
  .inputValidator(rejectVoucherSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const existingVoucher = await findExpenseVoucherById(data.id);
    if (!existingVoucher) {
      throw new Error("Expense voucher not found");
    }

    if (existingVoucher.status !== "pending_approval") {
      throw new Error("Only pending approval vouchers can be rejected");
    }

    // Prevent self-rejection
    if (existingVoucher.submitterId === context.userId) {
      throw new Error("You cannot reject your own expense voucher");
    }

    // Verify current approver
    if (existingVoucher.currentApproverId !== context.userId) {
      throw new Error("You are not the current approver for this voucher");
    }

    const rejectedVoucher = await rejectExpenseVoucher(
      data.id,
      context.userId,
      data.reason,
      data.comments
    );

    // Create approval history entry
    await createApprovalHistoryEntry({
      id: crypto.randomUUID(),
      voucherId: data.id,
      approverId: context.userId,
      approverRole: "approver",
      action: "rejected",
      stepNumber: existingVoucher.currentApprovalStep,
      comments: data.reason,
      previousStatus: existingVoucher.status,
      newStatus: "rejected",
    });

    // Log rejection action to audit trail
    await auditLog.logApproval(
      "approval.rejected",
      {
        actorId: context.userId,
        actorType: "user",
      },
      {
        resourceType: "expense_voucher",
        resourceId: data.id,
      },
      {
        previousState: { status: existingVoucher.status },
        newState: { status: "rejected" },
        changedFields: ["status", "rejectionReason"],
        description: `Expense voucher rejected: ${data.reason}`,
      },
      {
        metadata: {
          amount: existingVoucher.amount,
          currency: existingVoucher.currency,
          submitterId: existingVoucher.submitterId,
          rejectionReason: data.reason,
          comments: data.comments,
        },
        tags: ["financial", "approval", "expense", "rejected"],
      }
    );

    return rejectedVoucher;
  });

// Post expense voucher to GL
const postToGLSchema = z.object({
  id: z.string(),
  journalEntryId: z.string(),
  postingReference: z.string(),
});

export const postExpenseVoucherToGLFn = createServerFn({
  method: "POST",
})
  .inputValidator(postToGLSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    const existingVoucher = await findExpenseVoucherById(data.id);
    if (!existingVoucher) {
      throw new Error("Expense voucher not found");
    }

    if (existingVoucher.status !== "approved") {
      throw new Error("Only approved vouchers can be posted to GL");
    }

    if (existingVoucher.postingStatus === "posted") {
      throw new Error("Voucher has already been posted to GL");
    }

    return await postExpenseVoucherToGL(data.id, data.journalEntryId, data.postingReference);
  });

// Reconcile expense voucher
const reconcileVoucherSchema = z.object({
  id: z.string(),
  reference: z.string().min(1, "Reconciliation reference is required"),
  notes: z.string().max(1000).optional(),
});

export const reconcileExpenseVoucherFn = createServerFn({
  method: "POST",
})
  .inputValidator(reconcileVoucherSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const existingVoucher = await findExpenseVoucherById(data.id);
    if (!existingVoucher) {
      throw new Error("Expense voucher not found");
    }

    if (existingVoucher.reconciliationStatus === "reconciled") {
      throw new Error("Voucher has already been reconciled");
    }

    const reconciledVoucher = await reconcileExpenseVoucher(data.id, context.userId, data.reference, data.notes);

    // Trigger automatic GL posting after reconciliation if not already posted
    if (existingVoucher.postingStatus !== "posted") {
      triggerAutoGLPostingAfterReconciliation(data.id).catch((err) => {
        console.error("Auto GL posting after reconciliation failed:", err);
      });
    }

    return reconciledVoucher;
  });

// Void expense voucher
const voidVoucherSchema = z.object({
  id: z.string(),
  reason: z.string().min(1, "Void reason is required").max(1000),
});

export const voidExpenseVoucherFn = createServerFn({
  method: "POST",
})
  .inputValidator(voidVoucherSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const existingVoucher = await findExpenseVoucherById(data.id);
    if (!existingVoucher) {
      throw new Error("Expense voucher not found");
    }

    if (existingVoucher.status === "voided") {
      throw new Error("Voucher has already been voided");
    }

    // Can only void if not posted or if it's been reversed
    if (existingVoucher.postingStatus === "posted") {
      throw new Error("Posted vouchers cannot be voided. Please reverse the GL posting first.");
    }

    return await voidExpenseVoucher(data.id, context.userId, data.reason);
  });

// Get vouchers pending GL posting
export const getVouchersPendingGLPostingFn = createServerFn()
  .inputValidator(
    z
      .object({
        limit: z.number().int().positive().max(100).optional().default(50),
        offset: z.number().int().min(0).optional().default(0),
      })
      .optional()
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    return await getVouchersPendingGLPosting({
      limit: data?.limit ?? 50,
      offset: data?.offset ?? 0,
    });
  });

// Get unreconciled vouchers
export const getUnreconciledVouchersFn = createServerFn()
  .inputValidator(
    z
      .object({
        limit: z.number().int().positive().max(100).optional().default(50),
        offset: z.number().int().min(0).optional().default(0),
      })
      .optional()
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    return await getUnreconciledVouchers({
      limit: data?.limit ?? 50,
      offset: data?.offset ?? 0,
    });
  });

// Add receipt attachment
const addReceiptAttachmentSchema = z.object({
  id: z.string(),
  attachment: receiptAttachmentSchema,
});

export const addReceiptAttachmentFn = createServerFn({
  method: "POST",
})
  .inputValidator(addReceiptAttachmentSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const existingVoucher = await findExpenseVoucherById(data.id);
    if (!existingVoucher) {
      throw new Error("Expense voucher not found");
    }

    // Only submitter can add attachments to draft vouchers
    if (existingVoucher.submitterId !== context.userId) {
      throw new Error("You can only add attachments to your own expense vouchers");
    }

    if (existingVoucher.status !== "draft") {
      throw new Error("Attachments can only be added to draft vouchers");
    }

    // Parse existing attachments
    const existingAttachments: ReceiptAttachment[] = existingVoucher.receiptAttachments
      ? JSON.parse(existingVoucher.receiptAttachments)
      : [];

    // Add new attachment
    existingAttachments.push(data.attachment);

    return await updateExpenseVoucher(data.id, {
      receiptAttachments: JSON.stringify(existingAttachments),
    });
  });

// Remove receipt attachment
const removeReceiptAttachmentSchema = z.object({
  id: z.string(),
  attachmentId: z.string(),
});

export const removeReceiptAttachmentFn = createServerFn({
  method: "POST",
})
  .inputValidator(removeReceiptAttachmentSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const existingVoucher = await findExpenseVoucherById(data.id);
    if (!existingVoucher) {
      throw new Error("Expense voucher not found");
    }

    if (existingVoucher.submitterId !== context.userId) {
      throw new Error("You can only remove attachments from your own expense vouchers");
    }

    if (existingVoucher.status !== "draft") {
      throw new Error("Attachments can only be removed from draft vouchers");
    }

    // Parse and filter attachments
    const existingAttachments: ReceiptAttachment[] = existingVoucher.receiptAttachments
      ? JSON.parse(existingVoucher.receiptAttachments)
      : [];

    const updatedAttachments = existingAttachments.filter(
      (att) => att.id !== data.attachmentId
    );

    return await updateExpenseVoucher(data.id, {
      receiptAttachments: JSON.stringify(updatedAttachments),
    });
  });
