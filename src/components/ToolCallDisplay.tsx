/**
 * Tool Call Display Component
 * Displays tool call information including input, status, and results
 */

import { useState } from "react";
import { ChevronDown, ChevronRight, Loader2, CheckCircle2, XCircle, Clock, Wrench } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import type { ToolCallInfo } from "~/hooks/useNaturalLanguageQuery";

interface ToolCallDisplayProps {
  toolCall: ToolCallInfo;
  className?: string;
}

export function ToolCallDisplay({ toolCall, className }: ToolCallDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const statusIcon = {
    pending: <Clock className="h-4 w-4 text-muted-foreground" />,
    executing: <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />,
    completed: <CheckCircle2 className="h-4 w-4 text-green-500" />,
    error: <XCircle className="h-4 w-4 text-red-500" />,
  }[toolCall.status];

  const statusBadgeVariant = {
    pending: "secondary",
    executing: "default",
    completed: "default",
    error: "destructive",
  }[toolCall.status] as "default" | "secondary" | "destructive" | "outline";

  const statusLabel = {
    pending: "Pending",
    executing: "Executing...",
    completed: "Completed",
    error: "Error",
  }[toolCall.status];

  return (
    <div
      className={cn(
        "rounded-lg border transition-all",
        "bg-slate-50 border-slate-200 dark:bg-slate-900/50 dark:border-slate-800",
        className
      )}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-lg transition-colors"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <Wrench className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">{toolCall.toolName}</span>
        </div>
        <div className="flex items-center gap-2">
          {toolCall.executionTimeMs !== undefined && toolCall.status === "completed" && (
            <span className="text-xs text-muted-foreground">
              {toolCall.executionTimeMs}ms
            </span>
          )}
          <Badge variant={statusBadgeVariant} className="gap-1">
            {statusIcon}
            <span className="text-xs">{statusLabel}</span>
          </Badge>
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Input Section */}
          <div className="space-y-1">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Input
            </h4>
            <pre className="text-xs bg-slate-100 dark:bg-slate-800 rounded-md p-2 overflow-x-auto">
              <code className="text-slate-700 dark:text-slate-300">
                {JSON.stringify(toolCall.input, null, 2)}
              </code>
            </pre>
          </div>

          {/* Result Section */}
          {toolCall.status === "completed" && toolCall.result !== undefined && (
            <div className="space-y-1">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Result
              </h4>
              <pre className="text-xs bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-md p-2 overflow-x-auto">
                <code className="text-green-700 dark:text-green-300">
                  {JSON.stringify(toolCall.result, null, 2)}
                </code>
              </pre>
            </div>
          )}

          {/* Error Section */}
          {toolCall.status === "error" && toolCall.error && (
            <div className="space-y-1">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Error
              </h4>
              <div className="text-xs bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md p-2 text-red-700 dark:text-red-300">
                {toolCall.error}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface ToolCallListProps {
  toolCalls: ToolCallInfo[];
  className?: string;
}

export function ToolCallList({ toolCalls, className }: ToolCallListProps) {
  if (toolCalls.length === 0) return null;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Wrench className="h-3 w-3" />
        <span>{toolCalls.length} tool{toolCalls.length !== 1 ? "s" : ""} used</span>
      </div>
      {toolCalls.map((toolCall) => (
        <ToolCallDisplay key={toolCall.id} toolCall={toolCall} />
      ))}
    </div>
  );
}
