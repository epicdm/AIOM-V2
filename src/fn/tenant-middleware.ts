/**
 * Tenant Middleware
 *
 * Middleware ensuring all queries are scoped to current tenant with automatic
 * tenant_id injection and cross-tenant access prevention.
 *
 * Features:
 * - Automatic tenant extraction from request (header, subdomain, or user default)
 * - Tenant validation and access control
 * - Cross-tenant access prevention
 * - Tenant context injection for downstream handlers
 */

import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { auth } from "~/utils/auth";
import {
  findTenantById,
  findTenantBySlug,
  findTenantByDomain,
  isUserTenantMember,
  getUserDefaultTenant,
  getUserTenantRole,
  isUserTenantAdmin,
  isUserTenantOwner,
  type Tenant,
  type TenantMemberRole,
} from "~/data-access/tenants";

// =============================================================================
// Types
// =============================================================================

export interface TenantContext {
  tenantId: string;
  tenant: Tenant;
  userId: string;
  tenantRole: TenantMemberRole | null;
}

export interface TenantMiddlewareOptions {
  /**
   * Custom header name for tenant ID (default: "x-tenant-id")
   */
  headerName?: string;

  /**
   * Custom header name for tenant slug (default: "x-tenant-slug")
   */
  slugHeaderName?: string;

  /**
   * Whether to allow falling back to user's default tenant (default: true)
   */
  allowDefaultTenant?: boolean;

  /**
   * Whether to extract tenant from subdomain (default: false)
   */
  extractFromSubdomain?: boolean;

  /**
   * Required roles for access (if specified, user must have one of these roles)
   */
  requiredRoles?: TenantMemberRole[];
}

// =============================================================================
// Tenant Extraction Utilities
// =============================================================================

/**
 * Extracts tenant ID from request headers
 */
function extractTenantFromHeaders(
  request: Request,
  headerName: string = "x-tenant-id",
  slugHeaderName: string = "x-tenant-slug"
): { tenantId?: string; tenantSlug?: string } {
  const tenantId = request.headers.get(headerName) || undefined;
  const tenantSlug = request.headers.get(slugHeaderName) || undefined;

  return { tenantId, tenantSlug };
}

/**
 * Extracts tenant slug from subdomain
 * E.g., "acme.example.com" -> "acme"
 */
function extractTenantFromSubdomain(request: Request): string | undefined {
  try {
    const url = new URL(request.url);
    const hostname = url.hostname;

    // Split hostname and check for subdomain
    const parts = hostname.split(".");

    // Need at least 3 parts for a subdomain (subdomain.domain.tld)
    if (parts.length >= 3) {
      // Exclude common non-tenant subdomains
      const subdomain = parts[0];
      const excludedSubdomains = ["www", "api", "app", "admin", "localhost"];

      if (!excludedSubdomains.includes(subdomain.toLowerCase())) {
        return subdomain;
      }
    }

    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Gets authenticated user ID from request
 */
async function getAuthenticatedUserId(request: Request): Promise<string> {
  if (!request?.headers) {
    throw new Error("No headers");
  }

  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    throw new Error("No session - authentication required");
  }

  return session.user.id;
}

/**
 * Resolves tenant from various sources
 */
async function resolveTenant(
  request: Request,
  userId: string,
  options: TenantMiddlewareOptions = {}
): Promise<Tenant | null> {
  const {
    headerName = "x-tenant-id",
    slugHeaderName = "x-tenant-slug",
    allowDefaultTenant = true,
    extractFromSubdomain = false,
  } = options;

  // 1. Try to get tenant from headers (explicit tenant selection)
  const { tenantId, tenantSlug } = extractTenantFromHeaders(
    request,
    headerName,
    slugHeaderName
  );

  if (tenantId) {
    const tenant = await findTenantById(tenantId);
    if (tenant) return tenant;
  }

  if (tenantSlug) {
    const tenant = await findTenantBySlug(tenantSlug);
    if (tenant) return tenant;
  }

  // 2. Try to extract from subdomain
  if (extractFromSubdomain) {
    const subdomain = extractTenantFromSubdomain(request);
    if (subdomain) {
      // Try as slug first
      const tenantBySlug = await findTenantBySlug(subdomain);
      if (tenantBySlug) return tenantBySlug;

      // Try as domain match
      try {
        const url = new URL(request.url);
        const tenantByDomain = await findTenantByDomain(url.hostname);
        if (tenantByDomain) return tenantByDomain;
      } catch {
        // Ignore URL parsing errors
      }
    }
  }

  // 3. Fall back to user's default tenant
  if (allowDefaultTenant) {
    const defaultTenantMember = await getUserDefaultTenant(userId);
    if (defaultTenantMember) {
      return defaultTenantMember.tenant;
    }
  }

  return null;
}

// =============================================================================
// Core Tenant Middleware
// =============================================================================

/**
 * Creates a tenant middleware with the specified options
 */
export function createTenantMiddleware(options: TenantMiddlewareOptions = {}) {
  return createMiddleware({
    type: "function",
  }).server(async ({ next }) => {
    const request = getRequest();

    // Get authenticated user
    const userId = await getAuthenticatedUserId(request);

    // Resolve tenant
    const tenant = await resolveTenant(request, userId, options);

    if (!tenant) {
      throw new Error("Tenant not found - please specify a valid tenant");
    }

    // Validate tenant is active
    if (!tenant.isActive) {
      throw new Error("Tenant is not active");
    }

    // Validate user is a member of the tenant
    const isMember = await isUserTenantMember(tenant.id, userId);
    if (!isMember) {
      throw new Error("Access denied: You are not a member of this tenant");
    }

    // Get user's role in the tenant
    const tenantRole = await getUserTenantRole(tenant.id, userId);

    // Check required roles if specified
    if (options.requiredRoles && options.requiredRoles.length > 0) {
      if (!tenantRole || !options.requiredRoles.includes(tenantRole)) {
        throw new Error(
          `Access denied: Required role(s): ${options.requiredRoles.join(", ")}`
        );
      }
    }

    // Pass tenant context to downstream handlers
    return next({
      context: {
        userId,
        tenantId: tenant.id,
        tenant,
        tenantRole,
      } as TenantContext,
    });
  });
}

// =============================================================================
// Pre-configured Middleware Instances
// =============================================================================

/**
 * Basic tenant middleware - requires authentication and tenant membership
 * Extracts tenant from headers or user's default tenant
 */
export const tenantMiddleware = createTenantMiddleware();

/**
 * Tenant middleware with subdomain extraction
 */
export const tenantSubdomainMiddleware = createTenantMiddleware({
  extractFromSubdomain: true,
});

/**
 * Strict tenant middleware - requires explicit tenant selection (no default fallback)
 */
export const strictTenantMiddleware = createTenantMiddleware({
  allowDefaultTenant: false,
});

/**
 * Tenant admin middleware - requires admin or owner role
 */
export const tenantAdminMiddleware = createTenantMiddleware({
  requiredRoles: ["owner", "admin"],
});

/**
 * Tenant owner middleware - requires owner role
 */
export const tenantOwnerMiddleware = createTenantMiddleware({
  requiredRoles: ["owner"],
});

// =============================================================================
// Query Scoping Utilities
// =============================================================================

/**
 * Helper type for functions that need tenant scoping
 */
export type TenantScopedQuery<T extends Record<string, unknown>> = T & {
  tenantId: string;
};

/**
 * Injects tenantId into query data
 * Use this to automatically scope queries to the current tenant
 */
export function withTenantScope<T extends Record<string, unknown>>(
  data: T,
  tenantId: string
): TenantScopedQuery<T> {
  return {
    ...data,
    tenantId,
  };
}

/**
 * Creates a tenant-scoped query builder
 * Ensures all queries include the tenant filter
 */
export function createTenantFilter(tenantId: string) {
  return {
    /**
     * Returns the tenant ID for use in queries
     */
    getTenantId: () => tenantId,

    /**
     * Adds tenant scope to data object
     */
    scope: <T extends Record<string, unknown>>(data: T): TenantScopedQuery<T> => {
      return withTenantScope(data, tenantId);
    },

    /**
     * Validates that a record belongs to the current tenant
     * Throws an error if the record belongs to a different tenant
     */
    validateOwnership: (recordTenantId: string | null | undefined): void => {
      if (recordTenantId && recordTenantId !== tenantId) {
        throw new Error("Access denied: Resource belongs to a different tenant");
      }
    },

    /**
     * Checks if a record belongs to the current tenant
     */
    belongsToTenant: (recordTenantId: string | null | undefined): boolean => {
      return recordTenantId === tenantId;
    },
  };
}

// =============================================================================
// Cross-Tenant Access Prevention
// =============================================================================

/**
 * Validates that an operation doesn't cross tenant boundaries
 * Use this before performing operations on resources
 */
export function assertSameTenant(
  currentTenantId: string,
  resourceTenantId: string | null | undefined,
  resourceType: string = "resource"
): void {
  if (resourceTenantId && resourceTenantId !== currentTenantId) {
    throw new Error(
      `Cross-tenant access denied: Cannot access ${resourceType} from another tenant`
    );
  }
}

/**
 * Validates multiple resources belong to the same tenant
 */
export function assertAllSameTenant(
  currentTenantId: string,
  resourceTenantIds: (string | null | undefined)[],
  resourceType: string = "resources"
): void {
  for (const resourceTenantId of resourceTenantIds) {
    assertSameTenant(currentTenantId, resourceTenantId, resourceType);
  }
}

// =============================================================================
// Type Guards and Utilities
// =============================================================================

/**
 * Type guard to check if context has tenant information
 */
export function hasTenantContext(
  context: unknown
): context is TenantContext {
  return (
    typeof context === "object" &&
    context !== null &&
    "tenantId" in context &&
    "tenant" in context &&
    "userId" in context
  );
}

/**
 * Extracts tenant context from handler context
 * Throws if tenant context is not available
 */
export function getTenantContext(context: unknown): TenantContext {
  if (!hasTenantContext(context)) {
    throw new Error("Tenant context not available - ensure tenant middleware is applied");
  }
  return context;
}

/**
 * Safely extracts tenant ID from context
 * Returns undefined if not available
 */
export function getTenantIdFromContext(context: unknown): string | undefined {
  if (hasTenantContext(context)) {
    return context.tenantId;
  }
  return undefined;
}
