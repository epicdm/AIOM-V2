/**
 * SIP Provisioning Service
 *
 * Main service that orchestrates SIP account provisioning on the FlexiSIP server
 * and manages credentials for mobile apps.
 *
 * Features:
 * - Account lifecycle management (create, suspend, revoke)
 * - Automatic credential generation and encryption
 * - FlexiSIP server synchronization
 * - Registration status monitoring
 * - Password regeneration with server sync
 */

import type {
  FlexiSIPConfig,
  ProvisioningInput,
  ProvisioningResult,
  RegistrationStatus,
  ServerHealthStatus,
} from "./types";
import {
  ProvisioningError,
  ProvisioningErrorCode,
} from "./types";
import { FlexiSIPClient, getFlexiSIPConfig } from "./flexisip-client";
import {
  provisionSipCredential,
  getSipCredentialById,
  getUserSipCredentials,
  getActiveSipCredentialByPhoneNumber,
  suspendSipCredential,
  reactivateSipCredential,
  revokeSipCredential,
  regenerateSipPassword,
  updateLastRegistration,
  userHasActiveSipCredentials,
  getSipCredentialByUsername,
  type SipCredentialResult,
  type SipCredentialSummary,
} from "~/data-access/sip-credentials";

/**
 * Maximum number of SIP credentials a user can have
 */
const MAX_CREDENTIALS_PER_USER = 5;

/**
 * SIP Provisioning Service
 *
 * Orchestrates provisioning of SIP accounts on FlexiSIP server
 * and manages local credential storage.
 */
export class SipProvisioningService {
  private flexiSipClient: FlexiSIPClient | null = null;
  private config: FlexiSIPConfig | null = null;

  /**
   * Initialize the service with FlexiSIP configuration
   */
  constructor(config?: FlexiSIPConfig) {
    this.config = config || getFlexiSIPConfig();
    if (this.config) {
      this.flexiSipClient = new FlexiSIPClient(this.config);
    }
  }

  /**
   * Check if the service is configured and ready
   */
  isConfigured(): boolean {
    return this.flexiSipClient !== null;
  }

  /**
   * Get server health status
   */
  async getServerHealth(): Promise<ServerHealthStatus> {
    if (!this.flexiSipClient) {
      return {
        healthy: false,
        error: "FlexiSIP server not configured",
      };
    }

    return this.flexiSipClient.getServerHealth();
  }

  /**
   * Provision a new SIP account
   *
   * This method:
   * 1. Validates the request
   * 2. Generates credentials locally
   * 3. Creates account on FlexiSIP server (if configured)
   * 4. Stores encrypted credentials in database
   */
  async provisionAccount(input: ProvisioningInput): Promise<ProvisioningResult> {
    // Validate phone number format (E.164)
    if (!this.isValidPhoneNumber(input.phoneNumber)) {
      return {
        success: false,
        error: {
          code: ProvisioningErrorCode.INVALID_PHONE_NUMBER,
          message: "Phone number must be in E.164 format (e.g., +1234567890)",
        },
      };
    }

    // Check if user already has active credentials for this phone
    const existingCredential = await getActiveSipCredentialByPhoneNumber(
      input.userId,
      input.phoneNumber
    );

    if (existingCredential) {
      // Return existing credentials instead of creating new ones
      return {
        success: true,
        credentials: {
          id: existingCredential.id,
          sipUsername: existingCredential.sipUsername,
          sipPassword: existingCredential.sipPassword,
          sipDomain: existingCredential.sipDomain,
          sipUri: existingCredential.sipUri,
          phoneNumber: existingCredential.phoneNumber,
          displayName: existingCredential.displayName,
          transportProtocol: existingCredential.transportProtocol,
          codecPreferences: existingCredential.codecPreferences,
          stunTurnConfig: existingCredential.stunTurnConfig,
          provisionedAt: existingCredential.provisionedAt,
        },
      };
    }

    // Check user's credential count
    const userCredentials = await getUserSipCredentials(input.userId);
    if (userCredentials.length >= MAX_CREDENTIALS_PER_USER) {
      return {
        success: false,
        error: {
          code: ProvisioningErrorCode.QUOTA_EXCEEDED,
          message: `Maximum ${MAX_CREDENTIALS_PER_USER} SIP credentials per user`,
        },
      };
    }

    try {
      // Provision credentials locally (this generates username/password)
      const credentials = await provisionSipCredential({
        userId: input.userId,
        phoneNumber: input.phoneNumber,
        displayName: input.displayName,
        sipDomain: this.config?.domain,
        transportProtocol: input.transportProtocol,
      });

      // Sync with FlexiSIP server if configured
      if (this.flexiSipClient) {
        try {
          await this.flexiSipClient.createAccount({
            username: credentials.sipUsername,
            password: credentials.sipPassword,
            domain: credentials.sipDomain,
            displayName: credentials.displayName || undefined,
            phoneNumber: credentials.phoneNumber,
            enabled: true,
          });
        } catch (serverError) {
          // Log but don't fail - local credentials are still valid
          // Server sync can be retried later
          console.error(
            "[SipProvisioningService] Failed to sync with FlexiSIP server:",
            serverError
          );
        }
      }

      return {
        success: true,
        credentials: {
          id: credentials.id,
          sipUsername: credentials.sipUsername,
          sipPassword: credentials.sipPassword,
          sipDomain: credentials.sipDomain,
          sipUri: credentials.sipUri,
          phoneNumber: credentials.phoneNumber,
          displayName: credentials.displayName,
          transportProtocol: credentials.transportProtocol,
          codecPreferences: credentials.codecPreferences,
          stunTurnConfig: credentials.stunTurnConfig,
          provisionedAt: credentials.provisionedAt,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Provisioning failed";
      return {
        success: false,
        error: {
          code: ProvisioningErrorCode.INTERNAL_ERROR,
          message,
        },
      };
    }
  }

  /**
   * Get SIP credentials by ID
   */
  async getCredentials(credentialId: string): Promise<SipCredentialResult | null> {
    return getSipCredentialById(credentialId);
  }

  /**
   * Get all SIP credentials for a user
   */
  async getUserCredentials(userId: string): Promise<SipCredentialSummary[]> {
    return getUserSipCredentials(userId);
  }

  /**
   * Check if user has any active SIP credentials
   */
  async userHasActiveCredentials(userId: string): Promise<boolean> {
    return userHasActiveSipCredentials(userId);
  }

  /**
   * Suspend SIP credentials
   */
  async suspendCredentials(
    credentialId: string,
    reason: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get credential to sync with server
      const credential = await getSipCredentialById(credentialId);
      if (!credential) {
        return { success: false, error: "Credential not found" };
      }

      // Disable on FlexiSIP server
      if (this.flexiSipClient) {
        try {
          await this.flexiSipClient.disableAccount(credential.sipUsername);
        } catch (error) {
          console.error("[SipProvisioningService] Failed to disable on server:", error);
        }
      }

      // Update local record
      await suspendSipCredential(credentialId, reason);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Suspension failed",
      };
    }
  }

  /**
   * Reactivate suspended SIP credentials
   */
  async reactivateCredentials(
    credentialId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get credential to sync with server
      const credential = await getSipCredentialById(credentialId);
      if (!credential) {
        return { success: false, error: "Credential not found" };
      }

      if (credential.status !== "suspended") {
        return { success: false, error: "Credential is not suspended" };
      }

      // Enable on FlexiSIP server
      if (this.flexiSipClient) {
        try {
          await this.flexiSipClient.enableAccount(credential.sipUsername);
        } catch (error) {
          console.error("[SipProvisioningService] Failed to enable on server:", error);
        }
      }

      // Update local record
      await reactivateSipCredential(credentialId);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Reactivation failed",
      };
    }
  }

  /**
   * Revoke SIP credentials permanently
   */
  async revokeCredentials(
    credentialId: string,
    reason: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get credential to sync with server
      const credential = await getSipCredentialById(credentialId);
      if (!credential) {
        return { success: false, error: "Credential not found" };
      }

      // Delete from FlexiSIP server
      if (this.flexiSipClient) {
        try {
          await this.flexiSipClient.deleteAccount(credential.sipUsername);
        } catch (error) {
          console.error("[SipProvisioningService] Failed to delete on server:", error);
        }
      }

      // Update local record
      await revokeSipCredential(credentialId, reason);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Revocation failed",
      };
    }
  }

  /**
   * Regenerate SIP password
   */
  async regeneratePassword(
    credentialId: string
  ): Promise<{ success: boolean; newPassword?: string; error?: string }> {
    try {
      // Get credential to sync with server
      const credential = await getSipCredentialById(credentialId);
      if (!credential) {
        return { success: false, error: "Credential not found" };
      }

      if (credential.status !== "active") {
        return { success: false, error: "Credential is not active" };
      }

      // Generate new password locally
      const result = await regenerateSipPassword(credentialId);
      if (!result) {
        return { success: false, error: "Failed to regenerate password" };
      }

      // Update on FlexiSIP server
      if (this.flexiSipClient) {
        try {
          await this.flexiSipClient.updateAccount(credential.sipUsername, {
            password: result.newPassword,
          });
        } catch (error) {
          console.error(
            "[SipProvisioningService] Failed to update password on server:",
            error
          );
        }
      }

      return { success: true, newPassword: result.newPassword };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Password regeneration failed",
      };
    }
  }

  /**
   * Get registration status from FlexiSIP server
   */
  async getRegistrationStatus(
    credentialId: string
  ): Promise<RegistrationStatus | null> {
    if (!this.flexiSipClient) {
      return null;
    }

    const credential = await getSipCredentialById(credentialId);
    if (!credential) {
      return null;
    }

    try {
      const status = await this.flexiSipClient.getRegistrationStatus(
        credential.sipUsername
      );

      // Update local tracking if registered
      if (status.registered && status.contact && status.userAgent) {
        await updateLastRegistration(
          credentialId,
          status.contact,
          status.userAgent
        );
      }

      return status;
    } catch (error) {
      console.error("[SipProvisioningService] Failed to get registration status:", error);
      return { registered: false };
    }
  }

  /**
   * Force deregistration of a SIP account
   */
  async forceDeregister(
    credentialId: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.flexiSipClient) {
      return { success: false, error: "FlexiSIP server not configured" };
    }

    const credential = await getSipCredentialById(credentialId);
    if (!credential) {
      return { success: false, error: "Credential not found" };
    }

    try {
      await this.flexiSipClient.forceDeregister(credential.sipUsername);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Deregistration failed",
      };
    }
  }

  /**
   * Validate SIP credentials by attempting authentication
   */
  async validateCredentials(
    credentialId: string
  ): Promise<{ valid: boolean; error?: string }> {
    const credential = await getSipCredentialById(credentialId);
    if (!credential) {
      return { valid: false, error: "Credential not found" };
    }

    if (credential.status !== "active") {
      return { valid: false, error: `Credential is ${credential.status}` };
    }

    // If server is configured, verify account exists
    if (this.flexiSipClient) {
      try {
        const account = await this.flexiSipClient.getAccount(credential.sipUsername);
        if (!account) {
          return { valid: false, error: "Account not found on server" };
        }
        if (!account.enabled) {
          return { valid: false, error: "Account is disabled on server" };
        }
      } catch (error) {
        // If we can't reach the server, assume valid locally
        console.error("[SipProvisioningService] Server validation failed:", error);
      }
    }

    return { valid: true };
  }

  /**
   * Sync local credential status with FlexiSIP server
   */
  async syncWithServer(credentialId: string): Promise<{ success: boolean; error?: string }> {
    if (!this.flexiSipClient) {
      return { success: false, error: "FlexiSIP server not configured" };
    }

    const credential = await getSipCredentialById(credentialId);
    if (!credential) {
      return { success: false, error: "Credential not found" };
    }

    try {
      const account = await this.flexiSipClient.getAccount(credential.sipUsername);

      if (!account) {
        // Account doesn't exist on server, create it
        await this.flexiSipClient.createAccount({
          username: credential.sipUsername,
          password: credential.sipPassword,
          domain: credential.sipDomain,
          displayName: credential.displayName || undefined,
          phoneNumber: credential.phoneNumber,
          enabled: credential.status === "active",
        });
      } else {
        // Update enabled status to match local
        const shouldBeEnabled = credential.status === "active";
        if (account.enabled !== shouldBeEnabled) {
          if (shouldBeEnabled) {
            await this.flexiSipClient.enableAccount(credential.sipUsername);
          } else {
            await this.flexiSipClient.disableAccount(credential.sipUsername);
          }
        }
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Sync failed",
      };
    }
  }

  /**
   * Validate phone number format (E.164)
   */
  private isValidPhoneNumber(phoneNumber: string): boolean {
    // E.164 format: + followed by 1-15 digits
    return /^\+?[1-9]\d{1,14}$/.test(phoneNumber);
  }
}

// Singleton instance
let sipProvisioningService: SipProvisioningService | null = null;

/**
 * Get the SIP provisioning service instance
 */
export function getSipProvisioningService(): SipProvisioningService {
  if (!sipProvisioningService) {
    sipProvisioningService = new SipProvisioningService();
  }
  return sipProvisioningService;
}

/**
 * Reset the service instance (for testing)
 */
export function resetSipProvisioningService(): void {
  sipProvisioningService = null;
}
