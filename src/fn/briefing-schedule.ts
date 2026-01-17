/**
 * Briefing Schedule Server Functions
 *
 * Server functions for managing user briefing schedule preferences.
 * Handles timezone configuration, delivery time settings, and delivery method preferences.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authenticatedMiddleware } from "./middleware";
import {
  getOrCreateBriefingSchedulePreference,
  updateBriefingSchedulePreference,
  findBriefingSchedulePreference,
  enableScheduledBriefings,
  disableScheduledBriefings,
  findUserScheduledBriefingLogs,
  getUserDeliveryStats,
  isValidTimezone,
  getCommonTimezones,
} from "~/data-access/briefing-scheduler";
import type { BriefingDeliveryMethod } from "~/db/schema";

// =============================================================================
// Schema definitions for validation
// =============================================================================

const deliveryMethodSchema = z.enum(["push", "email", "both", "in_app"]);

const deliveryTimeSchema = z
  .string()
  .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format. Use HH:mm (24-hour)");

const daysOfWeekSchema = z
  .array(z.number().min(0).max(6))
  .min(1, "At least one day must be selected")
  .max(7);

const timezoneSchema = z.string().refine(
  (tz) => isValidTimezone(tz),
  { message: "Invalid timezone" }
);

const updatePreferencesSchema = z.object({
  isEnabled: z.boolean().optional(),
  deliveryTime: deliveryTimeSchema.optional(),
  timezone: timezoneSchema.optional(),
  deliveryMethod: deliveryMethodSchema.optional(),
  daysOfWeek: daysOfWeekSchema.optional(),
  skipIfNoUpdates: z.boolean().optional(),
});

// =============================================================================
// Server Functions
// =============================================================================

/**
 * Get the user's briefing schedule preference
 * Creates default preferences if none exist
 */
export const getBriefingSchedulePreferenceFn = createServerFn({
  method: "GET",
})
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    const preference = await getOrCreateBriefingSchedulePreference(context.userId);

    // Parse daysOfWeek from JSON string
    let daysOfWeek: number[];
    try {
      daysOfWeek = JSON.parse(preference.daysOfWeek);
    } catch {
      daysOfWeek = [1, 2, 3, 4, 5];
    }

    return {
      ...preference,
      daysOfWeek,
    };
  });

/**
 * Update the user's briefing schedule preference
 */
export const updateBriefingSchedulePreferenceFn = createServerFn({
  method: "POST",
})
  .inputValidator(updatePreferencesSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // Ensure preference exists first
    await getOrCreateBriefingSchedulePreference(context.userId);

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (data.isEnabled !== undefined) {
      updateData.isEnabled = data.isEnabled;
    }
    if (data.deliveryTime !== undefined) {
      updateData.deliveryTime = data.deliveryTime;
    }
    if (data.timezone !== undefined) {
      updateData.timezone = data.timezone;
    }
    if (data.deliveryMethod !== undefined) {
      updateData.deliveryMethod = data.deliveryMethod;
    }
    if (data.daysOfWeek !== undefined) {
      updateData.daysOfWeek = JSON.stringify(data.daysOfWeek);
    }
    if (data.skipIfNoUpdates !== undefined) {
      updateData.skipIfNoUpdates = data.skipIfNoUpdates;
    }

    const updated = await updateBriefingSchedulePreference(context.userId, updateData);

    if (!updated) {
      throw new Error("Failed to update preferences");
    }

    // Parse daysOfWeek from JSON string
    let daysOfWeek: number[];
    try {
      daysOfWeek = JSON.parse(updated.daysOfWeek);
    } catch {
      daysOfWeek = [1, 2, 3, 4, 5];
    }

    return {
      ...updated,
      daysOfWeek,
    };
  });

/**
 * Enable scheduled briefings for the user
 */
export const enableScheduledBriefingsFn = createServerFn({
  method: "POST",
})
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    // Ensure preference exists first
    await getOrCreateBriefingSchedulePreference(context.userId);

    const updated = await enableScheduledBriefings(context.userId);

    if (!updated) {
      throw new Error("Failed to enable scheduled briefings");
    }

    return { success: true, isEnabled: true };
  });

/**
 * Disable scheduled briefings for the user
 */
export const disableScheduledBriefingsFn = createServerFn({
  method: "POST",
})
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    // Ensure preference exists first
    await getOrCreateBriefingSchedulePreference(context.userId);

    const updated = await disableScheduledBriefings(context.userId);

    if (!updated) {
      throw new Error("Failed to disable scheduled briefings");
    }

    return { success: true, isEnabled: false };
  });

/**
 * Get the user's delivery history
 */
export const getBriefingDeliveryHistoryFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z
      .object({
        limit: z.number().min(1).max(50).optional().default(20),
        offset: z.number().min(0).optional().default(0),
      })
      .optional()
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const limit = data?.limit ?? 20;
    const offset = data?.offset ?? 0;

    const logs = await findUserScheduledBriefingLogs(context.userId, limit, offset);

    return {
      logs,
      hasMore: logs.length === limit,
    };
  });

/**
 * Get delivery statistics for the user
 */
export const getBriefingDeliveryStatsFn = createServerFn({
  method: "GET",
})
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    const stats = await getUserDeliveryStats(context.userId);
    return stats;
  });

/**
 * Get list of available timezones
 */
export const getAvailableTimezonesFn = createServerFn({
  method: "GET",
}).handler(async () => {
  return getCommonTimezones();
});

/**
 * Validate a timezone string
 */
export const validateTimezoneFn = createServerFn({
  method: "POST",
})
  .inputValidator(z.object({ timezone: z.string() }))
  .handler(async ({ data }) => {
    const valid = isValidTimezone(data.timezone);
    return { valid, timezone: data.timezone };
  });
