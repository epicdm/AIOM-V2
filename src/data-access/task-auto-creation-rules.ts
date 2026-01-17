/**
 * Task Auto-Creation Rules Data Access Layer
 *
 * Handles database operations for task auto-creation rules and execution logs.
 * Supports rule management, condition evaluation, and execution tracking.
 */

import { eq, desc, and, gte, lte, or, count, sql } from "drizzle-orm";
import { database } from "~/db";
import {
  taskAutoCreationRule,
  taskRuleExecutionLog,
  user,
  type TaskAutoCreationRule,
  type CreateTaskAutoCreationRuleData,
  type UpdateTaskAutoCreationRuleData,
  type TaskRuleExecutionLog,
  type CreateTaskRuleExecutionLogData,
  type TaskRuleTriggerType,
  type TaskRuleStatus,
  type TaskRuleConditionOperator,
  type TaskTemplateConfig,
  type TaskRuleCondition,
  type TaskRuleConditionsConfig,
  type User,
} from "~/db/schema";

// =============================================================================
// Types
// =============================================================================

export type {
  TaskAutoCreationRule,
  CreateTaskAutoCreationRuleData,
  UpdateTaskAutoCreationRuleData,
  TaskRuleExecutionLog,
  CreateTaskRuleExecutionLogData,
  TaskRuleTriggerType,
  TaskRuleStatus,
  TaskRuleConditionOperator,
  TaskTemplateConfig,
  TaskRuleCondition,
  TaskRuleConditionsConfig,
};

export type TaskAutoCreationRuleWithCreator = TaskAutoCreationRule & {
  creator: Pick<User, "id" | "name" | "email">;
};

export type TaskRuleExecutionLogWithRule = TaskRuleExecutionLog & {
  rule: Pick<TaskAutoCreationRule, "id" | "name" | "triggerType">;
};

export type RuleStatistics = {
  totalRules: number;
  activeRules: number;
  pausedRules: number;
  disabledRules: number;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  executionsToday: number;
};

// =============================================================================
// Rule CRUD Operations
// =============================================================================

/**
 * Create a new task auto-creation rule
 */
export async function createTaskAutoCreationRule(
  data: CreateTaskAutoCreationRuleData
): Promise<TaskAutoCreationRule> {
  const [newRule] = await database
    .insert(taskAutoCreationRule)
    .values(data)
    .returning();

  return newRule;
}

/**
 * Find a rule by ID
 */
export async function findTaskAutoCreationRuleById(
  id: string
): Promise<TaskAutoCreationRule | null> {
  const [result] = await database
    .select()
    .from(taskAutoCreationRule)
    .where(eq(taskAutoCreationRule.id, id))
    .limit(1);

  return result || null;
}

/**
 * Find a rule by ID with creator info
 */
export async function findTaskAutoCreationRuleWithCreator(
  id: string
): Promise<TaskAutoCreationRuleWithCreator | null> {
  const result = await database
    .select({
      id: taskAutoCreationRule.id,
      name: taskAutoCreationRule.name,
      description: taskAutoCreationRule.description,
      createdBy: taskAutoCreationRule.createdBy,
      triggerType: taskAutoCreationRule.triggerType,
      conditions: taskAutoCreationRule.conditions,
      taskTemplate: taskAutoCreationRule.taskTemplate,
      status: taskAutoCreationRule.status,
      schedule: taskAutoCreationRule.schedule,
      lastTriggeredAt: taskAutoCreationRule.lastTriggeredAt,
      nextScheduledAt: taskAutoCreationRule.nextScheduledAt,
      cooldownMinutes: taskAutoCreationRule.cooldownMinutes,
      maxTriggersPerDay: taskAutoCreationRule.maxTriggersPerDay,
      triggersToday: taskAutoCreationRule.triggersToday,
      triggersResetAt: taskAutoCreationRule.triggersResetAt,
      priority: taskAutoCreationRule.priority,
      totalTriggered: taskAutoCreationRule.totalTriggered,
      totalTasksCreated: taskAutoCreationRule.totalTasksCreated,
      createdAt: taskAutoCreationRule.createdAt,
      updatedAt: taskAutoCreationRule.updatedAt,
      creator: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    })
    .from(taskAutoCreationRule)
    .innerJoin(user, eq(taskAutoCreationRule.createdBy, user.id))
    .where(eq(taskAutoCreationRule.id, id))
    .limit(1);

  return result[0] || null;
}

/**
 * Update a rule
 */
export async function updateTaskAutoCreationRule(
  id: string,
  data: UpdateTaskAutoCreationRuleData
): Promise<TaskAutoCreationRule | null> {
  const [updated] = await database
    .update(taskAutoCreationRule)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(taskAutoCreationRule.id, id))
    .returning();

  return updated || null;
}

/**
 * Delete a rule
 */
export async function deleteTaskAutoCreationRule(id: string): Promise<boolean> {
  const [deleted] = await database
    .delete(taskAutoCreationRule)
    .where(eq(taskAutoCreationRule.id, id))
    .returning();

  return deleted !== undefined;
}

/**
 * Find all rules by creator
 */
export async function findRulesByCreator(
  createdBy: string,
  options?: {
    status?: TaskRuleStatus;
    triggerType?: TaskRuleTriggerType;
    limit?: number;
    offset?: number;
  }
): Promise<TaskAutoCreationRule[]> {
  const conditions = [eq(taskAutoCreationRule.createdBy, createdBy)];

  if (options?.status) {
    conditions.push(eq(taskAutoCreationRule.status, options.status));
  }

  if (options?.triggerType) {
    conditions.push(eq(taskAutoCreationRule.triggerType, options.triggerType));
  }

  const results = await database
    .select()
    .from(taskAutoCreationRule)
    .where(and(...conditions))
    .orderBy(desc(taskAutoCreationRule.priority), desc(taskAutoCreationRule.createdAt))
    .limit(options?.limit ?? 50)
    .offset(options?.offset ?? 0);

  return results;
}

/**
 * Find all rules with optional filters
 */
export async function findAllRules(options?: {
  status?: TaskRuleStatus;
  triggerType?: TaskRuleTriggerType;
  limit?: number;
  offset?: number;
}): Promise<TaskAutoCreationRuleWithCreator[]> {
  const conditions: ReturnType<typeof eq>[] = [];

  if (options?.status) {
    conditions.push(eq(taskAutoCreationRule.status, options.status));
  }

  if (options?.triggerType) {
    conditions.push(eq(taskAutoCreationRule.triggerType, options.triggerType));
  }

  const query = database
    .select({
      id: taskAutoCreationRule.id,
      name: taskAutoCreationRule.name,
      description: taskAutoCreationRule.description,
      createdBy: taskAutoCreationRule.createdBy,
      triggerType: taskAutoCreationRule.triggerType,
      conditions: taskAutoCreationRule.conditions,
      taskTemplate: taskAutoCreationRule.taskTemplate,
      status: taskAutoCreationRule.status,
      schedule: taskAutoCreationRule.schedule,
      lastTriggeredAt: taskAutoCreationRule.lastTriggeredAt,
      nextScheduledAt: taskAutoCreationRule.nextScheduledAt,
      cooldownMinutes: taskAutoCreationRule.cooldownMinutes,
      maxTriggersPerDay: taskAutoCreationRule.maxTriggersPerDay,
      triggersToday: taskAutoCreationRule.triggersToday,
      triggersResetAt: taskAutoCreationRule.triggersResetAt,
      priority: taskAutoCreationRule.priority,
      totalTriggered: taskAutoCreationRule.totalTriggered,
      totalTasksCreated: taskAutoCreationRule.totalTasksCreated,
      createdAt: taskAutoCreationRule.createdAt,
      updatedAt: taskAutoCreationRule.updatedAt,
      creator: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    })
    .from(taskAutoCreationRule)
    .innerJoin(user, eq(taskAutoCreationRule.createdBy, user.id));

  const results =
    conditions.length > 0
      ? await query
          .where(and(...conditions))
          .orderBy(desc(taskAutoCreationRule.priority), desc(taskAutoCreationRule.createdAt))
          .limit(options?.limit ?? 50)
          .offset(options?.offset ?? 0)
      : await query
          .orderBy(desc(taskAutoCreationRule.priority), desc(taskAutoCreationRule.createdAt))
          .limit(options?.limit ?? 50)
          .offset(options?.offset ?? 0);

  return results;
}

/**
 * Find active rules by trigger type
 */
export async function findActiveRulesByTrigger(
  triggerType: TaskRuleTriggerType
): Promise<TaskAutoCreationRule[]> {
  const results = await database
    .select()
    .from(taskAutoCreationRule)
    .where(
      and(
        eq(taskAutoCreationRule.triggerType, triggerType),
        eq(taskAutoCreationRule.status, "active")
      )
    )
    .orderBy(desc(taskAutoCreationRule.priority));

  return results;
}

// =============================================================================
// Rule Status Operations
// =============================================================================

/**
 * Activate a rule
 */
export async function activateRule(id: string): Promise<TaskAutoCreationRule | null> {
  return updateTaskAutoCreationRule(id, { status: "active" });
}

/**
 * Pause a rule
 */
export async function pauseRule(id: string): Promise<TaskAutoCreationRule | null> {
  return updateTaskAutoCreationRule(id, { status: "paused" });
}

/**
 * Disable a rule
 */
export async function disableRule(id: string): Promise<TaskAutoCreationRule | null> {
  return updateTaskAutoCreationRule(id, { status: "disabled" });
}

/**
 * Archive a rule
 */
export async function archiveRule(id: string): Promise<TaskAutoCreationRule | null> {
  return updateTaskAutoCreationRule(id, { status: "archived" });
}

// =============================================================================
// Rule Trigger Operations
// =============================================================================

/**
 * Record that a rule was triggered
 */
export async function recordRuleTrigger(
  id: string,
  taskCreated: boolean = false
): Promise<TaskAutoCreationRule | null> {
  const rule = await findTaskAutoCreationRuleById(id);
  if (!rule) return null;

  const [updated] = await database
    .update(taskAutoCreationRule)
    .set({
      lastTriggeredAt: new Date(),
      totalTriggered: (rule.totalTriggered ?? 0) + 1,
      totalTasksCreated: taskCreated ? (rule.totalTasksCreated ?? 0) + 1 : (rule.totalTasksCreated ?? 0),
      triggersToday: (rule.triggersToday ?? 0) + 1,
      updatedAt: new Date(),
    })
    .where(eq(taskAutoCreationRule.id, id))
    .returning();

  return updated || null;
}

/**
 * Reset daily trigger counters for all rules
 */
export async function resetDailyTriggerCounters(): Promise<number> {
  const result = await database
    .update(taskAutoCreationRule)
    .set({
      triggersToday: 0,
      triggersResetAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return result.length;
}

/**
 * Check if a rule can be triggered (considering cooldown and daily limits)
 */
export async function canRuleBeTrigger(id: string): Promise<{
  canTrigger: boolean;
  reason: string;
}> {
  const rule = await findTaskAutoCreationRuleById(id);

  if (!rule) {
    return { canTrigger: false, reason: "Rule not found" };
  }

  if (rule.status !== "active") {
    return { canTrigger: false, reason: `Rule is ${rule.status}` };
  }

  // Check daily limit
  if (rule.maxTriggersPerDay && (rule.triggersToday ?? 0) >= rule.maxTriggersPerDay) {
    return { canTrigger: false, reason: "Daily trigger limit reached" };
  }

  // Check cooldown
  if (rule.cooldownMinutes && rule.cooldownMinutes > 0 && rule.lastTriggeredAt) {
    const cooldownMs = rule.cooldownMinutes * 60 * 1000;
    const timeSinceLastTrigger = Date.now() - rule.lastTriggeredAt.getTime();

    if (timeSinceLastTrigger < cooldownMs) {
      const remainingMs = cooldownMs - timeSinceLastTrigger;
      const remainingMinutes = Math.ceil(remainingMs / 60000);
      return {
        canTrigger: false,
        reason: `Cooldown active: ${remainingMinutes} minutes remaining`,
      };
    }
  }

  return { canTrigger: true, reason: "OK" };
}

// =============================================================================
// Execution Log Operations
// =============================================================================

/**
 * Create an execution log entry
 */
export async function createExecutionLog(
  data: CreateTaskRuleExecutionLogData
): Promise<TaskRuleExecutionLog> {
  const [newLog] = await database
    .insert(taskRuleExecutionLog)
    .values(data)
    .returning();

  return newLog;
}

/**
 * Find execution logs for a rule
 */
export async function findExecutionLogsByRule(
  ruleId: string,
  options?: {
    limit?: number;
    offset?: number;
    successOnly?: boolean;
  }
): Promise<TaskRuleExecutionLog[]> {
  const conditions = [eq(taskRuleExecutionLog.ruleId, ruleId)];

  if (options?.successOnly !== undefined) {
    conditions.push(eq(taskRuleExecutionLog.success, options.successOnly));
  }

  const results = await database
    .select()
    .from(taskRuleExecutionLog)
    .where(and(...conditions))
    .orderBy(desc(taskRuleExecutionLog.executedAt))
    .limit(options?.limit ?? 50)
    .offset(options?.offset ?? 0);

  return results;
}

/**
 * Find recent execution logs across all rules
 */
export async function findRecentExecutionLogs(
  options?: {
    limit?: number;
    offset?: number;
    since?: Date;
  }
): Promise<TaskRuleExecutionLogWithRule[]> {
  const conditions: ReturnType<typeof eq>[] = [];

  if (options?.since) {
    conditions.push(gte(taskRuleExecutionLog.executedAt, options.since));
  }

  const query = database
    .select({
      id: taskRuleExecutionLog.id,
      ruleId: taskRuleExecutionLog.ruleId,
      triggerData: taskRuleExecutionLog.triggerData,
      success: taskRuleExecutionLog.success,
      taskCreatedId: taskRuleExecutionLog.taskCreatedId,
      errorMessage: taskRuleExecutionLog.errorMessage,
      executedAt: taskRuleExecutionLog.executedAt,
      executionDurationMs: taskRuleExecutionLog.executionDurationMs,
      rule: {
        id: taskAutoCreationRule.id,
        name: taskAutoCreationRule.name,
        triggerType: taskAutoCreationRule.triggerType,
      },
    })
    .from(taskRuleExecutionLog)
    .innerJoin(taskAutoCreationRule, eq(taskRuleExecutionLog.ruleId, taskAutoCreationRule.id));

  const results =
    conditions.length > 0
      ? await query
          .where(and(...conditions))
          .orderBy(desc(taskRuleExecutionLog.executedAt))
          .limit(options?.limit ?? 50)
          .offset(options?.offset ?? 0)
      : await query
          .orderBy(desc(taskRuleExecutionLog.executedAt))
          .limit(options?.limit ?? 50)
          .offset(options?.offset ?? 0);

  return results;
}

/**
 * Count execution logs for a rule
 */
export async function countExecutionLogsByRule(
  ruleId: string,
  options?: {
    successOnly?: boolean;
    since?: Date;
  }
): Promise<number> {
  const conditions = [eq(taskRuleExecutionLog.ruleId, ruleId)];

  if (options?.successOnly !== undefined) {
    conditions.push(eq(taskRuleExecutionLog.success, options.successOnly));
  }

  if (options?.since) {
    conditions.push(gte(taskRuleExecutionLog.executedAt, options.since));
  }

  const [result] = await database
    .select({ count: count() })
    .from(taskRuleExecutionLog)
    .where(and(...conditions));

  return result?.count ?? 0;
}

// =============================================================================
// Statistics Operations
// =============================================================================

/**
 * Get overall statistics for task rules
 */
export async function getRuleStatistics(): Promise<RuleStatistics> {
  // Count rules by status
  const rulesCount = await database
    .select({
      status: taskAutoCreationRule.status,
      count: count(),
    })
    .from(taskAutoCreationRule)
    .groupBy(taskAutoCreationRule.status);

  // Count executions
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [execStats] = await database
    .select({
      total: count(),
      successful: sql<number>`SUM(CASE WHEN ${taskRuleExecutionLog.success} = true THEN 1 ELSE 0 END)`,
      failed: sql<number>`SUM(CASE WHEN ${taskRuleExecutionLog.success} = false THEN 1 ELSE 0 END)`,
    })
    .from(taskRuleExecutionLog);

  const [todayStats] = await database
    .select({ count: count() })
    .from(taskRuleExecutionLog)
    .where(gte(taskRuleExecutionLog.executedAt, today));

  const stats: RuleStatistics = {
    totalRules: 0,
    activeRules: 0,
    pausedRules: 0,
    disabledRules: 0,
    totalExecutions: execStats?.total ?? 0,
    successfulExecutions: Number(execStats?.successful ?? 0),
    failedExecutions: Number(execStats?.failed ?? 0),
    executionsToday: todayStats?.count ?? 0,
  };

  for (const row of rulesCount) {
    stats.totalRules += row.count;
    if (row.status === "active") stats.activeRules = row.count;
    if (row.status === "paused") stats.pausedRules = row.count;
    if (row.status === "disabled") stats.disabledRules = row.count;
  }

  return stats;
}

/**
 * Get statistics for a specific rule
 */
export async function getRuleStatisticsById(ruleId: string): Promise<{
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  lastExecution: Date | null;
  averageDurationMs: number | null;
}> {
  const [stats] = await database
    .select({
      total: count(),
      successful: sql<number>`SUM(CASE WHEN ${taskRuleExecutionLog.success} = true THEN 1 ELSE 0 END)`,
      failed: sql<number>`SUM(CASE WHEN ${taskRuleExecutionLog.success} = false THEN 1 ELSE 0 END)`,
      lastExecution: sql<Date>`MAX(${taskRuleExecutionLog.executedAt})`,
      avgDuration: sql<number>`AVG(${taskRuleExecutionLog.executionDurationMs})`,
    })
    .from(taskRuleExecutionLog)
    .where(eq(taskRuleExecutionLog.ruleId, ruleId));

  return {
    totalExecutions: stats?.total ?? 0,
    successfulExecutions: Number(stats?.successful ?? 0),
    failedExecutions: Number(stats?.failed ?? 0),
    lastExecution: stats?.lastExecution ?? null,
    averageDurationMs: stats?.avgDuration ? Math.round(stats.avgDuration) : null,
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Parse task template from JSON string
 */
export function parseTaskTemplate(json: string): TaskTemplateConfig | null {
  try {
    return JSON.parse(json) as TaskTemplateConfig;
  } catch {
    return null;
  }
}

/**
 * Parse conditions from JSON string
 */
export function parseConditions(json: string | null): TaskRuleConditionsConfig | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as TaskRuleConditionsConfig;
  } catch {
    return null;
  }
}

/**
 * Stringify task template to JSON
 */
export function stringifyTaskTemplate(template: TaskTemplateConfig): string {
  return JSON.stringify(template);
}

/**
 * Stringify conditions to JSON
 */
export function stringifyConditions(conditions: TaskRuleConditionsConfig): string {
  return JSON.stringify(conditions);
}
