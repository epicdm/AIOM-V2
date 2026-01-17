/**
 * SIP Credentials Data Access Layer
 *
 * Data access functions for SIP credential management.
 * Handles provisioning, retrieval, and lifecycle management of SIP accounts.
 * Sensitive fields (sipPassword) are encrypted using AES-256-GCM.
 */

import { eq, and, desc } from "drizzle-orm";
import { database } from "~/db";
import { sipCredential, user } from "~/db/schema";
import { nanoid } from "nanoid";
import crypto from "crypto";
import {
  encryptSensitiveField,
  decryptSensitiveField,
} from "~/lib/encryption";

// Types
export interface ProvisionSipCredentialInput {
  userId: string;
  phoneNumber: string;
  displayName?: string;
  sipDomain?: string;
  transportProtocol?: "UDP" | "TCP" | "TLS";
}

export interface SipCredentialResult {
  id: string;
  userId: string;
  sipUsername: string;
  sipPassword: string;
  sipDomain: string;
  sipUri: string;
  phoneNumber: string;
  displayName: string | null;
  status: string;
  transportProtocol: string;
  codecPreferences: string[];
  stunTurnConfig: {
    stunServers: string[];
    turnServers?: { url: string; username: string; credential: string }[];
  } | null;
  provisionedAt: Date;
  createdAt: Date;
}

export interface SipCredentialSummary {
  id: string;
  sipUsername: string;
  sipDomain: string;
  sipUri: string;
  phoneNumber: string;
  displayName: string | null;
  status: string;
  provisionedAt: Date;
}

// Default configuration
const DEFAULT_SIP_DOMAIN = "sip.soundstation.io";
const DEFAULT_STUN_SERVERS = [
  "stun:stun.l.google.com:19302",
  "stun:stun1.l.google.com:19302",
];

/**
 * Generate a unique SIP username
 */
function generateSipUsername(phoneNumber: string): string {
  // Use the phone number digits + random suffix for uniqueness
  const phoneDigits = phoneNumber.replace(/\D/g, "").slice(-6);
  const randomSuffix = nanoid(4).toLowerCase();
  return `u${phoneDigits}${randomSuffix}`;
}

/**
 * Generate a secure SIP password
 */
function generateSipPassword(): string {
  // Generate a 16-character password with mixed characters
  return crypto.randomBytes(12).toString("base64").replace(/[+/=]/g, "x");
}

/**
 * Provision new SIP credentials for a user
 * Password is encrypted before storing in the database.
 */
export async function provisionSipCredential(
  input: ProvisionSipCredentialInput
): Promise<SipCredentialResult> {
  const id = nanoid();
  const sipDomain = input.sipDomain || DEFAULT_SIP_DOMAIN;
  const sipUsername = generateSipUsername(input.phoneNumber);
  const sipPassword = generateSipPassword();
  const sipUri = `sip:${sipUsername}@${sipDomain}`;
  const now = new Date();

  const stunTurnConfig = {
    stunServers: DEFAULT_STUN_SERVERS,
  };

  const codecPreferences = ["OPUS", "G722", "PCMU"];

  // Encrypt the SIP password before storing
  const encryptedPassword = encryptSensitiveField(sipPassword);

  await database.insert(sipCredential).values({
    id,
    userId: input.userId,
    sipUsername,
    sipPassword: encryptedPassword,
    sipDomain,
    sipUri,
    phoneNumber: input.phoneNumber,
    displayName: input.displayName,
    status: "active",
    transportProtocol: input.transportProtocol || "TLS",
    registrationExpiresSeconds: 3600,
    codecPreferences: JSON.stringify(codecPreferences),
    stunTurnConfig: JSON.stringify(stunTurnConfig),
    provisionedAt: now,
    provisionedBy: "system",
    createdAt: now,
    updatedAt: now,
  });

  // Return the plaintext password to the caller (for display to user)
  return {
    id,
    userId: input.userId,
    sipUsername,
    sipPassword, // Return plaintext for initial provisioning display
    sipDomain,
    sipUri,
    phoneNumber: input.phoneNumber,
    displayName: input.displayName || null,
    status: "active",
    transportProtocol: input.transportProtocol || "TLS",
    codecPreferences,
    stunTurnConfig,
    provisionedAt: now,
    createdAt: now,
  };
}

/**
 * Decrypts SIP password from database format
 * Handles both encrypted and legacy plaintext passwords for backwards compatibility
 */
function decryptPassword(encryptedPassword: string): string {
  return decryptSensitiveField(encryptedPassword);
}

/**
 * Get SIP credentials by ID
 */
export async function getSipCredentialById(
  id: string
): Promise<SipCredentialResult | null> {
  const credentials = await database
    .select()
    .from(sipCredential)
    .where(eq(sipCredential.id, id))
    .limit(1);

  if (credentials.length === 0) {
    return null;
  }

  const cred = credentials[0];
  return {
    id: cred.id,
    userId: cred.userId,
    sipUsername: cred.sipUsername,
    sipPassword: decryptPassword(cred.sipPassword),
    sipDomain: cred.sipDomain,
    sipUri: cred.sipUri,
    phoneNumber: cred.phoneNumber,
    displayName: cred.displayName,
    status: cred.status,
    transportProtocol: cred.transportProtocol,
    codecPreferences: JSON.parse(cred.codecPreferences),
    stunTurnConfig: cred.stunTurnConfig ? JSON.parse(cred.stunTurnConfig) : null,
    provisionedAt: cred.provisionedAt,
    createdAt: cred.createdAt,
  };
}

/**
 * Get all SIP credentials for a user
 */
export async function getUserSipCredentials(
  userId: string
): Promise<SipCredentialSummary[]> {
  const credentials = await database
    .select({
      id: sipCredential.id,
      sipUsername: sipCredential.sipUsername,
      sipDomain: sipCredential.sipDomain,
      sipUri: sipCredential.sipUri,
      phoneNumber: sipCredential.phoneNumber,
      displayName: sipCredential.displayName,
      status: sipCredential.status,
      provisionedAt: sipCredential.provisionedAt,
    })
    .from(sipCredential)
    .where(eq(sipCredential.userId, userId))
    .orderBy(desc(sipCredential.provisionedAt));

  return credentials;
}

/**
 * Get active SIP credential for a user's phone number
 */
export async function getActiveSipCredentialByPhoneNumber(
  userId: string,
  phoneNumber: string
): Promise<SipCredentialResult | null> {
  const credentials = await database
    .select()
    .from(sipCredential)
    .where(
      and(
        eq(sipCredential.userId, userId),
        eq(sipCredential.phoneNumber, phoneNumber),
        eq(sipCredential.status, "active")
      )
    )
    .limit(1);

  if (credentials.length === 0) {
    return null;
  }

  const cred = credentials[0];
  return {
    id: cred.id,
    userId: cred.userId,
    sipUsername: cred.sipUsername,
    sipPassword: decryptPassword(cred.sipPassword),
    sipDomain: cred.sipDomain,
    sipUri: cred.sipUri,
    phoneNumber: cred.phoneNumber,
    displayName: cred.displayName,
    status: cred.status,
    transportProtocol: cred.transportProtocol,
    codecPreferences: JSON.parse(cred.codecPreferences),
    stunTurnConfig: cred.stunTurnConfig ? JSON.parse(cred.stunTurnConfig) : null,
    provisionedAt: cred.provisionedAt,
    createdAt: cred.createdAt,
  };
}

/**
 * Suspend SIP credentials
 */
export async function suspendSipCredential(
  id: string,
  reason: string
): Promise<boolean> {
  const now = new Date();

  await database
    .update(sipCredential)
    .set({
      status: "suspended",
      suspendedAt: now,
      suspendedReason: reason,
      updatedAt: now,
    })
    .where(eq(sipCredential.id, id));

  return true;
}

/**
 * Reactivate suspended SIP credentials
 */
export async function reactivateSipCredential(id: string): Promise<boolean> {
  const now = new Date();

  await database
    .update(sipCredential)
    .set({
      status: "active",
      suspendedAt: null,
      suspendedReason: null,
      updatedAt: now,
    })
    .where(
      and(eq(sipCredential.id, id), eq(sipCredential.status, "suspended"))
    );

  return true;
}

/**
 * Revoke SIP credentials permanently
 */
export async function revokeSipCredential(
  id: string,
  reason: string
): Promise<boolean> {
  const now = new Date();

  await database
    .update(sipCredential)
    .set({
      status: "revoked",
      revokedAt: now,
      revokedReason: reason,
      updatedAt: now,
    })
    .where(eq(sipCredential.id, id));

  return true;
}

/**
 * Update SIP credential display name
 */
export async function updateSipDisplayName(
  id: string,
  displayName: string
): Promise<boolean> {
  const now = new Date();

  await database
    .update(sipCredential)
    .set({
      displayName,
      updatedAt: now,
    })
    .where(eq(sipCredential.id, id));

  return true;
}

/**
 * Update last registration info
 */
export async function updateLastRegistration(
  id: string,
  ipAddress: string,
  userAgent: string
): Promise<boolean> {
  const now = new Date();

  await database
    .update(sipCredential)
    .set({
      lastRegistrationAt: now,
      lastRegistrationIp: ipAddress,
      lastRegistrationUserAgent: userAgent,
      updatedAt: now,
    })
    .where(eq(sipCredential.id, id));

  return true;
}

/**
 * Regenerate SIP password
 * Returns the new plaintext password while storing encrypted in the database.
 */
export async function regenerateSipPassword(
  id: string
): Promise<{ newPassword: string } | null> {
  const credentials = await database
    .select({ id: sipCredential.id, status: sipCredential.status })
    .from(sipCredential)
    .where(eq(sipCredential.id, id))
    .limit(1);

  if (credentials.length === 0 || credentials[0].status !== "active") {
    return null;
  }

  const newPassword = generateSipPassword();
  const encryptedPassword = encryptSensitiveField(newPassword);
  const now = new Date();

  await database
    .update(sipCredential)
    .set({
      sipPassword: encryptedPassword,
      updatedAt: now,
    })
    .where(eq(sipCredential.id, id));

  return { newPassword };
}

/**
 * Check if user has active SIP credentials
 */
export async function userHasActiveSipCredentials(
  userId: string
): Promise<boolean> {
  const credentials = await database
    .select({ id: sipCredential.id })
    .from(sipCredential)
    .where(
      and(eq(sipCredential.userId, userId), eq(sipCredential.status, "active"))
    )
    .limit(1);

  return credentials.length > 0;
}

/**
 * Get SIP credential by username (for authentication)
 */
export async function getSipCredentialByUsername(
  sipUsername: string
): Promise<SipCredentialResult | null> {
  const credentials = await database
    .select()
    .from(sipCredential)
    .where(eq(sipCredential.sipUsername, sipUsername))
    .limit(1);

  if (credentials.length === 0) {
    return null;
  }

  const cred = credentials[0];
  return {
    id: cred.id,
    userId: cred.userId,
    sipUsername: cred.sipUsername,
    sipPassword: decryptPassword(cred.sipPassword),
    sipDomain: cred.sipDomain,
    sipUri: cred.sipUri,
    phoneNumber: cred.phoneNumber,
    displayName: cred.displayName,
    status: cred.status,
    transportProtocol: cred.transportProtocol,
    codecPreferences: JSON.parse(cred.codecPreferences),
    stunTurnConfig: cred.stunTurnConfig ? JSON.parse(cred.stunTurnConfig) : null,
    provisionedAt: cred.provisionedAt,
    createdAt: cred.createdAt,
  };
}
