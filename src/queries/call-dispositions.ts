import { queryOptions } from "@tanstack/react-query";
import {
  getCallDispositionByIdFn,
  getCallDispositionByCallRecordIdFn,
  getCallDispositionsFn,
  getCallTaskByIdFn,
  getCallTasksByCallRecordFn,
  getMyAssignedTasksFn,
  type DispositionType,
  type TaskStatus,
  type TaskPriority,
} from "~/fn/call-dispositions";

// =============================================================================
// Call Disposition Queries
// =============================================================================

export const callDispositionQueryOptions = (dispositionId: string) =>
  queryOptions({
    queryKey: ["call-disposition", dispositionId],
    queryFn: () => getCallDispositionByIdFn({ data: { id: dispositionId } }),
    enabled: !!dispositionId,
  });

export const callDispositionByCallRecordQueryOptions = (callRecordId: string) =>
  queryOptions({
    queryKey: ["call-disposition", "call-record", callRecordId],
    queryFn: () => getCallDispositionByCallRecordIdFn({ data: { callRecordId } }),
    enabled: !!callRecordId,
  });

export interface CallDispositionsFilters {
  disposition?: DispositionType;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export const callDispositionsQueryOptions = (filters?: CallDispositionsFilters) =>
  queryOptions({
    queryKey: ["call-dispositions", filters],
    queryFn: () =>
      getCallDispositionsFn({
        data: {
          disposition: filters?.disposition,
          startDate: filters?.startDate,
          endDate: filters?.endDate,
          limit: filters?.limit || 50,
          offset: filters?.offset || 0,
        },
      }),
  });

// =============================================================================
// Call Task Queries
// =============================================================================

export const callTaskQueryOptions = (taskId: string) =>
  queryOptions({
    queryKey: ["call-task", taskId],
    queryFn: () => getCallTaskByIdFn({ data: { id: taskId } }),
    enabled: !!taskId,
  });

export const callTasksByCallRecordQueryOptions = (callRecordId: string) =>
  queryOptions({
    queryKey: ["call-tasks", "call-record", callRecordId],
    queryFn: () => getCallTasksByCallRecordFn({ data: { callRecordId } }),
    enabled: !!callRecordId,
  });

export interface MyAssignedTasksFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  limit?: number;
}

export const myAssignedTasksQueryOptions = (filters?: MyAssignedTasksFilters) =>
  queryOptions({
    queryKey: ["call-tasks", "my-assigned", filters],
    queryFn: () =>
      getMyAssignedTasksFn({
        data: {
          status: filters?.status,
          priority: filters?.priority,
          limit: filters?.limit || 50,
        },
      }),
  });
