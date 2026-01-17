/**
 * KYC Verification Data Access Layer
 *
 * Data access functions for KYC (Know Your Customer) verification.
 * Handles verification creation, document uploads, status management,
 * tier configuration, and audit trail tracking.
 */

import { eq, and, desc, asc, or, isNull, gt, lt, sql } from "drizzle-orm";
import { database } from "~/db";
import {
  kycVerification,
  kycDocument,
  kycVerificationHistory,
  kycTierConfig,
  user,
  type KycVerification,
  type CreateKycVerificationData,
  type UpdateKycVerificationData,
  type KycDocumentRecord,
  type CreateKycDocumentData,
  type UpdateKycDocumentData,
  type KycVerificationHistory,
  type CreateKycVerificationHistoryData,
  type KycTierConfig,
  type CreateKycTierConfigData,
  type UpdateKycTierConfigData,
  type KycVerificationStatus,
  type KycDocumentStatus,
  type KycTierLevel,
  type KycDocumentType,
} from "~/db/schema";
import { nanoid } from "nanoid";

// ==========================================
// KYC VERIFICATION FUNCTIONS
// ==========================================

/**
 * Create a new KYC verification record for a user
 */
export async function createKycVerification(
  data: Omit<CreateKycVerificationData, "id" | "createdAt" | "updatedAt">
): Promise<KycVerification> {
  const id = nanoid();
  const now = new Date();

  const [result] = await database
    .insert(kycVerification)
    .values({
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  // Create initial history entry
  await createKycVerificationHistoryEntry({
    kycVerificationId: id,
    action: "created",
    actionById: data.userId,
    actionByRole: "user",
    newStatus: data.status || "not_started",
    newTier: data.tierLevel || "none",
  });

  return result;
}

/**
 * Get KYC verification by ID
 */
export async function getKycVerificationById(
  id: string
): Promise<KycVerification | null> {
  const [result] = await database
    .select()
    .from(kycVerification)
    .where(eq(kycVerification.id, id))
    .limit(1);

  return result || null;
}

/**
 * Get KYC verification by user ID
 */
export async function getKycVerificationByUserId(
  userId: string
): Promise<KycVerification | null> {
  const [result] = await database
    .select()
    .from(kycVerification)
    .where(eq(kycVerification.userId, userId))
    .limit(1);

  return result || null;
}

/**
 * Get KYC verification with all related data
 */
export async function getKycVerificationWithRelations(id: string) {
  return database.query.kycVerification.findFirst({
    where: eq(kycVerification.id, id),
    with: {
      user: {
        columns: { id: true, name: true, email: true },
      },
      documents: true,
      history: {
        orderBy: [desc(kycVerificationHistory.actionAt)],
      },
      reviewer: {
        columns: { id: true, name: true },
      },
      approver: {
        columns: { id: true, name: true },
      },
    },
  });
}

/**
 * Get KYC verification with relations by user ID
 */
export async function getKycVerificationWithRelationsByUserId(userId: string) {
  return database.query.kycVerification.findFirst({
    where: eq(kycVerification.userId, userId),
    with: {
      documents: true,
      history: {
        orderBy: [desc(kycVerificationHistory.actionAt)],
        limit: 10,
      },
    },
  });
}

/**
 * Update KYC verification
 */
export async function updateKycVerification(
  id: string,
  data: UpdateKycVerificationData,
  actionById?: string,
  actionByRole?: string,
  comments?: string
): Promise<KycVerification | null> {
  const existing = await getKycVerificationById(id);
  if (!existing) return null;

  const now = new Date();
  const updateData: UpdateKycVerificationData = {
    ...data,
    updatedAt: now,
  };

  // Track status change
  if (data.status && data.status !== existing.status) {
    updateData.previousStatus = existing.status;
    updateData.lastStatusChangeAt = now;
  }

  updateData.lastActivityAt = now;

  const [result] = await database
    .update(kycVerification)
    .set(updateData)
    .where(eq(kycVerification.id, id))
    .returning();

  // Create history entry if there was a significant change
  if (data.status || data.tierLevel) {
    await createKycVerificationHistoryEntry({
      kycVerificationId: id,
      action: data.status ? "status_changed" : "tier_changed",
      actionById,
      actionByRole,
      previousStatus: existing.status,
      newStatus: data.status || existing.status,
      previousTier: existing.tierLevel,
      newTier: data.tierLevel || existing.tierLevel,
      comments,
    });
  }

  return result;
}

/**
 * Submit KYC verification for review
 */
export async function submitKycVerification(
  id: string,
  ipAddress?: string,
  userAgent?: string
): Promise<KycVerification | null> {
  const existing = await getKycVerificationById(id);
  if (!existing) return null;

  const now = new Date();

  const [result] = await database
    .update(kycVerification)
    .set({
      status: "submitted",
      submittedAt: now,
      submissionIpAddress: ipAddress,
      submissionUserAgent: userAgent,
      previousStatus: existing.status,
      lastStatusChangeAt: now,
      lastActivityAt: now,
      updatedAt: now,
    })
    .where(eq(kycVerification.id, id))
    .returning();

  await createKycVerificationHistoryEntry({
    kycVerificationId: id,
    action: "submitted",
    actionById: existing.userId,
    actionByRole: "user",
    previousStatus: existing.status,
    newStatus: "submitted",
    ipAddress,
    userAgent,
  });

  return result;
}

/**
 * Approve KYC verification
 */
export async function approveKycVerification(
  id: string,
  approvedById: string,
  tierLevel: KycTierLevel,
  comments?: string
): Promise<KycVerification | null> {
  const existing = await getKycVerificationById(id);
  if (!existing) return null;

  // Get tier config for limits
  const tierConfig = await getKycTierConfigByLevel(tierLevel);
  const now = new Date();

  // Calculate expiration date if tier has validity period
  let expiresAt: Date | undefined;
  if (tierConfig?.validityDays) {
    expiresAt = new Date(now.getTime() + tierConfig.validityDays * 24 * 60 * 60 * 1000);
  }

  const [result] = await database
    .update(kycVerification)
    .set({
      status: "approved",
      tierLevel,
      approvedAt: now,
      approvedById,
      expiresAt,
      previousStatus: existing.status,
      lastStatusChangeAt: now,
      lastActivityAt: now,
      updatedAt: now,
      // Apply tier limits
      dailyTransactionLimit: tierConfig?.dailyTransactionLimit,
      weeklyTransactionLimit: tierConfig?.weeklyTransactionLimit,
      monthlyTransactionLimit: tierConfig?.monthlyTransactionLimit,
      singleTransactionLimit: tierConfig?.singleTransactionLimit,
      annualTransactionLimit: tierConfig?.annualTransactionLimit,
    })
    .where(eq(kycVerification.id, id))
    .returning();

  await createKycVerificationHistoryEntry({
    kycVerificationId: id,
    action: "approved",
    actionById: approvedById,
    actionByRole: "admin",
    previousStatus: existing.status,
    newStatus: "approved",
    previousTier: existing.tierLevel,
    newTier: tierLevel,
    comments,
  });

  return result;
}

/**
 * Reject KYC verification
 */
export async function rejectKycVerification(
  id: string,
  rejectedById: string,
  rejectionReason: string,
  rejectionDetails?: object
): Promise<KycVerification | null> {
  const existing = await getKycVerificationById(id);
  if (!existing) return null;

  const now = new Date();

  const [result] = await database
    .update(kycVerification)
    .set({
      status: "rejected",
      rejectedAt: now,
      rejectedById,
      rejectionReason,
      rejectionDetails: rejectionDetails ? JSON.stringify(rejectionDetails) : undefined,
      previousStatus: existing.status,
      lastStatusChangeAt: now,
      lastActivityAt: now,
      updatedAt: now,
    })
    .where(eq(kycVerification.id, id))
    .returning();

  await createKycVerificationHistoryEntry({
    kycVerificationId: id,
    action: "rejected",
    actionById: rejectedById,
    actionByRole: "admin",
    previousStatus: existing.status,
    newStatus: "rejected",
    comments: rejectionReason,
    details: rejectionDetails ? JSON.stringify(rejectionDetails) : undefined,
  });

  return result;
}

/**
 * List KYC verifications with filters and pagination
 */
export async function listKycVerifications(options: {
  status?: KycVerificationStatus | KycVerificationStatus[];
  tierLevel?: KycTierLevel;
  page?: number;
  limit?: number;
  orderBy?: "createdAt" | "submittedAt" | "approvedAt";
  orderDir?: "asc" | "desc";
}): Promise<{ data: KycVerification[]; total: number }> {
  const {
    status,
    tierLevel,
    page = 1,
    limit = 20,
    orderBy = "createdAt",
    orderDir = "desc",
  } = options;

  const conditions = [];

  if (status) {
    if (Array.isArray(status)) {
      conditions.push(or(...status.map((s) => eq(kycVerification.status, s))));
    } else {
      conditions.push(eq(kycVerification.status, status));
    }
  }

  if (tierLevel) {
    conditions.push(eq(kycVerification.tierLevel, tierLevel));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const orderColumn =
    orderBy === "submittedAt"
      ? kycVerification.submittedAt
      : orderBy === "approvedAt"
        ? kycVerification.approvedAt
        : kycVerification.createdAt;

  const [data, countResult] = await Promise.all([
    database
      .select()
      .from(kycVerification)
      .where(whereClause)
      .orderBy(orderDir === "asc" ? asc(orderColumn) : desc(orderColumn))
      .limit(limit)
      .offset((page - 1) * limit),
    database
      .select({ count: sql<number>`count(*)` })
      .from(kycVerification)
      .where(whereClause),
  ]);

  return {
    data,
    total: Number(countResult[0]?.count || 0),
  };
}

/**
 * Get pending KYC verifications for review queue
 */
export async function getPendingKycVerificationsForReview(
  limit: number = 20
): Promise<KycVerification[]> {
  return database
    .select()
    .from(kycVerification)
    .where(
      or(
        eq(kycVerification.status, "submitted"),
        eq(kycVerification.status, "under_review")
      )
    )
    .orderBy(asc(kycVerification.submittedAt))
    .limit(limit);
}

/**
 * Check and update expired KYC verifications
 */
export async function expireKycVerifications(): Promise<number> {
  const now = new Date();

  const result = await database
    .update(kycVerification)
    .set({
      status: "expired",
      previousStatus: sql`${kycVerification.status}`,
      lastStatusChangeAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(kycVerification.status, "approved"),
        lt(kycVerification.expiresAt, now)
      )
    );

  return 0; // Drizzle doesn't return affected row count easily
}

// ==========================================
// KYC DOCUMENT FUNCTIONS
// ==========================================

/**
 * Create a new KYC document
 */
export async function createKycDocument(
  data: Omit<CreateKycDocumentData, "id" | "createdAt" | "updatedAt">
): Promise<KycDocumentRecord> {
  const id = nanoid();
  const now = new Date();

  const [result] = await database
    .insert(kycDocument)
    .values({
      ...data,
      id,
      uploadedAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  // Create history entry
  await createKycVerificationHistoryEntry({
    kycVerificationId: data.kycVerificationId,
    action: "document_uploaded",
    actionById: data.userId,
    actionByRole: "user",
    documentId: id,
    documentType: data.documentType,
  });

  // Update verification last activity
  await database
    .update(kycVerification)
    .set({ lastActivityAt: now, updatedAt: now })
    .where(eq(kycVerification.id, data.kycVerificationId));

  return result;
}

/**
 * Get KYC document by ID
 */
export async function getKycDocumentById(
  id: string
): Promise<KycDocumentRecord | null> {
  const [result] = await database
    .select()
    .from(kycDocument)
    .where(eq(kycDocument.id, id))
    .limit(1);

  return result || null;
}

/**
 * Get all documents for a KYC verification
 */
export async function getKycDocumentsByVerificationId(
  verificationId: string
): Promise<KycDocumentRecord[]> {
  return database
    .select()
    .from(kycDocument)
    .where(eq(kycDocument.kycVerificationId, verificationId))
    .orderBy(desc(kycDocument.uploadedAt));
}

/**
 * Get documents by user ID
 */
export async function getKycDocumentsByUserId(
  userId: string
): Promise<KycDocumentRecord[]> {
  return database
    .select()
    .from(kycDocument)
    .where(eq(kycDocument.userId, userId))
    .orderBy(desc(kycDocument.uploadedAt));
}

/**
 * Update KYC document
 */
export async function updateKycDocument(
  id: string,
  data: UpdateKycDocumentData
): Promise<KycDocumentRecord | null> {
  const now = new Date();

  const [result] = await database
    .update(kycDocument)
    .set({
      ...data,
      updatedAt: now,
    })
    .where(eq(kycDocument.id, id))
    .returning();

  return result || null;
}

/**
 * Verify a KYC document
 */
export async function verifyKycDocument(
  id: string,
  verifiedById: string,
  extractedData?: object
): Promise<KycDocumentRecord | null> {
  const existing = await getKycDocumentById(id);
  if (!existing) return null;

  const now = new Date();

  const [result] = await database
    .update(kycDocument)
    .set({
      status: "verified",
      verifiedAt: now,
      verifiedById,
      extractedData: extractedData ? JSON.stringify(extractedData) : undefined,
      updatedAt: now,
    })
    .where(eq(kycDocument.id, id))
    .returning();

  await createKycVerificationHistoryEntry({
    kycVerificationId: existing.kycVerificationId,
    action: "document_verified",
    actionById: verifiedById,
    actionByRole: "admin",
    documentId: id,
    documentType: existing.documentType,
  });

  return result;
}

/**
 * Reject a KYC document
 */
export async function rejectKycDocument(
  id: string,
  rejectedById: string,
  rejectionReason: string
): Promise<KycDocumentRecord | null> {
  const existing = await getKycDocumentById(id);
  if (!existing) return null;

  const now = new Date();

  const [result] = await database
    .update(kycDocument)
    .set({
      status: "rejected",
      rejectedAt: now,
      rejectedById,
      rejectionReason,
      updatedAt: now,
    })
    .where(eq(kycDocument.id, id))
    .returning();

  await createKycVerificationHistoryEntry({
    kycVerificationId: existing.kycVerificationId,
    action: "document_rejected",
    actionById: rejectedById,
    actionByRole: "admin",
    documentId: id,
    documentType: existing.documentType,
    comments: rejectionReason,
  });

  return result;
}

/**
 * Delete a KYC document
 */
export async function deleteKycDocument(id: string): Promise<boolean> {
  const existing = await getKycDocumentById(id);
  if (!existing) return false;

  await database.delete(kycDocument).where(eq(kycDocument.id, id));

  await createKycVerificationHistoryEntry({
    kycVerificationId: existing.kycVerificationId,
    action: "document_deleted",
    documentId: id,
    documentType: existing.documentType,
  });

  return true;
}

// ==========================================
// KYC VERIFICATION HISTORY FUNCTIONS
// ==========================================

/**
 * Create a KYC verification history entry
 */
export async function createKycVerificationHistoryEntry(
  data: Omit<CreateKycVerificationHistoryData, "id" | "actionAt">
): Promise<KycVerificationHistory> {
  const id = nanoid();
  const now = new Date();

  const [result] = await database
    .insert(kycVerificationHistory)
    .values({
      ...data,
      id,
      actionAt: now,
    })
    .returning();

  return result;
}

/**
 * Get history for a KYC verification
 */
export async function getKycVerificationHistory(
  verificationId: string,
  limit: number = 50
): Promise<KycVerificationHistory[]> {
  return database
    .select()
    .from(kycVerificationHistory)
    .where(eq(kycVerificationHistory.kycVerificationId, verificationId))
    .orderBy(desc(kycVerificationHistory.actionAt))
    .limit(limit);
}

// ==========================================
// KYC TIER CONFIGURATION FUNCTIONS
// ==========================================

/**
 * Create a KYC tier configuration
 */
export async function createKycTierConfig(
  data: Omit<CreateKycTierConfigData, "id" | "createdAt" | "updatedAt">
): Promise<KycTierConfig> {
  const id = nanoid();
  const now = new Date();

  const [result] = await database
    .insert(kycTierConfig)
    .values({
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return result;
}

/**
 * Get KYC tier configuration by ID
 */
export async function getKycTierConfigById(
  id: string
): Promise<KycTierConfig | null> {
  const [result] = await database
    .select()
    .from(kycTierConfig)
    .where(eq(kycTierConfig.id, id))
    .limit(1);

  return result || null;
}

/**
 * Get KYC tier configuration by tier level
 */
export async function getKycTierConfigByLevel(
  tierLevel: KycTierLevel
): Promise<KycTierConfig | null> {
  const [result] = await database
    .select()
    .from(kycTierConfig)
    .where(
      and(
        eq(kycTierConfig.tierLevel, tierLevel),
        eq(kycTierConfig.isActive, true)
      )
    )
    .limit(1);

  return result || null;
}

/**
 * Get all active KYC tier configurations
 */
export async function getAllKycTierConfigs(): Promise<KycTierConfig[]> {
  return database
    .select()
    .from(kycTierConfig)
    .where(eq(kycTierConfig.isActive, true))
    .orderBy(asc(kycTierConfig.priority));
}

/**
 * Update KYC tier configuration
 */
export async function updateKycTierConfig(
  id: string,
  data: UpdateKycTierConfigData
): Promise<KycTierConfig | null> {
  const now = new Date();

  const [result] = await database
    .update(kycTierConfig)
    .set({
      ...data,
      updatedAt: now,
    })
    .where(eq(kycTierConfig.id, id))
    .returning();

  return result || null;
}

/**
 * Deactivate a KYC tier configuration
 */
export async function deactivateKycTierConfig(id: string): Promise<boolean> {
  const now = new Date();

  await database
    .update(kycTierConfig)
    .set({
      isActive: false,
      updatedAt: now,
    })
    .where(eq(kycTierConfig.id, id));

  return true;
}

// ==========================================
// TRANSACTION LIMIT FUNCTIONS
// ==========================================

/**
 * Check if a transaction is within limits
 */
export async function checkTransactionLimits(
  userId: string,
  amount: string
): Promise<{
  allowed: boolean;
  reason?: string;
  remainingDaily?: string;
  remainingMonthly?: string;
}> {
  const verification = await getKycVerificationByUserId(userId);

  if (!verification) {
    return { allowed: false, reason: "KYC verification not found" };
  }

  if (verification.status !== "approved") {
    return { allowed: false, reason: "KYC verification not approved" };
  }

  const amountNum = parseFloat(amount);

  // Check single transaction limit
  if (verification.singleTransactionLimit) {
    const singleLimit = parseFloat(verification.singleTransactionLimit);
    if (amountNum > singleLimit) {
      return {
        allowed: false,
        reason: `Amount exceeds single transaction limit of ${verification.singleTransactionLimit}`,
      };
    }
  }

  // Check daily limit
  if (verification.dailyTransactionLimit) {
    const dailyLimit = parseFloat(verification.dailyTransactionLimit);
    const dailyTotal = parseFloat(verification.dailyTransactionTotal);
    const remainingDaily = dailyLimit - dailyTotal;

    if (amountNum > remainingDaily) {
      return {
        allowed: false,
        reason: `Amount exceeds remaining daily limit`,
        remainingDaily: remainingDaily.toFixed(2),
      };
    }
  }

  // Check monthly limit
  if (verification.monthlyTransactionLimit) {
    const monthlyLimit = parseFloat(verification.monthlyTransactionLimit);
    const monthlyTotal = parseFloat(verification.monthlyTransactionTotal);
    const remainingMonthly = monthlyLimit - monthlyTotal;

    if (amountNum > remainingMonthly) {
      return {
        allowed: false,
        reason: `Amount exceeds remaining monthly limit`,
        remainingMonthly: remainingMonthly.toFixed(2),
      };
    }
  }

  return {
    allowed: true,
    remainingDaily: verification.dailyTransactionLimit
      ? (
          parseFloat(verification.dailyTransactionLimit) -
          parseFloat(verification.dailyTransactionTotal)
        ).toFixed(2)
      : undefined,
    remainingMonthly: verification.monthlyTransactionLimit
      ? (
          parseFloat(verification.monthlyTransactionLimit) -
          parseFloat(verification.monthlyTransactionTotal)
        ).toFixed(2)
      : undefined,
  };
}

/**
 * Update transaction totals after a transaction
 */
export async function updateTransactionTotals(
  userId: string,
  amount: string
): Promise<void> {
  const verification = await getKycVerificationByUserId(userId);
  if (!verification) return;

  const amountNum = parseFloat(amount);
  const now = new Date();

  // Check if we need to reset daily/monthly totals
  const lastReset = verification.lastLimitResetDate;
  const shouldResetDaily =
    !lastReset ||
    lastReset.toDateString() !== now.toDateString();
  const shouldResetMonthly =
    !lastReset ||
    lastReset.getMonth() !== now.getMonth() ||
    lastReset.getFullYear() !== now.getFullYear();

  const newDailyTotal = shouldResetDaily
    ? amountNum
    : parseFloat(verification.dailyTransactionTotal) + amountNum;

  const newMonthlyTotal = shouldResetMonthly
    ? amountNum
    : parseFloat(verification.monthlyTransactionTotal) + amountNum;

  await database
    .update(kycVerification)
    .set({
      dailyTransactionTotal: newDailyTotal.toFixed(2),
      monthlyTransactionTotal: newMonthlyTotal.toFixed(2),
      lastLimitResetDate: now,
      updatedAt: now,
    })
    .where(eq(kycVerification.userId, userId));
}

/**
 * Reset daily transaction totals (for scheduled job)
 */
export async function resetDailyTransactionTotals(): Promise<void> {
  const now = new Date();

  await database
    .update(kycVerification)
    .set({
      dailyTransactionTotal: "0.00",
      lastLimitResetDate: now,
      updatedAt: now,
    })
    .where(eq(kycVerification.status, "approved"));
}

/**
 * Reset monthly transaction totals (for scheduled job)
 */
export async function resetMonthlyTransactionTotals(): Promise<void> {
  const now = new Date();

  await database
    .update(kycVerification)
    .set({
      monthlyTransactionTotal: "0.00",
      updatedAt: now,
    })
    .where(eq(kycVerification.status, "approved"));
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Get or create KYC verification for a user
 */
export async function getOrCreateKycVerification(
  userId: string
): Promise<KycVerification> {
  const existing = await getKycVerificationByUserId(userId);

  if (existing) {
    return existing;
  }

  return createKycVerification({
    userId,
    status: "not_started",
    tierLevel: "none",
  });
}

/**
 * Check if user has required tier for an action
 */
export async function hasRequiredTier(
  userId: string,
  requiredTier: KycTierLevel
): Promise<boolean> {
  const verification = await getKycVerificationByUserId(userId);

  if (!verification || verification.status !== "approved") {
    return false;
  }

  const tierPriority: Record<KycTierLevel, number> = {
    none: 0,
    basic: 1,
    intermediate: 2,
    advanced: 3,
    premium: 4,
  };

  return (
    tierPriority[verification.tierLevel as KycTierLevel] >=
    tierPriority[requiredTier]
  );
}

/**
 * Get user's current KYC status summary
 */
export async function getKycStatusSummary(userId: string): Promise<{
  status: KycVerificationStatus;
  tierLevel: KycTierLevel;
  isApproved: boolean;
  documentsCount: number;
  pendingDocuments: number;
  expiresAt?: Date;
} | null> {
  const verification = await getKycVerificationWithRelationsByUserId(userId);

  if (!verification) {
    return null;
  }

  const documents = verification.documents || [];
  const pendingDocs = documents.filter((d) => d.status === "pending");

  return {
    status: verification.status as KycVerificationStatus,
    tierLevel: verification.tierLevel as KycTierLevel,
    isApproved: verification.status === "approved",
    documentsCount: documents.length,
    pendingDocuments: pendingDocs.length,
    expiresAt: verification.expiresAt || undefined,
  };
}

/**
 * Initialize default tier configurations
 */
export async function initializeDefaultTierConfigs(): Promise<void> {
  const existingConfigs = await getAllKycTierConfigs();

  if (existingConfigs.length > 0) {
    return; // Already initialized
  }

  const defaultConfigs: Omit<CreateKycTierConfigData, "id" | "createdAt" | "updatedAt">[] = [
    {
      tierLevel: "none",
      name: "Unverified",
      description: "No verification completed",
      requiredDocuments: JSON.stringify([]),
      dailyTransactionLimit: "0.00",
      monthlyTransactionLimit: "0.00",
      singleTransactionLimit: "0.00",
      canWithdraw: false,
      canDeposit: false,
      canTransfer: false,
      canTrade: false,
      requiresPhoneVerification: false,
      requiresEmailVerification: false,
      requiresAddressVerification: false,
      requiresManualReview: false,
      priority: 0,
      isActive: true,
    },
    {
      tierLevel: "basic",
      name: "Basic",
      description: "Basic verification with email confirmation",
      requiredDocuments: JSON.stringify(["selfie"]),
      dailyTransactionLimit: "1000.00",
      monthlyTransactionLimit: "5000.00",
      singleTransactionLimit: "500.00",
      canWithdraw: false,
      canDeposit: true,
      canTransfer: false,
      canTrade: true,
      requiresPhoneVerification: false,
      requiresEmailVerification: true,
      requiresAddressVerification: false,
      requiresManualReview: false,
      validityDays: 365,
      priority: 1,
      isActive: true,
    },
    {
      tierLevel: "intermediate",
      name: "Intermediate",
      description: "Intermediate verification with ID document",
      requiredDocuments: JSON.stringify(["passport", "selfie"]),
      dailyTransactionLimit: "10000.00",
      monthlyTransactionLimit: "50000.00",
      singleTransactionLimit: "5000.00",
      canWithdraw: true,
      canDeposit: true,
      canTransfer: true,
      canTrade: true,
      requiresPhoneVerification: true,
      requiresEmailVerification: true,
      requiresAddressVerification: false,
      requiresManualReview: false,
      validityDays: 365,
      priority: 2,
      isActive: true,
    },
    {
      tierLevel: "advanced",
      name: "Advanced",
      description: "Advanced verification with address proof",
      requiredDocuments: JSON.stringify(["passport", "proof_of_address", "selfie"]),
      dailyTransactionLimit: "50000.00",
      monthlyTransactionLimit: "200000.00",
      singleTransactionLimit: "25000.00",
      canWithdraw: true,
      canDeposit: true,
      canTransfer: true,
      canTrade: true,
      requiresPhoneVerification: true,
      requiresEmailVerification: true,
      requiresAddressVerification: true,
      requiresManualReview: true,
      validityDays: 365,
      priority: 3,
      isActive: true,
    },
    {
      tierLevel: "premium",
      name: "Premium",
      description: "Premium verification with full documentation",
      requiredDocuments: JSON.stringify(["passport", "proof_of_address", "bank_statement", "selfie"]),
      dailyTransactionLimit: "500000.00",
      monthlyTransactionLimit: "2000000.00",
      singleTransactionLimit: "100000.00",
      canWithdraw: true,
      canDeposit: true,
      canTransfer: true,
      canTrade: true,
      requiresPhoneVerification: true,
      requiresEmailVerification: true,
      requiresAddressVerification: true,
      requiresManualReview: true,
      validityDays: 365,
      priority: 4,
      isActive: true,
    },
  ];

  for (const config of defaultConfigs) {
    await createKycTierConfig(config);
  }
}
