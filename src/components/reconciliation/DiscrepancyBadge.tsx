import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import type { DiscrepancyInfo } from "~/data-access/expense-reconciliation";

interface DiscrepancyBadgeProps {
  discrepancy: DiscrepancyInfo;
  className?: string;
}

const severityConfig = {
  critical: {
    icon: AlertCircle,
    variant: "destructive" as const,
    className: "bg-red-100 text-red-800 border-red-200",
  },
  warning: {
    icon: AlertTriangle,
    variant: "outline" as const,
    className: "bg-amber-100 text-amber-800 border-amber-200",
  },
  info: {
    icon: Info,
    variant: "secondary" as const,
    className: "bg-blue-100 text-blue-800 border-blue-200",
  },
};

export function DiscrepancyBadge({ discrepancy, className }: DiscrepancyBadgeProps) {
  const config = severityConfig[discrepancy.severity];
  const Icon = config.icon;

  return (
    <Badge
      variant={config.variant}
      className={cn(config.className, "gap-1", className)}
    >
      <Icon className="h-3 w-3" />
      {discrepancy.fieldLabel}
    </Badge>
  );
}

interface DiscrepancyListProps {
  discrepancies: DiscrepancyInfo[];
  showDetails?: boolean;
  className?: string;
}

export function DiscrepancyList({ discrepancies, showDetails = false, className }: DiscrepancyListProps) {
  if (discrepancies.length === 0) {
    return (
      <div className={cn("flex items-center gap-2 text-green-600", className)}>
        <div className="h-2 w-2 rounded-full bg-green-500" />
        <span className="text-sm">No discrepancies found</span>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap gap-2">
        {discrepancies.map((d, i) => (
          <DiscrepancyBadge key={`${d.field}-${i}`} discrepancy={d} />
        ))}
      </div>
      {showDetails && (
        <ul className="space-y-1 text-sm text-muted-foreground">
          {discrepancies.map((d, i) => (
            <li key={`detail-${d.field}-${i}`} className="flex items-start gap-2">
              <span className={cn(
                "mt-1.5 h-1.5 w-1.5 rounded-full shrink-0",
                d.severity === "critical" && "bg-red-500",
                d.severity === "warning" && "bg-amber-500",
                d.severity === "info" && "bg-blue-500"
              )} />
              {d.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
