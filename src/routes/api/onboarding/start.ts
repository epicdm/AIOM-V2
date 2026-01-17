/**
 * Onboarding Start API Route
 *
 * Initiates a new onboarding session and sends OTP to the provided phone number.
 * This is the first step in the phone-based onboarding flow.
 * Rate limited to prevent OTP spam (3 requests per minute per phone+IP).
 *
 * POST /api/onboarding/start
 */

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { createOnboardingSession } from "~/data-access/onboarding-session";
import { createPhoneVerification } from "~/data-access/phone-verification";
import { applyOTPRateLimit } from "~/lib/rate-limiter";

// Input validation schema
const startOnboardingSchema = z.object({
  phoneNumber: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .regex(/^\+?[1-9]\d{9,14}$/, "Invalid phone number format (use E.164 format)"),
  deviceId: z.string().optional(),
  devicePlatform: z.enum(["ios", "android", "web"]).optional(),
  deviceName: z.string().optional(),
});

export const Route = createFileRoute("/api/onboarding/start")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // Clone the request to read the body for validation first
          const clonedRequest = request.clone();
          const body = await clonedRequest.json();

          // Validate input
          const validationResult = startOnboardingSchema.safeParse(body);
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

          const { phoneNumber, deviceId, devicePlatform, deviceName } =
            validationResult.data;

          // Apply OTP rate limiting (3 requests per minute per phone+IP)
          const rateLimitResponse = await applyOTPRateLimit(request, phoneNumber);
          if (rateLimitResponse) {
            return rateLimitResponse;
          }

          // Get client IP address
          const ipAddress =
            request.headers.get("x-forwarded-for") ||
            request.headers.get("x-real-ip") ||
            "unknown";

          // Create onboarding session
          const session = await createOnboardingSession({
            deviceId,
            devicePlatform,
            deviceName,
            expirationHours: 1,
          });

          // Create phone verification and generate OTP
          const { verification, otpCode } = await createPhoneVerification({
            phoneNumber,
            deviceId,
            devicePlatform,
            ipAddress,
            expirationMinutes: 10,
          });

          // In production, you would send the OTP via SMS here
          // For now, we'll return it in the response for development
          // TODO: Integrate with SMS provider (Twilio, AWS SNS, etc.)
          console.log(`[DEV] OTP for ${phoneNumber}: ${otpCode}`);

          // Return session info (don't return OTP in production!)
          return Response.json({
            success: true,
            data: {
              sessionId: session.id,
              verificationId: verification.id,
              phoneNumber,
              currentStep: "otp_verification",
              expiresAt: verification.expiresAt.toISOString(),
              // DEVELOPMENT ONLY - Remove in production
              ...(process.env.NODE_ENV !== "production" && { otpCode }),
            },
            message: `Verification code sent to ${phoneNumber}`,
          });
        } catch (error) {
          console.error("Error starting onboarding:", error);
          return Response.json(
            {
              success: false,
              error: "Failed to start onboarding",
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
