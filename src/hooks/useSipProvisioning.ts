/**
 * SIP Provisioning Hooks
 *
 * React hooks for SIP provisioning functionality.
 * Provides easy access to provisioning, credential management, and status monitoring.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getUserSipCredentialsQuery,
  getSipCredentialQuery,
  getSipRegistrationStatusQuery,
  hasActiveSipCredentialsQuery,
  getSipServerHealthQuery,
  sipProvisioningKeys,
} from "~/queries/sip-provisioning";
import {
  provisionSipAccountFn,
  regenerateSipPasswordFn,
} from "~/fn/sip-provisioning";

/**
 * Hook to get user's SIP credentials list
 */
export function useSipCredentials() {
  return useQuery(getUserSipCredentialsQuery());
}

/**
 * Hook to get a specific SIP credential with full details
 */
export function useSipCredential(credentialId: string | undefined) {
  return useQuery({
    ...getSipCredentialQuery(credentialId || ""),
    enabled: !!credentialId,
  });
}

/**
 * Hook to get SIP registration status
 */
export function useSipRegistrationStatus(credentialId: string | undefined) {
  return useQuery({
    ...getSipRegistrationStatusQuery(credentialId || ""),
    enabled: !!credentialId,
  });
}

/**
 * Hook to check if user has active SIP credentials
 */
export function useHasActiveSipCredentials() {
  return useQuery(hasActiveSipCredentialsQuery());
}

/**
 * Hook to get SIP server health status
 */
export function useSipServerHealth() {
  return useQuery(getSipServerHealthQuery());
}

/**
 * Hook for provisioning a new SIP account
 */
export function useProvisionSipAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      phoneNumber: string;
      displayName?: string;
      deviceId?: string;
      transportProtocol?: "UDP" | "TCP" | "TLS";
    }) => {
      return provisionSipAccountFn({ data: input });
    },
    onSuccess: () => {
      // Invalidate credentials list
      queryClient.invalidateQueries({
        queryKey: sipProvisioningKeys.credentials(),
      });
      toast.success("SIP account provisioned successfully");
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Provisioning failed";
      toast.error(message);
    },
  });
}

/**
 * Hook for regenerating SIP password
 */
export function useRegenerateSipPassword() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (credentialId: string) => {
      return regenerateSipPasswordFn({ data: { credentialId } });
    },
    onSuccess: (_, credentialId) => {
      // Invalidate the specific credential
      queryClient.invalidateQueries({
        queryKey: sipProvisioningKeys.credential(credentialId),
      });
      toast.success("Password regenerated successfully");
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Password regeneration failed";
      toast.error(message);
    },
  });
}

/**
 * Combined hook for SIP provisioning state and actions
 */
export function useSipProvisioning() {
  const credentials = useSipCredentials();
  const hasCredentials = useHasActiveSipCredentials();
  const serverHealth = useSipServerHealth();
  const provisionMutation = useProvisionSipAccount();
  const regeneratePasswordMutation = useRegenerateSipPassword();

  return {
    // State
    credentials: credentials.data || [],
    credentialsLoading: credentials.isLoading,
    credentialsError: credentials.error,

    hasActiveCredentials: hasCredentials.data?.hasCredentials ?? false,
    hasCredentialsLoading: hasCredentials.isLoading,

    serverHealthy: serverHealth.data?.healthy ?? false,
    serverConfigured: serverHealth.data?.configured ?? false,
    serverHealthLoading: serverHealth.isLoading,

    // Actions
    provisionAccount: provisionMutation.mutateAsync,
    isProvisioning: provisionMutation.isPending,
    provisionError: provisionMutation.error,

    regeneratePassword: regeneratePasswordMutation.mutateAsync,
    isRegeneratingPassword: regeneratePasswordMutation.isPending,

    // Refresh
    refreshCredentials: credentials.refetch,
    refreshHealth: serverHealth.refetch,
  };
}

/**
 * Hook for a single credential with status monitoring
 */
export function useSipCredentialWithStatus(credentialId: string | undefined) {
  const credential = useSipCredential(credentialId);
  const registrationStatus = useSipRegistrationStatus(credentialId);
  const regeneratePasswordMutation = useRegenerateSipPassword();

  return {
    // Credential data
    credential: credential.data,
    credentialLoading: credential.isLoading,
    credentialError: credential.error,

    // Registration status
    registered: registrationStatus.data?.registered ?? false,
    registrationStatus: registrationStatus.data,
    registrationStatusLoading: registrationStatus.isLoading,

    // Actions
    regeneratePassword: () => {
      if (credentialId) {
        return regeneratePasswordMutation.mutateAsync(credentialId);
      }
      return Promise.reject(new Error("No credential ID"));
    },
    isRegeneratingPassword: regeneratePasswordMutation.isPending,

    // Refresh
    refreshCredential: credential.refetch,
    refreshRegistrationStatus: registrationStatus.refetch,
  };
}
