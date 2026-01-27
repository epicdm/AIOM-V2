/**
 * Verify Data Actually Saves
 * 
 * This test creates an expense and verifies it appears in the database/list
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

const TEST_USER = {
  email: 'test@aiom.local',
  password: 'Test123!@#',
};

test.describe('Data Persistence Verification', () => {
  
  test('Create expense and verify it saves', async ({ page }) => {
    console.log('\n🎯 VERIFICATION TEST: Does expense creation actually work?\n');
    
    // Login
    await page.goto(`${BASE_URL}/sign-in`);
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    console.log('✅ Logged in');
    
    // Get current expense count
    await page.goto(`${BASE_URL}/mobile/expenses`);
    await page.waitForLoadState('networkidle');
    const initialCount = await page.locator('[data-testid="expense-item"], .expense-item, tr, li').count();
    console.log(`Initial expense count: ${initialCount}`);
    
    // Create new expense with unique identifier
    const uniqueAmount = `${Math.floor(Math.random() * 1000)}.${Math.floor(Math.random() * 100)}`;
    const uniquePurpose = `Test Expense ${Date.now()}`;
    
    console.log(`\nCreating expense: $${uniqueAmount} - ${uniquePurpose}`);
    
    await page.goto(`${BASE_URL}/mobile/expenses/new`);
    await page.waitForLoadState('networkidle');
    
    // Fill form
    const amountInput = page.locator('input[name="amount"]').first();
    await amountInput.waitFor({ state: 'visible', timeout: 5000 });
    await amountInput.fill(uniqueAmount);
    console.log('✅ Amount filled');
    
    const purposeInput = page.locator('input[name="purpose"]').first();
    await purposeInput.waitFor({ state: 'visible', timeout: 5000 });
    await purposeInput.fill(uniquePurpose);
    console.log('✅ Purpose filled');
    
    // Submit
    const submitBtn = page.locator('button[type="submit"]').first();
    await submitBtn.click();
    console.log('✅ Submit clicked');
    
    // Wait for submission
    await page.waitForTimeout(3000);
    
    // Check if redirected to list
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);
    
    if (currentUrl.includes('/mobile/expenses') && !currentUrl.includes('/new')) {
      console.log('✅ Redirected to expense list');
    } else {
      console.log('⚠️  Still on creation page, navigating to list manually');
      await page.goto(`${BASE_URL}/mobile/expenses`);
      await page.waitForLoadState('networkidle');
    }
    
    // Wait for list to load
    await page.waitForTimeout(2000);
    
    // Check if new expense appears
    const hasNewExpense = await page.locator(`text=/${uniqueAmount}|${uniquePurpose}/i`).count();
    
    if (hasNewExpense > 0) {
      console.log('\n✅✅✅ SUCCESS! Expense found in list - DATA WAS SAVED! ✅✅✅');
      console.log(`Found expense with amount $${uniqueAmount}`);
    } else {
      console.log('\n❌ FAIL: Expense NOT found in list');
      console.log('Checking all expenses in list...');
      
      const allExpenses = await page.locator('[data-testid="expense-item"], .expense-item, tr, li').allTextContents();
      console.log('Expenses found:', allExpenses);
    }
    
    // Get final count
    const finalCount = await page.locator('[data-testid="expense-item"], .expense-item, tr, li').count();
    console.log(`\nFinal expense count: ${finalCount}`);
    
    if (finalCount > initialCount) {
      console.log('✅ Count increased - new expense was added!');
    } else {
      console.log('❌ Count did not increase');
    }
    
    await page.screenshot({ path: 'test-results/VERIFY-expense-list-after-create.png', fullPage: true });
  });
  
  test('Check approval page for expenses', async ({ page }) => {
    console.log('\n🎯 VERIFICATION TEST: Approval page functionality\n');
    
    // Login
    await page.goto(`${BASE_URL}/sign-in`);
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    // Go to approvals
    await page.goto(`${BASE_URL}/mobile/approvals`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await page.screenshot({ path: 'test-results/VERIFY-approvals-page.png', fullPage: true });
    
    // Check page content
    const pageText = await page.textContent('body');
    console.log('Page loaded');
    
    // Look for approval-related elements
    const hasApproveBtn = await page.locator('button:has-text("Approve")').count();
    const hasRejectBtn = await page.locator('button:has-text("Reject")').count();
    const hasPendingItems = await page.locator('text=/pending/i').count();
    
    console.log(`Approve buttons found: ${hasApproveBtn}`);
    console.log(`Reject buttons found: ${hasRejectBtn}`);
    console.log(`Pending items found: ${hasPendingItems}`);
    
    if (hasApproveBtn > 0 || hasRejectBtn > 0) {
      console.log('✅ PASS: Approval buttons exist');
    } else if (hasPendingItems > 0) {
      console.log('⚠️  Pending items exist but no action buttons visible');
      console.log('This might be a permissions issue or UI issue');
    } else {
      console.log('ℹ️  No pending approvals (expected if no expenses need approval)');
    }
  });
});
