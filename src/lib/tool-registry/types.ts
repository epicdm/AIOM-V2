/**
 * AIOM Tool Registry Types
 * Type definitions for the Claude tool registry system
 */

import { z } from "zod";

// ============================================================================
// Tool Schema Types
// ============================================================================

/**
 * JSON Schema property definition for tool input
 */
export interface ToolInputProperty {
  type: "string" | "number" | "integer" | "boolean" | "array" | "object";
  description?: string;
  enum?: string[];
  items?: ToolInputProperty;
  properties?: Record<string, ToolInputProperty>;
  required?: string[];
  default?: unknown;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

/**
 * Tool input schema following JSON Schema format
 */
export interface ToolInputSchema {
  type: "object";
  properties: Record<string, ToolInputProperty>;
  required?: string[];
  additionalProperties?: boolean;
}

/**
 * Tool category for organization and filtering
 */
export type ToolCategory =
  | "data"
  | "communication"
  | "file"
  | "analysis"
  | "integration"
  | "utility"
  | "admin"
  | "custom";

/**
 * Permission level required to execute a tool
 */
export type ToolPermission =
  | "public"        // Any authenticated user
  | "user"          // Verified users only
  | "premium"       // Premium subscribers
  | "admin"         // Administrators only
  | "system";       // Internal system tools only

/**
 * Tool execution status
 */
export type ToolExecutionStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "timeout"
  | "cancelled";

// ============================================================================
// Tool Definition Types
// ============================================================================

/**
 * Complete tool definition for registration
 */
export interface ToolDefinition<TInput = Record<string, unknown>, TOutput = unknown> {
  /** Unique identifier for the tool */
  id: string;
  /** Human-readable name */
  name: string;
  /** Detailed description for Claude to understand when to use this tool */
  description: string;
  /** Tool version for compatibility tracking */
  version: string;
  /** Category for organization */
  category: ToolCategory;
  /** Required permission level */
  permission: ToolPermission;
  /** JSON Schema for input validation */
  inputSchema: ToolInputSchema;
  /** Handler function that executes the tool */
  handler: ToolHandler<TInput, TOutput>;
  /** Optional response formatter */
  formatter?: ResponseFormatter<TOutput>;
  /** Whether the tool is currently enabled */
  enabled: boolean;
  /** Optional rate limit (calls per minute) */
  rateLimit?: number;
  /** Optional timeout in milliseconds */
  timeoutMs?: number;
  /** Optional tags for search/filtering */
  tags?: string[];
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Tool definition without the handler (for client-side use)
 */
export type ToolDefinitionPublic = Omit<ToolDefinition, "handler" | "formatter">;

/**
 * Claude-compatible tool format
 */
export interface ClaudeTool {
  name: string;
  description: string;
  input_schema: ToolInputSchema;
}

// ============================================================================
// Handler Types
// ============================================================================

/**
 * Context provided to tool handlers
 */
export interface ToolContext {
  /** User ID of the caller */
  userId: string;
  /** Whether the user is an admin */
  isAdmin: boolean;
  /** User's subscription tier */
  subscriptionTier?: string;
  /** Request metadata */
  requestId: string;
  /** Timestamp of the request */
  timestamp: Date;
  /** Custom context data */
  custom?: Record<string, unknown>;
}

/**
 * Tool handler function type
 */
export type ToolHandler<TInput = Record<string, unknown>, TOutput = unknown> = (
  input: TInput,
  context: ToolContext
) => Promise<ToolResult<TOutput>>;

/**
 * Tool execution result
 */
export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: ToolExecutionError;
  metadata?: {
    executionTimeMs?: number;
    cached?: boolean;
    warnings?: string[];
  };
}

// ============================================================================
// Response Formatter Types
// ============================================================================

/**
 * Response formatter function type
 */
export type ResponseFormatter<T = unknown> = (
  result: ToolResult<T>,
  context: ToolContext
) => FormattedResponse;

/**
 * Formatted response for Claude consumption
 */
export interface FormattedResponse {
  /** Text content for Claude to interpret */
  content: string;
  /** Whether this is an error response */
  isError: boolean;
  /** Optional structured data */
  structuredData?: Record<string, unknown>;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Tool execution error details
 */
export interface ToolExecutionError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  retryable?: boolean;
}

// ============================================================================
// Registry Types
// ============================================================================

/**
 * Options for getting tools from registry
 */
export interface GetToolsOptions {
  category?: ToolCategory;
  permission?: ToolPermission;
  enabled?: boolean;
  tags?: string[];
}

/**
 * Tool registration options
 */
export interface RegisterToolOptions {
  /** Override existing tool with same ID */
  overwrite?: boolean;
}

/**
 * Tool execution options
 */
export interface ExecuteToolOptions {
  /** Override default timeout */
  timeoutMs?: number;
  /** Skip permission check */
  skipPermissionCheck?: boolean;
  /** Additional context */
  additionalContext?: Record<string, unknown>;
}

/**
 * Tool execution record for logging/tracking
 */
export interface ToolExecutionRecord {
  id: string;
  toolId: string;
  userId: string;
  input: Record<string, unknown>;
  status: ToolExecutionStatus;
  result?: ToolResult;
  formattedResponse?: FormattedResponse;
  startedAt: Date;
  completedAt?: Date;
  executionTimeMs?: number;
  error?: ToolExecutionError;
}

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

// Simple schemas that don't require recursive types
export const toolCategorySchema = z.enum([
  "data",
  "communication",
  "file",
  "analysis",
  "integration",
  "utility",
  "admin",
  "custom",
]);

export const toolPermissionSchema = z.enum([
  "public",
  "user",
  "premium",
  "admin",
  "system",
]);

// Note: Complex nested schemas are simplified to avoid Zod 4 compatibility issues
// Full validation should be done at runtime if needed

export type RegisterToolInput = {
  id: string;
  name: string;
  description: string;
  version: string;
  category: ToolCategory;
  permission: ToolPermission;
  inputSchema: ToolInputSchema;
  enabled?: boolean;
  rateLimit?: number;
  timeoutMs?: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
};

export type ExecuteToolInput = {
  toolId: string;
  input: Record<string, unknown>;
  timeoutMs?: number;
};
