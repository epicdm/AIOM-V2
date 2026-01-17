/**
 * Smart Search View Component
 *
 * AI-powered unified search interface with natural language understanding
 * that searches across tasks, contacts, messages, expenses, and documents.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Search,
  X,
  Loader2,
  FileText,
  Users,
  MessageSquare,
  Receipt,
  CheckSquare,
  User,
  Filter,
  Clock,
  Sparkles,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { cn } from "~/lib/utils";
import { useSmartSearch, useSearchStats } from "~/hooks/useSmartSearch";
import type {
  SearchResult,
  SearchResultType,
  TaskSearchResult,
  ContactSearchResult,
  MessageSearchResult,
  ExpenseSearchResult,
  DocumentSearchResult,
  UserSearchResult,
} from "~/data-access/smart-search";

// =============================================================================
// Types
// =============================================================================

interface SmartSearchViewProps {
  className?: string;
  /** Initial query to populate search */
  initialQuery?: string;
  /** Callback when a result is selected */
  onResultSelect?: (result: SearchResult) => void;
  /** Whether to show search stats */
  showStats?: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const RESULT_TYPE_CONFIG: Record<
  SearchResultType,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    bgColor: string;
  }
> = {
  task: {
    label: "Tasks",
    icon: CheckSquare,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
  },
  contact: {
    label: "Contacts",
    icon: Users,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
  },
  message: {
    label: "Messages",
    icon: MessageSquare,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
  },
  expense: {
    label: "Expenses",
    icon: Receipt,
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
  },
  document: {
    label: "Documents",
    icon: FileText,
    color: "text-pink-600 dark:text-pink-400",
    bgColor: "bg-pink-100 dark:bg-pink-900/30",
  },
  user: {
    label: "Users",
    icon: User,
    color: "text-cyan-600 dark:text-cyan-400",
    bgColor: "bg-cyan-100 dark:bg-cyan-900/30",
  },
};

const ALL_RESULT_TYPES: SearchResultType[] = [
  "task",
  "contact",
  "message",
  "expense",
  "document",
  "user",
];

// =============================================================================
// Helper Components
// =============================================================================

function ResultTypeIcon({
  type,
  className,
}: {
  type: SearchResultType;
  className?: string;
}) {
  const config = RESULT_TYPE_CONFIG[type];
  const Icon = config.icon;
  return <Icon className={cn("h-4 w-4", config.color, className)} />;
}

function ResultTypeBadge({ type }: { type: SearchResultType }) {
  const config = RESULT_TYPE_CONFIG[type];
  return (
    <Badge
      variant="secondary"
      className={cn("text-xs font-medium", config.bgColor, config.color)}
    >
      {config.label}
    </Badge>
  );
}

function RelevanceIndicator({ score }: { score: number }) {
  let color = "text-gray-400";
  if (score >= 80) color = "text-green-500";
  else if (score >= 50) color = "text-yellow-500";
  else if (score >= 30) color = "text-orange-500";

  return (
    <div className="flex items-center gap-1" title={`Relevance: ${score}%`}>
      <TrendingUp className={cn("h-3 w-3", color)} />
      <span className={cn("text-xs", color)}>{score}%</span>
    </div>
  );
}

// =============================================================================
// Search Result Item Components
// =============================================================================

function TaskResultItem({
  result,
  onClick,
}: {
  result: TaskSearchResult;
  onClick?: () => void;
}) {
  return (
    <div
      className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg cursor-pointer transition-colors"
      onClick={onClick}
      data-testid="search-result-task"
    >
      <div className="flex items-start gap-3">
        <div className={cn("p-2 rounded-lg", RESULT_TYPE_CONFIG.task.bgColor)}>
          <ResultTypeIcon type="task" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-medium text-sm text-foreground truncate">
              {result.title}
            </h4>
            <RelevanceIndicator score={result.relevanceScore} />
          </div>
          {result.subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {result.subtitle}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1.5">
            {result.metadata.status && (
              <Badge variant="outline" className="text-xs">
                {result.metadata.status}
              </Badge>
            )}
            {result.metadata.priority === "high" && (
              <Badge variant="destructive" className="text-xs">
                High Priority
              </Badge>
            )}
            {result.metadata.deadline && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {result.metadata.deadline}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ContactResultItem({
  result,
  onClick,
}: {
  result: ContactSearchResult;
  onClick?: () => void;
}) {
  return (
    <div
      className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg cursor-pointer transition-colors"
      onClick={onClick}
      data-testid="search-result-contact"
    >
      <div className="flex items-start gap-3">
        <div className={cn("p-2 rounded-lg", RESULT_TYPE_CONFIG.contact.bgColor)}>
          <ResultTypeIcon type="contact" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-medium text-sm text-foreground truncate">
              {result.title}
            </h4>
            <RelevanceIndicator score={result.relevanceScore} />
          </div>
          {result.subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {result.subtitle}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
            {result.metadata.email && <span>{result.metadata.email}</span>}
            {result.metadata.phone && <span>• {result.metadata.phone}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageResultItem({
  result,
  onClick,
}: {
  result: MessageSearchResult;
  onClick?: () => void;
}) {
  return (
    <div
      className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg cursor-pointer transition-colors"
      onClick={onClick}
      data-testid="search-result-message"
    >
      <div className="flex items-start gap-3">
        <div className={cn("p-2 rounded-lg", RESULT_TYPE_CONFIG.message.bgColor)}>
          <ResultTypeIcon type="message" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-medium text-sm text-foreground truncate">
              {result.title}
            </h4>
            <RelevanceIndicator score={result.relevanceScore} />
          </div>
          {result.subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {result.subtitle}
            </p>
          )}
          {!result.metadata.isRead && (
            <Badge variant="secondary" className="text-xs mt-1.5">
              Unread
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

function ExpenseResultItem({
  result,
  onClick,
}: {
  result: ExpenseSearchResult;
  onClick?: () => void;
}) {
  return (
    <div
      className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg cursor-pointer transition-colors"
      onClick={onClick}
      data-testid="search-result-expense"
    >
      <div className="flex items-start gap-3">
        <div className={cn("p-2 rounded-lg", RESULT_TYPE_CONFIG.expense.bgColor)}>
          <ResultTypeIcon type="expense" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-medium text-sm text-foreground truncate">
              {result.title}
            </h4>
            <RelevanceIndicator score={result.relevanceScore} />
          </div>
          {result.subtitle && (
            <p className="text-sm font-semibold text-foreground mt-0.5">
              {result.subtitle}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1.5">
            {result.metadata.status && (
              <Badge
                variant={
                  result.metadata.status === "approved"
                    ? "default"
                    : result.metadata.status === "rejected"
                      ? "destructive"
                      : "secondary"
                }
                className="text-xs"
              >
                {result.metadata.status}
              </Badge>
            )}
            {result.metadata.expenseType && (
              <Badge variant="outline" className="text-xs capitalize">
                {result.metadata.expenseType}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DocumentResultItem({
  result,
  onClick,
}: {
  result: DocumentSearchResult;
  onClick?: () => void;
}) {
  return (
    <div
      className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg cursor-pointer transition-colors"
      onClick={onClick}
      data-testid="search-result-document"
    >
      <div className="flex items-start gap-3">
        <div className={cn("p-2 rounded-lg", RESULT_TYPE_CONFIG.document.bgColor)}>
          <ResultTypeIcon type="document" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-medium text-sm text-foreground truncate">
              {result.title}
            </h4>
            <RelevanceIndicator score={result.relevanceScore} />
          </div>
          {result.subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {result.subtitle}
            </p>
          )}
          {result.metadata.status && (
            <Badge variant="secondary" className="text-xs mt-1.5">
              {result.metadata.status}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

function UserResultItem({
  result,
  onClick,
}: {
  result: UserSearchResult;
  onClick?: () => void;
}) {
  return (
    <div
      className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg cursor-pointer transition-colors"
      onClick={onClick}
      data-testid="search-result-user"
    >
      <div className="flex items-start gap-3">
        <div className={cn("p-2 rounded-lg", RESULT_TYPE_CONFIG.user.bgColor)}>
          <ResultTypeIcon type="user" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-medium text-sm text-foreground truncate">
              {result.title}
            </h4>
            <RelevanceIndicator score={result.relevanceScore} />
          </div>
          {result.subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {result.subtitle}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1.5">
            {result.metadata.role && (
              <Badge variant="outline" className="text-xs capitalize">
                {result.metadata.role}
              </Badge>
            )}
            {result.metadata.isAdmin && (
              <Badge variant="default" className="text-xs">
                Admin
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SearchResultItem({
  result,
  onClick,
}: {
  result: SearchResult;
  onClick?: () => void;
}) {
  switch (result.type) {
    case "task":
      return <TaskResultItem result={result} onClick={onClick} />;
    case "contact":
      return <ContactResultItem result={result} onClick={onClick} />;
    case "message":
      return <MessageResultItem result={result} onClick={onClick} />;
    case "expense":
      return <ExpenseResultItem result={result} onClick={onClick} />;
    case "document":
      return <DocumentResultItem result={result} onClick={onClick} />;
    case "user":
      return <UserResultItem result={result} onClick={onClick} />;
    default:
      return null;
  }
}

// =============================================================================
// Main Component
// =============================================================================

export function SmartSearchView({
  className,
  initialQuery = "",
  onResultSelect,
  showStats = true,
}: SmartSearchViewProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedTypes, setSelectedTypes] = useState<SearchResultType[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | SearchResultType>("all");

  const {
    query,
    setQuery,
    results,
    resultsByType,
    totalResults,
    searchTime,
    suggestions,
    isSearching,
    isFetching,
    hasResults,
    clearSearch,
    updateFilters,
  } = useSmartSearch({
    initialQuery,
    defaultFilters: {
      types: selectedTypes.length > 0 ? selectedTypes : undefined,
    },
  });

  const { stats } = useSearchStats(showStats);

  // Update filters when selected types change
  useEffect(() => {
    updateFilters({
      types: selectedTypes.length > 0 ? selectedTypes : undefined,
    });
  }, [selectedTypes, updateFilters]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleTypeToggle = useCallback((type: SearchResultType) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }, []);

  const handleResultClick = useCallback(
    (result: SearchResult) => {
      onResultSelect?.(result);
    },
    [onResultSelect]
  );

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      setQuery(suggestion);
    },
    [setQuery]
  );

  // Get results based on active tab
  const displayResults =
    activeTab === "all"
      ? results
      : resultsByType[`${activeTab}s` as keyof typeof resultsByType] || [];

  // Calculate tab counts
  const tabCounts = {
    all: totalResults,
    task: resultsByType.tasks.length,
    contact: resultsByType.contacts.length,
    message: resultsByType.messages.length,
    expense: resultsByType.expenses.length,
    document: resultsByType.documents.length,
    user: resultsByType.users.length,
  };

  return (
    <div
      className={cn(
        "flex flex-col h-full",
        "bg-white dark:bg-slate-950",
        "rounded-lg border border-gray-200 dark:border-slate-800",
        "shadow-sm",
        className
      )}
      data-testid="smart-search-view"
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-slate-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Smart Search</h2>
            <p className="text-xs text-muted-foreground">
              Search across tasks, contacts, messages, expenses & documents
            </p>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Search anything... (e.g., 'pending expenses', 'John contact', 'overdue tasks')"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 pr-20"
            data-testid="smart-search-input"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {isSearching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            {query && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSearch}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <Filter className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Filter by Type</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {ALL_RESULT_TYPES.map((type) => {
                  const config = RESULT_TYPE_CONFIG[type];
                  return (
                    <DropdownMenuCheckboxItem
                      key={type}
                      checked={selectedTypes.includes(type)}
                      onCheckedChange={() => handleTypeToggle(type)}
                    >
                      <ResultTypeIcon type={type} className="mr-2" />
                      {config.label}
                    </DropdownMenuCheckboxItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Selected Filters */}
        {selectedTypes.length > 0 && (
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Filtering:</span>
            {selectedTypes.map((type) => (
              <Badge
                key={type}
                variant="secondary"
                className="text-xs cursor-pointer"
                onClick={() => handleTypeToggle(type)}
              >
                {RESULT_TYPE_CONFIG[type].label}
                <X className="h-3 w-3 ml-1" />
              </Badge>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedTypes([])}
              className="h-5 text-xs px-2"
            >
              Clear all
            </Button>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {/* Empty State - No Query */}
        {!query && (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center">
            <div className="p-4 rounded-full bg-primary/10 mb-4">
              <Search className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              Start searching
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              Use natural language to search across all your data. Try phrases like
              "overdue tasks", "expenses this month", or just a name.
            </p>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2 justify-center mb-6">
              {[
                "Show pending expenses",
                "Find overdue tasks",
                "Search contacts",
                "Recent messages",
              ].map((suggestion, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  onClick={() => setQuery(suggestion)}
                  className="text-xs"
                >
                  {suggestion}
                </Button>
              ))}
            </div>

            {/* Stats */}
            {showStats && stats && (
              <div className="grid grid-cols-3 gap-4 text-center mt-4 w-full max-w-md">
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900">
                  <p className="text-2xl font-bold text-foreground">
                    {stats.totalContacts}
                  </p>
                  <p className="text-xs text-muted-foreground">Contacts</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900">
                  <p className="text-2xl font-bold text-foreground">
                    {stats.totalExpenses}
                  </p>
                  <p className="text-xs text-muted-foreground">Expenses</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900">
                  <p className="text-2xl font-bold text-foreground">
                    {stats.totalUsers}
                  </p>
                  <p className="text-xs text-muted-foreground">Users</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Search Results */}
        {query && (
          <div className="h-full flex flex-col">
            {/* Result Tabs */}
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as typeof activeTab)}
              className="flex-1 flex flex-col"
            >
              <TabsList className="mx-4 mt-2 justify-start overflow-x-auto">
                <TabsTrigger value="all" className="text-xs">
                  All ({tabCounts.all})
                </TabsTrigger>
                {ALL_RESULT_TYPES.map((type) => {
                  const count = tabCounts[type];
                  if (count === 0 && selectedTypes.length > 0 && !selectedTypes.includes(type)) {
                    return null;
                  }
                  return (
                    <TabsTrigger key={type} value={type} className="text-xs gap-1">
                      <ResultTypeIcon type={type} className="h-3 w-3" />
                      {RESULT_TYPE_CONFIG[type].label} ({count})
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {/* Search Info */}
              <div className="px-4 py-2 text-xs text-muted-foreground flex items-center justify-between">
                <span>
                  {totalResults} result{totalResults !== 1 ? "s" : ""} found
                </span>
                <span>{searchTime}ms</span>
              </div>

              {/* Results List */}
              <div className="flex-1 overflow-y-auto px-4 pb-4">
                {/* Loading State */}
                {isFetching && !hasResults && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                )}

                {/* No Results */}
                {!isFetching && !hasResults && query && (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Search className="h-8 w-8 text-muted-foreground mb-3" />
                    <p className="text-muted-foreground mb-2">
                      No results found for "{query}"
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Try different keywords or remove filters
                    </p>
                  </div>
                )}

                {/* Results */}
                {hasResults && (
                  <div className="space-y-1">
                    {displayResults.map((result) => (
                      <SearchResultItem
                        key={`${result.type}-${result.id}`}
                        result={result}
                        onClick={() => handleResultClick(result)}
                      />
                    ))}
                  </div>
                )}

                {/* Suggestions */}
                {hasResults && suggestions.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-gray-200 dark:border-slate-800">
                    <p className="text-xs text-muted-foreground mb-2">
                      Related searches:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {suggestions.map((suggestion, i) => (
                        <Button
                          key={i}
                          variant="outline"
                          size="sm"
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="text-xs"
                        >
                          {suggestion}
                          <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}

export default SmartSearchView;
