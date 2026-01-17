/**
 * Expense Compliance Monitor
 *
 * Monitors expense requests for policy violations, missing documentation,
 * approval delays, and suspicious patterns.
 *
 * @module expense-compliance-monitor
 */

// Export types
export * from "./types";

// Export service
export {
  ExpenseComplianceMonitorService,
  getExpenseComplianceMonitorService,
  runExpenseComplianceChecks,
} from "./service";
