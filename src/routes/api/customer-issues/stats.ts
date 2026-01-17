/**
 * Customer Issue Stats API Route
 *
 * Provides quick access to customer issue statistics
 * for dashboard widgets and status indicators.
 */

import { createFileRoute } from "@tanstack/react-router";
import { getCustomerIssueStats } from "~/data-access/customer-issue-monitor";
import { getEscalationSummary } from "~/use-cases/customer-issue-monitor";

export const Route = createFileRoute("/api/customer-issues/stats")({
  server: {
    handlers: {
      /**
       * GET /api/customer-issues/stats
       * Get customer issue statistics
       *
       * Query Parameters:
       * - startDate: ISO date string (optional)
       * - endDate: ISO date string (optional)
       *
       * Response:
       * - 200: { success: true, stats: CustomerIssueStats, escalationSummary: {...} }
       * - 500: { error: "Failed to fetch stats" }
       */
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const startDateParam = url.searchParams.get("startDate");
          const endDateParam = url.searchParams.get("endDate");

          const startDate = startDateParam ? new Date(startDateParam) : undefined;
          const endDate = endDateParam ? new Date(endDateParam) : undefined;

          const [stats, escalationSummary] = await Promise.all([
            getCustomerIssueStats(startDate, endDate),
            getEscalationSummary(),
          ]);

          return Response.json({
            success: true,
            stats,
            escalationSummary,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error("Error fetching customer issue stats:", error);
          return Response.json(
            {
              success: false,
              error: "Failed to fetch stats",
              message: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
          );
        }
      },
    },
  },
});
