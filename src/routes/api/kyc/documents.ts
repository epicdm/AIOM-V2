/**
 * KYC Documents API Route
 *
 * Manage KYC document uploads.
 * GET - Get user's documents
 * POST - Upload a new document
 * DELETE - Delete a document
 *
 * GET/POST/DELETE /api/kyc/documents
 */

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  getOrCreateKycVerification,
  getKycDocumentsByVerificationId,
  createKycDocument,
  deleteKycDocument,
  getKycDocumentById,
} from "~/data-access/kyc-verification";
import { KYC_DOCUMENT_TYPES } from "~/db/schema";

// Input validation schema for uploading a document
const uploadDocumentSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  documentType: z.enum(KYC_DOCUMENT_TYPES),
  fileName: z.string().min(1, "File name is required"),
  fileUrl: z.string().url("File URL must be a valid URL"),
  fileSize: z.number().positive().optional(),
  mimeType: z.string().optional(),
  documentNumber: z.string().optional(),
  issuingCountry: z.string().optional(),
  issueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .optional(),
  expiryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .optional(),
  isFrontSide: z.boolean().optional(),
  isBackSide: z.boolean().optional(),
});

// Input validation schema for deleting a document
const deleteDocumentSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  documentId: z.string().min(1, "Document ID is required"),
});

export const Route = createFileRoute("/api/kyc/documents")({
  server: {
    handlers: {
      /**
       * GET /api/kyc/documents
       * Get all documents for a user's KYC verification
       */
      GET: async ({ request }) => {
        try {
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

          const verification = await getOrCreateKycVerification(userId);
          const documents = await getKycDocumentsByVerificationId(verification.id);

          return Response.json({
            success: true,
            data: {
              verificationId: verification.id,
              documents: documents.map((doc) => ({
                id: doc.id,
                documentType: doc.documentType,
                status: doc.status,
                fileName: doc.fileName,
                fileUrl: doc.fileUrl,
                fileSize: doc.fileSize,
                mimeType: doc.mimeType,
                documentNumber: doc.documentNumber,
                issuingCountry: doc.issuingCountry,
                issueDate: doc.issueDate,
                expiryDate: doc.expiryDate,
                isFrontSide: doc.isFrontSide,
                isBackSide: doc.isBackSide,
                uploadedAt: doc.uploadedAt,
                verifiedAt: doc.verifiedAt,
                rejectedAt: doc.rejectedAt,
                rejectionReason: doc.rejectionReason,
              })),
              totalDocuments: documents.length,
              pendingDocuments: documents.filter((d) => d.status === "pending").length,
              verifiedDocuments: documents.filter((d) => d.status === "verified").length,
              rejectedDocuments: documents.filter((d) => d.status === "rejected").length,
            },
          });
        } catch (error) {
          console.error("Error fetching KYC documents:", error);
          return Response.json(
            {
              success: false,
              error: "Failed to fetch documents",
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
       * POST /api/kyc/documents
       * Upload a new document for KYC verification
       */
      POST: async ({ request }) => {
        try {
          const body = await request.json();

          // Validate input
          const validationResult = uploadDocumentSchema.safeParse(body);
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

          const { userId, ...documentData } = validationResult.data;

          // Get or create KYC verification
          const verification = await getOrCreateKycVerification(userId);

          // Check if verification allows document uploads
          if (
            verification.status === "approved" ||
            verification.status === "under_review"
          ) {
            return Response.json(
              {
                success: false,
                error: "Cannot upload documents",
                message: `KYC verification is in '${verification.status}' status. Documents cannot be modified.`,
              },
              { status: 400 }
            );
          }

          // Get IP address for tracking
          const uploadIpAddress =
            request.headers.get("x-forwarded-for")?.split(",")[0] ||
            request.headers.get("x-real-ip") ||
            "unknown";

          // Create the document
          const document = await createKycDocument({
            kycVerificationId: verification.id,
            userId,
            ...documentData,
            uploadIpAddress,
          });

          return Response.json({
            success: true,
            data: {
              id: document.id,
              documentType: document.documentType,
              status: document.status,
              fileName: document.fileName,
              uploadedAt: document.uploadedAt,
            },
            message: "Document uploaded successfully",
          });
        } catch (error) {
          console.error("Error uploading KYC document:", error);
          return Response.json(
            {
              success: false,
              error: "Failed to upload document",
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
       * DELETE /api/kyc/documents
       * Delete a document from KYC verification
       */
      DELETE: async ({ request }) => {
        try {
          const body = await request.json();

          // Validate input
          const validationResult = deleteDocumentSchema.safeParse(body);
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

          const { userId, documentId } = validationResult.data;

          // Get the document
          const document = await getKycDocumentById(documentId);

          if (!document) {
            return Response.json(
              {
                success: false,
                error: "Document not found",
              },
              { status: 404 }
            );
          }

          // Verify ownership
          if (document.userId !== userId) {
            return Response.json(
              {
                success: false,
                error: "Unauthorized",
                message: "You do not have permission to delete this document",
              },
              { status: 403 }
            );
          }

          // Check if document can be deleted
          if (document.status === "verified") {
            return Response.json(
              {
                success: false,
                error: "Cannot delete verified document",
                message: "Verified documents cannot be deleted",
              },
              { status: 400 }
            );
          }

          // Delete the document
          await deleteKycDocument(documentId);

          return Response.json({
            success: true,
            message: "Document deleted successfully",
          });
        } catch (error) {
          console.error("Error deleting KYC document:", error);
          return Response.json(
            {
              success: false,
              error: "Failed to delete document",
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
