import { useQuery } from "@tanstack/react-query";
import {
  auditLogQueryOptions,
  myAuditLogsQueryOptions,
  resourceAuditLogsQueryOptions,
  auditLogsQueryOptions,
  auditLogsCountQueryOptions,
  auditLogsByCategoryQueryOptions,
  securityAuditLogsQueryOptions,
  failedActionsQueryOptions,
  auditLogStatsQueryOptions,
  userAuditLogsQueryOptions,
  exportAuditLogsQueryOptions,
  type AuditLogsQueryParams,
  type MyAuditLogsQueryParams,
  type ResourceAuditLogsQueryParams,
  type CategoryAuditLogsQueryParams,
  type SecurityAuditLogsQueryParams,
  type FailedActionsQueryParams,
  type AuditLogStatsQueryParams,
  type UserAuditLogsQueryParams,
  type ExportAuditLogsQueryParams,
} from "~/queries/audit-logs";

// =============================================================================
// User Query Hooks
// =============================================================================

/**
 * Get a single audit log entry by ID
 */
export function useAuditLog(id: string, enabled = true) {
  return useQuery({
    ...auditLogQueryOptions(id),
    enabled: enabled && !!id,
  });
}

/**
 * Get current user's audit logs
 */
export function useMyAuditLogs(params?: MyAuditLogsQueryParams, enabled = true) {
  return useQuery({
    ...myAuditLogsQueryOptions(params),
    enabled,
  });
}

/**
 * Get audit logs for a specific resource
 */
export function useResourceAuditLogs(
  params: ResourceAuditLogsQueryParams,
  enabled = true
) {
  return useQuery({
    ...resourceAuditLogsQueryOptions(params),
    enabled: enabled && !!params.resourceType && !!params.resourceId,
  });
}

// =============================================================================
// Admin Query Hooks
// =============================================================================

/**
 * Get all audit logs with filters (admin only)
 */
export function useAuditLogs(params?: AuditLogsQueryParams, enabled = true) {
  return useQuery({
    ...auditLogsQueryOptions(params),
    enabled,
  });
}

/**
 * Get audit log count with filters (admin only)
 */
export function useAuditLogsCount(params?: AuditLogsQueryParams, enabled = true) {
  return useQuery({
    ...auditLogsCountQueryOptions(params),
    enabled,
  });
}

/**
 * Get audit logs by category (admin only)
 */
export function useAuditLogsByCategory(
  params: CategoryAuditLogsQueryParams,
  enabled = true
) {
  return useQuery({
    ...auditLogsByCategoryQueryOptions(params),
    enabled: enabled && !!params.category,
  });
}

/**
 * Get security audit logs (admin only)
 */
export function useSecurityAuditLogs(
  params?: SecurityAuditLogsQueryParams,
  enabled = true
) {
  return useQuery({
    ...securityAuditLogsQueryOptions(params),
    enabled,
  });
}

/**
 * Get failed actions (admin only)
 */
export function useFailedActions(params?: FailedActionsQueryParams, enabled = true) {
  return useQuery({
    ...failedActionsQueryOptions(params),
    enabled,
  });
}

/**
 * Get audit log statistics (admin only)
 */
export function useAuditLogStats(params?: AuditLogStatsQueryParams, enabled = true) {
  return useQuery({
    ...auditLogStatsQueryOptions(params),
    enabled,
  });
}

/**
 * Get audit logs for a specific user (admin only)
 */
export function useUserAuditLogs(params: UserAuditLogsQueryParams, enabled = true) {
  return useQuery({
    ...userAuditLogsQueryOptions(params),
    enabled: enabled && !!params.userId,
  });
}

/**
 * Export audit logs (admin only)
 * Note: This is a query hook but returns export data, not for UI display
 */
export function useExportAuditLogs(
  params: ExportAuditLogsQueryParams,
  enabled = true
) {
  return useQuery({
    ...exportAuditLogsQueryOptions(params),
    enabled: enabled && !!params.startDate && !!params.endDate,
  });
}

// =============================================================================
// Utility Hooks
// =============================================================================

/**
 * Get audit logs with pagination state management
 */
export function useAuditLogsPaginated(
  baseParams?: Omit<AuditLogsQueryParams, "limit" | "offset">,
  options?: {
    pageSize?: number;
    initialPage?: number;
    enabled?: boolean;
  }
) {
  const pageSize = options?.pageSize || 50;
  const [page, setPage] = useState(options?.initialPage || 0);

  const params: AuditLogsQueryParams = {
    ...baseParams,
    limit: pageSize,
    offset: page * pageSize,
  };

  const logsQuery = useAuditLogs(params, options?.enabled ?? true);
  const countQuery = useAuditLogsCount(baseParams, options?.enabled ?? true);

  const totalPages = countQuery.data
    ? Math.ceil(countQuery.data.count / pageSize)
    : 0;

  return {
    data: logsQuery.data,
    isLoading: logsQuery.isLoading || countQuery.isLoading,
    isError: logsQuery.isError || countQuery.isError,
    error: logsQuery.error || countQuery.error,
    refetch: () => {
      logsQuery.refetch();
      countQuery.refetch();
    },
    pagination: {
      page,
      setPage,
      pageSize,
      totalPages,
      totalCount: countQuery.data?.count || 0,
      hasNextPage: page < totalPages - 1,
      hasPreviousPage: page > 0,
      nextPage: () => setPage((p) => Math.min(p + 1, totalPages - 1)),
      previousPage: () => setPage((p) => Math.max(p - 1, 0)),
    },
  };
}

// Import useState for pagination hook
import { useState } from "react";

// =============================================================================
// Re-export types for convenience
// =============================================================================

export type {
  AuditLogsQueryParams,
  MyAuditLogsQueryParams,
  ResourceAuditLogsQueryParams,
  CategoryAuditLogsQueryParams,
  SecurityAuditLogsQueryParams,
  FailedActionsQueryParams,
  AuditLogStatsQueryParams,
  UserAuditLogsQueryParams,
  ExportAuditLogsQueryParams,
} from "~/queries/audit-logs";
