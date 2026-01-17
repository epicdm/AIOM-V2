/**
 * Feature Flag Service
 *
 * Main service for feature flag evaluation with:
 * - Caching for performance
 * - Real-time event emission
 * - Batch evaluation support
 * - Health monitoring
 */

import type {
  FeatureFlagServiceConfig,
  FlagEvaluationContext,
  FlagEvaluationResult,
  FlagEvaluationReason,
  BatchEvaluationResult,
  ServiceHealthStatus,
  FeatureFlagEvent,
  FeatureFlagEventListener,
} from "./types";
import { DEFAULT_SERVICE_CONFIG } from "./types";
import { FeatureFlagCache, getFeatureFlagCache } from "./cache";
import { FeatureFlagEventEmitter, getFeatureFlagEventEmitter } from "./event-emitter";
import {
  findFeatureFlagByName,
  getFeatureFlagUserTarget,
  getFeatureFlagRoleTarget,
  isFeatureFlagEnabled,
  checkMultipleFeatureFlags,
  createFeatureFlag,
  updateFeatureFlag,
  deleteFeatureFlag,
  addFeatureFlagUserTarget,
  removeFeatureFlagUserTarget,
  addFeatureFlagRoleTarget,
  removeFeatureFlagRoleTarget,
} from "~/data-access/feature-flags";
import type { FeatureFlag, UserRole, CreateFeatureFlagData, UpdateFeatureFlagData } from "~/db/schema";
import type { AuditActorType } from "~/data-access/audit-logging";

// =============================================================================
// Feature Flag Service Class
// =============================================================================

export class FeatureFlagService {
  private config: FeatureFlagServiceConfig;
  private cache: FeatureFlagCache;
  private eventEmitter: FeatureFlagEventEmitter;
  private startTime: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<FeatureFlagServiceConfig> = {}) {
    this.config = { ...DEFAULT_SERVICE_CONFIG, ...config };
    this.cache = getFeatureFlagCache(this.config.maxCacheSize, this.config.cacheTTL);
    this.eventEmitter = getFeatureFlagEventEmitter();
    this.startTime = Date.now();

    // Start periodic cache cleanup
    if (this.config.enableCache) {
      this.startCacheCleanup();
    }
  }

  // ==========================================================================
  // Configuration
  // ==========================================================================

  /**
   * Update service configuration
   */
  updateConfig(config: Partial<FeatureFlagServiceConfig>): void {
    this.config = { ...this.config, ...config };

    if (this.config.debug) {
      console.log("[FeatureFlagService] Config updated:", this.config);
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): FeatureFlagServiceConfig {
    return { ...this.config };
  }

  // ==========================================================================
  // Flag Evaluation
  // ==========================================================================

  /**
   * Check if a feature flag is enabled
   */
  async isEnabled(
    flagName: string,
    context?: FlagEvaluationContext
  ): Promise<boolean> {
    const result = await this.evaluate(flagName, context);
    return result.enabled;
  }

  /**
   * Evaluate a feature flag with full result
   */
  async evaluate(
    flagName: string,
    context?: FlagEvaluationContext
  ): Promise<FlagEvaluationResult> {
    const userId = context?.userId;
    const userRole = context?.userRole;

    // Check cache first
    if (this.config.enableCache) {
      const cached = this.cache.get(flagName, userId, userRole);
      if (cached) {
        if (this.config.debug) {
          console.log(`[FeatureFlagService] Cache hit for ${flagName}`);
        }
        return {
          flagName,
          enabled: cached.enabled,
          reason: "default",
          fromCache: true,
        };
      }
    }

    // Evaluate flag
    const result = await this.evaluateWithReason(flagName, userId, userRole);

    // Cache result
    if (this.config.enableCache) {
      this.cache.set(flagName, result.enabled, userId, userRole);
    }

    if (this.config.debug) {
      console.log(`[FeatureFlagService] Evaluated ${flagName}:`, result);
    }

    return {
      ...result,
      fromCache: false,
    };
  }

  /**
   * Evaluate multiple flags at once
   */
  async evaluateMultiple(
    flagNames: string[],
    context?: FlagEvaluationContext
  ): Promise<BatchEvaluationResult> {
    const results: FlagEvaluationResult[] = [];
    const flags: Record<string, boolean> = {};
    let fromCache = 0;
    let freshEvaluations = 0;

    await Promise.all(
      flagNames.map(async (flagName) => {
        const result = await this.evaluate(flagName, context);
        results.push(result);
        flags[flagName] = result.enabled;

        if (result.fromCache) {
          fromCache++;
        } else {
          freshEvaluations++;
        }
      })
    );

    return {
      flags,
      evaluations: results,
      fromCache,
      freshEvaluations,
    };
  }

  /**
   * Get all enabled flags for a context
   */
  async getEnabledFlags(
    flagNames: string[],
    context?: FlagEvaluationContext
  ): Promise<string[]> {
    const result = await this.evaluateMultiple(flagNames, context);
    return Object.entries(result.flags)
      .filter(([, enabled]) => enabled)
      .map(([name]) => name);
  }

  // ==========================================================================
  // Flag Management (with event emission)
  // ==========================================================================

  /**
   * Create a new feature flag
   */
  async createFlag(
    data: CreateFeatureFlagData,
    actorInfo?: {
      actorId: string;
      actorType: AuditActorType;
      actorName?: string;
      actorEmail?: string;
    }
  ): Promise<FeatureFlag> {
    const flag = await createFeatureFlag(data, actorInfo);
    this.eventEmitter.emitFlagCreated(flag);
    return flag;
  }

  /**
   * Update a feature flag
   */
  async updateFlag(
    id: string,
    data: UpdateFeatureFlagData,
    actorInfo?: {
      actorId: string;
      actorType: AuditActorType;
      actorName?: string;
      actorEmail?: string;
    }
  ): Promise<FeatureFlag | null> {
    // Get previous state for event
    const previousFlag = await this.getFlagById(id);
    const previousState = previousFlag ? { ...previousFlag } : undefined;

    const flag = await updateFeatureFlag(id, data, actorInfo);

    if (flag) {
      // Invalidate cache for this flag
      this.cache.invalidateFlag(flag.flagName);

      // Emit appropriate events
      if (previousState && data.enabled !== undefined && data.enabled !== previousState.enabled) {
        this.eventEmitter.emitFlagToggled(flag, previousState.enabled);
      } else if (
        previousState &&
        data.rolloutPercentage !== undefined &&
        data.rolloutPercentage !== previousState.rolloutPercentage
      ) {
        this.eventEmitter.emitRolloutChanged(flag, previousState.rolloutPercentage);
      } else {
        this.eventEmitter.emitFlagUpdated(flag, previousState);
      }
    }

    return flag;
  }

  /**
   * Delete a feature flag
   */
  async deleteFlag(
    id: string,
    actorInfo?: {
      actorId: string;
      actorType: AuditActorType;
      actorName?: string;
      actorEmail?: string;
    }
  ): Promise<boolean> {
    // Get flag info before deletion
    const flag = await this.getFlagById(id);
    if (!flag) return false;

    const success = await deleteFeatureFlag(id, actorInfo);

    if (success) {
      // Invalidate cache
      this.cache.invalidateFlag(flag.flagName);
      // Emit event
      this.eventEmitter.emitFlagDeleted(id, flag.flagName);
    }

    return success;
  }

  /**
   * Toggle a feature flag
   */
  async toggleFlag(
    id: string,
    enabled: boolean,
    actorInfo?: {
      actorId: string;
      actorType: AuditActorType;
      actorName?: string;
      actorEmail?: string;
    }
  ): Promise<FeatureFlag | null> {
    return this.updateFlag(id, { enabled }, actorInfo);
  }

  /**
   * Update rollout percentage
   */
  async updateRollout(
    id: string,
    rolloutPercentage: number,
    actorInfo?: {
      actorId: string;
      actorType: AuditActorType;
      actorName?: string;
      actorEmail?: string;
    }
  ): Promise<FeatureFlag | null> {
    return this.updateFlag(id, { rolloutPercentage }, actorInfo);
  }

  // ==========================================================================
  // User Targeting
  // ==========================================================================

  /**
   * Add user target
   */
  async addUserTarget(
    featureFlagId: string,
    userId: string,
    enabled: boolean,
    actorInfo?: {
      actorId: string;
      actorType: AuditActorType;
      actorName?: string;
      actorEmail?: string;
    }
  ): Promise<void> {
    const flag = await this.getFlagById(featureFlagId);
    if (!flag) throw new Error("Feature flag not found");

    await addFeatureFlagUserTarget(
      {
        id: crypto.randomUUID(),
        featureFlagId,
        userId,
        enabled,
      },
      actorInfo
    );

    // Invalidate user's cache
    this.cache.invalidateUser(userId);

    // Emit event
    this.eventEmitter.emitUserTargetAdded(featureFlagId, flag.flagName, userId, enabled);
  }

  /**
   * Remove user target
   */
  async removeUserTarget(
    featureFlagId: string,
    userId: string,
    actorInfo?: {
      actorId: string;
      actorType: AuditActorType;
      actorName?: string;
      actorEmail?: string;
    }
  ): Promise<boolean> {
    const flag = await this.getFlagById(featureFlagId);
    if (!flag) return false;

    const success = await removeFeatureFlagUserTarget(featureFlagId, userId, actorInfo);

    if (success) {
      // Invalidate user's cache
      this.cache.invalidateUser(userId);

      // Emit event
      this.eventEmitter.emitUserTargetRemoved(featureFlagId, flag.flagName, userId);
    }

    return success;
  }

  // ==========================================================================
  // Role Targeting
  // ==========================================================================

  /**
   * Add role target
   */
  async addRoleTarget(
    featureFlagId: string,
    role: UserRole,
    enabled: boolean,
    actorInfo?: {
      actorId: string;
      actorType: AuditActorType;
      actorName?: string;
      actorEmail?: string;
    }
  ): Promise<void> {
    const flag = await this.getFlagById(featureFlagId);
    if (!flag) throw new Error("Feature flag not found");

    await addFeatureFlagRoleTarget(
      {
        id: crypto.randomUUID(),
        featureFlagId,
        role,
        enabled,
      },
      actorInfo
    );

    // Invalidate role's cache
    this.cache.invalidateRole(role);

    // Emit event
    this.eventEmitter.emitRoleTargetAdded(featureFlagId, flag.flagName, role, enabled);
  }

  /**
   * Remove role target
   */
  async removeRoleTarget(
    featureFlagId: string,
    role: UserRole,
    actorInfo?: {
      actorId: string;
      actorType: AuditActorType;
      actorName?: string;
      actorEmail?: string;
    }
  ): Promise<boolean> {
    const flag = await this.getFlagById(featureFlagId);
    if (!flag) return false;

    const success = await removeFeatureFlagRoleTarget(featureFlagId, role, actorInfo);

    if (success) {
      // Invalidate role's cache
      this.cache.invalidateRole(role);

      // Emit event
      this.eventEmitter.emitRoleTargetRemoved(featureFlagId, flag.flagName, role);
    }

    return success;
  }

  // ==========================================================================
  // Event Subscription
  // ==========================================================================

  /**
   * Subscribe to all flag events
   */
  onAny(listener: FeatureFlagEventListener): () => void {
    return this.eventEmitter.onAny(listener);
  }

  /**
   * Subscribe to events for a specific flag
   */
  onFlag(flagName: string, listener: FeatureFlagEventListener): () => void {
    return this.eventEmitter.onFlag(flagName, listener);
  }

  /**
   * Get event emitter for SSE registration
   */
  getEventEmitter(): FeatureFlagEventEmitter {
    return this.eventEmitter;
  }

  // ==========================================================================
  // Health & Monitoring
  // ==========================================================================

  /**
   * Get service health status
   */
  getHealthStatus(): ServiceHealthStatus {
    const cacheStats = this.cache.getStats();
    return {
      healthy: true,
      cacheSize: cacheStats.size,
      cacheHitRate: cacheStats.hitRate,
      lastUpdate: null,
      connectedClients: this.eventEmitter.getConnectedClientCount(),
      uptime: Date.now() - this.startTime,
    };
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Invalidate cache for a flag
   */
  invalidateCache(flagName: string): number {
    return this.cache.invalidateFlag(flagName);
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private async getFlagById(id: string): Promise<FeatureFlag | null> {
    const { findFeatureFlagById } = await import("~/data-access/feature-flags");
    return findFeatureFlagById(id);
  }

  private async evaluateWithReason(
    flagName: string,
    userId?: string,
    userRole?: UserRole | null
  ): Promise<Omit<FlagEvaluationResult, "fromCache">> {
    // Get the flag
    const flag = await findFeatureFlagByName(flagName);
    if (!flag) {
      return { flagName, enabled: false, reason: "flag_not_found" };
    }

    // If globally disabled and strategy is not "targeted", return false
    if (!flag.enabled && flag.rolloutStrategy !== "targeted") {
      return { flagName, enabled: false, reason: "flag_disabled" };
    }

    // If user is provided, check explicit user targeting first
    if (userId) {
      const userTarget = await getFeatureFlagUserTarget(flag.id, userId);
      if (userTarget) {
        return {
          flagName,
          enabled: userTarget.enabled,
          reason: "user_targeted",
        };
      }
    }

    // Check role targeting
    if (userRole) {
      const roleTarget = await getFeatureFlagRoleTarget(flag.id, userRole);
      if (roleTarget) {
        return {
          flagName,
          enabled: roleTarget.enabled,
          reason: "role_targeted",
        };
      }
    }

    // Apply rollout strategy
    switch (flag.rolloutStrategy) {
      case "all":
        return { flagName, enabled: flag.enabled, reason: "strategy_all" };

      case "none":
        return { flagName, enabled: false, reason: "strategy_none" };

      case "targeted":
        return { flagName, enabled: false, reason: "strategy_targeted" };

      case "percentage":
        if (!userId) {
          return { flagName, enabled: flag.enabled, reason: "default" };
        }
        const userHash = this.hashUserForRollout(userId, flagName);
        const enabled = userHash < flag.rolloutPercentage;
        return { flagName, enabled, reason: "percentage_rollout" };

      default:
        return { flagName, enabled: flag.enabled, reason: "default" };
    }
  }

  private hashUserForRollout(userId: string, flagName: string): number {
    const combined = `${userId}:${flagName}`;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash) % 100;
  }

  private startCacheCleanup(): void {
    // Clean up every minute
    this.cleanupInterval = setInterval(() => {
      const cleaned = this.cache.cleanup();
      if (this.config.debug && cleaned > 0) {
        console.log(`[FeatureFlagService] Cleaned ${cleaned} expired cache entries`);
      }

      // Also clean up stale SSE connections
      const staleConnections = this.eventEmitter.cleanupStaleConnections();
      if (this.config.debug && staleConnections > 0) {
        console.log(`[FeatureFlagService] Cleaned ${staleConnections} stale SSE connections`);
      }
    }, 60000);
  }

  /**
   * Dispose service resources
   */
  dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let serviceInstance: FeatureFlagService | null = null;

/**
 * Get the singleton service instance
 */
export function getFeatureFlagService(
  config?: Partial<FeatureFlagServiceConfig>
): FeatureFlagService {
  if (!serviceInstance) {
    serviceInstance = new FeatureFlagService(config);
  }
  return serviceInstance;
}

/**
 * Reset the singleton instance (mainly for testing)
 */
export function resetFeatureFlagService(): void {
  if (serviceInstance) {
    serviceInstance.dispose();
  }
  serviceInstance = null;
}
