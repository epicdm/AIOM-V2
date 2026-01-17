/**
 * Onboarding Flow Component
 *
 * Multi-step onboarding flow for mobile phone verification and SIP provisioning.
 * Manages the complete flow from phone input to credential display.
 */

import { useState, useCallback } from "react";
import { PhoneNumberInput } from "./PhoneNumberInput";
import { OTPInput } from "./OTPInput";
import { SipCredentialDisplay } from "./SipCredentialDisplay";
import { ArrowLeft } from "lucide-react";
import { Button } from "~/components/ui/button";

type OnboardingStep = "phone" | "otp" | "complete";

interface SipCredentials {
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
}

interface OnboardingFlowProps {
  onComplete: (credentials: SipCredentials) => void;
  onCancel?: () => void;
}

export function OnboardingFlow({ onComplete, onCancel }: OnboardingFlowProps) {
  const [step, setStep] = useState<OnboardingStep>("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [credentials, setCredentials] = useState<SipCredentials | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // Step 1: Start onboarding with phone number
  const handlePhoneSubmit = useCallback(async (phone: string) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/onboarding/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: phone,
          deviceId: getDeviceId(),
          devicePlatform: getPlatform(),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || data.error || "Failed to start onboarding");
      }

      setPhoneNumber(phone);
      setSessionId(data.data.sessionId);
      setStep("otp");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Step 2: Verify OTP
  const handleOTPSubmit = useCallback(
    async (otpCode: string) => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/onboarding/verify-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            phoneNumber,
            otpCode,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || data.error || "Verification failed");
        }

        // Step 3: Link account and provision SIP
        await linkAccountAndProvision();
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId, phoneNumber]
  );

  // Step 3: Link account and provision SIP credentials
  const linkAccountAndProvision = useCallback(async () => {
    const response = await fetch("/api/onboarding/link-account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || data.error || "Failed to provision credentials");
    }

    setCredentials(data.data.sipCredentials);
    setStep("complete");
  }, [sessionId]);

  // Resend OTP
  const handleResendOTP = useCallback(async () => {
    setIsResending(true);
    try {
      const response = await fetch("/api/onboarding/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          phoneNumber,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || data.error || "Failed to resend code");
      }
    } finally {
      setIsResending(false);
    }
  }, [sessionId, phoneNumber]);

  // Handle flow completion
  const handleComplete = useCallback(() => {
    if (credentials) {
      onComplete(credentials);
    }
  }, [credentials, onComplete]);

  // Handle back navigation
  const handleBack = useCallback(() => {
    if (step === "otp") {
      setStep("phone");
      setSessionId("");
    } else if (onCancel) {
      onCancel();
    }
  }, [step, onCancel]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center p-4 border-b">
        {step !== "complete" && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div className="flex-1" />
        {/* Progress Indicator */}
        <div className="flex items-center gap-2">
          <StepIndicator step={1} currentStep={step} />
          <div className="w-8 h-0.5 bg-muted" />
          <StepIndicator step={2} currentStep={step} />
          <div className="w-8 h-0.5 bg-muted" />
          <StepIndicator step={3} currentStep={step} />
        </div>
        <div className="flex-1" />
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        {step === "phone" && (
          <PhoneNumberInput onSubmit={handlePhoneSubmit} isLoading={isLoading} />
        )}
        {step === "otp" && (
          <OTPInput
            phoneNumber={phoneNumber}
            onSubmit={handleOTPSubmit}
            onResend={handleResendOTP}
            isLoading={isLoading}
            isResending={isResending}
          />
        )}
        {step === "complete" && credentials && (
          <SipCredentialDisplay
            credentials={credentials}
            phoneNumber={phoneNumber}
            onComplete={handleComplete}
          />
        )}
      </main>
    </div>
  );
}

// Step Indicator Component
function StepIndicator({
  step,
  currentStep,
}: {
  step: number;
  currentStep: OnboardingStep;
}) {
  const stepMapping: Record<OnboardingStep, number> = {
    phone: 1,
    otp: 2,
    complete: 3,
  };
  const currentStepNum = stepMapping[currentStep];

  const isActive = step === currentStepNum;
  const isCompleted = step < currentStepNum;

  return (
    <div
      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
        isCompleted
          ? "bg-green-600 text-white"
          : isActive
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
      }`}
    >
      {isCompleted ? "✓" : step}
    </div>
  );
}

// Utility functions
function getDeviceId(): string {
  // Try to get persistent device ID from localStorage
  let deviceId = localStorage.getItem("deviceId");
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem("deviceId", deviceId);
  }
  return deviceId;
}

function getPlatform(): "ios" | "android" | "web" {
  const userAgent = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(userAgent)) {
    return "ios";
  }
  if (/android/.test(userAgent)) {
    return "android";
  }
  return "web";
}
