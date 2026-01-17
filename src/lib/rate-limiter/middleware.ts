/**
 * Rate Limiting Middleware
 * Middleware implementation for applying rate limits to routes
 */

import type {
  RateLimitRule,
  RateLimitPreset,
  RateLimitResult,
  RateLimitHeaders,
  RateLimitMiddlewareOptions,
} from './types';
import { resolveRateLimitRule } from './config';
import { getRateLimiter } from './token-bucket';

// =============================================================================
// Identifier Extraction
// =============================================================================

/**
 * Default identifier extractor - uses IP address
 */
export function extractIdentifier(request: Request): string {
  // Try various headers for the real client IP
  const headers = [
    'x-forwarded-for',
    'x-real-ip',
    'cf-connecting-ip',
    'x-client-ip',
    'true-client-ip',
  ];

  for (const header of headers) {
    const value = request.headers.get(header);
    if (value) {
      // x-forwarded-for may contain multiple IPs, take the first one
      const ip = value.split(',')[0].trim();
      if (ip) {
        return ip;
      }
    }
  }

  // Fallback to unknown
  return 'unknown';
}

/**
 * Extract identifier from request based on phone number (for OTP endpoints)
 */
export async function extractPhoneIdentifier(request: Request): Promise<string> {
  try {
    // Clone the request to read the body without consuming it
    const clonedRequest = request.clone();
    const body = await clonedRequest.json();

    if (body.phoneNumber) {
      // Combine IP and phone number for more specific rate limiting
      const ip = extractIdentifier(request);
      return `phone:${body.phoneNumber}:${ip}`;
    }
  } catch {
    // If we can't parse the body, fall back to IP
  }

  return extractIdentifier(request);
}

/**
 * Extract identifier from request based on user ID (for authenticated endpoints)
 */
export function extractUserIdentifier(request: Request, userId?: string): string {
  if (userId) {
    return `user:${userId}`;
  }
  return extractIdentifier(request);
}

// =============================================================================
// Response Helpers
// =============================================================================

/**
 * Build rate limit headers
 */
export function buildRateLimitHeaders(result: RateLimitResult): RateLimitHeaders {
  const headers: RateLimitHeaders = {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(Date.now() / 1000 + result.resetIn).toString(),
  };

  if (result.retryAfter !== undefined) {
    headers['Retry-After'] = result.retryAfter.toString();
  }

  return headers;
}

/**
 * Create a rate limit exceeded response
 */
export function createRateLimitResponse(
  result: RateLimitResult,
  customMessage?: string
): Response {
  const headers = buildRateLimitHeaders(result);

  return Response.json(
    {
      success: false,
      error: 'Rate limit exceeded',
      message: customMessage || 'Too many requests. Please try again later.',
      retryAfter: result.retryAfter,
    },
    {
      status: 429,
      headers: headers as unknown as Record<string, string>,
    }
  );
}

// =============================================================================
// Rate Limit Check Function
// =============================================================================

/**
 * Check rate limit for a request
 * Returns the result without creating a response
 */
export async function checkRateLimit(
  request: Request,
  ruleOrPreset: RateLimitRule | RateLimitPreset,
  identifier?: string
): Promise<RateLimitResult> {
  const rule = resolveRateLimitRule(ruleOrPreset);
  const rateLimiter = getRateLimiter();

  // Use custom identifier or extract from request
  const id = identifier || extractIdentifier(request);

  // Check if skip condition is met
  if (rule.skip) {
    const shouldSkip = await rule.skip(request);
    if (shouldSkip) {
      return {
        allowed: true,
        remaining: rule.maxTokens,
        limit: rule.maxTokens,
        resetIn: 0,
      };
    }
  }

  return rateLimiter.checkLimit(id, rule);
}

// =============================================================================
// Route Handler Wrapper
// =============================================================================

/**
 * Wrap a route handler with rate limiting
 * This can be used directly in route handlers
 */
export function withRateLimit<T extends (...args: any[]) => Promise<Response>>(
  handler: T,
  options: RateLimitMiddlewareOptions
): T {
  return (async (...args: Parameters<T>): Promise<Response> => {
    const request = args[0]?.request as Request | undefined;

    if (!request) {
      // If no request, call the handler directly
      return handler(...args);
    }

    const rule = resolveRateLimitRule(options.rule);
    const rateLimiter = getRateLimiter();

    // Extract identifier
    let identifier: string;
    if (options.identifierExtractor) {
      identifier = await options.identifierExtractor(request);
    } else if (rule.keyBuilder) {
      identifier = rule.keyBuilder(request);
    } else {
      identifier = extractIdentifier(request);
    }

    // Check if skip condition is met
    if (rule.skip) {
      const shouldSkip = await rule.skip(request);
      if (shouldSkip) {
        return handler(...args);
      }
    }

    // Check rate limit
    const result = await rateLimiter.checkLimit(identifier, rule);

    // If rate limited, return 429 response
    if (!result.allowed) {
      // Call onRateLimit callback if provided
      if (options.onRateLimit) {
        await options.onRateLimit(identifier, result);
      }

      const customMessage = rule.customResponse?.message;
      return createRateLimitResponse(result, customMessage);
    }

    // Call the original handler
    const response = await handler(...args);

    // Add rate limit headers if enabled
    if (options.includeHeaders !== false) {
      const headers = buildRateLimitHeaders(result);

      // Clone the response and add headers
      const newHeaders = new Headers(response.headers);
      Object.entries(headers).forEach(([key, value]) => {
        if (value) {
          newHeaders.set(key, value);
        }
      });

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    }

    return response;
  }) as T;
}

// =============================================================================
// Preset Wrappers
// =============================================================================

/**
 * Apply authentication rate limiting (10 requests/minute)
 */
export function withAuthRateLimit<T extends (...args: any[]) => Promise<Response>>(
  handler: T,
  options?: Partial<RateLimitMiddlewareOptions>
): T {
  return withRateLimit(handler, {
    rule: 'auth',
    includeHeaders: true,
    ...options,
  });
}

/**
 * Apply OTP rate limiting (3 requests/minute)
 */
export function withOTPRateLimit<T extends (...args: any[]) => Promise<Response>>(
  handler: T,
  options?: Partial<RateLimitMiddlewareOptions>
): T {
  return withRateLimit(handler, {
    rule: 'otp',
    includeHeaders: true,
    identifierExtractor: extractPhoneIdentifier,
    ...options,
  });
}

/**
 * Apply transfer rate limiting (5 requests/minute)
 */
export function withTransferRateLimit<T extends (...args: any[]) => Promise<Response>>(
  handler: T,
  options?: Partial<RateLimitMiddlewareOptions>
): T {
  return withRateLimit(handler, {
    rule: 'transfer',
    includeHeaders: true,
    ...options,
  });
}

/**
 * Apply strict rate limiting (1 request/minute)
 */
export function withStrictRateLimit<T extends (...args: any[]) => Promise<Response>>(
  handler: T,
  options?: Partial<RateLimitMiddlewareOptions>
): T {
  return withRateLimit(handler, {
    rule: 'strict',
    includeHeaders: true,
    ...options,
  });
}

// =============================================================================
// Direct Rate Limit Functions for API Routes
// =============================================================================

/**
 * Apply rate limiting directly in a route handler
 * Returns null if allowed, or a Response if rate limited
 */
export async function applyRateLimit(
  request: Request,
  ruleOrPreset: RateLimitRule | RateLimitPreset,
  options?: {
    identifier?: string;
    customMessage?: string;
    onRateLimit?: (identifier: string, result: RateLimitResult) => void | Promise<void>;
  }
): Promise<Response | null> {
  const rule = resolveRateLimitRule(ruleOrPreset);
  const rateLimiter = getRateLimiter();

  const identifier = options?.identifier || extractIdentifier(request);

  // Check if skip condition is met
  if (rule.skip) {
    const shouldSkip = await rule.skip(request);
    if (shouldSkip) {
      return null;
    }
  }

  const result = await rateLimiter.checkLimit(identifier, rule);

  if (!result.allowed) {
    if (options?.onRateLimit) {
      await options.onRateLimit(identifier, result);
    }
    return createRateLimitResponse(result, options?.customMessage);
  }

  return null;
}

/**
 * Apply OTP-specific rate limiting
 * Uses phone number + IP for identification
 */
export async function applyOTPRateLimit(
  request: Request,
  phoneNumber?: string,
  customMessage?: string
): Promise<Response | null> {
  const ip = extractIdentifier(request);
  const identifier = phoneNumber ? `otp:${phoneNumber}:${ip}` : `otp:${ip}`;

  return applyRateLimit(request, 'otp', {
    identifier,
    customMessage: customMessage || 'Too many OTP requests. Please wait before requesting a new code.',
  });
}

/**
 * Apply auth-specific rate limiting
 * Uses email/username + IP for identification
 */
export async function applyAuthRateLimit(
  request: Request,
  email?: string,
  customMessage?: string
): Promise<Response | null> {
  const ip = extractIdentifier(request);
  const identifier = email ? `auth:${email}:${ip}` : `auth:${ip}`;

  return applyRateLimit(request, 'auth', {
    identifier,
    customMessage: customMessage || 'Too many authentication attempts. Please try again later.',
  });
}

/**
 * Apply transfer-specific rate limiting
 * Uses user ID for identification
 */
export async function applyTransferRateLimit(
  request: Request,
  userId?: string,
  customMessage?: string
): Promise<Response | null> {
  const ip = extractIdentifier(request);
  const identifier = userId ? `transfer:${userId}` : `transfer:${ip}`;

  return applyRateLimit(request, 'transfer', {
    identifier,
    customMessage: customMessage || 'Too many transfer requests. Please wait before trying again.',
  });
}
