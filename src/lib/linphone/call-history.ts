/**
 * Linphone Call History Service
 *
 * Manages call history synchronization between the Linphone SDK
 * and the backend call records database.
 */

import type {
  LinphoneCall,
  LinphoneCallHistoryEntry,
  LinphoneCallDirection,
  LinphoneCallEndReason,
} from "./types";
import { LinphoneError } from "./types";

/**
 * Call history sync result
 */
export interface CallHistorySyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  errors: CallHistorySyncError[];
}

/**
 * Call history sync error
 */
export interface CallHistorySyncError {
  entryId: string;
  error: string;
  timestamp: Date;
}

/**
 * Call history query options
 */
export interface CallHistoryQueryOptions {
  /** Filter by direction */
  direction?: LinphoneCallDirection;
  /** Filter by date range start */
  startDate?: Date;
  /** Filter by date range end */
  endDate?: Date;
  /** Filter by remote address */
  remoteAddress?: string;
  /** Filter by phone number */
  phoneNumber?: string;
  /** Only missed calls */
  missedOnly?: boolean;
  /** Maximum results to return */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

/**
 * Call history statistics
 */
export interface CallHistoryStats {
  totalCalls: number;
  inboundCalls: number;
  outboundCalls: number;
  missedCalls: number;
  totalDuration: number;
  averageDuration: number;
  lastCallDate: Date | null;
}

/**
 * Call history event handlers
 */
export interface CallHistoryEvents {
  onEntryAdded?: (entry: LinphoneCallHistoryEntry) => void;
  onEntryUpdated?: (entry: LinphoneCallHistoryEntry) => void;
  onEntryDeleted?: (entryId: string) => void;
  onSyncCompleted?: (result: CallHistorySyncResult) => void;
  onSyncError?: (error: string) => void;
}

/**
 * Backend sync function type
 */
export type SyncToBackendFn = (
  entry: LinphoneCallHistoryEntry
) => Promise<{ success: boolean; backendId?: string; error?: string }>;

/**
 * Backend fetch function type
 */
export type FetchFromBackendFn = (
  options: CallHistoryQueryOptions
) => Promise<LinphoneCallHistoryEntry[]>;

/**
 * Call History Service
 *
 * Manages local call history and synchronization with the backend.
 */
export class CallHistoryService {
  private entries: Map<string, LinphoneCallHistoryEntry> = new Map();
  private events: CallHistoryEvents;
  private syncToBackend?: SyncToBackendFn;
  private fetchFromBackend?: FetchFromBackendFn;
  private pendingSync: Set<string> = new Set();
  private maxLocalEntries: number = 1000;

  constructor(
    events: CallHistoryEvents = {},
    options?: {
      syncToBackend?: SyncToBackendFn;
      fetchFromBackend?: FetchFromBackendFn;
      maxLocalEntries?: number;
    }
  ) {
    this.events = events;
    this.syncToBackend = options?.syncToBackend;
    this.fetchFromBackend = options?.fetchFromBackend;
    if (options?.maxLocalEntries) {
      this.maxLocalEntries = options.maxLocalEntries;
    }
  }

  /**
   * Add a call to history from a completed LinphoneCall
   */
  async addFromCall(call: LinphoneCall): Promise<LinphoneCallHistoryEntry> {
    const entry: LinphoneCallHistoryEntry = {
      id: call.id,
      remoteAddress: call.remoteAddress,
      remoteDisplayName: call.remoteDisplayName,
      remotePhoneNumber: call.remotePhoneNumber,
      direction: call.direction,
      startTime: call.startTime,
      duration: call.duration,
      wasAnswered: call.connectedTime !== null,
      endReason: call.endReason || "none",
      quality: call.quality.averageQuality,
      recordingUrl: call.recordingPath,
    };

    return this.addEntry(entry);
  }

  /**
   * Add a new entry to call history
   */
  async addEntry(
    entry: LinphoneCallHistoryEntry
  ): Promise<LinphoneCallHistoryEntry> {
    // Store locally
    this.entries.set(entry.id, entry);
    this.events.onEntryAdded?.(entry);

    // Trim old entries if needed
    await this.trimOldEntries();

    // Sync to backend if configured
    if (this.syncToBackend) {
      this.pendingSync.add(entry.id);
      this.syncEntryToBackend(entry);
    }

    return entry;
  }

  /**
   * Update an existing entry
   */
  async updateEntry(
    id: string,
    updates: Partial<LinphoneCallHistoryEntry>
  ): Promise<LinphoneCallHistoryEntry | null> {
    const existing = this.entries.get(id);
    if (!existing) {
      return null;
    }

    const updated = { ...existing, ...updates, id };
    this.entries.set(id, updated);
    this.events.onEntryUpdated?.(updated);

    // Sync to backend
    if (this.syncToBackend) {
      this.pendingSync.add(id);
      this.syncEntryToBackend(updated);
    }

    return updated;
  }

  /**
   * Get an entry by ID
   */
  getEntry(id: string): LinphoneCallHistoryEntry | undefined {
    return this.entries.get(id);
  }

  /**
   * Query call history with filters
   */
  query(options: CallHistoryQueryOptions = {}): LinphoneCallHistoryEntry[] {
    let results = Array.from(this.entries.values());

    // Apply filters
    if (options.direction) {
      results = results.filter((e) => e.direction === options.direction);
    }

    if (options.startDate) {
      results = results.filter((e) => e.startTime >= options.startDate!);
    }

    if (options.endDate) {
      results = results.filter((e) => e.startTime <= options.endDate!);
    }

    if (options.remoteAddress) {
      const addr = options.remoteAddress.toLowerCase();
      results = results.filter((e) =>
        e.remoteAddress.toLowerCase().includes(addr)
      );
    }

    if (options.phoneNumber) {
      const phone = options.phoneNumber.replace(/\D/g, "");
      results = results.filter(
        (e) =>
          e.remotePhoneNumber &&
          e.remotePhoneNumber.replace(/\D/g, "").includes(phone)
      );
    }

    if (options.missedOnly) {
      results = results.filter(
        (e) => e.direction === "incoming" && !e.wasAnswered
      );
    }

    // Sort by date descending
    results.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

    // Apply pagination
    const offset = options.offset || 0;
    const limit = options.limit || 50;
    results = results.slice(offset, offset + limit);

    return results;
  }

  /**
   * Get all entries
   */
  getAllEntries(): LinphoneCallHistoryEntry[] {
    return Array.from(this.entries.values()).sort(
      (a, b) => b.startTime.getTime() - a.startTime.getTime()
    );
  }

  /**
   * Get recent calls
   */
  getRecentCalls(limit: number = 20): LinphoneCallHistoryEntry[] {
    return this.query({ limit });
  }

  /**
   * Get missed calls
   */
  getMissedCalls(limit: number = 20): LinphoneCallHistoryEntry[] {
    return this.query({ missedOnly: true, limit });
  }

  /**
   * Get missed calls count
   */
  getMissedCallsCount(): number {
    return Array.from(this.entries.values()).filter(
      (e) => e.direction === "incoming" && !e.wasAnswered
    ).length;
  }

  /**
   * Get call history statistics
   */
  getStatistics(options?: { startDate?: Date; endDate?: Date }): CallHistoryStats {
    let entries = Array.from(this.entries.values());

    // Apply date filters
    if (options?.startDate) {
      entries = entries.filter((e) => e.startTime >= options.startDate!);
    }
    if (options?.endDate) {
      entries = entries.filter((e) => e.startTime <= options.endDate!);
    }

    const totalCalls = entries.length;
    const inboundCalls = entries.filter((e) => e.direction === "incoming").length;
    const outboundCalls = entries.filter((e) => e.direction === "outgoing").length;
    const missedCalls = entries.filter(
      (e) => e.direction === "incoming" && !e.wasAnswered
    ).length;
    const totalDuration = entries.reduce((sum, e) => sum + e.duration, 0);
    const averageDuration =
      totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;
    const lastCallDate =
      entries.length > 0
        ? entries.reduce((latest, e) =>
            e.startTime > latest.startTime ? e : latest
          ).startTime
        : null;

    return {
      totalCalls,
      inboundCalls,
      outboundCalls,
      missedCalls,
      totalDuration,
      averageDuration,
      lastCallDate,
    };
  }

  /**
   * Delete an entry
   */
  async deleteEntry(id: string): Promise<boolean> {
    const deleted = this.entries.delete(id);
    if (deleted) {
      this.pendingSync.delete(id);
      this.events.onEntryDeleted?.(id);
    }
    return deleted;
  }

  /**
   * Delete all entries
   */
  async deleteAllEntries(): Promise<void> {
    const ids = Array.from(this.entries.keys());
    this.entries.clear();
    this.pendingSync.clear();
    ids.forEach((id) => this.events.onEntryDeleted?.(id));
  }

  /**
   * Delete entries older than a date
   */
  async deleteEntriesOlderThan(date: Date): Promise<number> {
    const toDelete = Array.from(this.entries.values())
      .filter((e) => e.startTime < date)
      .map((e) => e.id);

    toDelete.forEach((id) => {
      this.entries.delete(id);
      this.pendingSync.delete(id);
      this.events.onEntryDeleted?.(id);
    });

    return toDelete.length;
  }

  /**
   * Sync all pending entries to backend
   */
  async syncPendingToBackend(): Promise<CallHistorySyncResult> {
    if (!this.syncToBackend) {
      return {
        success: true,
        syncedCount: 0,
        failedCount: 0,
        errors: [],
      };
    }

    const pendingIds = Array.from(this.pendingSync);
    let syncedCount = 0;
    let failedCount = 0;
    const errors: CallHistorySyncError[] = [];

    for (const id of pendingIds) {
      const entry = this.entries.get(id);
      if (!entry) {
        this.pendingSync.delete(id);
        continue;
      }

      try {
        const result = await this.syncToBackend(entry);
        if (result.success) {
          this.pendingSync.delete(id);
          syncedCount++;
        } else {
          failedCount++;
          errors.push({
            entryId: id,
            error: result.error || "Unknown error",
            timestamp: new Date(),
          });
        }
      } catch (error) {
        failedCount++;
        errors.push({
          entryId: id,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date(),
        });
      }
    }

    const result: CallHistorySyncResult = {
      success: failedCount === 0,
      syncedCount,
      failedCount,
      errors,
    };

    this.events.onSyncCompleted?.(result);
    return result;
  }

  /**
   * Fetch history from backend
   */
  async fetchFromBackendHistory(
    options?: CallHistoryQueryOptions
  ): Promise<LinphoneCallHistoryEntry[]> {
    if (!this.fetchFromBackend) {
      return [];
    }

    try {
      const entries = await this.fetchFromBackend(options || {});

      // Merge with local entries (prefer local if exists)
      for (const entry of entries) {
        if (!this.entries.has(entry.id)) {
          this.entries.set(entry.id, entry);
        }
      }

      return entries;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.events.onSyncError?.(errorMessage);
      throw new LinphoneError(
        "NETWORK_ERROR",
        "Failed to fetch call history from backend",
        { error: errorMessage }
      );
    }
  }

  /**
   * Get pending sync count
   */
  getPendingSyncCount(): number {
    return this.pendingSync.size;
  }

  /**
   * Check if entry is pending sync
   */
  isPendingSync(id: string): boolean {
    return this.pendingSync.has(id);
  }

  /**
   * Sync a single entry to backend
   */
  private async syncEntryToBackend(
    entry: LinphoneCallHistoryEntry
  ): Promise<void> {
    if (!this.syncToBackend) return;

    try {
      const result = await this.syncToBackend(entry);
      if (result.success) {
        this.pendingSync.delete(entry.id);
      }
    } catch (error) {
      // Keep in pending queue for retry
      console.error(
        `[CallHistory] Failed to sync entry ${entry.id}:`,
        error
      );
    }
  }

  /**
   * Trim old entries to stay within limit
   */
  private async trimOldEntries(): Promise<void> {
    if (this.entries.size <= this.maxLocalEntries) {
      return;
    }

    // Get entries sorted by date (oldest first)
    const sortedEntries = Array.from(this.entries.values()).sort(
      (a, b) => a.startTime.getTime() - b.startTime.getTime()
    );

    // Delete oldest entries
    const toDelete = this.entries.size - this.maxLocalEntries;
    for (let i = 0; i < toDelete; i++) {
      const entry = sortedEntries[i];
      // Only delete if synced
      if (!this.pendingSync.has(entry.id)) {
        this.entries.delete(entry.id);
      }
    }
  }
}

/**
 * Create a call history service instance
 */
export function createCallHistoryService(
  events?: CallHistoryEvents,
  options?: {
    syncToBackend?: SyncToBackendFn;
    fetchFromBackend?: FetchFromBackendFn;
    maxLocalEntries?: number;
  }
): CallHistoryService {
  return new CallHistoryService(events, options);
}

/**
 * Format call duration for display
 */
export function formatCallDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }

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

/**
 * Format call time for display
 */
export function formatCallTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    // Today - show time
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    // This week - show day name
    return date.toLocaleDateString([], { weekday: "long" });
  } else {
    // Older - show date
    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
  }
}

/**
 * Get end reason display text
 */
export function getEndReasonDisplayText(reason: LinphoneCallEndReason): string {
  const texts: Record<LinphoneCallEndReason, string> = {
    none: "Ended",
    no_response: "No response",
    forbidden: "Call forbidden",
    declined: "Declined",
    not_found: "Not found",
    not_answered: "No answer",
    busy: "Busy",
    media: "Media error",
    io_error: "Connection error",
    do_not_disturb: "Do not disturb",
    unauthorized: "Unauthorized",
    not_acceptable: "Not acceptable",
    no_match: "No match",
    moved_permanently: "Moved permanently",
    gone: "Gone",
    temporarily_unavailable: "Temporarily unavailable",
    address_incomplete: "Address incomplete",
    not_implemented: "Not implemented",
    bad_gateway: "Bad gateway",
    server_timeout: "Server timeout",
    unknown: "Unknown",
  };
  return texts[reason] || reason;
}
