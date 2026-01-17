/**
 * Dashboard Widget Registry Module
 *
 * This module provides a complete widget system for building customizable dashboards.
 *
 * Features:
 * - Type-safe widget definitions with data requirements and configuration schemas
 * - Registry pattern for managing available widgets
 * - Built-in widgets for common use cases (task list, approval queue, etc.)
 * - Container and grid components for layout
 * - Hook-based state management with localStorage persistence
 *
 * Usage:
 * ```tsx
 * import { WidgetGrid, useWidgets, registerBuiltInWidgets } from '~/components/widgets';
 *
 * // Register built-in widgets on app initialization
 * registerBuiltInWidgets();
 *
 * function Dashboard() {
 *   const { instances, addWidget, removeWidget } = useWidgets();
 *
 *   return (
 *     <WidgetGrid
 *       instances={instances}
 *       onRemove={removeWidget}
 *     />
 *   );
 * }
 * ```
 */

// Core types
export type {
  WidgetSize,
  WidgetCategory,
  WidgetDataRequirement,
  WidgetConfigOption,
  WidgetConfig,
  WidgetDefinition,
  WidgetInstance,
  WidgetProps,
  WidgetRegistry,
  WidgetContainerProps,
  WidgetGridProps,
  UseWidgetsResult,
} from "./types";

// Registry
export {
  widgetRegistry,
  registerWidget,
  getWidget,
  getAllWidgets,
  getWidgetsByCategory,
} from "./registry";

// Components
export { WidgetContainer } from "./WidgetContainer";
export { WidgetGrid, WidgetPicker } from "./WidgetGrid";

// Widget Definitions
export {
  builtInWidgets,
  builtInWidgetIds,
  registerBuiltInWidgets,
  // Individual widget definitions
  TaskListWidgetDefinition,
  ApprovalQueueWidgetDefinition,
  FinancialSummaryWidgetDefinition,
  AlertsWidgetDefinition,
  AlertFeedWidgetDefinition,
  ChartWidgetDefinition,
  CashPositionMonitorWidgetDefinition,
} from "./definitions";

// Widget data types
export type {
  TaskItem,
  TaskListData,
  TaskListConfig,
  ApprovalItem,
  ApprovalQueueData,
  ApprovalQueueConfig,
  FinancialMetric,
  FinancialSummaryData,
  FinancialSummaryConfig,
  AlertSeverity,
  AlertItem,
  AlertsData,
  AlertsConfig,
  AlertPriority,
  AlertFeedSeverity,
  AlertFeedItem,
  AlertFeedData,
  AlertFeedConfig,
  ChartDataPoint,
  ChartData,
  ChartConfig,
  // Cash Position Monitor Widget types
  CashAlertSeverity,
  CashPositionAlert,
  CashFlowEntry,
  BurnRateAnalysis,
  RunwayPrediction,
  LiquiditySuggestion,
  CashPositionSummary,
  CashPositionMonitorData,
  CashPositionMonitorConfig,
} from "./definitions";
