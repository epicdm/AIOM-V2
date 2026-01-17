/**
 * Prompt Templates Server Functions
 * Server-side functions for managing and executing prompt templates
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authenticatedMiddleware, assertAdminMiddleware } from "./middleware";
import {
  createPromptTemplate,
  findTemplateById,
  findUserAccessibleTemplates,
  findTemplatesByCategory,
  countTemplates,
  updateTemplate,
  deleteTemplate,
  findBuiltInTemplates,
  findUserCustomTemplates,
  recordTemplateUsage,
  getTemplateUsageStats,
  getUserTemplateUsageStats,
  findUserRecentUsage,
  canUserAccessTemplate,
  canUserModifyTemplate,
  duplicateTemplate,
  getGlobalUsageStats,
} from "~/data-access/prompt-templates";
import {
  renderPromptTemplate,
  getOrRenderTemplate,
  validateVariables,
  isCacheEligible,
} from "~/lib/prompt-templates";
import {
  BUILT_IN_TEMPLATES,
  getBuiltInTemplate,
  searchBuiltInTemplates,
} from "~/lib/prompt-templates/registry";
import type {
  PromptTemplate,
  PromptTemplateCategory,
  PromptTemplateStatus,
  TemplateVariableValues,
  RenderedTemplate,
  TemplateCachingConfig,
  TemplateVariable,
} from "~/lib/prompt-templates/types";
import type {
  PromptTemplateCategoryType,
  PromptTemplateStatusType,
  CreatePromptTemplateData,
} from "~/db/schema";
import { privateEnv } from "~/config/privateEnv";
import { getClaudeClient, formatClaudeError, calculateCacheStats, type ClaudeModel } from "~/lib/claude";

// =============================================================================
// Schema Definitions
// =============================================================================

const categorySchema = z.enum([
  "briefing_generation",
  "query_answering",
  "summarization",
  "data_extraction",
  "content_creation",
  "analysis",
  "custom",
]);

const statusSchema = z.enum(["active", "deprecated", "draft", "archived"]);

// Schema for template variable values - using z.any() for flexibility
// The actual type validation is done in validateVariables() at runtime
const templateVariableValuesSchema = z.record(z.string(), z.any());

const variableSchema = z.object({
  name: z.string(),
  description: z.string(),
  type: z.enum(["string", "number", "boolean", "array", "object", "date"]),
  required: z.boolean(),
  defaultValue: z.any().optional(),
  example: z.any().optional(),
  validation: z.string().optional(),
});

const cachingConfigSchema = z.object({
  enablePromptCaching: z.boolean(),
  enableMemoryCache: z.boolean(),
  memoryCacheTTL: z.number().optional(),
  minTokensForCaching: z.number().optional(),
});

const searchFiltersSchema = z.object({
  category: categorySchema.optional(),
  status: statusSchema.optional(),
  searchQuery: z.string().optional(),
  isBuiltIn: z.boolean().optional(),
  includeBuiltIn: z.boolean().optional(),
});

const paginationSchema = z.object({
  limit: z.number().min(1).max(100).optional().default(20),
  offset: z.number().min(0).optional().default(0),
});

// =============================================================================
// Template CRUD Functions
// =============================================================================

/**
 * Get all templates accessible to the user (built-in + custom)
 */
export const getAccessibleTemplatesFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      filters: searchFiltersSchema.optional(),
      pagination: paginationSchema.optional(),
    }).optional()
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const filters = data?.filters || {};
    const pagination = data?.pagination || { limit: 20, offset: 0 };

    const [templates, total] = await Promise.all([
      findUserAccessibleTemplates(
        context.userId,
        {
          category: filters.category,
          status: filters.status,
          searchQuery: filters.searchQuery,
          isBuiltIn: filters.isBuiltIn,
        },
        pagination.limit,
        pagination.offset
      ),
      countTemplates({
        userId: context.userId,
        includeBuiltIn: true,
        category: filters.category,
        status: filters.status,
        searchQuery: filters.searchQuery,
        isBuiltIn: filters.isBuiltIn,
      }),
    ]);

    return {
      templates: templates.map(parseTemplateRecord),
      total,
      hasMore: pagination.offset + templates.length < total,
    };
  });

/**
 * Get built-in templates only
 */
export const getBuiltInTemplatesFn = createServerFn({
  method: "GET",
})
  .middleware([authenticatedMiddleware])
  .handler(async () => {
    // Return the in-memory built-in templates (faster, no DB)
    return {
      templates: BUILT_IN_TEMPLATES.map((t) => ({
        ...t,
        isBuiltIn: true,
      })),
    };
  });

/**
 * Get user's custom templates
 */
export const getUserCustomTemplatesFn = createServerFn({
  method: "GET",
})
  .inputValidator(paginationSchema.optional())
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const pagination = data || { limit: 20, offset: 0 };

    const templates = await findUserCustomTemplates(
      context.userId,
      pagination.limit,
      pagination.offset
    );

    const total = await countTemplates({
      userId: context.userId,
      isBuiltIn: false,
    });

    return {
      templates: templates.map(parseTemplateRecord),
      total,
      hasMore: pagination.offset + templates.length < total,
    };
  });

/**
 * Get a specific template by ID
 */
export const getTemplateByIdFn = createServerFn({
  method: "GET",
})
  .inputValidator(z.object({ id: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // First check built-in templates (faster)
    const builtIn = getBuiltInTemplate(data.id);
    if (builtIn) {
      return {
        template: {
          ...builtIn,
          isBuiltIn: true,
        },
      };
    }

    // Check database
    const canAccess = await canUserAccessTemplate(context.userId, data.id);
    if (!canAccess) {
      throw new Error("Template not found or access denied");
    }

    const template = await findTemplateById(data.id);
    if (!template) {
      throw new Error("Template not found");
    }

    return {
      template: parseTemplateRecord(template),
    };
  });

/**
 * Get templates by category
 */
export const getTemplatesByCategoryFn = createServerFn({
  method: "GET",
})
  .inputValidator(z.object({ category: categorySchema }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    // Get from built-in templates first
    const builtInMatches = BUILT_IN_TEMPLATES.filter(
      (t) => t.category === data.category && t.status === "active"
    );

    // Get from database
    const dbTemplates = await findTemplatesByCategory(data.category);

    return {
      templates: [
        ...builtInMatches.map((t) => ({ ...t, isBuiltIn: true })),
        ...dbTemplates.map(parseTemplateRecord),
      ],
    };
  });

/**
 * Create a new custom template
 */
export const createTemplateFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      name: z.string().min(1).max(200),
      description: z.string().min(1).max(2000),
      category: categorySchema,
      systemPrompt: z.string().min(1).max(50000),
      userPromptPrefix: z.string().max(10000).optional(),
      userPromptSuffix: z.string().max(10000).optional(),
      variables: z.array(variableSchema).optional(),
      caching: cachingConfigSchema.optional(),
      recommendedModel: z.string().optional(),
      recommendedTemperature: z.number().min(0).max(1).optional(),
      recommendedMaxTokens: z.number().min(1).max(8192).optional(),
      tags: z.array(z.string()).optional(),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const templateData: CreatePromptTemplateData = {
      id: crypto.randomUUID(),
      name: data.name,
      description: data.description,
      category: data.category,
      status: "draft",
      version: "1.0.0",
      systemPrompt: data.systemPrompt,
      userPromptPrefix: data.userPromptPrefix || null,
      userPromptSuffix: data.userPromptSuffix || null,
      variables: JSON.stringify(data.variables || []),
      caching: JSON.stringify(
        data.caching || {
          enablePromptCaching: true,
          enableMemoryCache: true,
          memoryCacheTTL: 300000,
          minTokensForCaching: 1024,
        }
      ),
      recommendedModel: data.recommendedModel || null,
      recommendedTemperature: data.recommendedTemperature?.toString() || null,
      recommendedMaxTokens: data.recommendedMaxTokens || null,
      tokenEstimate: null,
      tags: data.tags ? JSON.stringify(data.tags) : null,
      author: null,
      isBuiltIn: false,
      userId: context.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const newTemplate = await createPromptTemplate(templateData);

    return {
      template: parseTemplateRecord(newTemplate),
    };
  });

/**
 * Update an existing template
 */
export const updateTemplateFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      id: z.string(),
      name: z.string().min(1).max(200).optional(),
      description: z.string().min(1).max(2000).optional(),
      category: categorySchema.optional(),
      status: statusSchema.optional(),
      systemPrompt: z.string().min(1).max(50000).optional(),
      userPromptPrefix: z.string().max(10000).optional().nullable(),
      userPromptSuffix: z.string().max(10000).optional().nullable(),
      variables: z.array(variableSchema).optional(),
      caching: cachingConfigSchema.optional(),
      recommendedModel: z.string().optional().nullable(),
      recommendedTemperature: z.number().min(0).max(1).optional().nullable(),
      recommendedMaxTokens: z.number().min(1).max(8192).optional().nullable(),
      tags: z.array(z.string()).optional().nullable(),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const canModify = await canUserModifyTemplate(context.userId, data.id);
    if (!canModify) {
      throw new Error("Cannot modify this template (not found, built-in, or access denied)");
    }

    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.systemPrompt !== undefined) updateData.systemPrompt = data.systemPrompt;
    if (data.userPromptPrefix !== undefined) updateData.userPromptPrefix = data.userPromptPrefix;
    if (data.userPromptSuffix !== undefined) updateData.userPromptSuffix = data.userPromptSuffix;
    if (data.variables !== undefined) updateData.variables = JSON.stringify(data.variables);
    if (data.caching !== undefined) updateData.caching = JSON.stringify(data.caching);
    if (data.recommendedModel !== undefined) updateData.recommendedModel = data.recommendedModel;
    if (data.recommendedTemperature !== undefined) {
      updateData.recommendedTemperature = data.recommendedTemperature?.toString() || null;
    }
    if (data.recommendedMaxTokens !== undefined) updateData.recommendedMaxTokens = data.recommendedMaxTokens;
    if (data.tags !== undefined) updateData.tags = data.tags ? JSON.stringify(data.tags) : null;

    const updated = await updateTemplate(data.id, updateData);

    if (!updated) {
      throw new Error("Failed to update template");
    }

    return {
      template: parseTemplateRecord(updated),
    };
  });

/**
 * Delete a template
 */
export const deleteTemplateFn = createServerFn({
  method: "POST",
})
  .inputValidator(z.object({ id: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const canModify = await canUserModifyTemplate(context.userId, data.id);
    if (!canModify) {
      throw new Error("Cannot delete this template");
    }

    const deleted = await deleteTemplate(data.id);
    if (!deleted) {
      throw new Error("Failed to delete template");
    }

    return { success: true };
  });

/**
 * Duplicate a template
 */
export const duplicateTemplateFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      id: z.string(),
      newName: z.string().min(1).max(200).optional(),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const canAccess = await canUserAccessTemplate(context.userId, data.id);
    if (!canAccess) {
      // Check if it's a built-in template
      const builtIn = getBuiltInTemplate(data.id);
      if (!builtIn) {
        throw new Error("Template not found or access denied");
      }

      // Create from built-in template
      const templateData: CreatePromptTemplateData = {
        id: crypto.randomUUID(),
        name: data.newName || `${builtIn.name} (Copy)`,
        description: builtIn.description,
        category: builtIn.category,
        status: "draft",
        version: "1.0.0",
        systemPrompt: builtIn.systemPrompt,
        userPromptPrefix: builtIn.userPromptPrefix || null,
        userPromptSuffix: builtIn.userPromptSuffix || null,
        variables: JSON.stringify(builtIn.variables),
        caching: JSON.stringify(builtIn.caching),
        recommendedModel: builtIn.recommendedModel || null,
        recommendedTemperature: builtIn.recommendedTemperature?.toString() || null,
        recommendedMaxTokens: builtIn.recommendedMaxTokens || null,
        tokenEstimate: builtIn.tokenEstimate ? JSON.stringify(builtIn.tokenEstimate) : null,
        tags: builtIn.tags ? JSON.stringify(builtIn.tags) : null,
        author: null,
        isBuiltIn: false,
        userId: context.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const newTemplate = await createPromptTemplate(templateData);
      return { template: parseTemplateRecord(newTemplate) };
    }

    const duplicated = await duplicateTemplate(data.id, context.userId, data.newName);
    if (!duplicated) {
      throw new Error("Failed to duplicate template");
    }

    return {
      template: parseTemplateRecord(duplicated),
    };
  });

// =============================================================================
// Template Rendering and Execution Functions
// =============================================================================

/**
 * Render a template with variables (preview without execution)
 */
export const renderTemplateFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      templateId: z.string(),
      variableValues: templateVariableValuesSchema,
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // Get the template
    let template: PromptTemplate;

    const builtIn = getBuiltInTemplate(data.templateId);
    if (builtIn) {
      template = builtIn;
    } else {
      const canAccess = await canUserAccessTemplate(context.userId, data.templateId);
      if (!canAccess) {
        throw new Error("Template not found or access denied");
      }

      const dbTemplate = await findTemplateById(data.templateId);
      if (!dbTemplate) {
        throw new Error("Template not found");
      }

      template = parseTemplateRecord(dbTemplate);
    }

    const variableValues = data.variableValues as TemplateVariableValues;

    // Validate variables
    const validation = validateVariables(template, variableValues);
    if (!validation.valid) {
      return {
        success: false,
        errors: validation.errors,
      };
    }

    // Render the template
    const { rendered, fromCache } = getOrRenderTemplate({
      template,
      variableValues,
      userId: context.userId,
    });

    return {
      success: true,
      rendered: {
        ...rendered,
        renderedAt: rendered.renderedAt.toISOString(),
      },
      fromCache,
      cacheEligible: isCacheEligible(template, variableValues),
    };
  });

/**
 * Execute a template with Claude API
 */
export const executeTemplateFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      templateId: z.string(),
      variableValues: templateVariableValuesSchema,
      userMessage: z.string().min(1).max(100000),
      model: z.string().optional(),
      maxTokens: z.number().min(1).max(8192).optional(),
      temperature: z.number().min(0).max(1).optional(),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const startTime = Date.now();

    // Get the template
    let template: PromptTemplate;
    let templateId = data.templateId;

    const builtIn = getBuiltInTemplate(data.templateId);
    if (builtIn) {
      template = builtIn;
    } else {
      const canAccess = await canUserAccessTemplate(context.userId, data.templateId);
      if (!canAccess) {
        throw new Error("Template not found or access denied");
      }

      const dbTemplate = await findTemplateById(data.templateId);
      if (!dbTemplate) {
        throw new Error("Template not found");
      }

      template = parseTemplateRecord(dbTemplate);
      templateId = dbTemplate.id;
    }

    const variableValues = data.variableValues as TemplateVariableValues;

    // Validate variables
    const validation = validateVariables(template, variableValues);
    if (!validation.valid) {
      return {
        success: false,
        errors: validation.errors,
      };
    }

    // Render the template
    const { rendered } = getOrRenderTemplate({
      template,
      variableValues,
      userId: context.userId,
    });

    // Build the full user message
    let fullUserMessage = data.userMessage;
    if (rendered.userPromptPrefix) {
      fullUserMessage = rendered.userPromptPrefix + fullUserMessage;
    }
    if (rendered.userPromptSuffix) {
      fullUserMessage = fullUserMessage + rendered.userPromptSuffix;
    }

    // Call Claude API
    try {
      const client = getClaudeClient(privateEnv.ANTHROPIC_API_KEY);

      const model = (data.model || template.recommendedModel || "claude-3-5-sonnet-20241022") as ClaudeModel;
      const maxTokens = data.maxTokens || template.recommendedMaxTokens || 4096;
      const temperature = data.temperature ?? template.recommendedTemperature ?? 0.5;

      const response = await client.createMessage({
        messages: [{ role: "user", content: fullUserMessage }],
        system: rendered.cachingEnabled ? rendered.systemMessages : rendered.systemPrompt,
        model,
        maxTokens,
        temperature,
        userId: context.userId,
      });

      const responseTime = Date.now() - startTime;

      // Calculate cache stats
      const cacheStats = rendered.cachingEnabled
        ? calculateCacheStats(response.usage)
        : undefined;

      // Record usage
      await recordTemplateUsage({
        id: crypto.randomUUID(),
        templateId,
        userId: context.userId,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        cacheReadTokens: response.usage.cache_read_input_tokens || null,
        cacheCreationTokens: response.usage.cache_creation_input_tokens || null,
        responseTimeMs: responseTime,
        model,
        success: true,
        errorMessage: null,
        createdAt: new Date(),
      });

      // Extract text content from response
      const textContent = response.content
        .filter((block) => block.type === "text")
        .map((block) => (block as { type: "text"; text: string }).text)
        .join("\n");

      return {
        success: true,
        content: textContent,
        usage: response.usage,
        cacheStats,
        responseTimeMs: responseTime,
        model: response.model,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = formatClaudeError(error);

      // Record failed usage
      await recordTemplateUsage({
        id: crypto.randomUUID(),
        templateId,
        userId: context.userId,
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: null,
        cacheCreationTokens: null,
        responseTimeMs: responseTime,
        model: data.model || template.recommendedModel || "claude-3-5-sonnet-20241022",
        success: false,
        errorMessage,
        createdAt: new Date(),
      });

      return {
        success: false,
        error: errorMessage,
        responseTimeMs: responseTime,
      };
    }
  });

// =============================================================================
// Usage Statistics Functions
// =============================================================================

/**
 * Get usage statistics for a template
 */
export const getTemplateUsageStatsFn = createServerFn({
  method: "GET",
})
  .inputValidator(z.object({ templateId: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const canAccess = await canUserAccessTemplate(context.userId, data.templateId);
    if (!canAccess) {
      // Allow access to stats for built-in templates
      const builtIn = getBuiltInTemplate(data.templateId);
      if (!builtIn) {
        throw new Error("Template not found or access denied");
      }
    }

    const stats = await getTemplateUsageStats(data.templateId);
    return { stats };
  });

/**
 * Get user's overall template usage statistics
 */
export const getUserUsageStatsFn = createServerFn({
  method: "GET",
})
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    const stats = await getUserTemplateUsageStats(context.userId);
    return { stats };
  });

/**
 * Get user's recent template usage
 */
export const getRecentUsageFn = createServerFn({
  method: "GET",
})
  .inputValidator(z.object({ limit: z.number().min(1).max(100).optional() }).optional())
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const limit = data?.limit || 20;
    const usage = await findUserRecentUsage(context.userId, limit);
    return { usage };
  });

/**
 * Get global usage statistics (admin only)
 */
export const getGlobalUsageStatsFn = createServerFn({
  method: "GET",
})
  .middleware([assertAdminMiddleware])
  .handler(async () => {
    const stats = await getGlobalUsageStats();
    return { stats };
  });

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if a template is cache-eligible with given variables
 */
export const checkCacheEligibilityFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      templateId: z.string(),
      variableValues: templateVariableValuesSchema.optional(),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // Get the template
    let template: PromptTemplate;

    const builtIn = getBuiltInTemplate(data.templateId);
    if (builtIn) {
      template = builtIn;
    } else {
      const canAccess = await canUserAccessTemplate(context.userId, data.templateId);
      if (!canAccess) {
        throw new Error("Template not found or access denied");
      }

      const dbTemplate = await findTemplateById(data.templateId);
      if (!dbTemplate) {
        throw new Error("Template not found");
      }

      template = parseTemplateRecord(dbTemplate);
    }

    const variableValues = data.variableValues as TemplateVariableValues | undefined;
    const eligible = isCacheEligible(template, variableValues);

    return {
      eligible,
      minTokensRequired: template.caching.minTokensForCaching || 1024,
      estimatedBaseTokens: template.tokenEstimate?.baseTokens,
    };
  });

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Parse a database template record into a PromptTemplate type
 */
function parseTemplateRecord(record: {
  id: string;
  name: string;
  description: string;
  category: string;
  status: string;
  version: string;
  systemPrompt: string;
  userPromptPrefix: string | null;
  userPromptSuffix: string | null;
  variables: string;
  caching: string;
  recommendedModel: string | null;
  recommendedTemperature: string | null;
  recommendedMaxTokens: number | null;
  tokenEstimate: string | null;
  tags: string | null;
  author: string | null;
  isBuiltIn: boolean;
  userId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): PromptTemplate & { isBuiltIn: boolean } {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    category: record.category as PromptTemplateCategory,
    status: record.status as PromptTemplateStatus,
    version: record.version,
    systemPrompt: record.systemPrompt,
    userPromptPrefix: record.userPromptPrefix || undefined,
    userPromptSuffix: record.userPromptSuffix || undefined,
    variables: JSON.parse(record.variables) as TemplateVariable[],
    caching: JSON.parse(record.caching) as TemplateCachingConfig,
    recommendedModel: record.recommendedModel as ClaudeModel | undefined,
    recommendedTemperature: record.recommendedTemperature
      ? parseFloat(record.recommendedTemperature)
      : undefined,
    recommendedMaxTokens: record.recommendedMaxTokens || undefined,
    tokenEstimate: record.tokenEstimate ? JSON.parse(record.tokenEstimate) : undefined,
    tags: record.tags ? JSON.parse(record.tags) : undefined,
    author: record.author || undefined,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    isBuiltIn: record.isBuiltIn,
  };
}

// =============================================================================
// Type Exports
// =============================================================================

export type GetAccessibleTemplatesResult = Awaited<ReturnType<typeof getAccessibleTemplatesFn>>;
export type GetBuiltInTemplatesResult = Awaited<ReturnType<typeof getBuiltInTemplatesFn>>;
export type GetTemplateByIdResult = Awaited<ReturnType<typeof getTemplateByIdFn>>;
export type CreateTemplateResult = Awaited<ReturnType<typeof createTemplateFn>>;
export type UpdateTemplateResult = Awaited<ReturnType<typeof updateTemplateFn>>;
export type RenderTemplateResult = Awaited<ReturnType<typeof renderTemplateFn>>;
export type ExecuteTemplateResult = Awaited<ReturnType<typeof executeTemplateFn>>;
export type GetTemplateUsageStatsResult = Awaited<ReturnType<typeof getTemplateUsageStatsFn>>;
export type GetUserUsageStatsResult = Awaited<ReturnType<typeof getUserUsageStatsFn>>;
