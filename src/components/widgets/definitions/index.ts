/**
 * Dashboard Widget Definitions
 *
 * This module exports all available widget definitions and registers them
 * with the global widget registry.
 */

import { registerWidget } from "../registry";

// Import widget definitions
import { TaskListWidgetDefinition } from "./TaskListWidget";
import { TaskWidgetDefinition } from "./TaskWidget";
import { ApprovalQueueWidgetDefinition } from "./ApprovalQueueWidget";
import { FinancialSummaryWidgetDefinition } from "./FinancialSummaryWidget";
import { AlertsWidgetDefinition } from "./AlertsWidget";
import { ChartWidgetDefinition } from "./ChartWidget";
import { SystemHealthWidgetDefinition } from "./SystemHealthWidget";
import { DocumentQueueWidgetDefinition } from "./DocumentQueueWidget";
import { UserStatsWidgetDefinition } from "./UserStatsWidget";
import { WorkflowMonitorWidgetDefinition } from "./WorkflowMonitorWidget";
// Field Technician Dashboard Widgets
import { WorkOrderWidgetDefinition } from "./WorkOrderWidget";
import { RouteOptimizationWidgetDefinition } from "./RouteOptimizationWidget";
import { InventoryCheckWidgetDefinition } from "./InventoryCheckWidget";
import { CustomerSiteHistoryWidgetDefinition } from "./CustomerSiteHistoryWidget";
import { MobileActionsWidgetDefinition } from "./MobileActionsWidget";
// Daily Briefing Widget
import { DailyBriefingWidgetDefinition } from "./DailyBriefingWidget";
// Alert Feed Widget (enhanced alerts with priority and acknowledgment)
import { AlertFeedWidgetDefinition } from "./AlertFeedWidget";
// Cash Position Monitor Widget (cash flow tracking, runway prediction, alerts)
import { CashPositionMonitorWidgetDefinition } from "./CashPositionMonitorWidget";
// Team Capacity Monitor Widget (team workload, assignment balance, capacity constraints)
import { TeamCapacityMonitorWidgetDefinition } from "./TeamCapacityMonitorWidget";
// Communication Analytics Widget (response times, message volumes, communication patterns)
import { CommunicationAnalyticsWidgetDefinition } from "./CommunicationAnalyticsWidget";
// Reporting Dashboard Widgets
import { KpiWidgetDefinition } from "./KpiWidget";
import { ReportChartWidgetDefinition } from "./ReportChartWidget";

// Export individual widget definitions
export { TaskListWidgetDefinition } from "./TaskListWidget";
export { TaskWidgetDefinition, TaskWidget } from "./TaskWidget";
export { ApprovalQueueWidgetDefinition } from "./ApprovalQueueWidget";
export { FinancialSummaryWidgetDefinition } from "./FinancialSummaryWidget";
export { AlertsWidgetDefinition } from "./AlertsWidget";
export { ChartWidgetDefinition } from "./ChartWidget";
export { SystemHealthWidgetDefinition } from "./SystemHealthWidget";
export { DocumentQueueWidgetDefinition } from "./DocumentQueueWidget";
export { UserStatsWidgetDefinition } from "./UserStatsWidget";
export { WorkflowMonitorWidgetDefinition } from "./WorkflowMonitorWidget";
// Field Technician Dashboard Widgets
export { WorkOrderWidgetDefinition } from "./WorkOrderWidget";
export { RouteOptimizationWidgetDefinition } from "./RouteOptimizationWidget";
export { InventoryCheckWidgetDefinition } from "./InventoryCheckWidget";
export { CustomerSiteHistoryWidgetDefinition } from "./CustomerSiteHistoryWidget";
export { MobileActionsWidgetDefinition } from "./MobileActionsWidget";
// Daily Briefing Widget
export { DailyBriefingWidgetDefinition } from "./DailyBriefingWidget";
// Alert Feed Widget (enhanced alerts with priority and acknowledgment)
export { AlertFeedWidgetDefinition } from "./AlertFeedWidget";
// Cash Position Monitor Widget (cash flow tracking, runway prediction, alerts)
export { CashPositionMonitorWidgetDefinition } from "./CashPositionMonitorWidget";
// Team Capacity Monitor Widget (team workload, assignment balance, capacity constraints)
export { TeamCapacityMonitorWidgetDefinition } from "./TeamCapacityMonitorWidget";
// Communication Analytics Widget (response times, message volumes, communication patterns)
export { CommunicationAnalyticsWidgetDefinition } from "./CommunicationAnalyticsWidget";
// Reporting Dashboard Widgets
export { KpiWidgetDefinition } from "./KpiWidget";
export { ReportChartWidgetDefinition } from "./ReportChartWidget";

// Export data types from each widget
export type {
  TaskItem,
  TaskListData,
  TaskListConfig,
} from "./TaskListWidget";

// Task Widget Types (enhanced reusable task widget)
export type {
  TaskStatus,
  TaskPriority,
  TaskSortBy,
  SortDirection,
  TaskFilterStatus,
  TaskFilterPriority,
  TaskAssignee,
  TaskWidgetItem,
  TaskWidgetData,
  TaskWidgetConfig,
  TaskWidgetActions,
  TaskWidgetProps,
} from "./TaskWidget";

export type {
  ApprovalItem,
  ApprovalQueueData,
  ApprovalQueueConfig,
} from "./ApprovalQueueWidget";

export type {
  AgingBucket,
  AgingData,
  DrillDownItem,
  FinancialMetric,
  FinancialSummaryData,
  FinancialSummaryConfig,
} from "./FinancialSummaryWidget";

export type {
  AlertSeverity,
  AlertItem,
  AlertsData,
  AlertsConfig,
} from "./AlertsWidget";

export type {
  ChartDataPoint,
  ChartData,
  ChartConfig,
} from "./ChartWidget";

export type {
  SystemHealthData,
  SystemHealthConfig,
} from "./SystemHealthWidget";

export type {
  DocumentQueueItem,
  DocumentQueueData,
  DocumentQueueConfig,
} from "./DocumentQueueWidget";

export type {
  UserStatsData,
  UserStatsConfig,
} from "./UserStatsWidget";

export type {
  WorkflowItem,
  WorkflowMonitorData,
  WorkflowMonitorConfig,
} from "./WorkflowMonitorWidget";

// Field Technician Widget Types
export type {
  WorkOrderItem,
  WorkOrderData,
  WorkOrderConfig,
} from "./WorkOrderWidget";

export type {
  RouteStop,
  RouteOptimizationData,
  RouteOptimizationConfig,
} from "./RouteOptimizationWidget";

export type {
  InventoryItem,
  InventoryCheckData,
  InventoryCheckConfig,
} from "./InventoryCheckWidget";

export type {
  ServiceHistoryItem,
  CustomerSite,
  CustomerSiteHistoryData,
  CustomerSiteHistoryConfig,
} from "./CustomerSiteHistoryWidget";

export type {
  QuickAction,
  TimeEntry,
  MobileActionsData,
  MobileActionsConfig,
} from "./MobileActionsWidget";

// Daily Briefing Widget Types
export type {
  DailyBriefingWidgetData,
  DailyBriefingConfig,
} from "./DailyBriefingWidget";

// Alert Feed Widget Types
export type {
  AlertPriority,
  AlertFeedSeverity,
  AlertFeedItem,
  AlertFeedData,
  AlertFeedConfig,
} from "./AlertFeedWidget";

// Cash Position Monitor Widget Types
export type {
  CashAlertSeverity,
  CashPositionAlert,
  CashFlowEntry,
  BurnRateAnalysis,
  RunwayPrediction,
  LiquiditySuggestion,
  CashPositionSummary,
  CashPositionMonitorData,
  CashPositionMonitorConfig,
} from "./CashPositionMonitorWidget";

// Team Capacity Monitor Widget Types
export type {
  CapacityAlertSeverity as TeamCapacityAlertSeverity,
  MemberCapacityStatus,
  TeamMemberCapacity,
  TeamAssignmentSummary,
  TeamMemberWithCapacity,
  CapacityMonitorAlert,
  TeamCapacitySummary,
  WorkloadDistribution,
  CapacityTrendPoint,
  RebalancingSuggestion,
  TeamCapacityMonitorData,
  TeamCapacityMonitorConfig,
} from "./TeamCapacityMonitorWidget";

// Communication Analytics Widget Types
export type {
  ResponseTimeMetrics,
  MessageVolumeMetrics,
  ConversationMetrics,
  BottleneckInfo,
  CommunicationAnalyticsData,
  CommunicationAnalyticsConfig,
} from "./CommunicationAnalyticsWidget";

// KPI Widget Types
export type {
  KpiStatus,
  KpiTrend,
  KpiItem,
  KpiWidgetData,
  KpiWidgetConfig,
} from "./KpiWidget";

// Report Chart Widget Types
export type {
  ReportChartType,
  ChartSeries,
  ReportChartData,
  ReportChartConfig,
} from "./ReportChartWidget";

/**
 * All built-in widget definitions
 */
export const builtInWidgets = [
  TaskListWidgetDefinition,
  TaskWidgetDefinition,
  ApprovalQueueWidgetDefinition,
  FinancialSummaryWidgetDefinition,
  AlertsWidgetDefinition,
  ChartWidgetDefinition,
  SystemHealthWidgetDefinition,
  DocumentQueueWidgetDefinition,
  UserStatsWidgetDefinition,
  WorkflowMonitorWidgetDefinition,
  // Field Technician Dashboard Widgets
  WorkOrderWidgetDefinition,
  RouteOptimizationWidgetDefinition,
  InventoryCheckWidgetDefinition,
  CustomerSiteHistoryWidgetDefinition,
  MobileActionsWidgetDefinition,
  // Daily Briefing Widget
  DailyBriefingWidgetDefinition,
  // Alert Feed Widget (enhanced alerts with priority and acknowledgment)
  AlertFeedWidgetDefinition,
  // Cash Position Monitor Widget (cash flow tracking, runway prediction, alerts)
  CashPositionMonitorWidgetDefinition,
  // Team Capacity Monitor Widget (team workload, assignment balance, capacity constraints)
  TeamCapacityMonitorWidgetDefinition,
  // Communication Analytics Widget (response times, message volumes, communication patterns)
  CommunicationAnalyticsWidgetDefinition,
  // Reporting Dashboard Widgets
  KpiWidgetDefinition,
  ReportChartWidgetDefinition,
] as const;

/**
 * Register all built-in widgets with the registry
 */
export function registerBuiltInWidgets(): void {
  builtInWidgets.forEach((widget) => {
    // Use type assertion to handle the generic types
    registerWidget(widget as unknown as import("../types").WidgetDefinition);
  });
}

/**
 * Get widget IDs for all built-in widgets
 */
export const builtInWidgetIds = builtInWidgets.map((w) => w.id);
