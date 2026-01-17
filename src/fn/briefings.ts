import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authenticatedMiddleware } from "./middleware";
import {
  createBriefing,
  findBriefingById,
  findUserActiveBriefing,
  findUserTodayBriefing,
  findUserBriefings,
  countUserBriefings,
  updateBriefing,
  markBriefingAsRead,
  updateBriefingStatus,
  regenerateBriefing,
  deleteBriefing,
  findUnreadBriefings,
  countUnreadBriefings,
  findBriefingVersions,
  findBriefingWithVersions,
} from "~/data-access/briefings";
import type { BriefingStatus } from "~/db/schema";

// =============================================================================
// Schema definitions for validation
// =============================================================================

const briefingContentSchema = z.record(z.string(), z.unknown());

const briefingStatusSchema = z.enum(["active", "expired", "archived"]);

// =============================================================================
// Server Functions
// =============================================================================

/**
 * Get the user's currently active briefing (not expired)
 */
export const getActiveBriefingFn = createServerFn({
  method: "GET",
})
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    const briefing = await findUserActiveBriefing(context.userId);

    if (!briefing) {
      return null;
    }

    return {
      ...briefing,
      content: JSON.parse(briefing.content),
    };
  });

/**
 * Get today's briefing for the user
 */
export const getTodayBriefingFn = createServerFn({
  method: "GET",
})
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    const briefing = await findUserTodayBriefing(context.userId);

    if (!briefing) {
      return null;
    }

    return {
      ...briefing,
      content: JSON.parse(briefing.content),
    };
  });

/**
 * Get a specific briefing by ID
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
      content: JSON.parse(briefing.content),
    };
  });

/**
 * Get briefing with all its versions
 */
export const getBriefingWithVersionsFn = createServerFn({
  method: "GET",
})
  .inputValidator(z.object({ id: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const briefingWithVersions = await findBriefingWithVersions(data.id);

    if (!briefingWithVersions) {
      throw new Error("Briefing not found");
    }

    // Verify ownership
    if (briefingWithVersions.userId !== context.userId) {
      throw new Error("Unauthorized: You can only view your own briefings");
    }

    return {
      ...briefingWithVersions,
      content: JSON.parse(briefingWithVersions.content),
      versions: briefingWithVersions.versions.map((v) => ({
        ...v,
        content: JSON.parse(v.content),
      })),
    };
  });

/**
 * Get user's briefing history with pagination
 */
export const getUserBriefingsFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z
      .object({
        limit: z.number().min(1).max(50).optional().default(10),
        offset: z.number().min(0).optional().default(0),
      })
      .optional()
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const limit = data?.limit ?? 10;
    const offset = data?.offset ?? 0;

    const [briefings, total] = await Promise.all([
      findUserBriefings(context.userId, limit, offset),
      countUserBriefings(context.userId),
    ]);

    return {
      briefings: briefings.map((b) => ({
        ...b,
        content: JSON.parse(b.content),
      })),
      total,
      hasMore: offset + briefings.length < total,
    };
  });

/**
 * Get unread briefings for the user
 */
export const getUnreadBriefingsFn = createServerFn({
  method: "GET",
})
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    const briefings = await findUnreadBriefings(context.userId);

    return briefings.map((b) => ({
      ...b,
      content: JSON.parse(b.content),
    }));
  });

/**
 * Get count of unread briefings
 */
export const getUnreadBriefingsCountFn = createServerFn({
  method: "GET",
})
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    const count = await countUnreadBriefings(context.userId);
    return { count };
  });

/**
 * Create a new daily briefing
 */
export const createBriefingFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      content: briefingContentSchema,
      expiresAt: z.string().transform((val) => new Date(val)),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const briefingData = {
      id: crypto.randomUUID(),
      userId: context.userId,
      content: JSON.stringify(data.content),
      expiresAt: data.expiresAt,
      generatedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const newBriefing = await createBriefing(briefingData);

    return {
      ...newBriefing,
      content: JSON.parse(newBriefing.content),
    };
  });

/**
 * Mark a briefing as read
 */
export const markBriefingAsReadFn = createServerFn({
  method: "POST",
})
  .inputValidator(z.object({ id: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // First verify ownership
    const briefing = await findBriefingById(data.id);

    if (!briefing) {
      throw new Error("Briefing not found");
    }

    if (briefing.userId !== context.userId) {
      throw new Error("Unauthorized: You can only mark your own briefings as read");
    }

    const updated = await markBriefingAsRead(data.id);

    if (!updated) {
      throw new Error("Failed to mark briefing as read");
    }

    return {
      ...updated,
      content: JSON.parse(updated.content),
    };
  });

/**
 * Update briefing status
 */
export const updateBriefingStatusFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      id: z.string(),
      status: briefingStatusSchema,
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // Verify ownership
    const briefing = await findBriefingById(data.id);

    if (!briefing) {
      throw new Error("Briefing not found");
    }

    if (briefing.userId !== context.userId) {
      throw new Error("Unauthorized: You can only update your own briefings");
    }

    const updated = await updateBriefingStatus(data.id, data.status as BriefingStatus);

    if (!updated) {
      throw new Error("Failed to update briefing status");
    }

    return {
      ...updated,
      content: JSON.parse(updated.content),
    };
  });

/**
 * Regenerate a briefing with new content (creates a version)
 */
export const regenerateBriefingFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      id: z.string(),
      content: briefingContentSchema,
      reason: z.string().optional().default("user_requested"),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // Verify ownership
    const briefing = await findBriefingById(data.id);

    if (!briefing) {
      throw new Error("Briefing not found");
    }

    if (briefing.userId !== context.userId) {
      throw new Error("Unauthorized: You can only regenerate your own briefings");
    }

    const updated = await regenerateBriefing(
      data.id,
      JSON.stringify(data.content),
      data.reason
    );

    if (!updated) {
      throw new Error("Failed to regenerate briefing");
    }

    return {
      ...updated,
      content: JSON.parse(updated.content),
    };
  });

/**
 * Get versions of a specific briefing
 */
export const getBriefingVersionsFn = createServerFn({
  method: "GET",
})
  .inputValidator(z.object({ briefingId: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // Verify ownership
    const briefing = await findBriefingById(data.briefingId);

    if (!briefing) {
      throw new Error("Briefing not found");
    }

    if (briefing.userId !== context.userId) {
      throw new Error("Unauthorized: You can only view versions of your own briefings");
    }

    const versions = await findBriefingVersions(data.briefingId);

    return versions.map((v) => ({
      ...v,
      content: JSON.parse(v.content),
    }));
  });

/**
 * Delete a briefing
 */
export const deleteBriefingFn = createServerFn({
  method: "POST",
})
  .inputValidator(z.object({ id: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // Verify ownership
    const briefing = await findBriefingById(data.id);

    if (!briefing) {
      throw new Error("Briefing not found");
    }

    if (briefing.userId !== context.userId) {
      throw new Error("Unauthorized: You can only delete your own briefings");
    }

    const deleted = await deleteBriefing(data.id);

    if (!deleted) {
      throw new Error("Failed to delete briefing");
    }

    return { success: true };
  });
