/**
 * Claude API Client Library
 * Re-exports all public APIs
 */

// Client
export {
  ClaudeClient,
  createClaudeClient,
  getClaudeClient,
  CLAUDE_MODELS,
} from "./client";

// Types
export type {
  // Core types
  MessageRole,
  Message,
  ContentBlock,
  TextContent,
  ImageContent,
  ToolUseContent,
  ToolResultContent,

  // Tool types
  Tool,
  ToolChoice,
  ToolInputSchema,

  // Request/Response types
  CreateMessageRequest,
  MessageResponse,
  Usage,

  // Streaming types
  StreamEvent,
  StreamCallbacks,
  MessageStartEvent,
  ContentBlockStartEvent,
  ContentBlockDeltaEvent,
  ContentBlockStopEvent,
  MessageDeltaEvent,
  MessageStopEvent,

  // Cache types
  CacheControl,
  CachedContent,
  SystemMessage,

  // Configuration types
  ClaudeClientConfig,
  ClaudeModel,
  RetryConfig,
  RateLimitInfo,

  // Conversation types
  Conversation,
  ConversationMessage,
} from "./types";

// Errors
export {
  ClaudeError,
  ClaudeAuthenticationError,
  ClaudeRateLimitError,
  ClaudeOverloadedError,
  ClaudeInvalidRequestError,
  ClaudeContextLengthError,
  ClaudeServerError,
  ClaudeNetworkError,
  ClaudeTimeoutError,
  ClaudeStreamError,
  createErrorFromResponse,
  isRetryableError,
  getRetryDelay,
  formatClaudeError,
  parseRateLimitHeaders,
  parseRetryAfter,
} from "./errors";

// Caching utilities
export {
  // Constants
  CACHE_THRESHOLDS,
  CACHE_TTL_MS,

  // Cache control helpers
  createCacheControl,
  createCachedContent,
  createCachedSystemMessage,

  // System prompt caching
  createCachedSystemPrompt,
  type CachedSystemPrompt,

  // Conversation caching
  prepareConversationForCaching,
  type CachedConversation,

  // Tools caching
  createCacheableToolsContext,

  // Statistics
  calculateCacheStats,
  type CacheStats,

  // Token estimation
  approximateTokens,
  getMessageTokens,
  getConversationTokens,

  // Cache key generation
  generateCacheKey,

  // Cache management
  PromptCache,
  type CacheEntry,
} from "./cache";
