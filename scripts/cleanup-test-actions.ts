/**
 * Cleanup Test Actions
 *
 * Removes old test data (Acme Corp, Tech Solutions Inc) from autonomous_actions table
 */

import { config } from 'dotenv';
config();

import pg from 'pg';

async function cleanupTestActions() {
  console.log('🧹 Cleaning up test actions...\n');

  const testActionIds = [
    'dFM2TtNPItWsltK723l6P', // Acme Corp - INV-2024-001
    'h3H7nyvLKK10491i-xaNB', // Tech Solutions Inc - INV-2024-002
  ];

  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();

    const result = await client.query(
      'DELETE FROM autonomous_actions WHERE id = ANY($1) RETURNING id, description',
      [testActionIds]
    );

    console.log(`✅ Deleted ${result.rowCount} test actions:`);
    result.rows.forEach(action => {
      console.log(`   - ${action.id}: ${action.description}`);
    });

    console.log('\n✅ Cleanup complete! Dashboard should now show only real Odoo data.\n');
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }

  process.exit(0);
}

cleanupTestActions();
