/**
 * Field Technician Work Orders Page
 *
 * Mobile-optimized page for viewing and managing assigned work orders.
 * Features filtering, status updates, and quick access to job details.
 */

import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  RefreshCw,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  MapPin,
  ChevronRight,
  Filter,
  Briefcase,
  Calendar,
  User,
  Phone,
  Play,
  Wrench,
} from "lucide-react";
import { authClient } from "~/lib/auth-client";
import { redirect } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent } from "~/components/ui/card";
import { cn } from "~/lib/utils";
import { format, formatDistanceToNow, isToday, isTomorrow } from "date-fns";

export const Route = createFileRoute("/mobile/field-tech/work-orders")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session) {
      throw redirect({
        to: "/sign-in",
        search: { redirect: "/mobile/field-tech/work-orders" },
      });
    }
  },
  component: WorkOrdersPage,
});

// Work order status types
type WorkOrderStatus = "pending" | "in_progress" | "completed" | "cancelled" | "on_hold";
type WorkOrderPriority = "low" | "medium" | "high" | "urgent";

// Sample work order interface
interface WorkOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  address: string;
  scheduledDate: Date;
  scheduledTime: string;
  workType: string;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  estimatedDuration: number; // in minutes
  customerPhone?: string;
  notes?: string;
}

// Status configuration
const STATUS_CONFIG: Record<
  WorkOrderStatus,
  { label: string; icon: typeof Clock; colorClass: string; bgClass: string }
> = {
  pending: {
    label: "Pending",
    icon: Clock,
    colorClass: "text-yellow-600 dark:text-yellow-400",
    bgClass: "bg-yellow-500/10",
  },
  in_progress: {
    label: "In Progress",
    icon: Play,
    colorClass: "text-blue-600 dark:text-blue-400",
    bgClass: "bg-blue-500/10",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle,
    colorClass: "text-green-600 dark:text-green-400",
    bgClass: "bg-green-500/10",
  },
  cancelled: {
    label: "Cancelled",
    icon: XCircle,
    colorClass: "text-red-600 dark:text-red-400",
    bgClass: "bg-red-500/10",
  },
  on_hold: {
    label: "On Hold",
    icon: AlertCircle,
    colorClass: "text-orange-600 dark:text-orange-400",
    bgClass: "bg-orange-500/10",
  },
};

const PRIORITY_CONFIG: Record<
  WorkOrderPriority,
  { label: string; colorClass: string; bgClass: string }
> = {
  low: {
    label: "Low",
    colorClass: "text-gray-600 dark:text-gray-400",
    bgClass: "bg-gray-500/10",
  },
  medium: {
    label: "Medium",
    colorClass: "text-blue-600 dark:text-blue-400",
    bgClass: "bg-blue-500/10",
  },
  high: {
    label: "High",
    colorClass: "text-orange-600 dark:text-orange-400",
    bgClass: "bg-orange-500/10",
  },
  urgent: {
    label: "Urgent",
    colorClass: "text-red-600 dark:text-red-400",
    bgClass: "bg-red-500/10",
  },
};

// Sample data
const SAMPLE_WORK_ORDERS: WorkOrder[] = [
  {
    id: "wo-1",
    orderNumber: "WO-2024-001",
    customerName: "Acme Corporation",
    address: "123 Business Park Dr, Suite 200",
    scheduledDate: new Date(),
    scheduledTime: "09:00",
    workType: "HVAC Maintenance",
    status: "pending",
    priority: "high",
    estimatedDuration: 120,
    customerPhone: "(555) 123-4567",
    notes: "Annual maintenance check. Access code: 1234",
  },
  {
    id: "wo-2",
    orderNumber: "WO-2024-002",
    customerName: "Johnson & Co.",
    address: "1234 Industrial Blvd, Suite 100",
    scheduledDate: new Date(),
    scheduledTime: "11:30",
    workType: "Equipment Installation",
    status: "in_progress",
    priority: "medium",
    estimatedDuration: 180,
    customerPhone: "(555) 234-5678",
  },
  {
    id: "wo-3",
    orderNumber: "WO-2024-003",
    customerName: "Tech Solutions Inc",
    address: "567 Innovation Way",
    scheduledDate: new Date(),
    scheduledTime: "14:00",
    workType: "Repair Service",
    status: "pending",
    priority: "urgent",
    estimatedDuration: 90,
    customerPhone: "(555) 345-6789",
    notes: "Urgent repair needed. Customer experiencing downtime.",
  },
  {
    id: "wo-4",
    orderNumber: "WO-2024-004",
    customerName: "Green Energy Ltd",
    address: "890 Eco Street",
    scheduledDate: new Date(Date.now() + 86400000), // Tomorrow
    scheduledTime: "10:00",
    workType: "System Inspection",
    status: "pending",
    priority: "low",
    estimatedDuration: 60,
    customerPhone: "(555) 456-7890",
  },
  {
    id: "wo-5",
    orderNumber: "WO-2024-005",
    customerName: "Metro Hospital",
    address: "456 Healthcare Ave",
    scheduledDate: new Date(),
    scheduledTime: "08:00",
    workType: "Emergency Repair",
    status: "completed",
    priority: "urgent",
    estimatedDuration: 240,
    customerPhone: "(555) 567-8901",
  },
];

/**
 * Format scheduled date for display
 */
function formatScheduleDate(date: Date): string {
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  return format(date, "EEE, MMM d");
}

/**
 * Work Order Card Component
 */
function WorkOrderCard({ workOrder }: { workOrder: WorkOrder }) {
  const statusConfig = STATUS_CONFIG[workOrder.status];
  const priorityConfig = PRIORITY_CONFIG[workOrder.priority];
  const StatusIcon = statusConfig.icon;

  return (
    <Card
      className="transition-all duration-200 active:scale-[0.98] hover:shadow-md"
      data-testid={`work-order-card-${workOrder.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge
                variant="outline"
                className={cn(statusConfig.bgClass, statusConfig.colorClass, "border-0")}
              >
                <StatusIcon className="w-3 h-3 mr-1" />
                {statusConfig.label}
              </Badge>
              {workOrder.priority !== "low" && (
                <Badge
                  variant="outline"
                  className={cn(priorityConfig.bgClass, priorityConfig.colorClass, "border-0")}
                >
                  {priorityConfig.label}
                </Badge>
              )}
            </div>
            <p className="font-mono text-xs text-muted-foreground">{workOrder.orderNumber}</p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
        </div>

        <h3 className="font-semibold mb-1">{workOrder.customerName}</h3>
        <p className="text-sm text-muted-foreground mb-3">{workOrder.workType}</p>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{workOrder.address}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-4 h-4 flex-shrink-0" />
            <span>
              {formatScheduleDate(workOrder.scheduledDate)} at {workOrder.scheduledTime}
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4 flex-shrink-0" />
            <span>Est. {workOrder.estimatedDuration} min</span>
          </div>
        </div>

        {/* Quick Actions */}
        {workOrder.status !== "completed" && workOrder.status !== "cancelled" && (
          <div className="flex gap-2 mt-4 pt-3 border-t">
            {workOrder.customerPhone && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={(e) => {
                  e.preventDefault();
                  window.location.href = `tel:${workOrder.customerPhone}`;
                }}
              >
                <Phone className="w-4 h-4 mr-1" />
                Call
              </Button>
            )}
            {workOrder.status === "pending" && (
              <Button size="sm" className="flex-1">
                <Play className="w-4 h-4 mr-1" />
                Start Job
              </Button>
            )}
            {workOrder.status === "in_progress" && (
              <Button size="sm" className="flex-1">
                <CheckCircle className="w-4 h-4 mr-1" />
                Complete
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Filter Tabs Component
 */
function FilterTabs({
  activeFilter,
  onFilterChange,
}: {
  activeFilter: WorkOrderStatus | "all" | "today";
  onFilterChange: (filter: WorkOrderStatus | "all" | "today") => void;
}) {
  const filters: Array<{ value: WorkOrderStatus | "all" | "today"; label: string }> = [
    { value: "all", label: "All" },
    { value: "today", label: "Today" },
    { value: "pending", label: "Pending" },
    { value: "in_progress", label: "In Progress" },
    { value: "completed", label: "Completed" },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
      {filters.map((filter) => (
        <Button
          key={filter.value}
          variant={activeFilter === filter.value ? "default" : "outline"}
          size="sm"
          onClick={() => onFilterChange(filter.value)}
          className="flex-shrink-0 whitespace-nowrap"
        >
          {filter.label}
        </Button>
      ))}
    </div>
  );
}

function WorkOrdersPage() {
  const [statusFilter, setStatusFilter] = React.useState<WorkOrderStatus | "all" | "today">("today");
  const [isLoading, setIsLoading] = React.useState(false);
  const [workOrders] = React.useState<WorkOrder[]>(SAMPLE_WORK_ORDERS);

  // Filter work orders
  const filteredWorkOrders = React.useMemo(() => {
    let filtered = [...workOrders];

    if (statusFilter === "today") {
      filtered = filtered.filter((wo) => isToday(wo.scheduledDate));
    } else if (statusFilter !== "all") {
      filtered = filtered.filter((wo) => wo.status === statusFilter);
    }

    // Sort by priority and time
    filtered.sort((a, b) => {
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return a.scheduledTime.localeCompare(b.scheduledTime);
    });

    return filtered;
  }, [workOrders, statusFilter]);

  // Calculate stats
  const stats = React.useMemo(() => {
    const todayOrders = workOrders.filter((wo) => isToday(wo.scheduledDate));
    return {
      total: workOrders.length,
      today: todayOrders.length,
      pending: todayOrders.filter((wo) => wo.status === "pending").length,
      inProgress: todayOrders.filter((wo) => wo.status === "in_progress").length,
      completed: todayOrders.filter((wo) => wo.status === "completed").length,
    };
  }, [workOrders]);

  const handleRefresh = () => {
    setIsLoading(true);
    // Simulate refresh
    setTimeout(() => setIsLoading(false), 1000);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background" data-testid="work-orders-page">
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
              <h1 className="text-lg font-semibold">Work Orders</h1>
              <p className="text-xs text-muted-foreground">
                {filteredWorkOrders.length} {filteredWorkOrders.length === 1 ? "order" : "orders"}
              </p>
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

      {/* Quick Stats */}
      <div className="px-4 py-3 bg-muted/30 border-b">
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <p className="text-lg font-semibold">{stats.today}</p>
            <p className="text-xs text-muted-foreground">Today</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-yellow-600">{stats.pending}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-blue-600">{stats.inProgress}</p>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-green-600">{stats.completed}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 py-3 border-b">
        <FilterTabs activeFilter={statusFilter} onFilterChange={setStatusFilter} />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading work orders...</p>
          </div>
        ) : filteredWorkOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="p-4 rounded-full bg-muted mb-4">
              <Briefcase className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold mb-2">No work orders</h2>
            <p className="text-sm text-muted-foreground">
              {statusFilter === "today"
                ? "No work orders scheduled for today"
                : `No ${statusFilter} work orders found`}
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {filteredWorkOrders.map((workOrder) => (
              <WorkOrderCard key={workOrder.id} workOrder={workOrder} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
