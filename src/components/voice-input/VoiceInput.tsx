/**
 * VoiceInput Component
 * A React component for voice input using Web Speech API
 * Supports speech-to-text, voice activity detection, and push-to-talk mode
 */

import { useCallback, useMemo } from "react";
import { Mic, MicOff, Loader2, AlertCircle, Volume2 } from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import {
  useVoiceInput,
  type UseVoiceInputOptions,
  type VoiceInputStatus,
} from "~/hooks/useVoiceInput";
import type { VADConfig } from "~/utils/voice-input";

// ============================================================================
// Types
// ============================================================================

export interface VoiceInputProps {
  /** Callback when transcript changes */
  onTranscript?: (transcript: string, isFinal: boolean) => void;
  /** Callback when final transcript is ready (on stop) */
  onFinalTranscript?: (transcript: string) => void;
  /** Callback when an error occurs */
  onError?: (error: string) => void;
  /** Callback when listening starts */
  onStart?: () => void;
  /** Callback when listening stops */
  onStop?: () => void;
  /** Language for speech recognition (default: 'en-US') */
  language?: string;
  /** Whether to use continuous listening mode (default: false for push-to-talk) */
  continuous?: boolean;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Custom class name */
  className?: string;
  /** Button variant */
  variant?: "default" | "outline" | "ghost" | "secondary";
  /** Button size */
  size?: "default" | "sm" | "lg" | "icon";
  /** Show audio level indicator */
  showAudioLevel?: boolean;
  /** Show transcript text below button */
  showTranscript?: boolean;
  /** Placeholder text when not listening */
  placeholder?: string;
  /** VAD configuration */
  vadConfig?: VADConfig;
  /** Enable voice activity detection (default: true) */
  enableVAD?: boolean;
  /** Auto-stop after silence duration in ms (default: 2000) */
  autoStopAfterSilence?: number;
  /** Custom render function for the button */
  renderButton?: (props: VoiceInputRenderProps) => React.ReactNode;
}

export interface VoiceInputRenderProps {
  isListening: boolean;
  status: VoiceInputStatus;
  transcript: string;
  audioLevel: number;
  error: string | null;
  onClick: () => void;
  disabled: boolean;
}

// ============================================================================
// Sub-components
// ============================================================================

interface AudioLevelIndicatorProps {
  level: number;
  isActive: boolean;
  className?: string;
}

function AudioLevelIndicator({
  level,
  isActive,
  className,
}: AudioLevelIndicatorProps) {
  // Create bars with varying heights based on audio level
  const bars = useMemo(() => {
    const count = 5;
    return Array.from({ length: count }, (_, i) => {
      const threshold = (i + 1) / count;
      const isActive = level >= threshold * 0.5; // Scale down for better visualization
      return isActive;
    });
  }, [level]);

  return (
    <div
      className={cn(
        "flex items-end gap-0.5 h-4",
        !isActive && "opacity-50",
        className
      )}
    >
      {bars.map((active, i) => (
        <div
          key={i}
          className={cn(
            "w-0.5 rounded-full transition-all duration-75",
            active ? "bg-primary" : "bg-muted-foreground/30",
            isActive && active && "animate-pulse"
          )}
          style={{
            height: `${((i + 1) / bars.length) * 100}%`,
          }}
        />
      ))}
    </div>
  );
}

interface TranscriptDisplayProps {
  transcript: string;
  isListening: boolean;
  placeholder?: string;
  className?: string;
}

function TranscriptDisplay({
  transcript,
  isListening,
  placeholder = "Click to start speaking...",
  className,
}: TranscriptDisplayProps) {
  return (
    <div
      className={cn(
        "text-sm min-h-[2.5rem] p-2 rounded-lg border bg-muted/30",
        "transition-colors",
        isListening && "border-primary/50 bg-primary/5",
        className
      )}
    >
      {transcript ? (
        <p className="text-foreground">{transcript}</p>
      ) : (
        <p className="text-muted-foreground italic">{placeholder}</p>
      )}
      {isListening && !transcript && (
        <span className="inline-flex gap-1 ml-1">
          <span className="w-1 h-1 rounded-full bg-primary animate-bounce" />
          <span
            className="w-1 h-1 rounded-full bg-primary animate-bounce"
            style={{ animationDelay: "0.1s" }}
          />
          <span
            className="w-1 h-1 rounded-full bg-primary animate-bounce"
            style={{ animationDelay: "0.2s" }}
          />
        </span>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function VoiceInput({
  onTranscript,
  onFinalTranscript,
  onError,
  onStart,
  onStop,
  language = "en-US",
  continuous = false,
  disabled = false,
  className,
  variant = "outline",
  size = "default",
  showAudioLevel = true,
  showTranscript = false,
  placeholder = "Click to start speaking...",
  vadConfig,
  enableVAD = true,
  autoStopAfterSilence = 2000,
  renderButton,
}: VoiceInputProps) {
  // Voice input hook
  const voiceInputOptions: UseVoiceInputOptions = useMemo(
    () => ({
      language,
      continuous,
      enableVAD,
      vadConfig,
      autoStopAfterSilence,
      onTranscript,
      onStart,
      onStop: (finalTranscript) => {
        onStop?.();
        if (finalTranscript) {
          onFinalTranscript?.(finalTranscript);
        }
      },
      onError,
    }),
    [
      language,
      continuous,
      enableVAD,
      vadConfig,
      autoStopAfterSilence,
      onTranscript,
      onStart,
      onStop,
      onFinalTranscript,
      onError,
    ]
  );

  const {
    toggleListening,
    status,
    isListening,
    transcript,
    error,
    audioLevel,
    support,
  } = useVoiceInput(voiceInputOptions);

  // Handle click
  const handleClick = useCallback(() => {
    if (!disabled && support.isSupported) {
      toggleListening();
    }
  }, [disabled, support.isSupported, toggleListening]);

  // Determine if button should be disabled
  const isDisabled = disabled || !support.isSupported;

  // Render props for custom button
  const renderProps: VoiceInputRenderProps = {
    isListening,
    status,
    transcript,
    audioLevel,
    error,
    onClick: handleClick,
    disabled: isDisabled,
  };

  // Custom button renderer
  if (renderButton) {
    return <>{renderButton(renderProps)}</>;
  }

  // Get button icon
  const getIcon = () => {
    switch (status) {
      case "requesting-permission":
      case "processing":
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case "listening":
        return <Mic className="h-4 w-4 text-primary" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        if (!support.isSupported) {
          return <MicOff className="h-4 w-4 text-muted-foreground" />;
        }
        return <Mic className="h-4 w-4" />;
    }
  };

  // Get button label
  const getLabel = () => {
    switch (status) {
      case "requesting-permission":
        return "Requesting permission...";
      case "listening":
        return "Listening...";
      case "processing":
        return "Processing...";
      case "error":
        return error || "Error";
      default:
        if (!support.isSupported) {
          return "Not supported";
        }
        return continuous ? "Start listening" : "Push to talk";
    }
  };

  // Button content
  const buttonContent = (
    <>
      {getIcon()}
      {size !== "icon" && <span>{getLabel()}</span>}
      {showAudioLevel && isListening && (
        <AudioLevelIndicator level={audioLevel} isActive={isListening} />
      )}
    </>
  );

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Button
        type="button"
        variant={isListening ? "default" : variant}
        size={size}
        onClick={handleClick}
        disabled={isDisabled}
        className={cn(
          "relative",
          isListening && "ring-2 ring-primary/50 ring-offset-2",
          status === "error" && "border-destructive text-destructive"
        )}
        aria-label={isListening ? "Stop listening" : "Start voice input"}
        aria-pressed={isListening}
      >
        {buttonContent}
        {/* Pulsing indicator when listening */}
        {isListening && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
          </span>
        )}
      </Button>

      {/* Error message */}
      {status === "error" && error && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}

      {/* Not supported message */}
      {!support.isSupported && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <MicOff className="h-3 w-3" />
          Voice input not supported in this browser
        </p>
      )}

      {/* Transcript display */}
      {showTranscript && (
        <TranscriptDisplay
          transcript={transcript}
          isListening={isListening}
          placeholder={placeholder}
        />
      )}
    </div>
  );
}

// ============================================================================
// Icon-only variant for compact usage
// ============================================================================

export interface VoiceInputButtonProps
  extends Omit<VoiceInputProps, "showTranscript" | "renderButton"> {
  /** Tooltip text */
  tooltip?: string;
}

export function VoiceInputButton({
  size = "icon",
  variant = "ghost",
  showAudioLevel = false,
  ...props
}: VoiceInputButtonProps) {
  return (
    <VoiceInput
      size={size}
      variant={variant}
      showAudioLevel={showAudioLevel}
      showTranscript={false}
      {...props}
    />
  );
}

export default VoiceInput;
