/**
 * React Hooks for Smart Search
 *
 * Provides React hooks for the AI-powered unified search feature
 * using TanStack Query.
 */

import { useState, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebouncedValue } from "./useDebouncedValue";
import {
  smartSearchQueryOptions,
  quickSearchQueryOptions,
  searchByTypeQueryOptions,
  searchStatsQueryOptions,
  searchSuggestionsQueryOptions,
  type SmartSearchQueryFilters,
} from "~/queries/smart-search";
import type { SearchResultType, SearchResult } from "~/data-access/smart-search";

// =============================================================================
// Types
// =============================================================================

export interface UseSmartSearchOptions {
  /** Initial search query */
  initialQuery?: string;
  /** Default filters to apply */
  defaultFilters?: SmartSearchQueryFilters;
  /** Debounce delay in milliseconds */
  debounceMs?: number;
  /** Enable/disable the search */
  enabled?: boolean;
}

export interface UseQuickSearchOptions {
  /** Types to search */
  types?: SearchResultType[];
  /** Debounce delay in milliseconds */
  debounceMs?: number;
  /** Minimum characters before searching */
  minLength?: number;
}

// =============================================================================
// Main Smart Search Hook
// =============================================================================

/**
 * Hook for performing full smart search with debouncing
 */
export function useSmartSearch(options: UseSmartSearchOptions = {}) {
  const {
    initialQuery = "",
    defaultFilters,
    debounceMs = 300,
    enabled = true,
  } = options;

  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilters] = useState<SmartSearchQueryFilters | undefined>(
    defaultFilters
  );
  const debouncedQuery = useDebouncedValue(query, debounceMs);

  const {
    data: searchResult,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    ...smartSearchQueryOptions(debouncedQuery, filters),
    enabled: enabled && debouncedQuery.length > 0,
  });

  const results = useMemo(
    () => searchResult?.data?.results || [],
    [searchResult]
  );

  const resultsByType = useMemo(
    () =>
      searchResult?.data?.resultsByType || {
        tasks: [],
        contacts: [],
        messages: [],
        expenses: [],
        documents: [],
        users: [],
      },
    [searchResult]
  );

  const clearSearch = useCallback(() => {
    setQuery("");
  }, []);

  const updateFilters = useCallback((newFilters: SmartSearchQueryFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, [defaultFilters]);

  return {
    // State
    query,
    debouncedQuery,
    filters,

    // Results
    results,
    resultsByType,
    totalResults: searchResult?.data?.totalResults || 0,
    searchTime: searchResult?.data?.searchTime || 0,
    suggestions: searchResult?.data?.suggestions || [],

    // Status
    isLoading,
    isFetching,
    isSearching: isFetching && debouncedQuery.length > 0,
    error,
    hasResults: results.length > 0,

    // Actions
    setQuery,
    setFilters,
    updateFilters,
    clearSearch,
    clearFilters,
    refetch,
  };
}

// =============================================================================
// Quick Search Hook (for autocomplete/instant search)
// =============================================================================

/**
 * Hook for quick search with autocomplete functionality
 */
export function useQuickSearch(options: UseQuickSearchOptions = {}) {
  const { types, debounceMs = 200, minLength = 2 } = options;

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, debounceMs);

  const {
    data: searchResult,
    isLoading,
    isFetching,
    error,
  } = useQuery({
    ...quickSearchQueryOptions(debouncedQuery, types),
    enabled: debouncedQuery.length >= minLength,
  });

  const results = useMemo(
    () => searchResult?.data?.results || [],
    [searchResult]
  );

  const clearSearch = useCallback(() => {
    setQuery("");
  }, []);

  return {
    query,
    setQuery,
    results,
    totalResults: searchResult?.data?.totalResults || 0,
    searchTime: searchResult?.data?.searchTime || 0,
    isLoading,
    isFetching,
    isSearching: isFetching && debouncedQuery.length >= minLength,
    error,
    hasResults: results.length > 0,
    clearSearch,
  };
}

// =============================================================================
// Search by Type Hook
// =============================================================================

/**
 * Hook for searching a specific result type
 */
export function useSearchByType(
  type: SearchResultType,
  initialQuery: string = "",
  limit?: number
) {
  const [query, setQuery] = useState(initialQuery);
  const debouncedQuery = useDebouncedValue(query, 300);

  const {
    data: searchResult,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    ...searchByTypeQueryOptions(debouncedQuery, type, limit),
    enabled: debouncedQuery.length > 0,
  });

  const results = useMemo(
    () => searchResult?.data?.results || [],
    [searchResult]
  );

  return {
    query,
    setQuery,
    type,
    results,
    totalResults: searchResult?.data?.totalResults || 0,
    searchTime: searchResult?.data?.searchTime || 0,
    isLoading,
    isFetching,
    error,
    hasResults: results.length > 0,
    refetch,
  };
}

// =============================================================================
// Search Statistics Hook
// =============================================================================

/**
 * Hook for getting search statistics
 */
export function useSearchStats(enabled: boolean = true) {
  const { data: statsResult, isLoading, error } = useQuery({
    ...searchStatsQueryOptions(),
    enabled,
  });

  return {
    stats: statsResult?.data || null,
    isLoading,
    error,
  };
}

// =============================================================================
// Search Suggestions Hook (Autocomplete)
// =============================================================================

/**
 * Hook for getting search suggestions as user types
 */
export function useSearchSuggestions(minLength: number = 2) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 150);

  const {
    data: suggestionsResult,
    isLoading,
    isFetching,
    error,
  } = useQuery({
    ...searchSuggestionsQueryOptions(debouncedQuery),
    enabled: debouncedQuery.length >= minLength,
  });

  const suggestions = useMemo(
    () => suggestionsResult?.data?.suggestions || [],
    [suggestionsResult]
  );

  const quickResults = useMemo(
    () => suggestionsResult?.data?.quickResults || [],
    [suggestionsResult]
  );

  return {
    query,
    setQuery,
    suggestions,
    quickResults,
    isLoading,
    isFetching,
    error,
    hasSuggestions: suggestions.length > 0,
  };
}

// =============================================================================
// Invalidation Hook
// =============================================================================

/**
 * Hook for invalidating search queries
 */
export function useInvalidateSearchQueries() {
  const queryClient = useQueryClient();

  return {
    /**
     * Invalidate all search queries
     */
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: ["smart-search"] });
    },

    /**
     * Invalidate full search queries
     */
    invalidateFullSearch: () => {
      queryClient.invalidateQueries({ queryKey: ["smart-search", "full"] });
    },

    /**
     * Invalidate quick search queries
     */
    invalidateQuickSearch: () => {
      queryClient.invalidateQueries({ queryKey: ["smart-search", "quick"] });
    },

    /**
     * Invalidate search by type queries
     */
    invalidateTypeSearch: (type?: SearchResultType) => {
      if (type) {
        queryClient.invalidateQueries({
          queryKey: ["smart-search", "type", type],
        });
      } else {
        queryClient.invalidateQueries({ queryKey: ["smart-search", "type"] });
      }
    },

    /**
     * Invalidate search stats
     */
    invalidateStats: () => {
      queryClient.invalidateQueries({ queryKey: ["smart-search", "stats"] });
    },

    /**
     * Invalidate suggestions
     */
    invalidateSuggestions: () => {
      queryClient.invalidateQueries({
        queryKey: ["smart-search", "suggestions"],
      });
    },
  };
}
