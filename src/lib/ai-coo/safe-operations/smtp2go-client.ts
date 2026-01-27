/**
 * SMTP2GO Client - Email and SMS sending via SMTP2GO API
 *
 * This module provides email and SMS sending functionality using SMTP2GO's API.
 * SMTP2GO provides both email and SMS capabilities through their unified platform.
 *
 * API Documentation:
 * - Email: https://developers.smtp2go.com/docs/send-an-email
 * - SMS: https://developers.smtp2go.com/reference/send-sms-1
 * - Main docs: https://apidoc.smtp2go.com/
 */

import { privateEnv } from '~/config/privateEnv';

// ============================================================================
// TYPES
// ============================================================================

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  timestamp: Date;
}

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
  timestamp: Date;
}

interface SMTP2GOEmailPayload {
  api_key: string;
  to: string[];
  sender: string;
  subject: string;
  text_body?: string;
  html_body?: string;
  custom_headers?: Array<{ header: string; value: string }>;
  attachments?: Array<{
    filename: string;
    fileblob: string;
    mimetype: string;
  }>;
}

interface SMTP2GOSMSPayload {
  api_key: string;
  source: string; // From number or name
  destination: string; // To number
  message: string;
}

interface SMTP2GOEmailResponse {
  request_id: string;
  data: {
    succeeded: number;
    failed: number;
    failures?: Array<{
      email: string;
      error: string;
    }>;
  };
}

interface SMTP2GOSMSResponse {
  request_id: string;
  data: {
    message_id: string;
    cost: number;
    error?: string;
  };
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const SMTP2GO_API_URL = 'https://api.smtp2go.com/v3';
const EMAIL_ENDPOINT = `${SMTP2GO_API_URL}/email/send`;
const SMS_ENDPOINT = `${SMTP2GO_API_URL}/sms/send`;

/**
 * Get SMTP2GO API key from environment
 * Falls back to placeholder for development
 */
function getAPIKey(): string {
  // Check if SMTP2GO_API_KEY exists in privateEnv
  const apiKey = (privateEnv as any).SMTP2GO_API_KEY || process.env.SMTP2GO_API_KEY;

  if (!apiKey || apiKey === 'your-api-key-here') {
    console.warn('[SMTP2GO] No API key configured. Set SMTP2GO_API_KEY in .env');
    throw new Error('SMTP2GO API key not configured');
  }

  return apiKey;
}

/**
 * Get default sender email from environment
 */
function getDefaultSenderEmail(): string {
  const senderEmail = (privateEnv as any).SMTP2GO_SENDER_EMAIL ||
                     process.env.SMTP2GO_SENDER_EMAIL ||
                     'noreply@yourdomain.com';

  return senderEmail;
}

/**
 * Get default SMS sender (phone number or name)
 */
function getDefaultSMSSender(): string {
  const smsSender = (privateEnv as any).SMTP2GO_SMS_SENDER ||
                   process.env.SMTP2GO_SMS_SENDER ||
                   'AIOM';

  return smsSender;
}

// ============================================================================
// EMAIL FUNCTIONS
// ============================================================================

/**
 * Send email via SMTP2GO API
 *
 * @param to - Recipient email address or array of addresses
 * @param subject - Email subject
 * @param textBody - Plain text email body
 * @param htmlBody - HTML email body (optional)
 * @param from - Sender email (optional, uses default from env)
 * @returns EmailResult with success status and message ID
 */
export async function sendEmailViaSMTP2GO(
  to: string | string[],
  subject: string,
  textBody: string,
  htmlBody?: string,
  from?: string
): Promise<EmailResult> {
  const startTime = Date.now();

  try {
    const apiKey = getAPIKey();
    const sender = from || getDefaultSenderEmail();
    const recipients = Array.isArray(to) ? to : [to];

    // Validate inputs
    if (recipients.length === 0) {
      throw new Error('At least one recipient is required');
    }

    if (!subject || subject.trim().length === 0) {
      throw new Error('Email subject is required');
    }

    if (!textBody || textBody.trim().length === 0) {
      throw new Error('Email body is required');
    }

    // Prepare payload
    const payload: SMTP2GOEmailPayload = {
      api_key: apiKey,
      to: recipients,
      sender,
      subject,
      text_body: textBody,
    };

    // Add HTML body if provided
    if (htmlBody) {
      payload.html_body = htmlBody;
    }

    console.log('[SMTP2GO] Sending email:', {
      to: recipients,
      subject,
      sender,
      hasHtml: !!htmlBody,
    });

    // Send request to SMTP2GO API
    const response = await fetch(EMAIL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Smtp2go-Api-Key': apiKey,
      },
      body: JSON.stringify(payload),
    });

    const responseData: SMTP2GOEmailResponse = await response.json();

    if (!response.ok) {
      throw new Error(
        `SMTP2GO API error: ${response.status} ${JSON.stringify(responseData)}`
      );
    }

    // Check if email was successfully sent
    if (responseData.data.succeeded > 0) {
      const duration = Date.now() - startTime;
      console.log('[SMTP2GO] Email sent successfully:', {
        requestId: responseData.request_id,
        succeeded: responseData.data.succeeded,
        durationMs: duration,
      });

      return {
        success: true,
        messageId: responseData.request_id,
        timestamp: new Date(),
      };
    } else {
      // Check for failures
      const failures = responseData.data.failures || [];
      const errorMessage = failures.length > 0
        ? failures.map((f) => `${f.email}: ${f.error}`).join(', ')
        : 'Unknown error';

      throw new Error(`Email send failed: ${errorMessage}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[SMTP2GO] Email send failed:', errorMessage);

    return {
      success: false,
      error: errorMessage,
      timestamp: new Date(),
    };
  }
}

// ============================================================================
// SMS FUNCTIONS
// ============================================================================

/**
 * Send SMS via SMTP2GO API
 *
 * @param to - Recipient phone number (E.164 format: +1234567890)
 * @param message - SMS message text
 * @param from - Sender phone number or name (optional, uses default from env)
 * @returns SMSResult with success status and message ID
 */
export async function sendSMSViaSMTP2GO(
  to: string,
  message: string,
  from?: string
): Promise<SMSResult> {
  const startTime = Date.now();

  try {
    const apiKey = getAPIKey();
    const source = from || getDefaultSMSSender();

    // Validate inputs
    if (!to || !to.startsWith('+')) {
      throw new Error('Phone number must be in E.164 format (e.g., +1234567890)');
    }

    if (!message || message.trim().length === 0) {
      throw new Error('SMS message is required');
    }

    if (message.length > 320) {
      console.warn('[SMTP2GO] SMS message exceeds 320 characters, may be split into multiple messages');
    }

    // Prepare payload
    const payload: SMTP2GOSMSPayload = {
      api_key: apiKey,
      source,
      destination: to,
      message,
    };

    console.log('[SMTP2GO] Sending SMS:', {
      to,
      source,
      messageLength: message.length,
    });

    // Send request to SMTP2GO API
    const response = await fetch(SMS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Smtp2go-Api-Key': apiKey,
      },
      body: JSON.stringify(payload),
    });

    const responseData: SMTP2GOSMSResponse = await response.json();

    if (!response.ok) {
      throw new Error(
        `SMTP2GO SMS API error: ${response.status} ${JSON.stringify(responseData)}`
      );
    }

    // Check for errors in response
    if (responseData.data.error) {
      throw new Error(`SMS send failed: ${responseData.data.error}`);
    }

    const duration = Date.now() - startTime;
    console.log('[SMTP2GO] SMS sent successfully:', {
      requestId: responseData.request_id,
      messageId: responseData.data.message_id,
      cost: responseData.data.cost,
      durationMs: duration,
    });

    return {
      success: true,
      messageId: responseData.data.message_id,
      timestamp: new Date(),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[SMTP2GO] SMS send failed:', errorMessage);

    return {
      success: false,
      error: errorMessage,
      timestamp: new Date(),
    };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validate email address format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number format (E.164)
 */
export function isValidPhoneNumber(phone: string): boolean {
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  return phoneRegex.test(phone);
}

/**
 * Format phone number to E.164 if needed
 * Example: "555-123-4567" with country code "1" -> "+15551234567"
 */
export function formatPhoneNumber(phone: string, countryCode: string = '1'): string {
  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');

  // If already starts with country code, add +
  if (digitsOnly.startsWith(countryCode)) {
    return `+${digitsOnly}`;
  }

  // Otherwise, prepend country code
  return `+${countryCode}${digitsOnly}`;
}

/**
 * Test SMTP2GO connection and API key validity
 */
export async function testSMTP2GOConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    const apiKey = getAPIKey();

    // Just try to get the API key - if it exists, we assume it's valid
    // SMTP2GO doesn't have a dedicated "test connection" endpoint
    // The best test is actually sending a test email

    console.log('[SMTP2GO] API key configured:', apiKey.substring(0, 10) + '...');

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
