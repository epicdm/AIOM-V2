import { eq, and } from "drizzle-orm";
import { database } from "~/db";
import {
  tenant,
  tenantMember,
  type Tenant,
  type TenantMember,
  type CreateTenantData,
  type CreateTenantMemberData,
  type TenantMemberRole,
  TENANT_MEMBER_ROLES,
} from "~/db/schema";

// Re-export types for convenience
export type { Tenant, TenantMember, TenantMemberRole };

// =============================================================================
// Tenant Queries
// =============================================================================

/**
 * Find a tenant by ID
 */
export async function findTenantById(id: string): Promise<Tenant | null> {
  const [result] = await database
    .select()
    .from(tenant)
    .where(eq(tenant.id, id))
    .limit(1);

  return result || null;
}

/**
 * Find a tenant by slug
 */
export async function findTenantBySlug(slug: string): Promise<Tenant | null> {
  const [result] = await database
    .select()
    .from(tenant)
    .where(eq(tenant.slug, slug))
    .limit(1);

  return result || null;
}

/**
 * Find a tenant by domain
 */
export async function findTenantByDomain(domain: string): Promise<Tenant | null> {
  const [result] = await database
    .select()
    .from(tenant)
    .where(eq(tenant.domain, domain))
    .limit(1);

  return result || null;
}

/**
 * Check if a tenant is active
 */
export async function isTenantActive(tenantId: string): Promise<boolean> {
  const tenantData = await findTenantById(tenantId);
  return tenantData?.isActive ?? false;
}

/**
 * Create a new tenant
 */
export async function createTenant(data: CreateTenantData): Promise<Tenant> {
  const [newTenant] = await database
    .insert(tenant)
    .values({
      ...data,
      updatedAt: new Date(),
    })
    .returning();

  return newTenant;
}

// =============================================================================
// Tenant Member Queries
// =============================================================================

/**
 * Find a tenant member by tenant ID and user ID
 */
export async function findTenantMember(
  tenantId: string,
  userId: string
): Promise<TenantMember | null> {
  const [result] = await database
    .select()
    .from(tenantMember)
    .where(
      and(
        eq(tenantMember.tenantId, tenantId),
        eq(tenantMember.userId, userId)
      )
    )
    .limit(1);

  return result || null;
}

/**
 * Check if a user is a member of a tenant
 */
export async function isUserTenantMember(
  tenantId: string,
  userId: string
): Promise<boolean> {
  const member = await findTenantMember(tenantId, userId);
  return member !== null;
}

/**
 * Get user's role in a tenant
 */
export async function getUserTenantRole(
  tenantId: string,
  userId: string
): Promise<TenantMemberRole | null> {
  const member = await findTenantMember(tenantId, userId);
  if (!member) return null;

  // Validate role
  if (TENANT_MEMBER_ROLES.includes(member.role as TenantMemberRole)) {
    return member.role as TenantMemberRole;
  }

  return null;
}

/**
 * Check if user has a specific role in the tenant
 */
export async function hasUserTenantRole(
  tenantId: string,
  userId: string,
  role: TenantMemberRole
): Promise<boolean> {
  const userRole = await getUserTenantRole(tenantId, userId);
  return userRole === role;
}

/**
 * Check if user has any of the specified roles in the tenant
 */
export async function hasUserAnyTenantRole(
  tenantId: string,
  userId: string,
  roles: TenantMemberRole[]
): Promise<boolean> {
  const userRole = await getUserTenantRole(tenantId, userId);
  if (!userRole) return false;
  return roles.includes(userRole);
}

/**
 * Check if user is a tenant owner
 */
export async function isUserTenantOwner(
  tenantId: string,
  userId: string
): Promise<boolean> {
  return hasUserTenantRole(tenantId, userId, "owner");
}

/**
 * Check if user is a tenant admin (owner or admin)
 */
export async function isUserTenantAdmin(
  tenantId: string,
  userId: string
): Promise<boolean> {
  return hasUserAnyTenantRole(tenantId, userId, ["owner", "admin"]);
}

/**
 * Get user's default tenant
 */
export async function getUserDefaultTenant(
  userId: string
): Promise<(TenantMember & { tenant: Tenant }) | null> {
  const [result] = await database
    .select({
      id: tenantMember.id,
      tenantId: tenantMember.tenantId,
      userId: tenantMember.userId,
      role: tenantMember.role,
      isDefault: tenantMember.isDefault,
      joinedAt: tenantMember.joinedAt,
      invitedBy: tenantMember.invitedBy,
      createdAt: tenantMember.createdAt,
      updatedAt: tenantMember.updatedAt,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        domain: tenant.domain,
        logoUrl: tenant.logoUrl,
        settings: tenant.settings,
        isActive: tenant.isActive,
        createdAt: tenant.createdAt,
        updatedAt: tenant.updatedAt,
      },
    })
    .from(tenantMember)
    .innerJoin(tenant, eq(tenantMember.tenantId, tenant.id))
    .where(
      and(
        eq(tenantMember.userId, userId),
        eq(tenantMember.isDefault, true)
      )
    )
    .limit(1);

  return result || null;
}

/**
 * Get all tenants a user belongs to
 */
export async function getUserTenants(
  userId: string
): Promise<(TenantMember & { tenant: Tenant })[]> {
  const results = await database
    .select({
      id: tenantMember.id,
      tenantId: tenantMember.tenantId,
      userId: tenantMember.userId,
      role: tenantMember.role,
      isDefault: tenantMember.isDefault,
      joinedAt: tenantMember.joinedAt,
      invitedBy: tenantMember.invitedBy,
      createdAt: tenantMember.createdAt,
      updatedAt: tenantMember.updatedAt,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        domain: tenant.domain,
        logoUrl: tenant.logoUrl,
        settings: tenant.settings,
        isActive: tenant.isActive,
        createdAt: tenant.createdAt,
        updatedAt: tenant.updatedAt,
      },
    })
    .from(tenantMember)
    .innerJoin(tenant, eq(tenantMember.tenantId, tenant.id))
    .where(eq(tenantMember.userId, userId));

  return results;
}

/**
 * Get all members of a tenant
 */
export async function getTenantMembers(tenantId: string): Promise<TenantMember[]> {
  return await database
    .select()
    .from(tenantMember)
    .where(eq(tenantMember.tenantId, tenantId));
}

/**
 * Add a user to a tenant
 */
export async function addUserToTenant(
  data: CreateTenantMemberData
): Promise<TenantMember> {
  const [newMember] = await database
    .insert(tenantMember)
    .values({
      ...data,
      updatedAt: new Date(),
    })
    .returning();

  return newMember;
}

/**
 * Remove a user from a tenant
 */
export async function removeUserFromTenant(
  tenantId: string,
  userId: string
): Promise<boolean> {
  const result = await database
    .delete(tenantMember)
    .where(
      and(
        eq(tenantMember.tenantId, tenantId),
        eq(tenantMember.userId, userId)
      )
    )
    .returning();

  return result.length > 0;
}

/**
 * Update user's role in a tenant
 */
export async function updateUserTenantRole(
  tenantId: string,
  userId: string,
  role: TenantMemberRole
): Promise<TenantMember | null> {
  const [updated] = await database
    .update(tenantMember)
    .set({
      role,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(tenantMember.tenantId, tenantId),
        eq(tenantMember.userId, userId)
      )
    )
    .returning();

  return updated || null;
}

/**
 * Set user's default tenant
 */
export async function setUserDefaultTenant(
  userId: string,
  tenantId: string
): Promise<boolean> {
  // First, unset all other default tenants for this user
  await database
    .update(tenantMember)
    .set({
      isDefault: false,
      updatedAt: new Date(),
    })
    .where(eq(tenantMember.userId, userId));

  // Then set the specified tenant as default
  const [updated] = await database
    .update(tenantMember)
    .set({
      isDefault: true,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(tenantMember.tenantId, tenantId),
        eq(tenantMember.userId, userId)
      )
    )
    .returning();

  return updated !== undefined;
}

// =============================================================================
// Cross-Tenant Access Prevention
// =============================================================================

/**
 * Validates that a user has access to a specific tenant
 * Throws an error if access is denied
 */
export async function validateTenantAccess(
  tenantId: string,
  userId: string
): Promise<void> {
  // Check if tenant exists and is active
  const tenantData = await findTenantById(tenantId);
  if (!tenantData) {
    throw new Error("Tenant not found");
  }

  if (!tenantData.isActive) {
    throw new Error("Tenant is not active");
  }

  // Check if user is a member of the tenant
  const isMember = await isUserTenantMember(tenantId, userId);
  if (!isMember) {
    throw new Error("Access denied: User is not a member of this tenant");
  }
}

/**
 * Validates tenant access and returns the tenant data
 * Throws an error if access is denied
 */
export async function validateAndGetTenant(
  tenantId: string,
  userId: string
): Promise<Tenant> {
  // Check if tenant exists and is active
  const tenantData = await findTenantById(tenantId);
  if (!tenantData) {
    throw new Error("Tenant not found");
  }

  if (!tenantData.isActive) {
    throw new Error("Tenant is not active");
  }

  // Check if user is a member of the tenant
  const isMember = await isUserTenantMember(tenantId, userId);
  if (!isMember) {
    throw new Error("Access denied: User is not a member of this tenant");
  }

  return tenantData;
}
