/**
 * Example Tool Registrations
 * Sample tools to demonstrate the tool registry system
 */

import type { ToolDefinition, ToolResult } from "./types";
import { getToolRegistry } from "./registry";
import { createJsonFormatter } from "./formatters";

// ============================================================================
// Example Tools
// ============================================================================

/**
 * Echo tool - returns the input back
 */
export const echoTool: ToolDefinition<{ message: string }, { echo: string }> = {
  id: "echo",
  name: "Echo",
  description: "A simple tool that echoes back the provided message. Useful for testing the tool registry.",
  version: "1.0.0",
  category: "utility",
  permission: "public",
  enabled: true,
  inputSchema: {
    type: "object",
    properties: {
      message: {
        type: "string",
        description: "The message to echo back",
      },
    },
    required: ["message"],
  },
  handler: async (input, context): Promise<ToolResult<{ echo: string }>> => {
    return {
      success: true,
      data: {
        echo: input.message,
      },
      metadata: {
        executionTimeMs: 1,
      },
    };
  },
};

/**
 * Current time tool
 */
export const currentTimeTool: ToolDefinition<
  { timezone?: string },
  { time: string; timezone: string }
> = {
  id: "current-time",
  name: "Current Time",
  description: "Returns the current date and time. Optionally accepts a timezone.",
  version: "1.0.0",
  category: "utility",
  permission: "public",
  enabled: true,
  inputSchema: {
    type: "object",
    properties: {
      timezone: {
        type: "string",
        description: "Optional timezone (e.g., 'America/New_York', 'UTC'). Defaults to UTC.",
      },
    },
  },
  handler: async (input, context): Promise<ToolResult<{ time: string; timezone: string }>> => {
    const timezone = input.timezone || "UTC";
    try {
      const time = new Date().toLocaleString("en-US", { timeZone: timezone });
      return {
        success: true,
        data: { time, timezone },
      };
    } catch {
      return {
        success: false,
        error: {
          code: "INVALID_TIMEZONE",
          message: `Invalid timezone: ${timezone}`,
          retryable: false,
        },
      };
    }
  },
};

/**
 * Math calculator tool
 */
export const calculatorTool: ToolDefinition<
  { operation: string; a: number; b: number },
  { result: number; expression: string }
> = {
  id: "calculator",
  name: "Calculator",
  description: "Performs basic math operations (add, subtract, multiply, divide).",
  version: "1.0.0",
  category: "utility",
  permission: "public",
  enabled: true,
  inputSchema: {
    type: "object",
    properties: {
      operation: {
        type: "string",
        description: "The operation to perform",
        enum: ["add", "subtract", "multiply", "divide"],
      },
      a: {
        type: "number",
        description: "First operand",
      },
      b: {
        type: "number",
        description: "Second operand",
      },
    },
    required: ["operation", "a", "b"],
  },
  handler: async (input, context): Promise<ToolResult<{ result: number; expression: string }>> => {
    const { operation, a, b } = input;
    let result: number;
    let expression: string;

    switch (operation) {
      case "add":
        result = a + b;
        expression = `${a} + ${b} = ${result}`;
        break;
      case "subtract":
        result = a - b;
        expression = `${a} - ${b} = ${result}`;
        break;
      case "multiply":
        result = a * b;
        expression = `${a} × ${b} = ${result}`;
        break;
      case "divide":
        if (b === 0) {
          return {
            success: false,
            error: {
              code: "DIVISION_BY_ZERO",
              message: "Cannot divide by zero",
              retryable: false,
            },
          };
        }
        result = a / b;
        expression = `${a} ÷ ${b} = ${result}`;
        break;
      default:
        return {
          success: false,
          error: {
            code: "INVALID_OPERATION",
            message: `Unknown operation: ${operation}`,
            retryable: false,
          },
        };
    }

    return {
      success: true,
      data: { result, expression },
    };
  },
  formatter: createJsonFormatter(),
};

/**
 * Random number generator tool
 */
export const randomNumberTool: ToolDefinition<
  { min?: number; max?: number; count?: number },
  { numbers: number[] }
> = {
  id: "random-number",
  name: "Random Number Generator",
  description: "Generates random numbers within a specified range.",
  version: "1.0.0",
  category: "utility",
  permission: "public",
  enabled: true,
  tags: ["random", "generator"],
  inputSchema: {
    type: "object",
    properties: {
      min: {
        type: "number",
        description: "Minimum value (default: 0)",
        default: 0,
      },
      max: {
        type: "number",
        description: "Maximum value (default: 100)",
        default: 100,
      },
      count: {
        type: "integer",
        description: "Number of random numbers to generate (default: 1, max: 100)",
        default: 1,
        minimum: 1,
        maximum: 100,
      },
    },
  },
  handler: async (input, context): Promise<ToolResult<{ numbers: number[] }>> => {
    const min = input.min ?? 0;
    const max = input.max ?? 100;
    const count = Math.min(input.count ?? 1, 100);

    if (min >= max) {
      return {
        success: false,
        error: {
          code: "INVALID_RANGE",
          message: "Minimum must be less than maximum",
          retryable: false,
        },
      };
    }

    const numbers = Array.from({ length: count }, () =>
      Math.floor(Math.random() * (max - min + 1)) + min
    );

    return {
      success: true,
      data: { numbers },
    };
  },
};

/**
 * User info tool (requires authentication context)
 */
export const userInfoTool: ToolDefinition<
  Record<string, never>,
  { userId: string; isAdmin: boolean; requestId: string }
> = {
  id: "user-info",
  name: "User Info",
  description: "Returns information about the current user context.",
  version: "1.0.0",
  category: "data",
  permission: "user",
  enabled: true,
  inputSchema: {
    type: "object",
    properties: {},
  },
  handler: async (input, context): Promise<ToolResult<{ userId: string; isAdmin: boolean; requestId: string }>> => {
    return {
      success: true,
      data: {
        userId: context.userId,
        isAdmin: context.isAdmin,
        requestId: context.requestId,
      },
    };
  },
};

// ============================================================================
// Registration Function
// ============================================================================

/**
 * Register all example tools with the registry
 */
export function registerExampleTools(): void {
  const registry = getToolRegistry();

  // Register all example tools
  const tools = [
    echoTool,
    currentTimeTool,
    calculatorTool,
    randomNumberTool,
    userInfoTool,
  ];

  for (const tool of tools) {
    if (!registry.has(tool.id)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      registry.register(tool as any);
    }
  }
}

/**
 * Get count of registered example tools
 */
export function getExampleToolCount(): number {
  return 5;
}
