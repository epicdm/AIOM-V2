/**
 * TanStack Query Options for Workflow Automation Engine
 *
 * Provides query configurations for fetching workflow data
 * with caching and refetch strategies.
 */

import { queryOptions } from "@tanstack/react-query";
import {
  getWorkflowDefinitionFn,
  listWorkflowDefinitionsFn,
  listMyWorkflowDefinitionsFn,
  getWorkflowInstanceFn,
  listWorkflowInstancesFn,
  getStepExecutionsFn,
  getEventLogsFn,
  getPendingApprovalsFn,
  getWorkflowStatisticsFn,
  getWorkflowDefinitionStatsFn,
} from "~/fn/workflow-automation";
import type {
  WorkflowDefinitionStatus,
  WorkflowTriggerType,
  WorkflowInstanceStatus,
} from "~/db/schema";

// =============================================================================
// Workflow Definition Query Options
// =============================================================================

/**
 * Query options for fetching all workflow definitions with filters
 */
export const workflowDefinitionsQueryOptions = (filters?: {
  status?: WorkflowDefinitionStatus;
  triggerType?: WorkflowTriggerType;
  category?: string;
  limit?: number;
  offset?: number;
}) =>
  queryOptions({
    queryKey: ["workflow-definitions", "list", filters],
    queryFn: () => listWorkflowDefinitionsFn({ data: filters }),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

/**
 * Query options for fetching workflow definitions created by the current user
 */
export const myWorkflowDefinitionsQueryOptions = (filters?: {
  status?: WorkflowDefinitionStatus;
  triggerType?: WorkflowTriggerType;
  category?: string;
  limit?: number;
  offset?: number;
}) =>
  queryOptions({
    queryKey: ["workflow-definitions", "my-definitions", filters],
    queryFn: () => listMyWorkflowDefinitionsFn({ data: filters }),
    staleTime: 2 * 60 * 1000,
  });

/**
 * Query options for fetching a single workflow definition by ID
 */
export const workflowDefinitionQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["workflow-definitions", "detail", id],
    queryFn: () => getWorkflowDefinitionFn({ data: { id } }),
    staleTime: 1 * 60 * 1000, // 1 minute
    enabled: !!id,
  });

/**
 * Query options for fetching workflow definition statistics
 */
export const workflowDefinitionStatsQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["workflow-definitions", "stats", id],
    queryFn: () => getWorkflowDefinitionStatsFn({ data: { id } }),
    staleTime: 1 * 60 * 1000,
    enabled: !!id,
  });

// =============================================================================
// Workflow Instance Query Options
// =============================================================================

/**
 * Query options for fetching workflow instances with filters
 */
export const workflowInstancesQueryOptions = (filters?: {
  definitionId?: string;
  status?: WorkflowInstanceStatus;
  limit?: number;
  offset?: number;
}) =>
  queryOptions({
    queryKey: ["workflow-instances", "list", filters],
    queryFn: () => listWorkflowInstancesFn({ data: filters }),
    staleTime: 30 * 1000, // 30 seconds (instances change frequently)
  });

/**
 * Query options for fetching a single workflow instance by ID
 */
export const workflowInstanceQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["workflow-instances", "detail", id],
    queryFn: () => getWorkflowInstanceFn({ data: { id } }),
    staleTime: 10 * 1000, // 10 seconds
    enabled: !!id,
    refetchInterval: (query) => {
      // Auto-refresh running instances
      const instance = query.state.data?.instance;
      if (instance?.status === "running" || instance?.status === "pending") {
        return 5 * 1000; // 5 seconds
      }
      return false;
    },
  });

/**
 * Query options for fetching step executions for an instance
 */
export const stepExecutionsQueryOptions = (instanceId: string) =>
  queryOptions({
    queryKey: ["workflow-instances", "steps", instanceId],
    queryFn: () => getStepExecutionsFn({ data: { instanceId } }),
    staleTime: 10 * 1000,
    enabled: !!instanceId,
  });

/**
 * Query options for fetching event logs for an instance
 */
export const eventLogsQueryOptions = (
  instanceId: string,
  options?: {
    limit?: number;
    offset?: number;
  }
) =>
  queryOptions({
    queryKey: ["workflow-instances", "logs", instanceId, options],
    queryFn: () =>
      getEventLogsFn({
        data: {
          instanceId,
          limit: options?.limit ?? 100,
          offset: options?.offset ?? 0,
        },
      }),
    staleTime: 10 * 1000,
    enabled: !!instanceId,
  });

// =============================================================================
// Approval Query Options
// =============================================================================

/**
 * Query options for fetching pending approvals for the current user
 */
export const pendingApprovalsQueryOptions = (options?: {
  limit?: number;
  offset?: number;
}) =>
  queryOptions({
    queryKey: ["workflow-approvals", "pending", options],
    queryFn: () => getPendingApprovalsFn({ data: options }),
    staleTime: 30 * 1000,
    refetchInterval: 2 * 60 * 1000, // Auto-refresh every 2 minutes
  });

// =============================================================================
// Statistics Query Options
// =============================================================================

/**
 * Query options for fetching overall workflow statistics
 */
export const workflowStatisticsQueryOptions = () =>
  queryOptions({
    queryKey: ["workflow-statistics"],
    queryFn: () => getWorkflowStatisticsFn(),
    staleTime: 1 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  });
