/**
 * AI Conversations React Hooks
 * Custom hooks for managing persistent AI conversations
 */

import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  aiConversationsQueryOptions,
  aiConversationQueryOptions,
  aiUserPreferenceQueryOptions,
  aiTokenUsageQueryOptions,
  aiRecentConversationsQueryOptions,
  aiConversationCountQueryOptions,
} from "~/queries/ai-conversations";
import {
  createAIConversationFn,
  updateAIConversationFn,
  archiveAIConversationFn,
  deleteAIConversationFn,
  sendAIMessageFn,
  addMessageFeedbackFn,
  updateAIUserPreferenceFn,
  type CreateAIConversationResult,
  type SendAIMessageResult,
  type GetAIConversationResult,
} from "~/fn/ai-conversations";
import type {
  AIConversation,
  AIMessage,
  AIUserPreference,
  ConversationStatus,
} from "~/db/schema";
import type { CacheStats, ClaudeModel } from "~/lib/claude";

// ============================================================================
// Types
// ============================================================================

export interface AIConversationMessage {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  createdAt: Date;
  inputTokens?: number | null;
  outputTokens?: number | null;
  feedbackRating?: number | null;
  feedbackText?: string | null;
  isStreaming?: boolean;
}

export interface UseAIConversationsOptions {
  status?: ConversationStatus;
  limit?: number;
  offset?: number;
}

export interface UseAIConversationOptions {
  model?: ClaudeModel;
  temperature?: number;
  maxTokens?: number;
  enableCaching?: boolean;
  onError?: (error: string) => void;
  onCacheStats?: (stats: CacheStats) => void;
  onMessageSent?: (userMessage: AIMessage, assistantMessage: AIMessage) => void;
}

export interface UseAIConversationReturn {
  // Conversation data
  conversation: AIConversation | null;
  messages: AIConversationMessage[];
  isLoading: boolean;
  isLoadingConversation: boolean;
  isSending: boolean;
  error: string | null;
  cacheStats: CacheStats | null;

  // Actions
  sendMessage: (content: string) => Promise<void>;
  updateConversation: (data: { title?: string; summary?: string; systemPrompt?: string }) => Promise<void>;
  archiveConversation: () => Promise<void>;
  deleteConversation: () => Promise<void>;
  addFeedback: (messageId: string, rating?: number, text?: string) => Promise<void>;
  refreshConversation: () => Promise<void>;
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Hook to get list of AI conversations
 */
export function useAIConversations(options?: UseAIConversationsOptions) {
  return useQuery(aiConversationsQueryOptions(options));
}

/**
 * Hook to get a single AI conversation with messages
 */
export function useAIConversationQuery(id: string | undefined) {
  return useQuery({
    ...aiConversationQueryOptions(id || ""),
    enabled: !!id,
  });
}

/**
 * Hook to get user's AI preferences
 */
export function useAIUserPreference() {
  return useQuery(aiUserPreferenceQueryOptions());
}

/**
 * Hook to get token usage statistics
 */
export function useAITokenUsage(options?: { startDate?: string; endDate?: string }) {
  return useQuery(aiTokenUsageQueryOptions(options));
}

/**
 * Hook to get recent conversations summary
 */
export function useAIRecentConversations(limit?: number) {
  return useQuery(aiRecentConversationsQueryOptions(limit));
}

/**
 * Hook to get conversation count
 */
export function useAIConversationCount(status?: ConversationStatus) {
  return useQuery(aiConversationCountQueryOptions(status));
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Hook to create a new AI conversation
 */
export function useCreateAIConversation() {
  const queryClient = useQueryClient();

  return useMutation<
    CreateAIConversationResult,
    Error,
    {
      title?: string;
      systemPrompt?: string;
      modelId?: ClaudeModel;
      contextMetadata?: string;
    }
  >({
    mutationFn: (data) => createAIConversationFn({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-conversations"] });
    },
  });
}

/**
 * Hook to update an AI conversation
 */
export function useUpdateAIConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      id: string;
      title?: string;
      summary?: string;
      systemPrompt?: string;
      modelId?: ClaudeModel;
    }) => updateAIConversationFn({ data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["ai-conversations", "detail", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["ai-conversations", "list"] });
    },
  });
}

/**
 * Hook to archive an AI conversation
 */
export function useArchiveAIConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => archiveAIConversationFn({ data: { id } }),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["ai-conversations"] });
    },
  });
}

/**
 * Hook to delete an AI conversation
 */
export function useDeleteAIConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteAIConversationFn({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-conversations"] });
    },
  });
}

/**
 * Hook to send a message in a conversation
 */
export function useSendAIMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      conversationId: string;
      content: string;
      model?: ClaudeModel;
      temperature?: number;
      maxTokens?: number;
      enableCaching?: boolean;
    }): Promise<SendAIMessageResult> => {
      return sendAIMessageFn({ data }) as Promise<SendAIMessageResult>;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["ai-conversations", "detail", variables.conversationId],
      });
      queryClient.invalidateQueries({ queryKey: ["ai-conversations", "list"] });
      queryClient.invalidateQueries({ queryKey: ["ai-usage"] });
    },
  });
}

/**
 * Hook to add feedback to a message
 */
export function useAddMessageFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { messageId: string; rating?: number; text?: string }) =>
      addMessageFeedbackFn({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-conversations", "detail"] });
    },
  });
}

/**
 * Hook to update user preferences
 */
export function useUpdateAIUserPreference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      preferredModel?: ClaudeModel;
      defaultSystemPrompt?: string | null;
      responsePreferences?: string | null;
      enableContextMemory?: boolean;
      maxContextMessages?: number;
      saveConversationHistory?: boolean;
      allowDataTraining?: boolean;
    }) => {
      // Type cast to ensure compatibility with server function
      return updateAIUserPreferenceFn({
        data: {
          ...data,
          defaultSystemPrompt: data.defaultSystemPrompt ?? undefined,
          responsePreferences: data.responsePreferences ?? undefined,
        } as Parameters<typeof updateAIUserPreferenceFn>[0]['data'],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-preferences"] });
    },
  });
}

// ============================================================================
// Composite Hooks
// ============================================================================

/**
 * Comprehensive hook for managing a single AI conversation
 * Handles message sending, conversation updates, and state management
 */
export function useAIConversation(
  conversationId: string | undefined,
  options: UseAIConversationOptions = {}
): UseAIConversationReturn {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);

  // Query for conversation data
  const {
    data: conversationResult,
    isLoading: isLoadingConversation,
    refetch: refreshConversation,
  } = useAIConversationQuery(conversationId);

  // Mutations
  const sendMessageMutation = useSendAIMessage();
  const updateMutation = useUpdateAIConversation();
  const archiveMutation = useArchiveAIConversation();
  const deleteMutation = useDeleteAIConversation();
  const feedbackMutation = useAddMessageFeedback();

  // Extract conversation and messages
  const conversation = useMemo(() => {
    if (conversationResult?.success && conversationResult.conversation) {
      return conversationResult.conversation;
    }
    return null;
  }, [conversationResult]);

  const messages: AIConversationMessage[] = useMemo(() => {
    if (!conversation || !("messages" in conversation)) return [];

    return (conversation as { messages: AIMessage[] }).messages.map((msg) => ({
      id: msg.id,
      role: msg.role as "user" | "assistant" | "system" | "tool",
      content: msg.content,
      createdAt: new Date(msg.createdAt),
      inputTokens: msg.inputTokens,
      outputTokens: msg.outputTokens,
      feedbackRating: msg.feedbackRating,
      feedbackText: msg.feedbackText,
    }));
  }, [conversation]);

  // Send message handler
  const sendMessage = useCallback(
    async (content: string) => {
      if (!conversationId || !content.trim()) return;

      setError(null);

      try {
        const result: SendAIMessageResult = await sendMessageMutation.mutateAsync({
          conversationId,
          content,
          model: options.model,
          temperature: options.temperature,
          maxTokens: options.maxTokens,
          enableCaching: options.enableCaching,
        });

        if (!result.success) {
          setError(result.error || "Failed to send message");
          options.onError?.(result.error || "Failed to send message");
          return;
        }

        // Update cache stats
        if (result.cacheStats) {
          setCacheStats(result.cacheStats);
          options.onCacheStats?.(result.cacheStats);
        }

        // Callback for message sent
        if (result.userMessage && result.assistantMessage) {
          options.onMessageSent?.(result.userMessage, result.assistantMessage);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to send message";
        setError(errorMessage);
        options.onError?.(errorMessage);
      }
    },
    [conversationId, options, sendMessageMutation]
  );

  // Update conversation handler
  const updateConversation = useCallback(
    async (data: { title?: string; summary?: string; systemPrompt?: string }) => {
      if (!conversationId) return;

      try {
        const result = await updateMutation.mutateAsync({
          id: conversationId,
          ...data,
        });

        if (!result.success) {
          setError(result.error || "Failed to update conversation");
          options.onError?.(result.error || "Failed to update conversation");
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to update conversation";
        setError(errorMessage);
        options.onError?.(errorMessage);
      }
    },
    [conversationId, options, updateMutation]
  );

  // Archive conversation handler
  const archiveConversation = useCallback(async () => {
    if (!conversationId) return;

    try {
      const result = await archiveMutation.mutateAsync(conversationId);

      if (!result.success) {
        setError(result.error || "Failed to archive conversation");
        options.onError?.(result.error || "Failed to archive conversation");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to archive conversation";
      setError(errorMessage);
      options.onError?.(errorMessage);
    }
  }, [conversationId, options, archiveMutation]);

  // Delete conversation handler
  const deleteConversation = useCallback(async () => {
    if (!conversationId) return;

    try {
      const result = await deleteMutation.mutateAsync(conversationId);

      if (!result.success) {
        setError(result.error || "Failed to delete conversation");
        options.onError?.(result.error || "Failed to delete conversation");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete conversation";
      setError(errorMessage);
      options.onError?.(errorMessage);
    }
  }, [conversationId, options, deleteMutation]);

  // Add feedback handler
  const addFeedback = useCallback(
    async (messageId: string, rating?: number, text?: string) => {
      try {
        const result = await feedbackMutation.mutateAsync({
          messageId,
          rating,
          text,
        });

        if (!result.success) {
          setError(result.error || "Failed to add feedback");
          options.onError?.(result.error || "Failed to add feedback");
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to add feedback";
        setError(errorMessage);
        options.onError?.(errorMessage);
      }
    },
    [options, feedbackMutation]
  );

  return {
    conversation: conversation as AIConversation | null,
    messages,
    isLoading:
      sendMessageMutation.isPending ||
      updateMutation.isPending ||
      archiveMutation.isPending ||
      deleteMutation.isPending,
    isLoadingConversation,
    isSending: sendMessageMutation.isPending,
    error,
    cacheStats,
    sendMessage,
    updateConversation,
    archiveConversation,
    deleteConversation,
    addFeedback,
    refreshConversation: async () => {
      await refreshConversation();
    },
  };
}

/**
 * Hook to start a new conversation and get its ID
 */
export function useStartAIConversation() {
  const createMutation = useCreateAIConversation();

  const startConversation = useCallback(
    async (options?: {
      title?: string;
      systemPrompt?: string;
      modelId?: ClaudeModel;
    }): Promise<string | null> => {
      try {
        const result = await createMutation.mutateAsync({
          title: options?.title,
          systemPrompt: options?.systemPrompt,
          modelId: options?.modelId,
        });

        if (result.success && result.conversation) {
          return result.conversation.id;
        }

        return null;
      } catch {
        return null;
      }
    },
    [createMutation]
  );

  return {
    startConversation,
    isStarting: createMutation.isPending,
    error: createMutation.error,
  };
}

/**
 * Hook for quick one-off conversations that auto-creates and manages
 */
export function useQuickAIConversation(options: UseAIConversationOptions = {}) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const { startConversation, isStarting } = useStartAIConversation();
  const conversationHook = useAIConversation(conversationId || undefined, options);

  const sendMessageWithAutoCreate = useCallback(
    async (content: string, conversationOptions?: { title?: string; systemPrompt?: string }) => {
      // Create conversation if it doesn't exist
      if (!conversationId) {
        const newId = await startConversation({
          title: conversationOptions?.title || "New Conversation",
          systemPrompt: conversationOptions?.systemPrompt,
        });

        if (newId) {
          setConversationId(newId);
          // Wait a bit for the query to update, then send
          setTimeout(() => {
            conversationHook.sendMessage(content);
          }, 100);
        }
        return;
      }

      await conversationHook.sendMessage(content);
    },
    [conversationId, startConversation, conversationHook]
  );

  const clearConversation = useCallback(() => {
    setConversationId(null);
  }, []);

  return {
    ...conversationHook,
    conversationId,
    isStarting,
    sendMessage: sendMessageWithAutoCreate,
    clearConversation,
  };
}
