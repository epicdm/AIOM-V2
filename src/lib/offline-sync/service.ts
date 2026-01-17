/**
 * Offline Sync Service
 *
 * Mobile service managing offline queue with background sync,
 * conflict resolution, and retry logic for failed operations.
 *
 * Features:
 * - Background sync with configurable intervals
 * - Automatic sync when coming back online
 * - Conflict resolution strategies (client_wins, server_wins, merge, etc.)
 * - Exponential backoff retry logic
 * - Event-based notifications
 * - Dependency-aware processing order
 */

import type {
  OfflineQueueItem,
  OfflineQueueFilter,
  OfflineSyncStatus,
} from "~/db/offline-queue-schema";
import {
  OfflineQueueDatabase,
  getOfflineQueueDb,
} from "~/lib/offline-queue-db";
import { ConflictResolverService, createConflictResolver } from "./conflict-resolver";
import { RetryManager, createRetryManager, withTimeout } from "./retry-manager";
import type {
  OfflineSyncConfig,
  SyncHandler,
  SyncOperationResult,
  BatchSyncResult,
  SyncEvent,
  SyncEventListener,
  SyncEventType,
  SyncServiceState,
  NetworkStatus,
  ConflictDetails,
} from "./types";
import { DEFAULT_SYNC_CONFIG } from "./types";

/**
 * OfflineSyncService class
 * Main service for managing offline queue synchronization
 */
export class OfflineSyncService {
  private db: OfflineQueueDatabase;
  private conflictResolver: ConflictResolverService;
  private retryManager: RetryManager;
  private config: OfflineSyncConfig;

  // State
  private isInitialized = false;
  private isSyncing = false;
  private syncingItemIds: Set<string> = new Set();
  private lastSyncResult?: BatchSyncResult;
  private lastSyncAt?: Date;
  private nextSyncAt?: Date;

  // Timers and handlers
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private visibilityHandler: (() => void) | null = null;
  private onlineHandler: (() => void) | null = null;
  private offlineHandler: (() => void) | null = null;

  // Event listeners
  private eventListeners: Map<SyncEventType | "all", Set<SyncEventListener>> = new Map();

  // Sync handlers by entity type
  private syncHandlers: Map<string, SyncHandler> = new Map();

  constructor(config: Partial<OfflineSyncConfig> = {}) {
    this.config = this.mergeConfig(DEFAULT_SYNC_CONFIG, config);
    this.db = getOfflineQueueDb();
    this.conflictResolver = createConflictResolver({
      defaultStrategy: this.config.defaultConflictStrategy,
      entityStrategies: this.config.entityConflictStrategies,
      customResolvers: this.config.customResolvers,
      debug: this.config.debug,
    });
    this.retryManager = createRetryManager(this.config.retry, this.config.debug);
  }

  /**
   * Merge configuration with defaults
   */
  private mergeConfig(
    defaults: OfflineSyncConfig,
    overrides: Partial<OfflineSyncConfig>
  ): OfflineSyncConfig {
    return {
      ...defaults,
      ...overrides,
      retry: { ...defaults.retry, ...overrides.retry },
      background: { ...defaults.background, ...overrides.background },
    };
  }

  /**
   * Log debug messages
   */
  private log(...args: unknown[]): void {
    if (this.config.debug) {
      console.log("[OfflineSyncService]", ...args);
    }
  }

  /**
   * Initialize the sync service
   */
  async init(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    this.log("Initializing sync service...");

    // Initialize database
    await this.db.init();

    // Set up event listeners
    this.setupEventListeners();

    // Start background sync if enabled
    if (this.config.background.enabled && this.config.background.syncIntervalMs > 0) {
      this.startBackgroundSync();
    }

    this.isInitialized = true;
    this.log("Sync service initialized");
  }

  /**
   * Set up browser event listeners
   */
  private setupEventListeners(): void {
    if (typeof window === "undefined") {
      return;
    }

    // Online/offline events
    this.onlineHandler = () => {
      this.emit({ type: "online", timestamp: new Date() });
      if (this.config.background.syncOnOnline) {
        this.log("Back online, triggering sync");
        this.sync();
      }
    };

    this.offlineHandler = () => {
      this.emit({ type: "offline", timestamp: new Date() });
    };

    window.addEventListener("online", this.onlineHandler);
    window.addEventListener("offline", this.offlineHandler);

    // Visibility change event
    if (this.config.background.syncOnVisibilityChange) {
      this.visibilityHandler = () => {
        if (document.visibilityState === "visible" && navigator.onLine) {
          this.log("Tab became visible, triggering sync");
          this.sync();
        }
      };
      document.addEventListener("visibilitychange", this.visibilityHandler);
    }
  }

  /**
   * Start background sync interval
   */
  private startBackgroundSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(() => {
      if (navigator.onLine && !this.isSyncing) {
        this.log("Background sync triggered");
        this.sync();
      }
    }, this.config.background.syncIntervalMs);

    this.log(`Background sync started with ${this.config.background.syncIntervalMs}ms interval`);
  }

  /**
   * Stop background sync
   */
  private stopBackgroundSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      this.log("Background sync stopped");
    }
  }

  /**
   * Register a sync handler for an entity type
   */
  registerSyncHandler<TPayload = unknown, TResponse = unknown>(
    entityType: string,
    handler: SyncHandler<TPayload, TResponse>
  ): void {
    this.syncHandlers.set(entityType, handler as SyncHandler);
    this.log(`Registered sync handler for ${entityType}`);
  }

  /**
   * Unregister a sync handler
   */
  unregisterSyncHandler(entityType: string): void {
    this.syncHandlers.delete(entityType);
    this.log(`Unregistered sync handler for ${entityType}`);
  }

  /**
   * Get the sync handler for an entity type
   */
  private getSyncHandler(entityType: string): SyncHandler | undefined {
    return this.syncHandlers.get(entityType);
  }

  /**
   * Add event listener
   */
  addEventListener(
    event: SyncEventType | "all",
    listener: SyncEventListener
  ): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener);

    // Return unsubscribe function
    return () => {
      this.eventListeners.get(event)?.delete(listener);
    };
  }

  /**
   * Remove event listener
   */
  removeEventListener(
    event: SyncEventType | "all",
    listener: SyncEventListener
  ): void {
    this.eventListeners.get(event)?.delete(listener);
  }

  /**
   * Emit an event
   */
  private emit(event: SyncEvent): void {
    // Emit to specific listeners
    this.eventListeners.get(event.type)?.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error("Error in sync event listener:", error);
      }
    });

    // Emit to "all" listeners
    this.eventListeners.get("all")?.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error("Error in sync event listener:", error);
      }
    });
  }

  /**
   * Main sync method - syncs all pending items
   */
  async sync(filter?: OfflineQueueFilter): Promise<BatchSyncResult> {
    if (!this.isInitialized) {
      await this.init();
    }

    if (this.isSyncing) {
      this.log("Sync already in progress, skipping");
      return this.createEmptyBatchResult();
    }

    if (!navigator.onLine) {
      this.log("Offline, skipping sync");
      return this.createEmptyBatchResult();
    }

    this.isSyncing = true;
    const startTime = Date.now();
    const startedAt = new Date();

    this.emit({ type: "sync_started", timestamp: startedAt });
    this.log("Starting sync...");

    const results: SyncOperationResult[] = [];
    let successful = 0;
    let failed = 0;
    let skipped = 0;
    let conflicts = 0;

    try {
      // Get items ready for sync
      const itemsResult = await this.db.getNextForSync(this.config.background.batchSize);
      if (!itemsResult.success || !itemsResult.data) {
        throw new Error(itemsResult.error ?? "Failed to get items for sync");
      }

      let items = itemsResult.data;

      // Apply additional filter if provided
      if (filter) {
        const allResult = await this.db.getAll(filter);
        if (allResult.success && allResult.data) {
          const filterIds = new Set(allResult.data.map((i) => i.id));
          items = items.filter((i) => filterIds.has(i.id));
        }
      }

      this.log(`Found ${items.length} items to sync`);

      // Process items with concurrency limit
      const batches = this.createBatches(items, this.config.background.maxConcurrent);

      for (const batch of batches) {
        const batchResults = await Promise.all(
          batch.map((item) => this.syncItem(item))
        );

        for (const result of batchResults) {
          results.push(result);
          if (result.success) {
            successful++;
          } else if (result.newStatus === "pending") {
            skipped++;
          } else {
            failed++;
          }
          if (result.hadConflict) {
            conflicts++;
          }
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      this.log("Sync error:", errorMessage);
      this.emit({
        type: "error",
        timestamp: new Date(),
        data: { error: errorMessage },
      });
    } finally {
      this.isSyncing = false;
      this.lastSyncAt = startedAt;
    }

    const completedAt = new Date();
    const totalDuration = Date.now() - startTime;

    const batchResult: BatchSyncResult = {
      totalProcessed: results.length,
      successful,
      failed,
      skipped,
      conflicts,
      results,
      totalDuration,
      startedAt,
      completedAt,
    };

    this.lastSyncResult = batchResult;
    this.emit({
      type: "sync_completed",
      timestamp: completedAt,
      data: { batchResult },
    });

    this.log(`Sync completed: ${successful} successful, ${failed} failed, ${skipped} skipped`);
    return batchResult;
  }

  /**
   * Sync a single item
   */
  private async syncItem(item: OfflineQueueItem): Promise<SyncOperationResult> {
    const startTime = Date.now();

    this.syncingItemIds.add(item.id);
    this.emit({
      type: "item_syncing",
      timestamp: new Date(),
      data: { itemId: item.id, item },
    });

    try {
      // Get the handler for this entity type
      const handler = this.getSyncHandler(item.entityType);
      if (!handler) {
        this.log(`No sync handler for ${item.entityType}, skipping`);
        return {
          itemId: item.id,
          success: false,
          newStatus: "pending",
          error: `No sync handler registered for entity type: ${item.entityType}`,
          duration: Date.now() - startTime,
        };
      }

      // Mark as in progress
      await this.db.markInProgress(item.id);

      // Execute with timeout
      const result = await withTimeout(
        handler(item),
        this.config.background.operationTimeoutMs,
        `Sync operation timed out after ${this.config.background.operationTimeoutMs}ms`
      );

      if (result.success) {
        // Success - mark as completed
        await this.db.markCompleted(item.id);

        const opResult: SyncOperationResult = {
          itemId: item.id,
          success: true,
          newStatus: "completed",
          serverResponse: result.serverData,
          duration: Date.now() - startTime,
        };

        this.emit({
          type: "item_synced",
          timestamp: new Date(),
          data: { itemId: item.id, item, result: opResult },
        });

        return opResult;
      }

      // Check if this is a conflict
      if (result.errorCode === "CONFLICT" && result.serverData) {
        return await this.handleConflict(item, result.serverData, result.serverTimestamp);
      }

      // Handle failure with retry logic
      return await this.handleFailure(item, result.error ?? "Unknown error", result.errorCode);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return await this.handleFailure(item, errorMessage);
    } finally {
      this.syncingItemIds.delete(item.id);
    }
  }

  /**
   * Handle sync failure with retry logic
   */
  private async handleFailure(
    item: OfflineQueueItem,
    error: string,
    errorCode?: string
  ): Promise<SyncOperationResult> {
    const shouldRetry = this.retryManager.shouldRetry(item.retryCount, errorCode);

    if (shouldRetry) {
      // Calculate next retry time
      const nextRetryAt = this.retryManager.getNextRetryTime(item.retryCount);
      const delay = nextRetryAt.getTime() - Date.now();

      // Mark as pending with incremented retry count
      await this.db.markFailed(item.id, error);

      this.emit({
        type: "retry_scheduled",
        timestamp: new Date(),
        data: {
          itemId: item.id,
          item,
          retryCount: item.retryCount + 1,
          retryDelay: delay,
        },
      });

      this.log(`Retry scheduled for ${item.id} in ${delay}ms`);

      return {
        itemId: item.id,
        success: false,
        newStatus: "pending",
        error,
        duration: 0,
      };
    }

    // Max retries exceeded - mark as permanently failed
    await this.db.update(item.id, {
      syncStatus: "failed",
      retryCount: item.retryCount + 1,
      lastError: error,
    });

    const opResult: SyncOperationResult = {
      itemId: item.id,
      success: false,
      newStatus: "failed",
      error,
    };

    this.emit({
      type: "item_failed",
      timestamp: new Date(),
      data: { itemId: item.id, item, result: opResult },
    });

    return opResult;
  }

  /**
   * Handle sync conflict
   */
  private async handleConflict(
    item: OfflineQueueItem,
    serverData: unknown,
    serverTimestamp?: Date
  ): Promise<SyncOperationResult> {
    const conflict = this.conflictResolver.createConflictDetails(
      item,
      serverData,
      serverTimestamp
    );

    this.emit({
      type: "item_conflict",
      timestamp: new Date(),
      data: { itemId: item.id, item, conflict: conflict as ConflictDetails },
    });

    // Attempt to resolve
    const resolution = await this.conflictResolver.resolve(conflict);

    this.emit({
      type: "conflict_resolved",
      timestamp: new Date(),
      data: { itemId: item.id, resolution },
    });

    if (resolution.resolved) {
      // Update the item with resolved data and retry
      await this.db.update(item.id, {
        payload: resolution.resolvedData,
        syncStatus: "pending",
        retryCount: 0, // Reset retry count after conflict resolution
        lastError: undefined,
      });

      return {
        itemId: item.id,
        success: false,
        newStatus: "pending",
        hadConflict: true,
        conflictResolution: resolution,
      };
    }

    if (resolution.requiresManualResolution) {
      // Mark as needing manual resolution
      await this.db.update(item.id, {
        syncStatus: "failed",
        lastError: "Conflict requires manual resolution",
        metadata: {
          ...item.metadata,
          conflictDetails: conflict,
          requiresManualResolution: true,
        },
      });

      return {
        itemId: item.id,
        success: false,
        newStatus: "failed",
        error: "Conflict requires manual resolution",
        hadConflict: true,
        conflictResolution: resolution,
      };
    }

    // Resolution failed
    return await this.handleFailure(
      item,
      resolution.error ?? "Conflict resolution failed"
    );
  }

  /**
   * Create batches for concurrent processing
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Create empty batch result
   */
  private createEmptyBatchResult(): BatchSyncResult {
    const now = new Date();
    return {
      totalProcessed: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      conflicts: 0,
      results: [],
      totalDuration: 0,
      startedAt: now,
      completedAt: now,
    };
  }

  /**
   * Get current service state
   */
  async getState(): Promise<SyncServiceState> {
    const stats = await this.db.getStats();
    const networkStatus = this.getNetworkStatus();

    return {
      isInitialized: this.isInitialized,
      isSyncing: this.isSyncing,
      networkStatus,
      lastSyncResult: this.lastSyncResult,
      lastSyncAt: this.lastSyncAt,
      nextSyncAt: this.nextSyncAt,
      pendingCount: stats.data?.pending ?? 0,
      failedCount: stats.data?.failed ?? 0,
      syncingItemIds: Array.from(this.syncingItemIds),
    };
  }

  /**
   * Get current network status
   */
  getNetworkStatus(): NetworkStatus {
    if (typeof navigator === "undefined") {
      return { isOnline: true };
    }

    const status: NetworkStatus = {
      isOnline: navigator.onLine,
    };

    // Check for Network Information API
    const connection = (navigator as Navigator & {
      connection?: {
        type?: string;
        effectiveType?: string;
        downlink?: number;
        rtt?: number;
        saveData?: boolean;
      };
    }).connection;

    if (connection) {
      status.connectionType = connection.type as NetworkStatus["connectionType"];
      status.effectiveType = connection.effectiveType as NetworkStatus["effectiveType"];
      status.downlink = connection.downlink;
      status.rtt = connection.rtt;
      status.saveData = connection.saveData;
    }

    return status;
  }

  /**
   * Force sync a specific item
   */
  async syncItemById(itemId: string): Promise<SyncOperationResult> {
    const result = await this.db.get(itemId);
    if (!result.success || !result.data) {
      return {
        itemId,
        success: false,
        newStatus: "pending",
        error: "Item not found",
      };
    }

    return this.syncItem(result.data);
  }

  /**
   * Retry all failed items
   */
  async retryAllFailed(): Promise<BatchSyncResult> {
    // Reset all failed items to pending
    const failedResult = await this.db.getAll({ syncStatus: "failed" });
    if (!failedResult.success || !failedResult.data) {
      return this.createEmptyBatchResult();
    }

    for (const item of failedResult.data) {
      await this.db.update(item.id, {
        syncStatus: "pending",
        retryCount: 0,
        lastError: undefined,
      });
    }

    // Trigger sync
    return this.sync({ syncStatus: "pending" });
  }

  /**
   * Pause background sync
   */
  pause(): void {
    this.stopBackgroundSync();
    this.log("Sync service paused");
  }

  /**
   * Resume background sync
   */
  resume(): void {
    if (this.config.background.enabled && this.config.background.syncIntervalMs > 0) {
      this.startBackgroundSync();
      this.log("Sync service resumed");
    }
  }

  /**
   * Clean up old completed items
   */
  async cleanup(): Promise<number> {
    const result = await this.db.cleanupCompleted(this.config.autoCleanupDays);
    const count = result.data ?? 0;
    this.log(`Cleaned up ${count} old completed items`);
    return count;
  }

  /**
   * Destroy the service and clean up
   */
  destroy(): void {
    this.log("Destroying sync service...");

    this.stopBackgroundSync();

    // Remove event listeners
    if (typeof window !== "undefined") {
      if (this.onlineHandler) {
        window.removeEventListener("online", this.onlineHandler);
      }
      if (this.offlineHandler) {
        window.removeEventListener("offline", this.offlineHandler);
      }
      if (this.visibilityHandler) {
        document.removeEventListener("visibilitychange", this.visibilityHandler);
      }
    }

    this.eventListeners.clear();
    this.syncHandlers.clear();
    this.isInitialized = false;

    this.log("Sync service destroyed");
  }

  /**
   * Get configuration
   */
  getConfig(): OfflineSyncConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<OfflineSyncConfig>): void {
    this.config = this.mergeConfig(this.config, updates);

    // Update dependent services
    this.retryManager.updateConfig(this.config.retry);

    // Restart background sync if interval changed
    if (updates.background?.syncIntervalMs !== undefined) {
      this.stopBackgroundSync();
      if (this.config.background.enabled && this.config.background.syncIntervalMs > 0) {
        this.startBackgroundSync();
      }
    }

    this.log("Configuration updated");
  }
}

// Singleton instance
let syncServiceInstance: OfflineSyncService | null = null;

/**
 * Get or create the singleton sync service instance
 */
export function getOfflineSyncService(
  config?: Partial<OfflineSyncConfig>
): OfflineSyncService {
  if (!syncServiceInstance) {
    syncServiceInstance = new OfflineSyncService(config);
  }
  return syncServiceInstance;
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetOfflineSyncService(): void {
  if (syncServiceInstance) {
    syncServiceInstance.destroy();
    syncServiceInstance = null;
  }
}
