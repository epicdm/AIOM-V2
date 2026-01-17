/**
 * Server Functions for Smart Search
 *
 * AI-powered unified search across tasks, contacts, messages, expenses, and documents
 * with natural language understanding and relevance ranking.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authenticatedMiddleware } from "./middleware";
import {
  performSmartSearch,
  getSearchStatistics,
  type SmartSearchFilters,
  type SearchResultType,
} from "~/data-access/smart-search";

// =============================================================================
// Zod Schemas
// =============================================================================

const searchResultTypeSchema = z.enum([
  "task",
  "contact",
  "message",
  "expense",
  "document",
  "user",
]);

const smartSearchFiltersSchema = z.object({
  types: z.array(searchResultTypeSchema).optional(),
  limitPerType: z.number().int().positive().max(50).optional(),
  limit: z.number().int().positive().max(100).optional(),
  minRelevance: z.number().int().min(0).max(100).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  userId: z.string().optional(),
}).optional();

const searchQuerySchema = z.object({
  query: z.string().min(1, "Search query is required").max(500, "Query too long"),
  filters: smartSearchFiltersSchema,
});

// =============================================================================
// Server Functions
// =============================================================================

/**
 * Perform a unified smart search across all data types
 */
export const smartSearchFn = createServerFn({
  method: "GET",
})
  .inputValidator(searchQuerySchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { query, filters } = data;

    // Add user context to filters if not already specified
    const searchFilters: SmartSearchFilters = {
      ...filters,
      userId: filters?.userId || context.userId,
    };

    const result = await performSmartSearch(query, searchFilters);

    return {
      success: true,
      data: result,
    };
  });

/**
 * Perform a quick search with minimal filters (for autocomplete/instant search)
 */
export const quickSearchFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      query: z.string().min(1).max(200),
      types: z.array(searchResultTypeSchema).optional(),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    const { query, types } = data;

    const result = await performSmartSearch(query, {
      types,
      limitPerType: 5,
      limit: 20,
      minRelevance: 20,
    });

    return {
      success: true,
      data: {
        query: result.query,
        totalResults: result.totalResults,
        results: result.results,
        searchTime: result.searchTime,
      },
    };
  });

/**
 * Search only in specific type (for targeted searches)
 */
export const searchByTypeFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      query: z.string().min(1).max(500),
      type: searchResultTypeSchema,
      limit: z.number().int().positive().max(50).optional().default(20),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    const { query, type, limit } = data;

    const result = await performSmartSearch(query, {
      types: [type],
      limitPerType: limit,
      limit: limit,
      minRelevance: 10,
    });

    return {
      success: true,
      data: {
        query: result.query,
        type,
        totalResults: result.totalResults,
        results: result.results,
        searchTime: result.searchTime,
      },
    };
  });

/**
 * Get search statistics (counts per type)
 */
export const getSearchStatsFn = createServerFn({
  method: "GET",
})
  .middleware([authenticatedMiddleware])
  .handler(async () => {
    const stats = await getSearchStatistics();

    return {
      success: true,
      data: stats,
    };
  });

/**
 * Get search suggestions based on partial query (for autocomplete)
 */
export const getSearchSuggestionsFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      query: z.string().min(1).max(100),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    const { query } = data;

    // Quick search to generate suggestions
    const result = await performSmartSearch(query, {
      limitPerType: 3,
      limit: 10,
      minRelevance: 30,
    });

    // Generate suggestions from top results
    const suggestions = result.results.slice(0, 5).map(r => ({
      text: r.title,
      type: r.type,
      id: r.id,
    }));

    return {
      success: true,
      data: {
        query,
        suggestions,
        quickResults: result.results.slice(0, 5),
      },
    };
  });
