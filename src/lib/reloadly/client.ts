/**
 * Reloadly API Client
 *
 * Core client library for connecting to Reloadly's Airtime & Data Top-up API.
 * Handles authentication, token management, and provides typed interfaces
 * for common operations.
 */

import type {
  ReloadlyConfig,
  ReloadlyAuthToken,
  ReloadlyOperator,
  ReloadlyOperatorDetection,
  ReloadlyTopupRequest,
  ReloadlyTopupResponse,
  ReloadlyTransaction,
  ReloadlyAccountBalance,
  ReloadlyCountry,
  ReloadlyOperatorFilters,
  ReloadlyTransactionFilters,
  ReloadlyPaginatedResponse,
} from './types';
import {
  ReloadlyError,
  ReloadlyAuthenticationError,
  ReloadlyNetworkError,
  parseReloadlyError,
} from './errors';

// =============================================================================
// Constants
// =============================================================================

const PRODUCTION_AUTH_URL = 'https://auth.reloadly.com/oauth/token';
const SANDBOX_AUTH_URL = 'https://auth.reloadly.com/oauth/token';

const PRODUCTION_API_URL = 'https://topups.reloadly.com';
const SANDBOX_API_URL = 'https://topups-sandbox.reloadly.com';

const TOKEN_EXPIRY_BUFFER_MS = 60 * 1000; // Refresh token 1 minute before expiry

// =============================================================================
// Reloadly Client Class
// =============================================================================

export class ReloadlyClient {
  private config: ReloadlyConfig;
  private token: ReloadlyAuthToken | null = null;
  private readonly authUrl: string;
  private readonly apiUrl: string;
  private readonly audience: string;

  constructor(config: ReloadlyConfig) {
    this.config = config;
    this.authUrl = config.sandbox ? SANDBOX_AUTH_URL : PRODUCTION_AUTH_URL;
    this.apiUrl = config.sandbox ? SANDBOX_API_URL : PRODUCTION_API_URL;
    this.audience = config.sandbox
      ? 'https://topups-sandbox.reloadly.com'
      : 'https://topups.reloadly.com';
  }

  // ===========================================================================
  // Authentication
  // ===========================================================================

  /**
   * Authenticates with Reloadly and obtains an access token
   */
  async authenticate(): Promise<ReloadlyAuthToken> {
    try {
      const response = await fetch(this.authUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          grant_type: 'client_credentials',
          audience: this.audience,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ReloadlyAuthenticationError(
          errorData.message || 'Authentication failed'
        );
      }

      const data = await response.json();

      this.token = {
        accessToken: data.access_token,
        tokenType: data.token_type,
        expiresIn: data.expires_in,
        expiresAt: new Date(Date.now() + data.expires_in * 1000),
      };

      return this.token;
    } catch (error) {
      if (error instanceof ReloadlyError) {
        throw error;
      }
      throw new ReloadlyNetworkError(
        'Failed to connect to Reloadly auth server',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Checks if the client has a valid (non-expired) token
   */
  isAuthenticated(): boolean {
    if (!this.token) return false;
    return Date.now() < this.token.expiresAt.getTime() - TOKEN_EXPIRY_BUFFER_MS;
  }

  /**
   * Gets the current token or null if not authenticated
   */
  getToken(): ReloadlyAuthToken | null {
    return this.token;
  }

  /**
   * Clears the current token
   */
  logout(): void {
    this.token = null;
  }

  // ===========================================================================
  // Internal Helpers
  // ===========================================================================

  /**
   * Ensures the client is authenticated, refreshing token if needed
   */
  private async ensureAuthenticated(): Promise<string> {
    if (!this.isAuthenticated()) {
      await this.authenticate();
    }
    return this.token!.accessToken;
  }

  /**
   * Makes an authenticated API request
   */
  private async request<T>(
    method: string,
    endpoint: string,
    body?: unknown,
    params?: Record<string, string | number | boolean | undefined>
  ): Promise<T> {
    const accessToken = await this.ensureAuthenticated();

    // Build URL with query params
    let url = `${this.apiUrl}${endpoint}`;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/com.reloadly.topups-v1+json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw parseReloadlyError(
          { status: response.status, data: errorData },
          `Request failed: ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof ReloadlyError) {
        throw error;
      }
      throw new ReloadlyNetworkError(
        'Network request failed',
        error instanceof Error ? error : undefined
      );
    }
  }

  // ===========================================================================
  // Account Operations
  // ===========================================================================

  /**
   * Gets the account balance
   */
  async getBalance(): Promise<ReloadlyAccountBalance> {
    return this.request<ReloadlyAccountBalance>('GET', '/accounts/balance');
  }

  // ===========================================================================
  // Country Operations
  // ===========================================================================

  /**
   * Gets all supported countries
   */
  async getCountries(): Promise<ReloadlyCountry[]> {
    return this.request<ReloadlyCountry[]>('GET', '/countries');
  }

  /**
   * Gets a specific country by ISO code
   */
  async getCountry(isoCode: string): Promise<ReloadlyCountry> {
    return this.request<ReloadlyCountry>('GET', `/countries/${isoCode}`);
  }

  // ===========================================================================
  // Operator Operations
  // ===========================================================================

  /**
   * Gets all operators with optional filtering
   */
  async getOperators(
    filters?: ReloadlyOperatorFilters
  ): Promise<ReloadlyPaginatedResponse<ReloadlyOperator>> {
    return this.request<ReloadlyPaginatedResponse<ReloadlyOperator>>(
      'GET',
      '/operators',
      undefined,
      filters as Record<string, string | number | boolean | undefined>
    );
  }

  /**
   * Gets operators for a specific country
   */
  async getOperatorsByCountry(
    countryCode: string,
    filters?: Omit<ReloadlyOperatorFilters, 'countryCode'>
  ): Promise<ReloadlyOperator[]> {
    return this.request<ReloadlyOperator[]>(
      'GET',
      `/operators/countries/${countryCode}`,
      undefined,
      filters as Record<string, string | number | boolean | undefined>
    );
  }

  /**
   * Gets a specific operator by ID
   */
  async getOperator(operatorId: number): Promise<ReloadlyOperator> {
    return this.request<ReloadlyOperator>('GET', `/operators/${operatorId}`);
  }

  /**
   * Auto-detects the operator for a phone number
   */
  async detectOperator(
    phone: string,
    countryCode: string
  ): Promise<ReloadlyOperatorDetection> {
    return this.request<ReloadlyOperatorDetection>(
      'GET',
      '/operators/auto-detect/phone',
      undefined,
      {
        phone,
        countryIsoCode: countryCode,
      }
    );
  }

  /**
   * Calculates the FX rate for an operator
   */
  async calculateFxRate(
    operatorId: number,
    amount: number
  ): Promise<{ fxRate: number; destinationAmount: number }> {
    return this.request('GET', `/operators/${operatorId}/fx-rate`, undefined, {
      amount,
    });
  }

  // ===========================================================================
  // Top-up Operations
  // ===========================================================================

  /**
   * Sends a top-up (airtime/data)
   */
  async sendTopup(request: ReloadlyTopupRequest): Promise<ReloadlyTopupResponse> {
    const payload = {
      operatorId: request.operatorId,
      amount: request.amount,
      useLocalAmount: request.useLocalAmount ?? false,
      customIdentifier: request.customIdentifier,
      recipientPhone: {
        countryCode: request.recipientPhone.countryCode,
        number: request.recipientPhone.number,
      },
      ...(request.senderPhone && {
        senderPhone: {
          countryCode: request.senderPhone.countryCode,
          number: request.senderPhone.number,
        },
      }),
    };

    return this.request<ReloadlyTopupResponse>('POST', '/topups', payload);
  }

  /**
   * Sends a top-up asynchronously (for slow networks)
   */
  async sendTopupAsync(
    request: ReloadlyTopupRequest
  ): Promise<ReloadlyTopupResponse> {
    const payload = {
      operatorId: request.operatorId,
      amount: request.amount,
      useLocalAmount: request.useLocalAmount ?? false,
      customIdentifier: request.customIdentifier,
      recipientPhone: {
        countryCode: request.recipientPhone.countryCode,
        number: request.recipientPhone.number,
      },
      ...(request.senderPhone && {
        senderPhone: {
          countryCode: request.senderPhone.countryCode,
          number: request.senderPhone.number,
        },
      }),
    };

    return this.request<ReloadlyTopupResponse>('POST', '/topups-async', payload);
  }

  // ===========================================================================
  // Transaction Operations
  // ===========================================================================

  /**
   * Gets transaction history with optional filtering
   */
  async getTransactions(
    filters?: ReloadlyTransactionFilters
  ): Promise<ReloadlyPaginatedResponse<ReloadlyTransaction>> {
    return this.request<ReloadlyPaginatedResponse<ReloadlyTransaction>>(
      'GET',
      '/topups/reports/transactions',
      undefined,
      filters as Record<string, string | number | boolean | undefined>
    );
  }

  /**
   * Gets a specific transaction by ID
   */
  async getTransaction(transactionId: number): Promise<ReloadlyTransaction> {
    return this.request<ReloadlyTransaction>(
      'GET',
      `/topups/reports/transactions/${transactionId}`
    );
  }

  /**
   * Gets a transaction by custom identifier
   */
  async getTransactionByCustomId(
    customIdentifier: string
  ): Promise<ReloadlyTransaction> {
    const result = await this.getTransactions({ customIdentifier, size: 1 });
    if (result.content.length === 0) {
      throw new ReloadlyError(
        'Transaction not found',
        'TRANSACTION_NOT_FOUND',
        404
      );
    }
    return result.content[0];
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Creates and authenticates a Reloadly client
 */
export async function createReloadlyClient(
  config: ReloadlyConfig
): Promise<ReloadlyClient> {
  const client = new ReloadlyClient(config);
  await client.authenticate();
  return client;
}

/**
 * Creates a Reloadly client without authenticating
 * (useful when you want to control when authentication happens)
 */
export function createReloadlyClientSync(config: ReloadlyConfig): ReloadlyClient {
  return new ReloadlyClient(config);
}
