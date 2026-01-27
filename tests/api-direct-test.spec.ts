/**
 * Direct API Test - Test if server functions work
 * 
 * This bypasses the UI and tests the API directly
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

const TEST_USER = {
  email: 'test@aiom.local',
  password: 'Test123!@#',
};

test.describe('Direct API Tests', () => {
  
  test('Check if expense creation API endpoint exists', async ({ page }) => {
    console.log('\n🔍 Testing if expense API is accessible\n');
    
    // Login first to get session
    await page.goto(`${BASE_URL}/sign-in`);
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    console.log('✅ Logged in');
    
    // Try to make a direct API call
    const response = await page.evaluate(async () => {
      try {
        // Try to call the server function directly
        const res = await fetch('/_server', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            _serverFnId: 'createExpenseRequestFn',
            _serverFnName: 'createExpenseRequestFn',
            data: {
              amount: '99.99',
              currency: 'USD',
              purpose: 'API Test Expense',
              description: 'Testing direct API call',
            },
          }),
        });
        
        return {
          status: res.status,
          ok: res.ok,
          body: await res.text(),
        };
      } catch (error) {
        return {
          error: String(error),
        };
      }
    });
    
    console.log('API Response:', response);
    
    if (response.ok) {
      console.log('✅ PASS: API call succeeded');
    } else {
      console.log('❌ FAIL: API call failed');
      console.log('Status:', response.status);
      console.log('Body:', response.body);
    }
  });
  
  test('Check browser console for errors on expense page', async ({ page }) => {
    console.log('\n🔍 Checking for JavaScript errors\n');
    
    const consoleMessages: string[] = [];
    const errors: string[] = [];
    
    // Capture console messages
    page.on('console', (msg) => {
      const text = msg.text();
      consoleMessages.push(`[${msg.type()}] ${text}`);
      if (msg.type() === 'error') {
        errors.push(text);
      }
    });
    
    // Capture page errors
    page.on('pageerror', (error) => {
      errors.push(`Page Error: ${error.message}`);
    });
    
    // Login
    await page.goto(`${BASE_URL}/sign-in`);
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    // Go to expense creation page
    await page.goto(`${BASE_URL}/mobile/expenses/new`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    console.log('\n=== Console Messages ===');
    consoleMessages.forEach(msg => console.log(msg));
    
    console.log('\n=== Errors Found ===');
    if (errors.length > 0) {
      errors.forEach(err => console.log(`❌ ${err}`));
      console.log(`\n❌ FAIL: Found ${errors.length} JavaScript errors`);
    } else {
      console.log('✅ PASS: No JavaScript errors found');
    }
    
    // Try to fill and submit form
    console.log('\n=== Testing Form Submission ===');
    
    const amountInput = page.locator('input[name="amount"]').first();
    if (await amountInput.isVisible({ timeout: 5000 })) {
      await amountInput.fill('123.45');
      console.log('✅ Amount filled');
    }
    
    const purposeInput = page.locator('input[name="purpose"]').first();
    if (await purposeInput.isVisible({ timeout: 5000 })) {
      await purposeInput.fill('Console test expense');
      console.log('✅ Purpose filled');
    }
    
    // Watch for network requests
    const requests: any[] = [];
    page.on('request', (request) => {
      if (request.url().includes('_server') || request.url().includes('api')) {
        requests.push({
          url: request.url(),
          method: request.method(),
          postData: request.postData(),
        });
      }
    });
    
    const submitBtn = page.locator('button[type="submit"]').first();
    if (await submitBtn.isVisible({ timeout: 5000 })) {
      await submitBtn.click();
      console.log('✅ Submit clicked');
      
      await page.waitForTimeout(3000);
      
      console.log('\n=== Network Requests ===');
      if (requests.length > 0) {
        requests.forEach(req => {
          console.log(`${req.method} ${req.url}`);
          if (req.postData) {
            console.log(`Data: ${req.postData.substring(0, 200)}`);
          }
        });
        console.log('✅ PASS: API requests were made');
      } else {
        console.log('❌ FAIL: No API requests detected');
      }
    }
    
    // Check for new errors after submission
    await page.waitForTimeout(2000);
    const newErrors = errors.slice();
    if (newErrors.length > errors.length) {
      console.log('\n❌ New errors after submission:');
      newErrors.slice(errors.length).forEach(err => console.log(err));
    }
  });
});
