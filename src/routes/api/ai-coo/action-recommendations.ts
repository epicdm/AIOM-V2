import { createFileRoute } from '@tanstack/react-router';
import { database as db } from '~/db';
import { autonomousActions } from '~/db/ai-coo-schema';
import { eq, desc, and, inArray } from 'drizzle-orm';

export const Route = createFileRoute('/api/ai-coo/action-recommendations')({
  server: {
    handlers: {
      /**
       * GET /api/ai-coo/action-recommendations
       *
       * Fetches pending action recommendations for the AI COO dashboard
       * Returns actions in the format needed for decision cards
       */
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const status = url.searchParams.get('status') || 'pending_approval';
          const limit = parseInt(url.searchParams.get('limit') || '10', 10);

          console.log('[AI COO API] Fetching action recommendations:', {
            status,
            limit,
          });

          // Fetch pending actions from database
          const actions = await db
            .select()
            .from(autonomousActions)
            .where(eq(autonomousActions.status, status))
            .orderBy(desc(autonomousActions.createdAt))
            .limit(limit);

          console.log(`[AI COO API] Found ${actions.length} action recommendations`);

          // Transform actions into decision card format
          const recommendations = actions.map((action) => {
            const protocol = action.actionProtocol as any;

            // Determine priority based on risk level
            let priority: 'critical' | 'attention' | 'info' | 'automated' = 'info';
            if (protocol?.risk_level === 'critical') priority = 'critical';
            else if (protocol?.risk_level === 'high') priority = 'attention';
            else if (protocol?.risk_level === 'low') priority = 'automated';

            // Build title from action type and affected records
            const affectedRecords = protocol?.affected_records || {};
            const title = buildTitle(action.actionType, affectedRecords);

            // Build body from reasoning
            const body = protocol?.reasoning || action.decisionReasoning || action.description;

            // Build impacted section
            const impacted = buildImpactedLabel(affectedRecords);

            // Build sources section
            const sources = buildSourcesLabel(protocol);

            // Build risk assessment
            const riskAssessment = buildRiskAssessment(protocol);

            // Build recommended plan from proposed changes
            const recommendedPlan = buildRecommendedPlan(protocol);

            return {
              id: action.id,
              priority,
              title,
              body,
              impacted,
              sources,
              riskAssessment,
              recommendedPlan,
              createdAt: action.createdAt,
              expiresAt: protocol?.expires_at || null,
            };
          });

          return Response.json({
            recommendations,
            total: recommendations.length,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error('[AI COO API] Failed to fetch action recommendations:', error);
          return Response.json(
            {
              error: 'Failed to fetch action recommendations',
              message: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
          );
        }
      },
    },
  },
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Build title from action type and affected records
 */
function buildTitle(actionType: string, affectedRecords: any): string {
  const recordName = affectedRecords.record_name || affectedRecords.partner_name || 'Unknown';

  switch (actionType) {
    case 'send_invoice_reminder':
      return `Payment overdue: ${recordName}`;
    case 'send_deal_check_in':
      return `Revenue at risk: ${recordName} deal stalled`;
    case 'create_collection_task':
      return `Collection needed: ${recordName}`;
    case 'create_follow_up_task':
      return `Follow-up required: ${recordName}`;
    default:
      return `Action needed: ${recordName}`;
  }
}

/**
 * Build impacted label from affected records
 */
function buildImpactedLabel(affectedRecords: any): string {
  const parts: string[] = [];

  if (affectedRecords.odoo_model) {
    const modelLabel = affectedRecords.odoo_model === 'account.move' ? 'Invoice' :
                       affectedRecords.odoo_model === 'crm.lead' ? 'Deal' :
                       affectedRecords.odoo_model === 'project.task' ? 'Task' :
                       'Record';
    parts.push(`${modelLabel}: ${affectedRecords.record_name || 'Unknown'}`);
  }

  if (affectedRecords.partner_name) {
    parts.push(`Customer: ${affectedRecords.partner_name}`);
  }

  return parts.length > 0 ? parts.join(' • ') : 'Internal operation';
}

/**
 * Build sources label
 */
function buildSourcesLabel(protocol: any): string {
  const sources: string[] = [];

  if (protocol?.affected_records?.odoo_model) {
    sources.push(`Odoo: ${protocol.affected_records.odoo_model}`);
  }

  if (protocol?.analysis_id) {
    sources.push('AI Analysis');
  }

  if (protocol?.external_effects?.length > 0) {
    const effectTypes = protocol.external_effects.map((e: any) => e.effect_type);
    if (effectTypes.includes('email')) sources.push('Email Thread');
    if (effectTypes.includes('sms')) sources.push('SMS Log');
  }

  return sources.length > 0 ? sources.join(', ') : 'System';
}

/**
 * Build risk assessment text
 */
function buildRiskAssessment(protocol: any): string {
  const riskLevel = protocol?.risk_level || 'medium';
  const affectedRecords = protocol?.affected_records || {};

  // Try to extract monetary value or impact
  let riskText = '';

  if (affectedRecords.record_name?.includes('$')) {
    // Extract amount from record name if present
    const match = affectedRecords.record_name.match(/\$[\d,]+/);
    if (match) {
      riskText = `💰 ${match[0]} at risk`;
    }
  }

  // Add risk level
  const riskLevelText = riskLevel === 'critical' ? 'Critical risk' :
                        riskLevel === 'high' ? 'High risk' :
                        riskLevel === 'medium' ? 'Moderate risk' :
                        'Low risk';

  return riskText ? `${riskText} • ${riskLevelText}` : riskLevelText;
}

/**
 * Build recommended plan from protocol
 */
function buildRecommendedPlan(protocol: any): Array<{
  step: number;
  description: string;
  status: 'needs_approval' | 'draft' | 'auto_executable';
}> {
  const plan: Array<any> = [];

  // Step 1: Main action from operation
  if (protocol?.operation) {
    const mainAction = buildMainActionStep(protocol.operation, protocol.affected_records);
    if (mainAction) {
      plan.push({
        step: 1,
        description: mainAction,
        status: protocol.requires_approval ? 'needs_approval' : 'auto_executable',
      });
    }
  }

  // Step 2: Additional proposed changes
  if (protocol?.proposed_changes?.length > 0) {
    protocol.proposed_changes.slice(0, 2).forEach((change: any, index: number) => {
      plan.push({
        step: plan.length + 1,
        description: change.human_label || `Update ${change.path}`,
        status: 'draft',
      });
    });
  }

  // Step 3: Follow-up action
  const followUp = buildFollowUpStep(protocol);
  if (followUp) {
    plan.push({
      step: plan.length + 1,
      description: followUp,
      status: 'auto_executable',
    });
  }

  // If no steps were generated, create a default one
  if (plan.length === 0) {
    plan.push({
      step: 1,
      description: protocol?.expected_effect || 'Execute recommended action',
      status: protocol?.requires_approval ? 'needs_approval' : 'auto_executable',
    });
  }

  return plan;
}

/**
 * Build main action step description
 */
function buildMainActionStep(operation: any, affectedRecords: any): string | null {
  if (!operation) return null;

  const partnerName = affectedRecords?.partner_name || 'customer';

  switch (operation.type) {
    case 'send_email':
      return `Send email to ${partnerName}: "${operation.inputs?.subject || 'Follow-up'}"`;
    case 'send_sms':
      return `Send SMS reminder to ${partnerName}`;
    case 'create_odoo_task':
      return `Create task: ${operation.inputs?.name || 'Follow-up'}`;
    default:
      return `Execute ${operation.type} operation`;
  }
}

/**
 * Build follow-up step description
 */
function buildFollowUpStep(protocol: any): string | null {
  const actionType = protocol?.action_type;

  if (actionType?.includes('invoice')) {
    return 'Schedule follow-up call if no response in 3 days';
  }

  if (actionType?.includes('deal')) {
    return 'Track response and update deal stage accordingly';
  }

  if (actionType?.includes('task')) {
    return 'Monitor task completion and send reminder if overdue';
  }

  return 'Log action and schedule follow-up if needed';
}
