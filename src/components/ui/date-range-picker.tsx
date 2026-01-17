/**
 * DateRangePicker Component
 *
 * A simple date range picker using native date inputs with
 * preset quick selections for common date ranges.
 */

"use client";

import * as React from "react";
import { Calendar, ChevronDown, X } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";
import {
  startOfDay,
  endOfDay,
  subDays,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfYear,
  format,
} from "date-fns";

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface DateRangePickerProps {
  value?: DateRange;
  onChange?: (range: DateRange) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

// Preset date ranges
const presets = [
  {
    label: "Today",
    getValue: () => ({
      from: startOfDay(new Date()),
      to: endOfDay(new Date()),
    }),
  },
  {
    label: "Yesterday",
    getValue: () => ({
      from: startOfDay(subDays(new Date(), 1)),
      to: endOfDay(subDays(new Date(), 1)),
    }),
  },
  {
    label: "Last 7 days",
    getValue: () => ({
      from: startOfDay(subDays(new Date(), 7)),
      to: endOfDay(new Date()),
    }),
  },
  {
    label: "Last 30 days",
    getValue: () => ({
      from: startOfDay(subDays(new Date(), 30)),
      to: endOfDay(new Date()),
    }),
  },
  {
    label: "This month",
    getValue: () => ({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date()),
    }),
  },
  {
    label: "Last month",
    getValue: () => {
      const lastMonth = subMonths(new Date(), 1);
      return {
        from: startOfMonth(lastMonth),
        to: endOfMonth(lastMonth),
      };
    },
  },
  {
    label: "This year",
    getValue: () => ({
      from: startOfYear(new Date()),
      to: endOfDay(new Date()),
    }),
  },
];

export function DateRangePicker({
  value,
  onChange,
  className,
  placeholder = "Select date range",
  disabled = false,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [tempFrom, setTempFrom] = React.useState<string>("");
  const [tempTo, setTempTo] = React.useState<string>("");
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Sync temp values with incoming value
  React.useEffect(() => {
    if (value?.from) {
      setTempFrom(format(value.from, "yyyy-MM-dd"));
    } else {
      setTempFrom("");
    }
    if (value?.to) {
      setTempTo(format(value.to, "yyyy-MM-dd"));
    } else {
      setTempTo("");
    }
  }, [value]);

  // Handle click outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFrom = e.target.value;
    setTempFrom(newFrom);
    if (onChange) {
      onChange({
        from: newFrom ? startOfDay(new Date(newFrom)) : undefined,
        to: value?.to,
      });
    }
  };

  const handleToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTo = e.target.value;
    setTempTo(newTo);
    if (onChange) {
      onChange({
        from: value?.from,
        to: newTo ? endOfDay(new Date(newTo)) : undefined,
      });
    }
  };

  const handlePresetClick = (preset: (typeof presets)[0]) => {
    const range = preset.getValue();
    onChange?.(range);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange?.({ from: undefined, to: undefined });
  };

  const hasValue = value?.from || value?.to;

  // Format display value
  const displayValue = React.useMemo(() => {
    if (!value?.from && !value?.to) return placeholder;

    if (value.from && value.to) {
      return `${format(value.from, "MMM d, yyyy")} - ${format(value.to, "MMM d, yyyy")}`;
    }

    if (value.from) {
      return `From ${format(value.from, "MMM d, yyyy")}`;
    }

    if (value.to) {
      return `Until ${format(value.to, "MMM d, yyyy")}`;
    }

    return placeholder;
  }, [value, placeholder]);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Trigger Button */}
      <Button
        variant="outline"
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full justify-start text-left font-normal",
          !hasValue && "text-muted-foreground"
        )}
        data-testid="date-range-picker-trigger"
      >
        <Calendar className="mr-2 h-4 w-4" />
        <span className="flex-1 truncate">{displayValue}</span>
        {hasValue ? (
          <X
            className="h-4 w-4 shrink-0 opacity-50 hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
          />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        )}
      </Button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className="absolute top-full left-0 z-50 mt-1 w-full min-w-[300px] rounded-lg border bg-popover p-4 shadow-lg animate-in fade-in-0 zoom-in-95"
          data-testid="date-range-picker-panel"
        >
          {/* Custom Date Inputs */}
          <div className="space-y-3 mb-4">
            <p className="text-sm font-medium text-muted-foreground">
              Custom Range
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  From
                </label>
                <Input
                  type="date"
                  value={tempFrom}
                  onChange={handleFromChange}
                  max={tempTo || undefined}
                  className="text-sm"
                  data-testid="date-from-input"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  To
                </label>
                <Input
                  type="date"
                  value={tempTo}
                  onChange={handleToChange}
                  min={tempFrom || undefined}
                  className="text-sm"
                  data-testid="date-to-input"
                />
              </div>
            </div>
          </div>

          {/* Presets */}
          <div className="border-t pt-3">
            <p className="text-sm font-medium text-muted-foreground mb-2">
              Quick Select
            </p>
            <div className="grid grid-cols-2 gap-2">
              {presets.map((preset) => (
                <Button
                  key={preset.label}
                  variant="outline"
                  size="sm"
                  onClick={() => handlePresetClick(preset)}
                  className="justify-start text-xs"
                  data-testid={`preset-${preset.label.toLowerCase().replace(/\s/g, "-")}`}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Apply/Close Button */}
          <div className="border-t mt-3 pt-3 flex justify-end">
            <Button size="sm" onClick={() => setIsOpen(false)}>
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
