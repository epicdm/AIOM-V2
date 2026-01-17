import * as React from "react";
import {
  Package,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Search,
  Plus,
  Minus,
  RefreshCw,
  Truck,
} from "lucide-react";
import { cn } from "~/lib/utils";
import type { WidgetDefinition, WidgetProps } from "../types";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";

/**
 * Inventory Item Interface
 */
export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  quantityOnHand: number;
  quantityReserved: number;
  minStockLevel: number;
  maxStockLevel: number;
  unit: string;
  location: string;
  lastRestocked?: Date;
  isLowStock: boolean;
  isCritical: boolean;
}

/**
 * Inventory Check Widget Data
 */
export interface InventoryCheckData {
  items: InventoryItem[];
  totalItems: number;
  lowStockCount: number;
  criticalCount: number;
  lastUpdated?: Date;
}

/**
 * Inventory Check Widget Config
 */
export interface InventoryCheckConfig {
  showLowStockOnly: boolean;
  maxItems: number;
  sortBy: "name" | "quantity" | "status";
  groupByCategory: boolean;
}

/**
 * Stock status helpers
 */
function getStockStatus(item: InventoryItem): { label: string; color: string; icon: typeof CheckCircle2 } {
  if (item.isCritical) {
    return {
      label: "Critical",
      color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      icon: AlertCircle,
    };
  }
  if (item.isLowStock) {
    return {
      label: "Low Stock",
      color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
      icon: AlertTriangle,
    };
  }
  return {
    label: "In Stock",
    color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    icon: CheckCircle2,
  };
}

function getStockPercentage(item: InventoryItem): number {
  if (item.maxStockLevel === 0) return 0;
  return Math.min(100, Math.round((item.quantityOnHand / item.maxStockLevel) * 100));
}

/**
 * Inventory Check Widget Component
 */
function InventoryCheckWidgetComponent({
  data,
  isLoading,
  error,
  instance,
  onRefresh,
}: WidgetProps<InventoryCheckData, InventoryCheckConfig>) {
  const config = instance.config as unknown as InventoryCheckConfig;
  const [searchQuery, setSearchQuery] = React.useState("");

  // Sample data for demonstration
  const sampleItems: InventoryItem[] = [
    {
      id: "1",
      name: "Copper Pipe 1/2\"",
      sku: "CP-050",
      category: "Plumbing",
      quantityOnHand: 45,
      quantityReserved: 10,
      minStockLevel: 20,
      maxStockLevel: 100,
      unit: "ft",
      location: "Van A-1",
      isLowStock: false,
      isCritical: false,
    },
    {
      id: "2",
      name: "PVC Elbow 90°",
      sku: "PVC-90",
      category: "Plumbing",
      quantityOnHand: 8,
      quantityReserved: 5,
      minStockLevel: 15,
      maxStockLevel: 50,
      unit: "pcs",
      location: "Van A-2",
      isLowStock: true,
      isCritical: false,
    },
    {
      id: "3",
      name: "HVAC Filter 20x20",
      sku: "HVF-2020",
      category: "HVAC",
      quantityOnHand: 2,
      quantityReserved: 1,
      minStockLevel: 10,
      maxStockLevel: 30,
      unit: "pcs",
      location: "Van B-1",
      isLowStock: true,
      isCritical: true,
    },
    {
      id: "4",
      name: "Electrical Wire 14AWG",
      sku: "EW-14",
      category: "Electrical",
      quantityOnHand: 150,
      quantityReserved: 25,
      minStockLevel: 50,
      maxStockLevel: 200,
      unit: "ft",
      location: "Van A-3",
      isLowStock: false,
      isCritical: false,
    },
    {
      id: "5",
      name: "Circuit Breaker 20A",
      sku: "CB-20",
      category: "Electrical",
      quantityOnHand: 5,
      quantityReserved: 2,
      minStockLevel: 8,
      maxStockLevel: 25,
      unit: "pcs",
      location: "Van A-3",
      isLowStock: true,
      isCritical: false,
    },
    {
      id: "6",
      name: "Refrigerant R-410A",
      sku: "RF-410",
      category: "HVAC",
      quantityOnHand: 3,
      quantityReserved: 0,
      minStockLevel: 5,
      maxStockLevel: 15,
      unit: "lbs",
      location: "Van B-2",
      isLowStock: true,
      isCritical: true,
    },
  ];

  const items = data?.items ?? sampleItems;

  // Filter items
  let filteredItems = items;
  if (config.showLowStockOnly) {
    filteredItems = filteredItems.filter((item) => item.isLowStock || item.isCritical);
  }
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filteredItems = filteredItems.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.sku.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query)
    );
  }

  // Sort items
  filteredItems.sort((a, b) => {
    switch (config.sortBy) {
      case "quantity":
        return a.quantityOnHand - b.quantityOnHand;
      case "status":
        const getStatusOrder = (item: InventoryItem) => {
          if (item.isCritical) return 0;
          if (item.isLowStock) return 1;
          return 2;
        };
        return getStatusOrder(a) - getStatusOrder(b);
      case "name":
      default:
        return a.name.localeCompare(b.name);
    }
  });

  const displayItems = filteredItems.slice(0, config.maxItems);
  const stats = {
    total: data?.totalItems ?? items.length,
    lowStock: data?.lowStockCount ?? items.filter((i) => i.isLowStock).length,
    critical: data?.criticalCount ?? items.filter((i) => i.isCritical).length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px]">
        <div className="animate-pulse flex flex-col space-y-3 w-full p-4">
          <div className="h-10 bg-muted rounded-lg" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted rounded-lg" />
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
    <div className="space-y-4" data-testid="inventory-check-widget">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-2 p-3 bg-muted/50 rounded-lg">
        <div className="text-center">
          <p className="text-2xl font-bold">{stats.total}</p>
          <p className="text-xs text-muted-foreground">Total Items</p>
        </div>
        <div className="text-center border-x border-border/50">
          <p className="text-2xl font-bold text-yellow-600">{stats.lowStock}</p>
          <p className="text-xs text-muted-foreground">Low Stock</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
          <p className="text-xs text-muted-foreground">Critical</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search inventory..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
          data-testid="inventory-search"
        />
      </div>

      {/* Inventory List */}
      <div className="space-y-2">
        {displayItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>{searchQuery ? "No items match your search" : "No inventory items to display"}</p>
          </div>
        ) : (
          displayItems.map((item) => {
            const status = getStockStatus(item);
            const percentage = getStockPercentage(item);
            const StatusIcon = status.icon;
            const availableQty = item.quantityOnHand - item.quantityReserved;

            return (
              <div
                key={item.id}
                className={cn(
                  "p-3 rounded-lg border transition-all",
                  "hover:shadow-sm cursor-pointer",
                  "bg-card hover:bg-accent/50",
                  item.isCritical && "border-red-300 bg-red-50/50 dark:bg-red-950/20"
                )}
                data-testid={`inventory-item-${item.id}`}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Item Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium truncate">{item.name}</span>
                      <Badge className={cn("text-[10px] px-1.5 py-0", status.color)}>
                        <StatusIcon className="w-2.5 h-2.5 mr-0.5" />
                        {status.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="font-mono">{item.sku}</span>
                      <span>•</span>
                      <span>{item.category}</span>
                      <span>•</span>
                      <span>{item.location}</span>
                    </div>
                  </div>

                  {/* Quantity */}
                  <div className="text-right shrink-0">
                    <div className="flex items-baseline gap-1">
                      <span className={cn(
                        "text-lg font-bold",
                        item.isCritical && "text-red-600",
                        item.isLowStock && !item.isCritical && "text-yellow-600"
                      )}>
                        {item.quantityOnHand}
                      </span>
                      <span className="text-xs text-muted-foreground">{item.unit}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {availableQty} available
                    </p>
                  </div>
                </div>

                {/* Stock Level Bar */}
                <div className="mt-2">
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full transition-all",
                        item.isCritical && "bg-red-500",
                        item.isLowStock && !item.isCritical && "bg-yellow-500",
                        !item.isLowStock && "bg-green-500"
                      )}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                    <span>Min: {item.minStockLevel}</span>
                    <span>Max: {item.maxStockLevel}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Actions */}
      {(stats.lowStock > 0 || stats.critical > 0) && (
        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" className="flex-1" data-testid="reorder-btn">
            <Truck className="w-4 h-4 mr-2" />
            Reorder Low Stock
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onRefresh?.()} data-testid="refresh-inventory-btn">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* View All Link */}
      {filteredItems.length > config.maxItems && (
        <div className="text-center">
          <Button variant="ghost" size="sm" className="text-sm text-primary">
            View all {filteredItems.length} items
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Inventory Check Widget Definition
 */
export const InventoryCheckWidgetDefinition: WidgetDefinition<
  InventoryCheckData,
  InventoryCheckConfig
> = {
  id: "inventory-check",
  name: "Inventory Check",
  description: "Monitor stock levels, check inventory status, and identify low-stock items",
  category: "productivity",
  defaultSize: "medium",
  supportedSizes: ["small", "medium", "large"],
  icon: Package,
  dataRequirements: [
    {
      key: "items",
      label: "Inventory Items",
      description: "List of inventory items with stock levels",
      required: true,
      type: "query",
    },
  ],
  configOptions: [
    {
      key: "showLowStockOnly",
      label: "Show Low Stock Only",
      description: "Only display items with low or critical stock levels",
      type: "boolean",
      defaultValue: false,
    },
    {
      key: "maxItems",
      label: "Maximum Items",
      description: "Maximum number of items to display",
      type: "number",
      defaultValue: 6,
      validation: { min: 1, max: 20 },
    },
    {
      key: "sortBy",
      label: "Sort By",
      description: "How to sort inventory items",
      type: "select",
      defaultValue: "status",
      options: [
        { label: "Name", value: "name" },
        { label: "Quantity", value: "quantity" },
        { label: "Stock Status", value: "status" },
      ],
    },
    {
      key: "groupByCategory",
      label: "Group by Category",
      description: "Group inventory items by category",
      type: "boolean",
      defaultValue: false,
    },
  ],
  component: InventoryCheckWidgetComponent,
  defaultConfig: {
    showLowStockOnly: false,
    maxItems: 6,
    sortBy: "status",
    groupByCategory: false,
  },
  supportsRefresh: true,
  minRefreshInterval: 60000,
};
