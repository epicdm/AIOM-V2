/**
 * Suggestion Chips Component
 * Displays follow-up suggestions as clickable chips
 */

import { Sparkles } from "lucide-react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import type { FollowUpSuggestion } from "~/hooks/useNaturalLanguageQuery";

interface SuggestionChipsProps {
  suggestions: FollowUpSuggestion[];
  onSelect: (suggestion: FollowUpSuggestion) => void;
  disabled?: boolean;
  className?: string;
}

export function SuggestionChips({
  suggestions,
  onSelect,
  disabled = false,
  className,
}: SuggestionChipsProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Sparkles className="h-4 w-4 text-primary" />
        <span>Suggested follow-ups</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion) => (
          <Button
            key={suggestion.id}
            variant="outline"
            size="sm"
            onClick={() => onSelect(suggestion)}
            disabled={disabled}
            className={cn(
              "text-left h-auto py-2 px-3 whitespace-normal",
              "hover:bg-primary/5 hover:border-primary/30 hover:text-primary",
              "transition-all duration-200"
            )}
          >
            {suggestion.text}
          </Button>
        ))}
      </div>
    </div>
  );
}
