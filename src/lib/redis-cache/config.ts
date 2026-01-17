/**
 * Redis Cache Configuration
 * Configuration management and environment variable handling
 */

import type { RedisConfig, TTLConfig } from './types';

// =============================================================================
// Environment Variables
// =============================================================================

/**
 * Get environment variable with fallback
 */
function getEnv(key: string, defaultValue?: string): string | undefined {
  // Try process.env first (server-side)
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] ?? defaultValue;
  }
  return defaultValue;
}

/**
 * Parse integer from environment variable
 */
function getEnvInt(key: string, defaultValue: number): number {
  const value = getEnv(key);
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Parse boolean from environment variable
 */
function getEnvBool(key: string, defaultValue: boolean): boolean {
  const value = getEnv(key);
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

// =============================================================================
// Default Configuration
// =============================================================================

/**
 * Default Redis configuration
 */
export const DEFAULT_REDIS_CONFIG: RedisConfig = {
  host: 'localhost',
  port: 6379,
  db: 0,
  connectTimeout: 5000,
  maxRetries: 3,
  retryDelay: 500,
  tls: false,
  keyPrefix: 'aiom:',
};

/**
 * Default TTL configuration (in seconds)
 */
export const DEFAULT_TTL_CONFIG: TTLConfig = {
  session: 3600,      // 1 hour
  odoo: 300,          // 5 minutes
  aiom: 600,          // 10 minutes
  feature: 60,        // 1 minute
  general: 300,       // 5 minutes
};

// =============================================================================
// Configuration Builders
// =============================================================================

/**
 * Build Redis configuration from environment variables
 */
export function buildRedisConfig(overrides?: Partial<RedisConfig>): RedisConfig {
  const envConfig: RedisConfig = {
    host: getEnv('REDIS_HOST', DEFAULT_REDIS_CONFIG.host)!,
    port: getEnvInt('REDIS_PORT', DEFAULT_REDIS_CONFIG.port),
    password: getEnv('REDIS_PASSWORD'),
    db: getEnvInt('REDIS_DB', DEFAULT_REDIS_CONFIG.db!),
    connectTimeout: getEnvInt('REDIS_CONNECT_TIMEOUT', DEFAULT_REDIS_CONFIG.connectTimeout!),
    maxRetries: getEnvInt('REDIS_MAX_RETRIES', DEFAULT_REDIS_CONFIG.maxRetries!),
    retryDelay: getEnvInt('REDIS_RETRY_DELAY', DEFAULT_REDIS_CONFIG.retryDelay!),
    tls: getEnvBool('REDIS_TLS', DEFAULT_REDIS_CONFIG.tls!),
    keyPrefix: getEnv('REDIS_KEY_PREFIX', DEFAULT_REDIS_CONFIG.keyPrefix),
  };

  return {
    ...envConfig,
    ...overrides,
  };
}

/**
 * Build TTL configuration from environment variables
 */
export function buildTTLConfig(overrides?: Partial<TTLConfig>): TTLConfig {
  const envConfig: TTLConfig = {
    session: getEnvInt('REDIS_TTL_SESSION', DEFAULT_TTL_CONFIG.session),
    odoo: getEnvInt('REDIS_TTL_ODOO', DEFAULT_TTL_CONFIG.odoo),
    aiom: getEnvInt('REDIS_TTL_AIOM', DEFAULT_TTL_CONFIG.aiom),
    feature: getEnvInt('REDIS_TTL_FEATURE', DEFAULT_TTL_CONFIG.feature),
    general: getEnvInt('REDIS_TTL_GENERAL', DEFAULT_TTL_CONFIG.general),
  };

  return {
    ...envConfig,
    ...overrides,
  };
}

// =============================================================================
// Validation
// =============================================================================

/**
 * Validate Redis configuration
 */
export function validateRedisConfig(config: RedisConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.host || config.host.trim() === '') {
    errors.push('Redis host is required');
  }

  if (config.port < 1 || config.port > 65535) {
    errors.push('Redis port must be between 1 and 65535');
  }

  if (config.db !== undefined && (config.db < 0 || config.db > 15)) {
    errors.push('Redis database number must be between 0 and 15');
  }

  if (config.connectTimeout !== undefined && config.connectTimeout < 0) {
    errors.push('Connect timeout must be a positive number');
  }

  if (config.maxRetries !== undefined && config.maxRetries < 0) {
    errors.push('Max retries must be a non-negative number');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate TTL configuration
 */
export function validateTTLConfig(config: TTLConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const [key, value] of Object.entries(config)) {
    if (typeof value !== 'number' || value < 0) {
      errors.push(`TTL for ${key} must be a non-negative number`);
    }
    // Warn if TTL is too short or too long
    if (value > 86400 * 7) {
      errors.push(`TTL for ${key} is very long (>7 days). Consider a shorter TTL.`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// =============================================================================
// Redis URL Builder
// =============================================================================

/**
 * Build Redis connection URL from configuration
 */
export function buildRedisUrl(config: RedisConfig): string {
  const protocol = config.tls ? 'rediss' : 'redis';
  const auth = config.password ? `:${config.password}@` : '';
  const db = config.db ? `/${config.db}` : '';

  return `${protocol}://${auth}${config.host}:${config.port}${db}`;
}

/**
 * Parse Redis URL into configuration
 */
export function parseRedisUrl(url: string): Partial<RedisConfig> {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parseInt(parsed.port, 10) || 6379,
      password: parsed.password || undefined,
      db: parsed.pathname ? parseInt(parsed.pathname.slice(1), 10) : 0,
      tls: parsed.protocol === 'rediss:',
    };
  } catch {
    return {};
  }
}

// =============================================================================
// Feature Flags
// =============================================================================

/**
 * Check if Redis caching is enabled
 */
export function isRedisCacheEnabled(): boolean {
  return getEnvBool('REDIS_CACHE_ENABLED', true);
}

/**
 * Check if Redis is available for the current environment
 */
export function isRedisConfigured(): boolean {
  const host = getEnv('REDIS_HOST');
  return host !== undefined && host.trim() !== '';
}

/**
 * Get cache enabled status for specific namespace
 */
export function isCacheEnabledForNamespace(namespace: string): boolean {
  const envKey = `REDIS_CACHE_${namespace.toUpperCase()}_ENABLED`;
  return getEnvBool(envKey, true);
}
