/**
 * Redis Cache Layer Types
 * Type definitions for Redis caching of user sessions, Odoo queries, and AIOM responses
 */

// =============================================================================
// Configuration Types
// =============================================================================

/**
 * Redis connection configuration
 */
export interface RedisConfig {
  /** Redis host (default: localhost) */
  host: string;
  /** Redis port (default: 6379) */
  port: number;
  /** Redis password (optional) */
  password?: string;
  /** Redis database number (default: 0) */
  db?: number;
  /** Connection timeout in milliseconds (default: 5000) */
  connectTimeout?: number;
  /** Maximum retry attempts (default: 3) */
  maxRetries?: number;
  /** Retry delay in milliseconds (default: 500) */
  retryDelay?: number;
  /** Enable TLS/SSL connection */
  tls?: boolean;
  /** Key prefix for namespacing (default: 'aiom:') */
  keyPrefix?: string;
}

/**
 * Cache namespace for different data types
 */
export type CacheNamespace =
  | 'session'      // User sessions
  | 'odoo'         // Odoo API query results
  | 'aiom'         // AIOM Claude responses
  | 'feature'      // Feature flags
  | 'general';     // General purpose cache

/**
 * TTL configuration for different cache types
 */
export interface TTLConfig {
  /** Session cache TTL in seconds (default: 3600 = 1 hour) */
  session: number;
  /** Odoo query cache TTL in seconds (default: 300 = 5 minutes) */
  odoo: number;
  /** AIOM response cache TTL in seconds (default: 600 = 10 minutes) */
  aiom: number;
  /** Feature flag cache TTL in seconds (default: 60 = 1 minute) */
  feature: number;
  /** General purpose cache TTL in seconds (default: 300 = 5 minutes) */
  general: number;
}

// =============================================================================
// Cache Entry Types
// =============================================================================

/**
 * Base cache entry with metadata
 */
export interface CacheEntry<T> {
  /** Cached data */
  data: T;
  /** Timestamp when entry was created */
  createdAt: number;
  /** Timestamp when entry will expire */
  expiresAt: number;
  /** Cache namespace */
  namespace: CacheNamespace;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * User session cache entry
 */
export interface SessionCacheEntry {
  /** User ID */
  userId: string;
  /** User email */
  email?: string;
  /** User role */
  role?: string;
  /** Session token hash */
  tokenHash?: string;
  /** Session data */
  data: Record<string, unknown>;
  /** Last activity timestamp */
  lastActivity: number;
}

/**
 * Odoo query cache entry
 */
export interface OdooCacheEntry<T = unknown> {
  /** Odoo model name */
  model: string;
  /** Query method (read, search, search_read, etc.) */
  method: string;
  /** Query parameters hash */
  paramsHash: string;
  /** Query result */
  result: T;
  /** Number of records */
  recordCount?: number;
}

/**
 * AIOM Claude response cache entry
 */
export interface AiomCacheEntry {
  /** User ID who made the request */
  userId: string;
  /** Prompt hash for cache key */
  promptHash: string;
  /** Claude response content */
  response: string;
  /** Token usage */
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
  };
  /** Model used */
  model?: string;
  /** Tools used in the response */
  toolsUsed?: string[];
}

// =============================================================================
// Cache Operations Types
// =============================================================================

/**
 * Cache operation options
 */
export interface CacheOptions {
  /** Custom TTL in seconds (overrides default) */
  ttl?: number;
  /** Cache namespace */
  namespace?: CacheNamespace;
  /** Additional tags for cache invalidation */
  tags?: string[];
  /** Skip cache and fetch fresh data */
  skipCache?: boolean;
  /** Force cache update even if entry exists */
  forceUpdate?: boolean;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  /** Number of cache hits */
  hits: number;
  /** Number of cache misses */
  misses: number;
  /** Hit rate percentage */
  hitRate: number;
  /** Total keys in cache */
  totalKeys: number;
  /** Memory usage in bytes */
  memoryUsage?: number;
  /** Connected clients */
  connectedClients?: number;
  /** Uptime in seconds */
  uptime?: number;
}

/**
 * Cache operation result
 */
export interface CacheResult<T> {
  /** Whether the operation was successful */
  success: boolean;
  /** Retrieved data (if any) */
  data?: T;
  /** Whether data came from cache */
  fromCache: boolean;
  /** Time to live remaining in seconds */
  ttlRemaining?: number;
  /** Error message (if failed) */
  error?: string;
}

/**
 * Batch cache operation result
 */
export interface BatchCacheResult<T> {
  /** Number of successful operations */
  successCount: number;
  /** Number of failed operations */
  failedCount: number;
  /** Results by key */
  results: Map<string, CacheResult<T>>;
}

// =============================================================================
// Cache Key Builder Types
// =============================================================================

/**
 * Cache key builder function type
 */
export type CacheKeyBuilder<T extends unknown[] = unknown[]> = (...args: T) => string;

/**
 * Session cache key builder params
 */
export interface SessionKeyParams {
  userId: string;
  sessionId?: string;
}

/**
 * Odoo cache key builder params
 */
export interface OdooKeyParams {
  model: string;
  method: string;
  params: unknown[];
  userId?: string;
}

/**
 * AIOM cache key builder params
 */
export interface AiomKeyParams {
  userId: string;
  promptHash: string;
  model?: string;
}

// =============================================================================
// Event Types
// =============================================================================

/**
 * Cache event types
 */
export type CacheEventType =
  | 'hit'
  | 'miss'
  | 'set'
  | 'delete'
  | 'expire'
  | 'error'
  | 'connect'
  | 'disconnect';

/**
 * Cache event payload
 */
export interface CacheEvent {
  /** Event type */
  type: CacheEventType;
  /** Event timestamp */
  timestamp: number;
  /** Cache namespace */
  namespace?: CacheNamespace;
  /** Cache key (if applicable) */
  key?: string;
  /** Additional event data */
  data?: Record<string, unknown>;
  /** Error (if applicable) */
  error?: Error;
}

/**
 * Cache event listener
 */
export type CacheEventListener = (event: CacheEvent) => void;

// =============================================================================
// Error Types
// =============================================================================

/**
 * Redis cache error codes
 */
export type RedisCacheErrorCode =
  | 'CONNECTION_ERROR'
  | 'TIMEOUT_ERROR'
  | 'SERIALIZATION_ERROR'
  | 'DESERIALIZATION_ERROR'
  | 'KEY_NOT_FOUND'
  | 'OPERATION_FAILED'
  | 'INVALID_NAMESPACE'
  | 'TTL_ERROR';

/**
 * Redis cache error
 */
export interface RedisCacheError {
  code: RedisCacheErrorCode;
  message: string;
  cause?: Error;
  key?: string;
  namespace?: CacheNamespace;
}
