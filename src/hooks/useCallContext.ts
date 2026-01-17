/**
 * Call Context React Hooks
 * Custom hooks for fetching customer context during incoming/outgoing calls
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  callContextQueryOptions,
  customerInfoQueryOptions,
  recentInteractionsQueryOptions,
  openTicketsQueryOptions,
  callHistoryQueryOptions,
  searchCustomersQueryOptions,
} from "~/queries/call-context";
import type {
  CallContext,
  CustomerInfo,
  RecentInteraction,
  OpenTicket,
  SuggestedTalkingPoint,
  CallContextFilters,
} from "~/data-access/call-context";
import type { CallRecord } from "~/db/schema";

// ============================================================================
// Types
// ============================================================================

export interface UseCallContextOptions {
  filters?: CallContextFilters;
  autoRefresh?: boolean;
  refreshInterval?: number;
  onContextLoaded?: (context: CallContext) => void;
  onError?: (error: string) => void;
}

export interface UseCallContextReturn {
  // Context data
  context: CallContext | null;
  customer: CustomerInfo | null;
  recentInteractions: RecentInteraction[];
  openTickets: OpenTicket[];
  suggestedTalkingPoints: SuggestedTalkingPoint[];
  callHistory: {
    totalCalls: number;
    recentCalls: CallRecord[];
    lastCallDate: Date | null;
  } | null;

  // State
  isLoading: boolean;
  isRefetching: boolean;
  error: string | null;
  fetchedAt: Date | null;

  // Actions
  refresh: () => Promise<void>;
  clearContext: () => void;
}

export interface UseCustomerSearchOptions {
  debounceMs?: number;
  minQueryLength?: number;
  maxResults?: number;
}

export interface UseCustomerSearchReturn {
  customers: CustomerInfo[];
  isSearching: boolean;
  error: string | null;
  search: (query: string) => void;
  clear: () => void;
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Hook to get full call context for a customer
 * This is the main hook for fetching all context during a call
 */
export function useCallContext(
  phoneOrUserId: string | undefined,
  options: UseCallContextOptions = {}
): UseCallContextReturn {
  const queryClient = useQueryClient();
  const {
    filters,
    autoRefresh = false,
    refreshInterval = 30000, // 30 seconds
    onContextLoaded,
    onError,
  } = options;

  const {
    data: result,
    isLoading,
    isFetching: isRefetching,
    refetch,
    error: queryError,
  } = useQuery({
    ...callContextQueryOptions(phoneOrUserId || "", filters),
    enabled: !!phoneOrUserId,
    refetchInterval: autoRefresh ? refreshInterval : false,
  });

  // Extract context data
  const context = useMemo(() => {
    if (result?.success && result.context) {
      return result.context;
    }
    return null;
  }, [result]);

  // Handle callbacks
  useEffect(() => {
    if (context && onContextLoaded) {
      onContextLoaded(context);
    }
  }, [context, onContextLoaded]);

  useEffect(() => {
    if (result && !result.success && result.error && onError) {
      onError(result.error);
    }
  }, [result, onError]);

  // Derived data
  const customer = context?.customer || null;
  const recentInteractions = context?.recentInteractions || [];
  const openTickets = context?.openTickets || [];
  const suggestedTalkingPoints = context?.suggestedTalkingPoints || [];
  const callHistory = context?.callHistory || null;
  const fetchedAt = context?.fetchedAt || null;

  // Error handling
  const error = useMemo(() => {
    if (queryError) {
      return queryError instanceof Error ? queryError.message : "Failed to fetch context";
    }
    if (result && !result.success) {
      return result.error || "Failed to fetch context";
    }
    return null;
  }, [queryError, result]);

  // Actions
  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const clearContext = useCallback(() => {
    if (phoneOrUserId) {
      queryClient.removeQueries({
        queryKey: ["call-context", "full", phoneOrUserId],
      });
    }
  }, [queryClient, phoneOrUserId]);

  return {
    context,
    customer,
    recentInteractions,
    openTickets,
    suggestedTalkingPoints,
    callHistory,
    isLoading,
    isRefetching,
    error,
    fetchedAt,
    refresh,
    clearContext,
  };
}

/**
 * Hook to get customer info only
 */
export function useCustomerInfo(phoneOrUserId: string | undefined) {
  const { data, isLoading, error: queryError, refetch } = useQuery({
    ...customerInfoQueryOptions(phoneOrUserId || ""),
    enabled: !!phoneOrUserId,
  });

  const customer = useMemo(() => {
    if (data?.success) {
      return data.customer;
    }
    return null;
  }, [data]);

  const error = useMemo(() => {
    if (queryError) {
      return queryError instanceof Error ? queryError.message : "Failed to fetch customer";
    }
    if (data && !data.success) {
      return data.error || "Failed to fetch customer";
    }
    return null;
  }, [queryError, data]);

  return {
    customer,
    isLoading,
    error,
    refresh: refetch,
  };
}

/**
 * Hook to get recent interactions for a customer
 */
export function useRecentInteractions(
  userId: string | undefined,
  options?: { limit?: number; daysBack?: number }
) {
  const { data, isLoading, error: queryError, refetch } = useQuery({
    ...recentInteractionsQueryOptions(userId || "", options),
    enabled: !!userId,
  });

  const interactions = useMemo(() => {
    if (data?.success) {
      return data.interactions;
    }
    return [];
  }, [data]);

  const error = useMemo(() => {
    if (queryError) {
      return queryError instanceof Error ? queryError.message : "Failed to fetch interactions";
    }
    if (data && !data.success) {
      return data.error || "Failed to fetch interactions";
    }
    return null;
  }, [queryError, data]);

  return {
    interactions,
    isLoading,
    error,
    refresh: refetch,
  };
}

/**
 * Hook to get open tickets for a customer
 */
export function useOpenTickets(
  userId: string | undefined,
  options?: { limit?: number; includeResolved?: boolean }
) {
  const { data, isLoading, error: queryError, refetch } = useQuery({
    ...openTicketsQueryOptions(userId || "", options),
    enabled: !!userId,
  });

  const tickets = useMemo(() => {
    if (data?.success) {
      return data.tickets;
    }
    return [];
  }, [data]);

  const error = useMemo(() => {
    if (queryError) {
      return queryError instanceof Error ? queryError.message : "Failed to fetch tickets";
    }
    if (data && !data.success) {
      return data.error || "Failed to fetch tickets";
    }
    return null;
  }, [queryError, data]);

  return {
    tickets,
    isLoading,
    error,
    refresh: refetch,
  };
}

/**
 * Hook to get call history for a customer
 */
export function useCallHistory(
  userId: string | undefined,
  options?: { limit?: number }
) {
  const { data, isLoading, error: queryError, refetch } = useQuery({
    ...callHistoryQueryOptions(userId || "", options),
    enabled: !!userId,
  });

  const callHistory = useMemo(() => {
    if (data?.success) {
      return data.callHistory;
    }
    return null;
  }, [data]);

  const error = useMemo(() => {
    if (queryError) {
      return queryError instanceof Error ? queryError.message : "Failed to fetch call history";
    }
    if (data && !data.success) {
      return data.error || "Failed to fetch call history";
    }
    return null;
  }, [queryError, data]);

  return {
    callHistory,
    totalCalls: callHistory?.totalCalls || 0,
    recentCalls: callHistory?.recentCalls || [],
    lastCallDate: callHistory?.lastCallDate || null,
    isLoading,
    error,
    refresh: refetch,
  };
}

/**
 * Hook for searching customers with debouncing
 */
export function useCustomerSearch(
  options: UseCustomerSearchOptions = {}
): UseCustomerSearchReturn {
  const {
    debounceMs = 300,
    minQueryLength = 2,
    maxResults = 10,
  } = options;

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce the search query
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchQuery.length >= minQueryLength) {
        setDebouncedQuery(searchQuery);
      } else {
        setDebouncedQuery("");
      }
    }, debounceMs);

    return () => clearTimeout(handler);
  }, [searchQuery, debounceMs, minQueryLength]);

  const { data, isLoading, error: queryError } = useQuery({
    ...searchCustomersQueryOptions(debouncedQuery, maxResults),
    enabled: debouncedQuery.length >= minQueryLength,
  });

  const customers = useMemo(() => {
    if (data?.success) {
      return data.customers;
    }
    return [];
  }, [data]);

  const error = useMemo(() => {
    if (queryError) {
      return queryError instanceof Error ? queryError.message : "Search failed";
    }
    if (data && !data.success) {
      return data.error || "Search failed";
    }
    return null;
  }, [queryError, data]);

  const search = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const clear = useCallback(() => {
    setSearchQuery("");
    setDebouncedQuery("");
  }, []);

  return {
    customers,
    isSearching: isLoading,
    error,
    search,
    clear,
  };
}

// ============================================================================
// Composite Hooks
// ============================================================================

/**
 * Hook for active call screen - combines context with real-time updates
 */
export function useActiveCallContext(
  phoneOrUserId: string | undefined,
  options: {
    enableAutoRefresh?: boolean;
    refreshInterval?: number;
  } = {}
) {
  const {
    enableAutoRefresh = true,
    refreshInterval = 30000,
  } = options;

  const contextHook = useCallContext(phoneOrUserId, {
    autoRefresh: enableAutoRefresh,
    refreshInterval,
  });

  const [callStartTime, setCallStartTime] = useState<Date | null>(null);
  const [callDuration, setCallDuration] = useState(0);

  // Track call duration
  useEffect(() => {
    if (!phoneOrUserId) {
      setCallStartTime(null);
      setCallDuration(0);
      return;
    }

    setCallStartTime(new Date());

    const interval = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [phoneOrUserId]);

  // Format duration as mm:ss
  const formattedDuration = useMemo(() => {
    const minutes = Math.floor(callDuration / 60);
    const seconds = callDuration % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }, [callDuration]);

  return {
    ...contextHook,
    callStartTime,
    callDuration,
    formattedDuration,
    isActiveCall: !!phoneOrUserId,
  };
}

/**
 * Hook for call preparation - prefetches context before call starts
 */
export function usePrepareCallContext() {
  const queryClient = useQueryClient();
  const [isPreparing, setIsPreparing] = useState(false);

  const prepareContext = useCallback(
    async (phoneOrUserId: string, filters?: CallContextFilters) => {
      setIsPreparing(true);
      try {
        // Prefetch the context
        await queryClient.prefetchQuery(
          callContextQueryOptions(phoneOrUserId, filters)
        );
      } finally {
        setIsPreparing(false);
      }
    },
    [queryClient]
  );

  const invalidateContext = useCallback(
    (phoneOrUserId: string) => {
      queryClient.invalidateQueries({
        queryKey: ["call-context", "full", phoneOrUserId],
      });
    },
    [queryClient]
  );

  return {
    prepareContext,
    invalidateContext,
    isPreparing,
  };
}
