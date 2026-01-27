import { createFileRoute } from "@tanstack/react-router"
import { getActiveAlerts, acknowledgeAlert, dismissAlert, resolveAlert } from "~/data-access/ai-coo";

export const Route = createFileRoute("/api/ai-coo/alerts")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const alerts = await getActiveAlerts();
          
          return Response.json({
            alerts,
            total: alerts.length,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error("[AI COO API] Failed to fetch alerts:", error);
          return Response.json(
            {
              error: "Failed to fetch alerts",
              message: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
          );
        }
      },
      
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const { action, alertId, userId } = body;
          
          if (!action || !alertId) {
            return Response.json(
              { error: "alertId and action are required" },
              { status: 400 }
            );
          }
          
          switch (action) {
            case "acknowledge":
              if (!userId) {
                return Response.json(
                  { error: "userId required for acknowledge action" },
                  { status: 400 }
                );
              }
              await acknowledgeAlert(alertId, userId);
              break;
              
            case "dismiss":
              await dismissAlert(alertId);
              break;
              
            case "resolve":
              await resolveAlert(alertId);
              break;
              
            default:
              return Response.json(
                { error: "action must be 'acknowledge', 'dismiss', or 'resolve'" },
                { status: 400 }
              );
          }
          
          return Response.json({
            success: true,
            alertId,
            action,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error("[AI COO API] Failed to update alert:", error);
          return Response.json(
            {
              error: "Failed to update alert",
              message: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
          );
        }
      },
    },
  },
});
