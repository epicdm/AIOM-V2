/**
 * RuleCard Component
 *
 * Displays a single task auto-creation rule in a card format
 * with status indicators and quick actions.
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Play,
  Pause,
  Archive,
  Trash2,
  MoreVertical,
  Zap,
  Clock,
  CheckCircle,
  AlertCircle,
  Settings,
} from "lucide-react";
import type { TaskAutoCreationRuleWithCreator } from "~/data-access/task-auto-creation-rules";

// =============================================================================
// Types
// =============================================================================

interface RuleCardProps {
  rule: TaskAutoCreationRuleWithCreator;
  onActivate?: (id: string) => void;
  onPause?: (id: string) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
  onTrigger?: (id: string) => void;
  isLoading?: boolean;
}

// =============================================================================
// Helper Functions
// =============================================================================

const getTriggerTypeLabel = (triggerType: string): string => {
  const labels: Record<string, string> = {
    new_customer: "New Customer",
    overdue_invoice: "Overdue Invoice",
    low_inventory: "Low Inventory",
    expense_approved: "Expense Approved",
    expense_rejected: "Expense Rejected",
    call_completed: "Call Completed",
    customer_inactive: "Customer Inactive",
    subscription_expiring: "Subscription Expiring",
    manual: "Manual",
    scheduled: "Scheduled",
    custom: "Custom",
  };
  return labels[triggerType] || triggerType;
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case "active":
      return "bg-green-500/10 text-green-600 border-green-500/20";
    case "paused":
      return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
    case "disabled":
      return "bg-gray-500/10 text-gray-600 border-gray-500/20";
    case "archived":
      return "bg-red-500/10 text-red-600 border-red-500/20";
    default:
      return "bg-gray-500/10 text-gray-600 border-gray-500/20";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "active":
      return <CheckCircle className="h-3 w-3" />;
    case "paused":
      return <Pause className="h-3 w-3" />;
    case "disabled":
      return <AlertCircle className="h-3 w-3" />;
    case "archived":
      return <Archive className="h-3 w-3" />;
    default:
      return null;
  }
};

// =============================================================================
// Component
// =============================================================================

export function RuleCard({
  rule,
  onActivate,
  onPause,
  onArchive,
  onDelete,
  onEdit,
  onTrigger,
  isLoading = false,
}: RuleCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleAction = (action: () => void) => {
    setIsMenuOpen(false);
    action();
  };

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-medium truncate">
              {rule.name}
            </CardTitle>
            {rule.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {rule.description}
              </p>
            )}
          </div>
          <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                disabled={isLoading}
              >
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {onEdit && (
                <DropdownMenuItem onClick={() => handleAction(() => onEdit(rule.id))}>
                  <Settings className="h-4 w-4 mr-2" />
                  Edit Rule
                </DropdownMenuItem>
              )}
              {onTrigger && rule.status === "active" && (
                <DropdownMenuItem onClick={() => handleAction(() => onTrigger(rule.id))}>
                  <Zap className="h-4 w-4 mr-2" />
                  Trigger Now
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {rule.status !== "active" && onActivate && (
                <DropdownMenuItem onClick={() => handleAction(() => onActivate(rule.id))}>
                  <Play className="h-4 w-4 mr-2" />
                  Activate
                </DropdownMenuItem>
              )}
              {rule.status === "active" && onPause && (
                <DropdownMenuItem onClick={() => handleAction(() => onPause(rule.id))}>
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </DropdownMenuItem>
              )}
              {rule.status !== "archived" && onArchive && (
                <DropdownMenuItem onClick={() => handleAction(() => onArchive(rule.id))}>
                  <Archive className="h-4 w-4 mr-2" />
                  Archive
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleAction(() => onDelete(rule.id))}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Badge */}
          <Badge variant="outline" className={getStatusColor(rule.status)}>
            {getStatusIcon(rule.status)}
            <span className="ml-1 capitalize">{rule.status}</span>
          </Badge>

          {/* Trigger Type Badge */}
          <Badge variant="secondary">
            <Zap className="h-3 w-3 mr-1" />
            {getTriggerTypeLabel(rule.triggerType)}
          </Badge>

          {/* Stats */}
          <div className="flex items-center gap-3 ml-auto text-xs text-muted-foreground">
            {(rule.totalTriggered ?? 0) > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {rule.totalTriggered} triggers
              </span>
            )}
            {(rule.totalTasksCreated ?? 0) > 0 && (
              <span className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                {rule.totalTasksCreated} tasks
              </span>
            )}
          </div>
        </div>

        {/* Last Triggered */}
        {rule.lastTriggeredAt && (
          <p className="text-xs text-muted-foreground mt-3">
            Last triggered:{" "}
            {new Date(rule.lastTriggeredAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default RuleCard;
