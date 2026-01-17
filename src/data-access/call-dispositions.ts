import { eq, desc, and, gte, lte, between } from "drizzle-orm";
import { database } from "~/db";
import {
  callDisposition,
  callTask,
  callRecord,
  user,
  type CallDisposition,
  type CreateCallDispositionData,
  type UpdateCallDispositionData,
  type CallTask,
  type CreateCallTaskData,
  type UpdateCallTaskData,
  type CallDispositionType,
  type CallTaskPriority,
  type CallTaskStatus,
} from "~/db/schema";

// Type for call disposition with related data
export type CallDispositionWithRelations = CallDisposition & {
  callRecord: {
    id: string;
    callerId: string;
    callerName: string | null;
    direction: string;
    duration: number;
    callTimestamp: Date;
  };
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
  tasks: CallTask[];
};

// Type for call task with related data
export type CallTaskWithRelations = CallTask & {
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
  assignedUser: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  } | null;
};

export interface CallDispositionFilters {
  disposition?: CallDispositionType;
  userId?: string;
  callRecordId?: string;
  startDate?: Date;
  endDate?: Date;
  hasFollowUp?: boolean;
  limit?: number;
  offset?: number;
}

export interface CallTaskFilters {
  status?: CallTaskStatus;
  priority?: CallTaskPriority;
  userId?: string;
  assignedTo?: string;
  callRecordId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

// =============================================================================
// Call Disposition CRUD Operations
// =============================================================================

/**
 * Create a new call disposition
 */
export async function createCallDisposition(
  data: CreateCallDispositionData
): Promise<CallDisposition> {
  const [result] = await database
    .insert(callDisposition)
    .values({
      ...data,
      updatedAt: new Date(),
    })
    .returning();

  return result;
}

/**
 * Find a call disposition by ID
 */
export async function findCallDispositionById(
  id: string
): Promise<CallDisposition | null> {
  const [result] = await database
    .select()
    .from(callDisposition)
    .where(eq(callDisposition.id, id))
    .limit(1);

  return result || null;
}

/**
 * Find a call disposition by call record ID
 */
export async function findCallDispositionByCallRecordId(
  callRecordId: string
): Promise<CallDisposition | null> {
  const [result] = await database
    .select()
    .from(callDisposition)
    .where(eq(callDisposition.callRecordId, callRecordId))
    .limit(1);

  return result || null;
}

/**
 * Find a call disposition with all related data
 */
export async function findCallDispositionByIdWithRelations(
  id: string
): Promise<CallDispositionWithRelations | null> {
  const result = await database.query.callDisposition.findFirst({
    where: eq(callDisposition.id, id),
    with: {
      callRecord: {
        columns: {
          id: true,
          callerId: true,
          callerName: true,
          direction: true,
          duration: true,
          callTimestamp: true,
        },
      },
      user: {
        columns: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      tasks: true,
    },
  });

  return result as CallDispositionWithRelations | null;
}

/**
 * Update a call disposition
 */
export async function updateCallDisposition(
  id: string,
  data: UpdateCallDispositionData
): Promise<CallDisposition | null> {
  const [result] = await database
    .update(callDisposition)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(callDisposition.id, id))
    .returning();

  return result || null;
}

/**
 * Delete a call disposition
 */
export async function deleteCallDisposition(id: string): Promise<boolean> {
  const result = await database
    .delete(callDisposition)
    .where(eq(callDisposition.id, id))
    .returning();

  return result.length > 0;
}

/**
 * Get all call dispositions with filters
 */
export async function getAllCallDispositions(
  filters: CallDispositionFilters = {}
): Promise<CallDisposition[]> {
  const {
    disposition,
    userId,
    callRecordId,
    startDate,
    endDate,
    limit = 50,
    offset = 0,
  } = filters;

  const conditions = [];

  if (disposition) {
    conditions.push(eq(callDisposition.disposition, disposition));
  }

  if (userId) {
    conditions.push(eq(callDisposition.userId, userId));
  }

  if (callRecordId) {
    conditions.push(eq(callDisposition.callRecordId, callRecordId));
  }

  if (startDate && endDate) {
    conditions.push(between(callDisposition.createdAt, startDate, endDate));
  } else if (startDate) {
    conditions.push(gte(callDisposition.createdAt, startDate));
  } else if (endDate) {
    conditions.push(lte(callDisposition.createdAt, endDate));
  }

  const query = database
    .select()
    .from(callDisposition)
    .orderBy(desc(callDisposition.createdAt))
    .limit(limit)
    .offset(offset);

  if (conditions.length > 0) {
    return await query.where(and(...conditions));
  }

  return await query;
}

/**
 * Get call dispositions for a specific user
 */
export async function getCallDispositionsByUser(
  userId: string,
  filters: Omit<CallDispositionFilters, "userId"> = {}
): Promise<CallDisposition[]> {
  return await getAllCallDispositions({ ...filters, userId });
}

// =============================================================================
// Call Task CRUD Operations
// =============================================================================

/**
 * Create a new call task
 */
export async function createCallTask(
  data: CreateCallTaskData
): Promise<CallTask> {
  const [result] = await database
    .insert(callTask)
    .values({
      ...data,
      updatedAt: new Date(),
    })
    .returning();

  return result;
}

/**
 * Find a call task by ID
 */
export async function findCallTaskById(id: string): Promise<CallTask | null> {
  const [result] = await database
    .select()
    .from(callTask)
    .where(eq(callTask.id, id))
    .limit(1);

  return result || null;
}

/**
 * Find a call task with related data
 */
export async function findCallTaskByIdWithRelations(
  id: string
): Promise<CallTaskWithRelations | null> {
  const result = await database.query.callTask.findFirst({
    where: eq(callTask.id, id),
    with: {
      user: {
        columns: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      assignedUser: {
        columns: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });

  return result as CallTaskWithRelations | null;
}

/**
 * Update a call task
 */
export async function updateCallTask(
  id: string,
  data: UpdateCallTaskData
): Promise<CallTask | null> {
  const [result] = await database
    .update(callTask)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(callTask.id, id))
    .returning();

  return result || null;
}

/**
 * Delete a call task
 */
export async function deleteCallTask(id: string): Promise<boolean> {
  const result = await database
    .delete(callTask)
    .where(eq(callTask.id, id))
    .returning();

  return result.length > 0;
}

/**
 * Get all call tasks with filters
 */
export async function getAllCallTasks(
  filters: CallTaskFilters = {}
): Promise<CallTask[]> {
  const {
    status,
    priority,
    userId,
    assignedTo,
    callRecordId,
    startDate,
    endDate,
    limit = 50,
    offset = 0,
  } = filters;

  const conditions = [];

  if (status) {
    conditions.push(eq(callTask.status, status));
  }

  if (priority) {
    conditions.push(eq(callTask.priority, priority));
  }

  if (userId) {
    conditions.push(eq(callTask.userId, userId));
  }

  if (assignedTo) {
    conditions.push(eq(callTask.assignedTo, assignedTo));
  }

  if (callRecordId) {
    conditions.push(eq(callTask.callRecordId, callRecordId));
  }

  if (startDate && endDate) {
    conditions.push(between(callTask.createdAt, startDate, endDate));
  } else if (startDate) {
    conditions.push(gte(callTask.createdAt, startDate));
  } else if (endDate) {
    conditions.push(lte(callTask.createdAt, endDate));
  }

  const query = database
    .select()
    .from(callTask)
    .orderBy(desc(callTask.createdAt))
    .limit(limit)
    .offset(offset);

  if (conditions.length > 0) {
    return await query.where(and(...conditions));
  }

  return await query;
}

/**
 * Get tasks for a call record
 */
export async function getCallTasksByCallRecord(
  callRecordId: string,
  filters: Omit<CallTaskFilters, "callRecordId"> = {}
): Promise<CallTask[]> {
  return await getAllCallTasks({ ...filters, callRecordId });
}

/**
 * Get tasks assigned to a user
 */
export async function getCallTasksAssignedTo(
  userId: string,
  filters: Omit<CallTaskFilters, "assignedTo"> = {}
): Promise<CallTask[]> {
  return await getAllCallTasks({ ...filters, assignedTo: userId });
}

/**
 * Complete a task
 */
export async function completeCallTask(
  id: string,
  completedBy: string
): Promise<CallTask | null> {
  return await updateCallTask(id, {
    status: "completed",
    completedAt: new Date(),
    completedBy,
  });
}

/**
 * Get pending tasks count for a user
 */
export async function getPendingTasksCount(userId: string): Promise<number> {
  const tasks = await getAllCallTasks({
    assignedTo: userId,
    status: "pending",
  });
  return tasks.length;
}
