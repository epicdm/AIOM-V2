/**
 * Rate Limiter Types
 * Type definitions for Redis-backed rate limiting using token bucket algorithm
 */

// =============================================================================
// Configuration Types
// =============================================================================

/**
 * Rate limit rule configuration
 */
export interface RateLimitRule {
  /** Maximum number of tokens (requests) in the bucket */
  maxTokens: number;
  /** Time window in seconds for token refill */
  windowSeconds: number;
  /** Number of tokens refilled per window (defaults to maxTokens) */
  refillRate?: number;
  /** Custom identifier key builder (defaults to IP-based) */
  keyBuilder?: (request: Request) => string;
  /** Skip rate limiting for certain conditions */
  skip?: (request: Request) => boolean | Promise<boolean>;
  /** Custom response when rate limited */
  customResponse?: RateLimitResponse;
}

/**
 * Predefined rate limit presets for common scenarios
 */
export type RateLimitPreset =
  | 'auth'           // 10 requests per minute
  | 'otp'            // 3 requests per minute
  | 'transfer'       // 5 requests per minute
  | 'api'            // 100 requests per minute
  | 'strict';        // 1 request per minute

/**
 * Rate limiter configuration
 */
export interface RateLimiterConfig {
  /** Enable/disable rate limiting globally */
  enabled: boolean;
  /** Redis key prefix for rate limiting keys */
  keyPrefix: string;
  /** Default rule to apply when no specific rule matches */
  defaultRule: RateLimitRule;
  /** Named rules for different endpoints */
  rules: Record<string, RateLimitRule>;
  /** Whitelist of identifiers to skip rate limiting */
  whitelist?: string[];
  /** Headers to use for client identification */
  identifierHeaders?: string[];
}

// =============================================================================
// Token Bucket Types
// =============================================================================

/**
 * Token bucket state stored in Redis
 */
export interface TokenBucketState {
  /** Current number of tokens available */
  tokens: number;
  /** Timestamp of last refill */
  lastRefill: number;
  /** Maximum tokens (for reference) */
  maxTokens: number;
  /** Window in seconds (for reference) */
  windowSeconds: number;
}

/**
 * Result of a rate limit check
 */
export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Number of tokens remaining */
  remaining: number;
  /** Total tokens allowed */
  limit: number;
  /** Seconds until tokens reset/refill */
  resetIn: number;
  /** Seconds until retry is allowed (only if not allowed) */
  retryAfter?: number;
}

// =============================================================================
// Response Types
// =============================================================================

/**
 * Rate limit response structure
 */
export interface RateLimitResponse {
  /** HTTP status code (default: 429) */
  status?: number;
  /** Error message */
  message: string;
  /** Error code/type */
  error: string;
  /** Seconds until retry is allowed */
  retryAfter: number;
}

/**
 * Rate limit headers to include in responses
 */
export interface RateLimitHeaders {
  /** Maximum requests allowed */
  'X-RateLimit-Limit': string;
  /** Remaining requests in current window */
  'X-RateLimit-Remaining': string;
  /** Timestamp when the rate limit resets */
  'X-RateLimit-Reset': string;
  /** Seconds until retry is allowed (only when rate limited) */
  'Retry-After'?: string;
}

// =============================================================================
// Middleware Types
// =============================================================================

/**
 * Rate limit middleware options
 */
export interface RateLimitMiddlewareOptions {
  /** Rate limit rule to apply */
  rule: RateLimitRule | RateLimitPreset;
  /** Include rate limit headers in response */
  includeHeaders?: boolean;
  /** Custom identifier extractor */
  identifierExtractor?: (request: Request) => string | Promise<string>;
  /** On rate limit callback */
  onRateLimit?: (identifier: string, result: RateLimitResult) => void | Promise<void>;
}

/**
 * Rate limit context passed to middleware chain
 */
export interface RateLimitContext {
  /** Rate limit check result */
  rateLimitResult: RateLimitResult;
  /** Client identifier used for rate limiting */
  rateLimitIdentifier: string;
}

// =============================================================================
// Event Types
// =============================================================================

/**
 * Rate limit event types
 */
export type RateLimitEventType =
  | 'check'
  | 'allowed'
  | 'blocked'
  | 'error';

/**
 * Rate limit event payload
 */
export interface RateLimitEvent {
  /** Event type */
  type: RateLimitEventType;
  /** Event timestamp */
  timestamp: number;
  /** Client identifier */
  identifier: string;
  /** Rate limit result (if available) */
  result?: RateLimitResult;
  /** Rule name that was applied */
  ruleName?: string;
  /** Error (if applicable) */
  error?: Error;
}

/**
 * Rate limit event listener
 */
export type RateLimitEventListener = (event: RateLimitEvent) => void;

// =============================================================================
// Statistics Types
// =============================================================================

/**
 * Rate limiter statistics
 */
export interface RateLimiterStats {
  /** Total rate limit checks performed */
  totalChecks: number;
  /** Number of requests allowed */
  allowed: number;
  /** Number of requests blocked */
  blocked: number;
  /** Block rate percentage */
  blockRate: number;
  /** Unique identifiers tracked */
  uniqueIdentifiers: number;
}
