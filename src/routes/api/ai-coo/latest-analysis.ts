import { createFileRoute } from "@tanstack/react-router";
import { getLatestAnalysisResults } from "~/data-access/ai-coo";

export const Route = createFileRoute("/api/ai-coo/latest-analysis")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const limit = parseInt(url.searchParams.get("limit") || "10", 10);
          
          const results = await getLatestAnalysisResults(limit);
          
          return Response.json({
            results,
            total: results.length,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error("[AI COO API] Failed to fetch analysis results:", error);
          return Response.json(
            {
              error: "Failed to fetch analysis results",
              message: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
          );
        }
      },
    },
  },
});
