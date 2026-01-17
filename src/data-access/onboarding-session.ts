/**
 * Onboarding Session Data Access Layer
 *
 * Data access functions for managing the multi-step onboarding flow.
 * Tracks user progress through phone verification and SIP provisioning.
 */

import { eq, and, gt, desc } from "drizzle-orm";
import { database } from "~/db";
import { onboardingSession, type OnboardingStep } from "~/db/schema";
import { nanoid } from "nanoid";

// Types
export interface CreateOnboardingSessionInput {
  userId?: string;
  deviceId?: string;
  devicePlatform?: "ios" | "android" | "web";
  deviceName?: string;
  expirationHours?: number;
}

export interface OnboardingSessionResult {
  id: string;
  userId: string | null;
  currentStep: OnboardingStep;
  phoneNumber: string | null;
  phoneVerificationId: string | null;
  sipCredentialId: string | null;
  deviceId: string | null;
  devicePlatform: string | null;
  isCompleted: boolean;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateOnboardingSessionInput {
  currentStep?: OnboardingStep;
  phoneNumber?: string;
  phoneVerificationId?: string;
  sipCredentialId?: string;
  userId?: string;
  isCompleted?: boolean;
  sessionData?: Record<string, unknown>;
}

/**
 * Create a new onboarding session
 */
export async function createOnboardingSession(
  input: CreateOnboardingSessionInput
): Promise<OnboardingSessionResult> {
  const id = nanoid();
  const expirationHours = input.expirationHours || 1; // Default 1 hour
  const expiresAt = new Date(Date.now() + expirationHours * 60 * 60 * 1000);
  const now = new Date();

  await database.insert(onboardingSession).values({
    id,
    userId: input.userId,
    currentStep: "phone_input",
    deviceId: input.deviceId,
    devicePlatform: input.devicePlatform,
    deviceName: input.deviceName,
    isCompleted: false,
    expiresAt,
    createdAt: now,
    updatedAt: now,
  });

  return {
    id,
    userId: input.userId || null,
    currentStep: "phone_input",
    phoneNumber: null,
    phoneVerificationId: null,
    sipCredentialId: null,
    deviceId: input.deviceId || null,
    devicePlatform: input.devicePlatform || null,
    isCompleted: false,
    expiresAt,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Get an onboarding session by ID
 */
export async function getOnboardingSession(
  id: string
): Promise<OnboardingSessionResult | null> {
  const sessions = await database
    .select({
      id: onboardingSession.id,
      userId: onboardingSession.userId,
      currentStep: onboardingSession.currentStep,
      phoneNumber: onboardingSession.phoneNumber,
      phoneVerificationId: onboardingSession.phoneVerificationId,
      sipCredentialId: onboardingSession.sipCredentialId,
      deviceId: onboardingSession.deviceId,
      devicePlatform: onboardingSession.devicePlatform,
      isCompleted: onboardingSession.isCompleted,
      expiresAt: onboardingSession.expiresAt,
      createdAt: onboardingSession.createdAt,
      updatedAt: onboardingSession.updatedAt,
    })
    .from(onboardingSession)
    .where(eq(onboardingSession.id, id))
    .limit(1);

  if (sessions.length === 0) {
    return null;
  }

  const session = sessions[0];
  return {
    ...session,
    currentStep: session.currentStep as OnboardingStep,
  };
}

/**
 * Get active onboarding session for a device
 */
export async function getActiveSessionByDevice(
  deviceId: string
): Promise<OnboardingSessionResult | null> {
  const now = new Date();

  const sessions = await database
    .select({
      id: onboardingSession.id,
      userId: onboardingSession.userId,
      currentStep: onboardingSession.currentStep,
      phoneNumber: onboardingSession.phoneNumber,
      phoneVerificationId: onboardingSession.phoneVerificationId,
      sipCredentialId: onboardingSession.sipCredentialId,
      deviceId: onboardingSession.deviceId,
      devicePlatform: onboardingSession.devicePlatform,
      isCompleted: onboardingSession.isCompleted,
      expiresAt: onboardingSession.expiresAt,
      createdAt: onboardingSession.createdAt,
      updatedAt: onboardingSession.updatedAt,
    })
    .from(onboardingSession)
    .where(
      and(
        eq(onboardingSession.deviceId, deviceId),
        eq(onboardingSession.isCompleted, false),
        gt(onboardingSession.expiresAt, now)
      )
    )
    .orderBy(desc(onboardingSession.createdAt))
    .limit(1);

  if (sessions.length === 0) {
    return null;
  }

  const session = sessions[0];
  return {
    ...session,
    currentStep: session.currentStep as OnboardingStep,
  };
}

/**
 * Update an onboarding session
 */
export async function updateOnboardingSession(
  id: string,
  input: UpdateOnboardingSessionInput
): Promise<OnboardingSessionResult | null> {
  const now = new Date();

  const updateData: Record<string, unknown> = {
    updatedAt: now,
  };

  if (input.currentStep !== undefined) {
    updateData.currentStep = input.currentStep;
  }
  if (input.phoneNumber !== undefined) {
    updateData.phoneNumber = input.phoneNumber;
  }
  if (input.phoneVerificationId !== undefined) {
    updateData.phoneVerificationId = input.phoneVerificationId;
  }
  if (input.sipCredentialId !== undefined) {
    updateData.sipCredentialId = input.sipCredentialId;
  }
  if (input.userId !== undefined) {
    updateData.userId = input.userId;
  }
  if (input.isCompleted !== undefined) {
    updateData.isCompleted = input.isCompleted;
    if (input.isCompleted) {
      updateData.completedAt = now;
    }
  }
  if (input.sessionData !== undefined) {
    updateData.sessionData = JSON.stringify(input.sessionData);
  }

  await database
    .update(onboardingSession)
    .set(updateData as never)
    .where(eq(onboardingSession.id, id));

  return getOnboardingSession(id);
}

/**
 * Advance to the next step in the onboarding flow
 */
export async function advanceOnboardingStep(
  id: string,
  additionalData?: UpdateOnboardingSessionInput
): Promise<OnboardingSessionResult | null> {
  const session = await getOnboardingSession(id);
  if (!session) {
    return null;
  }

  const stepOrder: OnboardingStep[] = [
    "phone_input",
    "otp_verification",
    "account_link",
    "sip_provisioning",
    "complete",
  ];

  const currentIndex = stepOrder.indexOf(session.currentStep);
  if (currentIndex === -1 || currentIndex >= stepOrder.length - 1) {
    // Already at final step or invalid step
    return session;
  }

  const nextStep = stepOrder[currentIndex + 1];

  return updateOnboardingSession(id, {
    ...additionalData,
    currentStep: nextStep,
    isCompleted: nextStep === "complete",
  });
}

/**
 * Complete the onboarding session
 */
export async function completeOnboardingSession(
  id: string,
  sipCredentialId: string,
  userId: string
): Promise<OnboardingSessionResult | null> {
  return updateOnboardingSession(id, {
    currentStep: "complete",
    sipCredentialId,
    userId,
    isCompleted: true,
  });
}

/**
 * Check if an onboarding session is valid (not expired)
 */
export async function isSessionValid(id: string): Promise<boolean> {
  const session = await getOnboardingSession(id);
  if (!session) {
    return false;
  }

  const now = new Date();
  return session.expiresAt > now && !session.isCompleted;
}

/**
 * Extend session expiration
 */
export async function extendSessionExpiration(
  id: string,
  additionalHours: number = 1
): Promise<boolean> {
  const session = await getOnboardingSession(id);
  if (!session) {
    return false;
  }

  const newExpiration = new Date(
    session.expiresAt.getTime() + additionalHours * 60 * 60 * 1000
  );
  const now = new Date();

  await database
    .update(onboardingSession)
    .set({
      expiresAt: newExpiration,
      updatedAt: now,
    })
    .where(eq(onboardingSession.id, id));

  return true;
}

/**
 * Get user's onboarding history
 */
export async function getUserOnboardingHistory(
  userId: string,
  limit: number = 10
): Promise<OnboardingSessionResult[]> {
  const sessions = await database
    .select({
      id: onboardingSession.id,
      userId: onboardingSession.userId,
      currentStep: onboardingSession.currentStep,
      phoneNumber: onboardingSession.phoneNumber,
      phoneVerificationId: onboardingSession.phoneVerificationId,
      sipCredentialId: onboardingSession.sipCredentialId,
      deviceId: onboardingSession.deviceId,
      devicePlatform: onboardingSession.devicePlatform,
      isCompleted: onboardingSession.isCompleted,
      expiresAt: onboardingSession.expiresAt,
      createdAt: onboardingSession.createdAt,
      updatedAt: onboardingSession.updatedAt,
    })
    .from(onboardingSession)
    .where(eq(onboardingSession.userId, userId))
    .orderBy(desc(onboardingSession.createdAt))
    .limit(limit);

  return sessions.map((s) => ({
    ...s,
    currentStep: s.currentStep as OnboardingStep,
  }));
}

/**
 * Cancel an onboarding session
 */
export async function cancelOnboardingSession(id: string): Promise<boolean> {
  const now = new Date();

  await database
    .update(onboardingSession)
    .set({
      expiresAt: now, // Expire immediately
      updatedAt: now,
    })
    .where(eq(onboardingSession.id, id));

  return true;
}
