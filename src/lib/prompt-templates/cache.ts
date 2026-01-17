/**
 * AIOM Prompt Templates Caching System
 * Implements multi-level caching for prompt templates
 */

import {
  createCacheControl,
  createCachedContent,
  createCachedSystemMessage,
  approximateTokens,
  generateCacheKey,
  PromptCache,
  CACHE_TTL_MS,
  CACHE_THRESHOLDS,
  type CacheStats,
} from "../claude";
import type { SystemMessage } from "../claude";
import type {
  PromptTemplate,
  RenderedTemplate,
  TemplateVariableValues,
  TemplateCachingConfig,
} from "./types";

// ============================================================================
// Constants
// ============================================================================

/**
 * Default memory cache TTL (5 minutes)
 */
export const DEFAULT_MEMORY_CACHE_TTL = CACHE_TTL_MS;

/**
 * Maximum number of cached templates per user
 */
export const MAX_CACHED_TEMPLATES_PER_USER = 50;

// ============================================================================
// Template Rendering
// ============================================================================

/**
 * Render a template by replacing variables with values
 * Supports Handlebars-like syntax: {{variable}}, {{#if}}, {{#each}}
 */
export function renderTemplate(
  templateString: string,
  variables: TemplateVariableValues
): string {
  let result = templateString;

  // Handle {{#if variable}}...{{/if}} blocks
  result = result.replace(
    /\{\{#if\s+(\w+(?:\.\w+)*)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_, varPath, content) => {
      const value = getNestedValue(variables, varPath);
      if (value && (Array.isArray(value) ? value.length > 0 : true)) {
        return renderTemplate(content, variables);
      }
      return "";
    }
  );

  // Handle {{#each variable}}...{{/each}} blocks
  result = result.replace(
    /\{\{#each\s+(\w+(?:\.\w+)*)\}\}([\s\S]*?)\{\{\/each\}\}/g,
    (_, varPath, content) => {
      const value = getNestedValue(variables, varPath);
      if (Array.isArray(value)) {
        return value
          .map((item, index) => {
            const itemVars = {
              ...variables,
              this: item,
              "@index": index,
              "@first": index === 0,
              "@last": index === value.length - 1,
            };
            return renderTemplate(content, itemVars);
          })
          .join("");
      }
      return "";
    }
  );

  // Handle simple {{variable}} and {{variable.nested}} replacements
  result = result.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, varPath) => {
    const value = getNestedValue(variables, varPath);
    if (value === undefined || value === null) {
      return "";
    }
    if (typeof value === "object") {
      return JSON.stringify(value);
    }
    return String(value);
  });

  return result;
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split(".");
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current === "object") {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }

  return current;
}

/**
 * Validate variable values against template variable definitions
 */
export function validateVariables(
  template: PromptTemplate,
  values: TemplateVariableValues
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const variable of template.variables) {
    const value = values[variable.name];

    // Check required variables
    if (variable.required && (value === undefined || value === null)) {
      if (variable.defaultValue === undefined) {
        errors.push(`Required variable '${variable.name}' is missing`);
      }
    }

    // Type validation (basic)
    if (value !== undefined && value !== null) {
      const actualType = Array.isArray(value)
        ? "array"
        : typeof value === "object"
        ? "object"
        : typeof value;

      // Allow some type coercion
      const compatibleTypes: Record<string, string[]> = {
        string: ["string", "number"],
        number: ["number", "string"],
        boolean: ["boolean"],
        array: ["array"],
        object: ["object"],
        date: ["string", "object"],
      };

      if (!compatibleTypes[variable.type]?.includes(actualType)) {
        errors.push(
          `Variable '${variable.name}' has invalid type. Expected ${variable.type}, got ${actualType}`
        );
      }
    }

    // Pattern validation for strings
    if (
      variable.validation &&
      typeof value === "string"
    ) {
      const pattern = new RegExp(variable.validation);
      if (!pattern.test(value)) {
        errors.push(
          `Variable '${variable.name}' does not match validation pattern`
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Apply default values to variables
 */
export function applyDefaults(
  template: PromptTemplate,
  values: TemplateVariableValues
): TemplateVariableValues {
  const result = { ...values };

  for (const variable of template.variables) {
    if (
      result[variable.name] === undefined &&
      variable.defaultValue !== undefined
    ) {
      result[variable.name] = variable.defaultValue;
    }
  }

  return result;
}

// ============================================================================
// Rendered Template Generation
// ============================================================================

/**
 * Render a template with variable values
 */
export function renderPromptTemplate(
  template: PromptTemplate,
  variableValues: TemplateVariableValues
): RenderedTemplate {
  // Apply defaults
  const values = applyDefaults(template, variableValues);

  // Render the system prompt
  const renderedSystemPrompt = renderTemplate(template.systemPrompt, values);

  // Create system messages with caching if enabled
  const systemMessages: SystemMessage[] = [];

  if (template.caching.enablePromptCaching) {
    // Check if rendered prompt meets caching threshold
    const tokenCount = approximateTokens(renderedSystemPrompt);
    const threshold = template.caching.minTokensForCaching || CACHE_THRESHOLDS.CLAUDE_3_5_SONNET;

    if (tokenCount >= threshold) {
      // Add with cache control
      systemMessages.push(createCachedSystemMessage(renderedSystemPrompt));
    } else {
      // Add without cache control (below threshold)
      systemMessages.push({
        type: "text",
        text: renderedSystemPrompt,
      });
    }
  } else {
    systemMessages.push({
      type: "text",
      text: renderedSystemPrompt,
    });
  }

  // Render optional user prompt parts
  const renderedUserPrefix = template.userPromptPrefix
    ? renderTemplate(template.userPromptPrefix, values)
    : undefined;
  const renderedUserSuffix = template.userPromptSuffix
    ? renderTemplate(template.userPromptSuffix, values)
    : undefined;

  // Generate cache key
  const cacheKeyContent = JSON.stringify({
    templateId: template.id,
    version: template.version,
    values,
  });
  const cacheKey = generateCacheKey(cacheKeyContent);

  // Calculate approximate tokens
  let totalTokens = approximateTokens(renderedSystemPrompt);
  if (renderedUserPrefix) {
    totalTokens += approximateTokens(renderedUserPrefix);
  }
  if (renderedUserSuffix) {
    totalTokens += approximateTokens(renderedUserSuffix);
  }

  return {
    templateId: template.id,
    systemPrompt: renderedSystemPrompt,
    systemMessages,
    userPromptPrefix: renderedUserPrefix,
    userPromptSuffix: renderedUserSuffix,
    variableValues: values,
    approximateTokens: totalTokens,
    cachingEnabled: template.caching.enablePromptCaching,
    cacheKey,
    renderedAt: new Date(),
  };
}

// ============================================================================
// Memory Cache for Rendered Templates
// ============================================================================

/**
 * In-memory cache for rendered templates
 * Uses the PromptCache class from Claude library
 */
export class RenderedTemplateCache {
  private cache: PromptCache<RenderedTemplate>;
  private userCacheKeys: Map<string, Set<string>> = new Map();

  constructor(ttlMs: number = DEFAULT_MEMORY_CACHE_TTL) {
    this.cache = new PromptCache<RenderedTemplate>(ttlMs);
  }

  /**
   * Get a cached rendered template
   */
  get(cacheKey: string): RenderedTemplate | undefined {
    return this.cache.get(cacheKey);
  }

  /**
   * Cache a rendered template
   */
  set(cacheKey: string, template: RenderedTemplate, userId?: string): void {
    // Track cache key for user if provided
    if (userId) {
      const userKeys = this.userCacheKeys.get(userId) || new Set();

      // Enforce per-user limit
      if (userKeys.size >= MAX_CACHED_TEMPLATES_PER_USER) {
        // Remove oldest entry (first in set)
        const oldest = userKeys.values().next().value;
        if (oldest) {
          this.cache.delete(oldest);
          userKeys.delete(oldest);
        }
      }

      userKeys.add(cacheKey);
      this.userCacheKeys.set(userId, userKeys);
    }

    this.cache.set(cacheKey, template);
  }

  /**
   * Delete a cached template
   */
  delete(cacheKey: string): boolean {
    // Remove from user tracking
    for (const [userId, keys] of this.userCacheKeys.entries()) {
      if (keys.has(cacheKey)) {
        keys.delete(cacheKey);
        if (keys.size === 0) {
          this.userCacheKeys.delete(userId);
        }
        break;
      }
    }
    return this.cache.delete(cacheKey);
  }

  /**
   * Clear all user's cached templates
   */
  clearUserCache(userId: string): void {
    const userKeys = this.userCacheKeys.get(userId);
    if (userKeys) {
      for (const key of userKeys) {
        this.cache.delete(key);
      }
      this.userCacheKeys.delete(userId);
    }
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
    this.userCacheKeys.clear();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size();
  }

  /**
   * Get user's cached template count
   */
  getUserCacheSize(userId: string): number {
    return this.userCacheKeys.get(userId)?.size || 0;
  }
}

// ============================================================================
// Global Cache Instance
// ============================================================================

/**
 * Global rendered template cache instance
 */
let globalTemplateCache: RenderedTemplateCache | null = null;

/**
 * Get or create the global template cache
 */
export function getTemplateCache(
  ttlMs?: number
): RenderedTemplateCache {
  if (!globalTemplateCache) {
    globalTemplateCache = new RenderedTemplateCache(ttlMs);
  }
  return globalTemplateCache;
}

/**
 * Reset the global template cache (useful for testing)
 */
export function resetTemplateCache(): void {
  if (globalTemplateCache) {
    globalTemplateCache.clear();
  }
  globalTemplateCache = null;
}

// ============================================================================
// Cache Statistics
// ============================================================================

/**
 * Statistics for template cache usage
 */
export interface TemplateCacheStats {
  /** Total cache entries */
  totalEntries: number;
  /** Total users with cached templates */
  totalUsers: number;
  /** Cache hit rate (requires external tracking) */
  hitRate?: number;
  /** Average tokens per cached template */
  avgTokensPerTemplate?: number;
}

/**
 * Get cache statistics
 */
export function getCacheStats(cache: RenderedTemplateCache): TemplateCacheStats {
  return {
    totalEntries: cache.size(),
    totalUsers: 0, // Would need to expose userCacheKeys size
  };
}

// ============================================================================
// Cached Template Execution Helper
// ============================================================================

/**
 * Options for getting a rendered template (with caching)
 */
export interface RenderWithCacheOptions {
  /** Template to render */
  template: PromptTemplate;
  /** Variable values */
  variableValues: TemplateVariableValues;
  /** User ID for per-user cache limits */
  userId?: string;
  /** Whether to bypass cache */
  bypassCache?: boolean;
  /** Custom cache TTL */
  cacheTTL?: number;
}

/**
 * Get or render a template with caching
 */
export function getOrRenderTemplate(
  options: RenderWithCacheOptions
): { rendered: RenderedTemplate; fromCache: boolean } {
  const cache = getTemplateCache(options.cacheTTL);

  // Generate cache key first
  const cacheKeyContent = JSON.stringify({
    templateId: options.template.id,
    version: options.template.version,
    values: options.variableValues,
  });
  const cacheKey = generateCacheKey(cacheKeyContent);

  // Check cache if not bypassing and memory caching is enabled
  if (
    !options.bypassCache &&
    options.template.caching.enableMemoryCache
  ) {
    const cached = cache.get(cacheKey);
    if (cached) {
      return { rendered: cached, fromCache: true };
    }
  }

  // Render the template
  const rendered = renderPromptTemplate(
    options.template,
    options.variableValues
  );

  // Cache if memory caching is enabled
  if (options.template.caching.enableMemoryCache && !options.bypassCache) {
    cache.set(cacheKey, rendered, options.userId);
  }

  return { rendered, fromCache: false };
}

// ============================================================================
// Cost Estimation
// ============================================================================

/**
 * Estimate cost savings from caching
 * Based on Anthropic's pricing:
 * - Cache write: 25% more than base input
 * - Cache read: 10% of base input
 */
export function estimateCacheSavings(
  inputTokens: number,
  cacheCreationTokens: number,
  cacheReadTokens: number
): {
  withoutCaching: number;
  withCaching: number;
  savingsPercent: number;
} {
  // Relative cost calculation (normalized to base input token cost = 1)
  const regularTokens = inputTokens - cacheCreationTokens - cacheReadTokens;

  const withoutCaching = inputTokens; // All tokens at full price
  const withCaching =
    regularTokens * 1.0 +      // Regular tokens at full price
    cacheCreationTokens * 1.25 + // Creation at 25% premium
    cacheReadTokens * 0.1;       // Reads at 90% discount

  const savingsPercent =
    withoutCaching > 0
      ? ((withoutCaching - withCaching) / withoutCaching) * 100
      : 0;

  return {
    withoutCaching,
    withCaching,
    savingsPercent: Math.round(savingsPercent * 100) / 100,
  };
}

/**
 * Check if a template's system prompt is cache-eligible
 */
export function isCacheEligible(
  template: PromptTemplate,
  variableValues?: TemplateVariableValues
): boolean {
  if (!template.caching.enablePromptCaching) {
    return false;
  }

  const threshold =
    template.caching.minTokensForCaching || CACHE_THRESHOLDS.CLAUDE_3_5_SONNET;

  // If no variables provided, use base estimate
  if (!variableValues) {
    return (template.tokenEstimate?.baseTokens || 0) >= threshold;
  }

  // Render and check actual token count
  const values = applyDefaults(template, variableValues);
  const rendered = renderTemplate(template.systemPrompt, values);
  const tokenCount = approximateTokens(rendered);

  return tokenCount >= threshold;
}
