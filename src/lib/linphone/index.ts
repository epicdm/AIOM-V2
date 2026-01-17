/**
 * Linphone SDK Integration Module
 *
 * Android integration with Linphone SDK for VoIP calling including:
 * - Call state management
 * - Audio routing
 * - DTMF handling
 * - Call history
 * - Android notifications
 *
 * @module linphone
 */

// Types
export type {
  LinphoneCoreConfig,
  LinphoneSipAccount,
  LinphoneTransportProtocol,
  LinphoneAudioCodec,
  LinphoneNatConfig,
  LinphoneTurnServer,
  LinphoneNatPolicy,
  LinphoneLogLevel,
  LinphoneRegistrationState,
  LinphoneCallState,
  LinphoneCallDirection,
  LinphoneCallEndReason,
  LinphoneCallQuality,
  LinphoneCallStats,
  LinphoneIceState,
  LinphoneZrtpStatus,
  LinphoneCall,
  LinphoneCallParams,
  LinphoneMediaEncryption,
  LinphoneAudioRoute,
  LinphoneAudioRouteType,
  LinphoneDtmfTone,
  LinphoneDtmfConfig,
  LinphoneCallHistoryEntry,
  LinphonePushPayload,
  LinphoneServiceEvents,
  LinphoneErrorCode,
  LinphoneResult,
  LinphoneInitResult,
  LinphoneFeatures,
  LinphoneAndroidConfig,
} from "./types";

export { LinphoneError } from "./types";

// Call State Manager
export {
  CallStateManager,
  createCallStateManager,
  ACTIVE_CALL_STATES,
  RINGING_STATES,
} from "./call-state-manager";
export type {
  CallStateChangeEvent,
  CallStateManagerEvents,
} from "./call-state-manager";

// Audio Router
export {
  AudioRouter,
  createAudioRouter,
  getRouteDisplayName,
  getRouteIconName,
} from "./audio-router";
export type {
  AudioRouteChangeEvent,
  AudioRouteChangeReason,
  AudioRouterConfig,
  AudioRouterEvents,
} from "./audio-router";

// DTMF Handler
export {
  DtmfHandler,
  createDtmfHandler,
  VALID_DTMF_TONES,
  getKeypadTone,
  getKeypadLayout,
} from "./dtmf-handler";
export type {
  DtmfSentEvent,
  DtmfReceivedEvent,
  DtmfMethod,
  DtmfHandlerEvents,
} from "./dtmf-handler";

// Call History
export {
  CallHistoryService,
  createCallHistoryService,
  formatCallDuration,
  formatCallTime,
  getEndReasonDisplayText,
} from "./call-history";
export type {
  CallHistorySyncResult,
  CallHistorySyncError,
  CallHistoryQueryOptions,
  CallHistoryStats,
  CallHistoryEvents,
  SyncToBackendFn,
  FetchFromBackendFn,
} from "./call-history";

// Android Notifications
export {
  AndroidCallNotifications,
  createAndroidCallNotifications,
  getCallNotificationChannels,
  CALL_NOTIFICATION_CHANNELS,
} from "./android-notifications";
export type {
  CallNotificationType,
  CallNotificationConfig,
} from "./android-notifications";

// Main Service
export {
  LinphoneService,
  createLinphoneService,
  getLinphoneService,
  resetLinphoneService,
} from "./service";
export type {
  LinphoneServiceConfig,
  LinphoneServiceState,
} from "./service";
