/**
 * Linphone Call State Manager
 *
 * Manages call states, transitions, and provides call state machine logic
 * for the Linphone SDK integration.
 */

import { nanoid } from "nanoid";
import type {
  LinphoneCall,
  LinphoneCallState,
  LinphoneCallDirection,
  LinphoneCallEndReason,
  LinphoneCallQuality,
  LinphoneCallStats,
  LinphoneCallParams,
  LinphoneIceState,
} from "./types";
import { LinphoneError } from "./types";

/**
 * Valid state transitions for the call state machine
 */
const VALID_STATE_TRANSITIONS: Record<LinphoneCallState, LinphoneCallState[]> = {
  idle: ["incoming_received", "outgoing_init"],
  incoming_received: ["connected", "end", "incoming_early_media"],
  incoming_early_media: ["connected", "end"],
  outgoing_init: ["outgoing_progress", "end", "error"],
  outgoing_progress: ["outgoing_ringing", "outgoing_early_media", "connected", "end", "error"],
  outgoing_ringing: ["outgoing_early_media", "connected", "end", "error"],
  outgoing_early_media: ["connected", "end", "error"],
  connected: ["streams_running", "pausing", "end", "error", "updating", "updating_by_remote"],
  streams_running: ["pausing", "end", "error", "updating", "updating_by_remote", "referred"],
  pausing: ["paused", "end", "error"],
  paused: ["resuming", "end", "error", "paused_by_remote"],
  paused_by_remote: ["resuming", "end", "error", "streams_running"],
  resuming: ["streams_running", "end", "error"],
  referred: ["end", "error"],
  updating: ["streams_running", "end", "error"],
  updating_by_remote: ["streams_running", "end", "error"],
  early_updated_by_remote: ["connected", "end", "error"],
  early_updating: ["connected", "end", "error"],
  error: ["end", "released"],
  end: ["released"],
  released: [],
};

/**
 * States that indicate an active call
 */
export const ACTIVE_CALL_STATES: LinphoneCallState[] = [
  "connected",
  "streams_running",
  "pausing",
  "paused",
  "resuming",
  "updating",
  "updating_by_remote",
];

/**
 * States that indicate the call is ringing
 */
export const RINGING_STATES: LinphoneCallState[] = [
  "incoming_received",
  "incoming_early_media",
  "outgoing_ringing",
  "outgoing_early_media",
];

/**
 * Call state change event
 */
export interface CallStateChangeEvent {
  callId: string;
  previousState: LinphoneCallState;
  newState: LinphoneCallState;
  timestamp: Date;
  reason?: string;
}

/**
 * Call state manager event handlers
 */
export interface CallStateManagerEvents {
  onStateChange?: (event: CallStateChangeEvent) => void;
  onCallCreated?: (call: LinphoneCall) => void;
  onCallUpdated?: (call: LinphoneCall) => void;
  onCallRemoved?: (callId: string) => void;
}

/**
 * Default call quality values
 */
const DEFAULT_CALL_QUALITY: LinphoneCallQuality = {
  averageQuality: 0,
  currentQuality: 0,
  roundTripDelay: 0,
  jitter: 0,
  packetLoss: 0,
  bandwidth: 0,
  codec: null,
};

/**
 * Default call stats values
 */
const DEFAULT_CALL_STATS: LinphoneCallStats = {
  uploadBandwidth: 0,
  downloadBandwidth: 0,
  iceState: "not_activated",
  srtpEnabled: false,
};

/**
 * Call State Manager
 *
 * Manages the lifecycle of calls and provides state machine logic
 * for call state transitions.
 */
export class CallStateManager {
  private calls: Map<string, LinphoneCall> = new Map();
  private events: CallStateManagerEvents;
  private stateHistory: Map<string, CallStateChangeEvent[]> = new Map();

  constructor(events: CallStateManagerEvents = {}) {
    this.events = events;
  }

  /**
   * Create a new outgoing call
   */
  createOutgoingCall(
    remoteAddress: string,
    displayName: string | null,
    phoneNumber: string | null,
    params?: Partial<LinphoneCallParams>
  ): LinphoneCall {
    const callId = nanoid();
    const now = new Date();

    const call: LinphoneCall = {
      id: callId,
      remoteAddress,
      remoteDisplayName: displayName,
      remotePhoneNumber: phoneNumber,
      state: "outgoing_init",
      direction: "outgoing",
      startTime: now,
      connectedTime: null,
      duration: 0,
      isMuted: false,
      isSpeakerEnabled: false,
      isRecording: false,
      recordingPath: null,
      quality: { ...DEFAULT_CALL_QUALITY },
      stats: { ...DEFAULT_CALL_STATS },
      endReason: null,
      errorMessage: null,
    };

    this.calls.set(callId, call);
    this.initializeStateHistory(callId, "idle", "outgoing_init");
    this.events.onCallCreated?.(call);

    return call;
  }

  /**
   * Create a new incoming call
   */
  createIncomingCall(
    callId: string,
    remoteAddress: string,
    displayName: string | null,
    phoneNumber: string | null
  ): LinphoneCall {
    const now = new Date();

    const call: LinphoneCall = {
      id: callId,
      remoteAddress,
      remoteDisplayName: displayName,
      remotePhoneNumber: phoneNumber,
      state: "incoming_received",
      direction: "incoming",
      startTime: now,
      connectedTime: null,
      duration: 0,
      isMuted: false,
      isSpeakerEnabled: false,
      isRecording: false,
      recordingPath: null,
      quality: { ...DEFAULT_CALL_QUALITY },
      stats: { ...DEFAULT_CALL_STATS },
      endReason: null,
      errorMessage: null,
    };

    this.calls.set(callId, call);
    this.initializeStateHistory(callId, "idle", "incoming_received");
    this.events.onCallCreated?.(call);

    return call;
  }

  /**
   * Get a call by ID
   */
  getCall(callId: string): LinphoneCall | undefined {
    return this.calls.get(callId);
  }

  /**
   * Get all active calls
   */
  getActiveCalls(): LinphoneCall[] {
    return Array.from(this.calls.values()).filter((call) =>
      ACTIVE_CALL_STATES.includes(call.state)
    );
  }

  /**
   * Get all ringing calls (incoming or outgoing)
   */
  getRingingCalls(): LinphoneCall[] {
    return Array.from(this.calls.values()).filter((call) =>
      RINGING_STATES.includes(call.state)
    );
  }

  /**
   * Get all calls
   */
  getAllCalls(): LinphoneCall[] {
    return Array.from(this.calls.values());
  }

  /**
   * Check if there are any active calls
   */
  hasActiveCalls(): boolean {
    return this.getActiveCalls().length > 0;
  }

  /**
   * Transition a call to a new state
   */
  transitionState(
    callId: string,
    newState: LinphoneCallState,
    reason?: string
  ): LinphoneCall {
    const call = this.calls.get(callId);
    if (!call) {
      throw new LinphoneError(
        "INTERNAL_ERROR",
        `Call not found: ${callId}`,
        { callId }
      );
    }

    const previousState = call.state;

    // Validate state transition
    if (!this.isValidTransition(previousState, newState)) {
      throw new LinphoneError(
        "INTERNAL_ERROR",
        `Invalid state transition from ${previousState} to ${newState}`,
        { callId, previousState, newState }
      );
    }

    // Update state
    call.state = newState;

    // Handle state-specific logic
    this.handleStateChange(call, previousState, newState, reason);

    // Record state change
    this.recordStateChange(callId, previousState, newState, reason);

    // Notify listeners
    this.events.onStateChange?.({
      callId,
      previousState,
      newState,
      timestamp: new Date(),
      reason,
    });
    this.events.onCallUpdated?.(call);

    // Remove call if released
    if (newState === "released") {
      this.calls.delete(callId);
      this.events.onCallRemoved?.(callId);
    }

    return call;
  }

  /**
   * Update call quality metrics
   */
  updateCallQuality(callId: string, quality: Partial<LinphoneCallQuality>): void {
    const call = this.calls.get(callId);
    if (!call) return;

    call.quality = { ...call.quality, ...quality };
    this.events.onCallUpdated?.(call);
  }

  /**
   * Update call statistics
   */
  updateCallStats(callId: string, stats: Partial<LinphoneCallStats>): void {
    const call = this.calls.get(callId);
    if (!call) return;

    call.stats = { ...call.stats, ...stats };
    this.events.onCallUpdated?.(call);
  }

  /**
   * Set call mute state
   */
  setMuted(callId: string, muted: boolean): void {
    const call = this.calls.get(callId);
    if (!call) return;

    call.isMuted = muted;
    this.events.onCallUpdated?.(call);
  }

  /**
   * Set speaker state
   */
  setSpeaker(callId: string, enabled: boolean): void {
    const call = this.calls.get(callId);
    if (!call) return;

    call.isSpeakerEnabled = enabled;
    this.events.onCallUpdated?.(call);
  }

  /**
   * Set recording state
   */
  setRecording(callId: string, recording: boolean, path?: string): void {
    const call = this.calls.get(callId);
    if (!call) return;

    call.isRecording = recording;
    if (path) {
      call.recordingPath = path;
    }
    this.events.onCallUpdated?.(call);
  }

  /**
   * Update call duration
   */
  updateDuration(callId: string): void {
    const call = this.calls.get(callId);
    if (!call || !call.connectedTime) return;

    call.duration = Math.floor(
      (Date.now() - call.connectedTime.getTime()) / 1000
    );
  }

  /**
   * End a call with reason
   */
  endCall(callId: string, reason: LinphoneCallEndReason, errorMessage?: string): void {
    const call = this.calls.get(callId);
    if (!call) return;

    call.endReason = reason;
    if (errorMessage) {
      call.errorMessage = errorMessage;
    }

    // Update duration one final time
    this.updateDuration(callId);

    // Transition to end state
    this.transitionState(callId, "end", reason);
  }

  /**
   * Get state history for a call
   */
  getStateHistory(callId: string): CallStateChangeEvent[] {
    return this.stateHistory.get(callId) || [];
  }

  /**
   * Get human-readable state description
   */
  getStateDescription(state: LinphoneCallState): string {
    const descriptions: Record<LinphoneCallState, string> = {
      idle: "Idle",
      incoming_received: "Incoming call",
      incoming_early_media: "Incoming call (early media)",
      outgoing_init: "Initiating call",
      outgoing_progress: "Calling",
      outgoing_ringing: "Ringing",
      outgoing_early_media: "Ringing (early media)",
      connected: "Connected",
      streams_running: "In call",
      pausing: "Putting on hold",
      paused: "On hold",
      paused_by_remote: "Held by remote",
      resuming: "Resuming",
      referred: "Call transferred",
      updating: "Updating call",
      updating_by_remote: "Remote updating call",
      early_updated_by_remote: "Early update by remote",
      early_updating: "Early updating",
      error: "Error",
      end: "Call ended",
      released: "Released",
    };
    return descriptions[state] || state;
  }

  /**
   * Check if a state indicates the call can accept user actions
   */
  canAcceptActions(state: LinphoneCallState): boolean {
    return ACTIVE_CALL_STATES.includes(state) || RINGING_STATES.includes(state);
  }

  /**
   * Check if the call is in a state where it can be answered
   */
  canAnswer(state: LinphoneCallState): boolean {
    return state === "incoming_received" || state === "incoming_early_media";
  }

  /**
   * Check if the call is in a state where it can be declined
   */
  canDecline(state: LinphoneCallState): boolean {
    return state === "incoming_received" || state === "incoming_early_media";
  }

  /**
   * Check if the call is in a state where it can be hung up
   */
  canHangup(state: LinphoneCallState): boolean {
    return (
      ACTIVE_CALL_STATES.includes(state) ||
      state === "outgoing_init" ||
      state === "outgoing_progress" ||
      state === "outgoing_ringing"
    );
  }

  /**
   * Check if the call is in a state where it can be held
   */
  canHold(state: LinphoneCallState): boolean {
    return state === "streams_running" || state === "connected";
  }

  /**
   * Check if the call is in a state where it can be resumed
   */
  canResume(state: LinphoneCallState): boolean {
    return state === "paused" || state === "paused_by_remote";
  }

  /**
   * Clear all calls (for cleanup)
   */
  clearAllCalls(): void {
    this.calls.clear();
    this.stateHistory.clear();
  }

  /**
   * Check if state transition is valid
   */
  private isValidTransition(
    from: LinphoneCallState,
    to: LinphoneCallState
  ): boolean {
    const validTransitions = VALID_STATE_TRANSITIONS[from];
    return validTransitions?.includes(to) || false;
  }

  /**
   * Handle state-specific logic on state change
   */
  private handleStateChange(
    call: LinphoneCall,
    previousState: LinphoneCallState,
    newState: LinphoneCallState,
    reason?: string
  ): void {
    switch (newState) {
      case "connected":
      case "streams_running":
        // Set connected time if transitioning to connected state
        if (!call.connectedTime) {
          call.connectedTime = new Date();
        }
        break;

      case "end":
        // Ensure end reason is set
        if (!call.endReason && reason) {
          call.endReason = reason as LinphoneCallEndReason;
        }
        break;
    }
  }

  /**
   * Initialize state history for a new call
   */
  private initializeStateHistory(
    callId: string,
    from: LinphoneCallState,
    to: LinphoneCallState
  ): void {
    this.stateHistory.set(callId, [
      {
        callId,
        previousState: from,
        newState: to,
        timestamp: new Date(),
      },
    ]);
  }

  /**
   * Record a state change in history
   */
  private recordStateChange(
    callId: string,
    from: LinphoneCallState,
    to: LinphoneCallState,
    reason?: string
  ): void {
    const history = this.stateHistory.get(callId) || [];
    history.push({
      callId,
      previousState: from,
      newState: to,
      timestamp: new Date(),
      reason,
    });
    this.stateHistory.set(callId, history);
  }
}

/**
 * Create a call state manager instance
 */
export function createCallStateManager(
  events?: CallStateManagerEvents
): CallStateManager {
  return new CallStateManager(events);
}
