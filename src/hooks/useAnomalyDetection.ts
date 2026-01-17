/**
 * Anomaly Detection React Hooks
 *
 * Custom hooks for anomaly detection functionality:
 * - Alert management (list, acknowledge, resolve, dismiss)
 * - Statistics and trends
 * - Detection rules management
 * - Value analysis
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  anomalyAlertsQueryOptions,
  anomalyAlertQueryOptions,
  unresolvedAlertsQueryOptions,
  anomalyStatsQueryOptions,
  anomalyTrendQueryOptions,
  detectionRulesQueryOptions,
  detectionRuleQueryOptions,
  detectionRunsQueryOptions,
  anomalyConfigQueryOptions,
  anomalyEnumsQueryOptions,
  type AnomalyAlertsQueryParams,
  type DetectionRulesQueryParams,
} from "~/queries/anomaly-detection";
import {
  acknowledgeAlertFn,
  resolveAlertFn,
  dismissAlertFn,
  confirmAlertFn,
  createDetectionRuleFn,
  updateDetectionRuleFn,
  deleteDetectionRuleFn,
  toggleDetectionRuleFn,
  analyzeValueFn,
  recordMetricDataPointFn,
} from "~/fn/anomaly-detection";
import { getErrorMessage } from "~/utils/error";
import type {
  AnomalyCategory,
  AnomalyAlgorithm,
} from "~/lib/anomaly-detection-service/types";

// =============================================================================
// Alert Query Hooks
// =============================================================================

/**
 * Hook to fetch anomaly alerts with filters
 */
export function useAnomalyAlerts(
  params: AnomalyAlertsQueryParams = {},
  enabled = true
) {
  return useQuery({
    ...anomalyAlertsQueryOptions(params),
    enabled,
  });
}

/**
 * Hook to fetch a single anomaly alert
 */
export function useAnomalyAlert(alertId: string, enabled = true) {
  return useQuery({
    ...anomalyAlertQueryOptions(alertId),
    enabled: enabled && !!alertId,
  });
}

/**
 * Hook to fetch unresolved anomaly alerts
 */
export function useUnresolvedAlerts(limit = 50, enabled = true) {
  return useQuery({
    ...unresolvedAlertsQueryOptions(limit),
    enabled,
  });
}

// =============================================================================
// Statistics Query Hooks
// =============================================================================

/**
 * Hook to fetch anomaly detection statistics
 */
export function useAnomalyStats(enabled = true) {
  return useQuery({
    ...anomalyStatsQueryOptions(),
    enabled,
  });
}

/**
 * Hook to fetch anomaly trend data
 */
export function useAnomalyTrend(days = 30, enabled = true) {
  return useQuery({
    ...anomalyTrendQueryOptions(days),
    enabled,
  });
}

// =============================================================================
// Detection Rules Query Hooks
// =============================================================================

/**
 * Hook to fetch detection rules
 */
export function useDetectionRules(
  params: DetectionRulesQueryParams = {},
  enabled = true
) {
  return useQuery({
    ...detectionRulesQueryOptions(params),
    enabled,
  });
}

/**
 * Hook to fetch a single detection rule
 */
export function useDetectionRule(ruleId: string, enabled = true) {
  return useQuery({
    ...detectionRuleQueryOptions(ruleId),
    enabled: enabled && !!ruleId,
  });
}

/**
 * Hook to fetch detection runs
 */
export function useDetectionRuns(limit = 20, enabled = true) {
  return useQuery({
    ...detectionRunsQueryOptions(limit),
    enabled,
  });
}

// =============================================================================
// Configuration Query Hooks
// =============================================================================

/**
 * Hook to fetch anomaly detection configuration
 */
export function useAnomalyConfig(enabled = true) {
  return useQuery({
    ...anomalyConfigQueryOptions(),
    enabled,
  });
}

/**
 * Hook to fetch anomaly detection enums (categories, severities, etc.)
 */
export function useAnomalyEnums(enabled = true) {
  return useQuery({
    ...anomalyEnumsQueryOptions(),
    enabled,
  });
}

// =============================================================================
// Alert Mutation Hooks
// =============================================================================

/**
 * Hook to acknowledge an anomaly alert
 */
export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (alertId: string) => acknowledgeAlertFn({ data: { alertId } }),
    onSuccess: (_, alertId) => {
      toast.success("Alert acknowledged");
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["anomaly-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["anomaly-detection", "stats"] });
    },
    onError: (error) => {
      toast.error("Failed to acknowledge alert", {
        description: getErrorMessage(error),
      });
    },
  });
}

/**
 * Hook to resolve an anomaly alert
 */
export function useResolveAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ alertId, findings }: { alertId: string; findings?: string }) =>
      resolveAlertFn({ data: { alertId, findings } }),
    onSuccess: () => {
      toast.success("Alert resolved");
      queryClient.invalidateQueries({ queryKey: ["anomaly-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["anomaly-detection", "stats"] });
    },
    onError: (error) => {
      toast.error("Failed to resolve alert", {
        description: getErrorMessage(error),
      });
    },
  });
}

/**
 * Hook to dismiss an anomaly alert
 */
export function useDismissAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ alertId, reason }: { alertId: string; reason: string }) =>
      dismissAlertFn({ data: { alertId, reason } }),
    onSuccess: () => {
      toast.success("Alert dismissed");
      queryClient.invalidateQueries({ queryKey: ["anomaly-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["anomaly-detection", "stats"] });
    },
    onError: (error) => {
      toast.error("Failed to dismiss alert", {
        description: getErrorMessage(error),
      });
    },
  });
}

/**
 * Hook to confirm an anomaly alert
 */
export function useConfirmAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ alertId, notes }: { alertId: string; notes?: string }) =>
      confirmAlertFn({ data: { alertId, notes } }),
    onSuccess: () => {
      toast.success("Alert confirmed");
      queryClient.invalidateQueries({ queryKey: ["anomaly-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["anomaly-detection", "stats"] });
    },
    onError: (error) => {
      toast.error("Failed to confirm alert", {
        description: getErrorMessage(error),
      });
    },
  });
}

// =============================================================================
// Detection Rules Mutation Hooks
// =============================================================================

interface CreateDetectionRuleParams {
  name: string;
  description?: string;
  category: AnomalyCategory;
  algorithm: AnomalyAlgorithm;
  enabled?: boolean;
  warningThreshold: number;
  criticalThreshold: number;
  parameters?: string;
  checkIntervalMinutes?: number;
  notifyOnSeverity?: string;
  recipientUserIds?: string;
}

/**
 * Hook to create a detection rule
 */
export function useCreateDetectionRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDetectionRuleParams) =>
      createDetectionRuleFn({ data }),
    onSuccess: () => {
      toast.success("Detection rule created");
      queryClient.invalidateQueries({ queryKey: ["detection-rules"] });
    },
    onError: (error) => {
      toast.error("Failed to create detection rule", {
        description: getErrorMessage(error),
      });
    },
  });
}

/**
 * Hook to update a detection rule
 */
export function useUpdateDetectionRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      ruleId,
      updates,
    }: {
      ruleId: string;
      updates: Partial<CreateDetectionRuleParams>;
    }) => updateDetectionRuleFn({ data: { ruleId, updates } }),
    onSuccess: (_, { ruleId }) => {
      toast.success("Detection rule updated");
      queryClient.invalidateQueries({ queryKey: ["detection-rules"] });
      queryClient.invalidateQueries({
        queryKey: ["detection-rules", "detail", ruleId],
      });
    },
    onError: (error) => {
      toast.error("Failed to update detection rule", {
        description: getErrorMessage(error),
      });
    },
  });
}

/**
 * Hook to delete a detection rule
 */
export function useDeleteDetectionRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ruleId: string) => deleteDetectionRuleFn({ data: { ruleId } }),
    onSuccess: () => {
      toast.success("Detection rule deleted");
      queryClient.invalidateQueries({ queryKey: ["detection-rules"] });
    },
    onError: (error) => {
      toast.error("Failed to delete detection rule", {
        description: getErrorMessage(error),
      });
    },
  });
}

/**
 * Hook to toggle a detection rule
 */
export function useToggleDetectionRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ruleId, enabled }: { ruleId: string; enabled: boolean }) =>
      toggleDetectionRuleFn({ data: { ruleId, enabled } }),
    onSuccess: (_, { ruleId, enabled }) => {
      toast.success(enabled ? "Rule enabled" : "Rule disabled");
      queryClient.invalidateQueries({ queryKey: ["detection-rules"] });
      queryClient.invalidateQueries({
        queryKey: ["detection-rules", "detail", ruleId],
      });
    },
    onError: (error) => {
      toast.error("Failed to toggle detection rule", {
        description: getErrorMessage(error),
      });
    },
  });
}

// =============================================================================
// Analysis Mutation Hooks
// =============================================================================

interface AnalyzeValueParams {
  value: number;
  category: AnomalyCategory;
  metric: string;
  algorithm?: AnomalyAlgorithm;
  entityId?: string;
  entityType?: string;
  historicalDays?: number;
}

/**
 * Hook to analyze a value for anomalies
 */
export function useAnalyzeValue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AnalyzeValueParams) => analyzeValueFn({ data }),
    onSuccess: (result) => {
      if (result.isAnomaly) {
        toast.warning("Anomaly detected!", {
          description: `An anomaly was detected with alert ID: ${result.alertId}`,
        });
        queryClient.invalidateQueries({ queryKey: ["anomaly-alerts"] });
        queryClient.invalidateQueries({ queryKey: ["anomaly-detection", "stats"] });
      }
    },
    onError: (error) => {
      toast.error("Failed to analyze value", {
        description: getErrorMessage(error),
      });
    },
  });
}

interface RecordMetricDataPointParams {
  category: AnomalyCategory;
  metricName: string;
  value: number;
  entityType?: string;
  entityId?: string;
  metadata?: string;
}

/**
 * Hook to record a metric data point
 */
export function useRecordMetricDataPoint() {
  return useMutation({
    mutationFn: (data: RecordMetricDataPointParams) =>
      recordMetricDataPointFn({ data }),
    onError: (error) => {
      console.error("Failed to record metric data point:", getErrorMessage(error));
    },
  });
}

// =============================================================================
// Composite Hooks
// =============================================================================

/**
 * Hook combining common anomaly detection data
 */
export function useAnomalyDashboard(enabled = true) {
  const alertsQuery = useUnresolvedAlerts(10, enabled);
  const statsQuery = useAnomalyStats(enabled);
  const trendQuery = useAnomalyTrend(7, enabled);

  return {
    alerts: alertsQuery.data ?? [],
    stats: statsQuery.data,
    trend: trendQuery.data ?? [],
    isLoading:
      alertsQuery.isLoading || statsQuery.isLoading || trendQuery.isLoading,
    isError: alertsQuery.isError || statsQuery.isError || trendQuery.isError,
    error: alertsQuery.error || statsQuery.error || trendQuery.error,
    refetch: () => {
      alertsQuery.refetch();
      statsQuery.refetch();
      trendQuery.refetch();
    },
  };
}
