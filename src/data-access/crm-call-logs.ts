/**
 * CRM Call Log Sync Data Access Layer
 *
 * Database operations for tracking call log synchronization
 * with Odoo CRM including partner linking and activity timeline updates.
 */

import { eq, desc, and, or, gte, lte, isNull, sql } from "drizzle-orm";
import { database } from "~/db";
import {
  crmCallLogSync,
  callRecord,
  user,
  type CrmCallLogSync,
  type CreateCrmCallLogSyncData,
  type UpdateCrmCallLogSyncData,
  type CrmCallLogSyncStatus,
} from "~/db/schema";

// =============================================================================
// Types
// =============================================================================

// Type for CRM call log sync with related data
export type CrmCallLogSyncWithRelations = CrmCallLogSync & {
  callRecord: {
    id: string;
    callerId: string;
    callerName: string | null;
    recipientId: string | null;
    recipientName: string | null;
    direction: string;
    duration: number;
    callTimestamp: Date;
    status: string;
    summary: string | null;
  };
  user: {
    id: string;
    name: string;
    email: string;
  };
};

// Sync options stored as JSON
export interface CrmSyncOptions {
  createPartnerIfNotFound?: boolean;
  createLeadIfNoOpen?: boolean;
  createActivity?: boolean;
  postMessage?: boolean;
  preferLeadOverPartner?: boolean;
}

export interface CrmCallLogSyncFilters {
  userId?: string;
  callRecordId?: string;
  status?: CrmCallLogSyncStatus;
  odooPartnerId?: number;
  odooLeadId?: number;
  startDate?: Date;
  endDate?: Date;
  hasError?: boolean;
  limit?: number;
  offset?: number;
}

export interface CrmCallLogSyncStats {
  total: number;
  pending: number;
  syncing: number;
  synced: number;
  failed: number;
  skipped: number;
  successRate: number;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generate a unique ID for CRM call log sync records
 */
function generateId(): string {
  return `crm_sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Parse sync options from JSON string
 */
export function parseSyncOptions(optionsJson: string | null): CrmSyncOptions | null {
  if (!optionsJson) return null;
  try {
    return JSON.parse(optionsJson) as CrmSyncOptions;
  } catch {
    return null;
  }
}

/**
 * Stringify sync options for database storage
 */
export function stringifySyncOptions(options: CrmSyncOptions): string {
  return JSON.stringify(options);
}

// =============================================================================
// CRUD Operations
// =============================================================================

/**
 * Create a new CRM call log sync record
 */
export async function createCrmCallLogSync(
  data: Omit<CreateCrmCallLogSyncData, "id">
): Promise<CrmCallLogSync> {
  const [result] = await database
    .insert(crmCallLogSync)
    .values({
      id: generateId(),
      ...data,
      updatedAt: new Date(),
    })
    .returning();

  return result;
}

/**
 * Find a CRM call log sync record by ID
 */
export async function findCrmCallLogSyncById(
  id: string
): Promise<CrmCallLogSync | null> {
  const [result] = await database
    .select()
    .from(crmCallLogSync)
    .where(eq(crmCallLogSync.id, id))
    .limit(1);

  return result || null;
}

/**
 * Find a CRM call log sync record by call record ID
 */
export async function findCrmCallLogSyncByCallRecordId(
  callRecordId: string
): Promise<CrmCallLogSync | null> {
  const [result] = await database
    .select()
    .from(crmCallLogSync)
    .where(eq(crmCallLogSync.callRecordId, callRecordId))
    .orderBy(desc(crmCallLogSync.createdAt))
    .limit(1);

  return result || null;
}

/**
 * Find a CRM call log sync record with all related data
 */
export async function findCrmCallLogSyncByIdWithRelations(
  id: string
): Promise<CrmCallLogSyncWithRelations | null> {
  const result = await database.query.crmCallLogSync.findFirst({
    where: eq(crmCallLogSync.id, id),
    with: {
      callRecord: {
        columns: {
          id: true,
          callerId: true,
          callerName: true,
          recipientId: true,
          recipientName: true,
          direction: true,
          duration: true,
          callTimestamp: true,
          status: true,
          summary: true,
        },
      },
      user: {
        columns: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return result as CrmCallLogSyncWithRelations | null;
}

/**
 * Update a CRM call log sync record
 */
export async function updateCrmCallLogSync(
  id: string,
  data: UpdateCrmCallLogSyncData
): Promise<CrmCallLogSync | null> {
  const [result] = await database
    .update(crmCallLogSync)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(crmCallLogSync.id, id))
    .returning();

  return result || null;
}

/**
 * Delete a CRM call log sync record
 */
export async function deleteCrmCallLogSync(id: string): Promise<boolean> {
  const result = await database
    .delete(crmCallLogSync)
    .where(eq(crmCallLogSync.id, id))
    .returning();

  return result.length > 0;
}

// =============================================================================
// Query Operations
// =============================================================================

/**
 * Get all CRM call log sync records with filters
 */
export async function getAllCrmCallLogSyncs(
  filters: CrmCallLogSyncFilters = {}
): Promise<CrmCallLogSync[]> {
  const {
    userId,
    callRecordId,
    status,
    odooPartnerId,
    odooLeadId,
    startDate,
    endDate,
    hasError,
    limit = 50,
    offset = 0,
  } = filters;

  const conditions = [];

  if (userId) {
    conditions.push(eq(crmCallLogSync.userId, userId));
  }

  if (callRecordId) {
    conditions.push(eq(crmCallLogSync.callRecordId, callRecordId));
  }

  if (status) {
    conditions.push(eq(crmCallLogSync.status, status));
  }

  if (odooPartnerId !== undefined) {
    conditions.push(eq(crmCallLogSync.odooPartnerId, odooPartnerId));
  }

  if (odooLeadId !== undefined) {
    conditions.push(eq(crmCallLogSync.odooLeadId, odooLeadId));
  }

  if (startDate) {
    conditions.push(gte(crmCallLogSync.createdAt, startDate));
  }

  if (endDate) {
    conditions.push(lte(crmCallLogSync.createdAt, endDate));
  }

  if (hasError === true) {
    conditions.push(sql`${crmCallLogSync.lastError} IS NOT NULL`);
  } else if (hasError === false) {
    conditions.push(isNull(crmCallLogSync.lastError));
  }

  const query = database
    .select()
    .from(crmCallLogSync)
    .orderBy(desc(crmCallLogSync.createdAt))
    .limit(limit)
    .offset(offset);

  if (conditions.length > 0) {
    return await query.where(and(...conditions));
  }

  return await query;
}

/**
 * Get CRM call log sync records for a specific user
 */
export async function getCrmCallLogSyncsByUser(
  userId: string,
  filters: Omit<CrmCallLogSyncFilters, "userId"> = {}
): Promise<CrmCallLogSync[]> {
  return await getAllCrmCallLogSyncs({ ...filters, userId });
}

/**
 * Get pending CRM call log sync records for batch processing
 */
export async function getPendingCrmCallLogSyncs(
  maxAttempts: number = 3,
  limit: number = 50
): Promise<CrmCallLogSync[]> {
  return await database
    .select()
    .from(crmCallLogSync)
    .where(
      and(
        or(
          eq(crmCallLogSync.status, "pending"),
          eq(crmCallLogSync.status, "failed")
        ),
        sql`${crmCallLogSync.syncAttempts} < ${maxAttempts}`
      )
    )
    .orderBy(crmCallLogSync.createdAt)
    .limit(limit);
}

/**
 * Get failed CRM call log sync records
 */
export async function getFailedCrmCallLogSyncs(
  userId?: string,
  limit: number = 50
): Promise<CrmCallLogSync[]> {
  const conditions = [eq(crmCallLogSync.status, "failed")];

  if (userId) {
    conditions.push(eq(crmCallLogSync.userId, userId));
  }

  return await database
    .select()
    .from(crmCallLogSync)
    .where(and(...conditions))
    .orderBy(desc(crmCallLogSync.updatedAt))
    .limit(limit);
}

/**
 * Check if a call record has been synced to CRM
 */
export async function isCallRecordSynced(callRecordId: string): Promise<boolean> {
  const sync = await findCrmCallLogSyncByCallRecordId(callRecordId);
  return sync !== null && sync.status === "synced";
}

// =============================================================================
// Sync Status Updates
// =============================================================================

/**
 * Mark a sync record as syncing (in progress)
 */
export async function markSyncInProgress(
  id: string
): Promise<CrmCallLogSync | null> {
  return await updateCrmCallLogSync(id, {
    status: "syncing",
    lastSyncAttempt: new Date(),
    syncAttempts: sql`${crmCallLogSync.syncAttempts} + 1` as unknown as number,
  });
}

/**
 * Mark a sync record as successfully synced
 */
export async function markSyncSuccess(
  id: string,
  odooData: {
    partnerId?: number;
    partnerName?: string;
    partnerPhone?: string;
    partnerEmail?: string;
    leadId?: number;
    leadName?: string;
    activityId?: number;
    messageId?: number;
  }
): Promise<CrmCallLogSync | null> {
  return await updateCrmCallLogSync(id, {
    status: "synced",
    syncedAt: new Date(),
    odooPartnerId: odooData.partnerId,
    partnerName: odooData.partnerName,
    partnerPhone: odooData.partnerPhone,
    partnerEmail: odooData.partnerEmail,
    odooLeadId: odooData.leadId,
    leadName: odooData.leadName,
    odooActivityId: odooData.activityId,
    odooMessageId: odooData.messageId,
    lastError: null,
    lastErrorCode: null,
  });
}

/**
 * Mark a sync record as failed
 */
export async function markSyncFailed(
  id: string,
  error: string,
  errorCode?: string
): Promise<CrmCallLogSync | null> {
  return await updateCrmCallLogSync(id, {
    status: "failed",
    lastError: error,
    lastErrorCode: errorCode || null,
  });
}

/**
 * Mark a sync record as skipped
 */
export async function markSyncSkipped(
  id: string,
  reason: string
): Promise<CrmCallLogSync | null> {
  return await updateCrmCallLogSync(id, {
    status: "skipped",
    lastError: reason,
    lastErrorCode: "SKIPPED",
  });
}

/**
 * Reset a failed sync for retry
 */
export async function resetSyncForRetry(
  id: string
): Promise<CrmCallLogSync | null> {
  return await updateCrmCallLogSync(id, {
    status: "pending",
    lastError: null,
    lastErrorCode: null,
  });
}

// =============================================================================
// Statistics
// =============================================================================

/**
 * Get sync statistics for a user
 */
export async function getCrmCallLogSyncStats(
  userId?: string,
  startDate?: Date,
  endDate?: Date
): Promise<CrmCallLogSyncStats> {
  const conditions = [];

  if (userId) {
    conditions.push(eq(crmCallLogSync.userId, userId));
  }

  if (startDate) {
    conditions.push(gte(crmCallLogSync.createdAt, startDate));
  }

  if (endDate) {
    conditions.push(lte(crmCallLogSync.createdAt, endDate));
  }

  // Get all records matching the filters
  const query = database.select().from(crmCallLogSync);
  const records =
    conditions.length > 0
      ? await query.where(and(...conditions))
      : await query;

  // Calculate stats
  const stats: CrmCallLogSyncStats = {
    total: records.length,
    pending: 0,
    syncing: 0,
    synced: 0,
    failed: 0,
    skipped: 0,
    successRate: 0,
  };

  for (const record of records) {
    switch (record.status) {
      case "pending":
        stats.pending++;
        break;
      case "syncing":
        stats.syncing++;
        break;
      case "synced":
        stats.synced++;
        break;
      case "failed":
        stats.failed++;
        break;
      case "skipped":
        stats.skipped++;
        break;
    }
  }

  // Calculate success rate (excluding pending and syncing)
  const completed = stats.synced + stats.failed + stats.skipped;
  stats.successRate = completed > 0 ? (stats.synced / completed) * 100 : 0;

  return stats;
}

/**
 * Get sync records by Odoo partner ID
 */
export async function getCrmCallLogSyncsByPartnerId(
  partnerId: number,
  limit: number = 50
): Promise<CrmCallLogSync[]> {
  return await database
    .select()
    .from(crmCallLogSync)
    .where(eq(crmCallLogSync.odooPartnerId, partnerId))
    .orderBy(desc(crmCallLogSync.createdAt))
    .limit(limit);
}

/**
 * Get sync records by Odoo lead ID
 */
export async function getCrmCallLogSyncsByLeadId(
  leadId: number,
  limit: number = 50
): Promise<CrmCallLogSync[]> {
  return await database
    .select()
    .from(crmCallLogSync)
    .where(eq(crmCallLogSync.odooLeadId, leadId))
    .orderBy(desc(crmCallLogSync.createdAt))
    .limit(limit);
}
