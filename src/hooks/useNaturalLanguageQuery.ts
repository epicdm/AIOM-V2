/**
 * Natural Language Query Hook
 * Custom hook for managing a chat-style interface for querying business operations
 */

import { useState, useCallback, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { sendClaudeMessageWithToolsFn } from "~/fn/claude";
import { getClaudeToolsFn, executeToolFn } from "~/fn/tool-registry";
import type { ClaudeModel, ContentBlock, Message } from "~/lib/claude";

// Type for the response from Claude
interface ClaudeResponse {
  success: boolean;
  response?: {
    id: string;
    content: ContentBlock[];
    model: string;
    stopReason: string | null;
    usage: unknown;
  };
  error?: string;
}

// ============================================================================
// Types
// ============================================================================

export interface QueryMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: Date;
  isStreaming?: boolean;
  toolCalls?: ToolCallInfo[];
}

export interface ToolCallInfo {
  id: string;
  toolId: string;
  toolName: string;
  input: Record<string, unknown>;
  status: "pending" | "executing" | "completed" | "error";
  result?: unknown;
  error?: string;
  executionTimeMs?: number;
}

export interface FollowUpSuggestion {
  id: string;
  text: string;
  category?: string;
}

export interface UseNaturalLanguageQueryOptions {
  model?: ClaudeModel;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  onError?: (error: string) => void;
  onToolCall?: (toolCall: ToolCallInfo) => void;
  onToolResult?: (toolId: string, result: unknown) => void;
}

export interface UseNaturalLanguageQueryReturn {
  messages: QueryMessage[];
  isLoading: boolean;
  error: string | null;
  suggestions: FollowUpSuggestion[];
  sendQuery: (query: string) => Promise<void>;
  clearConversation: () => void;
  regenerateLastResponse: () => Promise<void>;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_SYSTEM_PROMPT = `You are an intelligent business operations assistant for the AIOM platform. You help users query and manage their business data through natural language.

You have access to various tools to help answer questions about:
- Expense requests and approvals
- Financial data and calculations
- User information
- Business analytics

When responding:
1. Use the available tools to gather accurate data
2. Present information in a clear, organized manner
3. Suggest follow-up actions or queries the user might find helpful
4. If you cannot find specific data, explain what you tried and suggest alternatives

After each response, include 2-3 suggested follow-up questions that would be helpful based on the conversation context. Format these as a JSON array at the end of your response like this:
[SUGGESTIONS]
["What is the total approved amount this month?", "Show me pending requests", "Who has the highest expense requests?"]
[/SUGGESTIONS]`;

// ============================================================================
// Hook Implementation
// ============================================================================

export function useNaturalLanguageQuery(
  options: UseNaturalLanguageQueryOptions = {}
): UseNaturalLanguageQueryReturn {
  const [messages, setMessages] = useState<QueryMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<FollowUpSuggestion[]>([]);
  const messageIdCounter = useRef(0);

  const systemPrompt = options.systemPrompt || DEFAULT_SYSTEM_PROMPT;

  // Mutation for sending messages to Claude with tools
  const sendClaudeMutation = useMutation({
    mutationFn: sendClaudeMessageWithToolsFn,
  });

  // Generate unique message ID
  const generateMessageId = useCallback(() => {
    messageIdCounter.current += 1;
    return `nlq-msg-${Date.now()}-${messageIdCounter.current}`;
  }, []);

  // Generate unique tool call ID
  const generateToolCallId = useCallback(() => {
    return `tc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Parse suggestions from response
  const parseSuggestions = useCallback((text: string): { cleanText: string; suggestions: FollowUpSuggestion[] } => {
    const suggestionMatch = text.match(/\[SUGGESTIONS\]([\s\S]*?)\[\/SUGGESTIONS\]/);

    if (!suggestionMatch) {
      return { cleanText: text, suggestions: [] };
    }

    const cleanText = text.replace(/\[SUGGESTIONS\][\s\S]*?\[\/SUGGESTIONS\]/, "").trim();

    try {
      const suggestionsArray = JSON.parse(suggestionMatch[1].trim());
      const suggestions: FollowUpSuggestion[] = suggestionsArray.map((text: string, index: number) => ({
        id: `sugg-${Date.now()}-${index}`,
        text,
      }));
      return { cleanText, suggestions };
    } catch {
      return { cleanText: text, suggestions: [] };
    }
  }, []);

  // Execute a tool and return results
  const executeTool = useCallback(async (
    toolId: string,
    input: Record<string, unknown>
  ): Promise<{ success: boolean; result?: unknown; error?: string }> => {
    try {
      const response = await executeToolFn({
        data: {
          toolId,
          input,
        },
      });

      if (response.success && response.result) {
        return { success: true, result: response.result.data };
      } else {
        return { success: false, error: response.error || "Tool execution failed" };
      }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Tool execution failed"
      };
    }
  }, []);

  // Send a query to Claude
  const sendQuery = useCallback(
    async (query: string) => {
      if (!query.trim()) return;

      setError(null);
      setIsLoading(true);
      setSuggestions([]);

      // Add user message
      const userMessage: QueryMessage = {
        id: generateMessageId(),
        role: "user",
        content: query,
        createdAt: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);

      try {
        // Get available tools
        const toolsResponse = await getClaudeToolsFn({ data: {} });
        const tools = Array.isArray(toolsResponse) ? toolsResponse : [];

        // Prepare messages for API (convert to Claude format)
        const apiMessages = [
          ...messages.map((msg) => ({
            role: msg.role as "user" | "assistant",
            content: msg.content,
          })),
          { role: "user" as const, content: query },
        ];

        // Track tool calls for this message
        const toolCalls: ToolCallInfo[] = [];

        // Send initial request
        let continueLoop = true;
        let currentMessages = apiMessages;

        while (continueLoop) {
          const rawResult = await sendClaudeMutation.mutateAsync({
            data: {
              messages: currentMessages as Message[],
              tools: tools,
              toolChoice: { type: "auto" },
              model: options.model,
              system: systemPrompt,
              maxTokens: options.maxTokens || 4096,
              temperature: options.temperature ?? 0.7,
            },
          });

          // Cast result to our expected type
          const result = rawResult as ClaudeResponse;

          if (!result.success || !result.response) {
            setError(result.error || "Failed to get response");
            options.onError?.(result.error || "Failed to get response");
            // Remove user message on error
            setMessages((prev) => prev.slice(0, -1));
            break;
          }

          // Check for tool use blocks
          const toolUseBlocks = result.response.content.filter(
            (block: ContentBlock): block is { type: "tool_use"; id: string; name: string; input: Record<string, unknown> } =>
              block.type === "tool_use"
          );

          if (toolUseBlocks.length === 0) {
            // No tool calls, extract text response
            const textContent = result.response.content
              .filter((block: ContentBlock): block is { type: "text"; text: string } => block.type === "text")
              .map((block: { type: "text"; text: string }) => block.text)
              .join("\n");

            // Parse suggestions from response
            const { cleanText, suggestions: parsedSuggestions } = parseSuggestions(textContent);
            setSuggestions(parsedSuggestions);

            // Add assistant message with tool calls
            const assistantMessage: QueryMessage = {
              id: generateMessageId(),
              role: "assistant",
              content: cleanText,
              createdAt: new Date(),
              toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
            };

            setMessages((prev) => [...prev, assistantMessage]);
            continueLoop = false;
          } else {
            // Process tool calls
            const toolResults: ContentBlock[] = [];

            for (const toolUse of toolUseBlocks) {
              const toolCallInfo: ToolCallInfo = {
                id: generateToolCallId(),
                toolId: toolUse.name,
                toolName: toolUse.name,
                input: toolUse.input,
                status: "executing",
              };

              toolCalls.push(toolCallInfo);
              options.onToolCall?.(toolCallInfo);

              // Execute the tool
              const startTime = Date.now();
              const { success, result: toolResult, error: toolError } = await executeTool(
                toolUse.name,
                toolUse.input
              );

              const executionTime = Date.now() - startTime;

              // Update tool call status
              const toolCallIndex = toolCalls.findIndex((tc) => tc.id === toolCallInfo.id);
              if (toolCallIndex !== -1) {
                toolCalls[toolCallIndex] = {
                  ...toolCalls[toolCallIndex],
                  status: success ? "completed" : "error",
                  result: toolResult,
                  error: toolError,
                  executionTimeMs: executionTime,
                };
              }

              if (success) {
                options.onToolResult?.(toolUse.name, toolResult);
                toolResults.push({
                  type: "tool_result",
                  tool_use_id: toolUse.id,
                  content: typeof toolResult === "string" ? toolResult : JSON.stringify(toolResult),
                });
              } else {
                toolResults.push({
                  type: "tool_result",
                  tool_use_id: toolUse.id,
                  content: toolError || "Tool execution failed",
                  is_error: true,
                });
              }
            }

            // Continue conversation with tool results
            currentMessages = [
              ...currentMessages,
              { role: "assistant" as const, content: result.response.content as unknown as string },
              { role: "user" as const, content: toolResults as unknown as string },
            ];
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to send query";
        setError(errorMessage);
        options.onError?.(errorMessage);
        // Remove user message on error
        setMessages((prev) => prev.slice(0, -1));
      } finally {
        setIsLoading(false);
      }
    },
    [
      messages,
      options,
      systemPrompt,
      sendClaudeMutation,
      generateMessageId,
      generateToolCallId,
      parseSuggestions,
      executeTool,
    ]
  );

  // Clear conversation
  const clearConversation = useCallback(() => {
    setMessages([]);
    setError(null);
    setSuggestions([]);
  }, []);

  // Regenerate last response
  const regenerateLastResponse = useCallback(async () => {
    if (messages.length < 2) return;

    // Find last user message
    const lastUserMessageIndex = messages
      .map((m, i) => ({ role: m.role, index: i }))
      .filter((m) => m.role === "user")
      .pop()?.index;

    if (lastUserMessageIndex === undefined) return;

    const userMessage = messages[lastUserMessageIndex];
    const messagesBeforeLastExchange = messages.slice(0, lastUserMessageIndex);

    setMessages(messagesBeforeLastExchange);
    await sendQuery(userMessage.content);
  }, [messages, sendQuery]);

  return {
    messages,
    isLoading,
    error,
    suggestions,
    sendQuery,
    clearConversation,
    regenerateLastResponse,
  };
}
