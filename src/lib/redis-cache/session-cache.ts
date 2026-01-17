/**
 * Session Cache Wrapper
 * Specialized caching for user sessions with TTL management
 */

import type {
  SessionCacheEntry,
  CacheOptions,
  CacheResult,
  SessionKeyParams,
} from './types';
import { getRedisCache } from './client';
import { createHash } from 'crypto';

// =============================================================================
// Constants
// =============================================================================

const NAMESPACE = 'session' as const;

// =============================================================================
// Key Builders
// =============================================================================

/**
 * Build a cache key for session data
 */
export function buildSessionKey(params: SessionKeyParams): string {
  if (params.sessionId) {
    return `${params.userId}:${params.sessionId}`;
  }
  return params.userId;
}

/**
 * Build a cache key for user's all sessions
 */
export function buildUserSessionsKey(userId: string): string {
  return `${userId}:sessions`;
}

/**
 * Hash a token for secure storage
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// =============================================================================
// Session Cache Operations
// =============================================================================

/**
 * Get cached session data
 */
export async function getSession(
  userId: string,
  sessionId?: string
): Promise<CacheResult<SessionCacheEntry>> {
  const cache = getRedisCache();
  const key = buildSessionKey({ userId, sessionId });
  return cache.get<SessionCacheEntry>(key, NAMESPACE);
}

/**
 * Cache session data
 */
export async function setSession(
  userId: string,
  sessionData: Omit<SessionCacheEntry, 'userId' | 'lastActivity'>,
  options: Omit<CacheOptions, 'namespace'> = {}
): Promise<CacheResult<SessionCacheEntry>> {
  const cache = getRedisCache();

  const entry: SessionCacheEntry = {
    ...sessionData,
    userId,
    lastActivity: Date.now(),
  };

  const key = buildSessionKey({ userId, sessionId: sessionData.tokenHash });

  const result = await cache.set<SessionCacheEntry>(key, entry, {
    ...options,
    namespace: NAMESPACE,
    tags: [`user:${userId}`, ...(options.tags || [])],
  });

  // Also add to user's session list
  if (result.success && sessionData.tokenHash) {
    await addToUserSessions(userId, sessionData.tokenHash);
  }

  return result;
}

/**
 * Update session last activity timestamp
 */
export async function touchSession(
  userId: string,
  sessionId?: string
): Promise<boolean> {
  const cache = getRedisCache();
  const key = buildSessionKey({ userId, sessionId });

  // Get existing session
  const existing = await cache.get<SessionCacheEntry>(key, NAMESPACE);
  if (!existing.success || !existing.data) {
    return false;
  }

  // Update last activity
  const updated: SessionCacheEntry = {
    ...existing.data,
    lastActivity: Date.now(),
  };

  // Re-set with default TTL
  const result = await cache.set(key, updated, { namespace: NAMESPACE });
  return result.success;
}

/**
 * Delete session from cache
 */
export async function deleteSession(
  userId: string,
  sessionId?: string
): Promise<boolean> {
  const cache = getRedisCache();
  const key = buildSessionKey({ userId, sessionId });
  const deleted = await cache.delete(key, NAMESPACE);

  // Also remove from user's session list
  if (deleted && sessionId) {
    await removeFromUserSessions(userId, sessionId);
  }

  return deleted;
}

/**
 * Check if session exists in cache
 */
export async function hasSession(
  userId: string,
  sessionId?: string
): Promise<boolean> {
  const cache = getRedisCache();
  const key = buildSessionKey({ userId, sessionId });
  return cache.exists(key, NAMESPACE);
}

/**
 * Invalidate all sessions for a user
 */
export async function invalidateUserSessions(userId: string): Promise<number> {
  const cache = getRedisCache();
  return cache.invalidateByTag(`user:${userId}`);
}

/**
 * Extend session TTL
 */
export async function extendSessionTTL(
  userId: string,
  sessionId: string | undefined,
  ttl: number
): Promise<boolean> {
  const cache = getRedisCache();
  const key = buildSessionKey({ userId, sessionId });
  return cache.updateTTL(key, ttl, NAMESPACE);
}

/**
 * Get session TTL remaining
 */
export async function getSessionTTL(
  userId: string,
  sessionId?: string
): Promise<number | null> {
  const cache = getRedisCache();
  const key = buildSessionKey({ userId, sessionId });
  return cache.getTTL(key, NAMESPACE);
}

// =============================================================================
// User Sessions List
// =============================================================================

/**
 * Add session to user's session list
 */
async function addToUserSessions(
  userId: string,
  sessionId: string
): Promise<void> {
  const cache = getRedisCache();
  const client = cache.getClient();
  if (!client) return;

  try {
    const key = buildUserSessionsKey(userId);
    await client.sadd(key, sessionId);
    // Set TTL same as session TTL
    const ttlConfig = cache.getTTLConfig();
    await client.expire(key, ttlConfig.session);
  } catch (error) {
    console.error('Failed to add session to user sessions:', error);
  }
}

/**
 * Remove session from user's session list
 */
async function removeFromUserSessions(
  userId: string,
  sessionId: string
): Promise<void> {
  const cache = getRedisCache();
  const client = cache.getClient();
  if (!client) return;

  try {
    const key = buildUserSessionsKey(userId);
    await client.srem(key, sessionId);
  } catch (error) {
    console.error('Failed to remove session from user sessions:', error);
  }
}

/**
 * Get all session IDs for a user
 */
export async function getUserSessionIds(userId: string): Promise<string[]> {
  const cache = getRedisCache();
  const client = cache.getClient();
  if (!client) return [];

  try {
    const key = buildUserSessionsKey(userId);
    return await client.smembers(key);
  } catch (error) {
    console.error('Failed to get user sessions:', error);
    return [];
  }
}

/**
 * Get count of active sessions for a user
 */
export async function getUserSessionCount(userId: string): Promise<number> {
  const cache = getRedisCache();
  const client = cache.getClient();
  if (!client) return 0;

  try {
    const key = buildUserSessionsKey(userId);
    return await client.scard(key);
  } catch (error) {
    console.error('Failed to get user session count:', error);
    return 0;
  }
}

// =============================================================================
// Session Cache with Automatic Fallback
// =============================================================================

/**
 * Get or fetch session data with automatic caching
 */
export async function getOrFetchSession<T extends SessionCacheEntry>(
  userId: string,
  sessionId: string | undefined,
  fetcher: () => Promise<T | null>,
  options: Omit<CacheOptions, 'namespace'> = {}
): Promise<{ data: T | null; fromCache: boolean }> {
  // Try cache first
  if (!options.skipCache) {
    const cached = await getSession(userId, sessionId);
    if (cached.success && cached.data) {
      // Update last activity
      await touchSession(userId, sessionId);
      return { data: cached.data as T, fromCache: true };
    }
  }

  // Fetch fresh data
  const freshData = await fetcher();
  if (freshData === null) {
    return { data: null, fromCache: false };
  }

  // Cache the result
  await setSession(userId, {
    ...freshData,
    tokenHash: sessionId,
  }, options);

  return { data: freshData, fromCache: false };
}

// =============================================================================
// Session Validation
// =============================================================================

/**
 * Validate session is not expired and active
 */
export async function validateSession(
  userId: string,
  sessionId?: string
): Promise<{ valid: boolean; session?: SessionCacheEntry; reason?: string }> {
  const result = await getSession(userId, sessionId);

  if (!result.success) {
    return { valid: false, reason: 'Cache error' };
  }

  if (!result.data) {
    return { valid: false, reason: 'Session not found' };
  }

  const session = result.data;

  // Check if session is still active (not stale)
  const ttlConfig = getRedisCache().getTTLConfig();
  const maxInactivity = ttlConfig.session * 1000; // Convert to milliseconds
  const inactiveTime = Date.now() - session.lastActivity;

  if (inactiveTime > maxInactivity) {
    // Session is stale, delete it
    await deleteSession(userId, sessionId);
    return { valid: false, reason: 'Session expired due to inactivity' };
  }

  return { valid: true, session };
}

// =============================================================================
// Bulk Session Operations
// =============================================================================

/**
 * Get multiple sessions by user IDs
 */
export async function getSessionsByUserIds(
  userIds: string[]
): Promise<Map<string, SessionCacheEntry | null>> {
  const cache = getRedisCache();
  return cache.mget<SessionCacheEntry>(
    userIds.map(id => buildSessionKey({ userId: id })),
    NAMESPACE
  );
}

/**
 * Delete sessions for multiple users
 */
export async function deleteSessionsByUserIds(userIds: string[]): Promise<number> {
  const cache = getRedisCache();
  return cache.mdelete(
    userIds.map(id => buildSessionKey({ userId: id })),
    NAMESPACE
  );
}
