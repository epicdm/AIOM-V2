/**
 * Field Technician Mobile Dashboard
 *
 * A mobile-optimized dashboard for field technicians with:
 * - Work order management
 * - Route optimization
 * - Inventory checks
 * - Customer site history
 * - Quick mobile actions
 */

import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Briefcase,
  Route as RouteIcon,
  Package,
  History,
  Clock,
  CheckCircle2,
  MapPin,
  Phone,
  Camera,
  Navigation,
  AlertCircle,
  ChevronRight,
  Settings,
  ArrowLeft,
  Play,
  Pause,
  Timer,
  User,
} from "lucide-react";
import { authClient } from "~/lib/auth-client";
import { redirect } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";

export const Route = createFileRoute("/mobile/field-tech/")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session) {
      throw redirect({
        to: "/sign-in",
        search: { redirect: "/mobile/field-tech" },
      });
    }
  },
  component: FieldTechMobileDashboard,
});

/**
 * Get initials from a name
 */
function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
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
 * Quick Action Card Component
 */
function QuickActionCard({
  icon: Icon,
  title,
  description,
  badge,
  badgeColor,
  href,
}: {
  icon: typeof Briefcase;
  title: string;
  description: string;
  badge?: number;
  badgeColor?: string;
  href: string;
}) {
  return (
    <Link to={href}>
      <Card className="transition-all duration-200 active:scale-[0.98] hover:shadow-md h-full">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="w-6 h-6 text-primary" />
            </div>
            {badge !== undefined && badge > 0 && (
              <span
                className={cn(
                  "px-2 py-0.5 text-xs font-semibold rounded-full",
                  badgeColor || "bg-primary/10 text-primary"
                )}
              >
                {badge}
              </span>
            )}
          </div>
          <h3 className="font-semibold mt-3">{title}</h3>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

function FieldTechMobileDashboard() {
  const { data: session } = authClient.useSession();
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
  };

  // Sample data
  const stats = {
    pendingWorkOrders: 5,
    completedToday: 3,
    lowStockItems: 4,
    totalStops: 6,
    completedStops: 2,
  };

  const currentWorkOrder = {
    id: "wo-1",
    orderNumber: "WO-2024-002",
    customerName: "Johnson & Co.",
    address: "1234 Industrial Blvd, Suite 100",
    scheduledTime: new Date(Date.now() + 1800000),
    workType: "HVAC Maintenance",
  };

  const userName = session?.user?.name || "Technician";
  const userEmail = session?.user?.email || "";
  const userImage = session?.user?.image || null;

  return (
    <div className="flex flex-col min-h-screen bg-background" data-testid="field-tech-mobile-dashboard">
      {/* Header */}
      <header className="bg-primary text-primary-foreground">
        <div className="px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <Link to="/dashboard">
              <Button variant="ghost" size="icon" className="h-9 w-9 text-primary-foreground hover:bg-primary-foreground/10">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground">
              Field Technician
            </Badge>
            <Link to="/dashboard/settings">
              <Button variant="ghost" size="icon" className="h-9 w-9 text-primary-foreground hover:bg-primary-foreground/10">
                <Settings className="h-5 w-5" />
              </Button>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 border-2 border-primary-foreground/20">
              {userImage ? (
                <AvatarImage src={userImage} alt={userName} />
              ) : (
                <AvatarFallback className="bg-primary-foreground/10 text-primary-foreground">
                  {getInitials(userName)}
                </AvatarFallback>
              )}
            </Avatar>
            <div>
              <h1 className="text-xl font-semibold">Hello, {userName.split(" ")[0]}</h1>
              <p className="text-sm text-primary-foreground/70">
                {stats.pendingWorkOrders} jobs today • {stats.completedStops}/{stats.totalStops} completed
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Current Job Card */}
      {currentWorkOrder && (
        <div className="p-4 -mt-4">
          <Card className="shadow-lg border-primary/20 bg-primary/5" data-testid="current-job-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Badge variant="default" className="bg-primary">
                  Current Job
                </Badge>
                <span className="text-xs text-muted-foreground font-mono">
                  {currentWorkOrder.orderNumber}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h3 className="font-semibold">{currentWorkOrder.customerName}</h3>
                <p className="text-sm text-muted-foreground">{currentWorkOrder.workType}</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span className="truncate">{currentWorkOrder.address}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>
                  Scheduled: {new Date(currentWorkOrder.scheduledTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-3 gap-2 pt-2">
                <Button size="sm" className="w-full" data-testid="navigate-btn">
                  <Navigation className="w-4 h-4 mr-1" />
                  Navigate
                </Button>
                <Button size="sm" variant="outline" className="w-full" data-testid="call-btn">
                  <Phone className="w-4 h-4 mr-1" />
                  Call
                </Button>
                <Button size="sm" variant="outline" className="w-full" data-testid="photo-btn">
                  <Camera className="w-4 h-4 mr-1" />
                  Photo
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Time Tracking */}
      <div className="px-4 mb-4">
        <Card data-testid="time-tracking-card">
          <CardContent className="p-4">
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
            <div className="text-center py-2">
              <span
                className={cn(
                  "text-3xl font-mono font-bold tabular-nums",
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
                  <Play className="w-4 h-4 mr-2" />
                  Start Job
                </Button>
              ) : (
                <>
                  <Button
                    variant={isPaused ? "default" : "outline"}
                    className="flex-1"
                    onClick={handlePauseTracking}
                    data-testid="pause-timer-btn"
                  >
                    {isPaused ? <Play className="w-4 h-4 mr-2" /> : <Pause className="w-4 h-4 mr-2" />}
                    {isPaused ? "Resume" : "Pause"}
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={handleStopTracking}
                    data-testid="complete-job-btn"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Complete
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-4 pb-4 space-y-4">
        {/* Navigation Cards */}
        <div className="grid grid-cols-2 gap-4">
          <QuickActionCard
            icon={Briefcase}
            title="Work Orders"
            description="View assigned jobs"
            badge={stats.pendingWorkOrders}
            badgeColor="bg-blue-500/10 text-blue-600"
            href="/mobile/field-tech/work-orders"
          />
          <QuickActionCard
            icon={RouteIcon}
            title="Route"
            description="Today's route plan"
            badge={stats.totalStops - stats.completedStops}
            badgeColor="bg-green-500/10 text-green-600"
            href="/mobile/field-tech/route-plan"
          />
          <QuickActionCard
            icon={Package}
            title="Inventory"
            description="Check stock levels"
            badge={stats.lowStockItems}
            badgeColor="bg-orange-500/10 text-orange-600"
            href="/mobile/field-tech/inventory"
          />
          <QuickActionCard
            icon={History}
            title="Site History"
            description="Customer records"
            href="/mobile/field-tech/history"
          />
        </div>

        {/* Today's Stats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Today's Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-primary">{stats.pendingWorkOrders}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{stats.completedToday}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold">{stats.totalStops}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Low Stock Alert */}
        {stats.lowStockItems > 0 && (
          <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/20 dark:border-orange-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-orange-600" />
                <div className="flex-1">
                  <p className="font-medium text-orange-800 dark:text-orange-200">
                    Low Stock Alert
                  </p>
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    {stats.lowStockItems} items need restocking
                  </p>
                </div>
                <Link to="/mobile/field-tech/inventory">
                  <Button variant="outline" size="sm" className="border-orange-300 text-orange-700 hover:bg-orange-100">
                    View
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
