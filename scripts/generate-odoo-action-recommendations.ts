/**
 * Generate Action Recommendations from Odoo Data
 *
 * This script:
 * 1. Fetches real financial data from Odoo (AR, AP, Invoices, Deals)
 * 2. Analyzes the data using the financial analyzer
 * 3. Generates action recommendations using Claude
 * 4. Saves recommendations to autonomous_actions table
 *
 * Run: npx tsx scripts/generate-odoo-action-recommendations.ts
 */

import { database } from '../src/db';
import { autonomousActions, monitoringJobs } from '../src/db/ai-coo-schema';
import { getOdooClient } from '../src/data-access/odoo';
import { runFinancialAnalysis } from '../src/lib/ai-coo/analyzers/financial';
import { eq, desc } from 'drizzle-orm';

async function generateRecommendations() {
  console.log('🚀 Generating Action Recommendations from Odoo Data\n');
  console.log('=' .repeat(60));

  try {
    // Step 1: Verify Odoo connection
    console.log('\n📡 Step 1: Connecting to Odoo...');
    const odooClient = await getOdooClient();
    console.log('✅ Connected to Odoo');

    // Step 2: Create or get monitoring job
    console.log('\n📋 Step 2: Setting up monitoring job...');
    const [job] = await database
      .select()
      .from(monitoringJobs)
      .where(eq(monitoringJobs.name, 'Financial Health Check'))
      .limit(1);

    const mockJob = job || {
      id: 'manual-financial-analysis',
      name: 'Manual Financial Analysis',
      analyzerType: 'financial',
      config: {
        thresholds: {
          cashRunwayDays: 60,
          ar60PlusDaysPercent: 30,
          ar90PlusDaysAmount: 50000,
          ap90PlusDaysAmount: 25000,
          workingCapitalMin: 0,
        },
      },
    };

    console.log(`✅ Using job: ${mockJob.name}`);

    // Step 3: Run full financial analysis (fetches from Odoo + analyzes with Claude)
    console.log('\n🔍 Step 3: Running financial analysis...');
    console.log('   • Fetching data from Odoo');
    console.log('   • Analyzing with Claude AI');
    console.log('   • Generating action recommendations');
    console.log('   (This may take 30-60 seconds...)\n');

    await runFinancialAnalysis(mockJob);

    console.log(`✅ Analysis complete!`);

    // Step 4: Check what was generated
    console.log('\n📊 Step 4: Checking generated actions...');
    const pendingActions = await database
      .select()
      .from(autonomousActions)
      .where(eq(autonomousActions.status, 'pending_approval'))
      .orderBy(desc(autonomousActions.createdAt));

    console.log(`\n✅ Found ${pendingActions.length} pending actions:\n`);

    // Step 5: Display pending actions
    if (pendingActions.length === 0) {
      console.log('ℹ️  No pending actions found.');
      console.log('   The analysis may not have identified any issues requiring action.');
      console.log('   This means your financial health is stable!');
    } else {
      console.log('📋 Pending Actions:\n');
      pendingActions.forEach((action, i) => {
        console.log(`${i + 1}. ${action.actionType}`);
        console.log(`   Status: ${action.status}`);
        console.log(`   Risk: ${action.riskLevel || 'unknown'}`);
        console.log(`   Description: ${action.description}`);
        console.log(`   Requires Approval: ${action.requiresApproval ? 'Yes' : 'No'}`);
        console.log(`   Created: ${action.createdAt}`);
        console.log();
      });

      // Step 6: Summary
      console.log('\n' + '='.repeat(60));
      console.log('✅ GENERATION COMPLETE');
      console.log('='.repeat(60));
      console.log(`\nSummary:`);
      console.log(`  • Data Source: Odoo (Real financial data)`);
      console.log(`  • Analyzer: Claude AI`);
      console.log(`  • Actions Generated: ${pendingActions.length}`);
      console.log(`  • Status: Ready for approval`);

      console.log(`\n🎯 Next Steps:`);
      console.log(`  1. Navigate to: http://localhost:3000/dashboard/ai-coo`);
      console.log(`  2. Log in with your account`);
      console.log(`  3. Review the ${pendingActions.length} action recommendations`);
      console.log(`  4. Click "Approve & Execute" to run real workflows!`);

      console.log(`\n💡 What Happens When You Click "Approve & Execute":`);
      console.log(`  • Button shows loading spinner`);
      console.log(`  • POST to /api/ai-coo/approve-action`);
      console.log(`  • Workflow executes (creates Odoo tasks, sends emails, etc.)`);
      console.log(`  • Action status changes to 'executed' in database`);
      console.log(`  • Dashboard shows success message`);
      console.log(`  • Results visible in Odoo!`);
    }
  } catch (error) {
    console.error('\n❌ Error generating recommendations:', error);

    if (error instanceof Error) {
      console.error(`\nError Details:`);
      console.error(`  Message: ${error.message}`);
      console.error(`  Stack: ${error.stack?.split('\n').slice(0, 3).join('\n')}`);
    }

    // Common error troubleshooting
    console.error('\n🔧 Troubleshooting:');
    console.error('  1. Check Odoo connection:');
    console.error('     - ODOO_URL is set in .env');
    console.error('     - ODOO_DB is correct');
    console.error('     - ODOO_USERNAME and ODOO_PASSWORD are valid');
    console.error('  2. Check Claude API:');
    console.error('     - ANTHROPIC_API_KEY is set in .env');
    console.error('     - API key has credits available');
    console.error('  3. Check database:');
    console.error('     - DATABASE_URL is set');
    console.error('     - Tables exist (run migrations)');

    process.exit(1);
  }
}

// Run the script
console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  AI COO Action Recommendation Generator                   ║');
console.log('║  Pulls real data from Odoo → Generates Claude actions     ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log();

generateRecommendations()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
