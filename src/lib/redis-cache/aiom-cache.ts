/**
 * AIOM Response Cache Wrapper
 * Specialized caching for AIOM Claude API responses with TTL management
 */

import type {
  AiomCacheEntry,
  CacheOptions,
  CacheResult,
  AiomKeyParams,
} from './types';
import { getRedisCache } from './client';
import { createHash } from 'crypto';

// =============================================================================
// Constants
// =============================================================================

const NAMESPACE = 'aiom' as const;

// Maximum response size to cache (in characters)
const MAX_CACHEABLE_RESPONSE_SIZE = 100000; // 100KB

// Minimum response length to consider for caching
const MIN_CACHEABLE_RESPONSE_SIZE = 50;

// =============================================================================
// Key Builders
// =============================================================================

/**
 * Generate a hash of the prompt for caching
 */
export function hashPrompt(
  systemPrompt: string,
  userPrompt: string,
  context?: string
): string {
  const combined = [systemPrompt, userPrompt, context || ''].join('|');
  return createHash('sha256').update(combined).digest('hex');
}

/**
 * Build a cache key for AIOM response
 */
export function buildAiomKey(params: AiomKeyParams): string {
  const parts = [params.userId, params.promptHash];

  if (params.model) {
    parts.push(params.model);
  }

  return parts.join(':');
}

/**
 * Build a cache key pattern for user's cached responses
 */
export function buildUserAiomPattern(userId: string): string {
  return `${userId}:*`;
}

// =============================================================================
// AIOM Cache Operations
// =============================================================================

/**
 * Get cached AIOM response
 */
export async function getAiomCache(
  userId: string,
  promptHash: string,
  model?: string
): Promise<CacheResult<AiomCacheEntry>> {
  const cache = getRedisCache();
  const key = buildAiomKey({ userId, promptHash, model });
  return cache.get<AiomCacheEntry>(key, NAMESPACE);
}

/**
 * Cache AIOM response
 */
export async function setAiomCache(
  userId: string,
  promptHash: string,
  response: string,
  options: Omit<CacheOptions, 'namespace'> & {
    model?: string;
    tokenUsage?: {
      inputTokens: number;
      outputTokens: number;
    };
    toolsUsed?: string[];
  } = {}
): Promise<CacheResult<AiomCacheEntry>> {
  // Check if response is too large to cache
  if (response.length > MAX_CACHEABLE_RESPONSE_SIZE) {
    return {
      success: false,
      fromCache: false,
      error: 'Response too large to cache',
    };
  }

  // Check if response is too small to bother caching
  if (response.length < MIN_CACHEABLE_RESPONSE_SIZE) {
    return {
      success: false,
      fromCache: false,
      error: 'Response too small to cache',
    };
  }

  const cache = getRedisCache();

  const entry: AiomCacheEntry = {
    userId,
    promptHash,
    response,
    tokenUsage: options.tokenUsage,
    model: options.model,
    toolsUsed: options.toolsUsed,
  };

  const key = buildAiomKey({ userId, promptHash, model: options.model });

  return cache.set<AiomCacheEntry>(key, entry, {
    ...options,
    namespace: NAMESPACE,
    tags: [
      `user:${userId}`,
      options.model ? `model:${options.model}` : '',
      ...(options.tags || []),
    ].filter(Boolean),
  });
}

/**
 * Delete cached AIOM response
 */
export async function deleteAiomCache(
  userId: string,
  promptHash: string,
  model?: string
): Promise<boolean> {
  const cache = getRedisCache();
  const key = buildAiomKey({ userId, promptHash, model });
  return cache.delete(key, NAMESPACE);
}

/**
 * Check if AIOM response is cached
 */
export async function hasAiomCache(
  userId: string,
  promptHash: string,
  model?: string
): Promise<boolean> {
  const cache = getRedisCache();
  const key = buildAiomKey({ userId, promptHash, model });
  return cache.exists(key, NAMESPACE);
}

// =============================================================================
// Invalidation Operations
// =============================================================================

/**
 * Invalidate all cached responses for a user
 */
export async function invalidateUserResponses(userId: string): Promise<number> {
  const cache = getRedisCache();
  return cache.invalidateByTag(`user:${userId}`);
}

/**
 * Invalidate all cached responses for a model
 */
export async function invalidateModelResponses(model: string): Promise<number> {
  const cache = getRedisCache();
  return cache.invalidateByTag(`model:${model}`);
}

/**
 * Invalidate all AIOM cache entries
 */
export async function invalidateAllAiom(): Promise<number> {
  const cache = getRedisCache();
  return cache.invalidateNamespace(NAMESPACE);
}

// =============================================================================
// Cache-Aside Pattern Implementation
// =============================================================================

/**
 * Options for getting or generating AIOM response
 */
export interface GetOrGenerateOptions extends Omit<CacheOptions, 'namespace'> {
  model?: string;
  /** Context to include in hash (e.g., conversation history) */
  context?: string;
  /** Enable caching for this request (default: true) */
  enableCaching?: boolean;
}

/**
 * Result of getting or generating AIOM response
 */
export interface AiomResponseResult {
  response: string;
  fromCache: boolean;
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
  };
  tokensSaved?: number;
}

/**
 * Get or generate AIOM response with automatic caching
 */
export async function getOrGenerateAiomResponse(
  userId: string,
  systemPrompt: string,
  userPrompt: string,
  generator: () => Promise<{
    response: string;
    tokenUsage?: {
      inputTokens: number;
      outputTokens: number;
    };
    toolsUsed?: string[];
  }>,
  options: GetOrGenerateOptions = {}
): Promise<AiomResponseResult> {
  const enableCaching = options.enableCaching !== false;
  const promptHash = hashPrompt(systemPrompt, userPrompt, options.context);

  // Try cache first if caching is enabled and not skipping
  if (enableCaching && !options.skipCache) {
    const cached = await getAiomCache(userId, promptHash, options.model);

    if (cached.success && cached.data) {
      return {
        response: cached.data.response,
        fromCache: true,
        tokenUsage: cached.data.tokenUsage,
        tokensSaved: cached.data.tokenUsage
          ? cached.data.tokenUsage.inputTokens + cached.data.tokenUsage.outputTokens
          : undefined,
      };
    }
  }

  // Generate fresh response
  const result = await generator();

  // Cache the result if caching is enabled
  if (enableCaching && !options.forceUpdate) {
    setAiomCache(userId, promptHash, result.response, {
      ...options,
      tokenUsage: result.tokenUsage,
      toolsUsed: result.toolsUsed,
    }).catch((err) => {
      console.error('Failed to cache AIOM response:', err);
    });
  }

  return {
    response: result.response,
    fromCache: false,
    tokenUsage: result.tokenUsage,
  };
}

// =============================================================================
// Semantic Caching Helpers
// =============================================================================

/**
 * Check if two prompts are semantically similar enough to share cache
 * This is a simple implementation - in production, you might use embeddings
 */
export function arePromptsSimilar(
  prompt1: string,
  prompt2: string,
  threshold: number = 0.9
): boolean {
  // Normalize prompts
  const normalize = (s: string) =>
    s.toLowerCase().replace(/\s+/g, ' ').trim();

  const p1 = normalize(prompt1);
  const p2 = normalize(prompt2);

  // Calculate simple Jaccard similarity on words
  const words1 = new Set(p1.split(' '));
  const words2 = new Set(p2.split(' '));

  const words1Arr = Array.from(words1);
  const words2Arr = Array.from(words2);

  const intersection = new Set(words1Arr.filter((x) => words2.has(x)));
  const union = new Set(words1Arr.concat(words2Arr));

  const similarity = intersection.size / union.size;
  return similarity >= threshold;
}

/**
 * Generate a normalized prompt hash for semantic caching
 */
export function generateSemanticHash(prompt: string): string {
  // Normalize the prompt before hashing
  const normalized = prompt
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim();

  return createHash('md5').update(normalized).digest('hex');
}

// =============================================================================
// Cache Statistics and Analytics
// =============================================================================

/**
 * Get AIOM cache statistics
 */
export async function getAiomCacheStats(): Promise<{
  totalEntries: number;
  userStats: Map<string, number>;
  modelStats: Map<string, number>;
  estimatedTokensSaved: number;
}> {
  const cache = getRedisCache();
  const client = cache.getClient();

  if (!client) {
    return {
      totalEntries: 0,
      userStats: new Map(),
      modelStats: new Map(),
      estimatedTokensSaved: 0,
    };
  }

  try {
    const pattern = `${cache.getConfig().keyPrefix}${NAMESPACE}:*`;
    const keys = await client.keys(pattern);

    const userStats = new Map<string, number>();
    const modelStats = new Map<string, number>();
    let estimatedTokensSaved = 0;

    // Process keys to extract stats
    for (const key of keys) {
      const parts = key.split(':');
      if (parts.length >= 3) {
        const userId = parts[2];
        userStats.set(userId, (userStats.get(userId) || 0) + 1);

        // Try to get model from cached entry
        try {
          const value = await client.get(key);
          if (value) {
            const entry: AiomCacheEntry = JSON.parse(value);
            if (entry.model) {
              modelStats.set(entry.model, (modelStats.get(entry.model) || 0) + 1);
            }
            if (entry.tokenUsage) {
              estimatedTokensSaved +=
                entry.tokenUsage.inputTokens + entry.tokenUsage.outputTokens;
            }
          }
        } catch {
          // Ignore parsing errors for stats
        }
      }
    }

    return {
      totalEntries: keys.length,
      userStats,
      modelStats,
      estimatedTokensSaved,
    };
  } catch (error) {
    console.error('Failed to get AIOM cache stats:', error);
    return {
      totalEntries: 0,
      userStats: new Map(),
      modelStats: new Map(),
      estimatedTokensSaved: 0,
    };
  }
}

/**
 * Calculate estimated cost savings from cache
 */
export function calculateCostSavings(
  tokensSaved: number,
  costPerMillionInputTokens: number = 3.0,
  costPerMillionOutputTokens: number = 15.0,
  inputOutputRatio: number = 0.3
): number {
  const inputTokens = tokensSaved * inputOutputRatio;
  const outputTokens = tokensSaved * (1 - inputOutputRatio);

  const inputCost = (inputTokens / 1_000_000) * costPerMillionInputTokens;
  const outputCost = (outputTokens / 1_000_000) * costPerMillionOutputTokens;

  return inputCost + outputCost;
}

// =============================================================================
// Conversation History Caching
// =============================================================================

/**
 * Cache entry for conversation history
 */
export interface ConversationHistoryEntry {
  userId: string;
  conversationId: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
  }>;
  lastUpdated: number;
}

/**
 * Get cached conversation history
 */
export async function getConversationHistory(
  userId: string,
  conversationId: string
): Promise<CacheResult<ConversationHistoryEntry>> {
  const cache = getRedisCache();
  const key = `conv:${userId}:${conversationId}`;
  return cache.get<ConversationHistoryEntry>(key, NAMESPACE);
}

/**
 * Cache conversation history
 */
export async function setConversationHistory(
  entry: ConversationHistoryEntry,
  options: Omit<CacheOptions, 'namespace'> = {}
): Promise<CacheResult<ConversationHistoryEntry>> {
  const cache = getRedisCache();
  const key = `conv:${entry.userId}:${entry.conversationId}`;

  // Use longer TTL for conversation history
  const ttlConfig = cache.getTTLConfig();
  const ttl = options.ttl || ttlConfig.aiom * 2;

  return cache.set<ConversationHistoryEntry>(key, entry, {
    ...options,
    ttl,
    namespace: NAMESPACE,
    tags: [`user:${entry.userId}`, `conv:${entry.conversationId}`],
  });
}

/**
 * Append message to conversation history
 */
export async function appendToConversation(
  userId: string,
  conversationId: string,
  message: {
    role: 'user' | 'assistant';
    content: string;
  }
): Promise<boolean> {
  const existing = await getConversationHistory(userId, conversationId);

  const entry: ConversationHistoryEntry = existing.data || {
    userId,
    conversationId,
    messages: [],
    lastUpdated: Date.now(),
  };

  entry.messages.push({
    ...message,
    timestamp: Date.now(),
  });
  entry.lastUpdated = Date.now();

  const result = await setConversationHistory(entry);
  return result.success;
}

/**
 * Delete conversation history
 */
export async function deleteConversationHistory(
  userId: string,
  conversationId: string
): Promise<boolean> {
  const cache = getRedisCache();
  const key = `conv:${userId}:${conversationId}`;
  return cache.delete(key, NAMESPACE);
}
