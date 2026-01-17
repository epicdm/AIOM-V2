/**
 * Wallet Balance Server Functions
 *
 * Server-side functions for wallet balance operations including:
 * - Debit/Credit operations with overdraft prevention
 * - Balance locking for pending transactions
 * - Transfer operations
 * - Balance queries
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authenticatedMiddleware } from "./middleware";
import { auditLog } from "~/lib/audit-logging-service";
import {
  debitWallet,
  creditWallet,
  transferFunds,
  lockFunds,
  releaseFunds,
  completePendingDebit,
  getWalletBalance,
  getWalletBalanceByUserId,
  checkAvailableBalance,
  WalletErrorCodes,
  type DebitRequest,
  type CreditRequest,
  type TransferRequest,
} from "~/data-access/wallet-balance-service";
import {
  getOrCreateWallet,
  findWalletByUserId,
  getWalletTransactions,
  type WalletTransactionFilters,
} from "~/data-access/wallet";

// =============================================================================
// Validation Schemas
// =============================================================================

const amountSchema = z
  .string()
  .min(1, "Amount is required")
  .refine(
    (val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    },
    { message: "Amount must be a positive number" }
  );

const walletTransactionTypeSchema = z.enum([
  "deposit",
  "withdrawal",
  "transfer_in",
  "transfer_out",
  "expense_disbursement",
  "expense_refund",
  "airtime_purchase",
  "adjustment",
  "fee",
  "reversal",
]);

// =============================================================================
// Balance Query Functions
// =============================================================================

/**
 * Get current user's wallet balance
 */
export const getMyWalletBalanceFn = createServerFn()
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    // Get or create wallet for user
    const wallet = await getOrCreateWallet(context.userId);

    return {
      walletId: wallet.id,
      balance: wallet.balance,
      availableBalance: wallet.availableBalance,
      pendingBalance: wallet.pendingBalance,
      currency: wallet.currency,
      status: wallet.status,
    };
  });

/**
 * Get wallet balance by wallet ID
 */
export const getWalletBalanceByIdFn = createServerFn()
  .inputValidator(z.object({ walletId: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    const balance = await getWalletBalance(data.walletId);
    if (!balance) {
      throw new Error("Wallet not found");
    }
    return balance;
  });

/**
 * Check if sufficient balance is available for a transaction
 */
export const checkSufficientBalanceFn = createServerFn()
  .inputValidator(
    z.object({
      walletId: z.string().optional(),
      amount: amountSchema,
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // If walletId not provided, use current user's wallet
    let walletId = data.walletId;
    if (!walletId) {
      const wallet = await findWalletByUserId(context.userId);
      if (!wallet) {
        return { sufficient: false, available: "0.00", required: data.amount };
      }
      walletId = wallet.id;
    }

    return await checkAvailableBalance(walletId, data.amount);
  });

// =============================================================================
// Debit Operations
// =============================================================================

const debitSchema = z.object({
  walletId: z.string().optional(), // If not provided, uses current user's wallet
  amount: amountSchema,
  type: walletTransactionTypeSchema,
  description: z.string().max(500).optional(),
  reference: z.string().max(100).optional(),
  idempotencyKey: z.string().optional(),
  relatedExpenseRequestId: z.string().optional(),
  relatedExpenseVoucherId: z.string().optional(),
  relatedReloadlyTransactionId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Debit funds from wallet (with overdraft prevention)
 *
 * This operation:
 * - Validates sufficient available balance
 * - Uses atomic database transaction
 * - Creates transaction record and audit log
 */
export const debitWalletFn = createServerFn({
  method: "POST",
})
  .inputValidator(debitSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // Get wallet ID
    let walletId = data.walletId;
    if (!walletId) {
      const wallet = await findWalletByUserId(context.userId);
      if (!wallet) {
        throw new Error("Wallet not found for user");
      }
      walletId = wallet.id;
    }

    const request: DebitRequest = {
      walletId,
      amount: data.amount,
      type: data.type,
      description: data.description,
      reference: data.reference,
      idempotencyKey: data.idempotencyKey,
      relatedExpenseRequestId: data.relatedExpenseRequestId,
      relatedExpenseVoucherId: data.relatedExpenseVoucherId,
      relatedReloadlyTransactionId: data.relatedReloadlyTransactionId,
      metadata: data.metadata,
      actorId: context.userId,
      actorType: "user",
    };

    const result = await debitWallet(request);

    if (!result.success) {
      throw new Error(result.error || "Debit operation failed");
    }

    return {
      success: true,
      transaction: result.transaction,
      wallet: result.wallet
        ? {
            id: result.wallet.id,
            balance: result.wallet.balance,
            availableBalance: result.wallet.availableBalance,
            pendingBalance: result.wallet.pendingBalance,
          }
        : undefined,
    };
  });

// =============================================================================
// Credit Operations
// =============================================================================

const creditSchema = z.object({
  walletId: z.string().optional(),
  amount: amountSchema,
  type: walletTransactionTypeSchema,
  description: z.string().max(500).optional(),
  reference: z.string().max(100).optional(),
  idempotencyKey: z.string().optional(),
  relatedExpenseRequestId: z.string().optional(),
  relatedExpenseVoucherId: z.string().optional(),
  relatedReloadlyTransactionId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Credit funds to wallet
 */
export const creditWalletFn = createServerFn({
  method: "POST",
})
  .inputValidator(creditSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // Get wallet ID
    let walletId = data.walletId;
    if (!walletId) {
      // Get or create wallet for user
      const wallet = await getOrCreateWallet(context.userId);
      walletId = wallet.id;
    }

    const request: CreditRequest = {
      walletId,
      amount: data.amount,
      type: data.type,
      description: data.description,
      reference: data.reference,
      idempotencyKey: data.idempotencyKey,
      relatedExpenseRequestId: data.relatedExpenseRequestId,
      relatedExpenseVoucherId: data.relatedExpenseVoucherId,
      relatedReloadlyTransactionId: data.relatedReloadlyTransactionId,
      metadata: data.metadata,
      actorId: context.userId,
      actorType: "user",
    };

    const result = await creditWallet(request);

    if (!result.success) {
      throw new Error(result.error || "Credit operation failed");
    }

    return {
      success: true,
      transaction: result.transaction,
      wallet: result.wallet
        ? {
            id: result.wallet.id,
            balance: result.wallet.balance,
            availableBalance: result.wallet.availableBalance,
            pendingBalance: result.wallet.pendingBalance,
          }
        : undefined,
    };
  });

// =============================================================================
// Transfer Operations
// =============================================================================

const transferSchema = z.object({
  destinationWalletId: z.string().optional(),
  destinationUserId: z.string().optional(),
  amount: amountSchema,
  description: z.string().max(500).optional(),
  reference: z.string().max(100).optional(),
  idempotencyKey: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).refine(
  (data) => data.destinationWalletId || data.destinationUserId,
  { message: "Either destinationWalletId or destinationUserId is required" }
);

/**
 * Transfer funds between wallets
 *
 * This operation:
 * - Validates sufficient available balance in source wallet
 * - Uses atomic database transaction for both wallets
 * - Creates linked transaction records for both sides
 */
export const transferFundsFn = createServerFn({
  method: "POST",
})
  .inputValidator(transferSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // Get source wallet (current user's wallet)
    const sourceWallet = await findWalletByUserId(context.userId);
    if (!sourceWallet) {
      throw new Error("Source wallet not found");
    }

    // Get destination wallet
    let destinationWalletId = data.destinationWalletId;
    if (!destinationWalletId && data.destinationUserId) {
      const destWallet = await getOrCreateWallet(data.destinationUserId);
      destinationWalletId = destWallet.id;
    }

    if (!destinationWalletId) {
      throw new Error("Destination wallet not found");
    }

    if (sourceWallet.id === destinationWalletId) {
      throw new Error("Cannot transfer to the same wallet");
    }

    const request: TransferRequest = {
      sourceWalletId: sourceWallet.id,
      destinationWalletId,
      amount: data.amount,
      description: data.description,
      reference: data.reference,
      idempotencyKey: data.idempotencyKey,
      metadata: data.metadata,
      actorId: context.userId,
      actorType: "user",
    };

    const result = await transferFunds(request);

    if (!result.success) {
      // Log failed transfer to audit trail
      await auditLog.logTransfer(
        "financial.transfer_failed",
        {
          actorId: context.userId,
          actorType: "user",
        },
        result.sourceTransaction?.id || crypto.randomUUID(),
        {
          fromAccountId: sourceWallet.id,
          toAccountId: destinationWalletId,
          amount: data.amount,
          currency: sourceWallet.currency,
          reason: data.description,
        },
        {
          success: false,
          errorDetails: { error: result.error },
        }
      );
      throw new Error(result.error || "Transfer operation failed");
    }

    // Log successful transfer to audit trail
    await auditLog.logTransfer(
      "financial.transfer_completed",
      {
        actorId: context.userId,
        actorType: "user",
      },
      result.sourceTransaction?.id || crypto.randomUUID(),
      {
        fromAccountId: sourceWallet.id,
        toAccountId: destinationWalletId,
        amount: data.amount,
        currency: sourceWallet.currency,
        reason: data.description,
      }
    );

    return {
      success: true,
      sourceTransaction: result.sourceTransaction,
      destinationTransaction: result.destinationTransaction,
    };
  });

// =============================================================================
// Balance Locking Operations
// =============================================================================

const lockSchema = z.object({
  walletId: z.string().optional(),
  amount: amountSchema,
  reason: z.string().min(1).max(500),
});

/**
 * Lock funds for a pending transaction
 *
 * Reduces available balance while keeping total balance intact.
 * Used when initiating transactions that require time to complete.
 */
export const lockFundsFn = createServerFn({
  method: "POST",
})
  .inputValidator(lockSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // Get wallet ID
    let walletId = data.walletId;
    if (!walletId) {
      const wallet = await findWalletByUserId(context.userId);
      if (!wallet) {
        throw new Error("Wallet not found");
      }
      walletId = wallet.id;
    }

    const result = await lockFunds({
      walletId,
      amount: data.amount,
      reason: data.reason,
      actorId: context.userId,
      actorType: "user",
    });

    if (!result.success) {
      throw new Error(result.error || "Lock funds operation failed");
    }

    return {
      success: true,
      wallet: result.wallet
        ? {
            id: result.wallet.id,
            balance: result.wallet.balance,
            availableBalance: result.wallet.availableBalance,
            pendingBalance: result.wallet.pendingBalance,
          }
        : undefined,
    };
  });

const releaseSchema = z.object({
  walletId: z.string().optional(),
  amount: amountSchema,
  reason: z.string().min(1).max(500),
});

/**
 * Release locked funds back to available balance
 *
 * Used when a pending transaction is cancelled or fails.
 */
export const releaseFundsFn = createServerFn({
  method: "POST",
})
  .inputValidator(releaseSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // Get wallet ID
    let walletId = data.walletId;
    if (!walletId) {
      const wallet = await findWalletByUserId(context.userId);
      if (!wallet) {
        throw new Error("Wallet not found");
      }
      walletId = wallet.id;
    }

    const result = await releaseFunds({
      walletId,
      amount: data.amount,
      reason: data.reason,
      actorId: context.userId,
      actorType: "user",
    });

    if (!result.success) {
      throw new Error(result.error || "Release funds operation failed");
    }

    return {
      success: true,
      wallet: result.wallet
        ? {
            id: result.wallet.id,
            balance: result.wallet.balance,
            availableBalance: result.wallet.availableBalance,
            pendingBalance: result.wallet.pendingBalance,
          }
        : undefined,
    };
  });

const completePendingSchema = z.object({
  walletId: z.string(),
  amount: amountSchema,
  transactionId: z.string(),
});

/**
 * Complete a pending transaction (debit locked funds)
 */
export const completePendingDebitFn = createServerFn({
  method: "POST",
})
  .inputValidator(completePendingSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const result = await completePendingDebit(
      data.walletId,
      data.amount,
      data.transactionId,
      context.userId,
      "user"
    );

    if (!result.success) {
      throw new Error(result.error || "Complete pending debit operation failed");
    }

    return {
      success: true,
      wallet: result.wallet
        ? {
            id: result.wallet.id,
            balance: result.wallet.balance,
            availableBalance: result.wallet.availableBalance,
            pendingBalance: result.wallet.pendingBalance,
          }
        : undefined,
    };
  });

// =============================================================================
// Transaction History
// =============================================================================

const transactionHistorySchema = z.object({
  walletId: z.string().optional(),
  type: walletTransactionTypeSchema.optional(),
  status: z.enum(["pending", "processing", "completed", "failed", "reversed", "cancelled"]).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.number().int().positive().max(100).optional().default(50),
  offset: z.number().int().min(0).optional().default(0),
});

/**
 * Get wallet transaction history
 */
export const getWalletTransactionsFn = createServerFn()
  .inputValidator(transactionHistorySchema.optional())
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // Get wallet ID
    let walletId = data?.walletId;
    if (!walletId) {
      const wallet = await findWalletByUserId(context.userId);
      if (!wallet) {
        throw new Error("Wallet not found");
      }
      walletId = wallet.id;
    }

    const filters: WalletTransactionFilters = {
      walletId,
      type: data?.type,
      status: data?.status,
      startDate: data?.startDate ? new Date(data.startDate) : undefined,
      endDate: data?.endDate ? new Date(data.endDate) : undefined,
      limit: data?.limit ?? 50,
      offset: data?.offset ?? 0,
    };

    return await getWalletTransactions(filters);
  });

// =============================================================================
// Error Codes Export
// =============================================================================

export { WalletErrorCodes };
