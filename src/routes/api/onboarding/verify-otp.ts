/**
 * OTP Verification API Route
 *
 * Verifies the OTP code entered by the user.
 * This is the second step in the phone-based onboarding flow.
 * Rate limited to prevent brute force OTP guessing (10 attempts per minute).
 *
 * POST /api/onboarding/verify-otp
 */

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  getOnboardingSession,
  updateOnboardingSession,
} from "~/data-access/onboarding-session";
import { verifyOTP } from "~/data-access/phone-verification";
import { applyRateLimit, extractIdentifier } from "~/lib/rate-limiter";

// Input validation schema
const verifyOTPSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required"),
  phoneNumber: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .regex(/^\+?[1-9]\d{9,14}$/, "Invalid phone number format"),
  otpCode: z
    .string()
    .length(6, "OTP code must be 6 digits")
    .regex(/^\d{6}$/, "OTP code must contain only digits"),
});

export const Route = createFileRoute("/api/onboarding/verify-otp")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // Clone the request to read the body for validation first
          const clonedRequest = request.clone();
          const body = await clonedRequest.json();

          // Validate input
          const validationResult = verifyOTPSchema.safeParse(body);
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

          const { sessionId, phoneNumber, otpCode } = validationResult.data;

          // Apply rate limiting for OTP verification attempts (10 per minute per phone+IP)
          // This is slightly more lenient than OTP sending since users may mistype
          const ip = extractIdentifier(request);
          const identifier = `verify-otp:${phoneNumber}:${ip}`;
          const rateLimitResponse = await applyRateLimit(
            request,
            { maxTokens: 10, windowSeconds: 60 },
            {
              identifier,
              customMessage: "Too many verification attempts. Please wait before trying again.",
            }
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

          // Verify the OTP
          const verificationResult = await verifyOTP({
            phoneNumber,
            otpCode,
          });

          if (!verificationResult.success) {
            return Response.json(
              {
                success: false,
                error: "Verification failed",
                message: verificationResult.error,
              },
              { status: 400 }
            );
          }

          // Update the session with verification info and advance step
          const updatedSession = await updateOnboardingSession(sessionId, {
            currentStep: "account_link",
            phoneNumber,
            phoneVerificationId: verificationResult.verificationId,
          });

          return Response.json({
            success: true,
            data: {
              sessionId: session.id,
              phoneNumber,
              verified: true,
              currentStep: "account_link",
              nextStep: "Link your account or create a new one",
            },
            message: "Phone number verified successfully",
          });
        } catch (error) {
          console.error("Error verifying OTP:", error);
          return Response.json(
            {
              success: false,
              error: "Verification failed",
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
