/**
 * Onboarding Page Route
 *
 * Mobile onboarding flow for phone verification and SIP provisioning.
 * Accessible to both authenticated and unauthenticated users.
 */

import { createFileRoute, useRouter } from "@tanstack/react-router";
import { OnboardingFlow } from "~/components/onboarding";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding")({
  component: OnboardingPage,
});

function OnboardingPage() {
  const router = useRouter();

  const handleComplete = (credentials: {
    sipUsername: string;
    sipPassword: string;
    sipDomain: string;
    sipUri: string;
    displayName: string | null;
    transportProtocol: string;
    codecPreferences: string[];
    stunTurnConfig: {
      stunServers: string[];
      turnServers?: { url: string; username: string; credential: string }[];
    } | null;
  }) => {
    toast.success("Phone verified and SIP credentials provisioned!");

    // Store credentials in localStorage for the mobile app to pick up
    localStorage.setItem("sipCredentials", JSON.stringify(credentials));

    // Redirect to dashboard or home
    router.navigate({ to: "/dashboard" });
  };

  const handleCancel = () => {
    router.navigate({ to: "/" });
  };

  return (
    <OnboardingFlow
      onComplete={handleComplete}
      onCancel={handleCancel}
    />
  );
}
