import { eq, desc, and, or, count, sql, gte, lte, isNull } from "drizzle-orm";
import { database } from "~/db";
import {
  qrPaymentRequest,
  userWallet,
  walletTransaction,
  user,
  type QrPaymentRequest,
  type CreateQrPaymentRequestData,
  type UpdateQrPaymentRequestData,
  type QrPaymentStatus,
  type QrPaymentType,
} from "~/db/schema";

// =============================================================================
// Type Definitions
// =============================================================================

export type QrPaymentWithMerchant = QrPaymentRequest & {
  merchant: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
};

export type QrPaymentWithPayer = QrPaymentRequest & {
  payer: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  } | null;
};

export type QrPaymentWithDetails = QrPaymentRequest & {
  merchant: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
  payer: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  } | null;
};

export interface QrPaymentFilters {
  merchantId?: string;
  payerId?: string;
  status?: QrPaymentStatus;
  type?: QrPaymentType;
  startDate?: Date;
  endDate?: Date;
  isExpired?: boolean;
  limit?: number;
  offset?: number;
}

// =============================================================================
// QR Payment CRUD Operations
// =============================================================================

/**
 * Create a new QR payment request
 */
export async function createQrPaymentRequest(
  data: CreateQrPaymentRequestData
): Promise<QrPaymentRequest> {
  const [result] = await database
    .insert(qrPaymentRequest)
    .values({
      ...data,
      updatedAt: new Date(),
    })
    .returning();

  return result;
}

/**
 * Find a QR payment request by ID
 */
export async function findQrPaymentById(
  id: string
): Promise<QrPaymentRequest | null> {
  const [result] = await database
    .select()
    .from(qrPaymentRequest)
    .where(eq(qrPaymentRequest.id, id))
    .limit(1);

  return result || null;
}

/**
 * Find a QR payment request by QR code
 */
export async function findQrPaymentByQrCode(
  qrCode: string
): Promise<QrPaymentRequest | null> {
  const [result] = await database
    .select()
    .from(qrPaymentRequest)
    .where(eq(qrPaymentRequest.qrCode, qrCode))
    .limit(1);

  return result || null;
}

/**
 * Find a QR payment request by short code
 */
export async function findQrPaymentByShortCode(
  shortCode: string
): Promise<QrPaymentRequest | null> {
  const [result] = await database
    .select()
    .from(qrPaymentRequest)
    .where(eq(qrPaymentRequest.shortCode, shortCode))
    .limit(1);

  return result || null;
}

/**
 * Find a QR payment request by ID with merchant details
 */
export async function findQrPaymentByIdWithMerchant(
  id: string
): Promise<QrPaymentWithMerchant | null> {
  const [result] = await database
    .select({
      id: qrPaymentRequest.id,
      qrCode: qrPaymentRequest.qrCode,
      shortCode: qrPaymentRequest.shortCode,
      type: qrPaymentRequest.type,
      merchantId: qrPaymentRequest.merchantId,
      merchantInfo: qrPaymentRequest.merchantInfo,
      amount: qrPaymentRequest.amount,
      currency: qrPaymentRequest.currency,
      minAmount: qrPaymentRequest.minAmount,
      maxAmount: qrPaymentRequest.maxAmount,
      feeAmount: qrPaymentRequest.feeAmount,
      feeType: qrPaymentRequest.feeType,
      feePercentage: qrPaymentRequest.feePercentage,
      status: qrPaymentRequest.status,
      expiresAt: qrPaymentRequest.expiresAt,
      isExpired: qrPaymentRequest.isExpired,
      description: qrPaymentRequest.description,
      reference: qrPaymentRequest.reference,
      paymentAttempts: qrPaymentRequest.paymentAttempts,
      attemptCount: qrPaymentRequest.attemptCount,
      paidAt: qrPaymentRequest.paidAt,
      paidBy: qrPaymentRequest.paidBy,
      payerWalletId: qrPaymentRequest.payerWalletId,
      transactionId: qrPaymentRequest.transactionId,
      paidAmount: qrPaymentRequest.paidAmount,
      paidCurrency: qrPaymentRequest.paidCurrency,
      refundedAmount: qrPaymentRequest.refundedAmount,
      refunds: qrPaymentRequest.refunds,
      isFullyRefunded: qrPaymentRequest.isFullyRefunded,
      metadata: qrPaymentRequest.metadata,
      idempotencyKey: qrPaymentRequest.idempotencyKey,
      qrCodeImageUrl: qrPaymentRequest.qrCodeImageUrl,
      qrCodeFormat: qrPaymentRequest.qrCodeFormat,
      notifyMerchantOnPayment: qrPaymentRequest.notifyMerchantOnPayment,
      notifyPayerOnPayment: qrPaymentRequest.notifyPayerOnPayment,
      merchantNotifiedAt: qrPaymentRequest.merchantNotifiedAt,
      payerNotifiedAt: qrPaymentRequest.payerNotifiedAt,
      cancelledAt: qrPaymentRequest.cancelledAt,
      cancelledBy: qrPaymentRequest.cancelledBy,
      cancellationReason: qrPaymentRequest.cancellationReason,
      lastError: qrPaymentRequest.lastError,
      lastErrorAt: qrPaymentRequest.lastErrorAt,
      createdAt: qrPaymentRequest.createdAt,
      updatedAt: qrPaymentRequest.updatedAt,
      merchant: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      },
    })
    .from(qrPaymentRequest)
    .innerJoin(user, eq(qrPaymentRequest.merchantId, user.id))
    .where(eq(qrPaymentRequest.id, id))
    .limit(1);

  return result || null;
}

/**
 * Update a QR payment request
 */
export async function updateQrPaymentRequest(
  id: string,
  data: UpdateQrPaymentRequestData
): Promise<QrPaymentRequest> {
  const [result] = await database
    .update(qrPaymentRequest)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(qrPaymentRequest.id, id))
    .returning();

  return result;
}

/**
 * Delete a QR payment request
 */
export async function deleteQrPaymentRequest(id: string): Promise<void> {
  await database
    .delete(qrPaymentRequest)
    .where(eq(qrPaymentRequest.id, id));
}

/**
 * Get all QR payment requests with filters
 */
export async function getAllQrPaymentRequests(
  filters: QrPaymentFilters = {}
): Promise<QrPaymentRequest[]> {
  const conditions = [];

  if (filters.merchantId) {
    conditions.push(eq(qrPaymentRequest.merchantId, filters.merchantId));
  }

  if (filters.payerId) {
    conditions.push(eq(qrPaymentRequest.paidBy, filters.payerId));
  }

  if (filters.status) {
    conditions.push(eq(qrPaymentRequest.status, filters.status));
  }

  if (filters.type) {
    conditions.push(eq(qrPaymentRequest.type, filters.type));
  }

  if (filters.isExpired !== undefined) {
    conditions.push(eq(qrPaymentRequest.isExpired, filters.isExpired));
  }

  if (filters.startDate) {
    conditions.push(gte(qrPaymentRequest.createdAt, filters.startDate));
  }

  if (filters.endDate) {
    conditions.push(lte(qrPaymentRequest.createdAt, filters.endDate));
  }

  const query = database
    .select()
    .from(qrPaymentRequest)
    .orderBy(desc(qrPaymentRequest.createdAt))
    .limit(filters.limit || 50)
    .offset(filters.offset || 0);

  if (conditions.length > 0) {
    return await query.where(and(...conditions));
  }

  return await query;
}

/**
 * Get QR payment requests count
 */
export async function getQrPaymentRequestsCount(
  filters: QrPaymentFilters = {}
): Promise<number> {
  const conditions = [];

  if (filters.merchantId) {
    conditions.push(eq(qrPaymentRequest.merchantId, filters.merchantId));
  }

  if (filters.payerId) {
    conditions.push(eq(qrPaymentRequest.paidBy, filters.payerId));
  }

  if (filters.status) {
    conditions.push(eq(qrPaymentRequest.status, filters.status));
  }

  if (filters.type) {
    conditions.push(eq(qrPaymentRequest.type, filters.type));
  }

  if (filters.isExpired !== undefined) {
    conditions.push(eq(qrPaymentRequest.isExpired, filters.isExpired));
  }

  const query = database
    .select({ count: count() })
    .from(qrPaymentRequest);

  if (conditions.length > 0) {
    const [result] = await query.where(and(...conditions));
    return result?.count || 0;
  }

  const [result] = await query;
  return result?.count || 0;
}

/**
 * Get QR payment requests by merchant
 */
export async function getQrPaymentsByMerchant(
  merchantId: string,
  filters: Omit<QrPaymentFilters, "merchantId"> = {}
): Promise<QrPaymentRequest[]> {
  return getAllQrPaymentRequests({ ...filters, merchantId });
}

/**
 * Get pending QR payment requests
 */
export async function getPendingQrPayments(
  filters: Omit<QrPaymentFilters, "status"> = {}
): Promise<QrPaymentRequest[]> {
  return getAllQrPaymentRequests({ ...filters, status: "pending" });
}

/**
 * Get expired QR payment requests that need status update
 */
export async function getExpiredQrPayments(): Promise<QrPaymentRequest[]> {
  const now = new Date();

  const results = await database
    .select()
    .from(qrPaymentRequest)
    .where(
      and(
        eq(qrPaymentRequest.status, "pending"),
        eq(qrPaymentRequest.isExpired, false),
        lte(qrPaymentRequest.expiresAt, now)
      )
    );

  return results;
}

/**
 * Mark QR payment as expired
 */
export async function markQrPaymentAsExpired(
  id: string
): Promise<QrPaymentRequest> {
  return updateQrPaymentRequest(id, {
    status: "expired",
    isExpired: true,
  });
}

/**
 * Process payment for a QR payment request
 */
export async function processQrPayment(
  id: string,
  paymentData: {
    paidBy: string;
    payerWalletId: string;
    transactionId: string;
    paidAmount: string;
    paidCurrency: string;
  }
): Promise<QrPaymentRequest> {
  return updateQrPaymentRequest(id, {
    status: "completed",
    paidAt: new Date(),
    paidBy: paymentData.paidBy,
    payerWalletId: paymentData.payerWalletId,
    transactionId: paymentData.transactionId,
    paidAmount: paymentData.paidAmount,
    paidCurrency: paymentData.paidCurrency,
  });
}

/**
 * Cancel a QR payment request
 */
export async function cancelQrPayment(
  id: string,
  cancelledBy: string,
  reason?: string
): Promise<QrPaymentRequest> {
  return updateQrPaymentRequest(id, {
    status: "cancelled",
    cancelledAt: new Date(),
    cancelledBy,
    cancellationReason: reason || null,
  });
}

/**
 * Record a refund for a QR payment
 */
export async function refundQrPayment(
  id: string,
  refundData: {
    refundedAmount: string;
    refunds: string; // JSON string of refund records
    isFullyRefunded: boolean;
  }
): Promise<QrPaymentRequest> {
  return updateQrPaymentRequest(id, {
    status: refundData.isFullyRefunded ? "refunded" : undefined,
    refundedAmount: refundData.refundedAmount,
    refunds: refundData.refunds,
    isFullyRefunded: refundData.isFullyRefunded,
  });
}

/**
 * Check if QR code is unique
 */
export async function isQrCodeUnique(qrCode: string): Promise<boolean> {
  const existing = await findQrPaymentByQrCode(qrCode);
  return !existing;
}

/**
 * Check if short code is unique
 */
export async function isShortCodeUnique(shortCode: string): Promise<boolean> {
  const existing = await findQrPaymentByShortCode(shortCode);
  return !existing;
}
