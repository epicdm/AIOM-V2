/**
 * SIP Provisioning Types
 *
 * Type definitions for the SIP provisioning service and FlexiSIP integration.
 */

/**
 * FlexiSIP server configuration
 */
export interface FlexiSIPConfig {
  serverUrl: string;
  apiKey: string;
  adminUsername?: string;
  adminPassword?: string;
  domain: string;
}

/**
 * SIP account creation request
 */
export interface CreateSipAccountRequest {
  username: string;
  password: string;
  domain: string;
  displayName?: string;
  phoneNumber?: string;
  enabled?: boolean;
}

/**
 * SIP account from FlexiSIP server
 */
export interface FlexiSIPAccount {
  id: string;
  username: string;
  domain: string;
  displayName?: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * FlexiSIP server response wrapper
 */
export interface FlexiSIPResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * SIP provisioning input for creating new credentials
 */
export interface ProvisioningInput {
  userId: string;
  phoneNumber: string;
  displayName?: string;
  deviceId?: string;
  transportProtocol?: "UDP" | "TCP" | "TLS";
}

/**
 * Result from provisioning operation
 */
export interface ProvisioningResult {
  success: boolean;
  credentials?: {
    id: string;
    sipUsername: string;
    sipPassword: string;
    sipDomain: string;
    sipUri: string;
    phoneNumber: string;
    displayName: string | null;
    transportProtocol: string;
    codecPreferences: string[];
    stunTurnConfig: {
      stunServers: string[];
      turnServers?: {
        url: string;
        username: string;
        credential: string;
      }[];
    } | null;
    provisionedAt: Date;
  };
  error?: {
    code: string;
    message: string;
  };
}

/**
 * SIP account update request
 */
export interface UpdateSipAccountRequest {
  displayName?: string;
  password?: string;
  enabled?: boolean;
}

/**
 * SIP registration status
 */
export interface RegistrationStatus {
  registered: boolean;
  contact?: string;
  userAgent?: string;
  expires?: number;
  lastRegisteredAt?: string;
}

/**
 * Server health status
 */
export interface ServerHealthStatus {
  healthy: boolean;
  version?: string;
  uptime?: number;
  activeRegistrations?: number;
  error?: string;
}

/**
 * Provisioning error codes
 */
export enum ProvisioningErrorCode {
  SERVER_UNAVAILABLE = "SERVER_UNAVAILABLE",
  AUTHENTICATION_FAILED = "AUTHENTICATION_FAILED",
  ACCOUNT_EXISTS = "ACCOUNT_EXISTS",
  INVALID_PHONE_NUMBER = "INVALID_PHONE_NUMBER",
  QUOTA_EXCEEDED = "QUOTA_EXCEEDED",
  INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
  ACCOUNT_NOT_FOUND = "ACCOUNT_NOT_FOUND",
  ACCOUNT_DISABLED = "ACCOUNT_DISABLED",
  INTERNAL_ERROR = "INTERNAL_ERROR",
  CONFIGURATION_ERROR = "CONFIGURATION_ERROR",
}

/**
 * Provisioning error class
 */
export class ProvisioningError extends Error {
  constructor(
    public code: ProvisioningErrorCode,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ProvisioningError";
  }
}
