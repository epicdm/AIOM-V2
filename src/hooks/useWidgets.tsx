import * as React from "react";
import {
  getAllWidgets,
  getWidget,
} from "~/components/widgets/registry";
import { registerBuiltInWidgets } from "~/components/widgets/definitions";
import type {
  WidgetInstance,
  WidgetDefinition,
  WidgetConfig,
  WidgetSize,
  UseWidgetsResult,
} from "~/components/widgets/types";
import type { UserRole } from "~/db/schema";
import {
  getDefaultWidgetsForRole,
  getAllowedWidgetsForRole,
  genericDefaultWidgets,
  isWidgetAllowedForRole,
} from "~/config/dashboard-defaults";

// Storage key for persisting widget instances
const STORAGE_KEY = "dashboard-widget-instances";
const USER_ROLE_KEY = "dashboard-user-role";

/**
 * Default widget instances for new users without a role
 */
const defaultInstances: WidgetInstance[] = genericDefaultWidgets;

/**
 * Load widget instances from localStorage
 */
function loadInstances(role?: UserRole | null): WidgetInstance[] {
  if (typeof window === "undefined") {
    // Server-side: return role-based defaults or generic defaults
    if (role) {
      return getDefaultWidgetsForRole(role);
    }
    return defaultInstances;
  }

  try {
    // Check if user has customized their dashboard
    const stored = localStorage.getItem(STORAGE_KEY);
    const storedRole = localStorage.getItem(USER_ROLE_KEY);

    if (stored) {
      const parsed = JSON.parse(stored) as WidgetInstance[];

      // If role changed, return role defaults instead of saved config
      if (role && storedRole !== role) {
        localStorage.setItem(USER_ROLE_KEY, role);
        const roleDefaults = getDefaultWidgetsForRole(role);
        // Filter saved widgets to only include those allowed for the new role
        const allowedWidgets = getAllowedWidgetsForRole(role);
        if (allowedWidgets === null) {
          return roleDefaults;
        }
        return roleDefaults;
      }

      // Validate that all widget IDs still exist in the registry
      // and are allowed for the user's role
      return parsed.filter((instance) => {
        const widgetExists = getWidget(instance.widgetId);
        if (!widgetExists) return false;

        // If role is set, check if widget is allowed
        if (role) {
          return isWidgetAllowedForRole(role, instance.widgetId);
        }

        return true;
      });
    }
  } catch (error) {
    console.error("Failed to load widget instances:", error);
  }

  // No saved config - return role-based defaults
  if (role) {
    // Save the role for future reference
    localStorage.setItem(USER_ROLE_KEY, role);
    return getDefaultWidgetsForRole(role);
  }

  return defaultInstances;
}

/**
 * Save widget instances to localStorage
 */
function saveInstances(instances: WidgetInstance[], role?: UserRole | null): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(instances));
    if (role) {
      localStorage.setItem(USER_ROLE_KEY, role);
    }
  } catch (error) {
    console.error("Failed to save widget instances:", error);
  }
}

/**
 * Generate a unique instance ID
 */
function generateInstanceId(widgetId: string): string {
  return `${widgetId}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Extended result type with role-based features
 */
export interface UseWidgetsResultExtended extends UseWidgetsResult {
  /** Current user's role */
  userRole: UserRole | null;
  /** Set the user's role (will reload appropriate widgets) */
  setUserRole: (role: UserRole | null) => void;
  /** Get widgets allowed for the current role */
  getAllowedWidgets: () => WidgetDefinition[];
  /** Check if a widget is allowed for the current role */
  isWidgetAllowed: (widgetId: string) => boolean;
  /** Reset to role-specific defaults */
  resetToRoleDefault: () => void;
}

/**
 * Hook for managing dashboard widgets with role-based configuration
 *
 * Provides functionality to:
 * - Get available widget definitions filtered by role
 * - Add/remove widget instances
 * - Update widget configuration
 * - Persist widget layout to localStorage
 * - Support role-based default layouts
 */
export function useWidgets(initialRole?: UserRole | null): UseWidgetsResultExtended {
  const [isInitialized, setIsInitialized] = React.useState(false);
  const [instances, setInstances] = React.useState<WidgetInstance[]>([]);
  const [isSaving, setIsSaving] = React.useState(false);
  const [userRole, setUserRoleState] = React.useState<UserRole | null>(initialRole ?? null);

  // Initialize widgets on mount
  React.useEffect(() => {
    // Register built-in widgets
    registerBuiltInWidgets();

    // Load instances from storage with role context
    const loadedInstances = loadInstances(userRole);
    setInstances(loadedInstances);
    setIsInitialized(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle role changes
  React.useEffect(() => {
    if (isInitialized && userRole) {
      // When role changes, reload with role-specific defaults
      const roleInstances = loadInstances(userRole);
      setInstances(roleInstances);
    }
  }, [userRole, isInitialized]);

  // Save instances when they change
  React.useEffect(() => {
    if (isInitialized && instances.length > 0) {
      setIsSaving(true);
      saveInstances(instances, userRole);
      // Simulate async save
      const timeout = setTimeout(() => setIsSaving(false), 300);
      return () => clearTimeout(timeout);
    }
  }, [instances, isInitialized, userRole]);

  /**
   * Set user role and reload appropriate widgets
   */
  const setUserRole = React.useCallback((role: UserRole | null) => {
    setUserRoleState(role);
    if (role) {
      localStorage.setItem(USER_ROLE_KEY, role);
    } else {
      localStorage.removeItem(USER_ROLE_KEY);
    }
  }, []);

  /**
   * Get all available widget definitions
   */
  const availableWidgets = React.useMemo((): WidgetDefinition[] => {
    return getAllWidgets();
  }, [isInitialized]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Get widgets allowed for the current role
   */
  const getAllowedWidgetsForCurrentRole = React.useCallback((): WidgetDefinition[] => {
    const allWidgets = getAllWidgets();

    if (!userRole) {
      return allWidgets;
    }

    const allowedIds = getAllowedWidgetsForRole(userRole);
    if (allowedIds === null) {
      return allWidgets;
    }

    return allWidgets.filter((w) => allowedIds.includes(w.id));
  }, [userRole]);

  /**
   * Check if a widget is allowed for the current role
   */
  const isWidgetAllowed = React.useCallback(
    (widgetId: string): boolean => {
      if (!userRole) return true;
      return isWidgetAllowedForRole(userRole, widgetId);
    },
    [userRole]
  );

  /**
   * Add a new widget instance
   */
  const addWidget = React.useCallback(
    (widgetId: string, config?: WidgetConfig): WidgetInstance => {
      const definition = getWidget(widgetId);

      if (!definition) {
        throw new Error(`Widget "${widgetId}" not found in registry`);
      }

      // Check if widget is allowed for the user's role
      if (userRole && !isWidgetAllowedForRole(userRole, widgetId)) {
        throw new Error(
          `Widget "${widgetId}" is not allowed for role "${userRole}"`
        );
      }

      const newInstance: WidgetInstance = {
        instanceId: generateInstanceId(widgetId),
        widgetId,
        size: definition.defaultSize,
        position: { row: 0, col: 0 },
        config: config ?? (definition.defaultConfig as WidgetConfig),
        visible: true,
      };

      setInstances((prev) => [...prev, newInstance]);

      return newInstance;
    },
    [userRole]
  );

  /**
   * Remove a widget instance
   */
  const removeWidget = React.useCallback((instanceId: string): void => {
    setInstances((prev) =>
      prev.filter((instance) => instance.instanceId !== instanceId)
    );
  }, []);

  /**
   * Update widget instance configuration
   */
  const updateConfig = React.useCallback(
    (instanceId: string, config: Partial<WidgetConfig>): void => {
      setInstances((prev) =>
        prev.map((instance) =>
          instance.instanceId === instanceId
            ? { ...instance, config: { ...instance.config, ...config } }
            : instance
        )
      );
    },
    []
  );

  /**
   * Update widget instance size
   */
  const updateSize = React.useCallback(
    (instanceId: string, size: WidgetSize): void => {
      setInstances((prev) =>
        prev.map((instance) =>
          instance.instanceId === instanceId ? { ...instance, size } : instance
        )
      );
    },
    []
  );

  /**
   * Reorder widget instances
   */
  const reorderWidgets = React.useCallback(
    (newInstances: WidgetInstance[]): void => {
      setInstances(newInstances);
    },
    []
  );

  /**
   * Reset to generic default widget layout
   */
  const resetToDefault = React.useCallback((): void => {
    setInstances(defaultInstances);
  }, []);

  /**
   * Reset to role-specific default layout
   */
  const resetToRoleDefault = React.useCallback((): void => {
    if (userRole) {
      const roleDefaults = getDefaultWidgetsForRole(userRole);
      setInstances(roleDefaults);
    } else {
      setInstances(defaultInstances);
    }
  }, [userRole]);

  return {
    availableWidgets,
    instances,
    addWidget,
    removeWidget,
    updateConfig,
    updateSize,
    reorderWidgets,
    resetToDefault,
    isSaving,
    // Extended role-based features
    userRole,
    setUserRole,
    getAllowedWidgets: getAllowedWidgetsForCurrentRole,
    isWidgetAllowed,
    resetToRoleDefault,
  };
}

/**
 * Context for sharing widget state across components
 */
interface WidgetContextValue extends UseWidgetsResultExtended {
  isEditing: boolean;
  setIsEditing: (editing: boolean) => void;
}

const WidgetContext = React.createContext<WidgetContextValue | null>(null);

/**
 * Widget Provider Component
 *
 * Provides widget state and methods to all child components
 */
export function WidgetProvider({
  children,
  initialRole,
}: {
  children: React.ReactNode;
  initialRole?: UserRole | null;
}) {
  const widgets = useWidgets(initialRole);
  const [isEditing, setIsEditing] = React.useState(false);

  const value = React.useMemo(
    () => ({
      ...widgets,
      isEditing,
      setIsEditing,
    }),
    [widgets, isEditing]
  );

  return (
    <WidgetContext.Provider value={value}>{children}</WidgetContext.Provider>
  );
}

/**
 * Hook to access widget context
 *
 * Must be used within a WidgetProvider
 */
export function useWidgetContext(): WidgetContextValue {
  const context = React.useContext(WidgetContext);

  if (!context) {
    throw new Error("useWidgetContext must be used within a WidgetProvider");
  }

  return context;
}
