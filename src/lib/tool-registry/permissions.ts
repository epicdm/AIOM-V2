/**
 * Tool Registry Permission System
 * Permission checking for tool execution
 */

import type { ToolPermission, ToolContext } from "./types";
import { ToolPermissionDeniedError } from "./errors";

// ============================================================================
// Permission Hierarchy
// ============================================================================

/**
 * Permission levels in order of increasing access
 * Higher index = more access
 */
const PERMISSION_HIERARCHY: ToolPermission[] = [
  "public",
  "user",
  "premium",
  "admin",
  "system",
];

/**
 * Get the permission level index
 */
function getPermissionLevel(permission: ToolPermission): number {
  return PERMISSION_HIERARCHY.indexOf(permission);
}

// ============================================================================
// Permission Checking
// ============================================================================

/**
 * Determine user's effective permission level based on context
 */
export function getUserPermissionLevel(context: ToolContext): ToolPermission {
  // System-level check (internal use only)
  if (context.custom?.isSystem === true) {
    return "system";
  }

  // Admin check
  if (context.isAdmin) {
    return "admin";
  }

  // Premium subscriber check
  if (
    context.subscriptionTier === "premium" ||
    context.subscriptionTier === "enterprise" ||
    context.subscriptionTier === "pro"
  ) {
    return "premium";
  }

  // Verified user check
  if (context.userId) {
    return "user";
  }

  // Default to public
  return "public";
}

/**
 * Check if a user has sufficient permission for a tool
 * Throws ToolPermissionDeniedError if not
 */
export function checkToolPermission(
  requiredPermission: ToolPermission,
  context: ToolContext
): void {
  const userPermission = getUserPermissionLevel(context);
  const userLevel = getPermissionLevel(userPermission);
  const requiredLevel = getPermissionLevel(requiredPermission);

  if (userLevel < requiredLevel) {
    throw new ToolPermissionDeniedError(
      "tool",
      requiredPermission,
      userPermission
    );
  }
}

/**
 * Check if a user has sufficient permission (returns boolean)
 */
export function hasToolPermission(
  requiredPermission: ToolPermission,
  context: ToolContext
): boolean {
  try {
    checkToolPermission(requiredPermission, context);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get list of permissions user has access to
 */
export function getAccessiblePermissions(
  context: ToolContext
): ToolPermission[] {
  const userLevel = getPermissionLevel(getUserPermissionLevel(context));
  return PERMISSION_HIERARCHY.slice(0, userLevel + 1);
}

// ============================================================================
// Permission Validators
// ============================================================================

/**
 * Validate that a tool ID follows naming conventions
 */
export function validateToolId(toolId: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!toolId) {
    errors.push("Tool ID is required");
    return { valid: false, errors };
  }

  if (toolId.length < 3) {
    errors.push("Tool ID must be at least 3 characters");
  }

  if (toolId.length > 100) {
    errors.push("Tool ID must be at most 100 characters");
  }

  if (!/^[a-z][a-z0-9_-]*$/.test(toolId)) {
    errors.push(
      "Tool ID must start with a lowercase letter and contain only lowercase letters, numbers, underscores, and hyphens"
    );
  }

  // Reserved prefixes
  const reservedPrefixes = ["system_", "admin_", "internal_", "_"];
  for (const prefix of reservedPrefixes) {
    if (toolId.startsWith(prefix)) {
      errors.push(`Tool ID cannot start with reserved prefix: ${prefix}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create a permission context from minimal information
 */
export function createToolContext(
  userId: string,
  options?: {
    isAdmin?: boolean;
    subscriptionTier?: string;
    custom?: Record<string, unknown>;
  }
): ToolContext {
  return {
    userId,
    isAdmin: options?.isAdmin ?? false,
    subscriptionTier: options?.subscriptionTier,
    requestId: crypto.randomUUID(),
    timestamp: new Date(),
    custom: options?.custom,
  };
}

// ============================================================================
// Permission Middleware Helpers
// ============================================================================

/**
 * Create a permission checker function for a specific permission level
 */
export function createPermissionChecker(
  requiredPermission: ToolPermission
): (context: ToolContext) => void {
  return (context: ToolContext) => {
    checkToolPermission(requiredPermission, context);
  };
}

/**
 * Create a filter function that returns only tools the user can access
 */
export function createPermissionFilter(
  context: ToolContext
): (permission: ToolPermission) => boolean {
  const accessiblePermissions = getAccessiblePermissions(context);
  return (permission: ToolPermission) =>
    accessiblePermissions.includes(permission);
}

// ============================================================================
// Permission Description Helpers
// ============================================================================

/**
 * Get human-readable description of a permission level
 */
export function getPermissionDescription(permission: ToolPermission): string {
  switch (permission) {
    case "public":
      return "Available to all authenticated users";
    case "user":
      return "Available to verified users";
    case "premium":
      return "Available to premium subscribers";
    case "admin":
      return "Available to administrators only";
    case "system":
      return "Internal system use only";
    default:
      return "Unknown permission level";
  }
}

/**
 * Get permission requirements as a formatted string
 */
export function formatPermissionRequirement(
  permission: ToolPermission
): string {
  switch (permission) {
    case "public":
      return "Requires authentication";
    case "user":
      return "Requires verified account";
    case "premium":
      return "Requires premium subscription";
    case "admin":
      return "Requires admin access";
    case "system":
      return "System internal only";
    default:
      return "Unknown requirement";
  }
}
