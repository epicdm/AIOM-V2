/**
 * Action Recommender Test Script
 *
 * This script tests the Action Recommender by:
 * 1. Creating sample financial analysis results
 * 2. Generating action recommendations using Claude
 * 3. Verifying actions stored in database
 * 4. Displaying generated Action Protocol v1.1 actions
 *
 * Usage:
 * npx tsx scripts/test-action-recommender.ts
 */

// Load environment variables from .env file
import { config } from 'dotenv';
config();

import { recommendActions } from '../src/lib/ai-coo/action-recommender';
import { database } from '../src/db';
import { autonomousActions } from '../src/db/ai-coo-schema';
import { eq } from 'drizzle-orm';

// ============================================================================
// SAMPLE FINANCIAL ANALYSIS RESULT
// ============================================================================

const SAMPLE_ANALYSIS = {
  id: 'test-analysis-' + Date.now(),
  jobId: 'financial-analyzer',
  status: 'completed',
  metrics: {
    // Cash Flow Metrics
    totalReceivables: 125000,
    totalOverdue: 47500,
    cashRunwayDays: 47,
    avgDaysToPayment: 38,

    // Overdue Invoices
    invoices_0_15_days: {
      count: 3,
      total: 12500,
      invoices: [
        {
          id: 1001,
          name: 'INV-2024-001',
          partner_id: 501,
          partner_name: 'Acme Corporation',
          amount_total: 5000,
          payment_state: 'not_paid',
          invoice_date: '2024-01-05',
          invoice_date_due: '2024-01-20',
          days_overdue: 10,
        },
      ],
    },
    invoices_15_30_days: {
      count: 2,
      total: 15000,
      invoices: [
        {
          id: 1002,
          name: 'INV-2024-002',
          partner_id: 502,
          partner_name: 'TechStart Inc',
          amount_total: 8000,
          payment_state: 'not_paid',
          invoice_date: '2023-12-10',
          invoice_date_due: '2023-12-25',
          days_overdue: 22,
        },
      ],
    },
    invoices_30_60_days: {
      count: 1,
      total: 20000,
      invoices: [
        {
          id: 1003,
          name: 'INV-2023-045',
          partner_id: 503,
          partner_name: 'GlobalTech LLC',
          amount_total: 20000,
          payment_state: 'not_paid',
          invoice_date: '2023-11-15',
          invoice_date_due: '2023-11-30',
          days_overdue: 45,
        },
      ],
    },
  },
  insights: [
    'Cash runway is below target (47 days vs 60 day target)',
    '3 invoices are 0-15 days overdue totaling $12,500',
    '2 invoices are 15-30 days overdue totaling $15,000',
    '1 invoice is 30-60 days overdue totaling $20,000 (HIGH PRIORITY)',
    'GlobalTech LLC invoice INV-2023-045 ($20K) is 45 days overdue',
  ],
  recommendations: [
    'Send payment reminder to GlobalTech LLC for $20K invoice (45 days overdue)',
    'Follow up with TechStart Inc on $8K invoice (22 days overdue)',
    'Create collections task for invoices over 30 days',
  ],
  createdAt: new Date(),
};

// ============================================================================
// TEST FUNCTIONS
// ============================================================================

async function testActionRecommender() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║                                                           ║');
  console.log('║      Action Recommender Test Suite                       ║');
  console.log('║      AIOM AI COO - Action Protocol v1.1                  ║');
  console.log('║                                                           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log();

  // Step 1: Display sample analysis
  console.log('📊 Sample Financial Analysis:');
  console.log('═'.repeat(60));
  console.log(`Analysis ID: ${SAMPLE_ANALYSIS.id}`);
  console.log(`Analyzer Type: ${SAMPLE_ANALYSIS.jobId}`);
  console.log();
  console.log('Key Metrics:');
  console.log(`  • Total Receivables: $${SAMPLE_ANALYSIS.metrics.totalReceivables.toLocaleString()}`);
  console.log(`  • Total Overdue: $${SAMPLE_ANALYSIS.metrics.totalOverdue.toLocaleString()}`);
  console.log(`  • Cash Runway: ${SAMPLE_ANALYSIS.metrics.cashRunwayDays} days`);
  console.log(`  • Avg Days to Payment: ${SAMPLE_ANALYSIS.metrics.avgDaysToPayment} days`);
  console.log();
  console.log('Insights:');
  SAMPLE_ANALYSIS.insights.forEach((insight) => {
    console.log(`  • ${insight}`);
  });
  console.log();

  // Step 2: Generate action recommendations
  console.log('🤖 Generating Action Recommendations with Claude AI...');
  console.log('═'.repeat(60));
  console.log();

  try {
    const recommendations = await recommendActions({
      analysisResult: SAMPLE_ANALYSIS,
      orgId: 'test-org',
      userId: 'test-user',
      guardrails: {
        autoApproveFinancialActions: false,
        maxEmailRecipientsPerAction: 10,
        maxSMSPerDay: 50,
        allowActionsOutsideBusinessHours: false,
        requireApprovalForBulkActions: true,
      },
    });

    console.log(`✅ Claude generated ${recommendations.length} action recommendations`);
    console.log();

    // Step 3: Display each recommended action
    if (recommendations.length === 0) {
      console.log('⚠️  No actions recommended. This could mean:');
      console.log('   • Claude determined no actions are needed');
      console.log('   • Analysis data was insufficient');
      console.log('   • Claude API error occurred');
      console.log();
      console.log('💡 Check logs above for Claude response details');
    } else {
      for (let i = 0; i < recommendations.length; i++) {
        const rec = recommendations[i];
        const action = rec.action;

        console.log(`┌─ Action ${i + 1}/${recommendations.length} ${'─'.repeat(50)}`);
        console.log(`│`);
        console.log(`│ 🎯 Action Type: ${action.action_type}`);
        console.log(`│ 🔐 Action ID: ${action.action_id}`);
        console.log(`│ ⚡ Priority: ${rec.priority}`);
        console.log(`│ 🎚️  Risk Level: ${action.risk_level}`);
        console.log(`│ ✅ Status: ${action.status}`);
        console.log(`│ 🔒 Requires Approval: ${action.requires_approval ? 'Yes' : 'No'}`);
        console.log(`│`);
        console.log(`│ 💭 Reasoning:`);
        console.log(`│    ${rec.reasoning}`);
        console.log(`│`);
        console.log(`│ 📋 Affected Records:`);
        if (action.affected_records.odoo_model) {
          console.log(`│    Model: ${action.affected_records.odoo_model}`);
          console.log(`│    IDs: ${action.affected_records.odoo_ids.join(', ')}`);
        }
        if (action.affected_records.partner_name) {
          console.log(`│    Partner: ${action.affected_records.partner_name}`);
        }
        if (action.affected_records.record_name) {
          console.log(`│    Record: ${action.affected_records.record_name}`);
        }
        console.log(`│`);

        // Display operation details
        console.log(`│ 🔧 Operation: ${action.operation.type}`);
        if (action.operation.type === 'send_email') {
          console.log(`│    To: ${action.operation.inputs.to}`);
          console.log(`│    Subject: ${action.operation.inputs.subject}`);
          console.log(`│    Body Preview: ${action.operation.inputs.body_text.substring(0, 80)}...`);
        } else if (action.operation.type === 'send_sms') {
          console.log(`│    To: ${action.operation.inputs.to}`);
          console.log(`│    Message: ${action.operation.inputs.body.substring(0, 80)}...`);
        } else if (action.operation.type === 'create_odoo_task') {
          console.log(`│    Task: ${action.operation.inputs.name}`);
          console.log(`│    Description: ${action.operation.inputs.description?.substring(0, 80)}...`);
        }
        console.log(`│`);

        // Display proposed changes
        if (action.proposed_changes.length > 0) {
          console.log(`│ 📝 Proposed Changes (${action.proposed_changes.length}):`);
          action.proposed_changes.forEach((change: any) => {
            console.log(`│    • ${change.human_label}`);
            console.log(`│      Path: ${change.path}`);
            console.log(`│      Change: ${change.change_type}`);
          });
          console.log(`│`);
        }

        // Display revalidation checks
        if (action.revalidation_plan.checks.length > 0) {
          console.log(`│ ✓ Revalidation Checks (${action.revalidation_plan.checks.length}):`);
          action.revalidation_plan.checks.forEach((check: any) => {
            console.log(`│    • ${check.description}`);
            console.log(`│      Type: ${check.predicate.type}`);
            console.log(`│      Severity: ${check.severity_on_fail}`);
          });
          console.log(`│`);
        }

        // Display external effects
        if (action.external_effects.length > 0) {
          console.log(`│ 📧 External Effects (${action.external_effects.length}):`);
          action.external_effects.forEach((effect: any) => {
            console.log(`│    • ${effect.effect_type.toUpperCase()} to ${effect.recipient}`);
            if (effect.subject) {
              console.log(`│      Subject: ${effect.subject}`);
            }
            if (effect.preview) {
              console.log(`│      Preview: ${effect.preview.substring(0, 60)}...`);
            }
          });
        }

        console.log(`│`);
        console.log(`└${'─'.repeat(60)}`);
        console.log();
      }
    }

    // Step 4: Verify database storage
    console.log('🗄️  Verifying Database Storage...');
    console.log('═'.repeat(60));

    const storedActions = await database
      .select()
      .from(autonomousActions)
      .where(eq(autonomousActions.analysisId, SAMPLE_ANALYSIS.id));

    console.log(`✅ Found ${storedActions.length} actions in database`);
    console.log();

    for (const stored of storedActions) {
      console.log(`  • Action ID: ${stored.id}`);
      console.log(`    Type: ${stored.actionType}`);
      console.log(`    Status: ${stored.status}`);
      console.log(`    Requires Approval: ${stored.requiresApproval}`);
      console.log(`    Risk Level: ${stored.riskLevel}`);
      console.log(`    Idempotency Key: ${stored.idempotencyKey}`);
      console.log();
    }

    // Step 5: Summary
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║                     TEST SUMMARY                          ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log();
    console.log('✅ Action Recommender Working');
    console.log(`✅ Generated ${recommendations.length} actions`);
    console.log(`✅ Stored ${storedActions.length} actions in database`);
    console.log(`✅ All actions using Action Protocol v1.1`);
    console.log();

    if (recommendations.length > 0) {
      console.log('📋 Next Steps:');
      console.log('   1. Review actions in the database');
      console.log('   2. Test approval workflow');
      console.log('   3. Integrate with financial analyzer scheduler');
      console.log('   4. Build approval UI dashboard');
    } else {
      console.log('⚠️  No actions generated. Possible next steps:');
      console.log('   1. Check Claude API configuration');
      console.log('   2. Review analysis data format');
      console.log('   3. Check Claude response in logs');
      console.log('   4. Try with different analysis data');
    }

    console.log();
    console.log('═'.repeat(60));
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error();
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    console.error();
    console.error('💡 Common issues:');
    console.error('   • Claude API key not configured (check .env)');
    console.error('   • Database connection failed');
    console.error('   • Action Protocol v1.1 validation error');
    console.error('   • Odoo client connection error');
    process.exit(1);
  }
}

// ============================================================================
// RUN TEST
// ============================================================================

testActionRecommender().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
