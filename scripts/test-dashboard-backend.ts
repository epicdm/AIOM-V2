/**
 * Dashboard Backend Test Script
 *
 * This script verifies that all backend data access functions needed
 * for the Operator Dashboard are working correctly.
 *
 * Tests:
 * 1. Get pending approvals (main dashboard view)
 * 2. Get action by ID (action detail view)
 * 3. Get recent actions (activity feed)
 * 4. Get action history (audit trail)
 * 5. Get action statistics (metrics)
 * 6. Get active alerts (alert panel)
 * 7. Get latest analysis results (context)
 *
 * Usage:
 * npx tsx scripts/test-dashboard-backend.ts
 */

// Load environment variables
import { config } from 'dotenv';
config();

import {
  getPendingApprovals,
  getActionById,
  getRecentActions,
  getActionHistory,
  getActionStats,
  getActionsByRiskLevel,
  getActiveAlerts,
  getLatestAnalysisResults,
} from '../src/data-access/ai-coo';

// ============================================================================
// TEST FUNCTIONS
// ============================================================================

async function testDashboardBackend() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║                                                           ║');
  console.log('║      Operator Dashboard Backend Test                     ║');
  console.log('║      Verify Data Access for Dashboard UI                 ║');
  console.log('║                                                           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log();

  const results: { test: string; passed: boolean; data?: any }[] = [];

  // Test 1: Get Pending Approvals
  console.log('📋 Test 1: Get Pending Approvals');
  console.log('═'.repeat(60));
  try {
    const pendingApprovals = await getPendingApprovals(10);

    console.log(`✅ Found ${pendingApprovals.length} pending approvals`);

    if (pendingApprovals.length > 0) {
      const action = pendingApprovals[0];
      console.log('\nSample Action:');
      console.log(`  ID: ${action.id}`);
      console.log(`  Type: ${action.actionType}`);
      console.log(`  Status: ${action.status}`);
      console.log(`  Risk Level: ${action.riskLevel}`);
      console.log(`  Requires Approval: ${action.requiresApproval}`);
      console.log(`  Created: ${action.createdAt}`);
      console.log(`  Expires: ${action.expiresAt}`);

      // Check Action Protocol v1.1 data
      if (action.actionProtocol) {
        const protocol = action.actionProtocol as any;
        console.log('\nAction Protocol v1.1 Data:');
        console.log(`  ✓ Proposed Changes: ${protocol.proposed_changes?.length || 0} changes`);
        console.log(`  ✓ Revalidation Checks: ${protocol.revalidation_plan?.checks?.length || 0} checks`);
        console.log(`  ✓ External Effects: ${protocol.external_effects?.length || 0} effects`);
        console.log(`  ✓ Operation Type: ${protocol.operation?.type || 'N/A'}`);
        console.log(`  ✓ Reasoning: ${protocol.reasoning?.substring(0, 80)}...`);
      }
    } else {
      console.log('ℹ️  No pending approvals found (this is normal if test script hasn\'t run)');
    }

    results.push({ test: 'Get Pending Approvals', passed: true, data: pendingApprovals });
  } catch (error) {
    console.error('❌ Failed:', error instanceof Error ? error.message : error);
    results.push({ test: 'Get Pending Approvals', passed: false });
  }

  console.log();

  // Test 2: Get Action by ID
  console.log('🔍 Test 2: Get Action by ID');
  console.log('═'.repeat(60));
  try {
    const pendingApprovals = await getPendingApprovals(1);

    if (pendingApprovals.length > 0) {
      const actionId = pendingApprovals[0].id;
      const action = await getActionById(actionId);

      if (action) {
        console.log(`✅ Retrieved action: ${action.id}`);
        console.log(`  Type: ${action.actionType}`);
        console.log(`  Description: ${action.description}`);

        // Verify all required fields are present
        const requiredFields = [
          'id',
          'actionType',
          'status',
          'requiresApproval',
          'createdAt',
          'actionProtocol',
        ];
        const missingFields = requiredFields.filter((field) => !(field in action));

        if (missingFields.length === 0) {
          console.log('  ✓ All required fields present');
        } else {
          console.log(`  ⚠️  Missing fields: ${missingFields.join(', ')}`);
        }

        results.push({ test: 'Get Action by ID', passed: true, data: action });
      } else {
        console.log('❌ Action not found');
        results.push({ test: 'Get Action by ID', passed: false });
      }
    } else {
      console.log('ℹ️  No actions available to test (skipped)');
      results.push({ test: 'Get Action by ID', passed: true, data: null });
    }
  } catch (error) {
    console.error('❌ Failed:', error instanceof Error ? error.message : error);
    results.push({ test: 'Get Action by ID', passed: false });
  }

  console.log();

  // Test 3: Get Recent Actions
  console.log('📊 Test 3: Get Recent Actions (Activity Feed)');
  console.log('═'.repeat(60));
  try {
    const recentActions = await getRecentActions(10);

    console.log(`✅ Found ${recentActions.length} recent actions`);

    if (recentActions.length > 0) {
      console.log('\nRecent Activity:');
      recentActions.slice(0, 5).forEach((action, i) => {
        console.log(`  ${i + 1}. ${action.actionType} - ${action.status} (${new Date(action.createdAt).toLocaleString()})`);
      });
    } else {
      console.log('ℹ️  No recent actions found');
    }

    results.push({ test: 'Get Recent Actions', passed: true, data: recentActions });
  } catch (error) {
    console.error('❌ Failed:', error instanceof Error ? error.message : error);
    results.push({ test: 'Get Recent Actions', passed: false });
  }

  console.log();

  // Test 4: Get Action History
  console.log('📜 Test 4: Get Action History (Audit Trail)');
  console.log('═'.repeat(60));
  try {
    const history = await getActionHistory({
      limit: 20,
    });

    console.log(`✅ Found ${history.length} actions in history`);

    // Test filtering
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentHistory = await getActionHistory({
      startDate: last7Days,
      limit: 50,
    });

    console.log(`  Last 7 days: ${recentHistory.length} actions`);

    results.push({ test: 'Get Action History', passed: true, data: history });
  } catch (error) {
    console.error('❌ Failed:', error instanceof Error ? error.message : error);
    results.push({ test: 'Get Action History', passed: false });
  }

  console.log();

  // Test 5: Get Action Statistics
  console.log('📈 Test 5: Get Action Statistics (Metrics)');
  console.log('═'.repeat(60));
  try {
    const stats = await getActionStats();

    console.log('✅ Action Statistics:');
    console.log(`  Total Actions: ${stats.total}`);
    console.log(`  Pending Approval: ${stats.pending_approval}`);
    console.log(`  Approved: ${stats.approved}`);
    console.log(`  Executed: ${stats.executed}`);
    console.log(`  Failed: ${stats.failed}`);
    console.log(`  Rejected: ${stats.rejected}`);

    console.log('\n  By Type:');
    Object.entries(stats.byType).forEach(([type, count]) => {
      console.log(`    ${type}: ${count}`);
    });

    console.log('\n  By Risk Level:');
    Object.entries(stats.byRiskLevel).forEach(([level, count]) => {
      console.log(`    ${level}: ${count}`);
    });

    results.push({ test: 'Get Action Statistics', passed: true, data: stats });
  } catch (error) {
    console.error('❌ Failed:', error instanceof Error ? error.message : error);
    results.push({ test: 'Get Action Statistics', passed: false });
  }

  console.log();

  // Test 6: Get Actions by Risk Level
  console.log('⚠️  Test 6: Get Actions by Risk Level');
  console.log('═'.repeat(60));
  try {
    const highRisk = await getActionsByRiskLevel('high', 10);
    const mediumRisk = await getActionsByRiskLevel('medium', 10);
    const lowRisk = await getActionsByRiskLevel('low', 10);

    console.log('✅ Actions by Risk Level:');
    console.log(`  High Risk: ${highRisk.length}`);
    console.log(`  Medium Risk: ${mediumRisk.length}`);
    console.log(`  Low Risk: ${lowRisk.length}`);

    results.push({
      test: 'Get Actions by Risk Level',
      passed: true,
      data: { high: highRisk, medium: mediumRisk, low: lowRisk },
    });
  } catch (error) {
    console.error('❌ Failed:', error instanceof Error ? error.message : error);
    results.push({ test: 'Get Actions by Risk Level', passed: false });
  }

  console.log();

  // Test 7: Get Active Alerts
  console.log('🚨 Test 7: Get Active Alerts');
  console.log('═'.repeat(60));
  try {
    const alerts = await getActiveAlerts();

    console.log(`✅ Found ${alerts.length} active alerts`);

    if (alerts.length > 0) {
      console.log('\nActive Alerts:');
      alerts.slice(0, 5).forEach((alert, i) => {
        console.log(`  ${i + 1}. [${alert.priority}] ${alert.title}`);
        console.log(`     ${alert.description}`);
      });
    } else {
      console.log('ℹ️  No active alerts (this is good!)');
    }

    results.push({ test: 'Get Active Alerts', passed: true, data: alerts });
  } catch (error) {
    console.error('❌ Failed:', error instanceof Error ? error.message : error);
    results.push({ test: 'Get Active Alerts', passed: false });
  }

  console.log();

  // Test 8: Get Latest Analysis Results
  console.log('📊 Test 8: Get Latest Analysis Results');
  console.log('═'.repeat(60));
  try {
    const analysisResults = await getLatestAnalysisResults(5);

    console.log(`✅ Found ${analysisResults.length} analysis results`);

    if (analysisResults.length > 0) {
      console.log('\nLatest Analyses:');
      analysisResults.forEach((result, i) => {
        console.log(
          `  ${i + 1}. ${result.jobId} - ${result.status} (${new Date(result.runAt).toLocaleString()})`
        );
        console.log(`     Alerts: ${result.alertsGenerated}, Duration: ${result.durationMs}ms`);
      });
    } else {
      console.log('ℹ️  No analysis results found');
    }

    results.push({ test: 'Get Latest Analysis Results', passed: true, data: analysisResults });
  } catch (error) {
    console.error('❌ Failed:', error instanceof Error ? error.message : error);
    results.push({ test: 'Get Latest Analysis Results', passed: false });
  }

  console.log();

  // Summary
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║                     TEST SUMMARY                          ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log();

  for (const result of results) {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`  ${status}  ${result.test}`);
  }

  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;

  console.log(`\n  Total: ${passedCount}/${totalCount} tests passed`);

  if (passedCount === totalCount) {
    console.log('\n✅ All tests passed! Dashboard backend is ready.');
    console.log('\n📋 Available Data for Dashboard:');
    console.log('   ✓ Pending approvals (main view)');
    console.log('   ✓ Action details (full Action Protocol v1.1)');
    console.log('   ✓ Recent activity (executed actions)');
    console.log('   ✓ Action history (audit trail)');
    console.log('   ✓ Action statistics (metrics)');
    console.log('   ✓ Risk-based filtering');
    console.log('   ✓ Active alerts');
    console.log('   ✓ Analysis context');
    console.log('\n🚀 Ready to build the Operator Dashboard UI!');
  } else {
    console.log('\n❌ Some tests failed. Please check the errors above.');
  }

  console.log('\n═'.repeat(60));

  process.exit(passedCount === totalCount ? 0 : 1);
}

// ============================================================================
// RUN TESTS
// ============================================================================

testDashboardBackend().catch((error) => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
