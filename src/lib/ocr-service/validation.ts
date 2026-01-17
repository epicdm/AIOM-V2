/**
 * OCR Validation Utilities
 * Validates extracted receipt data and identifies issues
 */

import type {
  ReceiptExtractionResult,
  ValidationError,
  ExtractedAmount,
  ExtractedDate,
  ExtractedVendor,
} from './types';

// ============================================================================
// Validation Constants
// ============================================================================

const MIN_CONFIDENCE_THRESHOLD = 0.5;
const REASONABLE_MIN_AMOUNT = 0.01;
const REASONABLE_MAX_AMOUNT = 1000000; // 1 million
const VALID_CURRENCIES = ['USD', 'EUR', 'GBP', 'NGN', 'KES', 'GHS', 'ZAR', 'CAD', 'AUD', 'INR'];

// ============================================================================
// Date Validation
// ============================================================================

function isValidDateString(dateStr: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateStr)) return false;

  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

function isReasonableReceiptDate(dateStr: string): boolean {
  const date = new Date(dateStr);
  const now = new Date();
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(now.getFullYear() - 1);
  const oneMonthFuture = new Date();
  oneMonthFuture.setMonth(now.getMonth() + 1);

  return date >= oneYearAgo && date <= oneMonthFuture;
}

// ============================================================================
// Amount Validation
// ============================================================================

function isReasonableAmount(amount: number): boolean {
  return amount >= REASONABLE_MIN_AMOUNT && amount <= REASONABLE_MAX_AMOUNT;
}

function isValidCurrency(currency: string): boolean {
  return VALID_CURRENCIES.includes(currency.toUpperCase());
}

// ============================================================================
// Main Validation Function
// ============================================================================

export function validateExtractionResult(result: ReceiptExtractionResult): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate amount
  if (!result.amount) {
    errors.push({
      field: 'amount',
      message: 'No amount could be extracted from the receipt',
      severity: 'error',
    });
  } else {
    errors.push(...validateAmount(result.amount));
  }

  // Validate vendor
  if (!result.vendor) {
    errors.push({
      field: 'vendor',
      message: 'No vendor/merchant name could be extracted',
      severity: 'warning',
    });
  } else {
    errors.push(...validateVendor(result.vendor));
  }

  // Validate date
  if (!result.date) {
    errors.push({
      field: 'date',
      message: 'No date could be extracted from the receipt',
      severity: 'warning',
    });
  } else {
    errors.push(...validateDate(result.date));
  }

  // Check for low overall confidence
  if (result.overallConfidence < MIN_CONFIDENCE_THRESHOLD) {
    errors.push({
      field: 'overallConfidence',
      message: 'Low confidence in extraction results. Please verify all fields.',
      severity: 'warning',
    });
  }

  return errors;
}

function validateAmount(amount: ExtractedAmount): ValidationError[] {
  const errors: ValidationError[] = [];

  if (amount.value <= 0) {
    errors.push({
      field: 'amount',
      message: 'Amount must be greater than zero',
      severity: 'error',
    });
  }

  if (!isReasonableAmount(amount.value)) {
    errors.push({
      field: 'amount',
      message: `Amount ${amount.value} seems unusual. Please verify.`,
      severity: 'warning',
    });
  }

  if (!isValidCurrency(amount.currency)) {
    errors.push({
      field: 'currency',
      message: `Unrecognized currency: ${amount.currency}`,
      severity: 'warning',
    });
  }

  if (amount.confidence < MIN_CONFIDENCE_THRESHOLD) {
    errors.push({
      field: 'amount',
      message: 'Low confidence in amount extraction. Please verify.',
      severity: 'warning',
    });
  }

  return errors;
}

function validateVendor(vendor: ExtractedVendor): ValidationError[] {
  const errors: ValidationError[] = [];

  if (vendor.name.length < 2) {
    errors.push({
      field: 'vendor',
      message: 'Vendor name is too short',
      severity: 'warning',
    });
  }

  if (vendor.name.length > 100) {
    errors.push({
      field: 'vendor',
      message: 'Vendor name is unusually long',
      severity: 'warning',
    });
  }

  if (vendor.confidence < MIN_CONFIDENCE_THRESHOLD) {
    errors.push({
      field: 'vendor',
      message: 'Low confidence in vendor extraction. Please verify.',
      severity: 'warning',
    });
  }

  return errors;
}

function validateDate(date: ExtractedDate): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!isValidDateString(date.value)) {
    errors.push({
      field: 'date',
      message: 'Invalid date format',
      severity: 'error',
    });
  } else if (!isReasonableReceiptDate(date.value)) {
    errors.push({
      field: 'date',
      message: 'Date seems unusual for a receipt. Please verify.',
      severity: 'warning',
    });
  }

  if (date.confidence < MIN_CONFIDENCE_THRESHOLD) {
    errors.push({
      field: 'date',
      message: 'Low confidence in date extraction. Please verify.',
      severity: 'warning',
    });
  }

  return errors;
}

// ============================================================================
// Helper Functions
// ============================================================================

export function shouldRequireManualReview(result: ReceiptExtractionResult): boolean {
  // Require manual review if:
  // 1. Any critical field is missing
  if (!result.amount || !result.vendor || !result.date) {
    return true;
  }

  // 2. Overall confidence is low
  if (result.overallConfidence < 0.7) {
    return true;
  }

  // 3. There are any errors (not just warnings)
  if (result.validationErrors.some((e) => e.severity === 'error')) {
    return true;
  }

  // 4. Any core field has low confidence
  if (
    result.amount.confidence < 0.7 ||
    result.vendor.confidence < 0.6 ||
    result.date.confidence < 0.7
  ) {
    return true;
  }

  return false;
}

export function calculateOverallConfidence(result: Partial<ReceiptExtractionResult>): number {
  const weights = {
    amount: 0.4,
    vendor: 0.3,
    date: 0.3,
  };

  let totalWeight = 0;
  let weightedSum = 0;

  if (result.amount) {
    weightedSum += result.amount.confidence * weights.amount;
    totalWeight += weights.amount;
  }

  if (result.vendor) {
    weightedSum += result.vendor.confidence * weights.vendor;
    totalWeight += weights.vendor;
  }

  if (result.date) {
    weightedSum += result.date.confidence * weights.date;
    totalWeight += weights.date;
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}
