/**
 * Redis Cache Layer
 * Unified caching for user sessions, Odoo queries, and AIOM responses with TTL management
 *
 * @example
 * ```typescript
 * import {
 *   initializeRedisCache,
 *   getSession, setSession,
 *   getOrFetchOdoo, invalidateModel,
 *   getOrGenerateAiomResponse,
 * } from '~/lib/redis-cache';
 *
 * // Initialize Redis connection
 * await initializeRedisCache();
 *
 * // Session caching
 * await setSession(userId, { email: 'user@example.com', role: 'user', data: {} });
 * const session = await getSession(userId);
 *
 * // Odoo query caching
 * const partners = await getOrFetchOdoo(
 *   'res.partner',
 *   'search_read',
 *   [[], ['name', 'email']],
 *   () => odooClient.searchRead('res.partner', [], ['name', 'email'])
 * );
 *
 * // AIOM response caching
 * const response = await getOrGenerateAiomResponse(
 *   userId,
 *   systemPrompt,
 *   userPrompt,
 *   () => claudeClient.complete({ system: systemPrompt, prompt: userPrompt })
 * );
 * ```
 */

// =============================================================================
// Types
// =============================================================================

export type {
  // Configuration
  RedisConfig,
  TTLConfig,
  CacheNamespace,

  // Cache entries
  CacheEntry,
  SessionCacheEntry,
  OdooCacheEntry,
  AiomCacheEntry,

  // Operations
  CacheOptions,
  CacheResult,
  BatchCacheResult,
  CacheStats,

  // Key builders
  CacheKeyBuilder,
  SessionKeyParams,
  OdooKeyParams,
  AiomKeyParams,

  // Events
  CacheEvent,
  CacheEventType,
  CacheEventListener,

  // Errors
  RedisCacheError,
  RedisCacheErrorCode,
} from './types';

// =============================================================================
// Configuration
// =============================================================================

export {
  // Default configurations
  DEFAULT_REDIS_CONFIG,
  DEFAULT_TTL_CONFIG,

  // Configuration builders
  buildRedisConfig,
  buildTTLConfig,

  // Validation
  validateRedisConfig,
  validateTTLConfig,

  // URL utilities
  buildRedisUrl,
  parseRedisUrl,

  // Feature flags
  isRedisCacheEnabled,
  isRedisConfigured,
  isCacheEnabledForNamespace,
} from './config';

// =============================================================================
// Core Client
// =============================================================================

export {
  RedisCacheClient,
  getRedisCache,
  resetRedisCache,
  initializeRedisCache,
} from './client';

// =============================================================================
// Session Cache
// =============================================================================

export {
  // Key builders
  buildSessionKey,
  buildUserSessionsKey,
  hashToken,

  // Basic operations
  getSession,
  setSession,
  deleteSession,
  hasSession,
  touchSession,

  // Session management
  invalidateUserSessions,
  extendSessionTTL,
  getSessionTTL,

  // User sessions
  getUserSessionIds,
  getUserSessionCount,

  // Cache-aside pattern
  getOrFetchSession,

  // Validation
  validateSession,

  // Bulk operations
  getSessionsByUserIds,
  deleteSessionsByUserIds,
} from './session-cache';

// =============================================================================
// Odoo Cache
// =============================================================================

export {
  // Key builders
  hashParams,
  buildOdooKey,
  buildModelPattern,

  // TTL helpers
  getModelTTL,

  // Basic operations
  getOdooCache,
  setOdooCache,
  deleteOdooCache,
  hasOdooCache,

  // Invalidation
  invalidateModel,
  invalidateMethod,
  invalidateModels,
  invalidateAllOdoo,
  invalidateRecord,
  invalidateRecords,

  // Cache-aside pattern
  getOrFetchOdoo,

  // Specialized operations
  cacheSearchResult,
  getCachedSearchResult,
  cacheRecordRead,

  // Write-through helpers
  onOdooWrite,

  // Statistics
  getOdooCacheStats,
} from './odoo-cache';

// =============================================================================
// AIOM Cache
// =============================================================================

export {
  // Key builders
  hashPrompt,
  buildAiomKey,
  buildUserAiomPattern,

  // Basic operations
  getAiomCache,
  setAiomCache,
  deleteAiomCache,
  hasAiomCache,

  // Invalidation
  invalidateUserResponses,
  invalidateModelResponses,
  invalidateAllAiom,

  // Cache-aside pattern
  getOrGenerateAiomResponse,

  // Semantic caching
  arePromptsSimilar,
  generateSemanticHash,

  // Statistics
  getAiomCacheStats,
  calculateCostSavings,

  // Conversation history
  getConversationHistory,
  setConversationHistory,
  appendToConversation,
  deleteConversationHistory,
} from './aiom-cache';

export type {
  GetOrGenerateOptions,
  AiomResponseResult,
  ConversationHistoryEntry,
} from './aiom-cache';

// =============================================================================
// Convenience Functions
// =============================================================================

import { getRedisCache, initializeRedisCache, resetRedisCache } from './client';

/**
 * Initialize Redis cache with default configuration
 * Call this at application startup
 */
export async function setupRedisCache(): Promise<boolean> {
  try {
    const cache = await initializeRedisCache();
    const healthy = await cache.healthCheck();

    if (!healthy) {
      console.warn('Redis cache initialized but health check failed');
      return false;
    }

    console.log('Redis cache initialized and healthy');
    return true;
  } catch (error) {
    console.error('Failed to setup Redis cache:', error);
    return false;
  }
}

/**
 * Gracefully shutdown Redis cache
 * Call this on application shutdown
 */
export async function shutdownRedisCache(): Promise<void> {
  try {
    await resetRedisCache();
    console.log('Redis cache shutdown complete');
  } catch (error) {
    console.error('Error during Redis cache shutdown:', error);
  }
}

/**
 * Get overall cache statistics
 */
export async function getOverallCacheStats(): Promise<{
  connected: boolean;
  general: ReturnType<typeof getRedisCache>['getStats'] extends () => Promise<infer R>
    ? Awaited<R>
    : never;
}> {
  const cache = getRedisCache();
  const connected = cache.isConnected();
  const stats = await cache.getStats();

  return {
    connected,
    general: stats,
  };
}

/**
 * Clear all caches (use with caution)
 */
export async function clearAllCaches(): Promise<boolean> {
  const cache = getRedisCache();
  return cache.flush();
}

/**
 * Health check for Redis cache
 */
export async function checkCacheHealth(): Promise<{
  healthy: boolean;
  latencyMs?: number;
  error?: string;
}> {
  const cache = getRedisCache();
  const start = Date.now();

  try {
    const healthy = await cache.healthCheck();
    const latencyMs = Date.now() - start;

    return { healthy, latencyMs };
  } catch (error) {
    return {
      healthy: false,
      error: (error as Error).message,
    };
  }
}
