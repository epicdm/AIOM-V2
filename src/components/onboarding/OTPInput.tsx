/**
 * OTP Input Component
 *
 * A 6-digit OTP input component with auto-focus and paste support.
 * Second step in the mobile onboarding flow.
 */

import { useState, useRef, useEffect, KeyboardEvent, ClipboardEvent } from "react";
import { Shield, ArrowRight, Loader2, RefreshCw } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

interface OTPInputProps {
  phoneNumber: string;
  onSubmit: (otpCode: string) => Promise<void>;
  onResend: () => Promise<void>;
  isLoading?: boolean;
  isResending?: boolean;
}

export function OTPInput({
  phoneNumber,
  onSubmit,
  onResend,
  isLoading = false,
  isResending = false,
}: OTPInputProps) {
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // Only allow digits

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1); // Only take the last digit
    setOtp(newOtp);
    setError("");

    // Move to next input if value entered
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits entered
    if (newOtp.every((digit) => digit !== "") && newOtp.join("").length === 6) {
      handleSubmit(newOtp.join(""));
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);

    if (pastedData.length === 6) {
      const newOtp = pastedData.split("");
      setOtp(newOtp);
      setError("");
      inputRefs.current[5]?.focus();
      handleSubmit(pastedData);
    }
  };

  const handleSubmit = async (code?: string) => {
    const otpCode = code || otp.join("");
    if (otpCode.length !== 6) {
      setError("Please enter all 6 digits");
      return;
    }

    setError("");
    try {
      await onSubmit(otpCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
      // Clear OTP on error
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;

    try {
      await onResend();
      setResendCooldown(60); // 60 second cooldown
      setError("");
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend code");
    }
  };

  // Mask phone number for display
  const maskedPhone = phoneNumber
    ? `${phoneNumber.slice(0, -4)}****`
    : "";

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 mb-4">
          <Shield className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight mb-2">
          Enter verification code
        </h2>
        <p className="text-muted-foreground">
          We sent a 6-digit code to{" "}
          <span className="font-medium text-foreground">{maskedPhone}</span>
        </p>
      </div>

      <div className="space-y-6">
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
            <p className="text-sm text-destructive text-center">{error}</p>
          </div>
        )}

        {/* OTP Input Grid */}
        <div className="flex justify-center gap-2 sm:gap-3">
          {otp.map((digit, index) => (
            <Input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={index === 0 ? handlePaste : undefined}
              disabled={isLoading}
              className="w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-semibold focus:ring-2 focus:ring-primary/50"
              aria-label={`Digit ${index + 1}`}
            />
          ))}
        </div>

        {/* Verify Button */}
        <Button
          onClick={() => handleSubmit()}
          disabled={isLoading || otp.some((d) => d === "")}
          className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verifying...
            </>
          ) : (
            <>
              Verify
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>

        {/* Resend Section */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-2">
            Didn't receive the code?
          </p>
          <Button
            variant="ghost"
            onClick={handleResend}
            disabled={resendCooldown > 0 || isResending}
            className="text-primary hover:text-primary/80"
          >
            {isResending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : resendCooldown > 0 ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Resend in {resendCooldown}s
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Resend code
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
