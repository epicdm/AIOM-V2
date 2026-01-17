/**
 * Briefing Scheduler Data Access Layer
 *
 * Handles database operations for scheduled briefing preferences and delivery logs.
 * Supports timezone-aware scheduling and delivery tracking.
 */

import { eq, desc, and, lt, gte, inArray, count, isNull, or } from "drizzle-orm";
import { database } from "~/db";
import {
  briefingSchedulePreference,
  scheduledBriefingLog,
  user,
  type BriefingSchedulePreference,
  type CreateBriefingSchedulePreferenceData,
  type UpdateBriefingSchedulePreferenceData,
  type ScheduledBriefingLog,
  type CreateScheduledBriefingLogData,
  type UpdateScheduledBriefingLogData,
  type ScheduledBriefingStatus,
  type BriefingDeliveryMethod,
  type User,
} from "~/db/schema";

// =============================================================================
// Types
// =============================================================================

export type {
  BriefingSchedulePreference,
  CreateBriefingSchedulePreferenceData,
  UpdateBriefingSchedulePreferenceData,
  ScheduledBriefingLog,
  CreateScheduledBriefingLogData,
  UpdateScheduledBriefingLogData,
  ScheduledBriefingStatus,
  BriefingDeliveryMethod,
};

export type BriefingSchedulePreferenceWithUser = BriefingSchedulePreference & {
  user: Pick<User, "id" | "name" | "email">;
};

export type UserForScheduledBriefing = {
  userId: string;
  userName: string;
  userEmail: string;
  deliveryTime: string;
  timezone: string;
  deliveryMethod: BriefingDeliveryMethod;
  daysOfWeek: number[];
  skipIfNoUpdates: boolean;
};

// =============================================================================
// Briefing Schedule Preference Operations
// =============================================================================

/**
 * Create a new briefing schedule preference for a user
 */
export async function createBriefingSchedulePreference(
  data: CreateBriefingSchedulePreferenceData
): Promise<BriefingSchedulePreference> {
  const [newPreference] = await database
    .insert(briefingSchedulePreference)
    .values(data)
    .returning();

  return newPreference;
}

/**
 * Find a briefing schedule preference by user ID
 */
export async function findBriefingSchedulePreference(
  userId: string
): Promise<BriefingSchedulePreference | null> {
  const [result] = await database
    .select()
    .from(briefingSchedulePreference)
    .where(eq(briefingSchedulePreference.userId, userId))
    .limit(1);

  return result || null;
}

/**
 * Get or create a briefing schedule preference for a user
 * Returns existing preference or creates a new one with defaults
 */
export async function getOrCreateBriefingSchedulePreference(
  userId: string
): Promise<BriefingSchedulePreference> {
  const existing = await findBriefingSchedulePreference(userId);
  if (existing) return existing;

  return createBriefingSchedulePreference({
    id: crypto.randomUUID(),
    userId,
    isEnabled: true,
    deliveryTime: "08:00",
    timezone: "UTC",
    deliveryMethod: "push",
    daysOfWeek: "[1,2,3,4,5]",
    skipIfNoUpdates: false,
  });
}

/**
 * Update a briefing schedule preference
 */
export async function updateBriefingSchedulePreference(
  userId: string,
  data: UpdateBriefingSchedulePreferenceData
): Promise<BriefingSchedulePreference | null> {
  const [updated] = await database
    .update(briefingSchedulePreference)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(briefingSchedulePreference.userId, userId))
    .returning();

  return updated || null;
}

/**
 * Enable scheduled briefings for a user
 */
export async function enableScheduledBriefings(
  userId: string
): Promise<BriefingSchedulePreference | null> {
  return updateBriefingSchedulePreference(userId, { isEnabled: true });
}

/**
 * Disable scheduled briefings for a user
 */
export async function disableScheduledBriefings(
  userId: string
): Promise<BriefingSchedulePreference | null> {
  return updateBriefingSchedulePreference(userId, { isEnabled: false });
}

/**
 * Update last delivered timestamp
 */
export async function markBriefingDelivered(
  userId: string
): Promise<BriefingSchedulePreference | null> {
  const [updated] = await database
    .update(briefingSchedulePreference)
    .set({
      lastDeliveredAt: new Date(),
      lastAttemptedAt: new Date(),
      consecutiveFailures: 0,
      lastErrorMessage: null,
      updatedAt: new Date(),
    })
    .where(eq(briefingSchedulePreference.userId, userId))
    .returning();

  return updated || null;
}

/**
 * Mark a briefing delivery attempt as failed
 */
export async function markBriefingDeliveryFailed(
  userId: string,
  errorMessage: string
): Promise<BriefingSchedulePreference | null> {
  const preference = await findBriefingSchedulePreference(userId);
  if (!preference) return null;

  const [updated] = await database
    .update(briefingSchedulePreference)
    .set({
      lastAttemptedAt: new Date(),
      consecutiveFailures: preference.consecutiveFailures + 1,
      lastErrorMessage: errorMessage,
      updatedAt: new Date(),
    })
    .where(eq(briefingSchedulePreference.userId, userId))
    .returning();

  return updated || null;
}

/**
 * Delete a briefing schedule preference
 */
export async function deleteBriefingSchedulePreference(
  userId: string
): Promise<boolean> {
  const [deleted] = await database
    .delete(briefingSchedulePreference)
    .where(eq(briefingSchedulePreference.userId, userId))
    .returning();

  return deleted !== undefined;
}

/**
 * Find all enabled briefing schedule preferences with user info
 */
export async function findEnabledSchedulePreferences(): Promise<BriefingSchedulePreferenceWithUser[]> {
  const results = await database
    .select({
      id: briefingSchedulePreference.id,
      userId: briefingSchedulePreference.userId,
      isEnabled: briefingSchedulePreference.isEnabled,
      deliveryTime: briefingSchedulePreference.deliveryTime,
      timezone: briefingSchedulePreference.timezone,
      deliveryMethod: briefingSchedulePreference.deliveryMethod,
      daysOfWeek: briefingSchedulePreference.daysOfWeek,
      skipIfNoUpdates: briefingSchedulePreference.skipIfNoUpdates,
      lastDeliveredAt: briefingSchedulePreference.lastDeliveredAt,
      lastAttemptedAt: briefingSchedulePreference.lastAttemptedAt,
      consecutiveFailures: briefingSchedulePreference.consecutiveFailures,
      lastErrorMessage: briefingSchedulePreference.lastErrorMessage,
      createdAt: briefingSchedulePreference.createdAt,
      updatedAt: briefingSchedulePreference.updatedAt,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    })
    .from(briefingSchedulePreference)
    .innerJoin(user, eq(briefingSchedulePreference.userId, user.id))
    .where(eq(briefingSchedulePreference.isEnabled, true));

  return results;
}

/**
 * Get users due for briefing delivery based on their timezone and delivery time
 * This function considers:
 * 1. User's configured delivery time
 * 2. User's timezone
 * 3. Whether today is a delivery day (based on daysOfWeek)
 * 4. Whether briefing was already delivered today
 */
export async function getUsersDueForBriefing(): Promise<UserForScheduledBriefing[]> {
  // Get all enabled preferences
  const enabledPreferences = await findEnabledSchedulePreferences();

  const usersForDelivery: UserForScheduledBriefing[] = [];
  const now = new Date();

  for (const pref of enabledPreferences) {
    // Parse days of week
    let daysOfWeek: number[];
    try {
      daysOfWeek = JSON.parse(pref.daysOfWeek);
    } catch {
      daysOfWeek = [1, 2, 3, 4, 5]; // Default to weekdays
    }

    // Get current time in user's timezone
    const userLocalTime = getTimeInTimezone(now, pref.timezone);
    const userLocalDay = getDayInTimezone(now, pref.timezone);

    // Check if today is a delivery day
    if (!daysOfWeek.includes(userLocalDay)) {
      continue;
    }

    // Parse delivery time (HH:mm format)
    const [deliveryHour, deliveryMinute] = pref.deliveryTime.split(":").map(Number);
    const currentHour = userLocalTime.getHours();
    const currentMinute = userLocalTime.getMinutes();

    // Check if we're within the delivery window (delivery time to 30 minutes after)
    const deliveryTimeMinutes = deliveryHour * 60 + deliveryMinute;
    const currentTimeMinutes = currentHour * 60 + currentMinute;
    const windowEnd = deliveryTimeMinutes + 30; // 30-minute window

    if (currentTimeMinutes < deliveryTimeMinutes || currentTimeMinutes > windowEnd) {
      continue;
    }

    // Check if already delivered today in user's timezone
    if (pref.lastDeliveredAt) {
      const lastDeliveryInUserTz = getTimeInTimezone(pref.lastDeliveredAt, pref.timezone);
      const todayStartInUserTz = new Date(userLocalTime);
      todayStartInUserTz.setHours(0, 0, 0, 0);

      if (lastDeliveryInUserTz >= todayStartInUserTz) {
        continue; // Already delivered today
      }
    }

    usersForDelivery.push({
      userId: pref.userId,
      userName: pref.user.name,
      userEmail: pref.user.email,
      deliveryTime: pref.deliveryTime,
      timezone: pref.timezone,
      deliveryMethod: pref.deliveryMethod as BriefingDeliveryMethod,
      daysOfWeek,
      skipIfNoUpdates: pref.skipIfNoUpdates,
    });
  }

  return usersForDelivery;
}

// =============================================================================
// Scheduled Briefing Log Operations
// =============================================================================

/**
 * Create a new scheduled briefing log entry
 */
export async function createScheduledBriefingLog(
  data: CreateScheduledBriefingLogData
): Promise<ScheduledBriefingLog> {
  const [newLog] = await database
    .insert(scheduledBriefingLog)
    .values(data)
    .returning();

  return newLog;
}

/**
 * Find a scheduled briefing log by ID
 */
export async function findScheduledBriefingLogById(
  id: string
): Promise<ScheduledBriefingLog | null> {
  const [result] = await database
    .select()
    .from(scheduledBriefingLog)
    .where(eq(scheduledBriefingLog.id, id))
    .limit(1);

  return result || null;
}

/**
 * Find scheduled briefing logs for a user
 */
export async function findUserScheduledBriefingLogs(
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<ScheduledBriefingLog[]> {
  const results = await database
    .select()
    .from(scheduledBriefingLog)
    .where(eq(scheduledBriefingLog.userId, userId))
    .orderBy(desc(scheduledBriefingLog.scheduledFor))
    .limit(limit)
    .offset(offset);

  return results;
}

/**
 * Update a scheduled briefing log
 */
export async function updateScheduledBriefingLog(
  id: string,
  data: UpdateScheduledBriefingLogData
): Promise<ScheduledBriefingLog | null> {
  const [updated] = await database
    .update(scheduledBriefingLog)
    .set(data)
    .where(eq(scheduledBriefingLog.id, id))
    .returning();

  return updated || null;
}

/**
 * Mark a scheduled briefing log as delivered
 */
export async function markLogAsDelivered(
  id: string,
  briefingId?: string,
  pushMessageId?: string
): Promise<ScheduledBriefingLog | null> {
  const [updated] = await database
    .update(scheduledBriefingLog)
    .set({
      status: "delivered",
      deliveredAt: new Date(),
      briefingId,
      pushMessageId,
    })
    .where(eq(scheduledBriefingLog.id, id))
    .returning();

  return updated || null;
}

/**
 * Mark a scheduled briefing log as failed
 */
export async function markLogAsFailed(
  id: string,
  errorMessage: string
): Promise<ScheduledBriefingLog | null> {
  const [updated] = await database
    .update(scheduledBriefingLog)
    .set({
      status: "failed",
      errorMessage,
    })
    .where(eq(scheduledBriefingLog.id, id))
    .returning();

  return updated || null;
}

/**
 * Mark a scheduled briefing log as skipped
 */
export async function markLogAsSkipped(
  id: string,
  skipReason: string
): Promise<ScheduledBriefingLog | null> {
  const [updated] = await database
    .update(scheduledBriefingLog)
    .set({
      status: "skipped",
      skipReason,
    })
    .where(eq(scheduledBriefingLog.id, id))
    .returning();

  return updated || null;
}

/**
 * Get delivery statistics for a user
 */
export async function getUserDeliveryStats(userId: string): Promise<{
  total: number;
  delivered: number;
  failed: number;
  skipped: number;
}> {
  const logs = await findUserScheduledBriefingLogs(userId, 100);

  return {
    total: logs.length,
    delivered: logs.filter((l) => l.status === "delivered").length,
    failed: logs.filter((l) => l.status === "failed").length,
    skipped: logs.filter((l) => l.status === "skipped").length,
  };
}

/**
 * Count users with scheduled briefings enabled
 */
export async function countEnabledUsers(): Promise<number> {
  const [result] = await database
    .select({ count: count() })
    .from(briefingSchedulePreference)
    .where(eq(briefingSchedulePreference.isEnabled, true));

  return result?.count ?? 0;
}

/**
 * Get recent delivery logs (for monitoring)
 */
export async function getRecentDeliveryLogs(
  limit: number = 50
): Promise<ScheduledBriefingLog[]> {
  const results = await database
    .select()
    .from(scheduledBriefingLog)
    .orderBy(desc(scheduledBriefingLog.createdAt))
    .limit(limit);

  return results;
}

// =============================================================================
// Timezone Utility Functions
// =============================================================================

/**
 * Get current time in a specific timezone
 */
export function getTimeInTimezone(date: Date, timezone: string): Date {
  try {
    // Create a formatter for the target timezone
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    const parts = formatter.formatToParts(date);
    const values: Record<string, string> = {};
    parts.forEach((part) => {
      values[part.type] = part.value;
    });

    // Create a new date object representing the time in the target timezone
    return new Date(
      parseInt(values.year),
      parseInt(values.month) - 1,
      parseInt(values.day),
      parseInt(values.hour),
      parseInt(values.minute),
      parseInt(values.second)
    );
  } catch {
    // Fallback to UTC if timezone is invalid
    console.warn(`Invalid timezone: ${timezone}, falling back to UTC`);
    return date;
  }
}

/**
 * Get the day of week (0-6, where 0=Sunday) in a specific timezone
 */
export function getDayInTimezone(date: Date, timezone: string): number {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
    });

    const dayName = formatter.format(date);
    const dayMap: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };

    return dayMap[dayName] ?? date.getDay();
  } catch {
    // Fallback to local day
    return date.getDay();
  }
}

/**
 * Check if a timezone string is valid
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get a list of common timezones for UI display
 */
export function getCommonTimezones(): { value: string; label: string }[] {
  return [
    { value: "Pacific/Honolulu", label: "(UTC-10:00) Hawaii" },
    { value: "America/Los_Angeles", label: "(UTC-08:00) Pacific Time (US)" },
    { value: "America/Denver", label: "(UTC-07:00) Mountain Time (US)" },
    { value: "America/Chicago", label: "(UTC-06:00) Central Time (US)" },
    { value: "America/New_York", label: "(UTC-05:00) Eastern Time (US)" },
    { value: "America/Sao_Paulo", label: "(UTC-03:00) Sao Paulo" },
    { value: "UTC", label: "(UTC+00:00) UTC" },
    { value: "Europe/London", label: "(UTC+00:00) London" },
    { value: "Europe/Paris", label: "(UTC+01:00) Paris, Berlin" },
    { value: "Europe/Moscow", label: "(UTC+03:00) Moscow" },
    { value: "Asia/Dubai", label: "(UTC+04:00) Dubai" },
    { value: "Asia/Kolkata", label: "(UTC+05:30) Mumbai, Kolkata" },
    { value: "Asia/Bangkok", label: "(UTC+07:00) Bangkok" },
    { value: "Asia/Singapore", label: "(UTC+08:00) Singapore" },
    { value: "Asia/Manila", label: "(UTC+08:00) Manila" },
    { value: "Asia/Shanghai", label: "(UTC+08:00) Beijing, Shanghai" },
    { value: "Asia/Tokyo", label: "(UTC+09:00) Tokyo" },
    { value: "Australia/Sydney", label: "(UTC+10:00) Sydney" },
    { value: "Pacific/Auckland", label: "(UTC+12:00) Auckland" },
  ];
}
