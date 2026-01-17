/**
 * Android Notification Configuration API Route
 *
 * This endpoint provides Android-specific notification configuration
 * including notification channels, deep link schemes, and supported screens.
 *
 * This is a public endpoint to allow Android apps to configure themselves.
 */

import { createFileRoute } from "@tanstack/react-router";
import { getAndroidNotificationHandler } from "~/lib/push-notification/android-handler";
import { DEEP_LINK_SCHEME } from "~/lib/push-notification/android-types";

export const Route = createFileRoute("/api/push/android-config")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const handler = getAndroidNotificationHandler();
          const channels = handler.getAllChannels();

          return Response.json({
            success: true,
            config: {
              // Deep link configuration
              deepLink: {
                scheme: DEEP_LINK_SCHEME,
                supportedScreens: [
                  { screen: "home", description: "Home screen" },
                  { screen: "notifications", description: "Notifications list" },
                  { screen: "messages", description: "Messages/conversations" },
                  { screen: "profile", description: "User profile" },
                  { screen: "settings", description: "App settings" },
                  { screen: "expense", description: "Expense details" },
                  { screen: "briefing", description: "Daily briefing" },
                  { screen: "conversation", description: "Conversation thread" },
                  { screen: "call", description: "Call screen" },
                  { screen: "channel", description: "Channel messages" },
                ],
              },
              // Notification channels
              channels: channels.map((channel) => ({
                channelId: channel.channelId,
                channelName: channel.channelName,
                channelDescription: channel.channelDescription,
                importance: channel.importance || "default",
                showBadge: channel.showBadge ?? true,
                enableVibration: channel.enableVibration ?? true,
                vibrationPattern: channel.vibrationPattern,
                lightColor: channel.lightColor,
                sound: channel.sound,
              })),
              // Default notification settings
              defaults: {
                channelId: "default",
                icon: "ic_notification",
                color: "#6366F1",
                priority: "default",
                autoCancel: true,
              },
              // Action button configuration
              actions: {
                maxActions: 3,
                supportedIcons: [
                  "ic_reply",
                  "ic_check",
                  "ic_close",
                  "ic_alarm",
                  "ic_call",
                  "ic_call_end",
                  "ic_videocam",
                  "ic_message",
                  "ic_open",
                  "ic_view",
                ],
              },
            },
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error("Error getting Android config:", error);
          return Response.json(
            { error: "Failed to get configuration" },
            { status: 500 }
          );
        }
      },
    },
  },
});
