/**
 * Mobile Authentication Hook
 *
 * React hook for mobile authentication with Better Auth backend.
 * Provides login, logout, biometric auth, and token management.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  mobileAuthClient,
  MobileAuthSession,
  MobileAuthState,
  MobileLoginRequest,
  MobileAuthEvent,
  BiometricConfig,
} from "~/lib/mobile-auth";
import {
  registerMobileDeviceFn,
  deactivateMobileDeviceFn,
  revokeOtherSessionsFn,
  revokeSessionFn,
} from "~/fn/mobile-auth";
import {
  mobileSessionsQueryOptions,
  mobileDevicesQueryOptions,
} from "~/queries/mobile-auth";

interface UseMobileAuthOptions {
  /**
   * Whether to automatically initialize on mount
   */
  autoInitialize?: boolean;
  /**
   * Whether to show toast notifications
   */
  showNotifications?: boolean;
  /**
   * Callback when login succeeds
   */
  onLoginSuccess?: (session: MobileAuthSession) => void;
  /**
   * Callback when logout occurs
   */
  onLogout?: () => void;
  /**
   * Callback when session expires
   */
  onSessionExpired?: () => void;
}

/**
 * Mobile Authentication Hook
 *
 * Provides complete mobile authentication functionality:
 * - Login/logout with email and password
 * - Biometric authentication
 * - Token management and refresh
 * - Device management
 * - Session management
 */
export function useMobileAuth(options: UseMobileAuthOptions = {}) {
  const {
    autoInitialize = true,
    showNotifications = true,
    onLoginSuccess,
    onLogout,
    onSessionExpired,
  } = options;

  const queryClient = useQueryClient();
  const [session, setSession] = useState<MobileAuthSession>(mobileAuthClient.session);
  const [isInitialized, setIsInitialized] = useState(false);
  const eventListenerRef = useRef<(() => void) | null>(null);

  // Initialize on mount
  useEffect(() => {
    if (autoInitialize && !isInitialized) {
      mobileAuthClient.initialize().then((initialSession) => {
        setSession(initialSession);
        setIsInitialized(true);
      });
    }

    // Subscribe to auth events
    eventListenerRef.current = mobileAuthClient.addEventListener((event) => {
      handleAuthEvent(event);
    });

    return () => {
      if (eventListenerRef.current) {
        eventListenerRef.current();
      }
    };
  }, [autoInitialize, isInitialized]);

  // Handle auth events
  const handleAuthEvent = useCallback(
    (event: MobileAuthEvent) => {
      setSession(mobileAuthClient.session);

      switch (event.type) {
        case "login_success":
          if (showNotifications) {
            toast.success(`Welcome back, ${event.user.name}!`);
          }
          onLoginSuccess?.(mobileAuthClient.session);
          // Invalidate queries after login
          queryClient.invalidateQueries({ queryKey: ["mobile-sessions"] });
          queryClient.invalidateQueries({ queryKey: ["mobile-devices"] });
          break;

        case "login_failure":
          if (showNotifications) {
            toast.error(event.error || "Login failed");
          }
          break;

        case "logout":
          if (showNotifications) {
            toast.success("Logged out successfully");
          }
          onLogout?.();
          // Clear queries on logout
          queryClient.clear();
          break;

        case "token_refreshed":
          // Silent refresh, no notification needed
          break;

        case "token_refresh_failed":
          if (showNotifications) {
            toast.error("Session refresh failed. Please log in again.");
          }
          break;

        case "session_expired":
          if (showNotifications) {
            toast.warning("Your session has expired. Please log in again.");
          }
          onSessionExpired?.();
          break;

        case "biometric_auth_success":
          if (showNotifications) {
            toast.success("Biometric authentication successful");
          }
          break;

        case "biometric_auth_failed":
          if (showNotifications) {
            toast.error(event.error || "Biometric authentication failed");
          }
          break;
      }
    },
    [showNotifications, onLoginSuccess, onLogout, onSessionExpired, queryClient]
  );

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (request: Omit<MobileLoginRequest, "deviceInfo">) => {
      let deviceInfo = mobileAuthClient.session.deviceInfo;
      if (!deviceInfo) {
        const mobileAuth = await import("~/lib/mobile-auth");
        deviceInfo = await mobileAuth.mobileAuthStorage.getOrCreateDeviceInfo();
      }

      return mobileAuthClient.login({
        ...request,
        deviceInfo,
      });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: () => mobileAuthClient.logout(),
  });

  // Biometric auth mutation
  const biometricAuthMutation = useMutation({
    mutationFn: () => mobileAuthClient.authenticateWithBiometrics(),
  });

  // Enable/disable biometric mutation
  const setBiometricEnabledMutation = useMutation({
    mutationFn: (enabled: boolean) => mobileAuthClient.setBiometricEnabled(enabled),
    onSuccess: (success, enabled) => {
      if (success && showNotifications) {
        toast.success(
          enabled
            ? "Biometric authentication enabled"
            : "Biometric authentication disabled"
        );
      }
    },
    onError: () => {
      if (showNotifications) {
        toast.error("Failed to update biometric settings");
      }
    },
  });

  // Register device mutation
  const registerDeviceMutation = useMutation({
    mutationFn: registerMobileDeviceFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mobile-devices"] });
      if (showNotifications) {
        toast.success("Device registered successfully");
      }
    },
  });

  // Deactivate device mutation
  const deactivateDeviceMutation = useMutation({
    mutationFn: deactivateMobileDeviceFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mobile-devices"] });
      if (showNotifications) {
        toast.success("Device deactivated");
      }
    },
  });

  // Revoke other sessions mutation
  const revokeOtherSessionsMutation = useMutation({
    mutationFn: async () => {
      const token = mobileAuthClient.getAccessToken();
      if (!token) throw new Error("No active session");
      return revokeOtherSessionsFn({ data: { currentToken: token } });
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["mobile-sessions"] });
      if (showNotifications) {
        toast.success(`${result.revokedCount} sessions revoked`);
      }
    },
  });

  // Revoke session mutation
  const revokeSessionMutation = useMutation({
    mutationFn: revokeSessionFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mobile-sessions"] });
      if (showNotifications) {
        toast.success("Session revoked");
      }
    },
  });

  // Refresh token
  const refreshToken = useCallback(async () => {
    const result = await mobileAuthClient.refreshToken();
    setSession(mobileAuthClient.session);
    return result;
  }, []);

  // Get biometric config
  const getBiometricConfig = useCallback(async (): Promise<BiometricConfig> => {
    return mobileAuthClient.getBiometricConfig();
  }, []);

  // Check if biometric is enabled
  const isBiometricEnabled = useCallback(async (): Promise<boolean> => {
    return mobileAuthClient.isBiometricEnabled();
  }, []);

  // Sessions query (only when authenticated)
  const sessionsQuery = useQuery({
    ...mobileSessionsQueryOptions(),
    enabled: session.state === "authenticated",
  });

  // Devices query (only when authenticated)
  const devicesQuery = useQuery({
    ...mobileDevicesQueryOptions(),
    enabled: session.state === "authenticated",
  });

  return {
    // State
    session,
    isInitialized,
    isAuthenticated: session.state === "authenticated",
    isLoading:
      session.state === "loading" ||
      loginMutation.isPending ||
      logoutMutation.isPending,
    user: session.user,
    biometricConfig: session.biometricConfig,

    // Auth actions
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    authenticateWithBiometrics: biometricAuthMutation.mutateAsync,
    setBiometricEnabled: setBiometricEnabledMutation.mutateAsync,
    refreshToken,
    getBiometricConfig,
    isBiometricEnabled,

    // Token helpers
    getAccessToken: () => mobileAuthClient.getAccessToken(),
    getAuthorizationHeader: () => mobileAuthClient.getAuthorizationHeader(),

    // Device management
    registerDevice: registerDeviceMutation.mutateAsync,
    deactivateDevice: deactivateDeviceMutation.mutateAsync,
    devices: devicesQuery.data || [],
    isLoadingDevices: devicesQuery.isLoading,

    // Session management
    sessions: sessionsQuery.data || [],
    isLoadingSessions: sessionsQuery.isLoading,
    revokeOtherSessions: revokeOtherSessionsMutation.mutateAsync,
    revokeSession: revokeSessionMutation.mutateAsync,

    // Mutation states
    loginError: loginMutation.error,
    isLoginPending: loginMutation.isPending,
    isLogoutPending: logoutMutation.isPending,
    isBiometricAuthPending: biometricAuthMutation.isPending,
  };
}

/**
 * Hook for biometric-only authentication
 *
 * Use this when you need just biometric auth without full mobile auth context
 */
export function useBiometricAuth() {
  const [config, setConfig] = useState<BiometricConfig | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    // Load biometric config
    mobileAuthClient.getBiometricConfig().then(setConfig);
    mobileAuthClient.isBiometricEnabled().then(setIsEnabled);
  }, []);

  const authenticate = useCallback(async () => {
    return mobileAuthClient.authenticateWithBiometrics();
  }, []);

  const setEnabled = useCallback(async (enabled: boolean) => {
    const success = await mobileAuthClient.setBiometricEnabled(enabled);
    if (success) {
      setIsEnabled(enabled);
    }
    return success;
  }, []);

  return {
    config,
    isEnabled,
    isAvailable: config?.isAvailable ?? false,
    biometricType: config?.biometricType ?? "none",
    authenticate,
    setEnabled,
  };
}

/**
 * Hook for just checking auth state
 *
 * Lightweight hook for components that just need to check if user is authenticated
 */
export function useMobileAuthState() {
  const [state, setState] = useState<MobileAuthState>(mobileAuthClient.session.state);
  const [user, setUser] = useState(mobileAuthClient.session.user);

  useEffect(() => {
    const unsubscribe = mobileAuthClient.addEventListener(() => {
      setState(mobileAuthClient.session.state);
      setUser(mobileAuthClient.session.user);
    });

    return unsubscribe;
  }, []);

  return {
    state,
    user,
    isAuthenticated: state === "authenticated",
    isLoading: state === "loading" || state === "refreshing",
    requiresBiometric: state === "biometric_required",
    isExpired: state === "token_expired",
  };
}
