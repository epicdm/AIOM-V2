/**
 * Android Notification Server Functions
 *
 * Server functions for handling Android push notifications with
 * action buttons, deep linking, and interaction tracking.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { nanoid } from "nanoid";
import { authenticatedMiddleware, assertAdminMiddleware } from "./middleware";
import { getAndroidNotificationHandler } from "~/lib/push-notification/android-handler";
import { getPushNotificationService } from "~/lib/push-notification/service";
import { findUserDeviceTokens } from "~/data-access/push-notifications";
import type { DeepLinkScreen } from "~/lib/push-notification/android-types";

// =============================================================================
// Schemas
// =============================================================================

const deepLinkSchema = z.object({
  screen: z.enum([
    "home", "notifications", "messages", "profile", "settings",
    "expense", "briefing", "conversation", "call", "channel"
  ]),
  params: z.record(z.string(), z.string()).optional(),
  url: z.string().optional(),
});

const actionSchema = z.object({
  actionId: z.string().min(1),
  title: z.string().min(1),
  icon: z.string().optional(),
  deepLink: deepLinkSchema.optional(),
  url: z.string().optional(),
  requiresUnlock: z.boolean().optional(),
  allowTextInput: z.boolean().optional(),
  textInputPlaceholder: z.string().optional(),
  dismissOnClick: z.boolean().optional(),
});

const sendAndroidNotificationSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  title: z.string().min(1, "Title is required"),
  body: z.string().min(1, "Body is required"),
  channelId: z.string().optional(),
  priority: z.enum(["min", "low", "default", "high", "max"]).optional(),
  deepLink: deepLinkSchema.optional(),
  actions: z.array(actionSchema).optional(),
  groupKey: z.string().optional(),
  data: z.record(z.string(), z.string()).optional(),
  image: z.string().optional(),
});

const sendMessageNotificationSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  senderId: z.string().min(1, "Sender ID is required"),
  senderName: z.string().min(1, "Sender name is required"),
  message: z.string().min(1, "Message is required"),
  conversationId: z.string().optional(),
  avatarUrl: z.string().optional(),
});

const sendExpenseNotificationSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  expenseId: z.string().min(1, "Expense ID is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  amount: z.string().min(1, "Amount is required"),
  requesterName: z.string().min(1, "Requester name is required"),
  requiresApproval: z.boolean().optional(),
});

const sendBriefingNotificationSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  briefingId: z.string().min(1, "Briefing ID is required"),
  title: z.string().optional(),
  summary: z.string().min(1, "Summary is required"),
});

const sendChannelNotificationSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  channelId: z.string().min(1, "Channel ID is required"),
  channelName: z.string().min(1, "Channel name is required"),
  senderName: z.string().min(1, "Sender name is required"),
  message: z.string().min(1, "Message is required"),
  unreadCount: z.number().optional(),
});

const trackInteractionSchema = z.object({
  messageId: z.string().min(1, "Message ID is required"),
  deviceTokenId: z.string().min(1, "Device token ID is required"),
  interactionType: z.enum(["click", "dismiss", "action", "reply"]),
  actionId: z.string().optional(),
  replyText: z.string().optional(),
  deepLinkUrl: z.string().optional(),
  deviceInfo: z.object({
    osVersion: z.string().optional(),
    appVersion: z.string().optional(),
    deviceModel: z.string().optional(),
  }).optional(),
});

const getNotificationChannelsSchema = z.object({});

// =============================================================================
// Android Notification Functions
// =============================================================================

/**
 * Send an Android notification with custom actions and deep linking
 */
export const sendAndroidNotificationFn = createServerFn({
  method: "POST",
})
  .inputValidator(sendAndroidNotificationSchema)
  .middleware([assertAdminMiddleware])
  .handler(async ({ data }) => {
    const handler = getAndroidNotificationHandler();
    const service = getPushNotificationService();

    // Build Android-specific payload
    const payload = handler.buildAndroidPayload(
      {
        title: data.title,
        body: data.body,
        priority: data.priority === "high" || data.priority === "max" ? "high" : "normal",
        image: data.image,
        data: data.data,
      },
      {
        channelId: data.channelId,
        actions: data.actions,
        deepLink: data.deepLink as { screen: DeepLinkScreen; params?: Record<string, string>; url?: string } | undefined,
        groupKey: data.groupKey,
      }
    );

    // Get user's Android devices
    const devices = await findUserDeviceTokens(data.userId, "fcm");
    const androidDevices = devices.filter((d) => d.devicePlatform === "android");

    if (androidDevices.length === 0) {
      return {
        success: false,
        error: "No Android devices found for user",
        totalDevices: 0,
        successCount: 0,
        failureCount: 0,
      };
    }

    // Send notification using the FCM message format
    let successCount = 0;
    let failureCount = 0;

    for (const device of androidDevices) {
      const fcmMessage = handler.toFCMMessage(device.token, payload);

      // Send via the push notification service
      const result = await service.sendToUser(data.userId, {
        title: payload.title,
        body: payload.body,
        icon: payload.icon,
        image: payload.image,
        clickAction: payload.clickAction,
        data: {
          ...payload.data,
          android_payload: JSON.stringify(payload),
        },
        priority: payload.priority === "high" || payload.priority === "max" ? "high" : "normal",
      });

      successCount += result.successCount;
      failureCount += result.failureCount;
    }

    return {
      success: successCount > 0,
      totalDevices: androidDevices.length,
      successCount,
      failureCount,
    };
  });

/**
 * Send a message notification with quick reply action
 */
export const sendMessageNotificationFn = createServerFn({
  method: "POST",
})
  .inputValidator(sendMessageNotificationSchema)
  .middleware([assertAdminMiddleware])
  .handler(async ({ data }) => {
    const handler = getAndroidNotificationHandler();
    const service = getPushNotificationService();

    const payload = handler.buildMessageNotification(
      data.senderId,
      data.senderName,
      data.message,
      {
        conversationId: data.conversationId,
        avatarUrl: data.avatarUrl,
      }
    );

    const result = await service.sendToUser(data.userId, {
      title: payload.title,
      body: payload.body,
      icon: payload.icon,
      image: payload.image,
      clickAction: payload.clickAction,
      data: {
        ...payload.data,
        android_payload: JSON.stringify(payload),
      },
      priority: "high",
    });

    return {
      success: result.successCount > 0,
      totalDevices: result.totalDevices,
      successCount: result.successCount,
      failureCount: result.failureCount,
    };
  });

/**
 * Send an expense approval notification with approve/reject actions
 */
export const sendExpenseNotificationFn = createServerFn({
  method: "POST",
})
  .inputValidator(sendExpenseNotificationSchema)
  .middleware([assertAdminMiddleware])
  .handler(async ({ data }) => {
    const handler = getAndroidNotificationHandler();
    const service = getPushNotificationService();

    const payload = handler.buildExpenseNotification(
      data.expenseId,
      data.title,
      data.description,
      data.amount,
      data.requesterName,
      {
        requiresApproval: data.requiresApproval,
      }
    );

    const result = await service.sendToUser(data.userId, {
      title: payload.title,
      body: payload.body,
      icon: payload.icon,
      image: payload.image,
      clickAction: payload.clickAction,
      data: {
        ...payload.data,
        android_payload: JSON.stringify(payload),
      },
      priority: "high",
    });

    return {
      success: result.successCount > 0,
      totalDevices: result.totalDevices,
      successCount: result.successCount,
      failureCount: result.failureCount,
    };
  });

/**
 * Send a daily briefing notification
 */
export const sendBriefingNotificationFn = createServerFn({
  method: "POST",
})
  .inputValidator(sendBriefingNotificationSchema)
  .middleware([assertAdminMiddleware])
  .handler(async ({ data }) => {
    const handler = getAndroidNotificationHandler();
    const service = getPushNotificationService();

    const payload = handler.buildBriefingNotification(
      data.briefingId,
      data.title || "Your Daily Briefing",
      data.summary
    );

    const result = await service.sendToUser(data.userId, {
      title: payload.title,
      body: payload.body,
      icon: payload.icon,
      image: payload.image,
      clickAction: payload.clickAction,
      data: {
        ...payload.data,
        android_payload: JSON.stringify(payload),
      },
      priority: "normal",
    });

    return {
      success: result.successCount > 0,
      totalDevices: result.totalDevices,
      successCount: result.successCount,
      failureCount: result.failureCount,
    };
  });

/**
 * Send a channel message notification (Odoo Discuss)
 */
export const sendChannelNotificationFn = createServerFn({
  method: "POST",
})
  .inputValidator(sendChannelNotificationSchema)
  .middleware([assertAdminMiddleware])
  .handler(async ({ data }) => {
    const handler = getAndroidNotificationHandler();
    const service = getPushNotificationService();

    const payload = handler.buildChannelNotification(
      data.channelId,
      data.channelName,
      data.senderName,
      data.message,
      data.unreadCount || 1
    );

    const result = await service.sendToUser(data.userId, {
      title: payload.title,
      body: payload.body,
      icon: payload.icon,
      badge: payload.largeIcon,
      clickAction: payload.clickAction,
      data: {
        ...payload.data,
        android_payload: JSON.stringify(payload),
      },
      priority: "high",
    });

    return {
      success: result.successCount > 0,
      totalDevices: result.totalDevices,
      successCount: result.successCount,
      failureCount: result.failureCount,
    };
  });

/**
 * Track a notification interaction from the Android app
 */
export const trackNotificationInteractionFn = createServerFn({
  method: "POST",
})
  .inputValidator(trackInteractionSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const handler = getAndroidNotificationHandler();

    const event = handler.createInteractionEvent({
      messageId: data.messageId,
      deviceTokenId: data.deviceTokenId,
      userId: context.userId,
      interactionType: data.interactionType,
      actionId: data.actionId,
      replyText: data.replyText,
      deepLinkUrl: data.deepLinkUrl,
      deviceInfo: data.deviceInfo,
    });

    const result = await handler.handleInteraction(event);

    return {
      success: result.success,
      interactionId: event.interactionId,
      error: result.error,
    };
  });

/**
 * Get all registered notification channels
 */
export const getNotificationChannelsFn = createServerFn({
  method: "GET",
})
  .handler(async () => {
    const handler = getAndroidNotificationHandler();
    const channels = handler.getAllChannels();

    return {
      channels: channels.map((channel) => ({
        channelId: channel.channelId,
        channelName: channel.channelName,
        channelDescription: channel.channelDescription,
        importance: channel.importance,
        showBadge: channel.showBadge,
        enableVibration: channel.enableVibration,
      })),
    };
  });

/**
 * Get deep link configuration
 */
export const getDeepLinkConfigFn = createServerFn({
  method: "GET",
})
  .handler(async () => {
    const { DEEP_LINK_SCHEME } = await import("~/lib/push-notification/android-types");

    return {
      scheme: DEEP_LINK_SCHEME,
      supportedScreens: [
        "home",
        "notifications",
        "messages",
        "profile",
        "settings",
        "expense",
        "briefing",
        "conversation",
        "call",
        "channel",
      ],
    };
  });
