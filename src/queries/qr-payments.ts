/**
 * QR Payment Query Options
 *
 * TanStack Query configuration for QR payment operations.
 */

import { queryOptions } from "@tanstack/react-query";
import {
  getQrPaymentByIdFn,
  getQrPaymentByQrCodeFn,
  getQrPaymentByShortCodeFn,
  getQrPaymentRequestsFn,
  getQrPaymentRequestsCountFn,
  getMyQrPaymentRequestsFn,
  generateQrCodeImageFn,
  getPublicQrCodeFn,
  QR_PAYMENT_STATUSES,
  QR_PAYMENT_TYPES,
} from "~/fn/qr-payments";

// =============================================================================
// Types
// =============================================================================

export type QrPaymentStatus = (typeof QR_PAYMENT_STATUSES)[number];
export type QrPaymentType = (typeof QR_PAYMENT_TYPES)[number];

export interface QrPaymentFilters {
  merchantId?: string;
  payerId?: string;
  status?: QrPaymentStatus;
  type?: QrPaymentType;
  startDate?: Date;
  endDate?: Date;
  isExpired?: boolean;
  limit?: number;
  offset?: number;
}

// =============================================================================
// Query Keys
// =============================================================================

export const qrPaymentKeys = {
  all: ["qr-payments"] as const,
  lists: () => [...qrPaymentKeys.all, "list"] as const,
  list: (filters?: QrPaymentFilters) => [...qrPaymentKeys.lists(), filters] as const,
  myPayments: (filters?: Partial<QrPaymentFilters>) =>
    [...qrPaymentKeys.all, "my-payments", filters] as const,
  details: () => [...qrPaymentKeys.all, "detail"] as const,
  detail: (id: string) => [...qrPaymentKeys.details(), id] as const,
  byQrCode: (qrCode: string) => [...qrPaymentKeys.all, "by-qr-code", qrCode] as const,
  byShortCode: (shortCode: string) => [...qrPaymentKeys.all, "by-short-code", shortCode] as const,
  count: (filters?: QrPaymentFilters) => [...qrPaymentKeys.all, "count", filters] as const,
  qrCodeImage: (id: string, format?: string, width?: number) =>
    [...qrPaymentKeys.all, "qr-image", id, format, width] as const,
  publicQrCode: (qrCode: string, format?: string, width?: number) =>
    [...qrPaymentKeys.all, "public-qr", qrCode, format, width] as const,
};

// =============================================================================
// Query Options
// =============================================================================

/**
 * Query options for a specific QR payment by ID
 */
export const qrPaymentByIdQueryOptions = (id: string) =>
  queryOptions({
    queryKey: qrPaymentKeys.detail(id),
    queryFn: () => getQrPaymentByIdFn({ data: { id } }),
    enabled: !!id,
    staleTime: 30 * 1000,
  });

/**
 * Query options for a QR payment by QR code (for scanning)
 */
export const qrPaymentByQrCodeQueryOptions = (qrCode: string) =>
  queryOptions({
    queryKey: qrPaymentKeys.byQrCode(qrCode),
    queryFn: () => getQrPaymentByQrCodeFn({ data: { qrCode } }),
    enabled: !!qrCode,
    staleTime: 10 * 1000, // Short stale time for payment validation
  });

/**
 * Query options for a QR payment by short code (for manual entry)
 */
export const qrPaymentByShortCodeQueryOptions = (shortCode: string) =>
  queryOptions({
    queryKey: qrPaymentKeys.byShortCode(shortCode),
    queryFn: () => getQrPaymentByShortCodeFn({ data: { shortCode } }),
    enabled: !!shortCode,
    staleTime: 10 * 1000,
  });

/**
 * Query options for all QR payments with filters
 */
export const qrPaymentRequestsQueryOptions = (filters?: QrPaymentFilters) =>
  queryOptions({
    queryKey: qrPaymentKeys.list(filters),
    queryFn: () => getQrPaymentRequestsFn({ data: filters }),
    staleTime: 30 * 1000,
  });

/**
 * Query options for QR payment count
 */
export const qrPaymentCountQueryOptions = (filters?: QrPaymentFilters) =>
  queryOptions({
    queryKey: qrPaymentKeys.count(filters),
    queryFn: () => getQrPaymentRequestsCountFn({ data: filters }),
    staleTime: 30 * 1000,
  });

/**
 * Query options for current user's QR payments (as merchant)
 */
export const myQrPaymentRequestsQueryOptions = (options?: {
  status?: QrPaymentStatus;
  type?: QrPaymentType;
  limit?: number;
  offset?: number;
}) =>
  queryOptions({
    queryKey: qrPaymentKeys.myPayments(options),
    queryFn: () => getMyQrPaymentRequestsFn({ data: options }),
    staleTime: 30 * 1000,
  });

/**
 * Query options for generating QR code image
 */
export const qrCodeImageQueryOptions = (
  qrPaymentId: string,
  options?: {
    format?: "png" | "svg";
    width?: number;
    baseUrl?: string;
  }
) =>
  queryOptions({
    queryKey: qrPaymentKeys.qrCodeImage(qrPaymentId, options?.format, options?.width),
    queryFn: () =>
      generateQrCodeImageFn({
        data: {
          qrPaymentId,
          format: options?.format || "png",
          width: options?.width || 300,
          baseUrl: options?.baseUrl,
        },
      }),
    enabled: !!qrPaymentId,
    staleTime: 5 * 60 * 1000, // QR code images can be cached longer
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

/**
 * Query options for public QR code display
 */
export const publicQrCodeQueryOptions = (
  qrCode: string,
  options?: {
    format?: "png" | "svg";
    width?: number;
    baseUrl?: string;
  }
) =>
  queryOptions({
    queryKey: qrPaymentKeys.publicQrCode(qrCode, options?.format, options?.width),
    queryFn: () =>
      getPublicQrCodeFn({
        data: {
          qrCode,
          format: options?.format || "png",
          width: options?.width || 300,
          baseUrl: options?.baseUrl,
        },
      }),
    enabled: !!qrCode,
    staleTime: 30 * 1000, // Check expiration more frequently
  });
