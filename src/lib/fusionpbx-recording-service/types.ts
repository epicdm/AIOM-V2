/**
 * FusionPBX Call Recording Service Types
 *
 * Type definitions for the call recording service including
 * webhooks, encryption, storage, and retention policies.
 */

import type {
  RecordingStatus,
  StorageProvider,
  RecordingAccessType,
  CallRecording,
  CallRecordingRetentionPolicy,
} from "~/db/schema";

// =============================================================================
// FusionPBX Webhook Types
// =============================================================================

/**
 * FusionPBX webhook payload for call recording events
 */
export interface FusionPBXRecordingWebhookPayload {
  // Event type
  event: "recording_started" | "recording_stopped" | "recording_available";

  // Call identification
  call_uuid: string;
  call_direction: "inbound" | "outbound";

  // Recording details
  recording_id?: string;
  recording_file?: string;
  recording_url?: string;
  recording_duration?: number;
  recording_format?: string;

  // Call participants
  caller_id_number?: string;
  caller_id_name?: string;
  destination_number?: string;
  extension?: string;
  domain?: string;

  // Timing
  call_start_time?: string;
  call_end_time?: string;
  recording_start_time?: string;
  recording_stop_time?: string;

  // Metadata
  variables?: Record<string, string>;
  tenant_id?: string;
  user_extension?: string;
}

/**
 * Validated and processed webhook data
 */
export interface ProcessedWebhookData {
  fusionpbxCallUuid: string;
  fusionpbxRecordingId?: string;
  callDirection: "inbound" | "outbound";
  callerIdNumber: string;
  callerIdName?: string;
  destinationNumber: string;
  recordingUrl: string;
  recordingDuration: number;
  recordingFormat: string;
  callStartTime: Date;
  callEndTime?: Date;
  domain?: string;
  extension?: string;
  tenantId?: string;
  metadata?: Record<string, string>;
}

// =============================================================================
// Recording Processing Types
// =============================================================================

/**
 * Options for processing a recording
 */
export interface ProcessRecordingOptions {
  userId: string;
  callRecordId?: string;
  webhookData: ProcessedWebhookData;
  retentionPolicyId?: string;
  encrypt?: boolean;
  tags?: string[];
}

/**
 * Result of recording processing
 */
export interface ProcessRecordingResult {
  success: boolean;
  recordingId?: string;
  storageKey?: string;
  error?: string;
  errorCode?: RecordingErrorCode;
}

/**
 * Error codes for recording operations
 */
export enum RecordingErrorCode {
  // Webhook errors
  INVALID_WEBHOOK_PAYLOAD = "INVALID_WEBHOOK_PAYLOAD",
  MISSING_RECORDING_URL = "MISSING_RECORDING_URL",

  // Download errors
  DOWNLOAD_FAILED = "DOWNLOAD_FAILED",
  DOWNLOAD_TIMEOUT = "DOWNLOAD_TIMEOUT",
  INVALID_AUDIO_FORMAT = "INVALID_AUDIO_FORMAT",

  // Encryption errors
  ENCRYPTION_FAILED = "ENCRYPTION_FAILED",
  DECRYPTION_FAILED = "DECRYPTION_FAILED",
  NO_ENCRYPTION_KEY = "NO_ENCRYPTION_KEY",
  KEY_ROTATION_FAILED = "KEY_ROTATION_FAILED",

  // Storage errors
  UPLOAD_FAILED = "UPLOAD_FAILED",
  DELETE_FAILED = "DELETE_FAILED",
  STORAGE_NOT_CONFIGURED = "STORAGE_NOT_CONFIGURED",

  // Retention errors
  POLICY_NOT_FOUND = "POLICY_NOT_FOUND",
  RETENTION_ENFORCEMENT_FAILED = "RETENTION_ENFORCEMENT_FAILED",

  // General errors
  DATABASE_ERROR = "DATABASE_ERROR",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
  USER_NOT_FOUND = "USER_NOT_FOUND",
  CALL_RECORD_NOT_FOUND = "CALL_RECORD_NOT_FOUND",
}

/**
 * Custom error class for recording operations
 */
export class RecordingError extends Error {
  constructor(
    public code: RecordingErrorCode,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "RecordingError";
  }
}

// =============================================================================
// Encryption Types
// =============================================================================

/**
 * Encrypted recording data structure
 */
export interface EncryptedRecordingData {
  encryptedContent: Buffer;
  iv: string; // Base64 encoded
  algorithm: string;
  keyId: string;
  contentHash: string; // SHA-256 of original content
}

/**
 * Options for encrypting a recording
 */
export interface EncryptRecordingOptions {
  content: Buffer;
  keyId?: string; // If not provided, uses primary key
}

/**
 * Options for decrypting a recording
 */
export interface DecryptRecordingOptions {
  encryptedContent: Buffer;
  iv: string;
  keyId: string;
}

/**
 * Key rotation result
 */
export interface KeyRotationResult {
  success: boolean;
  newKeyId?: string;
  previousKeyId?: string;
  recordingsReEncrypted?: number;
  error?: string;
}

// =============================================================================
// Storage Types
// =============================================================================

/**
 * Storage upload options
 */
export interface RecordingStorageOptions {
  content: Buffer;
  storageKey: string;
  contentType?: string;
  metadata?: Record<string, string>;
  encrypt?: boolean;
}

/**
 * Storage upload result
 */
export interface RecordingStorageResult {
  success: boolean;
  storageKey: string;
  storageProvider: StorageProvider;
  fileSize: number;
  contentHash?: string;
  encryptionData?: {
    iv: string;
    keyId: string;
    algorithm: string;
  };
  error?: string;
}

/**
 * Options for downloading a recording
 */
export interface RecordingDownloadOptions {
  recordingId: string;
  userId: string;
  decrypt?: boolean;
  logAccess?: boolean;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Download result
 */
export interface RecordingDownloadResult {
  success: boolean;
  content?: Buffer;
  filename?: string;
  contentType?: string;
  presignedUrl?: string;
  error?: string;
}

// =============================================================================
// Retention Policy Types
// =============================================================================

/**
 * Retention policy conditions for matching recordings
 */
export interface RetentionPolicyConditions {
  callDirection?: "inbound" | "outbound" | "both";
  minDurationSeconds?: number;
  maxDurationSeconds?: number;
  userRoles?: string[];
  tags?: string[];
  extensions?: string[];
  domains?: string[];
}

/**
 * Result of retention policy enforcement
 */
export interface RetentionEnforcementResult {
  processed: number;
  deleted: number;
  archived: number;
  failed: number;
  errors: Array<{
    recordingId: string;
    error: string;
  }>;
}

/**
 * Options for enforcing retention
 */
export interface EnforceRetentionOptions {
  dryRun?: boolean;
  batchSize?: number;
  maxRecordings?: number;
}

// =============================================================================
// Service Statistics Types
// =============================================================================

/**
 * Recording service statistics
 */
export interface RecordingServiceStats {
  totalRecordings: number;
  pendingRecordings: number;
  encryptedRecordings: number;
  failedRecordings: number;
  totalStorageBytes: number;
  recordingsExpiringWithin7Days: number;
  activeRetentionPolicies: number;
  activeEncryptionKeys: number;
}

/**
 * Recording query filters
 */
export interface RecordingFilters {
  userId?: string;
  callRecordId?: string;
  status?: RecordingStatus;
  startDate?: Date;
  endDate?: Date;
  hasExpired?: boolean;
  storageProvider?: StorageProvider;
  tags?: string[];
  limit?: number;
  offset?: number;
}

// =============================================================================
// Webhook Handler Types
// =============================================================================

/**
 * Webhook handler response
 */
export interface WebhookHandlerResponse {
  success: boolean;
  message: string;
  recordingId?: string;
  callRecordId?: string;
  error?: string;
}

/**
 * Webhook authentication result
 */
export interface WebhookAuthResult {
  authenticated: boolean;
  domain?: string;
  tenantId?: string;
  error?: string;
}

// =============================================================================
// Access Control Types
// =============================================================================

/**
 * Recording access request
 */
export interface RecordingAccessRequest {
  recordingId: string;
  userId: string;
  accessType: RecordingAccessType;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Recording access log entry
 */
export interface RecordingAccessLogEntry {
  recordingId: string;
  userId?: string;
  accessType: RecordingAccessType;
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
  errorMessage?: string;
  accessedAt: Date;
}

// =============================================================================
// Configuration Types
// =============================================================================

/**
 * Recording service configuration
 */
export interface RecordingServiceConfig {
  // Storage
  storageProvider: StorageProvider;
  storageBucket?: string;

  // Encryption
  encryptionEnabled: boolean;
  masterEncryptionKey?: string;

  // Retention
  defaultRetentionDays: number;

  // Processing
  maxRetries: number;
  retryDelayMs: number;
  downloadTimeoutMs: number;

  // FusionPBX
  fusionpbxWebhookSecret?: string;
  fusionpbxApiUrl?: string;
  fusionpbxApiKey?: string;
}
