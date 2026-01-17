/**
 * Task Reminders Data Access Layer
 *
 * Handles database operations for task reminder preferences, logs, and states.
 * Supports context-aware timing, escalation to supervisors, and delivery tracking.
 */

import { eq, desc, and, lt, gte, lte, or, isNull, count } from "drizzle-orm";
import { database } from "~/db";
import {
  taskReminderPreference,
  taskReminderLog,
  taskReminderState,
  user,
  type TaskReminderPreference,
  type CreateTaskReminderPreferenceData,
  type UpdateTaskReminderPreferenceData,
  type TaskReminderLog,
  type CreateTaskReminderLogData,
  type UpdateTaskReminderLogData,
  type TaskReminderState,
  type CreateTaskReminderStateData,
  type UpdateTaskReminderStateData,
  type TaskReminderStatus,
  type TaskReminderType,
  type User,
} from "~/db/schema";

// =============================================================================
// Types
// =============================================================================

export type {
  TaskReminderPreference,
  CreateTaskReminderPreferenceData,
  UpdateTaskReminderPreferenceData,
  TaskReminderLog,
  CreateTaskReminderLogData,
  UpdateTaskReminderLogData,
  TaskReminderState,
  CreateTaskReminderStateData,
  UpdateTaskReminderStateData,
  TaskReminderStatus,
  TaskReminderType,
};

export type TaskReminderPreferenceWithUser = TaskReminderPreference & {
  user: Pick<User, "id" | "name" | "email">;
  supervisor?: Pick<User, "id" | "name" | "email"> | null;
};

export type UserForTaskReminders = {
  userId: string;
  userName: string;
  userEmail: string;
  timezone: string;
  upcomingReminderHours: number;
  overdueReminderFrequency: number;
  maxRemindersPerTask: number;
  quietHours: { start: string; end: string } | null;
  workingDays: number[];
  enableEscalation: boolean;
  escalationAfterHours: number;
  supervisorId: string | null;
  supervisorName: string | null;
  supervisorEmail: string | null;
  deliveryMethod: string;
};

export type TaskForReminder = {
  taskId: number;
  taskName: string;
  taskDeadline: Date | null;
  projectId: number | null;
  projectName: string | null;
  hoursOverdue: number | null;
  assigneeId: number;
};

// =============================================================================
// Task Reminder Preference Operations
// =============================================================================

/**
 * Create a new task reminder preference for a user
 */
export async function createTaskReminderPreference(
  data: CreateTaskReminderPreferenceData
): Promise<TaskReminderPreference> {
  const [newPreference] = await database
    .insert(taskReminderPreference)
    .values(data)
    .returning();

  return newPreference;
}

/**
 * Find a task reminder preference by user ID
 */
export async function findTaskReminderPreference(
  userId: string
): Promise<TaskReminderPreference | null> {
  const [result] = await database
    .select()
    .from(taskReminderPreference)
    .where(eq(taskReminderPreference.userId, userId))
    .limit(1);

  return result || null;
}

/**
 * Get or create a task reminder preference for a user
 * Returns existing preference or creates a new one with defaults
 */
export async function getOrCreateTaskReminderPreference(
  userId: string
): Promise<TaskReminderPreference> {
  const existing = await findTaskReminderPreference(userId);
  if (existing) return existing;

  return createTaskReminderPreference({
    id: crypto.randomUUID(),
    userId,
    isEnabled: true,
    upcomingReminderHours: 24,
    overdueReminderFrequency: 24,
    maxRemindersPerTask: 5,
    timezone: "UTC",
    quietHours: '{"start":"22:00","end":"07:00"}',
    workingDays: "[1,2,3,4,5]",
    enableEscalation: true,
    escalationAfterHours: 48,
    deliveryMethod: "push",
  });
}

/**
 * Update a task reminder preference
 */
export async function updateTaskReminderPreference(
  userId: string,
  data: UpdateTaskReminderPreferenceData
): Promise<TaskReminderPreference | null> {
  const [updated] = await database
    .update(taskReminderPreference)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(taskReminderPreference.userId, userId))
    .returning();

  return updated || null;
}

/**
 * Enable task reminders for a user
 */
export async function enableTaskReminders(
  userId: string
): Promise<TaskReminderPreference | null> {
  return updateTaskReminderPreference(userId, { isEnabled: true });
}

/**
 * Disable task reminders for a user
 */
export async function disableTaskReminders(
  userId: string
): Promise<TaskReminderPreference | null> {
  return updateTaskReminderPreference(userId, { isEnabled: false });
}

/**
 * Set supervisor for escalation
 */
export async function setTaskReminderSupervisor(
  userId: string,
  supervisorId: string | null
): Promise<TaskReminderPreference | null> {
  return updateTaskReminderPreference(userId, { supervisorId });
}

/**
 * Delete a task reminder preference
 */
export async function deleteTaskReminderPreference(
  userId: string
): Promise<boolean> {
  const [deleted] = await database
    .delete(taskReminderPreference)
    .where(eq(taskReminderPreference.userId, userId))
    .returning();

  return deleted !== undefined;
}

/**
 * Find all enabled task reminder preferences with user info
 */
export async function findEnabledTaskReminderPreferences(): Promise<TaskReminderPreferenceWithUser[]> {
  // First, get all enabled preferences with their users
  const results = await database
    .select({
      id: taskReminderPreference.id,
      userId: taskReminderPreference.userId,
      isEnabled: taskReminderPreference.isEnabled,
      upcomingReminderHours: taskReminderPreference.upcomingReminderHours,
      overdueReminderFrequency: taskReminderPreference.overdueReminderFrequency,
      maxRemindersPerTask: taskReminderPreference.maxRemindersPerTask,
      timezone: taskReminderPreference.timezone,
      quietHours: taskReminderPreference.quietHours,
      workingDays: taskReminderPreference.workingDays,
      enableEscalation: taskReminderPreference.enableEscalation,
      escalationAfterHours: taskReminderPreference.escalationAfterHours,
      supervisorId: taskReminderPreference.supervisorId,
      deliveryMethod: taskReminderPreference.deliveryMethod,
      createdAt: taskReminderPreference.createdAt,
      updatedAt: taskReminderPreference.updatedAt,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    })
    .from(taskReminderPreference)
    .innerJoin(user, eq(taskReminderPreference.userId, user.id))
    .where(eq(taskReminderPreference.isEnabled, true));

  return results;
}

/**
 * Get users configured for task reminders processing
 */
export async function getUsersForTaskReminders(): Promise<UserForTaskReminders[]> {
  const enabledPreferences = await findEnabledTaskReminderPreferences();
  const usersForReminders: UserForTaskReminders[] = [];

  for (const pref of enabledPreferences) {
    // Parse quiet hours
    let quietHours: { start: string; end: string } | null = null;
    try {
      if (pref.quietHours) {
        quietHours = JSON.parse(pref.quietHours);
      }
    } catch {
      quietHours = { start: "22:00", end: "07:00" };
    }

    // Parse working days
    let workingDays: number[];
    try {
      workingDays = JSON.parse(pref.workingDays);
    } catch {
      workingDays = [1, 2, 3, 4, 5];
    }

    // Lookup supervisor if configured
    let supervisorName: string | null = null;
    let supervisorEmail: string | null = null;

    if (pref.supervisorId) {
      const [supervisor] = await database
        .select({ name: user.name, email: user.email })
        .from(user)
        .where(eq(user.id, pref.supervisorId))
        .limit(1);

      if (supervisor) {
        supervisorName = supervisor.name;
        supervisorEmail = supervisor.email;
      }
    }

    usersForReminders.push({
      userId: pref.userId,
      userName: pref.user.name,
      userEmail: pref.user.email,
      timezone: pref.timezone,
      upcomingReminderHours: pref.upcomingReminderHours,
      overdueReminderFrequency: pref.overdueReminderFrequency,
      maxRemindersPerTask: pref.maxRemindersPerTask,
      quietHours,
      workingDays,
      enableEscalation: pref.enableEscalation,
      escalationAfterHours: pref.escalationAfterHours,
      supervisorId: pref.supervisorId,
      supervisorName,
      supervisorEmail,
      deliveryMethod: pref.deliveryMethod,
    });
  }

  return usersForReminders;
}

/**
 * Count users with task reminders enabled
 */
export async function countEnabledTaskReminderUsers(): Promise<number> {
  const [result] = await database
    .select({ count: count() })
    .from(taskReminderPreference)
    .where(eq(taskReminderPreference.isEnabled, true));

  return result?.count ?? 0;
}

// =============================================================================
// Task Reminder Log Operations
// =============================================================================

/**
 * Create a new task reminder log entry
 */
export async function createTaskReminderLog(
  data: CreateTaskReminderLogData
): Promise<TaskReminderLog> {
  const [newLog] = await database
    .insert(taskReminderLog)
    .values(data)
    .returning();

  return newLog;
}

/**
 * Find a task reminder log by ID
 */
export async function findTaskReminderLogById(
  id: string
): Promise<TaskReminderLog | null> {
  const [result] = await database
    .select()
    .from(taskReminderLog)
    .where(eq(taskReminderLog.id, id))
    .limit(1);

  return result || null;
}

/**
 * Find task reminder logs for a user
 */
export async function findUserTaskReminderLogs(
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<TaskReminderLog[]> {
  const results = await database
    .select()
    .from(taskReminderLog)
    .where(eq(taskReminderLog.userId, userId))
    .orderBy(desc(taskReminderLog.scheduledFor))
    .limit(limit)
    .offset(offset);

  return results;
}

/**
 * Find task reminder logs for a specific task
 */
export async function findTaskReminderLogsByTask(
  userId: string,
  taskId: number
): Promise<TaskReminderLog[]> {
  const results = await database
    .select()
    .from(taskReminderLog)
    .where(
      and(
        eq(taskReminderLog.userId, userId),
        eq(taskReminderLog.taskId, taskId)
      )
    )
    .orderBy(desc(taskReminderLog.scheduledFor));

  return results;
}

/**
 * Update a task reminder log
 */
export async function updateTaskReminderLog(
  id: string,
  data: UpdateTaskReminderLogData
): Promise<TaskReminderLog | null> {
  const [updated] = await database
    .update(taskReminderLog)
    .set(data)
    .where(eq(taskReminderLog.id, id))
    .returning();

  return updated || null;
}

/**
 * Mark a task reminder log as sent
 */
export async function markReminderLogAsSent(
  id: string,
  pushMessageId?: string
): Promise<TaskReminderLog | null> {
  const [updated] = await database
    .update(taskReminderLog)
    .set({
      status: "sent",
      sentAt: new Date(),
      pushMessageId,
    })
    .where(eq(taskReminderLog.id, id))
    .returning();

  return updated || null;
}

/**
 * Mark a task reminder log as failed
 */
export async function markReminderLogAsFailed(
  id: string,
  errorMessage: string
): Promise<TaskReminderLog | null> {
  const log = await findTaskReminderLogById(id);
  if (!log) return null;

  const [updated] = await database
    .update(taskReminderLog)
    .set({
      status: "failed",
      errorMessage,
      retryCount: log.retryCount + 1,
    })
    .where(eq(taskReminderLog.id, id))
    .returning();

  return updated || null;
}

/**
 * Get recent reminder logs (for monitoring)
 */
export async function getRecentTaskReminderLogs(
  limit: number = 50
): Promise<TaskReminderLog[]> {
  const results = await database
    .select()
    .from(taskReminderLog)
    .orderBy(desc(taskReminderLog.createdAt))
    .limit(limit);

  return results;
}

/**
 * Get reminder statistics for a user
 */
export async function getUserReminderStats(userId: string): Promise<{
  total: number;
  sent: number;
  failed: number;
  pending: number;
  escalations: number;
}> {
  const logs = await findUserTaskReminderLogs(userId, 100);

  return {
    total: logs.length,
    sent: logs.filter((l) => l.status === "sent").length,
    failed: logs.filter((l) => l.status === "failed").length,
    pending: logs.filter((l) => l.status === "pending").length,
    escalations: logs.filter((l) => l.reminderType === "escalation").length,
  };
}

// =============================================================================
// Task Reminder State Operations
// =============================================================================

/**
 * Create a new task reminder state
 */
export async function createTaskReminderState(
  data: CreateTaskReminderStateData
): Promise<TaskReminderState> {
  const [newState] = await database
    .insert(taskReminderState)
    .values(data)
    .returning();

  return newState;
}

/**
 * Find a task reminder state by user and task
 */
export async function findTaskReminderState(
  userId: string,
  taskId: number
): Promise<TaskReminderState | null> {
  const [result] = await database
    .select()
    .from(taskReminderState)
    .where(
      and(
        eq(taskReminderState.userId, userId),
        eq(taskReminderState.taskId, taskId)
      )
    )
    .limit(1);

  return result || null;
}

/**
 * Get or create a task reminder state
 */
export async function getOrCreateTaskReminderState(
  userId: string,
  taskId: number
): Promise<TaskReminderState> {
  const existing = await findTaskReminderState(userId, taskId);
  if (existing) return existing;

  return createTaskReminderState({
    id: crypto.randomUUID(),
    userId,
    taskId,
    remindersSent: 0,
    currentEscalationLevel: 0,
    isMuted: false,
  });
}

/**
 * Update a task reminder state
 */
export async function updateTaskReminderState(
  userId: string,
  taskId: number,
  data: UpdateTaskReminderStateData
): Promise<TaskReminderState | null> {
  const [updated] = await database
    .update(taskReminderState)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(taskReminderState.userId, userId),
        eq(taskReminderState.taskId, taskId)
      )
    )
    .returning();

  return updated || null;
}

/**
 * Record a reminder was sent for a task
 */
export async function recordReminderSent(
  userId: string,
  taskId: number,
  reminderType: TaskReminderType
): Promise<TaskReminderState | null> {
  const state = await getOrCreateTaskReminderState(userId, taskId);

  const [updated] = await database
    .update(taskReminderState)
    .set({
      remindersSent: state.remindersSent + 1,
      lastReminderAt: new Date(),
      lastReminderType: reminderType,
      updatedAt: new Date(),
    })
    .where(eq(taskReminderState.id, state.id))
    .returning();

  return updated || null;
}

/**
 * Record an escalation for a task
 */
export async function recordEscalation(
  userId: string,
  taskId: number,
  newLevel: number
): Promise<TaskReminderState | null> {
  const state = await getOrCreateTaskReminderState(userId, taskId);

  const [updated] = await database
    .update(taskReminderState)
    .set({
      currentEscalationLevel: newLevel,
      lastEscalationAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(taskReminderState.id, state.id))
    .returning();

  return updated || null;
}

/**
 * Snooze reminders for a task
 */
export async function snoozeTaskReminders(
  userId: string,
  taskId: number,
  until: Date
): Promise<TaskReminderState | null> {
  const state = await getOrCreateTaskReminderState(userId, taskId);

  const [updated] = await database
    .update(taskReminderState)
    .set({
      snoozedUntil: until,
      updatedAt: new Date(),
    })
    .where(eq(taskReminderState.id, state.id))
    .returning();

  return updated || null;
}

/**
 * Mute reminders for a task
 */
export async function muteTaskReminders(
  userId: string,
  taskId: number,
  muted: boolean = true
): Promise<TaskReminderState | null> {
  const state = await getOrCreateTaskReminderState(userId, taskId);

  const [updated] = await database
    .update(taskReminderState)
    .set({
      isMuted: muted,
      updatedAt: new Date(),
    })
    .where(eq(taskReminderState.id, state.id))
    .returning();

  return updated || null;
}

/**
 * Check if a reminder should be sent for a task
 * Considers: max reminders, snooze, mute, and timing since last reminder
 */
export async function shouldSendReminder(
  userId: string,
  taskId: number,
  userConfig: UserForTaskReminders,
  isOverdue: boolean
): Promise<{ shouldSend: boolean; reason: string }> {
  const state = await findTaskReminderState(userId, taskId);

  // No state means first reminder
  if (!state) {
    return { shouldSend: true, reason: "First reminder for task" };
  }

  // Check if muted
  if (state.isMuted) {
    return { shouldSend: false, reason: "Task reminders are muted" };
  }

  // Check if snoozed
  if (state.snoozedUntil && state.snoozedUntil > new Date()) {
    return { shouldSend: false, reason: `Snoozed until ${state.snoozedUntil.toISOString()}` };
  }

  // Check max reminders
  if (state.remindersSent >= userConfig.maxRemindersPerTask) {
    return { shouldSend: false, reason: "Max reminders reached for task" };
  }

  // Check timing since last reminder
  if (state.lastReminderAt) {
    const hoursSinceLastReminder = (Date.now() - state.lastReminderAt.getTime()) / (1000 * 60 * 60);

    if (isOverdue) {
      // For overdue tasks, check frequency
      if (hoursSinceLastReminder < userConfig.overdueReminderFrequency) {
        return {
          shouldSend: false,
          reason: `Only ${hoursSinceLastReminder.toFixed(1)} hours since last reminder (frequency: ${userConfig.overdueReminderFrequency}h)`,
        };
      }
    } else {
      // For upcoming tasks, don't send multiple reminders
      return { shouldSend: false, reason: "Upcoming reminder already sent" };
    }
  }

  return { shouldSend: true, reason: "All conditions met" };
}

/**
 * Check if escalation should be triggered
 */
export async function shouldEscalate(
  userId: string,
  taskId: number,
  userConfig: UserForTaskReminders,
  hoursOverdue: number
): Promise<{ shouldEscalate: boolean; newLevel: number; reason: string }> {
  // Check if escalation is enabled and supervisor is configured
  if (!userConfig.enableEscalation || !userConfig.supervisorId) {
    return { shouldEscalate: false, newLevel: 0, reason: "Escalation not enabled or no supervisor" };
  }

  // Check if overdue enough for escalation
  if (hoursOverdue < userConfig.escalationAfterHours) {
    return {
      shouldEscalate: false,
      newLevel: 0,
      reason: `Only ${hoursOverdue}h overdue (threshold: ${userConfig.escalationAfterHours}h)`,
    };
  }

  const state = await findTaskReminderState(userId, taskId);
  const currentLevel = state?.currentEscalationLevel ?? 0;

  // Max escalation level is 3
  if (currentLevel >= 3) {
    return { shouldEscalate: false, newLevel: currentLevel, reason: "Max escalation level reached" };
  }

  // Check if enough time has passed since last escalation
  if (state?.lastEscalationAt) {
    const hoursSinceLastEscalation = (Date.now() - state.lastEscalationAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceLastEscalation < userConfig.escalationAfterHours) {
      return {
        shouldEscalate: false,
        newLevel: currentLevel,
        reason: `Only ${hoursSinceLastEscalation.toFixed(1)}h since last escalation`,
      };
    }
  }

  return {
    shouldEscalate: true,
    newLevel: currentLevel + 1,
    reason: `Task overdue for ${hoursOverdue}h, escalating to level ${currentLevel + 1}`,
  };
}

/**
 * Reset task reminder state (e.g., when task is completed)
 */
export async function resetTaskReminderState(
  userId: string,
  taskId: number
): Promise<boolean> {
  const [deleted] = await database
    .delete(taskReminderState)
    .where(
      and(
        eq(taskReminderState.userId, userId),
        eq(taskReminderState.taskId, taskId)
      )
    )
    .returning();

  return deleted !== undefined;
}

/**
 * Get all active (non-muted, non-snoozed) task reminder states for a user
 */
export async function getActiveTaskReminderStates(
  userId: string
): Promise<TaskReminderState[]> {
  const now = new Date();

  const results = await database
    .select()
    .from(taskReminderState)
    .where(
      and(
        eq(taskReminderState.userId, userId),
        eq(taskReminderState.isMuted, false),
        or(
          isNull(taskReminderState.snoozedUntil),
          lte(taskReminderState.snoozedUntil, now)
        )
      )
    );

  return results;
}

// =============================================================================
// Timezone Utility Functions
// =============================================================================

/**
 * Get current time in a specific timezone
 */
export function getTimeInTimezone(date: Date, timezone: string): Date {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    const parts = formatter.formatToParts(date);
    const values: Record<string, string> = {};
    parts.forEach((part) => {
      values[part.type] = part.value;
    });

    return new Date(
      parseInt(values.year),
      parseInt(values.month) - 1,
      parseInt(values.day),
      parseInt(values.hour),
      parseInt(values.minute),
      parseInt(values.second)
    );
  } catch {
    console.warn(`Invalid timezone: ${timezone}, falling back to UTC`);
    return date;
  }
}

/**
 * Get the day of week (0-6, where 0=Sunday) in a specific timezone
 */
export function getDayInTimezone(date: Date, timezone: string): number {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
    });

    const dayName = formatter.format(date);
    const dayMap: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };

    return dayMap[dayName] ?? date.getDay();
  } catch {
    return date.getDay();
  }
}

/**
 * Check if current time is within quiet hours
 */
export function isWithinQuietHours(
  timezone: string,
  quietHours: { start: string; end: string } | null
): boolean {
  if (!quietHours) return false;

  const now = getTimeInTimezone(new Date(), timezone);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startHour, startMinute] = quietHours.start.split(":").map(Number);
  const [endHour, endMinute] = quietHours.end.split(":").map(Number);

  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;

  // Handle overnight quiet hours (e.g., 22:00 to 07:00)
  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  }

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

/**
 * Check if current day is a working day for the user
 */
export function isWorkingDay(timezone: string, workingDays: number[]): boolean {
  const currentDay = getDayInTimezone(new Date(), timezone);
  return workingDays.includes(currentDay);
}
