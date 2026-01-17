/**
 * AI Conversation Query Options
 * TanStack Query options for AI conversation operations
 */

import { queryOptions } from "@tanstack/react-query";
import {
  getAIConversationsFn,
  getAIConversationFn,
  getAIUserPreferenceFn,
  getTokenUsageFn,
  getRecentConversationsSummaryFn,
  getConversationCountFn,
} from "~/fn/ai-conversations";
import type { ConversationStatus } from "~/db/schema";

/**
 * Query options for user's AI conversations list
 */
export const aiConversationsQueryOptions = (options?: {
  status?: ConversationStatus;
  limit?: number;
  offset?: number;
}) =>
  queryOptions({
    queryKey: ["ai-conversations", "list", options?.status, options?.limit, options?.offset],
    queryFn: () =>
      getAIConversationsFn({
        data: {
          status: options?.status,
          limit: options?.limit,
          offset: options?.offset,
        },
      }),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

/**
 * Query options for a single AI conversation with messages
 */
export const aiConversationQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["ai-conversations", "detail", id],
    queryFn: () => getAIConversationFn({ data: { id } }),
    staleTime: 1000 * 30, // 30 seconds - conversations update frequently
    enabled: !!id,
  });

/**
 * Query options for user's AI preferences
 */
export const aiUserPreferenceQueryOptions = () =>
  queryOptions({
    queryKey: ["ai-preferences"],
    queryFn: () => getAIUserPreferenceFn(),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

/**
 * Query options for token usage statistics
 */
export const aiTokenUsageQueryOptions = (options?: {
  startDate?: string;
  endDate?: string;
}) =>
  queryOptions({
    queryKey: ["ai-usage", "tokens", options?.startDate, options?.endDate],
    queryFn: () =>
      getTokenUsageFn({
        data: options,
      }),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

/**
 * Query options for recent conversations summary
 */
export const aiRecentConversationsQueryOptions = (limit?: number) =>
  queryOptions({
    queryKey: ["ai-conversations", "recent", limit],
    queryFn: () =>
      getRecentConversationsSummaryFn({
        data: { limit },
      }),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

/**
 * Query options for conversation count
 */
export const aiConversationCountQueryOptions = (status?: ConversationStatus) =>
  queryOptions({
    queryKey: ["ai-conversations", "count", status],
    queryFn: () =>
      getConversationCountFn({
        data: { status },
      }),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
