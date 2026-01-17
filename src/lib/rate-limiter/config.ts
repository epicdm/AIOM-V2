/**
 * Rate Limiter Configuration
 * Default configurations and presets for rate limiting
 */

import type { RateLimitRule, RateLimiterConfig, RateLimitPreset } from './types';

// =============================================================================
// Default Configuration
// =============================================================================

/**
 * Default rate limit rule (100 requests per minute)
 */
export const DEFAULT_RATE_LIMIT_RULE: RateLimitRule = {
  maxTokens: 100,
  windowSeconds: 60,
  refillRate: 100,
};

/**
 * Default rate limiter configuration
 */
export const DEFAULT_RATE_LIMITER_CONFIG: RateLimiterConfig = {
  enabled: true,
  keyPrefix: 'ratelimit:',
  defaultRule: DEFAULT_RATE_LIMIT_RULE,
  rules: {},
  identifierHeaders: [
    'x-forwarded-for',
    'x-real-ip',
    'cf-connecting-ip',
    'x-client-ip',
  ],
};

// =============================================================================
// Preset Rules
// =============================================================================

/**
 * Predefined rate limit rules for common scenarios
 */
export const RATE_LIMIT_PRESETS: Record<RateLimitPreset, RateLimitRule> = {
  /**
   * Authentication endpoints - 10 requests per minute
   * Protects against brute force login attempts
   */
  auth: {
    maxTokens: 10,
    windowSeconds: 60,
    refillRate: 10,
  },

  /**
   * OTP endpoints - 3 requests per minute
   * Prevents OTP spam and abuse
   */
  otp: {
    maxTokens: 3,
    windowSeconds: 60,
    refillRate: 3,
  },

  /**
   * Transfer/financial endpoints - 5 requests per minute
   * Protects sensitive financial operations
   */
  transfer: {
    maxTokens: 5,
    windowSeconds: 60,
    refillRate: 5,
  },

  /**
   * General API endpoints - 100 requests per minute
   * Standard API rate limiting
   */
  api: {
    maxTokens: 100,
    windowSeconds: 60,
    refillRate: 100,
  },

  /**
   * Strict rate limiting - 1 request per minute
   * For highly sensitive operations
   */
  strict: {
    maxTokens: 1,
    windowSeconds: 60,
    refillRate: 1,
  },
};

// =============================================================================
// Rule Resolution
// =============================================================================

/**
 * Get a rate limit rule from preset name or return the rule itself
 */
export function resolveRateLimitRule(
  ruleOrPreset: RateLimitRule | RateLimitPreset
): RateLimitRule {
  if (typeof ruleOrPreset === 'string') {
    const preset = RATE_LIMIT_PRESETS[ruleOrPreset];
    if (!preset) {
      console.warn(`Unknown rate limit preset: ${ruleOrPreset}, using default`);
      return DEFAULT_RATE_LIMIT_RULE;
    }
    return preset;
  }
  return ruleOrPreset;
}

// =============================================================================
// Configuration Builders
// =============================================================================

/**
 * Build rate limiter configuration with custom overrides
 */
export function buildRateLimiterConfig(
  overrides?: Partial<RateLimiterConfig>
): RateLimiterConfig {
  return {
    ...DEFAULT_RATE_LIMITER_CONFIG,
    ...overrides,
    rules: {
      ...DEFAULT_RATE_LIMITER_CONFIG.rules,
      ...overrides?.rules,
    },
  };
}

/**
 * Create a custom rate limit rule
 */
export function createRateLimitRule(
  maxTokens: number,
  windowSeconds: number,
  options?: Partial<Omit<RateLimitRule, 'maxTokens' | 'windowSeconds'>>
): RateLimitRule {
  return {
    maxTokens,
    windowSeconds,
    refillRate: options?.refillRate ?? maxTokens,
    ...options,
  };
}

// =============================================================================
// Environment Configuration
// =============================================================================

/**
 * Check if rate limiting is enabled
 */
export function isRateLimitingEnabled(): boolean {
  const envValue = process.env.RATE_LIMITING_ENABLED;
  if (envValue === undefined) {
    return true; // Enabled by default
  }
  return envValue.toLowerCase() === 'true' || envValue === '1';
}

/**
 * Get rate limiter key prefix from environment
 */
export function getRateLimitKeyPrefix(): string {
  return process.env.RATE_LIMIT_KEY_PREFIX || 'ratelimit:';
}
