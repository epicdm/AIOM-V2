/**
 * Firebase Cloud Messaging (FCM) Provider
 *
 * Handles sending push notifications to mobile devices (iOS and Android)
 * using Firebase Cloud Messaging HTTP v1 API.
 */

import type {
  PushNotificationPayload,
  PushSendResult,
  FCMConfig,
  PushProvider,
} from "./types";

// FCM HTTP v1 API endpoint
const FCM_API_URL = "https://fcm.googleapis.com/v1/projects";

/**
 * FCM Provider implementation
 *
 * Uses Firebase Cloud Messaging HTTP v1 API for sending notifications.
 * Requires a service account with Firebase Cloud Messaging API access.
 */
export class FCMProvider implements PushProvider {
  private config: FCMConfig;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: FCMConfig) {
    this.config = config;
  }

  /**
   * Send a push notification to an FCM token
   */
  async send(
    token: string,
    payload: PushNotificationPayload,
    options?: { platform?: "ios" | "android" }
  ): Promise<PushSendResult> {
    const deviceTokenId = this.getDeviceIdFromToken(token);

    try {
      // Get access token for FCM API
      const accessToken = await this.getAccessToken();

      // Build the FCM message
      const message = this.buildFCMMessage(token, payload, options?.platform);

      // Send the notification
      const response = await fetch(
        `${FCM_API_URL}/${this.config.projectId}/messages:send`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message }),
        }
      );

      const result = await response.json();

      if (response.ok) {
        return {
          success: true,
          deviceTokenId,
          providerMessageId: result.name,
          providerResponse: JSON.stringify(result),
        };
      }

      // Handle FCM errors
      const errorCode = this.getFCMErrorCode(result);
      return {
        success: false,
        deviceTokenId,
        errorCode,
        errorMessage: result.error?.message || "Failed to send FCM notification",
        providerResponse: JSON.stringify(result),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        deviceTokenId,
        errorCode: "SEND_ERROR",
        errorMessage,
      };
    }
  }

  /**
   * Build the FCM message payload
   */
  private buildFCMMessage(
    token: string,
    payload: PushNotificationPayload,
    platform?: "ios" | "android"
  ): Record<string, unknown> {
    const message: Record<string, unknown> = {
      token,
      notification: {
        title: payload.title,
        body: payload.body,
      },
    };

    // Add optional notification fields
    if (payload.image) {
      (message.notification as Record<string, unknown>).image = payload.image;
    }

    // Add data payload
    if (payload.data || payload.clickAction) {
      message.data = {
        ...payload.data,
        click_action: payload.clickAction,
      };
    }

    // Platform-specific configurations
    if (platform === "android") {
      message.android = {
        priority: payload.priority === "high" ? "HIGH" : "NORMAL",
        notification: {
          icon: payload.icon,
          click_action: payload.clickAction,
          channel_id: "default",
        },
      };
    } else if (platform === "ios") {
      message.apns = {
        headers: {
          "apns-priority": payload.priority === "high" ? "10" : "5",
        },
        payload: {
          aps: {
            badge: payload.badge ? parseInt(payload.badge) : undefined,
            sound: "default",
          },
        },
      };
    }

    return message;
  }

  /**
   * Get FCM access token using service account credentials
   */
  private async getAccessToken(): Promise<string> {
    // Check if we have a valid cached token
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      // Try to use Google Auth Library if available
      const googleAuthModule = await import("google-auth-library").catch(
        () => null
      ) as typeof import("google-auth-library") | null;

      const GoogleAuth = googleAuthModule?.GoogleAuth;
      if (GoogleAuth) {
        const auth = new GoogleAuth({
          credentials: {
            client_email: this.config.clientEmail,
            private_key: this.config.privateKey,
          },
          scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
        });

        const client = await auth.getClient();
        const tokenResponse = await client.getAccessToken();

        if (tokenResponse.token) {
          this.accessToken = tokenResponse.token;
          // Token typically expires in 1 hour, refresh 5 minutes early
          this.tokenExpiry = Date.now() + 55 * 60 * 1000;
          return this.accessToken;
        }
      }

      // Fallback: Use JWT-based authentication
      return this.getAccessTokenWithJWT();
    } catch (error) {
      console.error("Failed to get FCM access token:", error);
      throw new Error("Failed to authenticate with FCM");
    }
  }

  /**
   * Get access token using JWT (fallback method)
   */
  private async getAccessTokenWithJWT(): Promise<string> {
    // Create JWT payload
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: this.config.clientEmail,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600, // 1 hour
    };

    // In a real implementation, we would sign the JWT with the private key
    // For now, throw an error suggesting to install google-auth-library
    throw new Error(
      "google-auth-library is required for FCM authentication. " +
        "Install with: npm install google-auth-library"
    );
  }

  /**
   * Extract a device ID from the FCM token
   */
  private getDeviceIdFromToken(token: string): string {
    // Use the first and last 8 characters as a unique identifier
    if (token.length > 16) {
      return `${token.substring(0, 8)}...${token.substring(token.length - 8)}`;
    }
    return token;
  }

  /**
   * Get standardized error code from FCM response
   */
  private getFCMErrorCode(
    result: Record<string, unknown>
  ): string {
    const error = result.error as Record<string, unknown> | undefined;
    const details = error?.details as Array<Record<string, unknown>> | undefined;

    if (details && details.length > 0) {
      const errorInfo = details.find(
        (d) => d["@type"] === "type.googleapis.com/google.firebase.fcm.v1.FcmError"
      );
      if (errorInfo?.errorCode) {
        return String(errorInfo.errorCode);
      }
    }

    // Map common HTTP status codes to error codes
    const status = error?.code;
    switch (status) {
      case 400:
        return "INVALID_ARGUMENT";
      case 401:
        return "UNAUTHENTICATED";
      case 403:
        return "PERMISSION_DENIED";
      case 404:
        return "UNREGISTERED";
      case 429:
        return "QUOTA_EXCEEDED";
      case 500:
        return "INTERNAL";
      case 503:
        return "UNAVAILABLE";
      default:
        return "UNKNOWN";
    }
  }
}

/**
 * Create an FCM provider instance
 */
export function createFCMProvider(config: FCMConfig): FCMProvider {
  return new FCMProvider(config);
}

/**
 * Check if an FCM error indicates the token is invalid and should be removed
 */
export function isFCMTokenInvalidError(errorCode: string): boolean {
  return ["UNREGISTERED", "INVALID_ARGUMENT", "NOT_FOUND"].includes(errorCode);
}
