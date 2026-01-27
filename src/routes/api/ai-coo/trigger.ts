import { createFileRoute } from "@tanstack/react-router";
import { triggerAnalyzerManually } from "~/lib/ai-coo/scheduler";

export const Route = createFileRoute("/api/ai-coo/trigger")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const { analyzerType } = body;
          
          if (!analyzerType) {
            return Response.json(
              { error: "analyzerType is required" },
              { status: 400 }
            );
          }
          
          if (!["financial", "sales", "operations", "customer"].includes(analyzerType)) {
            return Response.json(
              { error: "Invalid analyzerType. Must be: financial, sales, operations, or customer" },
              { status: 400 }
            );
          }
          
          console.log(`[AI COO API] Manually triggering ${analyzerType} analyzer...`);
          
          await triggerAnalyzerManually(analyzerType);
          
          return Response.json({
            success: true,
            analyzerType,
            message: `${analyzerType} analyzer triggered successfully`,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error("[AI COO API] Failed to trigger analyzer:", error);
          return Response.json(
            {
              error: "Failed to trigger analyzer",
              message: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
          );
        }
      },
    },
  },
});
