/**
 * Reloadly Server Functions
 *
 * Server-side functions for mobile airtime and data top-ups
 * using the Reloadly API.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authenticatedMiddleware } from "./middleware";
import {
  getReloadlyClient,
  createReloadlyTransaction,
  findReloadlyTransactionById,
  findReloadlyTransactionByCustomId,
  getAllReloadlyTransactions,
  getReloadlyTransactionsCount,
  getReloadlyTransactionsByUser,
  markReloadlyTransactionSuccessful,
  markReloadlyTransactionFailed,
  upsertReloadlyOperatorCache,
  getCachedOperator,
  getCachedOperatorsByCountry,
  parseOperatorFromCache,
  type ReloadlyTransactionFilters,
} from "~/data-access/reloadly";
import {
  ReloadlyError,
  ReloadlyOperatorNotFoundError,
  type ReloadlyOperator,
  type ReloadlyCountry,
  type ReloadlyTopupResponse,
  type ReloadlyAccountBalance,
} from "~/lib/reloadly";
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
});

const detectOperatorSchema = z.object({
  phone: z.string().min(5, "Phone number is required"),
  countryCode: z.string().length(2, "Country code must be 2 characters (ISO)"),
});

const getOperatorsSchema = z.object({
  countryCode: z.string().length(2, "Country code must be 2 characters (ISO)").optional(),
  page: z.number().int().min(0).optional().default(0),
  size: z.number().int().positive().max(100).optional().default(20),
});

const getTransactionsSchema = z.object({
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
// Account Functions
// =============================================================================

/**
 * Get Reloadly account balance
 */
export const getReloadlyBalanceFn = createServerFn()
  .middleware([authenticatedMiddleware])
  .handler(async (): Promise<ReloadlyAccountBalance> => {
    const client = await getReloadlyClient();
    return await client.getBalance();
  });

// =============================================================================
// Country Functions
// =============================================================================

/**
 * Get all supported countries for airtime top-ups
 */
export const getReloadlyCountriesFn = createServerFn()
  .middleware([authenticatedMiddleware])
  .handler(async (): Promise<ReloadlyCountry[]> => {
    const client = await getReloadlyClient();
    return await client.getCountries();
  });

/**
 * Get a specific country by ISO code
 */
export const getReloadlyCountryFn = createServerFn()
  .inputValidator(z.object({ isoCode: z.string().length(2) }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }): Promise<ReloadlyCountry> => {
    const client = await getReloadlyClient();
    return await client.getCountry(data.isoCode);
  });

// =============================================================================
// Operator Functions
// =============================================================================

/**
 * Get operators for a country (with caching)
 */
export const getReloadlyOperatorsFn = createServerFn()
  .inputValidator(getOperatorsSchema.optional())
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }): Promise<ReloadlyOperator[]> => {
    const countryCode = data?.countryCode;

    // Try to get from cache first if country code is provided
    if (countryCode) {
      const cachedOperators = await getCachedOperatorsByCountry(countryCode);
      if (cachedOperators.length > 0) {
        const operators = cachedOperators
          .map(parseOperatorFromCache)
          .filter((op): op is ReloadlyOperator => op !== null);
        if (operators.length > 0) {
          return operators;
        }
      }
    }

    // Fetch from API
    const client = await getReloadlyClient();

    if (countryCode) {
      const operators = await client.getOperatorsByCountry(countryCode);
      // Cache operators in background (don't await)
      Promise.all(operators.map(upsertReloadlyOperatorCache)).catch(console.error);
      return operators;
    }

    const result = await client.getOperators({
      page: data?.page ?? 0,
      size: data?.size ?? 20,
    });

    // Cache operators in background (don't await)
    Promise.all(result.content.map(upsertReloadlyOperatorCache)).catch(console.error);

    return result.content;
  });

/**
 * Get a specific operator by ID
 */
export const getReloadlyOperatorFn = createServerFn()
  .inputValidator(z.object({ operatorId: z.number().int().positive() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }): Promise<ReloadlyOperator> => {
    // Try cache first
    const cached = await getCachedOperator(data.operatorId);
    if (cached) {
      const operator = parseOperatorFromCache(cached);
      if (operator) {
        return operator;
      }
    }

    // Fetch from API
    const client = await getReloadlyClient();
    const operator = await client.getOperator(data.operatorId);

    // Cache the operator (don't await)
    upsertReloadlyOperatorCache(operator).catch(console.error);

    return operator;
  });

/**
 * Auto-detect operator for a phone number
 */
export const detectReloadlyOperatorFn = createServerFn({
  method: "POST",
})
  .inputValidator(detectOperatorSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    const client = await getReloadlyClient();

    try {
      const detection = await client.detectOperator(data.phone, data.countryCode);
      return {
        success: true,
        operator: detection,
      };
    } catch (error) {
      if (error instanceof ReloadlyOperatorNotFoundError) {
        return {
          success: false,
          error: "Could not detect operator for this phone number",
          operator: null,
        };
      }
      throw error;
    }
  });

/**
 * Calculate FX rate for an operator and amount
 */
export const calculateReloadlyFxRateFn = createServerFn()
  .inputValidator(
    z.object({
      operatorId: z.number().int().positive(),
      amount: z.number().positive(),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    const client = await getReloadlyClient();
    return await client.calculateFxRate(data.operatorId, data.amount);
  });

// =============================================================================
// Top-up Functions
// =============================================================================

/**
 * Send a mobile top-up
 */
export const sendReloadlyTopupFn = createServerFn({
  method: "POST",
})
  .inputValidator(sendTopupSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }): Promise<{
    success: boolean;
    transaction: ReturnType<typeof createReloadlyTransaction> extends Promise<infer T> ? T : never;
    reloadlyResponse?: ReloadlyTopupResponse;
    error?: string;
  }> => {
    const customIdentifier = `${context.userId}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

    // Get operator details for the transaction record
    const client = await getReloadlyClient();
    let operatorName = "Unknown Operator";

    try {
      const operator = await client.getOperator(data.operatorId);
      operatorName = operator.name;
    } catch {
      // Continue without operator name
    }

    // Create transaction record first
    const transaction = await createReloadlyTransaction({
      id: crypto.randomUUID(),
      userId: context.userId,
      customIdentifier,
      operatorId: data.operatorId,
      operatorName,
      countryCode: data.recipientPhone.countryCode,
      recipientPhone: data.recipientPhone.number,
      recipientCountryCode: data.recipientPhone.countryCode,
      senderPhone: data.senderPhone?.number || null,
      senderCountryCode: data.senderPhone?.countryCode || null,
      requestedAmount: data.amount.toString(),
      requestedAmountCurrency: "USD", // Will be updated with actual currency
      useLocalAmount: data.useLocalAmount,
      status: "processing",
    });

    try {
      // Send the top-up
      const response = await client.sendTopup({
        operatorId: data.operatorId,
        amount: data.amount,
        useLocalAmount: data.useLocalAmount,
        customIdentifier,
        recipientPhone: data.recipientPhone,
        senderPhone: data.senderPhone,
      });

      // Update transaction with success
      const updatedTransaction = await markReloadlyTransactionSuccessful(
        transaction.id,
        response.transactionId.toString(),
        response.deliveredAmount.toString(),
        response.deliveredAmountCurrencyCode,
        response.pinDetail ? JSON.stringify(response.pinDetail) : undefined
      );

      return {
        success: true,
        transaction: updatedTransaction || transaction,
        reloadlyResponse: response,
      };
    } catch (error) {
      // Update transaction with failure
      const errorMessage =
        error instanceof ReloadlyError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Unknown error";
      const errorCode =
        error instanceof ReloadlyError ? error.errorCode : "UNKNOWN_ERROR";

      await markReloadlyTransactionFailed(transaction.id, errorCode, errorMessage);

      return {
        success: false,
        transaction,
        error: errorMessage,
      };
    }
  });

// =============================================================================
// Transaction History Functions
// =============================================================================

/**
 * Get user's Reloadly transaction history
 */
export const getMyReloadlyTransactionsFn = createServerFn()
  .inputValidator(getTransactionsSchema.optional())
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

/**
 * Get user's Reloadly transaction count
 */
export const getMyReloadlyTransactionsCountFn = createServerFn()
  .inputValidator(getTransactionsSchema.optional())
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
    };

    return await getReloadlyTransactionsCount(filters);
  });

/**
 * Get a specific Reloadly transaction by ID
 */
export const getReloadlyTransactionByIdFn = createServerFn()
  .inputValidator(z.object({ id: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const transaction = await findReloadlyTransactionById(data.id);

    if (!transaction) {
      throw new Error("Transaction not found");
    }

    // Ensure user can only access their own transactions
    if (transaction.userId !== context.userId) {
      throw new Error("Transaction not found");
    }

    return transaction;
  });

/**
 * Check the status of a transaction
 */
export const checkReloadlyTransactionStatusFn = createServerFn()
  .inputValidator(z.object({ id: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const transaction = await findReloadlyTransactionById(data.id);

    if (!transaction || transaction.userId !== context.userId) {
      throw new Error("Transaction not found");
    }

    // If transaction is still pending/processing, check with Reloadly API
    if (
      transaction.status === "pending" ||
      transaction.status === "processing"
    ) {
      if (transaction.reloadlyTransactionId) {
        const client = await getReloadlyClient();
        const reloadlyTx = await client.getTransaction(
          parseInt(transaction.reloadlyTransactionId, 10)
        );

        // Update local status based on Reloadly's status
        if (reloadlyTx.status === "SUCCESSFUL") {
          await markReloadlyTransactionSuccessful(
            transaction.id,
            reloadlyTx.transactionId.toString(),
            reloadlyTx.deliveredAmount.toString(),
            reloadlyTx.deliveredAmountCurrencyCode,
            reloadlyTx.pinDetail ? JSON.stringify(reloadlyTx.pinDetail) : undefined
          );
        } else if (reloadlyTx.status === "FAILED") {
          await markReloadlyTransactionFailed(
            transaction.id,
            "RELOADLY_FAILED",
            "Transaction failed on Reloadly"
          );
        } else if (reloadlyTx.status === "REFUNDED") {
          await markReloadlyTransactionFailed(
            transaction.id,
            "REFUNDED",
            "Transaction was refunded"
          );
        }

        // Return fresh data
        return await findReloadlyTransactionById(data.id);
      }
    }

    return transaction;
  });
