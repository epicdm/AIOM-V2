/**
 * SIP Provisioning Queries
 *
 * TanStack Query definitions for SIP provisioning data fetching.
 */

import { queryOptions } from "@tanstack/react-query";
import {
  getUserSipCredentialsFn,
  getSipCredentialFn,
  getSipRegistrationStatusFn,
  hasActiveSipCredentialsFn,
  getSipServerHealthFn,
} from "~/fn/sip-provisioning";

/**
 * Query keys for SIP provisioning
 */
export const sipProvisioningKeys = {
  all: ["sip-provisioning"] as const,
  credentials: () => [...sipProvisioningKeys.all, "credentials"] as const,
  userCredentials: () => [...sipProvisioningKeys.credentials(), "user"] as const,
  credential: (id: string) => [...sipProvisioningKeys.credentials(), id] as const,
  registrationStatus: (id: string) =>
    [...sipProvisioningKeys.credential(id), "registration"] as const,
  hasActiveCredentials: () =>
    [...sipProvisioningKeys.credentials(), "hasActive"] as const,
  serverHealth: () => [...sipProvisioningKeys.all, "serverHealth"] as const,
};

/**
 * Query for user's SIP credentials (summary list)
 */
export const getUserSipCredentialsQuery = () =>
  queryOptions({
    queryKey: sipProvisioningKeys.userCredentials(),
    queryFn: () => getUserSipCredentialsFn(),
  });

/**
 * Query for a specific SIP credential (with password)
 */
export const getSipCredentialQuery = (credentialId: string) =>
  queryOptions({
    queryKey: sipProvisioningKeys.credential(credentialId),
    queryFn: () => getSipCredentialFn({ data: { credentialId } }),
    enabled: !!credentialId,
  });

/**
 * Query for SIP registration status
 */
export const getSipRegistrationStatusQuery = (credentialId: string) =>
  queryOptions({
    queryKey: sipProvisioningKeys.registrationStatus(credentialId),
    queryFn: () => getSipRegistrationStatusFn({ data: { credentialId } }),
    enabled: !!credentialId,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

/**
 * Query to check if user has active credentials
 */
export const hasActiveSipCredentialsQuery = () =>
  queryOptions({
    queryKey: sipProvisioningKeys.hasActiveCredentials(),
    queryFn: () => hasActiveSipCredentialsFn(),
  });

/**
 * Query for SIP server health status
 */
export const getSipServerHealthQuery = () =>
  queryOptions({
    queryKey: sipProvisioningKeys.serverHealth(),
    queryFn: () => getSipServerHealthFn(),
    staleTime: 60000, // Consider fresh for 1 minute
  });
