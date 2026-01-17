import * as React from "react";

/**
 * Widget Size - Controls the grid span of widgets
 */
export type WidgetSize = "small" | "medium" | "large" | "full";

/**
 * Widget Category - Logical grouping for widgets
 */
export type WidgetCategory =
  | "productivity"
  | "finance"
  | "communication"
  | "analytics"
  | "system";

/**
 * Widget Data Requirement - Defines what data a widget needs
 */
export interface WidgetDataRequirement {
  /** Unique key for the data source */
  key: string;
  /** Human-readable label for the data requirement */
  label: string;
  /** Description of what this data is used for */
  description?: string;
  /** Whether this data is required for the widget to function */
  required: boolean;
  /** The type of data expected */
  type: "query" | "static" | "computed" | "realtime";
}

/**
 * Widget Configuration Schema - Defines configurable options for a widget
 */
export interface WidgetConfigOption {
  /** Unique key for the config option */
  key: string;
  /** Human-readable label */
  label: string;
  /** Description of what this option does */
  description?: string;
  /** Type of the configuration value */
  type: "string" | "number" | "boolean" | "select" | "color";
  /** Default value for this option */
  defaultValue: unknown;
  /** Available options for 'select' type */
  options?: { label: string; value: string | number }[];
  /** Validation constraints */
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    required?: boolean;
  };
}

/**
 * Widget Configuration - Runtime configuration for a widget instance
 */
export interface WidgetConfig {
  [key: string]: unknown;
}

/**
 * Widget Definition - Complete definition of a reusable widget
 */
export interface WidgetDefinition<TData = unknown, TConfig = WidgetConfig> {
  /** Unique identifier for the widget type */
  id: string;
  /** Display name of the widget */
  name: string;
  /** Detailed description of the widget's purpose */
  description: string;
  /** Category for logical grouping */
  category: WidgetCategory;
  /** Default size of the widget */
  defaultSize: WidgetSize;
  /** Supported sizes for this widget */
  supportedSizes: WidgetSize[];
  /** Icon component or icon name for the widget */
  icon: React.ComponentType<{ className?: string }>;
  /** Data requirements for the widget */
  dataRequirements: WidgetDataRequirement[];
  /** Configuration options schema */
  configOptions: WidgetConfigOption[];
  /** The React component that renders the widget */
  component: React.ComponentType<WidgetProps<TData, TConfig>>;
  /** Default configuration values */
  defaultConfig: TConfig;
  /** Whether the widget supports refresh */
  supportsRefresh?: boolean;
  /** Minimum refresh interval in milliseconds */
  minRefreshInterval?: number;
}

/**
 * Widget Instance - A configured instance of a widget for a user's dashboard
 */
export interface WidgetInstance {
  /** Unique instance ID */
  instanceId: string;
  /** Reference to the widget definition ID */
  widgetId: string;
  /** Current size of the widget */
  size: WidgetSize;
  /** Position in the grid (row, column) */
  position: { row: number; col: number };
  /** Instance-specific configuration */
  config: WidgetConfig;
  /** Whether the widget is visible */
  visible: boolean;
  /** Custom title override */
  title?: string;
}

/**
 * Widget Props - Props passed to widget components
 */
export interface WidgetProps<TData = unknown, TConfig = WidgetConfig> {
  /** The widget instance configuration */
  instance: WidgetInstance;
  /** The widget definition */
  definition: WidgetDefinition<TData, TConfig>;
  /** Data fetched for the widget */
  data?: TData;
  /** Whether data is currently loading */
  isLoading?: boolean;
  /** Error message if data fetch failed */
  error?: string | null;
  /** Callback to refresh widget data */
  onRefresh?: () => void;
  /** Callback to update widget configuration */
  onConfigChange?: (config: Partial<TConfig>) => void;
  /** The current size of the widget */
  size: WidgetSize;
}

/**
 * Widget Registry - Central registry for all available widgets
 */
export interface WidgetRegistry {
  /** All registered widget definitions */
  widgets: Map<string, WidgetDefinition>;
  /** Register a new widget definition */
  register: (widget: WidgetDefinition) => void;
  /** Unregister a widget definition */
  unregister: (widgetId: string) => void;
  /** Get a widget definition by ID */
  get: (widgetId: string) => WidgetDefinition | undefined;
  /** Get all widget definitions */
  getAll: () => WidgetDefinition[];
  /** Get widgets by category */
  getByCategory: (category: WidgetCategory) => WidgetDefinition[];
  /** Check if a widget is registered */
  has: (widgetId: string) => boolean;
}

/**
 * Widget Container Props - Props for the widget container component
 */
export interface WidgetContainerProps {
  /** Widget instance to render */
  instance: WidgetInstance;
  /** Whether the widget is in edit mode */
  isEditing?: boolean;
  /** Callback when widget is removed */
  onRemove?: (instanceId: string) => void;
  /** Callback when widget size changes */
  onSizeChange?: (instanceId: string, size: WidgetSize) => void;
  /** Callback when widget configuration changes */
  onConfigChange?: (instanceId: string, config: WidgetConfig) => void;
  /** Custom class name */
  className?: string;
}

/**
 * Widget Grid Props - Props for the widget grid layout component
 */
export interface WidgetGridProps {
  /** Array of widget instances to display */
  instances: WidgetInstance[];
  /** Whether the grid is in edit mode */
  isEditing?: boolean;
  /** Callback when instances order changes */
  onReorder?: (instances: WidgetInstance[]) => void;
  /** Callback when a widget is removed */
  onRemove?: (instanceId: string) => void;
  /** Callback when a widget's configuration changes */
  onConfigChange?: (instanceId: string, config: WidgetConfig) => void;
  /** Custom class name */
  className?: string;
}

/**
 * Use Widgets Hook Result
 */
export interface UseWidgetsResult {
  /** All registered widget definitions */
  availableWidgets: WidgetDefinition[];
  /** Current user's widget instances */
  instances: WidgetInstance[];
  /** Add a new widget instance */
  addWidget: (widgetId: string, config?: WidgetConfig) => WidgetInstance;
  /** Remove a widget instance */
  removeWidget: (instanceId: string) => void;
  /** Update widget instance configuration */
  updateConfig: (instanceId: string, config: Partial<WidgetConfig>) => void;
  /** Update widget instance size */
  updateSize: (instanceId: string, size: WidgetSize) => void;
  /** Reorder widget instances */
  reorderWidgets: (instances: WidgetInstance[]) => void;
  /** Reset to default widget layout */
  resetToDefault: () => void;
  /** Whether changes are being saved */
  isSaving: boolean;
}
