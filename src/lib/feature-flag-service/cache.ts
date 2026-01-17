/**
 * Feature Flag Cache
 *
 * LRU-style cache for feature flag evaluations with:
 * - TTL-based expiration
 * - Size-based eviction
 * - Hit/miss statistics
 * - Invalidation by flag name or user
 */

import type {
  CachedFlagEvaluation,
  CacheStats,
  CacheKeyBuilder,
} from "./types";
import type { UserRole } from "~/db/schema";

// =============================================================================
// Cache Key Utilities
// =============================================================================

/**
 * Build a cache key from flag name, user ID, and role
 */
export const buildCacheKey: CacheKeyBuilder = (
  flagName: string,
  userId?: string,
  userRole?: UserRole | null
): string => {
  const parts = [flagName];
  if (userId) parts.push(`u:${userId}`);
  if (userRole) parts.push(`r:${userRole}`);
  return parts.join(":");
};

// =============================================================================
// Feature Flag Cache Class
// =============================================================================

export class FeatureFlagCache {
  private cache: Map<string, CachedFlagEvaluation> = new Map();
  private accessOrder: string[] = [];
  private maxSize: number;
  private defaultTTL: number;
  private hits: number = 0;
  private misses: number = 0;
  private evictions: number = 0;

  constructor(maxSize: number = 1000, defaultTTL: number = 60000) {
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  /**
   * Get a cached evaluation
   */
  get(
    flagName: string,
    userId?: string,
    userRole?: UserRole | null
  ): CachedFlagEvaluation | null {
    const key = buildCacheKey(flagName, userId, userRole);
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    // Check if entry has expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      this.misses++;
      return null;
    }

    // Move to end of access order (most recently used)
    this.updateAccessOrder(key);
    this.hits++;

    return entry;
  }

  /**
   * Set a cached evaluation
   */
  set(
    flagName: string,
    enabled: boolean,
    userId?: string,
    userRole?: UserRole | null,
    ttl?: number
  ): void {
    const key = buildCacheKey(flagName, userId, userRole);
    const now = Date.now();
    const actualTTL = ttl ?? this.defaultTTL;

    // Evict entries if at max size
    while (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    const entry: CachedFlagEvaluation = {
      flagName,
      enabled,
      timestamp: now,
      expiresAt: now + actualTTL,
      userId,
      userRole,
    };

    this.cache.set(key, entry);
    this.updateAccessOrder(key);
  }

  /**
   * Invalidate cache entries for a specific flag
   */
  invalidateFlag(flagName: string): number {
    let invalidated = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.flagName === flagName) {
        this.cache.delete(key);
        this.removeFromAccessOrder(key);
        invalidated++;
      }
    }

    return invalidated;
  }

  /**
   * Invalidate cache entries for a specific user
   */
  invalidateUser(userId: string): number {
    let invalidated = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.userId === userId) {
        this.cache.delete(key);
        this.removeFromAccessOrder(key);
        invalidated++;
      }
    }

    return invalidated;
  }

  /**
   * Invalidate cache entries for a specific role
   */
  invalidateRole(role: UserRole): number {
    let invalidated = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.userRole === role) {
        this.cache.delete(key);
        this.removeFromAccessOrder(key);
        invalidated++;
      }
    }

    return invalidated;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
      evictions: this.evictions,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        this.removeFromAccessOrder(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Get cache size
   */
  get size(): number {
    return this.cache.size;
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private evictOldest(): void {
    if (this.accessOrder.length === 0) return;

    const oldestKey = this.accessOrder.shift();
    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.evictions++;
    }
  }

  private updateAccessOrder(key: string): void {
    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);
  }

  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let cacheInstance: FeatureFlagCache | null = null;

/**
 * Get the singleton cache instance
 */
export function getFeatureFlagCache(
  maxSize?: number,
  defaultTTL?: number
): FeatureFlagCache {
  if (!cacheInstance) {
    cacheInstance = new FeatureFlagCache(maxSize, defaultTTL);
  }
  return cacheInstance;
}

/**
 * Reset the singleton cache instance (mainly for testing)
 */
export function resetFeatureFlagCache(): void {
  if (cacheInstance) {
    cacheInstance.clear();
    cacheInstance.resetStats();
  }
  cacheInstance = null;
}
