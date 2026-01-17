/**
 * Query Input Component
 * Text input for natural language queries with send functionality
 */

import { useState, useRef, useEffect } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { cn } from "~/lib/utils";

interface QueryInputProps {
  onSend: (query: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function QueryInput({
  onSend,
  isLoading = false,
  disabled = false,
  placeholder = "Ask about your business operations...",
  className,
}: QueryInputProps) {
  const [query, setQuery] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus on mount
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  const handleSubmit = () => {
    if (!query.trim() || isLoading || disabled) return;
    onSend(query.trim());
    setQuery("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div
      className={cn(
        "flex items-end gap-2 p-4 border-t",
        "bg-white dark:bg-slate-950",
        "border-gray-200 dark:border-slate-800",
        className
      )}
    >
      <div className="flex-1 relative">
        <Textarea
          ref={textareaRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isLoading || disabled}
          className={cn(
            "min-h-[44px] max-h-[200px] resize-none pr-12",
            "focus:ring-2 focus:ring-primary/20"
          )}
          rows={1}
          data-testid="query-input"
        />
        <span className="absolute right-3 bottom-2 text-xs text-muted-foreground">
          {query.length}/5000
        </span>
      </div>
      <Button
        onClick={handleSubmit}
        disabled={!query.trim() || isLoading || disabled}
        className="h-11 px-4"
        data-testid="send-query-button"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
