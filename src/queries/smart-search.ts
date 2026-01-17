/**
 * TanStack Query Options for Smart Search
 *
 * Provides query configurations for the AI-powered unified search
 * with caching and refetch strategies.
 */

import { queryOptions } from "@tanstack/react-query";
import {
  smartSearchFn,
  quickSearchFn,
  searchByTypeFn,
  getSearchStatsFn,
  getSearchSuggestionsFn,
} from "~/fn/smart-search";
import type { SearchResultType } from "~/data-access/smart-search";

// =============================================================================
// Types
// =============================================================================

export interface SmartSearchQueryFilters {
  types?: SearchResultType[];
  limitPerType?: number;
  limit?: number;
  minRelevance?: number;
  dateFrom?: Date;
  dateTo?: Date;
  userId?: string;
}

// =============================================================================
// Query Options
// =============================================================================

/**
 * Query options for performing a full smart search
 */
export const smartSearchQueryOptions = (
  query: string,
  filters?: SmartSearchQueryFilters
) =>
  queryOptions({
    queryKey: ["smart-search", "full", query, filters],
    queryFn: () => smartSearchFn({ data: { query, filters } }),
    enabled: query.length > 0,
    staleTime: 30 * 1000, // 30 seconds - search results can change
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });

/**
 * Query options for quick search (autocomplete/instant search)
 */
export const quickSearchQueryOptions = (
  query: string,
  types?: SearchResultType[]
) =>
  queryOptions({
    queryKey: ["smart-search", "quick", query, types],
    queryFn: () => quickSearchFn({ data: { query, types } }),
    enabled: query.length >= 2, // Only search with at least 2 characters
    staleTime: 15 * 1000, // 15 seconds
    gcTime: 2 * 60 * 1000, // Keep in cache for 2 minutes
  });

/**
 * Query options for searching a specific type
 */
export const searchByTypeQueryOptions = (
  query: string,
  type: SearchResultType,
  limit?: number
) =>
  queryOptions({
    queryKey: ["smart-search", "type", type, query, limit],
    queryFn: () => searchByTypeFn({ data: { query, type, limit } }),
    enabled: query.length > 0,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

/**
 * Query options for search statistics
 */
export const searchStatsQueryOptions = () =>
  queryOptions({
    queryKey: ["smart-search", "stats"],
    queryFn: () => getSearchStatsFn(),
    staleTime: 5 * 60 * 1000, // 5 minutes - stats don't change frequently
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    refetchInterval: 10 * 60 * 1000, // Auto-refresh every 10 minutes
  });

/**
 * Query options for search suggestions (autocomplete)
 */
export const searchSuggestionsQueryOptions = (query: string) =>
  queryOptions({
    queryKey: ["smart-search", "suggestions", query],
    queryFn: () => getSearchSuggestionsFn({ data: { query } }),
    enabled: query.length >= 2,
    staleTime: 10 * 1000, // 10 seconds
    gcTime: 60 * 1000, // Keep in cache for 1 minute
  });
