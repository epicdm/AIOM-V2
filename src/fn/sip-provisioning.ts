/**
 * SIP Provisioning Server Functions
 *
 * API endpoints for SIP account provisioning and management.
 * Provides authenticated access to SIP provisioning service.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authenticatedMiddleware, assertAdminMiddleware } from "./middleware";
import { getSipProvisioningService } from "~/lib/sip-provisioning";
import {
  getSipCredentialById,
  getUserSipCredentials,
} from "~/data-access/sip-credentials";

// ============================================================================
// Schemas
// ============================================================================

const provisionAccountSchema = z.object({
  phoneNumber: z.string().regex(
    /^\+?[1-9]\d{1,14}$/,
    "Phone number must be in E.164 format"
  ),
  displayName: z.string().min(1).max(100).optional(),
  deviceId: z.string().optional(),
  transportProtocol: z.enum(["UDP", "TCP", "TLS"]).optional().default("TLS"),
});

const credentialIdSchema = z.object({
  credentialId: z.string().min(1, "Credential ID is required"),
});

const suspendCredentialSchema = z.object({
  credentialId: z.string().min(1, "Credential ID is required"),
  reason: z.string().min(1, "Suspension reason is required"),
});

const revokeCredentialSchema = z.object({
  credentialId: z.string().min(1, "Credential ID is required"),
  reason: z.string().min(1, "Revocation reason is required"),
});

// ============================================================================
// User-facing Functions
// ============================================================================

/**
 * Provision a new SIP account for the authenticated user
 */
export const provisionSipAccountFn = createServerFn({
  method: "POST",
})
  .middleware([authenticatedMiddleware])
  .inputValidator(provisionAccountSchema)
  .handler(async ({ data, context }) => {
    const service = getSipProvisioningService();

    const result = await service.provisionAccount({
      userId: context.userId,
      phoneNumber: data.phoneNumber,
      displayName: data.displayName,
      deviceId: data.deviceId,
      transportProtocol: data.transportProtocol,
    });

    if (!result.success) {
      throw new Error(result.error?.message || "Provisioning failed");
    }

    // Return credentials (password only shown once on provisioning)
    return {
      id: result.credentials!.id,
      sipUsername: result.credentials!.sipUsername,
      sipPassword: result.credentials!.sipPassword,
      sipDomain: result.credentials!.sipDomain,
      sipUri: result.credentials!.sipUri,
      phoneNumber: result.credentials!.phoneNumber,
      displayName: result.credentials!.displayName,
      transportProtocol: result.credentials!.transportProtocol,
      codecPreferences: result.credentials!.codecPreferences,
      stunTurnConfig: result.credentials!.stunTurnConfig,
      provisionedAt: result.credentials!.provisionedAt.toISOString(),
    };
  });

/**
 * Get all SIP credentials for the authenticated user
 */
export const getUserSipCredentialsFn = createServerFn({
  method: "GET",
})
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    const credentials = await getUserSipCredentials(context.userId);

    return credentials.map((cred) => ({
      id: cred.id,
      sipUsername: cred.sipUsername,
      sipDomain: cred.sipDomain,
      sipUri: cred.sipUri,
      phoneNumber: cred.phoneNumber,
      displayName: cred.displayName,
      status: cred.status,
      provisionedAt: cred.provisionedAt.toISOString(),
    }));
  });

/**
 * Get a specific SIP credential (with password for re-display)
 */
export const getSipCredentialFn = createServerFn({
  method: "GET",
})
  .middleware([authenticatedMiddleware])
  .inputValidator(credentialIdSchema)
  .handler(async ({ data, context }) => {
    const credential = await getSipCredentialById(data.credentialId);

    if (!credential) {
      throw new Error("Credential not found");
    }

    // Verify ownership
    if (credential.userId !== context.userId) {
      throw new Error("Unauthorized");
    }

    return {
      id: credential.id,
      sipUsername: credential.sipUsername,
      sipPassword: credential.sipPassword,
      sipDomain: credential.sipDomain,
      sipUri: credential.sipUri,
      phoneNumber: credential.phoneNumber,
      displayName: credential.displayName,
      status: credential.status,
      transportProtocol: credential.transportProtocol,
      codecPreferences: credential.codecPreferences,
      stunTurnConfig: credential.stunTurnConfig,
      provisionedAt: credential.provisionedAt.toISOString(),
    };
  });

/**
 * Regenerate SIP password for a credential
 */
export const regenerateSipPasswordFn = createServerFn({
  method: "POST",
})
  .middleware([authenticatedMiddleware])
  .inputValidator(credentialIdSchema)
  .handler(async ({ data, context }) => {
    // Verify ownership first
    const credential = await getSipCredentialById(data.credentialId);
    if (!credential) {
      throw new Error("Credential not found");
    }
    if (credential.userId !== context.userId) {
      throw new Error("Unauthorized");
    }

    const service = getSipProvisioningService();
    const result = await service.regeneratePassword(data.credentialId);

    if (!result.success) {
      throw new Error(result.error || "Password regeneration failed");
    }

    return {
      newPassword: result.newPassword,
    };
  });

/**
 * Get registration status for a SIP credential
 */
export const getSipRegistrationStatusFn = createServerFn({
  method: "GET",
})
  .middleware([authenticatedMiddleware])
  .inputValidator(credentialIdSchema)
  .handler(async ({ data, context }) => {
    // Verify ownership first
    const credential = await getSipCredentialById(data.credentialId);
    if (!credential) {
      throw new Error("Credential not found");
    }
    if (credential.userId !== context.userId) {
      throw new Error("Unauthorized");
    }

    const service = getSipProvisioningService();
    const status = await service.getRegistrationStatus(data.credentialId);

    return status || { registered: false };
  });

/**
 * Check if user has active SIP credentials
 */
export const hasActiveSipCredentialsFn = createServerFn({
  method: "GET",
})
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    const service = getSipProvisioningService();
    const hasCredentials = await service.userHasActiveCredentials(context.userId);

    return { hasCredentials };
  });

/**
 * Get SIP server health status
 */
export const getSipServerHealthFn = createServerFn({
  method: "GET",
})
  .middleware([authenticatedMiddleware])
  .handler(async () => {
    const service = getSipProvisioningService();
    const health = await service.getServerHealth();

    return {
      healthy: health.healthy,
      version: health.version,
      uptime: health.uptime,
      activeRegistrations: health.activeRegistrations,
      configured: service.isConfigured(),
    };
  });

// ============================================================================
// Admin Functions
// ============================================================================

/**
 * Suspend a SIP credential (admin only)
 */
export const suspendSipCredentialFn = createServerFn({
  method: "POST",
})
  .middleware([assertAdminMiddleware])
  .inputValidator(suspendCredentialSchema)
  .handler(async ({ data }) => {
    const service = getSipProvisioningService();
    const result = await service.suspendCredentials(data.credentialId, data.reason);

    if (!result.success) {
      throw new Error(result.error || "Suspension failed");
    }

    return { success: true };
  });

/**
 * Reactivate a suspended SIP credential (admin only)
 */
export const reactivateSipCredentialFn = createServerFn({
  method: "POST",
})
  .middleware([assertAdminMiddleware])
  .inputValidator(credentialIdSchema)
  .handler(async ({ data }) => {
    const service = getSipProvisioningService();
    const result = await service.reactivateCredentials(data.credentialId);

    if (!result.success) {
      throw new Error(result.error || "Reactivation failed");
    }

    return { success: true };
  });

/**
 * Revoke a SIP credential permanently (admin only)
 */
export const revokeSipCredentialFn = createServerFn({
  method: "POST",
})
  .middleware([assertAdminMiddleware])
  .inputValidator(revokeCredentialSchema)
  .handler(async ({ data }) => {
    const service = getSipProvisioningService();
    const result = await service.revokeCredentials(data.credentialId, data.reason);

    if (!result.success) {
      throw new Error(result.error || "Revocation failed");
    }

    return { success: true };
  });

/**
 * Force deregister a SIP account (admin only)
 */
export const forceDeregisterSipFn = createServerFn({
  method: "POST",
})
  .middleware([assertAdminMiddleware])
  .inputValidator(credentialIdSchema)
  .handler(async ({ data }) => {
    const service = getSipProvisioningService();
    const result = await service.forceDeregister(data.credentialId);

    if (!result.success) {
      throw new Error(result.error || "Deregistration failed");
    }

    return { success: true };
  });

/**
 * Sync credential with FlexiSIP server (admin only)
 */
export const syncSipCredentialFn = createServerFn({
  method: "POST",
})
  .middleware([assertAdminMiddleware])
  .inputValidator(credentialIdSchema)
  .handler(async ({ data }) => {
    const service = getSipProvisioningService();
    const result = await service.syncWithServer(data.credentialId);

    if (!result.success) {
      throw new Error(result.error || "Sync failed");
    }

    return { success: true };
  });

/**
 * Validate SIP credentials (admin only)
 */
export const validateSipCredentialFn = createServerFn({
  method: "GET",
})
  .middleware([assertAdminMiddleware])
  .inputValidator(credentialIdSchema)
  .handler(async ({ data }) => {
    const service = getSipProvisioningService();
    const result = await service.validateCredentials(data.credentialId);

    return {
      valid: result.valid,
      error: result.error,
    };
  });
