/**
 * Feature Flag Event Emitter
 *
 * Event-driven architecture for real-time feature flag updates:
 * - Pub/sub pattern for flag change events
 * - Support for SSE client connections
 * - Event filtering by flag name or user
 */

import type {
  FeatureFlagEvent,
  FeatureFlagEventType,
  FeatureFlagEventListener,
  SSEClient,
} from "./types";
import type { FeatureFlag, UserRole } from "~/db/schema";
import { nanoid } from "nanoid";

// =============================================================================
// Event Emitter Class
// =============================================================================

export class FeatureFlagEventEmitter {
  private listeners: Map<string, Set<FeatureFlagEventListener>> = new Map();
  private globalListeners: Set<FeatureFlagEventListener> = new Set();
  private sseClients: Map<string, SSEClient> = new Map();
  private eventHistory: FeatureFlagEvent[] = [];
  private maxHistorySize: number = 100;

  // ==========================================================================
  // Event Subscription
  // ==========================================================================

  /**
   * Subscribe to all feature flag events
   */
  onAny(listener: FeatureFlagEventListener): () => void {
    this.globalListeners.add(listener);
    return () => {
      this.globalListeners.delete(listener);
    };
  }

  /**
   * Subscribe to events for a specific flag
   */
  onFlag(flagName: string, listener: FeatureFlagEventListener): () => void {
    if (!this.listeners.has(flagName)) {
      this.listeners.set(flagName, new Set());
    }
    this.listeners.get(flagName)!.add(listener);

    return () => {
      const flagListeners = this.listeners.get(flagName);
      if (flagListeners) {
        flagListeners.delete(listener);
        if (flagListeners.size === 0) {
          this.listeners.delete(flagName);
        }
      }
    };
  }

  /**
   * Subscribe to specific event types
   */
  on(
    eventType: FeatureFlagEventType,
    listener: FeatureFlagEventListener
  ): () => void {
    const wrappedListener: FeatureFlagEventListener = (event) => {
      if (event.type === eventType) {
        listener(event);
      }
    };
    this.globalListeners.add(wrappedListener);

    return () => {
      this.globalListeners.delete(wrappedListener);
    };
  }

  // ==========================================================================
  // Event Emission
  // ==========================================================================

  /**
   * Emit a feature flag event
   */
  emit(event: FeatureFlagEvent): void {
    // Add to history
    this.addToHistory(event);

    // Notify global listeners
    for (const listener of this.globalListeners) {
      try {
        listener(event);
      } catch (error) {
        console.error("Error in feature flag event listener:", error);
      }
    }

    // Notify flag-specific listeners
    const flagListeners = this.listeners.get(event.flagName);
    if (flagListeners) {
      for (const listener of flagListeners) {
        try {
          listener(event);
        } catch (error) {
          console.error(`Error in feature flag listener for ${event.flagName}:`, error);
        }
      }
    }

    // Notify SSE clients
    this.broadcastToSSEClients(event);
  }

  /**
   * Emit a flag created event
   */
  emitFlagCreated(flag: FeatureFlag): void {
    this.emit({
      type: "flag.created",
      flagId: flag.id,
      flagName: flag.flagName,
      timestamp: Date.now(),
      payload: { newState: flag },
    });
  }

  /**
   * Emit a flag updated event
   */
  emitFlagUpdated(
    flag: FeatureFlag,
    previousState?: Partial<FeatureFlag>
  ): void {
    this.emit({
      type: "flag.updated",
      flagId: flag.id,
      flagName: flag.flagName,
      timestamp: Date.now(),
      payload: { previousState, newState: flag },
    });
  }

  /**
   * Emit a flag deleted event
   */
  emitFlagDeleted(flagId: string, flagName: string): void {
    this.emit({
      type: "flag.deleted",
      flagId,
      flagName,
      timestamp: Date.now(),
    });
  }

  /**
   * Emit a flag toggled event
   */
  emitFlagToggled(flag: FeatureFlag, previousEnabled: boolean): void {
    this.emit({
      type: "flag.toggled",
      flagId: flag.id,
      flagName: flag.flagName,
      timestamp: Date.now(),
      payload: {
        previousState: { enabled: previousEnabled },
        newState: { enabled: flag.enabled },
        enabled: flag.enabled,
      },
    });
  }

  /**
   * Emit a rollout percentage changed event
   */
  emitRolloutChanged(
    flag: FeatureFlag,
    previousPercentage: number
  ): void {
    this.emit({
      type: "flag.rollout_changed",
      flagId: flag.id,
      flagName: flag.flagName,
      timestamp: Date.now(),
      payload: {
        previousState: { rolloutPercentage: previousPercentage },
        newState: { rolloutPercentage: flag.rolloutPercentage },
      },
    });
  }

  /**
   * Emit a user target added event
   */
  emitUserTargetAdded(
    flagId: string,
    flagName: string,
    userId: string,
    enabled: boolean
  ): void {
    this.emit({
      type: "flag.user_target_added",
      flagId,
      flagName,
      timestamp: Date.now(),
      payload: { userId, enabled },
    });
  }

  /**
   * Emit a user target removed event
   */
  emitUserTargetRemoved(
    flagId: string,
    flagName: string,
    userId: string
  ): void {
    this.emit({
      type: "flag.user_target_removed",
      flagId,
      flagName,
      timestamp: Date.now(),
      payload: { userId },
    });
  }

  /**
   * Emit a role target added event
   */
  emitRoleTargetAdded(
    flagId: string,
    flagName: string,
    role: UserRole,
    enabled: boolean
  ): void {
    this.emit({
      type: "flag.role_target_added",
      flagId,
      flagName,
      timestamp: Date.now(),
      payload: { role, enabled },
    });
  }

  /**
   * Emit a role target removed event
   */
  emitRoleTargetRemoved(
    flagId: string,
    flagName: string,
    role: UserRole
  ): void {
    this.emit({
      type: "flag.role_target_removed",
      flagId,
      flagName,
      timestamp: Date.now(),
      payload: { role },
    });
  }

  // ==========================================================================
  // SSE Client Management
  // ==========================================================================

  /**
   * Register an SSE client
   */
  registerSSEClient(
    userId: string,
    userRole: UserRole | null | undefined,
    sendFn: (event: FeatureFlagEvent) => void,
    closeFn: () => void
  ): SSEClient {
    const client: SSEClient = {
      id: nanoid(),
      userId,
      userRole,
      connectedAt: Date.now(),
      lastPing: Date.now(),
      send: sendFn,
      close: closeFn,
    };

    this.sseClients.set(client.id, client);
    return client;
  }

  /**
   * Unregister an SSE client
   */
  unregisterSSEClient(clientId: string): void {
    const client = this.sseClients.get(clientId);
    if (client) {
      try {
        client.close();
      } catch {
        // Ignore close errors
      }
      this.sseClients.delete(clientId);
    }
  }

  /**
   * Update client ping time
   */
  pingClient(clientId: string): void {
    const client = this.sseClients.get(clientId);
    if (client) {
      client.lastPing = Date.now();
    }
  }

  /**
   * Get connected client count
   */
  getConnectedClientCount(): number {
    return this.sseClients.size;
  }

  /**
   * Broadcast event to all SSE clients
   */
  private broadcastToSSEClients(event: FeatureFlagEvent): void {
    for (const client of this.sseClients.values()) {
      try {
        client.send(event);
      } catch (error) {
        console.error(`Error sending event to SSE client ${client.id}:`, error);
        // Remove disconnected client
        this.sseClients.delete(client.id);
      }
    }
  }

  /**
   * Clean up stale SSE connections
   */
  cleanupStaleConnections(maxAge: number = 300000): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [clientId, client] of this.sseClients.entries()) {
      if (now - client.lastPing > maxAge) {
        this.unregisterSSEClient(clientId);
        cleaned++;
      }
    }

    return cleaned;
  }

  // ==========================================================================
  // Event History
  // ==========================================================================

  /**
   * Get recent event history
   */
  getHistory(limit?: number): FeatureFlagEvent[] {
    const maxLimit = limit ?? this.maxHistorySize;
    return this.eventHistory.slice(-maxLimit);
  }

  /**
   * Get events since a timestamp
   */
  getEventsSince(timestamp: number): FeatureFlagEvent[] {
    return this.eventHistory.filter((e) => e.timestamp > timestamp);
  }

  /**
   * Add event to history
   */
  private addToHistory(event: FeatureFlagEvent): void {
    this.eventHistory.push(event);

    // Trim history if needed
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.eventHistory = [];
  }

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  /**
   * Remove all listeners and clients
   */
  dispose(): void {
    this.listeners.clear();
    this.globalListeners.clear();

    for (const client of this.sseClients.values()) {
      try {
        client.close();
      } catch {
        // Ignore close errors
      }
    }
    this.sseClients.clear();
    this.eventHistory = [];
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let emitterInstance: FeatureFlagEventEmitter | null = null;

/**
 * Get the singleton event emitter instance
 */
export function getFeatureFlagEventEmitter(): FeatureFlagEventEmitter {
  if (!emitterInstance) {
    emitterInstance = new FeatureFlagEventEmitter();
  }
  return emitterInstance;
}

/**
 * Reset the singleton instance (mainly for testing)
 */
export function resetFeatureFlagEventEmitter(): void {
  if (emitterInstance) {
    emitterInstance.dispose();
  }
  emitterInstance = null;
}
