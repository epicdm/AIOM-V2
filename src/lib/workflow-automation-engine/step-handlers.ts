/**
 * Workflow Step Handlers
 *
 * Handlers for different step types in the workflow engine.
 */

import type {
  WorkflowStepDefinition,
  WorkflowContext,
  StepExecutionResult,
  StepHandler,
  WorkflowActionConfig,
  WorkflowConditionConfig,
  WorkflowBranchConfig,
  WorkflowWaitConfig,
  WorkflowNotificationConfig,
  WorkflowIntegrationConfig,
} from "./types";
import {
  evaluateConditionGroup,
  resolveVariablesInObject,
  replaceTemplatePlaceholders,
  resolveValue,
} from "./condition-evaluator";

// =============================================================================
// Action Step Handler
// =============================================================================

export const actionStepHandler: StepHandler = {
  type: "action",
  async execute(step, context): Promise<StepExecutionResult> {
    const config = step.config as WorkflowActionConfig;
    const resolvedParams = resolveVariablesInObject(config.params, context);

    try {
      let result: unknown;

      switch (config.actionType) {
        case "set_variable": {
          // Set a variable in the context
          const { variableName, value } = resolvedParams as {
            variableName: string;
            value: unknown;
          };
          context.variables[variableName] = value;
          result = { [variableName]: value };
          break;
        }

        case "delay": {
          // Return a wait instruction
          const { seconds } = resolvedParams as { seconds: number };
          const waitUntil = new Date();
          waitUntil.setSeconds(waitUntil.getSeconds() + seconds);
          return {
            success: true,
            output: { waitUntil },
            shouldWait: { until: waitUntil },
          };
        }

        case "http_request": {
          // Make HTTP request
          const { url, method, headers, body } = resolvedParams as {
            url: string;
            method?: string;
            headers?: Record<string, string>;
            body?: unknown;
          };
          const response = await fetch(url, {
            method: method || "GET",
            headers: headers ? { ...headers } : undefined,
            body: body ? JSON.stringify(body) : undefined,
          });
          const data = await response.json().catch(() => response.text());
          result = {
            status: response.status,
            ok: response.ok,
            data,
          };
          break;
        }

        case "email_send": {
          // Placeholder for email sending
          // In real implementation, integrate with email service
          const { to, subject, body: emailBody } = resolvedParams as {
            to: string;
            subject: string;
            body: string;
          };
          console.log(`[Workflow] Sending email to ${to}: ${subject}`);
          result = { sent: true, to, subject };
          break;
        }

        case "odoo_create":
        case "odoo_update":
        case "odoo_delete":
        case "odoo_search": {
          // Odoo integration - placeholder
          // In real implementation, use Odoo client
          console.log(`[Workflow] Odoo action: ${config.actionType}`, resolvedParams);
          result = { action: config.actionType, params: resolvedParams };
          break;
        }

        case "aiom_task_create": {
          // AIOM task creation - placeholder
          const { title, description, assigneeId, priority, dueDate } = resolvedParams as {
            title: string;
            description?: string;
            assigneeId?: string;
            priority?: string;
            dueDate?: string;
          };
          console.log(`[Workflow] Creating AIOM task: ${title}`);
          result = { taskCreated: true, title, assigneeId, priority };
          break;
        }

        case "aiom_notification": {
          // AIOM notification - placeholder
          const { userId, title, message } = resolvedParams as {
            userId: string;
            title: string;
            message: string;
          };
          console.log(`[Workflow] Sending notification to ${userId}: ${title}`);
          result = { notificationSent: true, userId, title };
          break;
        }

        case "aiom_expense_approve":
        case "aiom_expense_reject": {
          // AIOM expense workflow - placeholder
          const { expenseId } = resolvedParams as { expenseId: string };
          console.log(`[Workflow] ${config.actionType} expense: ${expenseId}`);
          result = { action: config.actionType, expenseId };
          break;
        }

        case "custom_script": {
          // Custom script execution - placeholder
          // In real implementation, use a sandboxed script executor
          const { script } = resolvedParams as { script: string };
          console.log(`[Workflow] Custom script execution disabled for security`);
          result = { executed: false, reason: "Custom scripts are disabled" };
          break;
        }

        default:
          return {
            success: false,
            error: `Unknown action type: ${config.actionType}`,
          };
      }

      return {
        success: true,
        output: result,
        nextStepId: step.onSuccess,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: errorMessage,
        nextStepId: step.onFailure,
      };
    }
  },
};

// =============================================================================
// Condition Step Handler
// =============================================================================

export const conditionStepHandler: StepHandler = {
  type: "condition",
  async execute(step, context): Promise<StepExecutionResult> {
    const config = step.config as WorkflowConditionConfig;

    const conditionsMatch = evaluateConditionGroup(
      {
        conditions: config.conditions,
        logic: config.logic,
      },
      context
    );

    return {
      success: true,
      output: { conditionsMatch },
      nextStepId: conditionsMatch ? config.onTrue : config.onFalse,
    };
  },
};

// =============================================================================
// Branch Step Handler
// =============================================================================

export const branchStepHandler: StepHandler = {
  type: "branch",
  async execute(step, context): Promise<StepExecutionResult> {
    const config = step.config as WorkflowBranchConfig;

    // Evaluate each branch in order
    for (const branch of config.branches) {
      const matches = evaluateConditionGroup(
        {
          conditions: branch.conditions,
          logic: branch.logic,
        },
        context
      );

      if (matches) {
        return {
          success: true,
          output: { selectedBranch: branch.name },
          nextStepId: branch.targetStepId,
        };
      }
    }

    // No branch matched, use default
    return {
      success: true,
      output: { selectedBranch: "default" },
      nextStepId: config.defaultBranch,
    };
  },
};

// =============================================================================
// Wait Step Handler
// =============================================================================

export const waitStepHandler: StepHandler = {
  type: "wait",
  async execute(step, context): Promise<StepExecutionResult> {
    const config = step.config as WorkflowWaitConfig;

    switch (config.waitType) {
      case "duration": {
        if (!config.durationSeconds) {
          return { success: false, error: "Duration not specified" };
        }
        const waitUntil = new Date();
        waitUntil.setSeconds(waitUntil.getSeconds() + config.durationSeconds);
        return {
          success: true,
          output: { waitUntil },
          shouldWait: { until: waitUntil },
          nextStepId: step.onSuccess,
        };
      }

      case "until_date": {
        if (!config.untilDate) {
          return { success: false, error: "Target date not specified" };
        }
        // Resolve the date value if it's a variable reference
        const resolvedDate = resolveValue(config.untilDate, context);
        const waitUntil = new Date(resolvedDate as string);
        if (isNaN(waitUntil.getTime())) {
          return { success: false, error: "Invalid date format" };
        }
        return {
          success: true,
          output: { waitUntil },
          shouldWait: { until: waitUntil },
          nextStepId: step.onSuccess,
        };
      }

      case "until_condition": {
        if (!config.untilCondition) {
          return { success: false, error: "Wait condition not specified" };
        }
        // For condition-based wait, we'll keep checking until the condition is met
        // The engine should poll this step periodically
        const conditionMet = evaluateConditionGroup(
          {
            conditions: [config.untilCondition],
            logic: "and",
          },
          context
        );

        if (conditionMet) {
          return {
            success: true,
            output: { conditionMet: true },
            nextStepId: step.onSuccess,
          };
        }

        // Check again in 1 minute
        const recheckAt = new Date();
        recheckAt.setMinutes(recheckAt.getMinutes() + 1);
        return {
          success: true,
          output: { conditionMet: false, recheckAt },
          shouldWait: {
            until: recheckAt,
            condition: config.untilCondition,
          },
        };
      }

      default:
        return { success: false, error: `Unknown wait type: ${config.waitType}` };
    }
  },
};

// =============================================================================
// Notification Step Handler
// =============================================================================

export const notificationStepHandler: StepHandler = {
  type: "notification",
  async execute(step, context): Promise<StepExecutionResult> {
    const config = step.config as WorkflowNotificationConfig;

    // Resolve recipient
    let recipientId: string;
    switch (config.recipientType) {
      case "user":
        recipientId = config.recipientValue;
        break;
      case "variable":
        recipientId = String(resolveValue(config.recipientValue, context) || "");
        break;
      case "role":
        // In real implementation, look up users by role
        console.log(`[Workflow] Would notify users with role: ${config.recipientValue}`);
        recipientId = config.recipientValue;
        break;
      default:
        return { success: false, error: "Invalid recipient type" };
    }

    // Process template
    const processedTemplate = replaceTemplatePlaceholders(config.template, context);

    // Send notification based on channel
    try {
      switch (config.channel) {
        case "email":
          console.log(`[Workflow] Email notification to ${recipientId}: ${processedTemplate}`);
          break;
        case "push":
          console.log(`[Workflow] Push notification to ${recipientId}: ${processedTemplate}`);
          break;
        case "in_app":
          console.log(`[Workflow] In-app notification to ${recipientId}: ${processedTemplate}`);
          break;
        case "sms":
          console.log(`[Workflow] SMS notification to ${recipientId}: ${processedTemplate}`);
          break;
      }

      return {
        success: true,
        output: {
          channel: config.channel,
          recipientId,
          message: processedTemplate,
        },
        nextStepId: step.onSuccess,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Notification failed";
      return {
        success: false,
        error: errorMessage,
        nextStepId: step.onFailure,
      };
    }
  },
};

// =============================================================================
// Integration Step Handler
// =============================================================================

export const integrationStepHandler: StepHandler = {
  type: "integration",
  async execute(step, context): Promise<StepExecutionResult> {
    const config = step.config as WorkflowIntegrationConfig;
    const resolvedParams = resolveVariablesInObject(config.params, context);

    try {
      let result: unknown;

      switch (config.integrationType) {
        case "odoo": {
          // Placeholder for Odoo integration
          console.log(`[Workflow] Odoo integration: ${config.operation}`, resolvedParams);
          result = { integration: "odoo", operation: config.operation, params: resolvedParams };
          break;
        }

        case "aiom": {
          // Placeholder for AIOM integration
          console.log(`[Workflow] AIOM integration: ${config.operation}`, resolvedParams);
          result = { integration: "aiom", operation: config.operation, params: resolvedParams };
          break;
        }

        case "http": {
          // HTTP integration (external API calls)
          const { url, method, headers, body } = resolvedParams as {
            url: string;
            method?: string;
            headers?: Record<string, string>;
            body?: unknown;
          };
          const response = await fetch(url, {
            method: method || "GET",
            headers: headers ? { ...headers } : undefined,
            body: body ? JSON.stringify(body) : undefined,
          });
          const data = await response.json().catch(() => response.text());
          result = { status: response.status, ok: response.ok, data };
          break;
        }

        default:
          return {
            success: false,
            error: `Unknown integration type: ${config.integrationType}`,
          };
      }

      return {
        success: true,
        output: result,
        nextStepId: step.onSuccess,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Integration failed";
      return {
        success: false,
        error: errorMessage,
        nextStepId: step.onFailure,
      };
    }
  },
};

// =============================================================================
// Approval Step Handler
// =============================================================================

export const approvalStepHandler: StepHandler = {
  type: "approval",
  async execute(step, context): Promise<StepExecutionResult> {
    // Approval steps pause the workflow and wait for human input
    // The engine should create approval requests in the database
    // and resume when approvals are received

    return {
      success: true,
      output: { awaiting: "approval" },
      shouldPause: true,
      nextStepId: step.onSuccess, // Will be used when approved
    };
  },
};

// =============================================================================
// Parallel Step Handler
// =============================================================================

export const parallelStepHandler: StepHandler = {
  type: "parallel",
  async execute(step, context): Promise<StepExecutionResult> {
    // Parallel steps are handled specially by the engine
    // This handler just indicates that parallel execution should begin
    return {
      success: true,
      output: { parallelExecution: true },
      nextStepId: step.onSuccess,
    };
  },
};

// =============================================================================
// Loop Step Handler
// =============================================================================

export const loopStepHandler: StepHandler = {
  type: "loop",
  async execute(step, context): Promise<StepExecutionResult> {
    // Loop steps are handled specially by the engine
    // This handler just indicates that looping should begin
    return {
      success: true,
      output: { loopExecution: true },
      nextStepId: step.onSuccess,
    };
  },
};

// =============================================================================
// Handler Registry
// =============================================================================

const stepHandlers: Map<string, StepHandler> = new Map([
  ["action", actionStepHandler],
  ["condition", conditionStepHandler],
  ["branch", branchStepHandler],
  ["wait", waitStepHandler],
  ["notification", notificationStepHandler],
  ["integration", integrationStepHandler],
  ["approval", approvalStepHandler],
  ["parallel", parallelStepHandler],
  ["loop", loopStepHandler],
]);

/**
 * Get a step handler by type
 */
export function getStepHandler(type: string): StepHandler | undefined {
  return stepHandlers.get(type);
}

/**
 * Register a custom step handler
 */
export function registerStepHandler(handler: StepHandler): void {
  stepHandlers.set(handler.type, handler);
}

/**
 * Get all registered step handlers
 */
export function getAllStepHandlers(): StepHandler[] {
  return Array.from(stepHandlers.values());
}
