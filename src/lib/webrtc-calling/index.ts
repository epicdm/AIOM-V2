/**
 * WebRTC Calling Module
 *
 * Browser-based VoIP calling using SIP.js for WebRTC with SIP signaling.
 * Provides a complete solution for browser-to-SIP bridge communication.
 */

export {
  WebRTCCallingService,
  getWebRTCCallingService,
  resetWebRTCCallingService,
  createWebRTCCallingService,
} from "./service";

export {
  SessionManager,
  createSessionManager,
  ACTIVE_CALL_STATES,
  ANSWERABLE_STATES,
  HANGUP_STATES,
} from "./session-manager";

export type {
  WebRTCConfig,
  WebRTCCall,
  WebRTCCallState,
  WebRTCResult,
  WebRTCServiceState,
  WebRTCServiceEvents,
  MakeCallOptions,
  AnswerCallOptions,
  RegistrationState,
  AudioDevice,
  DTMFTone,
  CallDirection,
  CallEndReason,
  CallQualityMetrics,
  InitializeResult,
} from "./types";

export { WebRTCError, WebRTCErrorCode } from "./types";
