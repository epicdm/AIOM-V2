/**
 * KYC React Hooks
 *
 * Custom hooks for KYC verification operations using TanStack Query.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  myKycVerificationQueryOptions,
  myKycVerificationWithDocumentsQueryOptions,
  myKycDocumentsQueryOptions,
  kycTierConfigsQueryOptions,
} from "~/queries/kyc";
import {
  updateKycPersonalInfoFn,
  addKycDocumentFn,
  removeKycDocumentFn,
  submitKycForReviewFn,
  type KycDocumentType,
} from "~/fn/kyc";
import { getErrorMessage } from "~/utils/error";

// ==========================================
// Query Hooks
// ==========================================

/**
 * Get the current user's KYC verification
 */
export function useMyKycVerification(enabled = true) {
  return useQuery({
    ...myKycVerificationQueryOptions(),
    enabled,
  });
}

/**
 * Get the current user's KYC verification with documents
 */
export function useMyKycVerificationWithDocuments(enabled = true) {
  return useQuery({
    ...myKycVerificationWithDocumentsQueryOptions(),
    enabled,
  });
}

/**
 * Get the current user's KYC documents
 */
export function useMyKycDocuments(enabled = true) {
  return useQuery({
    ...myKycDocumentsQueryOptions(),
    enabled,
  });
}

/**
 * Get available KYC tier configurations
 */
export function useKycTierConfigs(enabled = true) {
  return useQuery({
    ...kycTierConfigsQueryOptions(),
    enabled,
  });
}

// ==========================================
// Mutation Hooks
// ==========================================

interface UpdatePersonalInfoData {
  firstName: string;
  lastName: string;
  middleName?: string | null;
  dateOfBirth: string;
  nationality: string;
  phoneNumber: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  stateProvince?: string | null;
  postalCode: string;
  country: string;
}

/**
 * Update KYC personal information
 */
export function useUpdateKycPersonalInfo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdatePersonalInfoData) =>
      updateKycPersonalInfoFn({ data }),
    onSuccess: () => {
      toast.success("Personal information saved!", {
        description: "Your information has been updated successfully.",
      });
      // Invalidate KYC queries
      queryClient.invalidateQueries({ queryKey: ["kyc"] });
    },
    onError: (error) => {
      toast.error("Failed to save personal information", {
        description: getErrorMessage(error),
      });
    },
  });
}

interface AddDocumentData {
  documentType: KycDocumentType;
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  isFrontSide?: boolean;
  isBackSide?: boolean;
}

/**
 * Add a document to KYC verification
 */
export function useAddKycDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AddDocumentData) => addKycDocumentFn({ data }),
    onSuccess: () => {
      toast.success("Document uploaded!", {
        description: "Your document has been added to your verification.",
      });
      // Invalidate KYC queries
      queryClient.invalidateQueries({ queryKey: ["kyc"] });
    },
    onError: (error) => {
      toast.error("Failed to upload document", {
        description: getErrorMessage(error),
      });
    },
  });
}

/**
 * Remove a document from KYC verification
 */
export function useRemoveKycDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (documentId: string) =>
      removeKycDocumentFn({ data: { documentId } }),
    onSuccess: () => {
      toast.success("Document removed", {
        description: "The document has been removed from your verification.",
      });
      // Invalidate KYC queries
      queryClient.invalidateQueries({ queryKey: ["kyc"] });
    },
    onError: (error) => {
      toast.error("Failed to remove document", {
        description: getErrorMessage(error),
      });
    },
  });
}

/**
 * Submit KYC for review
 */
export function useSubmitKycForReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => submitKycForReviewFn(),
    onSuccess: () => {
      toast.success("KYC submitted for review!", {
        description:
          "Your verification documents have been submitted. We will review them shortly.",
      });
      // Invalidate KYC queries
      queryClient.invalidateQueries({ queryKey: ["kyc"] });
    },
    onError: (error) => {
      toast.error("Failed to submit KYC", {
        description: getErrorMessage(error),
      });
    },
  });
}
