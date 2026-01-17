/**
 * KYC Query Options
 *
 * TanStack Query options for KYC verification data.
 */

import { queryOptions } from "@tanstack/react-query";
import {
  getMyKycVerificationFn,
  getMyKycVerificationWithDocumentsFn,
  getMyKycDocumentsFn,
  getKycTierConfigsFn,
} from "~/fn/kyc";

/**
 * Query options for getting the current user's KYC verification
 */
export const myKycVerificationQueryOptions = () =>
  queryOptions({
    queryKey: ["kyc", "my-verification"],
    queryFn: () => getMyKycVerificationFn(),
  });

/**
 * Query options for getting the current user's KYC verification with documents
 */
export const myKycVerificationWithDocumentsQueryOptions = () =>
  queryOptions({
    queryKey: ["kyc", "my-verification-with-documents"],
    queryFn: () => getMyKycVerificationWithDocumentsFn(),
  });

/**
 * Query options for getting the current user's KYC documents
 */
export const myKycDocumentsQueryOptions = () =>
  queryOptions({
    queryKey: ["kyc", "my-documents"],
    queryFn: () => getMyKycDocumentsFn(),
  });

/**
 * Query options for getting available KYC tier configurations
 */
export const kycTierConfigsQueryOptions = () =>
  queryOptions({
    queryKey: ["kyc", "tier-configs"],
    queryFn: () => getKycTierConfigsFn(),
  });
