import { useState } from "react";
import { cn } from "~/lib/utils";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Search,
  Filter,
  MessageSquare,
  Hash,
  Bell,
  X,
  SlidersHorizontal,
} from "lucide-react";
import type { UnifiedInboxSourceType, UnifiedInboxThreadStatus } from "~/db/schema";

export interface UnifiedInboxFilterState {
  searchQuery: string;
  sourceTypes: UnifiedInboxSourceType[];
  status: UnifiedInboxThreadStatus[];
  unreadOnly: boolean;
}

interface UnifiedInboxFiltersProps {
  filters: UnifiedInboxFilterState;
  onFiltersChange: (filters: UnifiedInboxFilterState) => void;
  unreadCounts?: {
    direct_message: number;
    odoo_discuss: number;
    system_notification: number;
    push_notification: number;
  };
}

const sourceTypeOptions: {
  value: UnifiedInboxSourceType;
  label: string;
  icon: typeof MessageSquare;
}[] = [
  { value: "direct_message", label: "Direct Messages", icon: MessageSquare },
  { value: "odoo_discuss", label: "Odoo Discuss", icon: Hash },
  { value: "system_notification", label: "Notifications", icon: Bell },
];

const statusOptions: { value: UnifiedInboxThreadStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "muted", label: "Muted" },
  { value: "archived", label: "Archived" },
];

export function UnifiedInboxFilters({
  filters,
  onFiltersChange,
  unreadCounts,
}: UnifiedInboxFiltersProps) {
  const [searchValue, setSearchValue] = useState(filters.searchQuery);

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFiltersChange({ ...filters, searchQuery: searchValue });
  };

  const handleClearSearch = () => {
    setSearchValue("");
    onFiltersChange({ ...filters, searchQuery: "" });
  };

  const toggleSourceType = (sourceType: UnifiedInboxSourceType) => {
    const newSourceTypes = filters.sourceTypes.includes(sourceType)
      ? filters.sourceTypes.filter((t) => t !== sourceType)
      : [...filters.sourceTypes, sourceType];
    onFiltersChange({ ...filters, sourceTypes: newSourceTypes });
  };

  const toggleStatus = (status: UnifiedInboxThreadStatus) => {
    const newStatus = filters.status.includes(status)
      ? filters.status.filter((s) => s !== status)
      : [...filters.status, status];
    onFiltersChange({ ...filters, status: newStatus });
  };

  const toggleUnreadOnly = () => {
    onFiltersChange({ ...filters, unreadOnly: !filters.unreadOnly });
  };

  const clearAllFilters = () => {
    setSearchValue("");
    onFiltersChange({
      searchQuery: "",
      sourceTypes: [],
      status: [],
      unreadOnly: false,
    });
  };

  const hasActiveFilters =
    filters.searchQuery ||
    filters.sourceTypes.length > 0 ||
    filters.status.length > 0 ||
    filters.unreadOnly;

  const activeFilterCount =
    (filters.searchQuery ? 1 : 0) +
    filters.sourceTypes.length +
    filters.status.length +
    (filters.unreadOnly ? 1 : 0);

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <form onSubmit={handleSearchSubmit} className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search messages..."
          value={searchValue}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9 pr-9"
        />
        {searchValue && (
          <button
            type="button"
            onClick={handleClearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </form>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {/* Source type quick filters */}
        {sourceTypeOptions.map((option) => {
          const Icon = option.icon;
          const isActive = filters.sourceTypes.includes(option.value);
          const count = unreadCounts?.[option.value] ?? 0;

          return (
            <button
              key={option.value}
              onClick={() => toggleSourceType(option.value)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                isActive
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted border border-transparent"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {option.label}
              {count > 0 && (
                <Badge
                  variant="secondary"
                  className="h-4 min-w-4 flex items-center justify-center p-0 text-[10px] ml-1"
                >
                  {count > 99 ? "99+" : count}
                </Badge>
              )}
            </button>
          );
        })}

        {/* Unread only toggle */}
        <button
          onClick={toggleUnreadOnly}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
            filters.unreadOnly
              ? "bg-primary/20 text-primary border border-primary/30"
              : "bg-muted/50 text-muted-foreground hover:bg-muted border border-transparent"
          )}
        >
          Unread only
        </button>

        {/* Advanced filters dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-7 rounded-full",
                hasActiveFilters && "border-primary/30"
              )}
            >
              <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" />
              More
              {activeFilterCount > 0 && (
                <Badge
                  variant="secondary"
                  className="h-4 min-w-4 flex items-center justify-center p-0 text-[10px] ml-1.5"
                >
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {statusOptions.map((option) => (
              <DropdownMenuCheckboxItem
                key={option.value}
                checked={filters.status.includes(option.value)}
                onCheckedChange={() => toggleStatus(option.value)}
              >
                {option.label}
              </DropdownMenuCheckboxItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Filter by Source</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {sourceTypeOptions.map((option) => {
              const Icon = option.icon;
              return (
                <DropdownMenuCheckboxItem
                  key={option.value}
                  checked={filters.sourceTypes.includes(option.value)}
                  onCheckedChange={() => toggleSourceType(option.value)}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {option.label}
                </DropdownMenuCheckboxItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Clear all button */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-7 rounded-full text-xs"
          >
            <X className="h-3 w-3 mr-1" />
            Clear all
          </Button>
        )}
      </div>
    </div>
  );
}
