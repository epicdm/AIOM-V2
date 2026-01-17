/**
 * Linphone Audio Router
 *
 * Manages audio routing for VoIP calls including speaker, earpiece,
 * Bluetooth, and headset routing on Android devices.
 */

import type {
  LinphoneAudioRoute,
  LinphoneAudioRouteType,
} from "./types";
import { LinphoneError } from "./types";

/**
 * Audio route change event
 */
export interface AudioRouteChangeEvent {
  previousRoute: LinphoneAudioRouteType;
  newRoute: LinphoneAudioRouteType;
  reason: AudioRouteChangeReason;
  timestamp: Date;
}

/**
 * Reason for audio route change
 */
export type AudioRouteChangeReason =
  | "user_action"
  | "bluetooth_connected"
  | "bluetooth_disconnected"
  | "headset_connected"
  | "headset_disconnected"
  | "category_change"
  | "override"
  | "unknown";

/**
 * Audio router event handlers
 */
export interface AudioRouterEvents {
  onRouteChanged?: (event: AudioRouteChangeEvent) => void;
  onBluetoothStateChanged?: (connected: boolean, deviceName?: string) => void;
  onHeadsetStateChanged?: (connected: boolean) => void;
  onAudioFocusChanged?: (hasFocus: boolean) => void;
}

/**
 * Audio router configuration
 */
export interface AudioRouterConfig {
  /** Default route when call starts */
  defaultRoute: LinphoneAudioRouteType;
  /** Automatically switch to Bluetooth when available */
  autoSwitchToBluetooth: boolean;
  /** Automatically switch to headset when connected */
  autoSwitchToHeadset: boolean;
  /** Enable proximity sensor to switch between speaker and earpiece */
  useProximitySensor: boolean;
  /** Enable audio ducking for other audio sources */
  enableAudioDucking: boolean;
}

/**
 * Default audio router configuration
 */
const DEFAULT_CONFIG: AudioRouterConfig = {
  defaultRoute: "earpiece",
  autoSwitchToBluetooth: true,
  autoSwitchToHeadset: true,
  useProximitySensor: true,
  enableAudioDucking: true,
};

/**
 * Audio Router
 *
 * Manages audio routing for VoIP calls with support for multiple
 * output devices and automatic switching.
 */
export class AudioRouter {
  private config: AudioRouterConfig;
  private events: AudioRouterEvents;
  private currentRoute: LinphoneAudioRouteType;
  private availableRoutes: Set<LinphoneAudioRouteType>;
  private bluetoothDeviceName: string | null = null;
  private isHeadsetConnected: boolean = false;
  private isBluetoothConnected: boolean = false;
  private hasAudioFocus: boolean = false;
  private isCallActive: boolean = false;

  constructor(
    config: Partial<AudioRouterConfig> = {},
    events: AudioRouterEvents = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.events = events;
    this.currentRoute = this.config.defaultRoute;
    this.availableRoutes = new Set<LinphoneAudioRouteType>(["earpiece", "speaker"]);
  }

  /**
   * Initialize the audio router
   */
  async initialize(): Promise<void> {
    // Detect available routes
    await this.detectAvailableRoutes();
  }

  /**
   * Start audio session for a call
   */
  async startCallAudio(): Promise<void> {
    this.isCallActive = true;

    // Request audio focus
    await this.requestAudioFocus();

    // Set initial route based on connected devices
    await this.setOptimalRoute();
  }

  /**
   * Stop audio session when call ends
   */
  async stopCallAudio(): Promise<void> {
    this.isCallActive = false;

    // Release audio focus
    await this.releaseAudioFocus();

    // Reset to default state
    this.currentRoute = this.config.defaultRoute;
  }

  /**
   * Get current audio route information
   */
  getAudioRoute(): LinphoneAudioRoute {
    return {
      currentRoute: this.currentRoute,
      availableRoutes: Array.from(this.availableRoutes),
      bluetoothDeviceName: this.bluetoothDeviceName,
      isHeadsetConnected: this.isHeadsetConnected,
    };
  }

  /**
   * Set audio route to a specific device
   */
  async setRoute(route: LinphoneAudioRouteType): Promise<void> {
    if (!this.availableRoutes.has(route)) {
      throw new LinphoneError(
        "MEDIA_ERROR",
        `Audio route not available: ${route}`,
        { route, availableRoutes: Array.from(this.availableRoutes) }
      );
    }

    const previousRoute = this.currentRoute;
    this.currentRoute = route;

    // Apply route to native audio system
    await this.applyRoute(route);

    // Notify listeners
    this.events.onRouteChanged?.({
      previousRoute,
      newRoute: route,
      reason: "user_action",
      timestamp: new Date(),
    });
  }

  /**
   * Toggle speaker on/off
   */
  async toggleSpeaker(): Promise<boolean> {
    if (this.currentRoute === "speaker") {
      // Switch back to earpiece or connected device
      const targetRoute = this.getDefaultNonSpeakerRoute();
      await this.setRoute(targetRoute);
      return false;
    } else {
      await this.setRoute("speaker");
      return true;
    }
  }

  /**
   * Enable speaker mode
   */
  async enableSpeaker(): Promise<void> {
    await this.setRoute("speaker");
  }

  /**
   * Disable speaker mode (switch to earpiece or connected device)
   */
  async disableSpeaker(): Promise<void> {
    const targetRoute = this.getDefaultNonSpeakerRoute();
    await this.setRoute(targetRoute);
  }

  /**
   * Check if speaker is currently active
   */
  isSpeakerActive(): boolean {
    return this.currentRoute === "speaker";
  }

  /**
   * Handle Bluetooth device connection
   */
  async onBluetoothConnected(deviceName: string): Promise<void> {
    this.isBluetoothConnected = true;
    this.bluetoothDeviceName = deviceName;
    this.availableRoutes.add("bluetooth");

    this.events.onBluetoothStateChanged?.(true, deviceName);

    // Auto-switch if configured and call is active
    if (this.config.autoSwitchToBluetooth && this.isCallActive) {
      await this.setRoute("bluetooth");
    }
  }

  /**
   * Handle Bluetooth device disconnection
   */
  async onBluetoothDisconnected(): Promise<void> {
    const wasUsingBluetooth = this.currentRoute === "bluetooth";

    this.isBluetoothConnected = false;
    this.bluetoothDeviceName = null;
    this.availableRoutes.delete("bluetooth");

    this.events.onBluetoothStateChanged?.(false);

    // Switch to alternative route if was using Bluetooth
    if (wasUsingBluetooth && this.isCallActive) {
      const targetRoute = this.getDefaultNonSpeakerRoute();
      this.currentRoute = targetRoute;
      await this.applyRoute(targetRoute);

      this.events.onRouteChanged?.({
        previousRoute: "bluetooth",
        newRoute: targetRoute,
        reason: "bluetooth_disconnected",
        timestamp: new Date(),
      });
    }
  }

  /**
   * Handle headset connection
   */
  async onHeadsetConnected(): Promise<void> {
    this.isHeadsetConnected = true;
    this.availableRoutes.add("headset");

    this.events.onHeadsetStateChanged?.(true);

    // Auto-switch if configured and call is active
    if (this.config.autoSwitchToHeadset && this.isCallActive) {
      await this.setRoute("headset");
    }
  }

  /**
   * Handle headset disconnection
   */
  async onHeadsetDisconnected(): Promise<void> {
    const wasUsingHeadset = this.currentRoute === "headset";

    this.isHeadsetConnected = false;
    this.availableRoutes.delete("headset");
    this.availableRoutes.delete("headphones");

    this.events.onHeadsetStateChanged?.(false);

    // Switch to alternative route if was using headset
    if (wasUsingHeadset && this.isCallActive) {
      const targetRoute = this.getDefaultNonSpeakerRoute();
      this.currentRoute = targetRoute;
      await this.applyRoute(targetRoute);

      this.events.onRouteChanged?.({
        previousRoute: "headset",
        newRoute: targetRoute,
        reason: "headset_disconnected",
        timestamp: new Date(),
      });
    }
  }

  /**
   * Handle proximity sensor state change
   */
  async onProximityChanged(isNear: boolean): Promise<void> {
    if (!this.config.useProximitySensor || !this.isCallActive) {
      return;
    }

    // Only affect earpiece/speaker switching
    if (
      this.currentRoute !== "earpiece" &&
      this.currentRoute !== "speaker"
    ) {
      return;
    }

    // When phone is near face, use earpiece; when far, could use speaker
    // This is typically handled by the native layer, but we track state here
  }

  /**
   * Get audio focus state
   */
  hasAudioFocusState(): boolean {
    return this.hasAudioFocus;
  }

  /**
   * Get available audio routes
   */
  getAvailableRoutes(): LinphoneAudioRouteType[] {
    return Array.from(this.availableRoutes);
  }

  /**
   * Check if a specific route is available
   */
  isRouteAvailable(route: LinphoneAudioRouteType): boolean {
    return this.availableRoutes.has(route);
  }

  /**
   * Get current route
   */
  getCurrentRoute(): LinphoneAudioRouteType {
    return this.currentRoute;
  }

  /**
   * Detect available audio routes from the device
   */
  private async detectAvailableRoutes(): Promise<void> {
    // Base routes always available
    this.availableRoutes.clear();
    this.availableRoutes.add("earpiece");
    this.availableRoutes.add("speaker");

    // Check for Bluetooth (would be detected via native bridge)
    if (this.isBluetoothConnected) {
      this.availableRoutes.add("bluetooth");
    }

    // Check for headset (would be detected via native bridge)
    if (this.isHeadsetConnected) {
      this.availableRoutes.add("headset");
    }
  }

  /**
   * Set optimal audio route based on connected devices
   */
  private async setOptimalRoute(): Promise<void> {
    let targetRoute: LinphoneAudioRouteType = this.config.defaultRoute;

    // Priority: Bluetooth > Headset > Earpiece
    if (this.isBluetoothConnected && this.config.autoSwitchToBluetooth) {
      targetRoute = "bluetooth";
    } else if (this.isHeadsetConnected && this.config.autoSwitchToHeadset) {
      targetRoute = "headset";
    }

    if (this.availableRoutes.has(targetRoute)) {
      this.currentRoute = targetRoute;
      await this.applyRoute(targetRoute);
    }
  }

  /**
   * Get default non-speaker route
   */
  private getDefaultNonSpeakerRoute(): LinphoneAudioRouteType {
    // Priority: Bluetooth > Headset > Earpiece
    if (this.isBluetoothConnected) {
      return "bluetooth";
    }
    if (this.isHeadsetConnected) {
      return "headset";
    }
    return "earpiece";
  }

  /**
   * Apply audio route to the native audio system
   * This method provides the interface for the Android native bridge
   */
  private async applyRoute(route: LinphoneAudioRouteType): Promise<void> {
    // This would call into the native Android audio manager
    // For the TypeScript interface, we define the expected behavior

    // The native implementation would:
    // 1. Request appropriate audio focus
    // 2. Configure AudioManager for voice call mode
    // 3. Set speaker/earpiece/Bluetooth SCO accordingly
    // 4. Handle Bluetooth SCO connection if needed

    console.log(`[AudioRouter] Applying route: ${route}`);
  }

  /**
   * Request audio focus for voice call
   */
  private async requestAudioFocus(): Promise<void> {
    // This would call into the Android AudioManager
    // to request AUDIOFOCUS_GAIN_TRANSIENT_EXCLUSIVE

    this.hasAudioFocus = true;
    this.events.onAudioFocusChanged?.(true);

    console.log("[AudioRouter] Requested audio focus");
  }

  /**
   * Release audio focus
   */
  private async releaseAudioFocus(): Promise<void> {
    // This would release the audio focus held by the app

    this.hasAudioFocus = false;
    this.events.onAudioFocusChanged?.(false);

    console.log("[AudioRouter] Released audio focus");
  }
}

/**
 * Create an audio router instance
 */
export function createAudioRouter(
  config?: Partial<AudioRouterConfig>,
  events?: AudioRouterEvents
): AudioRouter {
  return new AudioRouter(config, events);
}

/**
 * Get human-readable route name
 */
export function getRouteDisplayName(route: LinphoneAudioRouteType): string {
  const names: Record<LinphoneAudioRouteType, string> = {
    earpiece: "Phone",
    speaker: "Speaker",
    bluetooth: "Bluetooth",
    headset: "Headset",
    headphones: "Headphones",
  };
  return names[route] || route;
}

/**
 * Get route icon name for UI
 */
export function getRouteIconName(route: LinphoneAudioRouteType): string {
  const icons: Record<LinphoneAudioRouteType, string> = {
    earpiece: "ic_phone",
    speaker: "ic_volume_up",
    bluetooth: "ic_bluetooth_audio",
    headset: "ic_headset",
    headphones: "ic_headphones",
  };
  return icons[route] || "ic_audio";
}
