/**
 * Feature Flag Query Options
 *
 * TanStack Query options for feature flag data fetching with:
 * - Optimized caching strategies
 * - Automatic refetching
 * - Stale time configuration
 */

import { queryOptions } from "@tanstack/react-query";
import {
  checkFeatureFn,
  checkMultipleFeaturesFn,
  getFeatureFlagsFn,
  getFeatureFlagByIdFn,
  getFeatureFlagByNameFn,
  getFeatureFlagUserTargetsFn,
  getFeatureFlagRoleTargetsFn,
} from "~/fn/feature-flags";
import type { RolloutStrategy } from "~/db/schema";

// =============================================================================
// Query Key Factory
// =============================================================================

export const featureFlagKeys = {
  all: ["feature-flags"] as const,
  lists: () => [...featureFlagKeys.all, "list"] as const,
  list: (filters?: FeatureFlagsListParams) =>
    [...featureFlagKeys.lists(), filters] as const,
  details: () => [...featureFlagKeys.all, "detail"] as const,
  detail: (id: string) => [...featureFlagKeys.details(), id] as const,
  byName: (name: string) => [...featureFlagKeys.all, "name", name] as const,
  evaluation: () => [...featureFlagKeys.all, "evaluation"] as const,
  evaluate: (flagName: string) =>
    [...featureFlagKeys.evaluation(), flagName] as const,
  evaluateMultiple: (flagNames: string[]) =>
    [...featureFlagKeys.evaluation(), "multiple", ...flagNames] as const,
  targets: () => [...featureFlagKeys.all, "targets"] as const,
  userTargets: (flagId: string) =>
    [...featureFlagKeys.targets(), "user", flagId] as const,
  roleTargets: (flagId: string) =>
    [...featureFlagKeys.targets(), "role", flagId] as const,
};

// =============================================================================
// Query Parameter Types
// =============================================================================

export interface FeatureFlagsListParams {
  enabled?: boolean;
  rolloutStrategy?: RolloutStrategy;
  limit?: number;
  offset?: number;
}

// =============================================================================
// User Query Options (Authenticated Users)
// =============================================================================

/**
 * Query options for checking a single feature flag
 * Uses aggressive caching since flag values don't change often
 */
export function checkFeatureFlagQueryOptions(flagName: string) {
  return queryOptions({
    queryKey: featureFlagKeys.evaluate(flagName),
    queryFn: () => checkFeatureFn({ data: { flagName } }),
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes
  });
}

/**
 * Query options for checking multiple feature flags at once
 * More efficient than multiple individual checks
 */
export function checkMultipleFlagsQueryOptions(flagNames: string[]) {
  return queryOptions({
    queryKey: featureFlagKeys.evaluateMultiple(flagNames),
    queryFn: () => checkMultipleFeaturesFn({ data: { flagNames } }),
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes
    enabled: flagNames.length > 0,
  });
}

// =============================================================================
// Admin Query Options
// =============================================================================

/**
 * Query options for listing all feature flags (admin only)
 */
export function featureFlagsListQueryOptions(params?: FeatureFlagsListParams) {
  return queryOptions({
    queryKey: featureFlagKeys.list(params),
    queryFn: () => getFeatureFlagsFn({ data: params }),
    staleTime: 10000, // 10 seconds for admin views
    gcTime: 60000, // 1 minute
  });
}

/**
 * Query options for getting a feature flag by ID (admin only)
 */
export function featureFlagDetailQueryOptions(id: string) {
  return queryOptions({
    queryKey: featureFlagKeys.detail(id),
    queryFn: () => getFeatureFlagByIdFn({ data: { id } }),
    staleTime: 10000,
    gcTime: 60000,
    enabled: !!id,
  });
}

/**
 * Query options for getting a feature flag by name (admin only)
 */
export function featureFlagByNameQueryOptions(flagName: string) {
  return queryOptions({
    queryKey: featureFlagKeys.byName(flagName),
    queryFn: () => getFeatureFlagByNameFn({ data: { flagName } }),
    staleTime: 10000,
    gcTime: 60000,
    enabled: !!flagName,
  });
}

/**
 * Query options for getting user targets of a flag (admin only)
 */
export function featureFlagUserTargetsQueryOptions(featureFlagId: string) {
  return queryOptions({
    queryKey: featureFlagKeys.userTargets(featureFlagId),
    queryFn: () => getFeatureFlagUserTargetsFn({ data: { featureFlagId } }),
    staleTime: 10000,
    gcTime: 60000,
    enabled: !!featureFlagId,
  });
}

/**
 * Query options for getting role targets of a flag (admin only)
 */
export function featureFlagRoleTargetsQueryOptions(featureFlagId: string) {
  return queryOptions({
    queryKey: featureFlagKeys.roleTargets(featureFlagId),
    queryFn: () => getFeatureFlagRoleTargetsFn({ data: { featureFlagId } }),
    staleTime: 10000,
    gcTime: 60000,
    enabled: !!featureFlagId,
  });
}
