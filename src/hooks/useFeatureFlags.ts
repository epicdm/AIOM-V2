/**
 * Feature Flag Hooks
 *
 * React hooks for feature flag evaluation with:
 * - TanStack Query integration for caching
 * - Real-time updates via SSE
 * - Batch evaluation support
 * - Admin management hooks
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  checkFeatureFlagQueryOptions,
  checkMultipleFlagsQueryOptions,
  featureFlagsListQueryOptions,
  featureFlagDetailQueryOptions,
  featureFlagByNameQueryOptions,
  featureFlagUserTargetsQueryOptions,
  featureFlagRoleTargetsQueryOptions,
  featureFlagKeys,
  type FeatureFlagsListParams,
} from "~/queries/feature-flags";
import {
  createFeatureFlagFn,
  updateFeatureFlagFn,
  deleteFeatureFlagFn,
  toggleFeatureFlagFn,
  updateRolloutPercentageFn,
  addUserTargetFn,
  removeUserTargetFn,
  addRoleTargetFn,
  removeRoleTargetFn,
} from "~/fn/feature-flags";
import type { RolloutStrategy, UserRole } from "~/db/schema";

// =============================================================================
// User Hooks (For Feature Evaluation)
// =============================================================================

/**
 * Check if a single feature flag is enabled
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isEnabled, isLoading } = useFeatureFlag("new_dashboard");
 *
 *   if (isLoading) return <Loading />;
 *   if (!isEnabled) return <OldDashboard />;
 *   return <NewDashboard />;
 * }
 * ```
 */
export function useFeatureFlag(flagName: string, enabled = true) {
  const query = useQuery({
    ...checkFeatureFlagQueryOptions(flagName),
    enabled: enabled && !!flagName,
  });

  return {
    isEnabled: query.data?.enabled ?? false,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Check multiple feature flags at once (more efficient than multiple useFeatureFlag calls)
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { flags, isLoading } = useFeatureFlags(["feature_a", "feature_b", "feature_c"]);
 *
 *   if (isLoading) return <Loading />;
 *
 *   return (
 *     <>
 *       {flags.feature_a && <FeatureA />}
 *       {flags.feature_b && <FeatureB />}
 *       {flags.feature_c && <FeatureC />}
 *     </>
 *   );
 * }
 * ```
 */
export function useFeatureFlags(flagNames: string[], enabled = true) {
  const query = useQuery({
    ...checkMultipleFlagsQueryOptions(flagNames),
    enabled: enabled && flagNames.length > 0,
  });

  return {
    flags: query.data ?? {},
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Hook with real-time updates via Server-Sent Events
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { flags, isConnected } = useFeatureFlagsWithSSE(["feature_a", "feature_b"]);
 *
 *   return (
 *     <>
 *       {!isConnected && <OfflineIndicator />}
 *       {flags.feature_a && <FeatureA />}
 *     </>
 *   );
 * }
 * ```
 */
export function useFeatureFlagsWithSSE(
  flagNames: string[],
  options?: {
    enabled?: boolean;
    onUpdate?: (flagName: string, enabled: boolean) => void;
  }
) {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Get initial flag values
  const { flags, isLoading, isError, error, refetch } = useFeatureFlags(
    flagNames,
    options?.enabled ?? true
  );

  // Connect to SSE for real-time updates
  useEffect(() => {
    if (typeof window === "undefined" || !options?.enabled) return;

    const eventSource = new EventSource("/api/feature-flags/sse");
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type?.startsWith("flag.")) {
          // Invalidate the specific flag query
          queryClient.invalidateQueries({
            queryKey: featureFlagKeys.evaluate(data.flagName),
          });

          // Invalidate the multiple flags query
          queryClient.invalidateQueries({
            queryKey: featureFlagKeys.evaluateMultiple(flagNames),
          });

          // Call the update callback
          if (options?.onUpdate && flagNames.includes(data.flagName)) {
            options.onUpdate(data.flagName, data.payload?.enabled);
          }
        }
      } catch (err) {
        console.error("Error parsing SSE event:", err);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      // Auto-reconnect is handled by EventSource
    };

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    };
  }, [flagNames, options?.enabled, queryClient, options?.onUpdate]);

  return {
    flags,
    isLoading,
    isError,
    error,
    isConnected,
    refetch,
  };
}

/**
 * Convenient hook for A/B testing
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const variant = useABTest("homepage_variant", ["control", "variant_a", "variant_b"]);
 *
 *   switch (variant) {
 *     case "variant_a": return <VariantA />;
 *     case "variant_b": return <VariantB />;
 *     default: return <Control />;
 *   }
 * }
 * ```
 */
export function useABTest<T extends string>(
  testName: string,
  variants: readonly T[],
  defaultVariant?: T
): T {
  const { flags, isLoading } = useFeatureFlags(
    variants.map((v) => `${testName}_${v}`)
  );

  if (isLoading) {
    return defaultVariant ?? variants[0];
  }

  // Find the first enabled variant
  for (const variant of variants) {
    if (flags[`${testName}_${variant}`]) {
      return variant;
    }
  }

  return defaultVariant ?? variants[0];
}

// =============================================================================
// Admin Hooks (For Flag Management)
// =============================================================================

/**
 * Get all feature flags (admin only)
 */
export function useFeatureFlagsList(
  params?: FeatureFlagsListParams,
  enabled = true
) {
  return useQuery({
    ...featureFlagsListQueryOptions(params),
    enabled,
  });
}

/**
 * Get a feature flag by ID with targets (admin only)
 */
export function useFeatureFlagDetail(id: string, enabled = true) {
  return useQuery({
    ...featureFlagDetailQueryOptions(id),
    enabled: enabled && !!id,
  });
}

/**
 * Get a feature flag by name with targets (admin only)
 */
export function useFeatureFlagByName(flagName: string, enabled = true) {
  return useQuery({
    ...featureFlagByNameQueryOptions(flagName),
    enabled: enabled && !!flagName,
  });
}

/**
 * Get user targets for a feature flag (admin only)
 */
export function useFeatureFlagUserTargets(featureFlagId: string, enabled = true) {
  return useQuery({
    ...featureFlagUserTargetsQueryOptions(featureFlagId),
    enabled: enabled && !!featureFlagId,
  });
}

/**
 * Get role targets for a feature flag (admin only)
 */
export function useFeatureFlagRoleTargets(featureFlagId: string, enabled = true) {
  return useQuery({
    ...featureFlagRoleTargetsQueryOptions(featureFlagId),
    enabled: enabled && !!featureFlagId,
  });
}

// =============================================================================
// Admin Mutation Hooks
// =============================================================================

/**
 * Create a new feature flag (admin only)
 */
export function useCreateFeatureFlag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      flagName: string;
      description?: string;
      enabled?: boolean;
      rolloutPercentage?: number;
      rolloutStrategy?: RolloutStrategy;
      metadata?: string;
    }) => createFeatureFlagFn({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: featureFlagKeys.lists() });
    },
  });
}

/**
 * Update a feature flag (admin only)
 */
export function useUpdateFeatureFlag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      id: string;
      description?: string;
      enabled?: boolean;
      rolloutPercentage?: number;
      rolloutStrategy?: RolloutStrategy;
      metadata?: string;
    }) => updateFeatureFlagFn({ data }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: featureFlagKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: featureFlagKeys.detail(data.id),
      });
      queryClient.invalidateQueries({
        queryKey: featureFlagKeys.byName(data.flagName),
      });
      // Invalidate evaluation queries
      queryClient.invalidateQueries({
        queryKey: featureFlagKeys.evaluate(data.flagName),
      });
    },
  });
}

/**
 * Delete a feature flag (admin only)
 */
export function useDeleteFeatureFlag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteFeatureFlagFn({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: featureFlagKeys.lists() });
      queryClient.invalidateQueries({ queryKey: featureFlagKeys.evaluation() });
    },
  });
}

/**
 * Toggle a feature flag on/off (admin only)
 */
export function useToggleFeatureFlag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { id: string; enabled: boolean }) =>
      toggleFeatureFlagFn({ data }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: featureFlagKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: featureFlagKeys.detail(data.id),
      });
      queryClient.invalidateQueries({
        queryKey: featureFlagKeys.evaluate(data.flagName),
      });
    },
  });
}

/**
 * Update rollout percentage (admin only)
 */
export function useUpdateRolloutPercentage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { id: string; rolloutPercentage: number }) =>
      updateRolloutPercentageFn({ data }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: featureFlagKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: featureFlagKeys.detail(data.id),
      });
      queryClient.invalidateQueries({
        queryKey: featureFlagKeys.evaluate(data.flagName),
      });
    },
  });
}

/**
 * Add user target (admin only)
 */
export function useAddUserTarget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      featureFlagId: string;
      userId: string;
      enabled?: boolean;
    }) => addUserTargetFn({ data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: featureFlagKeys.userTargets(variables.featureFlagId),
      });
      queryClient.invalidateQueries({
        queryKey: featureFlagKeys.detail(variables.featureFlagId),
      });
    },
  });
}

/**
 * Remove user target (admin only)
 */
export function useRemoveUserTarget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { featureFlagId: string; userId: string }) =>
      removeUserTargetFn({ data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: featureFlagKeys.userTargets(variables.featureFlagId),
      });
      queryClient.invalidateQueries({
        queryKey: featureFlagKeys.detail(variables.featureFlagId),
      });
    },
  });
}

/**
 * Add role target (admin only)
 */
export function useAddRoleTarget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      featureFlagId: string;
      role: UserRole;
      enabled?: boolean;
    }) => addRoleTargetFn({ data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: featureFlagKeys.roleTargets(variables.featureFlagId),
      });
      queryClient.invalidateQueries({
        queryKey: featureFlagKeys.detail(variables.featureFlagId),
      });
    },
  });
}

/**
 * Remove role target (admin only)
 */
export function useRemoveRoleTarget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { featureFlagId: string; role: UserRole }) =>
      removeRoleTargetFn({ data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: featureFlagKeys.roleTargets(variables.featureFlagId),
      });
      queryClient.invalidateQueries({
        queryKey: featureFlagKeys.detail(variables.featureFlagId),
      });
    },
  });
}

// =============================================================================
// Type Exports
// =============================================================================

export type { FeatureFlagsListParams };
