/**
 * KYC Server Functions
 *
 * Server functions for KYC (Know Your Customer) verification operations.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authenticatedMiddleware } from "./middleware";
import {
  getOrCreateKycVerification,
  getKycVerificationWithRelationsByUserId,
  updateKycVerification,
  submitKycVerification,
  createKycDocument,
  getKycDocumentsByUserId,
  deleteKycDocument,
  getAllKycTierConfigs,
} from "~/data-access/kyc-verification";

// Document types supported for KYC
export const KYC_DOCUMENT_TYPES = [
  "passport",
  "drivers_license",
  "national_id",
  "proof_of_address",
  "bank_statement",
  "selfie",
  "utility_bill",
] as const;
export type KycDocumentType = (typeof KYC_DOCUMENT_TYPES)[number];

// Document type labels for display
export const KYC_DOCUMENT_TYPE_LABELS: Record<KycDocumentType, string> = {
  passport: "Passport",
  drivers_license: "Driver's License",
  national_id: "National ID Card",
  proof_of_address: "Proof of Address",
  bank_statement: "Bank Statement",
  selfie: "Selfie Photo",
  utility_bill: "Utility Bill",
};

// Document type descriptions
export const KYC_DOCUMENT_TYPE_DESCRIPTIONS: Record<KycDocumentType, string> = {
  passport: "Valid international passport with photo page visible",
  drivers_license: "Valid driver's license showing photo and expiration date",
  national_id: "Government-issued national ID card",
  proof_of_address: "Utility bill or bank statement showing your current address (within 3 months)",
  bank_statement: "Recent bank statement showing your name and address",
  selfie: "Clear selfie photo for identity verification",
  utility_bill: "Recent utility bill showing your name and address",
};

// Personal info validation schema
const personalInfoSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  middleName: z.string().max(100).optional().nullable(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  nationality: z.string().min(1, "Nationality is required").max(100),
  phoneNumber: z.string().min(1, "Phone number is required").max(20),
  addressLine1: z.string().min(1, "Address is required").max(200),
  addressLine2: z.string().max(200).optional().nullable(),
  city: z.string().min(1, "City is required").max(100),
  stateProvince: z.string().max(100).optional().nullable(),
  postalCode: z.string().min(1, "Postal code is required").max(20),
  country: z.string().min(1, "Country is required").max(100),
});

// Get current user's KYC verification (creates one if it doesn't exist)
export const getMyKycVerificationFn = createServerFn({
  method: "GET",
})
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    const verification = await getOrCreateKycVerification(context.userId);
    return verification;
  });

// Get current user's KYC verification with documents
export const getMyKycVerificationWithDocumentsFn = createServerFn({
  method: "GET",
})
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    // First ensure we have a verification record
    await getOrCreateKycVerification(context.userId);

    // Then get with relations
    const verification = await getKycVerificationWithRelationsByUserId(context.userId);
    return verification;
  });

// Update personal information
export const updateKycPersonalInfoFn = createServerFn({
  method: "POST",
})
  .inputValidator(personalInfoSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // Get or create verification
    const existing = await getOrCreateKycVerification(context.userId);

    // Update with personal info
    const updated = await updateKycVerification(
      existing.id,
      {
        firstName: data.firstName,
        lastName: data.lastName,
        middleName: data.middleName,
        dateOfBirth: data.dateOfBirth,
        nationality: data.nationality,
        phoneNumber: data.phoneNumber,
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2,
        city: data.city,
        stateProvince: data.stateProvince,
        postalCode: data.postalCode,
        country: data.country,
        status: existing.status === "not_started" ? "in_progress" : existing.status,
      },
      context.userId,
      "user",
      "Personal information updated"
    );

    return updated;
  });

// Add a document to KYC
const addDocumentSchema = z.object({
  documentType: z.enum(KYC_DOCUMENT_TYPES),
  fileName: z.string().min(1, "File name is required"),
  fileUrl: z.string().url("Invalid file URL"),
  fileSize: z.number().int().positive().optional(),
  mimeType: z.string().optional(),
  isFrontSide: z.boolean().optional().default(true),
  isBackSide: z.boolean().optional().default(false),
});

export const addKycDocumentFn = createServerFn({
  method: "POST",
})
  .inputValidator(addDocumentSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // Get or create verification
    const verification = await getOrCreateKycVerification(context.userId);

    // Create the document
    const document = await createKycDocument({
      kycVerificationId: verification.id,
      userId: context.userId,
      documentType: data.documentType,
      fileName: data.fileName,
      fileUrl: data.fileUrl,
      fileSize: data.fileSize,
      mimeType: data.mimeType,
      isFrontSide: data.isFrontSide,
      isBackSide: data.isBackSide,
      status: "pending",
    });

    // Update verification status if needed
    if (verification.status === "not_started") {
      await updateKycVerification(
        verification.id,
        { status: "in_progress" },
        context.userId,
        "user"
      );
    }

    return document;
  });

// Remove a document from KYC
export const removeKycDocumentFn = createServerFn({
  method: "POST",
})
  .inputValidator(z.object({ documentId: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    const success = await deleteKycDocument(data.documentId);
    if (!success) {
      throw new Error("Document not found or already deleted");
    }
    return { success: true };
  });

// Get user's documents
export const getMyKycDocumentsFn = createServerFn({
  method: "GET",
})
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    const documents = await getKycDocumentsByUserId(context.userId);
    return documents;
  });

// Submit KYC for review
export const submitKycForReviewFn = createServerFn({
  method: "POST",
})
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    // Get verification with documents
    const verification = await getKycVerificationWithRelationsByUserId(context.userId);

    if (!verification) {
      throw new Error("KYC verification not found");
    }

    // Validate required personal info is filled
    if (!verification.firstName || !verification.lastName || !verification.dateOfBirth) {
      throw new Error("Please complete your personal information before submitting");
    }

    // Validate at least one document is uploaded
    if (!verification.documents || verification.documents.length === 0) {
      throw new Error("Please upload at least one document before submitting");
    }

    // Check if at least one ID document (passport, drivers_license, or national_id) is present
    const hasIdDocument = verification.documents.some(
      (doc) => ["passport", "drivers_license", "national_id"].includes(doc.documentType)
    );

    if (!hasIdDocument) {
      throw new Error("Please upload at least one ID document (passport, driver's license, or national ID)");
    }

    // Submit for review
    const result = await submitKycVerification(verification.id);

    return result;
  });

// Get available tier configurations
export const getKycTierConfigsFn = createServerFn({
  method: "GET",
})
  .middleware([authenticatedMiddleware])
  .handler(async () => {
    const configs = await getAllKycTierConfigs();
    return configs;
  });
