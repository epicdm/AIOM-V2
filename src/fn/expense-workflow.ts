import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authenticatedMiddleware } from "./middleware";
import {
  expenseWorkflowEngine,
  WORKFLOW_STATE_TRANSITIONS,
  ACTIONABLE_STATES,
  TERMINAL_STATES,
} from "~/lib/expense-workflow-engine";
import {
  findWorkflowInstanceById,
  findWorkflowInstanceByVoucherId,
  findWorkflowInstanceWithAssignee,
  getActiveWorkflowsForAssignee,
  getOverdueWorkflows,
  getWorkflowsWithBreachedSLA,
  getWorkflowEvents,
  getWorkflowEventsWithUsers,
  getPendingNotifications,
  markNotificationSent,
  markNotificationDelivered,
  markNotificationFailed,
  getNotificationsForRecipient,
} from "~/data-access/expense-workflow";
import { findExpenseVoucherById } from "~/data-access/expense-vouchers";
import type { ExpenseWorkflowState, WorkflowConfig } from "~/db/schema";

// =============================================================================
// Workflow Initialization
// =============================================================================

const initializeWorkflowSchema = z.object({
  voucherId: z.string(),
  config: z
    .object({
      autoApproveThreshold: z.number().optional(),
      requireReceiptAbove: z.number().optional(),
      slaDurations: z
        .object({
          approval: z.number().optional(),
          disbursement: z.number().optional(),
          receiptCapture: z.number().optional(),
          reconciliation: z.number().optional(),
          glPosting: z.number().optional(),
        })
        .optional(),
    })
    .optional(),
});

export const initializeExpenseWorkflowFn = createServerFn({
  method: "POST",
})
  .inputValidator(initializeWorkflowSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // Verify voucher exists
    const voucher = await findExpenseVoucherById(data.voucherId);
    if (!voucher) {
      throw new Error("Voucher not found");
    }

    // Verify user owns the voucher
    if (voucher.submitterId !== context.userId) {
      throw new Error("You can only initialize workflows for your own vouchers");
    }

    const result = await expenseWorkflowEngine.initializeWorkflow(
      data.voucherId,
      context.userId,
      data.config as Partial<WorkflowConfig>
    );

    if (!result.success) {
      throw new Error(result.error || "Failed to initialize workflow");
    }

    return result;
  });

// =============================================================================
// Get Workflow Information
// =============================================================================

export const getWorkflowByVoucherIdFn = createServerFn({
  method: "GET",
})
  .inputValidator(z.object({ voucherId: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    const workflow = await findWorkflowInstanceByVoucherId(data.voucherId);
    if (!workflow) {
      return null;
    }
    return workflow;
  });

export const getWorkflowWithAssigneeFn = createServerFn({
  method: "GET",
})
  .inputValidator(z.object({ workflowId: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    const workflow = await findWorkflowInstanceWithAssignee(data.workflowId);
    if (!workflow) {
      throw new Error("Workflow not found");
    }
    return workflow;
  });

export const getWorkflowEventsFn = createServerFn({
  method: "GET",
})
  .inputValidator(z.object({ workflowId: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    return await getWorkflowEventsWithUsers(data.workflowId);
  });

export const getMyActiveWorkflowsFn = createServerFn()
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    return await getActiveWorkflowsForAssignee(context.userId);
  });

// =============================================================================
// Submit for Approval
// =============================================================================

const submitForApprovalSchema = z.object({
  voucherId: z.string(),
  approverIds: z.array(z.string()).min(1, "At least one approver is required"),
});

export const submitExpenseForApprovalFn = createServerFn({
  method: "POST",
})
  .inputValidator(submitForApprovalSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // Verify voucher exists and user owns it
    const voucher = await findExpenseVoucherById(data.voucherId);
    if (!voucher) {
      throw new Error("Voucher not found");
    }

    if (voucher.submitterId !== context.userId) {
      throw new Error("You can only submit your own vouchers for approval");
    }

    if (voucher.status !== "draft") {
      throw new Error("Only draft vouchers can be submitted for approval");
    }

    // Prevent self-approval
    if (data.approverIds.includes(context.userId)) {
      throw new Error("You cannot be an approver for your own expense");
    }

    const result = await expenseWorkflowEngine.submitForApproval(
      data.voucherId,
      context.userId,
      data.approverIds
    );

    if (!result.success) {
      throw new Error(result.error || "Failed to submit for approval");
    }

    return result;
  });

// =============================================================================
// Approval Actions
// =============================================================================

const approveExpenseSchema = z.object({
  workflowId: z.string(),
  comments: z.string().max(1000).optional(),
});

export const approveExpenseWorkflowFn = createServerFn({
  method: "POST",
})
  .inputValidator(approveExpenseSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const workflow = await findWorkflowInstanceById(data.workflowId);
    if (!workflow) {
      throw new Error("Workflow not found");
    }

    // Verify user is the current assignee
    if (workflow.currentAssigneeId !== context.userId) {
      throw new Error("You are not authorized to approve this expense");
    }

    // Verify workflow is in pending_approval state
    if (workflow.currentState !== "pending_approval") {
      throw new Error("This expense is not pending approval");
    }

    const result = await expenseWorkflowEngine.approve(
      data.workflowId,
      context.userId,
      data.comments
    );

    if (!result.success) {
      throw new Error(result.error || "Failed to approve expense");
    }

    return result;
  });

const rejectExpenseSchema = z.object({
  workflowId: z.string(),
  reason: z.string().min(1, "Rejection reason is required").max(1000),
});

export const rejectExpenseWorkflowFn = createServerFn({
  method: "POST",
})
  .inputValidator(rejectExpenseSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const workflow = await findWorkflowInstanceById(data.workflowId);
    if (!workflow) {
      throw new Error("Workflow not found");
    }

    if (workflow.currentAssigneeId !== context.userId) {
      throw new Error("You are not authorized to reject this expense");
    }

    if (workflow.currentState !== "pending_approval") {
      throw new Error("This expense is not pending approval");
    }

    const result = await expenseWorkflowEngine.reject(
      data.workflowId,
      context.userId,
      data.reason
    );

    if (!result.success) {
      throw new Error(result.error || "Failed to reject expense");
    }

    return result;
  });

const returnForRevisionSchema = z.object({
  workflowId: z.string(),
  reason: z.string().min(1, "Revision reason is required").max(1000),
});

export const returnExpenseForRevisionFn = createServerFn({
  method: "POST",
})
  .inputValidator(returnForRevisionSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const workflow = await findWorkflowInstanceById(data.workflowId);
    if (!workflow) {
      throw new Error("Workflow not found");
    }

    if (workflow.currentAssigneeId !== context.userId) {
      throw new Error("You are not authorized to return this expense");
    }

    if (workflow.currentState !== "pending_approval") {
      throw new Error("This expense is not pending approval");
    }

    const result = await expenseWorkflowEngine.returnForRevision(
      data.workflowId,
      context.userId,
      data.reason
    );

    if (!result.success) {
      throw new Error(result.error || "Failed to return expense for revision");
    }

    return result;
  });

// =============================================================================
// Disbursement Actions
// =============================================================================

const initiateDisbursementSchema = z.object({
  workflowId: z.string(),
  paymentMethod: z.string().optional(),
  paymentReference: z.string().optional(),
  bankAccountId: z.string().optional(),
});

export const initiateDisbursementFn = createServerFn({
  method: "POST",
})
  .inputValidator(initiateDisbursementSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const workflow = await findWorkflowInstanceById(data.workflowId);
    if (!workflow) {
      throw new Error("Workflow not found");
    }

    if (workflow.currentState !== "approved") {
      throw new Error("Only approved expenses can be disbursed");
    }

    const result = await expenseWorkflowEngine.initiateDisbursement(
      data.workflowId,
      context.userId,
      {
        paymentMethod: data.paymentMethod,
        paymentReference: data.paymentReference,
        bankAccountId: data.bankAccountId,
      }
    );

    if (!result.success) {
      throw new Error(result.error || "Failed to initiate disbursement");
    }

    return result;
  });

const markDisbursedSchema = z.object({
  workflowId: z.string(),
  paymentReference: z.string(),
  paymentDate: z.string(),
});

export const markExpenseDisbursedFn = createServerFn({
  method: "POST",
})
  .inputValidator(markDisbursedSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const workflow = await findWorkflowInstanceById(data.workflowId);
    if (!workflow) {
      throw new Error("Workflow not found");
    }

    if (workflow.currentState !== "disbursement_pending") {
      throw new Error("Invalid workflow state for disbursement");
    }

    const result = await expenseWorkflowEngine.markDisbursed(
      data.workflowId,
      context.userId,
      {
        paymentReference: data.paymentReference,
        paymentDate: new Date(data.paymentDate),
      }
    );

    if (!result.success) {
      throw new Error(result.error || "Failed to mark as disbursed");
    }

    return result;
  });

// =============================================================================
// Receipt Capture
// =============================================================================

const captureReceiptSchema = z.object({
  workflowId: z.string(),
  receiptUrl: z.string().url().optional(),
  attachments: z.array(z.unknown()).optional(),
});

export const captureReceiptFn = createServerFn({
  method: "POST",
})
  .inputValidator(captureReceiptSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const workflow = await findWorkflowInstanceById(data.workflowId);
    if (!workflow) {
      throw new Error("Workflow not found");
    }

    // Allow receipt capture from receipt_pending or disbursed state
    if (!["receipt_pending", "disbursed"].includes(workflow.currentState)) {
      throw new Error("Invalid workflow state for receipt capture");
    }

    const result = await expenseWorkflowEngine.captureReceipt(
      data.workflowId,
      context.userId,
      {
        receiptUrl: data.receiptUrl,
        attachments: data.attachments,
      }
    );

    if (!result.success) {
      throw new Error(result.error || "Failed to capture receipt");
    }

    return result;
  });

// =============================================================================
// Reconciliation
// =============================================================================

const reconcileSchema = z.object({
  workflowId: z.string(),
  reference: z.string().min(1, "Reconciliation reference is required"),
  notes: z.string().max(1000).optional(),
});

export const reconcileExpenseFn = createServerFn({
  method: "POST",
})
  .inputValidator(reconcileSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const workflow = await findWorkflowInstanceById(data.workflowId);
    if (!workflow) {
      throw new Error("Workflow not found");
    }

    if (workflow.currentState !== "reconciliation_pending") {
      throw new Error("Invalid workflow state for reconciliation");
    }

    const result = await expenseWorkflowEngine.reconcile(
      data.workflowId,
      context.userId,
      {
        reference: data.reference,
        notes: data.notes,
      }
    );

    if (!result.success) {
      throw new Error(result.error || "Failed to reconcile expense");
    }

    return result;
  });

// =============================================================================
// GL Posting
// =============================================================================

const postToGLSchema = z.object({
  workflowId: z.string(),
  journalEntryId: z.string(),
  postingReference: z.string(),
});

export const postExpenseToGLFn = createServerFn({
  method: "POST",
})
  .inputValidator(postToGLSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const workflow = await findWorkflowInstanceById(data.workflowId);
    if (!workflow) {
      throw new Error("Workflow not found");
    }

    if (workflow.currentState !== "gl_posting_pending") {
      throw new Error("Invalid workflow state for GL posting");
    }

    const result = await expenseWorkflowEngine.postToGL(
      data.workflowId,
      context.userId,
      {
        journalEntryId: data.journalEntryId,
        postingReference: data.postingReference,
      }
    );

    if (!result.success) {
      throw new Error(result.error || "Failed to post to GL");
    }

    return result;
  });

const markGLPostingFailedSchema = z.object({
  workflowId: z.string(),
  errorMessage: z.string(),
});

export const markGLPostingFailedFn = createServerFn({
  method: "POST",
})
  .inputValidator(markGLPostingFailedSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const workflow = await findWorkflowInstanceById(data.workflowId);
    if (!workflow) {
      throw new Error("Workflow not found");
    }

    const result = await expenseWorkflowEngine.markGLPostingFailed(
      data.workflowId,
      context.userId,
      data.errorMessage
    );

    if (!result.success) {
      throw new Error(result.error || "Failed to record GL posting failure");
    }

    return result;
  });

// =============================================================================
// Void and Escalation
// =============================================================================

const voidExpenseSchema = z.object({
  workflowId: z.string(),
  reason: z.string().min(1, "Void reason is required").max(1000),
});

export const voidExpenseWorkflowFn = createServerFn({
  method: "POST",
})
  .inputValidator(voidExpenseSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const workflow = await findWorkflowInstanceById(data.workflowId);
    if (!workflow) {
      throw new Error("Workflow not found");
    }

    // Cannot void if already voided
    if (workflow.currentState === "voided") {
      throw new Error("Expense is already voided");
    }

    // Cannot void if posted
    if (workflow.currentState === "posted") {
      throw new Error("Posted expenses cannot be voided");
    }

    const result = await expenseWorkflowEngine.void(
      data.workflowId,
      context.userId,
      data.reason
    );

    if (!result.success) {
      throw new Error(result.error || "Failed to void expense");
    }

    return result;
  });

const escalateSchema = z.object({
  workflowId: z.string(),
  newAssigneeId: z.string(),
  reason: z.string().min(1, "Escalation reason is required").max(1000),
});

export const escalateExpenseWorkflowFn = createServerFn({
  method: "POST",
})
  .inputValidator(escalateSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const workflow = await findWorkflowInstanceById(data.workflowId);
    if (!workflow) {
      throw new Error("Workflow not found");
    }

    if (workflow.isCompleted) {
      throw new Error("Completed workflows cannot be escalated");
    }

    const result = await expenseWorkflowEngine.escalate(
      data.workflowId,
      context.userId,
      data.newAssigneeId,
      data.reason
    );

    if (!result.success) {
      throw new Error(result.error || "Failed to escalate expense");
    }

    return result;
  });

// =============================================================================
// Comments and Reminders
// =============================================================================

const addCommentSchema = z.object({
  workflowId: z.string(),
  comment: z.string().min(1, "Comment is required").max(2000),
});

export const addWorkflowCommentFn = createServerFn({
  method: "POST",
})
  .inputValidator(addCommentSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const workflow = await findWorkflowInstanceById(data.workflowId);
    if (!workflow) {
      throw new Error("Workflow not found");
    }

    await expenseWorkflowEngine.addComment(
      data.workflowId,
      context.userId,
      data.comment
    );

    return { success: true };
  });

export const sendWorkflowReminderFn = createServerFn({
  method: "POST",
})
  .inputValidator(z.object({ workflowId: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    const workflow = await findWorkflowInstanceById(data.workflowId);
    if (!workflow) {
      throw new Error("Workflow not found");
    }

    if (workflow.isCompleted) {
      throw new Error("Cannot send reminders for completed workflows");
    }

    await expenseWorkflowEngine.sendReminder(data.workflowId);

    return { success: true };
  });

// =============================================================================
// Admin/Dashboard Functions
// =============================================================================

export const getOverdueWorkflowsFn = createServerFn()
  .middleware([authenticatedMiddleware])
  .handler(async () => {
    return await getOverdueWorkflows();
  });

export const getWorkflowsWithBreachedSLAFn = createServerFn()
  .middleware([authenticatedMiddleware])
  .handler(async () => {
    return await getWorkflowsWithBreachedSLA();
  });

export const getMyWorkflowNotificationsFn = createServerFn()
  .inputValidator(
    z
      .object({
        limit: z.number().int().positive().max(50).optional().default(20),
        includeDelivered: z.boolean().optional().default(false),
      })
      .optional()
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    return await getNotificationsForRecipient(
      context.userId,
      data?.limit ?? 20,
      data?.includeDelivered ?? false
    );
  });

// =============================================================================
// Workflow State Info (for UI)
// =============================================================================

export const getWorkflowStateInfoFn = createServerFn()
  .middleware([authenticatedMiddleware])
  .handler(async () => {
    return {
      transitions: WORKFLOW_STATE_TRANSITIONS,
      actionableStates: ACTIONABLE_STATES,
      terminalStates: TERMINAL_STATES,
    };
  });

export const getValidTransitionsFn = createServerFn({
  method: "GET",
})
  .inputValidator(z.object({ currentState: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    const state = data.currentState as ExpenseWorkflowState;
    return WORKFLOW_STATE_TRANSITIONS[state] || [];
  });
