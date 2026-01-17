/**
 * Push Notification Server Functions
 *
 * Server functions for device registration, notification sending,
 * and push notification management.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authenticatedMiddleware, assertAdminMiddleware } from "./middleware";
import {
  findUserDeviceTokens,
  deleteDeviceToken,
  countUserDeviceTokens,
  findUserPushMessages,
  getDeliveryStats,
} from "~/data-access/push-notifications";
import { getPushNotificationService } from "~/lib/push-notification/service";

// =============================================================================
// Schemas
// =============================================================================

const registerDeviceSchema = z.object({
  tokenType: z.enum(["web_push", "fcm"]),
  token: z.string().min(1, "Token is required"),
  webPushKeys: z
    .object({
      p256dh: z.string(),
      auth: z.string(),
    })
    .optional(),
  deviceName: z.string().optional(),
  devicePlatform: z.enum(["web", "ios", "android"]).optional(),
  browserInfo: z.string().optional(),
});

const unregisterDeviceSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

const deleteDeviceTokenSchema = z.object({
  deviceTokenId: z.string().min(1, "Device token ID is required"),
});

const sendNotificationSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  title: z.string().min(1, "Title is required"),
  body: z.string().min(1, "Body is required"),
  icon: z.string().optional(),
  badge: z.string().optional(),
  image: z.string().optional(),
  clickAction: z.string().optional(),
  data: z.record(z.string(), z.string()).optional(),
  priority: z.enum(["high", "normal"]).optional(),
});

const sendBroadcastSchema = z.object({
  userIds: z.array(z.string()).min(1, "At least one user ID is required"),
  title: z.string().min(1, "Title is required"),
  body: z.string().min(1, "Body is required"),
  icon: z.string().optional(),
  badge: z.string().optional(),
  image: z.string().optional(),
  clickAction: z.string().optional(),
  data: z.record(z.string(), z.string()).optional(),
  priority: z.enum(["high", "normal"]).optional(),
});

const queueNotificationSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  title: z.string().min(1, "Title is required"),
  body: z.string().min(1, "Body is required"),
  icon: z.string().optional(),
  badge: z.string().optional(),
  image: z.string().optional(),
  clickAction: z.string().optional(),
  data: z.record(z.string(), z.string()).optional(),
  priority: z.enum(["high", "normal"]).optional(),
  scheduledAt: z.string().datetime().optional(),
  notificationId: z.string().optional(),
});

const getPushMessagesSchema = z.object({
  limit: z.number().optional().default(20),
  offset: z.number().optional().default(0),
});

const getDeliveryStatsSchema = z.object({
  messageId: z.string().min(1, "Message ID is required"),
});

// =============================================================================
// Device Registration Functions
// =============================================================================

/**
 * Register a device for push notifications
 */
export const registerDeviceFn = createServerFn({
  method: "POST",
})
  .inputValidator(registerDeviceSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const service = getPushNotificationService();

    const result = await service.registerDevice({
      userId: context.userId,
      tokenType: data.tokenType,
      token: data.token,
      webPushKeys: data.webPushKeys,
      deviceName: data.deviceName,
      devicePlatform: data.devicePlatform,
      browserInfo: data.browserInfo,
    });

    if (!result.success) {
      throw new Error(result.error || "Failed to register device");
    }

    return {
      success: true,
      deviceTokenId: result.deviceTokenId,
    };
  });

/**
 * Unregister a device from push notifications
 */
export const unregisterDeviceFn = createServerFn({
  method: "POST",
})
  .inputValidator(unregisterDeviceSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const service = getPushNotificationService();

    const result = await service.unregisterDevice(context.userId, data.token);

    if (!result.success) {
      throw new Error(result.error || "Failed to unregister device");
    }

    return { success: true };
  });

/**
 * Delete a device token by ID
 */
export const deleteDeviceTokenFn = createServerFn({
  method: "POST",
})
  .inputValidator(deleteDeviceTokenSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const deleted = await deleteDeviceToken(data.deviceTokenId, context.userId);

    if (!deleted) {
      throw new Error("Failed to delete device token");
    }

    return { success: true };
  });

/**
 * Get user's registered devices
 */
export const getUserDevicesFn = createServerFn({
  method: "GET",
})
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    const devices = await findUserDeviceTokens(context.userId);
    const count = await countUserDeviceTokens(context.userId);

    return {
      devices: devices.map((device) => ({
        id: device.id,
        tokenType: device.tokenType,
        deviceName: device.deviceName,
        devicePlatform: device.devicePlatform,
        browserInfo: device.browserInfo,
        isActive: device.isActive,
        lastUsedAt: device.lastUsedAt,
        createdAt: device.createdAt,
      })),
      count,
    };
  });

/**
 * Get Web Push VAPID public key
 */
export const getVapidPublicKeyFn = createServerFn({
  method: "GET",
}).handler(async () => {
  const service = getPushNotificationService();
  const publicKey = service.getWebPushPublicKey();

  return {
    publicKey,
    isConfigured: !!publicKey,
  };
});

// =============================================================================
// Notification Sending Functions
// =============================================================================

/**
 * Send a notification to a specific user (Admin only)
 */
export const sendNotificationToUserFn = createServerFn({
  method: "POST",
})
  .inputValidator(sendNotificationSchema)
  .middleware([assertAdminMiddleware])
  .handler(async ({ data }) => {
    const service = getPushNotificationService();

    const result = await service.sendToUser(data.userId, {
      title: data.title,
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      image: data.image,
      clickAction: data.clickAction,
      data: data.data,
      priority: data.priority,
    });

    return {
      success: result.successCount > 0,
      totalDevices: result.totalDevices,
      successCount: result.successCount,
      failureCount: result.failureCount,
    };
  });

/**
 * Send a notification to multiple users (Admin only)
 */
export const sendBroadcastNotificationFn = createServerFn({
  method: "POST",
})
  .inputValidator(sendBroadcastSchema)
  .middleware([assertAdminMiddleware])
  .handler(async ({ data }) => {
    const service = getPushNotificationService();

    const result = await service.sendToUsers(data.userIds, {
      title: data.title,
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      image: data.image,
      clickAction: data.clickAction,
      data: data.data,
      priority: data.priority,
    });

    return {
      success: result.successCount > 0,
      totalDevices: result.totalDevices,
      successCount: result.successCount,
      failureCount: result.failureCount,
    };
  });

/**
 * Queue a notification for later sending (Admin only)
 */
export const queueNotificationFn = createServerFn({
  method: "POST",
})
  .inputValidator(queueNotificationSchema)
  .middleware([assertAdminMiddleware])
  .handler(async ({ data }) => {
    const service = getPushNotificationService();

    const result = await service.queueNotification({
      userId: data.userId,
      notificationId: data.notificationId,
      payload: {
        title: data.title,
        body: data.body,
        icon: data.icon,
        badge: data.badge,
        image: data.image,
        clickAction: data.clickAction,
        data: data.data,
        priority: data.priority,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
      },
    });

    if (!result.success) {
      throw new Error(result.error || "Failed to queue notification");
    }

    return {
      success: true,
      messageId: result.messageId,
    };
  });

/**
 * Process the notification queue (Admin only)
 */
export const processNotificationQueueFn = createServerFn({
  method: "POST",
})
  .middleware([assertAdminMiddleware])
  .handler(async () => {
    const service = getPushNotificationService();
    const result = await service.processQueue();

    return {
      processed: result.processed,
      successful: result.successful,
      failed: result.failed,
    };
  });

// =============================================================================
// Message History Functions
// =============================================================================

/**
 * Get user's push message history
 */
export const getUserPushMessagesFn = createServerFn({
  method: "GET",
})
  .inputValidator(getPushMessagesSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const messages = await findUserPushMessages(
      context.userId,
      data.limit,
      data.offset
    );

    return {
      messages: messages.map((message) => ({
        id: message.id,
        title: message.title,
        body: message.body,
        status: message.status,
        scheduledAt: message.scheduledAt,
        processedAt: message.processedAt,
        createdAt: message.createdAt,
      })),
    };
  });

/**
 * Get delivery statistics for a message (Admin only)
 */
export const getMessageDeliveryStatsFn = createServerFn({
  method: "GET",
})
  .inputValidator(getDeliveryStatsSchema)
  .middleware([assertAdminMiddleware])
  .handler(async ({ data }) => {
    const stats = await getDeliveryStats(data.messageId);
    return stats;
  });
