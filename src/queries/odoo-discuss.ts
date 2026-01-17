/**
 * Query Options for Odoo Discuss
 *
 * Provides TanStack Query options for Odoo Discuss data.
 */

import { queryOptions } from "@tanstack/react-query";
import {
  getOdooChannelsFn,
  getOdooChannelFn,
  getOdooMessagesFn,
  getOdooTotalUnreadCountFn,
  getOdooSubscriptionStatusFn,
  checkOdooConnectionFn,
} from "~/fn/odoo-discuss";

/**
 * Query options for fetching all channels
 */
export const odooChannelsQueryOptions = (options?: { limit?: number; offset?: number }) =>
  queryOptions({
    queryKey: ["odoo-discuss", "channels", options],
    queryFn: () => getOdooChannelsFn({ data: options }),
  });

/**
 * Query options for fetching a specific channel
 */
export const odooChannelQueryOptions = (channelId: string) =>
  queryOptions({
    queryKey: ["odoo-discuss", "channel", channelId],
    queryFn: () => getOdooChannelFn({ data: { channelId } }),
    enabled: !!channelId,
  });

/**
 * Query options for fetching messages in a channel
 */
export const odooMessagesQueryOptions = (
  channelId: string,
  options?: { limit?: number; offset?: number }
) =>
  queryOptions({
    queryKey: ["odoo-discuss", "messages", channelId, options],
    queryFn: () => getOdooMessagesFn({ data: { channelId, ...options } }),
    enabled: !!channelId,
  });

/**
 * Query options for total unread count
 */
export const odooTotalUnreadCountQueryOptions = () =>
  queryOptions({
    queryKey: ["odoo-discuss", "unread-count"],
    queryFn: () => getOdooTotalUnreadCountFn(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

/**
 * Query options for subscription status
 */
export const odooSubscriptionStatusQueryOptions = () =>
  queryOptions({
    queryKey: ["odoo-discuss", "subscription-status"],
    queryFn: () => getOdooSubscriptionStatusFn(),
  });

/**
 * Query options for checking Odoo connection
 */
export const odooConnectionStatusQueryOptions = () =>
  queryOptions({
    queryKey: ["odoo-discuss", "connection-status"],
    queryFn: () => checkOdooConnectionFn(),
    staleTime: 60000, // Consider fresh for 1 minute
  });
