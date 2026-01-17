/**
 * Push Notification Types
 */

// Web Push subscription from the browser
export interface WebPushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// FCM registration token from mobile app
export interface FCMRegistration {
  token: string;
  platform: "ios" | "android";
  deviceName?: string;
}

// Unified push notification payload
export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  clickAction?: string;
  data?: Record<string, string>;
  // Optional: scheduling
  scheduledAt?: Date;
  // Priority for FCM
  priority?: "high" | "normal";
}

// Result of sending a notification to a single device
export interface PushSendResult {
  success: boolean;
  deviceTokenId: string;
  providerMessageId?: string;
  providerResponse?: string;
  errorCode?: string;
  errorMessage?: string;
}

// Result of sending notifications to multiple devices
export interface PushBatchResult {
  totalDevices: number;
  successCount: number;
  failureCount: number;
  results: PushSendResult[];
}

// Device registration input
export interface DeviceRegistrationInput {
  userId: string;
  tokenType: "web_push" | "fcm";
  token: string;
  webPushKeys?: {
    p256dh: string;
    auth: string;
  };
  deviceName?: string;
  devicePlatform?: "web" | "ios" | "android";
  browserInfo?: string;
}

// Notification to send
export interface NotificationToSend {
  userId: string;
  payload: PushNotificationPayload;
  notificationId?: string; // Optional reference to notification table
}

// Provider configuration
export interface WebPushConfig {
  vapidPublicKey: string;
  vapidPrivateKey: string;
  vapidSubject: string; // Usually mailto:email@example.com
}

export interface FCMConfig {
  projectId: string;
  privateKey: string;
  clientEmail: string;
}

// Push notification provider interface
export interface PushProvider {
  send(
    token: string,
    payload: PushNotificationPayload,
    options?: Record<string, unknown>
  ): Promise<PushSendResult>;
}
