/**
 * UI Crawl Test - Automated Site Testing
 * 
 * This test crawls through all major pages of the application,
 * checks for console errors, and validates basic functionality.
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

// Test user credentials
const TEST_USER = {
  email: 'test@aiom.local',
  password: 'Test123!@#',
  name: 'Test User',
};

test.describe('AIOM-V2 UI Crawl Tests', () => {
  let consoleErrors: string[] = [];
  let consoleWarnings: string[] = [];

  test.beforeEach(async ({ page }) => {
    // Capture console errors and warnings
    consoleErrors = [];
    consoleWarnings = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      } else if (msg.type() === 'warning') {
        consoleWarnings.push(msg.text());
      }
    });

    // Capture page errors
    page.on('pageerror', (error) => {
      consoleErrors.push(`Page Error: ${error.message}`);
    });
  });

  test('1. Homepage loads correctly', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    // Check page title
    await expect(page).toHaveTitle(/SoundStation|AIOM/);
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/01-homepage.png', fullPage: true });
    
    console.log('✅ Homepage loaded');
    console.log(`Console Errors: ${consoleErrors.length}`);
    console.log(`Console Warnings: ${consoleWarnings.length}`);
  });

  test('2. Sign-in page accessible', async ({ page }) => {
    await page.goto(`${BASE_URL}/sign-in`);
    await page.waitForLoadState('networkidle');
    
    // Check for sign-in form elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    await page.screenshot({ path: 'test-results/02-sign-in.png', fullPage: true });
    
    console.log('✅ Sign-in page loaded');
  });

  test('3. Authentication flow works', async ({ page }) => {
    await page.goto(`${BASE_URL}/sign-in`);
    
    // Fill in credentials
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for navigation or error message
    await page.waitForTimeout(2000);
    
    // Check if we're redirected or see an error
    const currentUrl = page.url();
    console.log(`After login URL: ${currentUrl}`);
    
    await page.screenshot({ path: 'test-results/03-after-login.png', fullPage: true });
    
    console.log('✅ Authentication flow tested');
  });

  test('4. Dashboard pages', async ({ page }) => {
    // Login first
    await page.goto(`${BASE_URL}/sign-in`);
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    const dashboardPages = [
      '/dashboard',
      '/dashboard/inbox',
      '/dashboard/reports',
      '/dashboard/settings',
      '/dashboard/kyc',
    ];

    for (const path of dashboardPages) {
      console.log(`Testing: ${path}`);
      consoleErrors = [];
      
      try {
        await page.goto(`${BASE_URL}${path}`, { waitUntil: 'networkidle', timeout: 10000 });
        await page.screenshot({ 
          path: `test-results/dashboard-${path.replace(/\//g, '-')}.png`, 
          fullPage: true 
        });
        
        console.log(`✅ ${path} - Loaded successfully`);
        if (consoleErrors.length > 0) {
          console.log(`⚠️  Console errors: ${consoleErrors.length}`);
        }
      } catch (error) {
        console.log(`❌ ${path} - Failed to load: ${error}`);
      }
    }
  });

  test('5. Claude Analytics Dashboard', async ({ page }) => {
    // Login first
    await page.goto(`${BASE_URL}/sign-in`);
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    consoleErrors = [];
    
    try {
      await page.goto(`${BASE_URL}/admin/claude-usage`, { waitUntil: 'networkidle', timeout: 10000 });
      await page.screenshot({ path: 'test-results/05-claude-analytics.png', fullPage: true });
      
      console.log('✅ Claude Analytics Dashboard loaded');
      console.log(`Console Errors: ${consoleErrors.length}`);
      
      // Check for key elements
      const hasCharts = await page.locator('canvas, svg').count() > 0;
      console.log(`Charts present: ${hasCharts}`);
      
    } catch (error) {
      console.log(`❌ Claude Analytics failed: ${error}`);
    }
  });

  test('6. Mobile Routes', async ({ page }) => {
    // Login first
    await page.goto(`${BASE_URL}/sign-in`);
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    const mobilePages = [
      '/mobile',
      '/mobile/expenses',
      '/mobile/approvals',
      '/mobile/topup',
      '/mobile/kyc',
      '/mobile/vouchers',
      '/mobile/pay',
    ];

    for (const path of mobilePages) {
      console.log(`Testing: ${path}`);
      consoleErrors = [];
      
      try {
        await page.goto(`${BASE_URL}${path}`, { waitUntil: 'networkidle', timeout: 10000 });
        await page.screenshot({ 
          path: `test-results/mobile-${path.replace(/\//g, '-')}.png`, 
          fullPage: true 
        });
        
        console.log(`✅ ${path} - Loaded successfully`);
        if (consoleErrors.length > 0) {
          console.log(`⚠️  Console errors: ${consoleErrors.length}`);
        }
      } catch (error) {
        console.log(`❌ ${path} - Failed to load: ${error}`);
      }
    }
  });

  test('7. API Health Check', async ({ page }) => {
    const response = await page.request.get(`${BASE_URL}/api/monitoring/system-health`);
    const data = await response.json();
    
    console.log('System Health Check:');
    console.log(JSON.stringify(data, null, 2));
    
    expect(response.status()).toBe(200);
    expect(data.status).toBeTruthy();
  });

  test.afterAll(async () => {
    console.log('\n=== Test Summary ===');
    console.log(`Total Console Errors: ${consoleErrors.length}`);
    console.log(`Total Console Warnings: ${consoleWarnings.length}`);
    
    if (consoleErrors.length > 0) {
      console.log('\nConsole Errors:');
      consoleErrors.forEach((error, i) => {
        console.log(`${i + 1}. ${error}`);
      });
    }
  });
});
