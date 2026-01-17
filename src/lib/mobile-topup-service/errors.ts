/**
 * Mobile Top-up Service Errors
 *
 * Custom error classes for mobile top-up operations.
 */

/**
 * Base error class for mobile top-up operations
 */
export class MobileTopupError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(message: string, code: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "MobileTopupError";
    this.code = code;
    this.details = details;
  }
}

/**
 * Error thrown when user has insufficient funds
 */
export class InsufficientFundsError extends MobileTopupError {
  public readonly availableBalance: string;
  public readonly requiredAmount: string;

  constructor(availableBalance: string, requiredAmount: string) {
    super(
      `Insufficient funds. Available: ${availableBalance}, Required: ${requiredAmount}`,
      "INSUFFICIENT_FUNDS",
      { availableBalance, requiredAmount }
    );
    this.name = "InsufficientFundsError";
    this.availableBalance = availableBalance;
    this.requiredAmount = requiredAmount;
  }
}

/**
 * Error thrown when top-up fails with Reloadly API
 */
export class TopupFailedError extends MobileTopupError {
  public readonly reloadlyError?: string;
  public readonly reloadlyErrorCode?: string;

  constructor(message: string, reloadlyError?: string, reloadlyErrorCode?: string) {
    super(message, "TOPUP_FAILED", { reloadlyError, reloadlyErrorCode });
    this.name = "TopupFailedError";
    this.reloadlyError = reloadlyError;
    this.reloadlyErrorCode = reloadlyErrorCode;
  }
}

/**
 * Error thrown when wallet operation fails
 */
export class WalletOperationError extends MobileTopupError {
  public readonly walletErrorCode?: string;

  constructor(message: string, walletErrorCode?: string) {
    super(message, "WALLET_OPERATION_FAILED", { walletErrorCode });
    this.name = "WalletOperationError";
    this.walletErrorCode = walletErrorCode;
  }
}

/**
 * Error thrown when operator is not found or invalid
 */
export class OperatorNotFoundError extends MobileTopupError {
  public readonly operatorId: number;

  constructor(operatorId: number) {
    super(
      `Operator not found: ${operatorId}`,
      "OPERATOR_NOT_FOUND",
      { operatorId }
    );
    this.name = "OperatorNotFoundError";
    this.operatorId = operatorId;
  }
}

/**
 * Error thrown when amount is invalid for the operator
 */
export class InvalidAmountError extends MobileTopupError {
  public readonly amount: number;
  public readonly minAmount?: number;
  public readonly maxAmount?: number;
  public readonly fixedAmounts?: number[];

  constructor(
    amount: number,
    options?: {
      minAmount?: number;
      maxAmount?: number;
      fixedAmounts?: number[];
    }
  ) {
    const details: Record<string, unknown> = { amount };
    let message = `Invalid amount: ${amount}`;

    if (options?.fixedAmounts?.length) {
      details.fixedAmounts = options.fixedAmounts;
      message = `Invalid amount. Must be one of: ${options.fixedAmounts.join(", ")}`;
    } else if (options?.minAmount !== undefined || options?.maxAmount !== undefined) {
      details.minAmount = options.minAmount;
      details.maxAmount = options.maxAmount;
      message = `Invalid amount: ${amount}. Must be between ${options.minAmount ?? 0} and ${options.maxAmount ?? "unlimited"}`;
    }

    super(message, "INVALID_AMOUNT", details);
    this.name = "InvalidAmountError";
    this.amount = amount;
    this.minAmount = options?.minAmount;
    this.maxAmount = options?.maxAmount;
    this.fixedAmounts = options?.fixedAmounts;
  }
}
