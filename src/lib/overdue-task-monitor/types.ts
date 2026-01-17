/**
 * Overdue Task Monitor Types
 *
 * Type definitions for the overdue task monitoring and escalation system.
 */

/**
 * Escalation rule severity levels
 */
export type EscalationSeverity = "low" | "medium" | "high" | "critical";

/**
 * Escalation rule configuration
 */
export interface EscalationRule {
  /** Rule identifier */
  id: string;
  /** Rule name */
  name: string;
  /** Hours overdue to trigger this rule */
  hoursOverdueThreshold: number;
  /** Severity level */
  severity: EscalationSeverity;
  /** Whether to notify the task assignee */
  notifyAssignee: boolean;
  /** Whether to notify the supervisor */
  notifySupervisor: boolean;
  /** Whether to send push notification */
  sendPushNotification: boolean;
  /** Whether to send email notification */
  sendEmailNotification: boolean;
  /** Notification frequency in hours (0 = only once) */
  notificationFrequencyHours: number;
  /** Whether this rule is enabled */
  isEnabled: boolean;
}

/**
 * Default escalation rules
 */
export const DEFAULT_ESCALATION_RULES: EscalationRule[] = [
  {
    id: "level-1-warning",
    name: "Level 1 - Warning",
    hoursOverdueThreshold: 24,
    severity: "low",
    notifyAssignee: true,
    notifySupervisor: false,
    sendPushNotification: true,
    sendEmailNotification: false,
    notificationFrequencyHours: 24,
    isEnabled: true,
  },
  {
    id: "level-2-attention",
    name: "Level 2 - Attention Needed",
    hoursOverdueThreshold: 48,
    severity: "medium",
    notifyAssignee: true,
    notifySupervisor: true,
    sendPushNotification: true,
    sendEmailNotification: false,
    notificationFrequencyHours: 12,
    isEnabled: true,
  },
  {
    id: "level-3-escalation",
    name: "Level 3 - Supervisor Escalation",
    hoursOverdueThreshold: 72,
    severity: "high",
    notifyAssignee: true,
    notifySupervisor: true,
    sendPushNotification: true,
    sendEmailNotification: true,
    notificationFrequencyHours: 8,
    isEnabled: true,
  },
  {
    id: "level-4-critical",
    name: "Level 4 - Critical Alert",
    hoursOverdueThreshold: 120,
    severity: "critical",
    notifyAssignee: true,
    notifySupervisor: true,
    sendPushNotification: true,
    sendEmailNotification: true,
    notificationFrequencyHours: 4,
    isEnabled: true,
  },
];

/**
 * Overdue task with monitoring metadata
 */
export interface OverdueTaskWithMetrics {
  /** Task ID */
  taskId: number;
  /** Task name */
  taskName: string;
  /** Project ID */
  projectId: number | null;
  /** Project name */
  projectName: string | null;
  /** Task deadline */
  deadline: string | null;
  /** Hours overdue */
  hoursOverdue: number;
  /** Days overdue */
  daysOverdue: number;
  /** Priority (0 = normal, 1 = high) */
  priority: string;
  /** Stage name */
  stageName: string | null;
  /** Assigned user IDs */
  assigneeIds: number[];
  /** Assigned user names */
  assigneeNames: string[];
  /** Current escalation level */
  escalationLevel: number;
  /** Last notification sent at */
  lastNotificationAt: Date | null;
  /** Matched escalation rule */
  matchedRule: EscalationRule | null;
  /** Whether notification should be sent */
  shouldNotify: boolean;
}

/**
 * Supervisor alert data
 */
export interface SupervisorAlert {
  /** Supervisor user ID */
  supervisorId: string;
  /** Supervisor name */
  supervisorName: string;
  /** Supervisor email */
  supervisorEmail: string;
  /** Team member user ID */
  teamMemberId: string;
  /** Team member name */
  teamMemberName: string;
  /** Overdue tasks for this team member */
  overdueTasks: OverdueTaskWithMetrics[];
  /** Total hours overdue across all tasks */
  totalHoursOverdue: number;
  /** Most severe escalation level */
  maxEscalationLevel: number;
  /** Alert severity */
  severity: EscalationSeverity;
}

/**
 * Monitor processing result
 */
export interface MonitorProcessResult {
  /** Number of users processed */
  processed: number;
  /** Number of overdue tasks found */
  overdueTasksFound: number;
  /** Number of notifications sent to assignees */
  assigneeNotificationsSent: number;
  /** Number of supervisor alerts sent */
  supervisorAlertsSent: number;
  /** Number of tasks skipped (already notified within frequency) */
  skipped: number;
  /** Processing errors */
  errors: Array<{
    userId?: string;
    taskId?: number;
    error: string;
  }>;
  /** Timestamp of processing */
  processedAt: Date;
}

/**
 * Monitor statistics
 */
export interface MonitorStats {
  /** Number of users with enabled monitoring */
  enabledUsers: number;
  /** Number of overdue tasks currently */
  currentOverdueTasks: number;
  /** Number of critical tasks (level 3+) */
  criticalTasks: number;
  /** Whether monitor is currently processing */
  isProcessing: boolean;
  /** Last processed timestamp */
  lastProcessedAt: Date | null;
}

/**
 * Monitor configuration
 */
export interface MonitorConfig {
  /** Custom escalation rules (optional, uses defaults if not provided) */
  escalationRules?: EscalationRule[];
  /** Maximum tasks to process per run */
  maxTasksPerRun?: number;
  /** Whether to include high-priority tasks only */
  highPriorityOnly?: boolean;
  /** Project IDs to include (optional, all if not specified) */
  projectIds?: number[];
}
