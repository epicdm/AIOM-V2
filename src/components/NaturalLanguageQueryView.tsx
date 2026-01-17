/**
 * Natural Language Query View Component
 * Chat-style interface for querying business operations using natural language
 */

import { useEffect, useRef } from "react";
import {
  MessageSquare,
  Trash2,
  RefreshCw,
  AlertCircle,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { QueryInput } from "~/components/QueryInput";
import { QueryMessageItem } from "~/components/QueryMessageItem";
import { SuggestionChips } from "~/components/SuggestionChips";
import { useNaturalLanguageQuery } from "~/hooks/useNaturalLanguageQuery";
import { cn } from "~/lib/utils";

interface NaturalLanguageQueryViewProps {
  className?: string;
}

export function NaturalLanguageQueryView({ className }: NaturalLanguageQueryViewProps) {
  const {
    messages,
    isLoading,
    error,
    suggestions,
    sendQuery,
    clearConversation,
    regenerateLastResponse,
  } = useNaturalLanguageQuery({
    onError: (err) => console.error("Query error:", err),
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSuggestionSelect = (suggestion: { text: string }) => {
    sendQuery(suggestion.text);
  };

  return (
    <div
      className={cn(
        "flex flex-col h-full",
        "bg-white dark:bg-slate-950",
        "rounded-lg border border-gray-200 dark:border-slate-800",
        "shadow-sm",
        className
      )}
      data-testid="natural-language-query-view"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Business Query Assistant</h2>
            <p className="text-xs text-muted-foreground">
              Ask questions about your business operations
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={regenerateLastResponse}
                disabled={isLoading || messages.length < 2}
                title="Regenerate last response"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearConversation}
                disabled={isLoading}
                title="Clear conversation"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Empty State */}
        {messages.length === 0 && !isLoading && (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <div className="p-4 rounded-full bg-primary/10 mb-4">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              Welcome to the Business Query Assistant
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              Ask questions about expense requests, financial data, users, and more.
              I'll use the available tools to find accurate information for you.
            </p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="font-medium">Try asking:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {[
                  "Show me pending expense requests",
                  "What's the current time?",
                  "Calculate 1500 + 2000",
                  "Who am I?",
                ].map((example, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    onClick={() => sendQuery(example)}
                    className="text-xs"
                  >
                    {example}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Messages List */}
        {messages.map((message) => (
          <QueryMessageItem key={message.id} message={message} />
        ))}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
            <div className="text-sm text-muted-foreground">
              Thinking...
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-700 dark:text-red-400">
                Something went wrong
              </p>
              <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
            </div>
          </div>
        )}

        {/* Suggestions */}
        {!isLoading && suggestions.length > 0 && (
          <SuggestionChips
            suggestions={suggestions}
            onSelect={handleSuggestionSelect}
            disabled={isLoading}
          />
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <QueryInput onSend={sendQuery} isLoading={isLoading} />
    </div>
  );
}
