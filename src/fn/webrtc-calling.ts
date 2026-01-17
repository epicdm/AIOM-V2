/**
 * WebRTC Calling Server Functions
 *
 * API endpoints for WebRTC calling configuration and call management.
 * Provides authenticated access to SIP credentials for WebRTC clients.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authenticatedMiddleware } from "./middleware";
import {
  getSipCredentialById,
  getUserSipCredentials,
  getActiveSipCredentialByPhoneNumber,
  updateLastRegistration,
} from "~/data-access/sip-credentials";

// ============================================================================
// Schemas
// ============================================================================

const getWebRTCConfigSchema = z.object({
  credentialId: z.string().min(1, "Credential ID is required"),
});

const updateRegistrationSchema = z.object({
  credentialId: z.string().min(1, "Credential ID is required"),
  ipAddress: z.string().optional().default("unknown"),
  userAgent: z.string().optional().default("WebRTC Client"),
});

const callEventSchema = z.object({
  credentialId: z.string().min(1),
  callId: z.string().min(1),
  event: z.enum([
    "started",
    "ringing",
    "answered",
    "ended",
    "failed",
    "missed",
  ]),
  direction: z.enum(["inbound", "outbound"]),
  remoteUri: z.string().optional(),
  duration: z.number().optional(),
  endReason: z.string().optional(),
});

// ============================================================================
// WebRTC Configuration Functions
// ============================================================================

/**
 * Get WebRTC configuration for a SIP credential
 * Returns everything needed to initialize the WebRTC calling service
 */
export const getWebRTCConfigFn = createServerFn({
  method: "GET",
})
  .middleware([authenticatedMiddleware])
  .inputValidator(getWebRTCConfigSchema)
  .handler(async ({ data, context }) => {
    const credential = await getSipCredentialById(data.credentialId);

    if (!credential) {
      throw new Error("Credential not found");
    }

    // Verify ownership
    if (credential.userId !== context.userId) {
      throw new Error("Unauthorized");
    }

    // Check if credential is active
    if (credential.status !== "active") {
      throw new Error(`Credential is ${credential.status}`);
    }

    // Build WebSocket server URL from SIP domain
    const wsServer = `wss://${credential.sipDomain}:7443/ws`;

    // Build ICE servers from STUN/TURN config
    const iceServers: RTCIceServer[] = [];

    if (credential.stunTurnConfig) {
      // Add STUN servers
      if (credential.stunTurnConfig.stunServers) {
        for (const stunServer of credential.stunTurnConfig.stunServers) {
          iceServers.push({ urls: stunServer });
        }
      }

      // Add TURN servers if available
      if (credential.stunTurnConfig.turnServers) {
        for (const turnServer of credential.stunTurnConfig.turnServers) {
          iceServers.push({
            urls: turnServer.url,
            username: turnServer.username,
            credential: turnServer.credential,
          });
        }
      }
    }

    // Default STUN servers if none configured
    if (iceServers.length === 0) {
      iceServers.push(
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" }
      );
    }

    return {
      sipDomain: credential.sipDomain,
      sipUsername: credential.sipUsername,
      sipPassword: credential.sipPassword,
      sipUri: credential.sipUri,
      displayName: credential.displayName || credential.phoneNumber,
      wsServer,
      iceServers,
      audioCodecs: credential.codecPreferences,
      transportProtocol: credential.transportProtocol,
    };
  });

/**
 * Get all WebRTC-enabled credentials for the user
 */
export const getWebRTCCredentialsFn = createServerFn({
  method: "GET",
})
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    const credentials = await getUserSipCredentials(context.userId);

    // Filter to active credentials only
    const activeCredentials = credentials.filter(
      (cred) => cred.status === "active"
    );

    return activeCredentials.map((cred) => ({
      id: cred.id,
      sipUsername: cred.sipUsername,
      sipDomain: cred.sipDomain,
      sipUri: cred.sipUri,
      phoneNumber: cred.phoneNumber,
      displayName: cred.displayName,
      provisionedAt: cred.provisionedAt.toISOString(),
    }));
  });

/**
 * Get WebRTC config for a specific phone number
 */
export const getWebRTCConfigByPhoneFn = createServerFn({
  method: "GET",
})
  .middleware([authenticatedMiddleware])
  .inputValidator(
    z.object({
      phoneNumber: z.string().min(1, "Phone number is required"),
    })
  )
  .handler(async ({ data, context }) => {
    const credential = await getActiveSipCredentialByPhoneNumber(
      context.userId,
      data.phoneNumber
    );

    if (!credential) {
      throw new Error("No active credential found for this phone number");
    }

    // Build WebSocket server URL from SIP domain
    const wsServer = `wss://${credential.sipDomain}:7443/ws`;

    // Build ICE servers
    const iceServers: RTCIceServer[] = [];

    if (credential.stunTurnConfig) {
      if (credential.stunTurnConfig.stunServers) {
        for (const stunServer of credential.stunTurnConfig.stunServers) {
          iceServers.push({ urls: stunServer });
        }
      }
      if (credential.stunTurnConfig.turnServers) {
        for (const turnServer of credential.stunTurnConfig.turnServers) {
          iceServers.push({
            urls: turnServer.url,
            username: turnServer.username,
            credential: turnServer.credential,
          });
        }
      }
    }

    if (iceServers.length === 0) {
      iceServers.push(
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" }
      );
    }

    return {
      credentialId: credential.id,
      sipDomain: credential.sipDomain,
      sipUsername: credential.sipUsername,
      sipPassword: credential.sipPassword,
      sipUri: credential.sipUri,
      displayName: credential.displayName || credential.phoneNumber,
      wsServer,
      iceServers,
      audioCodecs: credential.codecPreferences,
      transportProtocol: credential.transportProtocol,
    };
  });

// ============================================================================
// Registration Tracking Functions
// ============================================================================

/**
 * Update registration status (called when WebRTC client registers)
 */
export const updateWebRTCRegistrationFn = createServerFn({
  method: "POST",
})
  .middleware([authenticatedMiddleware])
  .inputValidator(updateRegistrationSchema)
  .handler(async ({ data, context }) => {
    // Verify ownership
    const credential = await getSipCredentialById(data.credentialId);
    if (!credential) {
      throw new Error("Credential not found");
    }
    if (credential.userId !== context.userId) {
      throw new Error("Unauthorized");
    }

    // Update registration info
    await updateLastRegistration(
      data.credentialId,
      data.ipAddress,
      data.userAgent
    );

    return { success: true };
  });

// ============================================================================
// Call Event Logging Functions
// ============================================================================

/**
 * Log a call event from WebRTC client
 */
export const logWebRTCCallEventFn = createServerFn({
  method: "POST",
})
  .middleware([authenticatedMiddleware])
  .inputValidator(callEventSchema)
  .handler(async ({ data, context }) => {
    // Verify ownership
    const credential = await getSipCredentialById(data.credentialId);
    if (!credential) {
      throw new Error("Credential not found");
    }
    if (credential.userId !== context.userId) {
      throw new Error("Unauthorized");
    }

    // Log the call event
    // In a full implementation, this would create a call record
    console.log(
      `[WebRTC Call Event] User: ${context.userId}, ` +
        `Call: ${data.callId}, Event: ${data.event}, ` +
        `Direction: ${data.direction}, Remote: ${data.remoteUri || "unknown"}`
    );

    // TODO: Create call record in database if needed
    // This would integrate with the existing call-records data access

    return { success: true };
  });

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check WebRTC browser compatibility requirements
 */
export const checkWebRTCCompatibilityFn = createServerFn({
  method: "GET",
})
  .handler(async () => {
    // This runs on server, so we return info about what's needed
    return {
      requirements: {
        webrtc: "RTCPeerConnection API",
        mediaDevices: "navigator.mediaDevices API",
        getUserMedia: "getUserMedia support",
        webSocket: "WebSocket support",
      },
      recommendedBrowsers: [
        "Chrome 70+",
        "Firefox 65+",
        "Safari 14+",
        "Edge 79+",
      ],
      audioCodecs: ["OPUS", "G722", "PCMU", "PCMA"],
    };
  });
