import { defineConfig, devices } from "@playwright/test";

/**
 * Configuration for verification tests that don't need a running server.
 * These tests only verify module structure by reading files.
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    trace: "off",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // No webServer needed - these tests read files directly
});
