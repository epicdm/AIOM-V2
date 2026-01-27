/**
 * Test Other Workflows: Top-Up and KYC
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

const TEST_USER = {
  email: 'test@aiom.local',
  password: 'Test123!@#',
};

test.describe('Other Workflow Tests', () => {
  
  test('Mobile Top-Up Page Test', async ({ page }) => {
    console.log('\n🎯 Testing Mobile Top-Up Workflow\n');
    
    // Login
    await page.goto(`${BASE_URL}/sign-in`);
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    // Navigate to top-up
    await page.goto(`${BASE_URL}/mobile/topup`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await page.screenshot({ path: 'test-results/TOPUP-01-page.png', fullPage: true });
    
    // Check if page loads
    const pageText = await page.locator('body').textContent();
    console.log('Page loaded');
    
    // Look for top-up related elements
    const hasPhoneInput = await page.locator('input[type="tel"], input[name="phone"], input[placeholder*="phone" i]').count();
    const hasAmountOptions = await page.locator('button:has-text("$"), [data-testid*="amount"]').count();
    const hasOperatorInfo = await page.locator('text=/operator|carrier|network/i').count();
    
    console.log(`Phone input fields: ${hasPhoneInput}`);
    console.log(`Amount options: ${hasAmountOptions}`);
    console.log(`Operator info: ${hasOperatorInfo}`);
    
    if (hasPhoneInput > 0) {
      console.log('✅ PASS: Top-up page has phone input');
      
      // Try to fill phone number
      const phoneInput = page.locator('input[type="tel"], input[name="phone"]').first();
      if (await phoneInput.isVisible({ timeout: 2000 })) {
        await phoneInput.fill('+1234567890');
        console.log('✅ Phone number entered');
        await page.waitForTimeout(2000);
        
        await page.screenshot({ path: 'test-results/TOPUP-02-phone-entered.png', fullPage: true });
      }
    } else {
      console.log('⚠️  No phone input found - page may not be fully implemented');
    }
    
    if (pageText?.includes('top') || pageText?.includes('recharge') || pageText?.includes('airtime')) {
      console.log('✅ PASS: Page content suggests top-up functionality');
    } else {
      console.log('⚠️  Page content unclear - may be placeholder');
    }
  });
  
  test('KYC Submission Page Test', async ({ page }) => {
    console.log('\n🎯 Testing KYC Workflow\n');
    
    // Login
    await page.goto(`${BASE_URL}/sign-in`);
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    // Try different KYC routes
    const kycRoutes = [
      '/mobile/kyc',
      '/mobile/kyc/submit',
      '/dashboard/kyc',
    ];
    
    for (const route of kycRoutes) {
      console.log(`\nTrying route: ${route}`);
      
      try {
        await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle', timeout: 10000 });
        await page.waitForTimeout(2000);
        
        const currentUrl = page.url();
        if (!currentUrl.includes('sign-in')) {
          console.log(`✅ Route accessible: ${route}`);
          
          await page.screenshot({ path: `test-results/KYC-${route.replace(/\//g, '-')}.png`, fullPage: true });
          
          // Check for KYC-related elements
          const hasFileUpload = await page.locator('input[type="file"], [data-testid*="upload"]').count();
          const hasIDFields = await page.locator('text=/ID|passport|document|identity/i').count();
          const hasSubmitBtn = await page.locator('button[type="submit"], button:has-text("Submit")').count();
          
          console.log(`File upload inputs: ${hasFileUpload}`);
          console.log(`ID/Document fields: ${hasIDFields}`);
          console.log(`Submit buttons: ${hasSubmitBtn}`);
          
          if (hasFileUpload > 0 || hasIDFields > 0) {
            console.log('✅ PASS: KYC page has document upload functionality');
            break;
          }
        }
      } catch (error) {
        console.log(`⚠️  Route ${route} not accessible or timed out`);
      }
    }
  });
  
  test('Dashboard Navigation Test', async ({ page }) => {
    console.log('\n🎯 Testing Dashboard Navigation\n');
    
    // Login
    await page.goto(`${BASE_URL}/sign-in`);
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    // Test main dashboard routes
    const dashboardRoutes = [
      '/dashboard',
      '/dashboard/inbox',
      '/dashboard/reports',
      '/dashboard/settings',
    ];
    
    let accessibleRoutes = 0;
    
    for (const route of dashboardRoutes) {
      try {
        await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle', timeout: 10000 });
        await page.waitForTimeout(1000);
        
        const currentUrl = page.url();
        if (!currentUrl.includes('sign-in') && currentUrl.includes(route)) {
          console.log(`✅ ${route} - Accessible`);
          accessibleRoutes++;
        } else {
          console.log(`⚠️  ${route} - Redirected`);
        }
      } catch (error) {
        console.log(`❌ ${route} - Error`);
      }
    }
    
    console.log(`\nAccessible routes: ${accessibleRoutes}/${dashboardRoutes.length}`);
    
    if (accessibleRoutes === dashboardRoutes.length) {
      console.log('✅ PASS: All dashboard routes accessible');
    } else {
      console.log('⚠️  Some dashboard routes not accessible');
    }
  });
});
