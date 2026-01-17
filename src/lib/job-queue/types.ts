/**
 * Job Queue Types
 * Type definitions for the Redis-backed job queue system
 */

import type { JobStatus, JobType, JobPriority } from "~/db/schema";

// =============================================================================
// Core Job Types
// =============================================================================

/**
 * Job definition for creating a new job
 */
export interface JobDefinition<T = unknown> {
  /** Job type for routing to handlers */
  type: JobType;
  /** Human-readable job name */
  name: string;
  /** Job payload data */
  payload: T;
  /** Job priority (default: normal) */
  priority?: JobPriority;
  /** When to process (null = immediately) */
  scheduledFor?: Date;
  /** Maximum retry attempts (default: 3) */
  maxRetries?: number;
  /** Delay between retries in ms (default: 5000) */
  retryDelay?: number;
  /** Processing timeout in ms (default: 30000) */
  processingTimeout?: number;
  /** User ID associated with this job */
  userId?: string;
  /** Reference ID for linking to related entity */
  referenceId?: string;
  /** Reference type for linking to related entity */
  referenceType?: string;
}

/**
 * Job data stored in the queue
 */
export interface Job<T = unknown> {
  id: string;
  type: JobType;
  name: string;
  payload: T;
  priority: JobPriority;
  status: JobStatus;
  scheduledFor: Date | null;
  maxRetries: number;
  retryCount: number;
  retryDelay: number;
  processingTimeout: number;
  lockedBy: string | null;
  lockedAt: Date | null;
  result: string | null;
  lastError: string | null;
  errorStack: string | null;
  progress: number;
  progressMessage: string | null;
  userId: string | null;
  referenceId: string | null;
  referenceType: string | null;
  createdAt: Date;
  updatedAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
}

/**
 * Job context passed to handlers
 */
export interface JobContext<T = unknown> {
  /** The job being processed */
  job: Job<T>;
  /** Worker ID processing this job */
  workerId: string;
  /** Current attempt number */
  attemptNumber: number;
  /** Update job progress */
  updateProgress: (progress: number, message?: string) => Promise<void>;
  /** Signal for job cancellation */
  signal: AbortSignal;
}

/**
 * Job handler function type
 */
export type JobHandler<T = unknown, R = unknown> = (
  context: JobContext<T>
) => Promise<R>;

/**
 * Job handler registration
 */
export interface JobHandlerRegistration<T = unknown, R = unknown> {
  type: JobType;
  handler: JobHandler<T, R>;
  /** Default options for this job type */
  defaultOptions?: Partial<JobDefinition<T>>;
}

// =============================================================================
// Job Result Types
// =============================================================================

/**
 * Result of a job execution
 */
export interface JobResult<R = unknown> {
  success: boolean;
  result?: R;
  error?: string;
  errorStack?: string;
  duration: number;
}

/**
 * Result of enqueueing a job
 */
export interface EnqueueResult {
  success: boolean;
  jobId?: string;
  error?: string;
}

/**
 * Batch enqueue result
 */
export interface BatchEnqueueResult {
  total: number;
  successful: number;
  failed: number;
  jobIds: string[];
  errors: Array<{ index: number; error: string }>;
}

// =============================================================================
// Queue Statistics Types
// =============================================================================

/**
 * Queue statistics
 */
export interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  delayed: number;
  cancelled: number;
  total: number;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
}

/**
 * Worker statistics
 */
export interface WorkerStats {
  workerId: string;
  processedJobs: number;
  failedJobs: number;
  successRate: number;
  averageDuration: number;
  currentJob: string | null;
  startedAt: Date;
  lastActivityAt: Date;
}

// =============================================================================
// Queue Configuration Types
// =============================================================================

/**
 * Queue configuration
 */
export interface QueueConfig {
  /** Redis key prefix for queue keys */
  keyPrefix: string;
  /** Default job priority */
  defaultPriority: JobPriority;
  /** Default max retries */
  defaultMaxRetries: number;
  /** Default retry delay in ms */
  defaultRetryDelay: number;
  /** Default processing timeout in ms */
  defaultProcessingTimeout: number;
  /** How often to check for stale jobs (ms) */
  staleJobCheckInterval: number;
  /** How long before a locked job is considered stale (ms) */
  staleJobTimeout: number;
  /** Maximum jobs to fetch in one poll */
  maxJobsPerPoll: number;
}

/**
 * Worker configuration
 */
export interface WorkerConfig {
  /** Worker ID (auto-generated if not provided) */
  workerId?: string;
  /** Job types to process (empty = all) */
  jobTypes?: JobType[];
  /** Maximum concurrent jobs */
  concurrency: number;
  /** Poll interval in ms */
  pollInterval: number;
  /** Graceful shutdown timeout in ms */
  shutdownTimeout: number;
}

// =============================================================================
// Event Types
// =============================================================================

/**
 * Queue event types
 */
export type QueueEventType =
  | "job:enqueued"
  | "job:started"
  | "job:completed"
  | "job:failed"
  | "job:retrying"
  | "job:cancelled"
  | "job:progress"
  | "job:stale"
  | "worker:started"
  | "worker:stopped"
  | "worker:error"
  | "queue:drained";

/**
 * Queue event payload
 */
export interface QueueEvent {
  type: QueueEventType;
  timestamp: Date;
  workerId?: string;
  jobId?: string;
  jobType?: JobType;
  data?: Record<string, unknown>;
  error?: Error;
}

/**
 * Queue event listener
 */
export type QueueEventListener = (event: QueueEvent) => void;

// =============================================================================
// Specific Job Payload Types
// =============================================================================

/**
 * Briefing generation job payload
 */
export interface BriefingGeneratePayload {
  userId: string;
  force?: boolean;
}

/**
 * Briefing delivery job payload
 */
export interface BriefingDeliverPayload {
  userId: string;
  briefingId: string;
  deliveryMethod: "push" | "email" | "both" | "in_app";
}

/**
 * Push notification job payload
 */
export interface NotificationPushPayload {
  userId: string;
  title: string;
  body: string;
  icon?: string;
  clickAction?: string;
  data?: Record<string, unknown>;
}

/**
 * Email notification job payload
 */
export interface NotificationEmailPayload {
  userId: string;
  to: string;
  subject: string;
  template: string;
  templateData?: Record<string, unknown>;
}

/**
 * Contact sync job payload
 */
export interface SyncContactsPayload {
  userId: string;
  syncType: "full" | "incremental";
  lastSyncAt?: Date;
}

/**
 * CRM sync job payload
 */
export interface SyncCrmPayload {
  userId: string;
  entityType: string;
  entityId?: string;
  operation: "create" | "update" | "delete" | "sync";
}

/**
 * Cleanup job payload
 */
export interface CleanupExpiredPayload {
  entityType: string;
  olderThan: Date;
  batchSize?: number;
}

/**
 * Report generation job payload
 */
export interface ReportGeneratePayload {
  userId: string;
  reportType: string;
  parameters: Record<string, unknown>;
  format: "pdf" | "csv" | "xlsx";
}

/**
 * Custom job payload
 */
export interface CustomJobPayload {
  handler: string;
  data: Record<string, unknown>;
}

/**
 * Data export job payload
 */
export interface DataExportPayload {
  userId: string;
  format: "json" | "csv";
  filters?: {
    startDate?: Date;
    endDate?: Date;
    includeProfile?: boolean;
    includeExpenses?: boolean;
    includeBriefings?: boolean;
    includeCallRecords?: boolean;
    includeCallDispositions?: boolean;
    includeCallTasks?: boolean;
  };
}

// =============================================================================
// Type Guards
// =============================================================================

export function isBriefingGeneratePayload(
  payload: unknown
): payload is BriefingGeneratePayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "userId" in payload &&
    typeof (payload as BriefingGeneratePayload).userId === "string"
  );
}

export function isNotificationPushPayload(
  payload: unknown
): payload is NotificationPushPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "userId" in payload &&
    "title" in payload &&
    "body" in payload
  );
}

export function isSyncContactsPayload(
  payload: unknown
): payload is SyncContactsPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "userId" in payload &&
    "syncType" in payload
  );
}

export function isDataExportPayload(
  payload: unknown
): payload is DataExportPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "userId" in payload &&
    "format" in payload &&
    ["json", "csv"].includes((payload as DataExportPayload).format)
  );
}
