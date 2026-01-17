import * as React from "react";
import {
  Smartphone,
  Camera,
  MapPin,
  Phone,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  Navigation,
  FileText,
  Package,
  Wrench,
  Timer,
  QrCode,
  Upload,
  Calendar,
} from "lucide-react";
import { cn } from "~/lib/utils";
import type { WidgetDefinition, WidgetProps } from "../types";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";

/**
 * Quick Action Interface
 */
export interface QuickAction {
  id: string;
  label: string;
  icon: typeof Camera;
  action: string;
  variant: "default" | "primary" | "success" | "warning" | "destructive";
  badge?: string | number;
}

/**
 * Time Entry Interface
 */
export interface TimeEntry {
  id: string;
  workOrderId: string;
  startTime: Date;
  endTime?: Date;
  status: "active" | "paused" | "completed";
}

/**
 * Mobile Actions Widget Data
 */
export interface MobileActionsData {
  currentWorkOrder?: {
    id: string;
    orderNumber: string;
    customerName: string;
    address: string;
  };
  activeTimeEntry?: TimeEntry;
  pendingUploads: number;
  unreadMessages: number;
}

/**
 * Mobile Actions Widget Config
 */
export interface MobileActionsConfig {
  showTimeTracking: boolean;
  showQuickCall: boolean;
  compactMode: boolean;
}

/**
 * Format duration from milliseconds
 */
function formatDuration(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Mobile Actions Widget Component
 */
function MobileActionsWidgetComponent({
  data,
  isLoading,
  error,
  instance,
}: WidgetProps<MobileActionsData, MobileActionsConfig>) {
  const config = instance.config as unknown as MobileActionsConfig;
  const [isTracking, setIsTracking] = React.useState(false);
  const [isPaused, setIsPaused] = React.useState(false);
  const [elapsedTime, setElapsedTime] = React.useState(0);
  const [trackingStartTime, setTrackingStartTime] = React.useState<Date | null>(null);

  // Timer effect
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTracking && !isPaused && trackingStartTime) {
      interval = setInterval(() => {
        setElapsedTime(Date.now() - trackingStartTime.getTime());
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTracking, isPaused, trackingStartTime]);

  // Sample data
  const currentWorkOrder = data?.currentWorkOrder ?? {
    id: "wo-1",
    orderNumber: "WO-2024-002",
    customerName: "Johnson & Co.",
    address: "1234 Industrial Blvd, Suite 100",
  };

  const pendingUploads = data?.pendingUploads ?? 2;
  const unreadMessages = data?.unreadMessages ?? 3;

  // Quick actions
  const quickActions: QuickAction[] = [
    {
      id: "photo",
      label: "Take Photo",
      icon: Camera,
      action: "capture_photo",
      variant: "default",
    },
    {
      id: "scan",
      label: "Scan QR/Barcode",
      icon: QrCode,
      action: "scan_code",
      variant: "default",
    },
    {
      id: "navigate",
      label: "Navigate",
      icon: Navigation,
      action: "navigate",
      variant: "primary",
    },
    {
      id: "call",
      label: "Call Customer",
      icon: Phone,
      action: "call_customer",
      variant: "default",
    },
    {
      id: "message",
      label: "Messages",
      icon: MessageSquare,
      action: "open_messages",
      variant: "default",
      badge: unreadMessages > 0 ? unreadMessages : undefined,
    },
    {
      id: "notes",
      label: "Add Note",
      icon: FileText,
      action: "add_note",
      variant: "default",
    },
    {
      id: "parts",
      label: "Parts Used",
      icon: Package,
      action: "log_parts",
      variant: "default",
    },
    {
      id: "upload",
      label: "Upload Files",
      icon: Upload,
      action: "upload_files",
      variant: "default",
      badge: pendingUploads > 0 ? pendingUploads : undefined,
    },
  ];

  const handleStartTracking = () => {
    setIsTracking(true);
    setIsPaused(false);
    setTrackingStartTime(new Date());
    setElapsedTime(0);
  };

  const handlePauseTracking = () => {
    setIsPaused(!isPaused);
  };

  const handleStopTracking = () => {
    setIsTracking(false);
    setIsPaused(false);
    setTrackingStartTime(null);
    // In a real app, this would submit the time entry
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px]">
        <div className="animate-pulse flex flex-col space-y-3 w-full p-4">
          <div className="h-16 bg-muted rounded-lg" />
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-muted rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px] text-destructive">
        <AlertCircle className="w-5 h-5 mr-2" />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="mobile-actions-widget">
      {/* Current Work Order */}
      {currentWorkOrder && (
        <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <div className="flex items-start justify-between mb-2">
            <div>
              <Badge variant="default" className="bg-primary mb-1">
                Active Job
              </Badge>
              <p className="font-semibold">{currentWorkOrder.customerName}</p>
              <p className="text-xs text-muted-foreground font-mono">
                {currentWorkOrder.orderNumber}
              </p>
            </div>
            <Wrench className="w-5 h-5 text-primary" />
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-3.5 h-3.5" />
            <span className="truncate">{currentWorkOrder.address}</span>
          </div>
        </div>
      )}

      {/* Time Tracking */}
      {config.showTimeTracking && (
        <div className="p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Time Tracking</span>
            </div>
            {isTracking && (
              <Badge
                variant="outline"
                className={cn(
                  isPaused
                    ? "border-yellow-500 text-yellow-600"
                    : "border-green-500 text-green-600 animate-pulse"
                )}
              >
                {isPaused ? "Paused" : "Recording"}
              </Badge>
            )}
          </div>

          {/* Timer Display */}
          <div className="text-center py-4">
            <span
              className={cn(
                "text-4xl font-mono font-bold tabular-nums",
                isTracking && !isPaused && "text-primary"
              )}
              data-testid="time-display"
            >
              {formatDuration(elapsedTime)}
            </span>
          </div>

          {/* Timer Controls */}
          <div className="flex gap-2">
            {!isTracking ? (
              <Button
                className="flex-1"
                onClick={handleStartTracking}
                data-testid="start-timer-btn"
              >
                <Clock className="w-4 h-4 mr-2" />
                Start Timer
              </Button>
            ) : (
              <>
                <Button
                  variant={isPaused ? "default" : "outline"}
                  className="flex-1"
                  onClick={handlePauseTracking}
                  data-testid="pause-timer-btn"
                >
                  {isPaused ? "Resume" : "Pause"}
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleStopTracking}
                  data-testid="stop-timer-btn"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Complete
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Quick Actions Grid */}
      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-2">Quick Actions</h4>
        <div
          className={cn(
            "grid gap-2",
            config.compactMode ? "grid-cols-4" : "grid-cols-2"
          )}
        >
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.id}
                variant={action.variant === "primary" ? "default" : "outline"}
                className={cn(
                  "relative h-auto py-3",
                  config.compactMode ? "flex-col gap-1 px-2" : "flex-row gap-2 justify-start"
                )}
                data-testid={`action-${action.id}`}
              >
                <Icon className={cn(config.compactMode ? "w-5 h-5" : "w-4 h-4")} />
                <span className={cn(config.compactMode && "text-[10px]")}>
                  {action.label}
                </span>
                {action.badge && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] min-w-[18px] h-[18px] rounded-full flex items-center justify-center font-medium">
                    {action.badge}
                  </span>
                )}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Status Actions */}
      <div className="flex gap-2 pt-2 border-t">
        <Button variant="outline" className="flex-1" size="sm" data-testid="mark-complete-btn">
          <CheckCircle2 className="w-4 h-4 mr-2" />
          Mark Complete
        </Button>
        <Button variant="outline" size="sm" data-testid="schedule-followup-btn">
          <Calendar className="w-4 h-4" />
        </Button>
      </div>

      {/* Pending Uploads Warning */}
      {pendingUploads > 0 && (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-yellow-800 dark:text-yellow-200">
            <AlertCircle className="w-4 h-4" />
            <span>{pendingUploads} file(s) pending upload</span>
            <Button variant="ghost" size="sm" className="ml-auto h-7 text-xs">
              Sync Now
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Mobile Actions Widget Definition
 */
export const MobileActionsWidgetDefinition: WidgetDefinition<
  MobileActionsData,
  MobileActionsConfig
> = {
  id: "mobile-actions",
  name: "Quick Actions",
  description: "Mobile-friendly quick actions for field technicians including time tracking, photos, and navigation",
  category: "productivity",
  defaultSize: "medium",
  supportedSizes: ["small", "medium", "large"],
  icon: Smartphone,
  dataRequirements: [
    {
      key: "currentWorkOrder",
      label: "Current Work Order",
      description: "The currently active work order",
      required: false,
      type: "query",
    },
  ],
  configOptions: [
    {
      key: "showTimeTracking",
      label: "Show Time Tracking",
      description: "Display time tracking controls",
      type: "boolean",
      defaultValue: true,
    },
    {
      key: "showQuickCall",
      label: "Show Quick Call",
      description: "Display quick call button",
      type: "boolean",
      defaultValue: true,
    },
    {
      key: "compactMode",
      label: "Compact Mode",
      description: "Use compact layout for action buttons",
      type: "boolean",
      defaultValue: false,
    },
  ],
  component: MobileActionsWidgetComponent,
  defaultConfig: {
    showTimeTracking: true,
    showQuickCall: true,
    compactMode: false,
  },
  supportsRefresh: true,
  minRefreshInterval: 30000,
};
