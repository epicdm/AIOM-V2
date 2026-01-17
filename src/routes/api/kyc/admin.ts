/**
 * KYC Admin API Route
 *
 * Admin endpoints for managing KYC verifications.
 * Includes approval, rejection, and listing pending verifications.
 *
 * GET - List KYC verifications (with filters)
 * POST - Approve or reject a KYC verification
 *
 * GET/POST /api/kyc/admin
 */

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  listKycVerifications,
  getPendingKycVerificationsForReview,
  getKycVerificationWithRelations,
  approveKycVerification,
  rejectKycVerification,
  updateKycVerification,
  verifyKycDocument,
  rejectKycDocument,
} from "~/data-access/kyc-verification";
import {
  KYC_VERIFICATION_STATUSES,
  KYC_TIER_LEVELS,
} from "~/db/schema";

// Input validation for listing
const listKycSchema = z.object({
  status: z
    .enum(KYC_VERIFICATION_STATUSES)
    .or(z.array(z.enum(KYC_VERIFICATION_STATUSES)))
    .optional(),
  tierLevel: z.enum(KYC_TIER_LEVELS).optional(),
  page: z.coerce.number().positive().optional(),
  limit: z.coerce.number().positive().max(100).optional(),
  orderBy: z.enum(["createdAt", "submittedAt", "approvedAt"]).optional(),
  orderDir: z.enum(["asc", "desc"]).optional(),
});

// Input validation for admin actions
const adminActionSchema = z.object({
  adminId: z.string().min(1, "Admin ID is required"),
  verificationId: z.string().min(1, "Verification ID is required"),
  action: z.enum(["approve", "reject", "start_review", "verify_document", "reject_document"]),
  tierLevel: z.enum(KYC_TIER_LEVELS).optional(),
  documentId: z.string().optional(),
  reason: z.string().optional(),
  comments: z.string().optional(),
  extractedData: z.record(z.string(), z.unknown()).optional(),
});

export const Route = createFileRoute("/api/kyc/admin")({
  server: {
    handlers: {
      /**
       * GET /api/kyc/admin
       * List KYC verifications with optional filters
       */
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const params: Record<string, string | string[]> = {};

          // Parse query parameters
          for (const [key, value] of url.searchParams.entries()) {
            if (key === "status" && params[key]) {
              // Handle multiple status values
              if (Array.isArray(params[key])) {
                (params[key] as string[]).push(value);
              } else {
                params[key] = [params[key] as string, value];
              }
            } else {
              params[key] = value;
            }
          }

          // Check if requesting pending queue
          const pendingQueue = url.searchParams.get("pendingQueue") === "true";

          if (pendingQueue) {
            const limit = parseInt(url.searchParams.get("limit") || "20", 10);
            const pending = await getPendingKycVerificationsForReview(limit);

            return Response.json({
              success: true,
              data: pending,
              total: pending.length,
              message: "Pending KYC verifications for review",
            });
          }

          // Validate and parse filters
          const validationResult = listKycSchema.safeParse(params);
          if (!validationResult.success) {
            return Response.json(
              {
                success: false,
                error: "Invalid query parameters",
                details: validationResult.error.issues,
              },
              { status: 400 }
            );
          }

          const { data, total } = await listKycVerifications(validationResult.data as Parameters<typeof listKycVerifications>[0]);

          return Response.json({
            success: true,
            data,
            total,
            page: validationResult.data.page || 1,
            limit: validationResult.data.limit || 20,
            totalPages: Math.ceil(total / (validationResult.data.limit || 20)),
          });
        } catch (error) {
          console.error("Error listing KYC verifications:", error);
          return Response.json(
            {
              success: false,
              error: "Failed to list KYC verifications",
              message:
                error instanceof Error
                  ? error.message
                  : "An unexpected error occurred",
            },
            { status: 500 }
          );
        }
      },

      /**
       * POST /api/kyc/admin
       * Perform admin actions on KYC verification
       */
      POST: async ({ request }) => {
        try {
          const body = await request.json();

          // Validate input
          const validationResult = adminActionSchema.safeParse(body);
          if (!validationResult.success) {
            return Response.json(
              {
                success: false,
                error: "Validation failed",
                details: validationResult.error.issues,
              },
              { status: 400 }
            );
          }

          const {
            adminId,
            verificationId,
            action,
            tierLevel,
            documentId,
            reason,
            comments,
            extractedData,
          } = validationResult.data;

          // Get the verification
          const verification = await getKycVerificationWithRelations(verificationId);

          if (!verification) {
            return Response.json(
              {
                success: false,
                error: "Verification not found",
              },
              { status: 404 }
            );
          }

          let result;
          let message;

          switch (action) {
            case "approve":
              if (!tierLevel) {
                return Response.json(
                  {
                    success: false,
                    error: "Tier level is required for approval",
                  },
                  { status: 400 }
                );
              }
              result = await approveKycVerification(
                verificationId,
                adminId,
                tierLevel,
                comments
              );
              message = `KYC verification approved with tier level: ${tierLevel}`;
              break;

            case "reject":
              if (!reason) {
                return Response.json(
                  {
                    success: false,
                    error: "Rejection reason is required",
                  },
                  { status: 400 }
                );
              }
              result = await rejectKycVerification(
                verificationId,
                adminId,
                reason,
                comments ? { comments } : undefined
              );
              message = "KYC verification rejected";
              break;

            case "start_review":
              result = await updateKycVerification(
                verificationId,
                {
                  status: "under_review",
                  reviewStartedAt: new Date(),
                  reviewedById: adminId,
                },
                adminId,
                "admin",
                "Started review"
              );
              message = "Review started";
              break;

            case "verify_document":
              if (!documentId) {
                return Response.json(
                  {
                    success: false,
                    error: "Document ID is required",
                  },
                  { status: 400 }
                );
              }
              result = await verifyKycDocument(documentId, adminId, extractedData);
              message = "Document verified";
              break;

            case "reject_document":
              if (!documentId || !reason) {
                return Response.json(
                  {
                    success: false,
                    error: "Document ID and rejection reason are required",
                  },
                  { status: 400 }
                );
              }
              result = await rejectKycDocument(documentId, adminId, reason);
              message = "Document rejected";
              break;

            default:
              return Response.json(
                {
                  success: false,
                  error: "Invalid action",
                },
                { status: 400 }
              );
          }

          return Response.json({
            success: true,
            data: result,
            message,
          });
        } catch (error) {
          console.error("Error performing admin action:", error);
          return Response.json(
            {
              success: false,
              error: "Admin action failed",
              message:
                error instanceof Error
                  ? error.message
                  : "An unexpected error occurred",
            },
            { status: 500 }
          );
        }
      },
    },
  },
});
