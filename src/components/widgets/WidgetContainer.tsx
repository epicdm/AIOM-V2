import * as React from "react";
import {
  MoreVertical,
  RefreshCw,
  Maximize2,
  Minimize2,
  Settings,
  X,
  GripVertical,
} from "lucide-react";
import { cn } from "~/lib/utils";
import {
  Panel,
  PanelHeader,
  PanelTitle,
  PanelContent,
} from "~/components/ui/panel";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { getWidget } from "./registry";
import type {
  WidgetContainerProps,
  WidgetSize,
  WidgetProps,
  WidgetConfig,
} from "./types";

/**
 * Size class mapping for grid spans
 */
const sizeClasses: Record<WidgetSize, string> = {
  small: "col-span-1",
  medium: "col-span-1 md:col-span-2",
  large: "col-span-1 md:col-span-2 lg:col-span-3",
  full: "col-span-full",
};

/**
 * Widget Container Component
 *
 * Wraps a widget with common UI elements like header, refresh button,
 * size controls, and settings menu.
 */
export function WidgetContainer({
  instance,
  isEditing = false,
  onRemove,
  onSizeChange,
  onConfigChange,
  className,
}: WidgetContainerProps) {
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isExpanded, setIsExpanded] = React.useState(false);

  const definition = getWidget(instance.widgetId);

  if (!definition) {
    return (
      <Panel className={cn(sizeClasses[instance.size], className)}>
        <PanelHeader>
          <PanelTitle>Widget Not Found</PanelTitle>
        </PanelHeader>
        <PanelContent>
          <p className="text-muted-foreground">
            The widget "{instance.widgetId}" could not be found in the registry.
          </p>
        </PanelContent>
      </Panel>
    );
  }

  const IconComponent = definition.icon;
  const WidgetComponent = definition.component as React.ComponentType<
    WidgetProps<unknown, WidgetConfig>
  >;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate refresh - in a real implementation, this would trigger
    // a re-fetch of the widget's data
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  const handleSizeChange = (size: WidgetSize) => {
    if (onSizeChange && definition.supportedSizes.includes(size)) {
      onSizeChange(instance.instanceId, size);
    }
  };

  const handleRemove = () => {
    if (onRemove) {
      onRemove(instance.instanceId);
    }
  };

  const currentSize = isExpanded ? "full" : instance.size;

  return (
    <Panel
      className={cn(
        sizeClasses[currentSize],
        "relative transition-all duration-300",
        isEditing && "ring-2 ring-primary/20",
        className
      )}
    >
      {/* Drag Handle (visible in edit mode) */}
      {isEditing && (
        <div className="absolute left-0 top-0 bottom-0 w-6 flex items-center justify-center cursor-move opacity-50 hover:opacity-100 transition-opacity">
          <GripVertical className="w-4 h-4" />
        </div>
      )}

      {/* Header */}
      <PanelHeader className={cn(isEditing && "pl-8")}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconComponent className="w-5 h-5 text-primary" />
            <PanelTitle className="text-lg">
              {instance.title || definition.name}
            </PanelTitle>
          </div>

          <div className="flex items-center gap-1">
            {/* Refresh Button */}
            {definition.supportsRefresh && (
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className={cn(
                  "p-1.5 rounded-md hover:bg-muted transition-colors",
                  isRefreshing && "animate-spin"
                )}
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}

            {/* Expand/Collapse Button */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-md hover:bg-muted transition-colors"
              title={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>

            {/* Options Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="p-1.5 rounded-md hover:bg-muted transition-colors"
                  title="Options"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {/* Size Options */}
                {definition.supportedSizes.length > 1 && (
                  <>
                    <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground">
                      Size
                    </div>
                    {definition.supportedSizes.map((size) => (
                      <DropdownMenuItem
                        key={size}
                        onClick={() => handleSizeChange(size)}
                        className={cn(
                          instance.size === size && "bg-muted"
                        )}
                      >
                        {size.charAt(0).toUpperCase() + size.slice(1)}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                  </>
                )}

                {/* Settings */}
                {definition.configOptions.length > 0 && (
                  <DropdownMenuItem>
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                )}

                {/* Remove */}
                {onRemove && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleRemove}
                      className="text-destructive focus:text-destructive"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Remove Widget
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </PanelHeader>

      {/* Widget Content */}
      <PanelContent className={cn(isEditing && "pl-8")}>
        <WidgetComponent
          instance={instance}
          definition={definition}
          size={currentSize}
          isLoading={false}
          error={null}
          onRefresh={handleRefresh}
          onConfigChange={(config) =>
            onConfigChange?.(instance.instanceId, config as WidgetConfig)
          }
        />
      </PanelContent>
    </Panel>
  );
}
