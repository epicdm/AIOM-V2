/**
 * Mobile Call Index Route
 *
 * Redirects to mobile home when no active call is specified.
 * This route serves as a fallback when navigating to /mobile/call without a phone/user ID.
 */

import { createFileRoute, redirect } from "@tanstack/react-router";
import { authClient } from "~/lib/auth-client";

export const Route = createFileRoute("/mobile/call/")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session) {
      throw redirect({
        to: "/sign-in",
        search: { redirect: "/mobile" },
      });
    }
    // Redirect to mobile home since no call ID was provided
    throw redirect({
      to: "/mobile",
    });
  },
  component: () => null,
});
