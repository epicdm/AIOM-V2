/**
 * Mobile Top-up Server Functions
 *
 * Server-side functions for mobile airtime and data top-ups
 * that integrate wallet deduction, Reloadly API, and receipt generation.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authenticatedMiddleware } from "./middleware";
import {
  createMobileTopupService,
  MobileTopupError,
  InsufficientFundsError,
  TopupFailedError,
  WalletOperationError,
  OperatorNotFoundError,
  type MobileTopupResult,
  type TopupReceipt,
} from "~/lib/mobile-topup-service";
import {
  getReloadlyTransactionsByUser,
  findReloadlyTransactionById,
  type ReloadlyTransactionFilters,
} from "~/data-access/reloadly";
import { findWalletByUserId, getOrCreateWallet } from "~/data-access/wallet";
import { checkAvailableBalance } from "~/data-access/wallet-balance-service";
import type { ReloadlyTransactionStatusType } from "~/db/schema";

// =============================================================================
// Validation Schemas
// =============================================================================

const phoneNumberSchema = z.object({
  countryCode: z.string().min(1, "Country code is required").max(5),
  number: z.string().min(5, "Phone number is required").max(20),
});

const sendTopupSchema = z.object({
  operatorId: z.number().int().positive("Operator ID is required"),
  amount: z.number().positive("Amount must be positive"),
  useLocalAmount: z.boolean().optional().default(false),
  recipientPhone: phoneNumberSchema,
  senderPhone: phoneNumberSchema.optional(),
  idempotencyKey: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const preflightCheckSchema = z.object({
  operatorId: z.number().int().positive("Operator ID is required"),
  amount: z.number().positive("Amount must be positive"),
});

const getTransactionSchema = z.object({
  transactionId: z.string().min(1, "Transaction ID is required"),
});

const getReceiptSchema = z.object({
  transactionId: z.string().min(1, "Transaction ID is required"),
});

const listTransactionsSchema = z.object({
  status: z
    .enum(["pending", "processing", "successful", "failed", "refunded"])
    .optional(),
  operatorId: z.number().int().positive().optional(),
  countryCode: z.string().length(2).optional(),
  recipientPhone: z.string().optional(),
  searchQuery: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.number().int().positive().max(100).optional().default(50),
  offset: z.number().int().min(0).optional().default(0),
});

// =============================================================================
// Response Types
// =============================================================================

interface TopupResponse {
  success: boolean;
  transaction?: Awaited<MobileTopupResult>["transaction"];
  walletTransaction?: Awaited<MobileTopupResult>["walletTransaction"];
  receipt?: TopupReceipt;
  error?: string;
  errorCode?: string;
}

interface PreflightCheckResponse {
  canProceed: boolean;
  walletBalance: string;
  availableBalance: string;
  requiredAmount: string;
  currency: string;
  insufficientFunds: boolean;
  error?: string;
}

// =============================================================================
// Top-up Functions
// =============================================================================

/**
 * Send a mobile top-up with wallet deduction
 *
 * This function:
 * 1. Validates user has sufficient balance
 * 2. Debits wallet for the top-up amount
 * 3. Sends the top-up via Reloadly API
 * 4. Records the transaction
 * 5. Generates a receipt
 *
 * If the Reloadly API fails, the wallet is automatically refunded.
 */
export const sendMobileTopupFn = createServerFn({
  method: "POST",
})
  .inputValidator(sendTopupSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }): Promise<TopupResponse> => {
    const service = createMobileTopupService();

    try {
      const result = await service.processTopup({
        userId: context.userId,
        operatorId: data.operatorId,
        amount: data.amount,
        useLocalAmount: data.useLocalAmount,
        recipientPhone: data.recipientPhone,
        senderPhone: data.senderPhone,
        idempotencyKey: data.idempotencyKey,
        metadata: data.metadata,
      });

      return {
        success: result.success,
        transaction: result.transaction,
        walletTransaction: result.walletTransaction ?? undefined,
        receipt: result.receipt,
        error: result.error,
        errorCode: result.errorCode,
      };
    } catch (error) {
      // Handle specific error types
      if (error instanceof InsufficientFundsError) {
        return {
          success: false,
          error: error.message,
          errorCode: "INSUFFICIENT_FUNDS",
        };
      }

      if (error instanceof OperatorNotFoundError) {
        return {
          success: false,
          error: error.message,
          errorCode: "OPERATOR_NOT_FOUND",
        };
      }

      if (error instanceof WalletOperationError) {
        return {
          success: false,
          error: error.message,
          errorCode: "WALLET_ERROR",
        };
      }

      if (error instanceof TopupFailedError) {
        return {
          success: false,
          error: error.message,
          errorCode: "TOPUP_FAILED",
        };
      }

      if (error instanceof MobileTopupError) {
        return {
          success: false,
          error: error.message,
          errorCode: error.code,
        };
      }

      // Unknown error
      console.error("Mobile top-up error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
        errorCode: "UNKNOWN_ERROR",
      };
    }
  });

/**
 * Pre-flight check before sending a top-up
 *
 * Validates:
 * - User has a wallet
 * - Sufficient balance is available
 *
 * Does NOT:
 * - Validate operator (that's a separate call)
 * - Lock funds
 */
export const checkTopupEligibilityFn = createServerFn()
  .inputValidator(preflightCheckSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }): Promise<PreflightCheckResponse> => {
    try {
      // Get or create wallet
      const wallet = await getOrCreateWallet(context.userId);
      const amountStr = data.amount.toFixed(2);

      // Check balance
      const balanceCheck = await checkAvailableBalance(wallet.id, amountStr);

      return {
        canProceed: balanceCheck.sufficient,
        walletBalance: wallet.balance,
        availableBalance: balanceCheck.available,
        requiredAmount: amountStr,
        currency: wallet.currency,
        insufficientFunds: !balanceCheck.sufficient,
      };
    } catch (error) {
      return {
        canProceed: false,
        walletBalance: "0.00",
        availableBalance: "0.00",
        requiredAmount: data.amount.toFixed(2),
        currency: "USD",
        insufficientFunds: true,
        error: error instanceof Error ? error.message : "Failed to check eligibility",
      };
    }
  });

// =============================================================================
// Transaction Query Functions
// =============================================================================

/**
 * Get a specific top-up transaction
 */
export const getMobileTopupTransactionFn = createServerFn()
  .inputValidator(getTransactionSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const transaction = await findReloadlyTransactionById(data.transactionId);

    if (!transaction) {
      throw new Error("Transaction not found");
    }

    // Verify user owns this transaction
    if (transaction.userId !== context.userId) {
      throw new Error("Transaction not found");
    }

    return transaction;
  });

/**
 * Get receipt for a top-up transaction
 */
export const getMobileTopupReceiptFn = createServerFn()
  .inputValidator(getReceiptSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }): Promise<TopupReceipt | null> => {
    const service = createMobileTopupService();
    return await service.getReceipt(data.transactionId, context.userId);
  });

/**
 * List user's mobile top-up transactions
 */
export const listMobileTopupsFn = createServerFn()
  .inputValidator(listTransactionsSchema.optional())
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const filters: ReloadlyTransactionFilters = {
      userId: context.userId,
      status: data?.status as ReloadlyTransactionStatusType | undefined,
      operatorId: data?.operatorId,
      countryCode: data?.countryCode,
      recipientPhone: data?.recipientPhone,
      searchQuery: data?.searchQuery,
      startDate: data?.startDate ? new Date(data.startDate) : undefined,
      endDate: data?.endDate ? new Date(data.endDate) : undefined,
      limit: data?.limit ?? 50,
      offset: data?.offset ?? 0,
    };

    return await getReloadlyTransactionsByUser(context.userId, filters);
  });

// =============================================================================
// Statistics Functions
// =============================================================================

/**
 * Get user's mobile top-up statistics
 */
export const getMobileTopupStatsFn = createServerFn()
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    // Get all transactions for the user
    const allTransactions = await getReloadlyTransactionsByUser(context.userId, {
      limit: 1000, // Get all for stats
    });

    // Calculate stats
    const stats = {
      totalTopups: allTransactions.length,
      successfulTopups: 0,
      failedTopups: 0,
      pendingTopups: 0,
      totalAmountSpent: 0,
      totalAmountDelivered: 0,
      uniqueRecipients: new Set<string>(),
      topOperators: {} as Record<string, number>,
    };

    for (const tx of allTransactions) {
      // Count by status
      if (tx.status === "successful") {
        stats.successfulTopups++;
        stats.totalAmountSpent += parseFloat(tx.requestedAmount);
        if (tx.deliveredAmount) {
          stats.totalAmountDelivered += parseFloat(tx.deliveredAmount);
        }
      } else if (tx.status === "failed" || tx.status === "refunded") {
        stats.failedTopups++;
      } else {
        stats.pendingTopups++;
      }

      // Track unique recipients
      stats.uniqueRecipients.add(`${tx.recipientCountryCode}${tx.recipientPhone}`);

      // Track operator usage
      stats.topOperators[tx.operatorName] = (stats.topOperators[tx.operatorName] || 0) + 1;
    }

    // Sort operators by usage
    const topOperatorsList = Object.entries(stats.topOperators)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    return {
      totalTopups: stats.totalTopups,
      successfulTopups: stats.successfulTopups,
      failedTopups: stats.failedTopups,
      pendingTopups: stats.pendingTopups,
      totalAmountSpent: stats.totalAmountSpent.toFixed(2),
      totalAmountDelivered: stats.totalAmountDelivered.toFixed(2),
      uniqueRecipientsCount: stats.uniqueRecipients.size,
      topOperators: topOperatorsList,
      successRate: stats.totalTopups > 0
        ? ((stats.successfulTopups / stats.totalTopups) * 100).toFixed(1)
        : "0.0",
    };
  });
