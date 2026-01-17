/**
 * Claude API Query Options
 * TanStack Query options for Claude API operations
 */

import { queryOptions } from "@tanstack/react-query";
import { getClaudeModelsFn, checkClaudeConfigFn } from "~/fn/claude";

/**
 * Query options for available Claude models
 */
export const claudeModelsQueryOptions = () =>
  queryOptions({
    queryKey: ["claude", "models"],
    queryFn: () => getClaudeModelsFn(),
    staleTime: 1000 * 60 * 60, // 1 hour - models don't change often
  });

/**
 * Query options for Claude configuration status
 */
export const claudeConfigQueryOptions = () =>
  queryOptions({
    queryKey: ["claude", "config"],
    queryFn: () => checkClaudeConfigFn(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
