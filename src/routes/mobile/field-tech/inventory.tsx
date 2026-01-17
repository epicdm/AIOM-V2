/**
 * Field Technician Inventory Page
 *
 * Mobile-optimized page for checking and managing vehicle/equipment inventory.
 * Features stock level tracking, low stock alerts, and quick reorder requests.
 */

import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  RefreshCw,
  Loader2,
  Package,
  AlertCircle,
  Search,
  Plus,
  Minus,
  CheckCircle,
  ShoppingCart,
  Box,
  Wrench,
  Zap,
  Filter,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { authClient } from "~/lib/auth-client";
import { redirect } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";

export const Route = createFileRoute("/mobile/field-tech/inventory")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session) {
      throw redirect({
        to: "/sign-in",
        search: { redirect: "/mobile/field-tech/inventory" },
      });
    }
  },
  component: InventoryPage,
});

// Inventory item category
type ItemCategory = "parts" | "tools" | "consumables" | "equipment";

// Stock status type
type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

// Inventory item interface
interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: ItemCategory;
  quantity: number;
  minQuantity: number;
  unit: string;
  location: string;
  lastUpdated: Date;
  reorderRequested?: boolean;
}

// Sample inventory data
const SAMPLE_INVENTORY: InventoryItem[] = [
  {
    id: "inv-1",
    sku: "HVAC-FLT-001",
    name: "HVAC Air Filter 20x25",
    description: "Standard replacement air filter for residential HVAC systems",
    category: "parts",
    quantity: 8,
    minQuantity: 5,
    unit: "units",
    location: "Van - Shelf A1",
    lastUpdated: new Date(),
  },
  {
    id: "inv-2",
    sku: "HVAC-FLT-002",
    name: "HVAC Air Filter 16x20",
    description: "Standard replacement air filter for smaller units",
    category: "parts",
    quantity: 2,
    minQuantity: 5,
    unit: "units",
    location: "Van - Shelf A1",
    lastUpdated: new Date(),
  },
  {
    id: "inv-3",
    sku: "ELEC-WIRE-001",
    name: "14 AWG Electrical Wire",
    description: "Standard electrical wire for connections",
    category: "consumables",
    quantity: 150,
    minQuantity: 100,
    unit: "feet",
    location: "Van - Shelf B2",
    lastUpdated: new Date(),
  },
  {
    id: "inv-4",
    sku: "TOOL-MULT-001",
    name: "Digital Multimeter",
    description: "Professional digital multimeter for electrical testing",
    category: "tools",
    quantity: 1,
    minQuantity: 1,
    unit: "units",
    location: "Van - Tool Box",
    lastUpdated: new Date(),
  },
  {
    id: "inv-5",
    sku: "HVAC-REF-001",
    name: "R-410A Refrigerant",
    description: "Replacement refrigerant for HVAC systems",
    category: "consumables",
    quantity: 0,
    minQuantity: 2,
    unit: "cans",
    location: "Van - Shelf C1",
    lastUpdated: new Date(),
    reorderRequested: true,
  },
  {
    id: "inv-6",
    sku: "HVAC-CAP-001",
    name: "Run Capacitor 45/5 MFD",
    description: "Dual run capacitor for AC units",
    category: "parts",
    quantity: 3,
    minQuantity: 4,
    unit: "units",
    location: "Van - Shelf A2",
    lastUpdated: new Date(),
  },
  {
    id: "inv-7",
    sku: "PLMB-TAPE-001",
    name: "Teflon Tape",
    description: "Thread seal tape for pipe fittings",
    category: "consumables",
    quantity: 12,
    minQuantity: 5,
    unit: "rolls",
    location: "Van - Drawer 1",
    lastUpdated: new Date(),
  },
  {
    id: "inv-8",
    sku: "EQUP-DRLL-001",
    name: "Cordless Drill Set",
    description: "Professional cordless drill with battery pack",
    category: "equipment",
    quantity: 1,
    minQuantity: 1,
    unit: "units",
    location: "Van - Tool Box",
    lastUpdated: new Date(),
  },
];

// Category configuration
const CATEGORY_CONFIG: Record<
  ItemCategory,
  { label: string; icon: typeof Package; colorClass: string; bgClass: string }
> = {
  parts: {
    label: "Parts",
    icon: Box,
    colorClass: "text-blue-600 dark:text-blue-400",
    bgClass: "bg-blue-500/10",
  },
  tools: {
    label: "Tools",
    icon: Wrench,
    colorClass: "text-purple-600 dark:text-purple-400",
    bgClass: "bg-purple-500/10",
  },
  consumables: {
    label: "Consumables",
    icon: Zap,
    colorClass: "text-green-600 dark:text-green-400",
    bgClass: "bg-green-500/10",
  },
  equipment: {
    label: "Equipment",
    icon: Package,
    colorClass: "text-orange-600 dark:text-orange-400",
    bgClass: "bg-orange-500/10",
  },
};

/**
 * Get stock status based on quantity and min quantity
 */
function getStockStatus(item: InventoryItem): StockStatus {
  if (item.quantity === 0) return "out_of_stock";
  if (item.quantity <= item.minQuantity) return "low_stock";
  return "in_stock";
}

/**
 * Stock status badge configuration
 */
const STOCK_STATUS_CONFIG: Record<
  StockStatus,
  { label: string; colorClass: string; bgClass: string }
> = {
  in_stock: {
    label: "In Stock",
    colorClass: "text-green-600 dark:text-green-400",
    bgClass: "bg-green-500/10",
  },
  low_stock: {
    label: "Low Stock",
    colorClass: "text-orange-600 dark:text-orange-400",
    bgClass: "bg-orange-500/10",
  },
  out_of_stock: {
    label: "Out of Stock",
    colorClass: "text-red-600 dark:text-red-400",
    bgClass: "bg-red-500/10",
  },
};

/**
 * Inventory Item Card Component
 */
function InventoryItemCard({
  item,
  onUpdateQuantity,
  onRequestReorder,
}: {
  item: InventoryItem;
  onUpdateQuantity: (itemId: string, delta: number) => void;
  onRequestReorder: (itemId: string) => void;
}) {
  const stockStatus = getStockStatus(item);
  const stockConfig = STOCK_STATUS_CONFIG[stockStatus];
  const categoryConfig = CATEGORY_CONFIG[item.category];
  const CategoryIcon = categoryConfig.icon;

  return (
    <Card
      className={cn(
        "transition-all duration-200",
        stockStatus === "out_of_stock" && "border-red-200 dark:border-red-800",
        stockStatus === "low_stock" && "border-orange-200 dark:border-orange-800"
      )}
      data-testid={`inventory-item-${item.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge
                variant="outline"
                className={cn(categoryConfig.bgClass, categoryConfig.colorClass, "border-0")}
              >
                <CategoryIcon className="w-3 h-3 mr-1" />
                {categoryConfig.label}
              </Badge>
              <Badge
                variant="outline"
                className={cn(stockConfig.bgClass, stockConfig.colorClass, "border-0")}
              >
                {stockStatus === "out_of_stock" && <AlertCircle className="w-3 h-3 mr-1" />}
                {stockStatus === "low_stock" && <AlertTriangle className="w-3 h-3 mr-1" />}
                {stockConfig.label}
              </Badge>
            </div>
            <p className="font-mono text-xs text-muted-foreground">{item.sku}</p>
          </div>
        </div>

        <h3 className="font-semibold mb-1">{item.name}</h3>
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{item.description}</p>

        {/* Quantity display and controls */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg mb-3">
          <div>
            <p className="text-sm text-muted-foreground">Quantity</p>
            <p className="text-2xl font-bold">
              {item.quantity} <span className="text-sm font-normal text-muted-foreground">{item.unit}</span>
            </p>
            <p className="text-xs text-muted-foreground">Min: {item.minQuantity}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="outline"
              className="h-10 w-10"
              onClick={() => onUpdateQuantity(item.id, -1)}
              disabled={item.quantity === 0}
            >
              <Minus className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              className="h-10 w-10"
              onClick={() => onUpdateQuantity(item.id, 1)}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Location */}
        <p className="text-xs text-muted-foreground mb-3">
          📍 {item.location}
        </p>

        {/* Reorder button for low/out of stock items */}
        {(stockStatus === "low_stock" || stockStatus === "out_of_stock") && (
          <Button
            size="sm"
            variant={item.reorderRequested ? "outline" : "default"}
            className="w-full"
            disabled={item.reorderRequested}
            onClick={() => onRequestReorder(item.id)}
          >
            {item.reorderRequested ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Reorder Requested
              </>
            ) : (
              <>
                <ShoppingCart className="w-4 h-4 mr-2" />
                Request Reorder
              </>
            )}
          </Button>
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
  activeFilter: ItemCategory | "all" | "low_stock";
  onFilterChange: (filter: ItemCategory | "all" | "low_stock") => void;
}) {
  const filters: Array<{ value: ItemCategory | "all" | "low_stock"; label: string }> = [
    { value: "all", label: "All" },
    { value: "low_stock", label: "Low Stock" },
    { value: "parts", label: "Parts" },
    { value: "tools", label: "Tools" },
    { value: "consumables", label: "Consumables" },
    { value: "equipment", label: "Equipment" },
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

function InventoryPage() {
  const [isLoading, setIsLoading] = React.useState(false);
  const [inventory, setInventory] = React.useState<InventoryItem[]>(SAMPLE_INVENTORY);
  const [categoryFilter, setCategoryFilter] = React.useState<ItemCategory | "all" | "low_stock">("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filter inventory
  const filteredInventory = React.useMemo(() => {
    let filtered = [...inventory];

    // Category/status filter
    if (categoryFilter === "low_stock") {
      filtered = filtered.filter(
        (item) => getStockStatus(item) === "low_stock" || getStockStatus(item) === "out_of_stock"
      );
    } else if (categoryFilter !== "all") {
      filtered = filtered.filter((item) => item.category === categoryFilter);
    }

    // Search filter
    if (debouncedSearch) {
      const search = debouncedSearch.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(search) ||
          item.sku.toLowerCase().includes(search) ||
          item.description.toLowerCase().includes(search)
      );
    }

    // Sort: out of stock first, then low stock, then by name
    filtered.sort((a, b) => {
      const statusOrder = { out_of_stock: 0, low_stock: 1, in_stock: 2 };
      const statusA = statusOrder[getStockStatus(a)];
      const statusB = statusOrder[getStockStatus(b)];
      if (statusA !== statusB) return statusA - statusB;
      return a.name.localeCompare(b.name);
    });

    return filtered;
  }, [inventory, categoryFilter, debouncedSearch]);

  // Calculate stats
  const stats = React.useMemo(() => {
    const lowStock = inventory.filter((item) => getStockStatus(item) === "low_stock").length;
    const outOfStock = inventory.filter((item) => getStockStatus(item) === "out_of_stock").length;
    const reorderRequested = inventory.filter((item) => item.reorderRequested).length;

    return {
      total: inventory.length,
      lowStock,
      outOfStock,
      reorderRequested,
      needsAttention: lowStock + outOfStock,
    };
  }, [inventory]);

  // Update quantity handler
  const handleUpdateQuantity = (itemId: string, delta: number) => {
    setInventory((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, quantity: Math.max(0, item.quantity + delta), lastUpdated: new Date() }
          : item
      )
    );
  };

  // Request reorder handler
  const handleRequestReorder = (itemId: string) => {
    setInventory((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, reorderRequested: true } : item
      )
    );
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1000);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background" data-testid="inventory-page">
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
              <h1 className="text-lg font-semibold">Inventory</h1>
              <p className="text-xs text-muted-foreground">
                {filteredInventory.length} {filteredInventory.length === 1 ? "item" : "items"}
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
            <p className="text-lg font-semibold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total Items</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-orange-600">{stats.lowStock}</p>
            <p className="text-xs text-muted-foreground">Low Stock</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-red-600">{stats.outOfStock}</p>
            <p className="text-xs text-muted-foreground">Out of Stock</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-blue-600">{stats.reorderRequested}</p>
            <p className="text-xs text-muted-foreground">On Order</p>
          </div>
        </div>
      </div>

      {/* Low Stock Alert */}
      {stats.needsAttention > 0 && (
        <div className="px-4 py-3 bg-orange-50 dark:bg-orange-950/30 border-b">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                {stats.needsAttention} item{stats.needsAttention > 1 ? "s" : ""} need attention
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-orange-300 text-orange-700"
              onClick={() => setCategoryFilter("low_stock")}
            >
              View
            </Button>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="px-4 py-3 border-b space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search inventory..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <FilterTabs activeFilter={categoryFilter} onFilterChange={setCategoryFilter} />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading inventory...</p>
          </div>
        ) : filteredInventory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="p-4 rounded-full bg-muted mb-4">
              <Package className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold mb-2">No items found</h2>
            <p className="text-sm text-muted-foreground">
              {debouncedSearch
                ? "No items match your search"
                : categoryFilter === "low_stock"
                ? "All items are well-stocked"
                : "No inventory items in this category"}
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {filteredInventory.map((item) => (
              <InventoryItemCard
                key={item.id}
                item={item}
                onUpdateQuantity={handleUpdateQuantity}
                onRequestReorder={handleRequestReorder}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
