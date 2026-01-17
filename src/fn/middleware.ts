import { auth } from "~/utils/auth";
import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { isUserAdmin, isUserMD, hasAnyRole } from "~/data-access/users";

// Re-export tenant middleware and utilities
export {
  tenantMiddleware,
  tenantSubdomainMiddleware,
  strictTenantMiddleware,
  tenantAdminMiddleware,
  tenantOwnerMiddleware,
  createTenantMiddleware,
  withTenantScope,
  createTenantFilter,
  assertSameTenant,
  assertAllSameTenant,
  hasTenantContext,
  getTenantContext,
  getTenantIdFromContext,
  type TenantContext,
  type TenantMiddlewareOptions,
  type TenantScopedQuery,
} from "./tenant-middleware";

async function getAuthenticatedUserId(): Promise<string> {
  const request = getRequest();

  if (!request?.headers) {
    throw new Error("No headers");
  }
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    throw new Error("No session");
  }

  return session.user.id;
}

export const authenticatedMiddleware = createMiddleware({
  type: "function",
}).server(async ({ next }) => {
  const userId = await getAuthenticatedUserId();

  return next({
    context: { userId },
  });
});

export const assertAdminMiddleware = createMiddleware({
  type: "function",
}).server(async ({ next }) => {
  const userId = await getAuthenticatedUserId();

  const adminCheck = await isUserAdmin(userId);
  if (!adminCheck) {
    throw new Error("Unauthorized: Only admins can perform this action");
  }

  return next({
    context: { userId },
  });
});

export const assertMDMiddleware = createMiddleware({
  type: "function",
}).server(async ({ next }) => {
  const userId = await getAuthenticatedUserId();

  const isMD = await isUserMD(userId);
  if (!isMD) {
    throw new Error("Unauthorized: Only Managing Directors can access this resource");
  }

  return next({
    context: { userId },
  });
});

export const assertSalesMiddleware = createMiddleware({
  type: "function",
}).server(async ({ next }) => {
  const userId = await getAuthenticatedUserId();

  // Sales users, admins, and MDs can access sales resources
  const hasAccess = await hasAnyRole(userId, ["sales", "admin", "md"]) || await isUserAdmin(userId);
  if (!hasAccess) {
    throw new Error("Unauthorized: Only Sales personnel can access this resource");
  }

  return next({
    context: { userId },
  });
});
