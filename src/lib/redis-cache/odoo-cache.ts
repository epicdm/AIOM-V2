/**
 * Odoo Query Cache Wrapper
 * Specialized caching for Odoo API query results with TTL management
 */

import type {
  OdooCacheEntry,
  CacheOptions,
  CacheResult,
  OdooKeyParams,
} from './types';
import { getRedisCache } from './client';
import { createHash } from 'crypto';

// =============================================================================
// Constants
// =============================================================================

const NAMESPACE = 'odoo' as const;

// Models that should have longer TTLs (relatively static data)
const STATIC_MODELS = [
  'res.country',
  'res.currency',
  'res.company',
  'product.category',
  'account.account',
  'account.journal',
];

// Models that should have shorter TTLs (frequently changing data)
const DYNAMIC_MODELS = [
  'sale.order',
  'purchase.order',
  'account.move',
  'stock.picking',
  'stock.move',
  'project.task',
];

// =============================================================================
// Key Builders
// =============================================================================

/**
 * Hash query parameters for consistent cache keys
 */
export function hashParams(params: unknown[]): string {
  const serialized = JSON.stringify(params);
  return createHash('md5').update(serialized).digest('hex').substring(0, 16);
}

/**
 * Build a cache key for Odoo query
 */
export function buildOdooKey(params: OdooKeyParams): string {
  const paramsHash = hashParams(params.params);
  const parts = [params.model, params.method, paramsHash];

  // Add user ID for user-specific queries
  if (params.userId) {
    parts.push(`u:${params.userId}`);
  }

  return parts.join(':');
}

/**
 * Build a cache key pattern for model invalidation
 */
export function buildModelPattern(model: string): string {
  return `${model}:*`;
}

// =============================================================================
// TTL Helpers
// =============================================================================

/**
 * Get appropriate TTL for a model based on its update frequency
 */
export function getModelTTL(model: string, baseTTL: number): number {
  if (STATIC_MODELS.includes(model)) {
    return baseTTL * 3; // 3x longer TTL for static models
  }

  if (DYNAMIC_MODELS.includes(model)) {
    return Math.max(baseTTL / 2, 60); // Half TTL for dynamic models, min 60 seconds
  }

  return baseTTL;
}

// =============================================================================
// Odoo Cache Operations
// =============================================================================

/**
 * Get cached Odoo query result
 */
export async function getOdooCache<T = unknown>(
  model: string,
  method: string,
  params: unknown[],
  userId?: string
): Promise<CacheResult<T>> {
  const cache = getRedisCache();
  const key = buildOdooKey({ model, method, params, userId });
  const result = await cache.get<OdooCacheEntry<T>>(key, NAMESPACE);

  if (result.success && result.data) {
    return {
      ...result,
      data: result.data.result,
    };
  }

  return { success: result.success, fromCache: false, error: result.error };
}

/**
 * Cache Odoo query result
 */
export async function setOdooCache<T = unknown>(
  model: string,
  method: string,
  params: unknown[],
  result: T,
  options: Omit<CacheOptions, 'namespace'> & { userId?: string } = {}
): Promise<CacheResult<T>> {
  const cache = getRedisCache();
  const ttlConfig = cache.getTTLConfig();

  const entry: OdooCacheEntry<T> = {
    model,
    method,
    paramsHash: hashParams(params),
    result,
    recordCount: Array.isArray(result) ? result.length : undefined,
  };

  const key = buildOdooKey({ model, method, params, userId: options.userId });

  // Calculate TTL based on model type
  const baseTTL = options.ttl || ttlConfig.odoo;
  const modelTTL = getModelTTL(model, baseTTL);

  const cacheResult = await cache.set<OdooCacheEntry<T>>(key, entry, {
    ttl: modelTTL,
    namespace: NAMESPACE,
    tags: [`model:${model}`, `method:${method}`, ...(options.tags || [])],
  });

  return {
    success: cacheResult.success,
    data: result,
    fromCache: false,
    error: cacheResult.error,
  };
}

/**
 * Delete cached Odoo query result
 */
export async function deleteOdooCache(
  model: string,
  method: string,
  params: unknown[],
  userId?: string
): Promise<boolean> {
  const cache = getRedisCache();
  const key = buildOdooKey({ model, method, params, userId });
  return cache.delete(key, NAMESPACE);
}

/**
 * Check if Odoo query result is cached
 */
export async function hasOdooCache(
  model: string,
  method: string,
  params: unknown[],
  userId?: string
): Promise<boolean> {
  const cache = getRedisCache();
  const key = buildOdooKey({ model, method, params, userId });
  return cache.exists(key, NAMESPACE);
}

// =============================================================================
// Invalidation Operations
// =============================================================================

/**
 * Invalidate all cache entries for a model
 */
export async function invalidateModel(model: string): Promise<number> {
  const cache = getRedisCache();
  return cache.invalidateByTag(`model:${model}`);
}

/**
 * Invalidate all cache entries for a method
 */
export async function invalidateMethod(method: string): Promise<number> {
  const cache = getRedisCache();
  return cache.invalidateByTag(`method:${method}`);
}

/**
 * Invalidate all Odoo cache entries
 */
export async function invalidateAllOdoo(): Promise<number> {
  const cache = getRedisCache();
  return cache.invalidateNamespace(NAMESPACE);
}

/**
 * Invalidate cache entries for multiple models
 */
export async function invalidateModels(models: string[]): Promise<number> {
  let total = 0;
  for (const model of models) {
    total += await invalidateModel(model);
  }
  return total;
}

// =============================================================================
// Cache-Aside Pattern Implementation
// =============================================================================

/**
 * Get or fetch Odoo data with automatic caching
 */
export async function getOrFetchOdoo<T = unknown>(
  model: string,
  method: string,
  params: unknown[],
  fetcher: () => Promise<T>,
  options: Omit<CacheOptions, 'namespace'> & { userId?: string } = {}
): Promise<{ data: T; fromCache: boolean }> {
  // Try cache first unless skipping
  if (!options.skipCache) {
    const cached = await getOdooCache<T>(model, method, params, options.userId);
    if (cached.success && cached.data !== undefined) {
      return { data: cached.data, fromCache: true };
    }
  }

  // Fetch fresh data
  const freshData = await fetcher();

  // Cache the result (don't await to avoid blocking)
  setOdooCache(model, method, params, freshData, options).catch((err) => {
    console.error('Failed to cache Odoo result:', err);
  });

  return { data: freshData, fromCache: false };
}

// =============================================================================
// Specialized Query Caching
// =============================================================================

/**
 * Cache search results with automatic key generation
 */
export async function cacheSearchResult<T = unknown>(
  model: string,
  domain: unknown[],
  fields: string[],
  result: T[],
  options: Omit<CacheOptions, 'namespace'> & {
    userId?: string;
    limit?: number;
    offset?: number;
    order?: string;
  } = {}
): Promise<CacheResult<T[]>> {
  const params = [domain, fields, options.limit, options.offset, options.order];
  return setOdooCache(model, 'search_read', params, result, options);
}

/**
 * Get cached search results
 */
export async function getCachedSearchResult<T = unknown>(
  model: string,
  domain: unknown[],
  fields: string[],
  options: {
    userId?: string;
    limit?: number;
    offset?: number;
    order?: string;
  } = {}
): Promise<CacheResult<T[]>> {
  const params = [domain, fields, options.limit, options.offset, options.order];
  return getOdooCache<T[]>(model, 'search_read', params, options.userId);
}

/**
 * Cache single record read
 */
export async function cacheRecordRead<T = unknown>(
  model: string,
  id: number,
  fields: string[],
  result: T,
  options: Omit<CacheOptions, 'namespace'> & { userId?: string } = {}
): Promise<CacheResult<T>> {
  const params = [[id], fields];
  return setOdooCache(model, 'read', params, result, {
    ...options,
    tags: [`record:${model}:${id}`, ...(options.tags || [])],
  });
}

/**
 * Invalidate single record cache
 */
export async function invalidateRecord(model: string, id: number): Promise<number> {
  const cache = getRedisCache();
  return cache.invalidateByTag(`record:${model}:${id}`);
}

/**
 * Invalidate multiple records
 */
export async function invalidateRecords(
  model: string,
  ids: number[]
): Promise<number> {
  let total = 0;
  for (const id of ids) {
    total += await invalidateRecord(model, id);
  }
  return total;
}

// =============================================================================
// Write-Through Helpers
// =============================================================================

/**
 * Invalidate cache after a write operation
 * Call this after create, write, or unlink operations
 */
export async function onOdooWrite(
  model: string,
  operation: 'create' | 'write' | 'unlink',
  ids?: number[]
): Promise<void> {
  // Invalidate the model cache
  await invalidateModel(model);

  // If specific IDs were affected, also invalidate those records
  if (ids && ids.length > 0) {
    await invalidateRecords(model, ids);
  }

  // Invalidate related models based on common relationships
  const relatedModels = getRelatedModels(model);
  for (const relatedModel of relatedModels) {
    await invalidateModel(relatedModel);
  }
}

/**
 * Get models that are typically related to a given model
 */
function getRelatedModels(model: string): string[] {
  const relationships: Record<string, string[]> = {
    'sale.order': ['sale.order.line', 'account.move', 'stock.picking'],
    'purchase.order': ['purchase.order.line', 'account.move', 'stock.picking'],
    'account.move': ['account.move.line', 'account.payment'],
    'stock.picking': ['stock.move', 'stock.move.line'],
    'project.project': ['project.task'],
    'res.partner': ['sale.order', 'purchase.order', 'account.move'],
  };

  return relationships[model] || [];
}

// =============================================================================
// Cache Statistics
// =============================================================================

/**
 * Get Odoo cache statistics
 */
export async function getOdooCacheStats(): Promise<{
  totalEntries: number;
  modelStats: Map<string, number>;
  methodStats: Map<string, number>;
}> {
  const cache = getRedisCache();
  const client = cache.getClient();

  if (!client) {
    return {
      totalEntries: 0,
      modelStats: new Map(),
      methodStats: new Map(),
    };
  }

  try {
    const pattern = `${cache.getConfig().keyPrefix}${NAMESPACE}:*`;
    const keys = await client.keys(pattern);

    const modelStats = new Map<string, number>();
    const methodStats = new Map<string, number>();

    for (const key of keys) {
      // Key format: prefix:namespace:model:method:hash
      const parts = key.split(':');
      if (parts.length >= 4) {
        const model = parts[2];
        const method = parts[3];

        modelStats.set(model, (modelStats.get(model) || 0) + 1);
        methodStats.set(method, (methodStats.get(method) || 0) + 1);
      }
    }

    return {
      totalEntries: keys.length,
      modelStats,
      methodStats,
    };
  } catch (error) {
    console.error('Failed to get Odoo cache stats:', error);
    return {
      totalEntries: 0,
      modelStats: new Map(),
      methodStats: new Map(),
    };
  }
}
