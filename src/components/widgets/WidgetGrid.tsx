import * as React from "react";
import { Plus, Lock } from "lucide-react";
import { cn } from "~/lib/utils";
import { WidgetContainer } from "./WidgetContainer";
import { getAllWidgets } from "./registry";
import type {
  WidgetGridProps,
  WidgetInstance,
  WidgetDefinition,
  WidgetConfig,
} from "./types";
import type { UserRole } from "~/db/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { isWidgetAllowedForRole } from "~/config/dashboard-defaults";

/**
 * Widget Picker Component
 *
 * A dialog for selecting widgets to add to the dashboard
 * Supports role-based filtering to show only allowed widgets
 */
interface WidgetPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (widgetId: string) => void;
  /** User role for filtering allowed widgets */
  userRole?: UserRole | null;
  /** Show restricted widgets (grayed out) */
  showRestricted?: boolean;
}

function WidgetPicker({
  open,
  onClose,
  onSelect,
  userRole,
  showRestricted = false,
}: WidgetPickerProps) {
  const widgets = getAllWidgets();

  // Group widgets by category
  const groupedWidgets = widgets.reduce(
    (acc, widget) => {
      const category = widget.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(widget);
      return acc;
    },
    {} as Record<string, WidgetDefinition[]>
  );

  const categoryLabels: Record<string, string> = {
    productivity: "Productivity",
    finance: "Finance",
    communication: "Communication",
    analytics: "Analytics",
    system: "System",
  };

  /**
   * Check if a widget is allowed for the current user role
   */
  const isAllowed = (widgetId: string): boolean => {
    if (!userRole) return true;
    return isWidgetAllowedForRole(userRole, widgetId);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Widget</DialogTitle>
          <DialogDescription>
            Choose a widget to add to your dashboard
            {userRole && (
              <span className="block mt-1 text-xs">
                Showing widgets available for{" "}
                <Badge variant="outline" className="ml-1">
                  {userRole}
                </Badge>
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {Object.entries(groupedWidgets).map(([category, categoryWidgets]) => {
            // Filter widgets based on role permissions
            const visibleWidgets = categoryWidgets.filter(
              (widget) => showRestricted || isAllowed(widget.id)
            );

            // Skip empty categories
            if (visibleWidgets.length === 0) return null;

            return (
              <div key={category}>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  {categoryLabels[category] || category}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {visibleWidgets.map((widget) => {
                    const IconComponent = widget.icon;
                    const allowed = isAllowed(widget.id);

                    return (
                      <button
                        key={widget.id}
                        onClick={() => {
                          if (allowed) {
                            onSelect(widget.id);
                            onClose();
                          }
                        }}
                        disabled={!allowed}
                        className={cn(
                          "flex items-start gap-3 p-4 rounded-lg text-left",
                          "border border-transparent",
                          "transition-colors",
                          allowed
                            ? "hover:border-primary/20 hover:bg-muted/50 cursor-pointer"
                            : "opacity-50 cursor-not-allowed bg-muted/30"
                        )}
                        data-testid={`widget-picker-item-${widget.id}`}
                      >
                        <div
                          className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                            allowed ? "bg-primary/10" : "bg-muted"
                          )}
                        >
                          {allowed ? (
                            <IconComponent className="w-5 h-5 text-primary" />
                          ) : (
                            <Lock className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p
                            className={cn(
                              "font-medium",
                              !allowed && "text-muted-foreground"
                            )}
                          >
                            {widget.name}
                            {!allowed && (
                              <Badge
                                variant="secondary"
                                className="ml-2 text-xs"
                              >
                                Restricted
                              </Badge>
                            )}
                          </p>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {widget.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Add Widget Button Component
 */
interface AddWidgetButtonProps {
  onClick: () => void;
}

function AddWidgetButton({ onClick }: AddWidgetButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "col-span-1 md:col-span-2 min-h-[200px]",
        "flex flex-col items-center justify-center gap-3",
        "border-2 border-dashed border-muted-foreground/20 rounded-xl",
        "hover:border-primary/50 hover:bg-muted/50",
        "transition-colors cursor-pointer"
      )}
    >
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
        <Plus className="w-6 h-6 text-primary" />
      </div>
      <span className="text-sm font-medium text-muted-foreground">
        Add Widget
      </span>
    </button>
  );
}

/**
 * Extended Widget Grid Props with role support
 */
interface WidgetGridPropsExtended extends WidgetGridProps {
  /** User role for filtering allowed widgets */
  userRole?: UserRole | null;
}

/**
 * Widget Grid Component
 *
 * A responsive grid layout for displaying dashboard widgets
 * Supports role-based widget filtering
 */
export function WidgetGrid({
  instances,
  isEditing = false,
  onReorder,
  onRemove,
  onConfigChange,
  className,
  userRole,
}: WidgetGridPropsExtended) {
  const [showPicker, setShowPicker] = React.useState(false);
  const [localInstances, setLocalInstances] =
    React.useState<WidgetInstance[]>(instances);

  // Update local instances when prop changes
  React.useEffect(() => {
    setLocalInstances(instances);
  }, [instances]);

  const handleAddWidget = (widgetId: string) => {
    // Check if widget is allowed for the user's role
    if (userRole && !isWidgetAllowedForRole(userRole, widgetId)) {
      console.warn(`Widget "${widgetId}" is not allowed for role "${userRole}"`);
      return;
    }

    const widget = getAllWidgets().find((w) => w.id === widgetId);
    if (!widget) return;

    const newInstance: WidgetInstance = {
      instanceId: `${widgetId}-${Date.now()}`,
      widgetId,
      size: widget.defaultSize,
      position: { row: 0, col: 0 },
      config: widget.defaultConfig as WidgetConfig,
      visible: true,
    };

    const updatedInstances = [...localInstances, newInstance];
    setLocalInstances(updatedInstances);
    onReorder?.(updatedInstances);
  };

  const handleSizeChange = (
    instanceId: string,
    size: WidgetInstance["size"]
  ) => {
    const updatedInstances = localInstances.map((inst) =>
      inst.instanceId === instanceId ? { ...inst, size } : inst
    );
    setLocalInstances(updatedInstances);
    onReorder?.(updatedInstances);
  };

  const handleRemove = (instanceId: string) => {
    const updatedInstances = localInstances.filter(
      (inst) => inst.instanceId !== instanceId
    );
    setLocalInstances(updatedInstances);
    onRemove?.(instanceId);
    onReorder?.(updatedInstances);
  };

  // Filter instances to only show widgets allowed for the user's role
  const visibleInstances = localInstances.filter((inst) => {
    if (!inst.visible) return false;
    if (userRole && !isWidgetAllowedForRole(userRole, inst.widgetId)) {
      return false;
    }
    return true;
  });

  return (
    <>
      <div
        className={cn(
          "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6",
          className
        )}
      >
        {visibleInstances.map((instance) => (
          <WidgetContainer
            key={instance.instanceId}
            instance={instance}
            isEditing={isEditing}
            onRemove={handleRemove}
            onSizeChange={handleSizeChange}
            onConfigChange={onConfigChange}
          />
        ))}

        {/* Add Widget Button */}
        {isEditing && <AddWidgetButton onClick={() => setShowPicker(true)} />}
      </div>

      {/* Widget Picker Dialog */}
      <WidgetPicker
        open={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={handleAddWidget}
        userRole={userRole}
      />
    </>
  );
}

/**
 * Export the WidgetPicker component for use in other places
 */
export { WidgetPicker };
export type { WidgetPickerProps };
