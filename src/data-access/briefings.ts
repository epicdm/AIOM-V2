import { eq, desc, gt, and, lt, count } from "drizzle-orm";
import { database } from "~/db";
import {
  dailyBriefing,
  briefingVersion,
  user,
  type DailyBriefing,
  type CreateDailyBriefingData,
  type UpdateDailyBriefingData,
  type BriefingVersion,
  type CreateBriefingVersionData,
  type User,
  type BriefingStatus,
} from "~/db/schema";

// =============================================================================
// Types
// =============================================================================

export type DailyBriefingWithUser = DailyBriefing & {
  user: Pick<User, "id" | "name" | "image">;
};

export type DailyBriefingWithVersions = DailyBriefing & {
  versions: BriefingVersion[];
};

// =============================================================================
// Daily Briefing CRUD Operations
// =============================================================================

/**
 * Create a new daily briefing for a user
 */
export async function createBriefing(
  data: CreateDailyBriefingData
): Promise<DailyBriefing> {
  const [newBriefing] = await database
    .insert(dailyBriefing)
    .values({
      ...data,
      updatedAt: new Date(),
    })
    .returning();

  return newBriefing;
}

/**
 * Find a briefing by its ID
 */
export async function findBriefingById(
  id: string
): Promise<DailyBriefing | null> {
  const [result] = await database
    .select()
    .from(dailyBriefing)
    .where(eq(dailyBriefing.id, id))
    .limit(1);

  return result || null;
}

/**
 * Find the most recent active briefing for a user (not expired)
 */
export async function findUserActiveBriefing(
  userId: string
): Promise<DailyBriefing | null> {
  const now = new Date();

  const [result] = await database
    .select()
    .from(dailyBriefing)
    .where(
      and(
        eq(dailyBriefing.userId, userId),
        eq(dailyBriefing.status, "active"),
        gt(dailyBriefing.expiresAt, now)
      )
    )
    .orderBy(desc(dailyBriefing.generatedAt))
    .limit(1);

  return result || null;
}

/**
 * Find today's briefing for a user (generated today, regardless of expiration)
 */
export async function findUserTodayBriefing(
  userId: string
): Promise<DailyBriefing | null> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [result] = await database
    .select()
    .from(dailyBriefing)
    .where(
      and(
        eq(dailyBriefing.userId, userId),
        gt(dailyBriefing.generatedAt, today),
        lt(dailyBriefing.generatedAt, tomorrow)
      )
    )
    .orderBy(desc(dailyBriefing.generatedAt))
    .limit(1);

  return result || null;
}

/**
 * Find all briefings for a user with pagination
 */
export async function findUserBriefings(
  userId: string,
  limit: number = 10,
  offset: number = 0
): Promise<DailyBriefing[]> {
  const results = await database
    .select()
    .from(dailyBriefing)
    .where(eq(dailyBriefing.userId, userId))
    .orderBy(desc(dailyBriefing.generatedAt))
    .limit(limit)
    .offset(offset);

  return results;
}

/**
 * Count total briefings for a user
 */
export async function countUserBriefings(userId: string): Promise<number> {
  const [result] = await database
    .select({ count: count() })
    .from(dailyBriefing)
    .where(eq(dailyBriefing.userId, userId));

  return result?.count ?? 0;
}

/**
 * Update a briefing's data
 */
export async function updateBriefing(
  id: string,
  data: UpdateDailyBriefingData
): Promise<DailyBriefing | null> {
  const [updated] = await database
    .update(dailyBriefing)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(dailyBriefing.id, id))
    .returning();

  return updated || null;
}

/**
 * Mark a briefing as read
 */
export async function markBriefingAsRead(
  id: string
): Promise<DailyBriefing | null> {
  const [updated] = await database
    .update(dailyBriefing)
    .set({
      isRead: true,
      readAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(dailyBriefing.id, id))
    .returning();

  return updated || null;
}

/**
 * Update briefing status (active, expired, archived)
 */
export async function updateBriefingStatus(
  id: string,
  status: BriefingStatus
): Promise<DailyBriefing | null> {
  const [updated] = await database
    .update(dailyBriefing)
    .set({
      status,
      updatedAt: new Date(),
    })
    .where(eq(dailyBriefing.id, id))
    .returning();

  return updated || null;
}

/**
 * Regenerate a briefing with new content (creates a version and updates)
 */
export async function regenerateBriefing(
  id: string,
  newContent: string,
  reason: string = "regeneration"
): Promise<DailyBriefing | null> {
  // First, get the current briefing
  const current = await findBriefingById(id);
  if (!current) return null;

  // Create a version of the old content
  await createBriefingVersion({
    id: crypto.randomUUID(),
    briefingId: id,
    content: current.content,
    versionNumber: current.versionNumber,
    reason,
    createdAt: new Date(),
  });

  // Update with new content and increment version
  const [updated] = await database
    .update(dailyBriefing)
    .set({
      content: newContent,
      versionNumber: current.versionNumber + 1,
      updatedAt: new Date(),
    })
    .where(eq(dailyBriefing.id, id))
    .returning();

  return updated || null;
}

/**
 * Delete a briefing (hard delete)
 */
export async function deleteBriefing(id: string): Promise<boolean> {
  const result = await database
    .delete(dailyBriefing)
    .where(eq(dailyBriefing.id, id))
    .returning();

  return result.length > 0;
}

/**
 * Mark expired briefings as expired (batch operation)
 */
export async function markExpiredBriefings(): Promise<number> {
  const now = new Date();

  const result = await database
    .update(dailyBriefing)
    .set({
      status: "expired",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(dailyBriefing.status, "active"),
        lt(dailyBriefing.expiresAt, now)
      )
    )
    .returning();

  return result.length;
}

/**
 * Find unread briefings for a user
 */
export async function findUnreadBriefings(
  userId: string
): Promise<DailyBriefing[]> {
  const results = await database
    .select()
    .from(dailyBriefing)
    .where(
      and(
        eq(dailyBriefing.userId, userId),
        eq(dailyBriefing.isRead, false),
        eq(dailyBriefing.status, "active")
      )
    )
    .orderBy(desc(dailyBriefing.generatedAt));

  return results;
}

/**
 * Count unread active briefings for a user
 */
export async function countUnreadBriefings(userId: string): Promise<number> {
  const now = new Date();

  const [result] = await database
    .select({ count: count() })
    .from(dailyBriefing)
    .where(
      and(
        eq(dailyBriefing.userId, userId),
        eq(dailyBriefing.isRead, false),
        eq(dailyBriefing.status, "active"),
        gt(dailyBriefing.expiresAt, now)
      )
    );

  return result?.count ?? 0;
}

// =============================================================================
// Briefing Version Operations
// =============================================================================

/**
 * Create a new briefing version (snapshot)
 */
export async function createBriefingVersion(
  data: CreateBriefingVersionData
): Promise<BriefingVersion> {
  const [newVersion] = await database
    .insert(briefingVersion)
    .values(data)
    .returning();

  return newVersion;
}

/**
 * Find all versions for a briefing
 */
export async function findBriefingVersions(
  briefingId: string
): Promise<BriefingVersion[]> {
  const results = await database
    .select()
    .from(briefingVersion)
    .where(eq(briefingVersion.briefingId, briefingId))
    .orderBy(desc(briefingVersion.versionNumber));

  return results;
}

/**
 * Find a specific version by briefing ID and version number
 */
export async function findBriefingVersionByNumber(
  briefingId: string,
  versionNumber: number
): Promise<BriefingVersion | null> {
  const [result] = await database
    .select()
    .from(briefingVersion)
    .where(
      and(
        eq(briefingVersion.briefingId, briefingId),
        eq(briefingVersion.versionNumber, versionNumber)
      )
    )
    .limit(1);

  return result || null;
}

/**
 * Count versions for a briefing
 */
export async function countBriefingVersions(briefingId: string): Promise<number> {
  const [result] = await database
    .select({ count: count() })
    .from(briefingVersion)
    .where(eq(briefingVersion.briefingId, briefingId));

  return result?.count ?? 0;
}

/**
 * Get a briefing with all its versions
 */
export async function findBriefingWithVersions(
  id: string
): Promise<DailyBriefingWithVersions | null> {
  const briefingData = await findBriefingById(id);
  if (!briefingData) return null;

  const versions = await findBriefingVersions(id);

  return {
    ...briefingData,
    versions,
  };
}
