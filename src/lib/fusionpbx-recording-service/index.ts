/**
 * FusionPBX Call Recording Service
 *
 * A comprehensive service for managing call recordings from FusionPBX with:
 * - Cloud storage integration (R2/S3)
 * - AES-256-GCM encryption at rest
 * - Configurable retention policies
 * - Automatic cleanup of expired recordings
 * - Access audit logging
 *
 * Usage:
 * ```typescript
 * import {
 *   getFusionPBXRecordingService,
 *   processWebhook,
 *   enforceRetention,
 * } from "~/lib/fusionpbx-recording-service";
 *
 * // Process a FusionPBX webhook
 * const service = getFusionPBXRecordingService();
 * const result = await service.processWebhook(webhookPayload);
 *
 * // Or use the convenience function
 * const result = await processWebhook(webhookPayload);
 *
 * // Enforce retention policies (call via cron)
 * const retentionResult = await enforceRetention();
 * ```
 */

// Main service
export {
  FusionPBXRecordingService,
  getFusionPBXRecordingService,
  clearServiceInstance,
} from "./service";

// Types
export {
  RecordingError,
  RecordingErrorCode,
  type FusionPBXRecordingWebhookPayload,
  type ProcessedWebhookData,
  type ProcessRecordingOptions,
  type ProcessRecordingResult,
  type RecordingServiceStats,
  type RetentionEnforcementResult,
  type EnforceRetentionOptions,
  type RecordingDownloadOptions,
  type RecordingDownloadResult,
  type WebhookHandlerResponse,
  type EncryptedRecordingData,
  type EncryptRecordingOptions,
  type DecryptRecordingOptions,
  type RetentionPolicyConditions,
  type RecordingStorageOptions,
  type RecordingStorageResult,
  type RecordingFilters,
  type RecordingServiceConfig,
  type RecordingAccessRequest,
  type RecordingAccessLogEntry,
} from "./types";

// Encryption utilities
export {
  encryptRecording,
  decryptRecording,
  generateContentHash,
  verifyContentIntegrity,
  generateMasterEncryptionKey,
  validateEncryptionKey,
  clearMasterKeyCache,
} from "./encryption";

// Storage utilities
export {
  uploadRecording,
  downloadRecording,
  deleteRecording,
  deleteRecordings,
  getRecordingPresignedUrl,
  getRecordingUploadUrl,
  generateStorageKey,
  getContentType,
  downloadFromFusionPBX,
  validateAudioContent,
  detectAudioFormat,
  clearStorageInstance,
} from "./storage";

// Retention utilities
export {
  calculateExpirationDate,
  isRecordingExpired,
  findMatchingPolicy,
  getRetentionDays,
  validateRetentionPolicy,
  createDefaultPolicyData,
  calculateStorageSavings,
  formatBytes,
} from "./retention";

// =============================================================================
// Convenience Functions
// =============================================================================

import { getFusionPBXRecordingService } from "./service";
import type {
  FusionPBXRecordingWebhookPayload,
  WebhookHandlerResponse,
  RetentionEnforcementResult,
  EnforceRetentionOptions,
  RecordingServiceStats,
  RecordingDownloadOptions,
  RecordingDownloadResult,
} from "./types";

/**
 * Process a FusionPBX recording webhook
 */
export async function processWebhook(
  payload: FusionPBXRecordingWebhookPayload
): Promise<WebhookHandlerResponse> {
  const service = getFusionPBXRecordingService();
  return service.processWebhook(payload);
}

/**
 * Enforce retention policies on expired recordings
 */
export async function enforceRetention(
  options?: EnforceRetentionOptions
): Promise<RetentionEnforcementResult> {
  const service = getFusionPBXRecordingService();
  return service.enforceRetention(options);
}

/**
 * Retry failed recordings
 */
export async function retryFailedRecordings(): Promise<{
  processed: number;
  successful: number;
  failed: number;
}> {
  const service = getFusionPBXRecordingService();
  return service.retryFailedRecordings();
}

/**
 * Get recording service statistics
 */
export async function getRecordingStats(): Promise<RecordingServiceStats> {
  const service = getFusionPBXRecordingService();
  return service.getStats();
}

/**
 * Download a recording
 */
export async function downloadRecordingContent(
  options: RecordingDownloadOptions
): Promise<RecordingDownloadResult> {
  const service = getFusionPBXRecordingService();
  return service.downloadRecording(options);
}

/**
 * Delete a recording
 */
export async function deleteUserRecording(
  recordingId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const service = getFusionPBXRecordingService();
  return service.deleteRecording(recordingId, userId);
}

/**
 * Get a presigned URL for a recording
 */
export async function getRecordingUrl(
  recordingId: string,
  userId: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  const service = getFusionPBXRecordingService();
  return service.getRecordingUrl(recordingId, userId);
}
