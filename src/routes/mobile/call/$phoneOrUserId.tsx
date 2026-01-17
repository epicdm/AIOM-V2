/**
 * Mobile Active Call Route
 *
 * Displays customer context during an active call with swipeable cards
 * showing customer info, history, open tickets, and suggested actions.
 */

import * as React from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { redirect } from "@tanstack/react-router";
import { authClient } from "~/lib/auth-client";
import { CallContextScreen } from "~/components/call-context";
import { Button } from "~/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/mobile/call/$phoneOrUserId")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session) {
      throw redirect({
        to: "/sign-in",
        search: { redirect: "/mobile" },
      });
    }
  },
  validateSearch: (search: Record<string, unknown>) => {
    return {
      direction: (search.direction as "inbound" | "outbound") || "inbound",
    };
  },
  component: ActiveCallPage,
});

function ActiveCallPage() {
  const { phoneOrUserId } = Route.useParams();
  const { direction } = Route.useSearch();
  const navigate = useNavigate();

  const handleEndCall = React.useCallback(() => {
    // In a real app, this would end the SIP call
    // For now, navigate back to the mobile home
    navigate({ to: "/mobile" });
  }, [navigate]);

  const handleMuteToggle = React.useCallback((muted: boolean) => {
    // In a real app, this would toggle mute on the SIP call
    console.log("Mute toggled:", muted);
  }, []);

  const handleSpeakerToggle = React.useCallback((speaker: boolean) => {
    // In a real app, this would toggle speaker on the device
    console.log("Speaker toggled:", speaker);
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header with back button */}
      <header className="flex items-center gap-2 p-4 border-b lg:hidden">
        <Link to="/mobile">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="font-semibold">Active Call</h1>
      </header>

      {/* Call Context Screen */}
      <div className="flex-1">
        <CallContextScreen
          phoneOrUserId={phoneOrUserId}
          direction={direction}
          onEndCall={handleEndCall}
          onMuteToggle={handleMuteToggle}
          onSpeakerToggle={handleSpeakerToggle}
          className="h-full"
        />
      </div>
    </div>
  );
}
