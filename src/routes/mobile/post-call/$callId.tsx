/**
 * Mobile Post-Call Route
 *
 * Post-call interface for selecting disposition (resolved, follow-up needed, escalate),
 * adding notes, and creating tasks after a call ends.
 */

import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authClient } from "~/lib/auth-client";
import { PostCallScreen } from "~/components/post-call";
import { authenticatedMiddleware } from "~/fn/middleware";
import { findCallRecordById } from "~/data-access/call-records";

const getCallRecordByIdFn = createServerFn({
  method: "GET",
})
  .inputValidator(z.object({ callId: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    const callRecord = await findCallRecordById(data.callId);
    if (!callRecord) {
      throw new Error("Call record not found");
    }
    return callRecord;
  });

export const Route = createFileRoute("/mobile/post-call/$callId")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session) {
      throw redirect({
        to: "/sign-in",
        search: { redirect: "/mobile" },
      });
    }
  },
  component: PostCallPage,
});

function PostCallPage() {
  const { callId } = Route.useParams();
  const navigate = useNavigate();

  const {
    data: callRecord,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["call-record", callId],
    queryFn: () => getCallRecordByIdFn({ data: { callId } }),
    enabled: !!callId,
  });

  const handleComplete = React.useCallback(() => {
    navigate({ to: "/mobile" });
  }, [navigate]);

  const handleBack = React.useCallback(() => {
    navigate({ to: "/mobile" });
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !callRecord) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <h1 className="text-xl font-semibold mb-2">Call Not Found</h1>
        <p className="text-muted-foreground mb-4">
          The call record could not be found.
        </p>
        <button
          onClick={handleBack}
          className="text-primary hover:underline"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <PostCallScreen
      callRecord={callRecord}
      onComplete={handleComplete}
      onBack={handleBack}
    />
  );
}
