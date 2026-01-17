import { eq, desc, and, or, count, sql, gte, lte } from "drizzle-orm";
import { database } from "~/db";
import {
  userWallet,
  walletTransaction,
  walletAuditLog,
  user,
  type UserWallet,
  type CreateUserWalletData,
  type UpdateUserWalletData,
  type WalletTransaction,
  type CreateWalletTransactionData,
  type UpdateWalletTransactionData,
  type WalletAuditLog,
  type CreateWalletAuditLogData,
  type WalletStatus,
  type WalletTransactionType,
  type WalletTransactionStatus,
  type KycVerificationStatus,
  type WalletAuditAction,
} from "~/db/schema";

// =============================================================================
// Type Definitions
// =============================================================================

export type WalletWithUser = UserWallet & {
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
};

export type WalletWithTransactions = UserWallet & {
  transactions: WalletTransaction[];
};

export type TransactionWithWallet = WalletTransaction & {
  wallet: UserWallet;
};

export interface WalletFilters {
  status?: WalletStatus;
  kycStatus?: KycVerificationStatus;
  currency?: string;
  limit?: number;
  offset?: number;
}

export interface WalletTransactionFilters {
  walletId?: string;
  type?: WalletTransactionType;
  status?: WalletTransactionStatus;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface WalletAuditFilters {
  walletId?: string;
  action?: WalletAuditAction;
  actorId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

// =============================================================================
// Wallet CRUD Operations
// =============================================================================

/**
 * Create a new wallet for a user
 */
export async function createWallet(
  data: CreateUserWalletData
): Promise<UserWallet> {
  const [result] = await database
    .insert(userWallet)
    .values({
      ...data,
      updatedAt: new Date(),
    })
    .returning();

  return result;
}

/**
 * Find a wallet by ID
 */
export async function findWalletById(
  id: string
): Promise<UserWallet | null> {
  const [result] = await database
    .select()
    .from(userWallet)
    .where(eq(userWallet.id, id))
    .limit(1);

  return result || null;
}

/**
 * Find a wallet by user ID
 */
export async function findWalletByUserId(
  userId: string
): Promise<UserWallet | null> {
  const [result] = await database
    .select()
    .from(userWallet)
    .where(eq(userWallet.userId, userId))
    .limit(1);

  return result || null;
}

/**
 * Find a wallet by ID with user information
 */
export async function findWalletByIdWithUser(
  id: string
): Promise<WalletWithUser | null> {
  const result = await database.query.userWallet.findFirst({
    where: eq(userWallet.id, id),
    with: {
      user: {
        columns: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });

  return result as WalletWithUser | null;
}

/**
 * Find a wallet with recent transactions
 */
export async function findWalletWithTransactions(
  id: string,
  transactionLimit: number = 10
): Promise<WalletWithTransactions | null> {
  const wallet = await findWalletById(id);
  if (!wallet) return null;

  const transactions = await getWalletTransactions({
    walletId: id,
    limit: transactionLimit,
  });

  return {
    ...wallet,
    transactions,
  };
}

/**
 * Update a wallet
 */
export async function updateWallet(
  id: string,
  data: UpdateUserWalletData
): Promise<UserWallet | null> {
  const [result] = await database
    .update(userWallet)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(userWallet.id, id))
    .returning();

  return result || null;
}

/**
 * Get all wallets with optional filters
 */
export async function getAllWallets(
  filters: WalletFilters = {}
): Promise<UserWallet[]> {
  const { status, kycStatus, currency, limit = 50, offset = 0 } = filters;

  const conditions = [];

  if (status) {
    conditions.push(eq(userWallet.status, status));
  }

  if (kycStatus) {
    conditions.push(eq(userWallet.kycStatus, kycStatus));
  }

  if (currency) {
    conditions.push(eq(userWallet.currency, currency));
  }

  const query = database
    .select()
    .from(userWallet)
    .orderBy(desc(userWallet.createdAt))
    .limit(limit)
    .offset(offset);

  if (conditions.length > 0) {
    return await query.where(and(...conditions));
  }

  return await query;
}

/**
 * Get wallet count with optional filters
 */
export async function getWalletCount(
  filters: WalletFilters = {}
): Promise<number> {
  const { status, kycStatus, currency } = filters;

  const conditions = [];

  if (status) {
    conditions.push(eq(userWallet.status, status));
  }

  if (kycStatus) {
    conditions.push(eq(userWallet.kycStatus, kycStatus));
  }

  if (currency) {
    conditions.push(eq(userWallet.currency, currency));
  }

  const query = database.select({ count: count() }).from(userWallet);

  if (conditions.length > 0) {
    const results = await query.where(and(...conditions));
    return results[0]?.count || 0;
  }

  const results = await query;
  return results[0]?.count || 0;
}

// =============================================================================
// Wallet Status Operations
// =============================================================================

/**
 * Freeze a wallet
 */
export async function freezeWallet(
  id: string,
  reason: string
): Promise<UserWallet | null> {
  return await updateWallet(id, {
    status: "frozen",
    statusChangedAt: new Date(),
    statusChangeReason: reason,
  });
}

/**
 * Unfreeze a wallet
 */
export async function unfreezeWallet(
  id: string
): Promise<UserWallet | null> {
  return await updateWallet(id, {
    status: "active",
    statusChangedAt: new Date(),
    statusChangeReason: "Wallet unfrozen",
  });
}

/**
 * Suspend a wallet
 */
export async function suspendWallet(
  id: string,
  reason: string
): Promise<UserWallet | null> {
  return await updateWallet(id, {
    status: "suspended",
    statusChangedAt: new Date(),
    statusChangeReason: reason,
  });
}

/**
 * Close a wallet
 */
export async function closeWallet(
  id: string,
  reason: string
): Promise<UserWallet | null> {
  return await updateWallet(id, {
    status: "closed",
    statusChangedAt: new Date(),
    statusChangeReason: reason,
  });
}

// =============================================================================
// KYC Operations
// =============================================================================

/**
 * Update KYC status
 */
export async function updateKycStatus(
  id: string,
  kycStatus: KycVerificationStatus,
  kycLevel?: string,
  expiresAt?: Date
): Promise<UserWallet | null> {
  const updateData: UpdateUserWalletData = {
    kycStatus,
  };

  if (kycLevel) {
    updateData.kycLevel = kycLevel;
  }

  if (kycStatus === "approved") {
    updateData.kycApprovedAt = new Date();
    if (expiresAt) {
      updateData.kycExpiresAt = expiresAt;
    }
  } else if (kycStatus === "pending" || kycStatus === "under_review") {
    updateData.kycSubmittedAt = new Date();
  }

  return await updateWallet(id, updateData);
}

// =============================================================================
// Balance Operations
// =============================================================================

/**
 * Update wallet balance (use with transaction for atomicity)
 */
export async function updateWalletBalance(
  id: string,
  newBalance: string,
  newAvailableBalance?: string,
  newPendingBalance?: string
): Promise<UserWallet | null> {
  const updateData: UpdateUserWalletData = {
    balance: newBalance,
  };

  if (newAvailableBalance !== undefined) {
    updateData.availableBalance = newAvailableBalance;
  }

  if (newPendingBalance !== undefined) {
    updateData.pendingBalance = newPendingBalance;
  }

  return await updateWallet(id, updateData);
}

/**
 * Get wallet balance summary
 */
export async function getWalletBalanceSummary(id: string): Promise<{
  balance: string;
  availableBalance: string;
  pendingBalance: string;
  currency: string;
} | null> {
  const wallet = await findWalletById(id);
  if (!wallet) return null;

  return {
    balance: wallet.balance,
    availableBalance: wallet.availableBalance,
    pendingBalance: wallet.pendingBalance,
    currency: wallet.currency,
  };
}

// =============================================================================
// Transaction CRUD Operations
// =============================================================================

/**
 * Create a wallet transaction
 */
export async function createWalletTransaction(
  data: CreateWalletTransactionData
): Promise<WalletTransaction> {
  const [result] = await database
    .insert(walletTransaction)
    .values({
      ...data,
      updatedAt: new Date(),
    })
    .returning();

  return result;
}

/**
 * Find a transaction by ID
 */
export async function findTransactionById(
  id: string
): Promise<WalletTransaction | null> {
  const [result] = await database
    .select()
    .from(walletTransaction)
    .where(eq(walletTransaction.id, id))
    .limit(1);

  return result || null;
}

/**
 * Find a transaction by idempotency key
 */
export async function findTransactionByIdempotencyKey(
  idempotencyKey: string
): Promise<WalletTransaction | null> {
  const [result] = await database
    .select()
    .from(walletTransaction)
    .where(eq(walletTransaction.idempotencyKey, idempotencyKey))
    .limit(1);

  return result || null;
}

/**
 * Update a wallet transaction
 */
export async function updateWalletTransaction(
  id: string,
  data: UpdateWalletTransactionData
): Promise<WalletTransaction | null> {
  const [result] = await database
    .update(walletTransaction)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(walletTransaction.id, id))
    .returning();

  return result || null;
}

/**
 * Get wallet transactions with optional filters
 */
export async function getWalletTransactions(
  filters: WalletTransactionFilters = {}
): Promise<WalletTransaction[]> {
  const { walletId, type, status, startDate, endDate, limit = 50, offset = 0 } = filters;

  const conditions = [];

  if (walletId) {
    conditions.push(eq(walletTransaction.walletId, walletId));
  }

  if (type) {
    conditions.push(eq(walletTransaction.type, type));
  }

  if (status) {
    conditions.push(eq(walletTransaction.status, status));
  }

  if (startDate) {
    conditions.push(gte(walletTransaction.createdAt, startDate));
  }

  if (endDate) {
    conditions.push(lte(walletTransaction.createdAt, endDate));
  }

  const query = database
    .select()
    .from(walletTransaction)
    .orderBy(desc(walletTransaction.createdAt))
    .limit(limit)
    .offset(offset);

  if (conditions.length > 0) {
    return await query.where(and(...conditions));
  }

  return await query;
}

/**
 * Get transaction count with optional filters
 */
export async function getTransactionCount(
  filters: WalletTransactionFilters = {}
): Promise<number> {
  const { walletId, type, status, startDate, endDate } = filters;

  const conditions = [];

  if (walletId) {
    conditions.push(eq(walletTransaction.walletId, walletId));
  }

  if (type) {
    conditions.push(eq(walletTransaction.type, type));
  }

  if (status) {
    conditions.push(eq(walletTransaction.status, status));
  }

  if (startDate) {
    conditions.push(gte(walletTransaction.createdAt, startDate));
  }

  if (endDate) {
    conditions.push(lte(walletTransaction.createdAt, endDate));
  }

  const query = database.select({ count: count() }).from(walletTransaction);

  if (conditions.length > 0) {
    const results = await query.where(and(...conditions));
    return results[0]?.count || 0;
  }

  const results = await query;
  return results[0]?.count || 0;
}

// =============================================================================
// Transaction Status Operations
// =============================================================================

/**
 * Complete a transaction
 */
export async function completeTransaction(
  id: string
): Promise<WalletTransaction | null> {
  return await updateWalletTransaction(id, {
    status: "completed",
    completedAt: new Date(),
    processedAt: new Date(),
  });
}

/**
 * Fail a transaction
 */
export async function failTransaction(
  id: string,
  errorCode: string,
  errorMessage: string
): Promise<WalletTransaction | null> {
  return await updateWalletTransaction(id, {
    status: "failed",
    errorCode,
    errorMessage,
    failedAt: new Date(),
  });
}

/**
 * Reverse a transaction
 */
export async function reverseTransaction(
  id: string,
  reason: string
): Promise<WalletTransaction | null> {
  return await updateWalletTransaction(id, {
    status: "reversed",
    reversedAt: new Date(),
    reversalReason: reason,
  });
}

/**
 * Cancel a transaction
 */
export async function cancelTransaction(
  id: string
): Promise<WalletTransaction | null> {
  return await updateWalletTransaction(id, {
    status: "cancelled",
  });
}

// =============================================================================
// Audit Log Operations
// =============================================================================

/**
 * Create an audit log entry
 */
export async function createAuditLog(
  data: CreateWalletAuditLogData
): Promise<WalletAuditLog> {
  const [result] = await database
    .insert(walletAuditLog)
    .values(data)
    .returning();

  return result;
}

/**
 * Get audit logs with optional filters
 */
export async function getAuditLogs(
  filters: WalletAuditFilters = {}
): Promise<WalletAuditLog[]> {
  const { walletId, action, actorId, startDate, endDate, limit = 50, offset = 0 } = filters;

  const conditions = [];

  if (walletId) {
    conditions.push(eq(walletAuditLog.walletId, walletId));
  }

  if (action) {
    conditions.push(eq(walletAuditLog.action, action));
  }

  if (actorId) {
    conditions.push(eq(walletAuditLog.actorId, actorId));
  }

  if (startDate) {
    conditions.push(gte(walletAuditLog.createdAt, startDate));
  }

  if (endDate) {
    conditions.push(lte(walletAuditLog.createdAt, endDate));
  }

  const query = database
    .select()
    .from(walletAuditLog)
    .orderBy(desc(walletAuditLog.createdAt))
    .limit(limit)
    .offset(offset);

  if (conditions.length > 0) {
    return await query.where(and(...conditions));
  }

  return await query;
}

/**
 * Get audit log count with optional filters
 */
export async function getAuditLogCount(
  filters: WalletAuditFilters = {}
): Promise<number> {
  const { walletId, action, actorId, startDate, endDate } = filters;

  const conditions = [];

  if (walletId) {
    conditions.push(eq(walletAuditLog.walletId, walletId));
  }

  if (action) {
    conditions.push(eq(walletAuditLog.action, action));
  }

  if (actorId) {
    conditions.push(eq(walletAuditLog.actorId, actorId));
  }

  if (startDate) {
    conditions.push(gte(walletAuditLog.createdAt, startDate));
  }

  if (endDate) {
    conditions.push(lte(walletAuditLog.createdAt, endDate));
  }

  const query = database.select({ count: count() }).from(walletAuditLog);

  if (conditions.length > 0) {
    const results = await query.where(and(...conditions));
    return results[0]?.count || 0;
  }

  const results = await query;
  return results[0]?.count || 0;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Log a wallet action with audit trail
 */
export async function logWalletAction(
  walletId: string,
  action: WalletAuditAction,
  actorId: string | null,
  actorType: "user" | "system" | "admin" | "api",
  options?: {
    transactionId?: string;
    previousValue?: unknown;
    newValue?: unknown;
    changeDescription?: string;
    metadata?: unknown;
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<WalletAuditLog> {
  return await createAuditLog({
    id: crypto.randomUUID(),
    walletId,
    action,
    actorId,
    actorType,
    transactionId: options?.transactionId,
    previousValue: options?.previousValue ? JSON.stringify(options.previousValue) : null,
    newValue: options?.newValue ? JSON.stringify(options.newValue) : null,
    changeDescription: options?.changeDescription,
    metadata: options?.metadata ? JSON.stringify(options.metadata) : null,
    ipAddress: options?.ipAddress,
    userAgent: options?.userAgent,
  });
}

/**
 * Create a wallet for a user if it doesn't exist
 */
export async function getOrCreateWallet(
  userId: string,
  currency: string = "USD"
): Promise<UserWallet> {
  const existingWallet = await findWalletByUserId(userId);
  if (existingWallet) {
    return existingWallet;
  }

  const newWallet = await createWallet({
    id: crypto.randomUUID(),
    userId,
    currency,
    balance: "0.00",
    availableBalance: "0.00",
    pendingBalance: "0.00",
    status: "active",
    kycStatus: "not_started",
    kycLevel: "none",
    dailyTransactionTotal: "0.00",
    monthlyTransactionTotal: "0.00",
  });

  // Log wallet creation
  await logWalletAction(
    newWallet.id,
    "wallet_created",
    userId,
    "user",
    {
      newValue: { currency, status: "active" },
      changeDescription: "Wallet created for user",
    }
  );

  return newWallet;
}

/**
 * Calculate transaction totals for a wallet within a date range
 */
export async function getTransactionTotals(
  walletId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  totalDeposits: string;
  totalWithdrawals: string;
  totalFees: string;
  transactionCount: number;
}> {
  const transactions = await getWalletTransactions({
    walletId,
    startDate,
    endDate,
    status: "completed" as WalletTransactionStatus,
    limit: 10000, // High limit to get all transactions
  });

  let totalDeposits = 0;
  let totalWithdrawals = 0;
  let totalFees = 0;

  for (const tx of transactions) {
    const amount = parseFloat(tx.amount);
    const fee = parseFloat(tx.fee);

    if (tx.type === "deposit" || tx.type === "transfer_in") {
      totalDeposits += amount;
    } else if (tx.type === "withdrawal" || tx.type === "transfer_out" || tx.type === "airtime_purchase") {
      totalWithdrawals += amount;
    }

    totalFees += fee;
  }

  return {
    totalDeposits: totalDeposits.toFixed(2),
    totalWithdrawals: totalWithdrawals.toFixed(2),
    totalFees: totalFees.toFixed(2),
    transactionCount: transactions.length,
  };
}
