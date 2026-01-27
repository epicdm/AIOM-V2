/**
 * Comprehensive Odoo Test Script
 *
 * Tests ALL departments and common scenarios with live Odoo instance
 * - Finance: Invoices, payments, bank statements
 * - Sales: Opportunities, quotes, orders
 * - Operations: Inventory, products, stock
 * - Support: Tickets, helpdesk
 * - HR: Employees, leave requests, attendance
 * - Projects: Projects, tasks, timesheets
 * - Marketing: Campaigns, leads
 * - Accounting: Journal entries, reconciliation
 */

import { config } from 'dotenv';
config();

import { OdooClient } from '../src/lib/odoo/client';
import type { OdooConfig } from '../src/lib/odoo/types';

// Test configuration
const ODOO_CONFIG: OdooConfig = {
  url: 'https://epic-communications-inc818.odoo.com',
  database: 'epic-communications-inc818',
  username: 'eric.giraud@epic.dm',
  password: '96b9905144816c05237f7facbd34994b7a183706', // API key used as password
};

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║                                                           ║');
console.log('║      Comprehensive Odoo Integration Test                 ║');
console.log('║      Testing All Departments & Common Scenarios          ║');
console.log('║                                                           ║');
console.log('╚═══════════════════════════════════════════════════════════╝');
console.log();
console.log(`🔗 Testing Odoo Instance: ${ODOO_CONFIG.url}`);
console.log(`📧 User: ${ODOO_CONFIG.username}`);
console.log();

interface TestResult {
  department: string;
  test: string;
  passed: boolean;
  data?: any;
  count?: number;
  error?: string;
}

const results: TestResult[] = [];

async function testConnection() {
  console.log('━'.repeat(60));
  console.log('🔌 STEP 1: Testing Authentication');
  console.log('━'.repeat(60));
  console.log();

  try {
    // Create Odoo client
    const odoo = new OdooClient(ODOO_CONFIG);

    // Authenticate
    const session = await odoo.authenticate();

    console.log(`✅ Authentication successful!`);
    console.log(`   User ID: ${session.uid}`);
    console.log(`   Database: ${session.database}`);
    console.log();

    results.push({
      department: 'System',
      test: 'Authentication',
      passed: true,
      data: { uid: session.uid, database: session.database },
    });

    return odoo;
  } catch (error) {
    console.error('❌ Authentication failed:', error);
    results.push({
      department: 'System',
      test: 'Authentication',
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

  // Test 1: Invoices (account.move)
  try {
    console.log('📄 Test 2.1: Fetching Invoices...');
    const invoices = await odoo.searchRead('account.move',
      [['move_type', 'in', ['out_invoice', 'out_refund']]],
      {
        fields: ['name', 'partner_id', 'amount_total', 'payment_state', 'invoice_date', 'invoice_date_due', 'state'],
        limit: 10,
      });

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
    console.error('   ❌ Failed:', error);
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
    const unpaidInvoices = await odoo.searchRead('account.move',
      [
        ['move_type', '=', 'out_invoice'],
        ['payment_state', 'in', ['not_paid', 'partial']],
        ['state', '=', 'posted'],
      ],
      {
        fields: ['name', 'partner_id', 'amount_total', 'amount_residual', 'invoice_date_due'],
        limit: 10,
      });

    console.log(`   ✅ Found ${unpaidInvoices.length} unpaid invoices`);
    let totalUnpaid = 0;
    unpaidInvoices.forEach((inv: any) => {
      totalUnpaid += inv.amount_residual || 0;
    });
    console.log(`   Total Unpaid Amount: $${totalUnpaid.toFixed(2)}`);
    console.log();

    results.push({
      department: 'Finance',
      test: 'Unpaid Invoices',
      passed: true,
      count: unpaidInvoices.length,
      data: { totalUnpaid },
    });
  } catch (error) {
    console.error('   ❌ Failed:', error);
    results.push({
      department: 'Finance',
      test: 'Unpaid Invoices',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Test 3: Overdue Invoices
  try {
    console.log('⏰ Test 2.3: Fetching Overdue Invoices...');
    const today = new Date().toISOString().split('T')[0];
    const overdueInvoices = await odoo.searchRead('account.move', {
      domain: [
        ['move_type', '=', 'out_invoice'],
        ['payment_state', 'in', ['not_paid', 'partial']],
        ['state', '=', 'posted'],
        ['invoice_date_due', '<', today],
      ],
      fields: ['name', 'partner_id', 'amount_residual', 'invoice_date_due'],
      limit: 10,
    });

    console.log(`   ✅ Found ${overdueInvoices.length} overdue invoices`);
    if (overdueInvoices.length > 0) {
      console.log(`   Sample Overdue Invoice:`);
      const sample = overdueInvoices[0];
      console.log(`     - Number: ${sample.name}`);
      console.log(`     - Customer: ${sample.partner_id?.[1] || 'N/A'}`);
      console.log(`     - Amount Due: $${sample.amount_residual}`);
      console.log(`     - Due Date: ${sample.invoice_date_due}`);
    }
    console.log();

    results.push({
      department: 'Finance',
      test: 'Overdue Invoices',
      passed: true,
      count: overdueInvoices.length,
      data: overdueInvoices[0],
    });
  } catch (error) {
    console.error('   ❌ Failed:', error);
    results.push({
      department: 'Finance',
      test: 'Overdue Invoices',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Test 4: Payments
  try {
    console.log('💵 Test 2.4: Fetching Payments...');
    const payments = await odoo.searchRead('account.payment', {
      domain: [],
      fields: ['name', 'partner_id', 'amount', 'payment_type', 'state', 'date'],
      limit: 10,
    });

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
    console.error('   ❌ Failed:', error);
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

  // Test 1: Sales Opportunities
  try {
    console.log('🎯 Test 3.1: Fetching Sales Opportunities...');
    const opportunities = await odoo.searchRead('crm.lead', {
      domain: [['type', '=', 'opportunity']],
      fields: ['name', 'partner_id', 'expected_revenue', 'probability', 'stage_id', 'user_id', 'date_deadline'],
      limit: 10,
    });

    console.log(`   ✅ Found ${opportunities.length} opportunities`);
    if (opportunities.length > 0) {
      const sample = opportunities[0];
      console.log(`   Sample Opportunity:`);
      console.log(`     - Name: ${sample.name}`);
      console.log(`     - Customer: ${sample.partner_id?.[1] || 'N/A'}`);
      console.log(`     - Expected Revenue: $${sample.expected_revenue}`);
      console.log(`     - Stage: ${sample.stage_id?.[1] || 'N/A'}`);
      console.log(`     - Assigned to: ${sample.user_id?.[1] || 'N/A'}`);
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
    console.error('   ❌ Failed:', error);
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
    const orders = await odoo.searchRead('sale.order', {
      domain: [],
      fields: ['name', 'partner_id', 'amount_total', 'state', 'date_order', 'user_id'],
      limit: 10,
    });

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
    console.error('   ❌ Failed:', error);
    results.push({
      department: 'Sales',
      test: 'Fetch Sales Orders',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Test 3: Quotations
  try {
    console.log('📝 Test 3.3: Fetching Quotations...');
    const quotations = await odoo.searchRead('sale.order', {
      domain: [['state', 'in', ['draft', 'sent']]],
      fields: ['name', 'partner_id', 'amount_total', 'state', 'date_order'],
      limit: 10,
    });

    console.log(`   ✅ Found ${quotations.length} quotations`);
    console.log();

    results.push({
      department: 'Sales',
      test: 'Fetch Quotations',
      passed: true,
      count: quotations.length,
    });
  } catch (error) {
    console.error('   ❌ Failed:', error);
    results.push({
      department: 'Sales',
      test: 'Fetch Quotations',
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
    const products = await odoo.searchRead('product.product', {
      domain: [],
      fields: ['name', 'default_code', 'list_price', 'qty_available', 'type', 'active'],
      limit: 10,
    });

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
    console.error('   ❌ Failed:', error);
    results.push({
      department: 'Operations',
      test: 'Fetch Products',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Test 2: Inventory/Stock
  try {
    console.log('📊 Test 4.2: Fetching Stock Levels...');
    const stockQuants = await odoo.searchRead('stock.quant', {
      domain: [['quantity', '>', 0]],
      fields: ['product_id', 'location_id', 'quantity', 'reserved_quantity'],
      limit: 10,
    });

    console.log(`   ✅ Found ${stockQuants.length} stock entries`);
    if (stockQuants.length > 0) {
      const sample = stockQuants[0];
      console.log(`   Sample Stock:`);
      console.log(`     - Product: ${sample.product_id?.[1] || 'N/A'}`);
      console.log(`     - Location: ${sample.location_id?.[1] || 'N/A'}`);
      console.log(`     - Quantity: ${sample.quantity}`);
    }
    console.log();

    results.push({
      department: 'Operations',
      test: 'Fetch Stock',
      passed: true,
      count: stockQuants.length,
      data: stockQuants[0],
    });
  } catch (error) {
    console.error('   ❌ Failed:', error);
    results.push({
      department: 'Operations',
      test: 'Fetch Stock',
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

  // Test 1: Partners/Customers
  try {
    console.log('👥 Test 5.1: Fetching Customers...');
    const customers = await odoo.searchRead('res.partner', {
      domain: [['customer_rank', '>', 0]],
      fields: ['name', 'email', 'phone', 'city', 'country_id', 'customer_rank'],
      limit: 10,
    });

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
    console.error('   ❌ Failed:', error);
    results.push({
      department: 'Support',
      test: 'Fetch Customers',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Test 2: Helpdesk Tickets (if helpdesk module installed)
  try {
    console.log('🎫 Test 5.2: Fetching Helpdesk Tickets...');
    const tickets = await odoo.searchRead('helpdesk.ticket', {
      domain: [],
      fields: ['name', 'partner_id', 'stage_id', 'priority', 'user_id', 'create_date'],
      limit: 10,
    });

    console.log(`   ✅ Found ${tickets.length} helpdesk tickets`);
    if (tickets.length > 0) {
      const sample = tickets[0];
      console.log(`   Sample Ticket:`);
      console.log(`     - Subject: ${sample.name}`);
      console.log(`     - Customer: ${sample.partner_id?.[1] || 'N/A'}`);
      console.log(`     - Stage: ${sample.stage_id?.[1] || 'N/A'}`);
    }
    console.log();

    results.push({
      department: 'Support',
      test: 'Fetch Helpdesk Tickets',
      passed: true,
      count: tickets.length,
      data: tickets[0],
    });
  } catch (error) {
    console.log('   ⚠️  Helpdesk module may not be installed');
    console.log();
    results.push({
      department: 'Support',
      test: 'Fetch Helpdesk Tickets',
      passed: false,
      error: 'Module not installed or no data',
    });
  }
}

async function testHRDepartment(odoo: any) {
  console.log('━'.repeat(60));
  console.log('👔 STEP 6: Testing HR Department');
  console.log('━'.repeat(60));
  console.log();

  // Test 1: Employees
  try {
    console.log('👨‍💼 Test 6.1: Fetching Employees...');
    const employees = await odoo.searchRead('hr.employee', {
      domain: [],
      fields: ['name', 'job_id', 'department_id', 'work_email', 'work_phone', 'active'],
      limit: 10,
    });

    console.log(`   ✅ Found ${employees.length} employees`);
    if (employees.length > 0) {
      const sample = employees[0];
      console.log(`   Sample Employee:`);
      console.log(`     - Name: ${sample.name}`);
      console.log(`     - Job: ${sample.job_id?.[1] || 'N/A'}`);
      console.log(`     - Department: ${sample.department_id?.[1] || 'N/A'}`);
      console.log(`     - Email: ${sample.work_email || 'N/A'}`);
    }
    console.log();

    results.push({
      department: 'HR',
      test: 'Fetch Employees',
      passed: true,
      count: employees.length,
      data: employees[0],
    });
  } catch (error) {
    console.error('   ❌ Failed:', error);
    results.push({
      department: 'HR',
      test: 'Fetch Employees',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Test 2: Leave Requests
  try {
    console.log('🏖️  Test 6.2: Fetching Leave Requests...');
    const leaves = await odoo.searchRead('hr.leave', {
      domain: [],
      fields: ['employee_id', 'holiday_status_id', 'date_from', 'date_to', 'state', 'number_of_days'],
      limit: 10,
    });

    console.log(`   ✅ Found ${leaves.length} leave requests`);
    if (leaves.length > 0) {
      const sample = leaves[0];
      console.log(`   Sample Leave:`);
      console.log(`     - Employee: ${sample.employee_id?.[1] || 'N/A'}`);
      console.log(`     - Type: ${sample.holiday_status_id?.[1] || 'N/A'}`);
      console.log(`     - Days: ${sample.number_of_days}`);
      console.log(`     - State: ${sample.state}`);
    }
    console.log();

    results.push({
      department: 'HR',
      test: 'Fetch Leave Requests',
      passed: true,
      count: leaves.length,
      data: leaves[0],
    });
  } catch (error) {
    console.error('   ❌ Failed:', error);
    results.push({
      department: 'HR',
      test: 'Fetch Leave Requests',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function testProjectsDepartment(odoo: any) {
  console.log('━'.repeat(60));
  console.log('📋 STEP 7: Testing Projects Department');
  console.log('━'.repeat(60));
  console.log();

  // Test 1: Projects
  try {
    console.log('🗂️  Test 7.1: Fetching Projects...');
    const projects = await odoo.searchRead('project.project', {
      domain: [],
      fields: ['name', 'user_id', 'partner_id', 'date_start', 'date', 'active', 'task_count'],
      limit: 10,
    });

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
    console.error('   ❌ Failed:', error);
    results.push({
      department: 'Projects',
      test: 'Fetch Projects',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Test 2: Tasks
  try {
    console.log('✅ Test 7.2: Fetching Tasks...');
    const tasks = await odoo.searchRead('project.task', {
      domain: [],
      fields: ['name', 'project_id', 'user_ids', 'stage_id', 'priority', 'date_deadline', 'active'],
      limit: 10,
    });

    console.log(`   ✅ Found ${tasks.length} tasks`);
    if (tasks.length > 0) {
      const sample = tasks[0];
      console.log(`   Sample Task:`);
      console.log(`     - Name: ${sample.name}`);
      console.log(`     - Project: ${sample.project_id?.[1] || 'N/A'}`);
      console.log(`     - Stage: ${sample.stage_id?.[1] || 'N/A'}`);
      console.log(`     - Priority: ${sample.priority}`);
      console.log(`     - Deadline: ${sample.date_deadline || 'N/A'}`);
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
    console.error('   ❌ Failed:', error);
    results.push({
      department: 'Projects',
      test: 'Fetch Tasks',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function testActivitiesCommunications(odoo: any) {
  console.log('━'.repeat(60));
  console.log('📞 STEP 8: Testing Activities & Communications');
  console.log('━'.repeat(60));
  console.log();

  // Test 1: Activities
  try {
    console.log('📅 Test 8.1: Fetching Activities...');
    const activities = await odoo.searchRead('mail.activity', {
      domain: [],
      fields: ['summary', 'activity_type_id', 'user_id', 'date_deadline', 'state', 'res_model', 'res_id'],
      limit: 10,
    });

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
    console.error('   ❌ Failed:', error);
    results.push({
      department: 'Communications',
      test: 'Fetch Activities',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Test 2: Messages (Chatter)
  try {
    console.log('💬 Test 8.2: Fetching Messages...');
    const messages = await odoo.searchRead('mail.message', {
      domain: [['message_type', '!=', 'notification']],
      fields: ['subject', 'body', 'author_id', 'date', 'message_type', 'model', 'res_id'],
      limit: 10,
    });

    console.log(`   ✅ Found ${messages.length} messages`);
    if (messages.length > 0) {
      const sample = messages[0];
      console.log(`   Sample Message:`);
      console.log(`     - Subject: ${sample.subject || 'N/A'}`);
      console.log(`     - Author: ${sample.author_id?.[1] || 'N/A'}`);
      console.log(`     - Type: ${sample.message_type}`);
      console.log(`     - Date: ${sample.date}`);
    }
    console.log();

    results.push({
      department: 'Communications',
      test: 'Fetch Messages',
      passed: true,
      count: messages.length,
      data: messages[0],
    });
  } catch (error) {
    console.error('   ❌ Failed:', error);
    results.push({
      department: 'Communications',
      test: 'Fetch Messages',
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

    // Step 2: Test Finance
    await testFinanceDepartment(odoo);

    // Step 3: Test Sales
    await testSalesDepartment(odoo);

    // Step 4: Test Operations
    await testOperationsDepartment(odoo);

    // Step 5: Test Support
    await testCustomerSupport(odoo);

    // Step 6: Test HR
    await testHRDepartment(odoo);

    // Step 7: Test Projects
    await testProjectsDepartment(odoo);

    // Step 8: Test Activities
    await testActivitiesCommunications(odoo);

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
    console.log(`Overall: ${totalPassed}/${totalTests} tests passed (${((totalPassed / totalTests) * 100).toFixed(1)}%)`);
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

    console.log('✅ Comprehensive Odoo test complete!');
    console.log();

  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

runAllTests();
