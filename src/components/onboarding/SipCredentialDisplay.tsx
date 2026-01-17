/**
 * SIP Credential Display Component
 *
 * Displays provisioned SIP credentials after successful onboarding.
 * Final step in the mobile onboarding flow.
 */

import { useState } from "react";
import {
  Phone,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  Server,
  Lock,
  User,
  Shield,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { toast } from "sonner";

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

interface SipCredentialDisplayProps {
  credentials: SipCredentials;
  phoneNumber: string;
  onComplete: () => void;
}

export function SipCredentialDisplay({
  credentials,
  phoneNumber,
  onComplete,
}: SipCredentialDisplayProps) {
  const [showPassword, setShowPassword] = useState(false);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const credentialItems = [
    {
      label: "SIP Username",
      value: credentials.sipUsername,
      icon: User,
      copyable: true,
    },
    {
      label: "SIP Password",
      value: credentials.sipPassword,
      icon: Lock,
      copyable: true,
      isPassword: true,
    },
    {
      label: "SIP Domain",
      value: credentials.sipDomain,
      icon: Server,
      copyable: true,
    },
    {
      label: "SIP URI",
      value: credentials.sipUri,
      icon: Phone,
      copyable: true,
    },
  ];

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Success Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 mb-4">
          <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight mb-2">
          You're all set!
        </h2>
        <p className="text-muted-foreground">
          Your phone number{" "}
          <span className="font-medium text-foreground">{phoneNumber}</span> has
          been verified and SIP credentials have been provisioned.
        </p>
      </div>

      {/* Credentials Card */}
      <div className="rounded-xl border bg-card p-6 shadow-sm mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">SIP Credentials</h3>
        </div>

        <div className="space-y-4">
          {credentialItems.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
            >
              <div className="flex items-center gap-3 min-w-0">
                <item.icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="font-mono text-sm truncate">
                    {item.isPassword && !showPassword
                      ? "••••••••••••"
                      : item.value}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {item.isPassword && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                )}
                {item.copyable && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => copyToClipboard(item.value, item.label)}
                    aria-label={`Copy ${item.label}`}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Transport & Codecs */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
              {credentials.transportProtocol}
            </span>
            {credentials.codecPreferences.slice(0, 3).map((codec) => (
              <span
                key={codec}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
              >
                {codec}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Security Note */}
      <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 p-4 mb-6">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          <strong>Security Note:</strong> Keep your SIP credentials secure. They
          provide access to your VoIP account and should not be shared.
        </p>
      </div>

      {/* Complete Button */}
      <Button
        onClick={onComplete}
        className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
      >
        <CheckCircle2 className="mr-2 h-4 w-4" />
        Done
      </Button>
    </div>
  );
}
