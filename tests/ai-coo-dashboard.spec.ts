import { test, expect } from '@playwright/test';

test.describe('AI COO Dashboard', () => {
  test('should load the AI COO dashboard', async ({ page }) => {
    // Navigate to the AI COO dashboard
    await page.goto('http://localhost:3000/dashboard/ai-coo');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Check if the main heading is visible
    await expect(page.getByRole('heading', { name: /AI COO - Financial Health Monitor/i })).toBeVisible();
    
    // Check if the "Run Analysis Now" button is visible
    await expect(page.getByRole('button', { name: /Run Analysis Now/i })).toBeVisible();
    
    // Check if the sections are present
    await expect(page.getByText('Active Alerts')).toBeVisible();
    await expect(page.getByText('Latest Financial Analysis')).toBeVisible();
    await expect(page.getByText('About AI COO')).toBeVisible();
    
    console.log('✅ AI COO Dashboard loaded successfully');
  });

  test('should show placeholder text if component not loaded', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard/ai-coo');
    await page.waitForLoadState('networkidle');
    
    const bodyText = await page.textContent('body');
    console.log('Page content:', bodyText);
    
    if (bodyText?.includes('Hello "/dashboard/ai-coo/"')) {
      console.log('❌ Dashboard component not loaded - showing placeholder');
      console.log('This indicates a Vite hot-reload or route generation issue');
    }
  });
});
