import * as React from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  CheckCircle,
  XCircle,
  Clock,
  User,
  FileText,
  Calendar,
  Loader2,
  AlertTriangle,
  Shield,
  Eye,
  ExternalLink,
  MapPin,
  Phone,
  Mail,
  CreditCard,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Textarea } from "~/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import type {
  KycVerificationStatus,
  KycTierLevel,
  KycDocumentType,
} from "~/db/schema";

// Types for the KYC verification data
export interface KycUser {
  id: string;
  name: string | null;
  email: string;
  image?: string | null;
}

export interface KycDocument {
  id: string;
  documentType: KycDocumentType;
  documentNumber: string | null;
  fileName: string | null;
  fileUrl: string | null;
  status: "pending" | "verified" | "rejected" | "expired";
  issuingCountry: string | null;
  issueDate: Date | null;
  expiryDate: Date | null;
  createdAt: Date;
  rejectionReason: string | null;
}

export interface KycVerificationData {
  id: string;
  userId: string;
  status: KycVerificationStatus;
  tierLevel: KycTierLevel;
  firstName: string | null;
  lastName: string | null;
  middleName: string | null;
  dateOfBirth: Date | null;
  nationality: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  stateProvince: string | null;
  postalCode: string | null;
  country: string | null;
  phoneNumber: string | null;
  taxId: string | null;
  riskScore: number | null;
  riskLevel: "low" | "medium" | "high" | "critical" | null;
  submittedAt: Date | null;
  reviewStartedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  user: KycUser;
  documents: KycDocument[];
}

interface KycVerificationCardProps {
  verification: KycVerificationData;
  onApprove: (id: string, tierLevel: KycTierLevel, comments?: string) => Promise<void>;
  onReject: (id: string, reason: string, details?: string) => Promise<void>;
  onStartReview?: (id: string) => Promise<void>;
  onVerifyDocument?: (documentId: string) => Promise<void>;
  onRejectDocument?: (documentId: string, reason: string) => Promise<void>;
  isProcessing?: boolean;
  tierOptions?: KycTierLevel[];
}

const TIER_LABELS: Record<KycTierLevel, string> = {
  none: "None (Unverified)",
  basic: "Basic",
  intermediate: "Intermediate",
  advanced: "Advanced",
  premium: "Premium",
};

const TIER_DESCRIPTIONS: Record<KycTierLevel, string> = {
  none: "No access to transactions",
  basic: "$1,000 daily limit",
  intermediate: "$10,000 daily limit",
  advanced: "$50,000 daily limit",
  premium: "$500,000 daily limit",
};

const DOCUMENT_TYPE_LABELS: Record<KycDocumentType, string> = {
  passport: "Passport",
  national_id: "National ID",
  drivers_license: "Driver's License",
  utility_bill: "Utility Bill",
  bank_statement: "Bank Statement",
  proof_of_address: "Proof of Address",
  selfie: "Selfie",
  other: "Other Document",
};

const STATUS_CONFIG: Record<
  KycVerificationStatus,
  { color: string; bgColor: string; label: string; icon: React.ElementType }
> = {
  not_started: { color: "text-gray-600", bgColor: "bg-gray-500/10", label: "Not Started", icon: Clock },
  pending: { color: "text-yellow-600", bgColor: "bg-yellow-500/10", label: "Pending", icon: Clock },
  submitted: { color: "text-blue-600", bgColor: "bg-blue-500/10", label: "Submitted", icon: FileText },
  under_review: { color: "text-purple-600", bgColor: "bg-purple-500/10", label: "Under Review", icon: Eye },
  approved: { color: "text-green-600", bgColor: "bg-green-500/10", label: "Approved", icon: CheckCircle },
  rejected: { color: "text-red-600", bgColor: "bg-red-500/10", label: "Rejected", icon: XCircle },
  expired: { color: "text-orange-600", bgColor: "bg-orange-500/10", label: "Expired", icon: AlertTriangle },
  suspended: { color: "text-red-600", bgColor: "bg-red-500/10", label: "Suspended", icon: AlertTriangle },
};

const RISK_COLORS: Record<string, string> = {
  low: "text-green-600 bg-green-500/10",
  medium: "text-yellow-600 bg-yellow-500/10",
  high: "text-orange-600 bg-orange-500/10",
  critical: "text-red-600 bg-red-500/10",
};

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(date: Date | null | string): string {
  if (!date) return "N/A";
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "MMM d, yyyy");
}

export function KycVerificationCard({
  verification,
  onApprove,
  onReject,
  onStartReview,
  onVerifyDocument,
  onRejectDocument,
  isProcessing = false,
  tierOptions = ["basic", "intermediate", "advanced", "premium"],
}: KycVerificationCardProps) {
  const [showRejectDialog, setShowRejectDialog] = React.useState(false);
  const [showApproveDialog, setShowApproveDialog] = React.useState(false);
  const [showDocumentDialog, setShowDocumentDialog] = React.useState(false);
  const [selectedDocument, setSelectedDocument] = React.useState<KycDocument | null>(null);
  const [rejectionReason, setRejectionReason] = React.useState("");
  const [rejectionDetails, setRejectionDetails] = React.useState("");
  const [approvalComment, setApprovalComment] = React.useState("");
  const [selectedTier, setSelectedTier] = React.useState<KycTierLevel>("basic");
  const [documentRejectionReason, setDocumentRejectionReason] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isExpanded, setIsExpanded] = React.useState(false);

  const statusConfig = STATUS_CONFIG[verification.status];
  const StatusIcon = statusConfig.icon;

  const handleApprove = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await onApprove(verification.id, selectedTier, approvalComment || undefined);
      setShowApproveDialog(false);
      setApprovalComment("");
      setSelectedTier("basic");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve verification");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      setError("Please provide a reason for rejection");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await onReject(verification.id, rejectionReason, rejectionDetails || undefined);
      setShowRejectDialog(false);
      setRejectionReason("");
      setRejectionDetails("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject verification");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartReview = async () => {
    if (!onStartReview) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onStartReview(verification.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start review");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyDocument = async () => {
    if (!selectedDocument || !onVerifyDocument) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onVerifyDocument(selectedDocument.id);
      setShowDocumentDialog(false);
      setSelectedDocument(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify document");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectDocument = async () => {
    if (!selectedDocument || !onRejectDocument || !documentRejectionReason.trim()) {
      setError("Please provide a reason for rejection");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await onRejectDocument(selectedDocument.id, documentRejectionReason);
      setShowDocumentDialog(false);
      setSelectedDocument(null);
      setDocumentRejectionReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject document");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDocumentDialog = (doc: KycDocument) => {
    setSelectedDocument(doc);
    setShowDocumentDialog(true);
    setDocumentRejectionReason("");
    setError(null);
  };

  const fullName = [verification.firstName, verification.middleName, verification.lastName]
    .filter(Boolean)
    .join(" ");

  const address = [
    verification.addressLine1,
    verification.addressLine2,
    verification.city,
    verification.stateProvince,
    verification.postalCode,
    verification.country,
  ]
    .filter(Boolean)
    .join(", ");

  const submittedDate = verification.submittedAt
    ? new Date(verification.submittedAt)
    : null;
  const timeAgo = submittedDate
    ? formatDistanceToNow(submittedDate, { addSuffix: true })
    : "Not submitted";

  const pendingDocuments = verification.documents.filter((d) => d.status === "pending").length;
  const verifiedDocuments = verification.documents.filter((d) => d.status === "verified").length;
  const rejectedDocuments = verification.documents.filter((d) => d.status === "rejected").length;

  const canApproveOrReject =
    verification.status === "under_review" || verification.status === "submitted";
  const canStartReview = verification.status === "submitted" && onStartReview;

  return (
    <>
      <Card
        className={cn(
          "transition-all duration-200 hover:shadow-md",
          isProcessing && "opacity-50 pointer-events-none"
        )}
        data-testid={`kyc-card-${verification.id}`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                {verification.user.image ? (
                  <AvatarImage
                    src={verification.user.image}
                    alt={verification.user.name || "User"}
                  />
                ) : (
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getInitials(fullName || verification.user.name)}
                  </AvatarFallback>
                )}
              </Avatar>
              <div>
                <CardTitle className="text-lg">
                  {fullName || verification.user.name || "Unknown User"}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {verification.user.email}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge
                variant="outline"
                className={cn(statusConfig.bgColor, statusConfig.color, "border-0")}
              >
                <StatusIcon className="w-3 h-3 mr-1" />
                {statusConfig.label}
              </Badge>
              {verification.riskLevel && (
                <Badge
                  variant="outline"
                  className={cn(RISK_COLORS[verification.riskLevel], "border-0")}
                >
                  <Shield className="w-3 h-3 mr-1" />
                  {verification.riskLevel.charAt(0).toUpperCase() +
                    verification.riskLevel.slice(1)}{" "}
                  Risk
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Tier Level */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground">Current Tier</span>
            </div>
            <Badge variant="secondary" className="font-medium">
              {TIER_LABELS[verification.tierLevel]}
            </Badge>
          </div>

          {/* Documents Summary */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground">Documents</span>
            </div>
            <div className="flex gap-2">
              {pendingDocuments > 0 && (
                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-0">
                  {pendingDocuments} pending
                </Badge>
              )}
              {verifiedDocuments > 0 && (
                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-0">
                  {verifiedDocuments} verified
                </Badge>
              )}
              {rejectedDocuments > 0 && (
                <Badge variant="outline" className="bg-red-500/10 text-red-600 border-0">
                  {rejectedDocuments} rejected
                </Badge>
              )}
              {verification.documents.length === 0 && (
                <span className="text-sm text-muted-foreground">No documents</span>
              )}
            </div>
          </div>

          {/* Submission Info */}
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Submitted</p>
              <p className="text-sm text-muted-foreground">{timeAgo}</p>
            </div>
          </div>

          {/* Expandable Details */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between p-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>View Details</span>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {isExpanded && (
            <div className="space-y-4 pt-2 border-t">
              {/* Personal Information */}
              {(verification.dateOfBirth || verification.nationality) && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Personal Information</p>
                  <div className="grid gap-2 text-sm">
                    {verification.dateOfBirth && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Date of Birth</span>
                        <span>{formatDate(verification.dateOfBirth)}</span>
                      </div>
                    )}
                    {verification.nationality && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Nationality</span>
                        <span>{verification.nationality}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Contact Information */}
              {(verification.phoneNumber || address) && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Contact Information</p>
                  <div className="space-y-2 text-sm">
                    {verification.phoneNumber && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span>{verification.phoneNumber}</span>
                      </div>
                    )}
                    {address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <span>{address}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Documents List */}
              {verification.documents.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Documents ({verification.documents.length})</p>
                  <div className="space-y-2">
                    {verification.documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-2 bg-muted/30 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">
                              {DOCUMENT_TYPE_LABELS[doc.documentType]}
                            </p>
                            {doc.documentNumber && (
                              <p className="text-xs text-muted-foreground">
                                #{doc.documentNumber}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={cn(
                              "border-0",
                              doc.status === "verified" && "bg-green-500/10 text-green-600",
                              doc.status === "pending" && "bg-yellow-500/10 text-yellow-600",
                              doc.status === "rejected" && "bg-red-500/10 text-red-600",
                              doc.status === "expired" && "bg-orange-500/10 text-orange-600"
                            )}
                          >
                            {doc.status}
                          </Badge>
                          {doc.fileUrl && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              asChild
                            >
                              <a
                                href={doc.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </Button>
                          )}
                          {doc.status === "pending" && onVerifyDocument && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2"
                              onClick={() => openDocumentDialog(doc)}
                            >
                              Review
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            {canStartReview && (
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleStartReview}
                disabled={isProcessing || isSubmitting}
                data-testid={`start-review-btn-${verification.id}`}
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Eye className="w-4 h-4 mr-2" />
                )}
                Start Review
              </Button>
            )}

            {canApproveOrReject && (
              <>
                <Button
                  variant="outline"
                  className="flex-1 border-red-500/20 text-red-600 hover:bg-red-500/10 hover:text-red-700"
                  onClick={() => setShowRejectDialog(true)}
                  disabled={isProcessing}
                  data-testid={`reject-btn-${verification.id}`}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => setShowApproveDialog(true)}
                  disabled={isProcessing}
                  data-testid={`approve-btn-${verification.id}`}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>
              </>
            )}

            {!canApproveOrReject && !canStartReview && (
              <p className="text-sm text-muted-foreground">
                No actions available for this status
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Approve KYC Verification
            </DialogTitle>
            <DialogDescription>
              You are about to approve the KYC verification for{" "}
              <strong>{fullName || verification.user.name}</strong>. Select the tier level
              to assign.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label htmlFor="tier-select" className="text-sm font-medium mb-2 block">
                Tier Level <span className="text-red-500">*</span>
              </label>
              <Select value={selectedTier} onValueChange={(v) => setSelectedTier(v as KycTierLevel)}>
                <SelectTrigger id="tier-select" data-testid="tier-select">
                  <SelectValue placeholder="Select tier level" />
                </SelectTrigger>
                <SelectContent>
                  {tierOptions.map((tier) => (
                    <SelectItem key={tier} value={tier}>
                      <div className="flex flex-col">
                        <span>{TIER_LABELS[tier]}</span>
                        <span className="text-xs text-muted-foreground">
                          {TIER_DESCRIPTIONS[tier]}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label htmlFor="approval-comment" className="text-sm font-medium mb-2 block">
                Comment (optional)
              </label>
              <Textarea
                id="approval-comment"
                placeholder="Add a comment for the record..."
                value={approvalComment}
                onChange={(e) => setApprovalComment(e.target.value)}
                className="min-h-[80px]"
                data-testid="approval-comment"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-500/10 p-3 rounded-lg">
                <AlertTriangle className="w-4 h-4" />
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleApprove}
              disabled={isSubmitting}
              data-testid="confirm-approve-btn"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirm Approval
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              Reject KYC Verification
            </DialogTitle>
            <DialogDescription>
              You are about to reject the KYC verification for{" "}
              <strong>{fullName || verification.user.name}</strong>. Please provide a
              reason.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label htmlFor="rejection-reason" className="text-sm font-medium mb-2 block">
                Reason for Rejection <span className="text-red-500">*</span>
              </label>
              <Textarea
                id="rejection-reason"
                placeholder="Please explain why this verification is being rejected..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="min-h-[100px]"
                required
                data-testid="rejection-reason"
              />
            </div>

            <div>
              <label htmlFor="rejection-details" className="text-sm font-medium mb-2 block">
                Additional Details (optional)
              </label>
              <Textarea
                id="rejection-details"
                placeholder="Any additional details or instructions for the user..."
                value={rejectionDetails}
                onChange={(e) => setRejectionDetails(e.target.value)}
                className="min-h-[60px]"
                data-testid="rejection-details"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-500/10 p-3 rounded-lg">
                <AlertTriangle className="w-4 h-4" />
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isSubmitting || !rejectionReason.trim()}
              data-testid="confirm-reject-btn"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Rejecting...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  Confirm Rejection
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Review Dialog */}
      <Dialog open={showDocumentDialog} onOpenChange={setShowDocumentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Review Document
            </DialogTitle>
            <DialogDescription>
              {selectedDocument && (
                <>
                  Review the{" "}
                  <strong>{DOCUMENT_TYPE_LABELS[selectedDocument.documentType]}</strong>{" "}
                  document.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedDocument && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Document Type</span>
                  <span className="font-medium">
                    {DOCUMENT_TYPE_LABELS[selectedDocument.documentType]}
                  </span>
                </div>
                {selectedDocument.documentNumber && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Document Number</span>
                    <span className="font-medium">{selectedDocument.documentNumber}</span>
                  </div>
                )}
                {selectedDocument.issuingCountry && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Issuing Country</span>
                    <span className="font-medium">{selectedDocument.issuingCountry}</span>
                  </div>
                )}
                {selectedDocument.expiryDate && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Expiry Date</span>
                    <span className="font-medium">
                      {formatDate(selectedDocument.expiryDate)}
                    </span>
                  </div>
                )}
                {selectedDocument.fileUrl && (
                  <div className="pt-2">
                    <a
                      href={selectedDocument.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View Document
                    </a>
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="document-rejection-reason"
                  className="text-sm font-medium mb-2 block"
                >
                  Rejection Reason (required if rejecting)
                </label>
                <Textarea
                  id="document-rejection-reason"
                  placeholder="Reason for rejecting this document..."
                  value={documentRejectionReason}
                  onChange={(e) => setDocumentRejectionReason(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-500/10 p-3 rounded-lg">
                  <AlertTriangle className="w-4 h-4" />
                  {error}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDocumentDialog(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectDocument}
              disabled={isSubmitting || !documentRejectionReason.trim()}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4 mr-2" />
              )}
              Reject Document
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleVerifyDocument}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Verify Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
