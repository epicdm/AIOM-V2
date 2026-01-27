/**
 * Odoo JSON-2 API Comprehensive Test
 *
 * Tests all departments and data access using Odoo 19's JSON-2 External API
 */

import { config } from 'dotenv';
config();

import { createOdooJSON2Client } from '../src/lib/odoo/json2-client';
import type { JSON2Config } from '../src/lib/odoo/json2-client';

// Test configuration
const ODOO_CONFIG: JSON2Config = {
  url: 'https://epic-communications-inc818.odoo.com',
  database: 'epic-communications-inc818',
  apiKey: '96b9905144816c05237f7facbd34994b7a183706',
};

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║                                                           ║');
console.log('║      Odoo JSON-2 API Comprehensive Test                  ║');
console.log('║      Testing All Departments (Odoo 19)                   ║');
console.log('║                                                           ║');
console.log('╚═══════════════════════════════════════════════════════════╝');
console.log();
console.log(`🔗 Odoo Instance: ${ODOO_CONFIG.url}`);
console.log(`📦 Database: ${ODOO_CONFIG.database}`);
console.log(`🔑 Using API Key authentication (JSON-2)`);
console.log();

interface TestResult {
  department: string;
  test: string;
  passed: boolean;
  count?: number;
  data?: any;
  error?: string;
}

const results: TestResult[] = [];

async function testConnection() {
  console.log('━'.repeat(60));
  console.log('🔌 STEP 1: Testing Connection & Authentication');
  console.log('━'.repeat(60));
  console.log();

  try {
    const odoo = createOdooJSON2Client(ODOO_CONFIG);

    // Try to get version info directly (this tests connection + auth)
    let version;
    try {
      console.log('Testing version endpoint...');
      version = await odoo.version(true); // Enable debug
      console.log(`✅ Connection successful!`);
      console.log(`   Server version: ${version.server_version || 'N/A'}`);
      console.log(`   Series: ${version.server_serie || 'N/A'}`);
    } catch (versionError) {
      console.error('   ⚠️  Version endpoint failed, trying simple search...');
      console.error('   Error:', versionError instanceof Error ? versionError.message : versionError);

      // Try a simple search instead
      console.log('Testing searchCount endpoint...');
      const testResult = await odoo.searchCount('res.partner', [], true); // Enable debug
      console.log(`✅ Connection successful! (found ${testResult} partners)`);
      version = { test: 'passed' };
    }
    console.log();

    results.push({
      department: 'System',
      test: 'Connection & Auth',
      passed: true,
      data: version,
    });

    return odoo;
  } catch (error) {
    console.error('❌ Connection failed:');
    console.error(error);
    results.push({
      department: 'System',
      test: 'Connection & Auth',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

async function testFinanceDepartment(odoo: any) {
  console.log('━'.repeat(60));
  console.log('💰 STEP 2: Testing Finance Department');
  console.log('━'.repeat(60));
  console.log();

  // Test 1: Invoices
  try {
    console.log('📄 Test 2.1: Fetching Invoices...');
    const invoices = await odoo.searchRead(
      'account.move',
      [['move_type', 'in', ['out_invoice', 'out_refund']]],
      {
        fields: ['name', 'partner_id', 'amount_total', 'payment_state', 'invoice_date', 'state'],
        limit: 10,
      }
    );

    console.log(`   ✅ Found ${invoices.length} invoices`);
    if (invoices.length > 0) {
      const sample = invoices[0];
      console.log(`   Sample Invoice:`);
      console.log(`     - Number: ${sample.name}`);
      console.log(`     - Customer: ${sample.partner_id?.[1] || 'N/A'}`);
      console.log(`     - Amount: $${sample.amount_total}`);
      console.log(`     - Payment State: ${sample.payment_state}`);
      console.log(`     - State: ${sample.state}`);
    }
    console.log();

    results.push({
      department: 'Finance',
      test: 'Fetch Invoices',
      passed: true,
      count: invoices.length,
      data: invoices[0],
    });
  } catch (error) {
    console.error('   ❌ Failed:', error instanceof Error ? error.message : error);
    results.push({
      department: 'Finance',
      test: 'Fetch Invoices',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Test 2: Unpaid Invoices
  try {
    console.log('💳 Test 2.2: Fetching Unpaid Invoices...');
    const unpaidInvoices = await odoo.searchRead(
      'account.move',
      [
        ['move_type', '=', 'out_invoice'],
        ['payment_state', 'in', ['not_paid', 'partial']],
        ['state', '=', 'posted'],
      ],
      {
        fields: ['name', 'partner_id', 'amount_total', 'amount_residual'],
        limit: 10,
      }
    );

    console.log(`   ✅ Found ${unpaidInvoices.length} unpaid invoices`);
    const totalUnpaid = unpaidInvoices.reduce((sum: number, inv: any) => sum + (inv.amount_residual || 0), 0);
    console.log(`   Total Unpaid: $${totalUnpaid.toFixed(2)}`);
    console.log();

    results.push({
      department: 'Finance',
      test: 'Unpaid Invoices',
      passed: true,
      count: unpaidInvoices.length,
      data: { totalUnpaid },
    });
  } catch (error) {
    console.error('   ❌ Failed:', error instanceof Error ? error.message : error);
    results.push({
      department: 'Finance',
      test: 'Unpaid Invoices',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Test 3: Payments
  try {
    console.log('💵 Test 2.3: Fetching Payments...');
    const payments = await odoo.searchRead(
      'account.payment',
      [],
      {
        fields: ['name', 'partner_id', 'amount', 'payment_type', 'state', 'date'],
        limit: 10,
      }
    );

    console.log(`   ✅ Found ${payments.length} payments`);
    if (payments.length > 0) {
      const sample = payments[0];
      console.log(`   Sample Payment:`);
      console.log(`     - Reference: ${sample.name}`);
      console.log(`     - Amount: $${sample.amount}`);
      console.log(`     - Type: ${sample.payment_type}`);
      console.log(`     - State: ${sample.state}`);
    }
    console.log();

    results.push({
      department: 'Finance',
      test: 'Fetch Payments',
      passed: true,
      count: payments.length,
      data: payments[0],
    });
  } catch (error) {
    console.error('   ❌ Failed:', error instanceof Error ? error.message : error);
    results.push({
      department: 'Finance',
      test: 'Fetch Payments',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function testSalesDepartment(odoo: any) {
  console.log('━'.repeat(60));
  console.log('📈 STEP 3: Testing Sales Department');
  console.log('━'.repeat(60));
  console.log();

  // Test 1: Opportunities
  try {
    console.log('🎯 Test 3.1: Fetching Sales Opportunities...');
    const opportunities = await odoo.searchRead(
      'crm.lead',
      [['type', '=', 'opportunity']],
      {
        fields: ['name', 'partner_id', 'expected_revenue', 'probability', 'stage_id', 'user_id'],
        limit: 10,
      }
    );

    console.log(`   ✅ Found ${opportunities.length} opportunities`);
    if (opportunities.length > 0) {
      const sample = opportunities[0];
      console.log(`   Sample Opportunity:`);
      console.log(`     - Name: ${sample.name}`);
      console.log(`     - Expected Revenue: $${sample.expected_revenue}`);
      console.log(`     - Stage: ${sample.stage_id?.[1] || 'N/A'}`);
      console.log(`     - Probability: ${sample.probability}%`);
    }
    console.log();

    results.push({
      department: 'Sales',
      test: 'Fetch Opportunities',
      passed: true,
      count: opportunities.length,
      data: opportunities[0],
    });
  } catch (error) {
    console.error('   ❌ Failed:', error instanceof Error ? error.message : error);
    results.push({
      department: 'Sales',
      test: 'Fetch Opportunities',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Test 2: Sales Orders
  try {
    console.log('📦 Test 3.2: Fetching Sales Orders...');
    const orders = await odoo.searchRead(
      'sale.order',
      [],
      {
        fields: ['name', 'partner_id', 'amount_total', 'state', 'date_order'],
        limit: 10,
      }
    );

    console.log(`   ✅ Found ${orders.length} sales orders`);
    if (orders.length > 0) {
      const sample = orders[0];
      console.log(`   Sample Order:`);
      console.log(`     - Number: ${sample.name}`);
      console.log(`     - Customer: ${sample.partner_id?.[1] || 'N/A'}`);
      console.log(`     - Amount: $${sample.amount_total}`);
      console.log(`     - State: ${sample.state}`);
    }
    console.log();

    results.push({
      department: 'Sales',
      test: 'Fetch Sales Orders',
      passed: true,
      count: orders.length,
      data: orders[0],
    });
  } catch (error) {
    console.error('   ❌ Failed:', error instanceof Error ? error.message : error);
    results.push({
      department: 'Sales',
      test: 'Fetch Sales Orders',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function testOperationsDepartment(odoo: any) {
  console.log('━'.repeat(60));
  console.log('🏭 STEP 4: Testing Operations Department');
  console.log('━'.repeat(60));
  console.log();

  // Test 1: Products
  try {
    console.log('📦 Test 4.1: Fetching Products...');
    const products = await odoo.searchRead(
      'product.product',
      [],
      {
        fields: ['name', 'default_code', 'list_price', 'qty_available', 'type'],
        limit: 10,
      }
    );

    console.log(`   ✅ Found ${products.length} products`);
    if (products.length > 0) {
      const sample = products[0];
      console.log(`   Sample Product:`);
      console.log(`     - Name: ${sample.name}`);
      console.log(`     - Code: ${sample.default_code || 'N/A'}`);
      console.log(`     - Price: $${sample.list_price}`);
      console.log(`     - Available: ${sample.qty_available}`);
      console.log(`     - Type: ${sample.type}`);
    }
    console.log();

    results.push({
      department: 'Operations',
      test: 'Fetch Products',
      passed: true,
      count: products.length,
      data: products[0],
    });
  } catch (error) {
    console.error('   ❌ Failed:', error instanceof Error ? error.message : error);
    results.push({
      department: 'Operations',
      test: 'Fetch Products',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function testCustomerSupport(odoo: any) {
  console.log('━'.repeat(60));
  console.log('🎧 STEP 5: Testing Customer Support');
  console.log('━'.repeat(60));
  console.log();

  // Test 1: Customers
  try {
    console.log('👥 Test 5.1: Fetching Customers...');
    const customers = await odoo.searchRead(
      'res.partner',
      [['customer_rank', '>', 0]],
      {
        fields: ['name', 'email', 'phone', 'city', 'country_id'],
        limit: 10,
      }
    );

    console.log(`   ✅ Found ${customers.length} customers`);
    if (customers.length > 0) {
      const sample = customers[0];
      console.log(`   Sample Customer:`);
      console.log(`     - Name: ${sample.name}`);
      console.log(`     - Email: ${sample.email || 'N/A'}`);
      console.log(`     - Phone: ${sample.phone || 'N/A'}`);
      console.log(`     - City: ${sample.city || 'N/A'}`);
    }
    console.log();

    results.push({
      department: 'Support',
      test: 'Fetch Customers',
      passed: true,
      count: customers.length,
      data: customers[0],
    });
  } catch (error) {
    console.error('   ❌ Failed:', error instanceof Error ? error.message : error);
    results.push({
      department: 'Support',
      test: 'Fetch Customers',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function testProjectsDepartment(odoo: any) {
  console.log('━'.repeat(60));
  console.log('📋 STEP 6: Testing Projects Department');
  console.log('━'.repeat(60));
  console.log();

  // Test 1: Projects
  try {
    console.log('🗂️  Test 6.1: Fetching Projects...');
    const projects = await odoo.searchRead(
      'project.project',
      [],
      {
        fields: ['name', 'user_id', 'partner_id', 'task_count'],
        limit: 10,
      }
    );

    console.log(`   ✅ Found ${projects.length} projects`);
    if (projects.length > 0) {
      const sample = projects[0];
      console.log(`   Sample Project:`);
      console.log(`     - Name: ${sample.name}`);
      console.log(`     - Manager: ${sample.user_id?.[1] || 'N/A'}`);
      console.log(`     - Customer: ${sample.partner_id?.[1] || 'N/A'}`);
      console.log(`     - Tasks: ${sample.task_count || 0}`);
    }
    console.log();

    results.push({
      department: 'Projects',
      test: 'Fetch Projects',
      passed: true,
      count: projects.length,
      data: projects[0],
    });
  } catch (error) {
    console.error('   ❌ Failed:', error instanceof Error ? error.message : error);
    results.push({
      department: 'Projects',
      test: 'Fetch Projects',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Test 2: Tasks
  try {
    console.log('✅ Test 6.2: Fetching Tasks...');
    const tasks = await odoo.searchRead(
      'project.task',
      [],
      {
        fields: ['name', 'project_id', 'stage_id', 'priority', 'date_deadline'],
        limit: 10,
      }
    );

    console.log(`   ✅ Found ${tasks.length} tasks`);
    if (tasks.length > 0) {
      const sample = tasks[0];
      console.log(`   Sample Task:`);
      console.log(`     - Name: ${sample.name}`);
      console.log(`     - Project: ${sample.project_id?.[1] || 'N/A'}`);
      console.log(`     - Stage: ${sample.stage_id?.[1] || 'N/A'}`);
      console.log(`     - Priority: ${sample.priority}`);
    }
    console.log();

    results.push({
      department: 'Projects',
      test: 'Fetch Tasks',
      passed: true,
      count: tasks.length,
      data: tasks[0],
    });
  } catch (error) {
    console.error('   ❌ Failed:', error instanceof Error ? error.message : error);
    results.push({
      department: 'Projects',
      test: 'Fetch Tasks',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function testActivities(odoo: any) {
  console.log('━'.repeat(60));
  console.log('📞 STEP 7: Testing Activities');
  console.log('━'.repeat(60));
  console.log();

  // Test 1: Activities
  try {
    console.log('📅 Test 7.1: Fetching Activities...');
    const activities = await odoo.searchRead(
      'mail.activity',
      [],
      {
        fields: ['summary', 'activity_type_id', 'user_id', 'date_deadline', 'state'],
        limit: 10,
      }
    );

    console.log(`   ✅ Found ${activities.length} activities`);
    if (activities.length > 0) {
      const sample = activities[0];
      console.log(`   Sample Activity:`);
      console.log(`     - Summary: ${sample.summary || 'N/A'}`);
      console.log(`     - Type: ${sample.activity_type_id?.[1] || 'N/A'}`);
      console.log(`     - Assigned to: ${sample.user_id?.[1] || 'N/A'}`);
      console.log(`     - Deadline: ${sample.date_deadline}`);
      console.log(`     - State: ${sample.state}`);
    }
    console.log();

    results.push({
      department: 'Communications',
      test: 'Fetch Activities',
      passed: true,
      count: activities.length,
      data: activities[0],
    });
  } catch (error) {
    console.error('   ❌ Failed:', error instanceof Error ? error.message : error);
    results.push({
      department: 'Communications',
      test: 'Fetch Activities',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// Main test execution
async function runAllTests() {
  try {
    // Step 1: Test connection
    const odoo = await testConnection();

    // Step 2-7: Test all departments
    await testFinanceDepartment(odoo);
    await testSalesDepartment(odoo);
    await testOperationsDepartment(odoo);
    await testCustomerSupport(odoo);
    await testProjectsDepartment(odoo);
    await testActivities(odoo);

    // Summary
    console.log('━'.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('━'.repeat(60));
    console.log();

    const byDepartment = results.reduce((acc: any, r) => {
      if (!acc[r.department]) acc[r.department] = { passed: 0, failed: 0 };
      if (r.passed) acc[r.department].passed++;
      else acc[r.department].failed++;
      return acc;
    }, {});

    Object.entries(byDepartment).forEach(([dept, stats]: [string, any]) => {
      const total = stats.passed + stats.failed;
      const icon = stats.failed === 0 ? '✅' : stats.passed > 0 ? '⚠️' : '❌';
      console.log(`${icon} ${dept}: ${stats.passed}/${total} tests passed`);
    });

    console.log();
    const totalPassed = results.filter((r) => r.passed).length;
    const totalTests = results.length;
    console.log(
      `Overall: ${totalPassed}/${totalTests} tests passed (${((totalPassed / totalTests) * 100).toFixed(1)}%)`
    );
    console.log();

    // Data availability summary
    console.log('━'.repeat(60));
    console.log('📈 DATA AVAILABILITY');
    console.log('━'.repeat(60));
    console.log();

    const dataAvailability = results
      .filter((r) => r.passed && r.count !== undefined)
      .map((r) => `${r.department} - ${r.test}: ${r.count} records`);

    dataAvailability.forEach((line) => console.log(`   ${line}`));
    console.log();

    if (totalPassed === totalTests) {
      console.log('✅ All tests passed! Odoo JSON-2 API is working perfectly.');
    } else {
      console.log(`⚠️  ${totalTests - totalPassed} test(s) failed. Check errors above.`);
    }
    console.log();

    process.exit(totalPassed === totalTests ? 0 : 1);
  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

runAllTests();
