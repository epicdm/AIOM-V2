/**
 * OCR Service
 * Main entry point for OCR receipt processing
 */

export * from './types';
export * from './validation';
export { extractReceiptDataWithClaude } from './claude-ocr';

import { extractReceiptDataWithClaude } from './claude-ocr';
import type {
  ReceiptExtractionResult,
  OcrProcessingOptions,
  OcrServiceResult,
} from './types';

/**
 * Process a receipt image and extract data
 *
 * @param imageBase64 - Base64 encoded image data (without data URL prefix)
 * @param mimeType - MIME type of the image
 * @param options - Processing options
 * @returns Extraction result with structured data
 */
export async function processReceiptImage(
  imageBase64: string,
  mimeType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
  options: OcrProcessingOptions = {}
): Promise<OcrServiceResult> {
  try {
    const provider = options.provider || 'claude';

    let result: ReceiptExtractionResult;

    switch (provider) {
      case 'claude':
        result = await extractReceiptDataWithClaude(imageBase64, mimeType, options);
        break;

      case 'tesseract':
        // Tesseract would require additional npm package and setup
        // For now, fall back to Claude
        result = await extractReceiptDataWithClaude(imageBase64, mimeType, options);
        break;

      case 'textract':
        // AWS Textract would require AWS SDK setup
        // For now, fall back to Claude
        result = await extractReceiptDataWithClaude(imageBase64, mimeType, options);
        break;

      default:
        result = await extractReceiptDataWithClaude(imageBase64, mimeType, options);
    }

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Helper function to convert File/Blob to base64
 */
export async function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Helper function to get MIME type from File
 */
export function getMimeType(file: File): 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' {
  const type = file.type.toLowerCase();
  if (type === 'image/jpeg' || type === 'image/jpg') return 'image/jpeg';
  if (type === 'image/png') return 'image/png';
  if (type === 'image/gif') return 'image/gif';
  if (type === 'image/webp') return 'image/webp';
  // Default to JPEG for unknown types
  return 'image/jpeg';
}
