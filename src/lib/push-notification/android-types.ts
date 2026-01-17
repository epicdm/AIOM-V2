/**
 * Android Push Notification Types
 *
 * Types for Android-specific push notification handling including
 * notification display, action buttons, and deep linking.
 */

// Android notification priority levels
export type AndroidNotificationPriority = "min" | "low" | "default" | "high" | "max";

// Android notification visibility
export type AndroidNotificationVisibility = "private" | "public" | "secret";

// Deep link target screens in the app
export type DeepLinkScreen =
  | "home"
  | "notifications"
  | "messages"
  | "profile"
  | "settings"
  | "expense"
  | "briefing"
  | "conversation"
  | "call"
  | "channel";

// Deep link configuration
export interface DeepLinkConfig {
  screen: DeepLinkScreen;
  params?: Record<string, string>;
  // Full deep link URL (e.g., "myapp://expense/123")
  url?: string;
}

// Android notification action button
export interface AndroidNotificationAction {
  // Unique action identifier
  actionId: string;
  // Button label displayed to user
  title: string;
  // Icon resource name (e.g., "ic_reply")
  icon?: string;
  // Deep link to navigate when action is clicked
  deepLink?: DeepLinkConfig;
  // URL to open in browser (alternative to deep link)
  url?: string;
  // Whether this action requires the device to be unlocked
  requiresUnlock?: boolean;
  // Whether this action can show a text input (for reply actions)
  allowTextInput?: boolean;
  // Placeholder text for text input
  textInputPlaceholder?: string;
  // Whether clicking this action should dismiss the notification
  dismissOnClick?: boolean;
}

// Android notification channel configuration
export interface AndroidNotificationChannel {
  // Channel ID (e.g., "messages", "alerts", "reminders")
  channelId: string;
  // Channel name shown in Android settings
  channelName: string;
  // Channel description shown in Android settings
  channelDescription?: string;
  // Channel importance level
  importance?: "none" | "min" | "low" | "default" | "high";
  // Whether notifications in this channel should show badge
  showBadge?: boolean;
  // Whether notifications should vibrate
  enableVibration?: boolean;
  // Custom vibration pattern in milliseconds
  vibrationPattern?: number[];
  // LED light color (hex)
  lightColor?: string;
  // Sound URI
  sound?: string;
}

// Android-specific notification payload
export interface AndroidNotificationPayload {
  // Notification title
  title: string;
  // Notification body text
  body: string;
  // Small icon resource name
  icon?: string;
  // Large icon URL
  largeIcon?: string;
  // Big picture URL for expanded notification
  image?: string;
  // Accent color (hex)
  color?: string;
  // Sound file name (without extension)
  sound?: string;
  // Notification tag for replacing existing notification
  tag?: string;
  // Whether to only alert once for updates
  onlyAlertOnce?: boolean;
  // Notification channel
  channel?: AndroidNotificationChannel;
  // Notification priority
  priority?: AndroidNotificationPriority;
  // Notification visibility on lock screen
  visibility?: AndroidNotificationVisibility;
  // Action to perform when notification is clicked
  clickAction?: string;
  // Deep link configuration for click action
  deepLink?: DeepLinkConfig;
  // Action buttons
  actions?: AndroidNotificationAction[];
  // Notification group key for bundling
  groupKey?: string;
  // Whether this is a group summary notification
  isGroupSummary?: boolean;
  // Auto-cancel notification when clicked
  autoCancel?: boolean;
  // Local-only notification (won't sync across devices)
  localOnly?: boolean;
  // Ticker text for accessibility
  ticker?: string;
  // Timestamp to show on notification
  timestamp?: number;
  // Whether to show timestamp
  showTimestamp?: boolean;
  // Time-to-live in seconds
  ttl?: number;
  // Custom data payload
  data?: Record<string, string>;
}

// Notification interaction types
export type NotificationInteractionType =
  | "click"
  | "dismiss"
  | "action"
  | "reply";

// Notification interaction event
export interface NotificationInteractionEvent {
  // Unique interaction ID
  interactionId: string;
  // Push message ID
  messageId: string;
  // Device token ID
  deviceTokenId: string;
  // User ID
  userId: string;
  // Type of interaction
  interactionType: NotificationInteractionType;
  // Action ID if action button was clicked
  actionId?: string;
  // Reply text if user replied via notification
  replyText?: string;
  // Deep link that was triggered
  deepLink?: DeepLinkConfig;
  // Timestamp of interaction
  timestamp: Date;
  // Device info
  deviceInfo?: {
    platform: "android";
    osVersion?: string;
    appVersion?: string;
    deviceModel?: string;
  };
}

// Android notification display result
export interface AndroidNotificationDisplayResult {
  success: boolean;
  notificationId?: string;
  error?: string;
  // Whether the notification was displayed or silently handled
  displayed: boolean;
  // Channel the notification was posted to
  channelId?: string;
}

// Deep link resolution result
export interface DeepLinkResolutionResult {
  success: boolean;
  screen?: DeepLinkScreen;
  params?: Record<string, string>;
  error?: string;
}

// Predefined notification channels for common use cases
export const DEFAULT_NOTIFICATION_CHANNELS: AndroidNotificationChannel[] = [
  {
    channelId: "default",
    channelName: "General Notifications",
    channelDescription: "General app notifications",
    importance: "default",
    showBadge: true,
    enableVibration: true,
  },
  {
    channelId: "messages",
    channelName: "Messages",
    channelDescription: "Direct messages and chat notifications",
    importance: "high",
    showBadge: true,
    enableVibration: true,
    lightColor: "#2196F3",
  },
  {
    channelId: "alerts",
    channelName: "Alerts",
    channelDescription: "Important alerts and warnings",
    importance: "high",
    showBadge: true,
    enableVibration: true,
    lightColor: "#F44336",
  },
  {
    channelId: "reminders",
    channelName: "Reminders",
    channelDescription: "Task and event reminders",
    importance: "default",
    showBadge: true,
    enableVibration: false,
  },
  {
    channelId: "system",
    channelName: "System",
    channelDescription: "System notifications and updates",
    importance: "low",
    showBadge: false,
    enableVibration: false,
  },
];

// Deep link URL scheme
export const DEEP_LINK_SCHEME = "aiom";

// Build a deep link URL from config
export function buildDeepLinkUrl(config: DeepLinkConfig): string {
  if (config.url) {
    return config.url;
  }

  const params = config.params
    ? Object.entries(config.params)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join("&")
    : "";

  const baseUrl = `${DEEP_LINK_SCHEME}://${config.screen}`;
  return params ? `${baseUrl}?${params}` : baseUrl;
}

// Parse a deep link URL into config
export function parseDeepLinkUrl(url: string): DeepLinkResolutionResult {
  try {
    // Handle both custom scheme and https deep links
    const urlObj = new URL(url);

    // For custom schemes like "aiom://expense?id=456", the screen is in the hostname
    // For https URLs like "https://app.example.com/expense/123", the screen is in the pathname
    let screen: DeepLinkScreen;
    let pathParams: string[] = [];

    if (urlObj.protocol === `${DEEP_LINK_SCHEME}:`) {
      // Custom scheme: aiom://expense?id=456 -> hostname is "expense"
      screen = urlObj.hostname as DeepLinkScreen;
      // Check if there are path segments after hostname
      pathParams = urlObj.pathname.replace(/^\/+/, "").split("/").filter(Boolean);
    } else {
      // HTTPS or other schemes: extract from pathname
      const pathParts = urlObj.pathname.replace(/^\/+/, "").split("/").filter(Boolean);
      screen = pathParts[0] as DeepLinkScreen;
      pathParams = pathParts.slice(1);
    }

    // Validate screen
    const validScreens: DeepLinkScreen[] = [
      "home", "notifications", "messages", "profile", "settings",
      "expense", "briefing", "conversation", "call", "channel"
    ];

    if (!validScreens.includes(screen)) {
      return {
        success: false,
        error: `Invalid screen: ${screen}`,
      };
    }

    // Extract params from query string and path
    const params: Record<string, string> = {};

    // Add path params (e.g., /expense/123 -> { id: "123" })
    if (pathParams.length > 0) {
      params.id = pathParams[0];
    }

    // Add query params
    urlObj.searchParams.forEach((value, key) => {
      params[key] = value;
    });

    return {
      success: true,
      screen,
      params: Object.keys(params).length > 0 ? params : undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to parse deep link",
    };
  }
}

// Create quick reply action
export function createQuickReplyAction(
  actionId: string,
  title: string = "Reply"
): AndroidNotificationAction {
  return {
    actionId,
    title,
    icon: "ic_reply",
    allowTextInput: true,
    textInputPlaceholder: "Type your reply...",
    dismissOnClick: true,
  };
}

// Create deep link action
export function createDeepLinkAction(
  actionId: string,
  title: string,
  screen: DeepLinkScreen,
  params?: Record<string, string>
): AndroidNotificationAction {
  return {
    actionId,
    title,
    deepLink: { screen, params },
    dismissOnClick: true,
  };
}

// Create dismiss action
export function createDismissAction(
  actionId: string = "dismiss",
  title: string = "Dismiss"
): AndroidNotificationAction {
  return {
    actionId,
    title,
    icon: "ic_close",
    dismissOnClick: true,
  };
}
