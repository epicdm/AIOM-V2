/**
 * RulesList Component
 *
 * Displays a list of task auto-creation rules with filtering and actions.
 */

import { useState } from "react";
import { RuleCard } from "./RuleCard";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Plus, Search, Filter, RefreshCw } from "lucide-react";
import type { TaskAutoCreationRuleWithCreator, TaskRuleStatus, TaskRuleTriggerType } from "~/data-access/task-auto-creation-rules";

// =============================================================================
// Types
// =============================================================================

interface RulesListProps {
  rules: TaskAutoCreationRuleWithCreator[];
  isLoading?: boolean;
  onCreateNew?: () => void;
  onEdit?: (id: string) => void;
  onActivate?: (id: string) => void;
  onPause?: (id: string) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
  onTrigger?: (id: string) => void;
  onRefresh?: () => void;
  onFilterChange?: (filters: {
    status?: TaskRuleStatus;
    triggerType?: TaskRuleTriggerType;
    search?: string;
  }) => void;
}

// =============================================================================
// Component
// =============================================================================

export function RulesList({
  rules,
  isLoading = false,
  onCreateNew,
  onEdit,
  onActivate,
  onPause,
  onArchive,
  onDelete,
  onTrigger,
  onRefresh,
  onFilterChange,
}: RulesListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskRuleStatus | "all">("all");
  const [triggerFilter, setTriggerFilter] = useState<TaskRuleTriggerType | "all">("all");

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    onFilterChange?.({
      status: statusFilter === "all" ? undefined : statusFilter,
      triggerType: triggerFilter === "all" ? undefined : triggerFilter,
      search: value || undefined,
    });
  };

  const handleStatusChange = (value: TaskRuleStatus | "all") => {
    setStatusFilter(value);
    onFilterChange?.({
      status: value === "all" ? undefined : value,
      triggerType: triggerFilter === "all" ? undefined : triggerFilter,
      search: searchQuery || undefined,
    });
  };

  const handleTriggerChange = (value: TaskRuleTriggerType | "all") => {
    setTriggerFilter(value);
    onFilterChange?.({
      status: statusFilter === "all" ? undefined : statusFilter,
      triggerType: value === "all" ? undefined : value,
      search: searchQuery || undefined,
    });
  };

  // Filter rules locally if no onFilterChange provided
  const filteredRules = onFilterChange
    ? rules
    : rules.filter((rule) => {
        const matchesSearch =
          !searchQuery ||
          rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          rule.description?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "all" || rule.status === statusFilter;
        const matchesTrigger = triggerFilter === "all" || rule.triggerType === triggerFilter;
        return matchesSearch && matchesStatus && matchesTrigger;
      });

  return (
    <div className="space-y-4">
      {/* Header with Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search rules..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="disabled">Disabled</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>

          {/* Trigger Type Filter */}
          <Select value={triggerFilter} onValueChange={handleTriggerChange}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Trigger" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Triggers</SelectItem>
              <SelectItem value="new_customer">New Customer</SelectItem>
              <SelectItem value="overdue_invoice">Overdue Invoice</SelectItem>
              <SelectItem value="low_inventory">Low Inventory</SelectItem>
              <SelectItem value="expense_approved">Expense Approved</SelectItem>
              <SelectItem value="expense_rejected">Expense Rejected</SelectItem>
              <SelectItem value="call_completed">Call Completed</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <Button variant="outline" size="icon" onClick={onRefresh} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          )}
          {onCreateNew && (
            <Button onClick={onCreateNew}>
              <Plus className="h-4 w-4 mr-2" />
              New Rule
            </Button>
          )}
        </div>
      </div>

      {/* Rules Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-40 bg-muted animate-pulse rounded-lg"
            />
          ))}
        </div>
      ) : filteredRules.length === 0 ? (
        <div className="text-center py-12">
          <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">No rules found</h3>
          <p className="text-muted-foreground mt-1">
            {searchQuery || statusFilter !== "all" || triggerFilter !== "all"
              ? "Try adjusting your filters"
              : "Create your first automation rule to get started"}
          </p>
          {onCreateNew && !searchQuery && statusFilter === "all" && triggerFilter === "all" && (
            <Button onClick={onCreateNew} className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Create Rule
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredRules.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              onEdit={onEdit}
              onActivate={onActivate}
              onPause={onPause}
              onArchive={onArchive}
              onDelete={onDelete}
              onTrigger={onTrigger}
              isLoading={isLoading}
            />
          ))}
        </div>
      )}

      {/* Results Count */}
      {filteredRules.length > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Showing {filteredRules.length} rule{filteredRules.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}

export default RulesList;
