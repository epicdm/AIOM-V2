/**
 * Data Export API Route
 *
 * Provides endpoints for users to export their data in standard formats (JSON, CSV)
 * for data portability and compliance with data protection regulations (GDPR, etc.)
 *
 * POST /api/data-export - Request a data export
 * GET /api/data-export - Get immediate/synchronous data export
 */

import { createFileRoute } from "@tanstack/react-router";
import { auth } from "~/utils/auth";
import {
  collectUserDataForExport,
  formatDataExport,
  getContentTypeForFormat,
  getFileExtensionForFormat,
  type ExportFormat,
  type DataExportFilters,
} from "~/data-access/data-export";
import { enqueueJob } from "~/lib/job-queue";

interface ExportRequestBody {
  format?: ExportFormat;
  async?: boolean;
  filters?: {
    startDate?: string;
    endDate?: string;
    includeProfile?: boolean;
    includeExpenses?: boolean;
    includeBriefings?: boolean;
    includeCallRecords?: boolean;
    includeCallDispositions?: boolean;
    includeCallTasks?: boolean;
  };
}

export const Route = createFileRoute("/api/data-export/")({
  server: {
    handlers: {
      /**
       * GET /api/data-export
       * Synchronous data export - returns data immediately
       *
       * Query parameters:
       * - format: "json" | "csv" (default: "json")
       * - startDate: ISO date string (optional)
       * - endDate: ISO date string (optional)
       *
       * Response:
       * - 200: Export data in requested format
       * - 401: Unauthorized
       * - 500: Server error
       */
      GET: async ({ request }) => {
        try {
          // Get authenticated user
          const session = await auth.api.getSession({ headers: request.headers });

          if (!session?.user?.id) {
            return Response.json(
              { error: "Unauthorized: You must be logged in to export data" },
              { status: 401 }
            );
          }

          const userId = session.user.id;
          const url = new URL(request.url);

          // Parse query parameters
          const format = (url.searchParams.get("format") || "json") as ExportFormat;
          const startDateStr = url.searchParams.get("startDate");
          const endDateStr = url.searchParams.get("endDate");

          // Validate format
          if (!["json", "csv"].includes(format)) {
            return Response.json(
              { error: "Invalid format. Supported formats: json, csv" },
              { status: 400 }
            );
          }

          // Build filters
          const filters: DataExportFilters = {};
          if (startDateStr) {
            filters.startDate = new Date(startDateStr);
          }
          if (endDateStr) {
            filters.endDate = new Date(endDateStr);
          }

          console.log(`[DataExport] Generating synchronous export for user ${userId} in ${format} format`);

          // Collect and format data
          const data = await collectUserDataForExport(userId, filters);
          const exportContent = formatDataExport(data, format);
          const contentType = getContentTypeForFormat(format);
          const extension = getFileExtensionForFormat(format);
          const filename = `data-export-${userId}-${Date.now()}.${extension}`;

          // Return as downloadable file
          return new Response(exportContent, {
            status: 200,
            headers: {
              "Content-Type": contentType,
              "Content-Disposition": `attachment; filename="${filename}"`,
              "X-Export-Records": String(data.metadata.totalRecords),
            },
          });
        } catch (error) {
          console.error("[DataExport] Error generating export:", error);
          return Response.json(
            {
              error: "Failed to generate data export",
              message: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
          );
        }
      },

      /**
       * POST /api/data-export
       * Request a data export (can be sync or async)
       *
       * Body:
       * - format: "json" | "csv" (default: "json")
       * - async: boolean (default: false) - if true, queues a background job
       * - filters: object with date range and data type filters
       *
       * Response:
       * - 200: { success: true, data: ... } for sync exports
       * - 202: { success: true, jobId: string } for async exports
       * - 401: Unauthorized
       * - 400: Invalid request
       * - 500: Server error
       */
      POST: async ({ request }) => {
        try {
          // Get authenticated user
          const session = await auth.api.getSession({ headers: request.headers });

          if (!session?.user?.id) {
            return Response.json(
              { error: "Unauthorized: You must be logged in to export data" },
              { status: 401 }
            );
          }

          const userId = session.user.id;
          const body = (await request.json()) as ExportRequestBody;

          const format = body.format || "json";
          const isAsync = body.async || false;

          // Validate format
          if (!["json", "csv"].includes(format)) {
            return Response.json(
              { error: "Invalid format. Supported formats: json, csv" },
              { status: 400 }
            );
          }

          // Build filters
          const filters: DataExportFilters = {
            includeProfile: body.filters?.includeProfile ?? true,
            includeExpenses: body.filters?.includeExpenses ?? true,
            includeBriefings: body.filters?.includeBriefings ?? true,
            includeCallRecords: body.filters?.includeCallRecords ?? true,
            includeCallDispositions: body.filters?.includeCallDispositions ?? true,
            includeCallTasks: body.filters?.includeCallTasks ?? true,
          };

          if (body.filters?.startDate) {
            filters.startDate = new Date(body.filters.startDate);
          }
          if (body.filters?.endDate) {
            filters.endDate = new Date(body.filters.endDate);
          }

          // Async export - queue a background job
          if (isAsync) {
            console.log(`[DataExport] Queueing async export for user ${userId} in ${format} format`);

            const result = await enqueueJob({
              type: "data.export",
              name: `Data export for user ${userId}`,
              payload: {
                userId,
                format,
                filters,
              },
              priority: "normal",
              userId,
              referenceType: "data_export",
              processingTimeout: 300000, // 5 minutes
            });

            if (!result.success) {
              return Response.json(
                { error: result.error || "Failed to queue export job" },
                { status: 500 }
              );
            }

            return Response.json(
              {
                success: true,
                async: true,
                jobId: result.jobId,
                message: "Data export has been queued. You will be notified when it's ready.",
              },
              { status: 202 }
            );
          }

          // Sync export - generate immediately
          console.log(`[DataExport] Generating synchronous export for user ${userId} in ${format} format`);

          const data = await collectUserDataForExport(userId, filters);
          const exportContent = formatDataExport(data, format);
          const contentType = getContentTypeForFormat(format);
          const extension = getFileExtensionForFormat(format);
          const filename = `data-export-${userId}-${Date.now()}.${extension}`;

          // Return data with metadata
          return Response.json({
            success: true,
            async: false,
            format,
            filename,
            contentType,
            totalRecords: data.metadata.totalRecords,
            data: format === "json" ? data : undefined,
            content: format === "csv" ? exportContent : undefined,
          });
        } catch (error) {
          console.error("[DataExport] Error processing export request:", error);
          return Response.json(
            {
              error: "Failed to process data export request",
              message: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
          );
        }
      },
    },
  },
});
