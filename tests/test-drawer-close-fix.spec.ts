import { test, expect } from '@playwright/test';

test.describe('Drawer Closing Fix Verification', () => {
  test('Verify drawer closes properly and allows interaction with dashboard', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard/ai-coo');
    await page.waitForLoadState('networkidle');

    console.log('\n=== Step 1: Open drawer ===');
    const activeButton = page.locator('button:has-text("Active")').first();
    await activeButton.click();
    await page.waitForTimeout(500);

    // Verify drawer is open
    const drawer = page.locator('[role="dialog"]:has-text("Operator Status")');
    await expect(drawer).toBeVisible();
    console.log('✓ Drawer opened');

    console.log('\n=== Step 2: Open emergency modal ===');
    const emergencyBtn = page.locator('button:has-text("Emergency Stop")');
    await emergencyBtn.click();
    await page.waitForTimeout(500);

    // Verify modal is open
    const modal = page.locator('[role="alertdialog"]:has-text("Emergency Stop")');
    await expect(modal).toBeVisible();
    console.log('✓ Emergency modal opened');

    console.log('\n=== Step 3: Close modal ===');
    const cancelBtn = page.locator('[role="alertdialog"] button:has-text("Cancel")');
    await cancelBtn.click();
    await page.waitForTimeout(500);

    // Verify modal is closed
    await expect(modal).not.toBeVisible();
    console.log('✓ Emergency modal closed');

    console.log('\n=== Step 4: Close drawer by clicking X ===');
    // Try to find and click the X button
    const closeButton = page.locator('[role="dialog"] button').first();
    await closeButton.click({ force: true });
    await page.waitForTimeout(1000);

    // Verify drawer is closed
    await expect(drawer).not.toBeVisible();
    console.log('✓ Drawer closed');

    console.log('\n=== Step 5: Verify can click Review All button ===');
    const reviewBtn = page.locator('button:has-text("Review All")');
    const isClickable = await reviewBtn.isEnabled();
    console.log(`Review All button enabled: ${isClickable}`);

    if (await reviewBtn.count() > 0) {
      // This should NOT timeout now
      await reviewBtn.click({ timeout: 5000 });
      console.log('✓ Review All button clicked successfully');

      // Wait for approval modal
      const approvalModal = page.locator('[role="dialog"]:has-text("Review Actions")');
      await expect(approvalModal).toBeVisible({ timeout: 5000 });
      console.log('✓ Approval modal opened');
    }

    console.log('\n=== Test Complete: Dashboard is interactive after drawer close ===');
  });
});
