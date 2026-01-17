import * as React from "react";
import {
  Route,
  MapPin,
  Clock,
  Navigation,
  Car,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Play,
  RotateCcw,
} from "lucide-react";
import { cn } from "~/lib/utils";
import type { WidgetDefinition, WidgetProps } from "../types";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";

/**
 * Route Stop Interface
 */
export interface RouteStop {
  id: string;
  orderNumber: string;
  customerName: string;
  address: string;
  scheduledTime: Date;
  estimatedArrival?: Date;
  estimatedDuration: number;
  distanceFromPrevious?: number; // in miles
  travelTimeFromPrevious?: number; // in minutes
  status: "pending" | "in_progress" | "completed" | "skipped";
  stopNumber: number;
  latitude?: number;
  longitude?: number;
}

/**
 * Route Optimization Widget Data
 */
export interface RouteOptimizationData {
  stops: RouteStop[];
  totalDistance: number;
  totalTravelTime: number;
  totalWorkTime: number;
  optimizationScore?: number;
  currentStopId?: string;
}

/**
 * Route Optimization Widget Config
 */
export interface RouteOptimizationConfig {
  showCompletedStops: boolean;
  showDistances: boolean;
  autoRefresh: boolean;
}

/**
 * Route Optimization Widget Component
 */
function RouteOptimizationWidgetComponent({
  data,
  isLoading,
  error,
  instance,
  onRefresh,
}: WidgetProps<RouteOptimizationData, RouteOptimizationConfig>) {
  const config = instance.config as unknown as RouteOptimizationConfig;

  // Sample data for demonstration
  const sampleStops: RouteStop[] = [
    {
      id: "1",
      orderNumber: "WO-2024-001",
      customerName: "Smith Residence",
      address: "567 Oak Street",
      scheduledTime: new Date(Date.now() - 1800000),
      estimatedDuration: 45,
      distanceFromPrevious: 0,
      travelTimeFromPrevious: 0,
      status: "completed",
      stopNumber: 1,
    },
    {
      id: "2",
      orderNumber: "WO-2024-002",
      customerName: "Johnson & Co.",
      address: "1234 Industrial Blvd, Suite 100",
      scheduledTime: new Date(Date.now() + 900000),
      estimatedDuration: 120,
      distanceFromPrevious: 4.2,
      travelTimeFromPrevious: 12,
      status: "in_progress",
      stopNumber: 2,
    },
    {
      id: "3",
      orderNumber: "WO-2024-003",
      customerName: "Riverside Apartments",
      address: "890 River Road, Unit 12",
      scheduledTime: new Date(Date.now() + 7200000),
      estimatedDuration: 180,
      distanceFromPrevious: 6.8,
      travelTimeFromPrevious: 18,
      status: "pending",
      stopNumber: 3,
    },
    {
      id: "4",
      orderNumber: "WO-2024-004",
      customerName: "Brown Family",
      address: "234 Maple Ave",
      scheduledTime: new Date(Date.now() + 14400000),
      estimatedDuration: 150,
      distanceFromPrevious: 3.5,
      travelTimeFromPrevious: 10,
      status: "pending",
      stopNumber: 4,
    },
    {
      id: "5",
      orderNumber: "WO-2024-005",
      customerName: "Green Office Building",
      address: "789 Corporate Way",
      scheduledTime: new Date(Date.now() + 21600000),
      estimatedDuration: 60,
      distanceFromPrevious: 5.1,
      travelTimeFromPrevious: 15,
      status: "pending",
      stopNumber: 5,
    },
  ];

  const stops = data?.stops ?? sampleStops;
  const filteredStops = config.showCompletedStops
    ? stops
    : stops.filter((s) => s.status !== "completed");

  // Calculate totals
  const totalDistance = data?.totalDistance ?? stops.reduce((sum, s) => sum + (s.distanceFromPrevious ?? 0), 0);
  const totalTravelTime = data?.totalTravelTime ?? stops.reduce((sum, s) => sum + (s.travelTimeFromPrevious ?? 0), 0);
  const completedStops = stops.filter((s) => s.status === "completed").length;
  const currentStop = stops.find((s) => s.status === "in_progress") || stops.find((s) => s.status === "pending");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px]">
        <div className="animate-pulse flex flex-col space-y-3 w-full p-4">
          <div className="h-16 bg-muted rounded-lg" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-muted rounded-lg" />
          ))}
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
    <div className="space-y-4" data-testid="route-optimization-widget">
      {/* Route Summary */}
      <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border border-primary/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Navigation className="w-5 h-5 text-primary" />
            <span className="font-semibold">Today's Route</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onRefresh?.()}
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Optimize
          </Button>
        </div>
        <div className="grid grid-cols-4 gap-3 text-center">
          <div>
            <p className="text-xl font-bold text-primary">{stops.length}</p>
            <p className="text-xs text-muted-foreground">Stops</p>
          </div>
          <div>
            <p className="text-xl font-bold">{totalDistance.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">Miles</p>
          </div>
          <div>
            <p className="text-xl font-bold">{Math.round(totalTravelTime)}</p>
            <p className="text-xs text-muted-foreground">Drive Min</p>
          </div>
          <div>
            <p className="text-xl font-bold text-green-600">{completedStops}/{stops.length}</p>
            <p className="text-xs text-muted-foreground">Done</p>
          </div>
        </div>
      </div>

      {/* Current/Next Stop Highlight */}
      {currentStop && (
        <div className="p-4 bg-primary/5 border border-primary/30 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <Badge variant="default" className="bg-primary">
              {currentStop.status === "in_progress" ? "Current Stop" : "Next Stop"}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Stop #{currentStop.stopNumber}
            </span>
          </div>
          <h4 className="font-semibold mb-1">{currentStop.customerName}</h4>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <MapPin className="w-3.5 h-3.5" />
            <span className="truncate">{currentStop.address}</span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="flex-1" data-testid="navigate-btn">
              <Navigation className="w-4 h-4 mr-2" />
              Navigate
            </Button>
            <Button size="sm" variant="outline" data-testid="start-job-btn">
              <Play className="w-4 h-4 mr-2" />
              Start Job
            </Button>
          </div>
        </div>
      )}

      {/* Route Timeline */}
      <div className="space-y-0">
        {filteredStops.map((stop, index) => (
          <div key={stop.id} className="relative" data-testid={`route-stop-${stop.id}`}>
            {/* Connector Line */}
            {index < filteredStops.length - 1 && (
              <div className="absolute left-[18px] top-[36px] bottom-0 w-0.5 bg-border" />
            )}

            <div
              className={cn(
                "flex gap-3 p-3 rounded-lg transition-colors",
                stop.status === "in_progress" && "bg-primary/5",
                stop.status === "completed" && "opacity-60"
              )}
            >
              {/* Stop Number/Status */}
              <div
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center shrink-0 z-10",
                  stop.status === "completed" && "bg-green-100 text-green-600 dark:bg-green-900/30",
                  stop.status === "in_progress" && "bg-primary text-primary-foreground animate-pulse",
                  stop.status === "pending" && "bg-muted text-muted-foreground",
                  stop.status === "skipped" && "bg-gray-100 text-gray-400 dark:bg-gray-900/30"
                )}
              >
                {stop.status === "completed" ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <span className="text-sm font-medium">{stop.stopNumber}</span>
                )}
              </div>

              {/* Stop Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{stop.customerName}</span>
                      <span className="text-xs text-muted-foreground">
                        ({stop.orderNumber})
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {stop.address}
                    </p>
                  </div>
                  {stop.status === "pending" && (
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                  )}
                </div>

                {/* Time & Distance Info */}
                <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(stop.scheduledTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span>~{stop.estimatedDuration}min</span>
                  {config.showDistances && stop.distanceFromPrevious !== undefined && stop.distanceFromPrevious > 0 && (
                    <span className="flex items-center gap-1 text-muted-foreground/70">
                      <Car className="w-3 h-3" />
                      {stop.distanceFromPrevious.toFixed(1)}mi • {stop.travelTimeFromPrevious}min
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredStops.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Route className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>No stops scheduled for today</p>
        </div>
      )}
    </div>
  );
}

/**
 * Route Optimization Widget Definition
 */
export const RouteOptimizationWidgetDefinition: WidgetDefinition<
  RouteOptimizationData,
  RouteOptimizationConfig
> = {
  id: "route-optimization",
  name: "Route Planner",
  description: "View optimized route with all scheduled stops, travel times, and navigation",
  category: "productivity",
  defaultSize: "medium",
  supportedSizes: ["medium", "large", "full"],
  icon: Route,
  dataRequirements: [
    {
      key: "stops",
      label: "Route Stops",
      description: "List of stops for the optimized route",
      required: true,
      type: "query",
    },
  ],
  configOptions: [
    {
      key: "showCompletedStops",
      label: "Show Completed",
      description: "Display completed stops in the route",
      type: "boolean",
      defaultValue: true,
    },
    {
      key: "showDistances",
      label: "Show Distances",
      description: "Display distance and travel time between stops",
      type: "boolean",
      defaultValue: true,
    },
    {
      key: "autoRefresh",
      label: "Auto Refresh",
      description: "Automatically refresh route data",
      type: "boolean",
      defaultValue: true,
    },
  ],
  component: RouteOptimizationWidgetComponent,
  defaultConfig: {
    showCompletedStops: true,
    showDistances: true,
    autoRefresh: true,
  },
  supportsRefresh: true,
  minRefreshInterval: 60000,
};
