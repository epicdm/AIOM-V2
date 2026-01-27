import { createFileRoute } from '@tanstack/react-router';
import { database as db } from '~/db';
import { autonomousActions } from '~/db/ai-coo-schema';
import { desc, gte, lte, eq, and, or, inArray } from 'drizzle-orm';

export const Route = createFileRoute('/api/ai-coo/activity-feed')({
  server: {
    handlers: {
      /**
       * GET /api/ai-coo/activity-feed
       *
       * Fetches activity feed for the AI COO dashboard
       * Returns activities grouped by: happening_now, upcoming, recent
       */
      GET: async ({ request }) => {
        try {
          const now = new Date();
          const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
          const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

          console.log('[AI COO API] Fetching activity feed');

          // Fetch happening now: currently executing actions
          const happeningNow = await db
            .select()
            .from(autonomousActions)
            .where(
              and(
                eq(autonomousActions.status, 'executing'),
                gte(autonomousActions.executedAt!, twoHoursAgo)
              )
            )
            .orderBy(desc(autonomousActions.executedAt))
            .limit(10);

          // Fetch upcoming: approved actions scheduled for next 2 hours
          const upcoming = await db
            .select()
            .from(autonomousActions)
            .where(
              and(
                eq(autonomousActions.status, 'approved'),
                lte(autonomousActions.createdAt, twoHoursFromNow)
              )
            )
            .orderBy(autonomousActions.createdAt)
            .limit(10);

          // Fetch recent: completed or failed actions from last 2 hours
          const recent = await db
            .select()
            .from(autonomousActions)
            .where(
              and(
                inArray(autonomousActions.status, ['executed', 'failed', 'pending']),
                gte(autonomousActions.createdAt, twoHoursAgo)
              )
            )
            .orderBy(desc(autonomousActions.createdAt))
            .limit(10);

          // Transform to activity feed format
          const happeningNowFeed = happeningNow.map((action) =>
            transformToActivityItem(action, 'happening_now')
          );

          const upcomingFeed = upcoming.map((action) =>
            transformToActivityItem(action, 'upcoming')
          );

          const recentFeed = recent.map((action) => transformToActivityItem(action, 'recent'));

          console.log('[AI COO API] Activity feed counts:', {
            happeningNow: happeningNowFeed.length,
            upcoming: upcomingFeed.length,
            recent: recentFeed.length,
          });

          return Response.json({
            happening_now: happeningNowFeed,
            upcoming: upcomingFeed,
            recent: recentFeed,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error('[AI COO API] Failed to fetch activity feed:', error);
          return Response.json(
            {
              error: 'Failed to fetch activity feed',
              message: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
          );
        }
      },
    },
  },
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Transform database action to activity feed item
 */
function transformToActivityItem(
  action: any,
  type: 'happening_now' | 'upcoming' | 'recent'
): any {
  const protocol = action.actionProtocol as any;
  const affectedRecords = protocol?.affected_records || {};

  // Determine icon based on action type
  const icon = getIconForActionType(action.actionType);
  const iconColor = getIconColorForStatus(action.status);

  // Build title
  const title = buildActivityTitle(action, affectedRecords);

  // Build subtitle
  const subtitle = buildActivitySubtitle(action, affectedRecords);

  // Determine status for status indicators
  const status = mapStatusToFeedStatus(action.status);

  // Calculate time for upcoming items
  const time = type === 'upcoming' ? calculateUpcomingTime(action.createdAt) : undefined;

  return {
    id: action.id,
    type,
    icon,
    iconColor,
    title,
    subtitle,
    status,
    time,
    createdAt: action.createdAt,
    executedAt: action.executedAt,
  };
}

/**
 * Get icon name for action type
 */
function getIconForActionType(actionType: string): 'mail' | 'phone' | 'check' | 'clock' | 'alert' {
  if (actionType.includes('email') || actionType.includes('mail')) return 'mail';
  if (actionType.includes('sms') || actionType.includes('call')) return 'phone';
  if (actionType.includes('task')) return 'check';
  if (actionType.includes('invoice') || actionType.includes('payment')) return 'clock';
  return 'alert';
}

/**
 * Get icon color for status
 */
function getIconColorForStatus(status: string): string {
  switch (status) {
    case 'executing':
      return 'bg-blue-500 text-white';
    case 'executed':
      return 'bg-emerald-500 text-white';
    case 'failed':
      return 'bg-red-500 text-white';
    case 'approved':
      return 'bg-amber-500 text-white';
    case 'pending':
    case 'pending_approval':
      return 'bg-gray-100 text-gray-600';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

/**
 * Build activity title
 */
function buildActivityTitle(action: any, affectedRecords: any): string {
  const partnerName = affectedRecords.partner_name || affectedRecords.record_name || 'customer';
  const recordName = affectedRecords.record_name || '';

  switch (action.actionType) {
    case 'send_invoice_reminder':
      return `Payment reminder: ${partnerName} ${recordName}`;
    case 'send_deal_check_in':
      return `Demo call with ${partnerName}`;
    case 'create_collection_task':
      return `Collection task created for ${partnerName}`;
    case 'create_follow_up_task':
      return `Follow-up task: ${partnerName}`;
    default:
      return action.description || `Action: ${action.actionType}`;
  }
}

/**
 * Build activity subtitle
 */
function buildActivitySubtitle(action: any, affectedRecords: any): string {
  const protocol = action.actionProtocol as any;

  // Try to extract meaningful subtitle
  if (action.actionType.includes('invoice')) {
    const amount = extractAmount(affectedRecords.record_name);
    const days = calculateDaysOverdue(action.createdAt);
    return amount && days ? `${amount} invoice - ${days} days overdue` : 'Invoice follow-up';
  }

  if (action.actionType.includes('deal')) {
    return 'Sales pipeline - Qualified lead';
  }

  if (action.actionType.includes('task')) {
    return protocol?.operation?.inputs?.description || 'Task management';
  }

  // Fallback: use status and timing
  return buildStatusSubtitle(action.status, action.createdAt);
}

/**
 * Extract amount from text (e.g., "$5,000" from "INV-001 $5,000")
 */
function extractAmount(text: string): string | null {
  if (!text) return null;
  const match = text.match(/\$[\d,]+/);
  return match ? match[0] : null;
}

/**
 * Calculate days overdue
 */
function calculateDaysOverdue(createdAt: Date): number | null {
  if (!createdAt) return null;
  const now = new Date();
  const diff = now.getTime() - new Date(createdAt).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * Build subtitle from status
 */
function buildStatusSubtitle(status: string, createdAt: Date): string {
  const timeAgo = getTimeAgo(createdAt);

  switch (status) {
    case 'executing':
      return `Running • ${timeAgo}`;
    case 'pending':
    case 'pending_approval':
      return `Queued • pending`;
    case 'executed':
      return `Succeeded • ${timeAgo}`;
    case 'failed':
      return `Failed • ${timeAgo}`;
    case 'approved':
      return `Approved • ${timeAgo}`;
    default:
      return timeAgo;
  }
}

/**
 * Map database status to feed status
 */
function mapStatusToFeedStatus(status: string): 'running' | 'queued' | 'succeeded' | undefined {
  switch (status) {
    case 'executing':
      return 'running';
    case 'pending':
    case 'pending_approval':
    case 'approved':
      return 'queued';
    case 'executed':
      return 'succeeded';
    default:
      return undefined;
  }
}

/**
 * Calculate time for upcoming activities (e.g., "10:00", "10:30")
 */
function calculateUpcomingTime(createdAt: Date): string {
  const date = new Date(createdAt);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Get human-readable time ago (e.g., "2m ago", "14m ago", "just now")
 */
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return 'earlier';
}
