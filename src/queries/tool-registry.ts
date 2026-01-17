/**
 * Tool Registry Query Options
 * TanStack Query options for tool registry data fetching
 */

import { queryOptions } from "@tanstack/react-query";
import {
  getToolsFn,
  getToolByIdFn,
  getClaudeToolsFn,
  getToolCategoriesFn,
  searchToolsFn,
  getRegistryStatsFn,
} from "~/fn/tool-registry";
import type { ToolCategory } from "~/lib/tool-registry";

/**
 * Query options for getting all tools
 */
export const toolsQueryOptions = (options?: {
  category?: ToolCategory;
  enabledOnly?: boolean;
  tags?: string[];
}) =>
  queryOptions({
    queryKey: ["tools", "list", options] as const,
    queryFn: () => getToolsFn({ data: options }),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

/**
 * Query options for getting a single tool by ID
 */
export const toolByIdQueryOptions = (toolId: string) =>
  queryOptions({
    queryKey: ["tools", "detail", toolId] as const,
    queryFn: () => getToolByIdFn({ data: { toolId } }),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!toolId,
  });

/**
 * Query options for getting Claude-compatible tools
 */
export const claudeToolsQueryOptions = (options?: {
  category?: ToolCategory;
  tags?: string[];
}) =>
  queryOptions({
    queryKey: ["tools", "claude", options] as const,
    queryFn: () => getClaudeToolsFn({ data: options }),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

/**
 * Query options for getting tool categories
 */
export const toolCategoriesQueryOptions = () =>
  queryOptions({
    queryKey: ["tools", "categories"] as const,
    queryFn: () => getToolCategoriesFn(),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

/**
 * Query options for searching tools
 */
export const searchToolsQueryOptions = (query: string) =>
  queryOptions({
    queryKey: ["tools", "search", query] as const,
    queryFn: () => searchToolsFn({ data: { query } }),
    staleTime: 1000 * 60 * 2, // 2 minutes
    enabled: query.length >= 1,
  });

/**
 * Query options for registry statistics (admin only)
 */
export const registryStatsQueryOptions = () =>
  queryOptions({
    queryKey: ["tools", "stats"] as const,
    queryFn: () => getRegistryStatsFn(),
    staleTime: 1000 * 60 * 1, // 1 minute
  });
