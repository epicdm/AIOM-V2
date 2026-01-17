import { queryOptions } from "@tanstack/react-query";
import {
  getAuditLogByIdFn,
  getMyAuditLogsFn,
  getResourceAuditLogsFn,
  getAuditLogsFn,
  getAuditLogsCountFn,
  getAuditLogsByCategoryFn,
  getSecurityAuditLogsFn,
  getFailedActionsFn,
  getAuditLogStatsFn,
  getUserAuditLogsFn,
  exportAuditLogsFn,
} from "~/fn/audit-logs";
import type {
  AuditLogCategory,
  AuditSeverity,
  AuditActorType,
} from "~/db/schema";

// =============================================================================
// Query Interfaces
// =============================================================================

export interface AuditLogsQueryParams {
  action?: string;
  category?: AuditLogCategory;
  severity?: AuditSeverity;
  resourceType?: string;
  resourceId?: string;
  actorId?: string;
  actorType?: AuditActorType;
  ipAddress?: string;
  sessionId?: string;
  success?: boolean;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface MyAuditLogsQueryParams {
  category?: AuditLogCategory;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface ResourceAuditLogsQueryParams {
  resourceType: string;
  resourceId: string;
  limit?: number;
  offset?: number;
  startDate?: string;
  endDate?: string;
}

export interface CategoryAuditLogsQueryParams {
  category: AuditLogCategory;
  limit?: number;
  offset?: number;
  startDate?: string;
  endDate?: string;
}

export interface SecurityAuditLogsQueryParams {
  limit?: number;
  offset?: number;
  startDate?: string;
  endDate?: string;
  ipAddress?: string;
}

export interface FailedActionsQueryParams {
  category?: AuditLogCategory;
  limit?: number;
  offset?: number;
  startDate?: string;
  endDate?: string;
}

export interface AuditLogStatsQueryParams {
  startDate?: string;
  endDate?: string;
  actorId?: string;
  resourceType?: string;
}

export interface UserAuditLogsQueryParams {
  userId: string;
  category?: AuditLogCategory;
  limit?: number;
  offset?: number;
  startDate?: string;
  endDate?: string;
}

export interface ExportAuditLogsQueryParams {
  startDate: string;
  endDate: string;
  category?: AuditLogCategory;
  resourceType?: string;
  actorId?: string;
  format?: "json" | "csv";
}

// =============================================================================
// Query Options
// =============================================================================

/**
 * Get a single audit log by ID
 */
export const auditLogQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["audit-log", id],
    queryFn: () => getAuditLogByIdFn({ data: { id } }),
    enabled: !!id,
  });

/**
 * Get current user's audit logs
 */
export const myAuditLogsQueryOptions = (params?: MyAuditLogsQueryParams) =>
  queryOptions({
    queryKey: ["audit-logs", "my", params],
    queryFn: () => getMyAuditLogsFn({ data: params }),
  });

/**
 * Get audit logs for a specific resource
 */
export const resourceAuditLogsQueryOptions = (params: ResourceAuditLogsQueryParams) =>
  queryOptions({
    queryKey: ["audit-logs", "resource", params.resourceType, params.resourceId, params],
    queryFn: () => getResourceAuditLogsFn({ data: params }),
    enabled: !!params.resourceType && !!params.resourceId,
  });

/**
 * Get all audit logs with filters (admin only)
 */
export const auditLogsQueryOptions = (params?: AuditLogsQueryParams) =>
  queryOptions({
    queryKey: ["audit-logs", "all", params],
    queryFn: () => getAuditLogsFn({ data: params }),
  });

/**
 * Get audit log count with filters (admin only)
 */
export const auditLogsCountQueryOptions = (params?: AuditLogsQueryParams) =>
  queryOptions({
    queryKey: ["audit-logs", "count", params],
    queryFn: () => getAuditLogsCountFn({ data: params }),
  });

/**
 * Get audit logs by category (admin only)
 */
export const auditLogsByCategoryQueryOptions = (params: CategoryAuditLogsQueryParams) =>
  queryOptions({
    queryKey: ["audit-logs", "category", params.category, params],
    queryFn: () => getAuditLogsByCategoryFn({ data: params }),
    enabled: !!params.category,
  });

/**
 * Get security audit logs (admin only)
 */
export const securityAuditLogsQueryOptions = (params?: SecurityAuditLogsQueryParams) =>
  queryOptions({
    queryKey: ["audit-logs", "security", params],
    queryFn: () => getSecurityAuditLogsFn({ data: params }),
  });

/**
 * Get failed actions (admin only)
 */
export const failedActionsQueryOptions = (params?: FailedActionsQueryParams) =>
  queryOptions({
    queryKey: ["audit-logs", "failed", params],
    queryFn: () => getFailedActionsFn({ data: params }),
  });

/**
 * Get audit log statistics (admin only)
 */
export const auditLogStatsQueryOptions = (params?: AuditLogStatsQueryParams) =>
  queryOptions({
    queryKey: ["audit-logs", "stats", params],
    queryFn: () => getAuditLogStatsFn({ data: params }),
  });

/**
 * Get audit logs for a specific user (admin only)
 */
export const userAuditLogsQueryOptions = (params: UserAuditLogsQueryParams) =>
  queryOptions({
    queryKey: ["audit-logs", "user", params.userId, params],
    queryFn: () => getUserAuditLogsFn({ data: params }),
    enabled: !!params.userId,
  });

/**
 * Export audit logs (admin only)
 */
export const exportAuditLogsQueryOptions = (params: ExportAuditLogsQueryParams) =>
  queryOptions({
    queryKey: ["audit-logs", "export", params],
    queryFn: () => exportAuditLogsFn({ data: params }),
    enabled: !!params.startDate && !!params.endDate,
    // Don't cache exports
    staleTime: 0,
    gcTime: 0,
  });
