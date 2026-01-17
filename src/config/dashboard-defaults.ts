/**
 * Dashboard Default Configurations
 *
 * This module defines the default dashboard layouts, widgets, and data sources
 * for each user role (MD, Field Tech, Admin, Sales).
 *
 * Each role has:
 * - A default set of widgets appropriate for their responsibilities
 * - Widget positions and sizes optimized for their workflow
 * - Specific data source configurations
 * - Allowed widgets they can add to their dashboard
 */

import type { WidgetInstance, WidgetSize } from "~/components/widgets/types";
import type { UserRole } from "~/db/schema";
import type {
  LayoutConfig,
  DataSourceMapping,
  CreateDashboardConfigInput,
} from "~/data-access/dashboard-config";

// ============================================
// Layout Configurations
// ============================================

/**
 * Default layout configuration for all dashboards
 */
export const defaultLayoutConfig: LayoutConfig = {
  columns: {
    sm: 1,
    md: 2,
    lg: 4,
    xl: 4,
  },
  gap: 6,
  maxWidth: "1400px",
};

/**
 * Compact layout for mobile-focused roles
 */
export const compactLayoutConfig: LayoutConfig = {
  columns: {
    sm: 1,
    md: 2,
    lg: 3,
    xl: 4,
  },
  gap: 4,
  maxWidth: "1200px",
};

// ============================================
// Widget ID Constants
// ============================================

export const WIDGET_IDS = {
  TASK_LIST: "task-list",
  APPROVAL_QUEUE: "approval-queue",
  FINANCIAL_SUMMARY: "financial-summary",
  ALERTS: "alerts",
  ALERT_FEED: "alert-feed",
  CHART: "chart",
  SYSTEM_HEALTH: "system-health",
  DOCUMENT_QUEUE: "document-queue",
  USER_STATS: "user-stats",
  WORKFLOW_MONITOR: "workflow-monitor",
  // Field Technician Widgets
  WORK_ORDER: "work-order",
  ROUTE_OPTIMIZATION: "route-optimization",
  INVENTORY_CHECK: "inventory-check",
  CUSTOMER_SITE_HISTORY: "customer-site-history",
  MOBILE_ACTIONS: "mobile-actions",
} as const;

// ============================================
// Role-Specific Allowed Widgets
// ============================================

/**
 * Widgets allowed for each role
 * If null, all widgets are allowed
 */
export const roleAllowedWidgets: Record<UserRole, string[] | null> = {
  // Managing Director - Full access to all widgets
  md: null,

  // Field Tech - Access to field-specific and operational widgets
  "field-tech": [
    WIDGET_IDS.TASK_LIST,
    WIDGET_IDS.ALERTS,
    WIDGET_IDS.ALERT_FEED,
    WIDGET_IDS.CHART,
    WIDGET_IDS.WORK_ORDER,
    WIDGET_IDS.ROUTE_OPTIMIZATION,
    WIDGET_IDS.INVENTORY_CHECK,
    WIDGET_IDS.CUSTOMER_SITE_HISTORY,
    WIDGET_IDS.MOBILE_ACTIONS,
  ],

  // Admin - Full access to all widgets
  admin: null,

  // Sales - Access to sales-related widgets
  sales: [
    WIDGET_IDS.TASK_LIST,
    WIDGET_IDS.FINANCIAL_SUMMARY,
    WIDGET_IDS.ALERTS,
    WIDGET_IDS.ALERT_FEED,
    WIDGET_IDS.CHART,
  ],
};

// ============================================
// Helper Functions
// ============================================

/**
 * Generate a unique widget instance ID
 */
function generateInstanceId(widgetId: string, suffix: string): string {
  return `${widgetId}-${suffix}-default`;
}

/**
 * Create a widget instance with default configuration
 */
function createWidgetInstance(
  widgetId: string,
  size: WidgetSize,
  position: { row: number; col: number },
  config: Record<string, unknown>,
  suffix: string
): WidgetInstance {
  return {
    instanceId: generateInstanceId(widgetId, suffix),
    widgetId,
    size,
    position,
    config,
    visible: true,
  };
}

// ============================================
// Managing Director (MD) Default Configuration
// ============================================

/**
 * MD role focuses on high-level oversight:
 * - Financial summaries
 * - Approval queues
 * - Key metrics and charts
 * - Alerts for critical issues
 */
export const mdDefaultWidgets: WidgetInstance[] = [
  // Financial Summary - Full width at top for executive overview
  createWidgetInstance(
    WIDGET_IDS.FINANCIAL_SUMMARY,
    "large",
    { row: 0, col: 0 },
    {
      showTrends: true,
      currency: "USD",
      period: "monthly",
      compactMode: false,
    },
    "md"
  ),
  // Alerts - Important notifications
  createWidgetInstance(
    WIDGET_IDS.ALERTS,
    "medium",
    { row: 0, col: 3 },
    {
      maxItems: 5,
      showReadAlerts: false,
      filterBySeverity: "high",
      groupBySource: true,
    },
    "md"
  ),
  // Approval Queue - Pending approvals
  createWidgetInstance(
    WIDGET_IDS.APPROVAL_QUEUE,
    "medium",
    { row: 1, col: 0 },
    {
      maxItems: 5,
      showCompleted: false,
      filterByType: null,
      sortBy: "deadline",
    },
    "md"
  ),
  // Chart - Revenue/Performance visualization
  createWidgetInstance(
    WIDGET_IDS.CHART,
    "medium",
    { row: 1, col: 2 },
    {
      chartType: "line",
      showLegend: true,
      showValues: true,
      colorScheme: "default",
      animated: true,
    },
    "md"
  ),
];

export const mdDataSources: Record<string, DataSourceMapping> = {
  [`${WIDGET_IDS.FINANCIAL_SUMMARY}-md-default`]: {
    sourceType: "query",
    sourceId: "company-financials",
    refreshInterval: 300000, // 5 minutes
  },
  [`${WIDGET_IDS.APPROVAL_QUEUE}-md-default`]: {
    sourceType: "query",
    sourceId: "pending-approvals",
    refreshInterval: 60000, // 1 minute
  },
  [`${WIDGET_IDS.ALERTS}-md-default`]: {
    sourceType: "realtime",
    sourceId: "system-alerts",
    filters: { severity: ["high", "critical"] },
  },
  [`${WIDGET_IDS.CHART}-md-default`]: {
    sourceType: "query",
    sourceId: "revenue-metrics",
    refreshInterval: 300000,
  },
};

// ============================================
// Field Tech Default Configuration
// ============================================

/**
 * Field Tech role focuses on field operations:
 * - Work orders with assignments and scheduling
 * - Route optimization for daily jobs
 * - Inventory checks for parts and materials
 * - Customer site history
 * - Mobile-friendly quick actions
 */
export const fieldTechDefaultWidgets: WidgetInstance[] = [
  // Work Orders - Primary widget for assigned jobs
  createWidgetInstance(
    WIDGET_IDS.WORK_ORDER,
    "large",
    { row: 0, col: 0 },
    {
      showCompleted: false,
      maxItems: 5,
      sortBy: "scheduledTime",
      filterByStatus: null,
    },
    "field-tech"
  ),
  // Mobile Actions - Quick access to common actions
  createWidgetInstance(
    WIDGET_IDS.MOBILE_ACTIONS,
    "medium",
    { row: 0, col: 3 },
    {
      showTimeTracking: true,
      showQuickCall: true,
      compactMode: false,
    },
    "field-tech"
  ),
  // Route Optimization - Todays route planner
  createWidgetInstance(
    WIDGET_IDS.ROUTE_OPTIMIZATION,
    "medium",
    { row: 1, col: 0 },
    {
      showCompletedStops: true,
      showDistances: true,
      autoRefresh: true,
    },
    "field-tech"
  ),
  // Inventory Check - Parts and materials status
  createWidgetInstance(
    WIDGET_IDS.INVENTORY_CHECK,
    "medium",
    { row: 1, col: 2 },
    {
      showLowStockOnly: false,
      maxItems: 6,
      sortBy: "status",
      groupByCategory: false,
    },
    "field-tech"
  ),
  // Customer Site History - Previous service records
  createWidgetInstance(
    WIDGET_IDS.CUSTOMER_SITE_HISTORY,
    "medium",
    { row: 2, col: 0 },
    {
      maxHistoryItems: 5,
      showCosts: true,
      defaultView: "sites",
    },
    "field-tech"
  ),
  // Alerts - Service alerts and notifications
  createWidgetInstance(
    WIDGET_IDS.ALERTS,
    "medium",
    { row: 2, col: 2 },
    {
      maxItems: 5,
      showReadAlerts: false,
      filterBySeverity: null,
      groupBySource: false,
    },
    "field-tech"
  ),
];

export const fieldTechDataSources: Record<string, DataSourceMapping> = {
  [`${WIDGET_IDS.WORK_ORDER}-field-tech-default`]: {
    sourceType: "query",
    sourceId: "assigned-work-orders",
    refreshInterval: 30000, // 30 seconds
    filters: { assignedToCurrentUser: true },
  },
  [`${WIDGET_IDS.MOBILE_ACTIONS}-field-tech-default`]: {
    sourceType: "query",
    sourceId: "current-work-order",
    refreshInterval: 30000,
  },
  [`${WIDGET_IDS.ROUTE_OPTIMIZATION}-field-tech-default`]: {
    sourceType: "query",
    sourceId: "daily-route",
    refreshInterval: 60000,
  },
  [`${WIDGET_IDS.INVENTORY_CHECK}-field-tech-default`]: {
    sourceType: "query",
    sourceId: "van-inventory",
    refreshInterval: 120000,
  },
  [`${WIDGET_IDS.CUSTOMER_SITE_HISTORY}-field-tech-default`]: {
    sourceType: "query",
    sourceId: "customer-sites",
    refreshInterval: 300000,
  },
  [`${WIDGET_IDS.ALERTS}-field-tech-default`]: {
    sourceType: "realtime",
    sourceId: "service-alerts",
  },
};

// ============================================
// Admin Default Configuration
// ============================================

/**
 * Admin role focuses on system management:
 * - System health monitoring
 * - All approval queues
 * - Document processing queue
 * - User management
 * - Workflow monitoring
 * - System alerts
 */
export const adminDefaultWidgets: WidgetInstance[] = [
  // System Health - Top priority for admins
  createWidgetInstance(
    WIDGET_IDS.SYSTEM_HEALTH,
    "medium",
    { row: 0, col: 0 },
    {
      showUptime: true,
      showConnections: true,
      compactMode: false,
      warningThreshold: 60,
      criticalThreshold: 80,
    },
    "admin"
  ),
  // Approval Queue - All pending approvals
  createWidgetInstance(
    WIDGET_IDS.APPROVAL_QUEUE,
    "medium",
    { row: 0, col: 2 },
    {
      maxItems: 10,
      showCompleted: false,
      filterByType: null,
      sortBy: "deadline",
    },
    "admin"
  ),
  // Document Queue - Processing status
  createWidgetInstance(
    WIDGET_IDS.DOCUMENT_QUEUE,
    "medium",
    { row: 1, col: 0 },
    {
      maxItems: 5,
      showCompletedItems: false,
      showProgress: true,
      autoRefresh: true,
    },
    "admin"
  ),
  // User Stats - User management overview
  createWidgetInstance(
    WIDGET_IDS.USER_STATS,
    "medium",
    { row: 1, col: 2 },
    {
      showRoleBreakdown: true,
      showTrends: true,
      showNewUsers: true,
      period: "week",
    },
    "admin"
  ),
  // Workflow Monitor - Active workflows
  createWidgetInstance(
    WIDGET_IDS.WORKFLOW_MONITOR,
    "medium",
    { row: 2, col: 0 },
    {
      maxItems: 5,
      showCompletedWorkflows: false,
      showProgress: true,
      showStats: true,
    },
    "admin"
  ),
  // Alerts - System-wide alerts
  createWidgetInstance(
    WIDGET_IDS.ALERTS,
    "medium",
    { row: 2, col: 2 },
    {
      maxItems: 8,
      showReadAlerts: true,
      filterBySeverity: null,
      groupBySource: true,
    },
    "admin"
  ),
];

export const adminDataSources: Record<string, DataSourceMapping> = {
  [`${WIDGET_IDS.SYSTEM_HEALTH}-admin-default`]: {
    sourceType: "realtime",
    sourceId: "system-health-metrics",
    refreshInterval: 10000,
  },
  [`${WIDGET_IDS.APPROVAL_QUEUE}-admin-default`]: {
    sourceType: "query",
    sourceId: "all-pending-approvals",
    refreshInterval: 60000,
  },
  [`${WIDGET_IDS.DOCUMENT_QUEUE}-admin-default`]: {
    sourceType: "query",
    sourceId: "document-processing-queue",
    refreshInterval: 10000,
  },
  [`${WIDGET_IDS.USER_STATS}-admin-default`]: {
    sourceType: "query",
    sourceId: "user-statistics",
    refreshInterval: 60000,
  },
  [`${WIDGET_IDS.WORKFLOW_MONITOR}-admin-default`]: {
    sourceType: "realtime",
    sourceId: "active-workflows",
    refreshInterval: 15000,
  },
  [`${WIDGET_IDS.ALERTS}-admin-default`]: {
    sourceType: "realtime",
    sourceId: "system-alerts",
  },
};

// ============================================
// Sales Default Configuration
// ============================================

/**
 * Sales role focuses on revenue and customer metrics:
 * - Sales pipeline chart
 * - Financial summary
 * - Task list for follow-ups
 * - Alerts for opportunities
 */
export const salesDefaultWidgets: WidgetInstance[] = [
  // Chart - Sales pipeline
  createWidgetInstance(
    WIDGET_IDS.CHART,
    "large",
    { row: 0, col: 0 },
    {
      chartType: "bar",
      showLegend: true,
      showValues: true,
      colorScheme: "default",
      animated: true,
    },
    "sales"
  ),
  // Alerts - Sales opportunities and notifications
  createWidgetInstance(
    WIDGET_IDS.ALERTS,
    "small",
    { row: 0, col: 3 },
    {
      maxItems: 5,
      showReadAlerts: false,
      filterBySeverity: null,
      groupBySource: false,
    },
    "sales"
  ),
  // Task List - Follow-ups and sales tasks
  createWidgetInstance(
    WIDGET_IDS.TASK_LIST,
    "medium",
    { row: 1, col: 0 },
    {
      showCompleted: false,
      maxItems: 8,
      groupByPriority: true,
      sortBy: "dueDate",
    },
    "sales"
  ),
  // Financial Summary - Revenue metrics
  createWidgetInstance(
    WIDGET_IDS.FINANCIAL_SUMMARY,
    "medium",
    { row: 1, col: 2 },
    {
      showTrends: true,
      currency: "USD",
      period: "monthly",
      compactMode: false,
    },
    "sales"
  ),
];

export const salesDataSources: Record<string, DataSourceMapping> = {
  [`${WIDGET_IDS.CHART}-sales-default`]: {
    sourceType: "query",
    sourceId: "sales-pipeline",
    refreshInterval: 300000,
  },
  [`${WIDGET_IDS.ALERTS}-sales-default`]: {
    sourceType: "realtime",
    sourceId: "sales-opportunities",
  },
  [`${WIDGET_IDS.TASK_LIST}-sales-default`]: {
    sourceType: "query",
    sourceId: "sales-tasks",
    refreshInterval: 60000,
  },
  [`${WIDGET_IDS.FINANCIAL_SUMMARY}-sales-default`]: {
    sourceType: "query",
    sourceId: "sales-revenue",
    refreshInterval: 300000,
  },
};

// ============================================
// Role Configuration Map
// ============================================

/**
 * Complete configuration for each role
 */
export interface RoleDashboardDefaults {
  name: string;
  description: string;
  widgets: WidgetInstance[];
  layoutConfig: LayoutConfig;
  dataSources: Record<string, DataSourceMapping>;
  allowedWidgets: string[] | null;
}

export const roleDashboardDefaults: Record<UserRole, RoleDashboardDefaults> = {
  md: {
    name: "Executive Dashboard",
    description: "High-level overview for Managing Directors with financial metrics and approvals",
    widgets: mdDefaultWidgets,
    layoutConfig: defaultLayoutConfig,
    dataSources: mdDataSources,
    allowedWidgets: roleAllowedWidgets.md,
  },
  "field-tech": {
    name: "Field Technician Dashboard",
    description: "Mobile-optimized dashboard with work orders, route planning, inventory checks, and customer history",
    widgets: fieldTechDefaultWidgets,
    layoutConfig: compactLayoutConfig,
    dataSources: fieldTechDataSources,
    allowedWidgets: roleAllowedWidgets["field-tech"],
  },
  admin: {
    name: "Administration Dashboard",
    description: "Full system overview for Administrators with all management tools",
    widgets: adminDefaultWidgets,
    layoutConfig: defaultLayoutConfig,
    dataSources: adminDataSources,
    allowedWidgets: roleAllowedWidgets.admin,
  },
  sales: {
    name: "Sales Dashboard",
    description: "Revenue-focused dashboard for Sales team with pipeline and metrics",
    widgets: salesDefaultWidgets,
    layoutConfig: defaultLayoutConfig,
    dataSources: salesDataSources,
    allowedWidgets: roleAllowedWidgets.sales,
  },
};

/**
 * Get the default dashboard configuration input for a role
 */
export function getRoleDefaultConfigInput(role: UserRole): CreateDashboardConfigInput {
  const defaults = roleDashboardDefaults[role];
  return {
    role,
    name: defaults.name,
    description: defaults.description,
    widgets: defaults.widgets,
    layoutConfig: defaults.layoutConfig,
    dataSources: defaults.dataSources,
    allowedWidgets: defaults.allowedWidgets ?? undefined,
    isDefault: true,
  };
}

/**
 * Get default widgets for a role (without creating a database entry)
 */
export function getDefaultWidgetsForRole(role: UserRole): WidgetInstance[] {
  return roleDashboardDefaults[role].widgets;
}

/**
 * Get allowed widgets for a role
 */
export function getAllowedWidgetsForRole(role: UserRole): string[] | null {
  return roleDashboardDefaults[role].allowedWidgets;
}

/**
 * Check if a widget is allowed for a role
 */
export function isWidgetAllowedForRole(role: UserRole, widgetId: string): boolean {
  const allowed = getAllowedWidgetsForRole(role);
  if (allowed === null) return true;
  return allowed.includes(widgetId);
}

/**
 * Generic default widgets for users without a role
 */
export const genericDefaultWidgets: WidgetInstance[] = [
  createWidgetInstance(
    WIDGET_IDS.TASK_LIST,
    "medium",
    { row: 0, col: 0 },
    {
      showCompleted: false,
      maxItems: 5,
      groupByPriority: false,
      sortBy: "dueDate",
    },
    "generic"
  ),
  createWidgetInstance(
    WIDGET_IDS.ALERTS,
    "medium",
    { row: 0, col: 2 },
    {
      maxItems: 5,
      showReadAlerts: true,
      filterBySeverity: null,
      groupBySource: false,
    },
    "generic"
  ),
  createWidgetInstance(
    WIDGET_IDS.CHART,
    "medium",
    { row: 1, col: 0 },
    {
      chartType: "bar",
      showLegend: true,
      showValues: true,
      colorScheme: "default",
      animated: true,
    },
    "generic"
  ),
];
