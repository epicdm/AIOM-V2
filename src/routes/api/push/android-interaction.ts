/**
 * Android Notification Interaction API Route
 *
 * This endpoint handles notification interactions from Android devices.
 * It tracks clicks, dismissals, action button taps, and reply actions.
 *
 * Security: Requires authentication via session token.
 */

import { createFileRoute } from "@tanstack/react-router";
import { getAndroidNotificationHandler } from "~/lib/push-notification/android-handler";
import { auth } from "~/utils/auth";

export const Route = createFileRoute("/api/push/android-interaction")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // Verify authentication
          const session = await auth.api.getSession({
            headers: request.headers,
          });

          if (!session?.user?.id) {
            return Response.json(
              { error: "Unauthorized" },
              { status: 401 }
            );
          }

          const body = await request.json();

          // Validate required fields
          if (!body.messageId || !body.deviceTokenId || !body.interactionType) {
            return Response.json(
              { error: "Missing required fields: messageId, deviceTokenId, interactionType" },
              { status: 400 }
            );
          }

          // Validate interaction type
          const validTypes = ["click", "dismiss", "action", "reply"];
          if (!validTypes.includes(body.interactionType)) {
            return Response.json(
              { error: `Invalid interactionType. Must be one of: ${validTypes.join(", ")}` },
              { status: 400 }
            );
          }

          const handler = getAndroidNotificationHandler();

          // Create and handle the interaction event
          const event = handler.createInteractionEvent({
            messageId: body.messageId,
            deviceTokenId: body.deviceTokenId,
            userId: session.user.id,
            interactionType: body.interactionType,
            actionId: body.actionId,
            replyText: body.replyText,
            deepLinkUrl: body.deepLinkUrl,
            deviceInfo: body.deviceInfo,
          });

          const result = await handler.handleInteraction(event);

          if (!result.success) {
            return Response.json(
              { error: result.error || "Failed to track interaction" },
              { status: 500 }
            );
          }

          return Response.json({
            success: true,
            interactionId: event.interactionId,
            timestamp: event.timestamp.toISOString(),
          });
        } catch (error) {
          console.error("Error handling notification interaction:", error);
          return Response.json(
            { error: "Failed to process interaction" },
            { status: 500 }
          );
        }
      },
    },
  },
});
