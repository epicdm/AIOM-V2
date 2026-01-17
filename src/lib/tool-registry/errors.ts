/**
 * Tool Registry Error Classes
 * Custom error classes for the tool registry system
 */

import type { ToolExecutionError } from "./types";

// ============================================================================
// Base Error Class
// ============================================================================

export class ToolRegistryError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly retryable: boolean;
  public readonly details?: Record<string, unknown>;
  public readonly originalCause?: Error;

  constructor(
    message: string,
    code: string,
    options?: {
      statusCode?: number;
      retryable?: boolean;
      details?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super(message);
    this.name = "ToolRegistryError";
    this.code = code;
    this.statusCode = options?.statusCode ?? 500;
    this.retryable = options?.retryable ?? false;
    this.details = options?.details;
    this.originalCause = options?.cause;
  }

  /**
   * Convert to ToolExecutionError format
   */
  toExecutionError(): ToolExecutionError {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      retryable: this.retryable,
    };
  }
}

// ============================================================================
// Specific Error Types
// ============================================================================

/**
 * Tool not found in registry
 */
export class ToolNotFoundError extends ToolRegistryError {
  public readonly toolId: string;

  constructor(toolId: string) {
    super(`Tool not found: ${toolId}`, "TOOL_NOT_FOUND", {
      statusCode: 404,
      retryable: false,
      details: { toolId },
    });
    this.name = "ToolNotFoundError";
    this.toolId = toolId;
  }
}

/**
 * Tool already exists in registry
 */
export class ToolAlreadyExistsError extends ToolRegistryError {
  public readonly toolId: string;

  constructor(toolId: string) {
    super(`Tool already exists: ${toolId}`, "TOOL_ALREADY_EXISTS", {
      statusCode: 409,
      retryable: false,
      details: { toolId },
    });
    this.name = "ToolAlreadyExistsError";
    this.toolId = toolId;
  }
}

/**
 * Tool is disabled
 */
export class ToolDisabledError extends ToolRegistryError {
  public readonly toolId: string;

  constructor(toolId: string) {
    super(`Tool is disabled: ${toolId}`, "TOOL_DISABLED", {
      statusCode: 403,
      retryable: false,
      details: { toolId },
    });
    this.name = "ToolDisabledError";
    this.toolId = toolId;
  }
}

/**
 * User lacks permission to use tool
 */
export class ToolPermissionDeniedError extends ToolRegistryError {
  public readonly toolId: string;
  public readonly requiredPermission: string;
  public readonly userPermission?: string;

  constructor(
    toolId: string,
    requiredPermission: string,
    userPermission?: string
  ) {
    super(
      `Permission denied for tool: ${toolId}. Required: ${requiredPermission}`,
      "TOOL_PERMISSION_DENIED",
      {
        statusCode: 403,
        retryable: false,
        details: { toolId, requiredPermission, userPermission },
      }
    );
    this.name = "ToolPermissionDeniedError";
    this.toolId = toolId;
    this.requiredPermission = requiredPermission;
    this.userPermission = userPermission;
  }
}

/**
 * Tool input validation failed
 */
export class ToolValidationError extends ToolRegistryError {
  public readonly toolId: string;
  public readonly validationErrors: Array<{
    path: string;
    message: string;
  }>;

  constructor(
    toolId: string,
    validationErrors: Array<{ path: string; message: string }>
  ) {
    const errorMessages = validationErrors
      .map((e) => `${e.path}: ${e.message}`)
      .join("; ");
    super(
      `Tool input validation failed for ${toolId}: ${errorMessages}`,
      "TOOL_VALIDATION_ERROR",
      {
        statusCode: 400,
        retryable: false,
        details: { toolId, validationErrors },
      }
    );
    this.name = "ToolValidationError";
    this.toolId = toolId;
    this.validationErrors = validationErrors;
  }
}

/**
 * Tool execution timed out
 */
export class ToolTimeoutError extends ToolRegistryError {
  public readonly toolId: string;
  public readonly timeoutMs: number;

  constructor(toolId: string, timeoutMs: number) {
    super(
      `Tool execution timed out after ${timeoutMs}ms: ${toolId}`,
      "TOOL_TIMEOUT",
      {
        statusCode: 408,
        retryable: true,
        details: { toolId, timeoutMs },
      }
    );
    this.name = "ToolTimeoutError";
    this.toolId = toolId;
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Tool execution failed
 */
export class ToolExecutionFailedError extends ToolRegistryError {
  public readonly toolId: string;

  constructor(toolId: string, message: string, cause?: Error) {
    super(`Tool execution failed: ${toolId} - ${message}`, "TOOL_EXECUTION_FAILED", {
      statusCode: 500,
      retryable: true,
      details: { toolId },
      cause,
    });
    this.name = "ToolExecutionFailedError";
    this.toolId = toolId;
  }
}

/**
 * Rate limit exceeded for tool
 */
export class ToolRateLimitError extends ToolRegistryError {
  public readonly toolId: string;
  public readonly limitPerMinute: number;
  public readonly retryAfterMs: number;

  constructor(toolId: string, limitPerMinute: number, retryAfterMs: number) {
    super(
      `Rate limit exceeded for tool: ${toolId}. Limit: ${limitPerMinute}/min`,
      "TOOL_RATE_LIMIT",
      {
        statusCode: 429,
        retryable: true,
        details: { toolId, limitPerMinute, retryAfterMs },
      }
    );
    this.name = "ToolRateLimitError";
    this.toolId = toolId;
    this.limitPerMinute = limitPerMinute;
    this.retryAfterMs = retryAfterMs;
  }
}

/**
 * Invalid tool definition
 */
export class InvalidToolDefinitionError extends ToolRegistryError {
  public readonly validationErrors: string[];

  constructor(validationErrors: string[]) {
    super(
      `Invalid tool definition: ${validationErrors.join("; ")}`,
      "INVALID_TOOL_DEFINITION",
      {
        statusCode: 400,
        retryable: false,
        details: { validationErrors },
      }
    );
    this.name = "InvalidToolDefinitionError";
    this.validationErrors = validationErrors;
  }
}

// ============================================================================
// Error Utilities
// ============================================================================

/**
 * Check if an error is a tool registry error
 */
export function isToolRegistryError(error: unknown): error is ToolRegistryError {
  return error instanceof ToolRegistryError;
}

/**
 * Check if an error is retryable
 */
export function isRetryableToolError(error: unknown): boolean {
  if (error instanceof ToolRegistryError) {
    return error.retryable;
  }
  return false;
}

/**
 * Format tool error for user display
 */
export function formatToolError(error: unknown): string {
  if (error instanceof ToolNotFoundError) {
    return "The requested tool was not found.";
  }

  if (error instanceof ToolDisabledError) {
    return "This tool is currently disabled.";
  }

  if (error instanceof ToolPermissionDeniedError) {
    return "You don't have permission to use this tool.";
  }

  if (error instanceof ToolValidationError) {
    return "Invalid input provided for this tool.";
  }

  if (error instanceof ToolTimeoutError) {
    return "The tool took too long to respond. Please try again.";
  }

  if (error instanceof ToolRateLimitError) {
    return "You've exceeded the rate limit for this tool. Please wait a moment.";
  }

  if (error instanceof ToolExecutionFailedError) {
    return "The tool failed to execute. Please try again.";
  }

  if (error instanceof ToolRegistryError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred.";
}

/**
 * Convert any error to a ToolExecutionError
 */
export function toToolExecutionError(error: unknown): ToolExecutionError {
  if (error instanceof ToolRegistryError) {
    return error.toExecutionError();
  }

  if (error instanceof Error) {
    return {
      code: "UNKNOWN_ERROR",
      message: error.message,
      retryable: false,
    };
  }

  return {
    code: "UNKNOWN_ERROR",
    message: "An unexpected error occurred",
    retryable: false,
  };
}
