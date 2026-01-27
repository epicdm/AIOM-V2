/**
 * Smoke Test - System Health Endpoint
 *
 * This test verifies that the application boots successfully and the
 * production health endpoint responds with valid JSON.
 *
 * Test criteria:
 * - HTTP status is 200 (healthy/degraded) OR 503 (unhealthy)
 * - Response is valid JSON
 * - Response contains required fields:
 *   - status: "healthy" | "degraded" | "unhealthy"
 *   - checks.database.status: "pass" | "warn" | "fail"
 */

import { test, expect } from '@playwright/test';

test.describe('Smoke Test - System Health', () => {
  test('GET /api/monitoring/system-health returns valid health status', async ({ request }) => {
    // Make request to health endpoint
    const response = await request.get('/api/monitoring/system-health');

    // Assert HTTP status is either 200 or 503
    expect([200, 503]).toContain(response.status());

    // Assert response is valid JSON
    const healthData = await response.json();
    expect(healthData).toBeDefined();

    // Assert required fields exist and have valid values
    expect(healthData.status).toBeDefined();
    expect(['healthy', 'degraded', 'unhealthy']).toContain(healthData.status);

    // Assert database check exists and has valid status
    expect(healthData.checks).toBeDefined();
    expect(healthData.checks.database).toBeDefined();
    expect(healthData.checks.database.status).toBeDefined();
    expect(['pass', 'warn', 'fail']).toContain(healthData.checks.database.status);

    // Log health status for debugging
    console.log(`[Smoke Test] Health Status: ${healthData.status}`);
    console.log(`[Smoke Test] Database Status: ${healthData.checks.database.status}`);
  });
});
