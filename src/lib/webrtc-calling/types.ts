/**
 * WebRTC Calling Types
 *
 * Type definitions for the WebRTC calling service using SIP.js.
 * Provides browser-based VoIP calling via WebRTC with SIP signaling.
 */

/**
 * WebRTC call states
 */
export type WebRTCCallState =
  | "idle"
  | "connecting"
  | "ringing"
  | "early"
  | "connected"
  | "hold"
  | "disconnected"
  | "failed";

/**
 * Call direction
 */
export type CallDirection = "inbound" | "outbound";

/**
 * SIP registration states
 */
export type RegistrationState =
  | "unregistered"
  | "registering"
  | "registered"
  | "unregistering"
  | "failed";

/**
 * WebRTC call end reasons
 */
export type CallEndReason =
  | "normal"
  | "busy"
  | "declined"
  | "no_answer"
  | "network_error"
  | "user_hangup"
  | "remote_hangup"
  | "failed"
  | "cancelled";

/**
 * Audio device info
 */
export interface AudioDevice {
  deviceId: string;
  label: string;
  kind: "audioinput" | "audiooutput";
}

/**
 * WebRTC configuration
 */
export interface WebRTCConfig {
  /** SIP server domain */
  sipDomain: string;
  /** SIP username */
  sipUsername: string;
  /** SIP password */
  sipPassword: string;
  /** Display name for caller ID */
  displayName?: string;
  /** WebSocket URL for SIP signaling */
  wsServer: string;
  /** ICE servers for NAT traversal */
  iceServers?: RTCIceServer[];
  /** Enable debug logging */
  debug?: boolean;
  /** Registration expiry in seconds */
  registerExpires?: number;
  /** Auto-answer incoming calls */
  autoAnswer?: boolean;
  /** Preferred audio codecs */
  audioCodecs?: string[];
}

/**
 * Active call information
 */
export interface WebRTCCall {
  /** Unique call ID */
  id: string;
  /** Current call state */
  state: WebRTCCallState;
  /** Call direction */
  direction: CallDirection;
  /** Remote party SIP URI */
  remoteUri: string;
  /** Remote party display name */
  remoteDisplayName: string | null;
  /** Remote party phone number */
  remotePhoneNumber: string | null;
  /** Call start time */
  startTime: Date | null;
  /** Call connect time */
  connectTime: Date | null;
  /** Call end time */
  endTime: Date | null;
  /** Call duration in seconds */
  duration: number;
  /** Whether call is muted */
  isMuted: boolean;
  /** Whether local audio is enabled */
  localAudioEnabled: boolean;
  /** Whether remote audio is playing */
  remoteAudioEnabled: boolean;
  /** Call end reason */
  endReason?: CallEndReason;
  /** Call quality metrics */
  qualityMetrics?: CallQualityMetrics;
}

/**
 * Call quality metrics
 */
export interface CallQualityMetrics {
  /** Audio packet loss percentage */
  packetLoss: number;
  /** Round-trip time in ms */
  rtt: number;
  /** Jitter in ms */
  jitter: number;
  /** Audio bitrate in kbps */
  bitrate: number;
  /** Timestamp of measurement */
  timestamp: Date;
}

/**
 * Service state
 */
export interface WebRTCServiceState {
  /** Whether service is initialized */
  initialized: boolean;
  /** Current registration state */
  registrationState: RegistrationState;
  /** Active calls */
  activeCalls: WebRTCCall[];
  /** Currently selected input device */
  selectedInputDevice: string | null;
  /** Currently selected output device */
  selectedOutputDevice: string | null;
  /** Available audio devices */
  audioDevices: AudioDevice[];
  /** Whether microphone is globally muted */
  isMicrophoneMuted: boolean;
  /** Last error */
  lastError: WebRTCError | null;
}

/**
 * Call options
 */
export interface MakeCallOptions {
  /** Display name for outgoing call */
  displayName?: string;
  /** Phone number (for display purposes) */
  phoneNumber?: string;
  /** Early media enabled */
  earlyMedia?: boolean;
  /** Custom headers */
  extraHeaders?: string[];
}

/**
 * Answer options
 */
export interface AnswerCallOptions {
  /** Custom headers */
  extraHeaders?: string[];
}

/**
 * Service events
 */
export interface WebRTCServiceEvents {
  /** Called when registration state changes */
  onRegistrationStateChanged?: (state: RegistrationState) => void;
  /** Called when an incoming call is received */
  onIncomingCall?: (call: WebRTCCall) => void;
  /** Called when call state changes */
  onCallStateChanged?: (call: WebRTCCall) => void;
  /** Called when a call ends */
  onCallEnded?: (call: WebRTCCall) => void;
  /** Called when an error occurs */
  onError?: (error: WebRTCError) => void;
  /** Called when audio devices change */
  onAudioDevicesChanged?: (devices: AudioDevice[]) => void;
  /** Called when call quality metrics are updated */
  onCallQualityUpdate?: (callId: string, metrics: CallQualityMetrics) => void;
}

/**
 * Result type for service operations
 */
export interface WebRTCResult<T = void> {
  success: boolean;
  data?: T;
  error?: {
    code: WebRTCErrorCode;
    message: string;
  };
}

/**
 * WebRTC error codes
 */
export enum WebRTCErrorCode {
  NOT_INITIALIZED = "NOT_INITIALIZED",
  ALREADY_INITIALIZED = "ALREADY_INITIALIZED",
  REGISTRATION_FAILED = "REGISTRATION_FAILED",
  CALL_FAILED = "CALL_FAILED",
  MEDIA_ERROR = "MEDIA_ERROR",
  NETWORK_ERROR = "NETWORK_ERROR",
  PERMISSION_DENIED = "PERMISSION_DENIED",
  INVALID_STATE = "INVALID_STATE",
  NOT_FOUND = "NOT_FOUND",
  INTERNAL_ERROR = "INTERNAL_ERROR",
  CONFIGURATION_ERROR = "CONFIGURATION_ERROR",
  BROWSER_NOT_SUPPORTED = "BROWSER_NOT_SUPPORTED",
}

/**
 * WebRTC error class
 */
export class WebRTCError extends Error {
  constructor(
    public code: WebRTCErrorCode,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "WebRTCError";
  }
}

/**
 * DTMF tones
 */
export type DTMFTone =
  | "0"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "*"
  | "#";

/**
 * Initialize result
 */
export interface InitializeResult {
  success: boolean;
  registrationState: RegistrationState;
  error?: string;
}
