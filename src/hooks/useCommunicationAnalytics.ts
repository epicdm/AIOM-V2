import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  userCommunicationAnalyticsQueryOptions,
  teamCommunicationAnalyticsQueryOptions,
  communicationTrendsQueryOptions,
  activeBottlenecksQueryOptions,
} from "~/queries/communication-analytics";
import {
  detectBottlenecksFn,
  acknowledgeBottleneckFn,
  resolveBottleneckFn,
  dismissBottleneckFn,
} from "~/fn/communication-analytics";
import { getErrorMessage } from "~/utils/error";

/**
 * Hook for fetching user communication analytics
 */
export function useUserCommunicationAnalytics(days: number = 7, enabled = true) {
  return useQuery({
    ...userCommunicationAnalyticsQueryOptions(days),
    enabled,
  });
}

/**
 * Hook for fetching team communication analytics
 */
export function useTeamCommunicationAnalytics(days: number = 7, enabled = true) {
  return useQuery({
    ...teamCommunicationAnalyticsQueryOptions(days),
    enabled,
  });
}

/**
 * Hook for fetching communication trends
 */
export function useCommunicationTrends(days: number = 30, enabled = true) {
  return useQuery({
    ...communicationTrendsQueryOptions(days),
    enabled,
  });
}

/**
 * Hook for fetching active bottlenecks
 */
export function useActiveBottlenecks(includeTeam: boolean = false, enabled = true) {
  return useQuery({
    ...activeBottlenecksQueryOptions(includeTeam),
    enabled,
  });
}

/**
 * Hook for detecting bottlenecks
 */
export function useDetectBottlenecks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => detectBottlenecksFn(),
    onSuccess: (data) => {
      if (data.detected > 0) {
        toast.warning(`${data.detected} communication bottleneck(s) detected`, {
          description: "Review the bottlenecks to optimize team collaboration",
        });
      }
      // Invalidate bottlenecks query to refresh the list
      queryClient.invalidateQueries({
        queryKey: ["communication-analytics", "bottlenecks"],
      });
    },
    onError: (error) => {
      toast.error("Failed to detect bottlenecks", {
        description: getErrorMessage(error),
      });
    },
  });
}

/**
 * Hook for acknowledging a bottleneck
 */
export function useAcknowledgeBottleneck() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (bottleneckId: string) =>
      acknowledgeBottleneckFn({ data: { bottleneckId } }),
    onSuccess: () => {
      toast.success("Bottleneck acknowledged");
      queryClient.invalidateQueries({
        queryKey: ["communication-analytics", "bottlenecks"],
      });
    },
    onError: (error) => {
      toast.error("Failed to acknowledge bottleneck", {
        description: getErrorMessage(error),
      });
    },
  });
}

/**
 * Hook for resolving a bottleneck
 */
export function useResolveBottleneck() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (bottleneckId: string) =>
      resolveBottleneckFn({ data: { bottleneckId } }),
    onSuccess: () => {
      toast.success("Bottleneck marked as resolved");
      queryClient.invalidateQueries({
        queryKey: ["communication-analytics", "bottlenecks"],
      });
    },
    onError: (error) => {
      toast.error("Failed to resolve bottleneck", {
        description: getErrorMessage(error),
      });
    },
  });
}

/**
 * Hook for dismissing a bottleneck
 */
export function useDismissBottleneck() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (bottleneckId: string) =>
      dismissBottleneckFn({ data: { bottleneckId } }),
    onSuccess: () => {
      toast.info("Bottleneck dismissed");
      queryClient.invalidateQueries({
        queryKey: ["communication-analytics", "bottlenecks"],
      });
    },
    onError: (error) => {
      toast.error("Failed to dismiss bottleneck", {
        description: getErrorMessage(error),
      });
    },
  });
}
