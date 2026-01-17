/**
 * Voice Input Components
 * Export all voice input related components and types
 */

export {
  VoiceInput,
  VoiceInputButton,
  type VoiceInputProps,
  type VoiceInputButtonProps,
  type VoiceInputRenderProps,
} from "./VoiceInput";

// Re-export hook for convenience
export {
  useVoiceInput,
  type UseVoiceInputOptions,
  type UseVoiceInputReturn,
  type VoiceInputStatus,
  type VoiceInputMode,
} from "~/hooks/useVoiceInput";

// Re-export utilities for advanced usage
export {
  checkVoiceInputSupport,
  getSpeechRecognition,
  createVAD,
  formatTranscript,
  requestMicrophonePermission,
  checkMicrophonePermission,
  VOICE_INPUT_ERRORS,
  type VoiceInputSupport,
  type VADConfig,
  type VADState,
} from "~/utils/voice-input";
