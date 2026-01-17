/**
 * Push Notification Hooks
 *
 * Custom React hooks for push notification functionality.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  userDevicesQueryOptions,
  vapidPublicKeyQueryOptions,
  userPushMessagesQueryOptions,
} from "~/queries/push-notifications";
import {
  registerDeviceFn,
  unregisterDeviceFn,
  deleteDeviceTokenFn,
  sendNotificationToUserFn,
  sendBroadcastNotificationFn,
  queueNotificationFn,
  processNotificationQueueFn,
} from "~/fn/push-notifications";
import { getErrorMessage } from "~/utils/error";

// =============================================================================
// Query Hooks
// =============================================================================

/**
 * Hook to get user's registered devices
 */
export function useUserDevices(enabled = true) {
  return useQuery({
    ...userDevicesQueryOptions(),
    enabled,
  });
}

/**
 * Hook to get VAPID public key for web push subscription
 */
export function useVapidPublicKey() {
  return useQuery(vapidPublicKeyQueryOptions());
}

/**
 * Hook to get user's push message history
 */
export function useUserPushMessages(
  limit: number = 20,
  offset: number = 0,
  enabled = true
) {
  return useQuery({
    ...userPushMessagesQueryOptions(limit, offset),
    enabled,
  });
}

// =============================================================================
// Mutation Hooks
// =============================================================================

/**
 * Hook to register a device for push notifications
 */
export function useRegisterDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      tokenType: "web_push" | "fcm";
      token: string;
      webPushKeys?: { p256dh: string; auth: string };
      deviceName?: string;
      devicePlatform?: "web" | "ios" | "android";
      browserInfo?: string;
    }) => registerDeviceFn({ data }),
    onSuccess: () => {
      toast.success("Device registered for push notifications");
      queryClient.invalidateQueries({
        queryKey: ["push-notifications", "devices"],
      });
    },
    onError: (error) => {
      toast.error("Failed to register device", {
        description: getErrorMessage(error),
      });
    },
  });
}

/**
 * Hook to unregister a device from push notifications
 */
export function useUnregisterDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (token: string) => unregisterDeviceFn({ data: { token } }),
    onSuccess: () => {
      toast.success("Device unregistered from push notifications");
      queryClient.invalidateQueries({
        queryKey: ["push-notifications", "devices"],
      });
    },
    onError: (error) => {
      toast.error("Failed to unregister device", {
        description: getErrorMessage(error),
      });
    },
  });
}

/**
 * Hook to delete a device token
 */
export function useDeleteDeviceToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (deviceTokenId: string) =>
      deleteDeviceTokenFn({ data: { deviceTokenId } }),
    onSuccess: () => {
      toast.success("Device removed");
      queryClient.invalidateQueries({
        queryKey: ["push-notifications", "devices"],
      });
    },
    onError: (error) => {
      toast.error("Failed to remove device", {
        description: getErrorMessage(error),
      });
    },
  });
}

/**
 * Hook to send a notification to a user (Admin only)
 */
export function useSendNotificationToUser() {
  return useMutation({
    mutationFn: (data: {
      userId: string;
      title: string;
      body: string;
      icon?: string;
      badge?: string;
      image?: string;
      clickAction?: string;
      data?: Record<string, string>;
      priority?: "high" | "normal";
    }) => sendNotificationToUserFn({ data }),
    onSuccess: (result) => {
      if (result.success) {
        toast.success(
          `Notification sent to ${result.successCount}/${result.totalDevices} devices`
        );
      } else {
        toast.warning("Notification sending had issues", {
          description: `${result.failureCount} devices failed`,
        });
      }
    },
    onError: (error) => {
      toast.error("Failed to send notification", {
        description: getErrorMessage(error),
      });
    },
  });
}

/**
 * Hook to send a broadcast notification (Admin only)
 */
export function useSendBroadcastNotification() {
  return useMutation({
    mutationFn: (data: {
      userIds: string[];
      title: string;
      body: string;
      icon?: string;
      badge?: string;
      image?: string;
      clickAction?: string;
      data?: Record<string, string>;
      priority?: "high" | "normal";
    }) => sendBroadcastNotificationFn({ data }),
    onSuccess: (result) => {
      if (result.success) {
        toast.success(
          `Broadcast sent to ${result.successCount}/${result.totalDevices} devices`
        );
      } else {
        toast.warning("Broadcast had issues", {
          description: `${result.failureCount} devices failed`,
        });
      }
    },
    onError: (error) => {
      toast.error("Failed to send broadcast", {
        description: getErrorMessage(error),
      });
    },
  });
}

/**
 * Hook to queue a notification (Admin only)
 */
export function useQueueNotification() {
  return useMutation({
    mutationFn: (data: {
      userId: string;
      title: string;
      body: string;
      icon?: string;
      badge?: string;
      image?: string;
      clickAction?: string;
      data?: Record<string, string>;
      priority?: "high" | "normal";
      scheduledAt?: string;
      notificationId?: string;
    }) => queueNotificationFn({ data }),
    onSuccess: () => {
      toast.success("Notification queued successfully");
    },
    onError: (error) => {
      toast.error("Failed to queue notification", {
        description: getErrorMessage(error),
      });
    },
  });
}

/**
 * Hook to process the notification queue (Admin only)
 */
export function useProcessNotificationQueue() {
  return useMutation({
    mutationFn: () => processNotificationQueueFn(),
    onSuccess: (result) => {
      toast.success("Queue processed", {
        description: `Processed: ${result.processed}, Successful: ${result.successful}, Failed: ${result.failed}`,
      });
    },
    onError: (error) => {
      toast.error("Failed to process queue", {
        description: getErrorMessage(error),
      });
    },
  });
}

// =============================================================================
// Web Push Subscription Hook
// =============================================================================

/**
 * Hook to manage web push subscription
 */
export function useWebPushSubscription() {
  const { data: vapidKeyData } = useVapidPublicKey();
  const registerDevice = useRegisterDevice();
  const unregisterDevice = useUnregisterDevice();

  /**
   * Request notification permission and subscribe to push notifications
   */
  const subscribe = async (): Promise<boolean> => {
    if (!vapidKeyData?.publicKey) {
      toast.error("Push notifications not configured");
      return false;
    }

    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      toast.error("Push notifications not supported in this browser");
      return false;
    }

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Notification permission denied");
        return false;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKeyData.publicKey) as BufferSource,
      });

      const subscriptionJson = subscription.toJSON();

      // Register the device with our server
      await registerDevice.mutateAsync({
        tokenType: "web_push",
        token: subscriptionJson.endpoint!,
        webPushKeys: {
          p256dh: subscriptionJson.keys!.p256dh,
          auth: subscriptionJson.keys!.auth,
        },
        devicePlatform: "web",
        browserInfo: navigator.userAgent,
      });

      return true;
    } catch (error) {
      console.error("Failed to subscribe to push notifications:", error);
      toast.error("Failed to enable push notifications");
      return false;
    }
  };

  /**
   * Unsubscribe from push notifications
   */
  const unsubscribe = async (): Promise<boolean> => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe from push manager
        await subscription.unsubscribe();

        // Unregister the device from our server
        await unregisterDevice.mutateAsync(subscription.endpoint);
      }

      return true;
    } catch (error) {
      console.error("Failed to unsubscribe from push notifications:", error);
      toast.error("Failed to disable push notifications");
      return false;
    }
  };

  /**
   * Check if push notifications are currently enabled
   */
  const checkSubscription = async (): Promise<boolean> => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      return !!subscription;
    } catch {
      return false;
    }
  };

  return {
    subscribe,
    unsubscribe,
    checkSubscription,
    isConfigured: !!vapidKeyData?.publicKey,
    isLoading: registerDevice.isPending || unregisterDevice.isPending,
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Convert a URL-safe base64 string to a Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
