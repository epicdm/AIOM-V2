/**
 * Authentication API Route
 *
 * Handles all authentication requests via better-auth.
 * Rate limited to prevent brute force attacks (10 requests per minute).
 *
 * GET/POST /api/auth/*
 */

import { auth } from "~/utils/auth";
import { createFileRoute } from "@tanstack/react-router";
import { applyAuthRateLimit, extractIdentifier } from "~/lib/rate-limiter";

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // Apply rate limiting for auth endpoints
        const rateLimitResponse = await applyAuthRateLimit(request);
        if (rateLimitResponse) {
          return rateLimitResponse;
        }

        return auth.handler(request);
      },
      POST: async ({ request }) => {
        // Clone request to extract email for rate limiting identifier
        let email: string | undefined;
        try {
          const clonedRequest = request.clone();
          const body = await clonedRequest.json().catch(() => ({}));
          email = body.email || body.username;
        } catch {
          // If we can't parse the body, continue without email in identifier
        }

        // Apply rate limiting for auth endpoints
        const rateLimitResponse = await applyAuthRateLimit(
          request,
          email,
          "Too many authentication attempts. Please try again later."
        );
        if (rateLimitResponse) {
          return rateLimitResponse;
        }

        return auth.handler(request);
      },
    },
  },
});
