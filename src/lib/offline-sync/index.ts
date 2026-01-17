/**
 * Offline Sync Service
 *
 * Mobile service managing offline queue with background sync,
 * conflict resolution, and retry logic for failed operations.
 *
 * @module offline-sync
 */

// Service
export {
  OfflineSyncService,
  getOfflineSyncService,
  resetOfflineSyncService,
} from "./service";

// Conflict Resolver
export {
  ConflictResolverService,
  createConflictResolver,
} from "./conflict-resolver";

// Retry Manager
export {
  RetryManager,
  createRetryManager,
  withTimeout,
  createTimeout,
  type RetryState,
} from "./retry-manager";

// Types
export type {
  // Conflict Resolution
  ConflictResolutionStrategy,
  ConflictDetails,
  ConflictResolutionResult,
  ConflictResolver,

  // Sync Operations
  SyncOperationResult,
  BatchSyncResult,
  SyncHandler,

  // Configuration
  OfflineSyncConfig,
  BackgroundSyncConfig,
  RetryConfig,

  // Events
  SyncEvent,
  SyncEventType,
  SyncEventListener,

  // State
  SyncServiceState,
  NetworkStatus,
} from "./types";

// Default configurations
export {
  DEFAULT_SYNC_CONFIG,
  DEFAULT_RETRY_CONFIG,
  DEFAULT_BACKGROUND_SYNC_CONFIG,
} from "./types";
