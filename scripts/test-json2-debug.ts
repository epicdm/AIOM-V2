/**
 * Focused JSON-2 API Debug Test
 * Tests the exact examples provided by user to identify parameter structure issues
 */

import { createOdooJSON2Client } from '../src/lib/odoo/json2-client';
import type { JSON2Config } from '../src/lib/odoo/json2-client';

const ODOO_CONFIG: JSON2Config = {
  url: 'https://epic-communications-inc818.odoo.com',
  database: 'epic-communications-inc818',
  apiKey: '96b9905144816c05237f7facbd34994b7a183706',
};

async function testSearchRead() {
  console.log('\n========================================');
  console.log('TEST 1: search_read (User\'s Exact Example)');
  console.log('========================================\n');

  try {
    const odoo = createOdooJSON2Client(ODOO_CONFIG);

    // User's exact example from documentation
    const partners = await odoo.searchRead(
      'res.partner',
      [['is_company', '=', true]],
      { fields: ['id', 'name', 'email'], limit: 10 }
    );

    console.log(`✅ search_read WORKS! Found ${partners.length} companies`);
    console.log('First company:', partners[0]);
    return true;
  } catch (error) {
    console.error('❌ search_read FAILED:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
    return false;
  }
}

async function testSearchCount() {
  console.log('\n========================================');
  console.log('TEST 2: search_count');
  console.log('========================================\n');

  try {
    const odoo = createOdooJSON2Client(ODOO_CONFIG);

    const count = await odoo.searchCount(
      'res.partner',
      [['is_company', '=', true]],
      true // debug mode
    );

    console.log(`✅ search_count WORKS! Count: ${count}`);
    return true;
  } catch (error) {
    console.error('❌ search_count FAILED:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
    return false;
  }
}

async function testEmptyDomain() {
  console.log('\n========================================');
  console.log('TEST 3: search_read with Empty Domain');
  console.log('========================================\n');

  try {
    const odoo = createOdooJSON2Client(ODOO_CONFIG);

    const partners = await odoo.searchRead(
      'res.partner',
      [], // empty domain
      { fields: ['id', 'name'], limit: 5 }
    );

    console.log(`✅ Empty domain WORKS! Found ${partners.length} partners`);
    return true;
  } catch (error) {
    console.error('❌ Empty domain FAILED:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
    return false;
  }
}

async function testRead() {
  console.log('\n========================================');
  console.log('TEST 4: read (by IDs)');
  console.log('========================================\n');

  try {
    const odoo = createOdooJSON2Client(ODOO_CONFIG);

    // First get some IDs
    const partners = await odoo.searchRead(
      'res.partner',
      [],
      { fields: ['id'], limit: 2 }
    );

    if (partners.length === 0) {
      console.log('⚠️  No partners found to test read');
      return false;
    }

    const ids = partners.map(p => p.id);
    console.log(`Testing read with IDs: ${ids.join(', ')}`);

    const records = await odoo.read(
      'res.partner',
      ids,
      { fields: ['id', 'name', 'email'] }
    );

    console.log(`✅ read WORKS! Got ${records.length} records`);
    console.log('First record:', records[0]);
    return true;
  } catch (error) {
    console.error('❌ read FAILED:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
    return false;
  }
}

async function testSearch() {
  console.log('\n========================================');
  console.log('TEST 5: search (returns IDs only)');
  console.log('========================================\n');

  try {
    const odoo = createOdooJSON2Client(ODOO_CONFIG);

    const ids = await odoo.search(
      'res.partner',
      [['is_company', '=', true]],
      { limit: 10 }
    );

    console.log(`✅ search WORKS! Found ${ids.length} IDs`);
    console.log('First few IDs:', ids.slice(0, 5));
    return true;
  } catch (error) {
    console.error('❌ search FAILED:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
    return false;
  }
}

async function main() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║  Odoo JSON-2 API Debug Tests          ║');
  console.log('║  Testing Each Method Individually      ║');
  console.log('╚════════════════════════════════════════╝');

  const results = {
    searchRead: false,
    searchCount: false,
    emptyDomain: false,
    read: false,
    search: false,
  };

  // Test each method
  results.searchRead = await testSearchRead();
  results.searchCount = await testSearchCount();
  results.emptyDomain = await testEmptyDomain();
  results.read = await testRead();
  results.search = await testSearch();

  // Summary
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  TEST RESULTS SUMMARY                  ║');
  console.log('╚════════════════════════════════════════╝\n');

  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;

  console.log(`search_read:       ${results.searchRead ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`search_count:      ${results.searchCount ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`empty domain:      ${results.emptyDomain ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`read:              ${results.read ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`search:            ${results.search ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`\nTotal: ${passed}/${total} tests passed (${Math.round(passed/total*100)}%)`);

  if (passed === total) {
    console.log('\n🎉 All tests passed! JSON-2 API client is working correctly.');
  } else if (passed > 0) {
    console.log('\n⚠️  Some tests passed, some failed. Need to investigate specific methods.');
  } else {
    console.log('\n❌ All tests failed. Check connection and authentication.');
  }
}

main().catch(console.error);
