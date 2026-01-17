/**
 * Mobile Authentication Types
 *
 * Types for mobile authentication flow integrating with Better Auth backend.
 * Handles token storage, refresh, and biometric authentication.
 */

// Token types
export interface MobileAuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // Unix timestamp in milliseconds
  issuedAt: number;
  tokenType: "bearer";
}

// Biometric authentication types
export type BiometricType = "fingerprint" | "face" | "iris" | "none";

export interface BiometricConfig {
  isAvailable: boolean;
  isEnrolled: boolean;
  biometricType: BiometricType;
  securityLevel: "strong" | "weak" | "none";
}

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
  errorCode?: BiometricErrorCode;
}

export type BiometricErrorCode =
  | "not_available"
  | "not_enrolled"
  | "user_cancelled"
  | "lockout"
  | "lockout_permanent"
  | "failed"
  | "unknown";

// Token storage types
export interface StoredCredentials {
  token: MobileAuthToken;
  userId: string;
  deviceId: string;
  biometricEnabled: boolean;
  lastAuthAt: number;
  createdAt: number;
}

// Mobile device info
export interface MobileDeviceInfo {
  deviceId: string;
  deviceName: string;
  platform: "ios" | "android" | "web";
  osVersion: string;
  appVersion: string;
  pushToken?: string;
}

// Auth state
export type MobileAuthState =
  | "unauthenticated"
  | "authenticated"
  | "token_expired"
  | "refreshing"
  | "biometric_required"
  | "loading";

export interface MobileAuthSession {
  state: MobileAuthState;
  user: MobileUser | null;
  token: MobileAuthToken | null;
  biometricConfig: BiometricConfig | null;
  deviceInfo: MobileDeviceInfo | null;
  lastError: string | null;
}

// Minimal user for mobile
export interface MobileUser {
  id: string;
  name: string;
  email: string;
  image?: string;
  isAdmin: boolean;
  plan: string;
}

// Auth actions
export interface MobileLoginRequest {
  email: string;
  password: string;
  deviceInfo: MobileDeviceInfo;
  rememberMe?: boolean;
}

export interface MobileLoginResponse {
  success: boolean;
  token?: MobileAuthToken;
  user?: MobileUser;
  error?: string;
  requiresBiometricSetup?: boolean;
}

export interface MobileRefreshRequest {
  refreshToken: string;
  deviceId: string;
}

export interface MobileRefreshResponse {
  success: boolean;
  token?: MobileAuthToken;
  error?: string;
}

export interface BiometricSetupRequest {
  userId: string;
  deviceId: string;
  enable: boolean;
}

export interface BiometricSetupResponse {
  success: boolean;
  error?: string;
}

// Token validation
export interface TokenValidationResult {
  isValid: boolean;
  isExpired: boolean;
  expiresIn: number; // milliseconds until expiration
  needsRefresh: boolean;
}

// Mobile auth events
export type MobileAuthEvent =
  | { type: "login_success"; user: MobileUser }
  | { type: "login_failure"; error: string }
  | { type: "logout" }
  | { type: "token_refreshed"; token: MobileAuthToken }
  | { type: "token_refresh_failed"; error: string }
  | { type: "biometric_auth_success" }
  | { type: "biometric_auth_failed"; error: string }
  | { type: "session_expired" };

// Storage keys
export const MOBILE_AUTH_STORAGE_KEYS = {
  CREDENTIALS: "mobile_auth_credentials",
  DEVICE_INFO: "mobile_auth_device_info",
  BIOMETRIC_ENABLED: "mobile_auth_biometric_enabled",
  LAST_ACTIVE_USER: "mobile_auth_last_user",
} as const;

// Token refresh thresholds
export const TOKEN_REFRESH_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes before expiry
export const TOKEN_CHECK_INTERVAL_MS = 60 * 1000; // Check every minute
export const BIOMETRIC_REAUTH_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours
