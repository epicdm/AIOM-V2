/**
 * Expense Workflow Engine
 *
 * A state machine for managing the complete expense lifecycle from request
 * through approval, disbursement, receipt capture, reconciliation, and GL posting.
 *
 * Features:
 * - State machine with valid transitions
 * - Event sourcing for audit trail
 * - Notifications at each stage
 * - SLA tracking and escalation
 * - Configurable workflow rules
 *
 * States:
 * - draft: Initial state, expense being prepared
 * - pending_approval: Submitted and awaiting approval
 * - approved: Approved, ready for disbursement
 * - rejected: Rejected (terminal, can be revised)
 * - disbursement_pending: Disbursement initiated
 * - disbursed: Funds have been disbursed
 * - receipt_pending: Waiting for receipt upload
 * - receipt_captured: Receipt has been uploaded
 * - reconciliation_pending: Awaiting reconciliation
 * - reconciled: Reconciled with bank/records
 * - gl_posting_pending: Ready for GL posting
 * - posted: Posted to general ledger (terminal)
 * - voided: Voided/cancelled (terminal)
 */

export { ExpenseWorkflowEngine, expenseWorkflowEngine } from "./engine";

export {
  WORKFLOW_STATE_TRANSITIONS,
  ACTIONABLE_STATES,
  TERMINAL_STATES,
  NOTIFICATION_EVENTS,
  DEFAULT_WORKFLOW_CONFIG,
  DEFAULT_SLA_DURATIONS,
  formatAmount,
  voucherStatusToWorkflowState,
} from "./types";

export type {
  WorkflowTransitionContext,
  WorkflowTransitionResult,
  WorkflowNotificationTemplate,
  StateHandlerConfig,
} from "./types";

// Notification service
export {
  processPendingNotifications,
  getNotificationTemplate,
  buildNotificationContent,
  scheduleReminder,
  cancelPendingReminders,
  NOTIFICATION_TEMPLATES,
} from "./notification-service";

export type { NotificationType } from "./notification-service";
