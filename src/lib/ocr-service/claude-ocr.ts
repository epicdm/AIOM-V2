/**
 * Claude OCR Service
 * Uses Claude's vision capabilities to extract data from receipt images
 */

import { getClaudeClient } from '~/lib/claude/client';
import type { Message, ImageContent } from '~/lib/claude/types';
import type {
  ReceiptExtractionResult,
  ExtractedAmount,
  ExtractedVendor,
  ExtractedDate,
  ExtractedLineItem,
  OcrProcessingOptions,
} from './types';
import {
  validateExtractionResult,
  shouldRequireManualReview,
  calculateOverallConfidence,
} from './validation';

// ============================================================================
// System Prompt for Receipt Extraction
// ============================================================================

const RECEIPT_EXTRACTION_PROMPT = `You are an expert receipt and invoice data extraction system. Analyze the provided receipt image and extract the following information with high accuracy.

EXTRACTION RULES:
1. Extract the TOTAL amount (the final amount paid, not subtotal)
2. Identify the currency from symbols ($ = USD, € = EUR, £ = GBP, ₦ = NGN, etc.) or text
3. Extract the merchant/vendor name (usually at the top of the receipt)
4. Extract the transaction date in YYYY-MM-DD format
5. If multiple dates are present, choose the transaction date (not print date)
6. Extract line items if clearly visible
7. Assign confidence scores (0.0 to 1.0) based on clarity and certainty

RESPONSE FORMAT:
Respond with a valid JSON object only, no additional text. Use this exact structure:
{
  "amount": {
    "value": <number>,
    "currency": "<3-letter code>",
    "confidence": <0.0-1.0>,
    "rawText": "<original text>"
  },
  "vendor": {
    "name": "<merchant name>",
    "confidence": <0.0-1.0>,
    "address": "<address if visible>",
    "phone": "<phone if visible>"
  },
  "date": {
    "value": "<YYYY-MM-DD>",
    "confidence": <0.0-1.0>,
    "rawText": "<original date text>",
    "time": "<HH:MM if visible>"
  },
  "lineItems": [
    {
      "description": "<item name>",
      "quantity": <number or null>,
      "unitPrice": <number or null>,
      "totalPrice": <number or null>,
      "confidence": <0.0-1.0>
    }
  ],
  "tax": {
    "value": <number or null>,
    "currency": "<3-letter code>",
    "confidence": <0.0-1.0>,
    "rawText": "<original text>"
  },
  "subtotal": {
    "value": <number or null>,
    "currency": "<3-letter code>",
    "confidence": <0.0-1.0>,
    "rawText": "<original text>"
  },
  "rawText": "<all visible text on receipt>"
}

If a field cannot be extracted, use null for that field.
Ensure all monetary values are numbers without currency symbols.`;

// ============================================================================
// Claude OCR Processor
// ============================================================================

export async function extractReceiptDataWithClaude(
  imageBase64: string,
  mimeType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
  options: OcrProcessingOptions = {}
): Promise<ReceiptExtractionResult> {
  const startTime = Date.now();
  const client = getClaudeClient();

  // Build the message with image content
  const imageContent: ImageContent = {
    type: 'image',
    source: {
      type: 'base64',
      media_type: mimeType,
      data: imageBase64,
    },
  };

  const messages: Message[] = [
    {
      role: 'user',
      content: [
        imageContent,
        {
          type: 'text',
          text: options.extractLineItems
            ? 'Extract all data from this receipt, including line items.'
            : 'Extract the total amount, vendor name, and date from this receipt.',
        },
      ],
    },
  ];

  try {
    const response = await client.createMessage({
      messages,
      system: RECEIPT_EXTRACTION_PROMPT,
      model: 'claude-3-5-haiku-20241022', // Fast and cost-effective for OCR
      maxTokens: 2048,
      temperature: 0, // Deterministic output for extraction
    });

    const responseText = client.extractTextFromResponse(response);
    const extractedData = parseClaudeResponse(responseText);
    const processingTimeMs = Date.now() - startTime;

    // Build the result
    const result: ReceiptExtractionResult = {
      amount: extractedData.amount || null,
      vendor: extractedData.vendor || null,
      date: extractedData.date || null,
      lineItems: extractedData.lineItems,
      tax: extractedData.tax || null,
      subtotal: extractedData.subtotal || null,
      rawText: extractedData.rawText || '',
      ocrProvider: 'claude',
      processingTimeMs,
      timestamp: new Date().toISOString(),
      overallConfidence: 0,
      requiresManualReview: false,
      validationErrors: [],
    };

    // Calculate confidence and validate
    result.overallConfidence = calculateOverallConfidence(result);
    result.validationErrors = validateExtractionResult(result);
    result.requiresManualReview = shouldRequireManualReview(result);

    return result;
  } catch (error) {
    const processingTimeMs = Date.now() - startTime;

    return {
      amount: null,
      vendor: null,
      date: null,
      rawText: '',
      ocrProvider: 'claude',
      processingTimeMs,
      timestamp: new Date().toISOString(),
      overallConfidence: 0,
      requiresManualReview: true,
      validationErrors: [
        {
          field: 'processing',
          message: error instanceof Error ? error.message : 'OCR processing failed',
          severity: 'error',
        },
      ],
    };
  }
}

// ============================================================================
// Response Parsing
// ============================================================================

interface ClaudeOcrResponse {
  amount?: ExtractedAmount;
  vendor?: ExtractedVendor;
  date?: ExtractedDate;
  lineItems?: ExtractedLineItem[];
  tax?: ExtractedAmount;
  subtotal?: ExtractedAmount;
  rawText?: string;
}

function parseClaudeResponse(responseText: string): ClaudeOcrResponse {
  try {
    // Try to extract JSON from the response
    // Claude might include markdown code blocks
    let jsonStr = responseText;

    // Remove markdown code blocks if present
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    // Parse the JSON
    const parsed = JSON.parse(jsonStr);

    // Validate and normalize the response
    return normalizeResponse(parsed);
  } catch {
    // If JSON parsing fails, try to extract data using regex patterns
    return extractDataFromText(responseText);
  }
}

function normalizeResponse(parsed: Record<string, unknown>): ClaudeOcrResponse {
  const result: ClaudeOcrResponse = {};

  // Normalize amount
  if (parsed.amount && typeof parsed.amount === 'object') {
    const amt = parsed.amount as Record<string, unknown>;
    if (typeof amt.value === 'number') {
      result.amount = {
        value: amt.value,
        currency: String(amt.currency || 'USD'),
        confidence: Number(amt.confidence) || 0.5,
        rawText: String(amt.rawText || amt.value),
      };
    }
  }

  // Normalize vendor
  if (parsed.vendor && typeof parsed.vendor === 'object') {
    const vendor = parsed.vendor as Record<string, unknown>;
    if (typeof vendor.name === 'string') {
      result.vendor = {
        name: vendor.name,
        confidence: Number(vendor.confidence) || 0.5,
        address: vendor.address ? String(vendor.address) : undefined,
        phone: vendor.phone ? String(vendor.phone) : undefined,
      };
    }
  }

  // Normalize date
  if (parsed.date && typeof parsed.date === 'object') {
    const date = parsed.date as Record<string, unknown>;
    if (typeof date.value === 'string') {
      result.date = {
        value: normalizeDate(date.value),
        confidence: Number(date.confidence) || 0.5,
        rawText: String(date.rawText || date.value),
        time: date.time ? String(date.time) : undefined,
      };
    }
  }

  // Normalize line items
  if (Array.isArray(parsed.lineItems)) {
    result.lineItems = parsed.lineItems
      .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
      .map((item) => ({
        description: String(item.description || ''),
        quantity: typeof item.quantity === 'number' ? item.quantity : undefined,
        unitPrice: typeof item.unitPrice === 'number' ? item.unitPrice : undefined,
        totalPrice: typeof item.totalPrice === 'number' ? item.totalPrice : undefined,
        confidence: Number(item.confidence) || 0.5,
      }));
  }

  // Normalize tax
  if (parsed.tax && typeof parsed.tax === 'object') {
    const tax = parsed.tax as Record<string, unknown>;
    if (typeof tax.value === 'number') {
      result.tax = {
        value: tax.value,
        currency: String(tax.currency || result.amount?.currency || 'USD'),
        confidence: Number(tax.confidence) || 0.5,
        rawText: String(tax.rawText || tax.value),
      };
    }
  }

  // Normalize subtotal
  if (parsed.subtotal && typeof parsed.subtotal === 'object') {
    const subtotal = parsed.subtotal as Record<string, unknown>;
    if (typeof subtotal.value === 'number') {
      result.subtotal = {
        value: subtotal.value,
        currency: String(subtotal.currency || result.amount?.currency || 'USD'),
        confidence: Number(subtotal.confidence) || 0.5,
        rawText: String(subtotal.rawText || subtotal.value),
      };
    }
  }

  // Raw text
  if (typeof parsed.rawText === 'string') {
    result.rawText = parsed.rawText;
  }

  return result;
}

function normalizeDate(dateStr: string): string {
  // Try to parse various date formats and convert to YYYY-MM-DD
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }

  // Try common formats
  const patterns = [
    // MM/DD/YYYY
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
    // DD/MM/YYYY
    /(\d{1,2})-(\d{1,2})-(\d{4})/,
    // YYYY-MM-DD (already correct)
    /(\d{4})-(\d{2})-(\d{2})/,
  ];

  for (const pattern of patterns) {
    const match = dateStr.match(pattern);
    if (match) {
      // Assume YYYY-MM-DD if it matches that pattern
      if (match[1].length === 4) {
        return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
      }
      // Assume MM/DD/YYYY for US format
      const year = match[3];
      const month = match[1].padStart(2, '0');
      const day = match[2].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }

  return dateStr;
}

function extractDataFromText(text: string): ClaudeOcrResponse {
  const result: ClaudeOcrResponse = {
    rawText: text,
  };

  // Try to extract amount using regex
  const amountMatch = text.match(/(?:total|amount|due|paid)[:\s]*[$€£₦]?\s*(\d+[.,]\d{2})/i);
  if (amountMatch) {
    const value = parseFloat(amountMatch[1].replace(',', '.'));
    result.amount = {
      value,
      currency: text.includes('€') ? 'EUR' : text.includes('£') ? 'GBP' : text.includes('₦') ? 'NGN' : 'USD',
      confidence: 0.3, // Low confidence for regex extraction
      rawText: amountMatch[0],
    };
  }

  // Try to extract date
  const dateMatch = text.match(/(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/);
  if (dateMatch) {
    result.date = {
      value: normalizeDate(dateMatch[1]),
      confidence: 0.3,
      rawText: dateMatch[1],
    };
  }

  return result;
}
