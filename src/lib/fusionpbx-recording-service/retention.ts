/**
 * Recording Retention Policy Module
 *
 * Handles retention policy enforcement including automatic deletion
 * of expired recordings and policy matching.
 */

import { nanoid } from "nanoid";
import {
  RecordingError,
  RecordingErrorCode,
  type RetentionPolicyConditions,
  type RetentionEnforcementResult,
  type EnforceRetentionOptions,
} from "./types";
import { deleteRecording } from "./storage";
import type {
  CallRecording,
  CallRecordingRetentionPolicy,
} from "~/db/schema";

// Default retention days if no policy matches
const DEFAULT_RETENTION_DAYS = 90;

// Maximum batch size for processing
const DEFAULT_BATCH_SIZE = 100;

/**
 * Calculates the expiration date based on retention days
 */
export function calculateExpirationDate(
  createdAt: Date,
  retentionDays: number
): Date {
  const expiresAt = new Date(createdAt);
  expiresAt.setDate(expiresAt.getDate() + retentionDays);
  return expiresAt;
}

/**
 * Checks if a recording has expired
 */
export function isRecordingExpired(recording: CallRecording): boolean {
  return new Date() >= new Date(recording.expiresAt);
}

/**
 * Parses retention policy conditions from JSON string
 */
export function parseRetentionConditions(
  conditionsJson: string | null
): RetentionPolicyConditions | null {
  if (!conditionsJson) {
    return null;
  }

  try {
    return JSON.parse(conditionsJson) as RetentionPolicyConditions;
  } catch {
    console.warn("Failed to parse retention policy conditions:", conditionsJson);
    return null;
  }
}

/**
 * Checks if a recording matches the policy conditions
 */
export function recordingMatchesConditions(
  recording: CallRecording,
  metadata: {
    callDirection?: string;
    durationSeconds?: number;
    userRole?: string;
    tags?: string[];
    extension?: string;
    domain?: string;
  },
  conditions: RetentionPolicyConditions
): boolean {
  // Check call direction
  if (conditions.callDirection && conditions.callDirection !== "both") {
    if (metadata.callDirection !== conditions.callDirection) {
      return false;
    }
  }

  // Check duration range
  if (conditions.minDurationSeconds !== undefined) {
    if ((metadata.durationSeconds || 0) < conditions.minDurationSeconds) {
      return false;
    }
  }

  if (conditions.maxDurationSeconds !== undefined) {
    if ((metadata.durationSeconds || 0) > conditions.maxDurationSeconds) {
      return false;
    }
  }

  // Check user roles
  if (conditions.userRoles && conditions.userRoles.length > 0) {
    if (!metadata.userRole || !conditions.userRoles.includes(metadata.userRole)) {
      return false;
    }
  }

  // Check tags
  if (conditions.tags && conditions.tags.length > 0) {
    const recordingTags = metadata.tags || [];
    const hasMatchingTag = conditions.tags.some((tag) =>
      recordingTags.includes(tag)
    );
    if (!hasMatchingTag) {
      return false;
    }
  }

  // Check extensions
  if (conditions.extensions && conditions.extensions.length > 0) {
    if (!metadata.extension || !conditions.extensions.includes(metadata.extension)) {
      return false;
    }
  }

  // Check domains
  if (conditions.domains && conditions.domains.length > 0) {
    if (!metadata.domain || !conditions.domains.includes(metadata.domain)) {
      return false;
    }
  }

  return true;
}

/**
 * Finds the best matching retention policy for a recording
 *
 * @param policies - Available retention policies sorted by priority
 * @param metadata - Recording metadata for matching
 * @returns Matching policy or null for default
 */
export function findMatchingPolicy(
  policies: CallRecordingRetentionPolicy[],
  metadata: {
    callDirection?: string;
    durationSeconds?: number;
    userRole?: string;
    tags?: string[];
    extension?: string;
    domain?: string;
  }
): CallRecordingRetentionPolicy | null {
  // Filter to active policies and sort by priority (lower = higher priority)
  const activePolicies = policies
    .filter((p) => p.isActive)
    .sort((a, b) => a.priority - b.priority);

  for (const policy of activePolicies) {
    const conditions = parseRetentionConditions(policy.conditions);

    // If no conditions, this is a catch-all policy
    if (!conditions) {
      return policy;
    }

    // Check if conditions match
    if (
      recordingMatchesConditions(
        {} as CallRecording, // Dummy for type compatibility
        metadata,
        conditions
      )
    ) {
      return policy;
    }
  }

  // Look for default policy
  const defaultPolicy = activePolicies.find((p) => p.isDefault);
  return defaultPolicy || null;
}

/**
 * Gets the retention days for a recording
 *
 * @param policies - Available retention policies
 * @param metadata - Recording metadata
 * @returns Retention days
 */
export function getRetentionDays(
  policies: CallRecordingRetentionPolicy[],
  metadata: {
    callDirection?: string;
    durationSeconds?: number;
    userRole?: string;
    tags?: string[];
    extension?: string;
    domain?: string;
  }
): { days: number; policyId: string | null } {
  const matchingPolicy = findMatchingPolicy(policies, metadata);

  if (matchingPolicy) {
    return {
      days: matchingPolicy.retentionDays,
      policyId: matchingPolicy.id,
    };
  }

  return {
    days: DEFAULT_RETENTION_DAYS,
    policyId: null,
  };
}

/**
 * Creates a default retention policy
 */
export function createDefaultPolicyData(): {
  id: string;
  name: string;
  description: string;
  retentionDays: number;
  autoDelete: boolean;
  archiveBeforeDelete: boolean;
  conditions: null;
  priority: number;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
} {
  const now = new Date();
  return {
    id: nanoid(),
    name: "Default Retention Policy",
    description: "Default policy applied when no other policy matches",
    retentionDays: DEFAULT_RETENTION_DAYS,
    autoDelete: true,
    archiveBeforeDelete: false,
    conditions: null,
    priority: 1000,
    isDefault: true,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Enforcement result tracker for batch processing
 */
class RetentionEnforcementTracker {
  private result: RetentionEnforcementResult = {
    processed: 0,
    deleted: 0,
    archived: 0,
    failed: 0,
    errors: [],
  };

  recordProcessed(): void {
    this.result.processed++;
  }

  recordDeleted(): void {
    this.result.deleted++;
  }

  recordArchived(): void {
    this.result.archived++;
  }

  recordFailed(recordingId: string, error: string): void {
    this.result.failed++;
    this.result.errors.push({ recordingId, error });
  }

  getResult(): RetentionEnforcementResult {
    return { ...this.result };
  }
}

/**
 * Enforces retention policy on a single recording
 *
 * @param recording - Recording to process
 * @param policy - Retention policy to apply
 * @param onDelete - Callback to delete from database
 * @param onArchive - Callback to archive (if applicable)
 * @param dryRun - If true, don't actually delete
 * @returns Success status
 */
export async function enforceRetentionOnRecording(
  recording: CallRecording,
  policy: CallRecordingRetentionPolicy | null,
  onDelete: (recordingId: string) => Promise<void>,
  onArchive?: (recordingId: string) => Promise<void>,
  dryRun: boolean = false
): Promise<{ success: boolean; action: "deleted" | "archived" | "skipped"; error?: string }> {
  // Check if recording has expired
  if (!isRecordingExpired(recording)) {
    return { success: true, action: "skipped" };
  }

  // Determine action based on policy
  const shouldArchive = policy?.archiveBeforeDelete && onArchive;
  const shouldDelete = policy?.autoDelete ?? true;

  if (dryRun) {
    // In dry run, just return what would happen
    if (shouldArchive) {
      return { success: true, action: "archived" };
    }
    if (shouldDelete) {
      return { success: true, action: "deleted" };
    }
    return { success: true, action: "skipped" };
  }

  try {
    // Archive first if needed
    if (shouldArchive) {
      await onArchive!(recording.id);
    }

    // Delete from storage
    if (shouldDelete) {
      const deleteResult = await deleteRecording(recording.storageKey);
      if (!deleteResult.success) {
        return {
          success: false,
          action: "deleted",
          error: deleteResult.error || "Failed to delete from storage",
        };
      }

      // Delete from database
      await onDelete(recording.id);
    }

    return { success: true, action: shouldArchive ? "archived" : "deleted" };
  } catch (error) {
    return {
      success: false,
      action: shouldArchive ? "archived" : "deleted",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Validates retention policy data
 */
export function validateRetentionPolicy(policy: {
  name?: string;
  retentionDays?: number;
  priority?: number;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!policy.name || policy.name.trim().length === 0) {
    errors.push("Policy name is required");
  }

  if (policy.retentionDays === undefined || policy.retentionDays < 1) {
    errors.push("Retention days must be at least 1");
  }

  if (policy.retentionDays !== undefined && policy.retentionDays > 3650) {
    errors.push("Retention days cannot exceed 10 years (3650 days)");
  }

  if (policy.priority !== undefined && (policy.priority < 1 || policy.priority > 10000)) {
    errors.push("Priority must be between 1 and 10000");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Calculates storage savings from retention policy
 */
export function calculateStorageSavings(
  recordings: Array<{ fileSize: number | null; expiresAt: Date }>
): {
  totalExpiredCount: number;
  totalExpiredBytes: number;
  expiringWithin7Days: number;
  expiringWithin7DaysBytes: number;
} {
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  let totalExpiredCount = 0;
  let totalExpiredBytes = 0;
  let expiringWithin7Days = 0;
  let expiringWithin7DaysBytes = 0;

  for (const recording of recordings) {
    const expiresAt = new Date(recording.expiresAt);
    const fileSize = recording.fileSize || 0;

    if (expiresAt <= now) {
      totalExpiredCount++;
      totalExpiredBytes += fileSize;
    } else if (expiresAt <= sevenDaysFromNow) {
      expiringWithin7Days++;
      expiringWithin7DaysBytes += fileSize;
    }
  }

  return {
    totalExpiredCount,
    totalExpiredBytes,
    expiringWithin7Days,
    expiringWithin7DaysBytes,
  };
}

/**
 * Formats bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
