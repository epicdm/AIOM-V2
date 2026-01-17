/**
 * Push Notification Service
 *
 * Main service that orchestrates push notification sending across
 * multiple providers (Web Push and FCM).
 *
 * Features:
 * - Device token registration and management
 * - Message queuing with scheduling support
 * - Delivery tracking
 * - Automatic retry on failure
 * - Provider-agnostic notification sending
 */

import { nanoid } from "nanoid";
import type {
  DeviceRegistrationInput,
  NotificationToSend,
  PushNotificationPayload,
  PushSendResult,
  PushBatchResult,
  WebPushConfig,
  FCMConfig,
} from "./types";
import { WebPushProvider } from "./web-push";
import { FCMProvider, isFCMTokenInvalidError } from "./fcm";
import {
  createDeviceToken,
  findDeviceTokenByToken,
  findUserDeviceTokens,
  updateDeviceToken,
  deactivateDeviceTokenByValue,
  createPushMessage,
  findPendingPushMessages,
  markPushMessageAsQueued,
  markPushMessageAsSent,
  markPushMessageAsFailed,
  createDeliveryTrackingBatch,
  markDeliveryAsSent,
  markDeliveryAsFailed,
  getActiveDeviceTokensForUsers,
  stringifyWebPushKeys,
  parseWebPushKeys,
  type DeviceToken,
} from "~/data-access/push-notifications";

/**
 * Push Notification Service
 */
export class PushNotificationService {
  private webPushProvider: WebPushProvider | null = null;
  private fcmProvider: FCMProvider | null = null;
  private isProcessing = false;

  /**
   * Initialize the service with provider configurations
   */
  constructor(config?: {
    webPush?: WebPushConfig;
    fcm?: FCMConfig;
  }) {
    if (config?.webPush) {
      this.webPushProvider = new WebPushProvider(config.webPush);
    }
    if (config?.fcm) {
      this.fcmProvider = new FCMProvider(config.fcm);
    }
  }

  /**
   * Register a device for push notifications
   */
  async registerDevice(input: DeviceRegistrationInput): Promise<{
    success: boolean;
    deviceTokenId?: string;
    error?: string;
  }> {
    try {
      // Check if device is already registered
      const existingToken = await findDeviceTokenByToken(input.token);

      if (existingToken) {
        // If same user, update the token metadata
        if (existingToken.userId === input.userId) {
          await updateDeviceToken(existingToken.id, input.userId, {
            isActive: true,
            lastUsedAt: new Date(),
            deviceName: input.deviceName,
            devicePlatform: input.devicePlatform,
            browserInfo: input.browserInfo,
            webPushKeys: input.webPushKeys
              ? stringifyWebPushKeys(input.webPushKeys)
              : existingToken.webPushKeys,
          });
          return { success: true, deviceTokenId: existingToken.id };
        }

        // If different user, deactivate old token and create new
        await deactivateDeviceTokenByValue(input.token);
      }

      // Create new device token
      const newToken = await createDeviceToken({
        id: nanoid(),
        userId: input.userId,
        tokenType: input.tokenType,
        token: input.token,
        webPushKeys: input.webPushKeys
          ? stringifyWebPushKeys(input.webPushKeys)
          : null,
        deviceName: input.deviceName,
        devicePlatform: input.devicePlatform,
        browserInfo: input.browserInfo,
      });

      return { success: true, deviceTokenId: newToken.id };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to register device";
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Unregister a device from push notifications
   */
  async unregisterDevice(
    userId: string,
    token: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await deactivateDeviceTokenByValue(token);
      return { success: result };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to unregister device";
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Queue a notification for sending
   */
  async queueNotification(
    notification: NotificationToSend
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const message = await createPushMessage({
        id: nanoid(),
        userId: notification.userId,
        notificationId: notification.notificationId,
        title: notification.payload.title,
        body: notification.payload.body,
        icon: notification.payload.icon,
        badge: notification.payload.badge,
        image: notification.payload.image,
        clickAction: notification.payload.clickAction,
        data: notification.payload.data
          ? JSON.stringify(notification.payload.data)
          : null,
        scheduledAt: notification.payload.scheduledAt,
        priority: notification.payload.priority || "normal",
        status: "pending",
      });

      return { success: true, messageId: message.id };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to queue notification";
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Send a notification immediately to a user
   */
  async sendToUser(
    userId: string,
    payload: PushNotificationPayload
  ): Promise<PushBatchResult> {
    const deviceTokens = await findUserDeviceTokens(userId);
    return this.sendToDevices(deviceTokens, payload);
  }

  /**
   * Send a notification to multiple users
   */
  async sendToUsers(
    userIds: string[],
    payload: PushNotificationPayload
  ): Promise<PushBatchResult> {
    const deviceTokens = await getActiveDeviceTokensForUsers(userIds);
    return this.sendToDevices(deviceTokens, payload);
  }

  /**
   * Send a notification to specific devices
   */
  async sendToDevices(
    devices: DeviceToken[],
    payload: PushNotificationPayload
  ): Promise<PushBatchResult> {
    if (devices.length === 0) {
      return {
        totalDevices: 0,
        successCount: 0,
        failureCount: 0,
        results: [],
      };
    }

    const results: PushSendResult[] = [];

    for (const device of devices) {
      const result = await this.sendToDevice(device, payload);
      results.push(result);

      // Handle invalid tokens
      if (!result.success && this.shouldDeactivateToken(result)) {
        await deactivateDeviceTokenByValue(device.token);
      }
    }

    return {
      totalDevices: devices.length,
      successCount: results.filter((r) => r.success).length,
      failureCount: results.filter((r) => !r.success).length,
      results,
    };
  }

  /**
   * Send a notification to a single device
   */
  private async sendToDevice(
    device: DeviceToken,
    payload: PushNotificationPayload
  ): Promise<PushSendResult> {
    if (device.tokenType === "web_push") {
      return this.sendWebPush(device, payload);
    } else if (device.tokenType === "fcm") {
      return this.sendFCM(device, payload);
    }

    return {
      success: false,
      deviceTokenId: device.id,
      errorCode: "UNSUPPORTED_TOKEN_TYPE",
      errorMessage: `Unsupported token type: ${device.tokenType}`,
    };
  }

  /**
   * Send a web push notification
   */
  private async sendWebPush(
    device: DeviceToken,
    payload: PushNotificationPayload
  ): Promise<PushSendResult> {
    if (!this.webPushProvider) {
      return {
        success: false,
        deviceTokenId: device.id,
        errorCode: "PROVIDER_NOT_CONFIGURED",
        errorMessage: "Web Push provider is not configured",
      };
    }

    const keys = parseWebPushKeys(device.webPushKeys);
    return this.webPushProvider.send(device.token, payload, { keys: keys || undefined });
  }

  /**
   * Send an FCM notification
   */
  private async sendFCM(
    device: DeviceToken,
    payload: PushNotificationPayload
  ): Promise<PushSendResult> {
    if (!this.fcmProvider) {
      return {
        success: false,
        deviceTokenId: device.id,
        errorCode: "PROVIDER_NOT_CONFIGURED",
        errorMessage: "FCM provider is not configured",
      };
    }

    const platform = device.devicePlatform as "ios" | "android" | undefined;
    return this.fcmProvider.send(device.token, payload, {
      platform: platform === "ios" || platform === "android" ? platform : undefined,
    });
  }

  /**
   * Process the message queue
   */
  async processQueue(): Promise<{
    processed: number;
    successful: number;
    failed: number;
  }> {
    if (this.isProcessing) {
      return { processed: 0, successful: 0, failed: 0 };
    }

    this.isProcessing = true;
    let processed = 0;
    let successful = 0;
    let failed = 0;

    try {
      const pendingMessages = await findPendingPushMessages(100);

      for (const message of pendingMessages) {
        processed++;

        // Mark as queued
        await markPushMessageAsQueued(message.id);

        // Get target devices
        let devices: DeviceToken[] = [];
        if (message.userId) {
          devices = await findUserDeviceTokens(message.userId);
        }

        if (devices.length === 0) {
          await markPushMessageAsFailed(message.id, "No active devices found");
          failed++;
          continue;
        }

        // Create delivery tracking records
        const trackingRecords = await createDeliveryTrackingBatch(
          devices.map((device) => ({
            id: nanoid(),
            pushMessageId: message.id,
            deviceTokenId: device.id,
            status: "pending",
          }))
        );

        // Build payload
        const payload: PushNotificationPayload = {
          title: message.title,
          body: message.body,
          icon: message.icon || undefined,
          badge: message.badge || undefined,
          image: message.image || undefined,
          clickAction: message.clickAction || undefined,
          data: message.data ? JSON.parse(message.data) : undefined,
          priority: message.priority as "high" | "normal",
        };

        // Send to all devices
        let messageSuccess = true;
        for (let i = 0; i < devices.length; i++) {
          const device = devices[i];
          const tracking = trackingRecords[i];

          const result = await this.sendToDevice(device, payload);

          if (result.success) {
            await markDeliveryAsSent(
              tracking.id,
              result.providerMessageId,
              result.providerResponse
            );
          } else {
            await markDeliveryAsFailed(
              tracking.id,
              result.errorCode || "UNKNOWN",
              result.errorMessage || "Unknown error"
            );
            messageSuccess = false;

            // Deactivate invalid tokens
            if (this.shouldDeactivateToken(result)) {
              await deactivateDeviceTokenByValue(device.token);
            }
          }
        }

        if (messageSuccess) {
          await markPushMessageAsSent(message.id);
          successful++;
        } else {
          await markPushMessageAsFailed(message.id, "Some deliveries failed");
          failed++;
        }
      }
    } finally {
      this.isProcessing = false;
    }

    return { processed, successful, failed };
  }

  /**
   * Determine if a token should be deactivated based on the error
   */
  private shouldDeactivateToken(result: PushSendResult): boolean {
    if (!result.errorCode) return false;

    // Web Push errors indicating invalid subscription
    if (
      result.errorCode === "SUBSCRIPTION_EXPIRED" ||
      result.errorCode === "HTTP_410" ||
      result.errorCode === "HTTP_404"
    ) {
      return true;
    }

    // FCM errors indicating invalid token
    if (isFCMTokenInvalidError(result.errorCode)) {
      return true;
    }

    return false;
  }

  /**
   * Get the Web Push public key for client-side subscription
   */
  getWebPushPublicKey(): string | null {
    return this.webPushProvider?.getPublicKey() || null;
  }
}

// Singleton instance
let pushNotificationService: PushNotificationService | null = null;

/**
 * Get the push notification service instance
 */
export function getPushNotificationService(): PushNotificationService {
  if (!pushNotificationService) {
    // Initialize with config from environment
    pushNotificationService = new PushNotificationService({
      webPush: getWebPushConfig(),
      fcm: getFCMConfig(),
    });
  }
  return pushNotificationService;
}

/**
 * Get Web Push configuration from environment
 */
function getWebPushConfig(): WebPushConfig | undefined {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (publicKey && privateKey && subject) {
    return {
      vapidPublicKey: publicKey,
      vapidPrivateKey: privateKey,
      vapidSubject: subject,
    };
  }

  return undefined;
}

/**
 * Get FCM configuration from environment
 */
function getFCMConfig(): FCMConfig | undefined {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  if (projectId && privateKey && clientEmail) {
    return {
      projectId,
      privateKey: privateKey.replace(/\\n/g, "\n"),
      clientEmail,
    };
  }

  return undefined;
}
