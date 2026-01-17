/**
 * Call Context Query Options
 * TanStack Query options for call context operations
 */

import { queryOptions } from "@tanstack/react-query";
import {
  getCallContextFn,
  getCustomerInfoFn,
  getRecentInteractionsFn,
  getOpenTicketsFn,
  getCallHistoryFn,
  searchCustomersFn,
} from "~/fn/call-context";
import type { CallContextFilters } from "~/data-access/call-context";

/**
 * Query options for full call context
 * This is the main query for fetching all context during a call
 */
export const callContextQueryOptions = (
  phoneOrUserId: string,
  filters?: CallContextFilters
) =>
  queryOptions({
    queryKey: ["call-context", "full", phoneOrUserId, filters],
    queryFn: () =>
      getCallContextFn({
        data: {
          phoneOrUserId,
          filters,
        },
      }),
    staleTime: 1000 * 30, // 30 seconds - context changes frequently during calls
    enabled: !!phoneOrUserId,
  });

/**
 * Query options for customer info only
 */
export const customerInfoQueryOptions = (phoneOrUserId: string) =>
  queryOptions({
    queryKey: ["call-context", "customer", phoneOrUserId],
    queryFn: () =>
      getCustomerInfoFn({
        data: {
          phoneOrUserId,
        },
      }),
    staleTime: 1000 * 60 * 5, // 5 minutes - customer info doesn't change often
    enabled: !!phoneOrUserId,
  });

/**
 * Query options for recent interactions
 */
export const recentInteractionsQueryOptions = (
  userId: string,
  options?: { limit?: number; daysBack?: number }
) =>
  queryOptions({
    queryKey: ["call-context", "interactions", userId, options?.limit, options?.daysBack],
    queryFn: () =>
      getRecentInteractionsFn({
        data: {
          userId,
          limit: options?.limit,
          daysBack: options?.daysBack,
        },
      }),
    staleTime: 1000 * 60 * 2, // 2 minutes
    enabled: !!userId,
  });

/**
 * Query options for open tickets
 */
export const openTicketsQueryOptions = (
  userId: string,
  options?: { limit?: number; includeResolved?: boolean }
) =>
  queryOptions({
    queryKey: ["call-context", "tickets", userId, options?.limit, options?.includeResolved],
    queryFn: () =>
      getOpenTicketsFn({
        data: {
          userId,
          limit: options?.limit,
          includeResolved: options?.includeResolved,
        },
      }),
    staleTime: 1000 * 60 * 2, // 2 minutes
    enabled: !!userId,
  });

/**
 * Query options for call history
 */
export const callHistoryQueryOptions = (
  userId: string,
  options?: { limit?: number }
) =>
  queryOptions({
    queryKey: ["call-context", "call-history", userId, options?.limit],
    queryFn: () =>
      getCallHistoryFn({
        data: {
          userId,
          limit: options?.limit,
        },
      }),
    staleTime: 1000 * 60 * 2, // 2 minutes
    enabled: !!userId,
  });

/**
 * Query options for customer search
 */
export const searchCustomersQueryOptions = (
  query: string,
  limit?: number
) =>
  queryOptions({
    queryKey: ["call-context", "search", query, limit],
    queryFn: () =>
      searchCustomersFn({
        data: {
          query,
          limit,
        },
      }),
    staleTime: 1000 * 60 * 1, // 1 minute
    enabled: query.length >= 2, // Only search when at least 2 characters
  });
