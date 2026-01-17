/**
 * Reloadly Data Access Layer
 *
 * Database operations for Reloadly transactions and operator cache.
 * Also manages the Reloadly client instance.
 */

import { eq, desc, and, or, ilike, gt, lt, count } from "drizzle-orm";
import { database } from "~/db";
import {
  reloadlyTransaction,
  reloadlyOperatorCache,
  type ReloadlyTransaction as ReloadlyTransactionType,
  type CreateReloadlyTransactionData,
  type UpdateReloadlyTransactionData,
  type ReloadlyOperatorCache as ReloadlyOperatorCacheType,
  type CreateReloadlyOperatorCacheData,
  type UpdateReloadlyOperatorCacheData,
  type ReloadlyTransactionStatusType,
} from "~/db/schema";
import {
  ReloadlyClient,
  createReloadlyClient,
  createReloadlyClientSync,
  type ReloadlyConfig,
  type ReloadlyOperator,
} from "~/lib/reloadly";
import { privateEnv } from "~/config/privateEnv";

// =============================================================================
// Reloadly Client Management
// =============================================================================

let reloadlyClientInstance: ReloadlyClient | null = null;

/**
 * Gets the Reloadly client configuration from environment
 */
function getReloadlyConfig(): ReloadlyConfig {
  return {
    clientId: privateEnv.RELOADLY_CLIENT_ID,
    clientSecret: privateEnv.RELOADLY_CLIENT_SECRET,
    sandbox: privateEnv.RELOADLY_SANDBOX,
  };
}

/**
 * Gets or creates the Reloadly client instance
 */
export async function getReloadlyClient(): Promise<ReloadlyClient> {
  if (!reloadlyClientInstance || !reloadlyClientInstance.isAuthenticated()) {
    const config = getReloadlyConfig();
    reloadlyClientInstance = await createReloadlyClient(config);
  }
  return reloadlyClientInstance;
}

/**
 * Initializes a new Reloadly client without caching
 */
export async function initReloadlyClient(): Promise<ReloadlyClient> {
  const config = getReloadlyConfig();
  return await createReloadlyClient(config);
}

/**
 * Clears the cached Reloadly client instance
 */
export function clearReloadlyClient(): void {
  if (reloadlyClientInstance) {
    reloadlyClientInstance.logout();
    reloadlyClientInstance = null;
  }
}

// =============================================================================
// Transaction Filters
// =============================================================================

export interface ReloadlyTransactionFilters {
  userId?: string;
  status?: ReloadlyTransactionStatusType;
  operatorId?: number;
  countryCode?: string;
  recipientPhone?: string;
  searchQuery?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

// =============================================================================
// Transaction Operations
// =============================================================================

/**
 * Creates a new Reloadly transaction record
 */
export async function createReloadlyTransaction(
  data: CreateReloadlyTransactionData
): Promise<ReloadlyTransactionType> {
  const [result] = await database
    .insert(reloadlyTransaction)
    .values({
      ...data,
      updatedAt: new Date(),
    })
    .returning();

  return result;
}

/**
 * Finds a Reloadly transaction by ID
 */
export async function findReloadlyTransactionById(
  id: string
): Promise<ReloadlyTransactionType | null> {
  const [result] = await database
    .select()
    .from(reloadlyTransaction)
    .where(eq(reloadlyTransaction.id, id))
    .limit(1);

  return result || null;
}

/**
 * Finds a Reloadly transaction by custom identifier
 */
export async function findReloadlyTransactionByCustomId(
  customIdentifier: string
): Promise<ReloadlyTransactionType | null> {
  const [result] = await database
    .select()
    .from(reloadlyTransaction)
    .where(eq(reloadlyTransaction.customIdentifier, customIdentifier))
    .limit(1);

  return result || null;
}

/**
 * Finds a Reloadly transaction by Reloadly's transaction ID
 */
export async function findReloadlyTransactionByReloadlyId(
  reloadlyTransactionId: string
): Promise<ReloadlyTransactionType | null> {
  const [result] = await database
    .select()
    .from(reloadlyTransaction)
    .where(eq(reloadlyTransaction.reloadlyTransactionId, reloadlyTransactionId))
    .limit(1);

  return result || null;
}

/**
 * Updates a Reloadly transaction
 */
export async function updateReloadlyTransaction(
  id: string,
  data: UpdateReloadlyTransactionData
): Promise<ReloadlyTransactionType | null> {
  const [result] = await database
    .update(reloadlyTransaction)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(reloadlyTransaction.id, id))
    .returning();

  return result || null;
}

/**
 * Gets all Reloadly transactions with optional filters
 */
export async function getAllReloadlyTransactions(
  filters: ReloadlyTransactionFilters = {}
): Promise<ReloadlyTransactionType[]> {
  const {
    userId,
    status,
    operatorId,
    countryCode,
    recipientPhone,
    searchQuery,
    startDate,
    endDate,
    limit = 50,
    offset = 0,
  } = filters;

  const conditions = [];

  if (userId) {
    conditions.push(eq(reloadlyTransaction.userId, userId));
  }

  if (status) {
    conditions.push(eq(reloadlyTransaction.status, status));
  }

  if (operatorId) {
    conditions.push(eq(reloadlyTransaction.operatorId, operatorId));
  }

  if (countryCode) {
    conditions.push(eq(reloadlyTransaction.countryCode, countryCode));
  }

  if (recipientPhone) {
    conditions.push(eq(reloadlyTransaction.recipientPhone, recipientPhone));
  }

  if (searchQuery && searchQuery.trim()) {
    const searchTerm = `%${searchQuery.trim()}%`;
    conditions.push(
      or(
        ilike(reloadlyTransaction.recipientPhone, searchTerm),
        ilike(reloadlyTransaction.operatorName, searchTerm)
      )
    );
  }

  if (startDate) {
    conditions.push(gt(reloadlyTransaction.createdAt, startDate));
  }

  if (endDate) {
    conditions.push(lt(reloadlyTransaction.createdAt, endDate));
  }

  const query = database
    .select()
    .from(reloadlyTransaction)
    .orderBy(desc(reloadlyTransaction.createdAt))
    .limit(limit)
    .offset(offset);

  if (conditions.length > 0) {
    return await query.where(and(...conditions));
  }

  return await query;
}

/**
 * Gets Reloadly transactions count with optional filters
 */
export async function getReloadlyTransactionsCount(
  filters: ReloadlyTransactionFilters = {}
): Promise<number> {
  const { userId, status, operatorId, countryCode, recipientPhone, searchQuery, startDate, endDate } = filters;

  const conditions = [];

  if (userId) {
    conditions.push(eq(reloadlyTransaction.userId, userId));
  }

  if (status) {
    conditions.push(eq(reloadlyTransaction.status, status));
  }

  if (operatorId) {
    conditions.push(eq(reloadlyTransaction.operatorId, operatorId));
  }

  if (countryCode) {
    conditions.push(eq(reloadlyTransaction.countryCode, countryCode));
  }

  if (recipientPhone) {
    conditions.push(eq(reloadlyTransaction.recipientPhone, recipientPhone));
  }

  if (searchQuery && searchQuery.trim()) {
    const searchTerm = `%${searchQuery.trim()}%`;
    conditions.push(
      or(
        ilike(reloadlyTransaction.recipientPhone, searchTerm),
        ilike(reloadlyTransaction.operatorName, searchTerm)
      )
    );
  }

  if (startDate) {
    conditions.push(gt(reloadlyTransaction.createdAt, startDate));
  }

  if (endDate) {
    conditions.push(lt(reloadlyTransaction.createdAt, endDate));
  }

  const query = database.select({ count: count() }).from(reloadlyTransaction);

  if (conditions.length > 0) {
    const results = await query.where(and(...conditions));
    return results[0]?.count || 0;
  }

  const results = await query;
  return results[0]?.count || 0;
}

/**
 * Gets Reloadly transactions for a specific user
 */
export async function getReloadlyTransactionsByUser(
  userId: string,
  filters: Omit<ReloadlyTransactionFilters, "userId"> = {}
): Promise<ReloadlyTransactionType[]> {
  return await getAllReloadlyTransactions({ ...filters, userId });
}

/**
 * Marks a Reloadly transaction as successful
 */
export async function markReloadlyTransactionSuccessful(
  id: string,
  reloadlyTransactionId: string,
  deliveredAmount: string,
  deliveredAmountCurrency: string,
  pinDetails?: string
): Promise<ReloadlyTransactionType | null> {
  return await updateReloadlyTransaction(id, {
    status: "successful",
    reloadlyTransactionId,
    deliveredAmount,
    deliveredAmountCurrency,
    pinDetails,
    completedAt: new Date(),
  });
}

/**
 * Marks a Reloadly transaction as failed
 */
export async function markReloadlyTransactionFailed(
  id: string,
  errorCode?: string,
  errorMessage?: string
): Promise<ReloadlyTransactionType | null> {
  return await updateReloadlyTransaction(id, {
    status: "failed",
    errorCode,
    errorMessage,
    completedAt: new Date(),
  });
}

// =============================================================================
// Operator Cache Operations
// =============================================================================

const OPERATOR_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Creates or updates an operator in the cache
 */
export async function upsertReloadlyOperatorCache(
  operator: ReloadlyOperator
): Promise<ReloadlyOperatorCacheType> {
  const cacheData: CreateReloadlyOperatorCacheData = {
    id: crypto.randomUUID(),
    operatorId: operator.id,
    name: operator.name,
    countryCode: operator.country.isoName,
    countryName: operator.country.name,
    bundle: operator.bundle,
    data: operator.data,
    pin: operator.pin,
    denominationType: operator.denominationType,
    senderCurrencyCode: operator.senderCurrencyCode,
    destinationCurrencyCode: operator.destinationCurrencyCode,
    minAmount: operator.minAmount?.toString() || null,
    maxAmount: operator.maxAmount?.toString() || null,
    localMinAmount: operator.localMinAmount?.toString() || null,
    localMaxAmount: operator.localMaxAmount?.toString() || null,
    fixedAmounts: JSON.stringify(operator.fixedAmounts),
    localFixedAmounts: JSON.stringify(operator.localFixedAmounts),
    fxRate: operator.fx?.rate?.toString() || null,
    commission: operator.commission?.toString() || null,
    internationalDiscount: operator.internationalDiscount?.toString() || null,
    logoUrls: JSON.stringify(operator.logoUrls),
    fullData: JSON.stringify(operator),
    lastUpdatedAt: new Date(),
    expiresAt: new Date(Date.now() + OPERATOR_CACHE_TTL_MS),
  };

  // Try to update first
  const [existing] = await database
    .select()
    .from(reloadlyOperatorCache)
    .where(eq(reloadlyOperatorCache.operatorId, operator.id))
    .limit(1);

  if (existing) {
    const [result] = await database
      .update(reloadlyOperatorCache)
      .set({
        ...cacheData,
        id: existing.id, // Keep existing ID
      })
      .where(eq(reloadlyOperatorCache.operatorId, operator.id))
      .returning();
    return result;
  }

  // Insert new record
  const [result] = await database
    .insert(reloadlyOperatorCache)
    .values(cacheData)
    .returning();

  return result;
}

/**
 * Gets a cached operator by operator ID
 */
export async function getCachedOperator(
  operatorId: number
): Promise<ReloadlyOperatorCacheType | null> {
  const [result] = await database
    .select()
    .from(reloadlyOperatorCache)
    .where(
      and(
        eq(reloadlyOperatorCache.operatorId, operatorId),
        gt(reloadlyOperatorCache.expiresAt, new Date())
      )
    )
    .limit(1);

  return result || null;
}

/**
 * Gets cached operators by country code
 */
export async function getCachedOperatorsByCountry(
  countryCode: string
): Promise<ReloadlyOperatorCacheType[]> {
  return await database
    .select()
    .from(reloadlyOperatorCache)
    .where(
      and(
        eq(reloadlyOperatorCache.countryCode, countryCode),
        gt(reloadlyOperatorCache.expiresAt, new Date())
      )
    )
    .orderBy(reloadlyOperatorCache.name);
}

/**
 * Clears expired operator cache entries
 */
export async function clearExpiredOperatorCache(): Promise<number> {
  const result = await database
    .delete(reloadlyOperatorCache)
    .where(lt(reloadlyOperatorCache.expiresAt, new Date()))
    .returning();

  return result.length;
}

/**
 * Clears all operator cache entries
 */
export async function clearAllOperatorCache(): Promise<number> {
  const result = await database.delete(reloadlyOperatorCache).returning();
  return result.length;
}

/**
 * Parses the full operator data from cache
 */
export function parseOperatorFromCache(
  cache: ReloadlyOperatorCacheType
): ReloadlyOperator | null {
  if (!cache.fullData) return null;
  try {
    return JSON.parse(cache.fullData) as ReloadlyOperator;
  } catch {
    return null;
  }
}
