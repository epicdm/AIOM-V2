/**
 * Workflow Automation Engine Types
 *
 * Core type definitions for the workflow automation engine.
 */

import type {
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
} from "~/db/schema";

// Re-export schema types
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
};

/**
 * Workflow execution context containing runtime state
 */
export interface WorkflowContext {
  /** Variables accessible during execution */
  variables: Record<string, unknown>;
  /** Data from the trigger event */
  triggerData: Record<string, unknown>;
  /** Results from previous steps */
  stepResults: Record<string, unknown>;
  /** Loop iteration data */
  loopContext?: {
    index: number;
    item: unknown;
    collection: unknown[];
  };
  /** Timestamp when workflow started */
  startedAt: Date;
  /** Current workflow instance */
  instanceId: string;
  /** Current workflow definition */
  definitionId: string;
  /** User who triggered the workflow */
  triggeredBy?: string;
}

/**
 * Result of executing a single workflow step
 */
export interface StepExecutionResult {
  success: boolean;
  output?: unknown;
  error?: string;
  errorDetails?: unknown;
  nextStepId?: string;
  shouldPause?: boolean;
  shouldWait?: {
    until: Date;
    condition?: {
      field: string;
      operator: WorkflowConditionOperator;
      value: unknown;
    };
  };
}

/**
 * Result of executing a workflow
 */
export interface WorkflowExecutionResult {
  instanceId: string;
  status: WorkflowInstanceStatus;
  output?: unknown;
  error?: string;
  stepsExecuted: number;
  executionTimeMs: number;
}

/**
 * Handler for a specific step type
 */
export interface StepHandler {
  type: WorkflowStepType;
  execute: (
    step: WorkflowStepDefinition,
    context: WorkflowContext
  ) => Promise<StepExecutionResult>;
  validate?: (config: WorkflowStepConfig) => { valid: boolean; errors: string[] };
}

/**
 * Action handler for integration actions
 */
export interface ActionHandler {
  actionType: string;
  execute: (
    params: Record<string, unknown>,
    context: WorkflowContext
  ) => Promise<{ success: boolean; result?: unknown; error?: string }>;
}

/**
 * Configuration for the workflow engine
 */
export interface WorkflowEngineConfig {
  /** Maximum step execution time in ms */
  stepTimeoutMs: number;
  /** Maximum total workflow execution time in ms */
  workflowTimeoutMs: number;
  /** Whether to log verbose debug info */
  debug: boolean;
  /** Maximum parallel step executions */
  maxParallelSteps: number;
  /** Delay between retry attempts in ms */
  retryDelayMs: number;
}

/**
 * Default engine configuration
 */
export const DEFAULT_ENGINE_CONFIG: WorkflowEngineConfig = {
  stepTimeoutMs: 30000, // 30 seconds per step
  workflowTimeoutMs: 3600000, // 1 hour max
  debug: false,
  maxParallelSteps: 10,
  retryDelayMs: 1000,
};

/**
 * Workflow trigger event
 */
export interface WorkflowTriggerEvent {
  type: "manual" | "schedule" | "event" | "webhook" | "api";
  definitionId: string;
  triggeredBy?: string;
  data?: Record<string, unknown>;
}

/**
 * Condition evaluation helper types
 */
export interface Condition {
  field: string;
  operator: WorkflowConditionOperator;
  value: unknown;
}

export interface ConditionGroup {
  conditions: Condition[];
  logic: "and" | "or";
}

/**
 * Notification payload
 */
export interface NotificationPayload {
  channel: "email" | "push" | "in_app" | "sms";
  recipientId: string;
  title: string;
  body: string;
  actionUrl?: string;
  variables?: Record<string, string>;
}

/**
 * Integration action result
 */
export interface IntegrationResult {
  success: boolean;
  data?: unknown;
  error?: string;
  odooRecordId?: number;
}

/**
 * Approval request details
 */
export interface ApprovalRequest {
  instanceId: string;
  stepExecutionId: string;
  approverId: string;
  title: string;
  description: string;
  dueAt?: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Workflow validation result
 */
export interface WorkflowValidationResult {
  valid: boolean;
  errors: Array<{
    stepId?: string;
    field?: string;
    message: string;
  }>;
  warnings: Array<{
    stepId?: string;
    message: string;
  }>;
}
