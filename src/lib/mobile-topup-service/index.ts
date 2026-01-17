/**
 * Mobile Top-up Service
 *
 * Orchestrates mobile top-ups with:
 * - Wallet balance verification and deduction
 * - Reloadly API integration for airtime/data purchases
 * - Transaction recording with full audit trail
 * - Receipt generation for completed top-ups
 *
 * This service ensures atomic operations and proper rollback
 * in case of failures at any step.
 */

export {
  MobileTopupService,
  createMobileTopupService,
  type MobileTopupRequest,
  type MobileTopupResult,
  type TopupReceipt,
  type TopupReceiptData,
} from "./service";

export {
  MobileTopupError,
  InsufficientFundsError,
  TopupFailedError,
  WalletOperationError,
  OperatorNotFoundError,
} from "./errors";
