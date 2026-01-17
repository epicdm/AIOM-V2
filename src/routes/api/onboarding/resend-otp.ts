/**
 * Resend OTP API Route
 *
 * Resends the OTP code to the specified phone number.
 * Rate limited using Redis-backed token bucket algorithm to prevent abuse.
 *
 * POST /api/onboarding/resend-otp
 */

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getOnboardingSession } from "~/data-access/onboarding-session";
import {
  createPhoneVerification,
  getLatestVerificationByPhoneNumber,
} from "~/data-access/phone-verification";
import { applyOTPRateLimit } from "~/lib/rate-limiter";

// Input validation schema
const resendOTPSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required"),
  phoneNumber: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .regex(/^\+?[1-9]\d{9,14}$/, "Invalid phone number format"),
});

export const Route = createFileRoute("/api/onboarding/resend-otp")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // Clone the request to read the body for validation first
          const clonedRequest = request.clone();
          const body = await clonedRequest.json();

          // Validate input
          const validationResult = resendOTPSchema.safeParse(body);
          if (!validationResult.success) {
            return Response.json(
              {
                success: false,
                error: "Validation failed",
                details: validationResult.error.issues,
              },
              { status: 400 }
            );
          }

          const { sessionId, phoneNumber } = validationResult.data;

          // Apply Redis-backed OTP rate limiting (3 requests per minute per phone+IP)
          const rateLimitResponse = await applyOTPRateLimit(
            request,
            phoneNumber,
            "Too many OTP requests. Please wait before requesting a new code."
          );
          if (rateLimitResponse) {
            return rateLimitResponse;
          }

          // Check if session exists and is valid
          const session = await getOnboardingSession(sessionId);
          if (!session) {
            return Response.json(
              {
                success: false,
                error: "Session not found",
                message: "Please start a new onboarding session",
              },
              { status: 404 }
            );
          }

          if (session.isCompleted) {
            return Response.json(
              {
                success: false,
                error: "Session already completed",
                message: "This onboarding session has already been completed",
              },
              { status: 400 }
            );
          }

          if (new Date() > session.expiresAt) {
            return Response.json(
              {
                success: false,
                error: "Session expired",
                message: "Please start a new onboarding session",
              },
              { status: 400 }
            );
          }

          // Get client IP address
          const ipAddress =
            request.headers.get("x-forwarded-for") ||
            request.headers.get("x-real-ip") ||
            "unknown";

          // Create new phone verification (this also expires the old one)
          const { verification, otpCode } = await createPhoneVerification({
            phoneNumber,
            deviceId: session.deviceId || undefined,
            devicePlatform: session.devicePlatform as "ios" | "android" | "web" | undefined,
            ipAddress,
            expirationMinutes: 10,
          });

          // In production, you would send the OTP via SMS here
          console.log(`[DEV] New OTP for ${phoneNumber}: ${otpCode}`);

          return Response.json({
            success: true,
            data: {
              sessionId,
              verificationId: verification.id,
              phoneNumber,
              expiresAt: verification.expiresAt.toISOString(),
              // DEVELOPMENT ONLY - Remove in production
              ...(process.env.NODE_ENV !== "production" && { otpCode }),
            },
            message: `New verification code sent to ${phoneNumber}`,
          });
        } catch (error) {
          console.error("Error resending OTP:", error);
          return Response.json(
            {
              success: false,
              error: "Failed to resend OTP",
              message:
                error instanceof Error
                  ? error.message
                  : "An unexpected error occurred",
            },
            { status: 500 }
          );
        }
      },
    },
  },
});
