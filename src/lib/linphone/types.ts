/**
 * Linphone SDK Integration Types
 *
 * Type definitions for Android integration with Linphone SDK for VoIP calling
 * including call state management, audio routing, DTMF, and call history.
 */

/**
 * Linphone Core configuration for initialization
 */
export interface LinphoneCoreConfig {
  /** SIP account configuration */
  account: LinphoneSipAccount;
  /** Transport protocol to use */
  transport: LinphoneTransportProtocol;
  /** Audio codecs in order of preference */
  audioCodecs: LinphoneAudioCodec[];
  /** STUN/TURN configuration for NAT traversal */
  natTraversal?: LinphoneNatConfig;
  /** Enable ICE for NAT traversal */
  enableIce: boolean;
  /** Enable SRTP for encrypted calls */
  enableSrtp: boolean;
  /** Enable SRTP fallback to unencrypted */
  srtpFallback: boolean;
  /** Push notification token for incoming calls */
  pushNotificationToken?: string;
  /** User agent string */
  userAgent: string;
  /** Log level for debugging */
  logLevel: LinphoneLogLevel;
  /** Path to store call recordings */
  recordingsPath?: string;
  /** Enable echo cancellation */
  enableEchoCancellation: boolean;
  /** Enable noise gate */
  enableNoiseGate: boolean;
}

/**
 * SIP account configuration
 */
export interface LinphoneSipAccount {
  /** SIP username (e.g., "user123") */
  username: string;
  /** SIP password */
  password: string;
  /** SIP domain (e.g., "sip.soundstation.io") */
  domain: string;
  /** Display name for caller ID */
  displayName?: string;
  /** Associated phone number in E.164 format */
  phoneNumber?: string;
  /** SIP proxy address (optional, defaults to domain) */
  proxy?: string;
  /** Registration expiry in seconds */
  expiresSeconds: number;
  /** Enable outbound proxy */
  outboundProxyEnabled: boolean;
  /** Outbound proxy address */
  outboundProxy?: string;
}

/**
 * Transport protocol for SIP
 */
export type LinphoneTransportProtocol = "UDP" | "TCP" | "TLS" | "DTLS";

/**
 * Supported audio codecs
 */
export type LinphoneAudioCodec =
  | "OPUS"
  | "G722"
  | "PCMU"
  | "PCMA"
  | "G729"
  | "SPEEX"
  | "iLBC";

/**
 * NAT traversal configuration
 */
export interface LinphoneNatConfig {
  /** STUN server addresses */
  stunServers: string[];
  /** TURN server configuration */
  turnServers?: LinphoneTurnServer[];
  /** NAT policy type */
  policy: LinphoneNatPolicy;
}

/**
 * TURN server configuration
 */
export interface LinphoneTurnServer {
  /** TURN server URL */
  url: string;
  /** TURN username */
  username: string;
  /** TURN credential/password */
  credential: string;
  /** Credential type */
  credentialType: "password" | "oauth";
}

/**
 * NAT policy types
 */
export type LinphoneNatPolicy = "none" | "stun" | "turn" | "ice";

/**
 * Log level for Linphone SDK
 */
export type LinphoneLogLevel = "debug" | "message" | "warning" | "error" | "fatal";

/**
 * Registration state for SIP account
 */
export type LinphoneRegistrationState =
  | "none"
  | "progress"
  | "ok"
  | "cleared"
  | "failed";

/**
 * Call state enumeration matching Linphone SDK states
 */
export type LinphoneCallState =
  | "idle"
  | "incoming_received"
  | "outgoing_init"
  | "outgoing_progress"
  | "outgoing_ringing"
  | "outgoing_early_media"
  | "connected"
  | "streams_running"
  | "pausing"
  | "paused"
  | "resuming"
  | "referred"
  | "error"
  | "end"
  | "paused_by_remote"
  | "updating_by_remote"
  | "incoming_early_media"
  | "updating"
  | "released"
  | "early_updated_by_remote"
  | "early_updating";

/**
 * Call direction
 */
export type LinphoneCallDirection = "incoming" | "outgoing";

/**
 * Call end reason
 */
export type LinphoneCallEndReason =
  | "none"
  | "no_response"
  | "forbidden"
  | "declined"
  | "not_found"
  | "not_answered"
  | "busy"
  | "media"
  | "io_error"
  | "do_not_disturb"
  | "unauthorized"
  | "not_acceptable"
  | "no_match"
  | "moved_permanently"
  | "gone"
  | "temporarily_unavailable"
  | "address_incomplete"
  | "not_implemented"
  | "bad_gateway"
  | "server_timeout"
  | "unknown";

/**
 * Call quality metrics
 */
export interface LinphoneCallQuality {
  /** Average audio quality (0-5) */
  averageQuality: number;
  /** Current audio quality (0-5) */
  currentQuality: number;
  /** Round trip time in milliseconds */
  roundTripDelay: number;
  /** Jitter in milliseconds */
  jitter: number;
  /** Packet loss percentage */
  packetLoss: number;
  /** Bandwidth used in kbps */
  bandwidth: number;
  /** Codec being used */
  codec: LinphoneAudioCodec | null;
}

/**
 * Call statistics
 */
export interface LinphoneCallStats {
  /** Upload bandwidth in kbps */
  uploadBandwidth: number;
  /** Download bandwidth in kbps */
  downloadBandwidth: number;
  /** Ice connectivity state */
  iceState: LinphoneIceState;
  /** SRTP enabled status */
  srtpEnabled: boolean;
  /** ZRTP status */
  zrtpStatus?: LinphoneZrtpStatus;
}

/**
 * ICE connectivity state
 */
export type LinphoneIceState =
  | "not_activated"
  | "failed"
  | "in_progress"
  | "host_connection"
  | "reflexive_connection"
  | "relay_connection";

/**
 * ZRTP authentication status
 */
export interface LinphoneZrtpStatus {
  /** Whether ZRTP is enabled */
  enabled: boolean;
  /** Authentication string (SAS) */
  sas?: string;
  /** Whether the SAS has been verified */
  sasVerified: boolean;
  /** ZRTP cipher algorithm */
  cipher?: string;
}

/**
 * Active call information
 */
export interface LinphoneCall {
  /** Unique call identifier */
  id: string;
  /** Remote party address (SIP URI) */
  remoteAddress: string;
  /** Remote party display name */
  remoteDisplayName: string | null;
  /** Remote party phone number (if available) */
  remotePhoneNumber: string | null;
  /** Current call state */
  state: LinphoneCallState;
  /** Call direction */
  direction: LinphoneCallDirection;
  /** Call start timestamp */
  startTime: Date;
  /** Call connection timestamp (when answered) */
  connectedTime: Date | null;
  /** Call duration in seconds */
  duration: number;
  /** Whether call is muted */
  isMuted: boolean;
  /** Whether call is on speaker */
  isSpeakerEnabled: boolean;
  /** Whether call is being recorded */
  isRecording: boolean;
  /** Recording file path */
  recordingPath: string | null;
  /** Call quality metrics */
  quality: LinphoneCallQuality;
  /** Call statistics */
  stats: LinphoneCallStats;
  /** Error reason if call ended */
  endReason: LinphoneCallEndReason | null;
  /** Error message if applicable */
  errorMessage: string | null;
}

/**
 * Call parameters for making/answering calls
 */
export interface LinphoneCallParams {
  /** Enable video (not supported in this audio-only implementation) */
  enableVideo: boolean;
  /** Enable early media */
  enableEarlyMedia: boolean;
  /** Custom headers to add to INVITE */
  customHeaders?: Record<string, string>;
  /** Media encryption policy */
  mediaEncryption: LinphoneMediaEncryption;
  /** Low bandwidth mode */
  lowBandwidthMode: boolean;
}

/**
 * Media encryption mode
 */
export type LinphoneMediaEncryption = "none" | "srtp" | "zrtp" | "dtls";

/**
 * Audio route configuration
 */
export interface LinphoneAudioRoute {
  /** Current audio route */
  currentRoute: LinphoneAudioRouteType;
  /** Available routes */
  availableRoutes: LinphoneAudioRouteType[];
  /** Bluetooth device name if connected */
  bluetoothDeviceName: string | null;
  /** Headset connected status */
  isHeadsetConnected: boolean;
}

/**
 * Audio route types
 */
export type LinphoneAudioRouteType =
  | "earpiece"
  | "speaker"
  | "bluetooth"
  | "headset"
  | "headphones";

/**
 * DTMF tone types
 */
export type LinphoneDtmfTone =
  | "0" | "1" | "2" | "3" | "4"
  | "5" | "6" | "7" | "8" | "9"
  | "*" | "#" | "A" | "B" | "C" | "D";

/**
 * DTMF configuration
 */
export interface LinphoneDtmfConfig {
  /** Duration of DTMF tone in milliseconds */
  duration: number;
  /** Use SIP INFO for DTMF instead of RFC 2833 */
  useSipInfo: boolean;
  /** Play local DTMF feedback tone */
  playLocalFeedback: boolean;
}

/**
 * Call history entry
 */
export interface LinphoneCallHistoryEntry {
  /** Unique identifier */
  id: string;
  /** Remote party SIP address */
  remoteAddress: string;
  /** Remote party display name */
  remoteDisplayName: string | null;
  /** Remote party phone number */
  remotePhoneNumber: string | null;
  /** Call direction */
  direction: LinphoneCallDirection;
  /** Call start timestamp */
  startTime: Date;
  /** Call duration in seconds */
  duration: number;
  /** Whether call was answered */
  wasAnswered: boolean;
  /** Call end reason */
  endReason: LinphoneCallEndReason;
  /** Average call quality */
  quality: number;
  /** Recording URL if available */
  recordingUrl: string | null;
}

/**
 * Push notification payload for incoming calls
 */
export interface LinphonePushPayload {
  /** Call ID from SIP server */
  callId: string;
  /** Caller SIP address */
  callerAddress: string;
  /** Caller display name */
  callerDisplayName: string | null;
  /** Caller phone number */
  callerPhoneNumber: string | null;
  /** Whether this is a video call */
  isVideo: boolean;
  /** Timestamp of the push */
  timestamp: number;
  /** Custom data */
  customData?: Record<string, string>;
}

/**
 * Linphone service events
 */
export interface LinphoneServiceEvents {
  /** Fired when registration state changes */
  onRegistrationStateChanged: (state: LinphoneRegistrationState, message?: string) => void;
  /** Fired when a call state changes */
  onCallStateChanged: (call: LinphoneCall) => void;
  /** Fired when an incoming call is received */
  onIncomingCall: (call: LinphoneCall) => void;
  /** Fired when call ends */
  onCallEnded: (call: LinphoneCall) => void;
  /** Fired when audio route changes */
  onAudioRouteChanged: (route: LinphoneAudioRoute) => void;
  /** Fired when call quality changes significantly */
  onCallQualityChanged: (callId: string, quality: LinphoneCallQuality) => void;
  /** Fired when DTMF is received */
  onDtmfReceived: (callId: string, tone: LinphoneDtmfTone) => void;
  /** Fired on error */
  onError: (error: LinphoneError) => void;
}

/**
 * Linphone error types
 */
export type LinphoneErrorCode =
  | "INITIALIZATION_FAILED"
  | "REGISTRATION_FAILED"
  | "CALL_FAILED"
  | "NETWORK_ERROR"
  | "AUTHENTICATION_ERROR"
  | "MEDIA_ERROR"
  | "PERMISSION_DENIED"
  | "INVALID_CONFIG"
  | "CONFIGURATION_ERROR"
  | "INTERNAL_ERROR";

/**
 * Linphone error class
 */
export class LinphoneError extends Error {
  constructor(
    public code: LinphoneErrorCode,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "LinphoneError";
  }
}

/**
 * Result type for async operations
 */
export interface LinphoneResult<T> {
  success: boolean;
  data?: T;
  error?: {
    code: LinphoneErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Initialization result
 */
export interface LinphoneInitResult {
  /** Whether initialization succeeded */
  success: boolean;
  /** Core version string */
  version: string;
  /** Supported features */
  features: LinphoneFeatures;
  /** Error if initialization failed */
  error?: string;
}

/**
 * Supported features
 */
export interface LinphoneFeatures {
  /** Audio calling supported */
  audioCall: boolean;
  /** Video calling supported */
  videoCall: boolean;
  /** SRTP supported */
  srtp: boolean;
  /** ZRTP supported */
  zrtp: boolean;
  /** ICE supported */
  ice: boolean;
  /** TURN supported */
  turn: boolean;
  /** Call recording supported */
  recording: boolean;
  /** DTMF supported */
  dtmf: boolean;
  /** Call transfer supported */
  transfer: boolean;
  /** Conference calling supported */
  conference: boolean;
}

/**
 * Android-specific configuration
 */
export interface LinphoneAndroidConfig {
  /** Android app context reference (for native bridge) */
  appContext: string;
  /** Foreground service notification channel ID */
  notificationChannelId: string;
  /** Incoming call notification channel ID */
  incomingCallChannelId: string;
  /** Small icon resource ID for notifications */
  smallIconResourceId: number;
  /** Keep screen on during calls */
  keepScreenOn: boolean;
  /** Use proximity sensor during calls */
  useProximitySensor: boolean;
  /** Enable vibration for incoming calls */
  enableVibration: boolean;
  /** Ringtone URI */
  ringtoneUri?: string;
  /** Enable Bluetooth audio support */
  enableBluetooth: boolean;
}
