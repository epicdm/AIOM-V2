/**
 * AI COO Dashboard Test - Agent-Browser Style
 *
 * This test demonstrates the agent-browser workflow:
 * 1. Navigate to the page
 * 2. Snapshot (get interactive elements)
 * 3. Interact using refs
 * 4. Take screenshots
 */

import { test, expect } from '@playwright/test';

test.describe('AI COO Dashboard - Agent-Browser Style Test', () => {
  test('should load dashboard and interact with elements', async ({ page }) => {
    console.log('🌐 Opening dashboard (agent-browser: open http://localhost:3000/dashboard/ai-coo)');

    // Navigate to dashboard
    await page.goto('http://localhost:3000/dashboard/ai-coo');

    console.log('⏳ Waiting for page to load (agent-browser: wait --load networkidle)');
    await page.waitForLoadState('networkidle');

    // Take screenshot - equivalent to: agent-browser screenshot dashboard.png
    console.log('📸 Taking screenshot (agent-browser: screenshot dashboard.png)');
    await page.screenshot({
      path: 'test-results/dashboard-full-page.png',
      fullPage: true
    });

    console.log('📸 Snapshot: Getting interactive elements (agent-browser: snapshot -i)');

    // Get page structure - like snapshot -i
    const title = await page.title();
    console.log(`Page title: ${title}`);

    // Check for main sections
    const sections = {
      leftColumn: await page.locator('text=AI COO Conversation').isVisible(),
      centerColumn: await page.locator('text=Live Activity').isVisible(),
      rightColumn: await page.locator('text=Today\'s Impact').isVisible(),
    };

    console.log('📋 Interactive sections found:');
    console.log(`  - AI COO Conversation: ${sections.leftColumn ? 'visible' : 'hidden'}`);
    console.log(`  - Live Activity: ${sections.centerColumn ? 'visible' : 'hidden'}`);
    console.log(`  - Today\'s Impact: ${sections.rightColumn ? 'visible' : 'hidden'}`);

    // Verify all sections are visible
    expect(sections.leftColumn).toBe(true);
    expect(sections.centerColumn).toBe(true);
    expect(sections.rightColumn).toBe(true);

    // Get decision cards (if any)
    console.log('\n🔍 Looking for decision cards...');
    const decisionCards = page.locator('[class*="decision-card"], .rounded-lg.border.border-gray-200');
    const cardCount = await decisionCards.count();
    console.log(`Found ${cardCount} decision cards`);

    if (cardCount > 0) {
      // Take screenshot of first card
      await decisionCards.first().screenshot({
        path: 'test-results/decision-card.png'
      });
      console.log('📸 Screenshot saved: decision-card.png');

      // Get card text (like agent-browser: get text @e1)
      const cardText = await decisionCards.first().textContent();
      console.log(`Card content preview: ${cardText?.substring(0, 100)}...`);

      // Look for approve/reject buttons (agent-browser: find role button)
      const buttons = decisionCards.first().locator('button');
      const buttonCount = await buttons.count();
      console.log(`Found ${buttonCount} buttons in first card`);

      if (buttonCount > 0) {
        for (let i = 0; i < Math.min(buttonCount, 3); i++) {
          const buttonText = await buttons.nth(i).textContent();
          console.log(`  [@e${i + 1}] button "${buttonText?.trim()}"`);
        }
      }
    }

    // Check activity feed
    console.log('\n📊 Checking activity feed...');
    const activitySections = [
      { name: 'Happening now', selector: 'text=Happening now' },
      { name: 'Upcoming', selector: 'text=Upcoming' },
      { name: 'Recent activity', selector: 'text=Recent' },
    ];

    for (const section of activitySections) {
      const isVisible = await page.locator(section.selector).isVisible();
      console.log(`  - ${section.name}: ${isVisible ? '✓' : '✗'}`);
    }

    // Check metrics
    console.log('\n📈 Checking metrics...');
    const metricsVisible = await page.locator('text=Today\'s Impact').isVisible();
    console.log(`  - Metrics section: ${metricsVisible ? '✓' : '✗'}`);

    // Get page info (agent-browser: get url, get title)
    const currentUrl = page.url();
    console.log(`\n🔗 Current URL: ${currentUrl}`);
    console.log(`📄 Page title: ${title}`);

    // Take final screenshot
    console.log('\n📸 Taking final screenshot...');
    await page.screenshot({
      path: 'test-results/dashboard-final.png',
      fullPage: false
    });

    console.log('\n✅ Dashboard test complete!');
    console.log('Screenshots saved to test-results/');
  });

  test('should check for data loading states', async ({ page }) => {
    console.log('🔄 Testing data loading behavior...');

    await page.goto('http://localhost:3000/dashboard/ai-coo');

    // Check if loading states appear (briefly)
    const loadingIndicators = page.locator('text=Loading');
    console.log(`Looking for loading indicators...`);

    // Wait for content to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Give time for API calls

    // Check if data loaded or empty states shown
    const emptyStates = await page.locator('text=No pending actions, text=Nothing happening, text=No upcoming').count();
    const hasData = await page.locator('button:has-text("Approve"), button:has-text("Reject")').count();

    console.log(`Empty state messages: ${emptyStates}`);
    console.log(`Interactive elements with data: ${hasData}`);

    if (hasData > 0) {
      console.log('✅ Dashboard has real data loaded!');
    } else {
      console.log('ℹ️  Dashboard showing empty states (no pending actions yet)');
    }

    // Take screenshot of current state
    await page.screenshot({
      path: 'test-results/dashboard-data-state.png',
      fullPage: true
    });
  });

  test('should verify API endpoints are being called', async ({ page }) => {
    console.log('🔍 Monitoring API calls...');

    const apiCalls: string[] = [];

    // Listen for API requests
    page.on('request', request => {
      if (request.url().includes('/api/ai-coo/')) {
        apiCalls.push(request.url());
        console.log(`📡 API call: ${request.url()}`);
      }
    });

    await page.goto('http://localhost:3000/dashboard/ai-coo');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // Wait for API calls

    console.log(`\n📊 Total API calls: ${apiCalls.length}`);

    // Check for expected endpoints
    const expectedEndpoints = [
      '/api/ai-coo/action-recommendations',
      '/api/ai-coo/activity-feed',
      '/api/ai-coo/daily-metrics',
    ];

    console.log('\n✓ Expected endpoints called:');
    for (const endpoint of expectedEndpoints) {
      const called = apiCalls.some(url => url.includes(endpoint));
      console.log(`  ${called ? '✅' : '❌'} ${endpoint}`);
      expect(called).toBe(true);
    }
  });
});
