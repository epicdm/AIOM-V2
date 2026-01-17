/**
 * Claude Prompt Caching Utilities
 * Utilities for implementing Anthropic's prompt caching feature
 */

import type {
  CacheControl,
  CachedContent,
  SystemMessage,
  Message,
  ContentBlock,
  TextContent,
} from "./types";

// ============================================================================
// Constants
// ============================================================================

/**
 * Minimum tokens required for cache eligibility
 * Claude 3.5 Sonnet & Claude 3.5 Haiku: 1024 tokens
 * Claude 3 Opus: 2048 tokens
 */
export const CACHE_THRESHOLDS = {
  CLAUDE_4_SONNET: 1024,
  CLAUDE_3_7_SONNET: 1024,
  CLAUDE_3_5_SONNET: 1024,
  CLAUDE_3_5_HAIKU: 1024,
  CLAUDE_3_OPUS: 2048,
  CLAUDE_3_SONNET: 1024,
  CLAUDE_3_HAIKU: 1024,
} as const;

/**
 * Cache TTL (5 minutes as per Anthropic docs)
 */
export const CACHE_TTL_MS = 5 * 60 * 1000;

// ============================================================================
// Cache Control Helpers
// ============================================================================

/**
 * Create a cache control block
 */
export function createCacheControl(): CacheControl {
  return { type: "ephemeral" };
}

/**
 * Create cached text content
 */
export function createCachedContent(text: string): CachedContent {
  return {
    type: "text",
    text,
    cache_control: createCacheControl(),
  };
}

/**
 * Create a cached system message
 */
export function createCachedSystemMessage(text: string): SystemMessage {
  return {
    type: "text",
    text,
    cache_control: createCacheControl(),
  };
}

// ============================================================================
// System Prompt Caching
// ============================================================================

export interface CachedSystemPrompt {
  messages: SystemMessage[];
  approximateTokens: number;
}

/**
 * Create a system prompt with caching support
 * Splits long system prompts into cacheable chunks
 */
export function createCachedSystemPrompt(
  basePrompt: string,
  additionalContext?: string[]
): CachedSystemPrompt {
  const messages: SystemMessage[] = [];
  let totalTokens = 0;

  // Add base prompt with cache control
  const baseMessage: SystemMessage = {
    type: "text",
    text: basePrompt,
    cache_control: createCacheControl(),
  };
  messages.push(baseMessage);
  totalTokens += approximateTokens(basePrompt);

  // Add additional context without cache control (dynamic content)
  if (additionalContext) {
    for (const context of additionalContext) {
      messages.push({
        type: "text",
        text: context,
      });
      totalTokens += approximateTokens(context);
    }
  }

  return {
    messages,
    approximateTokens: totalTokens,
  };
}

// ============================================================================
// Conversation Caching
// ============================================================================

export interface CachedConversation {
  messages: Message[];
  cacheBreakpoints: number[];
  approximateTokens: number;
}

/**
 * Prepare a conversation for caching
 * Adds cache breakpoints at optimal positions
 */
export function prepareConversationForCaching(
  messages: Message[],
  options: {
    minTokensPerCache?: number;
    maxCacheBreakpoints?: number;
  } = {}
): CachedConversation {
  const minTokens = options.minTokensPerCache || 1024;
  const maxBreakpoints = options.maxCacheBreakpoints || 4;

  const result: Message[] = [];
  const cacheBreakpoints: number[] = [];
  let tokenCount = 0;
  let currentChunkTokens = 0;
  let breakpointCount = 0;

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    const messageTokens = getMessageTokens(message);
    currentChunkTokens += messageTokens;
    tokenCount += messageTokens;

    // Check if we should add a cache breakpoint
    const shouldAddBreakpoint =
      breakpointCount < maxBreakpoints &&
      currentChunkTokens >= minTokens &&
      i < messages.length - 1; // Don't cache the last message

    if (shouldAddBreakpoint) {
      // Add cache control to this message
      result.push(addCacheControlToMessage(message));
      cacheBreakpoints.push(i);
      currentChunkTokens = 0;
      breakpointCount++;
    } else {
      result.push(message);
    }
  }

  return {
    messages: result,
    cacheBreakpoints,
    approximateTokens: tokenCount,
  };
}

/**
 * Add cache control to the last content block of a message
 */
function addCacheControlToMessage(message: Message): Message {
  if (typeof message.content === "string") {
    return {
      ...message,
      content: [
        {
          type: "text",
          text: message.content,
          cache_control: createCacheControl(),
        } as CachedContent,
      ],
    };
  }

  const content = [...message.content];
  const lastIndex = content.length - 1;
  const lastBlock = content[lastIndex];

  if (lastBlock.type === "text") {
    content[lastIndex] = {
      ...lastBlock,
      cache_control: createCacheControl(),
    } as CachedContent;
  }

  return {
    ...message,
    content,
  };
}

// ============================================================================
// Tool Definition Caching
// ============================================================================

/**
 * Create a cacheable tools definition
 * Useful when using the same tools across multiple requests
 */
export function createCacheableToolsContext(
  toolDescriptions: string
): SystemMessage {
  return {
    type: "text",
    text: toolDescriptions,
    cache_control: createCacheControl(),
  };
}

// ============================================================================
// Cache Statistics
// ============================================================================

export interface CacheStats {
  cacheCreationTokens: number;
  cacheReadTokens: number;
  regularTokens: number;
  cacheSavings: number;
  cacheHitRate: number;
}

/**
 * Calculate cache statistics from usage data
 */
export function calculateCacheStats(usage: {
  input_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}): CacheStats {
  const cacheCreation = usage.cache_creation_input_tokens || 0;
  const cacheRead = usage.cache_read_input_tokens || 0;
  const total = usage.input_tokens;
  const regular = total - cacheCreation - cacheRead;

  // Cache read tokens cost 10% of regular tokens
  // Cache creation tokens cost 25% more than regular tokens
  const regularCost = regular;
  const cacheCreationCost = cacheCreation * 1.25;
  const cacheReadCost = cacheRead * 0.1;

  const actualCost = regularCost + cacheCreationCost + cacheReadCost;
  const fullCost = total; // What it would cost without caching

  const savings = fullCost > 0 ? ((fullCost - actualCost) / fullCost) * 100 : 0;
  const hitRate = cacheCreation + cacheRead > 0
    ? (cacheRead / (cacheCreation + cacheRead)) * 100
    : 0;

  return {
    cacheCreationTokens: cacheCreation,
    cacheReadTokens: cacheRead,
    regularTokens: regular,
    cacheSavings: Math.round(savings),
    cacheHitRate: Math.round(hitRate),
  };
}

// ============================================================================
// Token Estimation
// ============================================================================

/**
 * Approximate token count for a string
 * Note: This is a rough estimate. For accurate counts, use the tokenizer API.
 */
export function approximateTokens(text: string): number {
  // Rough approximation: ~4 characters per token for English
  // Slightly higher for code or special characters
  const hasCode = /[{}\[\]()<>]|function|const|let|var|class/.test(text);
  const charsPerToken = hasCode ? 3.5 : 4;
  return Math.ceil(text.length / charsPerToken);
}

/**
 * Get approximate token count for a message
 */
export function getMessageTokens(message: Message): number {
  if (typeof message.content === "string") {
    return approximateTokens(message.content) + 4; // Role overhead
  }

  let tokens = 4; // Role overhead
  for (const block of message.content) {
    if (block.type === "text") {
      tokens += approximateTokens((block as TextContent).text);
    } else if (block.type === "tool_use") {
      // Estimate tool use tokens
      tokens += 50 + approximateTokens(JSON.stringify(block));
    } else if (block.type === "tool_result") {
      // Estimate tool result tokens
      tokens += 20 + approximateTokens(JSON.stringify(block));
    } else if (block.type === "image") {
      // Images are approximately 1000-2000 tokens depending on size
      tokens += 1500;
    }
  }

  return tokens;
}

/**
 * Get total tokens for a conversation
 */
export function getConversationTokens(
  messages: Message[],
  systemPrompt?: string
): number {
  let tokens = 0;

  if (systemPrompt) {
    tokens += approximateTokens(systemPrompt) + 4;
  }

  for (const message of messages) {
    tokens += getMessageTokens(message);
  }

  return tokens;
}

// ============================================================================
// Cache Key Generation
// ============================================================================

/**
 * Generate a cache key for a system prompt
 * Useful for client-side caching of conversation contexts
 */
export function generateCacheKey(content: string): string {
  // Simple hash function for cache key generation
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `claude-cache-${Math.abs(hash).toString(16)}`;
}

// ============================================================================
// Cache Management
// ============================================================================

export interface CacheEntry<T> {
  data: T;
  createdAt: number;
  expiresAt: number;
}

/**
 * Simple in-memory cache for prompt caching metadata
 */
export class PromptCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private readonly ttlMs: number;

  constructor(ttlMs: number = CACHE_TTL_MS) {
    this.ttlMs = ttlMs;
  }

  /**
   * Get an entry from the cache
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.data;
  }

  /**
   * Set an entry in the cache
   */
  set(key: string, data: T): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      createdAt: now,
      expiresAt: now + this.ttlMs,
    });
  }

  /**
   * Delete an entry from the cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all entries from the cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get the number of entries in the cache
   */
  size(): number {
    this.cleanup();
    return this.cache.size;
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());
    for (const [key, entry] of entries) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}
