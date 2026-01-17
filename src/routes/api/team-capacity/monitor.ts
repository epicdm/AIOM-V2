/**
 * Team Capacity Monitor API Route
 *
 * Provides endpoints for monitoring team workload, assignment balance,
 * and capacity constraints. Alerts when individuals are overloaded or
 * teams are underutilized.
 *
 * Endpoints:
 * - GET: Get team capacity monitoring dashboard data
 */

import { createFileRoute } from "@tanstack/react-router";
import {
  getTeamCapacityMonitorData,
  DEFAULT_CAPACITY_THRESHOLDS,
  type CapacityThresholdConfig,
} from "~/data-access/team-capacity-monitor";

export const Route = createFileRoute("/api/team-capacity/monitor")({
  server: {
    handlers: {
      /**
       * GET /api/team-capacity/monitor
       * Get team capacity monitor dashboard data
       *
       * Query Parameters:
       * - overloadThreshold: number (default: 100) - Utilization % considered overloaded
       * - warningThreshold: number (default: 85) - Utilization % for warning
       * - underutilizedThreshold: number (default: 30) - Utilization % considered underutilized
       *
       * Response:
       * - 200: { success: true, data: TeamCapacityMonitorData }
       * - 500: { error: "Failed to fetch team capacity data" }
       */
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);

          // Parse optional threshold parameters
          const thresholds: CapacityThresholdConfig = {
            ...DEFAULT_CAPACITY_THRESHOLDS,
          };

          const overloadThreshold = url.searchParams.get("overloadThreshold");
          if (overloadThreshold) {
            thresholds.overloadThreshold = parseInt(overloadThreshold, 10);
          }

          const warningThreshold = url.searchParams.get("warningThreshold");
          if (warningThreshold) {
            thresholds.warningThreshold = parseInt(warningThreshold, 10);
          }

          const underutilizedThreshold = url.searchParams.get("underutilizedThreshold");
          if (underutilizedThreshold) {
            thresholds.underutilizedThreshold = parseInt(underutilizedThreshold, 10);
          }

          console.log("Fetching team capacity monitor data...");

          const data = await getTeamCapacityMonitorData(thresholds);

          return Response.json({
            success: true,
            data: {
              summary: data.summary,
              members: data.members.map((member) => ({
                id: member.id,
                name: member.name,
                email: member.email,
                image: member.image,
                role: member.role,
                capacity: member.capacity
                  ? {
                      maxWeeklyHours: member.capacity.maxWeeklyHours,
                      maxConcurrentTasks: member.capacity.maxConcurrentTasks,
                      maxActiveProjects: member.capacity.maxActiveProjects,
                      currentTasks: member.capacity.currentTasks,
                      currentProjects: member.capacity.currentProjects,
                      currentWeeklyHours: member.capacity.currentWeeklyHours,
                      currentUtilization: member.capacity.currentUtilization,
                      status: member.capacity.status,
                      statusNote: member.capacity.statusNote,
                    }
                  : null,
                assignments: member.assignments.map((assignment) => ({
                  id: assignment.id,
                  title: assignment.title,
                  type: assignment.type,
                  priority: assignment.priority,
                  status: assignment.status,
                  estimatedHours: assignment.estimatedHours,
                  dueDate: assignment.dueDate?.toISOString() || null,
                  isOverdue: assignment.isOverdue,
                })),
              })),
              distribution: data.distribution,
              alerts: data.alerts.map((alert) => ({
                id: alert.id,
                type: alert.type,
                severity: alert.severity,
                title: alert.title,
                message: alert.message,
                userId: alert.userId,
                userName: alert.userName,
                currentValue: alert.currentValue,
                thresholdValue: alert.thresholdValue,
                createdAt: alert.createdAt.toISOString(),
                acknowledged: alert.acknowledged,
              })),
              suggestions: data.suggestions,
              trends: data.trends,
              lastRefreshed: data.lastRefreshed.toISOString(),
            },
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error("Error fetching team capacity monitor data:", error);
          return Response.json(
            {
              success: false,
              error: "Failed to fetch team capacity data",
              message: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
          );
        }
      },
    },
  },
});
