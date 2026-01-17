/**
 * Customer Issue Monitor API Route
 *
 * Provides endpoints for monitoring customer support tickets,
 * detecting escalating issues, SLA violations, and satisfaction risks.
 *
 * Endpoints:
 * - GET: Get dashboard data with optional AI analysis
 * - POST: Trigger a new analysis or update configuration
 */

import { createFileRoute } from "@tanstack/react-router";
import { getCustomerIssueMonitorData } from "~/use-cases/customer-issue-monitor";

export const Route = createFileRoute("/api/customer-issues/monitor")({
  server: {
    handlers: {
      /**
       * GET /api/customer-issues/monitor
       * Get customer issue monitor dashboard data
       *
       * Query Parameters:
       * - includeAi: boolean (default: true) - Include AI analysis
       * - issueLimit: number (default: 50) - Max number of issues to return
       * - trendDays: number (default: 7) - Days of trend data
       *
       * Response:
       * - 200: { success: true, data: MonitorDashboardData }
       * - 500: { error: "Failed to fetch monitor data" }
       */
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const includeAiAnalysis = url.searchParams.get("includeAi") !== "false";
          const issueLimit = parseInt(url.searchParams.get("issueLimit") || "50", 10);
          const trendDays = parseInt(url.searchParams.get("trendDays") || "7", 10);

          console.log("Fetching customer issue monitor data...");

          const data = await getCustomerIssueMonitorData({
            includeAiAnalysis,
            issueLimit,
            trendDays,
          });

          return Response.json({
            success: true,
            data: {
              stats: data.stats,
              openIssues: data.openIssues.map((issue) => ({
                id: issue.id,
                callRecordId: issue.callRecordId,
                customerId: issue.customerId,
                customerName: issue.customerName,
                issueType: issue.issueType,
                status: issue.status,
                priority: issue.priority,
                sentiment: issue.sentiment,
                summary: issue.summary,
                notes: issue.notes,
                assignedTo: issue.assignedTo,
                assignedToName: issue.assignedToName,
                dueDate: issue.dueDate?.toISOString() || null,
                createdAt: issue.createdAt.toISOString(),
                updatedAt: issue.updatedAt.toISOString(),
                slaStatus: issue.slaStatus,
                hoursOpen: issue.hoursOpen,
              })),
              riskProfiles: data.riskProfiles.map((profile) => ({
                customerId: profile.customerId,
                customerName: profile.customerName,
                riskLevel: profile.riskLevel,
                riskScore: profile.riskScore,
                totalInteractions: profile.totalInteractions,
                negativeInteractions: profile.negativeInteractions,
                escalationCount: profile.escalationCount,
                unresolvedIssueCount: profile.unresolvedIssueCount,
                lastInteractionDate: profile.lastInteractionDate?.toISOString() || null,
                lastSentiment: profile.lastSentiment,
                riskFactors: profile.riskFactors,
              })),
              escalationTrends: data.escalationTrends,
              recentIssues: data.recentIssues.map((issue) => ({
                id: issue.id,
                callRecordId: issue.callRecordId,
                customerName: issue.customerName,
                direction: issue.direction,
                duration: issue.duration,
                callTimestamp: issue.callTimestamp.toISOString(),
                disposition: issue.disposition,
                sentiment: issue.sentiment,
                notes: issue.notes,
                summary: issue.summary,
                followUpDate: issue.followUpDate?.toISOString() || null,
                escalationReason: issue.escalationReason,
                escalationPriority: issue.escalationPriority,
                slaStatus: issue.slaStatus,
              })),
              analysis: data.analysis,
            },
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error("Error fetching customer issue monitor data:", error);
          return Response.json(
            {
              success: false,
              error: "Failed to fetch monitor data",
              message: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
          );
        }
      },
    },
  },
});
