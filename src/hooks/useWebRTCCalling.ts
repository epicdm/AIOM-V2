/**
 * WebRTC Calling Hooks
 *
 * React hooks for WebRTC calling functionality.
 * Provides easy integration of browser-based VoIP calling into React components.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getWebRTCCallingService,
  createWebRTCCallingService,
  type WebRTCCallingService,
  type WebRTCConfig,
  type WebRTCCall,
  type WebRTCCallState,
  type WebRTCServiceState,
  type RegistrationState,
  type AudioDevice,
  type DTMFTone,
  type MakeCallOptions,
  type AnswerCallOptions,
  type CallQualityMetrics,
} from "~/lib/webrtc-calling";

/**
 * Hook for managing WebRTC calling service
 */
export function useWebRTCCalling() {
  const [state, setState] = useState<WebRTCServiceState>({
    initialized: false,
    registrationState: "unregistered",
    activeCalls: [],
    selectedInputDevice: null,
    selectedOutputDevice: null,
    audioDevices: [],
    isMicrophoneMuted: false,
    lastError: null,
  });

  const serviceRef = useRef<WebRTCCallingService | null>(null);

  // Update state from service
  const updateState = useCallback(() => {
    if (serviceRef.current) {
      setState(serviceRef.current.getState());
    }
  }, []);

  // Initialize the service
  const initialize = useCallback(async (config: WebRTCConfig) => {
    if (serviceRef.current) {
      // Already initialized
      return serviceRef.current.getState();
    }

    const service = createWebRTCCallingService({
      onRegistrationStateChanged: (registrationState) => {
        setState((prev) => ({ ...prev, registrationState }));
      },
      onIncomingCall: (call) => {
        setState((prev) => ({
          ...prev,
          activeCalls: [...prev.activeCalls, call],
        }));
      },
      onCallStateChanged: (call) => {
        setState((prev) => ({
          ...prev,
          activeCalls: prev.activeCalls.map((c) =>
            c.id === call.id ? call : c
          ),
        }));
      },
      onCallEnded: (call) => {
        setState((prev) => ({
          ...prev,
          activeCalls: prev.activeCalls.filter((c) => c.id !== call.id),
        }));
      },
      onError: (error) => {
        setState((prev) => ({ ...prev, lastError: error }));
      },
      onAudioDevicesChanged: (audioDevices) => {
        setState((prev) => ({ ...prev, audioDevices }));
      },
    });

    serviceRef.current = service;

    const result = await service.initialize(config);

    if (result.success) {
      setState(service.getState());
    }

    return result;
  }, []);

  // Shutdown the service
  const shutdown = useCallback(async () => {
    if (serviceRef.current) {
      await serviceRef.current.shutdown();
      serviceRef.current = null;
      setState({
        initialized: false,
        registrationState: "unregistered",
        activeCalls: [],
        selectedInputDevice: null,
        selectedOutputDevice: null,
        audioDevices: [],
        isMicrophoneMuted: false,
        lastError: null,
      });
    }
  }, []);

  // Make a call
  const makeCall = useCallback(
    async (destination: string, options?: MakeCallOptions) => {
      if (!serviceRef.current) {
        return {
          success: false,
          error: { code: "NOT_INITIALIZED" as const, message: "Service not initialized" },
        };
      }
      const result = await serviceRef.current.makeCall(destination, options);
      updateState();
      return result;
    },
    [updateState]
  );

  // Answer a call
  const answerCall = useCallback(
    async (callId: string, options?: AnswerCallOptions) => {
      if (!serviceRef.current) {
        return {
          success: false,
          error: { code: "NOT_INITIALIZED" as const, message: "Service not initialized" },
        };
      }
      const result = await serviceRef.current.answerCall(callId, options);
      updateState();
      return result;
    },
    [updateState]
  );

  // Decline a call
  const declineCall = useCallback(
    async (callId: string) => {
      if (!serviceRef.current) {
        return {
          success: false,
          error: { code: "NOT_INITIALIZED" as const, message: "Service not initialized" },
        };
      }
      const result = await serviceRef.current.declineCall(callId);
      updateState();
      return result;
    },
    [updateState]
  );

  // Hang up a call
  const hangup = useCallback(
    async (callId: string) => {
      if (!serviceRef.current) {
        return {
          success: false,
          error: { code: "NOT_INITIALIZED" as const, message: "Service not initialized" },
        };
      }
      const result = await serviceRef.current.hangup(callId);
      updateState();
      return result;
    },
    [updateState]
  );

  // Toggle mute
  const toggleMute = useCallback(
    async (callId: string) => {
      if (!serviceRef.current) {
        return {
          success: false,
          error: { code: "NOT_INITIALIZED" as const, message: "Service not initialized" },
        };
      }
      return serviceRef.current.toggleMute(callId);
    },
    []
  );

  // Hold call
  const holdCall = useCallback(
    async (callId: string) => {
      if (!serviceRef.current) {
        return {
          success: false,
          error: { code: "NOT_INITIALIZED" as const, message: "Service not initialized" },
        };
      }
      const result = await serviceRef.current.holdCall(callId);
      updateState();
      return result;
    },
    [updateState]
  );

  // Resume call
  const resumeCall = useCallback(
    async (callId: string) => {
      if (!serviceRef.current) {
        return {
          success: false,
          error: { code: "NOT_INITIALIZED" as const, message: "Service not initialized" },
        };
      }
      const result = await serviceRef.current.resumeCall(callId);
      updateState();
      return result;
    },
    [updateState]
  );

  // Send DTMF
  const sendDTMF = useCallback(
    async (callId: string, tone: DTMFTone) => {
      if (!serviceRef.current) {
        return {
          success: false,
          error: { code: "NOT_INITIALIZED" as const, message: "Service not initialized" },
        };
      }
      return serviceRef.current.sendDTMF(callId, tone);
    },
    []
  );

  // Refresh audio devices
  const refreshAudioDevices = useCallback(async () => {
    if (!serviceRef.current) {
      return [];
    }
    const devices = await serviceRef.current.refreshAudioDevices();
    updateState();
    return devices;
  }, [updateState]);

  // Set input device
  const setInputDevice = useCallback(
    async (deviceId: string) => {
      if (!serviceRef.current) {
        return {
          success: false,
          error: { code: "NOT_INITIALIZED" as const, message: "Service not initialized" },
        };
      }
      const result = await serviceRef.current.setInputDevice(deviceId);
      updateState();
      return result;
    },
    [updateState]
  );

  // Set output device
  const setOutputDevice = useCallback(
    async (deviceId: string) => {
      if (!serviceRef.current) {
        return {
          success: false,
          error: { code: "NOT_INITIALIZED" as const, message: "Service not initialized" },
        };
      }
      const result = await serviceRef.current.setOutputDevice(deviceId);
      updateState();
      return result;
    },
    [updateState]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (serviceRef.current) {
        serviceRef.current.shutdown();
      }
    };
  }, []);

  return {
    // State
    ...state,

    // Actions
    initialize,
    shutdown,
    makeCall,
    answerCall,
    declineCall,
    hangup,
    toggleMute,
    holdCall,
    resumeCall,
    sendDTMF,
    refreshAudioDevices,
    setInputDevice,
    setOutputDevice,
  };
}

/**
 * Hook for tracking a specific call
 */
export function useWebRTCCall(callId: string | undefined) {
  const { activeCalls, toggleMute, hangup, holdCall, resumeCall, sendDTMF } =
    useWebRTCCalling();

  const call = callId
    ? activeCalls.find((c) => c.id === callId)
    : undefined;

  const [duration, setDuration] = useState(0);

  // Track call duration
  useEffect(() => {
    if (!call?.connectTime) {
      setDuration(0);
      return;
    }

    const interval = setInterval(() => {
      if (call.connectTime) {
        const now = new Date();
        setDuration(
          Math.floor((now.getTime() - call.connectTime.getTime()) / 1000)
        );
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [call?.connectTime]);

  return {
    call,
    duration,
    isConnected: call?.state === "connected",
    isRinging: call?.state === "ringing",
    isOnHold: call?.state === "hold",
    isMuted: call?.isMuted ?? false,
    toggleMute: callId ? () => toggleMute(callId) : undefined,
    hangup: callId ? () => hangup(callId) : undefined,
    hold: callId ? () => holdCall(callId) : undefined,
    resume: callId ? () => resumeCall(callId) : undefined,
    sendDTMF: callId
      ? (tone: DTMFTone) => sendDTMF(callId, tone)
      : undefined,
  };
}

/**
 * Hook for managing audio devices
 */
export function useWebRTCAudioDevices() {
  const {
    audioDevices,
    selectedInputDevice,
    selectedOutputDevice,
    refreshAudioDevices,
    setInputDevice,
    setOutputDevice,
  } = useWebRTCCalling();

  const inputDevices = audioDevices.filter((d) => d.kind === "audioinput");
  const outputDevices = audioDevices.filter((d) => d.kind === "audiooutput");

  // Listen for device changes
  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.mediaDevices) {
      const handleDeviceChange = () => {
        refreshAudioDevices();
      };

      navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);

      return () => {
        navigator.mediaDevices.removeEventListener(
          "devicechange",
          handleDeviceChange
        );
      };
    }
  }, [refreshAudioDevices]);

  return {
    inputDevices,
    outputDevices,
    selectedInputDevice,
    selectedOutputDevice,
    refreshDevices: refreshAudioDevices,
    setInputDevice,
    setOutputDevice,
  };
}

/**
 * Hook for call quality monitoring
 */
export function useCallQuality(callId: string | undefined) {
  const [metrics, setMetrics] = useState<CallQualityMetrics | null>(null);

  // In a full implementation, this would subscribe to quality updates
  // For now, return the metrics from the call state
  const { activeCalls } = useWebRTCCalling();
  const call = callId
    ? activeCalls.find((c) => c.id === callId)
    : undefined;

  useEffect(() => {
    if (call?.qualityMetrics) {
      setMetrics(call.qualityMetrics);
    }
  }, [call?.qualityMetrics]);

  const quality = metrics
    ? calculateQualityScore(metrics)
    : null;

  return {
    metrics,
    quality,
    isGood: quality !== null && quality >= 4,
    isFair: quality !== null && quality >= 2 && quality < 4,
    isPoor: quality !== null && quality < 2,
  };
}

/**
 * Calculate a quality score from metrics (1-5)
 */
function calculateQualityScore(metrics: CallQualityMetrics): number {
  let score = 5;

  // Deduct for packet loss
  if (metrics.packetLoss > 0) {
    score -= Math.min(metrics.packetLoss * 0.1, 2);
  }

  // Deduct for high RTT
  if (metrics.rtt > 100) {
    score -= Math.min((metrics.rtt - 100) / 100, 1.5);
  }

  // Deduct for high jitter
  if (metrics.jitter > 30) {
    score -= Math.min((metrics.jitter - 30) / 50, 1);
  }

  return Math.max(1, Math.round(score * 10) / 10);
}

/**
 * Format call duration as MM:SS or HH:MM:SS
 */
export function formatCallDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }

  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}
