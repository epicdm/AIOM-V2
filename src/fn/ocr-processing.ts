/**
 * OCR Processing Server Functions
 * Server-side functions for receipt OCR processing
 */

import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { authenticatedMiddleware } from './middleware';
import {
  processReceiptImage,
  type ReceiptExtractionResult,
  type OcrProcessingOptions,
  type CorrectedReceiptData,
} from '~/lib/ocr-service';
import { getStorage } from '~/utils/storage';

// ============================================================================
// Validation Schemas
// ============================================================================

const processReceiptSchema = z.object({
  imageBase64: z.string().min(100, 'Image data is required'),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/gif', 'image/webp']),
  options: z
    .object({
      provider: z.enum(['claude', 'tesseract', 'textract']).optional(),
      extractLineItems: z.boolean().optional(),
      confidenceThreshold: z.number().min(0).max(1).optional(),
    })
    .optional(),
});

const processReceiptFromUrlSchema = z.object({
  fileKey: z.string().min(1, 'File key is required'),
  options: z
    .object({
      provider: z.enum(['claude', 'tesseract', 'textract']).optional(),
      extractLineItems: z.boolean().optional(),
      confidenceThreshold: z.number().min(0).max(1).optional(),
    })
    .optional(),
});

const submitCorrectionSchema = z.object({
  extractionId: z.string().min(1, 'Extraction ID is required'),
  originalData: z.any(), // ReceiptExtractionResult
  correctedData: z.object({
    amount: z.number().nullable(),
    currency: z.string().min(1).max(3),
    vendor: z.string().min(1).max(200),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
    category: z.string().optional(),
    notes: z.string().optional(),
  }),
});

// ============================================================================
// Server Functions
// ============================================================================

/**
 * Process a receipt image from base64 data
 */
export const processReceiptImageFn = createServerFn({ method: 'POST' })
  .middleware([authenticatedMiddleware])
  .inputValidator(processReceiptSchema)
  .handler(async ({ data, context }) => {
    const { imageBase64, mimeType, options } = data;
    const userId = context.userId;

    console.log(`[OCR] Processing receipt for user ${userId}`);
    const startTime = Date.now();

    try {
      const result = await processReceiptImage(
        imageBase64,
        mimeType,
        options as OcrProcessingOptions
      );

      const processingTime = Date.now() - startTime;
      console.log(`[OCR] Processing completed in ${processingTime}ms`);

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Processing failed',
          extractionId: null,
          data: null,
        };
      }

      // Generate an extraction ID for tracking
      const extractionId = crypto.randomUUID();

      return {
        success: true,
        extractionId,
        data: result.data,
        processingTimeMs: processingTime,
      };
    } catch (error) {
      console.error('[OCR] Processing error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        extractionId: null,
        data: null,
      };
    }
  });

/**
 * Process a receipt image from R2 storage URL
 */
export const processReceiptFromStorageFn = createServerFn({ method: 'POST' })
  .middleware([authenticatedMiddleware])
  .inputValidator(processReceiptFromUrlSchema)
  .handler(async ({ data, context }) => {
    const { fileKey, options } = data;
    const userId = context.userId;

    console.log(`[OCR] Processing receipt from storage for user ${userId}, key: ${fileKey}`);

    try {
      // Get presigned URL for the file
      const { storage } = getStorage();
      const presignedUrl = await storage.getPresignedUrl(fileKey);

      // Fetch the image
      const response = await fetch(presignedUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }

      // Get the image data
      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');

      // Determine MIME type from file key or response
      let mimeType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/jpeg';
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('png')) mimeType = 'image/png';
      else if (contentType?.includes('gif')) mimeType = 'image/gif';
      else if (contentType?.includes('webp')) mimeType = 'image/webp';

      // Process the receipt
      const result = await processReceiptImage(base64, mimeType, options as OcrProcessingOptions);

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Processing failed',
          extractionId: null,
          data: null,
        };
      }

      const extractionId = crypto.randomUUID();

      return {
        success: true,
        extractionId,
        data: result.data,
      };
    } catch (error) {
      console.error('[OCR] Storage processing error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        extractionId: null,
        data: null,
      };
    }
  });

/**
 * Submit a manual correction to extraction results
 */
export const submitReceiptCorrectionFn = createServerFn({ method: 'POST' })
  .middleware([authenticatedMiddleware])
  .inputValidator(submitCorrectionSchema)
  .handler(async ({ data, context }) => {
    const { extractionId, originalData, correctedData } = data;
    const userId = context.userId;

    console.log(`[OCR] Submitting correction for extraction ${extractionId} by user ${userId}`);

    try {
      // Track which fields were corrected
      const correctedFields: string[] = [];
      const original = originalData as ReceiptExtractionResult;

      if (original.amount?.value !== correctedData.amount) {
        correctedFields.push('amount');
      }
      if (original.amount?.currency !== correctedData.currency) {
        correctedFields.push('currency');
      }
      if (original.vendor?.name !== correctedData.vendor) {
        correctedFields.push('vendor');
      }
      if (original.date?.value !== correctedData.date) {
        correctedFields.push('date');
      }

      // Build the final corrected result
      const correctedResult: CorrectedReceiptData = {
        amount: correctedData.amount,
        currency: correctedData.currency,
        vendor: correctedData.vendor,
        date: correctedData.date,
        category: correctedData.category,
        notes: correctedData.notes,
      };

      // In a real implementation, you might save this to the database
      // For now, we just return the corrected data

      return {
        success: true,
        extractionId,
        correctedData: correctedResult,
        correctedFields,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('[OCR] Correction submission error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

/**
 * Get supported OCR providers
 */
export const getOcrProvidersFn = createServerFn({ method: 'GET' }).handler(async () => {
  return {
    providers: [
      {
        id: 'claude',
        name: 'Claude Vision',
        description: 'Anthropic Claude AI with vision capabilities',
        available: true,
        recommended: true,
      },
      {
        id: 'tesseract',
        name: 'Tesseract',
        description: 'Open-source OCR engine (coming soon)',
        available: false,
        recommended: false,
      },
      {
        id: 'textract',
        name: 'AWS Textract',
        description: 'Amazon Web Services document analysis (coming soon)',
        available: false,
        recommended: false,
      },
    ],
  };
});
