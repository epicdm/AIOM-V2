/**
 * Briefing Job Handlers
 * Handlers for briefing-related background jobs
 */

import type { JobContext, JobHandler, BriefingGeneratePayload, BriefingDeliverPayload } from "../types";

/**
 * Briefing generation job handler
 * Generates a daily briefing for a user
 */
export const briefingGenerateHandler: JobHandler<BriefingGeneratePayload, { briefingId: string }> = async (
  context
) => {
  const { job, updateProgress } = context;
  const { userId, force } = job.payload;

  console.log(`[BriefingGenerateHandler] Starting briefing generation for user ${userId}`);
  await updateProgress(10, "Starting briefing generation...");

  try {
    // Dynamically import to avoid circular dependencies
    const { getOrGenerateBriefing } = await import("~/data-access/briefing-generator");

    await updateProgress(30, "Fetching user data...");

    // Generate briefing (force regeneration is handled internally based on existing briefing)
    const briefingData = await getOrGenerateBriefing(userId);

    if (!briefingData) {
      throw new Error("Failed to generate briefing - no data returned");
    }

    await updateProgress(90, "Briefing generated successfully");

    console.log(`[BriefingGenerateHandler] Briefing generated for user ${userId}`);

    await updateProgress(100, "Complete");

    return { briefingId: briefingData.userId };
  } catch (error) {
    console.error(`[BriefingGenerateHandler] Error generating briefing for user ${userId}:`, error);
    throw error;
  }
};

/**
 * Briefing delivery job handler
 * Delivers a briefing to a user via their preferred method
 */
export const briefingDeliverHandler: JobHandler<BriefingDeliverPayload, { delivered: boolean; method: string }> = async (
  context
) => {
  const { job, updateProgress } = context;
  const { userId, briefingId, deliveryMethod } = job.payload;

  console.log(`[BriefingDeliverHandler] Delivering briefing ${briefingId} to user ${userId} via ${deliveryMethod}`);
  await updateProgress(10, `Starting delivery via ${deliveryMethod}...`);

  try {
    // Dynamically import to avoid circular dependencies
    const { getBriefingSchedulerService } = await import("~/lib/briefing-scheduler");
    const { getUsersDueForBriefing } = await import("~/data-access/briefing-scheduler");

    await updateProgress(30, "Preparing delivery...");

    // Get user config for delivery
    const userConfigs = await getUsersDueForBriefing();
    const userConfig = userConfigs.find((u) => u.userId === userId);

    if (!userConfig) {
      console.log(`[BriefingDeliverHandler] User ${userId} not found or not due for briefing`);
      return { delivered: false, method: deliveryMethod };
    }

    await updateProgress(50, "Sending notification...");

    // Deliver the briefing
    const service = getBriefingSchedulerService();
    const result = await service.deliverBriefingToUser(userConfig);

    await updateProgress(90, result.success ? "Delivered successfully" : "Delivery completed");

    console.log(`[BriefingDeliverHandler] Delivery result for user ${userId}:`, result);

    await updateProgress(100, "Complete");

    return {
      delivered: result.success,
      method: deliveryMethod,
    };
  } catch (error) {
    console.error(`[BriefingDeliverHandler] Error delivering briefing to user ${userId}:`, error);
    throw error;
  }
};
