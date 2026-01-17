/**
 * OCR Service Types
 * Type definitions for OCR receipt processing
 */

// ============================================================================
// Receipt Extraction Types
// ============================================================================

export interface ExtractedAmount {
  value: number;
  currency: string;
  confidence: number;
  rawText: string;
}

export interface ExtractedVendor {
  name: string;
  confidence: number;
  address?: string;
  phone?: string;
  taxId?: string;
}

export interface ExtractedDate {
  value: string; // YYYY-MM-DD format
  confidence: number;
  rawText: string;
  time?: string; // HH:MM format if available
}

export interface ExtractedLineItem {
  description: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
  confidence: number;
}

export interface ExtractedPaymentInfo {
  method?: string; // cash, card, etc.
  cardLastFour?: string;
  transactionId?: string;
}

export interface ReceiptExtractionResult {
  // Core fields
  amount: ExtractedAmount | null;
  vendor: ExtractedVendor | null;
  date: ExtractedDate | null;

  // Optional fields
  lineItems?: ExtractedLineItem[];
  tax?: ExtractedAmount | null;
  subtotal?: ExtractedAmount | null;
  tip?: ExtractedAmount | null;
  paymentInfo?: ExtractedPaymentInfo;

  // Metadata
  rawText: string;
  ocrProvider: OcrProvider;
  processingTimeMs: number;
  timestamp: string; // ISO date

  // Quality indicators
  overallConfidence: number;
  requiresManualReview: boolean;
  validationErrors: ValidationError[];
}

export type OcrProvider = 'claude' | 'tesseract' | 'textract';

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

// ============================================================================
// OCR Processing Options
// ============================================================================

export interface OcrProcessingOptions {
  provider?: OcrProvider;
  language?: string;
  enhanceImage?: boolean;
  extractLineItems?: boolean;
  confidenceThreshold?: number;
}

// ============================================================================
// OCR Service Interface
// ============================================================================

export interface OcrServiceResult {
  success: boolean;
  data?: ReceiptExtractionResult;
  error?: string;
}

// ============================================================================
// Manual Correction Types
// ============================================================================

export interface CorrectedReceiptData {
  amount: number | null;
  currency: string;
  vendor: string;
  date: string; // YYYY-MM-DD
  category?: string;
  notes?: string;
}

export interface ReceiptCorrectionSubmission {
  extractionId: string;
  originalData: ReceiptExtractionResult;
  correctedData: CorrectedReceiptData;
  correctedFields: string[];
}
