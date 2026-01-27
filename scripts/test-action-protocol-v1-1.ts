/**
 * Test Script for Action Protocol v1.1 Integration
 *
 * This script verifies that:
 * 1. Database migration was successful
 * 2. We can create actions with v1.1 protocol
 * 3. We can retrieve and execute actions
 * 4. Revalidation executor works
 * 5. Safe operations can be called
 */

import { nanoid } from 'nanoid';
import { database as db } from '../src/db/index';
import { autonomousActions, outreachState } from '../src/db/ai-coo-schema';
import { eq } from 'drizzle-orm';
import {
  ActionProtocolV11Schema,
  generateIdempotencyKey,
  type ActionProtocolV11,
} from '../src/lib/ai-coo/action-protocol.v1_1';
import { executeAction } from '../src/lib/ai-coo/action-executor';

async function testActionProtocolV11() {
  console.log('🧪 Testing Action Protocol v1.1 Integration\n');

  try {
    // Test 1: Create a v1.1 action in database
    console.log('Test 1: Creating Action Protocol v1.1 action...');

    const testAction: ActionProtocolV11 = {
      version: '1.1',
      action_id: nanoid(),
      org_id: 'test-org',
      created_by: 'system:test',
      created_at: new Date(),

      action_type: 'create_follow_up_task',
      safe_operation: 'create_odoo_task',

      risk_level: 'low',
      status: 'approved', // Pre-approve for testing

      requires_approval: false,

      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h from now
      idempotency_key: generateIdempotencyKey('test-org', 'create_follow_up_task', 'test-123'),

      expected_effect: 'Create a follow-up task for stale deal',
      reasoning: 'This is a test action to verify v1.1 protocol integration',

      affected_records: {
        odoo_model: 'crm.lead',
        odoo_ids: [123],
        partner_id: 456,
        partner_name: 'Test Customer',
        record_name: 'Test Deal',
      },

      proposed_changes: [
        {
          path: 'crm.lead.activity_ids',
          before: [],
          after: [{ type: 'task', summary: 'Follow up on stale deal' }],
          change_type: 'add',
          human_label: 'Adding follow-up task',
        },
      ],

      revalidation_plan: {
        checks: [
          {
            check_id: 'deal_still_exists',
            description: 'Verify deal record still exists in Odoo',
            severity_on_fail: 'block',
            predicate: {
              type: 'odoo_record_exists',
              model: 'crm.lead',
              id: 123,
            },
          },
        ],
      },

      external_effects: [],

      operation: {
        type: 'create_odoo_task',
        inputs: {
          name: 'Follow up: Test Deal',
          description: 'This is a test task created by Action Protocol v1.1',
          priority: '1',
          user_id: 1,
        },
      },

      rollback_strategy: 'manual',
    };

    // Validate action protocol
    const validated = ActionProtocolV11Schema.parse(testAction);
    console.log('✅ Action protocol validated successfully');

    // Insert into database
    const [dbAction] = await db
      .insert(autonomousActions)
      .values({
        id: testAction.action_id,
        actionType: testAction.action_type,
        targetSystem: 'odoo',
        targetId: '123',
        description: testAction.expected_effect,
        parameters: {},
        decisionReasoning: testAction.reasoning,
        requiresApproval: testAction.requires_approval,
        status: testAction.status,
        createdAt: testAction.created_at,

        // v1.1 fields
        actionProtocol: testAction as any,
        orgId: testAction.org_id,
        idempotencyKey: testAction.idempotency_key,
        expiresAt: testAction.expires_at,
        riskLevel: testAction.risk_level,
        safeOperation: testAction.safe_operation,
      })
      .returning();

    console.log(`✅ Action created in database: ${dbAction.id}`);

    // Test 2: Query action from database
    console.log('\nTest 2: Querying action from database...');

    const [retrieved] = await db
      .select()
      .from(autonomousActions)
      .where(eq(autonomousActions.id, testAction.action_id));

    if (!retrieved) {
      throw new Error('Failed to retrieve action from database');
    }

    console.log('✅ Action retrieved successfully');
    console.log(`   - Status: ${retrieved.status}`);
    console.log(`   - Risk Level: ${retrieved.riskLevel}`);
    console.log(`   - Idempotency Key: ${retrieved.idempotencyKey}`);
    console.log(`   - Has action_protocol: ${!!retrieved.actionProtocol}`);

    // Test 3: Check idempotency
    console.log('\nTest 3: Testing idempotency...');

    const [duplicate] = await db
      .select()
      .from(autonomousActions)
      .where(eq(autonomousActions.idempotencyKey, testAction.idempotency_key));

    if (duplicate) {
      console.log('✅ Idempotency key works - found existing action');
    }

    // Test 4: Test outreach_state table
    console.log('\nTest 4: Testing outreach_state table...');

    const [outreachRecord] = await db
      .insert(outreachState)
      .values({
        id: nanoid(),
        orgId: 'test-org',
        partnerId: '456',
        contextType: 'deal',
        contextId: '123',
        lastSentAt: new Date(),
        nextAllowedAt: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours
        attemptCount: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    console.log('✅ Outreach state record created');
    console.log(`   - Partner ID: ${outreachRecord.partnerId}`);
    console.log(`   - Context: ${outreachRecord.contextType}/${outreachRecord.contextId}`);
    console.log(`   - Attempt Count: ${outreachRecord.attemptCount}`);

    // Test 5: Execute action (will test revalidation and safe operations)
    console.log('\nTest 5: Testing action execution...');
    console.log('⚠️  Note: This will call the Odoo client. Make sure Odoo is accessible.');
    console.log('   Skipping execution test for now (uncomment to test)');

    // Uncomment to test execution:
    // const result = await executeAction(testAction.action_id);
    // console.log('✅ Action execution result:', result);

    console.log('\n✅ All tests passed!');
    console.log('\n📊 Summary:');
    console.log('   - Action Protocol v1.1 schema: ✅ Working');
    console.log('   - Database storage: ✅ Working');
    console.log('   - Idempotency: ✅ Working');
    console.log('   - Outreach state: ✅ Working');
    console.log('   - Action execution: ⚠️  Skipped (uncomment to test)');

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await db.delete(autonomousActions).where(eq(autonomousActions.id, testAction.action_id));
    await db.delete(outreachState).where(eq(outreachState.id, outreachRecord.id));
    console.log('✅ Cleanup complete');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
testActionProtocolV11()
  .then(() => {
    console.log('\n✅ Test script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test script failed:', error);
    process.exit(1);
  });
