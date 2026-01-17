/**
 * Mobile Top-up Service
 *
 * Core service that orchestrates:
 * 1. Wallet deduction (with overdraft prevention)
 * 2. Reloadly API call for airtime/data purchase
 * 3. Transaction recording with idempotency
 * 4. Receipt generation
 *
 * The service handles rollback scenarios:
 * - If Reloadly API fails after wallet deduction, funds are released
 * - All operations are logged for audit trail
 */

import { database } from "~/db";
import {
  reloadlyTransaction,
  walletTransaction,
  type ReloadlyTransaction,
  type WalletTransaction,
} from "~/db/schema";
import {
  getReloadlyClient,
  createReloadlyTransaction,
  findReloadlyTransactionByCustomId,
  markReloadlyTransactionSuccessful,
  markReloadlyTransactionFailed,
  updateReloadlyTransaction,
  getCachedOperator,
  parseOperatorFromCache,
  upsertReloadlyOperatorCache,
} from "~/data-access/reloadly";
import {
  debitWallet,
  creditWallet,
  checkAvailableBalance,
  type DebitRequest,
  type CreditRequest,
} from "~/data-access/wallet-balance-service";
import { findWalletByUserId, getOrCreateWallet } from "~/data-access/wallet";
import type { ReloadlyOperator, ReloadlyTopupResponse } from "~/lib/reloadly";
import { ReloadlyError } from "~/lib/reloadly";
import {
  MobileTopupError,
  InsufficientFundsError,
  TopupFailedError,
  WalletOperationError,
  OperatorNotFoundError,
} from "./errors";

// =============================================================================
// Types
// =============================================================================

export interface MobileTopupRequest {
  /** User initiating the top-up */
  userId: string;

  /** Reloadly operator ID */
  operatorId: number;

  /** Amount in sender currency (USD typically) */
  amount: number;

  /** Whether to use local currency amount */
  useLocalAmount?: boolean;

  /** Recipient phone number */
  recipientPhone: {
    countryCode: string;
    number: string;
  };

  /** Optional sender phone for some operators */
  senderPhone?: {
    countryCode: string;
    number: string;
  };

  /** Optional idempotency key for duplicate prevention */
  idempotencyKey?: string;

  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

export interface TopupReceipt {
  /** Receipt unique ID */
  receiptId: string;

  /** Receipt number for display (e.g., TOP-2024-00001) */
  receiptNumber: string;

  /** Transaction details */
  transactionId: string;
  reloadlyTransactionId: string | null;
  walletTransactionId: string | null;

  /** User info */
  userId: string;

  /** Operator info */
  operatorId: number;
  operatorName: string;

  /** Recipient info */
  recipientPhone: string;
  recipientCountryCode: string;

  /** Amount details */
  amountCharged: string;
  amountChargedCurrency: string;
  amountDelivered: string | null;
  amountDeliveredCurrency: string | null;

  /** Balance info */
  walletBalanceBefore: string;
  walletBalanceAfter: string;

  /** PIN details for PIN-based operators */
  pinDetails?: {
    serial?: string;
    code?: string;
    info1?: string;
    info2?: string;
    info3?: string;
    ivr?: string;
    validity?: string;
  };

  /** Status */
  status: "successful" | "failed" | "pending";

  /** Timestamps */
  createdAt: Date;
  completedAt: Date | null;

  /** Error info if failed */
  errorMessage?: string;
  errorCode?: string;
}

export interface TopupReceiptData {
  reloadlyTransaction: ReloadlyTransaction;
  walletTransaction: WalletTransaction | null;
  operator: ReloadlyOperator | null;
}

export interface MobileTopupResult {
  /** Whether the top-up was successful */
  success: boolean;

  /** Transaction record */
  transaction: ReloadlyTransaction;

  /** Wallet transaction record */
  walletTransaction: WalletTransaction | null;

  /** Receipt for the transaction */
  receipt: TopupReceipt;

  /** Reloadly API response (if successful) */
  reloadlyResponse?: ReloadlyTopupResponse;

  /** Error message (if failed) */
  error?: string;

  /** Error code (if failed) */
  errorCode?: string;
}

// =============================================================================
// Receipt Generation
// =============================================================================

/**
 * Generates a receipt number in the format TOP-YYYY-XXXXX
 */
function generateReceiptNumber(transactionId: string): string {
  const year = new Date().getFullYear();
  const shortId = transactionId.slice(0, 8).toUpperCase();
  return `TOP-${year}-${shortId}`;
}

/**
 * Generates a top-up receipt from transaction data
 */
export function generateTopupReceipt(data: TopupReceiptData): TopupReceipt {
  const { reloadlyTransaction, walletTransaction, operator } = data;

  // Parse PIN details if present
  let pinDetails: TopupReceipt["pinDetails"];
  if (reloadlyTransaction.pinDetails) {
    try {
      pinDetails = JSON.parse(reloadlyTransaction.pinDetails);
    } catch {
      // Ignore parsing errors
    }
  }

  const receipt: TopupReceipt = {
    receiptId: crypto.randomUUID(),
    receiptNumber: generateReceiptNumber(reloadlyTransaction.id),
    transactionId: reloadlyTransaction.id,
    reloadlyTransactionId: reloadlyTransaction.reloadlyTransactionId,
    walletTransactionId: walletTransaction?.id ?? null,
    userId: reloadlyTransaction.userId,
    operatorId: reloadlyTransaction.operatorId,
    operatorName: operator?.name ?? reloadlyTransaction.operatorName,
    recipientPhone: reloadlyTransaction.recipientPhone,
    recipientCountryCode: reloadlyTransaction.recipientCountryCode,
    amountCharged: reloadlyTransaction.requestedAmount,
    amountChargedCurrency: reloadlyTransaction.requestedAmountCurrency,
    amountDelivered: reloadlyTransaction.deliveredAmount,
    amountDeliveredCurrency: reloadlyTransaction.deliveredAmountCurrency,
    walletBalanceBefore: walletTransaction?.balanceBefore ?? "0.00",
    walletBalanceAfter: walletTransaction?.balanceAfter ?? "0.00",
    pinDetails,
    status: reloadlyTransaction.status === "successful" ? "successful" :
           reloadlyTransaction.status === "failed" || reloadlyTransaction.status === "refunded" ? "failed" :
           "pending",
    createdAt: reloadlyTransaction.createdAt,
    completedAt: reloadlyTransaction.completedAt,
    errorMessage: reloadlyTransaction.errorMessage ?? undefined,
    errorCode: reloadlyTransaction.errorCode ?? undefined,
  };

  return receipt;
}

// =============================================================================
// Mobile Top-up Service Class
// =============================================================================

export class MobileTopupService {
  /**
   * Processes a mobile top-up request.
   *
   * Flow:
   * 1. Validate idempotency (return existing if duplicate)
   * 2. Get/validate operator
   * 3. Check wallet balance
   * 4. Create pending transaction record
   * 5. Debit wallet
   * 6. Call Reloadly API
   * 7. Update transaction status
   * 8. Generate receipt
   *
   * Rollback:
   * - If Reloadly fails after wallet debit, credit funds back
   */
  async processTopup(request: MobileTopupRequest): Promise<MobileTopupResult> {
    const {
      userId,
      operatorId,
      amount,
      useLocalAmount = false,
      recipientPhone,
      senderPhone,
      idempotencyKey,
      metadata,
    } = request;

    // Generate custom identifier for idempotency
    const customIdentifier =
      idempotencyKey ?? `${userId}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

    // Step 1: Check for existing transaction (idempotency)
    const existingTransaction = await findReloadlyTransactionByCustomId(customIdentifier);
    if (existingTransaction) {
      // Return existing transaction result
      const receipt = generateTopupReceipt({
        reloadlyTransaction: existingTransaction,
        walletTransaction: null,
        operator: null,
      });

      return {
        success: existingTransaction.status === "successful",
        transaction: existingTransaction,
        walletTransaction: null,
        receipt,
        error: existingTransaction.status === "failed" ? existingTransaction.errorMessage ?? undefined : undefined,
        errorCode: existingTransaction.status === "failed" ? existingTransaction.errorCode ?? undefined : undefined,
      };
    }

    // Step 2: Get operator details
    const client = await getReloadlyClient();
    let operator: ReloadlyOperator;

    // Try cache first
    const cachedOperator = await getCachedOperator(operatorId);
    if (cachedOperator) {
      const parsed = parseOperatorFromCache(cachedOperator);
      if (parsed) {
        operator = parsed;
      } else {
        try {
          operator = await client.getOperator(operatorId);
          // Update cache
          upsertReloadlyOperatorCache(operator).catch(console.error);
        } catch (error) {
          throw new OperatorNotFoundError(operatorId);
        }
      }
    } else {
      try {
        operator = await client.getOperator(operatorId);
        // Cache operator
        upsertReloadlyOperatorCache(operator).catch(console.error);
      } catch (error) {
        throw new OperatorNotFoundError(operatorId);
      }
    }

    // Step 3: Get or create user wallet and check balance
    const wallet = await getOrCreateWallet(userId);
    const amountStr = amount.toFixed(2);

    const balanceCheck = await checkAvailableBalance(wallet.id, amountStr);
    if (!balanceCheck.sufficient) {
      throw new InsufficientFundsError(balanceCheck.available, amountStr);
    }

    // Step 4: Create pending Reloadly transaction record
    const reloadlyTx = await createReloadlyTransaction({
      id: crypto.randomUUID(),
      userId,
      customIdentifier,
      operatorId,
      operatorName: operator.name,
      countryCode: operator.country.isoName,
      recipientPhone: recipientPhone.number,
      recipientCountryCode: recipientPhone.countryCode,
      senderPhone: senderPhone?.number ?? null,
      senderCountryCode: senderPhone?.countryCode ?? null,
      requestedAmount: amountStr,
      requestedAmountCurrency: operator.senderCurrencyCode || "USD",
      useLocalAmount,
      status: "processing",
    });

    // Step 5: Debit wallet
    const walletIdempotencyKey = `topup-${reloadlyTx.id}`;
    const debitRequest: DebitRequest = {
      walletId: wallet.id,
      amount: amountStr,
      type: "airtime_purchase",
      description: `Mobile top-up to ${recipientPhone.countryCode}${recipientPhone.number} via ${operator.name}`,
      reference: reloadlyTx.id,
      idempotencyKey: walletIdempotencyKey,
      relatedReloadlyTransactionId: reloadlyTx.id,
      metadata: {
        ...metadata,
        operatorId,
        operatorName: operator.name,
        recipientPhone: `${recipientPhone.countryCode}${recipientPhone.number}`,
      },
      actorId: userId,
      actorType: "user",
    };

    const debitResult = await debitWallet(debitRequest);
    if (!debitResult.success) {
      // Mark transaction as failed
      await markReloadlyTransactionFailed(
        reloadlyTx.id,
        debitResult.errorCode ?? "WALLET_ERROR",
        debitResult.error ?? "Failed to debit wallet"
      );

      throw new WalletOperationError(
        debitResult.error ?? "Failed to debit wallet",
        debitResult.errorCode
      );
    }

    const walletTx = debitResult.transaction!;

    // Step 6: Call Reloadly API
    try {
      const reloadlyResponse = await client.sendTopup({
        operatorId,
        amount,
        useLocalAmount,
        customIdentifier,
        recipientPhone,
        senderPhone,
      });

      // Step 7: Update transaction as successful
      const updatedTx = await markReloadlyTransactionSuccessful(
        reloadlyTx.id,
        reloadlyResponse.transactionId.toString(),
        reloadlyResponse.deliveredAmount.toString(),
        reloadlyResponse.deliveredAmountCurrencyCode,
        reloadlyResponse.pinDetail ? JSON.stringify(reloadlyResponse.pinDetail) : undefined
      );

      // Step 8: Generate receipt
      const finalTx = updatedTx ?? reloadlyTx;
      const receipt = generateTopupReceipt({
        reloadlyTransaction: finalTx,
        walletTransaction: walletTx,
        operator,
      });

      return {
        success: true,
        transaction: finalTx,
        walletTransaction: walletTx,
        receipt,
        reloadlyResponse,
      };
    } catch (error) {
      // Reloadly API failed - need to refund the wallet
      const errorMessage =
        error instanceof ReloadlyError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Unknown error";
      const errorCode =
        error instanceof ReloadlyError ? error.errorCode : "RELOADLY_ERROR";

      // Mark Reloadly transaction as failed
      await markReloadlyTransactionFailed(reloadlyTx.id, errorCode, errorMessage);

      // Refund wallet
      const creditRequest: CreditRequest = {
        walletId: wallet.id,
        amount: amountStr,
        type: "reversal",
        description: `Refund for failed top-up to ${recipientPhone.countryCode}${recipientPhone.number}`,
        reference: `refund-${reloadlyTx.id}`,
        idempotencyKey: `refund-${reloadlyTx.id}`,
        relatedReloadlyTransactionId: reloadlyTx.id,
        metadata: {
          originalTransactionId: walletTx.id,
          failureReason: errorMessage,
        },
        actorId: userId,
        actorType: "system",
      };

      const creditResult = await creditWallet(creditRequest);
      if (!creditResult.success) {
        console.error("Failed to refund wallet after Reloadly failure:", creditResult.error);
        // Log this critical issue but don't throw - the transaction is already marked failed
      }

      // Update Reloadly transaction status to refunded if credit was successful
      if (creditResult.success) {
        await updateReloadlyTransaction(reloadlyTx.id, { status: "refunded" });
      }

      // Fetch the updated transaction
      const failedTx = await findReloadlyTransactionByCustomId(customIdentifier);
      const finalTx = failedTx ?? reloadlyTx;

      // Generate receipt for failed transaction
      const receipt = generateTopupReceipt({
        reloadlyTransaction: finalTx,
        walletTransaction: creditResult.success ? creditResult.transaction ?? walletTx : walletTx,
        operator,
      });

      return {
        success: false,
        transaction: finalTx,
        walletTransaction: walletTx,
        receipt,
        error: errorMessage,
        errorCode,
      };
    }
  }

  /**
   * Gets a receipt for an existing transaction
   */
  async getReceipt(transactionId: string, userId: string): Promise<TopupReceipt | null> {
    // Get the transaction
    const { findReloadlyTransactionById } = await import("~/data-access/reloadly");
    const transaction = await findReloadlyTransactionById(transactionId);

    if (!transaction || transaction.userId !== userId) {
      return null;
    }

    // Get operator info
    let operator: ReloadlyOperator | null = null;
    const cachedOperator = await getCachedOperator(transaction.operatorId);
    if (cachedOperator) {
      operator = parseOperatorFromCache(cachedOperator);
    }

    // Get wallet transaction if linked
    let walletTx: WalletTransaction | null = null;
    if (transaction.id) {
      const { getWalletTransactions } = await import("~/data-access/wallet");
      const walletTransactions = await getWalletTransactions({
        walletId: undefined,
        type: "airtime_purchase",
        limit: 1,
      });
      // Find the matching wallet transaction by reference
      walletTx = walletTransactions.find(
        (tx) => tx.relatedReloadlyTransactionId === transaction.id
      ) ?? null;
    }

    return generateTopupReceipt({
      reloadlyTransaction: transaction,
      walletTransaction: walletTx,
      operator,
    });
  }
}

/**
 * Creates a new MobileTopupService instance
 */
export function createMobileTopupService(): MobileTopupService {
  return new MobileTopupService();
}
