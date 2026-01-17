/**
 * Linphone Android Notifications
 *
 * Handles Android-specific notifications for VoIP calls including
 * incoming call notifications, ongoing call notifications, and missed call alerts.
 */

import { nanoid } from "nanoid";
import type {
  LinphoneCall,
  LinphoneCallState,
  LinphonePushPayload,
  LinphoneAndroidConfig,
} from "./types";
import type {
  AndroidNotificationPayload,
  AndroidNotificationAction,
  AndroidNotificationChannel,
} from "../push-notification/android-types";
import {
  buildDeepLinkUrl,
  createDeepLinkAction,
} from "../push-notification/android-types";

/**
 * Call notification types
 */
export type CallNotificationType =
  | "incoming"
  | "ongoing"
  | "missed"
  | "connecting"
  | "on_hold";

/**
 * Call notification configuration
 */
export interface CallNotificationConfig {
  /** Small icon resource ID */
  smallIconResourceId: number;
  /** Color accent (hex) */
  accentColor: string;
  /** Vibration pattern for incoming calls */
  vibrationPattern: number[];
  /** Ring duration in seconds */
  ringDuration: number;
  /** Show caller image in notification */
  showCallerImage: boolean;
  /** Enable heads-up notification for incoming calls */
  enableHeadsUp: boolean;
}

/**
 * Default notification configuration
 */
const DEFAULT_NOTIFICATION_CONFIG: CallNotificationConfig = {
  smallIconResourceId: 0,
  accentColor: "#6366F1",
  vibrationPattern: [0, 1000, 500, 1000],
  ringDuration: 30,
  showCallerImage: true,
  enableHeadsUp: true,
};

/**
 * Call notification channels
 */
export const CALL_NOTIFICATION_CHANNELS: AndroidNotificationChannel[] = [
  {
    channelId: "incoming_calls",
    channelName: "Incoming Calls",
    channelDescription: "Notifications for incoming phone calls",
    importance: "high",
    showBadge: true,
    enableVibration: true,
    vibrationPattern: [0, 1000, 500, 1000],
    lightColor: "#6366F1",
    sound: "ringtone",
  },
  {
    channelId: "ongoing_calls",
    channelName: "Ongoing Calls",
    channelDescription: "Notifications for active phone calls",
    importance: "low",
    showBadge: false,
    enableVibration: false,
  },
  {
    channelId: "missed_calls",
    channelName: "Missed Calls",
    channelDescription: "Notifications for missed phone calls",
    importance: "high",
    showBadge: true,
    enableVibration: true,
    lightColor: "#F44336",
  },
];

/**
 * Android Call Notifications Service
 *
 * Manages all notification aspects for VoIP calls on Android.
 */
export class AndroidCallNotifications {
  private config: CallNotificationConfig;
  private activeNotifications: Map<string, number> = new Map();
  private notificationIdCounter: number = 1000;
  private androidConfig?: LinphoneAndroidConfig;

  constructor(config: Partial<CallNotificationConfig> = {}) {
    this.config = { ...DEFAULT_NOTIFICATION_CONFIG, ...config };
  }

  /**
   * Initialize with Android configuration
   */
  initialize(androidConfig: LinphoneAndroidConfig): void {
    this.androidConfig = androidConfig;
    this.config.smallIconResourceId = androidConfig.smallIconResourceId;
  }

  /**
   * Build incoming call notification payload
   */
  buildIncomingCallNotification(
    call: LinphoneCall,
    options?: {
      callerImage?: string;
      customActions?: AndroidNotificationAction[];
    }
  ): AndroidNotificationPayload {
    const notificationId = this.getOrCreateNotificationId(call.id);
    const callerName = call.remoteDisplayName || call.remotePhoneNumber || "Unknown";

    const actions: AndroidNotificationAction[] = [
      {
        actionId: "answer",
        title: "Answer",
        icon: "ic_call",
        deepLink: {
          screen: "call",
          params: { id: call.id, action: "answer" },
        },
        dismissOnClick: false,
      },
      {
        actionId: "decline",
        title: "Decline",
        icon: "ic_call_end",
        deepLink: {
          screen: "call",
          params: { id: call.id, action: "decline" },
        },
        dismissOnClick: true,
      },
    ];

    if (options?.customActions) {
      actions.push(...options.customActions);
    }

    const payload: AndroidNotificationPayload = {
      title: "Incoming Call",
      body: callerName,
      icon: "ic_call",
      largeIcon: options?.callerImage,
      color: this.config.accentColor,
      channel: CALL_NOTIFICATION_CHANNELS.find(
        (c) => c.channelId === "incoming_calls"
      ),
      priority: "max",
      visibility: "public",
      autoCancel: false,
      onlyAlertOnce: false,
      showTimestamp: false,
      tag: `call_${call.id}`,
      actions,
      deepLink: {
        screen: "call",
        params: { id: call.id },
      },
      data: {
        type: "incoming_call",
        callId: call.id,
        callerAddress: call.remoteAddress,
        callerName: callerName,
        callerPhone: call.remotePhoneNumber || "",
        direction: call.direction,
      },
    };

    return payload;
  }

  /**
   * Build ongoing call notification payload (foreground service)
   */
  buildOngoingCallNotification(
    call: LinphoneCall,
    options?: {
      isMuted?: boolean;
      isSpeaker?: boolean;
      isOnHold?: boolean;
    }
  ): AndroidNotificationPayload {
    const callerName = call.remoteDisplayName || call.remotePhoneNumber || "Unknown";
    const duration = this.formatDuration(call.duration);

    let status = "Ongoing call";
    if (options?.isOnHold) {
      status = "Call on hold";
    }

    const actions: AndroidNotificationAction[] = [];

    // Mute toggle
    actions.push({
      actionId: options?.isMuted ? "unmute" : "mute",
      title: options?.isMuted ? "Unmute" : "Mute",
      icon: options?.isMuted ? "ic_mic_off" : "ic_mic",
      deepLink: {
        screen: "call",
        params: { id: call.id, action: options?.isMuted ? "unmute" : "mute" },
      },
      dismissOnClick: false,
    });

    // Speaker toggle
    actions.push({
      actionId: options?.isSpeaker ? "speaker_off" : "speaker_on",
      title: options?.isSpeaker ? "Speaker Off" : "Speaker",
      icon: options?.isSpeaker ? "ic_volume_up" : "ic_volume_off",
      deepLink: {
        screen: "call",
        params: {
          id: call.id,
          action: options?.isSpeaker ? "speaker_off" : "speaker_on",
        },
      },
      dismissOnClick: false,
    });

    // End call
    actions.push({
      actionId: "hangup",
      title: "End",
      icon: "ic_call_end",
      deepLink: {
        screen: "call",
        params: { id: call.id, action: "hangup" },
      },
      dismissOnClick: true,
    });

    const payload: AndroidNotificationPayload = {
      title: callerName,
      body: `${status} \u00b7 ${duration}`,
      icon: "ic_call",
      color: this.config.accentColor,
      channel: CALL_NOTIFICATION_CHANNELS.find(
        (c) => c.channelId === "ongoing_calls"
      ),
      priority: "low",
      visibility: "public",
      autoCancel: false,
      onlyAlertOnce: true,
      showTimestamp: true,
      timestamp: call.startTime.getTime(),
      tag: `call_${call.id}`,
      localOnly: true,
      actions,
      deepLink: {
        screen: "call",
        params: { id: call.id },
      },
      data: {
        type: "ongoing_call",
        callId: call.id,
        callerName,
        duration: String(call.duration),
        isMuted: String(options?.isMuted || false),
        isSpeaker: String(options?.isSpeaker || false),
        isOnHold: String(options?.isOnHold || false),
      },
    };

    return payload;
  }

  /**
   * Build missed call notification payload
   */
  buildMissedCallNotification(
    call: LinphoneCall
  ): AndroidNotificationPayload {
    const callerName = call.remoteDisplayName || call.remotePhoneNumber || "Unknown";

    const actions: AndroidNotificationAction[] = [
      {
        actionId: "call_back",
        title: "Call Back",
        icon: "ic_call",
        deepLink: {
          screen: "call",
          params: {
            action: "dial",
            address: call.remoteAddress,
            phoneNumber: call.remotePhoneNumber || "",
          },
        },
        dismissOnClick: true,
      },
      createDeepLinkAction(
        "view_history",
        "View",
        "call",
        { tab: "history" }
      ),
    ];

    const payload: AndroidNotificationPayload = {
      title: "Missed Call",
      body: callerName,
      icon: "ic_call_missed",
      color: "#F44336",
      channel: CALL_NOTIFICATION_CHANNELS.find(
        (c) => c.channelId === "missed_calls"
      ),
      priority: "high",
      visibility: "public",
      autoCancel: true,
      showTimestamp: true,
      timestamp: call.startTime.getTime(),
      tag: `missed_call_${call.id}`,
      groupKey: "missed_calls",
      actions,
      deepLink: {
        screen: "call",
        params: { tab: "history" },
      },
      data: {
        type: "missed_call",
        callId: call.id,
        callerAddress: call.remoteAddress,
        callerName,
        callerPhone: call.remotePhoneNumber || "",
        callTime: call.startTime.toISOString(),
      },
    };

    return payload;
  }

  /**
   * Build group summary notification for multiple missed calls
   */
  buildMissedCallsGroupSummary(
    count: number
  ): AndroidNotificationPayload {
    const payload: AndroidNotificationPayload = {
      title: "Missed Calls",
      body: `${count} missed call${count > 1 ? "s" : ""}`,
      icon: "ic_call_missed",
      color: "#F44336",
      channel: CALL_NOTIFICATION_CHANNELS.find(
        (c) => c.channelId === "missed_calls"
      ),
      priority: "high",
      visibility: "public",
      autoCancel: true,
      groupKey: "missed_calls",
      isGroupSummary: true,
      deepLink: {
        screen: "call",
        params: { tab: "history", filter: "missed" },
      },
      data: {
        type: "missed_calls_summary",
        count: String(count),
      },
    };

    return payload;
  }

  /**
   * Build connecting call notification
   */
  buildConnectingNotification(
    call: LinphoneCall
  ): AndroidNotificationPayload {
    const callerName = call.remoteDisplayName || call.remotePhoneNumber || "Unknown";

    const actions: AndroidNotificationAction[] = [
      {
        actionId: "cancel",
        title: "Cancel",
        icon: "ic_call_end",
        deepLink: {
          screen: "call",
          params: { id: call.id, action: "cancel" },
        },
        dismissOnClick: true,
      },
    ];

    const payload: AndroidNotificationPayload = {
      title: call.direction === "outgoing" ? "Calling..." : "Connecting...",
      body: callerName,
      icon: "ic_call",
      color: this.config.accentColor,
      channel: CALL_NOTIFICATION_CHANNELS.find(
        (c) => c.channelId === "ongoing_calls"
      ),
      priority: "default",
      visibility: "public",
      autoCancel: false,
      onlyAlertOnce: true,
      tag: `call_${call.id}`,
      actions,
      deepLink: {
        screen: "call",
        params: { id: call.id },
      },
      data: {
        type: "connecting_call",
        callId: call.id,
        callerName,
        direction: call.direction,
      },
    };

    return payload;
  }

  /**
   * Get notification type based on call state
   */
  getNotificationTypeForState(
    state: LinphoneCallState,
    direction: "incoming" | "outgoing"
  ): CallNotificationType | null {
    switch (state) {
      case "incoming_received":
      case "incoming_early_media":
        return "incoming";

      case "outgoing_init":
      case "outgoing_progress":
      case "outgoing_ringing":
      case "outgoing_early_media":
        return "connecting";

      case "connected":
      case "streams_running":
      case "updating":
      case "updating_by_remote":
        return "ongoing";

      case "paused":
      case "paused_by_remote":
        return "on_hold";

      case "end":
        if (direction === "incoming") {
          return "missed";
        }
        return null;

      default:
        return null;
    }
  }

  /**
   * Update notification for call state change
   */
  updateNotificationForCall(
    call: LinphoneCall,
    options?: {
      isMuted?: boolean;
      isSpeaker?: boolean;
      callerImage?: string;
    }
  ): AndroidNotificationPayload | null {
    const type = this.getNotificationTypeForState(call.state, call.direction);

    if (!type) {
      return null;
    }

    switch (type) {
      case "incoming":
        return this.buildIncomingCallNotification(call, {
          callerImage: options?.callerImage,
        });

      case "connecting":
        return this.buildConnectingNotification(call);

      case "ongoing":
        return this.buildOngoingCallNotification(call, {
          isMuted: options?.isMuted,
          isSpeaker: options?.isSpeaker,
          isOnHold: false,
        });

      case "on_hold":
        return this.buildOngoingCallNotification(call, {
          isMuted: options?.isMuted,
          isSpeaker: options?.isSpeaker,
          isOnHold: true,
        });

      case "missed":
        return this.buildMissedCallNotification(call);

      default:
        return null;
    }
  }

  /**
   * Handle push notification for incoming call
   */
  handleIncomingCallPush(
    payload: LinphonePushPayload
  ): AndroidNotificationPayload {
    // Create a minimal call object from push payload
    const call: Partial<LinphoneCall> = {
      id: payload.callId,
      remoteAddress: payload.callerAddress,
      remoteDisplayName: payload.callerDisplayName,
      remotePhoneNumber: payload.callerPhoneNumber,
      direction: "incoming",
      state: "incoming_received",
      startTime: new Date(payload.timestamp),
    };

    return this.buildIncomingCallNotification(call as LinphoneCall);
  }

  /**
   * Get or create notification ID for a call
   */
  getOrCreateNotificationId(callId: string): number {
    let id = this.activeNotifications.get(callId);
    if (!id) {
      id = this.notificationIdCounter++;
      this.activeNotifications.set(callId, id);
    }
    return id;
  }

  /**
   * Get notification ID for a call
   */
  getNotificationId(callId: string): number | undefined {
    return this.activeNotifications.get(callId);
  }

  /**
   * Remove notification tracking for a call
   */
  removeNotificationTracking(callId: string): void {
    this.activeNotifications.delete(callId);
  }

  /**
   * Get notification tag for a call
   */
  getNotificationTag(callId: string): string {
    return `call_${callId}`;
  }

  /**
   * Convert payload to FCM message format
   */
  toFCMMessage(
    token: string,
    payload: AndroidNotificationPayload
  ): Record<string, unknown> {
    return {
      token,
      notification: {
        title: payload.title,
        body: payload.body,
        image: payload.image,
      },
      android: {
        priority: payload.priority === "high" || payload.priority === "max"
          ? "HIGH"
          : "NORMAL",
        ttl: payload.ttl ? `${payload.ttl}s` : "3600s",
        notification: {
          icon: payload.icon,
          color: payload.color,
          sound: payload.sound || "default",
          tag: payload.tag,
          click_action: payload.clickAction,
          channel_id: payload.channel?.channelId || "incoming_calls",
        },
      },
      data: {
        ...payload.data,
        deep_link: payload.deepLink ? buildDeepLinkUrl(payload.deepLink) : undefined,
        actions: payload.actions ? JSON.stringify(payload.actions) : undefined,
      },
    };
  }

  /**
   * Format duration for display
   */
  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    }

    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  }
}

/**
 * Create an Android call notifications instance
 */
export function createAndroidCallNotifications(
  config?: Partial<CallNotificationConfig>
): AndroidCallNotifications {
  return new AndroidCallNotifications(config);
}

/**
 * Get all call notification channels
 */
export function getCallNotificationChannels(): AndroidNotificationChannel[] {
  return [...CALL_NOTIFICATION_CHANNELS];
}
