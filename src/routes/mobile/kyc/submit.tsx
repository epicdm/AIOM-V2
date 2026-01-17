/**
 * Mobile KYC Submission Page
 *
 * Mobile-optimized page for submitting KYC verification documents
 * with photo capture, document type selection, and personal information form.
 */

import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Shield, Loader2 } from "lucide-react";
import { authClient } from "~/lib/auth-client";
import { redirect } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import { KYCSubmissionForm, type PersonalInfoFormData, type KYCDocument } from "~/components/KYCSubmissionForm";
import {
  useMyKycVerificationWithDocuments,
  useUpdateKycPersonalInfo,
  useAddKycDocument,
  useRemoveKycDocument,
  useSubmitKycForReview,
} from "~/hooks/useKyc";
import type { KycDocumentType } from "~/fn/kyc";

export const Route = createFileRoute("/mobile/kyc/submit")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session) {
      throw redirect({
        to: "/sign-in",
        search: { redirect: "/mobile/kyc/submit" },
      });
    }
  },
  component: MobileKYCSubmitPage,
});

function MobileKYCSubmitPage() {
  const navigate = useNavigate();

  // Fetch KYC verification data
  const { data: verification, isLoading } = useMyKycVerificationWithDocuments();

  // Mutations
  const updatePersonalInfo = useUpdateKycPersonalInfo();
  const addDocument = useAddKycDocument();
  const removeDocument = useRemoveKycDocument();
  const submitKyc = useSubmitKycForReview();

  // Handle personal info save
  const handleSavePersonalInfo = async (data: PersonalInfoFormData) => {
    await updatePersonalInfo.mutateAsync(data);
  };

  // Handle document add
  const handleAddDocument = async (document: {
    documentType: KycDocumentType;
    fileName: string;
    fileUrl: string;
    fileSize?: number;
    mimeType?: string;
  }) => {
    await addDocument.mutateAsync(document);
  };

  // Handle document remove
  const handleRemoveDocument = async (documentId: string) => {
    await removeDocument.mutateAsync(documentId);
  };

  // Handle submit
  const handleSubmit = async () => {
    await submitKyc.mutateAsync();
    // Navigate to success or back to mobile home
    navigate({ to: "/mobile" });
  };

  // Transform verification data to form format
  const defaultPersonalInfo: Partial<PersonalInfoFormData> | undefined = verification
    ? {
        firstName: verification.firstName || "",
        lastName: verification.lastName || "",
        middleName: verification.middleName || "",
        dateOfBirth: verification.dateOfBirth || "",
        nationality: verification.nationality || "",
        phoneNumber: verification.phoneNumber || "",
        addressLine1: verification.addressLine1 || "",
        addressLine2: verification.addressLine2 || "",
        city: verification.city || "",
        stateProvince: verification.stateProvince || "",
        postalCode: verification.postalCode || "",
        country: verification.country || "",
      }
    : undefined;

  // Transform documents to form format
  const existingDocuments: KYCDocument[] = verification?.documents?.map((doc) => ({
    id: doc.id,
    documentType: doc.documentType as KycDocumentType,
    fileName: doc.fileName,
    fileUrl: doc.fileUrl,
    status: doc.status,
  })) || [];

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to="/mobile">
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-semibold">KYC Verification</h1>
              <p className="text-xs text-muted-foreground">
                Verify your identity
              </p>
            </div>
          </div>
          <Shield className="h-6 w-6 text-primary" />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        ) : (
          <KYCSubmissionForm
            defaultPersonalInfo={defaultPersonalInfo}
            existingDocuments={existingDocuments}
            currentStatus={verification?.status}
            onSavePersonalInfo={handleSavePersonalInfo}
            onAddDocument={handleAddDocument}
            onRemoveDocument={handleRemoveDocument}
            onSubmit={handleSubmit}
            isSavingPersonalInfo={updatePersonalInfo.isPending}
            isAddingDocument={addDocument.isPending}
            isSubmitting={submitKyc.isPending}
          />
        )}
      </div>
    </div>
  );
}

export default MobileKYCSubmitPage;
