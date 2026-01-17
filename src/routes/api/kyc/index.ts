/**
 * KYC Verification API Route
 *
 * Main endpoint for managing KYC verification.
 * GET - Get current user's KYC status
 * POST - Create or update KYC verification data
 *
 * GET/POST /api/kyc
 */

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  getOrCreateKycVerification,
  getKycVerificationWithRelationsByUserId,
  updateKycVerification,
  getKycStatusSummary,
} from "~/data-access/kyc-verification";
import {
  KYC_DOCUMENT_TYPES,
  KYC_VERIFICATION_STATUSES,
  KYC_TIER_LEVELS,
} from "~/db/schema";

// Input validation schema for updating KYC data
const updateKycSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  middleName: z.string().max(100).optional(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .optional(),
  nationality: z.string().min(2).max(100).optional(),
  countryOfResidence: z.string().min(2).max(100).optional(),
  addressLine1: z.string().min(1).max(200).optional(),
  addressLine2: z.string().max(200).optional(),
  city: z.string().min(1).max(100).optional(),
  stateProvince: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  country: z.string().min(2).max(100).optional(),
  phoneNumber: z
    .string()
    .regex(/^\+?[1-9]\d{9,14}$/, "Invalid phone number format")
    .optional(),
  taxId: z.string().max(50).optional(),
  taxIdType: z.string().max(20).optional(),
  taxIdCountry: z.string().max(100).optional(),
});

export const Route = createFileRoute("/api/kyc/")({
  server: {
    handlers: {
      /**
       * GET /api/kyc
       * Get current user's KYC verification status and data
       */
      GET: async ({ request }) => {
        try {
          // In a real app, get userId from authenticated session
          const url = new URL(request.url);
          const userId = url.searchParams.get("userId");

          if (!userId) {
            return Response.json(
              {
                success: false,
                error: "User ID is required",
              },
              { status: 400 }
            );
          }

          const verification = await getKycVerificationWithRelationsByUserId(userId);

          if (!verification) {
            // Return default status for users without KYC record
            return Response.json({
              success: true,
              data: {
                status: "not_started",
                tierLevel: "none",
                isApproved: false,
                documentsCount: 0,
                pendingDocuments: 0,
              },
            });
          }

          const statusSummary = await getKycStatusSummary(userId);

          return Response.json({
            success: true,
            data: {
              id: verification.id,
              status: verification.status,
              tierLevel: verification.tierLevel,
              firstName: verification.firstName,
              lastName: verification.lastName,
              dateOfBirth: verification.dateOfBirth,
              nationality: verification.nationality,
              countryOfResidence: verification.countryOfResidence,
              addressLine1: verification.addressLine1,
              addressLine2: verification.addressLine2,
              city: verification.city,
              stateProvince: verification.stateProvince,
              postalCode: verification.postalCode,
              country: verification.country,
              phoneNumber: verification.phoneNumber,
              phoneVerified: verification.phoneVerified,
              submittedAt: verification.submittedAt,
              approvedAt: verification.approvedAt,
              rejectedAt: verification.rejectedAt,
              expiresAt: verification.expiresAt,
              rejectionReason: verification.rejectionReason,
              documents: verification.documents,
              summary: statusSummary,
              limits: {
                daily: verification.dailyTransactionLimit,
                weekly: verification.weeklyTransactionLimit,
                monthly: verification.monthlyTransactionLimit,
                single: verification.singleTransactionLimit,
              },
              createdAt: verification.createdAt,
              updatedAt: verification.updatedAt,
            },
          });
        } catch (error) {
          console.error("Error fetching KYC verification:", error);
          return Response.json(
            {
              success: false,
              error: "Failed to fetch KYC verification",
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
       * POST /api/kyc
       * Create or update KYC verification data
       */
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const { userId, ...data } = body;

          if (!userId) {
            return Response.json(
              {
                success: false,
                error: "User ID is required",
              },
              { status: 400 }
            );
          }

          // Validate input
          const validationResult = updateKycSchema.safeParse(data);
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

          // Get or create KYC verification
          const verification = await getOrCreateKycVerification(userId);

          // Check if verification is in a state that allows updates
          if (
            verification.status === "approved" ||
            verification.status === "under_review"
          ) {
            return Response.json(
              {
                success: false,
                error: "Cannot update KYC data",
                message: `KYC verification is in '${verification.status}' status and cannot be modified`,
              },
              { status: 400 }
            );
          }

          // Update the verification
          const updated = await updateKycVerification(
            verification.id,
            {
              ...validationResult.data,
              status: verification.status === "not_started" ? "pending" : verification.status,
            },
            userId,
            "user"
          );

          return Response.json({
            success: true,
            data: updated,
            message: "KYC data updated successfully",
          });
        } catch (error) {
          console.error("Error updating KYC verification:", error);
          return Response.json(
            {
              success: false,
              error: "Failed to update KYC verification",
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
