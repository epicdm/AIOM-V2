/**
 * Android Notification Handler Service
 *
 * Handles incoming push notifications for Android devices with support for:
 * - Notification display configuration
 * - Action buttons
 * - Deep linking to relevant screens
 * - Notification interaction tracking
 */

import { nanoid } from "nanoid";
import type {
  AndroidNotificationPayload,
  AndroidNotificationAction,
  AndroidNotificationChannel,
  DeepLinkConfig,
  NotificationInteractionEvent,
  AndroidNotificationDisplayResult,
  DeepLinkScreen,
} from "./android-types";
import {
  DEFAULT_NOTIFICATION_CHANNELS,
  buildDeepLinkUrl,
  parseDeepLinkUrl,
  createQuickReplyAction,
  createDeepLinkAction,
} from "./android-types";
import type { PushNotificationPayload } from "./types";

/**
 * Configuration for the Android notification handler
 */
export interface AndroidNotificationHandlerConfig {
  // Default notification channel ID
  defaultChannelId?: string;
  // Custom notification channels
  customChannels?: AndroidNotificationChannel[];
  // Default notification icon
  defaultIcon?: string;
  // Default accent color (hex)
  defaultColor?: string;
  // Whether to track notification interactions
  trackInteractions?: boolean;
  // Callback for handling notification interactions
  onInteraction?: (event: NotificationInteractionEvent) => Promise<void>;
}

/**
 * Android Notification Handler Service
 *
 * This service handles the server-side preparation of Android push notifications
 * with advanced features like action buttons and deep linking.
 */
export class AndroidNotificationHandler {
  private config: AndroidNotificationHandlerConfig;
  private channels: Map<string, AndroidNotificationChannel>;

  constructor(config: AndroidNotificationHandlerConfig = {}) {
    this.config = {
      defaultChannelId: "default",
      defaultIcon: "ic_notification",
      defaultColor: "#6366F1", // Indigo
      trackInteractions: true,
      ...config,
    };

    // Initialize channels
    this.channels = new Map();
    DEFAULT_NOTIFICATION_CHANNELS.forEach((channel) => {
      this.channels.set(channel.channelId, channel);
    });

    // Add custom channels
    config.customChannels?.forEach((channel) => {
      this.channels.set(channel.channelId, channel);
    });
  }

  /**
   * Build an Android-specific notification payload from a generic payload
   */
  buildAndroidPayload(
    payload: PushNotificationPayload,
    options?: {
      channelId?: string;
      actions?: AndroidNotificationAction[];
      deepLink?: DeepLinkConfig;
      groupKey?: string;
    }
  ): AndroidNotificationPayload {
    const channelId = options?.channelId || this.config.defaultChannelId || "default";
    const channel = this.channels.get(channelId);

    const androidPayload: AndroidNotificationPayload = {
      title: payload.title,
      body: payload.body,
      icon: this.config.defaultIcon,
      color: this.config.defaultColor,
      channel: channel,
      priority: payload.priority === "high" ? "high" : "default",
      autoCancel: true,
      showTimestamp: true,
      timestamp: Date.now(),
      data: payload.data,
    };

    // Add image if provided
    if (payload.image) {
      androidPayload.image = payload.image;
    }

    // Add badge icon
    if (payload.badge) {
      androidPayload.largeIcon = payload.badge;
    }

    // Add deep link
    if (options?.deepLink) {
      androidPayload.deepLink = options.deepLink;
      androidPayload.clickAction = buildDeepLinkUrl(options.deepLink);
    } else if (payload.clickAction) {
      androidPayload.clickAction = payload.clickAction;
    }

    // Add action buttons
    if (options?.actions) {
      androidPayload.actions = options.actions;
    }

    // Add group key for bundling
    if (options?.groupKey) {
      androidPayload.groupKey = options.groupKey;
    }

    return androidPayload;
  }

  /**
   * Build a message notification with quick reply action
   */
  buildMessageNotification(
    senderId: string,
    senderName: string,
    message: string,
    options?: {
      channelId?: string;
      conversationId?: string;
      avatarUrl?: string;
    }
  ): AndroidNotificationPayload {
    const actions: AndroidNotificationAction[] = [
      createQuickReplyAction("reply", "Reply"),
      createDeepLinkAction("view", "View", "messages", {
        id: options?.conversationId || senderId
      }),
    ];

    return this.buildAndroidPayload(
      {
        title: senderName,
        body: message,
        priority: "high",
        data: {
          type: "message",
          senderId,
          senderName,
          conversationId: options?.conversationId || "",
        },
      },
      {
        channelId: options?.channelId || "messages",
        actions,
        deepLink: {
          screen: "messages",
          params: { id: options?.conversationId || senderId },
        },
        groupKey: `messages_${senderId}`,
      }
    );
  }

  /**
   * Build an expense notification with approve/reject actions
   */
  buildExpenseNotification(
    expenseId: string,
    title: string,
    description: string,
    amount: string,
    requesterName: string,
    options?: {
      channelId?: string;
      requiresApproval?: boolean;
    }
  ): AndroidNotificationPayload {
    const actions: AndroidNotificationAction[] = [];

    if (options?.requiresApproval) {
      actions.push({
        actionId: "approve",
        title: "Approve",
        icon: "ic_check",
        deepLink: {
          screen: "expense",
          params: { id: expenseId, action: "approve" },
        },
        requiresUnlock: true,
        dismissOnClick: true,
      });
      actions.push({
        actionId: "reject",
        title: "Reject",
        icon: "ic_close",
        deepLink: {
          screen: "expense",
          params: { id: expenseId, action: "reject" },
        },
        requiresUnlock: true,
        dismissOnClick: true,
      });
    }

    actions.push(
      createDeepLinkAction("view", "View Details", "expense", { id: expenseId })
    );

    return this.buildAndroidPayload(
      {
        title,
        body: `${description}\nAmount: ${amount}\nFrom: ${requesterName}`,
        priority: "high",
        data: {
          type: "expense",
          expenseId,
          amount,
          requesterName,
        },
      },
      {
        channelId: options?.channelId || "alerts",
        actions,
        deepLink: {
          screen: "expense",
          params: { id: expenseId },
        },
      }
    );
  }

  /**
   * Build a daily briefing notification
   */
  buildBriefingNotification(
    briefingId: string,
    title: string,
    summary: string
  ): AndroidNotificationPayload {
    const actions: AndroidNotificationAction[] = [
      createDeepLinkAction("read", "Read Now", "briefing", { id: briefingId }),
      {
        actionId: "remind_later",
        title: "Remind Later",
        icon: "ic_alarm",
        dismissOnClick: true,
      },
    ];

    return this.buildAndroidPayload(
      {
        title: title || "Your Daily Briefing",
        body: summary,
        priority: "normal",
        data: {
          type: "briefing",
          briefingId,
        },
      },
      {
        channelId: "reminders",
        actions,
        deepLink: {
          screen: "briefing",
          params: { id: briefingId },
        },
      }
    );
  }

  /**
   * Build a call notification with answer/decline actions
   */
  buildCallNotification(
    callId: string,
    callerName: string,
    callerId: string,
    options?: {
      callerImage?: string;
      isVideo?: boolean;
    }
  ): AndroidNotificationPayload {
    const actions: AndroidNotificationAction[] = [
      {
        actionId: "answer",
        title: options?.isVideo ? "Video" : "Answer",
        icon: options?.isVideo ? "ic_videocam" : "ic_call",
        deepLink: {
          screen: "call",
          params: { id: callId, action: "answer" },
        },
        dismissOnClick: true,
      },
      {
        actionId: "decline",
        title: "Decline",
        icon: "ic_call_end",
        deepLink: {
          screen: "call",
          params: { id: callId, action: "decline" },
        },
        dismissOnClick: true,
      },
    ];

    return this.buildAndroidPayload(
      {
        title: "Incoming Call",
        body: callerName,
        priority: "high",
        image: options?.callerImage,
        data: {
          type: "call",
          callId,
          callerId,
          callerName,
          isVideo: options?.isVideo ? "true" : "false",
        },
      },
      {
        channelId: "alerts",
        actions,
        deepLink: {
          screen: "call",
          params: { id: callId },
        },
      }
    );
  }

  /**
   * Build a channel message notification (Odoo Discuss)
   */
  buildChannelNotification(
    channelId: string,
    channelName: string,
    senderName: string,
    message: string,
    unreadCount: number = 1
  ): AndroidNotificationPayload {
    const actions: AndroidNotificationAction[] = [
      createQuickReplyAction("reply", "Reply"),
      createDeepLinkAction("open", "Open Channel", "channel", { id: channelId }),
    ];

    const body = unreadCount > 1
      ? `${senderName}: ${message} (+${unreadCount - 1} more)`
      : `${senderName}: ${message}`;

    return this.buildAndroidPayload(
      {
        title: channelName,
        body,
        priority: "high",
        badge: unreadCount.toString(),
        data: {
          type: "channel_message",
          channelId,
          channelName,
          senderName,
          unreadCount: unreadCount.toString(),
        },
      },
      {
        channelId: "messages",
        actions,
        deepLink: {
          screen: "channel",
          params: { id: channelId },
        },
        groupKey: `channel_${channelId}`,
      }
    );
  }

  /**
   * Build a system notification
   */
  buildSystemNotification(
    title: string,
    message: string,
    options?: {
      deepLink?: DeepLinkConfig;
      actionUrl?: string;
      actionLabel?: string;
    }
  ): AndroidNotificationPayload {
    const actions: AndroidNotificationAction[] = [];

    if (options?.actionUrl || options?.deepLink) {
      actions.push({
        actionId: "action",
        title: options?.actionLabel || "View",
        deepLink: options?.deepLink,
        url: options?.actionUrl,
        dismissOnClick: true,
      });
    }

    return this.buildAndroidPayload(
      {
        title,
        body: message,
        priority: "normal",
        data: {
          type: "system",
        },
      },
      {
        channelId: "system",
        actions,
        deepLink: options?.deepLink,
      }
    );
  }

  /**
   * Convert Android payload to FCM message format
   */
  toFCMMessage(
    token: string,
    payload: AndroidNotificationPayload
  ): Record<string, unknown> {
    const message: Record<string, unknown> = {
      token,
      notification: {
        title: payload.title,
        body: payload.body,
        image: payload.image,
      },
      android: {
        priority: payload.priority === "high" ? "HIGH" : "NORMAL",
        ttl: payload.ttl ? `${payload.ttl}s` : "86400s", // Default 24 hours
        notification: {
          icon: payload.icon,
          color: payload.color,
          sound: payload.sound || "default",
          tag: payload.tag,
          click_action: payload.clickAction,
          channel_id: payload.channel?.channelId || "default",
          notification_priority: this.mapPriorityToFCM(payload.priority),
          visibility: this.mapVisibilityToFCM(payload.visibility),
          event_time: payload.timestamp
            ? new Date(payload.timestamp).toISOString()
            : undefined,
          local_only: payload.localOnly,
          ticker: payload.ticker,
        },
      },
      data: {
        ...payload.data,
        deep_link: payload.deepLink ? buildDeepLinkUrl(payload.deepLink) : undefined,
        actions: payload.actions ? JSON.stringify(payload.actions) : undefined,
        group_key: payload.groupKey,
        is_group_summary: payload.isGroupSummary ? "true" : "false",
      },
    };

    // Clean up undefined values from data
    if (message.data) {
      Object.keys(message.data as Record<string, unknown>).forEach((key) => {
        if ((message.data as Record<string, unknown>)[key] === undefined) {
          delete (message.data as Record<string, unknown>)[key];
        }
      });
    }

    return message;
  }

  /**
   * Map internal priority to FCM priority
   */
  private mapPriorityToFCM(
    priority?: string
  ): "PRIORITY_UNSPECIFIED" | "PRIORITY_MIN" | "PRIORITY_LOW" | "PRIORITY_DEFAULT" | "PRIORITY_HIGH" | "PRIORITY_MAX" {
    switch (priority) {
      case "min":
        return "PRIORITY_MIN";
      case "low":
        return "PRIORITY_LOW";
      case "high":
        return "PRIORITY_HIGH";
      case "max":
        return "PRIORITY_MAX";
      default:
        return "PRIORITY_DEFAULT";
    }
  }

  /**
   * Map internal visibility to FCM visibility
   */
  private mapVisibilityToFCM(
    visibility?: string
  ): "VISIBILITY_UNSPECIFIED" | "PRIVATE" | "PUBLIC" | "SECRET" {
    switch (visibility) {
      case "private":
        return "PRIVATE";
      case "public":
        return "PUBLIC";
      case "secret":
        return "SECRET";
      default:
        return "VISIBILITY_UNSPECIFIED";
    }
  }

  /**
   * Handle a notification interaction event
   */
  async handleInteraction(
    event: NotificationInteractionEvent
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (this.config.trackInteractions && this.config.onInteraction) {
        await this.config.onInteraction(event);
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Create an interaction event from raw data
   */
  createInteractionEvent(data: {
    messageId: string;
    deviceTokenId: string;
    userId: string;
    interactionType: "click" | "dismiss" | "action" | "reply";
    actionId?: string;
    replyText?: string;
    deepLinkUrl?: string;
    deviceInfo?: {
      osVersion?: string;
      appVersion?: string;
      deviceModel?: string;
    };
  }): NotificationInteractionEvent {
    const event: NotificationInteractionEvent = {
      interactionId: nanoid(),
      messageId: data.messageId,
      deviceTokenId: data.deviceTokenId,
      userId: data.userId,
      interactionType: data.interactionType,
      actionId: data.actionId,
      replyText: data.replyText,
      timestamp: new Date(),
      deviceInfo: data.deviceInfo
        ? { platform: "android", ...data.deviceInfo }
        : { platform: "android" },
    };

    if (data.deepLinkUrl) {
      const resolved = parseDeepLinkUrl(data.deepLinkUrl);
      if (resolved.success) {
        event.deepLink = {
          screen: resolved.screen!,
          params: resolved.params,
        };
      }
    }

    return event;
  }

  /**
   * Get a notification channel by ID
   */
  getChannel(channelId: string): AndroidNotificationChannel | undefined {
    return this.channels.get(channelId);
  }

  /**
   * Get all registered notification channels
   */
  getAllChannels(): AndroidNotificationChannel[] {
    return Array.from(this.channels.values());
  }

  /**
   * Register a custom notification channel
   */
  registerChannel(channel: AndroidNotificationChannel): void {
    this.channels.set(channel.channelId, channel);
  }
}

// Singleton instance
let androidNotificationHandler: AndroidNotificationHandler | null = null;

/**
 * Get the Android notification handler instance
 */
export function getAndroidNotificationHandler(
  config?: AndroidNotificationHandlerConfig
): AndroidNotificationHandler {
  if (!androidNotificationHandler) {
    androidNotificationHandler = new AndroidNotificationHandler(config);
  }
  return androidNotificationHandler;
}

/**
 * Reset the handler instance (for testing)
 */
export function resetAndroidNotificationHandler(): void {
  androidNotificationHandler = null;
}
