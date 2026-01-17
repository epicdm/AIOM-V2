/**
 * Biometric Authentication Service
 *
 * Handles device biometric authentication (fingerprint, face ID, etc.)
 * Uses the Web Authentication API when available.
 */

import {
  BiometricConfig,
  BiometricType,
  BiometricAuthResult,
  BiometricErrorCode,
} from "./types";

/**
 * Biometric Authentication Service
 *
 * Provides biometric authentication capabilities using:
 * - Web Authentication API (WebAuthn) for web
 * - Native biometric APIs for mobile (when in WebView)
 */
export class BiometricService {
  private static instance: BiometricService;
  private _config: BiometricConfig | null = null;

  private constructor() {}

  static getInstance(): BiometricService {
    if (!BiometricService.instance) {
      BiometricService.instance = new BiometricService();
    }
    return BiometricService.instance;
  }

  /**
   * Check if biometric authentication is available
   */
  async checkAvailability(): Promise<BiometricConfig> {
    if (this._config) {
      return this._config;
    }

    // Check for WebAuthn support
    const isWebAuthnAvailable =
      typeof window !== "undefined" &&
      window.PublicKeyCredential !== undefined &&
      typeof window.PublicKeyCredential === "function";

    if (!isWebAuthnAvailable) {
      this._config = {
        isAvailable: false,
        isEnrolled: false,
        biometricType: "none",
        securityLevel: "none",
      };
      return this._config;
    }

    try {
      // Check for platform authenticator (biometrics)
      const isPlatformAuthenticatorAvailable =
        await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();

      if (!isPlatformAuthenticatorAvailable) {
        this._config = {
          isAvailable: false,
          isEnrolled: false,
          biometricType: "none",
          securityLevel: "none",
        };
        return this._config;
      }

      // Detect biometric type based on platform
      const biometricType = this.detectBiometricType();

      this._config = {
        isAvailable: true,
        isEnrolled: true, // We can't know for sure without attempting auth
        biometricType,
        securityLevel: "strong",
      };

      return this._config;
    } catch (error) {
      console.error("Error checking biometric availability:", error);
      this._config = {
        isAvailable: false,
        isEnrolled: false,
        biometricType: "none",
        securityLevel: "none",
      };
      return this._config;
    }
  }

  /**
   * Detect the type of biometric available on the device
   */
  private detectBiometricType(): BiometricType {
    const userAgent = navigator.userAgent.toLowerCase();

    // iOS devices (iPhone X and later have Face ID)
    if (/iphone|ipad/.test(userAgent)) {
      // Check for newer devices that likely have Face ID
      // This is a heuristic - in a real app, use native APIs
      const isNewerIPhone = /iphone/.test(userAgent);
      if (isNewerIPhone) {
        // Most modern iPhones have Face ID, but some still have Touch ID
        // Default to fingerprint as it's more common across devices
        return "face";
      }
      return "fingerprint";
    }

    // Android devices - most use fingerprint
    if (/android/.test(userAgent)) {
      return "fingerprint";
    }

    // Desktop with Windows Hello or macOS Touch ID
    if (/macintosh|mac os x/.test(userAgent)) {
      return "fingerprint"; // Touch ID
    }

    if (/windows/.test(userAgent)) {
      return "face"; // Windows Hello often uses face recognition
    }

    return "fingerprint"; // Default to fingerprint
  }

  /**
   * Perform biometric authentication
   */
  async authenticate(reason: string = "Authenticate to continue"): Promise<BiometricAuthResult> {
    const config = await this.checkAvailability();

    if (!config.isAvailable) {
      return {
        success: false,
        error: "Biometric authentication is not available on this device",
        errorCode: "not_available",
      };
    }

    try {
      // Create a challenge for WebAuthn
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      // Generate a user ID
      const userId = new Uint8Array(16);
      crypto.getRandomValues(userId);

      // Try to use existing credentials or create new ones
      const result = await this.performWebAuthnAuth(challenge, userId, reason);
      return result;
    } catch (error) {
      return this.handleAuthError(error);
    }
  }

  /**
   * Perform WebAuthn authentication
   */
  private async performWebAuthnAuth(
    challenge: Uint8Array,
    userId: Uint8Array,
    _reason: string
  ): Promise<BiometricAuthResult> {
    try {
      // First try to get existing credentials
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: challenge as BufferSource,
          timeout: 60000,
          userVerification: "required",
          rpId: window.location.hostname,
        },
      });

      if (credential) {
        return { success: true };
      }

      // If no credentials exist, create new ones
      const newCredential = await navigator.credentials.create({
        publicKey: {
          challenge: challenge as BufferSource,
          rp: {
            name: "AIOM Mobile",
            id: window.location.hostname,
          },
          user: {
            id: userId as BufferSource,
            name: "user@example.com",
            displayName: "User",
          },
          pubKeyCredParams: [
            { alg: -7, type: "public-key" }, // ES256
            { alg: -257, type: "public-key" }, // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
            residentKey: "preferred",
          },
          timeout: 60000,
        },
      });

      if (newCredential) {
        return { success: true };
      }

      return {
        success: false,
        error: "Failed to authenticate",
        errorCode: "failed",
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Handle authentication errors
   */
  private handleAuthError(error: unknown): BiometricAuthResult {
    const err = error as Error;
    const errorMessage = err.message || "Unknown error";
    const errorName = err.name || "";

    // Map error to error code
    let errorCode: BiometricErrorCode = "unknown";

    if (errorName === "NotAllowedError") {
      if (errorMessage.includes("cancelled") || errorMessage.includes("cancel")) {
        errorCode = "user_cancelled";
      } else {
        errorCode = "failed";
      }
    } else if (errorName === "SecurityError") {
      errorCode = "not_available";
    } else if (errorName === "NotSupportedError") {
      errorCode = "not_available";
    } else if (errorMessage.includes("lockout")) {
      errorCode = errorMessage.includes("permanent") ? "lockout_permanent" : "lockout";
    }

    return {
      success: false,
      error: errorMessage,
      errorCode,
    };
  }

  /**
   * Get a user-friendly prompt message for biometric authentication
   */
  getPromptMessage(): string {
    const config = this._config;
    if (!config) {
      return "Authenticate with biometrics";
    }

    switch (config.biometricType) {
      case "face":
        return "Look at your device to authenticate";
      case "fingerprint":
        return "Touch the fingerprint sensor to authenticate";
      case "iris":
        return "Look at your device for iris scan";
      default:
        return "Authenticate with biometrics";
    }
  }

  /**
   * Get biometric type display name
   */
  getBiometricTypeName(): string {
    const config = this._config;
    if (!config) return "Biometrics";

    switch (config.biometricType) {
      case "face":
        return "Face ID";
      case "fingerprint":
        return "Touch ID / Fingerprint";
      case "iris":
        return "Iris Scan";
      default:
        return "Biometrics";
    }
  }

  /**
   * Reset cached config
   */
  resetConfig(): void {
    this._config = null;
  }
}

// Export singleton instance
export const biometricService = BiometricService.getInstance();
