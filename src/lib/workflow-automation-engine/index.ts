/**
 * Workflow Automation Engine
 *
 * A general-purpose workflow engine supporting multi-step automations
 * with conditions, branches, and actions across Odoo and AIOM systems.
 *
 * @module workflow-automation-engine
 */

// Core engine
export { WorkflowEngine, workflowEngine } from "./engine";

// Step handlers
export {
  actionStepHandler,
  conditionStepHandler,
  branchStepHandler,
  waitStepHandler,
  notificationStepHandler,
  integrationStepHandler,
  approvalStepHandler,
  parallelStepHandler,
  loopStepHandler,
  getStepHandler,
  registerStepHandler,
  getAllStepHandlers,
} from "./step-handlers";

// Condition evaluation utilities
export {
  getNestedValue,
  resolveValue,
  evaluateCondition,
  evaluateConditionGroup,
  replaceTemplatePlaceholders,
  resolveVariablesInObject,
} from "./condition-evaluator";

// Types
export type {
  WorkflowContext,
  StepExecutionResult,
  WorkflowExecutionResult,
  StepHandler,
  ActionHandler,
  WorkflowEngineConfig,
  WorkflowTriggerEvent,
  Condition,
  ConditionGroup,
  NotificationPayload,
  IntegrationResult,
  ApprovalRequest,
  WorkflowValidationResult,
} from "./types";

export { DEFAULT_ENGINE_CONFIG } from "./types";

// Re-export schema types for convenience
export type {
  WorkflowStepDefinition,
  WorkflowStepConfig,
  WorkflowActionConfig,
  WorkflowConditionConfig,
  WorkflowBranchConfig,
  WorkflowWaitConfig,
  WorkflowLoopConfig,
  WorkflowParallelConfig,
  WorkflowApprovalConfig,
  WorkflowNotificationConfig,
  WorkflowIntegrationConfig,
  WorkflowDefinition,
  WorkflowInstance,
  WorkflowStepExecution,
  WorkflowConditionOperator,
  WorkflowStepType,
  WorkflowInstanceStatus,
  WorkflowStepStatus,
} from "./types";
