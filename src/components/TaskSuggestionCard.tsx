import { useState } from "react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Tooltip } from "~/components/ui/tooltip";
import {
  Lightbulb,
  CheckCircle,
  XCircle,
  Calendar,
  Loader2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { TaskSuggestionWithReviewer } from "~/data-access/task-conversation-links";

interface TaskSuggestionCardProps {
  suggestion: TaskSuggestionWithReviewer;
  onAccept?: (suggestionId: string) => void;
  onDismiss?: (suggestionId: string) => void;
  onViewTask?: (taskId: string) => void;
  isAccepting?: boolean;
  isDismissing?: boolean;
}

function formatDate(date: Date | null): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getConfidenceBadge(score: number | null) {
  if (score === null) return null;

  if (score >= 0.8) {
    return (
      <Badge variant="default" className="bg-green-500">
        High Confidence
      </Badge>
    );
  } else if (score >= 0.5) {
    return (
      <Badge variant="secondary">
        Medium Confidence
      </Badge>
    );
  } else {
    return (
      <Badge variant="outline">
        Low Confidence
      </Badge>
    );
  }
}

function getPriorityBadge(priority: string | null) {
  if (!priority) return null;

  const priorityColors: Record<string, string> = {
    urgent: "bg-red-500 text-white",
    high: "bg-orange-500 text-white",
    medium: "bg-yellow-500 text-black",
    low: "bg-blue-500 text-white",
  };

  return (
    <Badge className={cn(priorityColors[priority.toLowerCase()] || "")}>
      {priority}
    </Badge>
  );
}

export function TaskSuggestionCard({
  suggestion,
  onAccept,
  onDismiss,
  onViewTask,
  isAccepting = false,
  isDismissing = false,
}: TaskSuggestionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const relevanceKeywords = suggestion.relevanceKeywords
    ? JSON.parse(suggestion.relevanceKeywords)
    : [];

  const isPending = suggestion.status === "pending";
  const isAcceptedOrDismissed = ["accepted", "dismissed"].includes(suggestion.status);

  return (
    <Card
      className={cn(
        "transition-all duration-200",
        isPending && "border-primary/30 hover:border-primary/50",
        suggestion.status === "accepted" && "border-green-500/30 bg-green-500/5",
        suggestion.status === "dismissed" && "border-muted opacity-60"
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "p-1.5 rounded-md",
                isPending && "bg-primary/10",
                suggestion.status === "accepted" && "bg-green-500/10",
                suggestion.status === "dismissed" && "bg-muted"
              )}
            >
              <Lightbulb
                className={cn(
                  "h-4 w-4",
                  isPending && "text-primary",
                  suggestion.status === "accepted" && "text-green-500",
                  suggestion.status === "dismissed" && "text-muted-foreground"
                )}
              />
            </div>
            <div>
              <CardTitle className="text-sm font-medium">
                {suggestion.taskTitle || "Task Suggestion"}
              </CardTitle>
              {suggestion.suggestedTaskId && (
                <CardDescription className="text-xs">
                  Task #{suggestion.suggestedTaskId}
                </CardDescription>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            {getPriorityBadge(suggestion.taskPriority)}
            {getConfidenceBadge(suggestion.confidenceScore)}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Suggestion reason */}
        <p className="text-sm text-muted-foreground">
          {suggestion.suggestionReason}
        </p>

        {/* Task details (expandable) */}
        {(suggestion.taskDescription || suggestion.taskDeadline) && (
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-0 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  Hide details
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  Show details
                </>
              )}
            </Button>

            {isExpanded && (
              <div className="mt-2 space-y-2 pl-2 border-l-2 border-muted">
                {suggestion.taskDescription && (
                  <p className="text-sm text-muted-foreground">
                    {suggestion.taskDescription}
                  </p>
                )}

                {suggestion.taskDeadline && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>Due: {formatDate(suggestion.taskDeadline)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Relevance keywords */}
        {relevanceKeywords.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {relevanceKeywords.map((keyword: string, index: number) => (
              <Badge
                key={index}
                variant="outline"
                className="text-xs px-1.5 py-0"
              >
                {keyword}
              </Badge>
            ))}
          </div>
        )}

        {/* Action buttons */}
        {isPending && (
          <div className="flex items-center gap-2 pt-2">
            <Tooltip content="Link this task to the conversation">
              <Button
                variant="default"
                size="sm"
                onClick={() => onAccept?.(suggestion.id)}
                disabled={isAccepting || isDismissing}
              >
                {isAccepting ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-1" />
                )}
                Accept
              </Button>
            </Tooltip>

            <Tooltip content="This suggestion is not relevant">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDismiss?.(suggestion.id)}
                disabled={isAccepting || isDismissing}
              >
                {isDismissing ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4 mr-1" />
                )}
                Dismiss
              </Button>
            </Tooltip>

            {suggestion.suggestedTaskId && onViewTask && (
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto"
                onClick={() => onViewTask(suggestion.suggestedTaskId!)}
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                View Task
              </Button>
            )}
          </div>
        )}

        {/* Status indicator for reviewed suggestions */}
        {isAcceptedOrDismissed && suggestion.reviewedBy && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
            {suggestion.status === "accepted" ? (
              <CheckCircle className="h-3 w-3 text-green-500" />
            ) : (
              <XCircle className="h-3 w-3 text-muted-foreground" />
            )}
            <span>
              {suggestion.status === "accepted" ? "Accepted" : "Dismissed"} by{" "}
              {suggestion.reviewedBy.name}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
