/**
 * FlexiSIP Client
 *
 * HTTP client for communicating with the FlexiSIP server API.
 * Handles account creation, updates, deletion, and health checks.
 *
 * FlexiSIP is an open-source SIP server that provides:
 * - SIP registrar functionality
 * - Account management via REST API
 * - Push notification support for mobile clients
 */

import type {
  FlexiSIPConfig,
  CreateSipAccountRequest,
  UpdateSipAccountRequest,
  FlexiSIPAccount,
  FlexiSIPResponse,
  RegistrationStatus,
  ServerHealthStatus,
} from "./types";
import {
  ProvisioningError,
  ProvisioningErrorCode,
} from "./types";

/**
 * FlexiSIP API Client
 *
 * Provides methods for interacting with the FlexiSIP server REST API.
 */
export class FlexiSIPClient {
  private config: FlexiSIPConfig;
  private baseUrl: string;

  constructor(config: FlexiSIPConfig) {
    this.config = config;
    this.baseUrl = config.serverUrl.replace(/\/$/, "");
  }

  /**
   * Create authorization headers for API requests
   */
  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Use API key if available
    if (this.config.apiKey) {
      headers["X-API-Key"] = this.config.apiKey;
    }

    // Use basic auth as fallback
    if (this.config.adminUsername && this.config.adminPassword) {
      const credentials = Buffer.from(
        `${this.config.adminUsername}:${this.config.adminPassword}`
      ).toString("base64");
      headers["Authorization"] = `Basic ${credentials}`;
    }

    return headers;
  }

  /**
   * Make an HTTP request to the FlexiSIP API
   */
  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<FlexiSIPResponse<T>> {
    const url = `${this.baseUrl}${path}`;

    try {
      const response = await fetch(url, {
        method,
        headers: this.getAuthHeaders(),
        body: body ? JSON.stringify(body) : undefined,
      });

      // Handle non-JSON responses
      const contentType = response.headers.get("content-type");
      if (!contentType?.includes("application/json")) {
        if (!response.ok) {
          return {
            success: false,
            error: {
              code: `HTTP_${response.status}`,
              message: response.statusText || "Request failed",
            },
          };
        }
        // For successful non-JSON responses, return success with no data
        return { success: true };
      }

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: data.error?.code || `HTTP_${response.status}`,
            message: data.error?.message || data.message || "Request failed",
          },
        };
      }

      return {
        success: true,
        data: data as T,
      };
    } catch (error) {
      // Network or parsing error
      const message = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: {
          code: "NETWORK_ERROR",
          message: `Failed to connect to FlexiSIP server: ${message}`,
        },
      };
    }
  }

  /**
   * Check server health and connectivity
   */
  async getServerHealth(): Promise<ServerHealthStatus> {
    try {
      const response = await this.request<{
        status: string;
        version?: string;
        uptime?: number;
        registrations?: number;
      }>("GET", "/api/health");

      if (!response.success) {
        return {
          healthy: false,
          error: response.error?.message,
        };
      }

      return {
        healthy: true,
        version: response.data?.version,
        uptime: response.data?.uptime,
        activeRegistrations: response.data?.registrations,
      };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Create a new SIP account on the FlexiSIP server
   */
  async createAccount(
    request: CreateSipAccountRequest
  ): Promise<FlexiSIPAccount> {
    const response = await this.request<FlexiSIPAccount>(
      "POST",
      "/api/accounts",
      {
        username: request.username,
        password: request.password,
        domain: request.domain,
        display_name: request.displayName,
        phone_number: request.phoneNumber,
        enabled: request.enabled ?? true,
      }
    );

    if (!response.success) {
      this.throwProvisioningError(response.error);
    }

    return response.data!;
  }

  /**
   * Get a SIP account by username
   */
  async getAccount(username: string): Promise<FlexiSIPAccount | null> {
    const response = await this.request<FlexiSIPAccount>(
      "GET",
      `/api/accounts/${encodeURIComponent(username)}`
    );

    if (!response.success) {
      if (response.error?.code === "HTTP_404") {
        return null;
      }
      this.throwProvisioningError(response.error);
    }

    return response.data!;
  }

  /**
   * Update a SIP account
   */
  async updateAccount(
    username: string,
    updates: UpdateSipAccountRequest
  ): Promise<FlexiSIPAccount> {
    const response = await this.request<FlexiSIPAccount>(
      "PATCH",
      `/api/accounts/${encodeURIComponent(username)}`,
      {
        display_name: updates.displayName,
        password: updates.password,
        enabled: updates.enabled,
      }
    );

    if (!response.success) {
      this.throwProvisioningError(response.error);
    }

    return response.data!;
  }

  /**
   * Delete a SIP account
   */
  async deleteAccount(username: string): Promise<void> {
    const response = await this.request<void>(
      "DELETE",
      `/api/accounts/${encodeURIComponent(username)}`
    );

    if (!response.success) {
      this.throwProvisioningError(response.error);
    }
  }

  /**
   * Enable a SIP account
   */
  async enableAccount(username: string): Promise<FlexiSIPAccount> {
    return this.updateAccount(username, { enabled: true });
  }

  /**
   * Disable a SIP account
   */
  async disableAccount(username: string): Promise<FlexiSIPAccount> {
    return this.updateAccount(username, { enabled: false });
  }

  /**
   * Get registration status for a SIP account
   */
  async getRegistrationStatus(username: string): Promise<RegistrationStatus> {
    const response = await this.request<{
      registered: boolean;
      contact?: string;
      user_agent?: string;
      expires?: number;
      last_registered_at?: string;
    }>(
      "GET",
      `/api/accounts/${encodeURIComponent(username)}/registration`
    );

    if (!response.success) {
      // If 404, account is not registered
      if (response.error?.code === "HTTP_404") {
        return { registered: false };
      }
      this.throwProvisioningError(response.error);
    }

    return {
      registered: response.data?.registered ?? false,
      contact: response.data?.contact,
      userAgent: response.data?.user_agent,
      expires: response.data?.expires,
      lastRegisteredAt: response.data?.last_registered_at,
    };
  }

  /**
   * Force deregistration of a SIP account
   */
  async forceDeregister(username: string): Promise<void> {
    const response = await this.request<void>(
      "DELETE",
      `/api/accounts/${encodeURIComponent(username)}/registration`
    );

    if (!response.success && response.error?.code !== "HTTP_404") {
      this.throwProvisioningError(response.error);
    }
  }

  /**
   * List all accounts (paginated)
   */
  async listAccounts(options?: {
    page?: number;
    limit?: number;
    domain?: string;
  }): Promise<{
    accounts: FlexiSIPAccount[];
    total: number;
    page: number;
    limit: number;
  }> {
    const params = new URLSearchParams();
    if (options?.page) params.set("page", options.page.toString());
    if (options?.limit) params.set("limit", options.limit.toString());
    if (options?.domain) params.set("domain", options.domain);

    const queryString = params.toString();
    const path = `/api/accounts${queryString ? `?${queryString}` : ""}`;

    const response = await this.request<{
      accounts: FlexiSIPAccount[];
      total: number;
      page: number;
      limit: number;
    }>("GET", path);

    if (!response.success) {
      this.throwProvisioningError(response.error);
    }

    return response.data!;
  }

  /**
   * Convert API error to ProvisioningError
   */
  private throwProvisioningError(
    error?: { code: string; message: string }
  ): never {
    const code = error?.code || "INTERNAL_ERROR";
    const message = error?.message || "Unknown error occurred";

    // Map common error codes
    let errorCode: ProvisioningErrorCode;
    switch (code) {
      case "NETWORK_ERROR":
      case "HTTP_503":
      case "HTTP_502":
      case "HTTP_504":
        errorCode = ProvisioningErrorCode.SERVER_UNAVAILABLE;
        break;
      case "HTTP_401":
      case "HTTP_403":
        errorCode = ProvisioningErrorCode.AUTHENTICATION_FAILED;
        break;
      case "HTTP_409":
      case "ACCOUNT_EXISTS":
        errorCode = ProvisioningErrorCode.ACCOUNT_EXISTS;
        break;
      case "HTTP_404":
      case "ACCOUNT_NOT_FOUND":
        errorCode = ProvisioningErrorCode.ACCOUNT_NOT_FOUND;
        break;
      case "QUOTA_EXCEEDED":
        errorCode = ProvisioningErrorCode.QUOTA_EXCEEDED;
        break;
      default:
        errorCode = ProvisioningErrorCode.INTERNAL_ERROR;
    }

    throw new ProvisioningError(errorCode, message);
  }
}

/**
 * Get FlexiSIP configuration from environment
 */
export function getFlexiSIPConfig(): FlexiSIPConfig | null {
  const serverUrl = process.env.FLEXISIP_SERVER_URL;
  const apiKey = process.env.FLEXISIP_API_KEY;
  const domain = process.env.FLEXISIP_DOMAIN || "sip.soundstation.io";

  if (!serverUrl) {
    return null;
  }

  return {
    serverUrl,
    apiKey: apiKey || "",
    adminUsername: process.env.FLEXISIP_ADMIN_USERNAME,
    adminPassword: process.env.FLEXISIP_ADMIN_PASSWORD,
    domain,
  };
}

/**
 * Create a FlexiSIP client instance
 */
export function createFlexiSIPClient(config?: FlexiSIPConfig): FlexiSIPClient | null {
  const cfg = config || getFlexiSIPConfig();
  if (!cfg) {
    return null;
  }
  return new FlexiSIPClient(cfg);
}
