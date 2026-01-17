/**
 * Offline Queue Schema
 *
 * This module defines the schema for a local client-side database
 * that queues user actions while offline. When the app comes back online,
 * these queued actions can be synchronized with the server.
 *
 * Uses IndexedDB for persistent local storage in the browser.
 */

// Operation types that can be queued while offline
export type OfflineOperationType =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "UPLOAD"
  | "CUSTOM";

// Sync status of a queued operation
export type OfflineSyncStatus =
  | "pending" // Waiting to be synced
  | "in_progress" // Currently being synced
  | "completed" // Successfully synced
  | "failed" // Failed to sync (will retry)
  | "cancelled"; // Cancelled by user or system

// Priority levels for queue processing
export type OfflineQueuePriority = "low" | "normal" | "high" | "critical";

// Entity types that can be queued (extend as needed for your app)
export type OfflineEntityType =
  | "expense_request"
  | "user_profile"
  | "attachment"
  | "comment"
  | "post"
  | "message"
  | "notification"
  | "contact"
  | "contact_sync"
  | "custom";

/**
 * The main offline queue item schema
 * Each queued operation is stored as one of these items
 */
export interface OfflineQueueItem<TPayload = unknown> {
  // Unique identifier for this queue item (UUID)
  id: string;

  // Type of operation being performed
  operationType: OfflineOperationType;

  // The entity type this operation affects
  entityType: OfflineEntityType;

  // The ID of the entity being modified (if applicable)
  entityId?: string;

  // The actual data payload for this operation
  payload: TPayload;

  // Current sync status
  syncStatus: OfflineSyncStatus;

  // Number of times sync has been attempted
  retryCount: number;

  // Maximum number of retry attempts before marking as failed
  maxRetries: number;

  // Priority for processing order
  priority: OfflineQueuePriority;

  // Error message from last failed sync attempt
  lastError?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastSyncAttempt?: Date;
  completedAt?: Date;

  // Optional metadata for additional context
  metadata?: Record<string, unknown>;

  // User ID who created this action (for multi-user scenarios)
  userId?: string;

  // API endpoint this action should sync to
  endpoint?: string;

  // HTTP method for the sync request
  httpMethod?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

  // Dependencies - IDs of other queue items that must complete first
  dependsOn?: string[];

  // Conflict resolution strategy
  conflictResolution?: "client_wins" | "server_wins" | "merge" | "manual";
}

/**
 * Input type for creating a new queue item
 * Some fields have defaults and don't need to be provided
 */
export interface CreateOfflineQueueItemInput<TPayload = unknown> {
  operationType: OfflineOperationType;
  entityType: OfflineEntityType;
  entityId?: string;
  payload: TPayload;
  priority?: OfflineQueuePriority;
  maxRetries?: number;
  metadata?: Record<string, unknown>;
  userId?: string;
  endpoint?: string;
  httpMethod?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  dependsOn?: string[];
  conflictResolution?: "client_wins" | "server_wins" | "merge" | "manual";
}

/**
 * Input type for updating an existing queue item
 */
export type UpdateOfflineQueueItemInput = Partial<
  Omit<OfflineQueueItem, "id" | "createdAt">
>;

/**
 * Filter options for querying queue items
 */
export interface OfflineQueueFilter {
  syncStatus?: OfflineSyncStatus | OfflineSyncStatus[];
  operationType?: OfflineOperationType | OfflineOperationType[];
  entityType?: OfflineEntityType | OfflineEntityType[];
  entityId?: string;
  userId?: string;
  priority?: OfflineQueuePriority | OfflineQueuePriority[];
  createdAfter?: Date;
  createdBefore?: Date;
  maxRetryCount?: number;
}

/**
 * Statistics about the offline queue
 */
export interface OfflineQueueStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  failed: number;
  cancelled: number;
  byOperationType: Record<OfflineOperationType, number>;
  byEntityType: Record<OfflineEntityType, number>;
  oldestPendingItem?: Date;
  totalRetries: number;
}

/**
 * Configuration for the offline queue database
 */
export interface OfflineQueueConfig {
  // Name of the IndexedDB database
  dbName: string;
  // Version of the database schema
  dbVersion: number;
  // Name of the object store for queue items
  storeName: string;
  // Default max retries for new items
  defaultMaxRetries: number;
  // Auto-cleanup completed items after this many days
  autoCleanupDays: number;
  // Maximum number of items to keep in queue
  maxQueueSize: number;
}

/**
 * Default configuration values
 */
export const DEFAULT_OFFLINE_QUEUE_CONFIG: OfflineQueueConfig = {
  dbName: "aiom-offline-queue",
  dbVersion: 1,
  storeName: "queue",
  defaultMaxRetries: 3,
  autoCleanupDays: 7,
  maxQueueSize: 1000,
};

/**
 * Priority weights for sorting (higher = processed first)
 */
export const PRIORITY_WEIGHTS: Record<OfflineQueuePriority, number> = {
  critical: 4,
  high: 3,
  normal: 2,
  low: 1,
};

/**
 * IndexedDB index definitions for efficient querying
 */
export const OFFLINE_QUEUE_INDEXES = [
  { name: "by_sync_status", keyPath: "syncStatus" },
  { name: "by_operation_type", keyPath: "operationType" },
  { name: "by_entity_type", keyPath: "entityType" },
  { name: "by_entity_id", keyPath: "entityId" },
  { name: "by_priority", keyPath: "priority" },
  { name: "by_created_at", keyPath: "createdAt" },
  { name: "by_user_id", keyPath: "userId" },
  { name: "by_status_priority", keyPath: ["syncStatus", "priority"] },
] as const;

/**
 * Helper to generate a unique ID for queue items
 */
export function generateQueueItemId(): string {
  return crypto.randomUUID();
}

/**
 * Helper to create a new queue item with defaults
 */
export function createQueueItem<TPayload = unknown>(
  input: CreateOfflineQueueItemInput<TPayload>,
  config: OfflineQueueConfig = DEFAULT_OFFLINE_QUEUE_CONFIG
): OfflineQueueItem<TPayload> {
  const now = new Date();

  return {
    id: generateQueueItemId(),
    operationType: input.operationType,
    entityType: input.entityType,
    entityId: input.entityId,
    payload: input.payload,
    syncStatus: "pending",
    retryCount: 0,
    maxRetries: input.maxRetries ?? config.defaultMaxRetries,
    priority: input.priority ?? "normal",
    createdAt: now,
    updatedAt: now,
    metadata: input.metadata,
    userId: input.userId,
    endpoint: input.endpoint,
    httpMethod: input.httpMethod,
    dependsOn: input.dependsOn,
    conflictResolution: input.conflictResolution ?? "client_wins",
  };
}

/**
 * Helper to check if a queue item should be retried
 */
export function shouldRetry(item: OfflineQueueItem): boolean {
  return (
    item.syncStatus === "failed" &&
    item.retryCount < item.maxRetries
  );
}

/**
 * Helper to check if a queue item has dependencies that are not completed
 */
export function hasPendingDependencies(
  item: OfflineQueueItem,
  allItems: OfflineQueueItem[]
): boolean {
  if (!item.dependsOn || item.dependsOn.length === 0) {
    return false;
  }

  return item.dependsOn.some((depId) => {
    const dependency = allItems.find((i) => i.id === depId);
    return dependency && dependency.syncStatus !== "completed";
  });
}

/**
 * Helper to sort queue items by priority and creation time
 */
export function sortQueueItems(items: OfflineQueueItem[]): OfflineQueueItem[] {
  return [...items].sort((a, b) => {
    // First, sort by priority (higher priority first)
    const priorityDiff =
      PRIORITY_WEIGHTS[b.priority] - PRIORITY_WEIGHTS[a.priority];
    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    // Then by creation time (older first - FIFO within same priority)
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
}

/**
 * Type guard to check if a value is a valid OfflineQueueItem
 */
export function isOfflineQueueItem(value: unknown): value is OfflineQueueItem {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const item = value as Record<string, unknown>;

  return (
    typeof item.id === "string" &&
    typeof item.operationType === "string" &&
    typeof item.entityType === "string" &&
    typeof item.syncStatus === "string" &&
    typeof item.retryCount === "number" &&
    typeof item.maxRetries === "number" &&
    typeof item.priority === "string" &&
    item.createdAt instanceof Date &&
    item.updatedAt instanceof Date
  );
}

// Re-export for convenience
export type { OfflineQueueItem as QueueItem };
