/**
 * Claude API Types
 * Type definitions for Anthropic Claude API integration
 */

// ============================================================================
// Core Message Types
// ============================================================================

export type MessageRole = "user" | "assistant";

export interface TextContent {
  type: "text";
  text: string;
}

export interface ImageContent {
  type: "image";
  source: {
    type: "base64" | "url";
    media_type: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
    data?: string; // Base64 data for base64 type
    url?: string; // URL for url type
  };
}

export interface ToolUseContent {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResultContent {
  type: "tool_result";
  tool_use_id: string;
  content: string | TextContent[];
  is_error?: boolean;
}

export type ContentBlock = TextContent | ImageContent | ToolUseContent | ToolResultContent;

export interface Message {
  role: MessageRole;
  content: string | ContentBlock[];
}

// ============================================================================
// Tool Use Types
// ============================================================================

export interface ToolInputSchema {
  type: "object";
  properties: Record<string, {
    type: string;
    description?: string;
    enum?: string[];
    items?: Record<string, unknown>;
    required?: boolean;
  }>;
  required?: string[];
}

export interface Tool {
  name: string;
  description: string;
  input_schema: ToolInputSchema;
}

export type ToolChoice =
  | { type: "auto" }
  | { type: "any" }
  | { type: "tool"; name: string }
  | { type: "none" };

// ============================================================================
// Prompt Caching Types
// ============================================================================

export interface CacheControl {
  type: "ephemeral";
}

export interface CachedContent {
  type: "text";
  text: string;
  cache_control?: CacheControl;
}

export interface SystemMessage {
  type: "text";
  text: string;
  cache_control?: CacheControl;
}

// ============================================================================
// Request Types
// ============================================================================

export interface CreateMessageRequest {
  model: ClaudeModel;
  messages: Message[];
  max_tokens: number;
  system?: string | SystemMessage[];
  tools?: Tool[];
  tool_choice?: ToolChoice;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  stop_sequences?: string[];
  stream?: boolean;
  metadata?: {
    user_id?: string;
  };
}

// ============================================================================
// Response Types
// ============================================================================

export interface Usage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}

export interface MessageResponse {
  id: string;
  type: "message";
  role: "assistant";
  content: ContentBlock[];
  model: string;
  stop_reason: "end_turn" | "max_tokens" | "stop_sequence" | "tool_use" | null;
  stop_sequence: string | null;
  usage: Usage;
}

// ============================================================================
// Streaming Types
// ============================================================================

export interface MessageStartEvent {
  type: "message_start";
  message: {
    id: string;
    type: "message";
    role: "assistant";
    content: [];
    model: string;
    stop_reason: null;
    stop_sequence: null;
    usage: { input_tokens: number; output_tokens: number };
  };
}

export interface ContentBlockStartEvent {
  type: "content_block_start";
  index: number;
  content_block: TextContent | ToolUseContent;
}

export interface ContentBlockDeltaEvent {
  type: "content_block_delta";
  index: number;
  delta: {
    type: "text_delta" | "input_json_delta";
    text?: string;
    partial_json?: string;
  };
}

export interface ContentBlockStopEvent {
  type: "content_block_stop";
  index: number;
}

export interface MessageDeltaEvent {
  type: "message_delta";
  delta: {
    stop_reason: "end_turn" | "max_tokens" | "stop_sequence" | "tool_use";
    stop_sequence: string | null;
  };
  usage: { output_tokens: number };
}

export interface MessageStopEvent {
  type: "message_stop";
}

export interface PingEvent {
  type: "ping";
}

export interface ErrorEvent {
  type: "error";
  error: {
    type: string;
    message: string;
  };
}

export type StreamEvent =
  | MessageStartEvent
  | ContentBlockStartEvent
  | ContentBlockDeltaEvent
  | ContentBlockStopEvent
  | MessageDeltaEvent
  | MessageStopEvent
  | PingEvent
  | ErrorEvent;

// ============================================================================
// Model Types
// ============================================================================

export type ClaudeModel =
  | "claude-sonnet-4-20250514"
  | "claude-3-7-sonnet-20250219"
  | "claude-3-5-sonnet-20241022"
  | "claude-3-5-haiku-20241022"
  | "claude-3-opus-20240229"
  | "claude-3-sonnet-20240229"
  | "claude-3-haiku-20240307";

export const CLAUDE_MODELS: Record<string, ClaudeModel> = {
  CLAUDE_4_SONNET: "claude-sonnet-4-20250514",
  CLAUDE_3_7_SONNET: "claude-3-7-sonnet-20250219",
  CLAUDE_3_5_SONNET: "claude-3-5-sonnet-20241022",
  CLAUDE_3_5_HAIKU: "claude-3-5-haiku-20241022",
  CLAUDE_3_OPUS: "claude-3-opus-20240229",
  CLAUDE_3_SONNET: "claude-3-sonnet-20240229",
  CLAUDE_3_HAIKU: "claude-3-haiku-20240307",
} as const;

// ============================================================================
// Client Configuration Types
// ============================================================================

export interface ClaudeClientConfig {
  apiKey: string;
  baseUrl?: string;
  defaultModel?: ClaudeModel;
  maxRetries?: number;
  retryDelayMs?: number;
  timeoutMs?: number;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryableStatusCodes: number[];
}

// ============================================================================
// Rate Limiting Types
// ============================================================================

export interface RateLimitInfo {
  requestsLimit: number;
  requestsRemaining: number;
  requestsReset: Date;
  tokensLimit: number;
  tokensRemaining: number;
  tokensReset: Date;
}

// ============================================================================
// Callback Types for Streaming
// ============================================================================

export interface StreamCallbacks {
  onStart?: (message: MessageStartEvent["message"]) => void;
  onText?: (text: string, fullText: string) => void;
  onToolUse?: (toolUse: ToolUseContent) => void;
  onComplete?: (response: MessageResponse) => void;
  onError?: (error: Error) => void;
}

// ============================================================================
// Conversation Types (for state management)
// ============================================================================

export interface ConversationMessage {
  id: string;
  role: MessageRole;
  content: string | ContentBlock[];
  createdAt: Date;
  usage?: Usage;
}

export interface Conversation {
  id: string;
  messages: ConversationMessage[];
  model: ClaudeModel;
  systemPrompt?: string;
  createdAt: Date;
  updatedAt: Date;
}
