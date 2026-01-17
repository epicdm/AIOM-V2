import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authenticatedMiddleware } from "./middleware";
import { communicationAnalyticsService } from "~/lib/communication-analytics-service";

// =============================================================================
// Communication Analytics Server Functions
// =============================================================================

/**
 * Get communication analytics for the current user
 */
export const getUserCommunicationAnalyticsFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      days: z.number().min(1).max(90).optional().default(7),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const analytics = await communicationAnalyticsService.getUserAnalytics(
      context.userId,
      data.days
    );

    return analytics;
  });

/**
 * Get team-wide communication analytics
 */
export const getTeamCommunicationAnalyticsFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      days: z.number().min(1).max(90).optional().default(7),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    const analytics = await communicationAnalyticsService.getTeamAnalytics(data.days);
    return analytics;
  });

/**
 * Get communication trends over time
 */
export const getCommunicationTrendsFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      days: z.number().min(1).max(90).optional().default(30),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const trends = await communicationAnalyticsService.getTrends(
      context.userId,
      data.days
    );

    return { trends };
  });

/**
 * Get active bottlenecks
 */
export const getActiveBottlenecksFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      includeTeam: z.boolean().optional().default(false),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const userId = data.includeTeam ? undefined : context.userId;
    const bottlenecks = await communicationAnalyticsService.getActiveBottlenecks(userId);

    return {
      bottlenecks: bottlenecks.map((b) => ({
        id: b.id,
        type: b.bottleneckType,
        severity: b.severity,
        title: b.title,
        description: b.description,
        userId: b.userId,
        conversationId: b.conversationId,
        metricName: b.metricName,
        currentValue: b.currentValue,
        thresholdValue: b.thresholdValue,
        suggestions: b.suggestions,
        status: b.status,
        detectedAt: b.detectedAt.toISOString(),
      })),
    };
  });

/**
 * Detect and save bottlenecks for the current user
 */
export const detectBottlenecksFn = createServerFn({
  method: "POST",
})
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    const bottlenecks = await communicationAnalyticsService.detectBottlenecks(
      context.userId
    );

    if (bottlenecks.length > 0) {
      await communicationAnalyticsService.saveBottlenecks(bottlenecks);
    }

    return {
      detected: bottlenecks.length,
      bottlenecks: bottlenecks.map((b) => ({
        type: b.type,
        severity: b.severity,
        title: b.title,
        description: b.description,
      })),
    };
  });

/**
 * Acknowledge a bottleneck
 */
export const acknowledgeBottleneckFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      bottleneckId: z.string().min(1),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const result = await communicationAnalyticsService.acknowledgeBottleneck(
      data.bottleneckId,
      context.userId
    );

    if (!result) {
      throw new Error("Bottleneck not found");
    }

    return { success: true };
  });

/**
 * Resolve a bottleneck
 */
export const resolveBottleneckFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      bottleneckId: z.string().min(1),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const result = await communicationAnalyticsService.resolveBottleneck(
      data.bottleneckId,
      context.userId
    );

    if (!result) {
      throw new Error("Bottleneck not found");
    }

    return { success: true };
  });

/**
 * Dismiss a bottleneck
 */
export const dismissBottleneckFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      bottleneckId: z.string().min(1),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const result = await communicationAnalyticsService.dismissBottleneck(
      data.bottleneckId,
      context.userId
    );

    if (!result) {
      throw new Error("Bottleneck not found");
    }

    return { success: true };
  });
