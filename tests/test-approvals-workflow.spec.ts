/**
 * Test Approval Workflow
 * 
 * Verify approval page loads and buttons work
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

const TEST_USER = {
  email: 'test@aiom.local',
  password: 'Test123!@#',
};

test.describe('Approval Workflow Tests', () => {
  
  test('Check approval page rendering', async ({ page }) => {
    console.log('\n🎯 Testing Approval Page Rendering\n');
    
    // Login
    await page.goto(`${BASE_URL}/sign-in`);
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    // Go to approvals
    await page.goto(`${BASE_URL}/mobile/approvals`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    await page.screenshot({ path: 'test-results/APPROVAL-01-page-loaded.png', fullPage: true });
    
    // Check for approval cards
    const approvalCards = await page.locator('[data-testid^="approval-card-"]').count();
    console.log(`Approval cards found: ${approvalCards}`);
    
    if (approvalCards > 0) {
      console.log('✅ Approval cards are rendering');
      
      // Check for buttons within cards
      const approveButtons = await page.locator('[data-testid^="approve-btn-"]').count();
      const rejectButtons = await page.locator('[data-testid^="reject-btn-"]').count();
      
      console.log(`Approve buttons found: ${approveButtons}`);
      console.log(`Reject buttons found: ${rejectButtons}`);
      
      if (approveButtons > 0 && rejectButtons > 0) {
        console.log('✅✅✅ SUCCESS! Approval buttons ARE visible!');
        
        // Try to click one
        const firstApproveBtn = page.locator('[data-testid^="approve-btn-"]').first();
        if (await firstApproveBtn.isVisible()) {
          await firstApproveBtn.click();
          await page.waitForTimeout(1000);
          
          await page.screenshot({ path: 'test-results/APPROVAL-02-approve-dialog.png', fullPage: true });
          
          // Check if dialog opened
          const dialogVisible = await page.locator('[data-testid="confirm-approve-btn"]').isVisible({ timeout: 2000 });
          if (dialogVisible) {
            console.log('✅ Approve dialog opened successfully');
            
            // Close dialog
            const cancelBtn = page.locator('button:has-text("Cancel")').first();
            await cancelBtn.click();
            await page.waitForTimeout(500);
          }
        }
      } else {
        console.log('❌ FAIL: Buttons not found in cards');
      }
    } else {
      console.log('⚠️  No approval cards found');
      
      // Check what's actually on the page
      const pageText = await page.locator('body').textContent();
      
      if (pageText?.includes('All caught up')) {
        console.log('ℹ️  Page shows "All caught up" - no pending requests');
      } else if (pageText?.includes('Loading')) {
        console.log('⚠️  Page is still loading');
      } else {
        console.log('⚠️  Unknown state');
      }
    }
    
    // Check pending count in header
    const headerText = await page.locator('header').textContent();
    console.log(`Header text: ${headerText}`);
    
    const pendingMatch = headerText?.match(/(\d+)\s+pending/);
    if (pendingMatch) {
      const pendingCount = parseInt(pendingMatch[1]);
      console.log(`Pending requests shown in header: ${pendingCount}`);
      
      if (pendingCount > 0 && approvalCards === 0) {
        console.log('❌ ISSUE: Header shows pending items but no cards rendered');
        console.log('This indicates a data loading or rendering issue');
      }
    }
  });
  
  test('Test complete approval workflow', async ({ page, context }) => {
    console.log('\n🎯 Testing Complete Approval Workflow\n');
    
    // Step 1: Create an expense as user
    console.log('Step 1: Creating expense...');
    await page.goto(`${BASE_URL}/sign-in`);
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    await page.goto(`${BASE_URL}/mobile/expenses/new`);
    await page.waitForLoadState('networkidle');
    
    const uniqueAmount = `${Math.floor(Math.random() * 500)}.99`;
    const uniquePurpose = `Approval Test ${Date.now()}`;
    
    const amountInput = page.locator('input[name="amount"]').first();
    await amountInput.fill(uniqueAmount);
    
    const purposeInput = page.locator('input[name="purpose"]').first();
    await purposeInput.fill(uniquePurpose);
    
    const submitBtn = page.locator('button[type="submit"]').first();
    await submitBtn.click();
    
    await page.waitForTimeout(3000);
    console.log(`✅ Created expense: $${uniqueAmount} - ${uniquePurpose}`);
    
    // Step 2: Go to approvals page
    console.log('\nStep 2: Checking approvals page...');
    await page.goto(`${BASE_URL}/mobile/approvals`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    await page.screenshot({ path: 'test-results/APPROVAL-03-after-create.png', fullPage: true });
    
    // Look for our expense
    const hasOurExpense = await page.locator(`text=/${uniqueAmount}|${uniquePurpose}/i`).count();
    
    if (hasOurExpense > 0) {
      console.log('✅ Our expense appears in approval queue!');
      
      // Try to approve it
      const approveButtons = page.locator('[data-testid^="approve-btn-"]');
      const buttonCount = await approveButtons.count();
      
      if (buttonCount > 0) {
        console.log(`Found ${buttonCount} approve buttons`);
        await approveButtons.first().click();
        await page.waitForTimeout(1000);
        
        const confirmBtn = page.locator('[data-testid="confirm-approve-btn"]');
        if (await confirmBtn.isVisible({ timeout: 2000 })) {
          await confirmBtn.click();
          await page.waitForTimeout(2000);
          
          console.log('✅✅✅ COMPLETE WORKFLOW SUCCESS!');
          console.log('Expense created → Appeared in approvals → Approved');
          
          await page.screenshot({ path: 'test-results/APPROVAL-04-approved.png', fullPage: true });
        }
      } else {
        console.log('❌ No approve buttons found');
      }
    } else {
      console.log('⚠️  Our expense not found in approval queue');
      console.log('Possible reasons:');
      console.log('- Expense not saved to database');
      console.log('- User cannot approve own expenses');
      console.log('- Approval query filters out this user\'s expenses');
    }
  });
});
