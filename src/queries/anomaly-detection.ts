/**
 * Anomaly Detection Query Options
 *
 * TanStack Query options for anomaly detection data fetching.
 */

import { queryOptions } from "@tanstack/react-query";
import {
  getAnomalyAlertsFn,
  getAnomalyAlertFn,
  getUnresolvedAlertsFn,
  getAnomalyStatsFn,
  getAnomalyTrendFn,
  getDetectionRulesFn,
  getDetectionRuleFn,
  getDetectionRunsFn,
  getAnomalyConfigFn,
  getAnomalyEnumsFn,
} from "~/fn/anomaly-detection";
import type {
  AnomalyCategory,
  AnomalySeverity,
  AnomalyStatus,
  AnomalyAlgorithm,
} from "~/lib/anomaly-detection-service/types";

// =============================================================================
// Alert Query Options
// =============================================================================

export interface AnomalyAlertsQueryParams {
  category?: AnomalyCategory;
  severity?: AnomalySeverity;
  status?: AnomalyStatus;
  userId?: string;
  entityType?: string;
  entityId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export const anomalyAlertsQueryOptions = (params: AnomalyAlertsQueryParams = {}) =>
  queryOptions({
    queryKey: ["anomaly-alerts", params],
    queryFn: () =>
      getAnomalyAlertsFn({
        data: {
          category: params.category,
          severity: params.severity,
          status: params.status,
          userId: params.userId,
          entityType: params.entityType,
          entityId: params.entityId,
          startDate: params.startDate,
          endDate: params.endDate,
          limit: params.limit ?? 50,
          offset: params.offset ?? 0,
        },
      }),
    staleTime: 30000, // 30 seconds
  });

export const anomalyAlertQueryOptions = (alertId: string) =>
  queryOptions({
    queryKey: ["anomaly-alerts", "detail", alertId],
    queryFn: () => getAnomalyAlertFn({ data: { alertId } }),
    enabled: !!alertId,
  });

export const unresolvedAlertsQueryOptions = (limit: number = 50) =>
  queryOptions({
    queryKey: ["anomaly-alerts", "unresolved", { limit }],
    queryFn: () => getUnresolvedAlertsFn({ data: { limit } }),
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });

// =============================================================================
// Statistics Query Options
// =============================================================================

export const anomalyStatsQueryOptions = () =>
  queryOptions({
    queryKey: ["anomaly-detection", "stats"],
    queryFn: () => getAnomalyStatsFn(),
    staleTime: 60000, // 1 minute
    refetchInterval: 120000, // Refetch every 2 minutes
  });

export const anomalyTrendQueryOptions = (days: number = 30) =>
  queryOptions({
    queryKey: ["anomaly-detection", "trend", { days }],
    queryFn: () => getAnomalyTrendFn({ data: { days } }),
    staleTime: 300000, // 5 minutes
  });

// =============================================================================
// Detection Rules Query Options
// =============================================================================

export interface DetectionRulesQueryParams {
  category?: AnomalyCategory;
  algorithm?: AnomalyAlgorithm;
  enabled?: boolean;
  limit?: number;
  offset?: number;
}

export const detectionRulesQueryOptions = (params: DetectionRulesQueryParams = {}) =>
  queryOptions({
    queryKey: ["detection-rules", params],
    queryFn: () =>
      getDetectionRulesFn({
        data: {
          category: params.category,
          algorithm: params.algorithm,
          enabled: params.enabled,
          limit: params.limit ?? 50,
          offset: params.offset ?? 0,
        },
      }),
    staleTime: 60000, // 1 minute
  });

export const detectionRuleQueryOptions = (ruleId: string) =>
  queryOptions({
    queryKey: ["detection-rules", "detail", ruleId],
    queryFn: () => getDetectionRuleFn({ data: { ruleId } }),
    enabled: !!ruleId,
  });

// =============================================================================
// Detection Runs Query Options
// =============================================================================

export const detectionRunsQueryOptions = (limit: number = 20) =>
  queryOptions({
    queryKey: ["detection-runs", { limit }],
    queryFn: () => getDetectionRunsFn({ data: { limit } }),
    staleTime: 60000, // 1 minute
  });

// =============================================================================
// Configuration Query Options
// =============================================================================

export const anomalyConfigQueryOptions = () =>
  queryOptions({
    queryKey: ["anomaly-detection", "config"],
    queryFn: () => getAnomalyConfigFn(),
    staleTime: 300000, // 5 minutes
  });

export const anomalyEnumsQueryOptions = () =>
  queryOptions({
    queryKey: ["anomaly-detection", "enums"],
    queryFn: () => getAnomalyEnumsFn(),
    staleTime: Infinity, // Never stale, enums don't change
  });
