import { eq, and, desc } from "drizzle-orm";
import { database } from "~/db";
import {
  featureFlag,
  featureFlagUserTarget,
  featureFlagRoleTarget,
  type FeatureFlag,
  type CreateFeatureFlagData,
  type UpdateFeatureFlagData,
  type FeatureFlagUserTarget,
  type CreateFeatureFlagUserTargetData,
  type FeatureFlagRoleTarget,
  type CreateFeatureFlagRoleTargetData,
  type RolloutStrategy,
  type UserRole,
} from "~/db/schema";
import { logResourceChange, type AuditActorType } from "./audit-logging";

// =============================================================================
// Feature Flag CRUD Operations
// =============================================================================

/**
 * Find a feature flag by its ID
 */
export async function findFeatureFlagById(id: string): Promise<FeatureFlag | null> {
  const [result] = await database
    .select()
    .from(featureFlag)
    .where(eq(featureFlag.id, id))
    .limit(1);

  return result || null;
}

/**
 * Find a feature flag by its unique name
 */
export async function findFeatureFlagByName(flagName: string): Promise<FeatureFlag | null> {
  const [result] = await database
    .select()
    .from(featureFlag)
    .where(eq(featureFlag.flagName, flagName))
    .limit(1);

  return result || null;
}

/**
 * Get all feature flags with optional filtering
 */
export async function getAllFeatureFlags(options?: {
  enabled?: boolean;
  rolloutStrategy?: RolloutStrategy;
  limit?: number;
  offset?: number;
}): Promise<FeatureFlag[]> {
  let query = database.select().from(featureFlag);

  const conditions = [];
  if (options?.enabled !== undefined) {
    conditions.push(eq(featureFlag.enabled, options.enabled));
  }
  if (options?.rolloutStrategy) {
    conditions.push(eq(featureFlag.rolloutStrategy, options.rolloutStrategy));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }

  query = query.orderBy(desc(featureFlag.createdAt)) as typeof query;

  if (options?.limit) {
    query = query.limit(options.limit) as typeof query;
  }
  if (options?.offset) {
    query = query.offset(options.offset) as typeof query;
  }

  return query;
}

/**
 * Create a new feature flag
 */
export async function createFeatureFlag(
  data: CreateFeatureFlagData,
  actorInfo?: {
    actorId: string;
    actorType: AuditActorType;
    actorName?: string;
    actorEmail?: string;
  }
): Promise<FeatureFlag> {
  const [result] = await database.insert(featureFlag).values(data).returning();

  // Audit log the creation
  if (actorInfo) {
    await logResourceChange(
      "feature_flag.created",
      "feature_flag",
      result.id,
      actorInfo,
      { newState: result }
    );
  }

  return result;
}

/**
 * Update a feature flag
 */
export async function updateFeatureFlag(
  id: string,
  data: UpdateFeatureFlagData,
  actorInfo?: {
    actorId: string;
    actorType: AuditActorType;
    actorName?: string;
    actorEmail?: string;
  }
): Promise<FeatureFlag | null> {
  // Get current state for audit logging
  const before = await findFeatureFlagById(id);
  if (!before) return null;

  const [result] = await database
    .update(featureFlag)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(featureFlag.id, id))
    .returning();

  // Audit log the update
  if (result && actorInfo) {
    await logResourceChange(
      "feature_flag.updated",
      "feature_flag",
      id,
      actorInfo,
      { previousState: before, newState: result }
    );
  }

  return result || null;
}

/**
 * Delete a feature flag
 */
export async function deleteFeatureFlag(
  id: string,
  actorInfo?: {
    actorId: string;
    actorType: AuditActorType;
    actorName?: string;
    actorEmail?: string;
  }
): Promise<boolean> {
  // Get current state for audit logging
  const before = await findFeatureFlagById(id);
  if (!before) return false;

  const result = await database
    .delete(featureFlag)
    .where(eq(featureFlag.id, id));

  // Audit log the deletion
  if (actorInfo) {
    await logResourceChange(
      "feature_flag.deleted",
      "feature_flag",
      id,
      actorInfo,
      { previousState: before }
    );
  }

  return true;
}

// =============================================================================
// User Targeting Operations
// =============================================================================

/**
 * Get all user targets for a feature flag
 */
export async function getFeatureFlagUserTargets(
  featureFlagId: string
): Promise<FeatureFlagUserTarget[]> {
  return database
    .select()
    .from(featureFlagUserTarget)
    .where(eq(featureFlagUserTarget.featureFlagId, featureFlagId))
    .orderBy(desc(featureFlagUserTarget.createdAt));
}

/**
 * Get user target for a specific user and flag
 */
export async function getFeatureFlagUserTarget(
  featureFlagId: string,
  userId: string
): Promise<FeatureFlagUserTarget | null> {
  const [result] = await database
    .select()
    .from(featureFlagUserTarget)
    .where(
      and(
        eq(featureFlagUserTarget.featureFlagId, featureFlagId),
        eq(featureFlagUserTarget.userId, userId)
      )
    )
    .limit(1);

  return result || null;
}

/**
 * Add a user target to a feature flag
 */
export async function addFeatureFlagUserTarget(
  data: CreateFeatureFlagUserTargetData,
  actorInfo?: {
    actorId: string;
    actorType: AuditActorType;
    actorName?: string;
    actorEmail?: string;
  }
): Promise<FeatureFlagUserTarget> {
  const [result] = await database
    .insert(featureFlagUserTarget)
    .values(data)
    .returning();

  // Audit log
  if (actorInfo) {
    await logResourceChange(
      "feature_flag.user_target_added",
      "feature_flag_user_target",
      result.id,
      actorInfo,
      { newState: result }
    );
  }

  return result;
}

/**
 * Remove a user target from a feature flag
 */
export async function removeFeatureFlagUserTarget(
  featureFlagId: string,
  userId: string,
  actorInfo?: {
    actorId: string;
    actorType: AuditActorType;
    actorName?: string;
    actorEmail?: string;
  }
): Promise<boolean> {
  const before = await getFeatureFlagUserTarget(featureFlagId, userId);
  if (!before) return false;

  await database
    .delete(featureFlagUserTarget)
    .where(
      and(
        eq(featureFlagUserTarget.featureFlagId, featureFlagId),
        eq(featureFlagUserTarget.userId, userId)
      )
    );

  // Audit log
  if (actorInfo) {
    await logResourceChange(
      "feature_flag.user_target_removed",
      "feature_flag_user_target",
      before.id,
      actorInfo,
      { previousState: before }
    );
  }

  return true;
}

// =============================================================================
// Role Targeting Operations
// =============================================================================

/**
 * Get all role targets for a feature flag
 */
export async function getFeatureFlagRoleTargets(
  featureFlagId: string
): Promise<FeatureFlagRoleTarget[]> {
  return database
    .select()
    .from(featureFlagRoleTarget)
    .where(eq(featureFlagRoleTarget.featureFlagId, featureFlagId))
    .orderBy(desc(featureFlagRoleTarget.createdAt));
}

/**
 * Get role target for a specific role and flag
 */
export async function getFeatureFlagRoleTarget(
  featureFlagId: string,
  role: string
): Promise<FeatureFlagRoleTarget | null> {
  const [result] = await database
    .select()
    .from(featureFlagRoleTarget)
    .where(
      and(
        eq(featureFlagRoleTarget.featureFlagId, featureFlagId),
        eq(featureFlagRoleTarget.role, role)
      )
    )
    .limit(1);

  return result || null;
}

/**
 * Add a role target to a feature flag
 */
export async function addFeatureFlagRoleTarget(
  data: CreateFeatureFlagRoleTargetData,
  actorInfo?: {
    actorId: string;
    actorType: AuditActorType;
    actorName?: string;
    actorEmail?: string;
  }
): Promise<FeatureFlagRoleTarget> {
  const [result] = await database
    .insert(featureFlagRoleTarget)
    .values(data)
    .returning();

  // Audit log
  if (actorInfo) {
    await logResourceChange(
      "feature_flag.role_target_added",
      "feature_flag_role_target",
      result.id,
      actorInfo,
      { newState: result }
    );
  }

  return result;
}

/**
 * Remove a role target from a feature flag
 */
export async function removeFeatureFlagRoleTarget(
  featureFlagId: string,
  role: string,
  actorInfo?: {
    actorId: string;
    actorType: AuditActorType;
    actorName?: string;
    actorEmail?: string;
  }
): Promise<boolean> {
  const before = await getFeatureFlagRoleTarget(featureFlagId, role);
  if (!before) return false;

  await database
    .delete(featureFlagRoleTarget)
    .where(
      and(
        eq(featureFlagRoleTarget.featureFlagId, featureFlagId),
        eq(featureFlagRoleTarget.role, role)
      )
    );

  // Audit log
  if (actorInfo) {
    await logResourceChange(
      "feature_flag.role_target_removed",
      "feature_flag_role_target",
      before.id,
      actorInfo,
      { previousState: before }
    );
  }

  return true;
}

// =============================================================================
// Feature Flag Evaluation
// =============================================================================

/**
 * Simple hash function for consistent percentage rollout
 * Returns a value between 0 and 99
 */
function hashUserForRollout(userId: string, flagName: string): number {
  const combined = `${userId}:${flagName}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash) % 100;
}

/**
 * Check if a feature flag is enabled for a specific user
 * This is the main function for evaluating feature flags
 *
 * Evaluation order:
 * 1. If flag doesn't exist or is globally disabled, return false
 * 2. Check explicit user targeting (highest priority)
 * 3. Check role targeting
 * 4. Apply rollout strategy (percentage, all, none, targeted)
 */
export async function isFeatureFlagEnabled(
  flagName: string,
  userId?: string,
  userRole?: UserRole | null
): Promise<boolean> {
  // Get the flag
  const flag = await findFeatureFlagByName(flagName);
  if (!flag) return false;

  // If globally disabled and strategy is not "targeted", return false
  if (!flag.enabled && flag.rolloutStrategy !== "targeted") {
    return false;
  }

  // If user is provided, check explicit user targeting first
  if (userId) {
    const userTarget = await getFeatureFlagUserTarget(flag.id, userId);
    if (userTarget) {
      // Explicit user targeting overrides everything
      return userTarget.enabled;
    }
  }

  // Check role targeting
  if (userRole) {
    const roleTarget = await getFeatureFlagRoleTarget(flag.id, userRole);
    if (roleTarget) {
      return roleTarget.enabled;
    }
  }

  // Apply rollout strategy
  switch (flag.rolloutStrategy) {
    case "all":
      // Enable for all users when enabled=true
      return flag.enabled;

    case "none":
      // Disable for all users
      return false;

    case "targeted":
      // Only enable for explicitly targeted users/roles
      // If we got here, user is not targeted
      return false;

    case "percentage":
      // Use percentage rollout
      if (!userId) {
        // Can't do percentage rollout without a user ID
        return flag.enabled;
      }
      const userHash = hashUserForRollout(userId, flagName);
      return userHash < flag.rolloutPercentage;

    default:
      return flag.enabled;
  }
}

/**
 * Get a feature flag with all its targeting rules
 */
export async function getFeatureFlagWithTargets(flagId: string): Promise<{
  flag: FeatureFlag;
  userTargets: FeatureFlagUserTarget[];
  roleTargets: FeatureFlagRoleTarget[];
} | null> {
  const flag = await findFeatureFlagById(flagId);
  if (!flag) return null;

  const [userTargets, roleTargets] = await Promise.all([
    getFeatureFlagUserTargets(flagId),
    getFeatureFlagRoleTargets(flagId),
  ]);

  return { flag, userTargets, roleTargets };
}

/**
 * Get a feature flag by name with all its targeting rules
 */
export async function getFeatureFlagByNameWithTargets(flagName: string): Promise<{
  flag: FeatureFlag;
  userTargets: FeatureFlagUserTarget[];
  roleTargets: FeatureFlagRoleTarget[];
} | null> {
  const flag = await findFeatureFlagByName(flagName);
  if (!flag) return null;

  const [userTargets, roleTargets] = await Promise.all([
    getFeatureFlagUserTargets(flag.id),
    getFeatureFlagRoleTargets(flag.id),
  ]);

  return { flag, userTargets, roleTargets };
}

/**
 * Batch check multiple feature flags for a user
 */
export async function checkMultipleFeatureFlags(
  flagNames: string[],
  userId?: string,
  userRole?: UserRole | null
): Promise<Record<string, boolean>> {
  const results: Record<string, boolean> = {};

  await Promise.all(
    flagNames.map(async (flagName) => {
      results[flagName] = await isFeatureFlagEnabled(flagName, userId, userRole);
    })
  );

  return results;
}
