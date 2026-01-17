/**
 * Mobile Auth Query Options
 *
 * TanStack Query options for mobile authentication.
 */

import { queryOptions } from "@tanstack/react-query";
import {
  getMobileSessionsFn,
  getMobileDevicesFn,
  getMobileUserFn,
} from "~/fn/mobile-auth";

/**
 * Query options for getting mobile sessions
 */
export function mobileSessionsQueryOptions() {
  return queryOptions({
    queryKey: ["mobile-sessions"],
    queryFn: () => getMobileSessionsFn(),
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Query options for getting mobile devices
 */
export function mobileDevicesQueryOptions() {
  return queryOptions({
    queryKey: ["mobile-devices"],
    queryFn: () => getMobileDevicesFn(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Query options for getting mobile user data
 */
export function mobileUserQueryOptions() {
  return queryOptions({
    queryKey: ["mobile-user"],
    queryFn: () => getMobileUserFn(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
