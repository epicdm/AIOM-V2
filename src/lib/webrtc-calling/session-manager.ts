/**
 * WebRTC Session Manager
 *
 * Manages WebRTC call sessions and state transitions.
 * Provides a clean abstraction over SIP.js session handling.
 */

import { nanoid } from "nanoid";
import type {
  WebRTCCall,
  WebRTCCallState,
  CallDirection,
  CallEndReason,
  CallQualityMetrics,
} from "./types";

/**
 * Valid state transitions for calls
 */
const VALID_TRANSITIONS: Record<WebRTCCallState, WebRTCCallState[]> = {
  idle: ["connecting", "ringing"],
  connecting: ["ringing", "early", "connected", "failed", "disconnected"],
  ringing: ["connecting", "early", "connected", "failed", "disconnected"],
  early: ["connected", "failed", "disconnected"],
  connected: ["hold", "disconnected", "failed"],
  hold: ["connected", "disconnected", "failed"],
  disconnected: [],
  failed: [],
};

/**
 * States that indicate an active call
 */
export const ACTIVE_CALL_STATES: WebRTCCallState[] = [
  "connecting",
  "ringing",
  "early",
  "connected",
  "hold",
];

/**
 * States where the call can be answered
 */
export const ANSWERABLE_STATES: WebRTCCallState[] = ["ringing"];

/**
 * States where the call can be hung up
 */
export const HANGUP_STATES: WebRTCCallState[] = [
  "connecting",
  "ringing",
  "early",
  "connected",
  "hold",
];

/**
 * Session manager events
 */
export interface SessionManagerEvents {
  /** Called when call state changes */
  onStateChange?: (event: {
    callId: string;
    previousState: WebRTCCallState;
    newState: WebRTCCallState;
  }) => void;
  /** Called when a call is created */
  onCallCreated?: (call: WebRTCCall) => void;
  /** Called when a call is removed */
  onCallRemoved?: (callId: string) => void;
}

/**
 * WebRTC Session Manager
 */
export class SessionManager {
  private calls: Map<string, WebRTCCall> = new Map();
  private events: SessionManagerEvents;

  constructor(events: SessionManagerEvents = {}) {
    this.events = events;
  }

  /**
   * Create an outgoing call
   */
  createOutgoingCall(
    remoteUri: string,
    displayName?: string | null,
    phoneNumber?: string | null
  ): WebRTCCall {
    const id = nanoid();
    const now = new Date();

    const call: WebRTCCall = {
      id,
      state: "idle",
      direction: "outbound",
      remoteUri,
      remoteDisplayName: displayName || null,
      remotePhoneNumber: phoneNumber || null,
      startTime: now,
      connectTime: null,
      endTime: null,
      duration: 0,
      isMuted: false,
      localAudioEnabled: true,
      remoteAudioEnabled: true,
    };

    this.calls.set(id, call);
    this.events.onCallCreated?.(call);

    return call;
  }

  /**
   * Create an incoming call
   */
  createIncomingCall(
    id: string,
    remoteUri: string,
    displayName?: string | null,
    phoneNumber?: string | null
  ): WebRTCCall {
    const now = new Date();

    const call: WebRTCCall = {
      id,
      state: "ringing",
      direction: "inbound",
      remoteUri,
      remoteDisplayName: displayName || null,
      remotePhoneNumber: phoneNumber || null,
      startTime: now,
      connectTime: null,
      endTime: null,
      duration: 0,
      isMuted: false,
      localAudioEnabled: true,
      remoteAudioEnabled: true,
    };

    this.calls.set(id, call);
    this.events.onCallCreated?.(call);

    return call;
  }

  /**
   * Transition call to a new state
   */
  transitionState(callId: string, newState: WebRTCCallState): boolean {
    const call = this.calls.get(callId);
    if (!call) {
      return false;
    }

    const validTransitions = VALID_TRANSITIONS[call.state];
    if (!validTransitions.includes(newState)) {
      console.warn(
        `[SessionManager] Invalid state transition: ${call.state} -> ${newState} for call ${callId}`
      );
      return false;
    }

    const previousState = call.state;
    call.state = newState;

    // Track connect time
    if (newState === "connected" && !call.connectTime) {
      call.connectTime = new Date();
    }

    // Track end time
    if (newState === "disconnected" || newState === "failed") {
      call.endTime = new Date();
      if (call.connectTime) {
        call.duration = Math.floor(
          (call.endTime.getTime() - call.connectTime.getTime()) / 1000
        );
      }
    }

    this.events.onStateChange?.({
      callId,
      previousState,
      newState,
    });

    return true;
  }

  /**
   * End a call
   */
  endCall(callId: string, reason: CallEndReason): void {
    const call = this.calls.get(callId);
    if (!call) {
      return;
    }

    call.endReason = reason;
    call.endTime = new Date();

    if (call.connectTime) {
      call.duration = Math.floor(
        (call.endTime.getTime() - call.connectTime.getTime()) / 1000
      );
    }
  }

  /**
   * Remove a call from tracking
   */
  removeCall(callId: string): void {
    if (this.calls.has(callId)) {
      this.calls.delete(callId);
      this.events.onCallRemoved?.(callId);
    }
  }

  /**
   * Get a call by ID
   */
  getCall(callId: string): WebRTCCall | undefined {
    return this.calls.get(callId);
  }

  /**
   * Get all calls
   */
  getAllCalls(): WebRTCCall[] {
    return Array.from(this.calls.values());
  }

  /**
   * Get active calls
   */
  getActiveCalls(): WebRTCCall[] {
    return this.getAllCalls().filter((call) =>
      ACTIVE_CALL_STATES.includes(call.state)
    );
  }

  /**
   * Get ringing calls
   */
  getRingingCalls(): WebRTCCall[] {
    return this.getAllCalls().filter((call) => call.state === "ringing");
  }

  /**
   * Check if there are active calls
   */
  hasActiveCalls(): boolean {
    return this.getActiveCalls().length > 0;
  }

  /**
   * Set call muted state
   */
  setMuted(callId: string, muted: boolean): void {
    const call = this.calls.get(callId);
    if (call) {
      call.isMuted = muted;
    }
  }

  /**
   * Set local audio enabled state
   */
  setLocalAudioEnabled(callId: string, enabled: boolean): void {
    const call = this.calls.get(callId);
    if (call) {
      call.localAudioEnabled = enabled;
    }
  }

  /**
   * Update call quality metrics
   */
  updateQualityMetrics(callId: string, metrics: CallQualityMetrics): void {
    const call = this.calls.get(callId);
    if (call) {
      call.qualityMetrics = metrics;
    }
  }

  /**
   * Check if a call can be answered
   */
  canAnswer(state: WebRTCCallState): boolean {
    return ANSWERABLE_STATES.includes(state);
  }

  /**
   * Check if a call can be hung up
   */
  canHangup(state: WebRTCCallState): boolean {
    return HANGUP_STATES.includes(state);
  }

  /**
   * Check if a call can be held
   */
  canHold(state: WebRTCCallState): boolean {
    return state === "connected";
  }

  /**
   * Check if a call can be resumed
   */
  canResume(state: WebRTCCallState): boolean {
    return state === "hold";
  }

  /**
   * Clear all calls
   */
  clearAllCalls(): void {
    const callIds = Array.from(this.calls.keys());
    for (const callId of callIds) {
      this.removeCall(callId);
    }
  }
}

/**
 * Create a session manager instance
 */
export function createSessionManager(
  events: SessionManagerEvents = {}
): SessionManager {
  return new SessionManager(events);
}
