/**
 * Mobile KYC Status Page
 *
 * Shows the current KYC verification status and provides
 * a link to start or continue the verification process.
 */

import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Shield,
  Loader2,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  ChevronRight,
  FileText,
} from "lucide-react";
import { authClient } from "~/lib/auth-client";
import { redirect } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { useMyKycVerificationWithDocuments } from "~/hooks/useKyc";
import { cn } from "~/lib/utils";
import { KYC_DOCUMENT_TYPE_LABELS, type KycDocumentType } from "~/fn/kyc";

export const Route = createFileRoute("/mobile/kyc/")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session) {
      throw redirect({
        to: "/sign-in",
        search: { redirect: "/mobile/kyc" },
      });
    }
  },
  component: MobileKYCIndexPage,
});

// Status configuration
const STATUS_CONFIG = {
  not_started: {
    icon: AlertCircle,
    label: "Not Started",
    description: "You haven't started your KYC verification yet.",
    color: "text-muted-foreground",
    bgColor: "bg-muted",
  },
  in_progress: {
    icon: Clock,
    label: "In Progress",
    description: "Your verification is in progress. Please complete all required steps.",
    color: "text-yellow-600",
    bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
  },
  submitted: {
    icon: Clock,
    label: "Under Review",
    description: "Your verification has been submitted and is under review.",
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
  },
  under_review: {
    icon: Clock,
    label: "Under Review",
    description: "Our team is reviewing your documents. This usually takes 1-2 business days.",
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
  },
  approved: {
    icon: CheckCircle,
    label: "Approved",
    description: "Your identity has been verified successfully.",
    color: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-900/20",
  },
  rejected: {
    icon: XCircle,
    label: "Rejected",
    description: "Your verification was not approved. Please review the feedback and try again.",
    color: "text-red-600",
    bgColor: "bg-red-50 dark:bg-red-900/20",
  },
  expired: {
    icon: AlertCircle,
    label: "Expired",
    description: "Your verification has expired. Please submit new documents.",
    color: "text-orange-600",
    bgColor: "bg-orange-50 dark:bg-orange-900/20",
  },
  suspended: {
    icon: XCircle,
    label: "Suspended",
    description: "Your account verification has been suspended. Please contact support.",
    color: "text-red-600",
    bgColor: "bg-red-50 dark:bg-red-900/20",
  },
};

function MobileKYCIndexPage() {
  const { data: verification, isLoading } = useMyKycVerificationWithDocuments();

  const status = verification?.status || "not_started";
  const statusConfig = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.not_started;
  const StatusIcon = statusConfig.icon;

  // Check if user can start/continue verification
  const canStartOrContinue = ["not_started", "in_progress", "rejected", "expired"].includes(status);

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
                Identity verification status
              </p>
            </div>
          </div>
          <Shield className="h-6 w-6 text-primary" />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        ) : (
          <>
            {/* Status Card */}
            <Card className={cn(statusConfig.bgColor)}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className={cn("p-3 rounded-full", statusConfig.bgColor)}>
                    <StatusIcon className={cn("h-8 w-8", statusConfig.color)} />
                  </div>
                  <div className="flex-1">
                    <h2 className={cn("text-lg font-semibold", statusConfig.color)}>
                      {statusConfig.label}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      {statusConfig.description}
                    </p>
                    {verification?.rejectionReason && status === "rejected" && (
                      <p className="text-sm text-red-600 mt-2">
                        <strong>Reason:</strong> {verification.rejectionReason}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Verification Details */}
            {verification && status !== "not_started" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Verification Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {verification.firstName && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-sm text-muted-foreground">Name</span>
                      <span className="text-sm font-medium">
                        {verification.firstName} {verification.lastName}
                      </span>
                    </div>
                  )}
                  {verification.tierLevel && verification.tierLevel !== "none" && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-sm text-muted-foreground">Verification Tier</span>
                      <span className="text-sm font-medium capitalize">
                        {verification.tierLevel}
                      </span>
                    </div>
                  )}
                  {verification.submittedAt && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-sm text-muted-foreground">Submitted</span>
                      <span className="text-sm font-medium">
                        {new Date(verification.submittedAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {verification.approvedAt && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-sm text-muted-foreground">Approved</span>
                      <span className="text-sm font-medium">
                        {new Date(verification.approvedAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {verification.expiresAt && (
                    <div className="flex justify-between py-2">
                      <span className="text-sm text-muted-foreground">Expires</span>
                      <span className="text-sm font-medium">
                        {new Date(verification.expiresAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Documents */}
            {verification?.documents && verification.documents.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Uploaded Documents
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {verification.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-sm">
                          {KYC_DOCUMENT_TYPE_LABELS[doc.documentType as KycDocumentType] || doc.documentType}
                        </p>
                        <p className="text-xs text-muted-foreground">{doc.fileName}</p>
                      </div>
                      <span
                        className={cn(
                          "text-xs px-2 py-1 rounded-full",
                          doc.status === "verified" && "bg-green-100 text-green-700",
                          doc.status === "pending" && "bg-yellow-100 text-yellow-700",
                          doc.status === "rejected" && "bg-red-100 text-red-700"
                        )}
                      >
                        {doc.status}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Action Button */}
            {canStartOrContinue && (
              <Link to="/mobile/kyc/submit">
                <Button className="w-full h-14" size="lg" data-testid="start-kyc-btn">
                  <Shield className="h-5 w-5 mr-2" />
                  {status === "not_started" ? "Start Verification" : "Continue Verification"}
                  <ChevronRight className="h-5 w-5 ml-2" />
                </Button>
              </Link>
            )}

            {/* Info Cards */}
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <h3 className="font-medium text-sm mb-2">Why verify your identity?</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Access higher transaction limits</li>
                  <li>• Enable withdrawals and transfers</li>
                  <li>• Unlock premium features</li>
                  <li>• Comply with regulations</li>
                </ul>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

export default MobileKYCIndexPage;
