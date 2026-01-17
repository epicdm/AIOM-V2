/**
 * Phone Verification Data Access Layer
 *
 * Data access functions for phone number verification via OTP.
 * Handles OTP generation, storage, validation, and expiration.
 */

import { eq, and, desc, gt, lt } from "drizzle-orm";
import { database } from "~/db";
import { phoneVerification, user } from "~/db/schema";
import { nanoid } from "nanoid";

// Types
export interface CreatePhoneVerificationInput {
  phoneNumber: string;
  userId?: string;
  deviceId?: string;
  devicePlatform?: "ios" | "android" | "web";
  ipAddress?: string;
  expirationMinutes?: number;
}

export interface VerifyOTPInput {
  phoneNumber: string;
  otpCode: string;
  deviceId?: string;
}

export interface PhoneVerificationResult {
  id: string;
  phoneNumber: string;
  status: string;
  userId: string | null;
  expiresAt: Date;
  createdAt: Date;
}

/**
 * Generate a random 6-digit OTP code
 */
function generateOTPCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Create a new phone verification record with OTP
 */
export async function createPhoneVerification(
  input: CreatePhoneVerificationInput
): Promise<{
  verification: PhoneVerificationResult;
  otpCode: string;
}> {
  const id = nanoid();
  const otpCode = generateOTPCode();
  const expirationMinutes = input.expirationMinutes || 10;
  const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);
  const now = new Date();

  // First, expire any existing pending verifications for this phone number
  await database
    .update(phoneVerification)
    .set({
      status: "expired",
      updatedAt: now,
    })
    .where(
      and(
        eq(phoneVerification.phoneNumber, input.phoneNumber),
        eq(phoneVerification.status, "pending")
      )
    );

  // Create new verification record
  await database.insert(phoneVerification).values({
    id,
    phoneNumber: input.phoneNumber,
    otpCode,
    userId: input.userId,
    status: "pending",
    attemptCount: 0,
    maxAttempts: 3,
    expiresAt,
    deviceId: input.deviceId,
    devicePlatform: input.devicePlatform,
    ipAddress: input.ipAddress,
    createdAt: now,
    updatedAt: now,
  });

  return {
    verification: {
      id,
      phoneNumber: input.phoneNumber,
      status: "pending",
      userId: input.userId || null,
      expiresAt,
      createdAt: now,
    },
    otpCode,
  };
}

/**
 * Verify an OTP code for a phone number
 */
export async function verifyOTP(
  input: VerifyOTPInput
): Promise<{
  success: boolean;
  verificationId?: string;
  userId?: string;
  error?: string;
}> {
  const now = new Date();

  // Find the most recent pending verification for this phone number
  const verifications = await database
    .select()
    .from(phoneVerification)
    .where(
      and(
        eq(phoneVerification.phoneNumber, input.phoneNumber),
        eq(phoneVerification.status, "pending"),
        gt(phoneVerification.expiresAt, now)
      )
    )
    .orderBy(desc(phoneVerification.createdAt))
    .limit(1);

  if (verifications.length === 0) {
    return {
      success: false,
      error: "No pending verification found. Please request a new code.",
    };
  }

  const verification = verifications[0];

  // Check if max attempts exceeded
  if (verification.attemptCount >= verification.maxAttempts) {
    await database
      .update(phoneVerification)
      .set({
        status: "failed",
        updatedAt: now,
      })
      .where(eq(phoneVerification.id, verification.id));

    return {
      success: false,
      error: "Maximum verification attempts exceeded. Please request a new code.",
    };
  }

  // Increment attempt count
  await database
    .update(phoneVerification)
    .set({
      attemptCount: verification.attemptCount + 1,
      updatedAt: now,
    })
    .where(eq(phoneVerification.id, verification.id));

  // Verify the OTP code
  if (verification.otpCode !== input.otpCode) {
    const remainingAttempts = verification.maxAttempts - verification.attemptCount - 1;
    return {
      success: false,
      error: `Invalid verification code. ${remainingAttempts} attempts remaining.`,
    };
  }

  // OTP is correct - mark as verified
  await database
    .update(phoneVerification)
    .set({
      status: "verified",
      verifiedAt: now,
      updatedAt: now,
    })
    .where(eq(phoneVerification.id, verification.id));

  return {
    success: true,
    verificationId: verification.id,
    userId: verification.userId || undefined,
  };
}

/**
 * Get a phone verification by ID
 */
export async function getPhoneVerificationById(
  id: string
): Promise<PhoneVerificationResult | null> {
  const verifications = await database
    .select({
      id: phoneVerification.id,
      phoneNumber: phoneVerification.phoneNumber,
      status: phoneVerification.status,
      userId: phoneVerification.userId,
      expiresAt: phoneVerification.expiresAt,
      createdAt: phoneVerification.createdAt,
    })
    .from(phoneVerification)
    .where(eq(phoneVerification.id, id))
    .limit(1);

  return verifications[0] || null;
}

/**
 * Get the latest verification for a phone number
 */
export async function getLatestVerificationByPhoneNumber(
  phoneNumber: string
): Promise<PhoneVerificationResult | null> {
  const verifications = await database
    .select({
      id: phoneVerification.id,
      phoneNumber: phoneVerification.phoneNumber,
      status: phoneVerification.status,
      userId: phoneVerification.userId,
      expiresAt: phoneVerification.expiresAt,
      createdAt: phoneVerification.createdAt,
    })
    .from(phoneVerification)
    .where(eq(phoneVerification.phoneNumber, phoneNumber))
    .orderBy(desc(phoneVerification.createdAt))
    .limit(1);

  return verifications[0] || null;
}

/**
 * Link a user to a verified phone verification
 */
export async function linkUserToVerification(
  verificationId: string,
  userId: string
): Promise<boolean> {
  const now = new Date();

  await database
    .update(phoneVerification)
    .set({
      userId,
      updatedAt: now,
    })
    .where(
      and(
        eq(phoneVerification.id, verificationId),
        eq(phoneVerification.status, "verified")
      )
    );

  return true;
}

/**
 * Check if a phone number has been verified recently
 */
export async function isPhoneNumberVerified(phoneNumber: string): Promise<boolean> {
  const now = new Date();
  // Consider verified within the last 24 hours as valid
  const validFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const verifications = await database
    .select({ id: phoneVerification.id })
    .from(phoneVerification)
    .where(
      and(
        eq(phoneVerification.phoneNumber, phoneNumber),
        eq(phoneVerification.status, "verified"),
        gt(phoneVerification.verifiedAt, validFrom)
      )
    )
    .limit(1);

  return verifications.length > 0;
}

/**
 * Cleanup expired verifications (for maintenance)
 */
export async function cleanupExpiredVerifications(): Promise<number> {
  const now = new Date();

  const result = await database
    .update(phoneVerification)
    .set({
      status: "expired",
      updatedAt: now,
    })
    .where(
      and(
        eq(phoneVerification.status, "pending"),
        lt(phoneVerification.expiresAt, now)
      )
    );

  return 0; // Drizzle doesn't return affected row count easily
}

/**
 * Get verification history for a user
 */
export async function getUserVerificationHistory(
  userId: string,
  limit: number = 10
): Promise<PhoneVerificationResult[]> {
  const verifications = await database
    .select({
      id: phoneVerification.id,
      phoneNumber: phoneVerification.phoneNumber,
      status: phoneVerification.status,
      userId: phoneVerification.userId,
      expiresAt: phoneVerification.expiresAt,
      createdAt: phoneVerification.createdAt,
    })
    .from(phoneVerification)
    .where(eq(phoneVerification.userId, userId))
    .orderBy(desc(phoneVerification.createdAt))
    .limit(limit);

  return verifications;
}

/**
 * Update phone number on user record after successful verification
 */
export async function updateUserPhoneNumber(
  userId: string,
  phoneNumber: string
): Promise<boolean> {
  // Note: The user table doesn't have a phone field in the current schema
  // This is a placeholder - you may need to add a phone field to the user table
  // or store it in a separate user_profile or similar table

  // For now, we'll just return true as the verification is stored
  return true;
}
