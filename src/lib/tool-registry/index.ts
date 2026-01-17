/**
 * AIOM Tool Registry
 * Registry system for defining and managing Claude tool definitions
 *
 * @module tool-registry
 */

// Types
export type {
  // Schema types
  ToolInputProperty,
  ToolInputSchema,
  ToolCategory,
  ToolPermission,
  ToolExecutionStatus,
  // Definition types
  ToolDefinition,
  ToolDefinitionPublic,
  ClaudeTool,
  // Handler types
  ToolContext,
  ToolHandler,
  ToolResult,
  // Formatter types
  ResponseFormatter,
  FormattedResponse,
  // Error types
  ToolExecutionError,
  // Registry types
  GetToolsOptions,
  RegisterToolOptions,
  ExecuteToolOptions,
  ToolExecutionRecord,
  // Validation types
  RegisterToolInput,
  ExecuteToolInput,
} from "./types";

// Validation schemas
export {
  toolCategorySchema,
  toolPermissionSchema,
} from "./types";

// Registry
export {
  type ToolRegistry,
  createToolRegistry,
  getToolRegistry,
  resetToolRegistry,
} from "./registry";

// Errors
export {
  ToolRegistryError,
  ToolNotFoundError,
  ToolAlreadyExistsError,
  ToolDisabledError,
  ToolPermissionDeniedError,
  ToolValidationError,
  ToolTimeoutError,
  ToolExecutionFailedError,
  ToolRateLimitError,
  InvalidToolDefinitionError,
  isToolRegistryError,
  isRetryableToolError,
  formatToolError,
  toToolExecutionError,
} from "./errors";

// Permissions
export {
  getUserPermissionLevel,
  checkToolPermission,
  hasToolPermission,
  getAccessiblePermissions,
  validateToolId,
  createToolContext,
  createPermissionChecker,
  createPermissionFilter,
  getPermissionDescription,
  formatPermissionRequirement,
} from "./permissions";

// Formatters
export {
  defaultFormatter,
  createTableFormatter,
  createJsonFormatter,
  createSummaryFormatter,
  createMarkdownFormatter,
  combineFormatters,
  withMetadata,
} from "./formatters";
