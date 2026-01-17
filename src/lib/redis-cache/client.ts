/**
 * Redis Cache Client
 * Core Redis client implementation with connection management and error handling
 */

import Redis from 'ioredis';
import type {
  RedisConfig,
  TTLConfig,
  CacheNamespace,
  CacheEntry,
  CacheOptions,
  CacheResult,
  CacheStats,
  CacheEvent,
  CacheEventListener,
  CacheEventType,
} from './types';
import {
  buildRedisConfig,
  buildTTLConfig,
  validateRedisConfig,
  isRedisCacheEnabled,
} from './config';

// =============================================================================
// Redis Cache Client Class
// =============================================================================

export class RedisCacheClient {
  private client: Redis | null = null;
  private config: RedisConfig;
  private ttlConfig: TTLConfig;
  private connected: boolean = false;
  private listeners: Map<CacheEventType, Set<CacheEventListener>> = new Map();
  private stats: {
    hits: number;
    misses: number;
    sets: number;
    deletes: number;
    errors: number;
  } = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0,
  };

  constructor(
    configOverrides?: Partial<RedisConfig>,
    ttlOverrides?: Partial<TTLConfig>
  ) {
    this.config = buildRedisConfig(configOverrides);
    this.ttlConfig = buildTTLConfig(ttlOverrides);

    // Validate configuration
    const validation = validateRedisConfig(this.config);
    if (!validation.valid) {
      console.warn('Redis config validation warnings:', validation.errors);
    }
  }

  // ===========================================================================
  // Connection Management
  // ===========================================================================

  /**
   * Initialize Redis connection
   */
  async connect(): Promise<boolean> {
    if (!isRedisCacheEnabled()) {
      console.log('Redis cache is disabled');
      return false;
    }

    if (this.connected && this.client) {
      return true;
    }

    try {
      this.client = new Redis({
        host: this.config.host,
        port: this.config.port,
        password: this.config.password,
        db: this.config.db,
        keyPrefix: this.config.keyPrefix,
        connectTimeout: this.config.connectTimeout,
        maxRetriesPerRequest: this.config.maxRetries,
        retryStrategy: (times: number) => {
          if (times > (this.config.maxRetries || 3)) {
            return null; // Stop retrying
          }
          return Math.min(times * (this.config.retryDelay || 500), 2000);
        },
        tls: this.config.tls ? {} : undefined,
        lazyConnect: true,
      });

      // Set up event handlers
      this.client.on('connect', () => {
        this.connected = true;
        this.emitEvent({ type: 'connect', timestamp: Date.now() });
      });

      this.client.on('error', (error) => {
        this.stats.errors++;
        this.emitEvent({ type: 'error', timestamp: Date.now(), error });
        console.error('Redis error:', error.message);
      });

      this.client.on('close', () => {
        this.connected = false;
        this.emitEvent({ type: 'disconnect', timestamp: Date.now() });
      });

      // Connect
      await this.client.connect();
      this.connected = true;
      console.log('Redis connected successfully');
      return true;
    } catch (error) {
      this.stats.errors++;
      console.error('Failed to connect to Redis:', error);
      this.emitEvent({
        type: 'error',
        timestamp: Date.now(),
        error: error as Error,
      });
      return false;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.connected = false;
      this.emitEvent({ type: 'disconnect', timestamp: Date.now() });
    }
  }

  /**
   * Check if connected to Redis
   */
  isConnected(): boolean {
    return this.connected && this.client !== null;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    if (!this.client || !this.connected) {
      return false;
    }

    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }

  // ===========================================================================
  // Core Cache Operations
  // ===========================================================================

  /**
   * Get a value from cache
   */
  async get<T>(key: string, namespace: CacheNamespace = 'general'): Promise<CacheResult<T>> {
    if (!this.ensureConnected()) {
      return { success: false, fromCache: false, error: 'Not connected to Redis' };
    }

    try {
      const fullKey = this.buildKey(key, namespace);
      const value = await this.client!.get(fullKey);

      if (value === null) {
        this.stats.misses++;
        this.emitEvent({ type: 'miss', timestamp: Date.now(), namespace, key: fullKey });
        return { success: true, fromCache: false };
      }

      const entry: CacheEntry<T> = JSON.parse(value);
      const now = Date.now();

      // Check if expired (backup check, Redis should handle TTL)
      if (entry.expiresAt < now) {
        await this.client!.del(fullKey);
        this.stats.misses++;
        return { success: true, fromCache: false };
      }

      this.stats.hits++;
      this.emitEvent({ type: 'hit', timestamp: Date.now(), namespace, key: fullKey });

      const ttl = await this.client!.ttl(fullKey);

      return {
        success: true,
        data: entry.data,
        fromCache: true,
        ttlRemaining: ttl > 0 ? ttl : undefined,
      };
    } catch (error) {
      this.stats.errors++;
      return {
        success: false,
        fromCache: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Set a value in cache
   */
  async set<T>(
    key: string,
    data: T,
    options: CacheOptions = {}
  ): Promise<CacheResult<T>> {
    if (!this.ensureConnected()) {
      return { success: false, fromCache: false, error: 'Not connected to Redis' };
    }

    try {
      const namespace = options.namespace || 'general';
      const ttl = options.ttl || this.getTTLForNamespace(namespace);
      const fullKey = this.buildKey(key, namespace);

      const entry: CacheEntry<T> = {
        data,
        createdAt: Date.now(),
        expiresAt: Date.now() + ttl * 1000,
        namespace,
        metadata: options.tags ? { tags: options.tags } : undefined,
      };

      await this.client!.setex(fullKey, ttl, JSON.stringify(entry));

      // Store tags for invalidation if provided
      if (options.tags && options.tags.length > 0) {
        for (const tag of options.tags) {
          const tagKey = this.buildTagKey(tag);
          await this.client!.sadd(tagKey, fullKey);
          await this.client!.expire(tagKey, ttl);
        }
      }

      this.stats.sets++;
      this.emitEvent({ type: 'set', timestamp: Date.now(), namespace, key: fullKey });

      return { success: true, data, fromCache: false };
    } catch (error) {
      this.stats.errors++;
      return {
        success: false,
        fromCache: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Delete a value from cache
   */
  async delete(key: string, namespace: CacheNamespace = 'general'): Promise<boolean> {
    if (!this.ensureConnected()) {
      return false;
    }

    try {
      const fullKey = this.buildKey(key, namespace);
      const result = await this.client!.del(fullKey);

      if (result > 0) {
        this.stats.deletes++;
        this.emitEvent({ type: 'delete', timestamp: Date.now(), namespace, key: fullKey });
      }

      return result > 0;
    } catch (error) {
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Check if key exists in cache
   */
  async exists(key: string, namespace: CacheNamespace = 'general'): Promise<boolean> {
    if (!this.ensureConnected()) {
      return false;
    }

    try {
      const fullKey = this.buildKey(key, namespace);
      const result = await this.client!.exists(fullKey);
      return result > 0;
    } catch {
      return false;
    }
  }

  /**
   * Get TTL for a key
   */
  async getTTL(key: string, namespace: CacheNamespace = 'general'): Promise<number | null> {
    if (!this.ensureConnected()) {
      return null;
    }

    try {
      const fullKey = this.buildKey(key, namespace);
      const ttl = await this.client!.ttl(fullKey);
      return ttl > 0 ? ttl : null;
    } catch {
      return null;
    }
  }

  /**
   * Update TTL for a key
   */
  async updateTTL(
    key: string,
    ttl: number,
    namespace: CacheNamespace = 'general'
  ): Promise<boolean> {
    if (!this.ensureConnected()) {
      return false;
    }

    try {
      const fullKey = this.buildKey(key, namespace);
      const result = await this.client!.expire(fullKey, ttl);
      return result === 1;
    } catch {
      return false;
    }
  }

  // ===========================================================================
  // Batch Operations
  // ===========================================================================

  /**
   * Get multiple values from cache
   */
  async mget<T>(
    keys: string[],
    namespace: CacheNamespace = 'general'
  ): Promise<Map<string, T | null>> {
    const result = new Map<string, T | null>();

    if (!this.ensureConnected() || keys.length === 0) {
      return result;
    }

    try {
      const fullKeys = keys.map((k) => this.buildKey(k, namespace));
      const values = await this.client!.mget(...fullKeys);

      for (let i = 0; i < keys.length; i++) {
        const value = values[i];
        if (value === null) {
          result.set(keys[i], null);
          this.stats.misses++;
        } else {
          try {
            const entry: CacheEntry<T> = JSON.parse(value);
            result.set(keys[i], entry.data);
            this.stats.hits++;
          } catch {
            result.set(keys[i], null);
          }
        }
      }

      return result;
    } catch {
      this.stats.errors++;
      return result;
    }
  }

  /**
   * Delete multiple keys
   */
  async mdelete(keys: string[], namespace: CacheNamespace = 'general'): Promise<number> {
    if (!this.ensureConnected() || keys.length === 0) {
      return 0;
    }

    try {
      const fullKeys = keys.map((k) => this.buildKey(k, namespace));
      const result = await this.client!.del(...fullKeys);
      this.stats.deletes += result;
      return result;
    } catch {
      this.stats.errors++;
      return 0;
    }
  }

  // ===========================================================================
  // Invalidation
  // ===========================================================================

  /**
   * Invalidate all keys for a namespace
   */
  async invalidateNamespace(namespace: CacheNamespace): Promise<number> {
    if (!this.ensureConnected()) {
      return 0;
    }

    try {
      const pattern = this.buildKey('*', namespace);
      const keys = await this.client!.keys(pattern);

      if (keys.length === 0) {
        return 0;
      }

      // Remove prefix from keys before deleting (ioredis adds prefix automatically)
      const keysWithoutPrefix = keys.map((k) =>
        k.startsWith(this.config.keyPrefix || '')
          ? k.slice((this.config.keyPrefix || '').length)
          : k
      );

      const result = await this.client!.del(...keysWithoutPrefix);
      this.stats.deletes += result;
      return result;
    } catch {
      this.stats.errors++;
      return 0;
    }
  }

  /**
   * Invalidate keys by tag
   */
  async invalidateByTag(tag: string): Promise<number> {
    if (!this.ensureConnected()) {
      return 0;
    }

    try {
      const tagKey = this.buildTagKey(tag);
      const keys = await this.client!.smembers(tagKey);

      if (keys.length === 0) {
        return 0;
      }

      // Remove prefix from keys
      const keysWithoutPrefix = keys.map((k) =>
        k.startsWith(this.config.keyPrefix || '')
          ? k.slice((this.config.keyPrefix || '').length)
          : k
      );

      const result = await this.client!.del(...keysWithoutPrefix, tagKey);
      this.stats.deletes += result;
      return result;
    } catch {
      this.stats.errors++;
      return 0;
    }
  }

  /**
   * Clear all cache
   */
  async flush(): Promise<boolean> {
    if (!this.ensureConnected()) {
      return false;
    }

    try {
      // Only flush keys with our prefix
      const pattern = `${this.config.keyPrefix}*`;
      const keys = await this.client!.keys(pattern);

      if (keys.length > 0) {
        const keysWithoutPrefix = keys.map((k) =>
          k.startsWith(this.config.keyPrefix || '')
            ? k.slice((this.config.keyPrefix || '').length)
            : k
        );
        await this.client!.del(...keysWithoutPrefix);
      }

      return true;
    } catch {
      this.stats.errors++;
      return false;
    }
  }

  // ===========================================================================
  // Statistics
  // ===========================================================================

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;

    let totalKeys = 0;
    let memoryUsage: number | undefined;
    let connectedClients: number | undefined;
    let uptime: number | undefined;

    if (this.ensureConnected()) {
      try {
        const info = await this.client!.info();

        // Parse key count
        const dbMatch = info.match(/db\d+:keys=(\d+)/);
        if (dbMatch) {
          totalKeys = parseInt(dbMatch[1], 10);
        }

        // Parse memory usage
        const memMatch = info.match(/used_memory:(\d+)/);
        if (memMatch) {
          memoryUsage = parseInt(memMatch[1], 10);
        }

        // Parse connected clients
        const clientMatch = info.match(/connected_clients:(\d+)/);
        if (clientMatch) {
          connectedClients = parseInt(clientMatch[1], 10);
        }

        // Parse uptime
        const uptimeMatch = info.match(/uptime_in_seconds:(\d+)/);
        if (uptimeMatch) {
          uptime = parseInt(uptimeMatch[1], 10);
        }
      } catch {
        // Ignore info parsing errors
      }
    }

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: Math.round(hitRate * 100) / 100,
      totalKeys,
      memoryUsage,
      connectedClients,
      uptime,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
    };
  }

  // ===========================================================================
  // Event Handling
  // ===========================================================================

  /**
   * Add event listener
   */
  on(event: CacheEventType, listener: CacheEventListener): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  /**
   * Remove event listener
   */
  off(event: CacheEventType, listener: CacheEventListener): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  /**
   * Emit event to all listeners
   */
  private emitEvent(event: CacheEvent): void {
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(event);
        } catch (error) {
          console.error('Error in cache event listener:', error);
        }
      });
    }
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  /**
   * Ensure Redis is connected
   */
  private ensureConnected(): boolean {
    if (!this.client || !this.connected) {
      return false;
    }
    return true;
  }

  /**
   * Build full cache key with namespace
   */
  private buildKey(key: string, namespace: CacheNamespace): string {
    return `${namespace}:${key}`;
  }

  /**
   * Build tag key for invalidation
   */
  private buildTagKey(tag: string): string {
    return `_tags:${tag}`;
  }

  /**
   * Get TTL for a namespace
   */
  private getTTLForNamespace(namespace: CacheNamespace): number {
    return this.ttlConfig[namespace] || this.ttlConfig.general;
  }

  /**
   * Get raw Redis client (for advanced operations)
   */
  getClient(): Redis | null {
    return this.client;
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<RedisConfig> {
    return { ...this.config };
  }

  /**
   * Get TTL configuration
   */
  getTTLConfig(): Readonly<TTLConfig> {
    return { ...this.ttlConfig };
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let cacheClientInstance: RedisCacheClient | null = null;

/**
 * Get the singleton Redis cache client instance
 */
export function getRedisCache(
  configOverrides?: Partial<RedisConfig>,
  ttlOverrides?: Partial<TTLConfig>
): RedisCacheClient {
  if (!cacheClientInstance) {
    cacheClientInstance = new RedisCacheClient(configOverrides, ttlOverrides);
  }
  return cacheClientInstance;
}

/**
 * Reset the singleton instance (for testing)
 */
export async function resetRedisCache(): Promise<void> {
  if (cacheClientInstance) {
    await cacheClientInstance.disconnect();
    cacheClientInstance = null;
  }
}

/**
 * Initialize Redis cache and connect
 */
export async function initializeRedisCache(
  configOverrides?: Partial<RedisConfig>,
  ttlOverrides?: Partial<TTLConfig>
): Promise<RedisCacheClient> {
  const client = getRedisCache(configOverrides, ttlOverrides);
  await client.connect();
  return client;
}
