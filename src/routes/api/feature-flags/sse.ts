/**
 * Feature Flag Server-Sent Events (SSE) API Route
 *
 * Provides real-time updates for feature flag changes.
 * Clients can connect to this endpoint to receive notifications
 * when feature flags are toggled, updated, or deleted.
 *
 * Authentication: Requires valid session
 * Method: GET
 *
 * @example
 * ```typescript
 * const eventSource = new EventSource("/api/feature-flags/sse");
 *
 * eventSource.onmessage = (event) => {
 *   const data = JSON.parse(event.data);
 *   console.log("Flag change:", data);
 * };
 * ```
 */

import { createFileRoute } from "@tanstack/react-router";
import { getFeatureFlagEventEmitter } from "~/lib/feature-flag-service";
import { auth } from "~/utils/auth";
import type { FeatureFlagEvent } from "~/lib/feature-flag-service/types";

export const Route = createFileRoute("/api/feature-flags/sse")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // Verify authentication
        const session = await auth.api.getSession({
          headers: request.headers,
        });

        if (!session?.user?.id) {
          return new Response("Unauthorized", { status: 401 });
        }

        const userId = session.user.id;
        const userRole = (session.user as { role?: string }).role as
          | "md"
          | "field-tech"
          | "admin"
          | "sales"
          | null;

        // Set up SSE response
        const encoder = new TextEncoder();
        let controllerRef: ReadableStreamDefaultController | null = null;

        const stream = new ReadableStream({
          start(controller) {
            controllerRef = controller;

            // Get event emitter
            const eventEmitter = getFeatureFlagEventEmitter();

            // Send initial connection event
            const connectionEvent = JSON.stringify({
              type: "connection",
              timestamp: Date.now(),
              userId,
            });
            controller.enqueue(encoder.encode(`data: ${connectionEvent}\n\n`));

            // Register SSE client
            const client = eventEmitter.registerSSEClient(
              userId,
              userRole,
              (event: FeatureFlagEvent) => {
                try {
                  const data = JSON.stringify(event);
                  controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                } catch (error) {
                  console.error("Error sending SSE event:", error);
                }
              },
              () => {
                try {
                  controller.close();
                } catch {
                  // Ignore close errors
                }
              }
            );

            // Store client ID for cleanup
            (controller as { clientId?: string }).clientId = client.id;

            // Set up keepalive ping
            const pingInterval = setInterval(() => {
              try {
                const ping = JSON.stringify({
                  type: "ping",
                  timestamp: Date.now(),
                });
                controller.enqueue(encoder.encode(`data: ${ping}\n\n`));
                eventEmitter.pingClient(client.id);
              } catch {
                clearInterval(pingInterval);
              }
            }, 30000); // Ping every 30 seconds

            // Store interval for cleanup
            (controller as { pingInterval?: NodeJS.Timeout }).pingInterval =
              pingInterval;
          },

          cancel() {
            // Clean up on disconnect
            if (controllerRef) {
              const ctrl = controllerRef as {
                clientId?: string;
                pingInterval?: NodeJS.Timeout;
              };

              if (ctrl.pingInterval) {
                clearInterval(ctrl.pingInterval);
              }

              if (ctrl.clientId) {
                const eventEmitter = getFeatureFlagEventEmitter();
                eventEmitter.unregisterSSEClient(ctrl.clientId);
              }
            }
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
          },
        });
      },
    },
  },
});
