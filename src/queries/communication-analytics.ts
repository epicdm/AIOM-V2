import { queryOptions } from "@tanstack/react-query";
import {
  getUserCommunicationAnalyticsFn,
  getTeamCommunicationAnalyticsFn,
  getCommunicationTrendsFn,
  getActiveBottlenecksFn,
} from "~/fn/communication-analytics";

/**
 * Query options for user communication analytics
 */
export const userCommunicationAnalyticsQueryOptions = (days: number = 7) =>
  queryOptions({
    queryKey: ["communication-analytics", "user", { days }],
    queryFn: () => getUserCommunicationAnalyticsFn({ data: { days } }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

/**
 * Query options for team communication analytics
 */
export const teamCommunicationAnalyticsQueryOptions = (days: number = 7) =>
  queryOptions({
    queryKey: ["communication-analytics", "team", { days }],
    queryFn: () => getTeamCommunicationAnalyticsFn({ data: { days } }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

/**
 * Query options for communication trends
 */
export const communicationTrendsQueryOptions = (days: number = 30) =>
  queryOptions({
    queryKey: ["communication-analytics", "trends", { days }],
    queryFn: () => getCommunicationTrendsFn({ data: { days } }),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

/**
 * Query options for active bottlenecks
 */
export const activeBottlenecksQueryOptions = (includeTeam: boolean = false) =>
  queryOptions({
    queryKey: ["communication-analytics", "bottlenecks", { includeTeam }],
    queryFn: () => getActiveBottlenecksFn({ data: { includeTeam } }),
    refetchInterval: 60 * 1000, // Refetch every minute
  });
