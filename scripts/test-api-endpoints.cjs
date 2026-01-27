/**
 * Complete API Endpoint Test
 */

const { Pool } = require('pg');

async function testAPI() {
  console.log('🧪 Testing AI COO Workflow Execution
');
  console.log('='.repeat(60));

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('
📋 Step 1: Fetching pending action...');
    
    const result = await pool.query(
      'SELECT * FROM autonomous_actions WHERE status = $1 ORDER BY created_at DESC LIMIT 1',
      ['pending_approval']
    );

    if (result.rows.length === 0) {
      console.log('❌ No pending actions');
      process.exit(1);
    }

    const action = result.rows[0];
    console.log();
    console.log();

    console.log('
🔄 Step 2: Calling API...');
    
    const response = await fetch('http://localhost:3000/api/ai-coo/approve-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actionId: action.id,
        userId: 't2iS7XpeskuU4dctRgItGbYqxz9Zchic',
      }),
    });

    const data = await response.json();
    console.log();
    console.log('   Response:', JSON.stringify(data, null, 2));

    console.log('
📊 Step 3: Checking database...');
    
    const updated = await pool.query(
      'SELECT status, executed_at FROM autonomous_actions WHERE id = $1',
      [action.id]
    );

    const final = updated.rows[0];
    console.log();

    console.log('
' + '='.repeat(60));
    
    if (data.success && final.status === 'executed') {
      console.log('✅ FULL TEST PASSED!');
      console.log('
🎉 Workflow execution WORKS!');
    } else {
      console.log();
    }

  } catch (error) {
    console.error('
❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

testAPI();
