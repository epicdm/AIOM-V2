/**
 * Tool Registry Implementation
 * Core registry for managing Claude tool definitions
 */

import { nanoid } from "nanoid";
import type {
  ToolDefinition,
  ToolDefinitionPublic,
  ClaudeTool,
  ToolContext,
  ToolResult,
  FormattedResponse,
  ToolCategory,
  ToolPermission,
  GetToolsOptions,
  RegisterToolOptions,
  ExecuteToolOptions,
  ToolExecutionRecord,
  ToolExecutionStatus,
} from "./types";
import {
  ToolNotFoundError,
  ToolAlreadyExistsError,
  ToolDisabledError,
  ToolTimeoutError,
  ToolExecutionFailedError,
  toToolExecutionError,
} from "./errors";
import { checkToolPermission } from "./permissions";
import { defaultFormatter } from "./formatters";

// ============================================================================
// Registry Interface
// ============================================================================

export interface ToolRegistry {
  /** Register a new tool */
  register<TInput, TOutput>(
    tool: ToolDefinition<TInput, TOutput>,
    options?: RegisterToolOptions
  ): void;

  /** Unregister a tool */
  unregister(toolId: string): boolean;

  /** Get a tool by ID */
  get<TInput = Record<string, unknown>, TOutput = unknown>(
    toolId: string
  ): ToolDefinition<TInput, TOutput> | undefined;

  /** Get all tools matching options */
  getAll(options?: GetToolsOptions): ToolDefinition[];

  /** Get tools in Claude-compatible format */
  getClaudeTools(options?: GetToolsOptions): ClaudeTool[];

  /** Get public tool definitions (without handlers) */
  getPublicDefinitions(options?: GetToolsOptions): ToolDefinitionPublic[];

  /** Check if a tool exists */
  has(toolId: string): boolean;

  /** Enable a tool */
  enable(toolId: string): boolean;

  /** Disable a tool */
  disable(toolId: string): boolean;

  /** Execute a tool */
  execute<TInput = Record<string, unknown>, TOutput = unknown>(
    toolId: string,
    input: TInput,
    context: ToolContext,
    options?: ExecuteToolOptions
  ): Promise<{
    result: ToolResult<TOutput>;
    formatted: FormattedResponse;
    record: ToolExecutionRecord;
  }>;

  /** Get tool count */
  size(): number;

  /** Clear all tools */
  clear(): void;

  /** Get categories with tool counts */
  getCategories(): Map<ToolCategory, number>;

  /** Search tools by name or description */
  search(query: string): ToolDefinition[];
}

// ============================================================================
// Registry Implementation
// ============================================================================

/**
 * Create a new tool registry instance
 */
export function createToolRegistry(): ToolRegistry {
  const tools = new Map<string, ToolDefinition>();
  const executionRecords: ToolExecutionRecord[] = [];
  const rateLimitTracker = new Map<string, { count: number; resetAt: Date }>();

  /**
   * Check rate limit for a tool
   */
  function checkRateLimit(toolId: string, rateLimit: number): boolean {
    const key = toolId;
    const now = new Date();
    const tracker = rateLimitTracker.get(key);

    if (!tracker || tracker.resetAt < now) {
      rateLimitTracker.set(key, {
        count: 1,
        resetAt: new Date(now.getTime() + 60000), // 1 minute window
      });
      return true;
    }

    if (tracker.count >= rateLimit) {
      return false;
    }

    tracker.count++;
    return true;
  }

  /**
   * Create execution record
   */
  function createExecutionRecord(
    toolId: string,
    userId: string,
    input: Record<string, unknown>
  ): ToolExecutionRecord {
    return {
      id: nanoid(),
      toolId,
      userId,
      input,
      status: "pending" as ToolExecutionStatus,
      startedAt: new Date(),
    };
  }

  /**
   * Filter tools by options
   */
  function filterTools(options?: GetToolsOptions): ToolDefinition[] {
    let result = Array.from(tools.values());

    if (options?.category) {
      result = result.filter((t) => t.category === options.category);
    }

    if (options?.permission) {
      result = result.filter((t) => t.permission === options.permission);
    }

    if (options?.enabled !== undefined) {
      result = result.filter((t) => t.enabled === options.enabled);
    }

    if (options?.tags && options.tags.length > 0) {
      result = result.filter(
        (t) =>
          t.tags &&
          options.tags!.some((tag) => t.tags!.includes(tag))
      );
    }

    return result;
  }

  return {
    register<TInput, TOutput>(
      tool: ToolDefinition<TInput, TOutput>,
      options?: RegisterToolOptions
    ): void {
      if (tools.has(tool.id) && !options?.overwrite) {
        throw new ToolAlreadyExistsError(tool.id);
      }
      tools.set(tool.id, tool as ToolDefinition);
    },

    unregister(toolId: string): boolean {
      return tools.delete(toolId);
    },

    get<TInput = Record<string, unknown>, TOutput = unknown>(
      toolId: string
    ): ToolDefinition<TInput, TOutput> | undefined {
      return tools.get(toolId) as ToolDefinition<TInput, TOutput> | undefined;
    },

    getAll(options?: GetToolsOptions): ToolDefinition[] {
      return filterTools(options);
    },

    getClaudeTools(options?: GetToolsOptions): ClaudeTool[] {
      return filterTools({ ...options, enabled: true }).map((tool) => ({
        name: tool.id,
        description: tool.description,
        input_schema: tool.inputSchema,
      }));
    },

    getPublicDefinitions(options?: GetToolsOptions): ToolDefinitionPublic[] {
      return filterTools(options).map((tool) => {
        const { handler, formatter, ...publicTool } = tool;
        return publicTool;
      });
    },

    has(toolId: string): boolean {
      return tools.has(toolId);
    },

    enable(toolId: string): boolean {
      const tool = tools.get(toolId);
      if (!tool) return false;
      tool.enabled = true;
      return true;
    },

    disable(toolId: string): boolean {
      const tool = tools.get(toolId);
      if (!tool) return false;
      tool.enabled = false;
      return true;
    },

    async execute<TInput = Record<string, unknown>, TOutput = unknown>(
      toolId: string,
      input: TInput,
      context: ToolContext,
      options?: ExecuteToolOptions
    ): Promise<{
      result: ToolResult<TOutput>;
      formatted: FormattedResponse;
      record: ToolExecutionRecord;
    }> {
      const tool = tools.get(toolId) as ToolDefinition<TInput, TOutput> | undefined;

      if (!tool) {
        throw new ToolNotFoundError(toolId);
      }

      if (!tool.enabled) {
        throw new ToolDisabledError(toolId);
      }

      // Check permission
      if (!options?.skipPermissionCheck) {
        checkToolPermission(tool.permission, context);
      }

      // Check rate limit
      if (tool.rateLimit && !checkRateLimit(toolId, tool.rateLimit)) {
        const retryAfterMs = 60000; // 1 minute
        throw new ToolExecutionFailedError(
          toolId,
          `Rate limit exceeded. Limit: ${tool.rateLimit}/min`
        );
      }

      // Create execution record
      const record = createExecutionRecord(
        toolId,
        context.userId,
        input as Record<string, unknown>
      );
      record.status = "running";

      const timeoutMs = options?.timeoutMs ?? tool.timeoutMs ?? 30000;
      const startTime = Date.now();

      try {
        // Execute with timeout
        const result = await Promise.race([
          tool.handler(input, context),
          new Promise<never>((_, reject) => {
            setTimeout(() => {
              reject(new ToolTimeoutError(toolId, timeoutMs));
            }, timeoutMs);
          }),
        ]) as ToolResult<TOutput>;

        const executionTimeMs = Date.now() - startTime;

        // Update record
        record.status = result.success ? "completed" : "failed";
        record.result = result as ToolResult;
        record.completedAt = new Date();
        record.executionTimeMs = executionTimeMs;

        if (!result.success && result.error) {
          record.error = result.error;
        }

        // Add metadata
        if (result.success && result.metadata) {
          result.metadata.executionTimeMs = executionTimeMs;
        }

        // Format response
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const formatter = (tool.formatter ?? defaultFormatter) as any;
        const formatted = formatter(result, context);
        record.formattedResponse = formatted;

        // Store record
        executionRecords.push(record);

        return { result, formatted, record };
      } catch (error) {
        const executionTimeMs = Date.now() - startTime;

        record.status = "failed";
        record.completedAt = new Date();
        record.executionTimeMs = executionTimeMs;
        record.error = toToolExecutionError(error);

        executionRecords.push(record);

        // Re-throw known errors
        if (error instanceof ToolTimeoutError) {
          throw error;
        }

        throw new ToolExecutionFailedError(
          toolId,
          error instanceof Error ? error.message : "Unknown error",
          error instanceof Error ? error : undefined
        );
      }
    },

    size(): number {
      return tools.size;
    },

    clear(): void {
      tools.clear();
    },

    getCategories(): Map<ToolCategory, number> {
      const categories = new Map<ToolCategory, number>();
      for (const tool of tools.values()) {
        const count = categories.get(tool.category) ?? 0;
        categories.set(tool.category, count + 1);
      }
      return categories;
    },

    search(query: string): ToolDefinition[] {
      const lowerQuery = query.toLowerCase();
      return Array.from(tools.values()).filter(
        (tool) =>
          tool.name.toLowerCase().includes(lowerQuery) ||
          tool.description.toLowerCase().includes(lowerQuery) ||
          tool.id.toLowerCase().includes(lowerQuery) ||
          tool.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery))
      );
    },
  };
}

// ============================================================================
// Singleton Instance
// ============================================================================

let toolRegistry: ToolRegistry | null = null;

/**
 * Get the global tool registry instance
 */
export function getToolRegistry(): ToolRegistry {
  if (!toolRegistry) {
    toolRegistry = createToolRegistry();
  }
  return toolRegistry;
}

/**
 * Reset the global registry (mainly for testing)
 */
export function resetToolRegistry(): void {
  toolRegistry = null;
}
