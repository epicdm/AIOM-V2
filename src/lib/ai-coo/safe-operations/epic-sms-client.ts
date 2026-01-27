/**
 * Epic SMS Gateway Client
 *
 * This module provides SMS sending functionality using your custom Epic SMS Gateway.
 * The gateway is hosted at 818.epic.dm and uses HTTP Basic Authentication.
 *
 * API Endpoint: https://818.epic.dm/app/sms/api.php
 * Authentication: Basic Auth (username/password)
 * Content-Type: application/json
 */

import { privateEnv } from '~/config/privateEnv';

// ============================================================================
// TYPES
// ============================================================================

export interface EpicSMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
  timestamp: Date;
  details?: {
    to: string;
    httpCode?: number;
  };
}

interface EpicSMSPayload {
  message: string;
  phoneNumbers: string[];
}

interface EpicSMSResponse {
  success: boolean;
  message: string;
  results?: Array<{
    to: string;
    success: boolean;
    http_code: number;
  }>;
  error?: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Get Epic SMS Gateway configuration from environment
 */
function getEpicSMSConfig() {
  const apiUrl =
    (privateEnv as any).EPIC_SMS_API_URL ||
    process.env.EPIC_SMS_API_URL ||
    'https://818.epic.dm/app/sms/api.php';

  const username =
    (privateEnv as any).EPIC_SMS_USERNAME || process.env.EPIC_SMS_USERNAME;

  const password =
    (privateEnv as any).EPIC_SMS_PASSWORD || process.env.EPIC_SMS_PASSWORD;

  if (!username || !password) {
    throw new Error(
      'Epic SMS Gateway credentials not configured. Set EPIC_SMS_USERNAME and EPIC_SMS_PASSWORD in .env'
    );
  }

  return { apiUrl, username, password };
}

// ============================================================================
// SMS FUNCTIONS
// ============================================================================

/**
 * Send SMS via Epic SMS Gateway
 *
 * @param to - Recipient phone number (10-digit or E.164 format)
 * @param message - SMS message text
 * @returns EpicSMSResult with success status
 */
export async function sendSMSViaEpicGateway(
  to: string,
  message: string
): Promise<EpicSMSResult> {
  const startTime = Date.now();

  try {
    const config = getEpicSMSConfig();

    // Validate inputs
    if (!message || message.trim().length === 0) {
      throw new Error('SMS message is required');
    }

    // Format phone number - remove non-digits
    const phoneDigits = to.replace(/\D/g, '');

    // Epic gateway accepts 10-digit numbers (auto-adds 1 prefix) or full E.164
    let formattedPhone = phoneDigits;

    // If it's 11 digits starting with 1, keep as-is
    // If it's 10 digits, keep as-is (gateway will add 1)
    // If it starts with +, remove + sign
    if (to.startsWith('+')) {
      formattedPhone = phoneDigits;
    }

    console.log('[Epic SMS] Sending SMS:', {
      to: formattedPhone,
      messageLength: message.length,
    });

    // Prepare payload
    const payload: EpicSMSPayload = {
      message,
      phoneNumbers: [formattedPhone],
    };

    // Create Basic Auth header
    const authHeader = Buffer.from(`${config.username}:${config.password}`).toString(
      'base64'
    );

    // Send request to Epic SMS Gateway
    const response = await fetch(config.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${authHeader}`,
      },
      body: JSON.stringify(payload),
    });

    // Parse response
    const responseData: EpicSMSResponse = await response.json();

    // Check if request was successful
    if (!response.ok) {
      throw new Error(
        `Epic SMS Gateway HTTP error: ${response.status} ${response.statusText}`
      );
    }

    // Check API response
    if (!responseData.success) {
      const errorMessage = responseData.message || responseData.error || 'Unknown error';
      throw new Error(`SMS send failed: ${errorMessage}`);
    }

    // Check individual message result
    const result = responseData.results?.[0];
    if (result && !result.success) {
      throw new Error(`SMS to ${result.to} failed with HTTP code ${result.http_code}`);
    }

    const duration = Date.now() - startTime;
    console.log('[Epic SMS] SMS sent successfully:', {
      to: formattedPhone,
      httpCode: result?.http_code,
      durationMs: duration,
    });

    return {
      success: true,
      messageId: `epic_sms_${Date.now()}`, // Epic gateway doesn't return message ID
      timestamp: new Date(),
      details: {
        to: formattedPhone,
        httpCode: result?.http_code,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Epic SMS] SMS send failed:', errorMessage);

    return {
      success: false,
      error: errorMessage,
      timestamp: new Date(),
    };
  }
}

/**
 * Send SMS to multiple recipients via Epic SMS Gateway
 *
 * @param recipients - Array of phone numbers
 * @param message - SMS message text
 * @returns Array of EpicSMSResult for each recipient
 */
export async function sendBulkSMSViaEpicGateway(
  recipients: string[],
  message: string
): Promise<EpicSMSResult[]> {
  const startTime = Date.now();

  try {
    const config = getEpicSMSConfig();

    // Validate inputs
    if (!recipients || recipients.length === 0) {
      throw new Error('At least one recipient is required');
    }

    if (!message || message.trim().length === 0) {
      throw new Error('SMS message is required');
    }

    // Format phone numbers
    const formattedPhones = recipients.map((phone) => {
      const phoneDigits = phone.replace(/\D/g, '');
      return phone.startsWith('+') ? phoneDigits : phoneDigits;
    });

    console.log('[Epic SMS] Sending bulk SMS:', {
      recipients: formattedPhones.length,
      messageLength: message.length,
    });

    // Prepare payload
    const payload: EpicSMSPayload = {
      message,
      phoneNumbers: formattedPhones,
    };

    // Create Basic Auth header
    const authHeader = Buffer.from(`${config.username}:${config.password}`).toString(
      'base64'
    );

    // Send request to Epic SMS Gateway
    const response = await fetch(config.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${authHeader}`,
      },
      body: JSON.stringify(payload),
    });

    // Parse response
    const responseData: EpicSMSResponse = await response.json();

    // Check if request was successful
    if (!response.ok) {
      throw new Error(
        `Epic SMS Gateway HTTP error: ${response.status} ${response.statusText}`
      );
    }

    // Process results for each recipient
    const results: EpicSMSResult[] = [];

    if (responseData.results && responseData.results.length > 0) {
      for (const result of responseData.results) {
        results.push({
          success: result.success,
          messageId: `epic_sms_${Date.now()}_${result.to}`,
          timestamp: new Date(),
          details: {
            to: result.to,
            httpCode: result.http_code,
          },
          ...(result.success ? {} : { error: `HTTP ${result.http_code}` }),
        });
      }
    }

    const duration = Date.now() - startTime;
    const successCount = results.filter((r) => r.success).length;

    console.log('[Epic SMS] Bulk SMS completed:', {
      total: results.length,
      succeeded: successCount,
      failed: results.length - successCount,
      durationMs: duration,
    });

    return results;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Epic SMS] Bulk SMS send failed:', errorMessage);

    // Return error result for all recipients
    return recipients.map((recipient) => ({
      success: false,
      error: errorMessage,
      timestamp: new Date(),
      details: { to: recipient },
    }));
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validate phone number format
 * Epic gateway accepts 10-digit or 11-digit (with leading 1) numbers
 */
export function isValidPhoneNumberForEpic(phone: string): boolean {
  const phoneDigits = phone.replace(/\D/g, '');

  // Must be either 10 digits or 11 digits starting with 1
  if (phoneDigits.length === 10) {
    return true;
  }

  if (phoneDigits.length === 11 && phoneDigits.startsWith('1')) {
    return true;
  }

  return false;
}

/**
 * Format phone number for Epic gateway
 * Removes all non-digit characters and validates format
 */
export function formatPhoneNumberForEpic(phone: string): string {
  const phoneDigits = phone.replace(/\D/g, '');

  // If 10 digits, return as-is (gateway will add 1 prefix)
  if (phoneDigits.length === 10) {
    return phoneDigits;
  }

  // If 11 digits starting with 1, return as-is
  if (phoneDigits.length === 11 && phoneDigits.startsWith('1')) {
    return phoneDigits;
  }

  // If invalid, throw error
  throw new Error(
    `Invalid phone number: ${phone}. Must be 10 digits or 11 digits starting with 1`
  );
}

/**
 * Test Epic SMS Gateway connection
 */
export async function testEpicSMSConnection(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const config = getEpicSMSConfig();

    console.log('[Epic SMS] Configuration loaded:', {
      apiUrl: config.apiUrl,
      username: config.username,
      hasPassword: !!config.password,
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
