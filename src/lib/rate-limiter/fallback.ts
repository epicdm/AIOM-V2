/**
 * In-Memory Rate Limiter Fallback
 * 
 * Used when Redis is unavailable to provide basic rate limiting
 * without external dependencies. This is a simple in-memory
 * implementation that will reset if the server restarts.
 * 
 * Note: This is NOT suitable for distributed systems, but provides
 * protection in single-instance deployments when Redis is down.
 */

import type { RateLimitRule, RateLimitResult } from './types';

interface MemoryBucket {
  tokens: number;
  lastRefill: number;
}

/**
 * In-memory token bucket rate limiter
 */
export class InMemoryRateLimiter {
  private buckets: Map<string, MemoryBucket> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Clean up old buckets every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Check rate limit using in-memory storage
   */
  checkLimit(identifier: string, rule: RateLimitRule): RateLimitResult {
    const now = Date.now();
    const key = `ratelimit:${identifier}`;
    
    let bucket = this.buckets.get(key);
    
    // Initialize bucket if it doesn't exist
    if (!bucket) {
      bucket = {
        tokens: rule.maxTokens - 1, // Consume one token immediately
        lastRefill: now,
      };
      this.buckets.set(key, bucket);
      
      return {
        allowed: true,
        remaining: bucket.tokens,
        limit: rule.maxTokens,
        resetIn: rule.windowSeconds,
      };
    }

    // Calculate tokens to refill based on time elapsed
    const timeSinceLastRefill = (now - bucket.lastRefill) / 1000; // seconds
    const refillRate = rule.refillRate ?? rule.maxTokens;
    const tokensToAdd = Math.floor((timeSinceLastRefill / rule.windowSeconds) * refillRate);
    
    if (tokensToAdd > 0) {
      bucket.tokens = Math.min(rule.maxTokens, bucket.tokens + tokensToAdd);
      bucket.lastRefill = now;
    }

    // Check if we have tokens available
    if (bucket.tokens > 0) {
      bucket.tokens -= 1;
      
      return {
        allowed: true,
        remaining: bucket.tokens,
        limit: rule.maxTokens,
        resetIn: Math.ceil(rule.windowSeconds * (1 - bucket.tokens / rule.maxTokens)),
      };
    }

    // Rate limited
    const resetIn = Math.ceil(rule.windowSeconds - timeSinceLastRefill);
    
    return {
      allowed: false,
      remaining: 0,
      limit: rule.maxTokens,
      resetIn: Math.max(0, resetIn),
    };
  }

  /**
   * Clean up old buckets to prevent memory leaks
   */
  private cleanup(): void {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 hour
    
    for (const [key, bucket] of this.buckets.entries()) {
      if (now - bucket.lastRefill > maxAge) {
        this.buckets.delete(key);
      }
    }
  }

  /**
   * Get current stats
   */
  getStats() {
    return {
      bucketsCount: this.buckets.size,
      memoryUsage: this.estimateMemoryUsage(),
    };
  }

  /**
   * Estimate memory usage (rough calculation)
   */
  private estimateMemoryUsage(): number {
    // Rough estimate: each bucket ~100 bytes (key + data)
    return this.buckets.size * 100;
  }

  /**
   * Clear all buckets
   */
  clear(): void {
    this.buckets.clear();
  }

  /**
   * Destroy the rate limiter and clean up
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}

// Singleton instance
let inMemoryLimiter: InMemoryRateLimiter | null = null;

/**
 * Get or create the in-memory rate limiter instance
 */
export function getInMemoryRateLimiter(): InMemoryRateLimiter {
  if (!inMemoryLimiter) {
    inMemoryLimiter = new InMemoryRateLimiter();
  }
  return inMemoryLimiter;
}

/**
 * Reset the in-memory rate limiter
 */
export function resetInMemoryRateLimiter(): void {
  if (inMemoryLimiter) {
    inMemoryLimiter.destroy();
    inMemoryLimiter = null;
  }
}
