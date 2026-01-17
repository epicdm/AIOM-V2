import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  taskLinksForConversationQueryOptions,
  taskLinksForExternalTaskQueryOptions,
  taskSuggestionsQueryOptions,
  pendingTaskSuggestionsQueryOptions,
  taskThreadQueryOptions,
  taskThreadsForTaskQueryOptions,
  userTaskThreadsQueryOptions,
  taskThreadMessagesQueryOptions,
  threadParticipantsQueryOptions,
  unreadThreadCountQueryOptions,
} from "~/queries/task-conversation-links";
import {
  createTaskLinkFn,
  updateTaskLinkFn,
  deleteTaskLinkFn,
  createTaskSuggestionFn,
  createBatchTaskSuggestionsFn,
  acceptTaskSuggestionFn,
  dismissTaskSuggestionFn,
  createTaskThreadFn,
  updateTaskThreadFn,
  closeTaskThreadFn,
  resolveTaskThreadFn,
  reopenTaskThreadFn,
  sendTaskThreadMessageFn,
  markThreadMessagesAsReadFn,
  addThreadParticipantFn,
  leaveThreadFn,
  toggleThreadMuteFn,
} from "~/fn/task-conversation-links";
import { getErrorMessage } from "~/utils/error";

// =============================================================================
// Task Conversation Link Hooks
// =============================================================================

export function useTaskLinksForConversation(conversationId: string) {
  return useQuery({
    ...taskLinksForConversationQueryOptions(conversationId),
    enabled: !!conversationId,
  });
}

export function useTaskLinksForExternalTask(externalTaskId: string) {
  return useQuery({
    ...taskLinksForExternalTaskQueryOptions(externalTaskId),
    enabled: !!externalTaskId,
  });
}

export function useCreateTaskLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      conversationId: string;
      externalTaskId: string;
      externalProjectId?: string;
      taskSource?: "odoo" | "manual" | "ai_suggested";
      linkReason?: string;
    }) => createTaskLinkFn({ data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["taskLinks", "conversation", variables.conversationId],
      });
      queryClient.invalidateQueries({
        queryKey: ["taskLinks", "externalTask", variables.externalTaskId],
      });
      toast.success("Task linked successfully");
    },
    onError: (error) => {
      toast.error("Failed to link task", {
        description: getErrorMessage(error),
      });
    },
  });
}

export function useUpdateTaskLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      linkId: string;
      status?: "active" | "completed" | "archived";
      linkReason?: string;
    }) => updateTaskLinkFn({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["taskLinks"] });
      toast.success("Task link updated");
    },
    onError: (error) => {
      toast.error("Failed to update task link", {
        description: getErrorMessage(error),
      });
    },
  });
}

export function useDeleteTaskLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (linkId: string) => deleteTaskLinkFn({ data: { linkId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["taskLinks"] });
      toast.success("Task link removed");
    },
    onError: (error) => {
      toast.error("Failed to remove task link", {
        description: getErrorMessage(error),
      });
    },
  });
}

// =============================================================================
// Task Suggestion Hooks
// =============================================================================

export function useTaskSuggestions(
  conversationId: string,
  status?: "pending" | "accepted" | "dismissed"
) {
  return useQuery({
    ...taskSuggestionsQueryOptions(conversationId, status),
    enabled: !!conversationId,
  });
}

export function usePendingTaskSuggestions(conversationId: string) {
  return useQuery({
    ...pendingTaskSuggestionsQueryOptions(conversationId),
    enabled: !!conversationId,
  });
}

export function useCreateTaskSuggestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      conversationId: string;
      suggestedTaskId?: string;
      suggestedProjectId?: string;
      suggestionReason: string;
      confidenceScore?: number;
      relevanceKeywords?: string[];
      taskTitle?: string;
      taskDescription?: string;
      taskPriority?: string;
      taskDeadline?: string;
    }) => createTaskSuggestionFn({ data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["taskSuggestions", variables.conversationId],
      });
    },
    onError: (error) => {
      toast.error("Failed to create task suggestion", {
        description: getErrorMessage(error),
      });
    },
  });
}

export function useCreateBatchTaskSuggestions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      conversationId: string;
      suggestions: Array<{
        suggestedTaskId?: string;
        suggestedProjectId?: string;
        suggestionReason: string;
        confidenceScore?: number;
        relevanceKeywords?: string[];
        taskTitle?: string;
        taskDescription?: string;
        taskPriority?: string;
        taskDeadline?: string;
      }>;
    }) => createBatchTaskSuggestionsFn({ data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["taskSuggestions", variables.conversationId],
      });
    },
    onError: (error) => {
      toast.error("Failed to create task suggestions", {
        description: getErrorMessage(error),
      });
    },
  });
}

export function useAcceptTaskSuggestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (suggestionId: string) =>
      acceptTaskSuggestionFn({ data: { suggestionId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["taskSuggestions"] });
      toast.success("Task suggestion accepted");
    },
    onError: (error) => {
      toast.error("Failed to accept task suggestion", {
        description: getErrorMessage(error),
      });
    },
  });
}

export function useDismissTaskSuggestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (suggestionId: string) =>
      dismissTaskSuggestionFn({ data: { suggestionId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["taskSuggestions"] });
      toast.success("Task suggestion dismissed");
    },
    onError: (error) => {
      toast.error("Failed to dismiss task suggestion", {
        description: getErrorMessage(error),
      });
    },
  });
}

// =============================================================================
// Task Thread Hooks
// =============================================================================

export function useTaskThread(threadId: string) {
  return useQuery({
    ...taskThreadQueryOptions(threadId),
    enabled: !!threadId,
  });
}

export function useTaskThreadsForTask(externalTaskId: string) {
  return useQuery({
    ...taskThreadsForTaskQueryOptions(externalTaskId),
    enabled: !!externalTaskId,
  });
}

export function useUserTaskThreads() {
  return useQuery(userTaskThreadsQueryOptions());
}

export function useCreateTaskThread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      externalTaskId: string;
      externalProjectId?: string;
      taskSource?: "odoo" | "manual" | "ai_suggested";
      title: string;
      description?: string;
      taskTitle?: string;
      taskDeadline?: string;
    }) => createTaskThreadFn({ data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["taskThreads", "externalTask", variables.externalTaskId],
      });
      queryClient.invalidateQueries({ queryKey: ["taskThreads", "user"] });
      toast.success("Task thread created");
    },
    onError: (error) => {
      toast.error("Failed to create task thread", {
        description: getErrorMessage(error),
      });
    },
  });
}

export function useUpdateTaskThread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      threadId: string;
      title?: string;
      description?: string;
    }) => updateTaskThreadFn({ data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["taskThread", variables.threadId],
      });
      queryClient.invalidateQueries({ queryKey: ["taskThreads"] });
      toast.success("Task thread updated");
    },
    onError: (error) => {
      toast.error("Failed to update task thread", {
        description: getErrorMessage(error),
      });
    },
  });
}

export function useCloseTaskThread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { threadId: string; closedReason?: string }) =>
      closeTaskThreadFn({ data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["taskThread", variables.threadId],
      });
      queryClient.invalidateQueries({ queryKey: ["taskThreads"] });
      toast.success("Task thread closed");
    },
    onError: (error) => {
      toast.error("Failed to close task thread", {
        description: getErrorMessage(error),
      });
    },
  });
}

export function useResolveTaskThread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { threadId: string; closedReason?: string }) =>
      resolveTaskThreadFn({ data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["taskThread", variables.threadId],
      });
      queryClient.invalidateQueries({ queryKey: ["taskThreads"] });
      toast.success("Task thread resolved");
    },
    onError: (error) => {
      toast.error("Failed to resolve task thread", {
        description: getErrorMessage(error),
      });
    },
  });
}

export function useReopenTaskThread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (threadId: string) => reopenTaskThreadFn({ data: { threadId } }),
    onSuccess: (_, threadId) => {
      queryClient.invalidateQueries({ queryKey: ["taskThread", threadId] });
      queryClient.invalidateQueries({ queryKey: ["taskThreads"] });
      toast.success("Task thread reopened");
    },
    onError: (error) => {
      toast.error("Failed to reopen task thread", {
        description: getErrorMessage(error),
      });
    },
  });
}

// =============================================================================
// Task Thread Message Hooks
// =============================================================================

export function useTaskThreadMessages(
  threadId: string,
  limit: number = 50,
  offset: number = 0
) {
  return useQuery({
    ...taskThreadMessagesQueryOptions(threadId, limit, offset),
    enabled: !!threadId,
  });
}

export function useSendTaskThreadMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      threadId: string;
      content: string;
      originalMessageId?: string;
    }) => sendTaskThreadMessageFn({ data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["taskThreadMessages", variables.threadId],
      });
      queryClient.invalidateQueries({
        queryKey: ["taskThread", variables.threadId],
      });
      queryClient.invalidateQueries({ queryKey: ["taskThreads", "user"] });
    },
    onError: (error) => {
      toast.error("Failed to send message", {
        description: getErrorMessage(error),
      });
    },
  });
}

export function useMarkThreadMessagesAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (threadId: string) =>
      markThreadMessagesAsReadFn({ data: { threadId } }),
    onSuccess: (_, threadId) => {
      queryClient.invalidateQueries({
        queryKey: ["taskThreadMessages", threadId],
      });
      queryClient.invalidateQueries({ queryKey: ["unreadThreadCount"] });
    },
    onError: (error) => {
      console.error("Failed to mark messages as read:", getErrorMessage(error));
    },
  });
}

// =============================================================================
// Task Thread Participant Hooks
// =============================================================================

export function useThreadParticipants(threadId: string) {
  return useQuery({
    ...threadParticipantsQueryOptions(threadId),
    enabled: !!threadId,
  });
}

export function useAddThreadParticipant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { threadId: string; userId: string }) =>
      addThreadParticipantFn({ data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["threadParticipants", variables.threadId],
      });
      queryClient.invalidateQueries({
        queryKey: ["taskThread", variables.threadId],
      });
      toast.success("Participant added");
    },
    onError: (error) => {
      toast.error("Failed to add participant", {
        description: getErrorMessage(error),
      });
    },
  });
}

export function useLeaveThread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (threadId: string) => leaveThreadFn({ data: { threadId } }),
    onSuccess: (_, threadId) => {
      queryClient.invalidateQueries({
        queryKey: ["threadParticipants", threadId],
      });
      queryClient.invalidateQueries({ queryKey: ["taskThreads", "user"] });
      toast.success("Left thread");
    },
    onError: (error) => {
      toast.error("Failed to leave thread", {
        description: getErrorMessage(error),
      });
    },
  });
}

export function useToggleThreadMute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { threadId: string; isMuted: boolean }) =>
      toggleThreadMuteFn({ data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["threadParticipants", variables.threadId],
      });
      toast.success(variables.isMuted ? "Thread muted" : "Thread unmuted");
    },
    onError: (error) => {
      toast.error("Failed to update mute status", {
        description: getErrorMessage(error),
      });
    },
  });
}

// =============================================================================
// Utility Hooks
// =============================================================================

export function useUnreadThreadCount() {
  return useQuery(unreadThreadCountQueryOptions());
}
