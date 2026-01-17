/**
 * Expense Compliance Monitor API Route
 *
 * This endpoint runs expense compliance checks for policy violations,
 * missing documentation, approval delays, and suspicious patterns.
 * It should be called by a cron job or scheduler at regular intervals
 * (e.g., every 30 minutes).
 *
 * Security: Protected by a secret API key to prevent unauthorized access.
 *
 * Cron Job Setup Examples:
 * - Vercel Cron: Add to vercel.json with cron schedule every 30 minutes
 * - GitHub Actions: Use schedule trigger with curl to POST to this endpoint
 * - External cron service: POST to this endpoint with Authorization header
 *
 * The endpoint monitors:
 * - Policy violations (amount limits, duplicates)
 * - Approval workflow health (delays, bottlenecks)
 * - Documentation completeness (receipts, descriptions, GL mapping)
 * - Suspicious patterns (round amounts, split transactions, frequency)
 */

import { createFileRoute } from "@tanstack/react-router";
import {
  runExpenseComplianceChecks,
  getExpenseComplianceMonitorService,
} from "~/lib/expense-compliance-monitor";

// API key for expense compliance monitoring - should be set in environment
const EXPENSE_COMPLIANCE_MONITOR_API_KEY = process.env.EXPENSE_COMPLIANCE_MONITOR_API_KEY;

export const Route = createFileRoute("/api/expense-compliance/monitor")({
  server: {
    handlers: {
      /**
       * POST /api/expense-compliance/monitor
       * Run expense compliance checks for all categories
       *
       * Headers:
       * - Authorization: Bearer <API_KEY>
       *
       * Response:
       * - 200: { success: true, checksRun: number, violationsFound: number, alertsGenerated: number, ... }
       * - 401: { error: "Unauthorized" }
       * - 500: { error: "Processing failed" }
       */
      POST: async ({ request }) => {
        // Verify API key
        const authHeader = request.headers.get("Authorization");
        const apiKey = authHeader?.replace("Bearer ", "");

        // If API key is configured, require it
        // In development (no key set), allow access
        if (EXPENSE_COMPLIANCE_MONITOR_API_KEY && apiKey !== EXPENSE_COMPLIANCE_MONITOR_API_KEY) {
          console.warn("Unauthorized attempt to run expense compliance checks");
          return Response.json(
            { error: "Unauthorized" },
            { status: 401 }
          );
        }

        try {
          console.log("Running expense compliance checks via API...");
          const result = await runExpenseComplianceChecks();

          console.log(
            `Expense compliance checks complete: ${result.checksRun} checks, ` +
            `${result.violationsFound} violations found, ${result.alertsGenerated} alerts generated`
          );

          // Log errors for debugging
          if (result.errors.length > 0) {
            console.error("Expense compliance check errors:", result.errors);
          }

          return Response.json({
            success: true,
            checksRun: result.checksRun,
            violationsFound: result.violationsFound,
            alertsGenerated: result.alertsGenerated,
            notificationsSent: result.notificationsSent,
            duration: result.duration,
            checkResults: result.checkResults.map((r) => ({
              category: r.category,
              status: r.status,
              score: r.score,
              violationCount: r.violations.length,
              metrics: r.metrics,
            })),
            errors: result.errors.length > 0 ? result.errors : undefined,
            timestamp: result.timestamp.toISOString(),
          });
        } catch (error) {
          console.error("Error running expense compliance checks:", error);
          return Response.json(
            {
              error: "Processing failed",
              message: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
          );
        }
      },

      /**
       * GET /api/expense-compliance/monitor
       * Health check and status endpoint
       *
       * Response:
       * - 200: { status: "ok", service: "expense-compliance-monitor", stats: {...} }
       */
      GET: async () => {
        try {
          const service = getExpenseComplianceMonitorService();
          const stats = await service.getStats();

          return Response.json({
            status: "ok",
            service: "expense-compliance-monitor",
            isProcessing: stats.isProcessing,
            lastProcessedAt: stats.lastProcessedAt?.toISOString(),
            overallComplianceScore: stats.overallComplianceScore,
            totalChecksToday: stats.totalChecksToday,
            violationsFoundToday: stats.violationsFoundToday,
            alertsGeneratedToday: stats.alertsGeneratedToday,
            categoryScores: stats.categoryScores,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error("Error getting expense compliance monitor status:", error);
          return Response.json({
            status: "error",
            service: "expense-compliance-monitor",
            error: error instanceof Error ? error.message : "Unknown error",
            timestamp: new Date().toISOString(),
          });
        }
      },
    },
  },
});
