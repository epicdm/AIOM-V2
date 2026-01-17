import type {
  ExpenseWorkflowState,
  ExpenseWorkflowEventType,
  ExpenseWorkflowInstance,
  ExpenseVoucher,
  WorkflowConfig,
} from "~/db/schema";
import {
  createWorkflowInstance,
  findWorkflowInstanceById,
  findWorkflowInstanceByVoucherId,
  updateWorkflowInstance,
  transitionWorkflowState,
  recordStateTransitionEvent,
  queueWorkflowNotification,
  escalateWorkflow,
  markWorkflowSLABreached,
} from "~/data-access/expense-workflow";
import {
  findExpenseVoucherById,
  updateExpenseVoucher,
} from "~/data-access/expense-vouchers";
import { createNotification } from "~/data-access/notifications";
import {
  WORKFLOW_STATE_TRANSITIONS,
  ACTIONABLE_STATES,
  TERMINAL_STATES,
  DEFAULT_WORKFLOW_CONFIG,
  DEFAULT_SLA_DURATIONS,
  formatAmount,
  type WorkflowTransitionContext,
  type WorkflowTransitionResult,
  type WorkflowNotificationTemplate,
} from "./types";

/**
 * ExpenseWorkflowEngine - State machine for managing expense lifecycle
 *
 * Manages the complete lifecycle of expenses from request through approval,
 * disbursement, receipt capture, reconciliation, and GL posting.
 */
export class ExpenseWorkflowEngine {
  private config: WorkflowConfig;

  constructor(config: Partial<WorkflowConfig> = {}) {
    this.config = { ...DEFAULT_WORKFLOW_CONFIG, ...config };
  }

  /**
   * Initialize a new workflow for a voucher
   */
  async initializeWorkflow(
    voucherId: string,
    triggeredById: string,
    customConfig?: Partial<WorkflowConfig>
  ): Promise<WorkflowTransitionResult> {
    const voucher = await findExpenseVoucherById(voucherId);
    if (!voucher) {
      return { success: false, error: "Voucher not found" };
    }

    // Check if workflow already exists
    const existingWorkflow = await findWorkflowInstanceByVoucherId(voucherId);
    if (existingWorkflow) {
      return {
        success: true,
        newState: existingWorkflow.currentState as ExpenseWorkflowState,
        workflowInstance: existingWorkflow,
      };
    }

    const workflowConfig = { ...this.config, ...customConfig };

    // Create workflow instance
    const workflowInstance = await createWorkflowInstance({
      id: crypto.randomUUID(),
      voucherId,
      currentState: "draft",
      workflowConfig: JSON.stringify(workflowConfig),
      currentAssigneeId: voucher.submitterId,
      slaDurations: JSON.stringify(workflowConfig.slaDurations || DEFAULT_SLA_DURATIONS),
    });

    // Record creation event
    await recordStateTransitionEvent(
      workflowInstance.id,
      voucherId,
      "created",
      null,
      "draft",
      triggeredById,
      { voucherNumber: voucher.voucherNumber }
    );

    return {
      success: true,
      newState: "draft",
      workflowInstance,
    };
  }

  /**
   * Validate if a state transition is allowed
   */
  isTransitionValid(fromState: ExpenseWorkflowState, toState: ExpenseWorkflowState): boolean {
    const validTransitions = WORKFLOW_STATE_TRANSITIONS[fromState] || [];
    return validTransitions.includes(toState);
  }

  /**
   * Perform a state transition
   */
  async transition(
    workflowInstanceId: string,
    toState: ExpenseWorkflowState,
    triggeredById: string,
    eventType: ExpenseWorkflowEventType,
    options: {
      eventData?: Record<string, unknown>;
      comments?: string;
      newAssigneeId?: string | null;
    } = {}
  ): Promise<WorkflowTransitionResult> {
    const workflowInstance = await findWorkflowInstanceById(workflowInstanceId);
    if (!workflowInstance) {
      return { success: false, error: "Workflow instance not found" };
    }

    const fromState = workflowInstance.currentState as ExpenseWorkflowState;

    // Validate transition
    if (!this.isTransitionValid(fromState, toState)) {
      return {
        success: false,
        error: `Invalid transition from ${fromState} to ${toState}`,
      };
    }

    const voucher = await findExpenseVoucherById(workflowInstance.voucherId);
    if (!voucher) {
      return { success: false, error: "Associated voucher not found" };
    }

    // Perform the transition
    const updatedWorkflow = await transitionWorkflowState(
      workflowInstanceId,
      toState,
      options.newAssigneeId
    );

    if (!updatedWorkflow) {
      return { success: false, error: "Failed to update workflow state" };
    }

    // Update the due date based on new state
    const dueDate = this.calculateDueDate(toState);
    if (dueDate) {
      await updateWorkflowInstance(workflowInstanceId, { dueDate });
    }

    // Record the event
    await recordStateTransitionEvent(
      workflowInstanceId,
      voucher.id,
      eventType,
      fromState,
      toState,
      triggeredById,
      options.eventData,
      options.comments
    );

    // Send notifications
    const context: WorkflowTransitionContext = {
      voucher,
      workflowInstance: updatedWorkflow,
      triggeredById,
      eventData: options.eventData,
      comments: options.comments,
    };

    const notificationsSent = await this.sendStateNotifications(
      context,
      fromState,
      toState,
      eventType
    );

    // Sync voucher status
    await this.syncVoucherStatus(voucher.id, toState);

    return {
      success: true,
      newState: toState,
      workflowInstance: updatedWorkflow,
      notificationsSent,
    };
  }

  /**
   * Submit expense for approval
   */
  async submitForApproval(
    voucherId: string,
    triggeredById: string,
    approverIds: string[]
  ): Promise<WorkflowTransitionResult> {
    // First ensure workflow exists
    let workflow = await findWorkflowInstanceByVoucherId(voucherId);
    if (!workflow) {
      const initResult = await this.initializeWorkflow(voucherId, triggeredById);
      if (!initResult.success || !initResult.workflowInstance) {
        return initResult;
      }
      workflow = initResult.workflowInstance;
    }

    const result = await this.transition(
      workflow.id,
      "pending_approval",
      triggeredById,
      "submitted",
      {
        eventData: { approverIds },
        newAssigneeId: approverIds[0] || null,
      }
    );

    if (result.success && approverIds.length > 0) {
      // Queue approval request notifications for each approver
      const voucher = await findExpenseVoucherById(voucherId);
      if (voucher) {
        for (const approverId of approverIds) {
          await queueWorkflowNotification(
            workflow.id,
            voucherId,
            approverId,
            "approval_request",
            "New Expense Approval Request",
            `You have a new expense voucher ${voucher.voucherNumber} for ${formatAmount(voucher.amount, voucher.currency)} awaiting your approval.`,
            `/dashboard/approvals/${voucherId}`,
            "high"
          );
        }
      }
    }

    return result;
  }

  /**
   * Approve expense
   */
  async approve(
    workflowInstanceId: string,
    approverId: string,
    comments?: string
  ): Promise<WorkflowTransitionResult> {
    const workflow = await findWorkflowInstanceById(workflowInstanceId);
    if (!workflow) {
      return { success: false, error: "Workflow not found" };
    }

    return await this.transition(
      workflowInstanceId,
      "approved",
      approverId,
      "approved",
      { comments }
    );
  }

  /**
   * Reject expense
   */
  async reject(
    workflowInstanceId: string,
    rejectorId: string,
    reason: string
  ): Promise<WorkflowTransitionResult> {
    return await this.transition(
      workflowInstanceId,
      "rejected",
      rejectorId,
      "rejected",
      {
        eventData: { reason },
        comments: reason,
      }
    );
  }

  /**
   * Return expense for revision (back to draft)
   */
  async returnForRevision(
    workflowInstanceId: string,
    returnedById: string,
    reason: string
  ): Promise<WorkflowTransitionResult> {
    const workflow = await findWorkflowInstanceById(workflowInstanceId);
    if (!workflow) {
      return { success: false, error: "Workflow not found" };
    }

    const voucher = await findExpenseVoucherById(workflow.voucherId);
    if (!voucher) {
      return { success: false, error: "Voucher not found" };
    }

    return await this.transition(
      workflowInstanceId,
      "draft",
      returnedById,
      "returned_for_revision",
      {
        eventData: { reason },
        comments: reason,
        newAssigneeId: voucher.submitterId, // Return to submitter
      }
    );
  }

  /**
   * Initiate disbursement
   */
  async initiateDisbursement(
    workflowInstanceId: string,
    triggeredById: string,
    disbursementData: {
      paymentMethod?: string;
      paymentReference?: string;
      bankAccountId?: string;
    }
  ): Promise<WorkflowTransitionResult> {
    return await this.transition(
      workflowInstanceId,
      "disbursement_pending",
      triggeredById,
      "disbursement_initiated",
      { eventData: disbursementData }
    );
  }

  /**
   * Mark as disbursed
   */
  async markDisbursed(
    workflowInstanceId: string,
    triggeredById: string,
    paymentDetails: {
      paymentReference: string;
      paymentDate: Date;
    }
  ): Promise<WorkflowTransitionResult> {
    const result = await this.transition(
      workflowInstanceId,
      "disbursed",
      triggeredById,
      "disbursed",
      { eventData: paymentDetails }
    );

    // Check if receipt is needed
    if (result.success && result.workflowInstance) {
      const voucher = await findExpenseVoucherById(result.workflowInstance.voucherId);
      if (voucher) {
        const amount = parseFloat(voucher.amount);
        const requireReceiptAbove = this.config.requireReceiptAbove || 50;

        if (amount >= requireReceiptAbove && !voucher.receiptAttachments) {
          // Transition to receipt_pending
          return await this.transition(
            workflowInstanceId,
            "receipt_pending",
            triggeredById,
            "receipt_requested",
            {
              newAssigneeId: voucher.submitterId,
            }
          );
        } else {
          // Skip to reconciliation
          return await this.transition(
            workflowInstanceId,
            "reconciliation_pending",
            triggeredById,
            "reconciliation_started"
          );
        }
      }
    }

    return result;
  }

  /**
   * Capture receipt
   */
  async captureReceipt(
    workflowInstanceId: string,
    triggeredById: string,
    receiptData: {
      receiptUrl?: string;
      attachments?: unknown[];
    }
  ): Promise<WorkflowTransitionResult> {
    const result = await this.transition(
      workflowInstanceId,
      "receipt_captured",
      triggeredById,
      "receipt_uploaded",
      { eventData: receiptData }
    );

    // Auto-transition to reconciliation
    if (result.success) {
      return await this.transition(
        workflowInstanceId,
        "reconciliation_pending",
        triggeredById,
        "reconciliation_started"
      );
    }

    return result;
  }

  /**
   * Mark as reconciled
   */
  async reconcile(
    workflowInstanceId: string,
    reconciledById: string,
    reconciliationData: {
      reference: string;
      notes?: string;
    }
  ): Promise<WorkflowTransitionResult> {
    const result = await this.transition(
      workflowInstanceId,
      "reconciled",
      reconciledById,
      "reconciled",
      { eventData: reconciliationData }
    );

    // Auto-transition to GL posting pending
    if (result.success) {
      return await this.transition(
        workflowInstanceId,
        "gl_posting_pending",
        reconciledById,
        "gl_posting_initiated"
      );
    }

    return result;
  }

  /**
   * Post to GL
   */
  async postToGL(
    workflowInstanceId: string,
    triggeredById: string,
    postingData: {
      journalEntryId: string;
      postingReference: string;
    }
  ): Promise<WorkflowTransitionResult> {
    return await this.transition(
      workflowInstanceId,
      "posted",
      triggeredById,
      "gl_posted",
      { eventData: postingData }
    );
  }

  /**
   * Mark GL posting as failed
   */
  async markGLPostingFailed(
    workflowInstanceId: string,
    triggeredById: string,
    errorMessage: string
  ): Promise<WorkflowTransitionResult> {
    const workflow = await findWorkflowInstanceById(workflowInstanceId);
    if (!workflow) {
      return { success: false, error: "Workflow not found" };
    }

    // Update retry count
    await updateWorkflowInstance(workflowInstanceId, {
      retryCount: workflow.retryCount + 1,
      lastRetryAt: new Date(),
      lastError: errorMessage,
    });

    // Record the failure event without state change
    await recordStateTransitionEvent(
      workflowInstanceId,
      workflow.voucherId,
      "gl_posting_failed",
      workflow.currentState,
      workflow.currentState,
      triggeredById,
      { error: errorMessage }
    );

    // Notify about failure
    const voucher = await findExpenseVoucherById(workflow.voucherId);
    if (voucher) {
      await queueWorkflowNotification(
        workflowInstanceId,
        workflow.voucherId,
        voucher.submitterId,
        "gl_posting_failed",
        "GL Posting Failed",
        `The GL posting for voucher ${voucher.voucherNumber} failed: ${errorMessage}`,
        `/dashboard/expenses/${voucher.id}`,
        "high"
      );
    }

    return {
      success: true,
      newState: workflow.currentState as ExpenseWorkflowState,
      workflowInstance: workflow,
    };
  }

  /**
   * Void expense
   */
  async void(
    workflowInstanceId: string,
    voidedById: string,
    reason: string
  ): Promise<WorkflowTransitionResult> {
    return await this.transition(
      workflowInstanceId,
      "voided",
      voidedById,
      "voided",
      {
        eventData: { reason },
        comments: reason,
      }
    );
  }

  /**
   * Escalate workflow to higher authority
   */
  async escalate(
    workflowInstanceId: string,
    escalatedById: string,
    newAssigneeId: string,
    reason: string
  ): Promise<WorkflowTransitionResult> {
    const workflow = await findWorkflowInstanceById(workflowInstanceId);
    if (!workflow) {
      return { success: false, error: "Workflow not found" };
    }

    const updatedWorkflow = await escalateWorkflow(
      workflowInstanceId,
      newAssigneeId,
      reason
    );

    if (!updatedWorkflow) {
      return { success: false, error: "Failed to escalate workflow" };
    }

    // Record escalation event
    await recordStateTransitionEvent(
      workflowInstanceId,
      workflow.voucherId,
      "escalated",
      workflow.currentState,
      workflow.currentState,
      escalatedById,
      { newAssigneeId, reason },
      reason
    );

    // Notify new assignee
    const voucher = await findExpenseVoucherById(workflow.voucherId);
    if (voucher) {
      await queueWorkflowNotification(
        workflowInstanceId,
        workflow.voucherId,
        newAssigneeId,
        "escalation",
        "Expense Escalated to You",
        `Expense voucher ${voucher.voucherNumber} has been escalated to you: ${reason}`,
        `/dashboard/approvals/${voucher.id}`,
        "urgent"
      );
    }

    return {
      success: true,
      newState: workflow.currentState as ExpenseWorkflowState,
      workflowInstance: updatedWorkflow,
    };
  }

  /**
   * Add a comment to the workflow
   */
  async addComment(
    workflowInstanceId: string,
    userId: string,
    comment: string
  ): Promise<void> {
    const workflow = await findWorkflowInstanceById(workflowInstanceId);
    if (!workflow) return;

    await recordStateTransitionEvent(
      workflowInstanceId,
      workflow.voucherId,
      "comment_added",
      workflow.currentState,
      workflow.currentState,
      userId,
      undefined,
      comment
    );
  }

  /**
   * Send reminder for pending action
   */
  async sendReminder(workflowInstanceId: string): Promise<void> {
    const workflow = await findWorkflowInstanceById(workflowInstanceId);
    if (!workflow || !workflow.currentAssigneeId) return;

    const voucher = await findExpenseVoucherById(workflow.voucherId);
    if (!voucher) return;

    await queueWorkflowNotification(
      workflowInstanceId,
      workflow.voucherId,
      workflow.currentAssigneeId,
      "reminder",
      "Action Required: Expense Pending",
      `Expense voucher ${voucher.voucherNumber} for ${formatAmount(voucher.amount, voucher.currency)} is awaiting your action.`,
      `/dashboard/approvals/${voucher.id}`,
      "high"
    );

    await recordStateTransitionEvent(
      workflowInstanceId,
      workflow.voucherId,
      "reminder_sent",
      workflow.currentState,
      workflow.currentState,
      null,
      { assigneeId: workflow.currentAssigneeId }
    );
  }

  /**
   * Check and mark SLA breaches
   */
  async checkSLABreach(workflowInstanceId: string): Promise<boolean> {
    const workflow = await findWorkflowInstanceById(workflowInstanceId);
    if (!workflow || workflow.isCompleted || workflow.slaBreached) {
      return false;
    }

    if (workflow.dueDate && new Date() > workflow.dueDate) {
      await markWorkflowSLABreached(workflowInstanceId, "Due date exceeded");
      return true;
    }

    return false;
  }

  // =============================================================================
  // Private Helper Methods
  // =============================================================================

  /**
   * Calculate due date for a state based on SLA durations
   */
  private calculateDueDate(state: ExpenseWorkflowState): Date | null {
    const slaDurations = this.config.slaDurations || DEFAULT_SLA_DURATIONS;
    let hours: number | undefined;

    switch (state) {
      case "pending_approval":
        hours = slaDurations.approval;
        break;
      case "disbursement_pending":
        hours = slaDurations.disbursement;
        break;
      case "receipt_pending":
        hours = slaDurations.receiptCapture;
        break;
      case "reconciliation_pending":
        hours = slaDurations.reconciliation;
        break;
      case "gl_posting_pending":
        hours = slaDurations.glPosting;
        break;
      default:
        return null;
    }

    if (hours) {
      const dueDate = new Date();
      dueDate.setHours(dueDate.getHours() + hours);
      return dueDate;
    }

    return null;
  }

  /**
   * Send notifications for a state transition
   */
  private async sendStateNotifications(
    context: WorkflowTransitionContext,
    fromState: ExpenseWorkflowState,
    toState: ExpenseWorkflowState,
    eventType: ExpenseWorkflowEventType
  ): Promise<string[]> {
    const notificationIds: string[] = [];
    const { voucher, workflowInstance, triggeredById } = context;

    // Determine notification recipients and content based on transition
    const notifications = this.getNotificationsForTransition(
      fromState,
      toState,
      eventType,
      voucher
    );

    for (const notification of notifications) {
      // Skip notifying the person who triggered the action
      if (notification.recipientId === triggeredById) continue;

      // Create in-app notification
      const notif = await createNotification({
        id: crypto.randomUUID(),
        userId: notification.recipientId,
        type: `expense_${eventType}`,
        title: notification.title,
        content: notification.body,
        relatedId: voucher.id,
        relatedType: "expense_voucher",
      });

      notificationIds.push(notif.id);

      // Also queue for workflow notification system
      await queueWorkflowNotification(
        workflowInstance.id,
        voucher.id,
        notification.recipientId,
        eventType,
        notification.title,
        notification.body,
        notification.actionUrl,
        notification.priority
      );
    }

    return notificationIds;
  }

  /**
   * Get notifications to send for a transition
   */
  private getNotificationsForTransition(
    fromState: ExpenseWorkflowState,
    toState: ExpenseWorkflowState,
    eventType: ExpenseWorkflowEventType,
    voucher: ExpenseVoucher
  ): Array<WorkflowNotificationTemplate & { recipientId: string }> {
    const notifications: Array<WorkflowNotificationTemplate & { recipientId: string }> = [];
    const amount = formatAmount(voucher.amount, voucher.currency);

    switch (eventType) {
      case "approved":
        // Notify submitter
        notifications.push({
          recipientId: voucher.submitterId,
          title: "Expense Approved",
          body: `Your expense voucher ${voucher.voucherNumber} for ${amount} has been approved.`,
          actionUrl: `/dashboard/expenses/${voucher.id}`,
          priority: "normal",
        });
        break;

      case "rejected":
        // Notify submitter
        notifications.push({
          recipientId: voucher.submitterId,
          title: "Expense Rejected",
          body: `Your expense voucher ${voucher.voucherNumber} for ${amount} has been rejected.`,
          actionUrl: `/dashboard/expenses/${voucher.id}`,
          priority: "high",
        });
        break;

      case "returned_for_revision":
        // Notify submitter
        notifications.push({
          recipientId: voucher.submitterId,
          title: "Expense Returned for Revision",
          body: `Your expense voucher ${voucher.voucherNumber} has been returned for revision.`,
          actionUrl: `/dashboard/expenses/${voucher.id}`,
          priority: "high",
        });
        break;

      case "disbursed":
        // Notify submitter
        notifications.push({
          recipientId: voucher.submitterId,
          title: "Expense Disbursed",
          body: `Your expense voucher ${voucher.voucherNumber} for ${amount} has been disbursed.`,
          actionUrl: `/dashboard/expenses/${voucher.id}`,
          priority: "normal",
        });
        break;

      case "receipt_requested":
        // Notify submitter
        notifications.push({
          recipientId: voucher.submitterId,
          title: "Receipt Required",
          body: `Please upload a receipt for expense voucher ${voucher.voucherNumber}.`,
          actionUrl: `/dashboard/expenses/${voucher.id}`,
          priority: "high",
        });
        break;

      case "gl_posted":
        // Notify submitter
        notifications.push({
          recipientId: voucher.submitterId,
          title: "Expense Posted to GL",
          body: `Your expense voucher ${voucher.voucherNumber} has been posted to the general ledger.`,
          actionUrl: `/dashboard/expenses/${voucher.id}`,
          priority: "low",
        });
        break;
    }

    return notifications;
  }

  /**
   * Sync the voucher status with the workflow state
   */
  private async syncVoucherStatus(
    voucherId: string,
    workflowState: ExpenseWorkflowState
  ): Promise<void> {
    // Map workflow states to voucher statuses
    const statusMap: Partial<Record<ExpenseWorkflowState, string>> = {
      draft: "draft",
      pending_approval: "pending_approval",
      approved: "approved",
      rejected: "rejected",
      posted: "posted",
      voided: "voided",
    };

    const newStatus = statusMap[workflowState];
    if (newStatus) {
      await updateExpenseVoucher(voucherId, { status: newStatus });
    }

    // Handle posting and reconciliation status
    if (workflowState === "posted") {
      await updateExpenseVoucher(voucherId, {
        postingStatus: "posted",
        postedAt: new Date(),
      });
    }

    if (workflowState === "reconciled") {
      await updateExpenseVoucher(voucherId, {
        reconciliationStatus: "reconciled",
        reconciliationDate: new Date(),
      });
    }
  }
}

// Export singleton instance for convenience
export const expenseWorkflowEngine = new ExpenseWorkflowEngine();
