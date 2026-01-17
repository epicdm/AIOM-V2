/**
 * AES-256-GCM encryption and decryption utilities
 *
 * This module provides secure encryption for sensitive data like SIP credentials.
 * Uses AES-256-GCM for authenticated encryption.
 */

import crypto from "crypto";
import {
  EncryptedData,
  EncryptResult,
  EncryptionError,
  EncryptionErrorCode,
} from "./types";

// Constants
const ALGORITHM = "aes-256-gcm" as const;
const IV_LENGTH = 12; // 96 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits

/**
 * Validates that the encryption key is the correct length
 */
function validateKey(key: Buffer): void {
  if (!key || key.length !== KEY_LENGTH) {
    throw new EncryptionError(
      EncryptionErrorCode.INVALID_KEY,
      `Encryption key must be exactly ${KEY_LENGTH} bytes (${KEY_LENGTH * 8} bits)`
    );
  }
}

/**
 * Encrypts plaintext using AES-256-GCM
 *
 * @param plaintext - The string to encrypt
 * @param key - 32-byte encryption key
 * @param aad - Optional additional authenticated data
 * @returns Encrypted data structure and serialized string
 */
export function encrypt(
  plaintext: string,
  key: Buffer,
  aad?: Buffer
): EncryptResult {
  validateKey(key);

  try {
    // Generate a random IV for each encryption
    const iv = crypto.randomBytes(IV_LENGTH);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });

    // Add AAD if provided
    if (aad) {
      cipher.setAAD(aad);
    }

    // Encrypt the plaintext
    const ciphertext = Buffer.concat([
      cipher.update(plaintext, "utf8"),
      cipher.final(),
    ]);

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    const data: EncryptedData = {
      ciphertext: ciphertext.toString("base64"),
      iv: iv.toString("base64"),
      authTag: authTag.toString("base64"),
      algorithm: ALGORITHM,
      version: 1,
    };

    return {
      encrypted: JSON.stringify(data),
      data,
    };
  } catch (error) {
    if (error instanceof EncryptionError) {
      throw error;
    }
    throw new EncryptionError(
      EncryptionErrorCode.ENCRYPTION_FAILED,
      `Encryption failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Decrypts data encrypted with AES-256-GCM
 *
 * @param encryptedString - JSON string of encrypted data or EncryptedData object
 * @param key - 32-byte encryption key (same key used for encryption)
 * @param aad - Optional additional authenticated data (must match encryption AAD)
 * @returns Decrypted plaintext string
 */
export function decrypt(
  encryptedString: string | EncryptedData,
  key: Buffer,
  aad?: Buffer
): string {
  validateKey(key);

  try {
    // Parse encrypted data if string
    const data: EncryptedData =
      typeof encryptedString === "string"
        ? JSON.parse(encryptedString)
        : encryptedString;

    // Validate data structure
    if (
      !data.ciphertext ||
      !data.iv ||
      !data.authTag ||
      data.algorithm !== ALGORITHM
    ) {
      throw new EncryptionError(
        EncryptionErrorCode.INVALID_DATA,
        "Invalid encrypted data structure"
      );
    }

    // Decode from base64
    const ciphertext = Buffer.from(data.ciphertext, "base64");
    const iv = Buffer.from(data.iv, "base64");
    const authTag = Buffer.from(data.authTag, "base64");

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });

    // Set auth tag
    decipher.setAuthTag(authTag);

    // Add AAD if provided
    if (aad) {
      decipher.setAAD(aad);
    }

    // Decrypt
    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return plaintext.toString("utf8");
  } catch (error) {
    if (error instanceof EncryptionError) {
      throw error;
    }
    throw new EncryptionError(
      EncryptionErrorCode.DECRYPTION_FAILED,
      `Decryption failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Generates a cryptographically secure encryption key
 *
 * @returns 32-byte random key as Buffer
 */
export function generateKey(): Buffer {
  return crypto.randomBytes(KEY_LENGTH);
}

/**
 * Generates a key as a hex string for environment variable storage
 *
 * @returns 64-character hex string representing a 32-byte key
 */
export function generateKeyHex(): string {
  return generateKey().toString("hex");
}

/**
 * Converts a hex string key to a Buffer
 *
 * @param hexKey - 64-character hex string
 * @returns 32-byte Buffer
 */
export function keyFromHex(hexKey: string): Buffer {
  const key = Buffer.from(hexKey, "hex");
  validateKey(key);
  return key;
}

/**
 * Checks if a string appears to be encrypted data
 *
 * @param value - String to check
 * @returns true if the string appears to be encrypted
 */
export function isEncrypted(value: string): boolean {
  try {
    const data = JSON.parse(value);
    return (
      data.algorithm === ALGORITHM &&
      data.version === 1 &&
      typeof data.ciphertext === "string" &&
      typeof data.iv === "string" &&
      typeof data.authTag === "string"
    );
  } catch {
    return false;
  }
}
