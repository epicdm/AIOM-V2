/**
 * FusionPBX Call Recording Service
 *
 * Main service class that orchestrates recording processing including
 * downloading from FusionPBX, encryption, cloud storage, and retention.
 */

import { nanoid } from "nanoid";
import {
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
} from "./types";
import {
  uploadRecording,
  downloadFromFusionPBX,
  generateStorageKey,
  getContentType,
  deleteRecording as deleteFromStorage,
  downloadRecording as downloadFromStorage,
  getRecordingPresignedUrl,
  validateAudioContent,
  detectAudioFormat,
} from "./storage";
import {
  encryptRecording,
  decryptRecording,
  generateContentHash,
  verifyContentIntegrity,
} from "./encryption";
import {
  calculateExpirationDate,
  getRetentionDays,
  enforceRetentionOnRecording,
  isRecordingExpired,
} from "./retention";
import {
  createCallRecording,
  findCallRecordingById,
  findCallRecordingByFusionPBXUuid,
  updateCallRecording,
  updateRecordingStatus,
  deleteCallRecording,
  getExpiredRecordings,
  getRecordingsByStatus,
  incrementRetryCount,
  getActiveRetentionPolicies,
  createAccessLog,
  getRecordingStatistics,
  countActiveRetentionPolicies,
  countActiveEncryptionKeys,
} from "~/data-access/call-recordings";
import { findCallRecordByExternalId, createCallRecord } from "~/data-access/call-records";
import type { CallRecording, CallRecord, RecordingStatus } from "~/db/schema";

// Constants
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;
const DOWNLOAD_TIMEOUT_MS = 60000;
const DEFAULT_RETENTION_DAYS = 90;

/**
 * FusionPBX Call Recording Service
 *
 * Provides methods for:
 * - Processing FusionPBX webhook events
 * - Downloading and encrypting recordings
 * - Storing recordings in cloud storage
 * - Enforcing retention policies
 * - Accessing and downloading recordings
 */
export class FusionPBXRecordingService {
  private isProcessingRetention = false;

  /**
   * Process a FusionPBX webhook event
   */
  async processWebhook(
    payload: FusionPBXRecordingWebhookPayload
  ): Promise<WebhookHandlerResponse> {
    console.log("Processing FusionPBX webhook:", payload.event);

    try {
      // Validate and process webhook data
      const processedData = this.parseWebhookPayload(payload);

      // Only process recording_available events
      if (payload.event !== "recording_available") {
        return {
          success: true,
          message: `Acknowledged event: ${payload.event}`,
        };
      }

      // Check if we already processed this recording
      const existingRecording = await findCallRecordingByFusionPBXUuid(
        processedData.fusionpbxCallUuid
      );
      if (existingRecording) {
        return {
          success: true,
          message: "Recording already processed",
          recordingId: existingRecording.id,
          callRecordId: existingRecording.callRecordId,
        };
      }

      // Find or create the call record
      const callRecord = await this.findOrCreateCallRecord(processedData);

      // Process the recording
      const result = await this.processRecording({
        userId: callRecord.userId,
        callRecordId: callRecord.id,
        webhookData: processedData,
        encrypt: true,
      });

      if (!result.success) {
        return {
          success: false,
          message: "Failed to process recording",
          error: result.error,
        };
      }

      return {
        success: true,
        message: "Recording processed successfully",
        recordingId: result.recordingId,
        callRecordId: callRecord.id,
      };
    } catch (error) {
      console.error("Error processing webhook:", error);
      return {
        success: false,
        message: "Webhook processing failed",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Parse and validate webhook payload
   */
  private parseWebhookPayload(
    payload: FusionPBXRecordingWebhookPayload
  ): ProcessedWebhookData {
    if (!payload.call_uuid) {
      throw new RecordingError(
        RecordingErrorCode.INVALID_WEBHOOK_PAYLOAD,
        "Missing call_uuid in webhook payload"
      );
    }

    if (payload.event === "recording_available" && !payload.recording_url) {
      throw new RecordingError(
        RecordingErrorCode.MISSING_RECORDING_URL,
        "Missing recording_url for recording_available event"
      );
    }

    return {
      fusionpbxCallUuid: payload.call_uuid,
      fusionpbxRecordingId: payload.recording_id,
      callDirection: payload.call_direction || "outbound",
      callerIdNumber: payload.caller_id_number || "unknown",
      callerIdName: payload.caller_id_name,
      destinationNumber: payload.destination_number || "unknown",
      recordingUrl: payload.recording_url || "",
      recordingDuration: payload.recording_duration || 0,
      recordingFormat: payload.recording_format || "wav",
      callStartTime: payload.call_start_time
        ? new Date(payload.call_start_time)
        : new Date(),
      callEndTime: payload.call_end_time
        ? new Date(payload.call_end_time)
        : undefined,
      domain: payload.domain,
      extension: payload.extension,
      tenantId: payload.tenant_id,
      metadata: payload.variables,
    };
  }

  /**
   * Find or create a call record for the webhook data
   */
  private async findOrCreateCallRecord(
    data: ProcessedWebhookData
  ): Promise<CallRecord> {
    // Try to find existing call record by external ID
    let callRecord = await findCallRecordByExternalId(data.fusionpbxCallUuid);

    if (!callRecord) {
      // Create a new call record
      // Note: In a real implementation, you would need to determine the user ID
      // based on the extension/domain mapping in FusionPBX
      const userId = data.metadata?.user_id || "system"; // Placeholder

      callRecord = await createCallRecord({
        id: nanoid(),
        userId,
        direction: data.callDirection,
        duration: data.recordingDuration,
        callTimestamp: data.callStartTime,
        callerId: data.callerIdNumber,
        callerName: data.callerIdName,
        recipientId: data.destinationNumber,
        status: "completed",
        externalCallId: data.fusionpbxCallUuid,
      });
    }

    return callRecord;
  }

  /**
   * Process a recording from FusionPBX
   */
  async processRecording(
    options: ProcessRecordingOptions
  ): Promise<ProcessRecordingResult> {
    const { userId, callRecordId, webhookData, encrypt = true, tags } = options;

    // Get retention policy
    const policies = await getActiveRetentionPolicies();
    const { days: retentionDays, policyId: retentionPolicyId } = getRetentionDays(
      policies,
      {
        callDirection: webhookData.callDirection,
        durationSeconds: webhookData.recordingDuration,
        extension: webhookData.extension,
        domain: webhookData.domain,
      }
    );

    // Create initial recording entry
    const recordingId = nanoid();
    const storageKey = generateStorageKey(
      userId,
      callRecordId || recordingId,
      webhookData.recordingFormat
    );

    const expiresAt = calculateExpirationDate(new Date(), retentionDays);

    const recording = await createCallRecording({
      id: recordingId,
      callRecordId: callRecordId || recordingId,
      userId,
      fusionpbxRecordingId: webhookData.fusionpbxRecordingId,
      fusionpbxCallUuid: webhookData.fusionpbxCallUuid,
      storageProvider: "r2",
      storageKey,
      originalFilename: webhookData.recordingUrl.split("/").pop() || "recording",
      fileFormat: webhookData.recordingFormat,
      durationSeconds: webhookData.recordingDuration,
      isEncrypted: encrypt,
      status: "pending",
      retentionPolicyId,
      retentionDays,
      expiresAt,
      tags: tags?.join(","),
      metadata: JSON.stringify(webhookData.metadata || {}),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    try {
      // Update status to processing
      await updateRecordingStatus(recording.id, "processing");

      // Download recording from FusionPBX
      console.log(`Downloading recording from: ${webhookData.recordingUrl}`);
      const content = await downloadFromFusionPBX(
        webhookData.recordingUrl,
        DOWNLOAD_TIMEOUT_MS
      );

      // Validate audio content
      const validation = validateAudioContent(content, webhookData.recordingFormat);
      if (!validation.valid) {
        throw new RecordingError(
          RecordingErrorCode.INVALID_AUDIO_FORMAT,
          validation.error || "Invalid audio format"
        );
      }

      // Upload to cloud storage (with encryption if enabled)
      const uploadResult = await uploadRecording({
        content,
        storageKey,
        contentType: getContentType(webhookData.recordingFormat),
        encrypt,
      });

      if (!uploadResult.success) {
        throw new RecordingError(
          RecordingErrorCode.UPLOAD_FAILED,
          uploadResult.error || "Failed to upload recording"
        );
      }

      // Update recording with final details
      await updateCallRecording(recording.id, {
        fileSize: uploadResult.fileSize,
        contentHash: uploadResult.contentHash,
        encryptionAlgorithm: uploadResult.encryptionData?.algorithm,
        encryptionKeyId: uploadResult.encryptionData?.keyId,
        encryptionIv: uploadResult.encryptionData?.iv,
        status: encrypt ? "encrypted" : "stored",
        processingCompletedAt: new Date(),
      });

      console.log(`Recording processed successfully: ${recording.id}`);

      return {
        success: true,
        recordingId: recording.id,
        storageKey,
      };
    } catch (error) {
      console.error(`Failed to process recording ${recording.id}:`, error);

      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const errorCode =
        error instanceof RecordingError
          ? error.code
          : RecordingErrorCode.UNKNOWN_ERROR;

      await updateRecordingStatus(recording.id, "failed", errorMessage);
      await incrementRetryCount(recording.id);

      return {
        success: false,
        recordingId: recording.id,
        error: errorMessage,
        errorCode,
      };
    }
  }

  /**
   * Retry failed recordings
   */
  async retryFailedRecordings(): Promise<{
    processed: number;
    successful: number;
    failed: number;
  }> {
    const failedRecordings = await getRecordingsByStatus("failed", 50);
    const retriableRecordings = failedRecordings.filter(
      (r) => r.retryCount < MAX_RETRIES
    );

    let successful = 0;
    let failed = 0;

    for (const recording of retriableRecordings) {
      // Re-process by simulating the original webhook
      if (recording.fusionpbxCallUuid) {
        // Get original webhook data from metadata
        const metadata = recording.metadata
          ? JSON.parse(recording.metadata)
          : {};

        const result = await this.processRecording({
          userId: recording.userId,
          callRecordId: recording.callRecordId,
          webhookData: {
            fusionpbxCallUuid: recording.fusionpbxCallUuid,
            fusionpbxRecordingId: recording.fusionpbxRecordingId || undefined,
            callDirection: "outbound", // Default, should come from metadata
            callerIdNumber: "unknown",
            destinationNumber: "unknown",
            recordingUrl: metadata.recordingUrl || "",
            recordingDuration: recording.durationSeconds || 0,
            recordingFormat: recording.fileFormat || "wav",
            callStartTime: recording.createdAt,
            metadata,
          },
          encrypt: recording.isEncrypted,
        });

        if (result.success) {
          successful++;
        } else {
          failed++;
        }
      }

      // Add delay between retries
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }

    return {
      processed: retriableRecordings.length,
      successful,
      failed,
    };
  }

  /**
   * Download a recording
   */
  async downloadRecording(
    options: RecordingDownloadOptions
  ): Promise<RecordingDownloadResult> {
    const { recordingId, userId, decrypt = true, logAccess = true, ipAddress, userAgent } = options;

    // Find the recording
    const recording = await findCallRecordingById(recordingId);
    if (!recording) {
      return {
        success: false,
        error: "Recording not found",
      };
    }

    // Check access permissions (in a real implementation, add proper authorization)
    // For now, just check if the user matches
    if (recording.userId !== userId) {
      // Log failed access attempt
      if (logAccess) {
        await createAccessLog({
          id: nanoid(),
          recordingId,
          userId,
          accessType: decrypt ? "decrypt" : "download",
          ipAddress,
          userAgent,
          success: false,
          errorMessage: "Access denied",
          accessedAt: new Date(),
        });
      }

      return {
        success: false,
        error: "Access denied",
      };
    }

    // Check if recording has expired
    if (isRecordingExpired(recording)) {
      return {
        success: false,
        error: "Recording has expired",
      };
    }

    try {
      // Download from storage
      const result = await downloadFromStorage(
        recording.storageKey,
        decrypt && recording.isEncrypted,
        recording.encryptionIv || undefined,
        recording.encryptionKeyId || undefined
      );

      if (!result.success) {
        throw new Error(result.error || "Download failed");
      }

      // Verify content integrity if hash is available
      if (decrypt && recording.contentHash && result.content) {
        const isValid = verifyContentIntegrity(result.content, recording.contentHash);
        if (!isValid) {
          throw new Error("Content integrity verification failed");
        }
      }

      // Log successful access
      if (logAccess) {
        await createAccessLog({
          id: nanoid(),
          recordingId,
          userId,
          accessType: decrypt ? "decrypt" : "download",
          ipAddress,
          userAgent,
          success: true,
          accessedAt: new Date(),
        });
      }

      return {
        success: true,
        content: result.content,
        filename: recording.originalFilename || `recording-${recordingId}.${recording.fileFormat}`,
        contentType: getContentType(recording.fileFormat || "wav"),
      };
    } catch (error) {
      // Log failed access
      if (logAccess) {
        await createAccessLog({
          id: nanoid(),
          recordingId,
          userId,
          accessType: decrypt ? "decrypt" : "download",
          ipAddress,
          userAgent,
          success: false,
          errorMessage: error instanceof Error ? error.message : "Unknown error",
          accessedAt: new Date(),
        });
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get a presigned URL for a recording
   */
  async getRecordingUrl(
    recordingId: string,
    userId: string
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    const recording = await findCallRecordingById(recordingId);
    if (!recording) {
      return { success: false, error: "Recording not found" };
    }

    if (recording.userId !== userId) {
      return { success: false, error: "Access denied" };
    }

    if (isRecordingExpired(recording)) {
      return { success: false, error: "Recording has expired" };
    }

    // Note: For encrypted recordings, presigned URLs won't work directly
    // as the content is encrypted. You'd need to decrypt server-side.
    if (recording.isEncrypted) {
      return {
        success: false,
        error: "Encrypted recordings must be downloaded through the API",
      };
    }

    const result = await getRecordingPresignedUrl(recording.storageKey);
    return {
      success: result.success,
      url: result.presignedUrl,
      error: result.error,
    };
  }

  /**
   * Enforce retention policies on expired recordings
   */
  async enforceRetention(
    options: EnforceRetentionOptions = {}
  ): Promise<RetentionEnforcementResult> {
    const { dryRun = false, batchSize = 100, maxRecordings = 1000 } = options;

    if (this.isProcessingRetention) {
      console.log("Retention enforcement already in progress, skipping...");
      return {
        processed: 0,
        deleted: 0,
        archived: 0,
        failed: 0,
        errors: [],
      };
    }

    this.isProcessingRetention = true;
    const result: RetentionEnforcementResult = {
      processed: 0,
      deleted: 0,
      archived: 0,
      failed: 0,
      errors: [],
    };

    try {
      console.log(`Starting retention enforcement (dryRun: ${dryRun})`);

      const policies = await getActiveRetentionPolicies();
      const policyMap = new Map(policies.map((p) => [p.id, p]));

      let processedCount = 0;

      while (processedCount < maxRecordings) {
        const expiredRecordings = await getExpiredRecordings(batchSize);

        if (expiredRecordings.length === 0) {
          break;
        }

        for (const recording of expiredRecordings) {
          if (processedCount >= maxRecordings) {
            break;
          }

          result.processed++;
          processedCount++;

          const policy = recording.retentionPolicyId
            ? policyMap.get(recording.retentionPolicyId) || null
            : null;

          const enforceResult = await enforceRetentionOnRecording(
            recording,
            policy,
            async (id) => {
              // Delete from storage first
              await deleteFromStorage(recording.storageKey);
              // Then delete from database
              await deleteCallRecording(id);
            },
            undefined, // No archive handler for now
            dryRun
          );

          if (enforceResult.success) {
            if (enforceResult.action === "deleted") {
              result.deleted++;
            } else if (enforceResult.action === "archived") {
              result.archived++;
            }
          } else {
            result.failed++;
            result.errors.push({
              recordingId: recording.id,
              error: enforceResult.error || "Unknown error",
            });
          }
        }
      }

      console.log(
        `Retention enforcement complete: ${result.processed} processed, ` +
          `${result.deleted} deleted, ${result.archived} archived, ${result.failed} failed`
      );
    } finally {
      this.isProcessingRetention = false;
    }

    return result;
  }

  /**
   * Get service statistics
   */
  async getStats(): Promise<RecordingServiceStats> {
    const [dbStats, activePolicies, activeKeys] = await Promise.all([
      getRecordingStatistics(),
      countActiveRetentionPolicies(),
      countActiveEncryptionKeys(),
    ]);

    return {
      ...dbStats,
      activeRetentionPolicies: activePolicies,
      activeEncryptionKeys: activeKeys,
    };
  }

  /**
   * Delete a recording manually
   */
  async deleteRecording(
    recordingId: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    const recording = await findCallRecordingById(recordingId);
    if (!recording) {
      return { success: false, error: "Recording not found" };
    }

    if (recording.userId !== userId) {
      return { success: false, error: "Access denied" };
    }

    try {
      // Delete from storage
      await deleteFromStorage(recording.storageKey);

      // Soft delete from database
      await updateCallRecording(recordingId, {
        status: "deleted",
        deletedAt: new Date(),
      });

      // Log the deletion
      await createAccessLog({
        id: nanoid(),
        recordingId,
        userId,
        accessType: "delete",
        success: true,
        accessedAt: new Date(),
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let serviceInstance: FusionPBXRecordingService | null = null;

/**
 * Get the FusionPBX recording service instance
 */
export function getFusionPBXRecordingService(): FusionPBXRecordingService {
  if (!serviceInstance) {
    serviceInstance = new FusionPBXRecordingService();
  }
  return serviceInstance;
}

/**
 * Clear the service instance (useful for testing)
 */
export function clearServiceInstance(): void {
  serviceInstance = null;
}
