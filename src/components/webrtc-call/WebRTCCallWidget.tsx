/**
 * WebRTC Call Widget Component
 *
 * Compact call widget for embedding in other pages.
 * Shows call status and basic controls.
 */

import * as React from "react";
import { cn } from "~/lib/utils";
import { Card, CardContent } from "~/components/ui/card";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { formatCallDuration } from "~/hooks/useWebRTCCalling";
import type { WebRTCCall } from "~/lib/webrtc-calling";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Pause,
  Play,
  Maximize2,
  PhoneIncoming,
  PhoneOutgoing,
} from "lucide-react";

export interface WebRTCCallWidgetProps {
  call: WebRTCCall;
  duration: number;
  onAnswer?: () => void;
  onDecline?: () => void;
  onHangup?: () => void;
  onToggleMute?: () => void;
  onHold?: () => void;
  onResume?: () => void;
  onExpand?: () => void;
  className?: string;
}

/**
 * Get call state badge variant
 */
function getStateBadgeVariant(
  state: WebRTCCall["state"]
): "default" | "secondary" | "destructive" | "outline" {
  switch (state) {
    case "connected":
      return "default";
    case "ringing":
    case "connecting":
    case "early":
      return "secondary";
    case "hold":
      return "outline";
    case "disconnected":
    case "failed":
      return "destructive";
    default:
      return "secondary";
  }
}

/**
 * Get short state text
 */
function getShortStateText(call: WebRTCCall): string {
  switch (call.state) {
    case "connecting":
      return "Calling...";
    case "ringing":
      return call.direction === "inbound" ? "Incoming" : "Ringing";
    case "early":
      return "Ringing";
    case "connected":
      return "In Call";
    case "hold":
      return "On Hold";
    case "disconnected":
      return "Ended";
    case "failed":
      return "Failed";
    default:
      return call.state;
  }
}

/**
 * WebRTC Call Widget
 */
export function WebRTCCallWidget({
  call,
  duration,
  onAnswer,
  onDecline,
  onHangup,
  onToggleMute,
  onHold,
  onResume,
  onExpand,
  className,
}: WebRTCCallWidgetProps) {
  const isRinging = call.state === "ringing";
  const isIncoming = call.direction === "inbound";
  const isConnected = call.state === "connected";
  const isOnHold = call.state === "hold";
  const isEnded = call.state === "disconnected" || call.state === "failed";

  const displayName =
    call.remoteDisplayName || call.remotePhoneNumber || "Unknown";

  return (
    <Card
      className={cn(
        "overflow-hidden",
        isRinging && isIncoming && "ring-2 ring-blue-500 ring-offset-2",
        className
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <Avatar className="h-10 w-10">
            <AvatarFallback className="text-sm">
              {displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {call.direction === "inbound" ? (
                <PhoneIncoming className="h-3.5 w-3.5 text-blue-500 shrink-0" />
              ) : (
                <PhoneOutgoing className="h-3.5 w-3.5 text-green-500 shrink-0" />
              )}
              <p className="font-medium truncate">{displayName}</p>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge
                variant={getStateBadgeVariant(call.state)}
                className="text-xs h-5"
              >
                {getShortStateText(call)}
              </Badge>
              {isConnected && (
                <span className="text-sm font-mono text-muted-foreground">
                  {formatCallDuration(duration)}
                </span>
              )}
              {call.isMuted && (
                <MicOff className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1">
            {/* Incoming ringing - answer/decline */}
            {isIncoming && isRinging && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={onDecline}
                >
                  <PhoneOff className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-green-500 hover:text-green-600 hover:bg-green-50"
                  onClick={onAnswer}
                >
                  <Phone className="h-4 w-4" />
                </Button>
              </>
            )}

            {/* Active call controls */}
            {(isConnected || isOnHold) && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-8 w-8",
                    call.isMuted && "text-red-500"
                  )}
                  onClick={onToggleMute}
                >
                  {call.isMuted ? (
                    <MicOff className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={isOnHold ? onResume : onHold}
                >
                  {isOnHold ? (
                    <Play className="h-4 w-4" />
                  ) : (
                    <Pause className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={onHangup}
                >
                  <PhoneOff className="h-4 w-4" />
                </Button>
              </>
            )}

            {/* Outgoing ringing - hangup only */}
            {!isIncoming && isRinging && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                onClick={onHangup}
              >
                <PhoneOff className="h-4 w-4" />
              </Button>
            )}

            {/* Expand button */}
            {onExpand && !isEnded && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onExpand}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default WebRTCCallWidget;
