/**
 * Test Dashboard Approve & Execute Functionality
 *
 * This script tests that clicking "Approve & Execute" on the dashboard
 * actually executes real actions.
 */

import { chromium } from 'playwright';

async function testDashboardApproval() {
  console.log('🧪 Testing Dashboard Approve & Execute Functionality\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Step 1: Navigate to dashboard
    console.log('Step 1: Navigating to AI COO Dashboard...');
    await page.goto('http://localhost:3001/dashboard/ai-coo', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    await page.waitForTimeout(2000);

    console.log('✅ Dashboard loaded');

    // Step 2: Take screenshot of initial state
    await page.screenshot({ path: 'test-results/dashboard-initial.png', fullPage: true });
    console.log('📸 Screenshot saved: dashboard-initial.png');

    // Step 3: Check if we need to login
    const loginForm = await page.locator('input[type="email"], input[type="password"]').count();
    if (loginForm > 0) {
      console.log('⚠️  Login required - please log in first');
      console.log('   Dashboard URL: http://localhost:3001/dashboard/ai-coo');
      console.log('   Keeping browser open for manual login...');
      await page.waitForTimeout(60000); // Wait 1 minute for manual login
      return;
    }

    // Step 4: Look for decision cards
    console.log('\nStep 2: Looking for decision cards...');
    const decisionCards = await page.locator('[class*="border-l-4"]').count();
    console.log(`Found ${decisionCards} decision card(s)`);

    if (decisionCards === 0) {
      console.log('⚠️  No decision cards found on dashboard');
      console.log('   You may need to create a test action first');
      console.log('   See READY_TO_TEST.md for SQL to insert test action');
      await page.screenshot({ path: 'test-results/dashboard-no-cards.png', fullPage: true });
      return;
    }

    // Step 5: Find "Approve & Execute" button
    console.log('\nStep 3: Looking for "Approve & Execute" button...');
    const approveButton = page.locator('button:has-text("Approve & Execute")').first();
    const buttonCount = await page.locator('button:has-text("Approve & Execute")').count();
    console.log(`Found ${buttonCount} "Approve & Execute" button(s)`);

    if (buttonCount === 0) {
      console.log('❌ No "Approve & Execute" buttons found');
      await page.screenshot({ path: 'test-results/dashboard-no-buttons.png', fullPage: true });
      return;
    }

    // Step 6: Take screenshot before clicking
    await page.screenshot({ path: 'test-results/dashboard-before-click.png', fullPage: true });
    console.log('📸 Screenshot saved: dashboard-before-click.png');

    // Step 7: Click the button
    console.log('\nStep 4: Clicking "Approve & Execute" button...');

    // Listen for API request
    const apiRequestPromise = page.waitForRequest(
      request => request.url().includes('/api/ai-coo/approve-action'),
      { timeout: 10000 }
    );

    // Listen for API response
    const apiResponsePromise = page.waitForResponse(
      response => response.url().includes('/api/ai-coo/approve-action'),
      { timeout: 10000 }
    );

    await approveButton.click();
    console.log('✅ Button clicked');

    // Step 8: Wait for API call
    console.log('\nStep 5: Waiting for API request...');
    try {
      const request = await apiRequestPromise;
      console.log('✅ API request sent:', request.url());
      console.log('   Method:', request.method());

      const postData = request.postDataJSON();
      console.log('   Payload:', JSON.stringify(postData, null, 2));

      const response = await apiResponsePromise;
      console.log('\n✅ API response received');
      console.log('   Status:', response.status());

      const responseData = await response.json();
      console.log('   Response:', JSON.stringify(responseData, null, 2));

      // Step 9: Check button state after execution
      await page.waitForTimeout(2000);

      const buttonText = await approveButton.textContent();
      console.log('\nStep 6: Checking button state...');
      console.log('   Button text:', buttonText?.trim());

      // Step 10: Take screenshot after execution
      await page.screenshot({ path: 'test-results/dashboard-after-execution.png', fullPage: true });
      console.log('📸 Screenshot saved: dashboard-after-execution.png');

      // Step 11: Check for success message
      const successMessage = await page.locator('text=/executed successfully/i').count();
      const errorMessage = await page.locator('text=/failed|error/i').count();

      if (successMessage > 0) {
        console.log('\n✅ SUCCESS: Action executed successfully!');
        console.log('   Success message displayed on dashboard');
      } else if (errorMessage > 0) {
        console.log('\n⚠️  ERROR: Execution failed');
        const errorText = await page.locator('text=/failed|error/i').first().textContent();
        console.log('   Error:', errorText);
      } else if (buttonText?.includes('Executed')) {
        console.log('\n✅ SUCCESS: Button shows "Executed" state');
      } else if (buttonText?.includes('Executing')) {
        console.log('\n⏳ Still executing... waiting...');
        await page.waitForTimeout(5000);
        const finalButtonText = await approveButton.textContent();
        console.log('   Final button text:', finalButtonText?.trim());
      }

      // Step 12: Summary
      console.log('\n' + '='.repeat(60));
      console.log('TEST SUMMARY');
      console.log('='.repeat(60));
      console.log('✅ Dashboard loaded successfully');
      console.log('✅ Decision cards found');
      console.log('✅ "Approve & Execute" button found and clicked');
      console.log('✅ API request sent to /api/ai-coo/approve-action');
      console.log('✅ API response received');

      if (responseData.success) {
        console.log('✅ Action executed successfully!');
        console.log('\nNext: Verify in Odoo that the task/record was created');
      } else {
        console.log('⚠️  Action execution had issues');
        console.log('   Check the response above for details');
      }

    } catch (error) {
      console.error('\n❌ Error during API call:', error);
      await page.screenshot({ path: 'test-results/dashboard-error.png', fullPage: true });
    }

    // Keep browser open for inspection
    console.log('\n📸 All screenshots saved to test-results/');
    console.log('🔍 Keeping browser open for 30 seconds for inspection...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('❌ Test failed:', error);
    await page.screenshot({ path: 'test-results/dashboard-failure.png', fullPage: true });
  } finally {
    await browser.close();
    console.log('\n✅ Test complete');
  }
}

// Run the test
testDashboardApproval().catch(console.error);
