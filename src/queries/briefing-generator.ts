/**
 * Briefing Generator React Query Options
 *
 * TanStack Query configuration for briefing generation and retrieval.
 */

import { queryOptions } from "@tanstack/react-query";
import {
  getOrGenerateBriefingFn,
  getActiveBriefingFn,
  getBriefingStatsFn,
  getBriefingByIdFn,
} from "~/fn/briefing-generator";

/**
 * Query options for getting or generating today's briefing
 * This is the main query to use when displaying the briefing
 */
export const briefingQueryOptions = () =>
  queryOptions({
    queryKey: ["briefing", "today"],
    queryFn: () => getOrGenerateBriefingFn(),
    staleTime: 1000 * 60 * 5, // Consider stale after 5 minutes
    gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
  });

/**
 * Query options for getting active briefing without generating new one
 */
export const activeBriefingQueryOptions = () =>
  queryOptions({
    queryKey: ["briefing", "active"],
    queryFn: () => getActiveBriefingFn(),
    staleTime: 1000 * 60 * 5,
  });

/**
 * Query options for briefing statistics (for badges, indicators)
 */
export const briefingStatsQueryOptions = () =>
  queryOptions({
    queryKey: ["briefing", "stats"],
    queryFn: () => getBriefingStatsFn(),
    staleTime: 1000 * 60 * 2, // Refresh more frequently
    refetchInterval: 1000 * 60 * 5, // Auto-refetch every 5 minutes
  });

/**
 * Query options for a specific briefing by ID
 */
export const briefingByIdQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["briefing", "detail", id],
    queryFn: () => getBriefingByIdFn({ data: { id } }),
    enabled: !!id,
  });
