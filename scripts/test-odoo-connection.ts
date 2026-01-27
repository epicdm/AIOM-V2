/**
 * Test Odoo Connection
 *
 * Verifies connection to Odoo instance and fetches basic data
 */

// Load environment variables
import { config } from 'dotenv';
config();

import { getOdooClient } from '~/data-access/odoo';

async function testOdooConnection() {
  console.log('🔌 Testing Odoo connection...\n');

  try {
    // Get Odoo client (will auto-initialize from .env)
    const odoo = await getOdooClient();
    console.log('✅ Successfully connected to Odoo!\n');

    // Get version info
    console.log('📋 Odoo Instance Info:');
    const version = await odoo.getVersion();
    console.log(`   Server Version: ${version.server_version}`);
    console.log(`   Protocol Version: ${version.protocol_version}\n`);

    // Test: Get count of partners
    console.log('👥 Testing Partner Access:');
    const partnerCount = await odoo.searchCount('res.partner', []);
    console.log(`   Total Partners: ${partnerCount}\n`);

    // Test: Get count of invoices
    console.log('💰 Testing Invoice Access:');
    const invoiceCount = await odoo.searchCount('account.move', [
      ['move_type', 'in', ['out_invoice', 'in_invoice']],
    ]);
    console.log(`   Total Invoices: ${invoiceCount}\n`);

    // Test: Get open customer invoices
    console.log('📄 Testing Customer Invoice Query:');
    const openInvoices = await odoo.searchRead('account.move', [
      ['move_type', '=', 'out_invoice'],
      ['state', '=', 'posted'],
      ['payment_state', 'in', ['not_paid', 'partial']],
    ], {
      fields: ['name', 'partner_id', 'amount_residual', 'invoice_date_due'],
      limit: 5,
    });
    console.log(`   Open Customer Invoices: ${openInvoices.length}`);

    if (openInvoices.length > 0) {
      console.log('\n   Sample Invoices:');
      openInvoices.forEach((inv: any) => {
        const partner = Array.isArray(inv.partner_id) ? inv.partner_id[1] : 'Unknown';
        console.log(`   - ${inv.name}: ${partner} - $${inv.amount_residual?.toFixed(2)}`);
      });
    }

    console.log('\n✅ All tests passed! Odoo connection is working.\n');
    console.log('🚀 Ready to switch to real Odoo data.');

  } catch (error) {
    console.error('❌ Odoo connection failed:', error);

    if (error instanceof Error) {
      console.error('\nError details:', error.message);

      if (error.message.includes('Authentication')) {
        console.error('\n💡 Suggestion: Check your ODOO_USERNAME and ODOO_PASSWORD in .env');
      } else if (error.message.includes('connect')) {
        console.error('\n💡 Suggestion: Verify ODOO_URL is correct and accessible');
      }
    }

    process.exit(1);
  }
}

// Run test
testOdooConnection();
