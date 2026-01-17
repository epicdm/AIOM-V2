import { eq, desc, count, and, or, ilike, gte, lte, between } from "drizzle-orm";
import { database } from "~/db";
import {
  callRecord,
  user,
  type CallRecord,
  type CreateCallRecordData,
  type UpdateCallRecordData,
  type CallDirection,
  type CallStatus,
} from "~/db/schema";

// Type for call record with user info
export type CallRecordWithUser = CallRecord & {
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
};

export interface CallRecordFilters {
  direction?: CallDirection;
  status?: CallStatus;
  userId?: string;
  callerId?: string;
  startDate?: Date;
  endDate?: Date;
  hasSummary?: boolean;
  hasRecording?: boolean;
  searchQuery?: string;
  limit?: number;
  offset?: number;
}

/**
 * Create a new call record
 */
export async function createCallRecord(
  data: CreateCallRecordData
): Promise<CallRecord> {
  const [result] = await database
    .insert(callRecord)
    .values({
      ...data,
      updatedAt: new Date(),
    })
    .returning();

  return result;
}

/**
 * Find a call record by ID
 */
export async function findCallRecordById(
  id: string
): Promise<CallRecord | null> {
  const [result] = await database
    .select()
    .from(callRecord)
    .where(eq(callRecord.id, id))
    .limit(1);

  return result || null;
}

/**
 * Find a call record by ID with user info
 */
export async function findCallRecordByIdWithUser(
  id: string
): Promise<CallRecordWithUser | null> {
  const result = await database.query.callRecord.findFirst({
    where: eq(callRecord.id, id),
    with: {
      user: {
        columns: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });

  return result as CallRecordWithUser | null;
}

/**
 * Find a call record by external call ID
 */
export async function findCallRecordByExternalId(
  externalCallId: string
): Promise<CallRecord | null> {
  const [result] = await database
    .select()
    .from(callRecord)
    .where(eq(callRecord.externalCallId, externalCallId))
    .limit(1);

  return result || null;
}

/**
 * Update a call record
 */
export async function updateCallRecord(
  id: string,
  data: UpdateCallRecordData
): Promise<CallRecord | null> {
  const [result] = await database
    .update(callRecord)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(callRecord.id, id))
    .returning();

  return result || null;
}

/**
 * Delete a call record
 */
export async function deleteCallRecord(id: string): Promise<boolean> {
  const result = await database
    .delete(callRecord)
    .where(eq(callRecord.id, id))
    .returning();

  return result.length > 0;
}

/**
 * Get all call records with optional filters
 */
export async function getAllCallRecords(
  filters: CallRecordFilters = {}
): Promise<CallRecord[]> {
  const {
    direction,
    status,
    userId,
    callerId,
    startDate,
    endDate,
    hasSummary,
    hasRecording,
    searchQuery,
    limit = 50,
    offset = 0,
  } = filters;

  const conditions = [];

  if (direction) {
    conditions.push(eq(callRecord.direction, direction));
  }

  if (status) {
    conditions.push(eq(callRecord.status, status));
  }

  if (userId) {
    conditions.push(eq(callRecord.userId, userId));
  }

  if (callerId) {
    conditions.push(eq(callRecord.callerId, callerId));
  }

  if (startDate && endDate) {
    conditions.push(between(callRecord.callTimestamp, startDate, endDate));
  } else if (startDate) {
    conditions.push(gte(callRecord.callTimestamp, startDate));
  } else if (endDate) {
    conditions.push(lte(callRecord.callTimestamp, endDate));
  }

  if (hasSummary === true) {
    conditions.push(eq(callRecord.summary, callRecord.summary)); // Not null check workaround
  }

  if (hasRecording === true) {
    conditions.push(eq(callRecord.recordingUrl, callRecord.recordingUrl)); // Not null check workaround
  }

  if (searchQuery && searchQuery.trim()) {
    const searchTerm = `%${searchQuery.trim()}%`;
    conditions.push(
      or(
        ilike(callRecord.callerId, searchTerm),
        ilike(callRecord.callerName ?? "", searchTerm),
        ilike(callRecord.recipientId ?? "", searchTerm),
        ilike(callRecord.recipientName ?? "", searchTerm),
        ilike(callRecord.summary ?? "", searchTerm)
      )
    );
  }

  const query = database
    .select()
    .from(callRecord)
    .orderBy(desc(callRecord.callTimestamp))
    .limit(limit)
    .offset(offset);

  if (conditions.length > 0) {
    return await query.where(and(...conditions));
  }

  return await query;
}

/**
 * Get call records count with optional filters
 */
export async function getCallRecordsCount(
  filters: CallRecordFilters = {}
): Promise<number> {
  const {
    direction,
    status,
    userId,
    callerId,
    startDate,
    endDate,
    searchQuery,
  } = filters;

  const conditions = [];

  if (direction) {
    conditions.push(eq(callRecord.direction, direction));
  }

  if (status) {
    conditions.push(eq(callRecord.status, status));
  }

  if (userId) {
    conditions.push(eq(callRecord.userId, userId));
  }

  if (callerId) {
    conditions.push(eq(callRecord.callerId, callerId));
  }

  if (startDate && endDate) {
    conditions.push(between(callRecord.callTimestamp, startDate, endDate));
  } else if (startDate) {
    conditions.push(gte(callRecord.callTimestamp, startDate));
  } else if (endDate) {
    conditions.push(lte(callRecord.callTimestamp, endDate));
  }

  if (searchQuery && searchQuery.trim()) {
    const searchTerm = `%${searchQuery.trim()}%`;
    conditions.push(
      or(
        ilike(callRecord.callerId, searchTerm),
        ilike(callRecord.callerName ?? "", searchTerm),
        ilike(callRecord.summary ?? "", searchTerm)
      )
    );
  }

  const query = database.select({ count: count() }).from(callRecord);

  if (conditions.length > 0) {
    const results = await query.where(and(...conditions));
    return results[0]?.count || 0;
  }

  const results = await query;
  return results[0]?.count || 0;
}

/**
 * Get call records for a specific user
 */
export async function getCallRecordsByUser(
  userId: string,
  filters: Omit<CallRecordFilters, "userId"> = {}
): Promise<CallRecord[]> {
  return await getAllCallRecords({ ...filters, userId });
}

/**
 * Get inbound call records
 */
export async function getInboundCallRecords(
  filters: Omit<CallRecordFilters, "direction"> = {}
): Promise<CallRecord[]> {
  return await getAllCallRecords({ ...filters, direction: "inbound" });
}

/**
 * Get outbound call records
 */
export async function getOutboundCallRecords(
  filters: Omit<CallRecordFilters, "direction"> = {}
): Promise<CallRecord[]> {
  return await getAllCallRecords({ ...filters, direction: "outbound" });
}

/**
 * Get recent call records for a user
 */
export async function getRecentCallRecords(
  userId: string,
  limit: number = 10
): Promise<CallRecord[]> {
  return await getAllCallRecords({ userId, limit });
}

/**
 * Update the AI summary for a call record
 */
export async function updateCallRecordSummary(
  id: string,
  summary: string
): Promise<CallRecord | null> {
  return await updateCallRecord(id, {
    summary,
    summaryGeneratedAt: new Date(),
  });
}

/**
 * Update the recording URL for a call record
 */
export async function updateCallRecordRecording(
  id: string,
  recordingUrl: string,
  recordingDuration?: number
): Promise<CallRecord | null> {
  return await updateCallRecord(id, {
    recordingUrl,
    recordingDuration,
  });
}

/**
 * Get call statistics for a user
 */
export async function getCallStatistics(
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalCalls: number;
  inboundCalls: number;
  outboundCalls: number;
  totalDuration: number;
  averageDuration: number;
}> {
  const filters: CallRecordFilters = { userId, startDate, endDate };

  const [total, inbound, outbound] = await Promise.all([
    getCallRecordsCount(filters),
    getCallRecordsCount({ ...filters, direction: "inbound" }),
    getCallRecordsCount({ ...filters, direction: "outbound" }),
  ]);

  // Get all calls for duration calculation
  const allCalls = await getAllCallRecords({ ...filters, limit: 10000 });
  const totalDuration = allCalls.reduce((sum, call) => sum + call.duration, 0);
  const averageDuration = total > 0 ? Math.round(totalDuration / total) : 0;

  return {
    totalCalls: total,
    inboundCalls: inbound,
    outboundCalls: outbound,
    totalDuration,
    averageDuration,
  };
}

/**
 * Get calls without AI summary (for batch processing)
 */
export async function getCallsWithoutSummary(
  limit: number = 50
): Promise<CallRecord[]> {
  const results = await database
    .select()
    .from(callRecord)
    .where(eq(callRecord.summary, callRecord.summary)) // This will be null check
    .orderBy(desc(callRecord.callTimestamp))
    .limit(limit);

  // Filter for calls where summary is null
  return results.filter((call) => call.summary === null);
}
