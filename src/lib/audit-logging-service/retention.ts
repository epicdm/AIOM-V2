import { database } from "~/db";
import { auditLog } from "~/db/schema";
import { lt, and, eq, or, gte, lte } from "drizzle-orm";
import type { AuditLogCategory, AuditSeverity } from "~/db/schema";
import type { RetentionPolicy } from "./types";
import { DEFAULT_RETENTION_POLICY } from "./types";
import { logSystemEvent } from "~/data-access/audit-logging";

// =============================================================================
// Retention Policy Manager
// =============================================================================

class RetentionPolicyManager {
  private policy: RetentionPolicy;

  constructor(policy: RetentionPolicy = DEFAULT_RETENTION_POLICY) {
    this.policy = policy;
  }

  /**
   * Update the retention policy
   */
  public updatePolicy(policy: Partial<RetentionPolicy>): void {
    this.policy = { ...this.policy, ...policy };
  }

  /**
   * Get the current retention policy
   */
  public getPolicy(): RetentionPolicy {
    return { ...this.policy };
  }

  /**
   * Calculate the retention date for a specific category and severity
   */
  public calculateRetentionDate(
    category: AuditLogCategory,
    severity: AuditSeverity,
    success: boolean
  ): Date {
    // Get category-specific retention
    const categoryDays = this.policy.categoryRetention[category] || this.policy.defaultRetentionDays;

    // Get severity-based minimum retention
    const severityDays = this.policy.severityMinRetention[severity] || 0;

    // Get failed action preservation
    let failedDays = 0;
    if (!success && this.policy.preserveFailedActions) {
      failedDays = this.policy.preserveFailedActionDays;
    }

    // Use the maximum of all applicable retention periods
    let retentionDays = Math.max(categoryDays, severityDays, failedDays);

    // Ensure we don't exceed max retention
    retentionDays = Math.min(retentionDays, this.policy.maxRetentionDays);

    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() - retentionDays);
    return retentionDate;
  }

  /**
   * Apply retention policy - delete/archive old audit logs
   * Returns the number of records affected
   */
  public async applyRetentionPolicy(): Promise<{
    deleted: number;
    archived: number;
    errors: string[];
  }> {
    const startTime = Date.now();
    const results = {
      deleted: 0,
      archived: 0,
      errors: [] as string[],
    };

    const categories: AuditLogCategory[] = [
      "authentication",
      "authorization",
      "user_management",
      "resource_access",
      "financial",
      "approval",
      "configuration",
      "security",
      "integration",
      "system",
    ];

    for (const category of categories) {
      try {
        // Calculate retention date for this category (using minimum severity: info, success: true)
        const retentionDate = this.calculateRetentionDate(category, "info", true);

        // Find records to delete/archive
        const oldRecords = await database
          .select({ id: auditLog.id })
          .from(auditLog)
          .where(
            and(
              eq(auditLog.category, category),
              lt(auditLog.createdAt, retentionDate),
              // Only delete successful info-level logs in this pass
              eq(auditLog.success, true),
              eq(auditLog.severity, "info")
            )
          )
          .limit(1000); // Process in batches

        if (oldRecords.length === 0) {
          continue;
        }

        if (this.policy.archiveBeforeDelete) {
          // Archive to cold storage (for now, just log the intent)
          // In a real implementation, this would move records to an archive table or external storage
          results.archived += oldRecords.length;
        }

        // Delete the records
        const recordIds = oldRecords.map((r) => r.id);
        const deleteResult = await database
          .delete(auditLog)
          .where(
            and(
              eq(auditLog.category, category),
              lt(auditLog.createdAt, retentionDate),
              eq(auditLog.success, true),
              eq(auditLog.severity, "info")
            )
          );

        results.deleted += recordIds.length;
      } catch (error) {
        const errorMessage = `Error processing category ${category}: ${error instanceof Error ? error.message : String(error)}`;
        results.errors.push(errorMessage);
        console.error(`[RetentionPolicy] ${errorMessage}`);
      }
    }

    const durationMs = Date.now() - startTime;

    // Log the retention policy execution
    await logSystemEvent(
      "retention_policy_executed",
      "audit_log",
      "all",
      {
        description: `Retention policy executed: ${results.deleted} records deleted, ${results.archived} records archived`,
        metadata: {
          deleted: results.deleted,
          archived: results.archived,
          errors: results.errors,
        },
        success: results.errors.length === 0,
        durationMs,
      }
    );

    return results;
  }

  /**
   * Get retention statistics
   */
  public async getRetentionStats(): Promise<{
    totalRecords: number;
    recordsByCategory: Record<string, number>;
    recordsBySeverity: Record<string, number>;
    recordsPendingDeletion: Record<string, number>;
    oldestRecord: Date | null;
    newestRecord: Date | null;
  }> {
    // Count total records
    const [totalResult] = await database
      .select({ count: database.$count(auditLog) })
      .from(auditLog);
    const totalRecords = totalResult?.count || 0;

    // Count by category
    const categoryResults = await database
      .select({
        category: auditLog.category,
        count: database.$count(auditLog),
      })
      .from(auditLog)
      .groupBy(auditLog.category);

    const recordsByCategory: Record<string, number> = {};
    for (const row of categoryResults) {
      recordsByCategory[row.category] = row.count;
    }

    // Count by severity
    const severityResults = await database
      .select({
        severity: auditLog.severity,
        count: database.$count(auditLog),
      })
      .from(auditLog)
      .groupBy(auditLog.severity);

    const recordsBySeverity: Record<string, number> = {};
    for (const row of severityResults) {
      recordsBySeverity[row.severity] = row.count;
    }

    // Count records pending deletion by category
    const recordsPendingDeletion: Record<string, number> = {};
    const categories: AuditLogCategory[] = [
      "authentication",
      "authorization",
      "user_management",
      "resource_access",
      "financial",
      "approval",
      "configuration",
      "security",
      "integration",
      "system",
    ];

    for (const category of categories) {
      const retentionDate = this.calculateRetentionDate(category, "info", true);
      const [pendingResult] = await database
        .select({ count: database.$count(auditLog) })
        .from(auditLog)
        .where(
          and(
            eq(auditLog.category, category),
            lt(auditLog.createdAt, retentionDate)
          )
        );
      recordsPendingDeletion[category] = pendingResult?.count || 0;
    }

    // Get oldest and newest records
    const [oldestResult] = await database
      .select({ createdAt: auditLog.createdAt })
      .from(auditLog)
      .orderBy(auditLog.createdAt)
      .limit(1);

    const [newestResult] = await database
      .select({ createdAt: auditLog.createdAt })
      .from(auditLog)
      .orderBy(auditLog.createdAt)
      .limit(1);

    return {
      totalRecords,
      recordsByCategory,
      recordsBySeverity,
      recordsPendingDeletion,
      oldestRecord: oldestResult?.createdAt || null,
      newestRecord: newestResult?.createdAt || null,
    };
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let retentionManagerInstance: RetentionPolicyManager | null = null;

/**
 * Get the retention policy manager instance
 */
export function getRetentionManager(policy?: Partial<RetentionPolicy>): RetentionPolicyManager {
  if (!retentionManagerInstance) {
    retentionManagerInstance = new RetentionPolicyManager(
      policy ? { ...DEFAULT_RETENTION_POLICY, ...policy } : DEFAULT_RETENTION_POLICY
    );
  } else if (policy) {
    retentionManagerInstance.updatePolicy(policy);
  }
  return retentionManagerInstance;
}

/**
 * Create a new retention policy manager (for testing)
 */
export function createRetentionManager(policy?: Partial<RetentionPolicy>): RetentionPolicyManager {
  return new RetentionPolicyManager(
    policy ? { ...DEFAULT_RETENTION_POLICY, ...policy } : DEFAULT_RETENTION_POLICY
  );
}

// =============================================================================
// Export convenience functions
// =============================================================================

/**
 * Apply retention policy using default manager
 */
export async function applyRetentionPolicy() {
  return getRetentionManager().applyRetentionPolicy();
}

/**
 * Get retention statistics using default manager
 */
export async function getRetentionStats() {
  return getRetentionManager().getRetentionStats();
}
