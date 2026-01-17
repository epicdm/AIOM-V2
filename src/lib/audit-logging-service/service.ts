import { createHash } from "crypto";
import {
  logAction,
  logAuthEvent,
  logResourceChange,
  logSecurityEvent,
  logSystemEvent,
  createAuditLogEntry,
} from "~/data-access/audit-logging";
import type { AuditLog, CreateAuditLogPayload, AuditLogCategory, AuditSeverity } from "~/db/schema";
import type {
  AuditEvent,
  AuditEventType,
  ActorContext,
  ResourceContext,
  ChangeContext,
  AuditServiceConfig,
  TamperProofChecksum,
} from "./types";
import { DEFAULT_AUDIT_CONFIG, DEFAULT_RETENTION_POLICY } from "./types";

// =============================================================================
// Audit Logging Service
// =============================================================================

class AuditLoggingService {
  private config: AuditServiceConfig;
  private eventQueue: AuditEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private lastChecksum: string | null = null;
  private isProcessing: boolean = false;

  constructor(config: Partial<AuditServiceConfig> = {}) {
    this.config = { ...DEFAULT_AUDIT_CONFIG, ...config };

    // Start the batch flush timer if batch writing is enabled
    if (this.config.asyncWrite && this.config.batchFlushIntervalMs > 0) {
      this.startFlushTimer();
    }
  }

  // ===========================================================================
  // Configuration
  // ===========================================================================

  /**
   * Update service configuration
   */
  public updateConfig(config: Partial<AuditServiceConfig>): void {
    this.config = { ...this.config, ...config };

    // Restart flush timer if interval changed
    if (config.batchFlushIntervalMs !== undefined) {
      this.stopFlushTimer();
      if (this.config.asyncWrite && this.config.batchFlushIntervalMs > 0) {
        this.startFlushTimer();
      }
    }
  }

  /**
   * Get current configuration
   */
  public getConfig(): AuditServiceConfig {
    return { ...this.config };
  }

  // ===========================================================================
  // Core Logging Methods
  // ===========================================================================

  /**
   * Log an audit event
   */
  public async log(event: AuditEvent): Promise<AuditLog | null> {
    if (!this.config.enabled) {
      return null;
    }

    // Check if event should be skipped
    if (this.config.skipEvents.includes(event.eventType)) {
      return null;
    }

    // Check minimum severity
    const severityOrder: Record<AuditSeverity, number> = {
      info: 0,
      warning: 1,
      critical: 2,
    };
    const eventSeverity = event.severity || "info";
    if (severityOrder[eventSeverity] < severityOrder[this.config.minSeverity]) {
      return null;
    }

    // If async write is enabled, queue the event
    if (this.config.asyncWrite) {
      this.eventQueue.push(event);

      // Flush if batch size is reached
      if (this.eventQueue.length >= this.config.batchSize) {
        void this.flush();
      }

      return null;
    }

    // Synchronous write
    return this.writeEvent(event);
  }

  /**
   * Write a single event to the database
   */
  private async writeEvent(event: AuditEvent): Promise<AuditLog> {
    const payload = this.eventToPayload(event);

    // Generate tamper-proof checksum if enabled
    if (this.config.enableChecksums) {
      const checksum = this.generateChecksum(payload);
      payload.metadata = {
        ...(payload.metadata || {}),
        _checksum: checksum,
        _previousChecksum: this.lastChecksum,
      };
      this.lastChecksum = checksum;
    }

    return logAction(payload);
  }

  /**
   * Convert AuditEvent to CreateAuditLogPayload
   */
  private eventToPayload(event: AuditEvent): CreateAuditLogPayload {
    return {
      action: event.eventType,
      category: event.category,
      severity: event.severity || "info",
      resourceType: event.resource.resourceType,
      resourceId: event.resource.resourceId,
      parentResourceType: event.resource.parentResourceType,
      parentResourceId: event.resource.parentResourceId,
      actorId: event.actor.actorId,
      actorType: event.actor.actorType,
      actorName: event.actor.actorName,
      actorEmail: event.actor.actorEmail,
      ipAddress: event.actor.ipAddress,
      userAgent: event.actor.userAgent,
      sessionId: event.actor.sessionId,
      requestId: event.actor.requestId,
      previousState: event.change?.previousState,
      newState: event.change?.newState,
      changedFields: event.change?.changedFields,
      description: event.change?.description,
      metadata: event.metadata,
      tags: event.tags,
      success: event.success ?? true,
      errorDetails: event.errorDetails,
      durationMs: event.durationMs,
    };
  }

  // ===========================================================================
  // Batch Processing
  // ===========================================================================

  /**
   * Flush the event queue
   */
  public async flush(): Promise<void> {
    if (this.isProcessing || this.eventQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const events = [...this.eventQueue];
    this.eventQueue = [];

    try {
      // Write events in parallel batches
      const batchPromises = events.map((event) => this.writeEvent(event));
      await Promise.allSettled(batchPromises);
    } catch (error) {
      console.error("[AuditService] Error flushing events:", error);
      // Re-add failed events to queue for retry
      this.eventQueue.unshift(...events);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Start the flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      void this.flush();
    }, this.config.batchFlushIntervalMs);
  }

  /**
   * Stop the flush timer
   */
  private stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  // ===========================================================================
  // Tamper-Proof Checksums
  // ===========================================================================

  /**
   * Generate a checksum for an audit log entry
   */
  private generateChecksum(payload: CreateAuditLogPayload): string {
    const data = JSON.stringify({
      action: payload.action,
      category: payload.category,
      resourceType: payload.resourceType,
      resourceId: payload.resourceId,
      actorId: payload.actorId,
      actorType: payload.actorType,
      previousState: payload.previousState,
      newState: payload.newState,
      timestamp: new Date().toISOString(),
      previousChecksum: this.lastChecksum,
    });

    return createHash("sha256").update(data).digest("hex");
  }

  /**
   * Verify the integrity of an audit log entry
   */
  public verifyChecksum(log: AuditLog, expectedPreviousChecksum: string | null): boolean {
    if (!this.config.enableChecksums) {
      return true;
    }

    const metadata = log.metadata ? JSON.parse(log.metadata) : {};
    const storedChecksum = metadata._checksum;
    const storedPreviousChecksum = metadata._previousChecksum;

    // Verify previous checksum chain
    if (storedPreviousChecksum !== expectedPreviousChecksum) {
      return false;
    }

    // Recalculate checksum
    const recalculatedData = JSON.stringify({
      action: log.action,
      category: log.category,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      actorId: log.actorId,
      actorType: log.actorType,
      previousState: log.previousState,
      newState: log.newState,
      timestamp: log.createdAt.toISOString(),
      previousChecksum: storedPreviousChecksum,
    });

    const recalculatedChecksum = createHash("sha256").update(recalculatedData).digest("hex");
    return recalculatedChecksum === storedChecksum;
  }

  // ===========================================================================
  // Convenience Logging Methods
  // ===========================================================================

  /**
   * Log an authentication event
   */
  public async logAuth(
    eventType: AuditEventType,
    actor: ActorContext,
    options?: {
      success?: boolean;
      metadata?: Record<string, unknown>;
      errorDetails?: Record<string, unknown>;
    }
  ): Promise<AuditLog | null> {
    return this.log({
      eventType,
      category: "authentication",
      severity: options?.success === false ? "warning" : "info",
      actor,
      resource: {
        resourceType: "user",
        resourceId: actor.actorId || "anonymous",
      },
      success: options?.success ?? true,
      metadata: options?.metadata,
      errorDetails: options?.errorDetails,
    });
  }

  /**
   * Log an approval event
   */
  public async logApproval(
    eventType: AuditEventType,
    actor: ActorContext,
    resource: ResourceContext,
    change?: ChangeContext,
    options?: {
      metadata?: Record<string, unknown>;
      tags?: string[];
    }
  ): Promise<AuditLog | null> {
    return this.log({
      eventType,
      category: "approval",
      severity: "info",
      actor,
      resource,
      change,
      metadata: options?.metadata,
      tags: options?.tags,
    });
  }

  /**
   * Log a financial event
   */
  public async logFinancial(
    eventType: AuditEventType,
    actor: ActorContext,
    resource: ResourceContext,
    change?: ChangeContext,
    options?: {
      severity?: AuditSeverity;
      metadata?: Record<string, unknown>;
      tags?: string[];
    }
  ): Promise<AuditLog | null> {
    return this.log({
      eventType,
      category: "financial",
      severity: options?.severity || "info",
      actor,
      resource,
      change,
      metadata: options?.metadata,
      tags: options?.tags,
    });
  }

  /**
   * Log a role change event
   */
  public async logRoleChange(
    actor: ActorContext,
    targetUserId: string,
    previousRole: string,
    newRole: string,
    options?: {
      metadata?: Record<string, unknown>;
    }
  ): Promise<AuditLog | null> {
    return this.log({
      eventType: "user.role_changed",
      category: "user_management",
      severity: "warning",
      actor,
      resource: {
        resourceType: "user",
        resourceId: targetUserId,
      },
      change: {
        previousState: { role: previousRole },
        newState: { role: newRole },
        changedFields: ["role"],
        description: `Role changed from ${previousRole} to ${newRole}`,
      },
      metadata: options?.metadata,
    });
  }

  /**
   * Log a transfer event
   */
  public async logTransfer(
    eventType: "financial.transfer_initiated" | "financial.transfer_completed" | "financial.transfer_failed",
    actor: ActorContext,
    transferId: string,
    details: {
      fromAccountId: string;
      toAccountId: string;
      amount: string;
      currency: string;
      reason?: string;
    },
    options?: {
      success?: boolean;
      errorDetails?: Record<string, unknown>;
    }
  ): Promise<AuditLog | null> {
    return this.log({
      eventType,
      category: "financial",
      severity: eventType === "financial.transfer_failed" ? "warning" : "info",
      actor,
      resource: {
        resourceType: "transfer",
        resourceId: transferId,
      },
      change: {
        description: `Transfer of ${details.amount} ${details.currency} from ${details.fromAccountId} to ${details.toAccountId}`,
        newState: details,
      },
      success: options?.success ?? (eventType !== "financial.transfer_failed"),
      errorDetails: options?.errorDetails,
      metadata: {
        fromAccountId: details.fromAccountId,
        toAccountId: details.toAccountId,
        amount: details.amount,
        currency: details.currency,
        reason: details.reason,
      },
    });
  }

  /**
   * Log a security event
   */
  public async logSecurity(
    eventType: AuditEventType,
    actor: ActorContext,
    resource: ResourceContext,
    options?: {
      severity?: AuditSeverity;
      description?: string;
      metadata?: Record<string, unknown>;
      success?: boolean;
      errorDetails?: Record<string, unknown>;
    }
  ): Promise<AuditLog | null> {
    return this.log({
      eventType,
      category: "security",
      severity: options?.severity || "warning",
      actor,
      resource,
      change: options?.description ? { description: options.description } : undefined,
      metadata: options?.metadata,
      success: options?.success ?? false,
      errorDetails: options?.errorDetails,
    });
  }

  /**
   * Log a system event
   */
  public async logSystem(
    eventType: AuditEventType,
    resourceType: string,
    resourceId: string,
    options?: {
      description?: string;
      metadata?: Record<string, unknown>;
      success?: boolean;
      errorDetails?: Record<string, unknown>;
      durationMs?: number;
    }
  ): Promise<AuditLog | null> {
    return this.log({
      eventType,
      category: "system",
      severity: options?.success === false ? "warning" : "info",
      actor: {
        actorId: null,
        actorType: "system",
      },
      resource: {
        resourceType,
        resourceId,
      },
      change: options?.description ? { description: options.description } : undefined,
      metadata: options?.metadata,
      success: options?.success ?? true,
      errorDetails: options?.errorDetails,
      durationMs: options?.durationMs,
    });
  }

  // ===========================================================================
  // Cleanup / Shutdown
  // ===========================================================================

  /**
   * Gracefully shutdown the service
   */
  public async shutdown(): Promise<void> {
    this.stopFlushTimer();
    await this.flush();
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let auditServiceInstance: AuditLoggingService | null = null;

/**
 * Get the audit logging service instance
 */
export function getAuditService(config?: Partial<AuditServiceConfig>): AuditLoggingService {
  if (!auditServiceInstance) {
    auditServiceInstance = new AuditLoggingService(config);
  } else if (config) {
    auditServiceInstance.updateConfig(config);
  }
  return auditServiceInstance;
}

/**
 * Create a new audit logging service instance (for testing)
 */
export function createAuditService(config?: Partial<AuditServiceConfig>): AuditLoggingService {
  return new AuditLoggingService(config);
}

// =============================================================================
// Export convenience functions
// =============================================================================

export const auditLog = getAuditService();
