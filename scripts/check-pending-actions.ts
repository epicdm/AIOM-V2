import { database } from '../src/db';
import { autonomousActions } from '../src/db/ai-coo-schema';
import { eq, desc } from 'drizzle-orm';

async function checkActions() {
  const actions = await database
    .select()
    .from(autonomousActions)
    .where(eq(autonomousActions.status, 'pending_approval'))
    .orderBy(desc(autonomousActions.createdAt));

  console.log(`\n✅ Found ${actions.length} pending actions:\n`);

  actions.forEach((action, i) => {
    console.log(`${i + 1}. ${action.actionType}`);
    console.log(`   ID: ${action.id}`);
    console.log(`   Description: ${action.description}`);
    console.log(`   Risk Level: ${action.riskLevel || 'unknown'}`);
    console.log(`   Requires Approval: ${action.requiresApproval ? 'Yes' : 'No'}`);
    console.log(`   Created: ${action.createdAt}`);
    console.log();
  });

  process.exit(0);
}

checkActions();
