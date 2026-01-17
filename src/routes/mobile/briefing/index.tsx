/**
 * Mobile Briefing View
 *
 * Mobile-optimized view for daily briefings with expandable sections,
 * quick actions, and swipe gestures for task management.
 */

import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  RefreshCw,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
  Bell,
  Target,
  Lightbulb,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  User,
  Newspaper,
  Check,
  X,
  Archive,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Settings,
} from "lucide-react";
import { authClient } from "~/lib/auth-client";
import { redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { briefingQueryOptions } from "~/queries/briefing-generator";
import { regenerateBriefingFn, markBriefingReadFn } from "~/fn/briefing-generator";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { cn } from "~/lib/utils";
import type { BriefingData } from "~/data-access/briefing-generator";

export const Route = createFileRoute("/mobile/briefing/")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session) {
      throw redirect({
        to: "/sign-in",
        search: { redirect: "/mobile/briefing" },
      });
    }
  },
  component: MobileBriefingPage,
});

/**
 * Format relative time
 */
function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return new Date(date).toLocaleDateString();
}

/**
 * Format currency for display
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Role badge display names
 */
const roleDisplayNames: Record<string, string> = {
  md: "Managing Director",
  "field-tech": "Field Technician",
  admin: "Administrator",
  sales: "Sales",
};

/**
 * Swipeable Task Item Component
 * Supports swipe gestures for quick actions
 */
function SwipeableTaskItem({
  task,
  onComplete,
  onDismiss,
}: {
  task: {
    id: number;
    name: string;
    projectName: string | null;
    daysOverdue?: number;
    priority: string;
    deadline?: string | null;
  };
  onComplete?: (id: number) => void;
  onDismiss?: (id: number) => void;
}) {
  const [touchStart, setTouchStart] = React.useState<number | null>(null);
  const [touchEnd, setTouchEnd] = React.useState<number | null>(null);
  const [translateX, setTranslateX] = React.useState(0);
  const [isSwipingLeft, setIsSwipingLeft] = React.useState(false);
  const [isSwipingRight, setIsSwipingRight] = React.useState(false);

  const minSwipeDistance = 50;
  const maxSwipeDistance = 80;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
    setTouchEnd(null);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return;
    const currentX = e.targetTouches[0].clientX;
    setTouchEnd(currentX);

    const distance = currentX - touchStart;
    const clampedDistance = Math.max(Math.min(distance, maxSwipeDistance), -maxSwipeDistance);
    setTranslateX(clampedDistance);
    setIsSwipingLeft(distance < -minSwipeDistance);
    setIsSwipingRight(distance > minSwipeDistance);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) {
      setTranslateX(0);
      return;
    }

    const distance = touchEnd - touchStart;

    if (distance > minSwipeDistance && onComplete) {
      // Swipe right - complete
      onComplete(task.id);
    } else if (distance < -minSwipeDistance && onDismiss) {
      // Swipe left - dismiss/archive
      onDismiss(task.id);
    }

    setTranslateX(0);
    setIsSwipingLeft(false);
    setIsSwipingRight(false);
    setTouchStart(null);
    setTouchEnd(null);
  };

  const priorityColor = task.priority === "high" || task.priority === "3"
    ? "text-red-600"
    : task.priority === "medium" || task.priority === "2"
    ? "text-yellow-600"
    : "text-muted-foreground";

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Background actions */}
      <div className="absolute inset-0 flex items-stretch">
        <div
          className={cn(
            "flex-1 flex items-center justify-start pl-4 bg-green-500 transition-opacity",
            isSwipingRight ? "opacity-100" : "opacity-0"
          )}
        >
          <Check className="w-5 h-5 text-white" />
          <span className="ml-2 text-white text-sm font-medium">Complete</span>
        </div>
        <div
          className={cn(
            "flex-1 flex items-center justify-end pr-4 bg-gray-500 transition-opacity",
            isSwipingLeft ? "opacity-100" : "opacity-0"
          )}
        >
          <span className="mr-2 text-white text-sm font-medium">Archive</span>
          <Archive className="w-5 h-5 text-white" />
        </div>
      </div>

      {/* Main content */}
      <div
        className="relative bg-background border rounded-lg p-3 touch-pan-y transition-transform"
        style={{ transform: `translateX(${translateX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "w-2 h-2 rounded-full mt-2 flex-shrink-0",
              task.daysOverdue && task.daysOverdue > 0 ? "bg-red-500" : "bg-yellow-500"
            )}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{task.name}</p>
            {task.projectName && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {task.projectName}
              </p>
            )}
            <div className="flex items-center gap-2 mt-1">
              {task.daysOverdue !== undefined && task.daysOverdue > 0 && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">
                  {task.daysOverdue}d overdue
                </Badge>
              )}
              {task.deadline && !task.daysOverdue && (
                <span className="text-xs text-muted-foreground">
                  Due: {new Date(task.deadline).toLocaleDateString()}
                </span>
              )}
              <span className={cn("text-xs", priorityColor)}>
                {task.priority === "3" || task.priority === "high" ? "High" :
                 task.priority === "2" || task.priority === "medium" ? "Medium" : "Normal"}
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        </div>
      </div>
    </div>
  );
}

/**
 * Quick Action Button Component
 */
function QuickActionButton({
  icon: Icon,
  label,
  badge,
  badgeVariant = "default",
  onClick,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: number;
  badgeVariant?: "default" | "destructive" | "warning";
  onClick?: () => void;
  href?: string;
}) {
  const content = (
    <div className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-muted/50 hover:bg-muted active:scale-[0.98] transition-all relative">
      <div className="relative">
        <Icon className="w-5 h-5 text-primary" />
        {badge !== undefined && badge > 0 && (
          <span
            className={cn(
              "absolute -top-2 -right-2 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-semibold",
              badgeVariant === "destructive"
                ? "bg-red-500 text-white"
                : badgeVariant === "warning"
                ? "bg-yellow-500 text-white"
                : "bg-primary text-primary-foreground"
            )}
          >
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </div>
      <span className="text-xs font-medium text-center">{label}</span>
    </div>
  );

  if (href) {
    return <Link to={href}>{content}</Link>;
  }

  return (
    <button onClick={onClick} className="w-full">
      {content}
    </button>
  );
}

/**
 * Stat Card Component
 */
function StatCard({
  label,
  value,
  variant = "default",
}: {
  label: string;
  value: number | string;
  variant?: "default" | "warning" | "success" | "error";
}) {
  const colors = {
    default: "text-foreground",
    warning: "text-yellow-600",
    success: "text-green-600",
    error: "text-red-600",
  };

  return (
    <div className="text-center p-2">
      <p className={cn("text-xl font-bold", colors[variant])}>{value}</p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
    </div>
  );
}

/**
 * Mobile Briefing Page Component
 */
function MobileBriefingPage() {
  const queryClient = useQueryClient();
  const [expandedSections, setExpandedSections] = React.useState<string[]>(["tasks"]);

  // Fetch briefing data
  const {
    data: briefing,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery(briefingQueryOptions());

  // Regenerate mutation
  const regenerateMutation = useMutation({
    mutationFn: () => regenerateBriefingFn(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["briefing"] });
    },
  });

  // Mark as read mutation
  const markReadMutation = useMutation({
    mutationFn: () => markBriefingReadFn(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["briefing"] });
    },
  });

  // Mark as read when component mounts with data
  React.useEffect(() => {
    if (briefing && !markReadMutation.isPending) {
      const timer = setTimeout(() => {
        markReadMutation.mutate();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [briefing?.generatedAt]);

  // Task action handlers
  const handleTaskComplete = (taskId: number) => {
    console.log("Complete task:", taskId);
    // TODO: Integrate with task management API
  };

  const handleTaskDismiss = (taskId: number) => {
    console.log("Dismiss task:", taskId);
    // TODO: Integrate with task management API
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-primary text-primary-foreground">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <Link to="/mobile">
                <Button variant="ghost" size="icon" className="h-9 w-9 text-primary-foreground hover:bg-primary-foreground/10">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <h1 className="text-lg font-semibold">Daily Briefing</h1>
            </div>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">
              Generating your briefing...
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-primary text-primary-foreground">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <Link to="/mobile">
                <Button variant="ghost" size="icon" className="h-9 w-9 text-primary-foreground hover:bg-primary-foreground/10">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <h1 className="text-lg font-semibold">Daily Briefing</h1>
            </div>
          </div>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
          <AlertCircle className="w-12 h-12 text-destructive mb-4" />
          <h2 className="text-lg font-semibold mb-2">Failed to load briefing</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {error instanceof Error ? error.message : "An unexpected error occurred"}
          </p>
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // No briefing state
  if (!briefing) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-primary text-primary-foreground">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <Link to="/mobile">
                <Button variant="ghost" size="icon" className="h-9 w-9 text-primary-foreground hover:bg-primary-foreground/10">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <h1 className="text-lg font-semibold">Daily Briefing</h1>
            </div>
          </div>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
          <Newspaper className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <h2 className="text-lg font-semibold mb-2">No briefing available</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Generate your personalized daily briefing
          </p>
          <Button
            onClick={() => regenerateMutation.mutate()}
            disabled={regenerateMutation.isPending}
          >
            {regenerateMutation.isPending ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Newspaper className="w-4 h-4 mr-2" />
                Generate Briefing
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background" data-testid="mobile-briefing-page">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to="/mobile">
              <Button variant="ghost" size="icon" className="h-9 w-9 text-primary-foreground hover:bg-primary-foreground/10">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-semibold">Daily Briefing</h1>
              <p className="text-xs text-primary-foreground/70">
                Updated {formatTimeAgo(new Date(briefing.generatedAt))}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => regenerateMutation.mutate()}
            disabled={regenerateMutation.isPending || isFetching}
            className="h-9 w-9 text-primary-foreground hover:bg-primary-foreground/10"
          >
            <RefreshCw
              className={cn(
                "h-5 w-5",
                (regenerateMutation.isPending || isFetching) && "animate-spin"
              )}
            />
          </Button>
        </div>
      </header>

      {/* Greeting Card */}
      <div className="px-4 py-4 -mb-6">
        <Card className="shadow-lg border-primary/10" data-testid="briefing-greeting-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              {briefing.userRole && (
                <Badge variant="outline" className="text-xs">
                  <User className="w-3 h-3 mr-1" />
                  {roleDisplayNames[briefing.userRole] || briefing.userRole}
                </Badge>
              )}
            </div>
            <h2 className="text-xl font-bold mb-2" data-testid="briefing-greeting">
              {briefing.greeting}
            </h2>
            <p className="text-sm text-muted-foreground" data-testid="briefing-summary">
              {briefing.summary}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="px-4 pt-8 pb-4">
        <div className="grid grid-cols-4 gap-1 bg-muted/30 rounded-lg p-2">
          <StatCard
            label="Overdue"
            value={briefing.tasks.overdue}
            variant={briefing.tasks.overdue > 0 ? "error" : "default"}
          />
          <StatCard
            label="Today"
            value={briefing.tasks.dueToday}
            variant={briefing.tasks.dueToday > 0 ? "warning" : "default"}
          />
          <StatCard
            label="Priority"
            value={briefing.tasks.highPriority}
          />
          <StatCard
            label="Pending"
            value={briefing.approvals.pendingCount}
            variant={briefing.approvals.pendingCount > 0 ? "warning" : "default"}
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-4 pb-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Quick Actions
        </h3>
        <div className="grid grid-cols-4 gap-2" data-testid="quick-actions">
          <QuickActionButton
            icon={CheckCircle2}
            label="Tasks"
            badge={briefing.tasks.totalOpen}
            href="/dashboard"
          />
          <QuickActionButton
            icon={FileText}
            label="Approvals"
            badge={briefing.approvals.pendingCount}
            badgeVariant={briefing.approvals.urgentCount > 0 ? "destructive" : "warning"}
            href="/mobile/approvals"
          />
          <QuickActionButton
            icon={Bell}
            label="Alerts"
            badge={briefing.alerts.unreadCount}
            href="/dashboard/inbox"
          />
          <QuickActionButton
            icon={Target}
            label="Focus"
            href="/dashboard"
          />
        </div>
      </div>

      {/* Expandable Sections */}
      <div className="flex-1 px-4 pb-4 space-y-3">
        <Accordion
          type="multiple"
          value={expandedSections}
          onValueChange={setExpandedSections}
          className="space-y-3"
        >
          {/* Tasks Section */}
          <AccordionItem value="tasks" className="border rounded-lg bg-card shadow-sm" data-testid="tasks-section">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                <span className="font-semibold">Tasks</span>
                {briefing.tasks.totalOpen > 0 && (
                  <Badge variant="secondary" className="ml-auto mr-2">
                    {briefing.tasks.totalOpen} open
                  </Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4">
              {briefing.tasks.topOverdueTasks.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-red-500" />
                    Overdue Tasks - Swipe to manage
                  </p>
                  {briefing.tasks.topOverdueTasks.map((task) => (
                    <SwipeableTaskItem
                      key={task.id}
                      task={task}
                      onComplete={handleTaskComplete}
                      onDismiss={handleTaskDismiss}
                    />
                  ))}
                  {briefing.tasks.topPriorityTasks.length > 0 && (
                    <>
                      <p className="text-xs font-medium text-muted-foreground mt-4 mb-2 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-primary" />
                        High Priority
                      </p>
                      {briefing.tasks.topPriorityTasks.slice(0, 2).map((task) => (
                        <SwipeableTaskItem
                          key={task.id}
                          task={task}
                          onComplete={handleTaskComplete}
                          onDismiss={handleTaskDismiss}
                        />
                      ))}
                    </>
                  )}
                  <Link to="/dashboard">
                    <Button variant="ghost" size="sm" className="w-full mt-2">
                      View All Tasks
                      <ExternalLink className="w-3 h-3 ml-2" />
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="text-center py-4">
                  <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No overdue tasks!</p>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* Approvals Section */}
          {briefing.approvals.pendingCount > 0 && (
            <AccordionItem value="approvals" className="border rounded-lg bg-card shadow-sm" data-testid="approvals-section">
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-yellow-600" />
                  <span className="font-semibold">Approvals</span>
                  <Badge variant="outline" className="ml-auto mr-2 border-yellow-500 text-yellow-600">
                    {briefing.approvals.pendingCount} pending
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4">
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Total Value</p>
                      <p className="text-lg font-bold">
                        {formatCurrency(briefing.approvals.totalPendingValue)}
                      </p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Oldest Pending</p>
                      <p className="text-lg font-bold">
                        {briefing.approvals.oldestPendingDays} days
                      </p>
                    </div>
                  </div>
                  {briefing.approvals.topPendingApprovals.map((approval) => (
                    <div key={approval.id} className="border rounded-lg p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{approval.purpose}</p>
                          <p className="text-xs text-muted-foreground">
                            {approval.requesterName} &bull; {approval.daysWaiting}d ago
                          </p>
                        </div>
                        <p className="text-sm font-bold text-primary ml-2">
                          {formatCurrency(approval.amount)}
                        </p>
                      </div>
                    </div>
                  ))}
                  <Link to="/mobile/approvals">
                    <Button variant="outline" size="sm" className="w-full">
                      Review All Approvals
                      <ExternalLink className="w-3 h-3 ml-2" />
                    </Button>
                  </Link>
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Notifications Section */}
          <AccordionItem value="alerts" className="border rounded-lg bg-card shadow-sm" data-testid="alerts-section">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-600" />
                <span className="font-semibold">Notifications</span>
                {briefing.alerts.unreadCount > 0 && (
                  <Badge className="ml-auto mr-2">
                    {briefing.alerts.unreadCount} unread
                  </Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4">
              {briefing.alerts.unreadCount === 0 ? (
                <div className="text-center py-4">
                  <Bell className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">All caught up!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {briefing.alerts.recentAlerts.slice(0, 5).map((alert) => (
                    <div key={alert.id} className="flex items-start gap-2 p-2 bg-muted/30 rounded-lg">
                      <Bell className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{alert.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatTimeAgo(new Date(alert.createdAt))}
                        </p>
                      </div>
                    </div>
                  ))}
                  <Link to="/dashboard/inbox">
                    <Button variant="ghost" size="sm" className="w-full mt-2">
                      View All Notifications
                      <ExternalLink className="w-3 h-3 ml-2" />
                    </Button>
                  </Link>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* Insights Section */}
          <AccordionItem value="insights" className="border rounded-lg bg-card shadow-sm" data-testid="insights-section">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                <span className="font-semibold">AI Insights</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4">
              <div className="space-y-4">
                {/* Key Highlights */}
                {briefing.insights.keyHighlights.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      Highlights
                    </p>
                    <ul className="space-y-1">
                      {briefing.insights.keyHighlights.map((item, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <ChevronRight className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommended Actions */}
                {briefing.insights.recommendedActions.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                      <Target className="w-3 h-3" />
                      Recommended Actions
                    </p>
                    <ul className="space-y-1">
                      {briefing.insights.recommendedActions.map((item, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <ChevronRight className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Risk Areas */}
                {briefing.insights.riskAreas.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-yellow-600" />
                      Attention Needed
                    </p>
                    <ul className="space-y-1">
                      {briefing.insights.riskAreas.map((item, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <ChevronRight className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Focus Areas Section */}
          {briefing.rolePriorities && (
            <AccordionItem value="focus" className="border rounded-lg bg-card shadow-sm" data-testid="focus-section">
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-green-600" />
                  <span className="font-semibold">Today's Focus</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4">
                <div className="flex flex-wrap gap-2">
                  {briefing.rolePriorities.focusAreas.map((area, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {area}
                    </Badge>
                  ))}
                </div>
                {briefing.rolePriorities.actionItems.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Action Items
                    </p>
                    <ul className="space-y-1">
                      {briefing.rolePriorities.actionItems.map((item, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      </div>
    </div>
  );
}
