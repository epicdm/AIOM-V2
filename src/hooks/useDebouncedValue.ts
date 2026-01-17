/**
 * useDebouncedValue Hook
 *
 * Returns a debounced version of the provided value.
 * The debounced value will only update after the specified delay
 * has passed without the value changing.
 */

import { useState, useEffect } from "react";

/**
 * Hook that returns a debounced version of the provided value.
 *
 * @param value - The value to debounce
 * @param delay - The debounce delay in milliseconds (default: 300ms)
 * @returns The debounced value
 *
 * @example
 * ```tsx
 * const [searchQuery, setSearchQuery] = useState("");
 * const debouncedQuery = useDebouncedValue(searchQuery, 300);
 *
 * // debouncedQuery will only update 300ms after searchQuery stops changing
 * useEffect(() => {
 *   if (debouncedQuery) {
 *     performSearch(debouncedQuery);
 *   }
 * }, [debouncedQuery]);
 * ```
 */
export function useDebouncedValue<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set up the timeout to update the debounced value
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up the timeout if value changes before delay completes
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook that returns a debounced callback function.
 *
 * @param callback - The callback function to debounce
 * @param delay - The debounce delay in milliseconds (default: 300ms)
 * @returns The debounced callback function
 */
export function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number = 300
): T {
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const debouncedCallback = ((...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    const newTimeoutId = setTimeout(() => {
      callback(...args);
    }, delay);

    setTimeoutId(newTimeoutId);
  }) as T;

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);

  return debouncedCallback;
}

export default useDebouncedValue;
