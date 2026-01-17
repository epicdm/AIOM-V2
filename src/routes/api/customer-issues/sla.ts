/**
 * Customer Issue SLA API Route
 *
 * Provides SLA status, violations, and at-risk issues.
 */

import { createFileRoute } from "@tanstack/react-router";
import {
  getOpenCustomerIssues,
  getSLABreachStats,
} from "~/data-access/customer-issue-monitor";
import { getSLAAtRiskIssues } from "~/use-cases/customer-issue-monitor";

export const Route = createFileRoute("/api/customer-issues/sla")({
  server: {
    handlers: {
      /**
       * GET /api/customer-issues/sla
       * Get SLA status and violations
       *
       * Query Parameters:
       * - startDate: ISO date string (optional, default: 7 days ago)
       * - endDate: ISO date string (optional, default: now)
       * - atRiskOnly: boolean (default: false) - Only return at-risk/breached issues
       *
       * Response:
       * - 200: { success: true, slaStats: {...}, issues: [...] }
       * - 500: { error: "Failed to fetch SLA data" }
       */
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const atRiskOnly = url.searchParams.get("atRiskOnly") === "true";

          const startDateParam = url.searchParams.get("startDate");
          const endDateParam = url.searchParams.get("endDate");

          const now = new Date();
          const defaultStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

          const startDate = startDateParam ? new Date(startDateParam) : defaultStart;
          const endDate = endDateParam ? new Date(endDateParam) : now;

          const [slaStats, issues] = await Promise.all([
            getSLABreachStats(startDate, endDate),
            atRiskOnly ? getSLAAtRiskIssues() : getOpenCustomerIssues(),
          ]);

          // Filter issues to only SLA-related if atRiskOnly
          const filteredIssues = atRiskOnly
            ? issues
            : issues.filter(
                (i) => i.slaStatus === "at_risk" || i.slaStatus === "breached"
              );

          return Response.json({
            success: true,
            slaStats,
            issues: filteredIssues.map((issue) => ({
              id: issue.id,
              callRecordId: issue.callRecordId,
              customerId: issue.customerId,
              customerName: issue.customerName,
              issueType: issue.issueType,
              status: issue.status,
              priority: issue.priority,
              sentiment: issue.sentiment,
              slaStatus: issue.slaStatus,
              hoursOpen: issue.hoursOpen,
              dueDate: issue.dueDate?.toISOString() || null,
              createdAt: issue.createdAt.toISOString(),
            })),
            dateRange: {
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString(),
            },
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error("Error fetching SLA data:", error);
          return Response.json(
            {
              success: false,
              error: "Failed to fetch SLA data",
              message: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
          );
        }
      },
    },
  },
});
