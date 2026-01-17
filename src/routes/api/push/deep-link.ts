/**
 * Deep Link Resolution API Route
 *
 * This endpoint handles deep link resolution and validation.
 * It helps Android apps determine where to navigate based on a deep link URL.
 *
 * Security: Public endpoint for URL parsing, authenticated for context-aware resolution.
 */

import { createFileRoute } from "@tanstack/react-router";
import {
  parseDeepLinkUrl,
  buildDeepLinkUrl,
  DEEP_LINK_SCHEME,
  type DeepLinkScreen,
} from "~/lib/push-notification/android-types";
import { auth } from "~/utils/auth";

export const Route = createFileRoute("/api/push/deep-link")({
  server: {
    handlers: {
      // Parse a deep link URL
      POST: async ({ request }) => {
        try {
          const body = await request.json();

          if (!body.url) {
            return Response.json(
              { error: "Missing required field: url" },
              { status: 400 }
            );
          }

          const result = parseDeepLinkUrl(body.url);

          if (!result.success) {
            return Response.json(
              {
                success: false,
                error: result.error,
              },
              { status: 400 }
            );
          }

          // Get optional auth context
          const session = await auth.api.getSession({
            headers: request.headers,
          }).catch(() => null);

          // Build response with navigation hints
          const response: Record<string, unknown> = {
            success: true,
            screen: result.screen,
            params: result.params,
            // Add navigation hints based on screen type
            navigation: getNavigationHints(result.screen!, result.params),
          };

          // Add user context if authenticated
          if (session?.user?.id) {
            response.userContext = {
              userId: session.user.id,
              isAuthenticated: true,
            };
          }

          return Response.json(response);
        } catch (error) {
          console.error("Error parsing deep link:", error);
          return Response.json(
            { error: "Failed to parse deep link" },
            { status: 500 }
          );
        }
      },

      // Build a deep link URL from components
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const screen = url.searchParams.get("screen") as DeepLinkScreen | null;

          if (!screen) {
            return Response.json(
              { error: "Missing required query parameter: screen" },
              { status: 400 }
            );
          }

          // Validate screen
          const validScreens: DeepLinkScreen[] = [
            "home", "notifications", "messages", "profile", "settings",
            "expense", "briefing", "conversation", "call", "channel"
          ];

          if (!validScreens.includes(screen)) {
            return Response.json(
              { error: `Invalid screen. Must be one of: ${validScreens.join(", ")}` },
              { status: 400 }
            );
          }

          // Extract params from query string (excluding 'screen')
          const params: Record<string, string> = {};
          url.searchParams.forEach((value, key) => {
            if (key !== "screen") {
              params[key] = value;
            }
          });

          const deepLinkUrl = buildDeepLinkUrl({
            screen,
            params: Object.keys(params).length > 0 ? params : undefined,
          });

          return Response.json({
            success: true,
            url: deepLinkUrl,
            scheme: DEEP_LINK_SCHEME,
            screen,
            params: Object.keys(params).length > 0 ? params : undefined,
          });
        } catch (error) {
          console.error("Error building deep link:", error);
          return Response.json(
            { error: "Failed to build deep link" },
            { status: 500 }
          );
        }
      },
    },
  },
});

/**
 * Get navigation hints based on screen type and params
 */
function getNavigationHints(
  screen: DeepLinkScreen,
  params?: Record<string, string>
): Record<string, unknown> {
  const hints: Record<string, unknown> = {
    requiresAuth: true, // Most screens require auth
    bottomNav: true, // Show bottom navigation
    backButton: true, // Show back button
  };

  switch (screen) {
    case "home":
      hints.bottomNavItem = "home";
      hints.backButton = false;
      break;
    case "notifications":
      hints.bottomNavItem = "notifications";
      hints.backButton = false;
      break;
    case "messages":
      hints.bottomNavItem = "messages";
      if (params?.id) {
        hints.openConversation = params.id;
        hints.backButton = true;
      } else {
        hints.backButton = false;
      }
      break;
    case "profile":
      hints.bottomNavItem = "profile";
      hints.backButton = false;
      break;
    case "settings":
      hints.bottomNav = false;
      hints.backDestination = "profile";
      break;
    case "expense":
      hints.bottomNav = false;
      hints.backDestination = "home";
      if (params?.action) {
        hints.showActionDialog = params.action; // "approve" or "reject"
      }
      break;
    case "briefing":
      hints.bottomNav = false;
      hints.backDestination = "home";
      if (params?.id) {
        hints.briefingId = params.id;
      }
      break;
    case "conversation":
      hints.bottomNav = false;
      hints.backDestination = "messages";
      if (params?.id) {
        hints.conversationId = params.id;
      }
      break;
    case "call":
      hints.bottomNav = false;
      hints.requiresAuth = true;
      hints.fullScreen = true;
      if (params?.action) {
        hints.callAction = params.action; // "answer" or "decline"
      }
      break;
    case "channel":
      hints.bottomNav = false;
      hints.backDestination = "messages";
      if (params?.id) {
        hints.channelId = params.id;
      }
      break;
  }

  return hints;
}
