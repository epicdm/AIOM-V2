import { useState } from "react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { TaskSuggestionCard } from "./TaskSuggestionCard";
import {
  usePendingTaskSuggestions,
  useAcceptTaskSuggestion,
  useDismissTaskSuggestion,
} from "~/hooks/useTaskConversationLinks";
import { Lightbulb, ChevronDown, ChevronUp, Loader2 } from "lucide-react";

interface TaskSuggestionListProps {
  conversationId: string;
  onViewTask?: (taskId: string) => void;
  className?: string;
}

export function TaskSuggestionList({
  conversationId,
  onViewTask,
  className,
}: TaskSuggestionListProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const {
    data: suggestions,
    isLoading,
    error,
  } = usePendingTaskSuggestions(conversationId);

  const { mutate: acceptSuggestion, isPending: isAccepting } =
    useAcceptTaskSuggestion();
  const { mutate: dismissSuggestion, isPending: isDismissing } =
    useDismissTaskSuggestion();

  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleAccept = (suggestionId: string) => {
    setProcessingId(suggestionId);
    acceptSuggestion(suggestionId, {
      onSettled: () => setProcessingId(null),
    });
  };

  const handleDismiss = (suggestionId: string) => {
    setProcessingId(suggestionId);
    dismissSuggestion(suggestionId, {
      onSettled: () => setProcessingId(null),
    });
  };

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center py-4", className)}>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !suggestions || suggestions.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Header */}
      <div
        className="flex items-center justify-between cursor-pointer p-2 rounded-lg hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-primary/10">
            <Lightbulb className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm font-medium">Task Suggestions</span>
          <Badge variant="secondary" className="text-xs">
            {suggestions.length}
          </Badge>
        </div>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Suggestions list */}
      {isExpanded && (
        <div className="space-y-2 pl-2">
          {suggestions.map((suggestion) => (
            <TaskSuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              onAccept={handleAccept}
              onDismiss={handleDismiss}
              onViewTask={onViewTask}
              isAccepting={isAccepting && processingId === suggestion.id}
              isDismissing={isDismissing && processingId === suggestion.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
