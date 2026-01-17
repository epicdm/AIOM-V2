/**
 * WebRTC Call Controls Component
 *
 * UI controls for managing WebRTC calls including mute, hold, and hangup.
 */

import * as React from "react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Tooltip } from "~/components/ui/tooltip";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Pause,
  Play,
  Grid3X3,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { WebRTCCall } from "~/lib/webrtc-calling";

export interface WebRTCCallControlsProps {
  call: WebRTCCall;
  onToggleMute?: () => void;
  onHangup?: () => void;
  onHold?: () => void;
  onResume?: () => void;
  onShowDialpad?: () => void;
  className?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * WebRTC Call Controls
 */
export function WebRTCCallControls({
  call,
  onToggleMute,
  onHangup,
  onHold,
  onResume,
  onShowDialpad,
  className,
  size = "md",
}: WebRTCCallControlsProps) {
  const isConnected = call.state === "connected";
  const isOnHold = call.state === "hold";
  const isRinging = call.state === "ringing";
  const isIncoming = call.direction === "inbound" && isRinging;

  const buttonSize = {
    sm: "h-10 w-10",
    md: "h-12 w-12",
    lg: "h-14 w-14",
  }[size];

  const iconSize = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  }[size];

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-4",
        className
      )}
    >
      {/* Mute Button */}
      {(isConnected || isOnHold) && (
        <Tooltip content={call.isMuted ? "Unmute" : "Mute"}>
          <Button
            variant={call.isMuted ? "destructive" : "secondary"}
            size="icon"
            className={cn(buttonSize, "rounded-full")}
            onClick={onToggleMute}
          >
            {call.isMuted ? (
              <MicOff className={iconSize} />
            ) : (
              <Mic className={iconSize} />
            )}
          </Button>
        </Tooltip>
      )}

      {/* Hold/Resume Button */}
      {(isConnected || isOnHold) && (
        <Tooltip content={isOnHold ? "Resume" : "Hold"}>
          <Button
            variant={isOnHold ? "default" : "secondary"}
            size="icon"
            className={cn(buttonSize, "rounded-full")}
            onClick={isOnHold ? onResume : onHold}
          >
            {isOnHold ? (
              <Play className={iconSize} />
            ) : (
              <Pause className={iconSize} />
            )}
          </Button>
        </Tooltip>
      )}

      {/* Dialpad Button */}
      {isConnected && onShowDialpad && (
        <Tooltip content="Dialpad">
          <Button
            variant="secondary"
            size="icon"
            className={cn(buttonSize, "rounded-full")}
            onClick={onShowDialpad}
          >
            <Grid3X3 className={iconSize} />
          </Button>
        </Tooltip>
      )}

      {/* Hangup Button */}
      <Tooltip content={isIncoming ? "Decline" : "Hang up"}>
        <Button
          variant="destructive"
          size="icon"
          className={cn(
            buttonSize,
            "rounded-full",
            size === "lg" && "h-16 w-16"
          )}
          onClick={onHangup}
        >
          <PhoneOff className={iconSize} />
        </Button>
      </Tooltip>
    </div>
  );
}

export default WebRTCCallControls;
