/**
 * WebRTC Calling Queries
 *
 * TanStack Query definitions for WebRTC calling data fetching.
 */

import { queryOptions } from "@tanstack/react-query";
import {
  getWebRTCConfigFn,
  getWebRTCCredentialsFn,
  getWebRTCConfigByPhoneFn,
  checkWebRTCCompatibilityFn,
} from "~/fn/webrtc-calling";

/**
 * Query keys for WebRTC calling
 */
export const webrtcCallingKeys = {
  all: ["webrtc-calling"] as const,
  config: () => [...webrtcCallingKeys.all, "config"] as const,
  configById: (credentialId: string) =>
    [...webrtcCallingKeys.config(), credentialId] as const,
  configByPhone: (phoneNumber: string) =>
    [...webrtcCallingKeys.config(), "phone", phoneNumber] as const,
  credentials: () => [...webrtcCallingKeys.all, "credentials"] as const,
  compatibility: () => [...webrtcCallingKeys.all, "compatibility"] as const,
};

/**
 * Query for WebRTC configuration by credential ID
 */
export const getWebRTCConfigQuery = (credentialId: string) =>
  queryOptions({
    queryKey: webrtcCallingKeys.configById(credentialId),
    queryFn: () => getWebRTCConfigFn({ data: { credentialId } }),
    enabled: !!credentialId,
    staleTime: 5 * 60 * 1000, // 5 minutes - config doesn't change often
  });

/**
 * Query for WebRTC configuration by phone number
 */
export const getWebRTCConfigByPhoneQuery = (phoneNumber: string) =>
  queryOptions({
    queryKey: webrtcCallingKeys.configByPhone(phoneNumber),
    queryFn: () => getWebRTCConfigByPhoneFn({ data: { phoneNumber } }),
    enabled: !!phoneNumber,
    staleTime: 5 * 60 * 1000,
  });

/**
 * Query for all WebRTC-enabled credentials
 */
export const getWebRTCCredentialsQuery = () =>
  queryOptions({
    queryKey: webrtcCallingKeys.credentials(),
    queryFn: () => getWebRTCCredentialsFn(),
  });

/**
 * Query for WebRTC browser compatibility info
 */
export const getWebRTCCompatibilityQuery = () =>
  queryOptions({
    queryKey: webrtcCallingKeys.compatibility(),
    queryFn: () => checkWebRTCCompatibilityFn(),
    staleTime: Infinity, // Never stale - static info
  });
