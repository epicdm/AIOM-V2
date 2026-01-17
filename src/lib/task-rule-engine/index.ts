/**
 * Task Rule Engine
 *
 * Core engine for evaluating and executing task auto-creation rules.
 * Handles trigger evaluation, condition matching, and task creation.
 */

import {
  findActiveRulesByTrigger,
  canRuleBeTrigger,
  recordRuleTrigger,
  createExecutionLog,
  parseTaskTemplate,
  parseConditions,
  type TaskAutoCreationRule,
  type TaskRuleTriggerType,
  type TaskRuleCondition,
  type TaskRuleConditionsConfig,
  type TaskTemplateConfig,
  type TaskRuleConditionOperator,
} from "~/data-access/task-auto-creation-rules";

// =============================================================================
// Types
// =============================================================================

export type TriggerContext = {
  triggerType: TaskRuleTriggerType;
  data: Record<string, unknown>;
  userId?: string;
  timestamp?: Date;
};

export type RuleExecutionResult = {
  ruleId: string;
  ruleName: string;
  success: boolean;
  taskCreated: boolean;
  taskId?: string;
  error?: string;
  executionMs: number;
};

export type EngineExecutionResult = {
  triggerType: TaskRuleTriggerType;
  rulesEvaluated: number;
  rulesMatched: number;
  tasksCreated: number;
  results: RuleExecutionResult[];
  totalExecutionMs: number;
};

// =============================================================================
// Condition Evaluation
// =============================================================================

/**
 * Evaluate a single condition against the trigger data
 */
function evaluateCondition(
  condition: TaskRuleCondition,
  data: Record<string, unknown>
): boolean {
  const fieldValue = getNestedValue(data, condition.field);
  const { operator, value } = condition;

  switch (operator) {
    case "equals":
      return fieldValue === value;

    case "not_equals":
      return fieldValue !== value;

    case "greater_than":
      return typeof fieldValue === "number" && typeof value === "number" && fieldValue > value;

    case "less_than":
      return typeof fieldValue === "number" && typeof value === "number" && fieldValue < value;

    case "greater_than_or_equals":
      return typeof fieldValue === "number" && typeof value === "number" && fieldValue >= value;

    case "less_than_or_equals":
      return typeof fieldValue === "number" && typeof value === "number" && fieldValue <= value;

    case "contains":
      if (typeof fieldValue === "string" && typeof value === "string") {
        return fieldValue.toLowerCase().includes(value.toLowerCase());
      }
      if (Array.isArray(fieldValue)) {
        return fieldValue.includes(value);
      }
      return false;

    case "not_contains":
      if (typeof fieldValue === "string" && typeof value === "string") {
        return !fieldValue.toLowerCase().includes(value.toLowerCase());
      }
      if (Array.isArray(fieldValue)) {
        return !fieldValue.includes(value);
      }
      return true;

    case "starts_with":
      return (
        typeof fieldValue === "string" &&
        typeof value === "string" &&
        fieldValue.toLowerCase().startsWith(value.toLowerCase())
      );

    case "ends_with":
      return (
        typeof fieldValue === "string" &&
        typeof value === "string" &&
        fieldValue.toLowerCase().endsWith(value.toLowerCase())
      );

    case "is_empty":
      return (
        fieldValue === null ||
        fieldValue === undefined ||
        fieldValue === "" ||
        (Array.isArray(fieldValue) && fieldValue.length === 0)
      );

    case "is_not_empty":
      return (
        fieldValue !== null &&
        fieldValue !== undefined &&
        fieldValue !== "" &&
        !(Array.isArray(fieldValue) && fieldValue.length === 0)
      );

    case "in":
      if (Array.isArray(value)) {
        return (value as Array<string | number>).includes(fieldValue as string | number);
      }
      return false;

    case "not_in":
      if (Array.isArray(value)) {
        return !(value as Array<string | number>).includes(fieldValue as string | number);
      }
      return true;

    default:
      return false;
  }
}

/**
 * Get a nested value from an object using dot notation
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split(".");
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return current;
}

/**
 * Evaluate all conditions for a rule
 */
function evaluateConditions(
  conditionsConfig: TaskRuleConditionsConfig | null,
  data: Record<string, unknown>
): boolean {
  // If no conditions, the rule always matches
  if (!conditionsConfig || conditionsConfig.conditions.length === 0) {
    return true;
  }

  const { conditions, logic } = conditionsConfig;

  if (logic === "or") {
    // OR logic: at least one condition must be true
    return conditions.some((condition) => evaluateCondition(condition, data));
  }

  // AND logic (default): all conditions must be true
  return conditions.every((condition) => evaluateCondition(condition, data));
}

// =============================================================================
// Task Generation
// =============================================================================

/**
 * Generate task data from template and trigger context
 */
function generateTaskData(
  template: TaskTemplateConfig,
  context: TriggerContext
): {
  title: string;
  description?: string;
  priority: string;
  dueDate?: Date;
  assigneeId?: string;
  tags?: string[];
} {
  // Replace placeholders in title and description
  const title = replacePlaceholders(template.title, context.data);
  const description = template.description
    ? replacePlaceholders(template.description, context.data)
    : undefined;

  // Calculate due date
  let dueDate: Date | undefined;
  if (template.dueInDays) {
    dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + template.dueInDays);
  } else if (template.dueInHours) {
    dueDate = new Date();
    dueDate.setHours(dueDate.getHours() + template.dueInHours);
  }

  return {
    title,
    description,
    priority: template.priority || "medium",
    dueDate,
    assigneeId: template.assigneeId,
    tags: template.tags,
  };
}

/**
 * Replace placeholders in a string with values from context data
 * Placeholders are in the format {{fieldName}} or {{nested.field}}
 */
function replacePlaceholders(template: string, data: Record<string, unknown>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    const value = getNestedValue(data, key.trim());
    if (value === null || value === undefined) {
      return match; // Keep original placeholder if value not found
    }
    return String(value);
  });
}

// =============================================================================
// Rule Execution
// =============================================================================

/**
 * Execute a single rule
 */
async function executeRule(
  rule: TaskAutoCreationRule,
  context: TriggerContext,
  createTaskFn?: (taskData: ReturnType<typeof generateTaskData>) => Promise<string | null>
): Promise<RuleExecutionResult> {
  const startTime = Date.now();

  try {
    // Check if rule can be triggered
    const { canTrigger, reason } = await canRuleBeTrigger(rule.id);
    if (!canTrigger) {
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        success: false,
        taskCreated: false,
        error: reason,
        executionMs: Date.now() - startTime,
      };
    }

    // Parse and evaluate conditions
    const conditions = parseConditions(rule.conditions);
    const matches = evaluateConditions(conditions, context.data);

    if (!matches) {
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        success: true,
        taskCreated: false,
        executionMs: Date.now() - startTime,
      };
    }

    // Parse task template
    const template = parseTaskTemplate(rule.taskTemplate);
    if (!template) {
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        success: false,
        taskCreated: false,
        error: "Invalid task template configuration",
        executionMs: Date.now() - startTime,
      };
    }

    // Generate task data
    const taskData = generateTaskData(template, context);

    // Create task if a creation function is provided
    let taskId: string | null = null;
    if (createTaskFn) {
      taskId = await createTaskFn(taskData);
    }

    // Record the trigger
    await recordRuleTrigger(rule.id, taskId !== null);

    // Log the execution
    await createExecutionLog({
      id: crypto.randomUUID(),
      ruleId: rule.id,
      triggerData: JSON.stringify(context.data),
      success: true,
      taskCreatedId: taskId || undefined,
      executedAt: new Date(),
      executionDurationMs: Date.now() - startTime,
    });

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      success: true,
      taskCreated: taskId !== null,
      taskId: taskId || undefined,
      executionMs: Date.now() - startTime,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Log the failed execution
    await createExecutionLog({
      id: crypto.randomUUID(),
      ruleId: rule.id,
      triggerData: JSON.stringify(context.data),
      success: false,
      errorMessage,
      executedAt: new Date(),
      executionDurationMs: Date.now() - startTime,
    });

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      success: false,
      taskCreated: false,
      error: errorMessage,
      executionMs: Date.now() - startTime,
    };
  }
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Process a trigger event and execute matching rules
 */
export async function processTrigger(
  context: TriggerContext,
  createTaskFn?: (taskData: ReturnType<typeof generateTaskData>) => Promise<string | null>
): Promise<EngineExecutionResult> {
  const startTime = Date.now();

  // Find all active rules for this trigger type
  const rules = await findActiveRulesByTrigger(context.triggerType);

  const results: RuleExecutionResult[] = [];
  let rulesMatched = 0;
  let tasksCreated = 0;

  // Execute each rule
  for (const rule of rules) {
    const result = await executeRule(rule, context, createTaskFn);
    results.push(result);

    if (result.success && result.taskCreated) {
      rulesMatched++;
      tasksCreated++;
    } else if (result.success && !result.error) {
      // Rule was evaluated but conditions didn't match - don't count as matched
    } else if (result.success) {
      rulesMatched++;
    }
  }

  return {
    triggerType: context.triggerType,
    rulesEvaluated: rules.length,
    rulesMatched,
    tasksCreated,
    results,
    totalExecutionMs: Date.now() - startTime,
  };
}

/**
 * Manually trigger a specific rule
 */
export async function triggerRule(
  ruleId: string,
  data: Record<string, unknown>,
  createTaskFn?: (taskData: ReturnType<typeof generateTaskData>) => Promise<string | null>
): Promise<RuleExecutionResult | null> {
  const { findTaskAutoCreationRuleById } = await import("~/data-access/task-auto-creation-rules");
  const rule = await findTaskAutoCreationRuleById(ruleId);

  if (!rule) {
    return null;
  }

  const context: TriggerContext = {
    triggerType: rule.triggerType as TaskRuleTriggerType,
    data,
    timestamp: new Date(),
  };

  return executeRule(rule, context, createTaskFn);
}

/**
 * Test a rule's conditions against sample data without actually creating a task
 */
export async function testRuleConditions(
  ruleId: string,
  sampleData: Record<string, unknown>
): Promise<{
  matches: boolean;
  conditionResults: Array<{
    field: string;
    operator: TaskRuleConditionOperator;
    expectedValue: unknown;
    actualValue: unknown;
    passed: boolean;
  }>;
}> {
  const { findTaskAutoCreationRuleById } = await import("~/data-access/task-auto-creation-rules");
  const rule = await findTaskAutoCreationRuleById(ruleId);

  if (!rule) {
    return { matches: false, conditionResults: [] };
  }

  const conditionsConfig = parseConditions(rule.conditions);

  if (!conditionsConfig || conditionsConfig.conditions.length === 0) {
    return { matches: true, conditionResults: [] };
  }

  const conditionResults = conditionsConfig.conditions.map((condition) => ({
    field: condition.field,
    operator: condition.operator,
    expectedValue: condition.value,
    actualValue: getNestedValue(sampleData, condition.field),
    passed: evaluateCondition(condition, sampleData),
  }));

  const matches = evaluateConditions(conditionsConfig, sampleData);

  return { matches, conditionResults };
}

/**
 * Preview what task would be created from a rule with given data
 */
export function previewGeneratedTask(
  template: TaskTemplateConfig,
  sampleData: Record<string, unknown>
): ReturnType<typeof generateTaskData> {
  const context: TriggerContext = {
    triggerType: "manual",
    data: sampleData,
    timestamp: new Date(),
  };

  return generateTaskData(template, context);
}

// Re-export types for convenience
export type { TaskTemplateConfig, TaskRuleCondition, TaskRuleConditionsConfig };
