/**
 * Account Linking & SIP Provisioning API Route
 *
 * Links the verified phone number to a user account and provisions SIP credentials.
 * This is the final step in the phone-based onboarding flow.
 * Rate limited to prevent abuse (5 requests per minute - transfer preset).
 *
 * POST /api/onboarding/link-account
 */

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  getOnboardingSession,
  completeOnboardingSession,
} from "~/data-access/onboarding-session";
import { linkUserToVerification } from "~/data-access/phone-verification";
import {
  provisionSipCredential,
  getActiveSipCredentialByPhoneNumber,
} from "~/data-access/sip-credentials";
import { auth } from "~/utils/auth";
import { applyTransferRateLimit } from "~/lib/rate-limiter";

// Input validation schema
const linkAccountSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required"),
  displayName: z.string().min(1, "Display name is required").max(100).optional(),
});

export const Route = createFileRoute("/api/onboarding/link-account")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // Clone the request to read the body for validation first
          const clonedRequest = request.clone();
          const body = await clonedRequest.json();

          // Validate input
          const validationResult = linkAccountSchema.safeParse(body);
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

          const { sessionId, displayName } = validationResult.data;

          // Get authenticated user
          const authSession = await auth.api.getSession({
            headers: request.headers,
          });

          if (!authSession || !authSession.user) {
            return Response.json(
              {
                success: false,
                error: "Authentication required",
                message: "Please sign in to link your phone number",
              },
              { status: 401 }
            );
          }

          const userId = authSession.user.id;
          const userName = authSession.user.name || displayName || "User";

          // Apply rate limiting (5 requests per minute per user)
          const rateLimitResponse = await applyTransferRateLimit(
            request,
            userId,
            "Too many account linking requests. Please try again later."
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

          if (session.currentStep !== "account_link") {
            return Response.json(
              {
                success: false,
                error: "Invalid step",
                message: "Please complete phone verification first",
                currentStep: session.currentStep,
              },
              { status: 400 }
            );
          }

          if (!session.phoneNumber || !session.phoneVerificationId) {
            return Response.json(
              {
                success: false,
                error: "Missing verification",
                message: "Phone number has not been verified",
              },
              { status: 400 }
            );
          }

          // Link user to the phone verification
          await linkUserToVerification(session.phoneVerificationId, userId);

          // Check if user already has SIP credentials for this phone number
          const existingCredential = await getActiveSipCredentialByPhoneNumber(
            userId,
            session.phoneNumber
          );

          let sipCredential;
          if (existingCredential) {
            // Use existing credentials
            sipCredential = existingCredential;
          } else {
            // Provision new SIP credentials
            sipCredential = await provisionSipCredential({
              userId,
              phoneNumber: session.phoneNumber,
              displayName: displayName || userName,
            });
          }

          // Complete the onboarding session
          await completeOnboardingSession(
            sessionId,
            sipCredential.id,
            userId
          );

          return Response.json({
            success: true,
            data: {
              sessionId,
              completed: true,
              user: {
                id: userId,
                name: userName,
              },
              phoneNumber: session.phoneNumber,
              sipCredentials: {
                sipUsername: sipCredential.sipUsername,
                sipPassword: sipCredential.sipPassword,
                sipDomain: sipCredential.sipDomain,
                sipUri: sipCredential.sipUri,
                displayName: sipCredential.displayName,
                transportProtocol: sipCredential.transportProtocol,
                codecPreferences: sipCredential.codecPreferences,
                stunTurnConfig: sipCredential.stunTurnConfig,
              },
            },
            message: "Account linked and SIP credentials provisioned successfully",
          });
        } catch (error) {
          console.error("Error linking account:", error);
          return Response.json(
            {
              success: false,
              error: "Account linking failed",
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
