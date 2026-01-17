/**
 * Recording Encryption Module
 *
 * Provides AES-256-GCM encryption for call recordings with key management
 * and rotation support.
 */

import crypto from "crypto";
import {
  encrypt as encryptCore,
  decrypt as decryptCore,
  generateKeyHex,
  keyFromHex,
} from "~/lib/encryption";
import {
  RecordingError,
  RecordingErrorCode,
  type EncryptedRecordingData,
  type EncryptRecordingOptions,
  type DecryptRecordingOptions,
  type KeyRotationResult,
} from "./types";

// Constants
const ALGORITHM = "aes-256-gcm" as const;
const IV_LENGTH = 12; // 96 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits

// Environment variable for master key
const RECORDING_ENCRYPTION_KEY_ENV = "RECORDING_ENCRYPTION_KEY";

// Cache for master key
let cachedMasterKey: Buffer | null = null;

/**
 * Gets the master encryption key from environment variable
 */
function getMasterKey(): Buffer {
  if (cachedMasterKey) {
    return cachedMasterKey;
  }

  const keyHex = process.env[RECORDING_ENCRYPTION_KEY_ENV];

  if (!keyHex) {
    throw new RecordingError(
      RecordingErrorCode.NO_ENCRYPTION_KEY,
      `Recording encryption key not configured. Set ${RECORDING_ENCRYPTION_KEY_ENV} environment variable with a 64-character hex string.`
    );
  }

  cachedMasterKey = keyFromHex(keyHex);
  return cachedMasterKey;
}

/**
 * Clears the cached master key (useful for testing)
 */
export function clearMasterKeyCache(): void {
  cachedMasterKey = null;
}

/**
 * Generates a content hash (SHA-256) for integrity verification
 */
export function generateContentHash(content: Buffer): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

/**
 * Encrypts a recording file using AES-256-GCM
 *
 * @param options - Encryption options including the content buffer
 * @returns Encrypted recording data with IV, key ID, and content hash
 */
export function encryptRecording(
  options: EncryptRecordingOptions
): EncryptedRecordingData {
  const { content, keyId } = options;

  try {
    const masterKey = getMasterKey();

    // Generate random IV for this encryption
    const iv = crypto.randomBytes(IV_LENGTH);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, masterKey, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });

    // Encrypt the content
    const encryptedContent = Buffer.concat([
      cipher.update(content),
      cipher.final(),
      cipher.getAuthTag(),
    ]);

    // Generate content hash for integrity verification
    const contentHash = generateContentHash(content);

    return {
      encryptedContent,
      iv: iv.toString("base64"),
      algorithm: ALGORITHM,
      keyId: keyId || "master-key-v1",
      contentHash,
    };
  } catch (error) {
    if (error instanceof RecordingError) {
      throw error;
    }
    throw new RecordingError(
      RecordingErrorCode.ENCRYPTION_FAILED,
      `Failed to encrypt recording: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Decrypts an encrypted recording
 *
 * @param options - Decryption options including encrypted content, IV, and key ID
 * @returns Decrypted content buffer
 */
export function decryptRecording(options: DecryptRecordingOptions): Buffer {
  const { encryptedContent, iv, keyId } = options;

  try {
    const masterKey = getMasterKey();

    // Decode IV from base64
    const ivBuffer = Buffer.from(iv, "base64");

    // Extract auth tag from end of encrypted content
    const authTag = encryptedContent.slice(-AUTH_TAG_LENGTH);
    const ciphertext = encryptedContent.slice(0, -AUTH_TAG_LENGTH);

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, masterKey, ivBuffer, {
      authTagLength: AUTH_TAG_LENGTH,
    });

    // Set auth tag
    decipher.setAuthTag(authTag);

    // Decrypt
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return decrypted;
  } catch (error) {
    if (error instanceof RecordingError) {
      throw error;
    }
    throw new RecordingError(
      RecordingErrorCode.DECRYPTION_FAILED,
      `Failed to decrypt recording: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Verifies the integrity of a decrypted recording
 *
 * @param content - Decrypted content buffer
 * @param expectedHash - Expected SHA-256 hash
 * @returns True if hash matches
 */
export function verifyContentIntegrity(
  content: Buffer,
  expectedHash: string
): boolean {
  const actualHash = generateContentHash(content);
  return actualHash === expectedHash;
}

/**
 * Encrypts a data encryption key with the master key
 * Used for storing DEKs in the database
 */
export function encryptDataKey(dataKey: Buffer): string {
  const masterKey = getMasterKey();
  const result = encryptCore(dataKey.toString("hex"), masterKey);
  return result.encrypted;
}

/**
 * Decrypts a data encryption key that was encrypted with the master key
 */
export function decryptDataKey(encryptedDataKey: string): Buffer {
  const masterKey = getMasterKey();
  const hexKey = decryptCore(encryptedDataKey, masterKey);
  return Buffer.from(hexKey, "hex");
}

/**
 * Generates a new data encryption key for a recording
 */
export function generateDataEncryptionKey(): {
  key: Buffer;
  keyHash: string;
} {
  const key = crypto.randomBytes(KEY_LENGTH);
  const keyHash = crypto.createHash("sha256").update(key).digest("hex");
  return { key, keyHash };
}

/**
 * Generates a new master encryption key (hex string for environment variable)
 */
export function generateMasterEncryptionKey(): string {
  return generateKeyHex();
}

/**
 * Encrypts a recording with a specific data encryption key
 * Used when per-recording keys are needed instead of master key
 */
export function encryptRecordingWithKey(
  content: Buffer,
  dataKey: Buffer
): { encryptedContent: Buffer; iv: string; contentHash: string } {
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, dataKey, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encryptedContent = Buffer.concat([
    cipher.update(content),
    cipher.final(),
    cipher.getAuthTag(),
  ]);

  return {
    encryptedContent,
    iv: iv.toString("base64"),
    contentHash: generateContentHash(content),
  };
}

/**
 * Decrypts a recording with a specific data encryption key
 */
export function decryptRecordingWithKey(
  encryptedContent: Buffer,
  iv: string,
  dataKey: Buffer
): Buffer {
  const ivBuffer = Buffer.from(iv, "base64");

  const authTag = encryptedContent.slice(-AUTH_TAG_LENGTH);
  const ciphertext = encryptedContent.slice(0, -AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, dataKey, ivBuffer, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

/**
 * Re-encrypts a recording with a new key (for key rotation)
 */
export async function reEncryptRecording(
  encryptedContent: Buffer,
  oldIv: string,
  oldKeyId: string,
  newKeyId: string,
  getKeyById: (keyId: string) => Promise<Buffer>
): Promise<EncryptedRecordingData> {
  try {
    // Get old key and decrypt
    const oldKey = await getKeyById(oldKeyId);
    const decrypted = decryptRecordingWithKey(encryptedContent, oldIv, oldKey);

    // Get new key and encrypt
    const newKey = await getKeyById(newKeyId);
    const result = encryptRecordingWithKey(decrypted, newKey);

    return {
      encryptedContent: result.encryptedContent,
      iv: result.iv,
      algorithm: ALGORITHM,
      keyId: newKeyId,
      contentHash: result.contentHash,
    };
  } catch (error) {
    throw new RecordingError(
      RecordingErrorCode.KEY_ROTATION_FAILED,
      `Failed to re-encrypt recording: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Validates that an encryption key is properly formatted
 */
export function validateEncryptionKey(keyHex: string): boolean {
  if (!keyHex || typeof keyHex !== "string") {
    return false;
  }

  // Key should be 64 hex characters (32 bytes)
  if (keyHex.length !== 64) {
    return false;
  }

  // Should only contain hex characters
  return /^[0-9a-fA-F]+$/.test(keyHex);
}
