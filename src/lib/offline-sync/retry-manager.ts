/**
 * Retry Manager
 *
 * Handles retry logic with exponential backoff for failed sync operations.
 */

import type { RetryConfig } from "./types";
import { DEFAULT_RETRY_CONFIG } from "./types";

/**
 * Retry state for tracking attempts
 */
export interface RetryState {
  /** Current retry count */
  retryCount: number;
  /** Last error message */
  lastError?: string;
  /** Last error code */
  lastErrorCode?: string;
  /** Next retry timestamp */
  nextRetryAt?: Date;
  /** Whether retries are exhausted */
  exhausted: boolean;
}

/**
 * RetryManager class
 * Manages retry logic with exponential backoff
 */
export class RetryManager {
  private config: RetryConfig;
  private debug: boolean;

  constructor(config: Partial<RetryConfig> = {}, debug = false) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
    this.debug = debug;
  }

  /**
   * Log debug messages
   */
  private log(...args: unknown[]): void {
    if (this.debug) {
      console.log("[RetryManager]", ...args);
    }
  }

  /**
   * Check if an error is retryable
   */
  isRetryable(errorCode?: string): boolean {
    if (!errorCode) {
      return true; // Unknown errors are retryable by default
    }

    const isNonRetryable = this.config.nonRetryableErrors.some(
      (code) => errorCode.toUpperCase().includes(code.toUpperCase())
    );

    if (isNonRetryable) {
      this.log(`Error code ${errorCode} is non-retryable`);
    }

    return !isNonRetryable;
  }

  /**
   * Check if we should retry based on current state
   */
  shouldRetry(retryCount: number, errorCode?: string): boolean {
    if (retryCount >= this.config.maxRetries) {
      this.log(`Max retries (${this.config.maxRetries}) reached`);
      return false;
    }

    if (!this.isRetryable(errorCode)) {
      return false;
    }

    return true;
  }

  /**
   * Calculate delay for next retry using exponential backoff
   */
  calculateDelay(retryCount: number): number {
    // Exponential backoff: initialDelay * (multiplier ^ retryCount)
    let delay = this.config.initialDelayMs * Math.pow(
      this.config.backoffMultiplier,
      retryCount
    );

    // Apply maximum cap
    delay = Math.min(delay, this.config.maxDelayMs);

    // Apply jitter if enabled
    if (this.config.useJitter) {
      const jitter = delay * this.config.jitterFactor * Math.random();
      // Randomly add or subtract jitter
      delay = Math.random() > 0.5 ? delay + jitter : delay - jitter;
      // Ensure delay doesn't go below initial delay
      delay = Math.max(delay, this.config.initialDelayMs / 2);
    }

    this.log(`Calculated delay for retry ${retryCount}: ${Math.round(delay)}ms`);
    return Math.round(delay);
  }

  /**
   * Get next retry timestamp
   */
  getNextRetryTime(retryCount: number): Date {
    const delay = this.calculateDelay(retryCount);
    return new Date(Date.now() + delay);
  }

  /**
   * Create initial retry state
   */
  createInitialState(): RetryState {
    return {
      retryCount: 0,
      exhausted: false,
    };
  }

  /**
   * Update retry state after a failure
   */
  updateStateAfterFailure(
    currentState: RetryState,
    error: string,
    errorCode?: string
  ): RetryState {
    const newRetryCount = currentState.retryCount + 1;
    const shouldRetry = this.shouldRetry(newRetryCount, errorCode);

    if (!shouldRetry) {
      return {
        ...currentState,
        retryCount: newRetryCount,
        lastError: error,
        lastErrorCode: errorCode,
        exhausted: true,
        nextRetryAt: undefined,
      };
    }

    return {
      retryCount: newRetryCount,
      lastError: error,
      lastErrorCode: errorCode,
      nextRetryAt: this.getNextRetryTime(newRetryCount),
      exhausted: false,
    };
  }

  /**
   * Reset retry state after success
   */
  resetState(): RetryState {
    return this.createInitialState();
  }

  /**
   * Check if it's time to retry
   */
  isTimeToRetry(state: RetryState): boolean {
    if (state.exhausted || !state.nextRetryAt) {
      return false;
    }

    return Date.now() >= state.nextRetryAt.getTime();
  }

  /**
   * Execute with retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    options?: {
      onRetry?: (retryCount: number, delay: number, error: Error) => void;
      shouldRetryFn?: (error: Error) => boolean;
    }
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if we should retry
        const errorCode = (error as { code?: string }).code;
        if (!this.shouldRetry(attempt, errorCode)) {
          throw lastError;
        }

        // Check custom retry function
        if (options?.shouldRetryFn && !options.shouldRetryFn(lastError)) {
          throw lastError;
        }

        // Calculate delay and wait
        const delay = this.calculateDelay(attempt);

        this.log(`Retry attempt ${attempt + 1}/${this.config.maxRetries} after ${delay}ms`);
        options?.onRetry?.(attempt + 1, delay, lastError);

        await this.sleep(delay);
      }
    }

    throw lastError ?? new Error("Max retries exceeded");
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get current configuration
   */
  getConfig(): RetryConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<RetryConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}

/**
 * Create a default retry manager instance
 */
export function createRetryManager(
  config?: Partial<RetryConfig>,
  debug?: boolean
): RetryManager {
  return new RetryManager(config, debug);
}

/**
 * Utility to create a timeout promise
 */
export function createTimeout(ms: number, message = "Operation timed out"): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), ms);
  });
}

/**
 * Execute with timeout
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage?: string
): Promise<T> {
  return Promise.race([
    promise,
    createTimeout(timeoutMs, timeoutMessage),
  ]);
}
