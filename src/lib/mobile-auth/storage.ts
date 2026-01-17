/**
 * Mobile Auth Token Storage
 *
 * Secure storage layer for mobile authentication tokens.
 * Uses encrypted storage when available, falls back to localStorage.
 */

import {
  StoredCredentials,
  MobileAuthToken,
  MobileDeviceInfo,
  MOBILE_AUTH_STORAGE_KEYS,
  TokenValidationResult,
  TOKEN_REFRESH_THRESHOLD_MS,
} from "./types";

// Simple encryption for token storage (in production, use platform-specific secure storage)
const ENCRYPTION_KEY = "mobile_auth_v1";

function simpleEncrypt(data: string): string {
  // Simple XOR encryption - in production, use Web Crypto API or native secure storage
  const encoded = btoa(data);
  let result = "";
  for (let i = 0; i < encoded.length; i++) {
    result += String.fromCharCode(
      encoded.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length)
    );
  }
  return btoa(result);
}

function simpleDecrypt(data: string): string {
  try {
    const decoded = atob(data);
    let result = "";
    for (let i = 0; i < decoded.length; i++) {
      result += String.fromCharCode(
        decoded.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length)
      );
    }
    return atob(result);
  } catch {
    return "";
  }
}

/**
 * Mobile Auth Storage Service
 */
export class MobileAuthStorage {
  private static instance: MobileAuthStorage;

  private constructor() {}

  static getInstance(): MobileAuthStorage {
    if (!MobileAuthStorage.instance) {
      MobileAuthStorage.instance = new MobileAuthStorage();
    }
    return MobileAuthStorage.instance;
  }

  /**
   * Store credentials securely
   */
  async storeCredentials(credentials: StoredCredentials): Promise<void> {
    try {
      const encrypted = simpleEncrypt(JSON.stringify(credentials));
      localStorage.setItem(MOBILE_AUTH_STORAGE_KEYS.CREDENTIALS, encrypted);
    } catch (error) {
      console.error("Failed to store credentials:", error);
      throw new Error("Failed to store credentials");
    }
  }

  /**
   * Retrieve stored credentials
   */
  async getCredentials(): Promise<StoredCredentials | null> {
    try {
      const encrypted = localStorage.getItem(MOBILE_AUTH_STORAGE_KEYS.CREDENTIALS);
      if (!encrypted) return null;

      const decrypted = simpleDecrypt(encrypted);
      if (!decrypted) return null;

      return JSON.parse(decrypted) as StoredCredentials;
    } catch (error) {
      console.error("Failed to retrieve credentials:", error);
      return null;
    }
  }

  /**
   * Clear stored credentials
   */
  async clearCredentials(): Promise<void> {
    localStorage.removeItem(MOBILE_AUTH_STORAGE_KEYS.CREDENTIALS);
    localStorage.removeItem(MOBILE_AUTH_STORAGE_KEYS.BIOMETRIC_ENABLED);
    localStorage.removeItem(MOBILE_AUTH_STORAGE_KEYS.LAST_ACTIVE_USER);
  }

  /**
   * Update token in stored credentials
   */
  async updateToken(token: MobileAuthToken): Promise<void> {
    const credentials = await this.getCredentials();
    if (!credentials) {
      throw new Error("No credentials found to update");
    }

    credentials.token = token;
    credentials.lastAuthAt = Date.now();
    await this.storeCredentials(credentials);
  }

  /**
   * Store device info
   */
  async storeDeviceInfo(deviceInfo: MobileDeviceInfo): Promise<void> {
    try {
      localStorage.setItem(
        MOBILE_AUTH_STORAGE_KEYS.DEVICE_INFO,
        JSON.stringify(deviceInfo)
      );
    } catch (error) {
      console.error("Failed to store device info:", error);
    }
  }

  /**
   * Get device info
   */
  async getDeviceInfo(): Promise<MobileDeviceInfo | null> {
    try {
      const stored = localStorage.getItem(MOBILE_AUTH_STORAGE_KEYS.DEVICE_INFO);
      if (!stored) return null;
      return JSON.parse(stored) as MobileDeviceInfo;
    } catch {
      return null;
    }
  }

  /**
   * Set biometric enabled status
   */
  async setBiometricEnabled(enabled: boolean): Promise<void> {
    const credentials = await this.getCredentials();
    if (credentials) {
      credentials.biometricEnabled = enabled;
      await this.storeCredentials(credentials);
    }
    localStorage.setItem(
      MOBILE_AUTH_STORAGE_KEYS.BIOMETRIC_ENABLED,
      JSON.stringify(enabled)
    );
  }

  /**
   * Check if biometric is enabled
   */
  async isBiometricEnabled(): Promise<boolean> {
    const credentials = await this.getCredentials();
    if (credentials) {
      return credentials.biometricEnabled;
    }
    const stored = localStorage.getItem(MOBILE_AUTH_STORAGE_KEYS.BIOMETRIC_ENABLED);
    return stored ? JSON.parse(stored) : false;
  }

  /**
   * Store last active user ID
   */
  async setLastActiveUser(userId: string): Promise<void> {
    localStorage.setItem(MOBILE_AUTH_STORAGE_KEYS.LAST_ACTIVE_USER, userId);
  }

  /**
   * Get last active user ID
   */
  async getLastActiveUser(): Promise<string | null> {
    return localStorage.getItem(MOBILE_AUTH_STORAGE_KEYS.LAST_ACTIVE_USER);
  }

  /**
   * Validate stored token
   */
  async validateStoredToken(): Promise<TokenValidationResult> {
    const credentials = await this.getCredentials();

    if (!credentials || !credentials.token) {
      return {
        isValid: false,
        isExpired: true,
        expiresIn: 0,
        needsRefresh: true,
      };
    }

    const now = Date.now();
    const expiresIn = credentials.token.expiresAt - now;
    const isExpired = expiresIn <= 0;
    const needsRefresh = expiresIn <= TOKEN_REFRESH_THRESHOLD_MS;

    return {
      isValid: !isExpired,
      isExpired,
      expiresIn: Math.max(0, expiresIn),
      needsRefresh,
    };
  }

  /**
   * Generate a unique device ID
   */
  generateDeviceId(): string {
    const existingId = localStorage.getItem("mobile_device_id");
    if (existingId) return existingId;

    // Generate a unique device ID
    const newId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem("mobile_device_id", newId);
    return newId;
  }

  /**
   * Get or create device info
   */
  async getOrCreateDeviceInfo(): Promise<MobileDeviceInfo> {
    const existing = await this.getDeviceInfo();
    if (existing) return existing;

    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    let platform: "ios" | "android" | "web" = "web";
    if (/iphone|ipad|ipod/.test(userAgent)) {
      platform = "ios";
    } else if (/android/.test(userAgent)) {
      platform = "android";
    }

    // Create new device info
    const deviceInfo: MobileDeviceInfo = {
      deviceId: this.generateDeviceId(),
      deviceName: this.getDeviceName(),
      platform,
      osVersion: this.getOSVersion(),
      appVersion: "1.0.0", // Should come from app config
    };

    await this.storeDeviceInfo(deviceInfo);
    return deviceInfo;
  }

  private getDeviceName(): string {
    const userAgent = navigator.userAgent;

    // Try to extract device model from user agent
    if (/iPhone/.test(userAgent)) return "iPhone";
    if (/iPad/.test(userAgent)) return "iPad";
    if (/Android/.test(userAgent)) {
      const match = userAgent.match(/Android.*;\s*([^;)]+)/);
      if (match) return match[1].trim();
      return "Android Device";
    }

    // Browser on desktop
    if (/Chrome/.test(userAgent)) return "Chrome Browser";
    if (/Firefox/.test(userAgent)) return "Firefox Browser";
    if (/Safari/.test(userAgent)) return "Safari Browser";

    return "Unknown Device";
  }

  private getOSVersion(): string {
    const userAgent = navigator.userAgent;

    // iOS version
    const iosMatch = userAgent.match(/OS (\d+[._]\d+)/);
    if (iosMatch) return iosMatch[1].replace("_", ".");

    // Android version
    const androidMatch = userAgent.match(/Android\s+([\d.]+)/);
    if (androidMatch) return androidMatch[1];

    // Windows version
    const windowsMatch = userAgent.match(/Windows NT\s+([\d.]+)/);
    if (windowsMatch) return `Windows ${windowsMatch[1]}`;

    // macOS version
    const macMatch = userAgent.match(/Mac OS X\s+([\d_]+)/);
    if (macMatch) return `macOS ${macMatch[1].replace(/_/g, ".")}`;

    return "Unknown";
  }
}

// Export singleton instance
export const mobileAuthStorage = MobileAuthStorage.getInstance();
