import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authenticatedMiddleware, assertAdminMiddleware } from "./middleware";
import {
  findFeatureFlagById,
  findFeatureFlagByName,
  getAllFeatureFlags,
  createFeatureFlag,
  updateFeatureFlag,
  deleteFeatureFlag,
  getFeatureFlagUserTargets,
  addFeatureFlagUserTarget,
  removeFeatureFlagUserTarget,
  getFeatureFlagRoleTargets,
  addFeatureFlagRoleTarget,
  removeFeatureFlagRoleTarget,
  isFeatureFlagEnabled,
  getFeatureFlagWithTargets,
  getFeatureFlagByNameWithTargets,
  checkMultipleFeatureFlags,
} from "~/data-access/feature-flags";
import { getUserRole } from "~/data-access/users";
import { ROLLOUT_STRATEGIES, USER_ROLES, type RolloutStrategy } from "~/db/schema";
import { nanoid } from "nanoid";

// =============================================================================
// Constants and Types
// =============================================================================

export { ROLLOUT_STRATEGIES };

// =============================================================================
// Validation Schemas
// =============================================================================

const createFeatureFlagSchema = z.object({
  flagName: z
    .string()
    .min(1, "Flag name is required")
    .max(100, "Flag name must be 100 characters or less")
    .regex(
      /^[a-z][a-z0-9_]*$/,
      "Flag name must start with a lowercase letter and contain only lowercase letters, numbers, and underscores"
    ),
  description: z.string().max(500, "Description must be 500 characters or less").optional(),
  enabled: z.boolean().default(false),
  rolloutPercentage: z.number().int().min(0).max(100).default(0),
  rolloutStrategy: z.enum(ROLLOUT_STRATEGIES).default("all"),
  metadata: z.string().optional(),
});

const updateFeatureFlagSchema = z.object({
  id: z.string().min(1, "Feature flag ID is required"),
  description: z.string().max(500).optional(),
  enabled: z.boolean().optional(),
  rolloutPercentage: z.number().int().min(0).max(100).optional(),
  rolloutStrategy: z.enum(ROLLOUT_STRATEGIES).optional(),
  metadata: z.string().optional(),
});

const userTargetSchema = z.object({
  featureFlagId: z.string().min(1, "Feature flag ID is required"),
  userId: z.string().min(1, "User ID is required"),
  enabled: z.boolean().default(true),
});

const roleTargetSchema = z.object({
  featureFlagId: z.string().min(1, "Feature flag ID is required"),
  role: z.enum(USER_ROLES),
  enabled: z.boolean().default(true),
});

// =============================================================================
// Query Functions (Admin Only)
// =============================================================================

/**
 * Get all feature flags (admin only)
 */
export const getFeatureFlagsFn = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      enabled: z.boolean().optional(),
      rolloutStrategy: z.enum(ROLLOUT_STRATEGIES).optional(),
      limit: z.number().int().positive().max(100).default(50),
      offset: z.number().int().nonnegative().default(0),
    }).optional()
  )
  .middleware([assertAdminMiddleware])
  .handler(async ({ data }) => {
    const flags = await getAllFeatureFlags({
      enabled: data?.enabled,
      rolloutStrategy: data?.rolloutStrategy as RolloutStrategy | undefined,
      limit: data?.limit || 50,
      offset: data?.offset || 0,
    });
    return flags;
  });

/**
 * Get a feature flag by ID with all targeting rules (admin only)
 */
export const getFeatureFlagByIdFn = createServerFn({ method: "GET" })
  .inputValidator(z.object({ id: z.string().min(1, "Feature flag ID is required") }))
  .middleware([assertAdminMiddleware])
  .handler(async ({ data }) => {
    const result = await getFeatureFlagWithTargets(data.id);
    if (!result) {
      throw new Error("Feature flag not found");
    }
    return result;
  });

/**
 * Get a feature flag by name with all targeting rules (admin only)
 */
export const getFeatureFlagByNameFn = createServerFn({ method: "GET" })
  .inputValidator(z.object({ flagName: z.string().min(1, "Flag name is required") }))
  .middleware([assertAdminMiddleware])
  .handler(async ({ data }) => {
    const result = await getFeatureFlagByNameWithTargets(data.flagName);
    if (!result) {
      throw new Error("Feature flag not found");
    }
    return result;
  });

// =============================================================================
// Mutation Functions (Admin Only)
// =============================================================================

/**
 * Create a new feature flag (admin only)
 */
export const createFeatureFlagFn = createServerFn({ method: "POST" })
  .inputValidator(createFeatureFlagSchema)
  .middleware([assertAdminMiddleware])
  .handler(async ({ data, context }) => {
    // Check if flag name already exists
    const existing = await findFeatureFlagByName(data.flagName);
    if (existing) {
      throw new Error(`Feature flag with name "${data.flagName}" already exists`);
    }

    const flag = await createFeatureFlag(
      {
        id: nanoid(),
        flagName: data.flagName,
        description: data.description,
        enabled: data.enabled,
        rolloutPercentage: data.rolloutPercentage,
        rolloutStrategy: data.rolloutStrategy,
        metadata: data.metadata,
      },
      {
        actorId: context.userId,
        actorType: "admin",
      }
    );

    return flag;
  });

/**
 * Update a feature flag (admin only)
 */
export const updateFeatureFlagFn = createServerFn({ method: "POST" })
  .inputValidator(updateFeatureFlagSchema)
  .middleware([assertAdminMiddleware])
  .handler(async ({ data, context }) => {
    const { id, ...updateData } = data;

    const flag = await updateFeatureFlag(
      id,
      updateData,
      {
        actorId: context.userId,
        actorType: "admin",
      }
    );

    if (!flag) {
      throw new Error("Feature flag not found");
    }

    return flag;
  });

/**
 * Delete a feature flag (admin only)
 */
export const deleteFeatureFlagFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().min(1, "Feature flag ID is required") }))
  .middleware([assertAdminMiddleware])
  .handler(async ({ data, context }) => {
    const success = await deleteFeatureFlag(data.id, {
      actorId: context.userId,
      actorType: "admin",
    });

    if (!success) {
      throw new Error("Feature flag not found");
    }

    return { success: true };
  });

// =============================================================================
// User Targeting Functions (Admin Only)
// =============================================================================

/**
 * Get user targets for a feature flag (admin only)
 */
export const getFeatureFlagUserTargetsFn = createServerFn({ method: "GET" })
  .inputValidator(z.object({ featureFlagId: z.string().min(1) }))
  .middleware([assertAdminMiddleware])
  .handler(async ({ data }) => {
    return getFeatureFlagUserTargets(data.featureFlagId);
  });

/**
 * Add a user target to a feature flag (admin only)
 */
export const addUserTargetFn = createServerFn({ method: "POST" })
  .inputValidator(userTargetSchema)
  .middleware([assertAdminMiddleware])
  .handler(async ({ data, context }) => {
    // Verify feature flag exists
    const flag = await findFeatureFlagById(data.featureFlagId);
    if (!flag) {
      throw new Error("Feature flag not found");
    }

    const target = await addFeatureFlagUserTarget(
      {
        id: nanoid(),
        featureFlagId: data.featureFlagId,
        userId: data.userId,
        enabled: data.enabled,
      },
      {
        actorId: context.userId,
        actorType: "admin",
      }
    );

    return target;
  });

/**
 * Remove a user target from a feature flag (admin only)
 */
export const removeUserTargetFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    featureFlagId: z.string().min(1),
    userId: z.string().min(1),
  }))
  .middleware([assertAdminMiddleware])
  .handler(async ({ data, context }) => {
    const success = await removeFeatureFlagUserTarget(
      data.featureFlagId,
      data.userId,
      {
        actorId: context.userId,
        actorType: "admin",
      }
    );

    if (!success) {
      throw new Error("User target not found");
    }

    return { success: true };
  });

// =============================================================================
// Role Targeting Functions (Admin Only)
// =============================================================================

/**
 * Get role targets for a feature flag (admin only)
 */
export const getFeatureFlagRoleTargetsFn = createServerFn({ method: "GET" })
  .inputValidator(z.object({ featureFlagId: z.string().min(1) }))
  .middleware([assertAdminMiddleware])
  .handler(async ({ data }) => {
    return getFeatureFlagRoleTargets(data.featureFlagId);
  });

/**
 * Add a role target to a feature flag (admin only)
 */
export const addRoleTargetFn = createServerFn({ method: "POST" })
  .inputValidator(roleTargetSchema)
  .middleware([assertAdminMiddleware])
  .handler(async ({ data, context }) => {
    // Verify feature flag exists
    const flag = await findFeatureFlagById(data.featureFlagId);
    if (!flag) {
      throw new Error("Feature flag not found");
    }

    const target = await addFeatureFlagRoleTarget(
      {
        id: nanoid(),
        featureFlagId: data.featureFlagId,
        role: data.role,
        enabled: data.enabled,
      },
      {
        actorId: context.userId,
        actorType: "admin",
      }
    );

    return target;
  });

/**
 * Remove a role target from a feature flag (admin only)
 */
export const removeRoleTargetFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    featureFlagId: z.string().min(1),
    role: z.enum(USER_ROLES),
  }))
  .middleware([assertAdminMiddleware])
  .handler(async ({ data, context }) => {
    const success = await removeFeatureFlagRoleTarget(
      data.featureFlagId,
      data.role,
      {
        actorId: context.userId,
        actorType: "admin",
      }
    );

    if (!success) {
      throw new Error("Role target not found");
    }

    return { success: true };
  });

// =============================================================================
// Feature Flag Evaluation Functions (Authenticated Users)
// =============================================================================

/**
 * Check if a feature flag is enabled for the current user
 */
export const checkFeatureFn = createServerFn({ method: "GET" })
  .inputValidator(z.object({ flagName: z.string().min(1, "Flag name is required") }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const userRole = await getUserRole(context.userId);
    const enabled = await isFeatureFlagEnabled(data.flagName, context.userId, userRole);
    return { flagName: data.flagName, enabled };
  });

/**
 * Check multiple feature flags for the current user
 */
export const checkMultipleFeaturesFn = createServerFn({ method: "GET" })
  .inputValidator(z.object({
    flagNames: z.array(z.string().min(1)).min(1, "At least one flag name is required"),
  }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const userRole = await getUserRole(context.userId);
    const results = await checkMultipleFeatureFlags(data.flagNames, context.userId, userRole);
    return results;
  });

/**
 * Toggle a feature flag on/off (admin only)
 */
export const toggleFeatureFlagFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    id: z.string().min(1, "Feature flag ID is required"),
    enabled: z.boolean(),
  }))
  .middleware([assertAdminMiddleware])
  .handler(async ({ data, context }) => {
    const flag = await updateFeatureFlag(
      data.id,
      { enabled: data.enabled },
      {
        actorId: context.userId,
        actorType: "admin",
      }
    );

    if (!flag) {
      throw new Error("Feature flag not found");
    }

    return flag;
  });

/**
 * Update rollout percentage for a feature flag (admin only)
 */
export const updateRolloutPercentageFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    id: z.string().min(1, "Feature flag ID is required"),
    rolloutPercentage: z.number().int().min(0).max(100),
  }))
  .middleware([assertAdminMiddleware])
  .handler(async ({ data, context }) => {
    const flag = await updateFeatureFlag(
      data.id,
      { rolloutPercentage: data.rolloutPercentage },
      {
        actorId: context.userId,
        actorType: "admin",
      }
    );

    if (!flag) {
      throw new Error("Feature flag not found");
    }

    return flag;
  });
