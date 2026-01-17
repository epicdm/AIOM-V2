import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authenticatedMiddleware } from "./middleware";
import {
  createCallDisposition,
  updateCallDisposition,
  deleteCallDisposition,
  findCallDispositionById,
  findCallDispositionByCallRecordId,
  findCallDispositionByIdWithRelations,
  getAllCallDispositions,
  createCallTask,
  updateCallTask,
  deleteCallTask,
  findCallTaskById,
  getCallTasksByCallRecord,
  completeCallTask,
  getCallTasksAssignedTo,
} from "~/data-access/call-dispositions";
import { findCallRecordById } from "~/data-access/call-records";

// Disposition types
export const DISPOSITION_TYPES = ["resolved", "follow_up_needed", "escalate"] as const;
export type DispositionType = (typeof DISPOSITION_TYPES)[number];

// Task priority types
export const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

// Task status types
export const TASK_STATUSES = ["pending", "in_progress", "completed", "cancelled"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

// Customer sentiment types
export const CUSTOMER_SENTIMENTS = ["positive", "neutral", "negative"] as const;
export type CustomerSentiment = (typeof CUSTOMER_SENTIMENTS)[number];

// =============================================================================
// Call Disposition Server Functions
// =============================================================================

const createCallDispositionSchema = z.object({
  callRecordId: z.string().min(1, "Call record ID is required"),
  disposition: z.enum(DISPOSITION_TYPES),
  notes: z.string().max(5000, "Notes must be less than 5000 characters").optional().or(z.literal("")),
  customerSentiment: z.enum(CUSTOMER_SENTIMENTS).optional(),
  followUpDate: z.string().datetime().optional().or(z.literal("")),
  followUpReason: z.string().max(1000, "Follow-up reason must be less than 1000 characters").optional().or(z.literal("")),
  escalationReason: z.string().max(1000, "Escalation reason must be less than 1000 characters").optional().or(z.literal("")),
  escalationPriority: z.enum(TASK_PRIORITIES).optional(),
  escalatedTo: z.string().optional().or(z.literal("")),
});

export const createCallDispositionFn = createServerFn({
  method: "POST",
})
  .inputValidator(createCallDispositionSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // Verify the call record exists
    const callRecord = await findCallRecordById(data.callRecordId);
    if (!callRecord) {
      throw new Error("Call record not found");
    }

    // Check if disposition already exists for this call
    const existingDisposition = await findCallDispositionByCallRecordId(data.callRecordId);
    if (existingDisposition) {
      throw new Error("A disposition already exists for this call. Please update the existing one.");
    }

    const dispositionData = {
      id: crypto.randomUUID(),
      callRecordId: data.callRecordId,
      userId: context.userId,
      disposition: data.disposition,
      notes: data.notes || null,
      customerSentiment: data.customerSentiment || null,
      followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
      followUpReason: data.followUpReason || null,
      escalationReason: data.escalationReason || null,
      escalationPriority: data.escalationPriority || null,
      escalatedTo: data.escalatedTo || null,
    };

    const newDisposition = await createCallDisposition(dispositionData);
    return newDisposition;
  });

export const getCallDispositionByIdFn = createServerFn({
  method: "GET",
})
  .inputValidator(z.object({ id: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    const disposition = await findCallDispositionByIdWithRelations(data.id);
    if (!disposition) {
      throw new Error("Call disposition not found");
    }
    return disposition;
  });

export const getCallDispositionByCallRecordIdFn = createServerFn({
  method: "GET",
})
  .inputValidator(z.object({ callRecordId: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    const disposition = await findCallDispositionByCallRecordId(data.callRecordId);
    return disposition;
  });

export const getCallDispositionsFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      disposition: z.enum(DISPOSITION_TYPES).optional(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      limit: z.number().int().positive().max(100).optional().default(50),
      offset: z.number().int().min(0).optional().default(0),
    }).optional()
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const filters = {
      userId: context.userId,
      disposition: data?.disposition,
      startDate: data?.startDate ? new Date(data.startDate) : undefined,
      endDate: data?.endDate ? new Date(data.endDate) : undefined,
      limit: data?.limit || 50,
      offset: data?.offset || 0,
    };
    return await getAllCallDispositions(filters);
  });

const updateCallDispositionSchema = z.object({
  id: z.string(),
  disposition: z.enum(DISPOSITION_TYPES).optional(),
  notes: z.string().max(5000, "Notes must be less than 5000 characters").optional().or(z.literal("")),
  customerSentiment: z.enum(CUSTOMER_SENTIMENTS).optional(),
  followUpDate: z.string().datetime().optional().or(z.literal("")),
  followUpReason: z.string().max(1000).optional().or(z.literal("")),
  escalationReason: z.string().max(1000).optional().or(z.literal("")),
  escalationPriority: z.enum(TASK_PRIORITIES).optional(),
  escalatedTo: z.string().optional().or(z.literal("")),
});

export const updateCallDispositionFn = createServerFn({
  method: "POST",
})
  .inputValidator(updateCallDispositionSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // Check disposition exists
    const existingDisposition = await findCallDispositionById(data.id);
    if (!existingDisposition) {
      throw new Error("Call disposition not found");
    }

    const updateData = {
      disposition: data.disposition,
      notes: data.notes === "" ? null : data.notes,
      customerSentiment: data.customerSentiment,
      followUpDate: data.followUpDate ? new Date(data.followUpDate) : undefined,
      followUpReason: data.followUpReason === "" ? null : data.followUpReason,
      escalationReason: data.escalationReason === "" ? null : data.escalationReason,
      escalationPriority: data.escalationPriority,
      escalatedTo: data.escalatedTo === "" ? null : data.escalatedTo,
    };

    // Remove undefined values
    const cleanedData = Object.fromEntries(
      Object.entries(updateData).filter(([_, v]) => v !== undefined)
    );

    const updatedDisposition = await updateCallDisposition(data.id, cleanedData);
    return updatedDisposition;
  });

export const deleteCallDispositionFn = createServerFn({
  method: "POST",
})
  .inputValidator(z.object({ id: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const existingDisposition = await findCallDispositionById(data.id);
    if (!existingDisposition) {
      throw new Error("Call disposition not found");
    }

    await deleteCallDisposition(data.id);
    return { success: true };
  });

// =============================================================================
// Call Task Server Functions
// =============================================================================

const createCallTaskSchema = z.object({
  callRecordId: z.string().min(1, "Call record ID is required"),
  callDispositionId: z.string().optional(),
  title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  description: z.string().max(2000, "Description must be less than 2000 characters").optional().or(z.literal("")),
  priority: z.enum(TASK_PRIORITIES).optional().default("medium"),
  assignedTo: z.string().optional().or(z.literal("")),
  dueDate: z.string().datetime().optional().or(z.literal("")),
});

export const createCallTaskFn = createServerFn({
  method: "POST",
})
  .inputValidator(createCallTaskSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // Verify the call record exists
    const callRecord = await findCallRecordById(data.callRecordId);
    if (!callRecord) {
      throw new Error("Call record not found");
    }

    const taskData = {
      id: crypto.randomUUID(),
      callRecordId: data.callRecordId,
      callDispositionId: data.callDispositionId || null,
      userId: context.userId,
      title: data.title,
      description: data.description || null,
      priority: data.priority || "medium",
      status: "pending" as const,
      assignedTo: data.assignedTo || null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
    };

    const newTask = await createCallTask(taskData);
    return newTask;
  });

export const getCallTaskByIdFn = createServerFn({
  method: "GET",
})
  .inputValidator(z.object({ id: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    const task = await findCallTaskById(data.id);
    if (!task) {
      throw new Error("Task not found");
    }
    return task;
  });

export const getCallTasksByCallRecordFn = createServerFn({
  method: "GET",
})
  .inputValidator(z.object({ callRecordId: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    return await getCallTasksByCallRecord(data.callRecordId);
  });

export const getMyAssignedTasksFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      status: z.enum(TASK_STATUSES).optional(),
      priority: z.enum(TASK_PRIORITIES).optional(),
      limit: z.number().int().positive().max(100).optional().default(50),
    }).optional()
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    return await getCallTasksAssignedTo(context.userId, {
      status: data?.status,
      priority: data?.priority,
      limit: data?.limit || 50,
    });
  });

const updateCallTaskSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().or(z.literal("")),
  priority: z.enum(TASK_PRIORITIES).optional(),
  status: z.enum(TASK_STATUSES).optional(),
  assignedTo: z.string().optional().or(z.literal("")),
  dueDate: z.string().datetime().optional().or(z.literal("")),
});

export const updateCallTaskFn = createServerFn({
  method: "POST",
})
  .inputValidator(updateCallTaskSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const existingTask = await findCallTaskById(data.id);
    if (!existingTask) {
      throw new Error("Task not found");
    }

    const updateData = {
      title: data.title,
      description: data.description === "" ? null : data.description,
      priority: data.priority,
      status: data.status,
      assignedTo: data.assignedTo === "" ? null : data.assignedTo,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    };

    // Remove undefined values
    const cleanedData = Object.fromEntries(
      Object.entries(updateData).filter(([_, v]) => v !== undefined)
    );

    const updatedTask = await updateCallTask(data.id, cleanedData);
    return updatedTask;
  });

export const completeCallTaskFn = createServerFn({
  method: "POST",
})
  .inputValidator(z.object({ id: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const existingTask = await findCallTaskById(data.id);
    if (!existingTask) {
      throw new Error("Task not found");
    }

    const completedTask = await completeCallTask(data.id, context.userId);
    return completedTask;
  });

export const deleteCallTaskFn = createServerFn({
  method: "POST",
})
  .inputValidator(z.object({ id: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const existingTask = await findCallTaskById(data.id);
    if (!existingTask) {
      throw new Error("Task not found");
    }

    await deleteCallTask(data.id);
    return { success: true };
  });
