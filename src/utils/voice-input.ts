/**
 * Voice Input Utility Functions
 * Provides browser compatibility checks, VAD (Voice Activity Detection), and audio utilities
 */

// ============================================================================
// Types
// ============================================================================

export interface VoiceInputSupport {
  speechRecognition: boolean;
  getUserMedia: boolean;
  audioContext: boolean;
  isSupported: boolean;
  missingFeatures: string[];
}

export interface VADConfig {
  /** Threshold for voice detection (0-1, default 0.01) */
  threshold?: number;
  /** Time in ms to wait before considering speech ended (default 1500) */
  silenceTimeout?: number;
  /** Minimum time in ms of voice activity to trigger detection (default 100) */
  minVoiceDuration?: number;
  /** Sample rate for analysis (default 256) */
  fftSize?: number;
}

export interface VADState {
  isVoiceActive: boolean;
  audioLevel: number;
  isSilent: boolean;
}

// ============================================================================
// Browser Compatibility
// ============================================================================

/**
 * Get the SpeechRecognition constructor (cross-browser)
 */
export function getSpeechRecognition(): typeof SpeechRecognition | null {
  if (typeof window === "undefined") return null;

  return (
    (window as Window & { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition ||
    (window as Window & { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition ||
    null
  );
}

/**
 * Check browser support for voice input features
 */
export function checkVoiceInputSupport(): VoiceInputSupport {
  const missingFeatures: string[] = [];

  const speechRecognition = getSpeechRecognition() !== null;
  if (!speechRecognition) {
    missingFeatures.push("Speech Recognition API");
  }

  const getUserMedia =
    typeof navigator !== "undefined" &&
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === "function";
  if (!getUserMedia) {
    missingFeatures.push("MediaDevices API");
  }

  const audioContext =
    typeof window !== "undefined" &&
    (typeof AudioContext !== "undefined" ||
      typeof (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext !== "undefined");
  if (!audioContext) {
    missingFeatures.push("AudioContext API");
  }

  return {
    speechRecognition,
    getUserMedia,
    audioContext,
    isSupported: speechRecognition && getUserMedia,
    missingFeatures,
  };
}

/**
 * Get AudioContext constructor (cross-browser)
 */
export function getAudioContext(): typeof AudioContext | null {
  if (typeof window === "undefined") return null;

  return (
    (window as Window).AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ||
    null
  );
}

// ============================================================================
// Voice Activity Detection (VAD)
// ============================================================================

/**
 * Default VAD configuration
 */
export const DEFAULT_VAD_CONFIG: Required<VADConfig> = {
  threshold: 0.01,
  silenceTimeout: 1500,
  minVoiceDuration: 100,
  fftSize: 256,
};

/**
 * Create a Voice Activity Detector from a MediaStream
 * Returns cleanup function
 */
export function createVAD(
  stream: MediaStream,
  config: VADConfig = {},
  onStateChange: (state: VADState) => void
): { cleanup: () => void; analyser: AnalyserNode | null } {
  const AudioContextClass = getAudioContext();
  if (!AudioContextClass) {
    console.warn("AudioContext not supported");
    return { cleanup: () => {}, analyser: null };
  }

  const mergedConfig = { ...DEFAULT_VAD_CONFIG, ...config };
  const audioContext = new AudioContextClass();
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = mergedConfig.fftSize;

  const source = audioContext.createMediaStreamSource(stream);
  source.connect(analyser);

  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  let animationFrame: number;
  let lastVoiceTime = 0;
  let voiceStartTime = 0;
  let currentState: VADState = {
    isVoiceActive: false,
    audioLevel: 0,
    isSilent: true,
  };

  const analyze = () => {
    analyser.getByteFrequencyData(dataArray);

    // Calculate average audio level (normalized 0-1)
    const sum = dataArray.reduce((acc, val) => acc + val, 0);
    const average = sum / dataArray.length;
    const audioLevel = average / 255;

    const now = Date.now();
    const isAboveThreshold = audioLevel > mergedConfig.threshold;

    let isVoiceActive = currentState.isVoiceActive;
    let isSilent = !isAboveThreshold;

    if (isAboveThreshold) {
      if (!currentState.isVoiceActive) {
        if (voiceStartTime === 0) {
          voiceStartTime = now;
        }
        // Check if voice has been active long enough
        if (now - voiceStartTime >= mergedConfig.minVoiceDuration) {
          isVoiceActive = true;
        }
      }
      lastVoiceTime = now;
    } else {
      voiceStartTime = 0;
      // Check silence timeout
      if (currentState.isVoiceActive && now - lastVoiceTime >= mergedConfig.silenceTimeout) {
        isVoiceActive = false;
      }
    }

    const newState: VADState = { isVoiceActive, audioLevel, isSilent };

    // Only notify on state changes
    if (
      newState.isVoiceActive !== currentState.isVoiceActive ||
      Math.abs(newState.audioLevel - currentState.audioLevel) > 0.01
    ) {
      currentState = newState;
      onStateChange(newState);
    }

    animationFrame = requestAnimationFrame(analyze);
  };

  analyze();

  const cleanup = () => {
    cancelAnimationFrame(animationFrame);
    source.disconnect();
    audioContext.close();
  };

  return { cleanup, analyser };
}

// ============================================================================
// Transcript Utilities
// ============================================================================

/**
 * Clean and format transcript text
 */
export function formatTranscript(text: string): string {
  if (!text) return "";

  return text
    .trim()
    // Capitalize first letter
    .replace(/^./, (char) => char.toUpperCase())
    // Add period at end if missing punctuation
    .replace(/([^.!?])$/, "$1.");
}

/**
 * Combine interim and final transcripts intelligently
 */
export function combineTranscripts(
  finalTranscript: string,
  interimTranscript: string
): string {
  const final = finalTranscript.trim();
  const interim = interimTranscript.trim();

  if (!final && !interim) return "";
  if (!interim) return final;
  if (!final) return interim;

  // Add space between final and interim if needed
  return `${final} ${interim}`;
}

// ============================================================================
// Permission Utilities
// ============================================================================

/**
 * Request microphone permission
 * Returns the MediaStream if granted, null if denied
 */
export async function requestMicrophonePermission(): Promise<MediaStream | null> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    return stream;
  } catch (error) {
    console.error("Microphone permission denied:", error);
    return null;
  }
}

/**
 * Check microphone permission status
 */
export async function checkMicrophonePermission(): Promise<PermissionState> {
  try {
    if (navigator.permissions) {
      const result = await navigator.permissions.query({
        name: "microphone" as PermissionName,
      });
      return result.state;
    }
    // Fallback: try to access and immediately stop
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    return "granted";
  } catch {
    return "denied";
  }
}

/**
 * Stop all tracks in a MediaStream
 */
export function stopMediaStream(stream: MediaStream | null): void {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
  }
}

// ============================================================================
// Error Messages
// ============================================================================

export const VOICE_INPUT_ERRORS = {
  NOT_SUPPORTED: "Voice input is not supported in this browser. Please use Chrome, Edge, or Safari.",
  PERMISSION_DENIED: "Microphone access was denied. Please allow microphone access to use voice input.",
  NO_SPEECH: "No speech was detected. Please try again.",
  NETWORK_ERROR: "Network error occurred. Please check your connection.",
  ABORTED: "Voice input was cancelled.",
  AUDIO_CAPTURE: "Failed to capture audio. Please check your microphone.",
  UNKNOWN: "An unknown error occurred. Please try again.",
} as const;

/**
 * Get user-friendly error message from SpeechRecognition error
 */
export function getVoiceInputErrorMessage(
  error: string | SpeechRecognitionErrorCode
): string {
  switch (error) {
    case "not-allowed":
    case "permission-denied":
      return VOICE_INPUT_ERRORS.PERMISSION_DENIED;
    case "no-speech":
      return VOICE_INPUT_ERRORS.NO_SPEECH;
    case "network":
      return VOICE_INPUT_ERRORS.NETWORK_ERROR;
    case "aborted":
      return VOICE_INPUT_ERRORS.ABORTED;
    case "audio-capture":
      return VOICE_INPUT_ERRORS.AUDIO_CAPTURE;
    default:
      return VOICE_INPUT_ERRORS.UNKNOWN;
  }
}
