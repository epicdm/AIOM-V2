import { database as db } from '~/db';
import { autonomousActions } from '~/db/ai-coo-schema';
import { eq, desc } from 'drizzle-orm';

async function testDashboardAPI() {
  console.log('🧪 Testing AI COO Dashboard API Data...\n');

  try {
    // Test 1: Check pending action recommendations
    console.log('📋 Checking pending action recommendations...');
    const pendingActions = await db
      .select()
      .from(autonomousActions)
      .where(eq(autonomousActions.status, 'pending_approval'))
      .orderBy(desc(autonomousActions.createdAt))
      .limit(10);

    console.log(`Found ${pendingActions.length} pending actions`);
    if (pendingActions.length > 0) {
      console.log('Sample action:', {
        id: pendingActions[0].id,
        actionType: pendingActions[0].actionType,
        status: pendingActions[0].status,
        createdAt: pendingActions[0].createdAt,
      });
    }

    // Test 2: Check recent executed actions
    console.log('\n✅ Checking executed actions...');
    const executedActions = await db
      .select()
      .from(autonomousActions)
      .where(eq(autonomousActions.status, 'executed'))
      .orderBy(desc(autonomousActions.executedAt))
      .limit(5);

    console.log(`Found ${executedActions.length} executed actions`);

    // Test 3: Count total actions
    console.log('\n📊 Total actions summary...');
    const allActions = await db
      .select()
      .from(autonomousActions)
      .orderBy(desc(autonomousActions.createdAt));

    const statusCounts = allActions.reduce((acc, action) => {
      acc[action.status] = (acc[action.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('Actions by status:', statusCounts);
    console.log(`Total actions: ${allActions.length}`);

    if (allActions.length === 0) {
      console.log('\n⚠️  No actions found in database.');
      console.log('💡 To generate test data, run the financial analyzer:');
      console.log('   npm run analyze:financial');
    } else {
      console.log('\n✅ Database has action data - API endpoints should return results!');
    }

  } catch (error) {
    console.error('❌ Error testing API:', error);
  }

  process.exit(0);
}

testDashboardAPI();
