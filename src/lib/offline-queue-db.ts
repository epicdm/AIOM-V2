/**
 * Offline Queue Database
 *
 * IndexedDB wrapper for managing the offline action queue.
 * Provides CRUD operations for queue items with efficient indexing.
 */

import {
  type OfflineQueueItem,
  type OfflineQueueConfig,
  type OfflineQueueFilter,
  type OfflineQueueStats,
  type CreateOfflineQueueItemInput,
  type UpdateOfflineQueueItemInput,
  type OfflineOperationType,
  type OfflineEntityType,
  type OfflineSyncStatus,
  DEFAULT_OFFLINE_QUEUE_CONFIG,
  OFFLINE_QUEUE_INDEXES,
  createQueueItem,
  sortQueueItems,
} from "~/db/offline-queue-schema";

/**
 * Result type for database operations
 */
export interface OfflineQueueResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * OfflineQueueDatabase class
 * Manages IndexedDB operations for the offline queue
 */
export class OfflineQueueDatabase {
  private db: IDBDatabase | null = null;
  private config: OfflineQueueConfig;
  private initPromise: Promise<void> | null = null;

  constructor(config: Partial<OfflineQueueConfig> = {}) {
    this.config = { ...DEFAULT_OFFLINE_QUEUE_CONFIG, ...config };
  }

  /**
   * Initialize the IndexedDB database
   */
  async init(): Promise<void> {
    // Return existing init promise if already initializing
    if (this.initPromise) {
      return this.initPromise;
    }

    // Return immediately if already initialized
    if (this.db) {
      return;
    }

    this.initPromise = new Promise((resolve, reject) => {
      // Check if IndexedDB is available
      if (typeof indexedDB === "undefined") {
        reject(new Error("IndexedDB is not available in this environment"));
        return;
      }

      const request = indexedDB.open(this.config.dbName, this.config.dbVersion);

      request.onerror = () => {
        reject(new Error(`Failed to open database: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.config.storeName)) {
          const store = db.createObjectStore(this.config.storeName, {
            keyPath: "id",
          });

          // Create indexes for efficient querying
          for (const indexDef of OFFLINE_QUEUE_INDEXES) {
            store.createIndex(indexDef.name, indexDef.keyPath as string | string[], {
              unique: false,
            });
          }
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Ensure database is initialized before operations
   */
  private async ensureDb(): Promise<IDBDatabase> {
    await this.init();
    if (!this.db) {
      throw new Error("Database not initialized");
    }
    return this.db;
  }

  /**
   * Get object store for transactions
   */
  private async getStore(
    mode: IDBTransactionMode
  ): Promise<IDBObjectStore> {
    const db = await this.ensureDb();
    const transaction = db.transaction(this.config.storeName, mode);
    return transaction.objectStore(this.config.storeName);
  }

  /**
   * Add a new item to the queue
   */
  async add<TPayload = unknown>(
    input: CreateOfflineQueueItemInput<TPayload>
  ): Promise<OfflineQueueResult<OfflineQueueItem<TPayload>>> {
    try {
      const store = await this.getStore("readwrite");
      const item = createQueueItem(input, this.config);

      return new Promise((resolve) => {
        const request = store.add(item);

        request.onsuccess = () => {
          resolve({ success: true, data: item });
        };

        request.onerror = () => {
          resolve({
            success: false,
            error: `Failed to add item: ${request.error?.message}`,
          });
        };
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get a single item by ID
   */
  async get<TPayload = unknown>(
    id: string
  ): Promise<OfflineQueueResult<OfflineQueueItem<TPayload> | null>> {
    try {
      const store = await this.getStore("readonly");

      return new Promise((resolve) => {
        const request = store.get(id);

        request.onsuccess = () => {
          const item = request.result as OfflineQueueItem<TPayload> | undefined;
          if (item) {
            // Convert date strings back to Date objects
            item.createdAt = new Date(item.createdAt);
            item.updatedAt = new Date(item.updatedAt);
            if (item.lastSyncAttempt) {
              item.lastSyncAttempt = new Date(item.lastSyncAttempt);
            }
            if (item.completedAt) {
              item.completedAt = new Date(item.completedAt);
            }
          }
          resolve({ success: true, data: item ?? null });
        };

        request.onerror = () => {
          resolve({
            success: false,
            error: `Failed to get item: ${request.error?.message}`,
          });
        };
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get all items, optionally filtered
   */
  async getAll<TPayload = unknown>(
    filter?: OfflineQueueFilter
  ): Promise<OfflineQueueResult<OfflineQueueItem<TPayload>[]>> {
    try {
      const store = await this.getStore("readonly");

      return new Promise((resolve) => {
        const request = store.getAll();

        request.onsuccess = () => {
          let items = request.result as OfflineQueueItem<TPayload>[];

          // Convert date strings back to Date objects
          items = items.map((item) => ({
            ...item,
            createdAt: new Date(item.createdAt),
            updatedAt: new Date(item.updatedAt),
            lastSyncAttempt: item.lastSyncAttempt
              ? new Date(item.lastSyncAttempt)
              : undefined,
            completedAt: item.completedAt
              ? new Date(item.completedAt)
              : undefined,
          }));

          // Apply filters
          if (filter) {
            items = this.applyFilters(items, filter);
          }

          // Sort by priority and creation time
          items = sortQueueItems(items) as OfflineQueueItem<TPayload>[];

          resolve({ success: true, data: items });
        };

        request.onerror = () => {
          resolve({
            success: false,
            error: `Failed to get items: ${request.error?.message}`,
          });
        };
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Apply filters to items
   */
  private applyFilters<TPayload>(
    items: OfflineQueueItem<TPayload>[],
    filter: OfflineQueueFilter
  ): OfflineQueueItem<TPayload>[] {
    return items.filter((item) => {
      // Filter by sync status
      if (filter.syncStatus) {
        const statuses = Array.isArray(filter.syncStatus)
          ? filter.syncStatus
          : [filter.syncStatus];
        if (!statuses.includes(item.syncStatus)) {
          return false;
        }
      }

      // Filter by operation type
      if (filter.operationType) {
        const types = Array.isArray(filter.operationType)
          ? filter.operationType
          : [filter.operationType];
        if (!types.includes(item.operationType)) {
          return false;
        }
      }

      // Filter by entity type
      if (filter.entityType) {
        const types = Array.isArray(filter.entityType)
          ? filter.entityType
          : [filter.entityType];
        if (!types.includes(item.entityType)) {
          return false;
        }
      }

      // Filter by entity ID
      if (filter.entityId && item.entityId !== filter.entityId) {
        return false;
      }

      // Filter by user ID
      if (filter.userId && item.userId !== filter.userId) {
        return false;
      }

      // Filter by priority
      if (filter.priority) {
        const priorities = Array.isArray(filter.priority)
          ? filter.priority
          : [filter.priority];
        if (!priorities.includes(item.priority)) {
          return false;
        }
      }

      // Filter by creation date range
      if (filter.createdAfter && item.createdAt < filter.createdAfter) {
        return false;
      }
      if (filter.createdBefore && item.createdAt > filter.createdBefore) {
        return false;
      }

      // Filter by max retry count
      if (
        filter.maxRetryCount !== undefined &&
        item.retryCount > filter.maxRetryCount
      ) {
        return false;
      }

      return true;
    });
  }

  /**
   * Update an existing item
   */
  async update<TPayload = unknown>(
    id: string,
    updates: UpdateOfflineQueueItemInput
  ): Promise<OfflineQueueResult<OfflineQueueItem<TPayload>>> {
    try {
      const store = await this.getStore("readwrite");

      return new Promise((resolve) => {
        const getRequest = store.get(id);

        getRequest.onsuccess = () => {
          const existing = getRequest.result as OfflineQueueItem<TPayload> | undefined;
          if (!existing) {
            resolve({ success: false, error: "Item not found" });
            return;
          }

          const updated: OfflineQueueItem<TPayload> = {
            ...existing,
            ...updates,
            updatedAt: new Date(),
          } as OfflineQueueItem<TPayload>;

          const putRequest = store.put(updated);

          putRequest.onsuccess = () => {
            resolve({ success: true, data: updated });
          };

          putRequest.onerror = () => {
            resolve({
              success: false,
              error: `Failed to update item: ${putRequest.error?.message}`,
            });
          };
        };

        getRequest.onerror = () => {
          resolve({
            success: false,
            error: `Failed to get item for update: ${getRequest.error?.message}`,
          });
        };
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Delete an item by ID
   */
  async delete(id: string): Promise<OfflineQueueResult<void>> {
    try {
      const store = await this.getStore("readwrite");

      return new Promise((resolve) => {
        const request = store.delete(id);

        request.onsuccess = () => {
          resolve({ success: true });
        };

        request.onerror = () => {
          resolve({
            success: false,
            error: `Failed to delete item: ${request.error?.message}`,
          });
        };
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Delete multiple items by filter
   */
  async deleteMany(filter: OfflineQueueFilter): Promise<OfflineQueueResult<number>> {
    try {
      const result = await this.getAll(filter);
      if (!result.success || !result.data) {
        return { success: false, error: result.error };
      }

      const store = await this.getStore("readwrite");
      let deletedCount = 0;

      for (const item of result.data) {
        await new Promise<void>((resolve) => {
          const request = store.delete(item.id);
          request.onsuccess = () => {
            deletedCount++;
            resolve();
          };
          request.onerror = () => resolve();
        });
      }

      return { success: true, data: deletedCount };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Clear all items from the queue
   */
  async clear(): Promise<OfflineQueueResult<void>> {
    try {
      const store = await this.getStore("readwrite");

      return new Promise((resolve) => {
        const request = store.clear();

        request.onsuccess = () => {
          resolve({ success: true });
        };

        request.onerror = () => {
          resolve({
            success: false,
            error: `Failed to clear queue: ${request.error?.message}`,
          });
        };
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<OfflineQueueResult<OfflineQueueStats>> {
    try {
      const result = await this.getAll();
      if (!result.success || !result.data) {
        return { success: false, error: result.error };
      }

      const items = result.data;

      const stats: OfflineQueueStats = {
        total: items.length,
        pending: items.filter((i) => i.syncStatus === "pending").length,
        inProgress: items.filter((i) => i.syncStatus === "in_progress").length,
        completed: items.filter((i) => i.syncStatus === "completed").length,
        failed: items.filter((i) => i.syncStatus === "failed").length,
        cancelled: items.filter((i) => i.syncStatus === "cancelled").length,
        byOperationType: this.countByField(items, "operationType"),
        byEntityType: this.countByField(items, "entityType"),
        totalRetries: items.reduce((sum, i) => sum + i.retryCount, 0),
      };

      // Find oldest pending item
      const pendingItems = items.filter((i) => i.syncStatus === "pending");
      if (pendingItems.length > 0) {
        stats.oldestPendingItem = new Date(
          Math.min(...pendingItems.map((i) => i.createdAt.getTime()))
        );
      }

      return { success: true, data: stats };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Count items by a specific field
   */
  private countByField<T extends OfflineQueueItem>(
    items: T[],
    field: keyof T
  ): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const item of items) {
      const value = String(item[field]);
      counts[value] = (counts[value] ?? 0) + 1;
    }
    return counts;
  }

  /**
   * Get next items ready for sync (pending status, sorted by priority)
   */
  async getNextForSync(limit = 10): Promise<OfflineQueueResult<OfflineQueueItem[]>> {
    try {
      const result = await this.getAll({ syncStatus: "pending" });
      if (!result.success || !result.data) {
        return { success: false, error: result.error };
      }

      // Filter out items with pending dependencies
      const allItems = await this.getAll();
      const readyItems = result.data.filter((item) => {
        if (!item.dependsOn || item.dependsOn.length === 0) {
          return true;
        }
        return !item.dependsOn.some((depId) => {
          const dep = allItems.data?.find((i) => i.id === depId);
          return dep && dep.syncStatus !== "completed";
        });
      });

      return { success: true, data: readyItems.slice(0, limit) };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Mark an item as in progress
   */
  async markInProgress(id: string): Promise<OfflineQueueResult<OfflineQueueItem>> {
    return this.update(id, {
      syncStatus: "in_progress",
      lastSyncAttempt: new Date(),
    });
  }

  /**
   * Mark an item as completed
   */
  async markCompleted(id: string): Promise<OfflineQueueResult<OfflineQueueItem>> {
    return this.update(id, {
      syncStatus: "completed",
      completedAt: new Date(),
    });
  }

  /**
   * Mark an item as failed
   */
  async markFailed(
    id: string,
    error: string
  ): Promise<OfflineQueueResult<OfflineQueueItem>> {
    const getResult = await this.get(id);
    if (!getResult.success || !getResult.data) {
      return { success: false, error: "Item not found" };
    }

    const item = getResult.data;
    const newRetryCount = item.retryCount + 1;

    // If we've exceeded max retries, keep it as failed
    // Otherwise, set back to pending for retry
    const newStatus: OfflineSyncStatus =
      newRetryCount >= item.maxRetries ? "failed" : "pending";

    return this.update(id, {
      syncStatus: newStatus,
      retryCount: newRetryCount,
      lastError: error,
    });
  }

  /**
   * Cancel an item
   */
  async cancel(id: string): Promise<OfflineQueueResult<OfflineQueueItem>> {
    return this.update(id, {
      syncStatus: "cancelled",
    });
  }

  /**
   * Cleanup old completed items
   */
  async cleanupCompleted(olderThanDays?: number): Promise<OfflineQueueResult<number>> {
    const days = olderThanDays ?? this.config.autoCleanupDays;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await this.getAll({
      syncStatus: "completed",
      createdBefore: cutoffDate,
    });

    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    return this.deleteMany({
      syncStatus: "completed",
      createdBefore: cutoffDate,
    });
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
    }
  }

  /**
   * Delete the entire database
   */
  async deleteDatabase(): Promise<OfflineQueueResult<void>> {
    this.close();

    return new Promise((resolve) => {
      const request = indexedDB.deleteDatabase(this.config.dbName);

      request.onsuccess = () => {
        resolve({ success: true });
      };

      request.onerror = () => {
        resolve({
          success: false,
          error: `Failed to delete database: ${request.error?.message}`,
        });
      };
    });
  }
}

/**
 * Singleton instance of the offline queue database
 */
let instance: OfflineQueueDatabase | null = null;

/**
 * Get or create the singleton database instance
 */
export function getOfflineQueueDb(
  config?: Partial<OfflineQueueConfig>
): OfflineQueueDatabase {
  if (!instance) {
    instance = new OfflineQueueDatabase(config);
  }
  return instance;
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetOfflineQueueDb(): void {
  if (instance) {
    instance.close();
    instance = null;
  }
}
