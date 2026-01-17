import type {
  ExpenseWorkflowState,
  ExpenseWorkflowEventType,
  WorkflowConfig,
  ExpenseVoucher,
  ExpenseWorkflowInstance,
} from "~/db/schema";

/**
 * Valid state transitions for the expense workflow
 * Maps from current state to array of valid next states
 */
export const WORKFLOW_STATE_TRANSITIONS: Record<ExpenseWorkflowState, ExpenseWorkflowState[]> = {
  // Initial state
  draft: ["pending_approval", "voided"],

  // Approval flow
  pending_approval: ["approved", "rejected", "draft", "voided"], // Can return to draft for revision

  // Post-approval flow
  approved: ["disbursement_pending", "voided"],

  // Rejection is terminal (but can be reopened as draft)
  rejected: ["draft"],

  // Disbursement flow
  disbursement_pending: ["disbursed", "voided"],
  disbursed: ["receipt_pending", "receipt_captured", "reconciliation_pending"], // Receipt might already be captured

  // Receipt capture flow
  receipt_pending: ["receipt_captured", "voided"],
  receipt_captured: ["reconciliation_pending"],

  // Reconciliation flow
  reconciliation_pending: ["reconciled", "voided"],
  reconciled: ["gl_posting_pending"],

  // GL Posting flow
  gl_posting_pending: ["posted", "voided"],

  // Terminal states
  posted: [], // Cannot transition from posted (unless reversed via GL)
  voided: [], // Cannot transition from voided
};

/**
 * States that require action from an assignee
 */
export const ACTIONABLE_STATES: ExpenseWorkflowState[] = [
  "pending_approval",
  "disbursement_pending",
  "receipt_pending",
  "reconciliation_pending",
  "gl_posting_pending",
];

/**
 * Terminal states where the workflow is complete
 */
export const TERMINAL_STATES: ExpenseWorkflowState[] = ["posted", "rejected", "voided"];

/**
 * Event types that trigger notifications
 */
export const NOTIFICATION_EVENTS: ExpenseWorkflowEventType[] = [
  "submitted",
  "approved",
  "rejected",
  "returned_for_revision",
  "disbursed",
  "receipt_requested",
  "escalated",
  "reminder_sent",
  "gl_posted",
  "gl_posting_failed",
];

/**
 * Context passed to workflow transition handlers
 */
export interface WorkflowTransitionContext {
  voucher: ExpenseVoucher;
  workflowInstance: ExpenseWorkflowInstance;
  triggeredById: string;
  eventData?: Record<string, unknown>;
  comments?: string;
}

/**
 * Result of a workflow transition
 */
export interface WorkflowTransitionResult {
  success: boolean;
  newState?: ExpenseWorkflowState;
  workflowInstance?: ExpenseWorkflowInstance;
  notificationsSent?: string[]; // Notification IDs
  error?: string;
}

/**
 * Notification template for workflow events
 */
export interface WorkflowNotificationTemplate {
  title: string;
  body: string;
  actionUrl?: string;
  priority: "low" | "normal" | "high" | "urgent";
}

/**
 * Configuration for workflow state handlers
 */
export interface StateHandlerConfig {
  onEnter?: (context: WorkflowTransitionContext) => Promise<void>;
  onExit?: (context: WorkflowTransitionContext) => Promise<void>;
  getNotifications?: (context: WorkflowTransitionContext) => WorkflowNotificationTemplate[];
  getAssignee?: (context: WorkflowTransitionContext) => Promise<string | null>;
  getDueDate?: (context: WorkflowTransitionContext, config: WorkflowConfig) => Date | null;
}

/**
 * Default SLA durations in hours
 */
export const DEFAULT_SLA_DURATIONS: Required<NonNullable<WorkflowConfig["slaDurations"]>> = {
  approval: 48,
  disbursement: 24,
  receiptCapture: 72,
  reconciliation: 48,
  glPosting: 24,
};

/**
 * Default workflow configuration
 */
export const DEFAULT_WORKFLOW_CONFIG: WorkflowConfig = {
  autoApproveThreshold: 0, // Disabled by default
  requireReceiptAbove: 50, // Require receipt for expenses over $50
  slaDurations: DEFAULT_SLA_DURATIONS,
  reminderSchedule: {
    firstReminder: 24,
    subsequentReminders: 24,
    maxReminders: 3,
  },
};

/**
 * Maps expense voucher status to workflow state
 */
export function voucherStatusToWorkflowState(
  status: string,
  postingStatus?: string,
  reconciliationStatus?: string
): ExpenseWorkflowState {
  if (postingStatus === "posted") return "posted";
  if (reconciliationStatus === "reconciled") return "reconciled";

  switch (status) {
    case "draft":
      return "draft";
    case "pending_approval":
      return "pending_approval";
    case "approved":
      return "approved";
    case "rejected":
      return "rejected";
    case "posted":
      return "posted";
    case "voided":
      return "voided";
    default:
      return "draft";
  }
}

/**
 * Formats currency amount for display in notifications
 */
export function formatAmount(amount: string, currency: string = "USD"): string {
  const numAmount = parseFloat(amount);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(numAmount);
}
