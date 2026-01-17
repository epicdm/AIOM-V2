/**
 * Rate Limiter Library
 * Redis-backed rate limiting using token bucket algorithm
 *
 * @example
 * ```typescript
 * import {
 *   applyRateLimit,
 *   applyOTPRateLimit,
 *   applyAuthRateLimit,
 *   withRateLimit,
 *   getRateLimiter,
 * } from '~/lib/rate-limiter';
 *
 * // In a route handler - apply rate limiting directly
 * export const Route = createFileRoute("/api/auth/login")({
 *   server: {
 *     handlers: {
 *       POST: async ({ request }) => {
 *         // Apply auth rate limiting (10 req/min)
 *         const rateLimitResponse = await applyAuthRateLimit(request, email);
 *         if (rateLimitResponse) return rateLimitResponse;
 *
 *         // Continue with login logic...
 *       },
 *     },
 *   },
 * });
 *
 * // For OTP endpoints
 * const rateLimitResponse = await applyOTPRateLimit(request, phoneNumber);
 * if (rateLimitResponse) return rateLimitResponse;
 *
 * // Using custom rules
 * const rateLimitResponse = await applyRateLimit(request, {
 *   maxTokens: 5,
 *   windowSeconds: 60,
 * });
 * if (rateLimitResponse) return rateLimitResponse;
 *
 * // Using presets
 * const rateLimitResponse = await applyRateLimit(request, 'strict');
 * if (rateLimitResponse) return rateLimitResponse;
 * ```
 */

// =============================================================================
// Types
// =============================================================================

export type {
  // Configuration
  RateLimitRule,
  RateLimiterConfig,
  RateLimitPreset,

  // Token bucket
  TokenBucketState,
  RateLimitResult,

  // Response
  RateLimitResponse,
  RateLimitHeaders,

  // Middleware
  RateLimitMiddlewareOptions,
  RateLimitContext,

  // Events
  RateLimitEvent,
  RateLimitEventType,
  RateLimitEventListener,

  // Statistics
  RateLimiterStats,
} from './types';

// =============================================================================
// Configuration
// =============================================================================

export {
  // Default configurations
  DEFAULT_RATE_LIMIT_RULE,
  DEFAULT_RATE_LIMITER_CONFIG,

  // Presets
  RATE_LIMIT_PRESETS,

  // Configuration helpers
  resolveRateLimitRule,
  buildRateLimiterConfig,
  createRateLimitRule,

  // Environment
  isRateLimitingEnabled,
  getRateLimitKeyPrefix,
} from './config';

// =============================================================================
// Token Bucket
// =============================================================================

export {
  TokenBucketRateLimiter,
  getRateLimiter,
  resetRateLimiter,
  initializeRateLimiter,
} from './token-bucket';

// =============================================================================
// Middleware
// =============================================================================

export {
  // Identifier extraction
  extractIdentifier,
  extractPhoneIdentifier,
  extractUserIdentifier,

  // Response helpers
  buildRateLimitHeaders,
  createRateLimitResponse,

  // Rate limit check
  checkRateLimit,

  // Handler wrappers
  withRateLimit,
  withAuthRateLimit,
  withOTPRateLimit,
  withTransferRateLimit,
  withStrictRateLimit,

  // Direct application in routes
  applyRateLimit,
  applyOTPRateLimit,
  applyAuthRateLimit,
  applyTransferRateLimit,
} from './middleware';

// =============================================================================
// Convenience Function
// =============================================================================

import { initializeRateLimiter, getRateLimiter } from './token-bucket';
import { initializeRedisCache } from '~/lib/redis-cache';

/**
 * Initialize the rate limiter (ensures Redis connection)
 * Call this at application startup
 */
export async function setupRateLimiter(): Promise<boolean> {
  try {
    // Ensure Redis is connected first
    await initializeRedisCache();
    const rateLimiter = await initializeRateLimiter();

    console.log('Rate limiter initialized successfully');
    return rateLimiter.isEnabled();
  } catch (error) {
    console.error('Failed to setup rate limiter:', error);
    return false;
  }
}

/**
 * Get rate limiter statistics
 */
export function getRateLimiterStats() {
  const rateLimiter = getRateLimiter();
  return rateLimiter.getStats();
}

/**
 * Reset rate limiter statistics
 */
export function resetRateLimiterStats(): void {
  const rateLimiter = getRateLimiter();
  rateLimiter.resetStats();
}
