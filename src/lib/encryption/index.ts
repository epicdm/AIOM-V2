/**
 * Encryption Utilities
 *
 * Provides AES-256-GCM encryption for sensitive data like SIP credentials.
 *
 * Usage:
 * ```typescript
 * import { encryptSensitiveField, decryptSensitiveField } from "~/lib/encryption";
 *
 * // Encrypt a value before storing
 * const encrypted = encryptSensitiveField("mySecretPassword");
 *
 * // Decrypt a value after retrieval
 * const decrypted = decryptSensitiveField(encrypted);
 * ```
 */

import {
  encrypt,
  decrypt,
  generateKey,
  generateKeyHex,
  keyFromHex,
  isEncrypted,
} from "./cipher";
import {
  EncryptedData,
  EncryptResult,
  EncryptionError,
  EncryptionErrorCode,
} from "./types";

// Environment variable key name
const ENCRYPTION_KEY_ENV = "SIP_ENCRYPTION_KEY";

// Cached key to avoid repeated environment variable access
let cachedKey: Buffer | null = null;

/**
 * Gets the encryption key from environment variable
 *
 * @returns Buffer containing the 32-byte encryption key
 * @throws EncryptionError if key is not configured
 */
function getEncryptionKey(): Buffer {
  if (cachedKey) {
    return cachedKey;
  }

  const keyHex = process.env[ENCRYPTION_KEY_ENV];

  if (!keyHex) {
    throw new EncryptionError(
      EncryptionErrorCode.KEY_NOT_CONFIGURED,
      `Encryption key not configured. Set ${ENCRYPTION_KEY_ENV} environment variable with a 64-character hex string. Generate one with: import { generateKeyHex } from "~/lib/encryption"; console.log(generateKeyHex());`
    );
  }

  cachedKey = keyFromHex(keyHex);
  return cachedKey;
}

/**
 * Clears the cached encryption key (useful for testing)
 */
export function clearKeyCache(): void {
  cachedKey = null;
}

/**
 * Encrypts a sensitive field value for database storage
 *
 * @param value - The plaintext value to encrypt
 * @returns JSON string containing encrypted data
 */
export function encryptSensitiveField(value: string): string {
  const key = getEncryptionKey();
  const result = encrypt(value, key);
  return result.encrypted;
}

/**
 * Decrypts a sensitive field value from database storage
 *
 * @param encryptedValue - The encrypted JSON string from the database
 * @returns Decrypted plaintext value
 */
export function decryptSensitiveField(encryptedValue: string): string {
  // If it's not encrypted (plain text from before encryption was implemented),
  // return as-is for backwards compatibility
  if (!isEncrypted(encryptedValue)) {
    return encryptedValue;
  }

  const key = getEncryptionKey();
  return decrypt(encryptedValue, key);
}

/**
 * Checks if a field value is encrypted
 *
 * @param value - The value to check
 * @returns true if the value appears to be encrypted
 */
export function isFieldEncrypted(value: string): boolean {
  return isEncrypted(value);
}

// Re-export utilities for key generation
export {
  generateKey,
  generateKeyHex,
  keyFromHex,
  encrypt,
  decrypt,
  isEncrypted,
};

// Re-export types
export type { EncryptedData, EncryptResult };
export { EncryptionError, EncryptionErrorCode };
