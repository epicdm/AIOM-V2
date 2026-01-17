/**
 * Overdue Task Monitor Module
 *
 * Provides monitoring capabilities for detecting overdue tasks
 * and escalating through configurable rules and supervisor alerts.
 *
 * @module overdue-task-monitor
 */

export {
  OverdueTaskMonitorService,
  getOverdueTaskMonitorService,
  processOverdueTasks,
} from "./service";

export {
  type EscalationSeverity,
  type EscalationRule,
  type OverdueTaskWithMetrics,
  type SupervisorAlert,
  type MonitorProcessResult,
  type MonitorStats,
  type MonitorConfig,
  DEFAULT_ESCALATION_RULES,
} from "./types";
