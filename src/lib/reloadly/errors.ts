/**
 * Reloadly Error Classes
 *
 * Custom error classes for handling Reloadly API errors.
 */

/**
 * Base Reloadly error class
 */
export class ReloadlyError extends Error {
  public readonly errorCode: string;
  public readonly statusCode?: number;
  public readonly details?: string[];

  constructor(
    message: string,
    errorCode: string = 'RELOADLY_ERROR',
    statusCode?: number,
    details?: string[]
  ) {
    super(message);
    this.name = 'ReloadlyError';
    this.errorCode = errorCode;
    this.statusCode = statusCode;
    this.details = details;

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ReloadlyError);
    }
  }
}

/**
 * Authentication error - thrown when auth fails or token expires
 */
export class ReloadlyAuthenticationError extends ReloadlyError {
  constructor(message: string = 'Authentication failed') {
    super(message, 'AUTH_ERROR', 401);
    this.name = 'ReloadlyAuthenticationError';
  }
}

/**
 * Validation error - thrown when request data is invalid
 */
export class ReloadlyValidationError extends ReloadlyError {
  public readonly fields?: Record<string, string[]>;

  constructor(
    message: string,
    fields?: Record<string, string[]>,
    details?: string[]
  ) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ReloadlyValidationError';
    this.fields = fields;
  }
}

/**
 * Insufficient balance error
 */
export class ReloadlyInsufficientBalanceError extends ReloadlyError {
  public readonly currentBalance?: number;
  public readonly requiredAmount?: number;

  constructor(
    message: string = 'Insufficient balance',
    currentBalance?: number,
    requiredAmount?: number
  ) {
    super(message, 'INSUFFICIENT_BALANCE', 402);
    this.name = 'ReloadlyInsufficientBalanceError';
    this.currentBalance = currentBalance;
    this.requiredAmount = requiredAmount;
  }
}

/**
 * Operator not found error
 */
export class ReloadlyOperatorNotFoundError extends ReloadlyError {
  public readonly operatorId?: number;
  public readonly phoneNumber?: string;

  constructor(
    message: string = 'Operator not found',
    operatorId?: number,
    phoneNumber?: string
  ) {
    super(message, 'OPERATOR_NOT_FOUND', 404);
    this.name = 'ReloadlyOperatorNotFoundError';
    this.operatorId = operatorId;
    this.phoneNumber = phoneNumber;
  }
}

/**
 * Transaction error - thrown when topup fails
 */
export class ReloadlyTransactionError extends ReloadlyError {
  public readonly transactionId?: number;

  constructor(
    message: string,
    errorCode: string = 'TRANSACTION_ERROR',
    transactionId?: number
  ) {
    super(message, errorCode, 400);
    this.name = 'ReloadlyTransactionError';
    this.transactionId = transactionId;
  }
}

/**
 * Rate limit error
 */
export class ReloadlyRateLimitError extends ReloadlyError {
  public readonly retryAfter?: number;

  constructor(message: string = 'Rate limit exceeded', retryAfter?: number) {
    super(message, 'RATE_LIMIT', 429);
    this.name = 'ReloadlyRateLimitError';
    this.retryAfter = retryAfter;
  }
}

/**
 * Network error
 */
export class ReloadlyNetworkError extends ReloadlyError {
  public readonly originalError?: Error;

  constructor(message: string = 'Network error', originalError?: Error) {
    super(message, 'NETWORK_ERROR', 0);
    this.name = 'ReloadlyNetworkError';
    this.originalError = originalError;
  }
}

/**
 * Parse an API error response into the appropriate error class
 */
export function parseReloadlyError(
  response: {
    status?: number;
    data?: {
      errorCode?: string;
      message?: string;
      details?: string[];
    };
  },
  fallbackMessage: string = 'An error occurred'
): ReloadlyError {
  const status = response.status;
  const data = response.data;
  const message = data?.message || fallbackMessage;
  const errorCode = data?.errorCode || 'UNKNOWN_ERROR';
  const details = data?.details;

  switch (status) {
    case 401:
      return new ReloadlyAuthenticationError(message);
    case 402:
      return new ReloadlyInsufficientBalanceError(message);
    case 404:
      if (errorCode.includes('OPERATOR')) {
        return new ReloadlyOperatorNotFoundError(message);
      }
      return new ReloadlyError(message, errorCode, status, details);
    case 429:
      return new ReloadlyRateLimitError(message);
    case 400:
      if (errorCode.includes('VALIDATION')) {
        return new ReloadlyValidationError(message, undefined, details);
      }
      if (errorCode.includes('TRANSACTION')) {
        return new ReloadlyTransactionError(message, errorCode);
      }
      return new ReloadlyError(message, errorCode, status, details);
    default:
      return new ReloadlyError(message, errorCode, status, details);
  }
}
