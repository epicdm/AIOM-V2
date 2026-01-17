/**
 * Demo Environment Hooks
 *
 * React hooks for interacting with the demo environment feature.
 * Uses localStorage for token persistence in the browser.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import {
  demoLoginFn,
  demoLogoutFn,
  validateDemoSessionFn,
  getDemoRolesFn,
  getDemoDashboardDataFn,
  getDemoExpensesFn,
  getDemoWorkOrdersFn,
  getDemoCustomersFn,
  getDemoTransactionsFn,
  logDemoActivityFn,
  getDemoActivityHistoryFn,
} from "~/fn/demo-auth";

// =============================================================================
// Constants
// =============================================================================

const DEMO_TOKEN_KEY = "demo_auth_token";

// =============================================================================
// Token Management Utilities
// =============================================================================

function getDemoToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(DEMO_TOKEN_KEY);
}

function setDemoToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DEMO_TOKEN_KEY, token);
}

function clearDemoToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(DEMO_TOKEN_KEY);
}

// =============================================================================
// Query Keys
// =============================================================================

export const demoQueryKeys = {
  all: ["demo"] as const,
  session: () => [...demoQueryKeys.all, "session"] as const,
  roles: () => [...demoQueryKeys.all, "roles"] as const,
  dashboard: () => [...demoQueryKeys.all, "dashboard"] as const,
  expenses: () => [...demoQueryKeys.all, "expenses"] as const,
  workOrders: () => [...demoQueryKeys.all, "workOrders"] as const,
  customers: () => [...demoQueryKeys.all, "customers"] as const,
  transactions: () => [...demoQueryKeys.all, "transactions"] as const,
  activities: () => [...demoQueryKeys.all, "activities"] as const,
};

// =============================================================================
// Session & Authentication Hooks
// =============================================================================

/**
 * Hook to get current demo session status
 */
export function useDemoSession() {
  const [token, setToken] = useState<string | null>(null);

  // Load token from localStorage on mount
  useEffect(() => {
    setToken(getDemoToken());
  }, []);

  const query = useQuery({
    queryKey: [...demoQueryKeys.session(), token],
    queryFn: async () => {
      if (!token) return { authenticated: false, session: null };
      return validateDemoSessionFn({ data: { token } });
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });

  return {
    isAuthenticated: query.data?.authenticated ?? false,
    session: query.data?.session ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    token,
  };
}

/**
 * Hook for demo login
 */
export function useDemoLogin() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (credentials: { email: string; password: string }) =>
      demoLoginFn({ data: credentials }),
    onSuccess: (data) => {
      if (data.success && data.token) {
        // Store the token
        setDemoToken(data.token);
        // Invalidate session query to refetch
        queryClient.invalidateQueries({ queryKey: demoQueryKeys.session() });
        // Navigate to demo dashboard
        navigate({ to: "/demo/dashboard" });
      }
    },
  });
}

/**
 * Hook for demo logout
 */
export function useDemoLogout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async () => {
      const token = getDemoToken();
      if (token) {
        return demoLogoutFn({ data: { token } });
      }
      return { success: true };
    },
    onSuccess: () => {
      // Clear the token
      clearDemoToken();
      // Clear all demo-related queries
      queryClient.invalidateQueries({ queryKey: demoQueryKeys.all });
      queryClient.removeQueries({ queryKey: demoQueryKeys.all });
      // Navigate to demo login
      navigate({ to: "/demo" });
    },
  });
}

/**
 * Hook to get available demo roles
 */
export function useDemoRoles() {
  const query = useQuery({
    queryKey: demoQueryKeys.roles(),
    queryFn: () => getDemoRolesFn(),
    staleTime: 60 * 60 * 1000, // 1 hour (roles don't change)
  });

  return {
    roles: query.data?.roles ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}

// =============================================================================
// Demo Data Hooks
// =============================================================================

/**
 * Hook to get demo dashboard data
 */
export function useDemoDashboard(enabled = true) {
  const [token, setTokenState] = useState<string | null>(null);

  useEffect(() => {
    setTokenState(getDemoToken());
  }, []);

  const query = useQuery({
    queryKey: demoQueryKeys.dashboard(),
    queryFn: async () => {
      if (!token) throw new Error("No demo token");
      return getDemoDashboardDataFn({ data: { token } });
    },
    enabled: enabled && !!token,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Hook to get demo expenses
 */
export function useDemoExpenses(enabled = true) {
  const [token, setTokenState] = useState<string | null>(null);

  useEffect(() => {
    setTokenState(getDemoToken());
  }, []);

  const query = useQuery({
    queryKey: demoQueryKeys.expenses(),
    queryFn: async () => {
      if (!token) throw new Error("No demo token");
      return getDemoExpensesFn({ data: { token } });
    },
    enabled: enabled && !!token,
    staleTime: 5 * 60 * 1000,
  });

  return {
    expenses: query.data?.expenses ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Hook to get demo work orders
 */
export function useDemoWorkOrders(enabled = true) {
  const [token, setTokenState] = useState<string | null>(null);

  useEffect(() => {
    setTokenState(getDemoToken());
  }, []);

  const query = useQuery({
    queryKey: demoQueryKeys.workOrders(),
    queryFn: async () => {
      if (!token) throw new Error("No demo token");
      return getDemoWorkOrdersFn({ data: { token } });
    },
    enabled: enabled && !!token,
    staleTime: 5 * 60 * 1000,
  });

  return {
    workOrders: query.data?.workOrders ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Hook to get demo customers
 */
export function useDemoCustomers(enabled = true) {
  const [token, setTokenState] = useState<string | null>(null);

  useEffect(() => {
    setTokenState(getDemoToken());
  }, []);

  const query = useQuery({
    queryKey: demoQueryKeys.customers(),
    queryFn: async () => {
      if (!token) throw new Error("No demo token");
      return getDemoCustomersFn({ data: { token } });
    },
    enabled: enabled && !!token,
    staleTime: 5 * 60 * 1000,
  });

  return {
    customers: query.data?.customers ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Hook to get demo transactions
 */
export function useDemoTransactions(enabled = true) {
  const [token, setTokenState] = useState<string | null>(null);

  useEffect(() => {
    setTokenState(getDemoToken());
  }, []);

  const query = useQuery({
    queryKey: demoQueryKeys.transactions(),
    queryFn: async () => {
      if (!token) throw new Error("No demo token");
      return getDemoTransactionsFn({ data: { token } });
    },
    enabled: enabled && !!token,
    staleTime: 5 * 60 * 1000,
  });

  return {
    transactions: query.data?.transactions ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

// =============================================================================
// Activity Tracking Hooks
// =============================================================================

/**
 * Hook to log demo activity
 */
export function useLogDemoActivity() {
  return useMutation({
    mutationFn: async (data: {
      action: string;
      resourceType?: string;
      resourceId?: string;
      metadata?: Record<string, unknown>;
    }) => {
      const token = getDemoToken();
      if (!token) throw new Error("No demo token");
      return logDemoActivityFn({ data: { ...data, token } });
    },
  });
}

/**
 * Hook to get demo activity history
 */
export function useDemoActivityHistory(enabled = true) {
  const [token, setTokenState] = useState<string | null>(null);

  useEffect(() => {
    setTokenState(getDemoToken());
  }, []);

  const query = useQuery({
    queryKey: demoQueryKeys.activities(),
    queryFn: async () => {
      if (!token) throw new Error("No demo token");
      return getDemoActivityHistoryFn({ data: { token } });
    },
    enabled: enabled && !!token,
    staleTime: 60 * 1000, // 1 minute
  });

  return {
    activities: query.data?.activities ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

// =============================================================================
// Combined Demo Context Hook
// =============================================================================

/**
 * Comprehensive hook for demo environment state
 */
export function useDemoEnvironment() {
  const session = useDemoSession();
  const login = useDemoLogin();
  const logout = useDemoLogout();

  return {
    // Session state
    isAuthenticated: session.isAuthenticated,
    session: session.session,
    isSessionLoading: session.isLoading,
    token: session.token,

    // Login
    login: login.mutate,
    loginAsync: login.mutateAsync,
    isLoggingIn: login.isPending,
    loginError: login.error,

    // Logout
    logout: logout.mutate,
    logoutAsync: logout.mutateAsync,
    isLoggingOut: logout.isPending,

    // Refresh
    refreshSession: session.refetch,
  };
}

// =============================================================================
// Utility Functions (exported for use in routes)
// =============================================================================

export { getDemoToken, setDemoToken, clearDemoToken };
