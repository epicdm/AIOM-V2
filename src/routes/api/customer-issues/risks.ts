/**
 * Customer Risk Profiles API Route
 *
 * Provides access to customer risk assessments and
 * high-risk customer identification.
 */

import { createFileRoute } from "@tanstack/react-router";
import { getCustomerRiskProfiles } from "~/data-access/customer-issue-monitor";
import { getHighRiskCustomers } from "~/use-cases/customer-issue-monitor";

export const Route = createFileRoute("/api/customer-issues/risks")({
  server: {
    handlers: {
      /**
       * GET /api/customer-issues/risks
       * Get customer risk profiles
       *
       * Query Parameters:
       * - highRiskOnly: boolean (default: false) - Only return high/critical risk
       * - limit: number (default: 50) - Max profiles to return
       *
       * Response:
       * - 200: { success: true, profiles: CustomerRiskProfile[] }
       * - 500: { error: "Failed to fetch risk profiles" }
       */
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const highRiskOnly = url.searchParams.get("highRiskOnly") === "true";
          const limit = parseInt(url.searchParams.get("limit") || "50", 10);

          let profiles;
          if (highRiskOnly) {
            profiles = await getHighRiskCustomers();
          } else {
            profiles = await getCustomerRiskProfiles();
          }

          return Response.json({
            success: true,
            profiles: profiles.slice(0, limit).map((profile) => ({
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
            totalCount: profiles.length,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error("Error fetching customer risk profiles:", error);
          return Response.json(
            {
              success: false,
              error: "Failed to fetch risk profiles",
              message: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
          );
        }
      },
    },
  },
});
