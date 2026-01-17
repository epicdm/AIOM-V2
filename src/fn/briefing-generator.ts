/**
 * Briefing Generator Server Functions
 *
 * TanStack Start server functions for generating and retrieving
 * personalized daily briefings.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authenticatedMiddleware } from "./middleware";
import {
  getOrGenerateBriefing,
  generateNewBriefing,
  getActiveBriefingData,
  getBriefingStats,
  type BriefingData,
} from "~/data-access/briefing-generator";
import {
  markBriefingAsRead,
  findUserActiveBriefing,
  findBriefingById,
} from "~/data-access/briefings";

// =============================================================================
// Server Functions
// =============================================================================

/**
 * Get or generate today's briefing for the authenticated user
 * Returns existing briefing if already generated today, otherwise creates new one
 */
export const getOrGenerateBriefingFn = createServerFn({
  method: "GET",
})
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    const briefing = await getOrGenerateBriefing(context.userId);

    if (!briefing) {
      throw new Error("Failed to generate briefing");
    }

    return briefing;
  });

/**
 * Get active briefing for the user (not expired)
 * Does not generate a new one if none exists
 */
export const getActiveBriefingFn = createServerFn({
  method: "GET",
})
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    const briefing = await getActiveBriefingData(context.userId);
    return briefing;
  });

/**
 * Force regenerate a new briefing with fresh data
 */
export const regenerateBriefingFn = createServerFn({
  method: "POST",
})
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    const briefing = await generateNewBriefing(context.userId);

    if (!briefing) {
      throw new Error("Failed to regenerate briefing");
    }

    return briefing;
  });

/**
 * Mark the current active briefing as read
 */
export const markBriefingReadFn = createServerFn({
  method: "POST",
})
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    // Get active briefing
    const activeBriefing = await findUserActiveBriefing(context.userId);

    if (!activeBriefing) {
      throw new Error("No active briefing found");
    }

    // Mark as read
    const updated = await markBriefingAsRead(activeBriefing.id);

    if (!updated) {
      throw new Error("Failed to mark briefing as read");
    }

    return { success: true, briefingId: updated.id };
  });

/**
 * Get briefing statistics for the user
 */
export const getBriefingStatsFn = createServerFn({
  method: "GET",
})
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    const stats = await getBriefingStats(context.userId);
    return stats;
  });

/**
 * Get a specific briefing by ID (with ownership check)
 */
export const getBriefingByIdFn = createServerFn({
  method: "GET",
})
  .inputValidator(z.object({ id: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const briefing = await findBriefingById(data.id);

    if (!briefing) {
      throw new Error("Briefing not found");
    }

    // Verify ownership
    if (briefing.userId !== context.userId) {
      throw new Error("Unauthorized: You can only view your own briefings");
    }

    return {
      ...briefing,
      content: JSON.parse(briefing.content) as BriefingData,
    };
  });
