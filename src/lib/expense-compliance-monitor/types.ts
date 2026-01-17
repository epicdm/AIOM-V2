/**
 * Expense Compliance Monitor Types
 *
 * Type definitions for the expense compliance monitoring service that checks
 * expense requests for policy violations, missing documentation, and approval delays.
 */

// =============================================================================
// Compliance Check Types
// =============================================================================

export type ComplianceAlertType =
  // Policy violation alerts
  | "policy_amount_exceeded"
  | "policy_category_violation"
  | "policy_duplicate_expense"
  | "policy_vendor_not_approved"
  // Approval workflow alerts
  | "approval_delay"
  | "approval_bottleneck"
  | "approval_chain_incomplete"
  // Documentation alerts
  | "missing_receipt"
  | "missing_description"
  | "incomplete_gl_mapping"
  // Suspicious pattern alerts
  | "suspicious_pattern_round_amounts"
  | "suspicious_pattern_frequency"
  | "suspicious_pattern_split_transactions"
  | "suspicious_pattern_weekend_expenses";

export type ComplianceCheckCategory =
  | "policy_adherence"
  | "approval_workflow"
  | "documentation"
  | "suspicious_patterns";

export type ComplianceSeverity = "info" | "low" | "medium" | "high" | "critical";

export type ComplianceStatus = "healthy" | "warning" | "critical" | "unknown";

// =============================================================================
// Compliance Check Result Types
// =============================================================================

export interface ComplianceViolation {
  id: string;
  type: ComplianceAlertType;
  severity: ComplianceSeverity;
  title: string;
  description: string;
  affectedExpenseIds: string[];
  affectedUserIds: string[];
  suggestedAction: string;
  detectedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface ComplianceCheckResult {
  category: ComplianceCheckCategory;
  status: ComplianceStatus;
  score: number; // 0-100
  violations: ComplianceViolation[];
  metrics: ComplianceMetric[];
  lastChecked: Date;
  details?: string;
}

export interface ComplianceMetric {
  name: string;
  value: number;
  unit?: string;
  threshold?: {
    warning: number;
    critical: number;
  };
  trend?: "improving" | "stable" | "declining";
}

// =============================================================================
// Alert Types
// =============================================================================

export interface ComplianceAlert {
  id: string;
  type: ComplianceAlertType;
  severity: ComplianceSeverity;
  category: ComplianceCheckCategory;
  title: string;
  message: string;
  data: Record<string, unknown>;
  createdAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  acknowledgedBy?: string;
  notificationsSent: ComplianceAlertNotificationRecord[];
}

export interface ComplianceAlertNotificationRecord {
  userId: string;
  method: "push" | "email" | "in_app";
  sentAt: Date;
  status: "pending" | "sent" | "delivered" | "failed";
  messageId?: string;
  error?: string;
}

// =============================================================================
// Configuration Types
// =============================================================================

export interface ComplianceThresholds {
  policyAdherence: {
    maxExpenseAmount: number; // Maximum single expense amount without additional approval
    duplicateWindowDays: number; // Days to check for duplicate expenses
    duplicateAmountTolerance: number; // Percentage tolerance for duplicate detection
  };
  approvalWorkflow: {
    pendingApprovalWarningDays: number;
    pendingApprovalCriticalDays: number;
    approverBottleneckCount: number; // Number of pending items to flag bottleneck
  };
  documentation: {
    receiptRequiredAboveAmount: number;
    missingReceiptWarningDays: number;
    missingReceiptCriticalDays: number;
  };
  suspiciousPatterns: {
    roundAmountPercentage: number; // Percentage of round amounts to flag
    frequentExpenseThreshold: number; // Number of expenses per day to flag
    splitTransactionWindowHours: number; // Hours to check for split transactions
    splitTransactionAmountThreshold: number; // Total amount to flag as potential split
    weekendExpenseThreshold: number; // Number of weekend expenses to flag
  };
}

export interface ComplianceMonitorConfig {
  enabled: boolean;
  checkIntervalMinutes: number;
  thresholds: ComplianceThresholds;
  alertRecipients: {
    category: ComplianceCheckCategory;
    userIds: string[];
    notifyOnSeverity: ComplianceSeverity[];
  }[];
  quietHours: {
    enabled: boolean;
    start: string; // HH:mm
    end: string; // HH:mm
    timezone: string;
  };
  workingDays: number[]; // 0-6 (Sunday-Saturday)
}

// =============================================================================
// Process Result Types
// =============================================================================

export interface ComplianceProcessResult {
  timestamp: Date;
  duration: number; // milliseconds
  checksRun: number;
  violationsFound: number;
  alertsGenerated: number;
  notificationsSent: number;
  checkResults: ComplianceCheckResult[];
  errors: ComplianceError[];
}

export interface ComplianceError {
  category?: ComplianceCheckCategory;
  operation: string;
  error: string;
  timestamp: Date;
}

// =============================================================================
// Stats / Summary Types
// =============================================================================

export interface ComplianceStats {
  isProcessing: boolean;
  lastProcessedAt?: Date;
  totalChecksToday: number;
  violationsFoundToday: number;
  alertsGeneratedToday: number;
  overallComplianceScore: number;
  categoryScores: {
    category: ComplianceCheckCategory;
    score: number;
    status: ComplianceStatus;
    violationCount: number;
  }[];
}

export interface ComplianceDashboard {
  overallStatus: ComplianceStatus;
  overallScore: number;
  lastUpdated: Date;
  categories: {
    category: ComplianceCheckCategory;
    status: ComplianceStatus;
    score: number;
    activeViolations: number;
    lastChecked: Date;
  }[];
  recentAlerts: ComplianceAlert[];
  topViolationTypes: {
    type: ComplianceAlertType;
    count: number;
    severity: ComplianceSeverity;
  }[];
}

// =============================================================================
// Default Configuration
// =============================================================================

export const DEFAULT_COMPLIANCE_THRESHOLDS: ComplianceThresholds = {
  policyAdherence: {
    maxExpenseAmount: 5000, // $5,000 default limit
    duplicateWindowDays: 7,
    duplicateAmountTolerance: 5, // 5% tolerance
  },
  approvalWorkflow: {
    pendingApprovalWarningDays: 3,
    pendingApprovalCriticalDays: 7,
    approverBottleneckCount: 10,
  },
  documentation: {
    receiptRequiredAboveAmount: 25, // Receipts required above $25
    missingReceiptWarningDays: 3,
    missingReceiptCriticalDays: 7,
  },
  suspiciousPatterns: {
    roundAmountPercentage: 50, // Flag if >50% of expenses are round numbers
    frequentExpenseThreshold: 5, // Flag if >5 expenses per day by same user
    splitTransactionWindowHours: 24,
    splitTransactionAmountThreshold: 5000, // Flag if split transactions exceed limit
    weekendExpenseThreshold: 3, // Flag users with >3 weekend expenses in a week
  },
};

export const DEFAULT_COMPLIANCE_CONFIG: ComplianceMonitorConfig = {
  enabled: true,
  checkIntervalMinutes: 30,
  thresholds: DEFAULT_COMPLIANCE_THRESHOLDS,
  alertRecipients: [],
  quietHours: {
    enabled: true,
    start: "22:00",
    end: "08:00",
    timezone: "America/New_York",
  },
  workingDays: [1, 2, 3, 4, 5], // Monday to Friday
};
