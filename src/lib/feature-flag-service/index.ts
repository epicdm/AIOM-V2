/**
 * Feature Flag Service
 *
 * A comprehensive feature flag service for gradual rollout and A/B testing
 * with user targeting and real-time toggle updates.
 *
 * Features:
 * - Gradual rollout with percentage-based targeting
 * - User and role-based targeting
 * - Caching for performance
 * - Real-time updates via Server-Sent Events (SSE)
 * - Event-driven architecture for flag changes
 * - A/B testing support
 *
 * @example
 * ```typescript
 * import { getFeatureFlagService } from "~/lib/feature-flag-service";
 *
 * const service = getFeatureFlagService();
 *
 * // Check if a feature is enabled
 * const isEnabled = await service.isEnabled("new_dashboard", {
 *   userId: "user-123",
 *   userRole: "admin",
 * });
 *
 * // Subscribe to flag changes
 * const unsubscribe = service.onFlag("new_dashboard", (event) => {
 *   console.log("Flag changed:", event);
 * });
 * ```
 */

// =============================================================================
// Main Service Export
// =============================================================================

export {
  FeatureFlagService,
  getFeatureFlagService,
  resetFeatureFlagService,
} from "./service";

// =============================================================================
// Cache Export
// =============================================================================

export {
  FeatureFlagCache,
  getFeatureFlagCache,
  resetFeatureFlagCache,
  buildCacheKey,
} from "./cache";

// =============================================================================
// Event Emitter Export
// =============================================================================

export {
  FeatureFlagEventEmitter,
  getFeatureFlagEventEmitter,
  resetFeatureFlagEventEmitter,
} from "./event-emitter";

// =============================================================================
// Type Exports
// =============================================================================

export type {
  // Configuration
  FeatureFlagServiceConfig,
  // Cache
  CachedFlagEvaluation,
  CacheKeyBuilder,
  CacheStats,
  // Events
  FeatureFlagEventType,
  FeatureFlagEvent,
  FeatureFlagEventListener,
  // Evaluation
  FlagEvaluationContext,
  FlagEvaluationResult,
  FlagEvaluationReason,
  BatchEvaluationResult,
  // Service State
  ServiceHealthStatus,
  // SSE
  SSEClient,
  SSEConnectionOptions,
} from "./types";

export { DEFAULT_SERVICE_CONFIG } from "./types";
