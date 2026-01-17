/**
 * Job Queue Worker
 * Background worker that processes jobs from the queue
 */

import { nanoid } from "nanoid";
import { getJobQueueClient, type JobQueueClient } from "./client";
import type {
  Job,
  JobHandler,
  WorkerConfig,
  WorkerStats,
  QueueEvent,
  QueueEventListener,
  QueueEventType,
} from "./types";
import type { JobType } from "~/db/schema";

// =============================================================================
// Default Configuration
// =============================================================================

const DEFAULT_WORKER_CONFIG: WorkerConfig = {
  concurrency: 1,
  pollInterval: 1000,
  shutdownTimeout: 30000,
};

// =============================================================================
// Job Queue Worker Class
// =============================================================================

export class JobQueueWorker {
  private client: JobQueueClient;
  private config: WorkerConfig;
  private workerId: string;
  private running: boolean = false;
  private stopping: boolean = false;
  private activeJobs: Map<string, Job> = new Map();
  private pollInterval: NodeJS.Timeout | null = null;
  private staleCheckInterval: NodeJS.Timeout | null = null;
  private stats: WorkerStats;
  private listeners: Map<QueueEventType, Set<QueueEventListener>> = new Map();

  constructor(client?: JobQueueClient, configOverrides?: Partial<WorkerConfig>) {
    this.client = client || getJobQueueClient();
    this.config = {
      ...DEFAULT_WORKER_CONFIG,
      ...configOverrides,
    };
    this.workerId = this.config.workerId || `worker-${nanoid(8)}`;
    this.stats = {
      workerId: this.workerId,
      processedJobs: 0,
      failedJobs: 0,
      successRate: 0,
      averageDuration: 0,
      currentJob: null,
      startedAt: new Date(),
      lastActivityAt: new Date(),
    };
  }

  // ===========================================================================
  // Worker Lifecycle
  // ===========================================================================

  /**
   * Start the worker
   */
  async start(): Promise<void> {
    if (this.running) {
      console.log(`Worker ${this.workerId} is already running`);
      return;
    }

    console.log(`Starting worker ${this.workerId}...`);

    // Ensure client is connected
    await this.client.connect();

    this.running = true;
    this.stopping = false;
    this.stats.startedAt = new Date();
    this.stats.lastActivityAt = new Date();

    // Start polling for jobs
    this.pollInterval = setInterval(() => {
      this.poll();
    }, this.config.pollInterval);

    // Start stale job check
    this.staleCheckInterval = setInterval(() => {
      this.checkStaleJobs();
    }, this.client.getConfig().staleJobCheckInterval);

    // Initial poll
    this.poll();

    this.emitEvent({
      type: "worker:started",
      timestamp: new Date(),
      workerId: this.workerId,
    });

    console.log(`Worker ${this.workerId} started successfully`);
  }

  /**
   * Stop the worker gracefully
   */
  async stop(): Promise<void> {
    if (!this.running || this.stopping) {
      return;
    }

    console.log(`Stopping worker ${this.workerId}...`);
    this.stopping = true;

    // Clear intervals
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    if (this.staleCheckInterval) {
      clearInterval(this.staleCheckInterval);
      this.staleCheckInterval = null;
    }

    // Wait for active jobs to complete
    if (this.activeJobs.size > 0) {
      console.log(`Waiting for ${this.activeJobs.size} active jobs to complete...`);
      const timeout = Date.now() + this.config.shutdownTimeout;

      while (this.activeJobs.size > 0 && Date.now() < timeout) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      if (this.activeJobs.size > 0) {
        console.warn(`Shutdown timeout reached with ${this.activeJobs.size} jobs still running`);
      }
    }

    this.running = false;
    this.stopping = false;

    this.emitEvent({
      type: "worker:stopped",
      timestamp: new Date(),
      workerId: this.workerId,
    });

    console.log(`Worker ${this.workerId} stopped`);
  }

  /**
   * Check if worker is running
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Get worker statistics
   */
  getStats(): WorkerStats {
    return {
      ...this.stats,
      currentJob: this.activeJobs.size > 0 ? Array.from(this.activeJobs.keys())[0] : null,
    };
  }

  // ===========================================================================
  // Job Processing
  // ===========================================================================

  /**
   * Poll for and process jobs
   */
  private async poll(): Promise<void> {
    if (!this.running || this.stopping) {
      return;
    }

    // Check if we can process more jobs
    if (this.activeJobs.size >= this.config.concurrency) {
      return;
    }

    const availableSlots = this.config.concurrency - this.activeJobs.size;

    for (let i = 0; i < availableSlots; i++) {
      try {
        const job = await this.client.fetchNextJob(this.workerId, this.config.jobTypes);

        if (!job) {
          break; // No more jobs available
        }

        // Process job in background
        this.processJobAsync(job);
      } catch (error) {
        console.error(`Worker ${this.workerId} poll error:`, error);
        this.emitEvent({
          type: "worker:error",
          timestamp: new Date(),
          workerId: this.workerId,
          error: error instanceof Error ? error : new Error(String(error)),
        });
        break;
      }
    }
  }

  /**
   * Process a job asynchronously
   */
  private async processJobAsync(job: Job): Promise<void> {
    this.activeJobs.set(job.id, job);
    this.stats.lastActivityAt = new Date();

    try {
      const result = await this.client.processJob(job, this.workerId);

      this.stats.processedJobs++;
      if (!result.success) {
        this.stats.failedJobs++;
      }

      // Update success rate
      this.stats.successRate =
        ((this.stats.processedJobs - this.stats.failedJobs) / this.stats.processedJobs) * 100;

      // Update average duration (simple moving average)
      this.stats.averageDuration =
        (this.stats.averageDuration * (this.stats.processedJobs - 1) + result.duration) /
        this.stats.processedJobs;
    } catch (error) {
      console.error(`Worker ${this.workerId} job processing error:`, error);
      this.stats.processedJobs++;
      this.stats.failedJobs++;

      this.emitEvent({
        type: "worker:error",
        timestamp: new Date(),
        workerId: this.workerId,
        jobId: job.id,
        error: error instanceof Error ? error : new Error(String(error)),
      });
    } finally {
      this.activeJobs.delete(job.id);
      this.stats.lastActivityAt = new Date();
    }
  }

  /**
   * Check for and clean up stale jobs
   */
  private async checkStaleJobs(): Promise<void> {
    if (!this.running || this.stopping) {
      return;
    }

    try {
      const cleaned = await this.client.cleanupStaleJobs();
      if (cleaned > 0) {
        console.log(`Worker ${this.workerId} cleaned up ${cleaned} stale jobs`);
      }
    } catch (error) {
      console.error(`Worker ${this.workerId} stale job cleanup error:`, error);
    }
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
          console.error("Error in worker event listener:", error);
        }
      });
    }
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a new worker
 */
export function createWorker(
  client?: JobQueueClient,
  config?: Partial<WorkerConfig>
): JobQueueWorker {
  return new JobQueueWorker(client, config);
}

/**
 * Create and start a new worker
 */
export async function startWorker(
  client?: JobQueueClient,
  config?: Partial<WorkerConfig>
): Promise<JobQueueWorker> {
  const worker = createWorker(client, config);
  await worker.start();
  return worker;
}
