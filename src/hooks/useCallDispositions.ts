import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  callDispositionQueryOptions,
  callDispositionByCallRecordQueryOptions,
  callDispositionsQueryOptions,
  callTaskQueryOptions,
  callTasksByCallRecordQueryOptions,
  myAssignedTasksQueryOptions,
  type CallDispositionsFilters,
  type MyAssignedTasksFilters,
} from "~/queries/call-dispositions";
import {
  createCallDispositionFn,
  updateCallDispositionFn,
  deleteCallDispositionFn,
  createCallTaskFn,
  updateCallTaskFn,
  deleteCallTaskFn,
  completeCallTaskFn,
  type DispositionType,
  type TaskPriority,
  type TaskStatus,
  type CustomerSentiment,
} from "~/fn/call-dispositions";
import { getErrorMessage } from "~/utils/error";

// =============================================================================
// Call Disposition Query Hooks
// =============================================================================

export function useCallDisposition(dispositionId: string, enabled = true) {
  return useQuery({
    ...callDispositionQueryOptions(dispositionId),
    enabled: enabled && !!dispositionId,
  });
}

export function useCallDispositionByCallRecord(callRecordId: string, enabled = true) {
  return useQuery({
    ...callDispositionByCallRecordQueryOptions(callRecordId),
    enabled: enabled && !!callRecordId,
  });
}

export function useCallDispositions(filters?: CallDispositionsFilters, enabled = true) {
  return useQuery({
    ...callDispositionsQueryOptions(filters),
    enabled,
  });
}

// =============================================================================
// Call Disposition Mutation Hooks
// =============================================================================

interface CreateCallDispositionData {
  callRecordId: string;
  disposition: DispositionType;
  notes?: string;
  customerSentiment?: CustomerSentiment;
  followUpDate?: string;
  followUpReason?: string;
  escalationReason?: string;
  escalationPriority?: TaskPriority;
  escalatedTo?: string;
}

export function useCreateCallDisposition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCallDispositionData) => createCallDispositionFn({ data }),
    onSuccess: (_, variables) => {
      toast.success("Disposition saved successfully!", {
        description: "The call disposition has been recorded.",
      });
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ["call-dispositions"] });
      queryClient.invalidateQueries({ queryKey: ["call-disposition", "call-record", variables.callRecordId] });
    },
    onError: (error) => {
      toast.error("Failed to save disposition", {
        description: getErrorMessage(error),
      });
    },
  });
}

interface UpdateCallDispositionData {
  id: string;
  disposition?: DispositionType;
  notes?: string;
  customerSentiment?: CustomerSentiment;
  followUpDate?: string;
  followUpReason?: string;
  escalationReason?: string;
  escalationPriority?: TaskPriority;
  escalatedTo?: string;
}

export function useUpdateCallDisposition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateCallDispositionData) => updateCallDispositionFn({ data }),
    onSuccess: (_, variables) => {
      toast.success("Disposition updated successfully!");
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ["call-dispositions"] });
      queryClient.invalidateQueries({ queryKey: ["call-disposition", variables.id] });
    },
    onError: (error) => {
      toast.error("Failed to update disposition", {
        description: getErrorMessage(error),
      });
    },
  });
}

export function useDeleteCallDisposition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteCallDispositionFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Disposition deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["call-dispositions"] });
      queryClient.invalidateQueries({ queryKey: ["call-disposition"] });
    },
    onError: (error) => {
      toast.error("Failed to delete disposition", {
        description: getErrorMessage(error),
      });
    },
  });
}

// =============================================================================
// Call Task Query Hooks
// =============================================================================

export function useCallTask(taskId: string, enabled = true) {
  return useQuery({
    ...callTaskQueryOptions(taskId),
    enabled: enabled && !!taskId,
  });
}

export function useCallTasksByCallRecord(callRecordId: string, enabled = true) {
  return useQuery({
    ...callTasksByCallRecordQueryOptions(callRecordId),
    enabled: enabled && !!callRecordId,
  });
}

export function useMyAssignedTasks(filters?: MyAssignedTasksFilters, enabled = true) {
  return useQuery({
    ...myAssignedTasksQueryOptions(filters),
    enabled,
  });
}

// =============================================================================
// Call Task Mutation Hooks
// =============================================================================

interface CreateCallTaskData {
  callRecordId: string;
  callDispositionId?: string;
  title: string;
  description?: string;
  priority?: TaskPriority;
  assignedTo?: string;
  dueDate?: string;
}

export function useCreateCallTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCallTaskData) => createCallTaskFn({ data }),
    onSuccess: (_, variables) => {
      toast.success("Task created successfully!", {
        description: "The task has been added to the list.",
      });
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ["call-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["call-tasks", "call-record", variables.callRecordId] });
    },
    onError: (error) => {
      toast.error("Failed to create task", {
        description: getErrorMessage(error),
      });
    },
  });
}

interface UpdateCallTaskData {
  id: string;
  title?: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  assignedTo?: string;
  dueDate?: string;
}

export function useUpdateCallTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateCallTaskData) => updateCallTaskFn({ data }),
    onSuccess: (_, variables) => {
      toast.success("Task updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["call-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["call-task", variables.id] });
    },
    onError: (error) => {
      toast.error("Failed to update task", {
        description: getErrorMessage(error),
      });
    },
  });
}

export function useCompleteCallTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => completeCallTaskFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Task completed!", {
        description: "The task has been marked as completed.",
      });
      queryClient.invalidateQueries({ queryKey: ["call-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["call-task"] });
    },
    onError: (error) => {
      toast.error("Failed to complete task", {
        description: getErrorMessage(error),
      });
    },
  });
}

export function useDeleteCallTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteCallTaskFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Task deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["call-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["call-task"] });
    },
    onError: (error) => {
      toast.error("Failed to delete task", {
        description: getErrorMessage(error),
      });
    },
  });
}
