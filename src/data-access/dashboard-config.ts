import { eq, and, isNull, desc } from "drizzle-orm";
import { database } from "~/db";
import {
  dashboardConfig,
  type DashboardConfig,
  type CreateDashboardConfigData,
  type UpdateDashboardConfigData,
  type UserRole,
  USER_ROLES,
} from "~/db/schema";
import type { WidgetInstance } from "~/components/widgets/types";

// ============================================
// Types for Dashboard Configuration
// ============================================

/**
 * Layout configuration for the dashboard grid
 */
export interface LayoutConfig {
  columns: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  gap: number;
  maxWidth?: string;
}

/**
 * Data source mapping for widgets
 */
export interface DataSourceMapping {
  sourceType: "query" | "static" | "api" | "realtime";
  sourceId?: string;
  refreshInterval?: number; // in milliseconds
  filters?: Record<string, unknown>;
}

/**
 * Complete dashboard configuration with parsed JSON fields
 */
export interface ParsedDashboardConfig {
  id: string;
  userId: string | null;
  role: UserRole | null;
  name: string;
  description: string | null;
  widgets: WidgetInstance[];
  layoutConfig: LayoutConfig | null;
  dataSources: Record<string, DataSourceMapping> | null;
  allowedWidgets: string[] | null;
  isDefault: boolean;
  isCustomized: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Input for creating a new dashboard configuration
 */
export interface CreateDashboardConfigInput {
  userId?: string;
  role?: UserRole;
  name: string;
  description?: string;
  widgets: WidgetInstance[];
  layoutConfig?: LayoutConfig;
  dataSources?: Record<string, DataSourceMapping>;
  allowedWidgets?: string[];
  isDefault?: boolean;
  isCustomized?: boolean;
  displayOrder?: number;
}

/**
 * Input for updating dashboard configuration
 */
export interface UpdateDashboardConfigInput {
  name?: string;
  description?: string;
  widgets?: WidgetInstance[];
  layoutConfig?: LayoutConfig;
  dataSources?: Record<string, DataSourceMapping>;
  allowedWidgets?: string[];
  isDefault?: boolean;
  isCustomized?: boolean;
  displayOrder?: number;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Generate a unique ID for dashboard configuration
 */
function generateId(): string {
  return `dc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Parse a DashboardConfig from database to ParsedDashboardConfig
 */
function parseDashboardConfig(config: DashboardConfig): ParsedDashboardConfig {
  return {
    id: config.id,
    userId: config.userId,
    role: config.role as UserRole | null,
    name: config.name,
    description: config.description,
    widgets: config.widgets ? JSON.parse(config.widgets) : [],
    layoutConfig: config.layoutConfig ? JSON.parse(config.layoutConfig) : null,
    dataSources: config.dataSources ? JSON.parse(config.dataSources) : null,
    allowedWidgets: config.allowedWidgets ? JSON.parse(config.allowedWidgets) : null,
    isDefault: config.isDefault,
    isCustomized: config.isCustomized,
    displayOrder: config.displayOrder,
    createdAt: config.createdAt,
    updatedAt: config.updatedAt,
  };
}

/**
 * Validate that a role is a valid UserRole
 */
function isValidRole(role: string): role is UserRole {
  return USER_ROLES.includes(role as UserRole);
}

// ============================================
// CRUD Operations
// ============================================

/**
 * Create a new dashboard configuration
 */
export async function createDashboardConfig(
  input: CreateDashboardConfigInput
): Promise<ParsedDashboardConfig> {
  const id = generateId();

  const data: CreateDashboardConfigData = {
    id,
    userId: input.userId ?? null,
    role: input.role ?? null,
    name: input.name,
    description: input.description ?? null,
    widgets: JSON.stringify(input.widgets),
    layoutConfig: input.layoutConfig ? JSON.stringify(input.layoutConfig) : null,
    dataSources: input.dataSources ? JSON.stringify(input.dataSources) : null,
    allowedWidgets: input.allowedWidgets ? JSON.stringify(input.allowedWidgets) : null,
    isDefault: input.isDefault ?? false,
    isCustomized: input.isCustomized ?? false,
    displayOrder: input.displayOrder ?? 0,
  };

  const [result] = await database
    .insert(dashboardConfig)
    .values(data)
    .returning();

  return parseDashboardConfig(result);
}

/**
 * Get a dashboard configuration by ID
 */
export async function getDashboardConfigById(
  id: string
): Promise<ParsedDashboardConfig | null> {
  const [result] = await database
    .select()
    .from(dashboardConfig)
    .where(eq(dashboardConfig.id, id))
    .limit(1);

  return result ? parseDashboardConfig(result) : null;
}

/**
 * Get user's dashboard configuration
 * Returns user-specific config if exists, otherwise falls back to role default
 */
export async function getUserDashboardConfig(
  userId: string,
  role?: UserRole | null
): Promise<ParsedDashboardConfig | null> {
  // First, try to get user-specific configuration
  const [userConfig] = await database
    .select()
    .from(dashboardConfig)
    .where(eq(dashboardConfig.userId, userId))
    .orderBy(desc(dashboardConfig.updatedAt))
    .limit(1);

  if (userConfig) {
    return parseDashboardConfig(userConfig);
  }

  // If no user-specific config and role is provided, get role default
  if (role && isValidRole(role)) {
    return getRoleDefaultConfig(role);
  }

  return null;
}

/**
 * Get the default dashboard configuration for a role
 */
export async function getRoleDefaultConfig(
  role: UserRole
): Promise<ParsedDashboardConfig | null> {
  if (!isValidRole(role)) {
    return null;
  }

  const [result] = await database
    .select()
    .from(dashboardConfig)
    .where(
      and(
        eq(dashboardConfig.role, role),
        isNull(dashboardConfig.userId),
        eq(dashboardConfig.isDefault, true)
      )
    )
    .limit(1);

  return result ? parseDashboardConfig(result) : null;
}

/**
 * Get all dashboard configurations for a role (including non-default ones)
 */
export async function getRoleConfigs(
  role: UserRole
): Promise<ParsedDashboardConfig[]> {
  if (!isValidRole(role)) {
    return [];
  }

  const results = await database
    .select()
    .from(dashboardConfig)
    .where(
      and(
        eq(dashboardConfig.role, role),
        isNull(dashboardConfig.userId)
      )
    )
    .orderBy(desc(dashboardConfig.isDefault), dashboardConfig.displayOrder);

  return results.map(parseDashboardConfig);
}

/**
 * Update a dashboard configuration
 */
export async function updateDashboardConfig(
  id: string,
  input: UpdateDashboardConfigInput
): Promise<ParsedDashboardConfig | null> {
  const updateData: UpdateDashboardConfigData = {
    updatedAt: new Date(),
  };

  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.widgets !== undefined) updateData.widgets = JSON.stringify(input.widgets);
  if (input.layoutConfig !== undefined) {
    updateData.layoutConfig = input.layoutConfig ? JSON.stringify(input.layoutConfig) : null;
  }
  if (input.dataSources !== undefined) {
    updateData.dataSources = input.dataSources ? JSON.stringify(input.dataSources) : null;
  }
  if (input.allowedWidgets !== undefined) {
    updateData.allowedWidgets = input.allowedWidgets ? JSON.stringify(input.allowedWidgets) : null;
  }
  if (input.isDefault !== undefined) updateData.isDefault = input.isDefault;
  if (input.isCustomized !== undefined) updateData.isCustomized = input.isCustomized;
  if (input.displayOrder !== undefined) updateData.displayOrder = input.displayOrder;

  const [result] = await database
    .update(dashboardConfig)
    .set(updateData)
    .where(eq(dashboardConfig.id, id))
    .returning();

  return result ? parseDashboardConfig(result) : null;
}

/**
 * Delete a dashboard configuration
 */
export async function deleteDashboardConfig(id: string): Promise<boolean> {
  const result = await database
    .delete(dashboardConfig)
    .where(eq(dashboardConfig.id, id))
    .returning({ id: dashboardConfig.id });

  return result.length > 0;
}

/**
 * Save user's dashboard configuration (create or update)
 * If user already has a config, updates it. Otherwise, creates a new one.
 */
export async function saveUserDashboardConfig(
  userId: string,
  widgets: WidgetInstance[],
  role?: UserRole | null
): Promise<ParsedDashboardConfig> {
  // Check if user already has a configuration
  const [existingConfig] = await database
    .select()
    .from(dashboardConfig)
    .where(eq(dashboardConfig.userId, userId))
    .limit(1);

  if (existingConfig) {
    // Update existing configuration
    return (await updateDashboardConfig(existingConfig.id, {
      widgets,
      isCustomized: true,
    }))!;
  }

  // Create new user-specific configuration
  return createDashboardConfig({
    userId,
    role: role ?? undefined,
    name: "My Dashboard",
    description: "Personal dashboard configuration",
    widgets,
    isCustomized: true,
  });
}

/**
 * Reset user's dashboard to role default
 * Deletes user-specific config so they use role default again
 */
export async function resetUserDashboardToDefault(
  userId: string
): Promise<boolean> {
  const result = await database
    .delete(dashboardConfig)
    .where(eq(dashboardConfig.userId, userId))
    .returning({ id: dashboardConfig.id });

  return result.length > 0;
}

/**
 * Set the default configuration for a role
 * Unsets any existing default and sets the new one
 */
export async function setRoleDefaultConfig(
  role: UserRole,
  configId: string
): Promise<boolean> {
  if (!isValidRole(role)) {
    return false;
  }

  // Unset existing default for this role
  await database
    .update(dashboardConfig)
    .set({ isDefault: false, updatedAt: new Date() })
    .where(
      and(
        eq(dashboardConfig.role, role),
        isNull(dashboardConfig.userId),
        eq(dashboardConfig.isDefault, true)
      )
    );

  // Set new default
  const [result] = await database
    .update(dashboardConfig)
    .set({ isDefault: true, updatedAt: new Date() })
    .where(
      and(
        eq(dashboardConfig.id, configId),
        eq(dashboardConfig.role, role)
      )
    )
    .returning();

  return !!result;
}

/**
 * Get all default configs for all roles
 */
export async function getAllRoleDefaultConfigs(): Promise<Record<UserRole, ParsedDashboardConfig | null>> {
  const results: Record<UserRole, ParsedDashboardConfig | null> = {
    md: null,
    "field-tech": null,
    admin: null,
    sales: null,
  };

  for (const role of USER_ROLES) {
    results[role] = await getRoleDefaultConfig(role);
  }

  return results;
}

/**
 * Create or update role default configuration
 */
export async function upsertRoleDefaultConfig(
  role: UserRole,
  input: Omit<CreateDashboardConfigInput, "userId" | "role" | "isDefault">
): Promise<ParsedDashboardConfig> {
  if (!isValidRole(role)) {
    throw new Error(`Invalid role: ${role}`);
  }

  // Check if default config already exists for this role
  const existingConfig = await getRoleDefaultConfig(role);

  if (existingConfig) {
    // Update existing default
    return (await updateDashboardConfig(existingConfig.id, {
      name: input.name,
      description: input.description,
      widgets: input.widgets,
      layoutConfig: input.layoutConfig,
      dataSources: input.dataSources,
      allowedWidgets: input.allowedWidgets,
      displayOrder: input.displayOrder,
    }))!;
  }

  // Create new default config for the role
  return createDashboardConfig({
    role,
    ...input,
    isDefault: true,
  });
}

/**
 * Get allowed widgets for a role
 */
export async function getAllowedWidgetsForRole(
  role: UserRole
): Promise<string[] | null> {
  const config = await getRoleDefaultConfig(role);
  return config?.allowedWidgets ?? null;
}

/**
 * Check if a widget is allowed for a role
 */
export async function isWidgetAllowedForRole(
  role: UserRole,
  widgetId: string
): Promise<boolean> {
  const allowedWidgets = await getAllowedWidgetsForRole(role);

  // If no restrictions, all widgets are allowed
  if (allowedWidgets === null) {
    return true;
  }

  return allowedWidgets.includes(widgetId);
}
