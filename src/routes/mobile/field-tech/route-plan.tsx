/**
 * Field Technician Route Optimization Page
 *
 * Mobile-optimized page for viewing and managing daily route plan.
 * Features optimized route display, navigation integration, and stop management.
 */

import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  RefreshCw,
  Loader2,
  CheckCircle,
  Clock,
  MapPin,
  Navigation,
  Phone,
  ChevronDown,
  ChevronUp,
  Route as RouteIcon,
  Play,
  Flag,
  Car,
  Footprints,
} from "lucide-react";
import { authClient } from "~/lib/auth-client";
import { redirect } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { cn } from "~/lib/utils";
import { format } from "date-fns";

export const Route = createFileRoute("/mobile/field-tech/route-plan")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session) {
      throw redirect({
        to: "/sign-in",
        search: { redirect: "/mobile/field-tech/route-plan" },
      });
    }
  },
  component: RoutePage,
});

// Stop status type
type StopStatus = "pending" | "current" | "completed" | "skipped";

// Route stop interface
interface RouteStop {
  id: string;
  orderNumber: string;
  customerName: string;
  address: string;
  scheduledTime: string;
  estimatedArrival: string;
  estimatedDuration: number; // minutes
  workType: string;
  status: StopStatus;
  customerPhone?: string;
  distance: number; // miles from previous stop
  travelTime: number; // minutes from previous stop
  notes?: string;
}

// Sample route stops
const SAMPLE_ROUTE_STOPS: RouteStop[] = [
  {
    id: "stop-1",
    orderNumber: "WO-2024-001",
    customerName: "Metro Hospital",
    address: "456 Healthcare Ave",
    scheduledTime: "08:00",
    estimatedArrival: "08:00",
    estimatedDuration: 60,
    workType: "Emergency Repair",
    status: "completed",
    customerPhone: "(555) 567-8901",
    distance: 0,
    travelTime: 0,
    notes: "Completed ahead of schedule",
  },
  {
    id: "stop-2",
    orderNumber: "WO-2024-002",
    customerName: "Acme Corporation",
    address: "123 Business Park Dr, Suite 200",
    scheduledTime: "09:30",
    estimatedArrival: "09:15",
    estimatedDuration: 120,
    workType: "HVAC Maintenance",
    status: "current",
    customerPhone: "(555) 123-4567",
    distance: 5.2,
    travelTime: 12,
    notes: "Annual maintenance check. Access code: 1234",
  },
  {
    id: "stop-3",
    orderNumber: "WO-2024-003",
    customerName: "Johnson & Co.",
    address: "1234 Industrial Blvd, Suite 100",
    scheduledTime: "12:00",
    estimatedArrival: "11:45",
    estimatedDuration: 90,
    workType: "Equipment Installation",
    status: "pending",
    customerPhone: "(555) 234-5678",
    distance: 3.8,
    travelTime: 10,
  },
  {
    id: "stop-4",
    orderNumber: "WO-2024-004",
    customerName: "Tech Solutions Inc",
    address: "567 Innovation Way",
    scheduledTime: "14:00",
    estimatedArrival: "13:45",
    estimatedDuration: 90,
    workType: "Repair Service",
    status: "pending",
    customerPhone: "(555) 345-6789",
    distance: 7.1,
    travelTime: 18,
    notes: "Urgent repair needed. Customer experiencing downtime.",
  },
  {
    id: "stop-5",
    orderNumber: "WO-2024-005",
    customerName: "Green Energy Ltd",
    address: "890 Eco Street",
    scheduledTime: "16:00",
    estimatedArrival: "15:45",
    estimatedDuration: 60,
    workType: "System Inspection",
    status: "pending",
    customerPhone: "(555) 456-7890",
    distance: 4.5,
    travelTime: 15,
  },
];

// Status configuration
const STATUS_CONFIG: Record<
  StopStatus,
  { label: string; colorClass: string; bgClass: string; borderClass: string }
> = {
  pending: {
    label: "Upcoming",
    colorClass: "text-gray-600 dark:text-gray-400",
    bgClass: "bg-gray-500/10",
    borderClass: "border-gray-300",
  },
  current: {
    label: "Current",
    colorClass: "text-blue-600 dark:text-blue-400",
    bgClass: "bg-blue-500/10",
    borderClass: "border-blue-500",
  },
  completed: {
    label: "Completed",
    colorClass: "text-green-600 dark:text-green-400",
    bgClass: "bg-green-500/10",
    borderClass: "border-green-500",
  },
  skipped: {
    label: "Skipped",
    colorClass: "text-orange-600 dark:text-orange-400",
    bgClass: "bg-orange-500/10",
    borderClass: "border-orange-300",
  },
};

/**
 * Route Stop Card Component
 */
function RouteStopCard({
  stop,
  stopNumber,
  isExpanded,
  onToggle,
}: {
  stop: RouteStop;
  stopNumber: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const statusConfig = STATUS_CONFIG[stop.status];
  const isActive = stop.status === "current";
  const isCompleted = stop.status === "completed";

  return (
    <div className="relative" data-testid={`route-stop-${stop.id}`}>
      {/* Timeline connector */}
      <div
        className={cn(
          "absolute left-[19px] top-10 bottom-0 w-0.5",
          isCompleted ? "bg-green-500" : "bg-gray-200 dark:bg-gray-700"
        )}
      />

      <Card
        className={cn(
          "relative transition-all duration-200 ml-10",
          isActive && "border-blue-500 shadow-md",
          isCompleted && "opacity-70"
        )}
      >
        {/* Stop number marker */}
        <div
          className={cn(
            "absolute -left-10 top-4 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2",
            isCompleted && "bg-green-500 border-green-500 text-white",
            isActive && "bg-blue-500 border-blue-500 text-white animate-pulse",
            !isCompleted && !isActive && "bg-background border-gray-300 text-muted-foreground"
          )}
        >
          {isCompleted ? <CheckCircle className="w-4 h-4" /> : stopNumber}
        </div>

        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-2" onClick={onToggle}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge
                  variant="outline"
                  className={cn(statusConfig.bgClass, statusConfig.colorClass, "border-0")}
                >
                  {statusConfig.label}
                </Badge>
                <span className="text-xs font-mono text-muted-foreground">{stop.orderNumber}</span>
              </div>
              <h3 className={cn("font-semibold", isCompleted && "line-through")}>
                {stop.customerName}
              </h3>
              <p className="text-sm text-muted-foreground">{stop.workType}</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* Time info */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{stop.scheduledTime}</span>
            </div>
            {stop.distance > 0 && (
              <>
                <div className="flex items-center gap-1">
                  <Car className="w-3 h-3" />
                  <span>{stop.distance} mi</span>
                </div>
                <div className="flex items-center gap-1">
                  <Footprints className="w-3 h-3" />
                  <span>{stop.travelTime} min</span>
                </div>
              </>
            )}
          </div>

          {/* Expanded content */}
          {isExpanded && (
            <div className="pt-3 mt-3 border-t space-y-3">
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <span>{stop.address}</span>
              </div>

              {stop.notes && (
                <div className="text-sm bg-muted/50 p-2 rounded">
                  <p className="text-muted-foreground">{stop.notes}</p>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>Est. duration: {stop.estimatedDuration} min</span>
              </div>

              {/* Actions */}
              {!isCompleted && (
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Open navigation
                      window.open(
                        `https://maps.google.com/maps?daddr=${encodeURIComponent(stop.address)}`,
                        "_blank"
                      );
                    }}
                  >
                    <Navigation className="w-4 h-4 mr-1" />
                    Navigate
                  </Button>
                  {stop.customerPhone && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = `tel:${stop.customerPhone}`;
                      }}
                    >
                      <Phone className="w-4 h-4 mr-1" />
                      Call
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RoutePage() {
  const [isLoading, setIsLoading] = React.useState(false);
  const [routeStops] = React.useState<RouteStop[]>(SAMPLE_ROUTE_STOPS);
  const [expandedStops, setExpandedStops] = React.useState<Set<string>>(
    new Set(["stop-2"]) // Auto-expand current stop
  );

  // Toggle stop expansion
  const toggleStop = (stopId: string) => {
    setExpandedStops((prev) => {
      const next = new Set(prev);
      if (next.has(stopId)) {
        next.delete(stopId);
      } else {
        next.add(stopId);
      }
      return next;
    });
  };

  // Calculate route stats
  const stats = React.useMemo(() => {
    const completed = routeStops.filter((s) => s.status === "completed").length;
    const totalDistance = routeStops.reduce((sum, s) => sum + s.distance, 0);
    const totalTravelTime = routeStops.reduce((sum, s) => sum + s.travelTime, 0);
    const totalWorkTime = routeStops.reduce((sum, s) => sum + s.estimatedDuration, 0);

    return {
      total: routeStops.length,
      completed,
      remaining: routeStops.length - completed,
      totalDistance: totalDistance.toFixed(1),
      totalTravelTime,
      totalWorkTime,
      estimatedEndTime: "17:00", // Simplified calculation
    };
  }, [routeStops]);

  // Find current stop
  const currentStop = routeStops.find((s) => s.status === "current");

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1000);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background" data-testid="route-page">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to="/mobile/field-tech">
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-semibold">Today's Route</h1>
              <p className="text-xs text-muted-foreground">{format(new Date(), "EEEE, MMMM d")}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isLoading}
            className="h-9 w-9"
          >
            <RefreshCw className={cn("h-5 w-5", isLoading && "animate-spin")} />
          </Button>
        </div>
      </header>

      {/* Route Summary */}
      <div className="px-4 py-3 bg-primary text-primary-foreground">
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <p className="text-2xl font-bold">{stats.completed}/{stats.total}</p>
            <p className="text-xs text-primary-foreground/70">Stops</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{stats.totalDistance}</p>
            <p className="text-xs text-primary-foreground/70">Miles</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{Math.floor(stats.totalTravelTime / 60)}h</p>
            <p className="text-xs text-primary-foreground/70">Drive Time</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{stats.estimatedEndTime}</p>
            <p className="text-xs text-primary-foreground/70">Est. End</p>
          </div>
        </div>
      </div>

      {/* Current Stop Highlight */}
      {currentStop && (
        <div className="px-4 py-3 bg-blue-50 dark:bg-blue-950/30 border-b">
          <div className="flex items-center gap-2 mb-2">
            <Flag className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              Current Stop
            </span>
          </div>
          <p className="font-semibold">{currentStop.customerName}</p>
          <p className="text-sm text-muted-foreground">{currentStop.address}</p>
          <Button
            size="sm"
            className="mt-2"
            onClick={() => {
              window.open(
                `https://maps.google.com/maps?daddr=${encodeURIComponent(currentStop.address)}`,
                "_blank"
              );
            }}
          >
            <Navigation className="w-4 h-4 mr-1" />
            Start Navigation
          </Button>
        </div>
      )}

      {/* Route Stops */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading route...</p>
          </div>
        ) : routeStops.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="p-4 rounded-full bg-muted mb-4">
              <RouteIcon className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold mb-2">No route planned</h2>
            <p className="text-sm text-muted-foreground">
              No stops scheduled for today's route
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {/* Start point */}
            <div className="flex items-center gap-3 pl-10">
              <div className="absolute left-[19px] w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                <Play className="w-4 h-4 text-white" />
              </div>
              <p className="text-sm text-muted-foreground ml-3">Start of Route</p>
            </div>

            {routeStops.map((stop, index) => (
              <RouteStopCard
                key={stop.id}
                stop={stop}
                stopNumber={index + 1}
                isExpanded={expandedStops.has(stop.id)}
                onToggle={() => toggleStop(stop.id)}
              />
            ))}

            {/* End point */}
            <div className="flex items-center gap-3 pl-10 pt-4">
              <div className="absolute left-[19px] w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center">
                <Flag className="w-4 h-4 text-white" />
              </div>
              <p className="text-sm text-muted-foreground ml-3">End of Route</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
