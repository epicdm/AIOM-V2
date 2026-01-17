/**
 * useOfflineQueue Hook
 *
 * React hook for managing the offline action queue.
 * Provides state management, sync operations, and queue manipulation.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  type OfflineQueueItem,
  type OfflineQueueStats,
  type OfflineQueueFilter,
  type CreateOfflineQueueItemInput,
  type OfflineQueueConfig,
} from "~/db/offline-queue-schema";
import {
  OfflineQueueDatabase,
  getOfflineQueueDb,
  type OfflineQueueResult,
} from "~/lib/offline-queue-db";

/**
 * Sync handler function type
 */
export type SyncHandler<TPayload = unknown> = (
  item: OfflineQueueItem<TPayload>
) => Promise<{ success: boolean; error?: string }>;

/**
 * Hook options
 */
export interface UseOfflineQueueOptions {
  /** Custom database configuration */
  config?: Partial<OfflineQueueConfig>;
  /** Handler function for syncing items */
  syncHandler?: SyncHandler;
  /** Automatically sync when coming back online */
  autoSync?: boolean;
  /** Polling interval for sync in ms (0 to disable) */
  syncInterval?: number;
  /** Filter for which items to load */
  filter?: OfflineQueueFilter;
  /** Callback when sync starts */
  onSyncStart?: () => void;
  /** Callback when sync ends */
  onSyncEnd?: (results: { synced: number; failed: number }) => void;
  /** Callback when an item is synced */
  onItemSynced?: (item: OfflineQueueItem) => void;
  /** Callback when an item fails to sync */
  onItemFailed?: (item: OfflineQueueItem, error: string) => void;
}

/**
 * Hook return type
 */
export interface UseOfflineQueueReturn {
  /** Current queue items */
  items: OfflineQueueItem[];
  /** Queue statistics */
  stats: OfflineQueueStats | null;
  /** Whether the queue is loading */
  isLoading: boolean;
  /** Whether a sync is in progress */
  isSyncing: boolean;
  /** Whether the browser is online */
  isOnline: boolean;
  /** Any error that occurred */
  error: string | null;
  /** Add an item to the queue */
  addItem: <TPayload = unknown>(
    input: CreateOfflineQueueItemInput<TPayload>
  ) => Promise<OfflineQueueResult<OfflineQueueItem<TPayload>>>;
  /** Update an item in the queue */
  updateItem: (
    id: string,
    updates: Partial<OfflineQueueItem>
  ) => Promise<OfflineQueueResult<OfflineQueueItem>>;
  /** Delete an item from the queue */
  deleteItem: (id: string) => Promise<OfflineQueueResult<void>>;
  /** Cancel an item */
  cancelItem: (id: string) => Promise<OfflineQueueResult<OfflineQueueItem>>;
  /** Retry a failed item */
  retryItem: (id: string) => Promise<OfflineQueueResult<OfflineQueueItem>>;
  /** Manually trigger sync */
  sync: () => Promise<void>;
  /** Refresh the queue data */
  refresh: () => Promise<void>;
  /** Clear all items */
  clearAll: () => Promise<OfflineQueueResult<void>>;
  /** Clear completed items */
  clearCompleted: () => Promise<OfflineQueueResult<number>>;
  /** Get a specific item */
  getItem: <TPayload = unknown>(
    id: string
  ) => Promise<OfflineQueueResult<OfflineQueueItem<TPayload> | null>>;
}

/**
 * Default empty stats
 */
const EMPTY_STATS: OfflineQueueStats = {
  total: 0,
  pending: 0,
  inProgress: 0,
  completed: 0,
  failed: 0,
  cancelled: 0,
  byOperationType: {} as Record<string, number>,
  byEntityType: {} as Record<string, number>,
  totalRetries: 0,
};

/**
 * useOfflineQueue hook
 */
export function useOfflineQueue(
  options: UseOfflineQueueOptions = {}
): UseOfflineQueueReturn {
  const {
    config,
    syncHandler,
    autoSync = true,
    syncInterval = 0,
    filter,
    onSyncStart,
    onSyncEnd,
    onItemSynced,
    onItemFailed,
  } = options;

  // State
  const [items, setItems] = useState<OfflineQueueItem[]>([]);
  const [stats, setStats] = useState<OfflineQueueStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [error, setError] = useState<string | null>(null);

  // Refs
  const dbRef = useRef<OfflineQueueDatabase | null>(null);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);

  /**
   * Initialize the database
   */
  useEffect(() => {
    isMountedRef.current = true;

    const initDb = async () => {
      try {
        dbRef.current = getOfflineQueueDb(config);
        await dbRef.current.init();
        await loadData();
      } catch (err) {
        if (isMountedRef.current) {
          setError(err instanceof Error ? err.message : "Failed to initialize database");
          setIsLoading(false);
        }
      }
    };

    initDb();

    return () => {
      isMountedRef.current = false;
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, []);

  /**
   * Load data from the database
   */
  const loadData = useCallback(async () => {
    if (!dbRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      const [itemsResult, statsResult] = await Promise.all([
        dbRef.current.getAll(filter),
        dbRef.current.getStats(),
      ]);

      if (isMountedRef.current) {
        if (itemsResult.success && itemsResult.data) {
          setItems(itemsResult.data);
        } else {
          setError(itemsResult.error ?? "Failed to load items");
        }

        if (statsResult.success && statsResult.data) {
          setStats(statsResult.data);
        }

        setIsLoading(false);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : "Failed to load data");
        setIsLoading(false);
      }
    }
  }, [filter]);

  /**
   * Handle online/offline events
   */
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (autoSync && syncHandler) {
        sync();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [autoSync, syncHandler]);

  /**
   * Set up sync interval
   */
  useEffect(() => {
    if (syncInterval > 0 && syncHandler) {
      syncIntervalRef.current = setInterval(() => {
        if (isOnline && !isSyncing) {
          sync();
        }
      }, syncInterval);
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [syncInterval, syncHandler, isOnline, isSyncing]);

  /**
   * Sync pending items
   */
  const sync = useCallback(async () => {
    if (!dbRef.current || !syncHandler || isSyncing || !isOnline) {
      return;
    }

    setIsSyncing(true);
    onSyncStart?.();

    let synced = 0;
    let failed = 0;

    try {
      // Get items ready for sync
      const result = await dbRef.current.getNextForSync();
      if (!result.success || !result.data) {
        throw new Error(result.error ?? "Failed to get items for sync");
      }

      // Process each item
      for (const item of result.data) {
        // Mark as in progress
        await dbRef.current.markInProgress(item.id);

        try {
          // Call the sync handler
          const syncResult = await syncHandler(item);

          if (syncResult.success) {
            await dbRef.current.markCompleted(item.id);
            synced++;
            onItemSynced?.(item);
          } else {
            await dbRef.current.markFailed(item.id, syncResult.error ?? "Unknown error");
            failed++;
            onItemFailed?.(item, syncResult.error ?? "Unknown error");
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : "Unknown error";
          await dbRef.current.markFailed(item.id, errorMessage);
          failed++;
          onItemFailed?.(item, errorMessage);
        }
      }

      // Reload data after sync
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      if (isMountedRef.current) {
        setIsSyncing(false);
        onSyncEnd?.({ synced, failed });
      }
    }
  }, [syncHandler, isOnline, isSyncing, onSyncStart, onSyncEnd, onItemSynced, onItemFailed, loadData]);

  /**
   * Add an item to the queue
   */
  const addItem = useCallback(
    async <TPayload = unknown>(
      input: CreateOfflineQueueItemInput<TPayload>
    ): Promise<OfflineQueueResult<OfflineQueueItem<TPayload>>> => {
      if (!dbRef.current) {
        return { success: false, error: "Database not initialized" };
      }

      const result = await dbRef.current.add(input);
      if (result.success) {
        await loadData();
      }
      return result;
    },
    [loadData]
  );

  /**
   * Update an item in the queue
   */
  const updateItem = useCallback(
    async (
      id: string,
      updates: Partial<OfflineQueueItem>
    ): Promise<OfflineQueueResult<OfflineQueueItem>> => {
      if (!dbRef.current) {
        return { success: false, error: "Database not initialized" };
      }

      const result = await dbRef.current.update(id, updates);
      if (result.success) {
        await loadData();
      }
      return result;
    },
    [loadData]
  );

  /**
   * Delete an item from the queue
   */
  const deleteItem = useCallback(
    async (id: string): Promise<OfflineQueueResult<void>> => {
      if (!dbRef.current) {
        return { success: false, error: "Database not initialized" };
      }

      const result = await dbRef.current.delete(id);
      if (result.success) {
        await loadData();
      }
      return result;
    },
    [loadData]
  );

  /**
   * Cancel an item
   */
  const cancelItem = useCallback(
    async (id: string): Promise<OfflineQueueResult<OfflineQueueItem>> => {
      if (!dbRef.current) {
        return { success: false, error: "Database not initialized" };
      }

      const result = await dbRef.current.cancel(id);
      if (result.success) {
        await loadData();
      }
      return result;
    },
    [loadData]
  );

  /**
   * Retry a failed item
   */
  const retryItem = useCallback(
    async (id: string): Promise<OfflineQueueResult<OfflineQueueItem>> => {
      if (!dbRef.current) {
        return { success: false, error: "Database not initialized" };
      }

      // Reset the item to pending status with reset retry count
      const result = await dbRef.current.update(id, {
        syncStatus: "pending",
        retryCount: 0,
        lastError: undefined,
      });

      if (result.success) {
        await loadData();
      }
      return result;
    },
    [loadData]
  );

  /**
   * Refresh the queue data
   */
  const refresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  /**
   * Clear all items
   */
  const clearAll = useCallback(async (): Promise<OfflineQueueResult<void>> => {
    if (!dbRef.current) {
      return { success: false, error: "Database not initialized" };
    }

    const result = await dbRef.current.clear();
    if (result.success) {
      await loadData();
    }
    return result;
  }, [loadData]);

  /**
   * Clear completed items
   */
  const clearCompleted = useCallback(async (): Promise<OfflineQueueResult<number>> => {
    if (!dbRef.current) {
      return { success: false, error: "Database not initialized" };
    }

    const result = await dbRef.current.deleteMany({ syncStatus: "completed" });
    if (result.success) {
      await loadData();
    }
    return result;
  }, [loadData]);

  /**
   * Get a specific item
   */
  const getItem = useCallback(
    async <TPayload = unknown>(
      id: string
    ): Promise<OfflineQueueResult<OfflineQueueItem<TPayload> | null>> => {
      if (!dbRef.current) {
        return { success: false, error: "Database not initialized" };
      }

      return dbRef.current.get<TPayload>(id);
    },
    []
  );

  return {
    items,
    stats: stats ?? EMPTY_STATS,
    isLoading,
    isSyncing,
    isOnline,
    error,
    addItem,
    updateItem,
    deleteItem,
    cancelItem,
    retryItem,
    sync,
    refresh,
    clearAll,
    clearCompleted,
    getItem,
  };
}

/**
 * Hook for just checking online status
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}

/**
 * Hook for queue statistics only
 */
export function useOfflineQueueStats(
  config?: Partial<OfflineQueueConfig>
): {
  stats: OfflineQueueStats | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const [stats, setStats] = useState<OfflineQueueStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dbRef = useRef<OfflineQueueDatabase | null>(null);

  const loadStats = useCallback(async () => {
    if (!dbRef.current) return;

    setIsLoading(true);
    try {
      const result = await dbRef.current.getStats();
      if (result.success && result.data) {
        setStats(result.data);
      } else {
        setError(result.error ?? "Failed to load stats");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stats");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      dbRef.current = getOfflineQueueDb(config);
      await dbRef.current.init();
      await loadStats();
    };
    init();
  }, []);

  return { stats, isLoading, error, refresh: loadStats };
}
