/**
 * useContactSync Hook
 *
 * React hook for managing contact sync with Odoo.
 * Provides state management, sync operations, and offline support.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  SyncedContact,
  ContactSyncState,
  ContactSyncLog,
  ContactConflictResolution,
  ContactSyncStatus,
} from "~/db/schema";
import {
  getSyncStateFn,
  updateSyncStateFn,
  performFullSyncFn,
  performIncrementalSyncFn,
  pushLocalChangesFn,
  performBidirectionalSyncFn,
  getSyncedContactsFn,
  getSyncedContactByIdFn,
  updateContactLocallyFn,
  deleteSyncedContactFn,
  searchContactsFn,
  countContactsFn,
  getConflictsFn,
  resolveConflictFn,
  getPendingChangesFn,
  toggleFavoriteFn,
  getFavoritesFn,
  getSyncLogsFn,
  clearAllContactsFn,
  getSyncSummaryFn,
} from "~/fn/contact-sync";
import type { ContactSyncOptions, ContactSyncResult } from "~/data-access/contact-sync";

// Type for push result
interface ContactPushResult {
  success: boolean;
  pushed: number;
  errors: string[];
}

// Type for bidirectional sync result
interface BidirectionalSyncResult {
  push: ContactPushResult;
  pull: ContactSyncResult;
  success: boolean;
}

// =============================================================================
// Types
// =============================================================================

export interface ContactFilters {
  limit?: number;
  offset?: number;
  status?: ContactSyncStatus;
  isCustomer?: boolean;
  isVendor?: boolean;
  hasConflict?: boolean;
  search?: string;
  orderBy?: "name" | "updatedAt" | "lastSyncedAt";
  orderDir?: "asc" | "desc";
}

export interface ContactUpdate {
  name?: string;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  website?: string | null;
  street?: string | null;
  street2?: string | null;
  city?: string | null;
  zip?: string | null;
  jobTitle?: string | null;
  isFavorite?: boolean;
}

export interface SyncStateUpdate {
  autoSyncEnabled?: boolean;
  syncIntervalMinutes?: number;
  syncOnWifiOnly?: boolean;
  syncCustomers?: boolean;
  syncVendors?: boolean;
  syncCompaniesOnly?: boolean;
}

export interface UseContactSyncOptions {
  /** Enable auto-sync on mount */
  autoSyncOnMount?: boolean;
  /** Auto-sync interval in milliseconds (0 to disable) */
  autoSyncInterval?: number;
  /** Initial filters for contacts */
  initialFilters?: ContactFilters;
  /** Callback when sync starts */
  onSyncStart?: () => void;
  /** Callback when sync completes */
  onSyncComplete?: (result: ContactSyncResult) => void;
  /** Callback when sync fails */
  onSyncError?: (error: Error) => void;
  /** Callback when conflict is detected */
  onConflictDetected?: (contacts: SyncedContact[]) => void;
}

export interface UseContactSyncReturn {
  // State
  contacts: SyncedContact[];
  syncState: ContactSyncState | null;
  conflicts: SyncedContact[];
  pendingChanges: SyncedContact[];
  favorites: SyncedContact[];
  syncLogs: ContactSyncLog[];

  // Loading states
  isLoading: boolean;
  isSyncing: boolean;
  isLoadingContacts: boolean;
  isLoadingSyncState: boolean;

  // Online status
  isOnline: boolean;

  // Error state
  error: Error | null;

  // Counts
  totalContacts: number;
  conflictCount: number;
  pendingCount: number;

  // Sync operations
  performFullSync: (options?: ContactSyncOptions) => Promise<ContactSyncResult>;
  performIncrementalSync: (options?: ContactSyncOptions) => Promise<ContactSyncResult>;
  pushChanges: () => Promise<{ success: boolean; pushed: number; errors: string[] }>;
  bidirectionalSync: (options?: ContactSyncOptions) => Promise<{
    push: { success: boolean; pushed: number; errors: string[] };
    pull: ContactSyncResult;
    success: boolean;
  }>;

  // Contact operations
  getContact: (contactId: string) => Promise<SyncedContact | null>;
  updateContact: (contactId: string, updates: ContactUpdate) => Promise<SyncedContact | null>;
  deleteContact: (contactId: string) => Promise<boolean>;
  searchContacts: (query: string, limit?: number) => Promise<SyncedContact[]>;
  toggleFavorite: (contactId: string) => Promise<SyncedContact | null>;

  // Conflict operations
  resolveConflict: (
    contactId: string,
    resolution: ContactConflictResolution,
    mergedData?: Partial<SyncedContact>
  ) => Promise<SyncedContact | null>;

  // State operations
  updateSyncState: (updates: SyncStateUpdate) => Promise<ContactSyncState>;
  clearAllContacts: () => Promise<void>;

  // Refresh
  refresh: () => void;
  refreshContacts: () => void;
  refreshSyncState: () => void;

  // Filter operations
  setFilters: (filters: ContactFilters) => void;
  filters: ContactFilters;
}

// =============================================================================
// Query Keys
// =============================================================================

export const contactSyncQueryKeys = {
  all: ["contactSync"] as const,
  syncState: () => [...contactSyncQueryKeys.all, "syncState"] as const,
  contacts: (filters?: ContactFilters) =>
    [...contactSyncQueryKeys.all, "contacts", filters] as const,
  contact: (id: string) => [...contactSyncQueryKeys.all, "contact", id] as const,
  conflicts: () => [...contactSyncQueryKeys.all, "conflicts"] as const,
  pendingChanges: () => [...contactSyncQueryKeys.all, "pendingChanges"] as const,
  favorites: () => [...contactSyncQueryKeys.all, "favorites"] as const,
  syncLogs: () => [...contactSyncQueryKeys.all, "syncLogs"] as const,
  summary: () => [...contactSyncQueryKeys.all, "summary"] as const,
  count: (filters?: ContactFilters) =>
    [...contactSyncQueryKeys.all, "count", filters] as const,
};

// =============================================================================
// Hook Implementation
// =============================================================================

export function useContactSync(
  options: UseContactSyncOptions = {}
): UseContactSyncReturn {
  const {
    autoSyncOnMount = false,
    autoSyncInterval = 0,
    initialFilters = {},
    onSyncStart,
    onSyncComplete,
    onSyncError,
    onConflictDetected,
  } = options;

  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<ContactFilters>(initialFilters);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);

  // ==========================================================================
  // Online/Offline Detection
  // ==========================================================================

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

  // ==========================================================================
  // Queries
  // ==========================================================================

  // Sync State Query
  const syncStateQuery = useQuery({
    queryKey: contactSyncQueryKeys.syncState(),
    queryFn: () => getSyncStateFn(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Contacts Query
  const contactsQuery = useQuery({
    queryKey: contactSyncQueryKeys.contacts(filters),
    queryFn: () => getSyncedContactsFn({ data: filters }),
    staleTime: 60 * 1000, // 1 minute
  });

  // Conflicts Query
  const conflictsQuery = useQuery({
    queryKey: contactSyncQueryKeys.conflicts(),
    queryFn: () => getConflictsFn(),
    staleTime: 60 * 1000,
  });

  // Pending Changes Query
  const pendingChangesQuery = useQuery({
    queryKey: contactSyncQueryKeys.pendingChanges(),
    queryFn: () => getPendingChangesFn(),
    staleTime: 60 * 1000,
  });

  // Favorites Query
  const favoritesQuery = useQuery({
    queryKey: contactSyncQueryKeys.favorites(),
    queryFn: () => getFavoritesFn(),
    staleTime: 60 * 1000,
  });

  // Sync Logs Query
  const syncLogsQuery = useQuery({
    queryKey: contactSyncQueryKeys.syncLogs(),
    queryFn: () => getSyncLogsFn({ data: { limit: 10 } }),
    staleTime: 60 * 1000,
  });

  // Count Query
  const countQuery = useQuery({
    queryKey: contactSyncQueryKeys.count(),
    queryFn: () => countContactsFn({}),
    staleTime: 60 * 1000,
  });

  // ==========================================================================
  // Mutations
  // ==========================================================================

  // Full Sync Mutation
  const fullSyncMutation = useMutation({
    mutationFn: async (syncOptions?: ContactSyncOptions): Promise<ContactSyncResult> => {
      const result = await performFullSyncFn({ data: syncOptions });
      return result as ContactSyncResult;
    },
    onMutate: () => {
      setIsSyncing(true);
      onSyncStart?.();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: contactSyncQueryKeys.all });
      onSyncComplete?.(result);

      if (result.conflicts > 0) {
        conflictsQuery.refetch().then((res) => {
          if (res.data) {
            onConflictDetected?.(res.data);
          }
        });
      }
    },
    onError: (error: Error) => {
      onSyncError?.(error);
    },
    onSettled: () => {
      if (isMountedRef.current) {
        setIsSyncing(false);
      }
    },
  });

  // Incremental Sync Mutation
  const incrementalSyncMutation = useMutation({
    mutationFn: async (syncOptions?: ContactSyncOptions): Promise<ContactSyncResult> => {
      const result = await performIncrementalSyncFn({ data: syncOptions });
      return result as ContactSyncResult;
    },
    onMutate: () => {
      setIsSyncing(true);
      onSyncStart?.();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: contactSyncQueryKeys.all });
      onSyncComplete?.(result);

      if (result.conflicts > 0) {
        conflictsQuery.refetch().then((res) => {
          if (res.data) {
            onConflictDetected?.(res.data);
          }
        });
      }
    },
    onError: (error: Error) => {
      onSyncError?.(error);
    },
    onSettled: () => {
      if (isMountedRef.current) {
        setIsSyncing(false);
      }
    },
  });

  // Push Changes Mutation
  const pushChangesMutation = useMutation({
    mutationFn: async (): Promise<ContactPushResult> => {
      const result = await pushLocalChangesFn();
      return result as ContactPushResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contactSyncQueryKeys.all });
    },
  });

  // Bidirectional Sync Mutation
  const bidirectionalSyncMutation = useMutation({
    mutationFn: async (syncOptions?: ContactSyncOptions): Promise<BidirectionalSyncResult> => {
      const result = await performBidirectionalSyncFn({ data: syncOptions });
      return result as BidirectionalSyncResult;
    },
    onMutate: () => {
      setIsSyncing(true);
      onSyncStart?.();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: contactSyncQueryKeys.all });
      if (result.pull) {
        onSyncComplete?.(result.pull);
      }
    },
    onError: (error: Error) => {
      onSyncError?.(error);
    },
    onSettled: () => {
      if (isMountedRef.current) {
        setIsSyncing(false);
      }
    },
  });

  // Update Contact Mutation
  const updateContactMutation = useMutation({
    mutationFn: async ({ contactId, updates }: { contactId: string; updates: ContactUpdate }): Promise<SyncedContact | null> => {
      const result = await updateContactLocallyFn({ data: { contactId, updates } });
      return result as SyncedContact | null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contactSyncQueryKeys.contacts() });
      queryClient.invalidateQueries({ queryKey: contactSyncQueryKeys.pendingChanges() });
    },
  });

  // Delete Contact Mutation
  const deleteContactMutation = useMutation({
    mutationFn: async (contactId: string): Promise<{ success: boolean }> => {
      const result = await deleteSyncedContactFn({ data: { contactId } });
      return result as { success: boolean };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contactSyncQueryKeys.all });
    },
  });

  // Toggle Favorite Mutation
  const toggleFavoriteMutation = useMutation({
    mutationFn: async (contactId: string): Promise<SyncedContact | null> => {
      const result = await toggleFavoriteFn({ data: { contactId } });
      return result as SyncedContact | null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contactSyncQueryKeys.contacts() });
      queryClient.invalidateQueries({ queryKey: contactSyncQueryKeys.favorites() });
    },
  });

  // Resolve Conflict Mutation
  const resolveConflictMutation = useMutation({
    mutationFn: async ({
      contactId,
      resolution,
      mergedData,
    }: {
      contactId: string;
      resolution: ContactConflictResolution;
      mergedData?: Partial<SyncedContact>;
    }): Promise<SyncedContact | null> => {
      const result = await resolveConflictFn({ data: { contactId, resolution, mergedData } });
      return result as SyncedContact | null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contactSyncQueryKeys.all });
    },
  });

  // Update Sync State Mutation
  const updateSyncStateMutation = useMutation({
    mutationFn: async (updates: SyncStateUpdate): Promise<ContactSyncState> => {
      const result = await updateSyncStateFn({ data: updates });
      return result as ContactSyncState;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contactSyncQueryKeys.syncState() });
    },
  });

  // Clear All Contacts Mutation
  const clearAllContactsMutation = useMutation({
    mutationFn: async (): Promise<{ success: boolean }> => {
      const result = await clearAllContactsFn();
      return result as { success: boolean };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contactSyncQueryKeys.all });
    },
  });

  // ==========================================================================
  // Auto-sync
  // ==========================================================================

  // Auto-sync on mount
  useEffect(() => {
    if (autoSyncOnMount && isOnline) {
      incrementalSyncMutation.mutate(undefined);
    }
  }, [autoSyncOnMount]);

  // Auto-sync interval
  useEffect(() => {
    if (autoSyncInterval > 0 && isOnline) {
      syncIntervalRef.current = setInterval(() => {
        if (isOnline && !isSyncing) {
          incrementalSyncMutation.mutate(undefined);
        }
      }, autoSyncInterval);
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [autoSyncInterval, isOnline, isSyncing]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ==========================================================================
  // Handlers
  // ==========================================================================

  const performFullSync = useCallback(
    async (syncOptions?: ContactSyncOptions) => {
      return fullSyncMutation.mutateAsync(syncOptions);
    },
    [fullSyncMutation]
  );

  const performIncrementalSync = useCallback(
    async (syncOptions?: ContactSyncOptions) => {
      return incrementalSyncMutation.mutateAsync(syncOptions);
    },
    [incrementalSyncMutation]
  );

  const pushChanges = useCallback(async () => {
    return pushChangesMutation.mutateAsync();
  }, [pushChangesMutation]);

  const bidirectionalSync = useCallback(
    async (syncOptions?: ContactSyncOptions) => {
      return bidirectionalSyncMutation.mutateAsync(syncOptions);
    },
    [bidirectionalSyncMutation]
  );

  const getContact = useCallback(
    async (contactId: string) => {
      return getSyncedContactByIdFn({ data: { contactId } });
    },
    []
  );

  const updateContact = useCallback(
    async (contactId: string, updates: ContactUpdate) => {
      return updateContactMutation.mutateAsync({ contactId, updates });
    },
    [updateContactMutation]
  );

  const deleteContact = useCallback(
    async (contactId: string) => {
      const result = await deleteContactMutation.mutateAsync(contactId);
      return result.success;
    },
    [deleteContactMutation]
  );

  const searchContacts = useCallback(
    async (query: string, limit?: number) => {
      return searchContactsFn({ data: { query, limit } });
    },
    []
  );

  const handleToggleFavorite = useCallback(
    async (contactId: string) => {
      return toggleFavoriteMutation.mutateAsync(contactId);
    },
    [toggleFavoriteMutation]
  );

  const resolveConflict = useCallback(
    async (
      contactId: string,
      resolution: ContactConflictResolution,
      mergedData?: Partial<SyncedContact>
    ) => {
      return resolveConflictMutation.mutateAsync({
        contactId,
        resolution,
        mergedData,
      });
    },
    [resolveConflictMutation]
  );

  const handleUpdateSyncState = useCallback(
    async (updates: SyncStateUpdate) => {
      return updateSyncStateMutation.mutateAsync(updates);
    },
    [updateSyncStateMutation]
  );

  const clearAllContacts = useCallback(async () => {
    await clearAllContactsMutation.mutateAsync();
  }, [clearAllContactsMutation]);

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: contactSyncQueryKeys.all });
  }, [queryClient]);

  const refreshContacts = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: contactSyncQueryKeys.contacts() });
  }, [queryClient]);

  const refreshSyncState = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: contactSyncQueryKeys.syncState() });
  }, [queryClient]);

  // ==========================================================================
  // Return
  // ==========================================================================

  return {
    // State
    contacts: contactsQuery.data ?? [],
    syncState: syncStateQuery.data ?? null,
    conflicts: conflictsQuery.data ?? [],
    pendingChanges: pendingChangesQuery.data ?? [],
    favorites: favoritesQuery.data ?? [],
    syncLogs: syncLogsQuery.data ?? [],

    // Loading states
    isLoading:
      contactsQuery.isLoading ||
      syncStateQuery.isLoading ||
      conflictsQuery.isLoading,
    isSyncing,
    isLoadingContacts: contactsQuery.isLoading,
    isLoadingSyncState: syncStateQuery.isLoading,

    // Online status
    isOnline,

    // Error state
    error:
      contactsQuery.error ||
      syncStateQuery.error ||
      fullSyncMutation.error ||
      incrementalSyncMutation.error ||
      null,

    // Counts
    totalContacts: countQuery.data ?? 0,
    conflictCount: conflictsQuery.data?.length ?? 0,
    pendingCount: pendingChangesQuery.data?.length ?? 0,

    // Sync operations
    performFullSync,
    performIncrementalSync,
    pushChanges,
    bidirectionalSync,

    // Contact operations
    getContact,
    updateContact,
    deleteContact,
    searchContacts,
    toggleFavorite: handleToggleFavorite,

    // Conflict operations
    resolveConflict,

    // State operations
    updateSyncState: handleUpdateSyncState,
    clearAllContacts,

    // Refresh
    refresh,
    refreshContacts,
    refreshSyncState,

    // Filter operations
    setFilters,
    filters,
  };
}

// =============================================================================
// Additional Hooks
// =============================================================================

/**
 * Hook for just the sync state
 */
export function useContactSyncState() {
  const query = useQuery({
    queryKey: contactSyncQueryKeys.syncState(),
    queryFn: () => getSyncStateFn(),
    staleTime: 5 * 60 * 1000,
  });

  return {
    syncState: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refresh: () => query.refetch(),
  };
}

/**
 * Hook for contact sync summary/stats
 */
export function useContactSyncSummary() {
  const query = useQuery({
    queryKey: contactSyncQueryKeys.summary(),
    queryFn: () => getSyncSummaryFn(),
    staleTime: 60 * 1000,
  });

  return {
    summary: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refresh: () => query.refetch(),
  };
}

/**
 * Hook for a single contact
 */
export function useSyncedContact(contactId: string) {
  const query = useQuery({
    queryKey: contactSyncQueryKeys.contact(contactId),
    queryFn: () => getSyncedContactByIdFn({ data: { contactId } }),
    enabled: !!contactId,
    staleTime: 60 * 1000,
  });

  return {
    contact: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refresh: () => query.refetch(),
  };
}

/**
 * Hook for contact conflicts
 */
export function useContactConflicts() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: contactSyncQueryKeys.conflicts(),
    queryFn: () => getConflictsFn(),
    staleTime: 60 * 1000,
  });

  const resolveMutation = useMutation({
    mutationFn: ({
      contactId,
      resolution,
      mergedData,
    }: {
      contactId: string;
      resolution: ContactConflictResolution;
      mergedData?: Partial<SyncedContact>;
    }) => resolveConflictFn({ data: { contactId, resolution, mergedData } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contactSyncQueryKeys.all });
    },
  });

  return {
    conflicts: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    resolveConflict: (
      contactId: string,
      resolution: ContactConflictResolution,
      mergedData?: Partial<SyncedContact>
    ) => resolveMutation.mutateAsync({ contactId, resolution, mergedData }),
    isResolving: resolveMutation.isPending,
    refresh: () => query.refetch(),
  };
}
