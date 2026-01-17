/**
 * WebRTC Call Screen Component
 *
 * Full-screen call interface for WebRTC calls.
 * Shows call information, duration, and controls.
 */

import * as React from "react";
import { cn } from "~/lib/utils";
import { Card, CardContent } from "~/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { WebRTCCallControls } from "./WebRTCCallControls";
import { WebRTCDialpad } from "./WebRTCDialpad";
import { formatCallDuration } from "~/hooks/useWebRTCCalling";
import type { WebRTCCall, DTMFTone } from "~/lib/webrtc-calling";
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  Signal,
  SignalLow,
  SignalMedium,
  X,
} from "lucide-react";

export interface WebRTCCallScreenProps {
  call: WebRTCCall;
  duration: number;
  onAnswer?: () => void;
  onDecline?: () => void;
  onHangup?: () => void;
  onToggleMute?: () => void;
  onHold?: () => void;
  onResume?: () => void;
  onSendDTMF?: (tone: DTMFTone) => void;
  onClose?: () => void;
  qualityScore?: number | null;
  className?: string;
}

/**
 * Get call state display text
 */
function getCallStateText(call: WebRTCCall): string {
  switch (call.state) {
    case "idle":
      return "Initializing...";
    case "connecting":
      return "Connecting...";
    case "ringing":
      return call.direction === "inbound" ? "Incoming call" : "Ringing...";
    case "early":
      return "Ringing...";
    case "connected":
      return "Connected";
    case "hold":
      return "On Hold";
    case "disconnected":
      return "Call ended";
    case "failed":
      return "Call failed";
    default:
      return call.state;
  }
}

/**
 * Get initials from name or phone number
 */
function getInitials(name: string | null, phoneNumber: string | null): string {
  if (name) {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  if (phoneNumber) {
    return phoneNumber.slice(-2);
  }
  return "??";
}

/**
 * Get quality icon
 */
function QualityIcon({ score }: { score: number | null | undefined }) {
  if (score === null || score === undefined) return null;

  const IconComponent = score >= 4 ? Signal : score >= 2 ? SignalMedium : SignalLow;
  const color = score >= 4 ? "text-green-500" : score >= 2 ? "text-yellow-500" : "text-red-500";

  return <IconComponent className={cn("h-4 w-4", color)} />;
}

/**
 * WebRTC Call Screen
 */
export function WebRTCCallScreen({
  call,
  duration,
  onAnswer,
  onDecline,
  onHangup,
  onToggleMute,
  onHold,
  onResume,
  onSendDTMF,
  onClose,
  qualityScore,
  className,
}: WebRTCCallScreenProps) {
  const [showDialpad, setShowDialpad] = React.useState(false);

  const isRinging = call.state === "ringing";
  const isIncoming = call.direction === "inbound";
  const isConnected = call.state === "connected";
  const isEnded = call.state === "disconnected" || call.state === "failed";

  const displayName = call.remoteDisplayName || call.remotePhoneNumber || "Unknown";
  const subtitle = call.remoteDisplayName && call.remotePhoneNumber
    ? call.remotePhoneNumber
    : call.remoteUri;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 bg-background flex flex-col",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          {call.direction === "inbound" ? (
            <PhoneIncoming className="h-5 w-5 text-blue-500" />
          ) : (
            <PhoneOutgoing className="h-5 w-5 text-green-500" />
          )}
          <span className="text-sm font-medium">
            {call.direction === "inbound" ? "Incoming" : "Outgoing"} Call
          </span>
          {qualityScore !== null && <QualityIcon score={qualityScore} />}
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8">
        {/* Avatar */}
        <Avatar className="h-24 w-24 border-4 border-primary/20">
          <AvatarFallback className="text-2xl bg-primary/10">
            {getInitials(call.remoteDisplayName, call.remotePhoneNumber)}
          </AvatarFallback>
        </Avatar>

        {/* Name and number */}
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-semibold">{displayName}</h2>
          {subtitle !== displayName && (
            <p className="text-muted-foreground">{subtitle}</p>
          )}
        </div>

        {/* Call state and duration */}
        <div className="text-center space-y-2">
          <Badge
            variant={
              isConnected
                ? "default"
                : isEnded
                  ? "destructive"
                  : "secondary"
            }
            className="text-sm px-3 py-1"
          >
            {getCallStateText(call)}
          </Badge>

          {isConnected && (
            <p className="text-3xl font-mono font-semibold">
              {formatCallDuration(duration)}
            </p>
          )}

          {call.isMuted && isConnected && (
            <p className="text-sm text-muted-foreground">Muted</p>
          )}
        </div>

        {/* Dialpad (when shown) */}
        {showDialpad && isConnected && (
          <Card className="w-full max-w-xs">
            <CardContent className="p-4">
              <WebRTCDialpad
                onTonePress={onSendDTMF}
                disabled={!isConnected}
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Controls */}
      <div className="p-6 pb-10 border-t bg-muted/50">
        {/* Incoming call - show answer/decline */}
        {isIncoming && isRinging && (
          <div className="flex items-center justify-center gap-8">
            <Button
              variant="destructive"
              size="icon"
              className="h-16 w-16 rounded-full"
              onClick={onDecline}
            >
              <Phone className="h-7 w-7 rotate-[135deg]" />
            </Button>
            <Button
              variant="default"
              size="icon"
              className="h-16 w-16 rounded-full bg-green-500 hover:bg-green-600"
              onClick={onAnswer}
            >
              <Phone className="h-7 w-7" />
            </Button>
          </div>
        )}

        {/* Active call - show call controls */}
        {!isRinging && !isEnded && (
          <WebRTCCallControls
            call={call}
            onToggleMute={onToggleMute}
            onHangup={onHangup}
            onHold={call.state === "hold" ? undefined : onHold}
            onResume={call.state === "hold" ? onResume : undefined}
            onShowDialpad={() => setShowDialpad(!showDialpad)}
            size="lg"
          />
        )}

        {/* Ended call - show close */}
        {isEnded && onClose && (
          <div className="flex justify-center">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default WebRTCCallScreen;
