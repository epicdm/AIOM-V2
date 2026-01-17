/**
 * AIOM Prompt Templates Types
 * Type definitions for optimized prompt templates library
 */

import type { ClaudeModel, SystemMessage, CacheControl } from "../claude";

// ============================================================================
// Template Category Types
// ============================================================================

/**
 * Categories for organizing prompt templates
 */
export type PromptTemplateCategory =
  | "briefing_generation"
  | "query_answering"
  | "summarization"
  | "data_extraction"
  | "content_creation"
  | "analysis"
  | "custom";

/**
 * Template status for lifecycle management
 */
export type PromptTemplateStatus = "active" | "deprecated" | "draft" | "archived";

// ============================================================================
// Variable Types
// ============================================================================

/** JSON-safe value type for template variables */
export type TemplateVariableValue = string | number | boolean | null | TemplateVariableValue[] | { [key: string]: TemplateVariableValue };

/**
 * Variable placeholder definition in templates
 */
export interface TemplateVariable {
  /** Variable name (used in {{name}} placeholders) */
  name: string;
  /** Human-readable description */
  description: string;
  /** Variable type for validation */
  type: "string" | "number" | "boolean" | "array" | "object" | "date";
  /** Whether the variable is required */
  required: boolean;
  /** Default value if not provided */
  defaultValue?: TemplateVariableValue;
  /** Example value for documentation */
  example?: TemplateVariableValue;
  /** Validation pattern (regex for strings) */
  validation?: string;
}

/**
 * Values provided for template variables
 */
export type TemplateVariableValues = Record<string, TemplateVariableValue>;

// ============================================================================
// Template Definition Types
// ============================================================================

/**
 * Caching configuration for a template
 */
export interface TemplateCachingConfig {
  /** Whether to enable Anthropic's prompt caching */
  enablePromptCaching: boolean;
  /** Whether to cache the rendered template in memory */
  enableMemoryCache: boolean;
  /** Memory cache TTL in milliseconds (default: 5 minutes) */
  memoryCacheTTL?: number;
  /** Minimum tokens required for prompt caching eligibility */
  minTokensForCaching?: number;
  /** Cache breakpoint positions (for conversation caching) */
  cacheBreakpoints?: number[];
}

/**
 * Token usage estimates for a template
 */
export interface TemplateTokenEstimate {
  /** Approximate base tokens (without variables) */
  baseTokens: number;
  /** Approximate max tokens (with typical variable values) */
  maxTokens: number;
  /** Whether template exceeds caching threshold */
  cacheEligible: boolean;
}

/**
 * Core prompt template definition
 */
export interface PromptTemplate {
  /** Unique template identifier */
  id: string;
  /** Human-readable template name */
  name: string;
  /** Template description */
  description: string;
  /** Template category for organization */
  category: PromptTemplateCategory;
  /** Current status */
  status: PromptTemplateStatus;
  /** Version number (semver) */
  version: string;

  /** System prompt template (supports {{variable}} placeholders) */
  systemPrompt: string;
  /** Optional user prompt prefix template */
  userPromptPrefix?: string;
  /** Optional user prompt suffix template */
  userPromptSuffix?: string;

  /** Variable definitions */
  variables: TemplateVariable[];

  /** Caching configuration */
  caching: TemplateCachingConfig;

  /** Recommended Claude model for this template */
  recommendedModel?: ClaudeModel;
  /** Recommended temperature setting */
  recommendedTemperature?: number;
  /** Recommended max tokens */
  recommendedMaxTokens?: number;

  /** Token estimates */
  tokenEstimate?: TemplateTokenEstimate;

  /** Tags for search and filtering */
  tags?: string[];

  /** Template author */
  author?: string;

  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

// ============================================================================
// Rendered Template Types
// ============================================================================

/**
 * Rendered template ready for API use
 */
export interface RenderedTemplate {
  /** Original template ID */
  templateId: string;
  /** Rendered system prompt (variables replaced) */
  systemPrompt: string;
  /** Rendered system messages for caching */
  systemMessages: SystemMessage[];
  /** Rendered user prompt prefix */
  userPromptPrefix?: string;
  /** Rendered user prompt suffix */
  userPromptSuffix?: string;
  /** Variable values used */
  variableValues: TemplateVariableValues;
  /** Approximate token count */
  approximateTokens: number;
  /** Whether prompt caching is enabled */
  cachingEnabled: boolean;
  /** Cache key for memory caching */
  cacheKey: string;
  /** Timestamp when rendered */
  renderedAt: Date;
}

// ============================================================================
// Template Usage Tracking Types
// ============================================================================

/**
 * Usage statistics for a template
 */
export interface TemplateUsageStats {
  /** Template ID */
  templateId: string;
  /** User ID */
  userId: string;
  /** Total number of uses */
  totalUses: number;
  /** Total input tokens consumed */
  totalInputTokens: number;
  /** Total output tokens generated */
  totalOutputTokens: number;
  /** Total cache read tokens (cost savings) */
  totalCacheReadTokens: number;
  /** Total cache creation tokens */
  totalCacheCreationTokens: number;
  /** Average response time in milliseconds */
  avgResponseTimeMs: number;
  /** Estimated cost savings from caching (percentage) */
  cacheSavingsPercent: number;
  /** First use timestamp */
  firstUsedAt: Date;
  /** Last use timestamp */
  lastUsedAt: Date;
}

/**
 * Individual template usage record
 */
export interface TemplateUsageRecord {
  /** Unique record ID */
  id: string;
  /** Template ID */
  templateId: string;
  /** User ID */
  userId: string;
  /** Input tokens */
  inputTokens: number;
  /** Output tokens */
  outputTokens: number;
  /** Cache read tokens */
  cacheReadTokens?: number;
  /** Cache creation tokens */
  cacheCreationTokens?: number;
  /** Response time in milliseconds */
  responseTimeMs: number;
  /** Model used */
  model: string;
  /** Success status */
  success: boolean;
  /** Error message if failed */
  errorMessage?: string;
  /** Timestamp */
  createdAt: Date;
}

// ============================================================================
// Template Registry Types
// ============================================================================

/**
 * Template registry entry with metadata
 */
export interface TemplateRegistryEntry {
  /** Template definition */
  template: PromptTemplate;
  /** Whether this is a built-in template */
  isBuiltIn: boolean;
  /** Usage count across all users */
  globalUsageCount: number;
  /** Average rating (1-5) */
  averageRating?: number;
}

/**
 * Filter options for template search
 */
export interface TemplateSearchFilters {
  /** Filter by category */
  category?: PromptTemplateCategory;
  /** Filter by status */
  status?: PromptTemplateStatus;
  /** Filter by tags */
  tags?: string[];
  /** Search query (name, description) */
  query?: string;
  /** Filter by built-in vs custom */
  isBuiltIn?: boolean;
  /** Minimum cache eligibility */
  cacheEligibleOnly?: boolean;
}

/**
 * Pagination options
 */
export interface TemplatePaginationOptions {
  /** Page number (0-based) */
  page: number;
  /** Items per page */
  pageSize: number;
  /** Sort field */
  sortBy?: "name" | "createdAt" | "usageCount" | "rating";
  /** Sort direction */
  sortDirection?: "asc" | "desc";
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Response for template execution
 */
export interface TemplateExecutionResult {
  /** Whether execution was successful */
  success: boolean;
  /** Rendered template used */
  renderedTemplate: RenderedTemplate;
  /** Claude API response content */
  content?: string;
  /** Token usage */
  usage?: {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens?: number;
    cacheCreationTokens?: number;
  };
  /** Cache statistics */
  cacheStats?: {
    cacheSavings: number;
    cacheHitRate: number;
  };
  /** Response time in milliseconds */
  responseTimeMs: number;
  /** Error message if failed */
  error?: string;
}

/**
 * Response for template list
 */
export interface TemplateListResponse {
  /** Templates matching filters */
  templates: TemplateRegistryEntry[];
  /** Total count (for pagination) */
  total: number;
  /** Whether there are more results */
  hasMore: boolean;
  /** Current page */
  page: number;
  /** Page size */
  pageSize: number;
}

// ============================================================================
// Database Schema Types (for Drizzle)
// ============================================================================

/**
 * Prompt template database record
 */
export interface PromptTemplateRecord {
  id: string;
  name: string;
  description: string;
  category: PromptTemplateCategory;
  status: PromptTemplateStatus;
  version: string;
  systemPrompt: string;
  userPromptPrefix: string | null;
  userPromptSuffix: string | null;
  variables: string; // JSON
  caching: string; // JSON
  recommendedModel: string | null;
  recommendedTemperature: string | null;
  recommendedMaxTokens: number | null;
  tokenEstimate: string | null; // JSON
  tags: string | null; // JSON
  author: string | null;
  isBuiltIn: boolean;
  userId: string | null; // null for built-in templates
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Template usage record for database
 */
export interface PromptTemplateUsageRecord {
  id: string;
  templateId: string;
  userId: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number | null;
  cacheCreationTokens: number | null;
  responseTimeMs: number;
  model: string;
  success: boolean;
  errorMessage: string | null;
  createdAt: Date;
}
