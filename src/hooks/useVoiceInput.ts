/**
 * useVoiceInput Hook
 * React hook for voice input functionality using Web Speech API
 * Supports continuous listening, push-to-talk mode, and voice activity detection
 */

import { useState, useCallback, useRef, useEffect } from "react";
import {
  getSpeechRecognition,
  checkVoiceInputSupport,
  createVAD,
  requestMicrophonePermission,
  stopMediaStream,
  getVoiceInputErrorMessage,
  combineTranscripts,
  type VADConfig,
  type VADState,
  type VoiceInputSupport,
} from "~/utils/voice-input";

// ============================================================================
// Types
// ============================================================================

export type VoiceInputStatus =
  | "idle"
  | "requesting-permission"
  | "listening"
  | "processing"
  | "error";

export type VoiceInputMode = "continuous" | "push-to-talk";

export interface UseVoiceInputOptions {
  /** Language for speech recognition (default: 'en-US') */
  language?: string;
  /** Whether to return interim results (default: true) */
  interimResults?: boolean;
  /** Maximum alternatives to return (default: 1) */
  maxAlternatives?: number;
  /** Continuous listening mode (default: false for push-to-talk) */
  continuous?: boolean;
  /** Voice Activity Detection configuration */
  vadConfig?: VADConfig;
  /** Enable VAD for auto-stop in push-to-talk mode (default: true) */
  enableVAD?: boolean;
  /** Auto-stop after silence in ms (only when enableVAD is true, default: 2000) */
  autoStopAfterSilence?: number;
  /** Callback when transcript changes */
  onTranscript?: (transcript: string, isFinal: boolean) => void;
  /** Callback when recording starts */
  onStart?: () => void;
  /** Callback when recording stops */
  onStop?: (finalTranscript: string) => void;
  /** Callback when an error occurs */
  onError?: (error: string) => void;
  /** Callback for VAD state changes */
  onVADStateChange?: (state: VADState) => void;
}

export interface UseVoiceInputReturn {
  /** Start listening for voice input */
  startListening: () => Promise<void>;
  /** Stop listening for voice input */
  stopListening: () => void;
  /** Toggle listening state */
  toggleListening: () => Promise<void>;
  /** Current status of voice input */
  status: VoiceInputStatus;
  /** Whether currently listening */
  isListening: boolean;
  /** Current transcript (interim + final) */
  transcript: string;
  /** Final transcript only */
  finalTranscript: string;
  /** Interim transcript only */
  interimTranscript: string;
  /** Current error message if any */
  error: string | null;
  /** Clear the transcript */
  clearTranscript: () => void;
  /** Current VAD state */
  vadState: VADState;
  /** Browser support info */
  support: VoiceInputSupport;
  /** Current audio level (0-1) */
  audioLevel: number;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useVoiceInput(
  options: UseVoiceInputOptions = {}
): UseVoiceInputReturn {
  const {
    language = "en-US",
    interimResults = true,
    maxAlternatives = 1,
    continuous = false,
    vadConfig,
    enableVAD = true,
    autoStopAfterSilence = 2000,
    onTranscript,
    onStart,
    onStop,
    onError,
    onVADStateChange,
  } = options;

  // State
  const [status, setStatus] = useState<VoiceInputStatus>("idle");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [vadState, setVadState] = useState<VADState>({
    isVoiceActive: false,
    audioLevel: 0,
    isSilent: true,
  });

  // Refs
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const vadCleanupRef = useRef<(() => void) | null>(null);
  const silenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isStoppingRef = useRef(false);
  const lastSpeechTimeRef = useRef<number>(0);

  // Check browser support (memoized)
  const support = useRef(checkVoiceInputSupport()).current;

  // Computed values
  const isListening = status === "listening";
  const transcript = combineTranscripts(finalTranscript, interimTranscript);
  const audioLevel = vadState.audioLevel;

  // Cleanup function
  const cleanup = useCallback(() => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }

    if (vadCleanupRef.current) {
      vadCleanupRef.current();
      vadCleanupRef.current = null;
    }

    stopMediaStream(streamRef.current);
    streamRef.current = null;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // Ignore errors during cleanup
      }
      recognitionRef.current = null;
    }
  }, []);

  // Clear transcript
  const clearTranscript = useCallback(() => {
    setFinalTranscript("");
    setInterimTranscript("");
  }, []);

  // Handle VAD state change
  const handleVADStateChange = useCallback(
    (state: VADState) => {
      setVadState(state);
      onVADStateChange?.(state);

      // Update last speech time when voice is detected
      if (state.isVoiceActive) {
        lastSpeechTimeRef.current = Date.now();
      }

      // Auto-stop on silence in push-to-talk mode
      if (!continuous && enableVAD && !state.isVoiceActive && recognitionRef.current) {
        // Clear existing timeout
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }

        // Set new timeout for auto-stop
        silenceTimeoutRef.current = setTimeout(() => {
          if (!isStoppingRef.current && recognitionRef.current) {
            // Only auto-stop if we've had some speech
            if (lastSpeechTimeRef.current > 0) {
              stopListening();
            }
          }
        }, autoStopAfterSilence);
      }
    },
    [continuous, enableVAD, autoStopAfterSilence, onVADStateChange]
  );

  // Stop listening
  const stopListening = useCallback(() => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;

    const currentFinalTranscript = finalTranscript;

    cleanup();
    setStatus("idle");
    setInterimTranscript("");
    setVadState({ isVoiceActive: false, audioLevel: 0, isSilent: true });

    onStop?.(currentFinalTranscript);
    isStoppingRef.current = false;
  }, [cleanup, finalTranscript, onStop]);

  // Start listening
  const startListening = useCallback(async () => {
    // Check support
    if (!support.isSupported) {
      const errorMsg = `Voice input not supported: ${support.missingFeatures.join(", ")}`;
      setError(errorMsg);
      setStatus("error");
      onError?.(errorMsg);
      return;
    }

    // Clear previous state
    setError(null);
    clearTranscript();
    isStoppingRef.current = false;
    lastSpeechTimeRef.current = 0;

    try {
      setStatus("requesting-permission");

      // Request microphone permission
      const stream = await requestMicrophonePermission();
      if (!stream) {
        throw new Error("Microphone permission denied");
      }
      streamRef.current = stream;

      // Set up VAD if enabled
      if (enableVAD) {
        const { cleanup: vadCleanup } = createVAD(
          stream,
          vadConfig,
          handleVADStateChange
        );
        vadCleanupRef.current = vadCleanup;
      }

      // Create speech recognition instance
      const SpeechRecognitionClass = getSpeechRecognition();
      if (!SpeechRecognitionClass) {
        throw new Error("Speech recognition not available");
      }

      const recognition = new SpeechRecognitionClass();
      recognitionRef.current = recognition;

      // Configure recognition
      recognition.lang = language;
      recognition.interimResults = interimResults;
      recognition.maxAlternatives = maxAlternatives;
      recognition.continuous = continuous;

      // Event handlers
      recognition.onstart = () => {
        setStatus("listening");
        onStart?.();
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimText = "";
        let finalText = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const text = result[0].transcript;

          if (result.isFinal) {
            finalText += text;
          } else {
            interimText += text;
          }
        }

        if (finalText) {
          setFinalTranscript((prev) => {
            const newTranscript = prev ? `${prev} ${finalText}` : finalText;
            onTranscript?.(newTranscript, true);
            return newTranscript;
          });
          lastSpeechTimeRef.current = Date.now();
        }

        setInterimTranscript(interimText);
        if (interimText) {
          onTranscript?.(combineTranscripts(finalTranscript, interimText), false);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        // Ignore aborted errors when we're intentionally stopping
        if (event.error === "aborted" && isStoppingRef.current) {
          return;
        }

        const errorMsg = getVoiceInputErrorMessage(event.error);
        setError(errorMsg);
        setStatus("error");
        onError?.(errorMsg);
        cleanup();
      };

      recognition.onend = () => {
        // In continuous mode, restart if not intentionally stopped
        if (continuous && !isStoppingRef.current && recognitionRef.current) {
          try {
            recognition.start();
          } catch {
            // If restart fails, clean up
            setStatus("idle");
            cleanup();
          }
        } else if (!isStoppingRef.current) {
          // For non-continuous mode, finalize
          setStatus("idle");
          const currentFinalTranscript = finalTranscript || interimTranscript;
          onStop?.(currentFinalTranscript);
          cleanup();
        }
      };

      // Start recognition
      recognition.start();
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to start voice input";
      setError(errorMsg);
      setStatus("error");
      onError?.(errorMsg);
      cleanup();
    }
  }, [
    support,
    language,
    interimResults,
    maxAlternatives,
    continuous,
    enableVAD,
    vadConfig,
    clearTranscript,
    cleanup,
    handleVADStateChange,
    onStart,
    onStop,
    onError,
    onTranscript,
    finalTranscript,
    interimTranscript,
  ]);

  // Toggle listening
  const toggleListening = useCallback(async () => {
    if (isListening) {
      stopListening();
    } else {
      await startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    startListening,
    stopListening,
    toggleListening,
    status,
    isListening,
    transcript,
    finalTranscript,
    interimTranscript,
    error,
    clearTranscript,
    vadState,
    support,
    audioLevel,
  };
}

export default useVoiceInput;
