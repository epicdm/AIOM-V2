/**
 * Types for encryption utilities
 */

/**
 * Encrypted data structure containing all components needed for decryption
 */
export interface EncryptedData {
  /** Base64-encoded ciphertext */
  ciphertext: string;
  /** Base64-encoded initialization vector */
  iv: string;
  /** Base64-encoded authentication tag (GCM mode) */
  authTag: string;
  /** Encryption algorithm identifier */
  algorithm: "aes-256-gcm";
  /** Version for future compatibility */
  version: 1;
}

/**
 * Configuration options for encryption
 */
export interface EncryptionConfig {
  /** Encryption key (32 bytes for AES-256) */
  key: Buffer;
  /** Optional additional authenticated data */
  aad?: Buffer;
}

/**
 * Result of encryption operation
 */
export interface EncryptResult {
  /** Serialized encrypted data as JSON string */
  encrypted: string;
  /** Raw encrypted data object */
  data: EncryptedData;
}

/**
 * Error codes for encryption operations
 */
export enum EncryptionErrorCode {
  INVALID_KEY = "INVALID_KEY",
  ENCRYPTION_FAILED = "ENCRYPTION_FAILED",
  DECRYPTION_FAILED = "DECRYPTION_FAILED",
  INVALID_DATA = "INVALID_DATA",
  KEY_NOT_CONFIGURED = "KEY_NOT_CONFIGURED",
}

/**
 * Custom error class for encryption operations
 */
export class EncryptionError extends Error {
  constructor(
    public code: EncryptionErrorCode,
    message: string
  ) {
    super(message);
    this.name = "EncryptionError";
  }
}
