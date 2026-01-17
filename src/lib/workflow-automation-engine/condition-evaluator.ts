/**
 * Workflow Condition Evaluator
 *
 * Evaluates conditions for workflow branches and decision steps.
 */

import type { WorkflowConditionOperator, WorkflowContext, Condition, ConditionGroup } from "./types";

/**
 * Get a nested value from an object using dot notation
 * Supports array indexing with bracket notation: "items[0].name"
 */
export function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  // Handle array bracket notation
  const normalizedPath = path.replace(/\[(\d+)\]/g, ".$1");
  const keys = normalizedPath.split(".");
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
 * Resolve a value that might be a variable reference
 * Variable references start with "$" like "$variables.amount" or "$triggerData.user.id"
 */
export function resolveValue(value: unknown, context: WorkflowContext): unknown {
  if (typeof value !== "string" || !value.startsWith("$")) {
    return value;
  }

  const path = value.slice(1); // Remove "$" prefix
  const [source, ...rest] = path.split(".");
  const restPath = rest.join(".");

  switch (source) {
    case "variables":
      return getNestedValue(context.variables, restPath);
    case "triggerData":
      return getNestedValue(context.triggerData, restPath);
    case "stepResults":
      return getNestedValue(context.stepResults, restPath);
    case "loopContext":
      if (context.loopContext) {
        if (restPath === "index") return context.loopContext.index;
        if (restPath === "item") return context.loopContext.item;
        if (restPath.startsWith("item.")) {
          return getNestedValue(context.loopContext.item as Record<string, unknown>, restPath.slice(5));
        }
      }
      return undefined;
    default:
      // Try to find in variables first, then triggerData
      const fromVars = getNestedValue(context.variables, path);
      if (fromVars !== undefined) return fromVars;
      return getNestedValue(context.triggerData, path);
  }
}

/**
 * Evaluate a single condition against the context
 */
export function evaluateCondition(
  condition: Condition,
  context: WorkflowContext
): boolean {
  const fieldValue = resolveValue("$" + condition.field, context);
  const compareValue = resolveValue(condition.value, context);
  const { operator } = condition;

  switch (operator) {
    case "equals":
      return fieldValue === compareValue;

    case "not_equals":
      return fieldValue !== compareValue;

    case "greater_than":
      return (
        typeof fieldValue === "number" &&
        typeof compareValue === "number" &&
        fieldValue > compareValue
      );

    case "less_than":
      return (
        typeof fieldValue === "number" &&
        typeof compareValue === "number" &&
        fieldValue < compareValue
      );

    case "greater_than_or_equals":
      return (
        typeof fieldValue === "number" &&
        typeof compareValue === "number" &&
        fieldValue >= compareValue
      );

    case "less_than_or_equals":
      return (
        typeof fieldValue === "number" &&
        typeof compareValue === "number" &&
        fieldValue <= compareValue
      );

    case "contains":
      if (typeof fieldValue === "string" && typeof compareValue === "string") {
        return fieldValue.toLowerCase().includes(compareValue.toLowerCase());
      }
      if (Array.isArray(fieldValue)) {
        return fieldValue.includes(compareValue);
      }
      return false;

    case "not_contains":
      if (typeof fieldValue === "string" && typeof compareValue === "string") {
        return !fieldValue.toLowerCase().includes(compareValue.toLowerCase());
      }
      if (Array.isArray(fieldValue)) {
        return !fieldValue.includes(compareValue);
      }
      return true;

    case "starts_with":
      return (
        typeof fieldValue === "string" &&
        typeof compareValue === "string" &&
        fieldValue.toLowerCase().startsWith(compareValue.toLowerCase())
      );

    case "ends_with":
      return (
        typeof fieldValue === "string" &&
        typeof compareValue === "string" &&
        fieldValue.toLowerCase().endsWith(compareValue.toLowerCase())
      );

    case "is_empty":
      return (
        fieldValue === null ||
        fieldValue === undefined ||
        fieldValue === "" ||
        (Array.isArray(fieldValue) && fieldValue.length === 0) ||
        (typeof fieldValue === "object" && Object.keys(fieldValue).length === 0)
      );

    case "is_not_empty":
      return (
        fieldValue !== null &&
        fieldValue !== undefined &&
        fieldValue !== "" &&
        !(Array.isArray(fieldValue) && fieldValue.length === 0) &&
        !(typeof fieldValue === "object" && Object.keys(fieldValue).length === 0)
      );

    case "in":
      if (Array.isArray(compareValue)) {
        return compareValue.includes(fieldValue);
      }
      return false;

    case "not_in":
      if (Array.isArray(compareValue)) {
        return !compareValue.includes(fieldValue);
      }
      return true;

    case "regex_match":
      if (typeof fieldValue === "string" && typeof compareValue === "string") {
        try {
          const regex = new RegExp(compareValue, "i");
          return regex.test(fieldValue);
        } catch {
          return false;
        }
      }
      return false;

    default:
      return false;
  }
}

/**
 * Evaluate a group of conditions with AND/OR logic
 */
export function evaluateConditionGroup(
  group: ConditionGroup,
  context: WorkflowContext
): boolean {
  if (!group.conditions || group.conditions.length === 0) {
    return true; // No conditions means always true
  }

  if (group.logic === "or") {
    return group.conditions.some((condition) =>
      evaluateCondition(condition, context)
    );
  }

  // Default to AND logic
  return group.conditions.every((condition) =>
    evaluateCondition(condition, context)
  );
}

/**
 * Replace template placeholders in a string with context values
 * Placeholders are in the format {{path.to.value}}
 */
export function replaceTemplatePlaceholders(
  template: string,
  context: WorkflowContext
): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const trimmedPath = path.trim();
    const value = resolveValue("$" + trimmedPath, context);
    if (value === null || value === undefined) {
      return match; // Keep original placeholder if value not found
    }
    return String(value);
  });
}

/**
 * Deep clone an object and resolve all variable references
 */
export function resolveVariablesInObject(
  obj: Record<string, unknown>,
  context: WorkflowContext
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      // Check if it's a variable reference
      if (value.startsWith("$")) {
        result[key] = resolveValue(value, context);
      } else if (value.includes("{{")) {
        // Check if it's a template string
        result[key] = replaceTemplatePlaceholders(value, context);
      } else {
        result[key] = value;
      }
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) => {
        if (typeof item === "object" && item !== null) {
          return resolveVariablesInObject(item as Record<string, unknown>, context);
        }
        if (typeof item === "string" && item.startsWith("$")) {
          return resolveValue(item, context);
        }
        return item;
      });
    } else if (typeof value === "object" && value !== null) {
      result[key] = resolveVariablesInObject(value as Record<string, unknown>, context);
    } else {
      result[key] = value;
    }
  }

  return result;
}
