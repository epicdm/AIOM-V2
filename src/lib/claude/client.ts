/**
 * Claude API Client
 * Main client class for interacting with the Anthropic Claude API
 */

import type {
  ClaudeClientConfig,
  ClaudeModel,
  CreateMessageRequest,
  Message,
  MessageResponse,
  StreamCallbacks,
  StreamEvent,
  Tool,
  ToolChoice,
  SystemMessage,
  ContentBlock,
  TextContent,
  ToolUseContent,
  Usage,
  RateLimitInfo,
} from "./types";

import { CLAUDE_MODELS } from "./types";

import {
  ClaudeError,
  ClaudeNetworkError,
  ClaudeTimeoutError,
  ClaudeStreamError,
  createErrorFromResponse,
  isRetryableError,
  getRetryDelay,
  parseRateLimitHeaders,
} from "./errors";

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_BASE_URL = "https://api.anthropic.com";
const API_VERSION = "2023-06-01";
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY_MS = 1000;
const DEFAULT_TIMEOUT_MS = 120000; // 2 minutes
const DEFAULT_MODEL: ClaudeModel = "claude-sonnet-4-20250514";

// ============================================================================
// Claude Client Class
// ============================================================================

export class ClaudeClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly defaultModel: ClaudeModel;
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;
  private readonly timeoutMs: number;

  private lastRateLimitInfo?: RateLimitInfo;

  constructor(config: ClaudeClientConfig) {
    if (!config.apiKey) {
      throw new ClaudeError("API key is required", "CONFIGURATION_ERROR");
    }

    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || DEFAULT_BASE_URL;
    this.defaultModel = config.defaultModel || DEFAULT_MODEL;
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.retryDelayMs = config.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  // ==========================================================================
  // Core Message Methods
  // ==========================================================================

  /**
   * Create a message (non-streaming)
   */
  async createMessage(
    options: {
      messages: Message[];
      model?: ClaudeModel;
      maxTokens?: number;
      system?: string | SystemMessage[];
      tools?: Tool[];
      toolChoice?: ToolChoice;
      temperature?: number;
      topP?: number;
      topK?: number;
      stopSequences?: string[];
      userId?: string;
    }
  ): Promise<MessageResponse> {
    const request: CreateMessageRequest = {
      model: options.model || this.defaultModel,
      messages: options.messages,
      max_tokens: options.maxTokens || 4096,
      system: options.system,
      tools: options.tools,
      tool_choice: options.toolChoice,
      temperature: options.temperature,
      top_p: options.topP,
      top_k: options.topK,
      stop_sequences: options.stopSequences,
      stream: false,
      metadata: options.userId ? { user_id: options.userId } : undefined,
    };

    return this.executeRequest<MessageResponse>("/v1/messages", request);
  }

  /**
   * Create a streaming message
   */
  async createStreamingMessage(
    options: {
      messages: Message[];
      model?: ClaudeModel;
      maxTokens?: number;
      system?: string | SystemMessage[];
      tools?: Tool[];
      toolChoice?: ToolChoice;
      temperature?: number;
      topP?: number;
      topK?: number;
      stopSequences?: string[];
      userId?: string;
    },
    callbacks: StreamCallbacks
  ): Promise<MessageResponse> {
    const request: CreateMessageRequest = {
      model: options.model || this.defaultModel,
      messages: options.messages,
      max_tokens: options.maxTokens || 4096,
      system: options.system,
      tools: options.tools,
      tool_choice: options.toolChoice,
      temperature: options.temperature,
      top_p: options.topP,
      top_k: options.topK,
      stop_sequences: options.stopSequences,
      stream: true,
      metadata: options.userId ? { user_id: options.userId } : undefined,
    };

    return this.executeStreamingRequest("/v1/messages", request, callbacks);
  }

  /**
   * Simple text completion helper
   */
  async complete(
    prompt: string,
    options?: {
      model?: ClaudeModel;
      maxTokens?: number;
      system?: string;
      temperature?: number;
    }
  ): Promise<string> {
    const response = await this.createMessage({
      messages: [{ role: "user", content: prompt }],
      model: options?.model,
      maxTokens: options?.maxTokens,
      system: options?.system,
      temperature: options?.temperature,
    });

    return this.extractTextFromResponse(response);
  }

  /**
   * Simple streaming completion helper
   */
  async streamComplete(
    prompt: string,
    onText: (text: string, fullText: string) => void,
    options?: {
      model?: ClaudeModel;
      maxTokens?: number;
      system?: string;
      temperature?: number;
    }
  ): Promise<string> {
    let fullText = "";

    await this.createStreamingMessage(
      {
        messages: [{ role: "user", content: prompt }],
        model: options?.model,
        maxTokens: options?.maxTokens,
        system: options?.system,
        temperature: options?.temperature,
      },
      {
        onText: (text, full) => {
          fullText = full;
          onText(text, full);
        },
      }
    );

    return fullText;
  }

  // ==========================================================================
  // Tool Use Methods
  // ==========================================================================

  /**
   * Execute a message with tools and handle tool calls
   */
  async executeWithTools<TToolResults extends Record<string, unknown>>(
    options: {
      messages: Message[];
      tools: Tool[];
      toolHandlers: Record<string, (input: Record<string, unknown>) => Promise<unknown>>;
      model?: ClaudeModel;
      maxTokens?: number;
      system?: string | SystemMessage[];
      maxToolRounds?: number;
    }
  ): Promise<{ response: MessageResponse; toolResults: TToolResults }> {
    const maxRounds = options.maxToolRounds || 10;
    let currentMessages = [...options.messages];
    const allToolResults: Record<string, unknown> = {};
    let response: MessageResponse | null = null;

    for (let round = 0; round < maxRounds; round++) {
      response = await this.createMessage({
        messages: currentMessages,
        tools: options.tools,
        toolChoice: { type: "auto" },
        model: options.model,
        maxTokens: options.maxTokens,
        system: options.system,
      });

      // Check if there are tool use blocks
      const toolUseBlocks = response.content.filter(
        (block): block is ToolUseContent => block.type === "tool_use"
      );

      if (toolUseBlocks.length === 0) {
        // No tool calls, we're done
        break;
      }

      // Process tool calls
      const toolResults: ContentBlock[] = [];
      for (const toolUse of toolUseBlocks) {
        const handler = options.toolHandlers[toolUse.name];
        if (!handler) {
          toolResults.push({
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: `Unknown tool: ${toolUse.name}`,
            is_error: true,
          });
          continue;
        }

        try {
          const result = await handler(toolUse.input);
          allToolResults[toolUse.name] = result;
          toolResults.push({
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: typeof result === "string" ? result : JSON.stringify(result),
          });
        } catch (error) {
          toolResults.push({
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: error instanceof Error ? error.message : "Tool execution failed",
            is_error: true,
          });
        }
      }

      // Add assistant's response and tool results to messages
      currentMessages = [
        ...currentMessages,
        { role: "assistant" as const, content: response.content },
        { role: "user" as const, content: toolResults },
      ];
    }

    if (!response) {
      throw new ClaudeError("No response received", "NO_RESPONSE_ERROR");
    }

    return {
      response,
      toolResults: allToolResults as TToolResults,
    };
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Extract text content from a response
   */
  extractTextFromResponse(response: MessageResponse): string {
    return response.content
      .filter((block): block is TextContent => block.type === "text")
      .map((block) => block.text)
      .join("");
  }

  /**
   * Get the last rate limit info
   */
  getRateLimitInfo(): RateLimitInfo | undefined {
    return this.lastRateLimitInfo;
  }

  /**
   * Count tokens (approximate)
   * Note: For accurate token counting, use the tokenizer API
   */
  approximateTokenCount(text: string): number {
    // Rough approximation: ~4 characters per token for English
    return Math.ceil(text.length / 4);
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * Execute a non-streaming request with retries
   */
  private async executeRequest<T>(
    endpoint: string,
    body: unknown
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.fetchWithTimeout(endpoint, body);

        // Update rate limit info
        this.lastRateLimitInfo = parseRateLimitHeaders(response.headers);

        if (!response.ok) {
          throw await createErrorFromResponse(response);
        }

        return await response.json() as T;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (!isRetryableError(error) || attempt === this.maxRetries) {
          throw error;
        }

        const delay = getRetryDelay(error, attempt, this.retryDelayMs);
        await this.sleep(delay);
      }
    }

    throw lastError || new ClaudeError("Request failed", "UNKNOWN_ERROR");
  }

  /**
   * Execute a streaming request
   */
  private async executeStreamingRequest(
    endpoint: string,
    body: unknown,
    callbacks: StreamCallbacks
  ): Promise<MessageResponse> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.fetchWithTimeout(endpoint, body);

        // Update rate limit info
        this.lastRateLimitInfo = parseRateLimitHeaders(response.headers);

        if (!response.ok) {
          throw await createErrorFromResponse(response);
        }

        return await this.processStream(response, callbacks);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (callbacks.onError) {
          callbacks.onError(lastError);
        }

        if (!isRetryableError(error) || attempt === this.maxRetries) {
          throw error;
        }

        const delay = getRetryDelay(error, attempt, this.retryDelayMs);
        await this.sleep(delay);
      }
    }

    throw lastError || new ClaudeError("Streaming request failed", "UNKNOWN_ERROR");
  }

  /**
   * Process SSE stream
   */
  private async processStream(
    response: Response,
    callbacks: StreamCallbacks
  ): Promise<MessageResponse> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new ClaudeStreamError("No response body");
    }

    const decoder = new TextDecoder();
    let buffer = "";
    let fullText = "";
    let messageResponse: MessageResponse | null = null;
    const contentBlocks: ContentBlock[] = [];
    let usage: Usage = { input_tokens: 0, output_tokens: 0 };

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const event: StreamEvent = JSON.parse(data);
              this.handleStreamEvent(event, callbacks, contentBlocks, {
                fullText,
                setFullText: (text: string) => { fullText = text; },
                usage,
                setUsage: (u: Usage) => { usage = u; },
                setMessageResponse: (r: MessageResponse) => { messageResponse = r; },
              });
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    // Construct final response
    if (!messageResponse) {
      throw new ClaudeStreamError("Stream ended without message completion");
    }

    // Type narrowing - messageResponse is now guaranteed to be non-null
    const baseResponse = messageResponse as MessageResponse;
    return {
      id: baseResponse.id,
      type: baseResponse.type,
      role: baseResponse.role,
      model: baseResponse.model,
      stop_reason: baseResponse.stop_reason,
      stop_sequence: baseResponse.stop_sequence,
      content: contentBlocks,
      usage,
    };
  }

  /**
   * Handle individual stream events
   */
  private handleStreamEvent(
    event: StreamEvent,
    callbacks: StreamCallbacks,
    contentBlocks: ContentBlock[],
    state: {
      fullText: string;
      setFullText: (text: string) => void;
      usage: Usage;
      setUsage: (usage: Usage) => void;
      setMessageResponse: (response: MessageResponse) => void;
    }
  ): void {
    switch (event.type) {
      case "message_start":
        if (callbacks.onStart) {
          callbacks.onStart(event.message);
        }
        state.setUsage({ ...state.usage, input_tokens: event.message.usage.input_tokens });
        break;

      case "content_block_start":
        contentBlocks[event.index] = event.content_block;
        if (event.content_block.type === "tool_use" && callbacks.onToolUse) {
          callbacks.onToolUse(event.content_block);
        }
        break;

      case "content_block_delta":
        if (event.delta.type === "text_delta" && event.delta.text) {
          const newFullText = state.fullText + event.delta.text;
          state.setFullText(newFullText);

          // Update content block
          const block = contentBlocks[event.index];
          if (block && block.type === "text") {
            (block as TextContent).text = newFullText;
          }

          if (callbacks.onText) {
            callbacks.onText(event.delta.text, newFullText);
          }
        }
        break;

      case "message_delta":
        state.setUsage({
          ...state.usage,
          output_tokens: state.usage.output_tokens + event.usage.output_tokens,
        });
        break;

      case "message_stop":
        state.setMessageResponse({
          id: "",
          type: "message",
          role: "assistant",
          content: contentBlocks,
          model: "",
          stop_reason: "end_turn",
          stop_sequence: null,
          usage: state.usage,
        });
        if (callbacks.onComplete) {
          callbacks.onComplete({
            id: "",
            type: "message",
            role: "assistant",
            content: contentBlocks,
            model: "",
            stop_reason: "end_turn",
            stop_sequence: null,
            usage: state.usage,
          });
        }
        break;

      case "error":
        throw new ClaudeStreamError(event.error.message);
    }
  }

  /**
   * Fetch with timeout
   */
  private async fetchWithTimeout(
    endpoint: string,
    body: unknown
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": API_VERSION,
          "anthropic-beta": "prompt-caching-2024-07-31",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      return response;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new ClaudeTimeoutError(`Request timed out after ${this.timeoutMs}ms`);
      }
      throw new ClaudeNetworkError(
        error instanceof Error ? error.message : "Network request failed",
        error instanceof Error ? error : undefined
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new Claude client instance
 */
export function createClaudeClient(config: ClaudeClientConfig): ClaudeClient {
  return new ClaudeClient(config);
}

// ============================================================================
// Singleton Instance (for server-side usage)
// ============================================================================

let defaultClient: ClaudeClient | null = null;

/**
 * Get or create the default Claude client
 * Uses ANTHROPIC_API_KEY from environment
 */
export function getClaudeClient(apiKey?: string): ClaudeClient {
  if (!defaultClient || apiKey) {
    const key = apiKey || process.env.ANTHROPIC_API_KEY;
    if (!key) {
      throw new ClaudeError(
        "ANTHROPIC_API_KEY environment variable is not set",
        "CONFIGURATION_ERROR"
      );
    }
    defaultClient = createClaudeClient({ apiKey: key });
  }
  return defaultClient;
}

export { CLAUDE_MODELS };
