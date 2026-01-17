/**
 * Offline Sync Service Types
 *
 * Type definitions for the offline sync service including
 * conflict resolution strategies, sync results, and configuration.
 */

import type {
  OfflineQueueItem,
  OfflineSyncStatus,
  OfflineOperationType,
  OfflineEntityType,
} from "~/db/offline-queue-schema";

/**
 * Conflict resolution strategies
 */
export type ConflictResolutionStrategy =
  | "client_wins" // Client data overwrites server data
  | "server_wins" // Server data takes precedence
  | "merge" // Attempt to merge both (field-level)
  | "manual" // Require manual resolution
  | "timestamp" // Most recent modification wins
  | "custom"; // Use custom resolver function

/**
 * Conflict details when server and client data differ
 */
export interface ConflictDetails<T = unknown> {
  /** The queue item that caused the conflict */
  queueItem: OfflineQueueItem<T>;
  /** Data from the client (queued operation) */
  clientData: T;
  /** Data from the server (current state) */
  serverData: T;
  /** The entity ID involved */
  entityId: string;
  /** Entity type */
  entityType: OfflineEntityType;
  /** Client modification timestamp */
  clientTimestamp: Date;
  /** Server modification timestamp */
  serverTimestamp?: Date;
  /** Specific fields that conflict */
  conflictingFields?: string[];
}

/**
 * Result of conflict resolution
 */
export interface ConflictResolutionResult<T = unknown> {
  /** Whether the conflict was resolved */
  resolved: boolean;
  /** The resolved data (if resolved) */
  resolvedData?: T;
  /** The strategy used to resolve */
  strategyUsed: ConflictResolutionStrategy;
  /** Error message if not resolved */
  error?: string;
  /** Whether manual intervention is needed */
  requiresManualResolution?: boolean;
}

/**
 * Custom conflict resolver function type
 */
export type ConflictResolver<T = unknown> = (
  conflict: ConflictDetails<T>
) => Promise<ConflictResolutionResult<T>>;

/**
 * Sync operation result for a single item
 */
export interface SyncOperationResult {
  /** Queue item ID */
  itemId: string;
  /** Whether the operation succeeded */
  success: boolean;
  /** New sync status */
  newStatus: OfflineSyncStatus;
  /** Error message if failed */
  error?: string;
  /** Server response data */
  serverResponse?: unknown;
  /** Whether there was a conflict */
  hadConflict?: boolean;
  /** How the conflict was resolved */
  conflictResolution?: ConflictResolutionResult;
  /** Time taken for the operation in ms */
  duration?: number;
}

/**
 * Batch sync result
 */
export interface BatchSyncResult {
  /** Total items processed */
  totalProcessed: number;
  /** Successfully synced items */
  successful: number;
  /** Failed items */
  failed: number;
  /** Skipped items (dependencies not met, etc.) */
  skipped: number;
  /** Items with conflicts */
  conflicts: number;
  /** Individual operation results */
  results: SyncOperationResult[];
  /** Total time taken for the batch */
  totalDuration: number;
  /** Timestamp when sync started */
  startedAt: Date;
  /** Timestamp when sync completed */
  completedAt: Date;
}

/**
 * Retry configuration with exponential backoff
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Initial delay in ms before first retry */
  initialDelayMs: number;
  /** Maximum delay in ms between retries */
  maxDelayMs: number;
  /** Backoff multiplier (e.g., 2 for exponential backoff) */
  backoffMultiplier: number;
  /** Whether to add jitter to prevent thundering herd */
  useJitter: boolean;
  /** Jitter factor (0-1, percentage of delay to randomize) */
  jitterFactor: number;
  /** Error codes that should not be retried */
  nonRetryableErrors: string[];
}

/**
 * Background sync configuration
 */
export interface BackgroundSyncConfig {
  /** Whether background sync is enabled */
  enabled: boolean;
  /** Interval between sync attempts in ms (0 = on-demand only) */
  syncIntervalMs: number;
  /** Minimum interval between syncs in ms */
  minSyncIntervalMs: number;
  /** Batch size for each sync operation */
  batchSize: number;
  /** Whether to sync immediately when coming online */
  syncOnOnline: boolean;
  /** Whether to sync on visibility change (tab becomes visible) */
  syncOnVisibilityChange: boolean;
  /** Maximum concurrent sync operations */
  maxConcurrent: number;
  /** Timeout for individual sync operations in ms */
  operationTimeoutMs: number;
}

/**
 * Full sync service configuration
 */
export interface OfflineSyncConfig {
  /** Retry configuration */
  retry: RetryConfig;
  /** Background sync configuration */
  background: BackgroundSyncConfig;
  /** Default conflict resolution strategy */
  defaultConflictStrategy: ConflictResolutionStrategy;
  /** Entity-specific conflict strategies */
  entityConflictStrategies?: Partial<Record<OfflineEntityType, ConflictResolutionStrategy>>;
  /** Custom conflict resolvers by entity type */
  customResolvers?: Partial<Record<OfflineEntityType, ConflictResolver>>;
  /** Auto cleanup completed items older than this many days */
  autoCleanupDays: number;
  /** Enable debug logging */
  debug: boolean;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  useJitter: true,
  jitterFactor: 0.3,
  nonRetryableErrors: [
    "UNAUTHORIZED",
    "FORBIDDEN",
    "NOT_FOUND",
    "VALIDATION_ERROR",
    "CONFLICT_UNRESOLVABLE",
  ],
};

/**
 * Default background sync configuration
 */
export const DEFAULT_BACKGROUND_SYNC_CONFIG: BackgroundSyncConfig = {
  enabled: true,
  syncIntervalMs: 60000, // 1 minute
  minSyncIntervalMs: 5000, // 5 seconds minimum between syncs
  batchSize: 10,
  syncOnOnline: true,
  syncOnVisibilityChange: true,
  maxConcurrent: 3,
  operationTimeoutMs: 30000, // 30 seconds
};

/**
 * Default sync service configuration
 */
export const DEFAULT_SYNC_CONFIG: OfflineSyncConfig = {
  retry: DEFAULT_RETRY_CONFIG,
  background: DEFAULT_BACKGROUND_SYNC_CONFIG,
  defaultConflictStrategy: "client_wins",
  autoCleanupDays: 7,
  debug: false,
};

/**
 * Sync handler function type for processing queue items
 */
export type SyncHandler<TPayload = unknown, TResponse = unknown> = (
  item: OfflineQueueItem<TPayload>
) => Promise<{
  success: boolean;
  error?: string;
  errorCode?: string;
  serverData?: TResponse;
  serverTimestamp?: Date;
}>;

/**
 * Sync event types for callbacks
 */
export type SyncEventType =
  | "sync_started"
  | "sync_completed"
  | "item_syncing"
  | "item_synced"
  | "item_failed"
  | "item_conflict"
  | "conflict_resolved"
  | "retry_scheduled"
  | "online"
  | "offline"
  | "error";

/**
 * Sync event data
 */
export interface SyncEvent {
  type: SyncEventType;
  timestamp: Date;
  data?: {
    itemId?: string;
    item?: OfflineQueueItem;
    result?: SyncOperationResult;
    batchResult?: BatchSyncResult;
    conflict?: ConflictDetails;
    resolution?: ConflictResolutionResult;
    error?: string;
    retryDelay?: number;
    retryCount?: number;
  };
}

/**
 * Sync event listener type
 */
export type SyncEventListener = (event: SyncEvent) => void;

/**
 * Network status information
 */
export interface NetworkStatus {
  /** Whether the device is online */
  isOnline: boolean;
  /** Connection type if available */
  connectionType?: "wifi" | "cellular" | "ethernet" | "unknown";
  /** Effective connection type */
  effectiveType?: "slow-2g" | "2g" | "3g" | "4g";
  /** Downlink speed in Mbps */
  downlink?: number;
  /** Round-trip time in ms */
  rtt?: number;
  /** Whether the connection is metered */
  saveData?: boolean;
}

/**
 * Sync service state
 */
export interface SyncServiceState {
  /** Whether the service is initialized */
  isInitialized: boolean;
  /** Whether a sync is currently in progress */
  isSyncing: boolean;
  /** Current network status */
  networkStatus: NetworkStatus;
  /** Last sync result */
  lastSyncResult?: BatchSyncResult;
  /** Last sync timestamp */
  lastSyncAt?: Date;
  /** Next scheduled sync timestamp */
  nextSyncAt?: Date;
  /** Number of pending items */
  pendingCount: number;
  /** Number of failed items */
  failedCount: number;
  /** Items currently being synced */
  syncingItemIds: string[];
}
