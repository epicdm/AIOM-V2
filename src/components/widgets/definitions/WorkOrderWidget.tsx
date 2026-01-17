import * as React from "react";
import {
  Briefcase,
  MapPin,
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
  Phone,
  Calendar,
  ChevronRight,
} from "lucide-react";
import { cn } from "~/lib/utils";
import type { WidgetDefinition, WidgetProps } from "../types";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";

/**
 * Work Order Item Interface
 */
export interface WorkOrderItem {
  id: string;
  orderNumber: string;
  title: string;
  description?: string;
  customerName: string;
  customerPhone?: string;
  address: string;
  scheduledTime: Date;
  estimatedDuration: number; // in minutes
  status: "pending" | "in_progress" | "completed" | "cancelled" | "on_hold";
  priority: "low" | "normal" | "high" | "urgent";
  workType: string;
  assignedTech?: string;
}

/**
 * Work Order Widget Data
 */
export interface WorkOrderData {
  workOrders: WorkOrderItem[];
  totalCount: number;
  completedToday: number;
  pendingCount: number;
}

/**
 * Work Order Widget Config
 */
export interface WorkOrderConfig {
  showCompleted: boolean;
  maxItems: number;
  sortBy: "scheduledTime" | "priority" | "status";
  filterByStatus: string | null;
}

/**
 * Priority styling
 */
const priorityStyles = {
  low: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  normal: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  urgent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

/**
 * Status styling
 */
const statusStyles = {
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
  on_hold: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

const statusLabels = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  on_hold: "On Hold",
};

/**
 * Work Order Widget Component
 */
function WorkOrderWidgetComponent({
  data,
  isLoading,
  error,
  instance,
}: WidgetProps<WorkOrderData, WorkOrderConfig>) {
  const config = instance.config as unknown as WorkOrderConfig;

  // Sample data for demonstration
  const sampleWorkOrders: WorkOrderItem[] = [
    {
      id: "1",
      orderNumber: "WO-2024-001",
      title: "HVAC System Maintenance",
      description: "Annual preventive maintenance for commercial HVAC",
      customerName: "Johnson & Co.",
      customerPhone: "+1 (555) 123-4567",
      address: "1234 Industrial Blvd, Suite 100",
      scheduledTime: new Date(Date.now() + 3600000),
      estimatedDuration: 120,
      status: "pending",
      priority: "high",
      workType: "Maintenance",
    },
    {
      id: "2",
      orderNumber: "WO-2024-002",
      title: "Emergency Pipe Repair",
      description: "Burst pipe in basement, water damage reported",
      customerName: "Smith Residence",
      customerPhone: "+1 (555) 234-5678",
      address: "567 Oak Street",
      scheduledTime: new Date(Date.now() + 1800000),
      estimatedDuration: 90,
      status: "in_progress",
      priority: "urgent",
      workType: "Repair",
    },
    {
      id: "3",
      orderNumber: "WO-2024-003",
      title: "Electrical Panel Upgrade",
      description: "Upgrade from 100A to 200A service panel",
      customerName: "Riverside Apartments",
      customerPhone: "+1 (555) 345-6789",
      address: "890 River Road, Unit 12",
      scheduledTime: new Date(Date.now() + 7200000),
      estimatedDuration: 180,
      status: "pending",
      priority: "normal",
      workType: "Installation",
    },
    {
      id: "4",
      orderNumber: "WO-2024-004",
      title: "Water Heater Replacement",
      customerName: "Brown Family",
      address: "234 Maple Ave",
      scheduledTime: new Date(Date.now() + 10800000),
      estimatedDuration: 150,
      status: "pending",
      priority: "normal",
      workType: "Installation",
    },
    {
      id: "5",
      orderNumber: "WO-2024-005",
      title: "AC Unit Repair",
      customerName: "Green Office Building",
      address: "789 Corporate Way",
      scheduledTime: new Date(Date.now() - 3600000),
      estimatedDuration: 60,
      status: "completed",
      priority: "high",
      workType: "Repair",
    },
  ];

  const workOrders = data?.workOrders ?? sampleWorkOrders;

  // Filter and sort work orders
  let filteredOrders = config.showCompleted
    ? workOrders
    : workOrders.filter((wo) => wo.status !== "completed" && wo.status !== "cancelled");

  if (config.filterByStatus) {
    filteredOrders = filteredOrders.filter((wo) => wo.status === config.filterByStatus);
  }

  // Sort work orders
  filteredOrders.sort((a, b) => {
    switch (config.sortBy) {
      case "priority":
        const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      case "status":
        const statusOrder = { in_progress: 0, pending: 1, on_hold: 2, completed: 3, cancelled: 4 };
        return statusOrder[a.status] - statusOrder[b.status];
      case "scheduledTime":
      default:
        return new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime();
    }
  });

  const displayOrders = filteredOrders.slice(0, config.maxItems);
  const stats = {
    total: data?.totalCount ?? workOrders.length,
    completed: data?.completedToday ?? workOrders.filter((wo) => wo.status === "completed").length,
    pending: data?.pendingCount ?? workOrders.filter((wo) => wo.status === "pending" || wo.status === "in_progress").length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px]">
        <div className="animate-pulse flex flex-col space-y-3 w-full p-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted rounded-lg" />
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
    <div className="space-y-4" data-testid="work-order-widget">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-2 p-3 bg-muted/50 rounded-lg">
        <div className="text-center">
          <p className="text-2xl font-bold text-primary">{stats.pending}</p>
          <p className="text-xs text-muted-foreground">Active</p>
        </div>
        <div className="text-center border-x border-border/50">
          <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
          <p className="text-xs text-muted-foreground">Completed</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold">{stats.total}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
      </div>

      {/* Work Order List */}
      <div className="space-y-3">
        {displayOrders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Briefcase className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>No work orders to display</p>
          </div>
        ) : (
          displayOrders.map((order) => (
            <div
              key={order.id}
              className={cn(
                "p-4 rounded-lg border transition-all",
                "hover:shadow-md cursor-pointer",
                "bg-card hover:bg-accent/50",
                order.status === "in_progress" && "border-primary/50 bg-primary/5"
              )}
              data-testid={`work-order-${order.id}`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-muted-foreground">
                      {order.orderNumber}
                    </span>
                    <Badge className={cn("text-[10px] px-1.5 py-0", priorityStyles[order.priority])}>
                      {order.priority}
                    </Badge>
                  </div>
                  <h4 className="font-semibold truncate">{order.title}</h4>
                </div>
                <Badge className={cn("text-xs shrink-0 ml-2", statusStyles[order.status])}>
                  {statusLabels[order.status]}
                </Badge>
              </div>

              {/* Customer & Location */}
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{order.customerName}</span>
                  {order.customerPhone && (
                    <a
                      href={`tel:${order.customerPhone}`}
                      className="text-primary hover:underline flex items-center gap-1 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Phone className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{order.address}</span>
                </div>
              </div>

              {/* Time & Actions */}
              <div className="flex items-center justify-between mt-3 pt-2 border-t">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(order.scheduledTime).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(order.scheduledTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="text-muted-foreground/70">
                    ~{order.estimatedDuration}min
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          ))
        )}
      </div>

      {/* View All Link */}
      {filteredOrders.length > config.maxItems && (
        <div className="text-center pt-2">
          <Button variant="ghost" size="sm" className="text-sm text-primary">
            View all {filteredOrders.length} work orders
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Work Order Widget Definition
 */
export const WorkOrderWidgetDefinition: WidgetDefinition<
  WorkOrderData,
  WorkOrderConfig
> = {
  id: "work-order",
  name: "Work Orders",
  description: "View and manage assigned work orders with scheduling and status tracking",
  category: "productivity",
  defaultSize: "large",
  supportedSizes: ["medium", "large", "full"],
  icon: Briefcase,
  dataRequirements: [
    {
      key: "workOrders",
      label: "Work Orders",
      description: "List of assigned work orders",
      required: true,
      type: "query",
    },
  ],
  configOptions: [
    {
      key: "showCompleted",
      label: "Show Completed",
      description: "Display completed work orders in the list",
      type: "boolean",
      defaultValue: false,
    },
    {
      key: "maxItems",
      label: "Maximum Items",
      description: "Maximum number of work orders to display",
      type: "number",
      defaultValue: 5,
      validation: { min: 1, max: 20 },
    },
    {
      key: "sortBy",
      label: "Sort By",
      description: "How to sort work orders",
      type: "select",
      defaultValue: "scheduledTime",
      options: [
        { label: "Scheduled Time", value: "scheduledTime" },
        { label: "Priority", value: "priority" },
        { label: "Status", value: "status" },
      ],
    },
    {
      key: "filterByStatus",
      label: "Filter by Status",
      description: "Only show work orders with specific status",
      type: "select",
      defaultValue: null,
      options: [
        { label: "All", value: "" },
        { label: "Pending", value: "pending" },
        { label: "In Progress", value: "in_progress" },
        { label: "On Hold", value: "on_hold" },
      ],
    },
  ],
  component: WorkOrderWidgetComponent,
  defaultConfig: {
    showCompleted: false,
    maxItems: 5,
    sortBy: "scheduledTime",
    filterByStatus: null,
  },
  supportsRefresh: true,
  minRefreshInterval: 30000,
};
