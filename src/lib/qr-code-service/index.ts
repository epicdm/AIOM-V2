/**
 * QR Code Service
 *
 * Service for generating QR codes for payment requests.
 * Supports PNG, SVG formats and various customization options.
 */

import QRCode from "qrcode";

// =============================================================================
// Types
// =============================================================================

export interface QrCodeGenerationOptions {
  /** QR code content (the data to encode) */
  content: string;
  /** Output format: 'png' | 'svg' */
  format?: "png" | "svg";
  /** Width in pixels (for PNG) or viewBox (for SVG). Default: 300 */
  width?: number;
  /** Margin around the QR code in modules. Default: 4 */
  margin?: number;
  /** Error correction level: 'L' | 'M' | 'Q' | 'H'. Default: 'M' */
  errorCorrectionLevel?: "L" | "M" | "Q" | "H";
  /** Dark color (foreground). Default: '#000000' */
  darkColor?: string;
  /** Light color (background). Default: '#ffffff' */
  lightColor?: string;
}

export interface QrCodeResult {
  /** The generated QR code as a data URL (for PNG) or SVG string */
  data: string;
  /** Format of the generated QR code */
  format: "png" | "svg";
  /** The content that was encoded */
  content: string;
}

export interface PaymentQrCodeData {
  /** QR payment request ID */
  paymentId: string;
  /** Unique QR code identifier */
  qrCode: string;
  /** Short code for manual entry */
  shortCode: string;
  /** Amount in the smallest currency unit */
  amount: string;
  /** Currency code (ISO 4217) */
  currency: string;
  /** Merchant name */
  merchantName: string;
  /** Optional description */
  description?: string;
  /** Base URL for payment */
  baseUrl?: string;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_OPTIONS: Required<Omit<QrCodeGenerationOptions, "content">> = {
  format: "png",
  width: 300,
  margin: 4,
  errorCorrectionLevel: "M",
  darkColor: "#000000",
  lightColor: "#ffffff",
};

// =============================================================================
// QR Code Generation Functions
// =============================================================================

/**
 * Generate a QR code from the given content
 *
 * @param options - QR code generation options
 * @returns Promise<QrCodeResult> - The generated QR code
 */
export async function generateQrCode(options: QrCodeGenerationOptions): Promise<QrCodeResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const qrOptions: QRCode.QRCodeToDataURLOptions | QRCode.QRCodeToStringOptions = {
    width: opts.width,
    margin: opts.margin,
    errorCorrectionLevel: opts.errorCorrectionLevel,
    color: {
      dark: opts.darkColor,
      light: opts.lightColor,
    },
  };

  let data: string;

  if (opts.format === "svg") {
    data = await QRCode.toString(opts.content, {
      ...qrOptions,
      type: "svg",
    });
  } else {
    data = await QRCode.toDataURL(opts.content, {
      ...qrOptions,
      type: "image/png",
    });
  }

  return {
    data,
    format: opts.format,
    content: opts.content,
  };
}

/**
 * Generate a QR code for a payment request
 *
 * The QR code contains a URL that can be scanned to initiate payment.
 *
 * @param paymentData - Payment data to encode
 * @param options - Optional generation options
 * @returns Promise<QrCodeResult> - The generated payment QR code
 */
export async function generatePaymentQrCode(
  paymentData: PaymentQrCodeData,
  options?: Partial<Omit<QrCodeGenerationOptions, "content">>
): Promise<QrCodeResult> {
  // Build the payment URL
  const baseUrl = paymentData.baseUrl || (typeof window !== "undefined" ? window.location.origin : "");
  const paymentUrl = `${baseUrl}/pay/${paymentData.qrCode}`;

  return generateQrCode({
    content: paymentUrl,
    format: options?.format || "png",
    width: options?.width || 300,
    margin: options?.margin || 4,
    errorCorrectionLevel: options?.errorCorrectionLevel || "M",
    darkColor: options?.darkColor || "#000000",
    lightColor: options?.lightColor || "#ffffff",
  });
}

/**
 * Generate a QR code containing payment data as JSON
 *
 * This is useful for apps that can parse the payment data directly.
 *
 * @param paymentData - Payment data to encode
 * @param options - Optional generation options
 * @returns Promise<QrCodeResult> - The generated payment QR code
 */
export async function generatePaymentDataQrCode(
  paymentData: PaymentQrCodeData,
  options?: Partial<Omit<QrCodeGenerationOptions, "content">>
): Promise<QrCodeResult> {
  // Create a compact payment payload
  const payload = {
    v: 1, // version
    id: paymentData.paymentId,
    qr: paymentData.qrCode,
    sc: paymentData.shortCode,
    amt: paymentData.amount,
    cur: paymentData.currency,
    mn: paymentData.merchantName,
    ...(paymentData.description && { desc: paymentData.description }),
  };

  return generateQrCode({
    content: JSON.stringify(payload),
    format: options?.format || "png",
    width: options?.width || 300,
    margin: options?.margin || 4,
    errorCorrectionLevel: options?.errorCorrectionLevel || "M",
    darkColor: options?.darkColor || "#000000",
    lightColor: options?.lightColor || "#ffffff",
  });
}

/**
 * Generate a QR code as a PNG buffer (for server-side use)
 *
 * @param content - The content to encode
 * @param options - Optional generation options
 * @returns Promise<Buffer> - The generated QR code as a PNG buffer
 */
export async function generateQrCodeBuffer(
  content: string,
  options?: Partial<Omit<QrCodeGenerationOptions, "content" | "format">>
): Promise<Buffer> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const qrOptions: QRCode.QRCodeToBufferOptions = {
    width: opts.width,
    margin: opts.margin,
    errorCorrectionLevel: opts.errorCorrectionLevel,
    color: {
      dark: opts.darkColor,
      light: opts.lightColor,
    },
    type: "png",
  };

  return QRCode.toBuffer(content, qrOptions);
}

/**
 * Validate that a string is a valid QR code content
 * (Basic validation - checks if content is not empty and within reasonable size)
 *
 * @param content - The content to validate
 * @returns boolean - True if valid
 */
export function isValidQrContent(content: string): boolean {
  if (!content || typeof content !== "string") {
    return false;
  }

  // QR codes can technically hold up to 4296 alphanumeric characters
  // but we limit to a reasonable size for payment QR codes
  if (content.length > 2000) {
    return false;
  }

  return true;
}

/**
 * Parse a payment QR code URL to extract the QR code identifier
 *
 * @param url - The URL from a scanned QR code
 * @returns string | null - The QR code identifier, or null if invalid
 */
export function parsePaymentQrUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/").filter(Boolean);

    // Expected format: /pay/{qrCode}
    if (pathParts.length >= 2 && pathParts[0] === "pay") {
      return pathParts[1];
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Parse a payment data QR code (JSON format)
 *
 * @param data - The data from a scanned QR code
 * @returns PaymentQrCodeData | null - The parsed payment data, or null if invalid
 */
export function parsePaymentDataQr(data: string): Partial<PaymentQrCodeData> | null {
  try {
    const payload = JSON.parse(data);

    // Check for version and required fields
    if (!payload.v || !payload.qr || !payload.sc) {
      return null;
    }

    return {
      paymentId: payload.id,
      qrCode: payload.qr,
      shortCode: payload.sc,
      amount: payload.amt,
      currency: payload.cur,
      merchantName: payload.mn,
      description: payload.desc,
    };
  } catch {
    return null;
  }
}

// =============================================================================
// Export types
// =============================================================================

export type { QRCode };
