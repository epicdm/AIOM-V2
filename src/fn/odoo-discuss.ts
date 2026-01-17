/**
 * Server Functions for Odoo Discuss Integration
 *
 * Provides server-side functions for fetching channels, messages,
 * posting new messages, and managing real-time subscriptions.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authenticatedMiddleware } from "./middleware";
import { privateEnv } from "~/config/privateEnv";
import { createOdooClient, createDiscussClient } from "~/lib/odoo";
import type { DiscussChannel, DiscussMessage } from "~/lib/odoo";
import {
  findUserChannels,
  findChannelById,
  findChannelByOdooId,
  findMessagesByChannelId,
  createChannel,
  updateChannel,
  syncChannelsFromOdoo,
  syncMessagesFromOdoo,
  getTotalUnreadCount,
  findSubscriptionByUserId,
  upsertSubscription,
  updatePollingStatus,
  setSubscriptionActive,
  countMessagesByChannelId,
  getLatestMessageInChannel,
} from "~/data-access/odoo-discuss";

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Gets the Odoo configuration from environment
 */
function getOdooConfig() {
  const url = privateEnv.ODOO_URL;
  const database = privateEnv.ODOO_DATABASE;
  const username = privateEnv.ODOO_USERNAME;
  const password = privateEnv.ODOO_PASSWORD;

  if (!url || !database || !username || !password) {
    throw new Error("Odoo configuration is incomplete. Please check environment variables.");
  }

  return { url, database, username, password };
}

/**
 * Creates an authenticated Discuss client
 */
async function getDiscussClient() {
  const config = getOdooConfig();
  const odooClient = await createOdooClient(config);
  return createDiscussClient(odooClient);
}

// =============================================================================
// Channel Functions
// =============================================================================

/**
 * Get all channels for the current user (from local cache)
 */
export const getOdooChannelsFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      limit: z.number().optional().default(50),
      offset: z.number().optional().default(0),
    }).optional()
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const options = data || { limit: 50, offset: 0 };
    const channels = await findUserChannels(context.userId, options);
    const totalUnread = await getTotalUnreadCount(context.userId);

    return {
      channels,
      totalUnread,
    };
  });

/**
 * Sync channels from Odoo to local database
 */
export const syncOdooChannelsFn = createServerFn({
  method: "POST",
})
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    const discussClient = await getDiscussClient();

    // Fetch channels from Odoo
    const odooChannels = await discussClient.getJoinedChannels(100);

    // Sync to local database
    const syncedChannels = await syncChannelsFromOdoo(
      context.userId,
      odooChannels.map((ch: DiscussChannel) => ({
        odooId: ch.id,
        name: ch.name,
        description: ch.description || undefined,
        channelType: ch.channel_type,
        memberCount: ch.member_count,
        unreadCount: ch.message_unread_counter,
        isMember: ch.is_member,
        image: ch.image_128 || undefined,
        odooCreatedAt: ch.create_date ? new Date(ch.create_date) : undefined,
        odooUpdatedAt: ch.write_date ? new Date(ch.write_date) : undefined,
      }))
    );

    return {
      channels: syncedChannels,
      syncedCount: syncedChannels.length,
    };
  });

/**
 * Get a specific channel by ID
 */
export const getOdooChannelFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      channelId: z.string().min(1, "Channel ID is required"),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    const channel = await findChannelById(data.channelId);

    if (!channel) {
      throw new Error("Channel not found");
    }

    return { channel };
  });

/**
 * Join a channel in Odoo
 */
export const joinOdooChannelFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      odooChannelId: z.number().int().positive("Invalid Odoo channel ID"),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const discussClient = await getDiscussClient();

    // Join the channel in Odoo
    await discussClient.joinChannel(data.odooChannelId);

    // Get the updated channel info
    const channel = await discussClient.getChannel(data.odooChannelId);

    if (!channel) {
      throw new Error("Failed to get channel after joining");
    }

    // Sync to local database
    const [syncedChannel] = await syncChannelsFromOdoo(context.userId, [{
      odooId: channel.id,
      name: channel.name,
      description: channel.description || undefined,
      channelType: channel.channel_type,
      memberCount: channel.member_count,
      unreadCount: channel.message_unread_counter,
      isMember: true,
      image: channel.image_128 || undefined,
    }]);

    return { channel: syncedChannel };
  });

/**
 * Leave a channel in Odoo
 */
export const leaveOdooChannelFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      channelId: z.string().min(1, "Channel ID is required"),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    const channel = await findChannelById(data.channelId);

    if (!channel) {
      throw new Error("Channel not found");
    }

    const discussClient = await getDiscussClient();

    // Leave the channel in Odoo
    await discussClient.leaveChannel(channel.odooId);

    // Update local database
    await updateChannel(channel.id, {
      isMember: false,
    });

    return { success: true };
  });

// =============================================================================
// Message Functions
// =============================================================================

/**
 * Get messages for a channel (from local cache)
 */
export const getOdooMessagesFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      channelId: z.string().min(1, "Channel ID is required"),
      limit: z.number().optional().default(50),
      offset: z.number().optional().default(0),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    const messages = await findMessagesByChannelId(data.channelId, {
      limit: data.limit,
      offset: data.offset,
    });

    const totalCount = await countMessagesByChannelId(data.channelId);

    return {
      messages,
      totalCount,
      hasMore: data.offset + data.limit < totalCount,
    };
  });

/**
 * Sync messages from Odoo for a channel
 */
export const syncOdooMessagesFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      channelId: z.string().min(1, "Channel ID is required"),
      limit: z.number().optional().default(50),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    const channel = await findChannelById(data.channelId);

    if (!channel) {
      throw new Error("Channel not found");
    }

    const discussClient = await getDiscussClient();

    // Get latest local message to only fetch newer ones
    const latestLocal = await getLatestMessageInChannel(data.channelId);

    // Fetch messages from Odoo
    const odooMessages = await discussClient.getMessages(channel.odooId, {
      limit: data.limit,
      afterId: latestLocal?.odooId,
    });

    // Sync to local database
    const syncedMessages = await syncMessagesFromOdoo(
      data.channelId,
      odooMessages.map((msg: DiscussMessage) => ({
        odooId: msg.id,
        body: msg.body,
        messageType: msg.message_type,
        authorOdooId: msg.author_id ? msg.author_id[0] : undefined,
        authorName: msg.author_id ? msg.author_id[1] : undefined,
        isStarred: msg.starred_partner_ids?.length > 0,
        hasAttachments: msg.attachment_ids?.length > 0,
        attachmentCount: msg.attachment_ids?.length || 0,
        odooCreatedAt: msg.create_date ? new Date(msg.create_date) : undefined,
      }))
    );

    return {
      messages: syncedMessages,
      syncedCount: syncedMessages.length,
    };
  });

/**
 * Post a new message to a channel
 */
export const postOdooMessageFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      channelId: z.string().min(1, "Channel ID is required"),
      content: z.string().min(1, "Message content is required").max(10000, "Message too long"),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    const channel = await findChannelById(data.channelId);

    if (!channel) {
      throw new Error("Channel not found");
    }

    const discussClient = await getDiscussClient();

    // Post message to Odoo
    const messageId = await discussClient.postMessage(channel.odooId, data.content);

    // Sync the new message back to local database
    const odooMessages = await discussClient.getMessages(channel.odooId, {
      limit: 1,
      afterId: messageId - 1,
    });

    if (odooMessages.length > 0) {
      const msg = odooMessages[0];
      const [syncedMessage] = await syncMessagesFromOdoo(data.channelId, [{
        odooId: msg.id,
        body: msg.body,
        messageType: msg.message_type,
        authorOdooId: msg.author_id ? msg.author_id[0] : undefined,
        authorName: msg.author_id ? msg.author_id[1] : undefined,
        odooCreatedAt: msg.create_date ? new Date(msg.create_date) : undefined,
      }]);

      return { message: syncedMessage };
    }

    return { message: null, messageId };
  });

/**
 * Mark a channel as read
 */
export const markOdooChannelAsReadFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      channelId: z.string().min(1, "Channel ID is required"),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    const channel = await findChannelById(data.channelId);

    if (!channel) {
      throw new Error("Channel not found");
    }

    const discussClient = await getDiscussClient();

    // Mark as read in Odoo
    const latestMessage = await getLatestMessageInChannel(data.channelId);
    await discussClient.markChannelAsRead(
      channel.odooId,
      latestMessage?.odooId
    );

    // Update local database
    await updateChannel(channel.id, {
      unreadCount: 0,
    });

    return { success: true };
  });

// =============================================================================
// Real-Time Subscription Functions
// =============================================================================

/**
 * Get subscription status
 */
export const getOdooSubscriptionStatusFn = createServerFn({
  method: "GET",
})
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    const subscription = await findSubscriptionByUserId(context.userId);

    return {
      subscription,
      isActive: subscription?.isActive ?? false,
    };
  });

/**
 * Start real-time polling subscription
 */
export const startOdooPollingFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      pollingInterval: z.number().min(1000).max(30000).optional().default(5000),
    }).optional()
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const interval = data?.pollingInterval ?? 5000;

    // Initialize polling with Odoo
    const discussClient = await getDiscussClient();
    const lastPollingId = await discussClient.initPolling();

    // Create/update subscription
    const subscription = await upsertSubscription(context.userId, {
      isActive: true,
      lastPollingId,
      pollingInterval: interval,
      errorCount: 0,
      lastError: null,
      lastPollAt: new Date(),
    });

    return {
      subscription,
      lastPollingId,
    };
  });

/**
 * Poll for new notifications
 */
export const pollOdooNotificationsFn = createServerFn({
  method: "POST",
})
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    const subscription = await findSubscriptionByUserId(context.userId);

    if (!subscription || !subscription.isActive) {
      return {
        notifications: [],
        shouldContinue: false,
      };
    }

    try {
      const discussClient = await getDiscussClient();
      const notifications = await discussClient.poll();

      // Update polling status
      if (notifications.length > 0) {
        await updatePollingStatus(context.userId, subscription.lastPollingId + notifications.length);
      }

      return {
        notifications,
        shouldContinue: true,
      };
    } catch (error) {
      // Update error status
      await updatePollingStatus(
        context.userId,
        subscription.lastPollingId,
        error instanceof Error ? error.message : "Polling failed"
      );

      return {
        notifications: [],
        shouldContinue: subscription.errorCount < 5, // Stop after 5 consecutive errors
        error: error instanceof Error ? error.message : "Polling failed",
      };
    }
  });

/**
 * Stop real-time polling subscription
 */
export const stopOdooPollingFn = createServerFn({
  method: "POST",
})
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    await setSubscriptionActive(context.userId, false);

    return { success: true };
  });

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get total unread count across all channels
 */
export const getOdooTotalUnreadCountFn = createServerFn({
  method: "GET",
})
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    const count = await getTotalUnreadCount(context.userId);
    return { count };
  });

/**
 * Check Odoo connection status
 */
export const checkOdooConnectionFn = createServerFn({
  method: "GET",
})
  .middleware([authenticatedMiddleware])
  .handler(async () => {
    try {
      const config = getOdooConfig();
      const odooClient = await createOdooClient(config);
      const version = await odooClient.getVersion();

      return {
        connected: true,
        version,
      };
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : "Connection failed",
      };
    }
  });

/**
 * Send typing indicator
 */
export const sendOdooTypingIndicatorFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      channelId: z.string().min(1, "Channel ID is required"),
      isTyping: z.boolean(),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    const channel = await findChannelById(data.channelId);

    if (!channel) {
      throw new Error("Channel not found");
    }

    const discussClient = await getDiscussClient();

    if (data.isTyping) {
      await discussClient.sendTypingNotification(channel.odooId);
    } else {
      await discussClient.sendStopTypingNotification(channel.odooId);
    }

    return { success: true };
  });
