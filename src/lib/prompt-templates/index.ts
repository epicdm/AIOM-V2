/**
 * AIOM Prompt Templates Library
 * Optimized prompt templates for AIOM use cases with caching for cost efficiency
 *
 * This library provides:
 * - Built-in optimized templates for briefing generation, query answering, summarization, etc.
 * - Template variable rendering with Handlebars-like syntax
 * - Multi-level caching (Anthropic prompt caching + in-memory caching)
 * - Usage tracking for cost optimization
 * - Full TypeScript support
 */

// =============================================================================
// Types
// =============================================================================

export type {
  // Category and status
  PromptTemplateCategory,
  PromptTemplateStatus,

  // Variable types
  TemplateVariable,
  TemplateVariableValues,

  // Template definition
  TemplateCachingConfig,
  TemplateTokenEstimate,
  PromptTemplate,

  // Rendered templates
  RenderedTemplate,

  // Usage tracking
  TemplateUsageStats,
  TemplateUsageRecord,

  // Registry types
  TemplateRegistryEntry,
  TemplateSearchFilters,
  TemplatePaginationOptions,

  // API response types
  TemplateExecutionResult,
  TemplateListResponse,

  // Database types
  PromptTemplateRecord,
  PromptTemplateUsageRecord,
} from "./types";

// =============================================================================
// Registry - Built-in Templates
// =============================================================================

export {
  // Built-in template constants
  BRIEFING_GENERATION_TEMPLATE,
  QUERY_ANSWERING_TEMPLATE,
  SUMMARIZATION_TEMPLATE,
  DATA_EXTRACTION_TEMPLATE,
  CONTENT_ANALYSIS_TEMPLATE,
  CALL_SUMMARY_TEMPLATE,

  // Template registry
  BUILT_IN_TEMPLATES,
  TEMPLATE_REGISTRY,

  // Registry functions
  getBuiltInTemplate,
  getAllBuiltInTemplates,
  getBuiltInTemplatesByCategory,
  searchBuiltInTemplates,
  toRegistryEntry,
} from "./registry";

// =============================================================================
// Caching - Template Rendering and Cache Management
// =============================================================================

export {
  // Constants
  DEFAULT_MEMORY_CACHE_TTL,
  MAX_CACHED_TEMPLATES_PER_USER,

  // Template rendering
  renderTemplate,
  validateVariables,
  applyDefaults,
  renderPromptTemplate,

  // Memory cache
  RenderedTemplateCache,
  getTemplateCache,
  resetTemplateCache,

  // Cached rendering
  getOrRenderTemplate,
  type RenderWithCacheOptions,

  // Cost estimation
  estimateCacheSavings,
  isCacheEligible,

  // Cache statistics
  getCacheStats,
  type TemplateCacheStats,
} from "./cache";

// =============================================================================
// Re-exports from Claude Library (for convenience)
// =============================================================================

export {
  // Caching thresholds
  CACHE_THRESHOLDS,
  CACHE_TTL_MS,

  // Token estimation
  approximateTokens,
  getMessageTokens,

  // Cache key generation
  generateCacheKey,

  // Cache statistics
  calculateCacheStats,
  type CacheStats,
} from "../claude";
