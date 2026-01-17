/**
 * Call Recording Data Access Layer
 *
 * Database operations for call recordings, retention policies,
 * access logs, and encryption keys.
 */

import { eq, and, desc, lte, gte, isNull, count, sql, or, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { database } from "~/db";
import {
  callRecording,
  callRecordingRetentionPolicy,
  callRecordingAccessLog,
  callRecordingEncryptionKey,
  type CallRecording,
  type CreateCallRecordingData,
  type UpdateCallRecordingData,
  type CallRecordingRetentionPolicy,
  type CreateCallRecordingRetentionPolicyData,
  type UpdateCallRecordingRetentionPolicyData,
  type CallRecordingAccessLog,
  type CreateCallRecordingAccessLogData,
  type CallRecordingEncryptionKey,
  type CreateCallRecordingEncryptionKeyData,
  type UpdateCallRecordingEncryptionKeyData,
  type RecordingStatus,
  type RecordingAccessType,
} from "~/db/schema";
import type { RecordingFilters } from "~/lib/fusionpbx-recording-service/types";

// =============================================================================
// Call Recording CRUD Operations
// =============================================================================

/**
 * Create a new call recording entry
 */
export async function createCallRecording(
  data: CreateCallRecordingData
): Promise<CallRecording> {
  const insertData = {
    ...data,
    id: data.id || nanoid(),
    updatedAt: new Date(),
  };

  const [result] = await database
    .insert(callRecording)
    .values(insertData)
    .returning();

  return result;
}

/**
 * Find a call recording by ID
 */
export async function findCallRecordingById(
  id: string
): Promise<CallRecording | null> {
  const [result] = await database
    .select()
    .from(callRecording)
    .where(eq(callRecording.id, id))
    .limit(1);

  return result || null;
}

/**
 * Find a call recording by FusionPBX call UUID
 */
export async function findCallRecordingByFusionPBXUuid(
  fusionpbxCallUuid: string
): Promise<CallRecording | null> {
  const [result] = await database
    .select()
    .from(callRecording)
    .where(eq(callRecording.fusionpbxCallUuid, fusionpbxCallUuid))
    .limit(1);

  return result || null;
}

/**
 * Find call recordings by call record ID
 */
export async function findCallRecordingsByCallRecordId(
  callRecordId: string
): Promise<CallRecording[]> {
  return database
    .select()
    .from(callRecording)
    .where(eq(callRecording.callRecordId, callRecordId))
    .orderBy(desc(callRecording.createdAt));
}

/**
 * Update a call recording
 */
export async function updateCallRecording(
  id: string,
  data: UpdateCallRecordingData
): Promise<CallRecording | null> {
  const [result] = await database
    .update(callRecording)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(callRecording.id, id))
    .returning();

  return result || null;
}

/**
 * Delete a call recording (soft delete by updating status)
 */
export async function softDeleteCallRecording(id: string): Promise<boolean> {
  const result = await database
    .update(callRecording)
    .set({
      status: "deleted",
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(callRecording.id, id))
    .returning();

  return result.length > 0;
}

/**
 * Hard delete a call recording
 */
export async function deleteCallRecording(id: string): Promise<boolean> {
  const result = await database
    .delete(callRecording)
    .where(eq(callRecording.id, id))
    .returning();

  return result.length > 0;
}

/**
 * Get call recordings with filters
 */
export async function getCallRecordings(
  filters: RecordingFilters = {}
): Promise<CallRecording[]> {
  const {
    userId,
    callRecordId,
    status,
    startDate,
    endDate,
    hasExpired,
    storageProvider,
    limit = 50,
    offset = 0,
  } = filters;

  const conditions = [];

  if (userId) {
    conditions.push(eq(callRecording.userId, userId));
  }

  if (callRecordId) {
    conditions.push(eq(callRecording.callRecordId, callRecordId));
  }

  if (status) {
    conditions.push(eq(callRecording.status, status));
  }

  if (startDate) {
    conditions.push(gte(callRecording.createdAt, startDate));
  }

  if (endDate) {
    conditions.push(lte(callRecording.createdAt, endDate));
  }

  if (hasExpired === true) {
    conditions.push(lte(callRecording.expiresAt, new Date()));
  } else if (hasExpired === false) {
    conditions.push(gte(callRecording.expiresAt, new Date()));
  }

  if (storageProvider) {
    conditions.push(eq(callRecording.storageProvider, storageProvider));
  }

  const query = database
    .select()
    .from(callRecording)
    .orderBy(desc(callRecording.createdAt))
    .limit(limit)
    .offset(offset);

  if (conditions.length > 0) {
    return query.where(and(...conditions));
  }

  return query;
}

/**
 * Get recordings count with filters
 */
export async function getCallRecordingsCount(
  filters: Omit<RecordingFilters, "limit" | "offset"> = {}
): Promise<number> {
  const { userId, callRecordId, status, startDate, endDate, hasExpired } = filters;

  const conditions = [];

  if (userId) {
    conditions.push(eq(callRecording.userId, userId));
  }

  if (callRecordId) {
    conditions.push(eq(callRecording.callRecordId, callRecordId));
  }

  if (status) {
    conditions.push(eq(callRecording.status, status));
  }

  if (startDate) {
    conditions.push(gte(callRecording.createdAt, startDate));
  }

  if (endDate) {
    conditions.push(lte(callRecording.createdAt, endDate));
  }

  if (hasExpired === true) {
    conditions.push(lte(callRecording.expiresAt, new Date()));
  } else if (hasExpired === false) {
    conditions.push(gte(callRecording.expiresAt, new Date()));
  }

  const query = database.select({ count: count() }).from(callRecording);

  if (conditions.length > 0) {
    const [result] = await query.where(and(...conditions));
    return result?.count || 0;
  }

  const [result] = await query;
  return result?.count || 0;
}

/**
 * Get expired recordings for retention enforcement
 */
export async function getExpiredRecordings(
  limit: number = 100
): Promise<CallRecording[]> {
  return database
    .select()
    .from(callRecording)
    .where(
      and(
        lte(callRecording.expiresAt, new Date()),
        isNull(callRecording.deletedAt),
        or(
          eq(callRecording.status, "stored"),
          eq(callRecording.status, "encrypted")
        )
      )
    )
    .orderBy(callRecording.expiresAt)
    .limit(limit);
}

/**
 * Get recordings by status
 */
export async function getRecordingsByStatus(
  status: RecordingStatus,
  limit: number = 100
): Promise<CallRecording[]> {
  return database
    .select()
    .from(callRecording)
    .where(eq(callRecording.status, status))
    .orderBy(callRecording.createdAt)
    .limit(limit);
}

/**
 * Update recording status
 */
export async function updateRecordingStatus(
  id: string,
  status: RecordingStatus,
  errorMessage?: string
): Promise<CallRecording | null> {
  const updateData: UpdateCallRecordingData = {
    status,
    updatedAt: new Date(),
  };

  if (status === "processing") {
    updateData.processingStartedAt = new Date();
  } else if (status === "stored" || status === "encrypted") {
    updateData.processingCompletedAt = new Date();
  } else if (status === "failed") {
    updateData.errorMessage = errorMessage;
  }

  return updateCallRecording(id, updateData);
}

/**
 * Increment retry count for a recording
 */
export async function incrementRetryCount(
  id: string
): Promise<CallRecording | null> {
  const [result] = await database
    .update(callRecording)
    .set({
      retryCount: sql`${callRecording.retryCount} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(callRecording.id, id))
    .returning();

  return result || null;
}

// =============================================================================
// Retention Policy Operations
// =============================================================================

/**
 * Create a retention policy
 */
export async function createRetentionPolicy(
  data: CreateCallRecordingRetentionPolicyData
): Promise<CallRecordingRetentionPolicy> {
  const insertData = {
    ...data,
    id: data.id || nanoid(),
    updatedAt: new Date(),
  };

  const [result] = await database
    .insert(callRecordingRetentionPolicy)
    .values(insertData)
    .returning();

  return result;
}

/**
 * Find a retention policy by ID
 */
export async function findRetentionPolicyById(
  id: string
): Promise<CallRecordingRetentionPolicy | null> {
  const [result] = await database
    .select()
    .from(callRecordingRetentionPolicy)
    .where(eq(callRecordingRetentionPolicy.id, id))
    .limit(1);

  return result || null;
}

/**
 * Get all active retention policies sorted by priority
 */
export async function getActiveRetentionPolicies(): Promise<
  CallRecordingRetentionPolicy[]
> {
  return database
    .select()
    .from(callRecordingRetentionPolicy)
    .where(eq(callRecordingRetentionPolicy.isActive, true))
    .orderBy(callRecordingRetentionPolicy.priority);
}

/**
 * Get the default retention policy
 */
export async function getDefaultRetentionPolicy(): Promise<
  CallRecordingRetentionPolicy | null
> {
  const [result] = await database
    .select()
    .from(callRecordingRetentionPolicy)
    .where(
      and(
        eq(callRecordingRetentionPolicy.isActive, true),
        eq(callRecordingRetentionPolicy.isDefault, true)
      )
    )
    .limit(1);

  return result || null;
}

/**
 * Update a retention policy
 */
export async function updateRetentionPolicy(
  id: string,
  data: UpdateCallRecordingRetentionPolicyData
): Promise<CallRecordingRetentionPolicy | null> {
  const [result] = await database
    .update(callRecordingRetentionPolicy)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(callRecordingRetentionPolicy.id, id))
    .returning();

  return result || null;
}

/**
 * Delete a retention policy
 */
export async function deleteRetentionPolicy(id: string): Promise<boolean> {
  const result = await database
    .delete(callRecordingRetentionPolicy)
    .where(eq(callRecordingRetentionPolicy.id, id))
    .returning();

  return result.length > 0;
}

/**
 * Count active retention policies
 */
export async function countActiveRetentionPolicies(): Promise<number> {
  const [result] = await database
    .select({ count: count() })
    .from(callRecordingRetentionPolicy)
    .where(eq(callRecordingRetentionPolicy.isActive, true));

  return result?.count || 0;
}

// =============================================================================
// Access Log Operations
// =============================================================================

/**
 * Create an access log entry
 */
export async function createAccessLog(
  data: CreateCallRecordingAccessLogData
): Promise<CallRecordingAccessLog> {
  const insertData = {
    ...data,
    id: data.id || nanoid(),
  };

  const [result] = await database
    .insert(callRecordingAccessLog)
    .values(insertData)
    .returning();

  return result;
}

/**
 * Get access logs for a recording
 */
export async function getAccessLogsForRecording(
  recordingId: string,
  limit: number = 50
): Promise<CallRecordingAccessLog[]> {
  return database
    .select()
    .from(callRecordingAccessLog)
    .where(eq(callRecordingAccessLog.recordingId, recordingId))
    .orderBy(desc(callRecordingAccessLog.accessedAt))
    .limit(limit);
}

/**
 * Get access logs for a user
 */
export async function getAccessLogsByUser(
  userId: string,
  limit: number = 50
): Promise<CallRecordingAccessLog[]> {
  return database
    .select()
    .from(callRecordingAccessLog)
    .where(eq(callRecordingAccessLog.userId, userId))
    .orderBy(desc(callRecordingAccessLog.accessedAt))
    .limit(limit);
}

// =============================================================================
// Encryption Key Operations
// =============================================================================

/**
 * Create an encryption key entry
 */
export async function createEncryptionKey(
  data: CreateCallRecordingEncryptionKeyData
): Promise<CallRecordingEncryptionKey> {
  const insertData = {
    ...data,
    id: data.id || nanoid(),
  };

  const [result] = await database
    .insert(callRecordingEncryptionKey)
    .values(insertData)
    .returning();

  return result;
}

/**
 * Find an encryption key by ID
 */
export async function findEncryptionKeyById(
  id: string
): Promise<CallRecordingEncryptionKey | null> {
  const [result] = await database
    .select()
    .from(callRecordingEncryptionKey)
    .where(eq(callRecordingEncryptionKey.id, id))
    .limit(1);

  return result || null;
}

/**
 * Get the primary encryption key
 */
export async function getPrimaryEncryptionKey(): Promise<
  CallRecordingEncryptionKey | null
> {
  const [result] = await database
    .select()
    .from(callRecordingEncryptionKey)
    .where(
      and(
        eq(callRecordingEncryptionKey.isActive, true),
        eq(callRecordingEncryptionKey.isPrimary, true)
      )
    )
    .limit(1);

  return result || null;
}

/**
 * Get all active encryption keys
 */
export async function getActiveEncryptionKeys(): Promise<
  CallRecordingEncryptionKey[]
> {
  return database
    .select()
    .from(callRecordingEncryptionKey)
    .where(eq(callRecordingEncryptionKey.isActive, true))
    .orderBy(desc(callRecordingEncryptionKey.keyVersion));
}

/**
 * Update an encryption key
 */
export async function updateEncryptionKey(
  id: string,
  data: UpdateCallRecordingEncryptionKeyData
): Promise<CallRecordingEncryptionKey | null> {
  const [result] = await database
    .update(callRecordingEncryptionKey)
    .set(data)
    .where(eq(callRecordingEncryptionKey.id, id))
    .returning();

  return result || null;
}

/**
 * Set a key as the primary key (and unset others)
 */
export async function setPrimaryEncryptionKey(
  keyId: string
): Promise<boolean> {
  // First, unset all other keys as primary
  await database
    .update(callRecordingEncryptionKey)
    .set({ isPrimary: false })
    .where(eq(callRecordingEncryptionKey.isPrimary, true));

  // Set the specified key as primary
  const [result] = await database
    .update(callRecordingEncryptionKey)
    .set({ isPrimary: true })
    .where(eq(callRecordingEncryptionKey.id, keyId))
    .returning();

  return !!result;
}

/**
 * Count active encryption keys
 */
export async function countActiveEncryptionKeys(): Promise<number> {
  const [result] = await database
    .select({ count: count() })
    .from(callRecordingEncryptionKey)
    .where(eq(callRecordingEncryptionKey.isActive, true));

  return result?.count || 0;
}

/**
 * Get the next key version number
 */
export async function getNextKeyVersion(): Promise<number> {
  const [result] = await database
    .select({ maxVersion: sql`MAX(${callRecordingEncryptionKey.keyVersion})` })
    .from(callRecordingEncryptionKey);

  return ((result?.maxVersion as number) || 0) + 1;
}

// =============================================================================
// Statistics and Aggregation
// =============================================================================

/**
 * Get recording statistics
 */
export async function getRecordingStatistics(): Promise<{
  totalRecordings: number;
  pendingRecordings: number;
  encryptedRecordings: number;
  failedRecordings: number;
  totalStorageBytes: number;
  recordingsExpiringWithin7Days: number;
}> {
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  const [
    totalResult,
    pendingResult,
    encryptedResult,
    failedResult,
    storageResult,
    expiringResult,
  ] = await Promise.all([
    database.select({ count: count() }).from(callRecording),
    database
      .select({ count: count() })
      .from(callRecording)
      .where(eq(callRecording.status, "pending")),
    database
      .select({ count: count() })
      .from(callRecording)
      .where(eq(callRecording.status, "encrypted")),
    database
      .select({ count: count() })
      .from(callRecording)
      .where(eq(callRecording.status, "failed")),
    database
      .select({ total: sql`COALESCE(SUM(${callRecording.fileSize}), 0)` })
      .from(callRecording),
    database
      .select({ count: count() })
      .from(callRecording)
      .where(
        and(
          lte(callRecording.expiresAt, sevenDaysFromNow),
          gte(callRecording.expiresAt, new Date()),
          isNull(callRecording.deletedAt)
        )
      ),
  ]);

  return {
    totalRecordings: totalResult[0]?.count || 0,
    pendingRecordings: pendingResult[0]?.count || 0,
    encryptedRecordings: encryptedResult[0]?.count || 0,
    failedRecordings: failedResult[0]?.count || 0,
    totalStorageBytes: Number(storageResult[0]?.total || 0),
    recordingsExpiringWithin7Days: expiringResult[0]?.count || 0,
  };
}
