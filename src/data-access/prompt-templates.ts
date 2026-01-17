/**
 * Prompt Templates Data Access Layer
 * Database operations for prompt templates and usage tracking
 */

import { eq, desc, and, count, sql, or, ilike, inArray, sum, avg } from "drizzle-orm";
import { database } from "~/db";
import {
  promptTemplate,
  promptTemplateUsage,
  type PromptTemplateRecord,
  type CreatePromptTemplateData,
  type UpdatePromptTemplateData,
  type PromptTemplateUsageRecord,
  type CreatePromptTemplateUsageData,
  type PromptTemplateCategoryType,
  type PromptTemplateStatusType,
} from "~/db/schema";

// =============================================================================
// Types
// =============================================================================

export interface TemplateSearchOptions {
  /** Filter by category */
  category?: PromptTemplateCategoryType;
  /** Filter by status */
  status?: PromptTemplateStatusType;
  /** Filter by tags (JSON contains) */
  tags?: string[];
  /** Search in name and description */
  searchQuery?: string;
  /** Filter by built-in status */
  isBuiltIn?: boolean;
  /** Filter by user ID (for custom templates) */
  userId?: string;
  /** Include built-in templates when filtering by userId */
  includeBuiltIn?: boolean;
}

export interface TemplateUsageStats {
  templateId: string;
  totalUses: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheReadTokens: number;
  totalCacheCreationTokens: number;
  avgResponseTimeMs: number;
  successRate: number;
  estimatedCacheSavings: number;
  firstUsedAt: Date | null;
  lastUsedAt: Date | null;
}

export interface UserTemplateUsageStats {
  userId: string;
  totalUses: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheReadTokens: number;
  avgCacheSavingsPercent: number;
  mostUsedTemplateId: string | null;
}

// =============================================================================
// Prompt Template CRUD Operations
// =============================================================================

/**
 * Create a new prompt template
 */
export async function createPromptTemplate(
  data: CreatePromptTemplateData
): Promise<PromptTemplateRecord> {
  const [newTemplate] = await database
    .insert(promptTemplate)
    .values({
      ...data,
      updatedAt: new Date(),
    })
    .returning();

  return newTemplate;
}

/**
 * Find a template by ID
 */
export async function findTemplateById(
  id: string
): Promise<PromptTemplateRecord | null> {
  const [result] = await database
    .select()
    .from(promptTemplate)
    .where(eq(promptTemplate.id, id))
    .limit(1);

  return result || null;
}

/**
 * Find all templates with optional filters
 */
export async function findTemplates(
  options: TemplateSearchOptions = {},
  limit: number = 50,
  offset: number = 0
): Promise<PromptTemplateRecord[]> {
  const conditions = [];

  // Category filter
  if (options.category) {
    conditions.push(eq(promptTemplate.category, options.category));
  }

  // Status filter
  if (options.status) {
    conditions.push(eq(promptTemplate.status, options.status));
  }

  // Built-in filter
  if (options.isBuiltIn !== undefined) {
    conditions.push(eq(promptTemplate.isBuiltIn, options.isBuiltIn));
  }

  // User filter with optional built-in inclusion
  if (options.userId) {
    if (options.includeBuiltIn) {
      conditions.push(
        or(
          eq(promptTemplate.userId, options.userId),
          eq(promptTemplate.isBuiltIn, true)
        )
      );
    } else {
      conditions.push(eq(promptTemplate.userId, options.userId));
    }
  }

  // Search query filter
  if (options.searchQuery) {
    const searchPattern = `%${options.searchQuery}%`;
    conditions.push(
      or(
        ilike(promptTemplate.name, searchPattern),
        ilike(promptTemplate.description, searchPattern)
      )
    );
  }

  // Tags filter (JSON contains - requires raw SQL for PostgreSQL)
  // Note: This is simplified; production may need more sophisticated JSON querying

  const query = database
    .select()
    .from(promptTemplate)
    .orderBy(desc(promptTemplate.createdAt))
    .limit(limit)
    .offset(offset);

  if (conditions.length > 0) {
    return query.where(and(...conditions));
  }

  return query;
}

/**
 * Find templates accessible to a user (their own + built-in)
 */
export async function findUserAccessibleTemplates(
  userId: string,
  options: Omit<TemplateSearchOptions, "userId" | "includeBuiltIn"> = {},
  limit: number = 50,
  offset: number = 0
): Promise<PromptTemplateRecord[]> {
  return findTemplates(
    {
      ...options,
      userId,
      includeBuiltIn: true,
    },
    limit,
    offset
  );
}

/**
 * Count templates matching filters
 */
export async function countTemplates(
  options: TemplateSearchOptions = {}
): Promise<number> {
  const conditions = [];

  if (options.category) {
    conditions.push(eq(promptTemplate.category, options.category));
  }

  if (options.status) {
    conditions.push(eq(promptTemplate.status, options.status));
  }

  if (options.isBuiltIn !== undefined) {
    conditions.push(eq(promptTemplate.isBuiltIn, options.isBuiltIn));
  }

  if (options.userId) {
    if (options.includeBuiltIn) {
      conditions.push(
        or(
          eq(promptTemplate.userId, options.userId),
          eq(promptTemplate.isBuiltIn, true)
        )
      );
    } else {
      conditions.push(eq(promptTemplate.userId, options.userId));
    }
  }

  if (options.searchQuery) {
    const searchPattern = `%${options.searchQuery}%`;
    conditions.push(
      or(
        ilike(promptTemplate.name, searchPattern),
        ilike(promptTemplate.description, searchPattern)
      )
    );
  }

  const query = database.select({ count: count() }).from(promptTemplate);

  if (conditions.length > 0) {
    const [result] = await query.where(and(...conditions));
    return result?.count ?? 0;
  }

  const [result] = await query;
  return result?.count ?? 0;
}

/**
 * Update a template
 */
export async function updateTemplate(
  id: string,
  data: UpdatePromptTemplateData
): Promise<PromptTemplateRecord | null> {
  const [updated] = await database
    .update(promptTemplate)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(promptTemplate.id, id))
    .returning();

  return updated || null;
}

/**
 * Delete a template
 */
export async function deleteTemplate(id: string): Promise<boolean> {
  const result = await database
    .delete(promptTemplate)
    .where(eq(promptTemplate.id, id))
    .returning();

  return result.length > 0;
}

/**
 * Get templates by category
 */
export async function findTemplatesByCategory(
  category: PromptTemplateCategoryType,
  limit: number = 50
): Promise<PromptTemplateRecord[]> {
  return database
    .select()
    .from(promptTemplate)
    .where(
      and(
        eq(promptTemplate.category, category),
        eq(promptTemplate.status, "active")
      )
    )
    .orderBy(desc(promptTemplate.createdAt))
    .limit(limit);
}

/**
 * Find built-in templates only
 */
export async function findBuiltInTemplates(): Promise<PromptTemplateRecord[]> {
  return database
    .select()
    .from(promptTemplate)
    .where(eq(promptTemplate.isBuiltIn, true))
    .orderBy(promptTemplate.name);
}

/**
 * Find user's custom templates
 */
export async function findUserCustomTemplates(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<PromptTemplateRecord[]> {
  return database
    .select()
    .from(promptTemplate)
    .where(
      and(
        eq(promptTemplate.userId, userId),
        eq(promptTemplate.isBuiltIn, false)
      )
    )
    .orderBy(desc(promptTemplate.createdAt))
    .limit(limit)
    .offset(offset);
}

// =============================================================================
// Template Usage Tracking Operations
// =============================================================================

/**
 * Record template usage
 */
export async function recordTemplateUsage(
  data: CreatePromptTemplateUsageData
): Promise<PromptTemplateUsageRecord> {
  const [record] = await database
    .insert(promptTemplateUsage)
    .values(data)
    .returning();

  return record;
}

/**
 * Get usage statistics for a template
 */
export async function getTemplateUsageStats(
  templateId: string
): Promise<TemplateUsageStats | null> {
  const [stats] = await database
    .select({
      templateId: promptTemplateUsage.templateId,
      totalUses: count(),
      totalInputTokens: sum(promptTemplateUsage.inputTokens),
      totalOutputTokens: sum(promptTemplateUsage.outputTokens),
      totalCacheReadTokens: sum(promptTemplateUsage.cacheReadTokens),
      totalCacheCreationTokens: sum(promptTemplateUsage.cacheCreationTokens),
      avgResponseTimeMs: avg(promptTemplateUsage.responseTimeMs),
      firstUsedAt: sql<Date>`MIN(${promptTemplateUsage.createdAt})`,
      lastUsedAt: sql<Date>`MAX(${promptTemplateUsage.createdAt})`,
    })
    .from(promptTemplateUsage)
    .where(eq(promptTemplateUsage.templateId, templateId))
    .groupBy(promptTemplateUsage.templateId);

  if (!stats) {
    return null;
  }

  // Calculate success rate separately
  const [successStats] = await database
    .select({
      total: count(),
      successful: sql<number>`COUNT(*) FILTER (WHERE ${promptTemplateUsage.success} = true)`,
    })
    .from(promptTemplateUsage)
    .where(eq(promptTemplateUsage.templateId, templateId));

  const successRate =
    successStats && successStats.total > 0
      ? (successStats.successful / successStats.total) * 100
      : 0;

  // Calculate estimated cache savings
  const totalInput = Number(stats.totalInputTokens) || 0;
  const cacheRead = Number(stats.totalCacheReadTokens) || 0;
  const cacheCreation = Number(stats.totalCacheCreationTokens) || 0;

  let estimatedCacheSavings = 0;
  if (totalInput > 0) {
    // Cache read tokens cost 10% of normal, creation costs 125%
    const regularTokens = totalInput - cacheRead - cacheCreation;
    const actualCost = regularTokens + cacheCreation * 1.25 + cacheRead * 0.1;
    estimatedCacheSavings = ((totalInput - actualCost) / totalInput) * 100;
  }

  return {
    templateId: stats.templateId,
    totalUses: Number(stats.totalUses) || 0,
    totalInputTokens: Number(stats.totalInputTokens) || 0,
    totalOutputTokens: Number(stats.totalOutputTokens) || 0,
    totalCacheReadTokens: Number(stats.totalCacheReadTokens) || 0,
    totalCacheCreationTokens: Number(stats.totalCacheCreationTokens) || 0,
    avgResponseTimeMs: Number(stats.avgResponseTimeMs) || 0,
    successRate: Math.round(successRate * 100) / 100,
    estimatedCacheSavings: Math.round(estimatedCacheSavings * 100) / 100,
    firstUsedAt: stats.firstUsedAt,
    lastUsedAt: stats.lastUsedAt,
  };
}

/**
 * Get user's template usage statistics
 */
export async function getUserTemplateUsageStats(
  userId: string
): Promise<UserTemplateUsageStats | null> {
  const [stats] = await database
    .select({
      userId: promptTemplateUsage.userId,
      totalUses: count(),
      totalInputTokens: sum(promptTemplateUsage.inputTokens),
      totalOutputTokens: sum(promptTemplateUsage.outputTokens),
      totalCacheReadTokens: sum(promptTemplateUsage.cacheReadTokens),
    })
    .from(promptTemplateUsage)
    .where(eq(promptTemplateUsage.userId, userId))
    .groupBy(promptTemplateUsage.userId);

  if (!stats) {
    return null;
  }

  // Find most used template
  const [mostUsed] = await database
    .select({
      templateId: promptTemplateUsage.templateId,
      useCount: count(),
    })
    .from(promptTemplateUsage)
    .where(eq(promptTemplateUsage.userId, userId))
    .groupBy(promptTemplateUsage.templateId)
    .orderBy(desc(count()))
    .limit(1);

  // Calculate average cache savings
  const totalInput = Number(stats.totalInputTokens) || 0;
  const cacheRead = Number(stats.totalCacheReadTokens) || 0;
  let avgCacheSavings = 0;
  if (totalInput > 0 && cacheRead > 0) {
    avgCacheSavings = (cacheRead * 0.9) / totalInput * 100; // 90% savings on cache reads
  }

  return {
    userId: stats.userId,
    totalUses: Number(stats.totalUses) || 0,
    totalInputTokens: Number(stats.totalInputTokens) || 0,
    totalOutputTokens: Number(stats.totalOutputTokens) || 0,
    totalCacheReadTokens: Number(stats.totalCacheReadTokens) || 0,
    avgCacheSavingsPercent: Math.round(avgCacheSavings * 100) / 100,
    mostUsedTemplateId: mostUsed?.templateId || null,
  };
}

/**
 * Get recent usage records for a user
 */
export async function findUserRecentUsage(
  userId: string,
  limit: number = 20
): Promise<PromptTemplateUsageRecord[]> {
  return database
    .select()
    .from(promptTemplateUsage)
    .where(eq(promptTemplateUsage.userId, userId))
    .orderBy(desc(promptTemplateUsage.createdAt))
    .limit(limit);
}

/**
 * Get usage records for a specific template
 */
export async function findTemplateUsageRecords(
  templateId: string,
  limit: number = 100,
  offset: number = 0
): Promise<PromptTemplateUsageRecord[]> {
  return database
    .select()
    .from(promptTemplateUsage)
    .where(eq(promptTemplateUsage.templateId, templateId))
    .orderBy(desc(promptTemplateUsage.createdAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Count usage records for a template
 */
export async function countTemplateUsage(templateId: string): Promise<number> {
  const [result] = await database
    .select({ count: count() })
    .from(promptTemplateUsage)
    .where(eq(promptTemplateUsage.templateId, templateId));

  return result?.count ?? 0;
}

/**
 * Get global usage statistics (admin use)
 */
export async function getGlobalUsageStats(): Promise<{
  totalUsage: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheReadTokens: number;
  avgCacheSavingsPercent: number;
  uniqueUsers: number;
  uniqueTemplates: number;
}> {
  const [stats] = await database
    .select({
      totalUsage: count(),
      totalInputTokens: sum(promptTemplateUsage.inputTokens),
      totalOutputTokens: sum(promptTemplateUsage.outputTokens),
      totalCacheReadTokens: sum(promptTemplateUsage.cacheReadTokens),
      uniqueUsers: sql<number>`COUNT(DISTINCT ${promptTemplateUsage.userId})`,
      uniqueTemplates: sql<number>`COUNT(DISTINCT ${promptTemplateUsage.templateId})`,
    })
    .from(promptTemplateUsage);

  const totalInput = Number(stats?.totalInputTokens) || 0;
  const cacheRead = Number(stats?.totalCacheReadTokens) || 0;
  let avgCacheSavings = 0;
  if (totalInput > 0 && cacheRead > 0) {
    avgCacheSavings = (cacheRead * 0.9) / totalInput * 100;
  }

  return {
    totalUsage: Number(stats?.totalUsage) || 0,
    totalInputTokens: totalInput,
    totalOutputTokens: Number(stats?.totalOutputTokens) || 0,
    totalCacheReadTokens: cacheRead,
    avgCacheSavingsPercent: Math.round(avgCacheSavings * 100) / 100,
    uniqueUsers: Number(stats?.uniqueUsers) || 0,
    uniqueTemplates: Number(stats?.uniqueTemplates) || 0,
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if a user owns a template or it's built-in
 */
export async function canUserAccessTemplate(
  userId: string,
  templateId: string
): Promise<boolean> {
  const template = await findTemplateById(templateId);
  if (!template) {
    return false;
  }

  // Built-in templates are accessible to all
  if (template.isBuiltIn) {
    return true;
  }

  // User owns the template
  return template.userId === userId;
}

/**
 * Check if a user can modify a template
 */
export async function canUserModifyTemplate(
  userId: string,
  templateId: string
): Promise<boolean> {
  const template = await findTemplateById(templateId);
  if (!template) {
    return false;
  }

  // Cannot modify built-in templates
  if (template.isBuiltIn) {
    return false;
  }

  // User owns the template
  return template.userId === userId;
}

/**
 * Duplicate a template for a user
 */
export async function duplicateTemplate(
  templateId: string,
  userId: string,
  newName?: string
): Promise<PromptTemplateRecord | null> {
  const original = await findTemplateById(templateId);
  if (!original) {
    return null;
  }

  const newTemplate: CreatePromptTemplateData = {
    id: crypto.randomUUID(),
    name: newName || `${original.name} (Copy)`,
    description: original.description,
    category: original.category,
    status: "draft", // Copies start as drafts
    version: "1.0.0",
    systemPrompt: original.systemPrompt,
    userPromptPrefix: original.userPromptPrefix,
    userPromptSuffix: original.userPromptSuffix,
    variables: original.variables,
    caching: original.caching,
    recommendedModel: original.recommendedModel,
    recommendedTemperature: original.recommendedTemperature,
    recommendedMaxTokens: original.recommendedMaxTokens,
    tokenEstimate: original.tokenEstimate,
    tags: original.tags,
    author: null, // New author will be the user
    isBuiltIn: false,
    userId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return createPromptTemplate(newTemplate);
}
