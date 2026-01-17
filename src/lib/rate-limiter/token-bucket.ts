/**
 * Token Bucket Rate Limiter
 * Redis-backed token bucket algorithm implementation
 */

import type Redis from 'ioredis';
import type {
  RateLimitRule,
  TokenBucketState,
  RateLimitResult,
  RateLimiterStats,
  RateLimitEvent,
  RateLimitEventListener,
  RateLimitEventType,
} from './types';
import { getRedisCache, initializeRedisCache } from '~/lib/redis-cache';
import { getRateLimitKeyPrefix, isRateLimitingEnabled } from './config';

// =============================================================================
// Token Bucket Implementation
// =============================================================================

/**
 * Redis-backed Token Bucket Rate Limiter
 *
 * Implements the token bucket algorithm where:
 * - Each bucket has a maximum capacity (maxTokens)
 * - Tokens are consumed for each request
 * - Tokens are refilled at a constant rate over time
 * - If bucket is empty, request is rate limited
 */
export class TokenBucketRateLimiter {
  private keyPrefix: string;
  private enabled: boolean;
  private listeners: Map<RateLimitEventType, Set<RateLimitEventListener>> = new Map();
  private stats: {
    totalChecks: number;
    allowed: number;
    blocked: number;
  } = {
    totalChecks: 0,
    allowed: 0,
    blocked: 0,
  };

  constructor(keyPrefix?: string) {
    this.keyPrefix = keyPrefix || getRateLimitKeyPrefix();
    this.enabled = isRateLimitingEnabled();
  }

  // ===========================================================================
  // Core Rate Limiting Methods
  // ===========================================================================

  /**
   * Check if a request is allowed and consume a token
   * This is the main method for rate limiting
   */
  async checkLimit(
    identifier: string,
    rule: RateLimitRule
  ): Promise<RateLimitResult> {
    const startTime = Date.now();

    // If rate limiting is disabled, always allow
    if (!this.enabled) {
      return {
        allowed: true,
        remaining: rule.maxTokens,
        limit: rule.maxTokens,
        resetIn: 0,
      };
    }

    const cache = getRedisCache();
    const client = cache.getClient();

    // If Redis is not connected, allow the request (fail open)
    if (!client || !cache.isConnected()) {
      console.warn('Rate limiter: Redis not connected, allowing request');
      return {
        allowed: true,
        remaining: rule.maxTokens,
        limit: rule.maxTokens,
        resetIn: 0,
      };
    }

    const key = this.buildKey(identifier);
    const now = Date.now();
    const refillRate = rule.refillRate ?? rule.maxTokens;

    try {
      // Use Lua script for atomic token bucket operation
      const result = await this.executeTokenBucketScript(
        client,
        key,
        rule.maxTokens,
        rule.windowSeconds,
        refillRate,
        now
      );

      this.stats.totalChecks++;

      const rateLimitResult: RateLimitResult = {
        allowed: result.allowed,
        remaining: Math.max(0, result.tokens),
        limit: rule.maxTokens,
        resetIn: result.resetIn,
        retryAfter: result.allowed ? undefined : Math.ceil(result.resetIn),
      };

      if (result.allowed) {
        this.stats.allowed++;
        this.emitEvent({
          type: 'allowed',
          timestamp: now,
          identifier,
          result: rateLimitResult,
        });
      } else {
        this.stats.blocked++;
        this.emitEvent({
          type: 'blocked',
          timestamp: now,
          identifier,
          result: rateLimitResult,
        });
      }

      return rateLimitResult;
    } catch (error) {
      console.error('Rate limiter error:', error);
      this.emitEvent({
        type: 'error',
        timestamp: now,
        identifier,
        error: error as Error,
      });

      // Fail open - allow the request on error
      return {
        allowed: true,
        remaining: rule.maxTokens,
        limit: rule.maxTokens,
        resetIn: 0,
      };
    }
  }

  /**
   * Execute the token bucket Lua script atomically
   */
  private async executeTokenBucketScript(
    client: Redis,
    key: string,
    maxTokens: number,
    windowSeconds: number,
    refillRate: number,
    now: number
  ): Promise<{ allowed: boolean; tokens: number; resetIn: number }> {
    if (!client) {
      throw new Error('Redis client not available');
    }

    // Lua script for atomic token bucket operation
    // This script:
    // 1. Gets the current bucket state
    // 2. Calculates tokens to add based on time elapsed
    // 3. Consumes a token if available
    // 4. Updates the bucket state
    const luaScript = `
      local key = KEYS[1]
      local maxTokens = tonumber(ARGV[1])
      local windowSeconds = tonumber(ARGV[2])
      local refillRate = tonumber(ARGV[3])
      local now = tonumber(ARGV[4])

      -- Get current state or initialize
      local state = redis.call('HGETALL', key)
      local tokens = maxTokens
      local lastRefill = now

      if #state > 0 then
        for i = 1, #state, 2 do
          if state[i] == 'tokens' then
            tokens = tonumber(state[i+1])
          elseif state[i] == 'lastRefill' then
            lastRefill = tonumber(state[i+1])
          end
        end
      end

      -- Calculate tokens to add based on time elapsed
      local elapsed = (now - lastRefill) / 1000 -- Convert to seconds
      local tokensToAdd = (elapsed / windowSeconds) * refillRate
      tokens = math.min(maxTokens, tokens + tokensToAdd)

      -- Check if we have tokens available
      local allowed = 0
      if tokens >= 1 then
        tokens = tokens - 1
        allowed = 1
      end

      -- Calculate time until next token
      local resetIn = 0
      if tokens < 1 then
        resetIn = ((1 - tokens) / refillRate) * windowSeconds
      end

      -- Update state
      redis.call('HMSET', key, 'tokens', tokens, 'lastRefill', now, 'maxTokens', maxTokens, 'windowSeconds', windowSeconds)
      redis.call('EXPIRE', key, windowSeconds * 2) -- Keep state for 2x window duration

      return {allowed, tokens, resetIn}
    `;

    const result = await client.eval(
      luaScript,
      1, // Number of keys
      key,
      maxTokens.toString(),
      windowSeconds.toString(),
      refillRate.toString(),
      now.toString()
    ) as [number, number, number];

    return {
      allowed: result[0] === 1,
      tokens: result[1],
      resetIn: result[2],
    };
  }

  /**
   * Get the current state of a token bucket
   */
  async getBucketState(identifier: string): Promise<TokenBucketState | null> {
    const cache = getRedisCache();
    const client = cache.getClient();

    if (!client || !cache.isConnected()) {
      return null;
    }

    const key = this.buildKey(identifier);

    try {
      const state = await client.hgetall(key);
      if (!state || Object.keys(state).length === 0) {
        return null;
      }

      return {
        tokens: parseFloat(state.tokens) || 0,
        lastRefill: parseInt(state.lastRefill, 10) || Date.now(),
        maxTokens: parseInt(state.maxTokens, 10) || 0,
        windowSeconds: parseInt(state.windowSeconds, 10) || 0,
      };
    } catch (error) {
      console.error('Error getting bucket state:', error);
      return null;
    }
  }

  /**
   * Reset the token bucket for an identifier
   */
  async resetBucket(identifier: string): Promise<boolean> {
    const cache = getRedisCache();
    const client = cache.getClient();

    if (!client || !cache.isConnected()) {
      return false;
    }

    const key = this.buildKey(identifier);

    try {
      await client.del(key);
      return true;
    } catch (error) {
      console.error('Error resetting bucket:', error);
      return false;
    }
  }

  /**
   * Reset all rate limit buckets (use with caution)
   */
  async resetAllBuckets(): Promise<number> {
    const cache = getRedisCache();
    const client = cache.getClient();

    if (!client || !cache.isConnected()) {
      return 0;
    }

    try {
      const pattern = `${this.keyPrefix}*`;
      const keys = await client.keys(pattern);

      if (keys.length === 0) {
        return 0;
      }

      const result = await client.del(...keys);
      return result;
    } catch (error) {
      console.error('Error resetting all buckets:', error);
      return 0;
    }
  }

  // ===========================================================================
  // Statistics
  // ===========================================================================

  /**
   * Get rate limiter statistics
   */
  getStats(): RateLimiterStats {
    const total = this.stats.totalChecks;
    const blockRate = total > 0 ? (this.stats.blocked / total) * 100 : 0;

    return {
      totalChecks: this.stats.totalChecks,
      allowed: this.stats.allowed,
      blocked: this.stats.blocked,
      blockRate: Math.round(blockRate * 100) / 100,
      uniqueIdentifiers: 0, // Would require additional tracking
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalChecks: 0,
      allowed: 0,
      blocked: 0,
    };
  }

  // ===========================================================================
  // Event Handling
  // ===========================================================================

  /**
   * Add event listener
   */
  on(event: RateLimitEventType, listener: RateLimitEventListener): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  /**
   * Remove event listener
   */
  off(event: RateLimitEventType, listener: RateLimitEventListener): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  /**
   * Emit event to all listeners
   */
  private emitEvent(event: RateLimitEvent): void {
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(event);
        } catch (error) {
          console.error('Error in rate limit event listener:', error);
        }
      });
    }
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  /**
   * Build the Redis key for an identifier
   */
  private buildKey(identifier: string): string {
    return `${this.keyPrefix}${identifier}`;
  }

  /**
   * Enable or disable rate limiting
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if rate limiting is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let rateLimiterInstance: TokenBucketRateLimiter | null = null;

/**
 * Get the singleton rate limiter instance
 */
export function getRateLimiter(keyPrefix?: string): TokenBucketRateLimiter {
  if (!rateLimiterInstance) {
    rateLimiterInstance = new TokenBucketRateLimiter(keyPrefix);
  }
  return rateLimiterInstance;
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetRateLimiter(): void {
  rateLimiterInstance = null;
}

/**
 * Initialize rate limiter (ensures Redis is connected)
 */
export async function initializeRateLimiter(keyPrefix?: string): Promise<TokenBucketRateLimiter> {
  // Ensure Redis is initialized
  await initializeRedisCache();
  return getRateLimiter(keyPrefix);
}
