/**
 * useOfflineSyncService Hook
 *
 * React hook for using the offline sync service with
 * state management, event handling, and lifecycle management.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  OfflineSyncService,
  getOfflineSyncService,
  type OfflineSyncConfig,
  type SyncServiceState,
  type BatchSyncResult,
  type SyncEvent,
  type SyncEventType,
  type SyncHandler,
  type NetworkStatus,
} from "~/lib/offline-sync";
import type { OfflineQueueFilter } from "~/db/offline-queue-schema";

/**
 * Hook options
 */
export interface UseOfflineSyncServiceOptions {
  /** Custom configuration for the sync service */
  config?: Partial<OfflineSyncConfig>;
  /** Whether to auto-initialize the service */
  autoInit?: boolean;
  /** Event handlers */
  onSyncStarted?: () => void;
  onSyncCompleted?: (result: BatchSyncResult) => void;
  onItemSynced?: (event: SyncEvent) => void;
  onItemFailed?: (event: SyncEvent) => void;
  onConflict?: (event: SyncEvent) => void;
  onError?: (error: string) => void;
  onOnline?: () => void;
  onOffline?: () => void;
}

/**
 * Hook return type
 */
export interface UseOfflineSyncServiceReturn {
  /** Current service state */
  state: SyncServiceState;
  /** Whether the service is initialized */
  isInitialized: boolean;
  /** Whether a sync is in progress */
  isSyncing: boolean;
  /** Whether the device is online */
  isOnline: boolean;
  /** Network status details */
  networkStatus: NetworkStatus;
  /** Last sync result */
  lastSyncResult?: BatchSyncResult;
  /** Last sync timestamp */
  lastSyncAt?: Date;
  /** Number of pending items */
  pendingCount: number;
  /** Number of failed items */
  failedCount: number;
  /** Any error that occurred */
  error: string | null;

  // Actions
  /** Initialize the service */
  init: () => Promise<void>;
  /** Trigger a sync operation */
  sync: (filter?: OfflineQueueFilter) => Promise<BatchSyncResult>;
  /** Sync a specific item by ID */
  syncItem: (itemId: string) => Promise<void>;
  /** Retry all failed items */
  retryAllFailed: () => Promise<BatchSyncResult>;
  /** Pause background sync */
  pause: () => void;
  /** Resume background sync */
  resume: () => void;
  /** Clean up old completed items */
  cleanup: () => Promise<number>;
  /** Register a sync handler for an entity type */
  registerHandler: <T = unknown, R = unknown>(
    entityType: string,
    handler: SyncHandler<T, R>
  ) => void;
  /** Unregister a sync handler */
  unregisterHandler: (entityType: string) => void;
  /** Refresh state from service */
  refreshState: () => Promise<void>;
  /** Add an event listener */
  addEventListener: (
    event: SyncEventType | "all",
    listener: (event: SyncEvent) => void
  ) => () => void;
}

/**
 * Default empty state
 */
const EMPTY_STATE: SyncServiceState = {
  isInitialized: false,
  isSyncing: false,
  networkStatus: { isOnline: true },
  pendingCount: 0,
  failedCount: 0,
  syncingItemIds: [],
};

/**
 * useOfflineSyncService hook
 */
export function useOfflineSyncService(
  options: UseOfflineSyncServiceOptions = {}
): UseOfflineSyncServiceReturn {
  const {
    config,
    autoInit = true,
    onSyncStarted,
    onSyncCompleted,
    onItemSynced,
    onItemFailed,
    onConflict,
    onError,
    onOnline,
    onOffline,
  } = options;

  // State
  const [state, setState] = useState<SyncServiceState>(EMPTY_STATE);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const serviceRef = useRef<OfflineSyncService | null>(null);
  const isMountedRef = useRef(true);
  const unsubscribersRef = useRef<(() => void)[]>([]);

  /**
   * Safe state update
   */
  const safeSetState = useCallback((newState: SyncServiceState) => {
    if (isMountedRef.current) {
      setState(newState);
    }
  }, []);

  /**
   * Refresh state from service
   */
  const refreshState = useCallback(async () => {
    if (!serviceRef.current) return;
    try {
      const newState = await serviceRef.current.getState();
      safeSetState(newState);
    } catch (err) {
      console.error("Failed to refresh state:", err);
    }
  }, [safeSetState]);

  /**
   * Initialize the service
   */
  const init = useCallback(async () => {
    if (serviceRef.current?.getState) {
      const currentState = await serviceRef.current.getState();
      if (currentState.isInitialized) {
        return;
      }
    }

    try {
      setError(null);
      serviceRef.current = getOfflineSyncService(config);

      // Set up event listeners
      const service = serviceRef.current;

      const unsubSync = service.addEventListener("sync_started", () => {
        refreshState();
        onSyncStarted?.();
      });

      const unsubCompleted = service.addEventListener("sync_completed", (event) => {
        refreshState();
        if (event.data?.batchResult) {
          onSyncCompleted?.(event.data.batchResult);
        }
      });

      const unsubItemSynced = service.addEventListener("item_synced", (event) => {
        refreshState();
        onItemSynced?.(event);
      });

      const unsubItemFailed = service.addEventListener("item_failed", (event) => {
        refreshState();
        onItemFailed?.(event);
      });

      const unsubConflict = service.addEventListener("item_conflict", (event) => {
        onConflict?.(event);
      });

      const unsubError = service.addEventListener("error", (event) => {
        const errorMsg = event.data?.error ?? "Unknown error";
        if (isMountedRef.current) {
          setError(errorMsg);
        }
        onError?.(errorMsg);
      });

      const unsubOnline = service.addEventListener("online", () => {
        refreshState();
        onOnline?.();
      });

      const unsubOffline = service.addEventListener("offline", () => {
        refreshState();
        onOffline?.();
      });

      unsubscribersRef.current = [
        unsubSync,
        unsubCompleted,
        unsubItemSynced,
        unsubItemFailed,
        unsubConflict,
        unsubError,
        unsubOnline,
        unsubOffline,
      ];

      await service.init();
      await refreshState();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to initialize";
      if (isMountedRef.current) {
        setError(errorMsg);
      }
      onError?.(errorMsg);
    }
  }, [
    config,
    refreshState,
    onSyncStarted,
    onSyncCompleted,
    onItemSynced,
    onItemFailed,
    onConflict,
    onError,
    onOnline,
    onOffline,
  ]);

  /**
   * Initialize on mount if autoInit is true
   */
  useEffect(() => {
    isMountedRef.current = true;

    if (autoInit) {
      init();
    }

    return () => {
      isMountedRef.current = false;
      // Unsubscribe from all events
      unsubscribersRef.current.forEach((unsub) => unsub());
      unsubscribersRef.current = [];
    };
  }, [autoInit, init]);

  /**
   * Sync operation
   */
  const sync = useCallback(
    async (filter?: OfflineQueueFilter): Promise<BatchSyncResult> => {
      if (!serviceRef.current) {
        return {
          totalProcessed: 0,
          successful: 0,
          failed: 0,
          skipped: 0,
          conflicts: 0,
          results: [],
          totalDuration: 0,
          startedAt: new Date(),
          completedAt: new Date(),
        };
      }

      try {
        setError(null);
        return await serviceRef.current.sync(filter);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Sync failed";
        setError(errorMsg);
        throw err;
      }
    },
    []
  );

  /**
   * Sync a specific item
   */
  const syncItem = useCallback(async (itemId: string): Promise<void> => {
    if (!serviceRef.current) return;

    try {
      setError(null);
      await serviceRef.current.syncItemById(itemId);
      await refreshState();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to sync item";
      setError(errorMsg);
      throw err;
    }
  }, [refreshState]);

  /**
   * Retry all failed items
   */
  const retryAllFailed = useCallback(async (): Promise<BatchSyncResult> => {
    if (!serviceRef.current) {
      return {
        totalProcessed: 0,
        successful: 0,
        failed: 0,
        skipped: 0,
        conflicts: 0,
        results: [],
        totalDuration: 0,
        startedAt: new Date(),
        completedAt: new Date(),
      };
    }

    try {
      setError(null);
      return await serviceRef.current.retryAllFailed();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to retry";
      setError(errorMsg);
      throw err;
    }
  }, []);

  /**
   * Pause background sync
   */
  const pause = useCallback(() => {
    serviceRef.current?.pause();
  }, []);

  /**
   * Resume background sync
   */
  const resume = useCallback(() => {
    serviceRef.current?.resume();
  }, []);

  /**
   * Cleanup old items
   */
  const cleanup = useCallback(async (): Promise<number> => {
    if (!serviceRef.current) return 0;
    const count = await serviceRef.current.cleanup();
    await refreshState();
    return count;
  }, [refreshState]);

  /**
   * Register a sync handler
   */
  const registerHandler = useCallback(
    <T = unknown, R = unknown>(
      entityType: string,
      handler: SyncHandler<T, R>
    ) => {
      serviceRef.current?.registerSyncHandler(entityType, handler);
    },
    []
  );

  /**
   * Unregister a sync handler
   */
  const unregisterHandler = useCallback((entityType: string) => {
    serviceRef.current?.unregisterSyncHandler(entityType);
  }, []);

  /**
   * Add event listener
   */
  const addEventListener = useCallback(
    (
      event: SyncEventType | "all",
      listener: (event: SyncEvent) => void
    ): (() => void) => {
      if (!serviceRef.current) {
        return () => {};
      }
      return serviceRef.current.addEventListener(event, listener);
    },
    []
  );

  // Derived state
  const isInitialized = state.isInitialized;
  const isSyncing = state.isSyncing;
  const isOnline = state.networkStatus.isOnline;
  const networkStatus = state.networkStatus;
  const lastSyncResult = state.lastSyncResult;
  const lastSyncAt = state.lastSyncAt;
  const pendingCount = state.pendingCount;
  const failedCount = state.failedCount;

  return {
    state,
    isInitialized,
    isSyncing,
    isOnline,
    networkStatus,
    lastSyncResult,
    lastSyncAt,
    pendingCount,
    failedCount,
    error,
    init,
    sync,
    syncItem,
    retryAllFailed,
    pause,
    resume,
    cleanup,
    registerHandler,
    unregisterHandler,
    refreshState,
    addEventListener,
  };
}

/**
 * Simplified hook for just checking sync status
 */
export function useSyncStatus(): {
  isSyncing: boolean;
  isOnline: boolean;
  pendingCount: number;
  failedCount: number;
} {
  const [status, setStatus] = useState({
    isSyncing: false,
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    pendingCount: 0,
    failedCount: 0,
  });

  useEffect(() => {
    const service = getOfflineSyncService();

    const updateStatus = async () => {
      const state = await service.getState();
      setStatus({
        isSyncing: state.isSyncing,
        isOnline: state.networkStatus.isOnline,
        pendingCount: state.pendingCount,
        failedCount: state.failedCount,
      });
    };

    // Initial update
    service.init().then(updateStatus);

    // Subscribe to events
    const unsubSync = service.addEventListener("sync_started", updateStatus);
    const unsubComplete = service.addEventListener("sync_completed", updateStatus);
    const unsubOnline = service.addEventListener("online", updateStatus);
    const unsubOffline = service.addEventListener("offline", updateStatus);

    return () => {
      unsubSync();
      unsubComplete();
      unsubOnline();
      unsubOffline();
    };
  }, []);

  return status;
}

/**
 * Hook to register a sync handler
 */
export function useSyncHandler<TPayload = unknown, TResponse = unknown>(
  entityType: string,
  handler: SyncHandler<TPayload, TResponse>,
  deps: React.DependencyList = []
): void {
  const { registerHandler, unregisterHandler } = useOfflineSyncService({
    autoInit: true,
  });

  useEffect(() => {
    registerHandler(entityType, handler);
    return () => unregisterHandler(entityType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, registerHandler, unregisterHandler, ...deps]);
}
