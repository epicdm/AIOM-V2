/**
 * Query Message Item Component
 * Displays a single message in the natural language query interface
 */

import { User, Bot } from "lucide-react";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { ToolCallList } from "~/components/ToolCallDisplay";
import { cn } from "~/lib/utils";
import type { QueryMessage } from "~/hooks/useNaturalLanguageQuery";

interface QueryMessageItemProps {
  message: QueryMessage;
  className?: string;
}

export function QueryMessageItem({ message, className }: QueryMessageItemProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex gap-3",
        isUser ? "flex-row-reverse" : "flex-row",
        className
      )}
      data-testid={`query-message-${message.role}`}
    >
      {/* Avatar */}
      <Avatar className={cn(
        "h-8 w-8 shrink-0",
        isUser
          ? "bg-primary text-primary-foreground"
          : "bg-slate-200 dark:bg-slate-700"
      )}>
        <AvatarFallback className={cn(
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-slate-200 dark:bg-slate-700"
        )}>
          {isUser ? (
            <User className="h-4 w-4" />
          ) : (
            <Bot className="h-4 w-4" />
          )}
        </AvatarFallback>
      </Avatar>

      {/* Message Content */}
      <div
        className={cn(
          "flex flex-col gap-2 max-w-[80%]",
          isUser ? "items-end" : "items-start"
        )}
      >
        {/* Message Bubble */}
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm",
            isUser
              ? "bg-primary text-primary-foreground rounded-tr-sm"
              : "bg-slate-100 dark:bg-slate-800 text-foreground rounded-tl-sm"
          )}
        >
          {message.isStreaming ? (
            <span className="inline-flex items-center gap-1">
              <span>{message.content}</span>
              <span className="animate-pulse">▊</span>
            </span>
          ) : (
            <div className="whitespace-pre-wrap break-words">
              {message.content}
            </div>
          )}
        </div>

        {/* Tool Calls (only for assistant messages) */}
        {!isUser && message.toolCalls && message.toolCalls.length > 0 && (
          <ToolCallList toolCalls={message.toolCalls} className="w-full" />
        )}

        {/* Timestamp */}
        <span className="text-xs text-muted-foreground">
          {message.createdAt.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
    </div>
  );
}
