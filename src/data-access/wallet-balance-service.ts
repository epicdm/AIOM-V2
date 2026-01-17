/**
 * Wallet Balance Service
 *
 * Service managing wallet balances with:
 * - Atomic operations using database transactions
 * - Balance locking during pending transactions
 * - Overdraft prevention
 *
 * This service ensures financial integrity by:
 * 1. Using database transactions for all balance-changing operations
 * 2. Locking funds in availableBalance when transactions are initiated
 * 3. Preventing withdrawals that would exceed available balance
 */

import { eq, sql } from "drizzle-orm";
import { database } from "~/db";
import {
  userWallet,
  walletTransaction,
  walletAuditLog,
  type UserWallet,
  type WalletTransaction,
  type WalletTransactionType,
  type WalletTransactionStatus,
  type WalletAuditAction,
} from "~/db/schema";

// =============================================================================
// Types and Interfaces
// =============================================================================

export interface DebitRequest {
  walletId: string;
  amount: string;
  type: WalletTransactionType;
  description?: string;
  reference?: string;
  idempotencyKey?: string;
  relatedExpenseRequestId?: string;
  relatedExpenseVoucherId?: string;
  relatedReloadlyTransactionId?: string;
  metadata?: Record<string, unknown>;
  actorId: string;
  actorType: "user" | "system" | "admin" | "api";
}

export interface CreditRequest {
  walletId: string;
  amount: string;
  type: WalletTransactionType;
  description?: string;
  reference?: string;
  idempotencyKey?: string;
  relatedExpenseRequestId?: string;
  relatedExpenseVoucherId?: string;
  relatedReloadlyTransactionId?: string;
  metadata?: Record<string, unknown>;
  actorId: string;
  actorType: "user" | "system" | "admin" | "api";
}

export interface TransferRequest {
  sourceWalletId: string;
  destinationWalletId: string;
  amount: string;
  description?: string;
  reference?: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
  actorId: string;
  actorType: "user" | "system" | "admin" | "api";
}

export interface LockFundsRequest {
  walletId: string;
  amount: string;
  reason: string;
  actorId: string;
  actorType: "user" | "system" | "admin" | "api";
}

export interface ReleaseFundsRequest {
  walletId: string;
  amount: string;
  reason: string;
  actorId: string;
  actorType: "user" | "system" | "admin" | "api";
}

export interface WalletBalanceResult {
  success: boolean;
  wallet?: UserWallet;
  transaction?: WalletTransaction;
  error?: string;
  errorCode?: string;
}

export interface TransferResult {
  success: boolean;
  sourceTransaction?: WalletTransaction;
  destinationTransaction?: WalletTransaction;
  error?: string;
  errorCode?: string;
}

// Error codes for wallet operations
export const WalletErrorCodes = {
  INSUFFICIENT_FUNDS: "INSUFFICIENT_FUNDS",
  WALLET_NOT_FOUND: "WALLET_NOT_FOUND",
  WALLET_FROZEN: "WALLET_FROZEN",
  WALLET_SUSPENDED: "WALLET_SUSPENDED",
  WALLET_CLOSED: "WALLET_CLOSED",
  INVALID_AMOUNT: "INVALID_AMOUNT",
  DUPLICATE_TRANSACTION: "DUPLICATE_TRANSACTION",
  TRANSACTION_LIMIT_EXCEEDED: "TRANSACTION_LIMIT_EXCEEDED",
  DAILY_LIMIT_EXCEEDED: "DAILY_LIMIT_EXCEEDED",
  MONTHLY_LIMIT_EXCEEDED: "MONTHLY_LIMIT_EXCEEDED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type WalletErrorCode = (typeof WalletErrorCodes)[keyof typeof WalletErrorCodes];

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Parse amount string to number with validation
 */
function parseAmount(amount: string): number {
  const parsed = parseFloat(amount);
  if (isNaN(parsed) || parsed < 0) {
    throw new Error("Invalid amount");
  }
  return parsed;
}

/**
 * Format number to string with 2 decimal places
 */
function formatAmount(amount: number): string {
  return amount.toFixed(2);
}

/**
 * Validate wallet status for transactions
 */
function validateWalletStatus(wallet: UserWallet): { valid: boolean; errorCode?: WalletErrorCode; error?: string } {
  if (wallet.status === "frozen") {
    return { valid: false, errorCode: WalletErrorCodes.WALLET_FROZEN, error: "Wallet is frozen" };
  }
  if (wallet.status === "suspended") {
    return { valid: false, errorCode: WalletErrorCodes.WALLET_SUSPENDED, error: "Wallet is suspended" };
  }
  if (wallet.status === "closed") {
    return { valid: false, errorCode: WalletErrorCodes.WALLET_CLOSED, error: "Wallet is closed" };
  }
  return { valid: true };
}

/**
 * Check if sufficient available balance exists
 */
function hasSufficientBalance(wallet: UserWallet, amount: number): boolean {
  const availableBalance = parseFloat(wallet.availableBalance);
  return availableBalance >= amount;
}

/**
 * Check transaction limits
 */
function checkTransactionLimits(
  wallet: UserWallet,
  amount: number
): { valid: boolean; errorCode?: WalletErrorCode; error?: string } {
  // Check single transaction limit
  if (wallet.singleTransactionLimit) {
    const limit = parseFloat(wallet.singleTransactionLimit);
    if (amount > limit) {
      return {
        valid: false,
        errorCode: WalletErrorCodes.TRANSACTION_LIMIT_EXCEEDED,
        error: `Amount exceeds single transaction limit of ${wallet.singleTransactionLimit}`,
      };
    }
  }

  // Check daily limit
  if (wallet.dailyTransactionLimit) {
    const dailyLimit = parseFloat(wallet.dailyTransactionLimit);
    const currentDailyTotal = parseFloat(wallet.dailyTransactionTotal);
    if (currentDailyTotal + amount > dailyLimit) {
      return {
        valid: false,
        errorCode: WalletErrorCodes.DAILY_LIMIT_EXCEEDED,
        error: `Amount would exceed daily transaction limit of ${wallet.dailyTransactionLimit}`,
      };
    }
  }

  // Check monthly limit
  if (wallet.monthlyTransactionLimit) {
    const monthlyLimit = parseFloat(wallet.monthlyTransactionLimit);
    const currentMonthlyTotal = parseFloat(wallet.monthlyTransactionTotal);
    if (currentMonthlyTotal + amount > monthlyLimit) {
      return {
        valid: false,
        errorCode: WalletErrorCodes.MONTHLY_LIMIT_EXCEEDED,
        error: `Amount would exceed monthly transaction limit of ${wallet.monthlyTransactionLimit}`,
      };
    }
  }

  return { valid: true };
}

// =============================================================================
// Core Balance Operations (Atomic)
// =============================================================================

/**
 * Debit funds from wallet with overdraft prevention
 *
 * This operation:
 * 1. Validates wallet status
 * 2. Checks for sufficient available balance (overdraft prevention)
 * 3. Validates transaction limits
 * 4. Creates transaction record
 * 5. Updates wallet balance atomically
 * 6. Creates audit log
 *
 * All operations happen within a single database transaction for atomicity.
 */
export async function debitWallet(request: DebitRequest): Promise<WalletBalanceResult> {
  const {
    walletId,
    amount,
    type,
    description,
    reference,
    idempotencyKey,
    relatedExpenseRequestId,
    relatedExpenseVoucherId,
    relatedReloadlyTransactionId,
    metadata,
    actorId,
    actorType,
  } = request;

  try {
    // Validate amount
    const debitAmount = parseAmount(amount);
    if (debitAmount <= 0) {
      return {
        success: false,
        errorCode: WalletErrorCodes.INVALID_AMOUNT,
        error: "Debit amount must be greater than zero",
      };
    }

    // Check for duplicate transaction using idempotency key
    if (idempotencyKey) {
      const [existingTx] = await database
        .select()
        .from(walletTransaction)
        .where(eq(walletTransaction.idempotencyKey, idempotencyKey))
        .limit(1);

      if (existingTx) {
        return {
          success: true,
          transaction: existingTx,
          wallet: undefined, // Return existing transaction without re-processing
        };
      }
    }

    // Execute atomic transaction
    const result = await database.transaction(async (tx) => {
      // 1. Get wallet with row-level lock for update
      const [wallet] = await tx
        .select()
        .from(userWallet)
        .where(eq(userWallet.id, walletId))
        .for("update")
        .limit(1);

      if (!wallet) {
        return {
          success: false,
          errorCode: WalletErrorCodes.WALLET_NOT_FOUND,
          error: "Wallet not found",
        };
      }

      // 2. Validate wallet status
      const statusValidation = validateWalletStatus(wallet);
      if (!statusValidation.valid) {
        return {
          success: false,
          errorCode: statusValidation.errorCode,
          error: statusValidation.error,
        };
      }

      // 3. Check for sufficient available balance (OVERDRAFT PREVENTION)
      if (!hasSufficientBalance(wallet, debitAmount)) {
        return {
          success: false,
          errorCode: WalletErrorCodes.INSUFFICIENT_FUNDS,
          error: `Insufficient funds. Available balance: ${wallet.availableBalance}, Required: ${amount}`,
        };
      }

      // 4. Check transaction limits
      const limitValidation = checkTransactionLimits(wallet, debitAmount);
      if (!limitValidation.valid) {
        return {
          success: false,
          errorCode: limitValidation.errorCode,
          error: limitValidation.error,
        };
      }

      // 5. Calculate new balances
      const currentBalance = parseFloat(wallet.balance);
      const currentAvailable = parseFloat(wallet.availableBalance);
      const newBalance = currentBalance - debitAmount;
      const newAvailableBalance = currentAvailable - debitAmount;

      // 6. Create transaction record
      const transactionId = crypto.randomUUID();
      const now = new Date();

      const [newTransaction] = await tx
        .insert(walletTransaction)
        .values({
          id: transactionId,
          walletId,
          type,
          status: "completed" as WalletTransactionStatus,
          amount: formatAmount(debitAmount),
          currency: wallet.currency,
          fee: "0.00",
          netAmount: formatAmount(debitAmount),
          balanceBefore: wallet.balance,
          balanceAfter: formatAmount(newBalance),
          description,
          reference,
          idempotencyKey,
          relatedExpenseRequestId,
          relatedExpenseVoucherId,
          relatedReloadlyTransactionId,
          metadata: metadata ? JSON.stringify(metadata) : null,
          initiatedAt: now,
          processedAt: now,
          completedAt: now,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      // 7. Update wallet balance atomically
      const [updatedWallet] = await tx
        .update(userWallet)
        .set({
          balance: formatAmount(newBalance),
          availableBalance: formatAmount(newAvailableBalance),
          dailyTransactionTotal: formatAmount(
            parseFloat(wallet.dailyTransactionTotal) + debitAmount
          ),
          monthlyTransactionTotal: formatAmount(
            parseFloat(wallet.monthlyTransactionTotal) + debitAmount
          ),
          updatedAt: now,
        })
        .where(eq(userWallet.id, walletId))
        .returning();

      // 8. Create audit log
      await tx.insert(walletAuditLog).values({
        id: crypto.randomUUID(),
        walletId,
        action: "balance_updated" as WalletAuditAction,
        actorId,
        actorType,
        transactionId,
        previousValue: JSON.stringify({
          balance: wallet.balance,
          availableBalance: wallet.availableBalance,
        }),
        newValue: JSON.stringify({
          balance: formatAmount(newBalance),
          availableBalance: formatAmount(newAvailableBalance),
        }),
        changeDescription: `Debit of ${amount} ${wallet.currency} - ${description || type}`,
        createdAt: now,
      });

      return {
        success: true,
        wallet: updatedWallet,
        transaction: newTransaction,
      };
    });

    return result;
  } catch (error) {
    console.error("Debit wallet error:", error);
    return {
      success: false,
      errorCode: WalletErrorCodes.INTERNAL_ERROR,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Credit funds to wallet
 *
 * This operation:
 * 1. Validates wallet status
 * 2. Creates transaction record
 * 3. Updates wallet balance atomically
 * 4. Creates audit log
 */
export async function creditWallet(request: CreditRequest): Promise<WalletBalanceResult> {
  const {
    walletId,
    amount,
    type,
    description,
    reference,
    idempotencyKey,
    relatedExpenseRequestId,
    relatedExpenseVoucherId,
    relatedReloadlyTransactionId,
    metadata,
    actorId,
    actorType,
  } = request;

  try {
    // Validate amount
    const creditAmount = parseAmount(amount);
    if (creditAmount <= 0) {
      return {
        success: false,
        errorCode: WalletErrorCodes.INVALID_AMOUNT,
        error: "Credit amount must be greater than zero",
      };
    }

    // Check for duplicate transaction using idempotency key
    if (idempotencyKey) {
      const [existingTx] = await database
        .select()
        .from(walletTransaction)
        .where(eq(walletTransaction.idempotencyKey, idempotencyKey))
        .limit(1);

      if (existingTx) {
        return {
          success: true,
          transaction: existingTx,
          wallet: undefined,
        };
      }
    }

    // Execute atomic transaction
    const result = await database.transaction(async (tx) => {
      // 1. Get wallet with row-level lock
      const [wallet] = await tx
        .select()
        .from(userWallet)
        .where(eq(userWallet.id, walletId))
        .for("update")
        .limit(1);

      if (!wallet) {
        return {
          success: false,
          errorCode: WalletErrorCodes.WALLET_NOT_FOUND,
          error: "Wallet not found",
        };
      }

      // 2. Validate wallet status (credits allowed on frozen/suspended for refunds)
      if (wallet.status === "closed") {
        return {
          success: false,
          errorCode: WalletErrorCodes.WALLET_CLOSED,
          error: "Cannot credit a closed wallet",
        };
      }

      // 3. Calculate new balances
      const currentBalance = parseFloat(wallet.balance);
      const currentAvailable = parseFloat(wallet.availableBalance);
      const newBalance = currentBalance + creditAmount;
      const newAvailableBalance = currentAvailable + creditAmount;

      // 4. Create transaction record
      const transactionId = crypto.randomUUID();
      const now = new Date();

      const [newTransaction] = await tx
        .insert(walletTransaction)
        .values({
          id: transactionId,
          walletId,
          type,
          status: "completed" as WalletTransactionStatus,
          amount: formatAmount(creditAmount),
          currency: wallet.currency,
          fee: "0.00",
          netAmount: formatAmount(creditAmount),
          balanceBefore: wallet.balance,
          balanceAfter: formatAmount(newBalance),
          description,
          reference,
          idempotencyKey,
          relatedExpenseRequestId,
          relatedExpenseVoucherId,
          relatedReloadlyTransactionId,
          metadata: metadata ? JSON.stringify(metadata) : null,
          initiatedAt: now,
          processedAt: now,
          completedAt: now,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      // 5. Update wallet balance atomically
      const [updatedWallet] = await tx
        .update(userWallet)
        .set({
          balance: formatAmount(newBalance),
          availableBalance: formatAmount(newAvailableBalance),
          updatedAt: now,
        })
        .where(eq(userWallet.id, walletId))
        .returning();

      // 6. Create audit log
      await tx.insert(walletAuditLog).values({
        id: crypto.randomUUID(),
        walletId,
        action: "balance_updated" as WalletAuditAction,
        actorId,
        actorType,
        transactionId,
        previousValue: JSON.stringify({
          balance: wallet.balance,
          availableBalance: wallet.availableBalance,
        }),
        newValue: JSON.stringify({
          balance: formatAmount(newBalance),
          availableBalance: formatAmount(newAvailableBalance),
        }),
        changeDescription: `Credit of ${amount} ${wallet.currency} - ${description || type}`,
        createdAt: now,
      });

      return {
        success: true,
        wallet: updatedWallet,
        transaction: newTransaction,
      };
    });

    return result;
  } catch (error) {
    console.error("Credit wallet error:", error);
    return {
      success: false,
      errorCode: WalletErrorCodes.INTERNAL_ERROR,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Transfer funds between wallets with atomic operations
 *
 * This creates two linked transactions (transfer_out and transfer_in)
 * within a single database transaction for atomicity.
 */
export async function transferFunds(request: TransferRequest): Promise<TransferResult> {
  const {
    sourceWalletId,
    destinationWalletId,
    amount,
    description,
    reference,
    idempotencyKey,
    metadata,
    actorId,
    actorType,
  } = request;

  try {
    // Validate amount
    const transferAmount = parseAmount(amount);
    if (transferAmount <= 0) {
      return {
        success: false,
        errorCode: WalletErrorCodes.INVALID_AMOUNT,
        error: "Transfer amount must be greater than zero",
      };
    }

    // Check for duplicate transaction using idempotency key
    if (idempotencyKey) {
      const [existingTx] = await database
        .select()
        .from(walletTransaction)
        .where(eq(walletTransaction.idempotencyKey, idempotencyKey))
        .limit(1);

      if (existingTx) {
        return {
          success: true,
          sourceTransaction: existingTx,
        };
      }
    }

    // Execute atomic transaction
    const result = await database.transaction(async (tx) => {
      // 1. Get source wallet with row-level lock
      const [sourceWallet] = await tx
        .select()
        .from(userWallet)
        .where(eq(userWallet.id, sourceWalletId))
        .for("update")
        .limit(1);

      if (!sourceWallet) {
        return {
          success: false,
          errorCode: WalletErrorCodes.WALLET_NOT_FOUND,
          error: "Source wallet not found",
        };
      }

      // 2. Validate source wallet status
      const sourceStatusValidation = validateWalletStatus(sourceWallet);
      if (!sourceStatusValidation.valid) {
        return {
          success: false,
          errorCode: sourceStatusValidation.errorCode,
          error: `Source wallet: ${sourceStatusValidation.error}`,
        };
      }

      // 3. Check for sufficient available balance in source (OVERDRAFT PREVENTION)
      if (!hasSufficientBalance(sourceWallet, transferAmount)) {
        return {
          success: false,
          errorCode: WalletErrorCodes.INSUFFICIENT_FUNDS,
          error: `Insufficient funds in source wallet. Available: ${sourceWallet.availableBalance}, Required: ${amount}`,
        };
      }

      // 4. Check transaction limits on source wallet
      const limitValidation = checkTransactionLimits(sourceWallet, transferAmount);
      if (!limitValidation.valid) {
        return {
          success: false,
          errorCode: limitValidation.errorCode,
          error: limitValidation.error,
        };
      }

      // 5. Get destination wallet with row-level lock
      const [destWallet] = await tx
        .select()
        .from(userWallet)
        .where(eq(userWallet.id, destinationWalletId))
        .for("update")
        .limit(1);

      if (!destWallet) {
        return {
          success: false,
          errorCode: WalletErrorCodes.WALLET_NOT_FOUND,
          error: "Destination wallet not found",
        };
      }

      // 6. Validate destination wallet can receive funds
      if (destWallet.status === "closed") {
        return {
          success: false,
          errorCode: WalletErrorCodes.WALLET_CLOSED,
          error: "Destination wallet is closed",
        };
      }

      // 7. Calculate new balances
      const sourceCurrentBalance = parseFloat(sourceWallet.balance);
      const sourceCurrentAvailable = parseFloat(sourceWallet.availableBalance);
      const sourceNewBalance = sourceCurrentBalance - transferAmount;
      const sourceNewAvailable = sourceCurrentAvailable - transferAmount;

      const destCurrentBalance = parseFloat(destWallet.balance);
      const destCurrentAvailable = parseFloat(destWallet.availableBalance);
      const destNewBalance = destCurrentBalance + transferAmount;
      const destNewAvailable = destCurrentAvailable + transferAmount;

      const now = new Date();
      const sourceTransactionId = crypto.randomUUID();
      const destTransactionId = crypto.randomUUID();

      // 8. Create source transaction (transfer_out)
      const [sourceTransaction] = await tx
        .insert(walletTransaction)
        .values({
          id: sourceTransactionId,
          walletId: sourceWalletId,
          type: "transfer_out" as WalletTransactionType,
          status: "completed" as WalletTransactionStatus,
          amount: formatAmount(transferAmount),
          currency: sourceWallet.currency,
          fee: "0.00",
          netAmount: formatAmount(transferAmount),
          balanceBefore: sourceWallet.balance,
          balanceAfter: formatAmount(sourceNewBalance),
          description: description || `Transfer to wallet ${destinationWalletId}`,
          reference,
          idempotencyKey,
          counterpartWalletId: destinationWalletId,
          counterpartTransactionId: destTransactionId,
          metadata: metadata ? JSON.stringify(metadata) : null,
          initiatedAt: now,
          processedAt: now,
          completedAt: now,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      // 9. Create destination transaction (transfer_in)
      const [destTransaction] = await tx
        .insert(walletTransaction)
        .values({
          id: destTransactionId,
          walletId: destinationWalletId,
          type: "transfer_in" as WalletTransactionType,
          status: "completed" as WalletTransactionStatus,
          amount: formatAmount(transferAmount),
          currency: destWallet.currency,
          fee: "0.00",
          netAmount: formatAmount(transferAmount),
          balanceBefore: destWallet.balance,
          balanceAfter: formatAmount(destNewBalance),
          description: description || `Transfer from wallet ${sourceWalletId}`,
          reference,
          counterpartWalletId: sourceWalletId,
          counterpartTransactionId: sourceTransactionId,
          metadata: metadata ? JSON.stringify(metadata) : null,
          initiatedAt: now,
          processedAt: now,
          completedAt: now,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      // 10. Update source wallet balance
      await tx
        .update(userWallet)
        .set({
          balance: formatAmount(sourceNewBalance),
          availableBalance: formatAmount(sourceNewAvailable),
          dailyTransactionTotal: formatAmount(
            parseFloat(sourceWallet.dailyTransactionTotal) + transferAmount
          ),
          monthlyTransactionTotal: formatAmount(
            parseFloat(sourceWallet.monthlyTransactionTotal) + transferAmount
          ),
          updatedAt: now,
        })
        .where(eq(userWallet.id, sourceWalletId));

      // 11. Update destination wallet balance
      await tx
        .update(userWallet)
        .set({
          balance: formatAmount(destNewBalance),
          availableBalance: formatAmount(destNewAvailable),
          updatedAt: now,
        })
        .where(eq(userWallet.id, destinationWalletId));

      // 12. Create audit logs
      await tx.insert(walletAuditLog).values([
        {
          id: crypto.randomUUID(),
          walletId: sourceWalletId,
          action: "balance_updated" as WalletAuditAction,
          actorId,
          actorType,
          transactionId: sourceTransactionId,
          previousValue: JSON.stringify({
            balance: sourceWallet.balance,
            availableBalance: sourceWallet.availableBalance,
          }),
          newValue: JSON.stringify({
            balance: formatAmount(sourceNewBalance),
            availableBalance: formatAmount(sourceNewAvailable),
          }),
          changeDescription: `Transfer out of ${amount} ${sourceWallet.currency}`,
          createdAt: now,
        },
        {
          id: crypto.randomUUID(),
          walletId: destinationWalletId,
          action: "balance_updated" as WalletAuditAction,
          actorId,
          actorType,
          transactionId: destTransactionId,
          previousValue: JSON.stringify({
            balance: destWallet.balance,
            availableBalance: destWallet.availableBalance,
          }),
          newValue: JSON.stringify({
            balance: formatAmount(destNewBalance),
            availableBalance: formatAmount(destNewAvailable),
          }),
          changeDescription: `Transfer in of ${amount} ${destWallet.currency}`,
          createdAt: now,
        },
      ]);

      return {
        success: true,
        sourceTransaction,
        destinationTransaction: destTransaction,
      };
    });

    return result;
  } catch (error) {
    console.error("Transfer funds error:", error);
    return {
      success: false,
      errorCode: WalletErrorCodes.INTERNAL_ERROR,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

// =============================================================================
// Balance Locking Operations
// =============================================================================

/**
 * Lock funds for a pending transaction
 *
 * This moves funds from availableBalance to locked state
 * (balance stays the same, but availableBalance decreases)
 *
 * Used when initiating a transaction that may take time to complete
 * (e.g., external payments, transfers requiring approval)
 */
export async function lockFunds(request: LockFundsRequest): Promise<WalletBalanceResult> {
  const { walletId, amount, reason, actorId, actorType } = request;

  try {
    const lockAmount = parseAmount(amount);
    if (lockAmount <= 0) {
      return {
        success: false,
        errorCode: WalletErrorCodes.INVALID_AMOUNT,
        error: "Lock amount must be greater than zero",
      };
    }

    const result = await database.transaction(async (tx) => {
      // Get wallet with row-level lock
      const [wallet] = await tx
        .select()
        .from(userWallet)
        .where(eq(userWallet.id, walletId))
        .for("update")
        .limit(1);

      if (!wallet) {
        return {
          success: false,
          errorCode: WalletErrorCodes.WALLET_NOT_FOUND,
          error: "Wallet not found",
        };
      }

      // Validate wallet status
      const statusValidation = validateWalletStatus(wallet);
      if (!statusValidation.valid) {
        return {
          success: false,
          errorCode: statusValidation.errorCode,
          error: statusValidation.error,
        };
      }

      // Check sufficient available balance
      if (!hasSufficientBalance(wallet, lockAmount)) {
        return {
          success: false,
          errorCode: WalletErrorCodes.INSUFFICIENT_FUNDS,
          error: `Insufficient available funds to lock. Available: ${wallet.availableBalance}, Requested: ${amount}`,
        };
      }

      // Calculate new balances
      const currentAvailable = parseFloat(wallet.availableBalance);
      const currentPending = parseFloat(wallet.pendingBalance);
      const newAvailableBalance = currentAvailable - lockAmount;
      const newPendingBalance = currentPending + lockAmount;

      const now = new Date();

      // Update wallet - only availableBalance changes, not total balance
      const [updatedWallet] = await tx
        .update(userWallet)
        .set({
          availableBalance: formatAmount(newAvailableBalance),
          pendingBalance: formatAmount(newPendingBalance),
          updatedAt: now,
        })
        .where(eq(userWallet.id, walletId))
        .returning();

      // Create audit log
      await tx.insert(walletAuditLog).values({
        id: crypto.randomUUID(),
        walletId,
        action: "balance_updated" as WalletAuditAction,
        actorId,
        actorType,
        previousValue: JSON.stringify({
          availableBalance: wallet.availableBalance,
          pendingBalance: wallet.pendingBalance,
        }),
        newValue: JSON.stringify({
          availableBalance: formatAmount(newAvailableBalance),
          pendingBalance: formatAmount(newPendingBalance),
        }),
        changeDescription: `Locked ${amount} ${wallet.currency} - ${reason}`,
        createdAt: now,
      });

      return {
        success: true,
        wallet: updatedWallet,
      };
    });

    return result;
  } catch (error) {
    console.error("Lock funds error:", error);
    return {
      success: false,
      errorCode: WalletErrorCodes.INTERNAL_ERROR,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Release locked funds back to available balance
 *
 * Used when a pending transaction is cancelled or fails
 */
export async function releaseFunds(request: ReleaseFundsRequest): Promise<WalletBalanceResult> {
  const { walletId, amount, reason, actorId, actorType } = request;

  try {
    const releaseAmount = parseAmount(amount);
    if (releaseAmount <= 0) {
      return {
        success: false,
        errorCode: WalletErrorCodes.INVALID_AMOUNT,
        error: "Release amount must be greater than zero",
      };
    }

    const result = await database.transaction(async (tx) => {
      // Get wallet with row-level lock
      const [wallet] = await tx
        .select()
        .from(userWallet)
        .where(eq(userWallet.id, walletId))
        .for("update")
        .limit(1);

      if (!wallet) {
        return {
          success: false,
          errorCode: WalletErrorCodes.WALLET_NOT_FOUND,
          error: "Wallet not found",
        };
      }

      // Check that pending balance is sufficient
      const currentPending = parseFloat(wallet.pendingBalance);
      if (currentPending < releaseAmount) {
        return {
          success: false,
          errorCode: WalletErrorCodes.INVALID_AMOUNT,
          error: `Cannot release more than pending balance. Pending: ${wallet.pendingBalance}, Requested: ${amount}`,
        };
      }

      // Calculate new balances
      const currentAvailable = parseFloat(wallet.availableBalance);
      const newAvailableBalance = currentAvailable + releaseAmount;
      const newPendingBalance = currentPending - releaseAmount;

      const now = new Date();

      // Update wallet
      const [updatedWallet] = await tx
        .update(userWallet)
        .set({
          availableBalance: formatAmount(newAvailableBalance),
          pendingBalance: formatAmount(newPendingBalance),
          updatedAt: now,
        })
        .where(eq(userWallet.id, walletId))
        .returning();

      // Create audit log
      await tx.insert(walletAuditLog).values({
        id: crypto.randomUUID(),
        walletId,
        action: "balance_updated" as WalletAuditAction,
        actorId,
        actorType,
        previousValue: JSON.stringify({
          availableBalance: wallet.availableBalance,
          pendingBalance: wallet.pendingBalance,
        }),
        newValue: JSON.stringify({
          availableBalance: formatAmount(newAvailableBalance),
          pendingBalance: formatAmount(newPendingBalance),
        }),
        changeDescription: `Released ${amount} ${wallet.currency} - ${reason}`,
        createdAt: now,
      });

      return {
        success: true,
        wallet: updatedWallet,
      };
    });

    return result;
  } catch (error) {
    console.error("Release funds error:", error);
    return {
      success: false,
      errorCode: WalletErrorCodes.INTERNAL_ERROR,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Complete a pending transaction (debit the locked funds)
 *
 * This is called when a pending transaction completes successfully.
 * It debits the actual balance and removes from pending.
 */
export async function completePendingDebit(
  walletId: string,
  amount: string,
  transactionId: string,
  actorId: string,
  actorType: "user" | "system" | "admin" | "api"
): Promise<WalletBalanceResult> {
  try {
    const debitAmount = parseAmount(amount);

    const result = await database.transaction(async (tx) => {
      // Get wallet with row-level lock
      const [wallet] = await tx
        .select()
        .from(userWallet)
        .where(eq(userWallet.id, walletId))
        .for("update")
        .limit(1);

      if (!wallet) {
        return {
          success: false,
          errorCode: WalletErrorCodes.WALLET_NOT_FOUND,
          error: "Wallet not found",
        };
      }

      // Calculate new balances
      const currentBalance = parseFloat(wallet.balance);
      const currentPending = parseFloat(wallet.pendingBalance);
      const newBalance = currentBalance - debitAmount;
      const newPendingBalance = currentPending - debitAmount;

      const now = new Date();

      // Update wallet balance
      const [updatedWallet] = await tx
        .update(userWallet)
        .set({
          balance: formatAmount(newBalance),
          pendingBalance: formatAmount(Math.max(0, newPendingBalance)), // Prevent negative pending
          dailyTransactionTotal: formatAmount(
            parseFloat(wallet.dailyTransactionTotal) + debitAmount
          ),
          monthlyTransactionTotal: formatAmount(
            parseFloat(wallet.monthlyTransactionTotal) + debitAmount
          ),
          updatedAt: now,
        })
        .where(eq(userWallet.id, walletId))
        .returning();

      // Update transaction to completed
      await tx
        .update(walletTransaction)
        .set({
          status: "completed" as WalletTransactionStatus,
          balanceAfter: formatAmount(newBalance),
          processedAt: now,
          completedAt: now,
          updatedAt: now,
        })
        .where(eq(walletTransaction.id, transactionId));

      // Create audit log
      await tx.insert(walletAuditLog).values({
        id: crypto.randomUUID(),
        walletId,
        action: "transaction_completed" as WalletAuditAction,
        actorId,
        actorType,
        transactionId,
        previousValue: JSON.stringify({
          balance: wallet.balance,
          pendingBalance: wallet.pendingBalance,
        }),
        newValue: JSON.stringify({
          balance: formatAmount(newBalance),
          pendingBalance: formatAmount(Math.max(0, newPendingBalance)),
        }),
        changeDescription: `Pending transaction completed - Debit of ${amount} ${wallet.currency}`,
        createdAt: now,
      });

      return {
        success: true,
        wallet: updatedWallet,
      };
    });

    return result;
  } catch (error) {
    console.error("Complete pending debit error:", error);
    return {
      success: false,
      errorCode: WalletErrorCodes.INTERNAL_ERROR,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

// =============================================================================
// Query Functions
// =============================================================================

/**
 * Get wallet balance summary with available and pending amounts
 */
export async function getWalletBalance(walletId: string): Promise<{
  balance: string;
  availableBalance: string;
  pendingBalance: string;
  currency: string;
  status: string;
} | null> {
  const [wallet] = await database
    .select({
      balance: userWallet.balance,
      availableBalance: userWallet.availableBalance,
      pendingBalance: userWallet.pendingBalance,
      currency: userWallet.currency,
      status: userWallet.status,
    })
    .from(userWallet)
    .where(eq(userWallet.id, walletId))
    .limit(1);

  return wallet || null;
}

/**
 * Get wallet balance by user ID
 */
export async function getWalletBalanceByUserId(userId: string): Promise<{
  walletId: string;
  balance: string;
  availableBalance: string;
  pendingBalance: string;
  currency: string;
  status: string;
} | null> {
  const [wallet] = await database
    .select({
      walletId: userWallet.id,
      balance: userWallet.balance,
      availableBalance: userWallet.availableBalance,
      pendingBalance: userWallet.pendingBalance,
      currency: userWallet.currency,
      status: userWallet.status,
    })
    .from(userWallet)
    .where(eq(userWallet.userId, userId))
    .limit(1);

  return wallet || null;
}

/**
 * Check if a wallet has sufficient available balance for a transaction
 */
export async function checkAvailableBalance(
  walletId: string,
  amount: string
): Promise<{ sufficient: boolean; available: string; required: string }> {
  const [wallet] = await database
    .select({
      availableBalance: userWallet.availableBalance,
    })
    .from(userWallet)
    .where(eq(userWallet.id, walletId))
    .limit(1);

  if (!wallet) {
    return { sufficient: false, available: "0.00", required: amount };
  }

  const availableAmount = parseFloat(wallet.availableBalance);
  const requiredAmount = parseFloat(amount);

  return {
    sufficient: availableAmount >= requiredAmount,
    available: wallet.availableBalance,
    required: amount,
  };
}
