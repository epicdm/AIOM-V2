import type { WidgetDefinition, WidgetRegistry, WidgetCategory } from "./types";

/**
 * Create a new widget registry instance
 */
function createWidgetRegistry(): WidgetRegistry {
  const widgets = new Map<string, WidgetDefinition>();

  return {
    widgets,

    register(widget: WidgetDefinition): void {
      if (widgets.has(widget.id)) {
        console.warn(
          `Widget with id "${widget.id}" is already registered. Overwriting...`
        );
      }
      widgets.set(widget.id, widget);
    },

    unregister(widgetId: string): void {
      if (!widgets.has(widgetId)) {
        console.warn(`Widget with id "${widgetId}" is not registered.`);
        return;
      }
      widgets.delete(widgetId);
    },

    get(widgetId: string): WidgetDefinition | undefined {
      return widgets.get(widgetId);
    },

    getAll(): WidgetDefinition[] {
      return Array.from(widgets.values());
    },

    getByCategory(category: WidgetCategory): WidgetDefinition[] {
      return Array.from(widgets.values()).filter(
        (widget) => widget.category === category
      );
    },

    has(widgetId: string): boolean {
      return widgets.has(widgetId);
    },
  };
}

/**
 * Global widget registry singleton
 */
export const widgetRegistry = createWidgetRegistry();

/**
 * Helper function to register a widget
 */
export function registerWidget(widget: WidgetDefinition): void {
  widgetRegistry.register(widget);
}

/**
 * Helper function to get a widget by ID
 */
export function getWidget(widgetId: string): WidgetDefinition | undefined {
  return widgetRegistry.get(widgetId);
}

/**
 * Helper function to get all widgets
 */
export function getAllWidgets(): WidgetDefinition[] {
  return widgetRegistry.getAll();
}

/**
 * Helper function to get widgets by category
 */
export function getWidgetsByCategory(
  category: WidgetCategory
): WidgetDefinition[] {
  return widgetRegistry.getByCategory(category);
}

/**
 * Re-export types for convenience
 */
export type { WidgetDefinition, WidgetRegistry, WidgetCategory };
