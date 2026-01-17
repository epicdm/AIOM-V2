/**
 * Linphone Service
 *
 * Main service for Android integration with Linphone SDK for VoIP calling.
 * Provides a unified API for call management, audio routing, DTMF, and call history.
 */

import { nanoid } from "nanoid";
import type {
  LinphoneCoreConfig,
  LinphoneSipAccount,
  LinphoneCall,
  LinphoneCallParams,
  LinphoneCallState,
  LinphoneRegistrationState,
  LinphoneInitResult,
  LinphoneFeatures,
  LinphoneResult,
  LinphoneServiceEvents,
  LinphoneAudioRoute,
  LinphoneDtmfTone,
  LinphonePushPayload,
  LinphoneAndroidConfig,
  LinphoneCallEndReason,
  LinphoneAudioRouteType,
} from "./types";
import { LinphoneError } from "./types";
import {
  CallStateManager,
  createCallStateManager,
  ACTIVE_CALL_STATES,
} from "./call-state-manager";
import {
  AudioRouter,
  createAudioRouter,
  type AudioRouterConfig,
} from "./audio-router";
import {
  DtmfHandler,
  createDtmfHandler,
  type DtmfHandlerEvents,
} from "./dtmf-handler";
import {
  CallHistoryService,
  createCallHistoryService,
  type CallHistoryEvents,
} from "./call-history";
import {
  AndroidCallNotifications,
  createAndroidCallNotifications,
} from "./android-notifications";

/**
 * Linphone service configuration
 */
export interface LinphoneServiceConfig {
  /** Core configuration */
  core: LinphoneCoreConfig;
  /** Android-specific configuration */
  android?: LinphoneAndroidConfig;
  /** Audio router configuration */
  audioRouter?: Partial<AudioRouterConfig>;
  /** Event handlers */
  events?: Partial<LinphoneServiceEvents>;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Linphone service state
 */
export interface LinphoneServiceState {
  /** Whether the service is initialized */
  initialized: boolean;
  /** Current registration state */
  registrationState: LinphoneRegistrationState;
  /** Active calls */
  activeCalls: LinphoneCall[];
  /** Current audio route */
  audioRoute: LinphoneAudioRoute;
  /** Whether any call is active */
  hasActiveCall: boolean;
  /** Whether any call is ringing */
  hasRingingCall: boolean;
}

/**
 * Default core configuration
 */
const DEFAULT_CORE_CONFIG: Partial<LinphoneCoreConfig> = {
  transport: "TLS",
  audioCodecs: ["OPUS", "G722", "PCMU", "PCMA"],
  enableIce: true,
  enableSrtp: true,
  srtpFallback: true,
  userAgent: "AIOM-VoIP/1.0",
  logLevel: "warning",
  enableEchoCancellation: true,
  enableNoiseGate: true,
};

/**
 * Linphone Service
 *
 * Main service class that coordinates all VoIP functionality.
 */
export class LinphoneService {
  private config: LinphoneServiceConfig;
  private callStateManager: CallStateManager;
  private audioRouter: AudioRouter;
  private dtmfHandler: DtmfHandler;
  private callHistory: CallHistoryService;
  private notifications: AndroidCallNotifications;
  private events: Partial<LinphoneServiceEvents>;

  private initialized: boolean = false;
  private registrationState: LinphoneRegistrationState = "none";
  private coreVersion: string = "unknown";
  private features: LinphoneFeatures = {
    audioCall: true,
    videoCall: false,
    srtp: true,
    zrtp: true,
    ice: true,
    turn: true,
    recording: true,
    dtmf: true,
    transfer: true,
    conference: false,
  };

  constructor(config: LinphoneServiceConfig) {
    this.config = {
      ...config,
      core: { ...DEFAULT_CORE_CONFIG, ...config.core } as LinphoneCoreConfig,
    };
    this.events = config.events || {};

    // Initialize sub-services
    this.callStateManager = createCallStateManager({
      onStateChange: (event) => {
        const call = this.callStateManager.getCall(event.callId);
        if (call) {
          this.events.onCallStateChanged?.(call);
          this.updateNotificationForCall(call);
        }
      },
      onCallCreated: (call) => {
        if (call.direction === "incoming") {
          this.events.onIncomingCall?.(call);
        }
      },
      onCallRemoved: (callId) => {
        // Clean up associated resources
        this.dtmfHandler.clearCallState(callId);
        this.notifications.removeNotificationTracking(callId);
      },
    });

    this.audioRouter = createAudioRouter(config.audioRouter, {
      onRouteChanged: (event) => {
        this.events.onAudioRouteChanged?.(this.audioRouter.getAudioRoute());
      },
    });

    this.dtmfHandler = createDtmfHandler(
      {},
      {
        onDtmfReceived: (event) => {
          this.events.onDtmfReceived?.(event.callId, event.tone);
        },
      }
    );

    this.callHistory = createCallHistoryService();

    this.notifications = createAndroidCallNotifications();
    if (config.android) {
      this.notifications.initialize(config.android);
    }
  }

  /**
   * Initialize the Linphone core
   */
  async initialize(): Promise<LinphoneInitResult> {
    if (this.initialized) {
      return {
        success: true,
        version: this.coreVersion,
        features: this.features,
      };
    }

    try {
      this.log("Initializing Linphone service...");

      // Initialize native Linphone core
      // This would call into the native Android SDK
      await this.initializeNativeCore();

      // Initialize audio router
      await this.audioRouter.initialize();

      // Register SIP account
      await this.registerAccount();

      this.initialized = true;
      this.coreVersion = "5.3.0"; // Would come from native

      this.log("Linphone service initialized successfully");

      return {
        success: true,
        version: this.coreVersion,
        features: this.features,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.events.onError?.(
        new LinphoneError(
          "INITIALIZATION_FAILED",
          `Failed to initialize Linphone: ${errorMessage}`,
          { originalError: errorMessage }
        )
      );

      return {
        success: false,
        version: this.coreVersion,
        features: this.features,
        error: errorMessage,
      };
    }
  }

  /**
   * Shutdown the Linphone service
   */
  async shutdown(): Promise<void> {
    this.log("Shutting down Linphone service...");

    // End all active calls
    const activeCalls = this.callStateManager.getActiveCalls();
    for (const call of activeCalls) {
      await this.hangup(call.id);
    }

    // Unregister SIP account
    await this.unregisterAccount();

    // Clean up
    this.callStateManager.clearAllCalls();

    this.initialized = false;
    this.registrationState = "none";

    this.log("Linphone service shutdown complete");
  }

  /**
   * Get current service state
   */
  getState(): LinphoneServiceState {
    return {
      initialized: this.initialized,
      registrationState: this.registrationState,
      activeCalls: this.callStateManager.getAllCalls(),
      audioRoute: this.audioRouter.getAudioRoute(),
      hasActiveCall: this.callStateManager.hasActiveCalls(),
      hasRingingCall: this.callStateManager.getRingingCalls().length > 0,
    };
  }

  /**
   * Make an outgoing call
   */
  async makeCall(
    address: string,
    options?: {
      displayName?: string;
      phoneNumber?: string;
      params?: Partial<LinphoneCallParams>;
    }
  ): Promise<LinphoneResult<LinphoneCall>> {
    if (!this.initialized) {
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Linphone service not initialized",
        },
      };
    }

    if (this.registrationState !== "ok") {
      return {
        success: false,
        error: {
          code: "REGISTRATION_FAILED",
          message: "Not registered with SIP server",
        },
      };
    }

    try {
      this.log(`Making call to: ${address}`);

      // Create call in state manager
      const call = this.callStateManager.createOutgoingCall(
        address,
        options?.displayName || null,
        options?.phoneNumber || null,
        options?.params
      );

      // Start call audio session
      await this.audioRouter.startCallAudio();

      // Initiate call via native SDK
      await this.initiateNativeCall(call.id, address, options?.params);

      // Update state to progress
      this.callStateManager.transitionState(call.id, "outgoing_progress");

      return { success: true, data: call };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      return {
        success: false,
        error: {
          code: "CALL_FAILED",
          message: errorMessage,
        },
      };
    }
  }

  /**
   * Answer an incoming call
   */
  async answerCall(
    callId: string,
    params?: Partial<LinphoneCallParams>
  ): Promise<LinphoneResult<LinphoneCall>> {
    const call = this.callStateManager.getCall(callId);
    if (!call) {
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: `Call not found: ${callId}`,
        },
      };
    }

    if (!this.callStateManager.canAnswer(call.state)) {
      return {
        success: false,
        error: {
          code: "CALL_FAILED",
          message: `Cannot answer call in state: ${call.state}`,
        },
      };
    }

    try {
      this.log(`Answering call: ${callId}`);

      // Start call audio session
      await this.audioRouter.startCallAudio();

      // Answer via native SDK
      await this.answerNativeCall(callId, params);

      // Update state
      this.callStateManager.transitionState(callId, "connected");

      return { success: true, data: this.callStateManager.getCall(callId)! };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      return {
        success: false,
        error: {
          code: "CALL_FAILED",
          message: errorMessage,
        },
      };
    }
  }

  /**
   * Decline an incoming call
   */
  async declineCall(
    callId: string,
    reason: LinphoneCallEndReason = "declined"
  ): Promise<LinphoneResult<void>> {
    const call = this.callStateManager.getCall(callId);
    if (!call) {
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: `Call not found: ${callId}`,
        },
      };
    }

    if (!this.callStateManager.canDecline(call.state)) {
      return {
        success: false,
        error: {
          code: "CALL_FAILED",
          message: `Cannot decline call in state: ${call.state}`,
        },
      };
    }

    try {
      this.log(`Declining call: ${callId}`);

      // Decline via native SDK
      await this.declineNativeCall(callId, reason);

      // End call in state manager
      this.callStateManager.endCall(callId, reason);

      // Transition to released
      this.callStateManager.transitionState(callId, "released");

      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      return {
        success: false,
        error: {
          code: "CALL_FAILED",
          message: errorMessage,
        },
      };
    }
  }

  /**
   * Hang up a call
   */
  async hangup(callId: string): Promise<LinphoneResult<void>> {
    const call = this.callStateManager.getCall(callId);
    if (!call) {
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: `Call not found: ${callId}`,
        },
      };
    }

    if (!this.callStateManager.canHangup(call.state)) {
      return {
        success: false,
        error: {
          code: "CALL_FAILED",
          message: `Cannot hangup call in state: ${call.state}`,
        },
      };
    }

    try {
      this.log(`Hanging up call: ${callId}`);

      // Hangup via native SDK
      await this.hangupNativeCall(callId);

      // End call in state manager
      this.callStateManager.endCall(callId, "none");

      // Add to call history
      const finalCall = this.callStateManager.getCall(callId);
      if (finalCall) {
        await this.callHistory.addFromCall(finalCall);
        this.events.onCallEnded?.(finalCall);
      }

      // Transition to released
      this.callStateManager.transitionState(callId, "released");

      // Stop audio session if no more calls
      if (!this.callStateManager.hasActiveCalls()) {
        await this.audioRouter.stopCallAudio();
      }

      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      return {
        success: false,
        error: {
          code: "CALL_FAILED",
          message: errorMessage,
        },
      };
    }
  }

  /**
   * Hold a call
   */
  async holdCall(callId: string): Promise<LinphoneResult<void>> {
    const call = this.callStateManager.getCall(callId);
    if (!call || !this.callStateManager.canHold(call.state)) {
      return {
        success: false,
        error: {
          code: "CALL_FAILED",
          message: "Cannot hold call",
        },
      };
    }

    try {
      await this.holdNativeCall(callId);
      this.callStateManager.transitionState(callId, "pausing");
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "CALL_FAILED",
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Resume a held call
   */
  async resumeCall(callId: string): Promise<LinphoneResult<void>> {
    const call = this.callStateManager.getCall(callId);
    if (!call || !this.callStateManager.canResume(call.state)) {
      return {
        success: false,
        error: {
          code: "CALL_FAILED",
          message: "Cannot resume call",
        },
      };
    }

    try {
      await this.resumeNativeCall(callId);
      this.callStateManager.transitionState(callId, "resuming");
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "CALL_FAILED",
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Toggle mute on a call
   */
  async toggleMute(callId: string): Promise<LinphoneResult<boolean>> {
    const call = this.callStateManager.getCall(callId);
    if (!call) {
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: `Call not found: ${callId}`,
        },
      };
    }

    try {
      const newMuteState = !call.isMuted;
      await this.setNativeMute(callId, newMuteState);
      this.callStateManager.setMuted(callId, newMuteState);
      return { success: true, data: newMuteState };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "MEDIA_ERROR",
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Toggle speaker on a call
   */
  async toggleSpeaker(callId: string): Promise<LinphoneResult<boolean>> {
    try {
      const newSpeakerState = await this.audioRouter.toggleSpeaker();
      this.callStateManager.setSpeaker(callId, newSpeakerState);
      return { success: true, data: newSpeakerState };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "MEDIA_ERROR",
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Set audio route
   */
  async setAudioRoute(route: LinphoneAudioRouteType): Promise<LinphoneResult<void>> {
    try {
      await this.audioRouter.setRoute(route);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "MEDIA_ERROR",
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Send DTMF tone
   */
  async sendDtmf(
    callId: string,
    tone: LinphoneDtmfTone
  ): Promise<LinphoneResult<void>> {
    const call = this.callStateManager.getCall(callId);
    if (!call || !ACTIVE_CALL_STATES.includes(call.state)) {
      return {
        success: false,
        error: {
          code: "CALL_FAILED",
          message: "No active call to send DTMF",
        },
      };
    }

    try {
      await this.dtmfHandler.sendDtmf(callId, tone);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "MEDIA_ERROR",
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Send DTMF sequence (e.g., for PIN entry)
   */
  async sendDtmfSequence(
    callId: string,
    sequence: string
  ): Promise<LinphoneResult<void>> {
    try {
      await this.dtmfHandler.sendDtmfSequence(callId, sequence);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "MEDIA_ERROR",
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Start recording a call
   */
  async startRecording(callId: string): Promise<LinphoneResult<string>> {
    const call = this.callStateManager.getCall(callId);
    if (!call || !ACTIVE_CALL_STATES.includes(call.state)) {
      return {
        success: false,
        error: {
          code: "CALL_FAILED",
          message: "No active call to record",
        },
      };
    }

    try {
      const recordingPath = await this.startNativeRecording(callId);
      this.callStateManager.setRecording(callId, true, recordingPath);
      return { success: true, data: recordingPath };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "MEDIA_ERROR",
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Stop recording a call
   */
  async stopRecording(callId: string): Promise<LinphoneResult<void>> {
    try {
      await this.stopNativeRecording(callId);
      this.callStateManager.setRecording(callId, false);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "MEDIA_ERROR",
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Handle incoming call push notification
   */
  async handleIncomingCallPush(
    payload: LinphonePushPayload
  ): Promise<LinphoneResult<LinphoneCall>> {
    try {
      this.log(`Handling incoming call push: ${payload.callId}`);

      // Create incoming call in state manager
      const call = this.callStateManager.createIncomingCall(
        payload.callId,
        payload.callerAddress,
        payload.callerDisplayName,
        payload.callerPhoneNumber
      );

      // Notify listeners
      this.events.onIncomingCall?.(call);

      // Show notification
      this.updateNotificationForCall(call);

      return { success: true, data: call };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Get call history service
   */
  getCallHistory(): CallHistoryService {
    return this.callHistory;
  }

  /**
   * Get audio router
   */
  getAudioRouter(): AudioRouter {
    return this.audioRouter;
  }

  /**
   * Get DTMF handler
   */
  getDtmfHandler(): DtmfHandler {
    return this.dtmfHandler;
  }

  /**
   * Get notifications service
   */
  getNotifications(): AndroidCallNotifications {
    return this.notifications;
  }

  // ===========================================
  // Native Bridge Methods (to be implemented by native SDK)
  // ===========================================

  /**
   * Initialize the native Linphone core
   */
  private async initializeNativeCore(): Promise<void> {
    // This would call into the native Android SDK
    // via a React Native bridge or similar mechanism
    this.log("[Native] Initializing core...");
  }

  /**
   * Register SIP account
   */
  private async registerAccount(): Promise<void> {
    this.log("[Native] Registering SIP account...");
    this.registrationState = "progress";
    this.events.onRegistrationStateChanged?.(this.registrationState);

    // Simulate registration success
    this.registrationState = "ok";
    this.events.onRegistrationStateChanged?.(this.registrationState);
  }

  /**
   * Unregister SIP account
   */
  private async unregisterAccount(): Promise<void> {
    this.log("[Native] Unregistering SIP account...");
    this.registrationState = "cleared";
    this.events.onRegistrationStateChanged?.(this.registrationState);
  }

  private async initiateNativeCall(
    callId: string,
    address: string,
    params?: Partial<LinphoneCallParams>
  ): Promise<void> {
    this.log(`[Native] Initiating call ${callId} to ${address}`);
  }

  private async answerNativeCall(
    callId: string,
    params?: Partial<LinphoneCallParams>
  ): Promise<void> {
    this.log(`[Native] Answering call ${callId}`);
  }

  private async declineNativeCall(
    callId: string,
    reason: LinphoneCallEndReason
  ): Promise<void> {
    this.log(`[Native] Declining call ${callId} with reason: ${reason}`);
  }

  private async hangupNativeCall(callId: string): Promise<void> {
    this.log(`[Native] Hanging up call ${callId}`);
  }

  private async holdNativeCall(callId: string): Promise<void> {
    this.log(`[Native] Holding call ${callId}`);
  }

  private async resumeNativeCall(callId: string): Promise<void> {
    this.log(`[Native] Resuming call ${callId}`);
  }

  private async setNativeMute(callId: string, muted: boolean): Promise<void> {
    this.log(`[Native] Setting mute ${muted} on call ${callId}`);
  }

  private async startNativeRecording(callId: string): Promise<string> {
    const path = `/recordings/${callId}_${Date.now()}.wav`;
    this.log(`[Native] Starting recording for call ${callId} at ${path}`);
    return path;
  }

  private async stopNativeRecording(callId: string): Promise<void> {
    this.log(`[Native] Stopping recording for call ${callId}`);
  }

  /**
   * Update notification for a call
   */
  private updateNotificationForCall(call: LinphoneCall): void {
    const notification = this.notifications.updateNotificationForCall(call, {
      isMuted: call.isMuted,
      isSpeaker: call.isSpeakerEnabled,
    });

    if (notification) {
      // In a real implementation, this would post the notification
      // via the Android NotificationManager
      this.log(`[Notification] Updated for call ${call.id}: ${notification.title}`);
    }
  }

  /**
   * Log helper
   */
  private log(message: string): void {
    if (this.config.debug) {
      console.log(`[LinphoneService] ${message}`);
    }
  }
}

/**
 * Create a Linphone service instance
 */
export function createLinphoneService(
  config: LinphoneServiceConfig
): LinphoneService {
  return new LinphoneService(config);
}

/**
 * Singleton instance holder
 */
let linphoneServiceInstance: LinphoneService | null = null;

/**
 * Get or create the Linphone service singleton
 */
export function getLinphoneService(
  config?: LinphoneServiceConfig
): LinphoneService {
  if (!linphoneServiceInstance && config) {
    linphoneServiceInstance = createLinphoneService(config);
  }

  if (!linphoneServiceInstance) {
    throw new LinphoneError(
      "CONFIGURATION_ERROR",
      "Linphone service not initialized. Call with config first."
    );
  }

  return linphoneServiceInstance;
}

/**
 * Reset the Linphone service singleton (for testing)
 */
export async function resetLinphoneService(): Promise<void> {
  if (linphoneServiceInstance) {
    await linphoneServiceInstance.shutdown();
    linphoneServiceInstance = null;
  }
}
