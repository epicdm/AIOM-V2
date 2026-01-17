/**
 * Priority Badge Component
 *
 * Displays a priority level badge with appropriate styling
 */

import { cn } from "~/lib/utils";
import { Badge } from "~/components/ui/badge";
import { Tooltip } from "~/components/ui/tooltip";
import type { PriorityLevel, PriorityFactors } from "~/db/schema";

interface PriorityBadgeProps {
  level: PriorityLevel;
  score?: number | null;
  factors?: PriorityFactors | null;
  reason?: string | null;
  showScore?: boolean;
  showTooltip?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const priorityConfig: Record<
  PriorityLevel,
  {
    label: string;
    emoji: string;
    bgColor: string;
    textColor: string;
    borderColor: string;
  }
> = {
  critical: {
    label: "Critical",
    emoji: "🔴",
    bgColor: "bg-red-100 dark:bg-red-900/40",
    textColor: "text-red-700 dark:text-red-300",
    borderColor: "border-red-300 dark:border-red-700",
  },
  high: {
    label: "High",
    emoji: "🟠",
    bgColor: "bg-orange-100 dark:bg-orange-900/40",
    textColor: "text-orange-700 dark:text-orange-300",
    borderColor: "border-orange-300 dark:border-orange-700",
  },
  normal: {
    label: "Normal",
    emoji: "🟡",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/40",
    textColor: "text-yellow-700 dark:text-yellow-300",
    borderColor: "border-yellow-300 dark:border-yellow-700",
  },
  low: {
    label: "Low",
    emoji: "🟢",
    bgColor: "bg-green-100 dark:bg-green-900/40",
    textColor: "text-green-700 dark:text-green-300",
    borderColor: "border-green-300 dark:border-green-700",
  },
};

const sizeConfig = {
  sm: "text-xs px-1.5 py-0.5",
  md: "text-xs px-2 py-0.5",
  lg: "text-sm px-2.5 py-1",
};

export function PriorityBadge({
  level,
  score,
  factors,
  reason,
  showScore = false,
  showTooltip = true,
  size = "md",
  className,
}: PriorityBadgeProps) {
  const config = priorityConfig[level];

  const badgeContent = (
    <Badge
      variant="outline"
      className={cn(
        config.bgColor,
        config.textColor,
        config.borderColor,
        sizeConfig[size],
        "font-medium",
        className
      )}
    >
      <span className="mr-1">{config.emoji}</span>
      {config.label}
      {showScore && score !== null && score !== undefined && (
        <span className="ml-1 opacity-75">({score})</span>
      )}
    </Badge>
  );

  if (!showTooltip || (!reason && !factors)) {
    return badgeContent;
  }

  // Build tooltip content string
  const tooltipParts: string[] = [];
  if (score !== null && score !== undefined) {
    tooltipParts.push(`Score: ${score}/100`);
  }
  if (reason) {
    tooltipParts.push(reason);
  }
  if (factors && factors.keywords.length > 0) {
    const keywordText = factors.keywords.slice(0, 3).join(", ");
    tooltipParts.push(`Keywords: ${keywordText}${factors.keywords.length > 3 ? "..." : ""}`);
  }

  return (
    <Tooltip content={tooltipParts.join(" | ")}>
      {badgeContent}
    </Tooltip>
  );
}

/**
 * Priority Indicator - A smaller visual indicator
 */
interface PriorityIndicatorProps {
  level: PriorityLevel;
  className?: string;
}

export function PriorityIndicator({ level, className }: PriorityIndicatorProps) {
  const config = priorityConfig[level];

  return (
    <Tooltip content={`${config.label} Priority`}>
      <span
        className={cn(
          "inline-flex items-center justify-center w-5 h-5 rounded-full text-xs",
          config.bgColor,
          className
        )}
      >
        {config.emoji}
      </span>
    </Tooltip>
  );
}

/**
 * Priority Score Bar - Visual representation of the score
 */
interface PriorityScoreBarProps {
  score: number;
  level: PriorityLevel;
  showLabel?: boolean;
  className?: string;
}

export function PriorityScoreBar({
  score,
  level,
  showLabel = true,
  className,
}: PriorityScoreBarProps) {
  const config = priorityConfig[level];

  // Determine bar color based on score
  const getBarColor = () => {
    if (score >= 80) return "bg-red-500";
    if (score >= 60) return "bg-orange-500";
    if (score >= 30) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <div className={cn("w-full", className)}>
      {showLabel && (
        <div className="flex justify-between text-xs mb-1">
          <span className={config.textColor}>{config.label}</span>
          <span className="text-muted-foreground">{score}/100</span>
        </div>
      )}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", getBarColor())}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Priority Stats Card - Shows priority statistics
 */
interface PriorityStatsCardProps {
  totalThreads: number;
  highPriorityCount: number;
  criticalCount: number;
  averageScore: number;
  className?: string;
}

export function PriorityStatsCard({
  totalThreads,
  highPriorityCount,
  criticalCount,
  averageScore,
  className,
}: PriorityStatsCardProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-4 gap-4 p-4 rounded-lg border bg-card",
        className
      )}
    >
      <div className="text-center">
        <p className="text-2xl font-bold">{totalThreads}</p>
        <p className="text-xs text-muted-foreground">Total</p>
      </div>
      <div className="text-center">
        <p className="text-2xl font-bold text-red-600">{criticalCount}</p>
        <p className="text-xs text-muted-foreground">Critical</p>
      </div>
      <div className="text-center">
        <p className="text-2xl font-bold text-orange-600">{highPriorityCount}</p>
        <p className="text-xs text-muted-foreground">High</p>
      </div>
      <div className="text-center">
        <p className="text-2xl font-bold">{Math.round(averageScore)}</p>
        <p className="text-xs text-muted-foreground">Avg Score</p>
      </div>
    </div>
  );
}

export { priorityConfig };
