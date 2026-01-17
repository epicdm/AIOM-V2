/**
 * Cleanup Job Handlers
 * Handlers for cleanup and maintenance background jobs
 */

import { lt, eq, and, inArray } from "drizzle-orm";
import { database } from "~/db";
import { jobQueue, jobExecutionLog, deadLetterQueue, dailyBriefing } from "~/db/schema";
import type { JobContext, JobHandler, CleanupExpiredPayload } from "../types";

/**
 * Cleanup expired entities job handler
 * Removes expired data based on entity type
 */
export const cleanupExpiredHandler: JobHandler<CleanupExpiredPayload, { deleted: number; entityType: string }> = async (
  context
) => {
  const { job, updateProgress } = context;
  const { entityType, olderThan, batchSize = 1000 } = job.payload;
  const olderThanDate = new Date(olderThan);

  console.log(`[CleanupExpiredHandler] Starting cleanup of expired ${entityType} older than ${olderThanDate.toISOString()}`);
  await updateProgress(10, `Starting cleanup of ${entityType}...`);

  let deleted = 0;

  try {
    switch (entityType) {
      case "jobs": {
        await updateProgress(30, "Cleaning up completed jobs...");

        // Delete completed jobs older than the specified date
        const completedResult = await database
          .delete(jobQueue)
          .where(
            and(
              inArray(jobQueue.status, ["completed", "cancelled"]),
              lt(jobQueue.completedAt, olderThanDate)
            )
          )
          .returning();

        deleted += completedResult.length;
        await updateProgress(60, `Deleted ${deleted} completed jobs...`);

        // Also delete job execution logs for non-existent jobs
        const orphanedLogs = await database
          .delete(jobExecutionLog)
          .where(
            lt(jobExecutionLog.createdAt, olderThanDate)
          )
          .returning();

        console.log(`[CleanupExpiredHandler] Deleted ${orphanedLogs.length} old execution logs`);
        break;
      }

      case "dead_letter": {
        await updateProgress(30, "Cleaning up resolved dead letter entries...");

        // Delete resolved dead letter entries older than the specified date
        const dlqResult = await database
          .delete(deadLetterQueue)
          .where(
            and(
              lt(deadLetterQueue.resolvedAt, olderThanDate),
              // Only delete if resolved
              eq(deadLetterQueue.resolution, "discard")
            )
          )
          .returning();

        deleted = dlqResult.length;
        break;
      }

      case "briefings": {
        await updateProgress(30, "Cleaning up expired briefings...");

        // Delete expired briefings
        const briefingResult = await database
          .delete(dailyBriefing)
          .where(
            and(
              eq(dailyBriefing.status, "expired"),
              lt(dailyBriefing.expiresAt, olderThanDate)
            )
          )
          .returning();

        deleted = briefingResult.length;
        break;
      }

      default:
        throw new Error(`Unknown entity type for cleanup: ${entityType}`);
    }

    await updateProgress(90, `Cleaned up ${deleted} ${entityType}`);

    console.log(`[CleanupExpiredHandler] Cleanup completed: ${deleted} ${entityType} deleted`);

    await updateProgress(100, "Complete");

    return { deleted, entityType };
  } catch (error) {
    console.error(`[CleanupExpiredHandler] Error cleaning up ${entityType}:`, error);
    throw error;
  }
};

/**
 * Report generation job handler (placeholder)
 */
export const reportGenerateHandler: JobHandler<{
  userId: string;
  reportType: string;
  parameters: Record<string, unknown>;
  format: "pdf" | "csv" | "xlsx";
}, { reportUrl: string; format: string }> = async (context) => {
  const { job, updateProgress } = context;
  const { userId, reportType, parameters, format } = job.payload;

  console.log(`[ReportGenerateHandler] Generating ${reportType} report for user ${userId} in ${format} format`);
  await updateProgress(10, `Starting ${reportType} report generation...`);

  try {
    await updateProgress(30, "Gathering data...");

    // Report generation logic would go here
    // This is a placeholder for future implementation

    await updateProgress(60, "Generating report...");

    // Simulate report generation
    await new Promise((resolve) => setTimeout(resolve, 500));

    await updateProgress(90, "Uploading report...");

    const reportUrl = `/reports/${reportType}-${Date.now()}.${format}`;

    console.log(`[ReportGenerateHandler] Report generated: ${reportUrl}`);

    await updateProgress(100, "Complete");

    return { reportUrl, format };
  } catch (error) {
    console.error(`[ReportGenerateHandler] Error generating report:`, error);
    throw error;
  }
};
