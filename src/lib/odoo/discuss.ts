/**
 * Odoo Discuss Integration Module
 *
 * Provides specialized functionality for interacting with Odoo's Discuss module,
 * including channels, messages, and real-time long-polling for live updates.
 */

import { OdooClient } from './client';
import type { OdooDomain, XmlRpcValue } from './types';
import { OdooError } from './types';

// =============================================================================
// Discuss Types
// =============================================================================

/**
 * Odoo Discuss Channel
 */
export interface DiscussChannel {
  id: number;
  name: string;
  channel_type: 'chat' | 'channel' | 'group';
  description: string | false;
  member_count: number;
  message_unread_counter: number;
  is_member: boolean;
  create_date: string;
  write_date: string;
  image_128?: string | false;
  [key: string]: XmlRpcValue | undefined;
}

/**
 * Odoo Discuss Message
 */
export interface DiscussMessage {
  id: number;
  body: string;
  message_type: 'comment' | 'notification' | 'email' | 'user_notification';
  subtype_id: [number, string] | false;
  author_id: [number, string] | false;
  date: string;
  model: string;
  res_id: number;
  record_name: string | false;
  attachment_ids: number[];
  partner_ids: number[];
  starred_partner_ids: number[];
  create_date: string;
  write_date: string;
  [key: string]: XmlRpcValue | undefined;
}

/**
 * Channel member information
 */
export interface ChannelMember {
  id: number;
  partner_id: [number, string];
  channel_id: [number, string];
  seen_message_id: [number, string] | false;
  fold_state: 'open' | 'folded' | 'closed';
  is_minimized: boolean;
  is_pinned: boolean;
}

/**
 * Long-polling notification format
 */
export interface DiscussNotification {
  type: 'mail.channel/new_message' | 'mail.channel/unread_counter' | 'mail.channel/typing_status' | 'mail.message/toggle_star';
  payload: XmlRpcValue;
}

/**
 * Long-polling response
 */
export interface LongPollingResponse {
  channels: DiscussNotification[];
  lastId: number;
}

// =============================================================================
// Discuss Client Class
// =============================================================================

export class DiscussClient {
  private client: OdooClient;
  private pollingLastId: number = 0;
  private isPolling: boolean = false;
  private pollingAbortController: AbortController | null = null;

  constructor(client: OdooClient) {
    this.client = client;
  }

  // ===========================================================================
  // Channel Operations
  // ===========================================================================

  /**
   * Get all channels the current user has access to
   */
  async getChannels(options: {
    limit?: number;
    offset?: number;
    channelType?: 'chat' | 'channel' | 'group';
  } = {}): Promise<DiscussChannel[]> {
    const domain: OdooDomain = [];

    if (options.channelType) {
      domain.push(['channel_type', '=', options.channelType]);
    }

    const channels = await this.client.searchRead<DiscussChannel>(
      'mail.channel',
      domain,
      {
        fields: [
          'name',
          'channel_type',
          'description',
          'member_count',
          'message_unread_counter',
          'is_member',
          'create_date',
          'write_date',
          'image_128',
        ],
        limit: options.limit || 50,
        offset: options.offset || 0,
        order: 'write_date desc',
      }
    );

    return channels;
  }

  /**
   * Get a specific channel by ID
   */
  async getChannel(channelId: number): Promise<DiscussChannel | null> {
    const channels = await this.client.read<DiscussChannel>('mail.channel', [channelId], {
      fields: [
        'name',
        'channel_type',
        'description',
        'member_count',
        'message_unread_counter',
        'is_member',
        'create_date',
        'write_date',
        'image_128',
      ],
    });

    return channels.length > 0 ? channels[0] : null;
  }

  /**
   * Get channels the user is a member of
   */
  async getJoinedChannels(limit: number = 50): Promise<DiscussChannel[]> {
    const channels = await this.client.searchRead<DiscussChannel>(
      'mail.channel',
      [['is_member', '=', true]],
      {
        fields: [
          'name',
          'channel_type',
          'description',
          'member_count',
          'message_unread_counter',
          'is_member',
          'create_date',
          'write_date',
          'image_128',
        ],
        limit,
        order: 'message_unread_counter desc, write_date desc',
      }
    );

    return channels;
  }

  /**
   * Join a channel
   */
  async joinChannel(channelId: number): Promise<boolean> {
    try {
      await this.client.callMethodOnIds<void>(
        'mail.channel',
        [channelId],
        'add_members',
        [],
        { partner_ids: [] } // Empty array means add current user
      );
      return true;
    } catch (error) {
      // Try alternative method for older Odoo versions
      try {
        await this.client.callMethodOnIds<void>(
          'mail.channel',
          [channelId],
          'channel_join'
        );
        return true;
      } catch {
        throw new OdooError(
          error instanceof Error ? error.message : 'Failed to join channel'
        );
      }
    }
  }

  /**
   * Leave a channel
   */
  async leaveChannel(channelId: number): Promise<boolean> {
    try {
      await this.client.callMethodOnIds<void>(
        'mail.channel',
        [channelId],
        'action_unfollow'
      );
      return true;
    } catch (error) {
      throw new OdooError(
        error instanceof Error ? error.message : 'Failed to leave channel'
      );
    }
  }

  /**
   * Create a new channel
   */
  async createChannel(data: {
    name: string;
    description?: string;
    channelType?: 'chat' | 'channel' | 'group';
    isPublic?: boolean;
  }): Promise<number> {
    const channelId = await this.client.create('mail.channel', {
      name: data.name,
      description: data.description || false,
      channel_type: data.channelType || 'channel',
      public: data.isPublic !== false ? 'public' : 'groups',
    });

    return channelId;
  }

  // ===========================================================================
  // Message Operations
  // ===========================================================================

  /**
   * Get messages from a channel
   */
  async getMessages(
    channelId: number,
    options: {
      limit?: number;
      offset?: number;
      beforeId?: number;
      afterId?: number;
    } = {}
  ): Promise<DiscussMessage[]> {
    const domain: OdooDomain = [
      ['model', '=', 'mail.channel'],
      ['res_id', '=', channelId],
      ['message_type', 'in', ['comment', 'notification']],
    ];

    if (options.beforeId) {
      domain.push(['id', '<', options.beforeId]);
    }
    if (options.afterId) {
      domain.push(['id', '>', options.afterId]);
    }

    const messages = await this.client.searchRead<DiscussMessage>(
      'mail.message',
      domain,
      {
        fields: [
          'body',
          'message_type',
          'subtype_id',
          'author_id',
          'date',
          'model',
          'res_id',
          'record_name',
          'attachment_ids',
          'partner_ids',
          'starred_partner_ids',
          'create_date',
          'write_date',
        ],
        limit: options.limit || 50,
        offset: options.offset || 0,
        order: 'id desc',
      }
    );

    // Return in chronological order (oldest first)
    return messages.reverse();
  }

  /**
   * Post a message to a channel
   */
  async postMessage(
    channelId: number,
    body: string,
    options: {
      messageType?: 'comment' | 'notification';
      attachmentIds?: number[];
    } = {}
  ): Promise<number> {
    // Use the mail.channel's message_post method for proper integration
    const messageId = await this.client.callMethodOnIds<number>(
      'mail.channel',
      [channelId],
      'message_post',
      [],
      {
        body,
        message_type: options.messageType || 'comment',
        attachment_ids: options.attachmentIds || [],
      }
    );

    return messageId;
  }

  /**
   * Star/unstar a message
   */
  async toggleMessageStar(messageId: number): Promise<boolean> {
    try {
      await this.client.callMethodOnIds<void>(
        'mail.message',
        [messageId],
        'toggle_message_starred'
      );
      return true;
    } catch (error) {
      throw new OdooError(
        error instanceof Error ? error.message : 'Failed to toggle message star'
      );
    }
  }

  /**
   * Mark messages as read in a channel
   */
  async markChannelAsRead(channelId: number, lastMessageId?: number): Promise<boolean> {
    try {
      await this.client.callMethodOnIds<void>(
        'mail.channel',
        [channelId],
        'channel_seen',
        lastMessageId ? [lastMessageId] : []
      );
      return true;
    } catch (error) {
      throw new OdooError(
        error instanceof Error ? error.message : 'Failed to mark channel as read'
      );
    }
  }

  /**
   * Get unread message count for a channel
   */
  async getUnreadCount(channelId: number): Promise<number> {
    const channel = await this.getChannel(channelId);
    return channel?.message_unread_counter ?? 0;
  }

  /**
   * Get total unread count across all channels
   */
  async getTotalUnreadCount(): Promise<number> {
    const channels = await this.getJoinedChannels(100);
    return channels.reduce((total, ch) => total + (ch.message_unread_counter || 0), 0);
  }

  // ===========================================================================
  // Long-Polling for Real-Time Updates
  // ===========================================================================

  /**
   * Initialize long-polling by getting the current last notification ID
   */
  async initPolling(): Promise<number> {
    try {
      // Get bus.bus last notification ID
      const result = await this.client.callMethod<number>(
        'bus.bus',
        'get_last_notification_id'
      );
      this.pollingLastId = result;
      return result;
    } catch {
      // Fallback for older Odoo versions
      this.pollingLastId = 0;
      return 0;
    }
  }

  /**
   * Poll for new notifications (one-time)
   * Returns new notifications since last poll
   */
  async poll(): Promise<DiscussNotification[]> {
    try {
      const result = await this.client.callMethod<Array<{
        id: number;
        channel: string;
        message: XmlRpcValue;
      }>>(
        'bus.bus',
        'poll',
        [
          // Channels to listen to (discuss channels)
          ['mail.channel', 'res.partner'],
        ],
        {
          last: this.pollingLastId,
        }
      );

      if (Array.isArray(result) && result.length > 0) {
        // Update last ID
        const maxId = Math.max(...result.map((n) => n.id));
        if (maxId > this.pollingLastId) {
          this.pollingLastId = maxId;
        }

        // Convert to notifications
        return result.map((n) => ({
          type: n.channel as DiscussNotification['type'],
          payload: n.message,
        }));
      }

      return [];
    } catch (error) {
      throw new OdooError(
        error instanceof Error ? error.message : 'Polling failed'
      );
    }
  }

  /**
   * Start continuous long-polling
   * @param onNotification Callback for each notification batch
   * @param onError Callback for errors
   * @param interval Polling interval in ms (default: 5000)
   */
  startPolling(
    onNotification: (notifications: DiscussNotification[]) => void,
    onError?: (error: Error) => void,
    interval: number = 5000
  ): () => void {
    if (this.isPolling) {
      this.stopPolling();
    }

    this.isPolling = true;
    this.pollingAbortController = new AbortController();

    const pollLoop = async () => {
      while (this.isPolling) {
        try {
          const notifications = await this.poll();
          if (notifications.length > 0) {
            onNotification(notifications);
          }
        } catch (error) {
          if (onError && error instanceof Error) {
            onError(error);
          }
        }

        // Wait for interval before next poll
        await new Promise((resolve) => setTimeout(resolve, interval));
      }
    };

    // Initialize polling and start the loop
    this.initPolling()
      .then(() => pollLoop())
      .catch((error) => {
        if (onError && error instanceof Error) {
          onError(error);
        }
      });

    // Return stop function
    return () => this.stopPolling();
  }

  /**
   * Stop continuous polling
   */
  stopPolling(): void {
    this.isPolling = false;
    if (this.pollingAbortController) {
      this.pollingAbortController.abort();
      this.pollingAbortController = null;
    }
  }

  /**
   * Check if polling is active
   */
  isPollingActive(): boolean {
    return this.isPolling;
  }

  // ===========================================================================
  // Typing Indicators
  // ===========================================================================

  /**
   * Notify that the user is typing in a channel
   */
  async sendTypingNotification(channelId: number): Promise<void> {
    try {
      await this.client.callMethodOnIds<void>(
        'mail.channel',
        [channelId],
        'notify_typing',
        [true]
      );
    } catch {
      // Typing notifications are non-critical, silently fail
    }
  }

  /**
   * Notify that the user stopped typing
   */
  async sendStopTypingNotification(channelId: number): Promise<void> {
    try {
      await this.client.callMethodOnIds<void>(
        'mail.channel',
        [channelId],
        'notify_typing',
        [false]
      );
    } catch {
      // Typing notifications are non-critical, silently fail
    }
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Creates a DiscussClient from an authenticated OdooClient
 */
export function createDiscussClient(client: OdooClient): DiscussClient {
  if (!client.isAuthenticated()) {
    throw new OdooError('OdooClient must be authenticated before creating DiscussClient');
  }
  return new DiscussClient(client);
}
