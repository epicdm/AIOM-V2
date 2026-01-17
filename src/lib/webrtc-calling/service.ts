/**
 * WebRTC Calling Service
 *
 * Main service for browser-based VoIP calling using SIP.js.
 * Provides WebRTC communication with SIP signaling for browser-to-SIP bridge.
 *
 * Features:
 * - SIP registration via WebSocket
 * - Outbound and inbound call handling
 * - Audio device management
 * - Call hold/resume, mute/unmute
 * - DTMF tone sending
 * - Call quality monitoring
 */

import {
  UserAgent,
  Registerer,
  Inviter,
  Invitation,
  Session,
  SessionState,
  RegistererState,
  Web,
} from "sip.js";
import type { IncomingRequestMessage, URI } from "sip.js/lib/core";
import { nanoid } from "nanoid";
import {
  SessionManager,
  createSessionManager,
  ACTIVE_CALL_STATES,
} from "./session-manager";
import type {
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
  CallEndReason,
  CallQualityMetrics,
  InitializeResult,
} from "./types";
import { WebRTCError, WebRTCErrorCode } from "./types";

/**
 * Map SIP.js session state to our call state
 */
function mapSessionStateToCallState(
  sessionState: SessionState
): WebRTCCallState {
  switch (sessionState) {
    case SessionState.Initial:
      return "idle";
    case SessionState.Establishing:
      return "connecting";
    case SessionState.Established:
      return "connected";
    case SessionState.Terminating:
      return "disconnected";
    case SessionState.Terminated:
      return "disconnected";
    default:
      return "idle";
  }
}

/**
 * Map registerer state to our registration state
 */
function mapRegistererState(state: RegistererState): RegistrationState {
  switch (state) {
    case RegistererState.Initial:
      return "unregistered";
    case RegistererState.Registered:
      return "registered";
    case RegistererState.Unregistered:
      return "unregistered";
    case RegistererState.Terminated:
      return "unregistered";
    default:
      return "unregistered";
  }
}

/**
 * Default ICE servers
 */
const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

/**
 * WebRTC Calling Service
 */
export class WebRTCCallingService {
  private config: WebRTCConfig | null = null;
  private userAgent: UserAgent | null = null;
  private registerer: Registerer | null = null;
  private sessionManager: SessionManager;
  private sessions: Map<string, Session> = new Map();
  private events: WebRTCServiceEvents;

  private initialized: boolean = false;
  private registrationState: RegistrationState = "unregistered";
  private audioDevices: AudioDevice[] = [];
  private selectedInputDevice: string | null = null;
  private selectedOutputDevice: string | null = null;
  private isMicrophoneMuted: boolean = false;
  private lastError: WebRTCError | null = null;

  // Audio elements for playback
  private remoteAudioElement: HTMLAudioElement | null = null;
  private localStream: MediaStream | null = null;

  constructor(events: WebRTCServiceEvents = {}) {
    this.events = events;
    this.sessionManager = createSessionManager({
      onStateChange: (event) => {
        const call = this.sessionManager.getCall(event.callId);
        if (call) {
          this.events.onCallStateChanged?.(call);
        }
      },
      onCallCreated: (call) => {
        if (call.direction === "inbound") {
          this.events.onIncomingCall?.(call);
        }
      },
      onCallRemoved: (callId) => {
        // Clean up session
        this.sessions.delete(callId);
      },
    });
  }

  /**
   * Check if browser supports WebRTC
   */
  private checkBrowserSupport(): boolean {
    return !!(
      typeof window !== "undefined" &&
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === "function" &&
      window.RTCPeerConnection
    );
  }

  /**
   * Initialize the service
   */
  async initialize(config: WebRTCConfig): Promise<InitializeResult> {
    if (this.initialized) {
      return {
        success: false,
        registrationState: this.registrationState,
        error: "Service already initialized",
      };
    }

    if (!this.checkBrowserSupport()) {
      const error = new WebRTCError(
        WebRTCErrorCode.BROWSER_NOT_SUPPORTED,
        "Browser does not support WebRTC"
      );
      this.lastError = error;
      this.events.onError?.(error);
      return {
        success: false,
        registrationState: "unregistered",
        error: error.message,
      };
    }

    this.config = config;

    try {
      // Create remote audio element
      this.remoteAudioElement = document.createElement("audio");
      this.remoteAudioElement.autoplay = true;
      document.body.appendChild(this.remoteAudioElement);

      // Get available audio devices
      await this.refreshAudioDevices();

      // Create SIP User Agent
      const sipUri = `sip:${config.sipUsername}@${config.sipDomain}`;
      const wsServer = config.wsServer;

      const transportOptions = {
        server: wsServer,
        traceSip: config.debug,
      };

      const uri = UserAgent.makeURI(sipUri);
      if (!uri) {
        throw new WebRTCError(
          WebRTCErrorCode.CONFIGURATION_ERROR,
          `Invalid SIP URI: ${sipUri}`
        );
      }

      this.userAgent = new UserAgent({
        uri,
        transportOptions,
        authorizationUsername: config.sipUsername,
        authorizationPassword: config.sipPassword,
        displayName: config.displayName || config.sipUsername,
        sessionDescriptionHandlerFactoryOptions: {
          iceGatheringTimeout: 5000,
          peerConnectionConfiguration: {
            iceServers: config.iceServers || DEFAULT_ICE_SERVERS,
          },
        },
        delegate: {
          onInvite: (invitation: Invitation) => {
            this.handleIncomingCall(invitation);
          },
        },
        logLevel: config.debug ? "debug" : "error",
      });

      // Start the User Agent
      await this.userAgent.start();

      // Create and start registerer
      this.registerer = new Registerer(this.userAgent, {
        expires: config.registerExpires || 600,
      });

      // Listen for registration state changes
      this.registerer.stateChange.addListener((state) => {
        this.registrationState = mapRegistererState(state);
        this.events.onRegistrationStateChanged?.(this.registrationState);
      });

      // Register
      this.registrationState = "registering";
      this.events.onRegistrationStateChanged?.(this.registrationState);

      await this.registerer.register();

      this.initialized = true;
      this.log("WebRTC Calling Service initialized");

      return {
        success: true,
        registrationState: this.registrationState,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const webrtcError = new WebRTCError(
        WebRTCErrorCode.INTERNAL_ERROR,
        `Initialization failed: ${errorMessage}`
      );
      this.lastError = webrtcError;
      this.events.onError?.(webrtcError);

      return {
        success: false,
        registrationState: "failed",
        error: errorMessage,
      };
    }
  }

  /**
   * Shutdown the service
   */
  async shutdown(): Promise<void> {
    this.log("Shutting down WebRTC Calling Service...");

    // End all active calls
    const activeCalls = this.sessionManager.getActiveCalls();
    for (const call of activeCalls) {
      await this.hangup(call.id);
    }

    // Unregister
    if (this.registerer) {
      try {
        await this.registerer.unregister();
      } catch (error) {
        this.log(`Error unregistering: ${error}`);
      }
    }

    // Stop user agent
    if (this.userAgent) {
      try {
        await this.userAgent.stop();
      } catch (error) {
        this.log(`Error stopping user agent: ${error}`);
      }
    }

    // Clean up audio
    if (this.remoteAudioElement) {
      this.remoteAudioElement.pause();
      this.remoteAudioElement.srcObject = null;
      this.remoteAudioElement.remove();
      this.remoteAudioElement = null;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    this.sessionManager.clearAllCalls();
    this.sessions.clear();

    this.initialized = false;
    this.registrationState = "unregistered";
    this.userAgent = null;
    this.registerer = null;

    this.log("WebRTC Calling Service shutdown complete");
  }

  /**
   * Get current service state
   */
  getState(): WebRTCServiceState {
    return {
      initialized: this.initialized,
      registrationState: this.registrationState,
      activeCalls: this.sessionManager.getAllCalls(),
      selectedInputDevice: this.selectedInputDevice,
      selectedOutputDevice: this.selectedOutputDevice,
      audioDevices: this.audioDevices,
      isMicrophoneMuted: this.isMicrophoneMuted,
      lastError: this.lastError,
    };
  }

  /**
   * Make an outgoing call
   */
  async makeCall(
    destination: string,
    options?: MakeCallOptions
  ): Promise<WebRTCResult<WebRTCCall>> {
    if (!this.initialized || !this.userAgent) {
      return {
        success: false,
        error: {
          code: WebRTCErrorCode.NOT_INITIALIZED,
          message: "Service not initialized",
        },
      };
    }

    if (this.registrationState !== "registered") {
      return {
        success: false,
        error: {
          code: WebRTCErrorCode.REGISTRATION_FAILED,
          message: "Not registered with SIP server",
        },
      };
    }

    try {
      // Format destination URI
      const targetUri = destination.includes("@")
        ? `sip:${destination}`
        : `sip:${destination}@${this.config!.sipDomain}`;

      const target = UserAgent.makeURI(targetUri);
      if (!target) {
        throw new WebRTCError(
          WebRTCErrorCode.INVALID_STATE,
          `Invalid destination: ${destination}`
        );
      }

      // Create call in session manager
      const call = this.sessionManager.createOutgoingCall(
        targetUri,
        options?.displayName,
        options?.phoneNumber
      );

      // Create inviter
      const inviter = new Inviter(this.userAgent, target, {
        sessionDescriptionHandlerOptions: {
          constraints: {
            audio: true,
            video: false,
          },
        },
        extraHeaders: options?.extraHeaders,
      });

      // Store session
      this.sessions.set(call.id, inviter);

      // Set up session state change handler
      inviter.stateChange.addListener((state) => {
        this.handleSessionStateChange(call.id, state);
      });

      // Set up delegate for handling session events
      inviter.delegate = {
        onBye: () => {
          this.handleCallEnded(call.id, "remote_hangup");
        },
        onSessionDescriptionHandler: (sdh) => {
          this.setupRemoteMedia(call.id, sdh);
        },
      };

      // Initiate the call
      this.sessionManager.transitionState(call.id, "connecting");
      await inviter.invite();

      this.log(`Outgoing call initiated: ${call.id} to ${targetUri}`);

      return { success: true, data: this.sessionManager.getCall(call.id)! };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      return {
        success: false,
        error: {
          code: WebRTCErrorCode.CALL_FAILED,
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
    options?: AnswerCallOptions
  ): Promise<WebRTCResult<WebRTCCall>> {
    const call = this.sessionManager.getCall(callId);
    if (!call) {
      return {
        success: false,
        error: {
          code: WebRTCErrorCode.NOT_FOUND,
          message: `Call not found: ${callId}`,
        },
      };
    }

    if (!this.sessionManager.canAnswer(call.state)) {
      return {
        success: false,
        error: {
          code: WebRTCErrorCode.INVALID_STATE,
          message: `Cannot answer call in state: ${call.state}`,
        },
      };
    }

    const session = this.sessions.get(callId);
    if (!session || !(session instanceof Invitation)) {
      return {
        success: false,
        error: {
          code: WebRTCErrorCode.INTERNAL_ERROR,
          message: "Invalid session",
        },
      };
    }

    try {
      await session.accept({
        sessionDescriptionHandlerOptions: {
          constraints: {
            audio: true,
            video: false,
          },
        },
        extraHeaders: options?.extraHeaders,
      });

      this.log(`Call answered: ${callId}`);

      return { success: true, data: this.sessionManager.getCall(callId)! };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      return {
        success: false,
        error: {
          code: WebRTCErrorCode.CALL_FAILED,
          message: errorMessage,
        },
      };
    }
  }

  /**
   * Decline an incoming call
   */
  async declineCall(callId: string): Promise<WebRTCResult<void>> {
    const call = this.sessionManager.getCall(callId);
    if (!call) {
      return {
        success: false,
        error: {
          code: WebRTCErrorCode.NOT_FOUND,
          message: `Call not found: ${callId}`,
        },
      };
    }

    const session = this.sessions.get(callId);
    if (!session || !(session instanceof Invitation)) {
      return {
        success: false,
        error: {
          code: WebRTCErrorCode.INTERNAL_ERROR,
          message: "Invalid session",
        },
      };
    }

    try {
      await session.reject();
      this.handleCallEnded(callId, "declined");

      this.log(`Call declined: ${callId}`);

      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      return {
        success: false,
        error: {
          code: WebRTCErrorCode.CALL_FAILED,
          message: errorMessage,
        },
      };
    }
  }

  /**
   * Hang up a call
   */
  async hangup(callId: string): Promise<WebRTCResult<void>> {
    const call = this.sessionManager.getCall(callId);
    if (!call) {
      return {
        success: false,
        error: {
          code: WebRTCErrorCode.NOT_FOUND,
          message: `Call not found: ${callId}`,
        },
      };
    }

    if (!this.sessionManager.canHangup(call.state)) {
      return {
        success: false,
        error: {
          code: WebRTCErrorCode.INVALID_STATE,
          message: `Cannot hangup call in state: ${call.state}`,
        },
      };
    }

    const session = this.sessions.get(callId);
    if (!session) {
      return {
        success: false,
        error: {
          code: WebRTCErrorCode.INTERNAL_ERROR,
          message: "Session not found",
        },
      };
    }

    try {
      if (session.state === SessionState.Established) {
        await session.bye();
      } else {
        // Cancel if not yet established
        if (session instanceof Inviter) {
          await session.cancel();
        } else if (session instanceof Invitation) {
          await session.reject();
        }
      }

      this.handleCallEnded(callId, "user_hangup");

      this.log(`Call hung up: ${callId}`);

      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      return {
        success: false,
        error: {
          code: WebRTCErrorCode.CALL_FAILED,
          message: errorMessage,
        },
      };
    }
  }

  /**
   * Toggle mute on a call
   */
  async toggleMute(callId: string): Promise<WebRTCResult<boolean>> {
    const call = this.sessionManager.getCall(callId);
    if (!call) {
      return {
        success: false,
        error: {
          code: WebRTCErrorCode.NOT_FOUND,
          message: `Call not found: ${callId}`,
        },
      };
    }

    const session = this.sessions.get(callId);
    if (!session) {
      return {
        success: false,
        error: {
          code: WebRTCErrorCode.INTERNAL_ERROR,
          message: "Session not found",
        },
      };
    }

    try {
      const sdh = session.sessionDescriptionHandler;
      if (sdh && "peerConnection" in sdh) {
        const pc = (sdh as Web.SessionDescriptionHandler).peerConnection;
        if (pc) {
          const senders = pc.getSenders();
          const audioSender = senders.find(
            (sender) => sender.track?.kind === "audio"
          );
          if (audioSender?.track) {
            const newMuteState = !call.isMuted;
            audioSender.track.enabled = !newMuteState;
            this.sessionManager.setMuted(callId, newMuteState);

            this.log(`Call ${callId} mute: ${newMuteState}`);

            return { success: true, data: newMuteState };
          }
        }
      }

      return {
        success: false,
        error: {
          code: WebRTCErrorCode.MEDIA_ERROR,
          message: "Could not access audio track",
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      return {
        success: false,
        error: {
          code: WebRTCErrorCode.MEDIA_ERROR,
          message: errorMessage,
        },
      };
    }
  }

  /**
   * Hold a call
   */
  async holdCall(callId: string): Promise<WebRTCResult<void>> {
    const call = this.sessionManager.getCall(callId);
    if (!call || !this.sessionManager.canHold(call.state)) {
      return {
        success: false,
        error: {
          code: WebRTCErrorCode.INVALID_STATE,
          message: "Cannot hold call",
        },
      };
    }

    const session = this.sessions.get(callId);
    if (!session) {
      return {
        success: false,
        error: {
          code: WebRTCErrorCode.INTERNAL_ERROR,
          message: "Session not found",
        },
      };
    }

    try {
      // Put call on hold by sending re-INVITE with sendonly
      const sdh = session.sessionDescriptionHandler;
      if (sdh && session.state === SessionState.Established) {
        await session.invite({
          sessionDescriptionHandlerModifiers: [Web.holdModifier],
        });
        this.sessionManager.transitionState(callId, "hold");

        this.log(`Call held: ${callId}`);
      }

      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      return {
        success: false,
        error: {
          code: WebRTCErrorCode.CALL_FAILED,
          message: errorMessage,
        },
      };
    }
  }

  /**
   * Resume a held call
   */
  async resumeCall(callId: string): Promise<WebRTCResult<void>> {
    const call = this.sessionManager.getCall(callId);
    if (!call || !this.sessionManager.canResume(call.state)) {
      return {
        success: false,
        error: {
          code: WebRTCErrorCode.INVALID_STATE,
          message: "Cannot resume call",
        },
      };
    }

    const session = this.sessions.get(callId);
    if (!session) {
      return {
        success: false,
        error: {
          code: WebRTCErrorCode.INTERNAL_ERROR,
          message: "Session not found",
        },
      };
    }

    try {
      // Resume call by sending re-INVITE without hold modifier
      if (session.state === SessionState.Established) {
        await session.invite();
        this.sessionManager.transitionState(callId, "connected");

        this.log(`Call resumed: ${callId}`);
      }

      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      return {
        success: false,
        error: {
          code: WebRTCErrorCode.CALL_FAILED,
          message: errorMessage,
        },
      };
    }
  }

  /**
   * Send DTMF tone
   */
  async sendDTMF(callId: string, tone: DTMFTone): Promise<WebRTCResult<void>> {
    const call = this.sessionManager.getCall(callId);
    if (!call || !ACTIVE_CALL_STATES.includes(call.state)) {
      return {
        success: false,
        error: {
          code: WebRTCErrorCode.INVALID_STATE,
          message: "No active call to send DTMF",
        },
      };
    }

    const session = this.sessions.get(callId);
    if (!session) {
      return {
        success: false,
        error: {
          code: WebRTCErrorCode.INTERNAL_ERROR,
          message: "Session not found",
        },
      };
    }

    try {
      // Send DTMF using INFO method
      await session.info({
        requestOptions: {
          body: {
            contentDisposition: "render",
            contentType: "application/dtmf-relay",
            content: `Signal=${tone}\r\nDuration=100`,
          },
        },
      });

      this.log(`DTMF sent on call ${callId}: ${tone}`);

      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      return {
        success: false,
        error: {
          code: WebRTCErrorCode.CALL_FAILED,
          message: errorMessage,
        },
      };
    }
  }

  /**
   * Refresh available audio devices
   */
  async refreshAudioDevices(): Promise<AudioDevice[]> {
    try {
      // Request permission to access media devices
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const devices = await navigator.mediaDevices.enumerateDevices();
      this.audioDevices = devices
        .filter(
          (device) =>
            device.kind === "audioinput" || device.kind === "audiooutput"
        )
        .map((device) => ({
          deviceId: device.deviceId,
          label: device.label || `${device.kind} (${device.deviceId})`,
          kind: device.kind as "audioinput" | "audiooutput",
        }));

      this.events.onAudioDevicesChanged?.(this.audioDevices);

      return this.audioDevices;
    } catch (error) {
      const webrtcError = new WebRTCError(
        WebRTCErrorCode.PERMISSION_DENIED,
        "Failed to access audio devices"
      );
      this.events.onError?.(webrtcError);
      return [];
    }
  }

  /**
   * Set input audio device
   */
  async setInputDevice(deviceId: string): Promise<WebRTCResult<void>> {
    try {
      // Stop existing stream
      if (this.localStream) {
        this.localStream.getTracks().forEach((track) => track.stop());
      }

      // Get new stream with selected device
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: deviceId } },
      });

      this.selectedInputDevice = deviceId;

      // Update active calls with new audio
      for (const [callId, session] of this.sessions) {
        if (session.state === SessionState.Established) {
          const sdh = session.sessionDescriptionHandler;
          if (sdh && "peerConnection" in sdh) {
            const pc = (sdh as Web.SessionDescriptionHandler).peerConnection;
            if (pc) {
              const sender = pc
                .getSenders()
                .find((s) => s.track?.kind === "audio");
              if (sender && this.localStream.getAudioTracks()[0]) {
                await sender.replaceTrack(this.localStream.getAudioTracks()[0]);
              }
            }
          }
        }
      }

      this.log(`Input device set: ${deviceId}`);

      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      return {
        success: false,
        error: {
          code: WebRTCErrorCode.MEDIA_ERROR,
          message: errorMessage,
        },
      };
    }
  }

  /**
   * Set output audio device
   */
  async setOutputDevice(deviceId: string): Promise<WebRTCResult<void>> {
    try {
      if (this.remoteAudioElement && "setSinkId" in this.remoteAudioElement) {
        await (this.remoteAudioElement as any).setSinkId(deviceId);
        this.selectedOutputDevice = deviceId;

        this.log(`Output device set: ${deviceId}`);

        return { success: true };
      }

      return {
        success: false,
        error: {
          code: WebRTCErrorCode.BROWSER_NOT_SUPPORTED,
          message: "Output device selection not supported",
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      return {
        success: false,
        error: {
          code: WebRTCErrorCode.MEDIA_ERROR,
          message: errorMessage,
        },
      };
    }
  }

  /**
   * Handle incoming call
   */
  private handleIncomingCall(invitation: Invitation): void {
    const remoteUri = invitation.remoteIdentity.uri.toString();
    const displayName = invitation.remoteIdentity.displayName || null;

    // Extract phone number from URI
    const phoneNumber = invitation.remoteIdentity.uri.user || null;

    // Create call in session manager
    const call = this.sessionManager.createIncomingCall(
      nanoid(),
      remoteUri,
      displayName,
      phoneNumber
    );

    // Store session
    this.sessions.set(call.id, invitation);

    // Set up session state change handler
    invitation.stateChange.addListener((state) => {
      this.handleSessionStateChange(call.id, state);
    });

    // Set up delegate
    invitation.delegate = {
      onBye: () => {
        this.handleCallEnded(call.id, "remote_hangup");
      },
      onSessionDescriptionHandler: (sdh) => {
        this.setupRemoteMedia(call.id, sdh);
      },
    };

    this.log(`Incoming call: ${call.id} from ${remoteUri}`);
  }

  /**
   * Handle session state change
   */
  private handleSessionStateChange(callId: string, state: SessionState): void {
    const callState = mapSessionStateToCallState(state);
    const call = this.sessionManager.getCall(callId);

    if (call && call.state !== callState) {
      this.sessionManager.transitionState(callId, callState);

      // Set up media when established
      if (state === SessionState.Established) {
        const session = this.sessions.get(callId);
        if (session?.sessionDescriptionHandler) {
          this.setupRemoteMedia(callId, session.sessionDescriptionHandler);
        }
      }

      // Handle termination
      if (
        state === SessionState.Terminated ||
        state === SessionState.Terminating
      ) {
        this.handleCallEnded(callId, "normal");
      }
    }
  }

  /**
   * Set up remote media playback
   */
  private setupRemoteMedia(
    callId: string,
    sdh: any
  ): void {
    if ("peerConnection" in sdh) {
      const pc = (sdh as Web.SessionDescriptionHandler).peerConnection;
      if (pc && this.remoteAudioElement) {
        const remoteStream = new MediaStream();
        pc.getReceivers().forEach((receiver) => {
          if (receiver.track) {
            remoteStream.addTrack(receiver.track);
          }
        });
        this.remoteAudioElement.srcObject = remoteStream;
        this.remoteAudioElement
          .play()
          .catch((e) => this.log(`Error playing audio: ${e}`));
      }
    }
  }

  /**
   * Handle call ended
   */
  private handleCallEnded(callId: string, reason: CallEndReason): void {
    this.sessionManager.endCall(callId, reason);
    this.sessionManager.transitionState(callId, "disconnected");

    const call = this.sessionManager.getCall(callId);
    if (call) {
      this.events.onCallEnded?.(call);
    }

    // Clean up after delay
    setTimeout(() => {
      this.sessionManager.removeCall(callId);
    }, 1000);
  }

  /**
   * Start call quality monitoring
   */
  private startQualityMonitoring(callId: string): void {
    const session = this.sessions.get(callId);
    if (!session) return;

    const interval = setInterval(async () => {
      const call = this.sessionManager.getCall(callId);
      if (!call || !ACTIVE_CALL_STATES.includes(call.state)) {
        clearInterval(interval);
        return;
      }

      const sdh = session.sessionDescriptionHandler;
      if (sdh && "peerConnection" in sdh) {
        const pc = (sdh as Web.SessionDescriptionHandler).peerConnection;
        if (pc) {
          try {
            const stats = await pc.getStats();
            const metrics = this.parseQualityMetrics(stats);
            if (metrics) {
              this.sessionManager.updateQualityMetrics(callId, metrics);
              this.events.onCallQualityUpdate?.(callId, metrics);
            }
          } catch (error) {
            // Ignore stats errors
          }
        }
      }
    }, 5000);
  }

  /**
   * Parse WebRTC stats into quality metrics
   */
  private parseQualityMetrics(
    stats: RTCStatsReport
  ): CallQualityMetrics | null {
    let packetLoss = 0;
    let rtt = 0;
    let jitter = 0;
    let bitrate = 0;

    stats.forEach((stat) => {
      if (stat.type === "inbound-rtp" && stat.kind === "audio") {
        packetLoss = stat.packetsLost || 0;
        jitter = stat.jitter ? stat.jitter * 1000 : 0;
      }
      if (stat.type === "remote-inbound-rtp") {
        rtt = stat.roundTripTime ? stat.roundTripTime * 1000 : 0;
      }
      if (stat.type === "outbound-rtp" && stat.kind === "audio") {
        bitrate = stat.bytesSent
          ? (stat.bytesSent * 8) / (stat.timestamp / 1000) / 1000
          : 0;
      }
    });

    return {
      packetLoss,
      rtt,
      jitter,
      bitrate,
      timestamp: new Date(),
    };
  }

  /**
   * Log helper
   */
  private log(message: string): void {
    if (this.config?.debug) {
      console.log(`[WebRTCCallingService] ${message}`);
    }
  }
}

// Singleton instance
let webrtcCallingService: WebRTCCallingService | null = null;

/**
 * Get the WebRTC calling service instance
 */
export function getWebRTCCallingService(
  events?: WebRTCServiceEvents
): WebRTCCallingService {
  if (!webrtcCallingService) {
    webrtcCallingService = new WebRTCCallingService(events || {});
  }
  return webrtcCallingService;
}

/**
 * Reset the WebRTC calling service (for testing)
 */
export async function resetWebRTCCallingService(): Promise<void> {
  if (webrtcCallingService) {
    await webrtcCallingService.shutdown();
    webrtcCallingService = null;
  }
}

/**
 * Create a new WebRTC calling service instance
 */
export function createWebRTCCallingService(
  events?: WebRTCServiceEvents
): WebRTCCallingService {
  return new WebRTCCallingService(events || {});
}
