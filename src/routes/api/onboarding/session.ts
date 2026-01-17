/**
 * Onboarding Session Status API Route
 *
 * Get the current status of an onboarding session.
 *
 * GET /api/onboarding/session?sessionId=xxx
 */

import { createFileRoute } from "@tanstack/react-router";
import { getOnboardingSession } from "~/data-access/onboarding-session";

export const Route = createFileRoute("/api/onboarding/session")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const sessionId = url.searchParams.get("sessionId");

          if (!sessionId) {
            return Response.json(
              {
                success: false,
                error: "Session ID is required",
              },
              { status: 400 }
            );
          }

          const session = await getOnboardingSession(sessionId);

          if (!session) {
            return Response.json(
              {
                success: false,
                error: "Session not found",
              },
              { status: 404 }
            );
          }

          const now = new Date();
          const isExpired = now > session.expiresAt;

          return Response.json({
            success: true,
            data: {
              sessionId: session.id,
              currentStep: session.currentStep,
              phoneNumber: session.phoneNumber,
              isCompleted: session.isCompleted,
              isExpired,
              expiresAt: session.expiresAt.toISOString(),
              createdAt: session.createdAt.toISOString(),
              deviceId: session.deviceId,
              devicePlatform: session.devicePlatform,
              // Only include SIP credential reference if completed
              ...(session.isCompleted && {
                sipCredentialId: session.sipCredentialId,
                userId: session.userId,
              }),
            },
          });
        } catch (error) {
          console.error("Error getting session:", error);
          return Response.json(
            {
              success: false,
              error: "Failed to get session",
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
