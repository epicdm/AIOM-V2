/**
 * Job Queue Client
 * Redis-backed job queue for background processing
 */

import Redis from "ioredis";
import { nanoid } from "nanoid";
import { eq, and, or, lte, isNull, desc, asc, sql, inArray } from "drizzle-orm";
import { database } from "~/db";
import {
  jobQueue,
  jobExecutionLog,
  deadLetterQueue,
  type JobStatus,
  type JobType,
  type JobPriority,
} from "~/db/schema";
import { buildRedisConfig, isRedisCacheEnabled } from "~/lib/redis-cache/config";
import type {
  JobDefinition,
  Job,
  JobContext,
  JobHandler,
  JobHandlerRegistration,
  JobResult,
  EnqueueResult,
  BatchEnqueueResult,
  QueueStats,
  QueueConfig,
  QueueEvent,
  QueueEventType,
  QueueEventListener,
} from "./types";

// =============================================================================
// Default Configuration
// =============================================================================

const DEFAULT_QUEUE_CONFIG: QueueConfig = {
  keyPrefix: "aiom:jobs:",
  defaultPriority: "normal",
  defaultMaxRetries: 3,
  defaultRetryDelay: 5000,
  defaultProcessingTimeout: 30000,
  staleJobCheckInterval: 60000,
  staleJobTimeout: 120000,
  maxJobsPerPoll: 10,
};

// Priority weights for sorting
const PRIORITY_WEIGHTS: Record<JobPriority, number> = {
  critical: 4,
  high: 3,
  normal: 2,
  low: 1,
};

// =============================================================================
// Job Queue Client Class
// =============================================================================

export class JobQueueClient {
  private redis: Redis | null = null;
  private config: QueueConfig;
  private handlers: Map<JobType, JobHandler> = new Map();
  private listeners: Map<QueueEventType, Set<QueueEventListener>> = new Map();
  private connected: boolean = false;

  constructor(configOverrides?: Partial<QueueConfig>) {
    this.config = {
      ...DEFAULT_QUEUE_CONFIG,
      ...configOverrides,
    };
  }

  // ===========================================================================
  // Connection Management
  // ===========================================================================

  /**
   * Connect to Redis
   */
  async connect(): Promise<boolean> {
    if (!isRedisCacheEnabled()) {
      console.log("Redis is disabled, job queue will use database-only mode");
      return true;
    }

    if (this.connected && this.redis) {
      return true;
    }

    try {
      const redisConfig = buildRedisConfig();
      this.redis = new Redis({
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
        db: redisConfig.db,
        keyPrefix: this.config.keyPrefix,
        connectTimeout: redisConfig.connectTimeout,
        maxRetriesPerRequest: redisConfig.maxRetries,
        lazyConnect: true,
      });

      this.redis.on("connect", () => {
        this.connected = true;
        console.log("Job queue Redis connected");
      });

      this.redis.on("error", (error) => {
        console.error("Job queue Redis error:", error.message);
      });

      this.redis.on("close", () => {
        this.connected = false;
      });

      await this.redis.connect();
      this.connected = true;
      return true;
    } catch (error) {
      console.error("Failed to connect job queue to Redis:", error);
      return false;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
      this.connected = false;
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  // ===========================================================================
  // Handler Registration
  // ===========================================================================

  /**
   * Register a job handler
   */
  registerHandler<T = unknown, R = unknown>(
    type: JobType,
    handler: JobHandler<T, R>
  ): void {
    this.handlers.set(type, handler as JobHandler);
    console.log(`Registered handler for job type: ${type}`);
  }

  /**
   * Register multiple handlers
   */
  registerHandlers(registrations: JobHandlerRegistration[]): void {
    for (const reg of registrations) {
      this.registerHandler(reg.type, reg.handler);
    }
  }

  /**
   * Get handler for job type
   */
  getHandler(type: JobType): JobHandler | undefined {
    return this.handlers.get(type);
  }

  // ===========================================================================
  // Job Enqueueing
  // ===========================================================================

  /**
   * Enqueue a new job
   */
  async enqueue<T = unknown>(definition: JobDefinition<T>): Promise<EnqueueResult> {
    try {
      const jobId = nanoid();
      const now = new Date();

      const jobData = {
        id: jobId,
        type: definition.type,
        name: definition.name,
        payload: JSON.stringify(definition.payload),
        priority: definition.priority || this.config.defaultPriority,
        status: "pending" as JobStatus,
        scheduledFor: definition.scheduledFor || null,
        maxRetries: definition.maxRetries ?? this.config.defaultMaxRetries,
        retryCount: 0,
        retryDelay: definition.retryDelay ?? this.config.defaultRetryDelay,
        processingTimeout: definition.processingTimeout ?? this.config.defaultProcessingTimeout,
        userId: definition.userId || null,
        referenceId: definition.referenceId || null,
        referenceType: definition.referenceType || null,
        createdAt: now,
        updatedAt: now,
      };

      // Insert into database
      await database.insert(jobQueue).values(jobData);

      // Add to Redis queue for fast polling (if connected)
      if (this.redis && this.connected) {
        await this.addJobToRedisQueue(jobId, definition.priority || this.config.defaultPriority);
      }

      this.emitEvent({
        type: "job:enqueued",
        timestamp: now,
        jobId,
        jobType: definition.type,
        data: { priority: jobData.priority },
      });

      return { success: true, jobId };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("Failed to enqueue job:", errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Enqueue multiple jobs
   */
  async enqueueBatch<T = unknown>(
    definitions: JobDefinition<T>[]
  ): Promise<BatchEnqueueResult> {
    const result: BatchEnqueueResult = {
      total: definitions.length,
      successful: 0,
      failed: 0,
      jobIds: [],
      errors: [],
    };

    for (let i = 0; i < definitions.length; i++) {
      const enqueueResult = await this.enqueue(definitions[i]);
      if (enqueueResult.success && enqueueResult.jobId) {
        result.successful++;
        result.jobIds.push(enqueueResult.jobId);
      } else {
        result.failed++;
        result.errors.push({ index: i, error: enqueueResult.error || "Unknown error" });
      }
    }

    return result;
  }

  /**
   * Add job to Redis sorted set for fast polling
   */
  private async addJobToRedisQueue(jobId: string, priority: JobPriority): Promise<void> {
    if (!this.redis) return;

    const score = Date.now() - PRIORITY_WEIGHTS[priority] * 10000;
    await this.redis.zadd("pending", score, jobId);
  }

  // ===========================================================================
  // Job Processing
  // ===========================================================================

  /**
   * Fetch and lock the next available job
   */
  async fetchNextJob(workerId: string, jobTypes?: JobType[]): Promise<Job | null> {
    const now = new Date();

    // Build query conditions
    const conditions = [
      eq(jobQueue.status, "pending"),
      or(isNull(jobQueue.scheduledFor), lte(jobQueue.scheduledFor, now)),
    ];

    if (jobTypes && jobTypes.length > 0) {
      conditions.push(inArray(jobQueue.type, jobTypes));
    }

    // Try to fetch and lock a job atomically
    const result = await database
      .update(jobQueue)
      .set({
        status: "processing",
        lockedBy: workerId,
        lockedAt: now,
        startedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          ...conditions,
          // Use subquery to get highest priority job
          sql`${jobQueue.id} = (
            SELECT id FROM ${jobQueue}
            WHERE ${jobQueue.status} = 'pending'
            AND (${jobQueue.scheduledFor} IS NULL OR ${jobQueue.scheduledFor} <= ${now})
            ${jobTypes?.length ? sql`AND ${jobQueue.type} IN (${sql.join(jobTypes.map(t => sql`${t}`), sql`, `)})` : sql``}
            ORDER BY
              CASE ${jobQueue.priority}
                WHEN 'critical' THEN 1
                WHEN 'high' THEN 2
                WHEN 'normal' THEN 3
                WHEN 'low' THEN 4
              END,
              ${jobQueue.createdAt} ASC
            LIMIT 1
            FOR UPDATE SKIP LOCKED
          )`
        )
      )
      .returning();

    if (result.length === 0) {
      return null;
    }

    const jobRow = result[0];

    // Remove from Redis pending queue
    if (this.redis && this.connected) {
      await this.redis.zrem("pending", jobRow.id);
    }

    return this.rowToJob(jobRow);
  }

  /**
   * Process a job
   */
  async processJob(job: Job, workerId: string): Promise<JobResult> {
    const startTime = Date.now();
    const handler = this.handlers.get(job.type);

    if (!handler) {
      const error = `No handler registered for job type: ${job.type}`;
      await this.markJobFailed(job.id, error, undefined, workerId, startTime);
      return { success: false, error, duration: Date.now() - startTime };
    }

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, job.processingTimeout);

    try {
      const context: JobContext = {
        job,
        workerId,
        attemptNumber: job.retryCount + 1,
        updateProgress: async (progress: number, message?: string) => {
          await this.updateJobProgress(job.id, progress, message);
        },
        signal: controller.signal,
      };

      this.emitEvent({
        type: "job:started",
        timestamp: new Date(),
        workerId,
        jobId: job.id,
        jobType: job.type,
      });

      const result = await handler(context);
      clearTimeout(timeoutId);

      const duration = Date.now() - startTime;
      await this.markJobCompleted(job.id, result, workerId, startTime, duration);

      return { success: true, result, duration };
    } catch (error) {
      clearTimeout(timeoutId);

      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const errorStack = error instanceof Error ? error.stack : undefined;
      const duration = Date.now() - startTime;

      // Check if we should retry
      if (job.retryCount < job.maxRetries) {
        await this.scheduleRetry(job, errorMessage, errorStack, workerId, startTime, duration);
        return { success: false, error: errorMessage, errorStack, duration };
      }

      // Move to dead letter queue
      await this.markJobFailed(job.id, errorMessage, errorStack, workerId, startTime);
      return { success: false, error: errorMessage, errorStack, duration };
    }
  }

  /**
   * Update job progress
   */
  private async updateJobProgress(
    jobId: string,
    progress: number,
    message?: string
  ): Promise<void> {
    await database
      .update(jobQueue)
      .set({
        progress: Math.min(100, Math.max(0, progress)),
        progressMessage: message || null,
        updatedAt: new Date(),
      })
      .where(eq(jobQueue.id, jobId));

    this.emitEvent({
      type: "job:progress",
      timestamp: new Date(),
      jobId,
      data: { progress, message },
    });
  }

  /**
   * Mark job as completed
   */
  private async markJobCompleted(
    jobId: string,
    result: unknown,
    workerId: string,
    startTime: number,
    duration: number
  ): Promise<void> {
    const now = new Date();

    await database
      .update(jobQueue)
      .set({
        status: "completed",
        result: result ? JSON.stringify(result) : null,
        progress: 100,
        completedAt: now,
        updatedAt: now,
      })
      .where(eq(jobQueue.id, jobId));

    // Log execution
    await this.logExecution(jobId, workerId, "success", startTime, duration, result);

    this.emitEvent({
      type: "job:completed",
      timestamp: now,
      workerId,
      jobId,
      data: { duration },
    });
  }

  /**
   * Schedule a retry for a failed job
   */
  private async scheduleRetry(
    job: Job,
    error: string,
    errorStack: string | undefined,
    workerId: string,
    startTime: number,
    duration: number
  ): Promise<void> {
    const now = new Date();
    const scheduledFor = new Date(now.getTime() + job.retryDelay);

    await database
      .update(jobQueue)
      .set({
        status: "pending",
        retryCount: job.retryCount + 1,
        lastError: error,
        errorStack: errorStack || null,
        scheduledFor,
        lockedBy: null,
        lockedAt: null,
        startedAt: null,
        updatedAt: now,
      })
      .where(eq(jobQueue.id, job.id));

    // Re-add to Redis queue
    if (this.redis && this.connected) {
      await this.addJobToRedisQueue(job.id, job.priority);
    }

    // Log execution
    await this.logExecution(job.id, workerId, "failure", startTime, duration, undefined, error, errorStack);

    this.emitEvent({
      type: "job:retrying",
      timestamp: now,
      workerId,
      jobId: job.id,
      jobType: job.type,
      data: { retryCount: job.retryCount + 1, error },
    });
  }

  /**
   * Mark job as failed and move to dead letter queue
   */
  private async markJobFailed(
    jobId: string,
    error: string,
    errorStack: string | undefined,
    workerId: string,
    startTime: number
  ): Promise<void> {
    const now = new Date();
    const duration = Date.now() - startTime;

    // Get the job details first
    const [jobRow] = await database
      .select()
      .from(jobQueue)
      .where(eq(jobQueue.id, jobId))
      .limit(1);

    if (!jobRow) return;

    // Update job status
    await database
      .update(jobQueue)
      .set({
        status: "failed",
        lastError: error,
        errorStack: errorStack || null,
        completedAt: now,
        updatedAt: now,
      })
      .where(eq(jobQueue.id, jobId));

    // Log execution
    await this.logExecution(jobId, workerId, "failure", startTime, duration, undefined, error, errorStack);

    // Get execution history
    const executions = await database
      .select()
      .from(jobExecutionLog)
      .where(eq(jobExecutionLog.jobId, jobId))
      .orderBy(asc(jobExecutionLog.attemptNumber));

    // Move to dead letter queue
    await database.insert(deadLetterQueue).values({
      id: nanoid(),
      originalJobId: jobId,
      type: jobRow.type,
      name: jobRow.name,
      payload: jobRow.payload,
      failedAt: now,
      failureReason: error,
      totalAttempts: jobRow.retryCount + 1,
      executionHistory: JSON.stringify(
        executions.map((e) => ({
          attemptNumber: e.attemptNumber,
          status: e.status,
          duration: e.duration,
          error: e.error,
        }))
      ),
      userId: jobRow.userId,
      referenceId: jobRow.referenceId,
      referenceType: jobRow.referenceType,
      createdAt: now,
      updatedAt: now,
    });

    this.emitEvent({
      type: "job:failed",
      timestamp: now,
      workerId,
      jobId,
      jobType: jobRow.type as JobType,
      error: new Error(error),
      data: { totalAttempts: jobRow.retryCount + 1 },
    });
  }

  /**
   * Log job execution
   */
  private async logExecution(
    jobId: string,
    workerId: string,
    status: "success" | "failure",
    startTime: number,
    duration: number,
    result?: unknown,
    error?: string,
    errorStack?: string
  ): Promise<void> {
    // Get current attempt number
    const [jobRow] = await database
      .select({ retryCount: jobQueue.retryCount })
      .from(jobQueue)
      .where(eq(jobQueue.id, jobId))
      .limit(1);

    const attemptNumber = (jobRow?.retryCount || 0) + 1;

    await database.insert(jobExecutionLog).values({
      id: nanoid(),
      jobId,
      workerId,
      attemptNumber,
      status,
      startedAt: new Date(startTime),
      completedAt: new Date(),
      duration,
      result: result ? JSON.stringify(result) : null,
      error: error || null,
      errorStack: errorStack || null,
      createdAt: new Date(),
    });
  }

  // ===========================================================================
  // Job Management
  // ===========================================================================

  /**
   * Get a job by ID
   */
  async getJob(jobId: string): Promise<Job | null> {
    const [jobRow] = await database
      .select()
      .from(jobQueue)
      .where(eq(jobQueue.id, jobId))
      .limit(1);

    if (!jobRow) return null;
    return this.rowToJob(jobRow);
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    const result = await database
      .update(jobQueue)
      .set({
        status: "cancelled",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(jobQueue.id, jobId),
          inArray(jobQueue.status, ["pending", "delayed"])
        )
      )
      .returning();

    if (result.length > 0) {
      // Remove from Redis queue
      if (this.redis && this.connected) {
        await this.redis.zrem("pending", jobId);
      }

      this.emitEvent({
        type: "job:cancelled",
        timestamp: new Date(),
        jobId,
        jobType: result[0].type as JobType,
      });

      return true;
    }

    return false;
  }

  /**
   * Retry a failed job
   */
  async retryJob(jobId: string): Promise<boolean> {
    const now = new Date();

    const result = await database
      .update(jobQueue)
      .set({
        status: "pending",
        retryCount: 0,
        lastError: null,
        errorStack: null,
        scheduledFor: null,
        lockedBy: null,
        lockedAt: null,
        startedAt: null,
        completedAt: null,
        progress: 0,
        progressMessage: null,
        updatedAt: now,
      })
      .where(
        and(
          eq(jobQueue.id, jobId),
          inArray(jobQueue.status, ["failed", "cancelled"])
        )
      )
      .returning();

    if (result.length > 0) {
      // Add to Redis queue
      if (this.redis && this.connected) {
        await this.addJobToRedisQueue(jobId, result[0].priority as JobPriority);
      }

      return true;
    }

    return false;
  }

  /**
   * Delete a job
   */
  async deleteJob(jobId: string): Promise<boolean> {
    const result = await database
      .delete(jobQueue)
      .where(eq(jobQueue.id, jobId))
      .returning();

    if (result.length > 0 && this.redis && this.connected) {
      await this.redis.zrem("pending", jobId);
    }

    return result.length > 0;
  }

  /**
   * Clean up stale jobs (jobs that have been processing for too long)
   */
  async cleanupStaleJobs(): Promise<number> {
    const staleTimeout = new Date(Date.now() - this.config.staleJobTimeout);

    const staleJobs = await database
      .select()
      .from(jobQueue)
      .where(
        and(
          eq(jobQueue.status, "processing"),
          lte(jobQueue.lockedAt, staleTimeout)
        )
      );

    let cleaned = 0;
    for (const job of staleJobs) {
      // Reset the job for reprocessing
      await database
        .update(jobQueue)
        .set({
          status: "pending",
          lockedBy: null,
          lockedAt: null,
          startedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(jobQueue.id, job.id));

      if (this.redis && this.connected) {
        await this.addJobToRedisQueue(job.id, job.priority as JobPriority);
      }

      this.emitEvent({
        type: "job:stale",
        timestamp: new Date(),
        jobId: job.id,
        jobType: job.type as JobType,
      });

      cleaned++;
    }

    return cleaned;
  }

  // ===========================================================================
  // Statistics
  // ===========================================================================

  /**
   * Get queue statistics
   */
  async getStats(): Promise<QueueStats> {
    const counts = await database
      .select({
        status: jobQueue.status,
        count: sql<number>`count(*)::int`,
      })
      .from(jobQueue)
      .groupBy(jobQueue.status);

    const byType = await database
      .select({
        type: jobQueue.type,
        count: sql<number>`count(*)::int`,
      })
      .from(jobQueue)
      .where(eq(jobQueue.status, "pending"))
      .groupBy(jobQueue.type);

    const byPriority = await database
      .select({
        priority: jobQueue.priority,
        count: sql<number>`count(*)::int`,
      })
      .from(jobQueue)
      .where(eq(jobQueue.status, "pending"))
      .groupBy(jobQueue.priority);

    const stats: QueueStats = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      cancelled: 0,
      total: 0,
      byType: {},
      byPriority: {},
    };

    for (const row of counts) {
      const count = row.count;
      stats.total += count;
      switch (row.status) {
        case "pending":
          stats.pending = count;
          break;
        case "processing":
          stats.processing = count;
          break;
        case "completed":
          stats.completed = count;
          break;
        case "failed":
          stats.failed = count;
          break;
        case "delayed":
          stats.delayed = count;
          break;
        case "cancelled":
          stats.cancelled = count;
          break;
      }
    }

    for (const row of byType) {
      stats.byType[row.type] = row.count;
    }

    for (const row of byPriority) {
      stats.byPriority[row.priority] = row.count;
    }

    return stats;
  }

  // ===========================================================================
  // Event Handling
  // ===========================================================================

  /**
   * Add event listener
   */
  on(event: QueueEventType, listener: QueueEventListener): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  /**
   * Remove event listener
   */
  off(event: QueueEventType, listener: QueueEventListener): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  /**
   * Emit event
   */
  private emitEvent(event: QueueEvent): void {
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(event);
        } catch (error) {
          console.error("Error in queue event listener:", error);
        }
      });
    }
  }

  // ===========================================================================
  // Helpers
  // ===========================================================================

  /**
   * Convert database row to Job object
   */
  private rowToJob(row: typeof jobQueue.$inferSelect): Job {
    return {
      id: row.id,
      type: row.type as JobType,
      name: row.name,
      payload: JSON.parse(row.payload),
      priority: row.priority as JobPriority,
      status: row.status as JobStatus,
      scheduledFor: row.scheduledFor,
      maxRetries: row.maxRetries,
      retryCount: row.retryCount,
      retryDelay: row.retryDelay,
      processingTimeout: row.processingTimeout,
      lockedBy: row.lockedBy,
      lockedAt: row.lockedAt,
      result: row.result,
      lastError: row.lastError,
      errorStack: row.errorStack,
      progress: row.progress,
      progressMessage: row.progressMessage,
      userId: row.userId,
      referenceId: row.referenceId,
      referenceType: row.referenceType,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      startedAt: row.startedAt,
      completedAt: row.completedAt,
    };
  }

  /**
   * Get configuration
   */
  getConfig(): Readonly<QueueConfig> {
    return { ...this.config };
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let jobQueueClientInstance: JobQueueClient | null = null;

/**
 * Get the singleton job queue client instance
 */
export function getJobQueueClient(
  configOverrides?: Partial<QueueConfig>
): JobQueueClient {
  if (!jobQueueClientInstance) {
    jobQueueClientInstance = new JobQueueClient(configOverrides);
  }
  return jobQueueClientInstance;
}

/**
 * Reset the singleton instance (for testing)
 */
export async function resetJobQueueClient(): Promise<void> {
  if (jobQueueClientInstance) {
    await jobQueueClientInstance.disconnect();
    jobQueueClientInstance = null;
  }
}

/**
 * Initialize job queue client and connect
 */
export async function initializeJobQueue(
  configOverrides?: Partial<QueueConfig>
): Promise<JobQueueClient> {
  const client = getJobQueueClient(configOverrides);
  await client.connect();
  return client;
}
