/**
 * Call Summary Panel Component
 *
 * Displays AI-generated call summaries with key points,
 * action items, and sentiment analysis.
 */

import * as React from "react";
import {
  Sparkles,
  RefreshCw,
  CheckCircle2,
  Circle,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  Minus,
  ChevronDown,
  ChevronUp,
  Loader2,
  ListChecks,
  MessageSquareText,
  BarChart3,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { cn } from "~/lib/utils";
import {
  useCallSummaryForCall,
  useMarkActionItemCompleted,
} from "~/hooks/useCallSummaries";
import type {
  CallKeyPoint,
  CallActionItem,
  CallSentimentDetails,
  CallSentiment,
} from "~/db/schema";

// =============================================================================
// Types
// =============================================================================

interface CallSummaryPanelProps {
  callRecordId: string;
  className?: string;
  defaultExpanded?: boolean;
}

// =============================================================================
// Helper Components
// =============================================================================

function SentimentBadge({ sentiment, score }: { sentiment: CallSentiment; score?: number | null }) {
  const config = {
    positive: {
      icon: ThumbsUp,
      label: "Positive",
      className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
    },
    negative: {
      icon: ThumbsDown,
      label: "Negative",
      className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
    },
    neutral: {
      icon: Minus,
      label: "Neutral",
      className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100",
    },
    mixed: {
      icon: AlertCircle,
      label: "Mixed",
      className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
    },
  };

  const { icon: Icon, label, className } = config[sentiment] || config.neutral;

  return (
    <Badge className={cn("flex items-center gap-1", className)}>
      <Icon className="h-3 w-3" />
      <span>{label}</span>
      {score !== null && score !== undefined && (
        <span className="ml-1 opacity-70">({(score * 100).toFixed(0)}%)</span>
      )}
    </Badge>
  );
}

function PriorityBadge({ priority }: { priority: "high" | "medium" | "low" }) {
  const config = {
    high: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
    medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
    low: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
  };

  return (
    <Badge className={cn("text-xs", config[priority])}>
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </Badge>
  );
}

function ImportanceBadge({ importance }: { importance: "high" | "medium" | "low" }) {
  const config = {
    high: "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950",
    medium: "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950",
    low: "border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950",
  };

  return (
    <div
      className={cn(
        "h-2 w-2 rounded-full border",
        config[importance]
      )}
      title={`${importance} importance`}
    />
  );
}

// =============================================================================
// Key Points Section
// =============================================================================

function KeyPointsSection({ keyPoints }: { keyPoints: CallKeyPoint[] }) {
  const sortedPoints = [...keyPoints].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.importance] - order[b.importance];
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <MessageSquareText className="h-4 w-4" />
        <span>Key Points</span>
        <Badge variant="secondary" className="text-xs">
          {keyPoints.length}
        </Badge>
      </div>
      <ul className="space-y-2">
        {sortedPoints.map((point) => (
          <li
            key={point.id}
            className="flex items-start gap-2 text-sm"
          >
            <ImportanceBadge importance={point.importance} />
            <span className="flex-1">{point.content}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// =============================================================================
// Action Items Section
// =============================================================================

function ActionItemsSection({
  actionItems,
  summaryId,
}: {
  actionItems: CallActionItem[];
  summaryId: string;
}) {
  const markCompleted = useMarkActionItemCompleted();

  const handleToggle = (actionItemId: string, completed: boolean) => {
    if (!completed) {
      markCompleted.mutate({ summaryId, actionItemId });
    }
  };

  const pendingItems = actionItems.filter((item) => !item.completed);
  const completedItems = actionItems.filter((item) => item.completed);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <ListChecks className="h-4 w-4" />
        <span>Action Items</span>
        <Badge variant="secondary" className="text-xs">
          {pendingItems.length} pending
        </Badge>
      </div>
      <ul className="space-y-2">
        {pendingItems.map((item) => (
          <li
            key={item.id}
            className="flex items-start gap-3 rounded-lg border p-3"
          >
            <Checkbox
              checked={item.completed}
              onCheckedChange={() => handleToggle(item.id, item.completed)}
              disabled={markCompleted.isPending}
              className="mt-0.5"
            />
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{item.title}</span>
                <PriorityBadge priority={item.priority} />
              </div>
              {item.description && (
                <p className="text-xs text-muted-foreground">{item.description}</p>
              )}
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {item.assignee && <span>Assignee: {item.assignee}</span>}
                {item.dueDate && <span>Due: {item.dueDate}</span>}
              </div>
            </div>
          </li>
        ))}
        {completedItems.length > 0 && (
          <div className="space-y-2 opacity-60">
            <div className="text-xs text-muted-foreground">Completed ({completedItems.length})</div>
            {completedItems.map((item) => (
              <li
                key={item.id}
                className="flex items-start gap-3 rounded-lg border border-dashed p-3"
              >
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                <span className="text-sm line-through">{item.title}</span>
              </li>
            ))}
          </div>
        )}
      </ul>
    </div>
  );
}

// =============================================================================
// Sentiment Details Section
// =============================================================================

function SentimentDetailsSection({ details }: { details: CallSentimentDetails }) {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <div className="space-y-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <BarChart3 className="h-4 w-4" />
        <span>Sentiment Analysis</span>
        {expanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      {expanded && (
        <div className="space-y-3 rounded-lg border p-4 bg-muted/30">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Confidence:</span>
              <span className="ml-2 font-medium">
                {(details.confidence * 100).toFixed(0)}%
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Score:</span>
              <span className="ml-2 font-medium">
                {details.score > 0 ? "+" : ""}{details.score.toFixed(2)}
              </span>
            </div>
          </div>

          {(details.customerMood || details.agentMood) && (
            <div className="space-y-1 text-sm">
              {details.customerMood && (
                <div>
                  <span className="text-muted-foreground">Customer Mood:</span>
                  <span className="ml-2">{details.customerMood}</span>
                </div>
              )}
              {details.agentMood && (
                <div>
                  <span className="text-muted-foreground">Agent Mood:</span>
                  <span className="ml-2">{details.agentMood}</span>
                </div>
              )}
            </div>
          )}

          {details.emotions.length > 0 && (
            <div>
              <span className="text-sm text-muted-foreground">Emotions Detected:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {details.emotions.map((emotion, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {emotion}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {details.keywords.length > 0 && (
            <div>
              <span className="text-sm text-muted-foreground">Key Topics:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {details.keywords.map((keyword, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {keyword}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function CallSummaryPanel({
  callRecordId,
  className,
  defaultExpanded = true,
}: CallSummaryPanelProps) {
  const [expanded, setExpanded] = React.useState(defaultExpanded);
  const {
    summary,
    hasSummary,
    isLoading,
    isGenerating,
    isRegenerating,
    error,
    generate,
    regenerate,
  } = useCallSummaryForCall(callRecordId);

  if (isLoading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardHeader>
          <div className="h-6 w-32 bg-muted rounded" />
          <div className="h-4 w-48 bg-muted rounded" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="h-4 w-full bg-muted rounded" />
            <div className="h-4 w-3/4 bg-muted rounded" />
            <div className="h-4 w-1/2 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn("border-red-200 dark:border-red-800", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            Error Loading Summary
          </CardTitle>
          <CardDescription>
            {error instanceof Error ? error.message : "Failed to load call summary"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" size="sm" onClick={() => generate()}>
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!hasSummary && !summary) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-purple-500" />
            AI Call Summary
          </CardTitle>
          <CardDescription>
            Generate an AI-powered summary of this call including key points,
            action items, and sentiment analysis.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => generate()}
            disabled={isGenerating}
            className="flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Summary
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader
        className="cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-purple-500" />
            AI Call Summary
          </CardTitle>
          <div className="flex items-center gap-2">
            {summary.sentiment && (
              <SentimentBadge
                sentiment={summary.sentiment as CallSentiment}
                score={summary.sentimentScore}
              />
            )}
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
        {!expanded && (
          <CardDescription className="line-clamp-2">
            {summary.summary}
          </CardDescription>
        )}
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-6">
          {/* Main Summary */}
          <div className="space-y-2">
            <p className="text-sm leading-relaxed">{summary.summary}</p>
          </div>

          {/* Key Points */}
          {summary.keyPoints && summary.keyPoints.length > 0 && (
            <KeyPointsSection keyPoints={summary.keyPoints} />
          )}

          {/* Action Items */}
          {summary.actionItems && summary.actionItems.length > 0 && (
            <ActionItemsSection
              actionItems={summary.actionItems}
              summaryId={summary.id}
            />
          )}

          {/* Sentiment Details */}
          {summary.sentimentDetails && (
            <SentimentDetailsSection details={summary.sentimentDetails} />
          )}

          {/* Regenerate Button */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="text-xs text-muted-foreground">
              {summary.model && <span>Model: {summary.model}</span>}
              {summary.tokensUsed && (
                <span className="ml-2">• {summary.tokensUsed} tokens</span>
              )}
              {summary.generationTimeMs && (
                <span className="ml-2">
                  • {(summary.generationTimeMs / 1000).toFixed(1)}s
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                regenerate();
              }}
              disabled={isRegenerating}
              className="text-xs"
            >
              {isRegenerating ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  Regenerating...
                </>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Regenerate
                </>
              )}
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default CallSummaryPanel;
