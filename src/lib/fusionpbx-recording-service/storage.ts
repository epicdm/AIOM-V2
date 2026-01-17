/**
 * Recording Storage Module
 *
 * Handles cloud storage operations for call recordings including
 * upload, download, delete, and presigned URL generation.
 */

import { nanoid } from "nanoid";
import { R2Storage } from "~/utils/storage/r2";
import type { IStorage } from "~/utils/storage/storage.interface";
import type { StorageProvider } from "~/db/schema";
import {
  RecordingError,
  RecordingErrorCode,
  type RecordingStorageOptions,
  type RecordingStorageResult,
  type RecordingDownloadResult,
} from "./types";
import {
  encryptRecording,
  decryptRecording,
  generateContentHash,
} from "./encryption";

// Storage instance singleton
let storageInstance: IStorage | null = null;

// Default storage provider
const DEFAULT_STORAGE_PROVIDER: StorageProvider = "r2";

// Recording storage path prefix
const RECORDING_STORAGE_PREFIX = "recordings";

/**
 * Gets the storage instance (singleton pattern)
 */
function getStorageInstance(): IStorage {
  if (!storageInstance) {
    storageInstance = new R2Storage();
  }
  return storageInstance;
}

/**
 * Clears the storage instance (useful for testing)
 */
export function clearStorageInstance(): void {
  storageInstance = null;
}

/**
 * Generates a storage key for a recording
 *
 * @param userId - User ID for namespacing
 * @param callRecordId - Call record ID for reference
 * @param format - File format (wav, mp3, etc.)
 * @returns Generated storage key
 */
export function generateStorageKey(
  userId: string,
  callRecordId: string,
  format: string = "wav"
): string {
  const timestamp = Date.now();
  const uniqueId = nanoid(8);
  return `${RECORDING_STORAGE_PREFIX}/${userId}/${callRecordId}/${timestamp}-${uniqueId}.${format}`;
}

/**
 * Gets the content type for a given file format
 */
export function getContentType(format: string): string {
  const contentTypes: Record<string, string> = {
    wav: "audio/wav",
    mp3: "audio/mpeg",
    ogg: "audio/ogg",
    webm: "audio/webm",
    m4a: "audio/mp4",
    flac: "audio/flac",
  };

  return contentTypes[format.toLowerCase()] || "application/octet-stream";
}

/**
 * Uploads a recording to cloud storage
 *
 * @param options - Storage options including content and key
 * @returns Storage result with key and metadata
 */
export async function uploadRecording(
  options: RecordingStorageOptions
): Promise<RecordingStorageResult> {
  const { content, storageKey, contentType, encrypt = true } = options;

  try {
    const storage = getStorageInstance();
    let uploadContent = content;
    let encryptionData: RecordingStorageResult["encryptionData"] = undefined;

    // Encrypt content if requested
    if (encrypt) {
      const encrypted = encryptRecording({ content });
      uploadContent = encrypted.encryptedContent;
      encryptionData = {
        iv: encrypted.iv,
        keyId: encrypted.keyId,
        algorithm: encrypted.algorithm,
      };
    }

    // Calculate content hash (of original content for verification)
    const contentHash = generateContentHash(content);

    // Upload to storage
    await storage.upload(
      storageKey,
      uploadContent,
      contentType || "application/octet-stream"
    );

    return {
      success: true,
      storageKey,
      storageProvider: DEFAULT_STORAGE_PROVIDER,
      fileSize: uploadContent.length,
      contentHash,
      encryptionData,
    };
  } catch (error) {
    console.error("Failed to upload recording:", error);
    return {
      success: false,
      storageKey,
      storageProvider: DEFAULT_STORAGE_PROVIDER,
      fileSize: 0,
      error:
        error instanceof Error ? error.message : "Unknown upload error",
    };
  }
}

/**
 * Downloads a recording from cloud storage
 *
 * @param storageKey - Storage key of the recording
 * @param decrypt - Whether to decrypt the content
 * @param encryptionIv - IV for decryption (required if decrypt is true)
 * @param encryptionKeyId - Key ID for decryption (required if decrypt is true)
 * @returns Download result with content
 */
export async function downloadRecording(
  storageKey: string,
  decrypt: boolean = false,
  encryptionIv?: string,
  encryptionKeyId?: string
): Promise<RecordingDownloadResult> {
  try {
    const storage = getStorageInstance();

    // For R2, we use presigned URLs instead of direct download
    // This is because R2Storage doesn't support getStream
    const presignedUrl = await storage.getPresignedUrl(storageKey);

    // Fetch the content from the presigned URL
    const response = await fetch(presignedUrl);

    if (!response.ok) {
      throw new RecordingError(
        RecordingErrorCode.DOWNLOAD_FAILED,
        `Failed to download recording: ${response.statusText}`
      );
    }

    let content: Buffer = Buffer.from(await response.arrayBuffer());

    // Decrypt if requested
    if (decrypt && encryptionIv && encryptionKeyId) {
      content = decryptRecording({
        encryptedContent: content,
        iv: encryptionIv,
        keyId: encryptionKeyId,
      });
    }

    // Extract filename from storage key
    const filename = storageKey.split("/").pop() || "recording";

    // Determine content type from filename
    const format = filename.split(".").pop() || "wav";
    const contentType = getContentType(format);

    return {
      success: true,
      content,
      filename,
      contentType,
    };
  } catch (error) {
    console.error("Failed to download recording:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Unknown download error",
    };
  }
}

/**
 * Gets a presigned URL for downloading a recording
 *
 * @param storageKey - Storage key of the recording
 * @returns Presigned URL result
 */
export async function getRecordingPresignedUrl(
  storageKey: string
): Promise<RecordingDownloadResult> {
  try {
    const storage = getStorageInstance();
    const presignedUrl = await storage.getPresignedUrl(storageKey);

    return {
      success: true,
      presignedUrl,
    };
  } catch (error) {
    console.error("Failed to get presigned URL:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Unknown error getting presigned URL",
    };
  }
}

/**
 * Gets a presigned URL for uploading a recording
 *
 * @param storageKey - Storage key for the upload
 * @param contentType - Content type of the file
 * @returns Presigned upload URL
 */
export async function getRecordingUploadUrl(
  storageKey: string,
  contentType: string = "audio/wav"
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const storage = getStorageInstance();
    const url = await storage.getPresignedUploadUrl(storageKey, contentType);

    return {
      success: true,
      url,
    };
  } catch (error) {
    console.error("Failed to get upload URL:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Unknown error getting upload URL",
    };
  }
}

/**
 * Deletes a recording from cloud storage
 *
 * @param storageKey - Storage key of the recording to delete
 * @returns Delete result
 */
export async function deleteRecording(
  storageKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const storage = getStorageInstance();
    await storage.delete(storageKey);

    return { success: true };
  } catch (error) {
    console.error("Failed to delete recording:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Unknown delete error",
    };
  }
}

/**
 * Deletes multiple recordings from cloud storage
 *
 * @param storageKeys - Array of storage keys to delete
 * @returns Batch delete result
 */
export async function deleteRecordings(
  storageKeys: string[]
): Promise<{
  success: boolean;
  deleted: number;
  failed: number;
  errors: Array<{ key: string; error: string }>;
}> {
  const result = {
    success: true,
    deleted: 0,
    failed: 0,
    errors: [] as Array<{ key: string; error: string }>,
  };

  for (const key of storageKeys) {
    const deleteResult = await deleteRecording(key);
    if (deleteResult.success) {
      result.deleted++;
    } else {
      result.failed++;
      result.errors.push({ key, error: deleteResult.error || "Unknown error" });
    }
  }

  result.success = result.failed === 0;
  return result;
}

/**
 * Downloads a recording from a FusionPBX URL
 *
 * @param url - FusionPBX recording URL
 * @param timeoutMs - Download timeout in milliseconds
 * @returns Downloaded content buffer
 */
export async function downloadFromFusionPBX(
  url: string,
  timeoutMs: number = 30000
): Promise<Buffer> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        // Add any required FusionPBX authentication headers here
        // These would typically come from environment variables
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new RecordingError(
        RecordingErrorCode.DOWNLOAD_FAILED,
        `Failed to download from FusionPBX: ${response.status} ${response.statusText}`
      );
    }

    return Buffer.from(await response.arrayBuffer());
  } catch (error) {
    if (error instanceof RecordingError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new RecordingError(
        RecordingErrorCode.DOWNLOAD_TIMEOUT,
        `Download from FusionPBX timed out after ${timeoutMs}ms`
      );
    }

    throw new RecordingError(
      RecordingErrorCode.DOWNLOAD_FAILED,
      `Failed to download from FusionPBX: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Validates audio file format by checking magic bytes
 *
 * @param content - File content buffer
 * @returns Detected format or null if unknown
 */
export function detectAudioFormat(content: Buffer): string | null {
  if (content.length < 12) {
    return null;
  }

  // WAV: "RIFF" + size + "WAVE"
  if (
    content[0] === 0x52 && // R
    content[1] === 0x49 && // I
    content[2] === 0x46 && // F
    content[3] === 0x46 && // F
    content[8] === 0x57 && // W
    content[9] === 0x41 && // A
    content[10] === 0x56 && // V
    content[11] === 0x45 // E
  ) {
    return "wav";
  }

  // MP3: ID3 tag or frame sync
  if (
    (content[0] === 0x49 && content[1] === 0x44 && content[2] === 0x33) || // ID3
    (content[0] === 0xff && (content[1] & 0xe0) === 0xe0) // Frame sync
  ) {
    return "mp3";
  }

  // OGG: "OggS"
  if (
    content[0] === 0x4f && // O
    content[1] === 0x67 && // g
    content[2] === 0x67 && // g
    content[3] === 0x53 // S
  ) {
    return "ogg";
  }

  // FLAC: "fLaC"
  if (
    content[0] === 0x66 && // f
    content[1] === 0x4c && // L
    content[2] === 0x61 && // a
    content[3] === 0x43 // C
  ) {
    return "flac";
  }

  return null;
}

/**
 * Validates that content is a valid audio file
 *
 * @param content - File content buffer
 * @param expectedFormat - Expected format (optional)
 * @returns Validation result
 */
export function validateAudioContent(
  content: Buffer,
  expectedFormat?: string
): { valid: boolean; detectedFormat: string | null; error?: string } {
  const detectedFormat = detectAudioFormat(content);

  if (!detectedFormat) {
    return {
      valid: false,
      detectedFormat: null,
      error: "Unable to detect audio format - file may be corrupted or unsupported",
    };
  }

  if (expectedFormat && detectedFormat !== expectedFormat.toLowerCase()) {
    return {
      valid: false,
      detectedFormat,
      error: `Expected ${expectedFormat} but detected ${detectedFormat}`,
    };
  }

  return {
    valid: true,
    detectedFormat,
  };
}
