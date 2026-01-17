/**
 * Mobile Auth Server Functions
 *
 * Server functions for mobile authentication operations.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authenticatedMiddleware } from "./middleware";
import {
  getUserSessions,
  getSessionByToken,
  registerDevice,
  getUserDevices,
  deactivateDevice,
  revokeOtherSessions,
  revokeSession,
  getMobileUser,
} from "~/data-access/mobile-auth";

/**
 * Get current user's sessions
 */
export const getMobileSessionsFn = createServerFn({
  method: "GET",
})
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    const sessions = await getUserSessions(context.userId);
    return sessions.map((s) => ({
      id: s.id,
      expiresAt: s.expiresAt.toISOString(),
      userAgent: s.userAgent,
      createdAt: s.createdAt.toISOString(),
      isCurrent: false, // Will be determined client-side
    }));
  });

/**
 * Register a mobile device
 */
export const registerMobileDeviceFn = createServerFn({
  method: "POST",
})
  .middleware([authenticatedMiddleware])
  .inputValidator(
    z.object({
      deviceId: z.string(),
      deviceName: z.string(),
      platform: z.enum(["ios", "android", "web"]),
      pushToken: z.string().optional(),
    })
  )
  .handler(async ({ data, context }) => {
    const device = await registerDevice({
      userId: context.userId,
      deviceId: data.deviceId,
      deviceName: data.deviceName,
      platform: data.platform,
      pushToken: data.pushToken,
    });

    return {
      id: device.id,
      deviceName: device.deviceName,
      platform: device.platform,
      isActive: device.isActive,
      createdAt: device.createdAt.toISOString(),
    };
  });

/**
 * Get user's registered devices
 */
export const getMobileDevicesFn = createServerFn({
  method: "GET",
})
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    const devices = await getUserDevices(context.userId);
    return devices.map((d) => ({
      id: d.id,
      deviceName: d.deviceName,
      platform: d.platform,
      isActive: d.isActive,
      lastUsedAt: d.lastUsedAt.toISOString(),
      createdAt: d.createdAt.toISOString(),
    }));
  });

/**
 * Deactivate a device
 */
export const deactivateMobileDeviceFn = createServerFn({
  method: "POST",
})
  .middleware([authenticatedMiddleware])
  .inputValidator(
    z.object({
      deviceId: z.string(),
    })
  )
  .handler(async ({ data, context }) => {
    await deactivateDevice(context.userId, data.deviceId);
    return { success: true };
  });

/**
 * Revoke all other sessions
 */
export const revokeOtherSessionsFn = createServerFn({
  method: "POST",
})
  .middleware([authenticatedMiddleware])
  .inputValidator(
    z.object({
      currentToken: z.string(),
    })
  )
  .handler(async ({ data, context }) => {
    const count = await revokeOtherSessions(context.userId, data.currentToken);
    return { revokedCount: count };
  });

/**
 * Revoke a specific session
 */
export const revokeSessionFn = createServerFn({
  method: "POST",
})
  .middleware([authenticatedMiddleware])
  .inputValidator(
    z.object({
      sessionId: z.string(),
    })
  )
  .handler(async ({ data }) => {
    await revokeSession(data.sessionId);
    return { success: true };
  });

/**
 * Get minimal user data for mobile
 */
export const getMobileUserFn = createServerFn({
  method: "GET",
})
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    const user = await getMobileUser(context.userId);
    if (!user) {
      throw new Error("User not found");
    }
    return user;
  });

/**
 * Validate session token
 */
export const validateSessionFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      token: z.string(),
    })
  )
  .handler(async ({ data }) => {
    const session = await getSessionByToken(data.token);

    if (!session) {
      return {
        isValid: false,
        error: "Session not found",
      };
    }

    const isExpired = new Date(session.expiresAt) <= new Date();

    if (isExpired) {
      return {
        isValid: false,
        error: "Session expired",
      };
    }

    return {
      isValid: true,
      userId: session.userId,
      expiresAt: session.expiresAt.toISOString(),
    };
  });
