/**
 * Task Reminders Server Functions
 *
 * Server functions for managing task reminder preferences, viewing logs,
 * and controlling task-specific reminder settings (snooze, mute).
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authenticatedMiddleware } from "./middleware";
import {
  getOrCreateTaskReminderPreference,
  updateTaskReminderPreference,
  enableTaskReminders,
  disableTaskReminders,
  setTaskReminderSupervisor,
  findUserTaskReminderLogs,
  findTaskReminderLogsByTask,
  getUserReminderStats,
  snoozeTaskReminders,
  muteTaskReminders,
  findTaskReminderState,
  resetTaskReminderState,
  getActiveTaskReminderStates,
} from "~/data-access/task-reminders";

// =============================================================================
// Preference Management Functions
// =============================================================================

/**
 * Get task reminder preferences for the authenticated user
 */
export const getTaskReminderPreferenceFn = createServerFn({
  method: "GET",
})
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    const preference = await getOrCreateTaskReminderPreference(context.userId);
    return preference;
  });

/**
 * Update task reminder preferences
 */
export const updateTaskReminderPreferenceFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      isEnabled: z.boolean().optional(),
      upcomingReminderHours: z.number().min(1).max(168).optional(), // 1 hour to 7 days
      overdueReminderFrequency: z.number().min(1).max(168).optional(),
      maxRemindersPerTask: z.number().min(1).max(20).optional(),
      timezone: z.string().optional(),
      quietHours: z.string().optional(), // JSON string
      workingDays: z.string().optional(), // JSON string
      enableEscalation: z.boolean().optional(),
      escalationAfterHours: z.number().min(1).max(336).optional(), // Up to 14 days
      supervisorId: z.string().nullable().optional(),
      deliveryMethod: z.enum(["push", "email", "both", "in_app"]).optional(),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // First ensure preference exists
    await getOrCreateTaskReminderPreference(context.userId);

    // Update with provided values
    const updated = await updateTaskReminderPreference(context.userId, data);

    if (!updated) {
      throw new Error("Failed to update task reminder preferences");
    }

    return updated;
  });

/**
 * Enable task reminders for the authenticated user
 */
export const enableTaskRemindersFn = createServerFn({
  method: "POST",
})
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    // Ensure preference exists
    await getOrCreateTaskReminderPreference(context.userId);

    const updated = await enableTaskReminders(context.userId);

    if (!updated) {
      throw new Error("Failed to enable task reminders");
    }

    return updated;
  });

/**
 * Disable task reminders for the authenticated user
 */
export const disableTaskRemindersFn = createServerFn({
  method: "POST",
})
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    // Ensure preference exists
    await getOrCreateTaskReminderPreference(context.userId);

    const updated = await disableTaskReminders(context.userId);

    if (!updated) {
      throw new Error("Failed to disable task reminders");
    }

    return updated;
  });

/**
 * Set supervisor for task reminder escalation
 */
export const setTaskReminderSupervisorFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      supervisorId: z.string().nullable(),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // Ensure preference exists
    await getOrCreateTaskReminderPreference(context.userId);

    const updated = await setTaskReminderSupervisor(context.userId, data.supervisorId);

    if (!updated) {
      throw new Error("Failed to set supervisor");
    }

    return updated;
  });

// =============================================================================
// Reminder Log Functions
// =============================================================================

/**
 * Get task reminder logs for the authenticated user
 */
export const getTaskReminderLogsFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      limit: z.number().optional().default(20),
      offset: z.number().optional().default(0),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    return await findUserTaskReminderLogs(context.userId, data.limit, data.offset);
  });

/**
 * Get reminder logs for a specific task
 */
export const getTaskReminderLogsByTaskFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      taskId: z.number(),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    return await findTaskReminderLogsByTask(context.userId, data.taskId);
  });

/**
 * Get reminder statistics for the authenticated user
 */
export const getTaskReminderStatsFn = createServerFn({
  method: "GET",
})
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    return await getUserReminderStats(context.userId);
  });

// =============================================================================
// Task-Specific Reminder Control Functions
// =============================================================================

/**
 * Snooze reminders for a specific task
 */
export const snoozeTaskRemindersFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      taskId: z.number(),
      hours: z.number().min(1).max(168), // 1 hour to 7 days
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const until = new Date(Date.now() + data.hours * 60 * 60 * 1000);

    const updated = await snoozeTaskReminders(context.userId, data.taskId, until);

    if (!updated) {
      throw new Error("Failed to snooze task reminders");
    }

    return {
      success: true,
      snoozedUntil: until.toISOString(),
      taskId: data.taskId,
    };
  });

/**
 * Mute reminders for a specific task
 */
export const muteTaskRemindersFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      taskId: z.number(),
      muted: z.boolean().default(true),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const updated = await muteTaskReminders(context.userId, data.taskId, data.muted);

    if (!updated) {
      throw new Error("Failed to mute task reminders");
    }

    return {
      success: true,
      isMuted: data.muted,
      taskId: data.taskId,
    };
  });

/**
 * Get reminder state for a specific task
 */
export const getTaskReminderStateFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      taskId: z.number(),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const state = await findTaskReminderState(context.userId, data.taskId);
    return state;
  });

/**
 * Reset reminder state for a task (e.g., when task is completed)
 */
export const resetTaskReminderStateFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      taskId: z.number(),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const success = await resetTaskReminderState(context.userId, data.taskId);

    return {
      success,
      taskId: data.taskId,
    };
  });

/**
 * Get all active task reminder states for the user
 */
export const getActiveTaskReminderStatesFn = createServerFn({
  method: "GET",
})
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    return await getActiveTaskReminderStates(context.userId);
  });
