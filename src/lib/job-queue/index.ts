/**
 * Job Queue Module
 * Redis-backed job queue for background processing of briefings, notifications,
 * sync operations, and long-running tasks.
 *
 * Features:
 * - Reliable job persistence in PostgreSQL
 * - Fast job polling with Redis
 * - Automatic retries with configurable delays
 * - Dead letter queue for failed jobs
 * - Job progress tracking
 * - Priority-based processing
 * - Scheduled job execution
 * - Concurrent worker support
 *
 * Usage:
 * ```typescript
 * import { getJobQueueClient, enqueueJob, startWorker } from "~/lib/job-queue";
 *
 * // Enqueue a job
 * await enqueueJob({
 *   type: "briefing.generate",
 *   name: "Generate daily briefing",
 *   payload: { userId: "user-123" },
 *   priority: "high",
 * });
 *
 * // Start a worker (in a separate process)
 * const worker = await startWorker({
 *   concurrency: 2,
 *   jobTypes: ["briefing.generate", "notification.push"],
 * });
 * ```
 */

// =============================================================================
// Core Exports
// =============================================================================

// Client
export {
  JobQueueClient,
  getJobQueueClient,
  resetJobQueueClient,
  initializeJobQueue,
} from "./client";

// Worker
export { JobQueueWorker, createWorker, startWorker } from "./worker";

// Types
export type {
  JobDefinition,
  Job,
  JobContext,
  JobHandler,
  JobHandlerRegistration,
  JobResult,
  EnqueueResult,
  BatchEnqueueResult,
  QueueStats,
  WorkerStats,
  QueueConfig,
  WorkerConfig,
  QueueEvent,
  QueueEventType,
  QueueEventListener,
  BriefingGeneratePayload,
  BriefingDeliverPayload,
  NotificationPushPayload,
  NotificationEmailPayload,
  SyncContactsPayload,
  SyncCrmPayload,
  CleanupExpiredPayload,
  ReportGeneratePayload,
  CustomJobPayload,
  DataExportPayload,
} from "./types";

// Type guards
export {
  isBriefingGeneratePayload,
  isNotificationPushPayload,
  isSyncContactsPayload,
  isDataExportPayload,
} from "./types";

// Handlers
export {
  jobHandlers,
  allHandlerRegistrations,
  registerAllHandlers,
  briefingGenerateHandler,
  briefingDeliverHandler,
  notificationPushHandler,
  notificationEmailHandler,
  syncContactsHandler,
  syncCrmHandler,
  cleanupExpiredHandler,
  reportGenerateHandler,
  dataExportHandler,
} from "./handlers";

// =============================================================================
// Convenience Functions
// =============================================================================

import { getJobQueueClient } from "./client";
import type { JobDefinition, EnqueueResult, QueueStats } from "./types";

/**
 * Enqueue a job (convenience function)
 */
export async function enqueueJob<T = unknown>(
  definition: JobDefinition<T>
): Promise<EnqueueResult> {
  const client = getJobQueueClient();
  return client.enqueue(definition);
}

/**
 * Get queue statistics (convenience function)
 */
export async function getQueueStats(): Promise<QueueStats> {
  const client = getJobQueueClient();
  return client.getStats();
}

/**
 * Cancel a job by ID (convenience function)
 */
export async function cancelJob(jobId: string): Promise<boolean> {
  const client = getJobQueueClient();
  return client.cancelJob(jobId);
}

/**
 * Retry a failed job (convenience function)
 */
export async function retryJob(jobId: string): Promise<boolean> {
  const client = getJobQueueClient();
  return client.retryJob(jobId);
}

/**
 * Get a job by ID (convenience function)
 */
export async function getJob(jobId: string) {
  const client = getJobQueueClient();
  return client.getJob(jobId);
}

// =============================================================================
// Job Factory Functions
// =============================================================================

import type {
  BriefingGeneratePayload,
  BriefingDeliverPayload,
  NotificationPushPayload,
  SyncContactsPayload,
  CleanupExpiredPayload,
} from "./types";

/**
 * Create a briefing generation job
 */
export function createBriefingGenerateJob(
  userId: string,
  options?: { force?: boolean; priority?: "critical" | "high" | "normal" | "low" }
): JobDefinition<BriefingGeneratePayload> {
  return {
    type: "briefing.generate",
    name: `Generate briefing for user ${userId}`,
    payload: { userId, force: options?.force },
    priority: options?.priority || "normal",
    userId,
    referenceType: "user",
    referenceId: userId,
  };
}

/**
 * Create a briefing delivery job
 */
export function createBriefingDeliverJob(
  userId: string,
  briefingId: string,
  deliveryMethod: "push" | "email" | "both" | "in_app" = "push"
): JobDefinition<BriefingDeliverPayload> {
  return {
    type: "briefing.deliver",
    name: `Deliver briefing ${briefingId} to user ${userId}`,
    payload: { userId, briefingId, deliveryMethod },
    priority: "high",
    userId,
    referenceType: "briefing",
    referenceId: briefingId,
  };
}

/**
 * Create a push notification job
 */
export function createPushNotificationJob(
  userId: string,
  title: string,
  body: string,
  options?: {
    icon?: string;
    clickAction?: string;
    data?: Record<string, unknown>;
    priority?: "critical" | "high" | "normal" | "low";
  }
): JobDefinition<NotificationPushPayload> {
  return {
    type: "notification.push",
    name: `Push notification to user ${userId}`,
    payload: {
      userId,
      title,
      body,
      icon: options?.icon,
      clickAction: options?.clickAction,
      data: options?.data,
    },
    priority: options?.priority || "high",
    userId,
  };
}

/**
 * Create a contact sync job
 */
export function createContactSyncJob(
  userId: string,
  syncType: "full" | "incremental" = "incremental",
  lastSyncAt?: Date
): JobDefinition<SyncContactsPayload> {
  return {
    type: "sync.contacts",
    name: `${syncType === "full" ? "Full" : "Incremental"} contact sync for user ${userId}`,
    payload: { userId, syncType, lastSyncAt },
    priority: "normal",
    userId,
    processingTimeout: 300000, // 5 minutes
  };
}

/**
 * Create a cleanup job
 */
export function createCleanupJob(
  entityType: string,
  olderThan: Date,
  batchSize?: number
): JobDefinition<CleanupExpiredPayload> {
  return {
    type: "cleanup.expired",
    name: `Cleanup expired ${entityType}`,
    payload: { entityType, olderThan, batchSize },
    priority: "low",
  };
}

// =============================================================================
// Initialization Helper
// =============================================================================

import { registerAllHandlers } from "./handlers";

/**
 * Initialize the job queue with all handlers
 * Call this during application startup
 */
export async function initializeJobQueueWithHandlers(): Promise<void> {
  const client = getJobQueueClient();
  await client.connect();
  registerAllHandlers((type, handler) => client.registerHandler(type, handler));
  console.log("Job queue initialized with all handlers");
}
