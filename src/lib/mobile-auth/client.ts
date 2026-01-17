/**
 * Mobile Auth Client
 *
 * Main client for mobile authentication operations.
 * Integrates with Better Auth backend for token management.
 */

import { authClient } from "../auth-client";
import { mobileAuthStorage } from "./storage";
import { biometricService } from "./biometric";
import {
  MobileAuthToken,
  MobileAuthSession,
  MobileAuthState,
  MobileLoginRequest,
  MobileLoginResponse,
  MobileRefreshResponse,
  MobileUser,
  MobileDeviceInfo,
  BiometricConfig,
  TOKEN_REFRESH_THRESHOLD_MS,
  TOKEN_CHECK_INTERVAL_MS,
  BIOMETRIC_REAUTH_THRESHOLD_MS,
  StoredCredentials,
  MobileAuthEvent,
} from "./types";

type EventListener = (event: MobileAuthEvent) => void;

/**
 * Mobile Authentication Client
 *
 * Handles the complete mobile authentication lifecycle:
 * - Login with email/password
 * - Token storage and refresh
 * - Biometric authentication
 * - Session management
 */
export class MobileAuthClient {
  private static instance: MobileAuthClient;
  private _session: MobileAuthSession;
  private _refreshTimer: ReturnType<typeof setInterval> | null = null;
  private _eventListeners: Set<EventListener> = new Set();

  private constructor() {
    this._session = {
      state: "loading",
      user: null,
      token: null,
      biometricConfig: null,
      deviceInfo: null,
      lastError: null,
    };
  }

  static getInstance(): MobileAuthClient {
    if (!MobileAuthClient.instance) {
      MobileAuthClient.instance = new MobileAuthClient();
    }
    return MobileAuthClient.instance;
  }

  /**
   * Get current session
   */
  get session(): MobileAuthSession {
    return { ...this._session };
  }

  /**
   * Initialize the mobile auth client
   */
  async initialize(): Promise<MobileAuthSession> {
    try {
      // Get device info
      const deviceInfo = await mobileAuthStorage.getOrCreateDeviceInfo();
      this._session.deviceInfo = deviceInfo;

      // Check biometric availability
      const biometricConfig = await biometricService.checkAvailability();
      this._session.biometricConfig = biometricConfig;

      // Try to restore session from storage
      const credentials = await mobileAuthStorage.getCredentials();

      if (credentials) {
        const validation = await mobileAuthStorage.validateStoredToken();

        if (validation.isValid) {
          // Token is valid, restore session
          this._session.token = credentials.token;
          this._session.state = "authenticated";

          // Fetch user data
          await this.refreshUserData();

          // Check if biometric re-auth is needed
          if (credentials.biometricEnabled) {
            const timeSinceLastAuth = Date.now() - credentials.lastAuthAt;
            if (timeSinceLastAuth > BIOMETRIC_REAUTH_THRESHOLD_MS) {
              this._session.state = "biometric_required";
            }
          }

          // Start token refresh timer
          this.startTokenRefreshTimer();
        } else if (validation.needsRefresh && credentials.token.refreshToken) {
          // Token needs refresh
          await this.refreshToken();
        } else {
          // Token is expired and can't be refreshed
          this._session.state = "token_expired";
        }
      } else {
        this._session.state = "unauthenticated";
      }

      return this.session;
    } catch (error) {
      console.error("Failed to initialize mobile auth:", error);
      this._session.state = "unauthenticated";
      this._session.lastError = "Failed to initialize authentication";
      return this.session;
    }
  }

  /**
   * Login with email and password
   */
  async login(request: MobileLoginRequest): Promise<MobileLoginResponse> {
    try {
      this._session.state = "loading";
      this._session.lastError = null;

      // Call Better Auth sign in
      const result = await authClient.signIn.email({
        email: request.email,
        password: request.password,
        rememberMe: request.rememberMe,
      });

      if (result.error) {
        this._session.state = "unauthenticated";
        this._session.lastError = result.error.message || "Login failed";
        this.emitEvent({ type: "login_failure", error: this._session.lastError });
        return {
          success: false,
          error: this._session.lastError,
        };
      }

      // Get session data
      const sessionResult = await authClient.getSession();

      if (!sessionResult.data?.session || !sessionResult.data?.user) {
        this._session.state = "unauthenticated";
        this._session.lastError = "Failed to get session after login";
        this.emitEvent({ type: "login_failure", error: this._session.lastError });
        return {
          success: false,
          error: this._session.lastError,
        };
      }

      const { session, user } = sessionResult.data;

      // Create mobile token
      const token: MobileAuthToken = {
        accessToken: session.token,
        expiresAt: new Date(session.expiresAt).getTime(),
        issuedAt: Date.now(),
        tokenType: "bearer",
      };

      // Create mobile user
      const mobileUser: MobileUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image || undefined,
        isAdmin: (user as { isAdmin?: boolean }).isAdmin || false,
        plan: (user as { plan?: string }).plan || "free",
      };

      // Store credentials
      const credentials: StoredCredentials = {
        token,
        userId: mobileUser.id,
        deviceId: request.deviceInfo.deviceId,
        biometricEnabled: false,
        lastAuthAt: Date.now(),
        createdAt: Date.now(),
      };
      await mobileAuthStorage.storeCredentials(credentials);
      await mobileAuthStorage.storeDeviceInfo(request.deviceInfo);
      await mobileAuthStorage.setLastActiveUser(mobileUser.id);

      // Update session
      this._session.token = token;
      this._session.user = mobileUser;
      this._session.deviceInfo = request.deviceInfo;
      this._session.state = "authenticated";

      // Start token refresh timer
      this.startTokenRefreshTimer();

      // Check if biometric setup is available
      const requiresBiometricSetup =
        this._session.biometricConfig?.isAvailable &&
        !await mobileAuthStorage.isBiometricEnabled();

      this.emitEvent({ type: "login_success", user: mobileUser });

      return {
        success: true,
        token,
        user: mobileUser,
        requiresBiometricSetup,
      };
    } catch (error) {
      console.error("Login error:", error);
      this._session.state = "unauthenticated";
      this._session.lastError = "An unexpected error occurred during login";
      this.emitEvent({ type: "login_failure", error: this._session.lastError });
      return {
        success: false,
        error: this._session.lastError,
      };
    }
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    try {
      // Call Better Auth sign out
      await authClient.signOut();
    } catch (error) {
      console.error("Error during sign out:", error);
    }

    // Clear local storage
    await mobileAuthStorage.clearCredentials();

    // Stop refresh timer
    this.stopTokenRefreshTimer();

    // Reset session
    this._session = {
      state: "unauthenticated",
      user: null,
      token: null,
      biometricConfig: this._session.biometricConfig,
      deviceInfo: this._session.deviceInfo,
      lastError: null,
    };

    this.emitEvent({ type: "logout" });
  }

  /**
   * Refresh the access token
   */
  async refreshToken(): Promise<MobileRefreshResponse> {
    try {
      this._session.state = "refreshing";

      // Get current session from Better Auth
      const sessionResult = await authClient.getSession();

      if (!sessionResult.data?.session) {
        this._session.state = "token_expired";
        this.emitEvent({ type: "token_refresh_failed", error: "No session available" });
        return {
          success: false,
          error: "No session available",
        };
      }

      const { session, user } = sessionResult.data;

      // Create new token
      const token: MobileAuthToken = {
        accessToken: session.token,
        expiresAt: new Date(session.expiresAt).getTime(),
        issuedAt: Date.now(),
        tokenType: "bearer",
      };

      // Update stored token
      await mobileAuthStorage.updateToken(token);

      // Update session
      this._session.token = token;
      this._session.state = "authenticated";

      // Update user if available
      if (user) {
        this._session.user = {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image || undefined,
          isAdmin: (user as { isAdmin?: boolean }).isAdmin || false,
          plan: (user as { plan?: string }).plan || "free",
        };
      }

      this.emitEvent({ type: "token_refreshed", token });

      return {
        success: true,
        token,
      };
    } catch (error) {
      console.error("Token refresh error:", error);
      this._session.state = "token_expired";
      this._session.lastError = "Failed to refresh token";
      this.emitEvent({ type: "token_refresh_failed", error: this._session.lastError });
      return {
        success: false,
        error: this._session.lastError,
      };
    }
  }

  /**
   * Authenticate with biometrics
   */
  async authenticateWithBiometrics(): Promise<boolean> {
    if (!this._session.biometricConfig?.isAvailable) {
      this._session.lastError = "Biometric authentication is not available";
      return false;
    }

    const result = await biometricService.authenticate(
      "Authenticate to access your account"
    );

    if (result.success) {
      // Update last auth time
      const credentials = await mobileAuthStorage.getCredentials();
      if (credentials) {
        credentials.lastAuthAt = Date.now();
        await mobileAuthStorage.storeCredentials(credentials);
      }

      this._session.state = "authenticated";
      this.emitEvent({ type: "biometric_auth_success" });
      return true;
    } else {
      this._session.lastError = result.error || "Biometric authentication failed";
      this.emitEvent({ type: "biometric_auth_failed", error: this._session.lastError });
      return false;
    }
  }

  /**
   * Enable or disable biometric authentication
   */
  async setBiometricEnabled(enabled: boolean): Promise<boolean> {
    if (enabled && !this._session.biometricConfig?.isAvailable) {
      this._session.lastError = "Biometric authentication is not available";
      return false;
    }

    if (enabled) {
      // Verify biometrics work before enabling
      const authResult = await biometricService.authenticate(
        "Verify biometrics to enable"
      );
      if (!authResult.success) {
        this._session.lastError = authResult.error || "Failed to verify biometrics";
        return false;
      }
    }

    await mobileAuthStorage.setBiometricEnabled(enabled);
    return true;
  }

  /**
   * Check if biometric is enabled
   */
  async isBiometricEnabled(): Promise<boolean> {
    return mobileAuthStorage.isBiometricEnabled();
  }

  /**
   * Get biometric configuration
   */
  async getBiometricConfig(): Promise<BiometricConfig> {
    return biometricService.checkAvailability();
  }

  /**
   * Refresh user data from server
   */
  async refreshUserData(): Promise<void> {
    try {
      const sessionResult = await authClient.getSession();

      if (sessionResult.data?.user) {
        const user = sessionResult.data.user;
        this._session.user = {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image || undefined,
          isAdmin: (user as { isAdmin?: boolean }).isAdmin || false,
          plan: (user as { plan?: string }).plan || "free",
        };
      }
    } catch (error) {
      console.error("Failed to refresh user data:", error);
    }
  }

  /**
   * Get current access token
   */
  getAccessToken(): string | null {
    return this._session.token?.accessToken || null;
  }

  /**
   * Check if authenticated
   */
  isAuthenticated(): boolean {
    return this._session.state === "authenticated";
  }

  /**
   * Get authorization header
   */
  getAuthorizationHeader(): Record<string, string> {
    const token = this.getAccessToken();
    if (!token) return {};
    return {
      Authorization: `Bearer ${token}`,
      "X-Session-Token": token,
    };
  }

  /**
   * Add event listener
   */
  addEventListener(listener: EventListener): () => void {
    this._eventListeners.add(listener);
    return () => this._eventListeners.delete(listener);
  }

  /**
   * Emit event to all listeners
   */
  private emitEvent(event: MobileAuthEvent): void {
    this._eventListeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error("Error in auth event listener:", error);
      }
    });
  }

  /**
   * Start token refresh timer
   */
  private startTokenRefreshTimer(): void {
    this.stopTokenRefreshTimer();

    this._refreshTimer = setInterval(async () => {
      const validation = await mobileAuthStorage.validateStoredToken();

      if (validation.needsRefresh) {
        await this.refreshToken();
      }

      if (validation.isExpired) {
        this._session.state = "token_expired";
        this.emitEvent({ type: "session_expired" });
        this.stopTokenRefreshTimer();
      }
    }, TOKEN_CHECK_INTERVAL_MS);
  }

  /**
   * Stop token refresh timer
   */
  private stopTokenRefreshTimer(): void {
    if (this._refreshTimer) {
      clearInterval(this._refreshTimer);
      this._refreshTimer = null;
    }
  }
}

// Export singleton instance
export const mobileAuthClient = MobileAuthClient.getInstance();
