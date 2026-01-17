/**
 * WebRTC Dialpad Component
 *
 * DTMF dialpad for sending tones during WebRTC calls.
 */

import * as React from "react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import type { DTMFTone } from "~/lib/webrtc-calling";

export interface WebRTCDialpadProps {
  onTonePress?: (tone: DTMFTone) => void;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const DIALPAD_KEYS: { tone: DTMFTone; label: string; sublabel?: string }[][] = [
  [
    { tone: "1", label: "1", sublabel: "" },
    { tone: "2", label: "2", sublabel: "ABC" },
    { tone: "3", label: "3", sublabel: "DEF" },
  ],
  [
    { tone: "4", label: "4", sublabel: "GHI" },
    { tone: "5", label: "5", sublabel: "JKL" },
    { tone: "6", label: "6", sublabel: "MNO" },
  ],
  [
    { tone: "7", label: "7", sublabel: "PQRS" },
    { tone: "8", label: "8", sublabel: "TUV" },
    { tone: "9", label: "9", sublabel: "WXYZ" },
  ],
  [
    { tone: "*", label: "*" },
    { tone: "0", label: "0", sublabel: "+" },
    { tone: "#", label: "#" },
  ],
];

/**
 * WebRTC Dialpad
 */
export function WebRTCDialpad({
  onTonePress,
  disabled,
  className,
  size = "md",
}: WebRTCDialpadProps) {
  const buttonSize = {
    sm: "h-12 w-12",
    md: "h-14 w-14",
    lg: "h-16 w-16",
  }[size];

  const labelSize = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  }[size];

  const sublabelSize = {
    sm: "text-[8px]",
    md: "text-[10px]",
    lg: "text-xs",
  }[size];

  return (
    <div
      className={cn(
        "grid grid-cols-3 gap-3",
        className
      )}
    >
      {DIALPAD_KEYS.flat().map((key) => (
        <Button
          key={key.tone}
          variant="outline"
          size="icon"
          disabled={disabled}
          className={cn(
            buttonSize,
            "rounded-full flex flex-col items-center justify-center",
            "hover:bg-muted/80 active:scale-95 transition-transform"
          )}
          onClick={() => onTonePress?.(key.tone)}
        >
          <span className={cn(labelSize, "font-semibold leading-none")}>
            {key.label}
          </span>
          {key.sublabel && (
            <span
              className={cn(
                sublabelSize,
                "text-muted-foreground leading-none mt-0.5"
              )}
            >
              {key.sublabel}
            </span>
          )}
        </Button>
      ))}
    </div>
  );
}

export default WebRTCDialpad;
