/**
 * Feature Flag Service Types
 *
 * Type definitions for the feature flag service including:
 * - Configuration options
 * - Event types for real-time updates
 * - Cache configuration
 * - Service state types
 */

import type { FeatureFlag, UserRole } from "~/db/schema";

// =============================================================================
// Service Configuration Types
// =============================================================================

/**
 * Configuration for the Feature Flag Service
 */
export interface FeatureFlagServiceConfig {
  /** Enable caching of flag evaluations */
  enableCache: boolean;
  /** Time-to-live for cached evaluations in milliseconds */
  cacheTTL: number;
  /** Maximum number of entries in the cache */
  maxCacheSize: number;
  /** Enable real-time updates via SSE */
  enableRealTimeUpdates: boolean;
  /** Interval for polling flag updates in milliseconds (fallback when SSE unavailable) */
  pollInterval: number;
  /** Enable debug logging */
  debug: boolean;
}

/**
 * Default service configuration
 */
export const DEFAULT_SERVICE_CONFIG: FeatureFlagServiceConfig = {
  enableCache: true,
  cacheTTL: 60000, // 1 minute
  maxCacheSize: 1000,
  enableRealTimeUpdates: true,
  pollInterval: 30000, // 30 seconds
  debug: false,
};

// =============================================================================
// Cache Types
// =============================================================================

/**
 * Cached flag evaluation result
 */
export interface CachedFlagEvaluation {
  flagName: string;
  enabled: boolean;
  timestamp: number;
  expiresAt: number;
  userId?: string;
  userRole?: UserRole | null;
}

/**
 * Cache key builder type
 */
export type CacheKeyBuilder = (flagName: string, userId?: string, userRole?: UserRole | null) => string;

// =============================================================================
// Event Types for Real-Time Updates
// =============================================================================

/**
 * Feature flag change event types
 */
export type FeatureFlagEventType =
  | "flag.created"
  | "flag.updated"
  | "flag.deleted"
  | "flag.toggled"
  | "flag.rollout_changed"
  | "flag.user_target_added"
  | "flag.user_target_removed"
  | "flag.role_target_added"
  | "flag.role_target_removed";

/**
 * Feature flag change event
 */
export interface FeatureFlagEvent {
  type: FeatureFlagEventType;
  flagId: string;
  flagName: string;
  timestamp: number;
  payload?: {
    previousState?: Partial<FeatureFlag>;
    newState?: Partial<FeatureFlag>;
    userId?: string;
    role?: UserRole;
    enabled?: boolean;
  };
}

/**
 * Event listener callback type
 */
export type FeatureFlagEventListener = (event: FeatureFlagEvent) => void;

// =============================================================================
// Evaluation Types
// =============================================================================

/**
 * Flag evaluation context
 */
export interface FlagEvaluationContext {
  userId?: string;
  userRole?: UserRole | null;
  attributes?: Record<string, unknown>;
}

/**
 * Flag evaluation result
 */
export interface FlagEvaluationResult {
  flagName: string;
  enabled: boolean;
  reason: FlagEvaluationReason;
  fromCache: boolean;
}

/**
 * Reason for flag evaluation result
 */
export type FlagEvaluationReason =
  | "flag_not_found"
  | "flag_disabled"
  | "user_targeted"
  | "role_targeted"
  | "percentage_rollout"
  | "strategy_all"
  | "strategy_none"
  | "strategy_targeted"
  | "default";

/**
 * Batch evaluation result
 */
export interface BatchEvaluationResult {
  flags: Record<string, boolean>;
  evaluations: FlagEvaluationResult[];
  fromCache: number;
  freshEvaluations: number;
}

// =============================================================================
// Service State Types
// =============================================================================

/**
 * Service health status
 */
export interface ServiceHealthStatus {
  healthy: boolean;
  cacheSize: number;
  cacheHitRate: number;
  lastUpdate: number | null;
  connectedClients: number;
  uptime: number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
  evictions: number;
}

// =============================================================================
// SSE Types
// =============================================================================

/**
 * SSE client connection
 */
export interface SSEClient {
  id: string;
  userId: string;
  userRole?: UserRole | null;
  connectedAt: number;
  lastPing: number;
  send: (event: FeatureFlagEvent) => void;
  close: () => void;
}

/**
 * SSE connection options
 */
export interface SSEConnectionOptions {
  userId: string;
  userRole?: UserRole | null;
  flagNames?: string[];
}
