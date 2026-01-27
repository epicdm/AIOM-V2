/**
 * Action Executor - Executes approved Action Protocol v1.1 actions
 *
 * This module orchestrates the complete action execution flow:
 * 1. Validate action protocol
 * 2. Check if action is approved and not expired
 * 3. Run revalidation checks
 * 4. Execute via safe operations layer
 * 5. Record outreach attempts (anti-spam)
 * 6. Update action status and results
 * 7. Log to audit trail
 *
 * This is the main entry point for executing autonomous actions.
 */

import { nanoid } from 'nanoid';
import {
  validateActionProtocol,
  isActionExpired,
  isReadyToExecute,
  type ActionProtocolV11,
} from './action-protocol.v1_1';
import {
  runRevalidationChecks,
  recordOutreachAttempt,
  formatRevalidationResult,
  type RevalidationResult,
} from './revalidation-executor';
import {
  executeSafeOperation,
  recordOperationExecution,
  type OperationResult,
} from './safe-operations';
import {
  getActionById,
  markActionAsExecuted,
  markActionAsFailed,
  updateActionStatus,
} from '~/data-access/ai-coo';

// ============================================================================
// TYPES
// ============================================================================

export interface ExecutionResult {
  success: boolean;
  actionId: string;
  stage: ExecutionStage;
  message: string;
  operationResult?: OperationResult;
  revalidationResult?: RevalidationResult;
  error?: string;
  timestamp: Date;
}

export type ExecutionStage =
  | 'validation'
  | 'approval_check'
  | 'revalidation'
  | 'execution'
  | 'recording'
  | 'completed';

// ============================================================================
// MAIN EXECUTION FUNCTION
// ============================================================================

/**
 * Execute an approved action by ID
 * This is the main entry point for action execution
 */
export async function executeAction(actionId: string): Promise<ExecutionResult> {
  const startTime = Date.now();
  console.log(`[Action Executor] Starting execution for action ${actionId}`);

  try {
    // Stage 1: Load and validate action
    const dbAction = await getActionById(actionId);

    if (!dbAction) {
      return {
        success: false,
        actionId,
        stage: 'validation',
        message: 'Action not found',
        error: `No action found with ID: ${actionId}`,
        timestamp: new Date(),
      };
    }

    // Parse and validate Action Protocol v1.1
    let action: ActionProtocolV11;
    try {
      // If action_protocol field exists, use it; otherwise construct from old fields
      if (dbAction.actionProtocol) {
        action = validateActionProtocol(dbAction.actionProtocol);
      } else {
        // Fallback for actions created before v1.1
        return {
          success: false,
          actionId,
          stage: 'validation',
          message: 'Action does not have v1.1 protocol format',
          error: 'This action was created before Action Protocol v1.1 and cannot be executed',
          timestamp: new Date(),
        };
      }
    } catch (validationError) {
      return {
        success: false,
        actionId,
        stage: 'validation',
        message: 'Action protocol validation failed',
        error:
          validationError instanceof Error
            ? validationError.message
            : 'Unknown validation error',
        timestamp: new Date(),
      };
    }

    // Stage 2: Check approval status and expiration
    if (!isReadyToExecute(action)) {
      let reason = 'Action not ready to execute';

      if (isActionExpired(action)) {
        reason = 'Action has expired';
        await updateActionStatus(actionId, 'expired');
      } else if (action.status !== 'approved') {
        reason = `Action status is ${action.status}, expected approved`;
      }

      return {
        success: false,
        actionId,
        stage: 'approval_check',
        message: reason,
        timestamp: new Date(),
      };
    }

    // Update status to executing
    await updateActionStatus(actionId, 'executing');

    // Stage 3: Run revalidation checks
    console.log(`[Action Executor] Running revalidation for ${actionId}`);
    const revalidationResult = await runRevalidationChecks(action);

    if (!revalidationResult.success) {
      console.warn(
        `[Action Executor] Revalidation failed for ${actionId}:`,
        formatRevalidationResult(revalidationResult)
      );

      // Check if we should block or require reapproval
      if (revalidationResult.shouldBlock) {
        await markActionAsFailed(
          actionId,
          `Revalidation blocked: ${formatRevalidationResult(revalidationResult)}`
        );

        return {
          success: false,
          actionId,
          stage: 'revalidation',
          message: 'Action blocked by revalidation checks',
          revalidationResult,
          error: formatRevalidationResult(revalidationResult),
          timestamp: new Date(),
        };
      } else if (revalidationResult.shouldRequireReapproval) {
        // Reset to pending approval
        await updateActionStatus(actionId, 'pending_approval');

        return {
          success: false,
          actionId,
          stage: 'revalidation',
          message: 'Action requires reapproval due to changed conditions',
          revalidationResult,
          timestamp: new Date(),
        };
      }
    }

    // Stage 4: Execute via safe operations layer
    console.log(`[Action Executor] Executing safe operation for ${actionId}`);
    const operationResult = await executeSafeOperation(
      action.operation,
      actionId,
      action.org_id
    );

    if (!operationResult.success) {
      console.error(`[Action Executor] Execution failed for ${actionId}:`, operationResult.error);

      await markActionAsFailed(actionId, operationResult.error || 'Unknown execution error');

      return {
        success: false,
        actionId,
        stage: 'execution',
        message: 'Safe operation execution failed',
        operationResult,
        revalidationResult,
        error: operationResult.error,
        timestamp: new Date(),
      };
    }

    // Stage 5: Record outreach attempts (anti-spam tracking)
    if (action.external_effects && action.external_effects.length > 0) {
      console.log(`[Action Executor] Recording ${action.external_effects.length} outreach attempts`);

      for (const effect of action.external_effects) {
        if (effect.recipient_partner_id && action.affected_records.odoo_model) {
          // Determine context type from model
          const contextType = mapOdooModelToContextType(action.affected_records.odoo_model);
          const contextId =
            action.affected_records.odoo_ids.length > 0
              ? action.affected_records.odoo_ids[0].toString()
              : 'unknown';

          await recordOutreachAttempt(
            action.org_id,
            effect.recipient_partner_id.toString(),
            contextType,
            contextId,
            getOutreachWindowMinutes(effect.effect_type)
          );
        }
      }
    }

    // Stage 6: Mark action as completed
    const executionDuration = Date.now() - startTime;
    await markActionAsExecuted(actionId, {
      success: true,
      externalId: operationResult.externalId,
      message: operationResult.message,
      durationMs: executionDuration,
      revalidationChecks: revalidationResult.failedChecks.length === 0 ? 'passed' : 'partial',
    });

    // Record operation execution for audit
    await recordOperationExecution(action.operation.type, actionId, operationResult);

    console.log(
      `[Action Executor] Action ${actionId} completed successfully in ${executionDuration}ms`
    );

    return {
      success: true,
      actionId,
      stage: 'completed',
      message: `Action executed successfully: ${operationResult.message || 'OK'}`,
      operationResult,
      revalidationResult,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error(`[Action Executor] Unexpected error for ${actionId}:`, error);

    // Try to mark as failed in database
    try {
      await markActionAsFailed(
        actionId,
        `Execution error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } catch (dbError) {
      console.error(`[Action Executor] Failed to mark action as failed:`, dbError);
    }

    return {
      success: false,
      actionId,
      stage: 'execution',
      message: 'Unexpected execution error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date(),
    };
  }
}

/**
 * Execute multiple actions in sequence
 * Returns results for all actions, even if some fail
 */
export async function executeActions(actionIds: string[]): Promise<ExecutionResult[]> {
  console.log(`[Action Executor] Executing ${actionIds.length} actions`);

  const results: ExecutionResult[] = [];

  for (const actionId of actionIds) {
    const result = await executeAction(actionId);
    results.push(result);

    // If action failed critically, log but continue with others
    if (!result.success && result.stage === 'execution') {
      console.warn(`[Action Executor] Action ${actionId} failed, continuing with remaining actions`);
    }
  }

  const successCount = results.filter((r) => r.success).length;
  console.log(
    `[Action Executor] Batch complete: ${successCount}/${actionIds.length} actions succeeded`
  );

  return results;
}

/**
 * Process all approved actions (typically called by scheduler)
 */
export async function processApprovedActions(): Promise<ExecutionResult[]> {
  console.log('[Action Executor] Processing all approved actions');

  try {
    const { getApprovedActions } = await import('~/data-access/ai-coo');
    const approvedActions = await getApprovedActions();

    if (approvedActions.length === 0) {
      console.log('[Action Executor] No approved actions to process');
      return [];
    }

    const actionIds = approvedActions.map((a) => a.id);
    return await executeActions(actionIds);
  } catch (error) {
    console.error('[Action Executor] Failed to process approved actions:', error);
    return [];
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Map Odoo model to context type for outreach tracking
 */
function mapOdooModelToContextType(model: string): string {
  const mapping: Record<string, string> = {
    'crm.lead': 'deal',
    'account.move': 'invoice',
    'project.task': 'task',
    'res.partner': 'customer',
    'sale.order': 'deal',
    'project.project': 'project',
  };

  return mapping[model] || 'other';
}

/**
 * Get outreach window in minutes based on effect type
 * This prevents duplicate communications within time window
 */
function getOutreachWindowMinutes(effectType: string): number {
  const windows: Record<string, number> = {
    email: 240, // 4 hours minimum between emails to same partner
    sms: 360, // 6 hours minimum between SMS
    api_call: 60, // 1 hour for API calls
    webhook: 30, // 30 minutes for webhooks
  };

  return windows[effectType] || 180; // Default 3 hours
}

/**
 * Get execution summary statistics
 */
export function getExecutionSummary(results: ExecutionResult[]): {
  total: number;
  succeeded: number;
  failed: number;
  blocked: number;
  requireReapproval: number;
} {
  return {
    total: results.length,
    succeeded: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success && r.stage === 'execution').length,
    blocked: results.filter((r) => !r.success && r.stage === 'revalidation').length,
    requireReapproval: results.filter(
      (r) =>
        !r.success &&
        r.revalidationResult?.shouldRequireReapproval
    ).length,
  };
}
