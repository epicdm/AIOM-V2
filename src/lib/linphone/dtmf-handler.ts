/**
 * Linphone DTMF Handler
 *
 * Manages DTMF (Dual-Tone Multi-Frequency) tone sending and receiving
 * for VoIP calls. Supports both RFC 2833 and SIP INFO methods.
 */

import type {
  LinphoneDtmfTone,
  LinphoneDtmfConfig,
} from "./types";
import { LinphoneError } from "./types";

/**
 * DTMF event types
 */
export interface DtmfSentEvent {
  callId: string;
  tone: LinphoneDtmfTone;
  duration: number;
  method: DtmfMethod;
  timestamp: Date;
}

export interface DtmfReceivedEvent {
  callId: string;
  tone: LinphoneDtmfTone;
  timestamp: Date;
}

/**
 * DTMF transmission method
 */
export type DtmfMethod = "rfc2833" | "sip_info";

/**
 * DTMF handler event callbacks
 */
export interface DtmfHandlerEvents {
  onDtmfSent?: (event: DtmfSentEvent) => void;
  onDtmfReceived?: (event: DtmfReceivedEvent) => void;
  onDtmfError?: (callId: string, error: string) => void;
}

/**
 * DTMF queue item for sequential sending
 */
interface DtmfQueueItem {
  tone: LinphoneDtmfTone;
  resolve: () => void;
  reject: (error: Error) => void;
}

/**
 * Default DTMF configuration
 */
const DEFAULT_DTMF_CONFIG: LinphoneDtmfConfig = {
  duration: 100, // milliseconds
  useSipInfo: false,
  playLocalFeedback: true,
};

/**
 * DTMF tone frequencies for local playback
 */
const DTMF_FREQUENCIES: Record<LinphoneDtmfTone, { low: number; high: number }> = {
  "1": { low: 697, high: 1209 },
  "2": { low: 697, high: 1336 },
  "3": { low: 697, high: 1477 },
  "A": { low: 697, high: 1633 },
  "4": { low: 770, high: 1209 },
  "5": { low: 770, high: 1336 },
  "6": { low: 770, high: 1477 },
  "B": { low: 770, high: 1633 },
  "7": { low: 852, high: 1209 },
  "8": { low: 852, high: 1336 },
  "9": { low: 852, high: 1477 },
  "C": { low: 852, high: 1633 },
  "*": { low: 941, high: 1209 },
  "0": { low: 941, high: 1336 },
  "#": { low: 941, high: 1477 },
  "D": { low: 941, high: 1633 },
};

/**
 * Valid DTMF tones
 */
export const VALID_DTMF_TONES: LinphoneDtmfTone[] = [
  "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
  "*", "#", "A", "B", "C", "D"
];

/**
 * DTMF Handler
 *
 * Manages DTMF tone transmission and reception for VoIP calls.
 */
export class DtmfHandler {
  private config: LinphoneDtmfConfig;
  private events: DtmfHandlerEvents;
  private dtmfQueues: Map<string, DtmfQueueItem[]> = new Map();
  private processingQueues: Set<string> = new Set();
  private receivedHistory: Map<string, DtmfReceivedEvent[]> = new Map();

  constructor(
    config: Partial<LinphoneDtmfConfig> = {},
    events: DtmfHandlerEvents = {}
  ) {
    this.config = { ...DEFAULT_DTMF_CONFIG, ...config };
    this.events = events;
  }

  /**
   * Send a single DTMF tone on a call
   */
  async sendDtmf(callId: string, tone: LinphoneDtmfTone): Promise<void> {
    // Validate tone
    if (!this.isValidDtmfTone(tone)) {
      throw new LinphoneError(
        "MEDIA_ERROR",
        `Invalid DTMF tone: ${tone}`,
        { tone, validTones: VALID_DTMF_TONES }
      );
    }

    // Add to queue
    return new Promise((resolve, reject) => {
      const queue = this.dtmfQueues.get(callId) || [];
      queue.push({ tone, resolve, reject });
      this.dtmfQueues.set(callId, queue);

      // Process queue if not already processing
      if (!this.processingQueues.has(callId)) {
        this.processQueue(callId);
      }
    });
  }

  /**
   * Send a sequence of DTMF tones (e.g., for PIN entry)
   */
  async sendDtmfSequence(
    callId: string,
    sequence: string,
    interDigitDelay: number = 100
  ): Promise<void> {
    const tones = this.parseSequence(sequence);

    for (let i = 0; i < tones.length; i++) {
      await this.sendDtmf(callId, tones[i]);

      // Add inter-digit delay between tones
      if (i < tones.length - 1) {
        await this.delay(interDigitDelay);
      }
    }
  }

  /**
   * Handle received DTMF tone
   */
  handleReceivedDtmf(callId: string, tone: LinphoneDtmfTone): void {
    if (!this.isValidDtmfTone(tone)) {
      console.warn(`[DtmfHandler] Received invalid DTMF tone: ${tone}`);
      return;
    }

    const event: DtmfReceivedEvent = {
      callId,
      tone,
      timestamp: new Date(),
    };

    // Store in history
    const history = this.receivedHistory.get(callId) || [];
    history.push(event);
    this.receivedHistory.set(callId, history);

    // Notify listeners
    this.events.onDtmfReceived?.(event);
  }

  /**
   * Get received DTMF history for a call
   */
  getReceivedHistory(callId: string): DtmfReceivedEvent[] {
    return this.receivedHistory.get(callId) || [];
  }

  /**
   * Get received DTMF as a string (for PIN entry display)
   */
  getReceivedSequence(callId: string): string {
    const history = this.receivedHistory.get(callId) || [];
    return history.map((e) => e.tone).join("");
  }

  /**
   * Clear received DTMF history for a call
   */
  clearReceivedHistory(callId: string): void {
    this.receivedHistory.delete(callId);
  }

  /**
   * Clear all DTMF state for a call (called when call ends)
   */
  clearCallState(callId: string): void {
    this.dtmfQueues.delete(callId);
    this.processingQueues.delete(callId);
    this.receivedHistory.delete(callId);
  }

  /**
   * Get DTMF configuration
   */
  getConfig(): LinphoneDtmfConfig {
    return { ...this.config };
  }

  /**
   * Update DTMF configuration
   */
  updateConfig(config: Partial<LinphoneDtmfConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get the transmission method based on configuration
   */
  getTransmissionMethod(): DtmfMethod {
    return this.config.useSipInfo ? "sip_info" : "rfc2833";
  }

  /**
   * Get DTMF frequencies for a tone (for UI visualization)
   */
  getToneFrequencies(
    tone: LinphoneDtmfTone
  ): { low: number; high: number } | null {
    return DTMF_FREQUENCIES[tone] || null;
  }

  /**
   * Validate a DTMF tone
   */
  isValidDtmfTone(tone: string): tone is LinphoneDtmfTone {
    return VALID_DTMF_TONES.includes(tone as LinphoneDtmfTone);
  }

  /**
   * Parse a string sequence into DTMF tones
   */
  parseSequence(sequence: string): LinphoneDtmfTone[] {
    const tones: LinphoneDtmfTone[] = [];
    const upperSequence = sequence.toUpperCase();

    for (const char of upperSequence) {
      if (this.isValidDtmfTone(char)) {
        tones.push(char as LinphoneDtmfTone);
      }
      // Skip invalid characters silently
    }

    return tones;
  }

  /**
   * Format a DTMF sequence for display (with masking option)
   */
  formatSequence(sequence: string, maskDigits: boolean = false): string {
    if (!maskDigits) {
      return sequence;
    }
    return sequence.replace(/[0-9]/g, "*");
  }

  /**
   * Process the DTMF queue for a call
   */
  private async processQueue(callId: string): Promise<void> {
    if (this.processingQueues.has(callId)) {
      return;
    }

    this.processingQueues.add(callId);

    try {
      while (true) {
        const queue = this.dtmfQueues.get(callId);
        if (!queue || queue.length === 0) {
          break;
        }

        const item = queue.shift()!;
        this.dtmfQueues.set(callId, queue);

        try {
          await this.executeDtmfTone(callId, item.tone);
          item.resolve();
        } catch (error) {
          item.reject(
            error instanceof Error ? error : new Error(String(error))
          );
        }

        // Wait for tone duration plus small gap
        await this.delay(this.config.duration + 50);
      }
    } finally {
      this.processingQueues.delete(callId);
    }
  }

  /**
   * Execute sending a single DTMF tone
   */
  private async executeDtmfTone(
    callId: string,
    tone: LinphoneDtmfTone
  ): Promise<void> {
    const method = this.getTransmissionMethod();

    // Play local feedback tone if enabled
    if (this.config.playLocalFeedback) {
      await this.playLocalTone(tone);
    }

    // Send DTMF via native bridge
    // This would call into the Linphone SDK
    await this.sendDtmfNative(callId, tone, method);

    // Create sent event
    const event: DtmfSentEvent = {
      callId,
      tone,
      duration: this.config.duration,
      method,
      timestamp: new Date(),
    };

    // Notify listeners
    this.events.onDtmfSent?.(event);
  }

  /**
   * Send DTMF via native Linphone SDK
   * This provides the interface for the Android native bridge
   */
  private async sendDtmfNative(
    callId: string,
    tone: LinphoneDtmfTone,
    method: DtmfMethod
  ): Promise<void> {
    // This would call into the Linphone SDK via native bridge
    // The native implementation would use:
    // - linphone_call_send_dtmf() for RFC 2833
    // - SIP INFO method for SIP INFO

    console.log(
      `[DtmfHandler] Sending DTMF '${tone}' on call ${callId} via ${method}`
    );
  }

  /**
   * Play local DTMF feedback tone
   */
  private async playLocalTone(tone: LinphoneDtmfTone): Promise<void> {
    const frequencies = DTMF_FREQUENCIES[tone];
    if (!frequencies) return;

    // This would use the Android ToneGenerator or AudioTrack
    // to play the DTMF feedback tone locally

    console.log(
      `[DtmfHandler] Playing local tone '${tone}' (${frequencies.low}Hz + ${frequencies.high}Hz)`
    );
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Create a DTMF handler instance
 */
export function createDtmfHandler(
  config?: Partial<LinphoneDtmfConfig>,
  events?: DtmfHandlerEvents
): DtmfHandler {
  return new DtmfHandler(config, events);
}

/**
 * Get the character for a keypad button position (1-12)
 */
export function getKeypadTone(position: number): LinphoneDtmfTone | null {
  const keypadLayout: (LinphoneDtmfTone | null)[] = [
    "1", "2", "3",
    "4", "5", "6",
    "7", "8", "9",
    "*", "0", "#"
  ];

  if (position < 1 || position > 12) {
    return null;
  }

  return keypadLayout[position - 1];
}

/**
 * Get keypad layout for UI rendering
 */
export function getKeypadLayout(): { tone: LinphoneDtmfTone; label: string; letters?: string }[] {
  return [
    { tone: "1", label: "1", letters: "" },
    { tone: "2", label: "2", letters: "ABC" },
    { tone: "3", label: "3", letters: "DEF" },
    { tone: "4", label: "4", letters: "GHI" },
    { tone: "5", label: "5", letters: "JKL" },
    { tone: "6", label: "6", letters: "MNO" },
    { tone: "7", label: "7", letters: "PQRS" },
    { tone: "8", label: "8", letters: "TUV" },
    { tone: "9", label: "9", letters: "WXYZ" },
    { tone: "*", label: "*", letters: "" },
    { tone: "0", label: "0", letters: "+" },
    { tone: "#", label: "#", letters: "" },
  ];
}
