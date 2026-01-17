// =============================================================================
// Audit Logging Service - Main Export
// =============================================================================
// Provides comprehensive audit logging with tamper-proof storage and retention policies
//
// Features:
// - Automatic logging of significant actions (approvals, transfers, role changes)
// - Tamper-proof checksums for audit trail integrity
// - Configurable retention policies for compliance
// - Async batch writing for performance
// - Category-based event classification
// - Full actor context (user, IP, session)
// - State change tracking (before/after)
//
// Usage:
//   import { auditLog, getAuditService } from '~/lib/audit-logging-service';
//
//   // Log an approval event
//   await auditLog.logApproval(
//     'approval.approved',
//     { actorId: userId, actorType: 'user', actorName: 'John Doe' },
//     { resourceType: 'expense_voucher', resourceId: voucherId },
//     { previousState: { status: 'pending' }, newState: { status: 'approved' } }
//   );
//
//   // Log a role change
//   await auditLog.logRoleChange(
//     { actorId: adminId, actorType: 'admin' },
//     targetUserId,
//     'user',
//     'admin'
//   );
//
//   // Log a financial transfer
//   await auditLog.logTransfer(
//     'financial.transfer_completed',
//     { actorId: userId, actorType: 'user' },
//     transferId,
//     { fromAccountId: 'A', toAccountId: 'B', amount: '1000', currency: 'USD' }
//   );
// =============================================================================

// Types
export * from "./types";

// Service
export {
  getAuditService,
  createAuditService,
  auditLog,
} from "./service";

// Retention
export {
  getRetentionManager,
  createRetentionManager,
  applyRetentionPolicy,
  getRetentionStats,
} from "./retention";

// Re-export data access functions for convenience
export {
  logAction,
  logAuthEvent,
  logResourceChange,
  logSecurityEvent,
  logSystemEvent,
  getAuditLogs,
  getAuditLogsWithActors,
  getAuditLogById,
  getAuditLogWithActor,
  getAuditLogCount,
  getResourceAuditLogs,
  getActorAuditLogs,
  getAuditLogsByCategory,
  getSecurityAuditLogs,
  getFailedActions,
  getAuditLogStats,
  parseAuditLogFields,
} from "~/data-access/audit-logging";
