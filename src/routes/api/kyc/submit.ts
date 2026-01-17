/**
 * KYC Submission API Route
 *
 * Submit KYC verification for review.
 *
 * POST /api/kyc/submit
 */

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  getKycVerificationByUserId,
  submitKycVerification,
  getKycDocumentsByVerificationId,
} from "~/data-access/kyc-verification";

// Input validation schema
const submitKycSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
});

export const Route = createFileRoute("/api/kyc/submit")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();

          // Validate input
          const validationResult = submitKycSchema.safeParse(body);
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

          const { userId } = validationResult.data;

          // Get user's KYC verification
          const verification = await getKycVerificationByUserId(userId);

          if (!verification) {
            return Response.json(
              {
                success: false,
                error: "KYC verification not found",
                message: "Please complete your KYC information first",
              },
              { status: 404 }
            );
          }

          // Check if already submitted or approved
          if (
            verification.status === "submitted" ||
            verification.status === "under_review"
          ) {
            return Response.json(
              {
                success: false,
                error: "Already submitted",
                message: "Your KYC verification is already under review",
              },
              { status: 400 }
            );
          }

          if (verification.status === "approved") {
            return Response.json(
              {
                success: false,
                error: "Already approved",
                message: "Your KYC verification has already been approved",
              },
              { status: 400 }
            );
          }

          // Check if user has uploaded at least one document
          const documents = await getKycDocumentsByVerificationId(verification.id);
          if (documents.length === 0) {
            return Response.json(
              {
                success: false,
                error: "No documents uploaded",
                message: "Please upload at least one identity document before submitting",
              },
              { status: 400 }
            );
          }

          // Check if required fields are filled
          const requiredFields = [
            "firstName",
            "lastName",
            "dateOfBirth",
            "country",
          ] as const;
          const missingFields = requiredFields.filter(
            (field) => !verification[field]
          );

          if (missingFields.length > 0) {
            return Response.json(
              {
                success: false,
                error: "Missing required fields",
                message: `Please complete the following fields: ${missingFields.join(", ")}`,
                missingFields,
              },
              { status: 400 }
            );
          }

          // Get IP address from request
          const ipAddress =
            request.headers.get("x-forwarded-for")?.split(",")[0] ||
            request.headers.get("x-real-ip") ||
            "unknown";
          const userAgent = request.headers.get("user-agent") || undefined;

          // Submit for review
          const updated = await submitKycVerification(
            verification.id,
            ipAddress,
            userAgent
          );

          return Response.json({
            success: true,
            data: {
              id: updated?.id,
              status: updated?.status,
              submittedAt: updated?.submittedAt,
            },
            message: "KYC verification submitted successfully for review",
          });
        } catch (error) {
          console.error("Error submitting KYC verification:", error);
          return Response.json(
            {
              success: false,
              error: "Submission failed",
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
