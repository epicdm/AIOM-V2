/**
 * Claude API Error Handling
 * Custom error classes and utilities for handling Claude API errors
 */

import type { RateLimitInfo } from "./types";

// ============================================================================
// Base Error Class
// ============================================================================

export class ClaudeError extends Error {
  public readonly code: string;
  public readonly statusCode?: number;
  public readonly retryable: boolean;
  public readonly retryAfterMs?: number;
  public readonly originalCause?: Error;

  constructor(
    message: string,
    code: string,
    options?: {
      statusCode?: number;
      retryable?: boolean;
      retryAfterMs?: number;
      cause?: Error;
    }
  ) {
    super(message);
    this.name = "ClaudeError";
    this.code = code;
    this.statusCode = options?.statusCode;
    this.retryable = options?.retryable ?? false;
    this.retryAfterMs = options?.retryAfterMs;
    this.originalCause = options?.cause;
  }
}

// ============================================================================
// Specific Error Types
// ============================================================================

export class ClaudeAuthenticationError extends ClaudeError {
  constructor(message: string = "Invalid API key or unauthorized access") {
    super(message, "AUTHENTICATION_ERROR", {
      statusCode: 401,
      retryable: false,
    });
    this.name = "ClaudeAuthenticationError";
  }
}

export class ClaudeRateLimitError extends ClaudeError {
  public readonly rateLimitInfo?: RateLimitInfo;

  constructor(
    message: string = "Rate limit exceeded",
    retryAfterMs?: number,
    rateLimitInfo?: RateLimitInfo
  ) {
    super(message, "RATE_LIMIT_ERROR", {
      statusCode: 429,
      retryable: true,
      retryAfterMs,
    });
    this.name = "ClaudeRateLimitError";
    this.rateLimitInfo = rateLimitInfo;
  }
}

export class ClaudeOverloadedError extends ClaudeError {
  constructor(message: string = "API is temporarily overloaded") {
    super(message, "OVERLOADED_ERROR", {
      statusCode: 529,
      retryable: true,
      retryAfterMs: 30000, // Default 30 second retry
    });
    this.name = "ClaudeOverloadedError";
  }
}

export class ClaudeInvalidRequestError extends ClaudeError {
  constructor(message: string = "Invalid request parameters") {
    super(message, "INVALID_REQUEST_ERROR", {
      statusCode: 400,
      retryable: false,
    });
    this.name = "ClaudeInvalidRequestError";
  }
}

export class ClaudeContextLengthError extends ClaudeError {
  constructor(message: string = "Context length exceeded") {
    super(message, "CONTEXT_LENGTH_ERROR", {
      statusCode: 400,
      retryable: false,
    });
    this.name = "ClaudeContextLengthError";
  }
}

export class ClaudeServerError extends ClaudeError {
  constructor(message: string = "Server error", statusCode: number = 500) {
    super(message, "SERVER_ERROR", {
      statusCode,
      retryable: true,
      retryAfterMs: 5000,
    });
    this.name = "ClaudeServerError";
  }
}

export class ClaudeNetworkError extends ClaudeError {
  constructor(message: string = "Network error", cause?: Error) {
    super(message, "NETWORK_ERROR", {
      retryable: true,
      retryAfterMs: 1000,
      cause,
    });
    this.name = "ClaudeNetworkError";
  }
}

export class ClaudeTimeoutError extends ClaudeError {
  constructor(message: string = "Request timed out", timeoutMs?: number) {
    super(message, "TIMEOUT_ERROR", {
      retryable: true,
      retryAfterMs: timeoutMs ? timeoutMs / 2 : 5000,
    });
    this.name = "ClaudeTimeoutError";
  }
}

export class ClaudeStreamError extends ClaudeError {
  constructor(message: string = "Stream error", cause?: Error) {
    super(message, "STREAM_ERROR", {
      retryable: true,
      retryAfterMs: 1000,
      cause,
    });
    this.name = "ClaudeStreamError";
  }
}

// ============================================================================
// Error Parsing & Utilities
// ============================================================================

interface APIErrorResponse {
  type: string;
  error: {
    type: string;
    message: string;
  };
}

/**
 * Parse rate limit headers from response
 */
export function parseRateLimitHeaders(headers: Headers): RateLimitInfo | undefined {
  const requestsLimit = headers.get("anthropic-ratelimit-requests-limit");
  const requestsRemaining = headers.get("anthropic-ratelimit-requests-remaining");
  const requestsReset = headers.get("anthropic-ratelimit-requests-reset");
  const tokensLimit = headers.get("anthropic-ratelimit-tokens-limit");
  const tokensRemaining = headers.get("anthropic-ratelimit-tokens-remaining");
  const tokensReset = headers.get("anthropic-ratelimit-tokens-reset");

  if (!requestsLimit || !tokensLimit) {
    return undefined;
  }

  return {
    requestsLimit: parseInt(requestsLimit, 10),
    requestsRemaining: parseInt(requestsRemaining || "0", 10),
    requestsReset: new Date(requestsReset || Date.now()),
    tokensLimit: parseInt(tokensLimit, 10),
    tokensRemaining: parseInt(tokensRemaining || "0", 10),
    tokensReset: new Date(tokensReset || Date.now()),
  };
}

/**
 * Parse retry-after header
 */
export function parseRetryAfter(headers: Headers): number | undefined {
  const retryAfter = headers.get("retry-after");
  if (!retryAfter) return undefined;

  // Check if it's a number (seconds)
  const seconds = parseInt(retryAfter, 10);
  if (!isNaN(seconds)) {
    return seconds * 1000; // Convert to milliseconds
  }

  // Check if it's a date
  const date = new Date(retryAfter);
  if (!isNaN(date.getTime())) {
    return Math.max(0, date.getTime() - Date.now());
  }

  return undefined;
}

/**
 * Create appropriate error from API response
 */
export async function createErrorFromResponse(
  response: Response
): Promise<ClaudeError> {
  const headers = response.headers;
  const statusCode = response.status;

  let errorMessage = `API error: ${statusCode}`;
  let errorType = "unknown_error";

  try {
    const body: APIErrorResponse = await response.json();
    if (body.error) {
      errorMessage = body.error.message;
      errorType = body.error.type;
    }
  } catch {
    // Failed to parse JSON, use default message
  }

  const retryAfterMs = parseRetryAfter(headers);
  const rateLimitInfo = parseRateLimitHeaders(headers);

  switch (statusCode) {
    case 400:
      if (errorType === "invalid_request_error" && errorMessage.includes("context")) {
        return new ClaudeContextLengthError(errorMessage);
      }
      return new ClaudeInvalidRequestError(errorMessage);

    case 401:
      return new ClaudeAuthenticationError(errorMessage);

    case 429:
      return new ClaudeRateLimitError(errorMessage, retryAfterMs, rateLimitInfo);

    case 500:
    case 502:
    case 503:
      return new ClaudeServerError(errorMessage, statusCode);

    case 529:
      return new ClaudeOverloadedError(errorMessage);

    default:
      return new ClaudeError(errorMessage, errorType, {
        statusCode,
        retryable: statusCode >= 500,
        retryAfterMs,
      });
  }
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof ClaudeError) {
    return error.retryable;
  }

  // Network errors are typically retryable
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return true;
  }

  return false;
}

/**
 * Get retry delay from error or use exponential backoff
 */
export function getRetryDelay(
  error: unknown,
  attempt: number,
  baseDelayMs: number = 1000,
  maxDelayMs: number = 60000
): number {
  // Use error-specified delay if available
  if (error instanceof ClaudeError && error.retryAfterMs) {
    return error.retryAfterMs;
  }

  // Exponential backoff with jitter
  const exponentialDelay = Math.min(
    baseDelayMs * Math.pow(2, attempt),
    maxDelayMs
  );
  const jitter = Math.random() * 0.1 * exponentialDelay; // 10% jitter

  return Math.floor(exponentialDelay + jitter);
}

/**
 * Format error for user display
 */
export function formatClaudeError(error: unknown): string {
  if (error instanceof ClaudeAuthenticationError) {
    return "Authentication failed. Please check your API key.";
  }

  if (error instanceof ClaudeRateLimitError) {
    return "Too many requests. Please wait a moment and try again.";
  }

  if (error instanceof ClaudeOverloadedError) {
    return "The AI service is temporarily busy. Please try again shortly.";
  }

  if (error instanceof ClaudeContextLengthError) {
    return "The conversation is too long. Please start a new conversation.";
  }

  if (error instanceof ClaudeInvalidRequestError) {
    return "Invalid request. Please check your input and try again.";
  }

  if (error instanceof ClaudeNetworkError) {
    return "Network error. Please check your connection and try again.";
  }

  if (error instanceof ClaudeTimeoutError) {
    return "Request timed out. Please try again.";
  }

  if (error instanceof ClaudeError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred. Please try again.";
}
