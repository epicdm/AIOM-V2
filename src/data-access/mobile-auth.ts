/**
 * Mobile Auth Data Access Layer
 *
 * Data access functions for mobile authentication.
 * Handles device registration and session management.
 */

import { eq, and, desc } from "drizzle-orm";
import { database } from "~/db";
import { session, user, deviceToken } from "~/db/schema";
import { nanoid } from "nanoid";

// Types for mobile device registration
export interface RegisterDeviceInput {
  userId: string;
  deviceId: string;
  deviceName: string;
  platform: "ios" | "android" | "web";
  pushToken?: string;
}

export interface MobileSession {
  id: string;
  token: string;
  expiresAt: Date;
  userId: string;
  userAgent: string | null;
  createdAt: Date;
}

export interface MobileDeviceRecord {
  id: string;
  userId: string;
  deviceName: string;
  platform: string;
  isActive: boolean;
  lastUsedAt: Date;
  createdAt: Date;
}

/**
 * Get a user's active sessions
 */
export async function getUserSessions(userId: string): Promise<MobileSession[]> {
  const sessions = await database
    .select({
      id: session.id,
      token: session.token,
      expiresAt: session.expiresAt,
      userId: session.userId,
      userAgent: session.userAgent,
      createdAt: session.createdAt,
    })
    .from(session)
    .where(eq(session.userId, userId))
    .orderBy(desc(session.createdAt));

  return sessions;
}

/**
 * Get session by token
 */
export async function getSessionByToken(token: string): Promise<MobileSession | null> {
  const sessions = await database
    .select({
      id: session.id,
      token: session.token,
      expiresAt: session.expiresAt,
      userId: session.userId,
      userAgent: session.userAgent,
      createdAt: session.createdAt,
    })
    .from(session)
    .where(eq(session.token, token))
    .limit(1);

  return sessions[0] || null;
}

/**
 * Check if a session is valid and not expired
 */
export async function isSessionValid(token: string): Promise<boolean> {
  const sessionData = await getSessionByToken(token);

  if (!sessionData) {
    return false;
  }

  return new Date(sessionData.expiresAt) > new Date();
}

/**
 * Register a mobile device for push notifications
 */
export async function registerDevice(input: RegisterDeviceInput): Promise<MobileDeviceRecord> {
  const id = nanoid();
  const now = new Date();

  // Check if device already exists
  const existingDevices = await database
    .select()
    .from(deviceToken)
    .where(
      and(
        eq(deviceToken.userId, input.userId),
        eq(deviceToken.token, input.deviceId)
      )
    )
    .limit(1);

  if (existingDevices.length > 0) {
    // Update existing device
    await database
      .update(deviceToken)
      .set({
        deviceName: input.deviceName,
        devicePlatform: input.platform,
        isActive: true,
        lastUsedAt: now,
        updatedAt: now,
      })
      .where(eq(deviceToken.id, existingDevices[0].id));

    return {
      id: existingDevices[0].id,
      userId: input.userId,
      deviceName: input.deviceName,
      platform: input.platform,
      isActive: true,
      lastUsedAt: now,
      createdAt: existingDevices[0].createdAt,
    };
  }

  // Create new device record
  await database.insert(deviceToken).values({
    id,
    userId: input.userId,
    tokenType: input.pushToken ? "fcm" : "web_push",
    token: input.deviceId,
    deviceName: input.deviceName,
    devicePlatform: input.platform,
    isActive: true,
    lastUsedAt: now,
    createdAt: now,
    updatedAt: now,
  });

  return {
    id,
    userId: input.userId,
    deviceName: input.deviceName,
    platform: input.platform,
    isActive: true,
    lastUsedAt: now,
    createdAt: now,
  };
}

/**
 * Get user's registered devices
 */
export async function getUserDevices(userId: string): Promise<MobileDeviceRecord[]> {
  const devices = await database
    .select({
      id: deviceToken.id,
      userId: deviceToken.userId,
      deviceName: deviceToken.deviceName,
      platform: deviceToken.devicePlatform,
      isActive: deviceToken.isActive,
      lastUsedAt: deviceToken.lastUsedAt,
      createdAt: deviceToken.createdAt,
    })
    .from(deviceToken)
    .where(eq(deviceToken.userId, userId))
    .orderBy(desc(deviceToken.lastUsedAt));

  return devices.map((d) => ({
    ...d,
    deviceName: d.deviceName || "Unknown Device",
    platform: d.platform || "web",
  }));
}

/**
 * Deactivate a device
 */
export async function deactivateDevice(userId: string, deviceId: string): Promise<boolean> {
  const result = await database
    .update(deviceToken)
    .set({
      isActive: false,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(deviceToken.userId, userId),
        eq(deviceToken.id, deviceId)
      )
    );

  return true;
}

/**
 * Update device push token
 */
export async function updateDevicePushToken(
  deviceId: string,
  pushToken: string
): Promise<boolean> {
  await database
    .update(deviceToken)
    .set({
      token: pushToken,
      tokenType: "fcm",
      updatedAt: new Date(),
    })
    .where(eq(deviceToken.id, deviceId));

  return true;
}

/**
 * Revoke all sessions for a user except current
 */
export async function revokeOtherSessions(userId: string, currentToken: string): Promise<number> {
  // Get all sessions except current
  const allSessions = await database
    .select({ id: session.id, token: session.token })
    .from(session)
    .where(eq(session.userId, userId));

  const sessionsToDelete = allSessions.filter((s) => s.token !== currentToken);

  if (sessionsToDelete.length === 0) {
    return 0;
  }

  // Delete other sessions
  for (const s of sessionsToDelete) {
    await database.delete(session).where(eq(session.id, s.id));
  }

  return sessionsToDelete.length;
}

/**
 * Revoke a specific session
 */
export async function revokeSession(sessionId: string): Promise<boolean> {
  await database.delete(session).where(eq(session.id, sessionId));
  return true;
}

/**
 * Get user by ID (minimal data for mobile)
 */
export async function getMobileUser(userId: string): Promise<{
  id: string;
  name: string;
  email: string;
  image: string | null;
  isAdmin: boolean;
  plan: string;
} | null> {
  const users = await database
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      isAdmin: user.isAdmin,
      plan: user.plan,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  return users[0] || null;
}
