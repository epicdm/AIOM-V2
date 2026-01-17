/**
 * Push Notification Query Options
 *
 * TanStack Query definitions for push notification data.
 */

import { queryOptions } from "@tanstack/react-query";
import {
  getUserDevicesFn,
  getVapidPublicKeyFn,
  getUserPushMessagesFn,
} from "~/fn/push-notifications";

/**
 * Query options for user's registered devices
 */
export const userDevicesQueryOptions = () =>
  queryOptions({
    queryKey: ["push-notifications", "devices"],
    queryFn: () => getUserDevicesFn(),
  });

/**
 * Query options for VAPID public key
 */
export const vapidPublicKeyQueryOptions = () =>
  queryOptions({
    queryKey: ["push-notifications", "vapid-key"],
    queryFn: () => getVapidPublicKeyFn(),
    staleTime: Infinity, // VAPID key doesn't change
  });

/**
 * Query options for user's push message history
 */
export const userPushMessagesQueryOptions = (
  limit: number = 20,
  offset: number = 0
) =>
  queryOptions({
    queryKey: ["push-notifications", "messages", { limit, offset }],
    queryFn: () => getUserPushMessagesFn({ data: { limit, offset } }),
  });
