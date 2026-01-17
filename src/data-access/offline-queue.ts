/**
 * Offline Queue Data Access Layer
 *
 * Provides high-level functions for interacting with the offline queue.
 * This layer abstracts the database operations and provides
 * domain-specific functionality.
 */

import {
  type OfflineQueueItem,
  type CreateOfflineQueueItemInput,
  type OfflineQueueFilter,
  type OfflineQueueStats,
  type OfflineOperationType,
  type OfflineEntityType,
  type OfflineSyncStatus,
  type OfflineQueuePriority,
} from "~/db/offline-queue-schema";
import {
  OfflineQueueDatabase,
  getOfflineQueueDb,
  type OfflineQueueResult,
} from "~/lib/offline-queue-db";

// Re-export types for convenience
export type {
  OfflineQueueItem,
  CreateOfflineQueueItemInput,
  OfflineQueueFilter,
  OfflineQueueStats,
  OfflineOperationType,
  OfflineEntityType,
  OfflineSyncStatus,
  OfflineQueuePriority,
};

/**
 * Get the database instance (initializes if needed)
 */
async function getDb(): Promise<OfflineQueueDatabase> {
  const db = getOfflineQueueDb();
  await db.init();
  return db;
}

// ============================================================================
// Core CRUD Operations
// ============================================================================

/**
 * Queue a new action for offline sync
 */
export async function queueAction<TPayload = unknown>(
  input: CreateOfflineQueueItemInput<TPayload>
): Promise<OfflineQueueResult<OfflineQueueItem<TPayload>>> {
  const db = await getDb();
  return db.add(input);
}

/**
 * Get a queued action by ID
 */
export async function getQueuedAction<TPayload = unknown>(
  id: string
): Promise<OfflineQueueResult<OfflineQueueItem<TPayload> | null>> {
  const db = await getDb();
  return db.get<TPayload>(id);
}

/**
 * Get all queued actions, optionally filtered
 */
export async function getQueuedActions<TPayload = unknown>(
  filter?: OfflineQueueFilter
): Promise<OfflineQueueResult<OfflineQueueItem<TPayload>[]>> {
  const db = await getDb();
  return db.getAll<TPayload>(filter);
}

/**
 * Update a queued action
 */
export async function updateQueuedAction<TPayload = unknown>(
  id: string,
  updates: Partial<Omit<OfflineQueueItem<TPayload>, "id" | "createdAt">>
): Promise<OfflineQueueResult<OfflineQueueItem<TPayload>>> {
  const db = await getDb();
  return db.update<TPayload>(id, updates);
}

/**
 * Delete a queued action
 */
export async function deleteQueuedAction(
  id: string
): Promise<OfflineQueueResult<void>> {
  const db = await getDb();
  return db.delete(id);
}

/**
 * Delete multiple queued actions
 */
export async function deleteQueuedActions(
  filter: OfflineQueueFilter
): Promise<OfflineQueueResult<number>> {
  const db = await getDb();
  return db.deleteMany(filter);
}

// ============================================================================
// Status Management
// ============================================================================

/**
 * Mark an action as in progress
 */
export async function markActionInProgress(
  id: string
): Promise<OfflineQueueResult<OfflineQueueItem>> {
  const db = await getDb();
  return db.markInProgress(id);
}

/**
 * Mark an action as completed
 */
export async function markActionCompleted(
  id: string
): Promise<OfflineQueueResult<OfflineQueueItem>> {
  const db = await getDb();
  return db.markCompleted(id);
}

/**
 * Mark an action as failed
 */
export async function markActionFailed(
  id: string,
  error: string
): Promise<OfflineQueueResult<OfflineQueueItem>> {
  const db = await getDb();
  return db.markFailed(id, error);
}

/**
 * Cancel an action
 */
export async function cancelAction(
  id: string
): Promise<OfflineQueueResult<OfflineQueueItem>> {
  const db = await getDb();
  return db.cancel(id);
}

/**
 * Reset a failed action for retry
 */
export async function retryAction(
  id: string
): Promise<OfflineQueueResult<OfflineQueueItem>> {
  const db = await getDb();
  return db.update(id, {
    syncStatus: "pending",
    retryCount: 0,
    lastError: undefined,
    updatedAt: new Date(),
  });
}

// ============================================================================
// Queue Management
// ============================================================================

/**
 * Get actions ready for sync
 */
export async function getActionsForSync(
  limit = 10
): Promise<OfflineQueueResult<OfflineQueueItem[]>> {
  const db = await getDb();
  return db.getNextForSync(limit);
}

/**
 * Get queue statistics
 */
export async function getQueueStats(): Promise<OfflineQueueResult<OfflineQueueStats>> {
  const db = await getDb();
  return db.getStats();
}

/**
 * Clear all actions from the queue
 */
export async function clearQueue(): Promise<OfflineQueueResult<void>> {
  const db = await getDb();
  return db.clear();
}

/**
 * Clean up old completed actions
 */
export async function cleanupCompletedActions(
  olderThanDays?: number
): Promise<OfflineQueueResult<number>> {
  const db = await getDb();
  return db.cleanupCompleted(olderThanDays);
}

// ============================================================================
// Entity-Specific Helpers
// ============================================================================

/**
 * Queue a create operation
 */
export async function queueCreate<TPayload = unknown>(
  entityType: OfflineEntityType,
  payload: TPayload,
  options?: Partial<Omit<CreateOfflineQueueItemInput<TPayload>, "operationType" | "entityType" | "payload">>
): Promise<OfflineQueueResult<OfflineQueueItem<TPayload>>> {
  return queueAction({
    operationType: "CREATE",
    entityType,
    payload,
    ...options,
  });
}

/**
 * Queue an update operation
 */
export async function queueUpdate<TPayload = unknown>(
  entityType: OfflineEntityType,
  entityId: string,
  payload: TPayload,
  options?: Partial<Omit<CreateOfflineQueueItemInput<TPayload>, "operationType" | "entityType" | "entityId" | "payload">>
): Promise<OfflineQueueResult<OfflineQueueItem<TPayload>>> {
  return queueAction({
    operationType: "UPDATE",
    entityType,
    entityId,
    payload,
    ...options,
  });
}

/**
 * Queue a delete operation
 */
export async function queueDelete(
  entityType: OfflineEntityType,
  entityId: string,
  options?: Partial<Omit<CreateOfflineQueueItemInput<{ id: string }>, "operationType" | "entityType" | "entityId" | "payload">>
): Promise<OfflineQueueResult<OfflineQueueItem<{ id: string }>>> {
  return queueAction({
    operationType: "DELETE",
    entityType,
    entityId,
    payload: { id: entityId },
    ...options,
  });
}

/**
 * Queue a file upload operation
 */
export async function queueUpload<TPayload extends { file: File | Blob; fileName: string } = { file: File; fileName: string }>(
  entityType: OfflineEntityType,
  payload: TPayload,
  options?: Partial<Omit<CreateOfflineQueueItemInput<TPayload>, "operationType" | "entityType" | "payload">>
): Promise<OfflineQueueResult<OfflineQueueItem<TPayload>>> {
  return queueAction({
    operationType: "UPLOAD",
    entityType,
    payload,
    priority: options?.priority ?? "normal",
    ...options,
  });
}

// ============================================================================
// Query Helpers
// ============================================================================

/**
 * Get pending actions
 */
export async function getPendingActions<TPayload = unknown>(): Promise<
  OfflineQueueResult<OfflineQueueItem<TPayload>[]>
> {
  return getQueuedActions<TPayload>({ syncStatus: "pending" });
}

/**
 * Get failed actions
 */
export async function getFailedActions<TPayload = unknown>(): Promise<
  OfflineQueueResult<OfflineQueueItem<TPayload>[]>
> {
  return getQueuedActions<TPayload>({ syncStatus: "failed" });
}

/**
 * Get in-progress actions
 */
export async function getInProgressActions<TPayload = unknown>(): Promise<
  OfflineQueueResult<OfflineQueueItem<TPayload>[]>
> {
  return getQueuedActions<TPayload>({ syncStatus: "in_progress" });
}

/**
 * Get completed actions
 */
export async function getCompletedActions<TPayload = unknown>(): Promise<
  OfflineQueueResult<OfflineQueueItem<TPayload>[]>
> {
  return getQueuedActions<TPayload>({ syncStatus: "completed" });
}

/**
 * Get actions for a specific entity
 */
export async function getActionsForEntity<TPayload = unknown>(
  entityType: OfflineEntityType,
  entityId: string
): Promise<OfflineQueueResult<OfflineQueueItem<TPayload>[]>> {
  return getQueuedActions<TPayload>({ entityType, entityId });
}

/**
 * Get actions by user
 */
export async function getActionsByUser<TPayload = unknown>(
  userId: string
): Promise<OfflineQueueResult<OfflineQueueItem<TPayload>[]>> {
  return getQueuedActions<TPayload>({ userId });
}

/**
 * Check if there are pending actions
 */
export async function hasPendingActions(): Promise<boolean> {
  const result = await getPendingActions();
  return result.success && (result.data?.length ?? 0) > 0;
}

/**
 * Get count of pending actions
 */
export async function getPendingCount(): Promise<number> {
  const stats = await getQueueStats();
  return stats.success ? stats.data?.pending ?? 0 : 0;
}

// ============================================================================
// Expense Request Specific Helpers
// ============================================================================

/**
 * Queue expense request creation (offline)
 */
export interface ExpenseRequestPayload {
  amount: string;
  currency: string;
  purpose: string;
  description?: string;
  receiptUrl?: string;
}

export async function queueExpenseRequestCreate(
  payload: ExpenseRequestPayload,
  userId: string
): Promise<OfflineQueueResult<OfflineQueueItem<ExpenseRequestPayload>>> {
  return queueCreate("expense_request", payload, {
    userId,
    endpoint: "/api/expense-requests",
    httpMethod: "POST",
    priority: "normal",
  });
}

/**
 * Queue expense request update (offline)
 */
export async function queueExpenseRequestUpdate(
  expenseRequestId: string,
  payload: Partial<ExpenseRequestPayload>,
  userId: string
): Promise<OfflineQueueResult<OfflineQueueItem<Partial<ExpenseRequestPayload>>>> {
  return queueUpdate("expense_request", expenseRequestId, payload, {
    userId,
    endpoint: `/api/expense-requests/${expenseRequestId}`,
    httpMethod: "PATCH",
    priority: "normal",
  });
}

/**
 * Queue expense request deletion (offline)
 */
export async function queueExpenseRequestDelete(
  expenseRequestId: string,
  userId: string
): Promise<OfflineQueueResult<OfflineQueueItem<{ id: string }>>> {
  return queueDelete("expense_request", expenseRequestId, {
    userId,
    endpoint: `/api/expense-requests/${expenseRequestId}`,
    httpMethod: "DELETE",
    priority: "normal",
  });
}

// ============================================================================
// Sync Processing
// ============================================================================

/**
 * Process a single action (for use in sync handlers)
 */
export async function processAction<TPayload = unknown>(
  item: OfflineQueueItem<TPayload>,
  handler: (item: OfflineQueueItem<TPayload>) => Promise<boolean>
): Promise<OfflineQueueResult<void>> {
  const db = await getDb();

  try {
    // Mark as in progress
    await db.markInProgress(item.id);

    // Process the item
    const success = await handler(item);

    if (success) {
      await db.markCompleted(item.id);
      return { success: true };
    } else {
      await db.markFailed(item.id, "Handler returned false");
      return { success: false, error: "Handler returned false" };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await db.markFailed(item.id, errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Process all pending actions
 */
export async function processAllPendingActions<TPayload = unknown>(
  handler: (item: OfflineQueueItem<TPayload>) => Promise<boolean>,
  options?: {
    limit?: number;
    onProgress?: (processed: number, total: number) => void;
    onError?: (item: OfflineQueueItem<TPayload>, error: string) => void;
  }
): Promise<{ processed: number; succeeded: number; failed: number }> {
  const db = await getDb();
  const result = await db.getNextForSync(options?.limit ?? 100);

  if (!result.success || !result.data) {
    return { processed: 0, succeeded: 0, failed: 0 };
  }

  const items = result.data as OfflineQueueItem<TPayload>[];
  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const processResult = await processAction(item, handler);

    if (processResult.success) {
      succeeded++;
    } else {
      failed++;
      options?.onError?.(item, processResult.error ?? "Unknown error");
    }

    options?.onProgress?.(i + 1, items.length);
  }

  return { processed: items.length, succeeded, failed };
}
