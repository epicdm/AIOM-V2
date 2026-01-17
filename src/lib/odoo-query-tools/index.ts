/**
 * Odoo Query Tools
 *
 * Claude tool implementations for querying Odoo data (tasks, projects, customers, financials).
 * Converts natural language queries into structured Odoo API calls.
 *
 * @module odoo-query-tools
 */

import { getToolRegistry } from "../tool-registry";

// Export all tool definitions
export {
  // Project tools
  searchProjectsTool,
  getProjectTool,
  getProjectStatsTool,
  // Task tools
  searchTasksTool,
  getTaskTool,
  // Milestone tools
  searchMilestonesTool,
  getMilestoneTool,
  // Customer tools
  searchCustomersTool,
  getCustomerTool,
  getTopCustomersTool,
  getInactiveCustomersTool,
  // Vendor tools
  searchVendorsTool,
  getVendorTool,
  getTopVendorsTool,
  // Collection and utility
  odooQueryTools,
  getOdooQueryToolCount,
} from "./definitions";

// Import for registration
import { odooQueryTools } from "./definitions";

/**
 * Register all Odoo query tools with the global tool registry
 */
export function registerOdooQueryTools(): void {
  const registry = getToolRegistry();

  for (const tool of odooQueryTools) {
    if (!registry.has(tool.id)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      registry.register(tool as any);
    }
  }
}

/**
 * Unregister all Odoo query tools from the global tool registry
 */
export function unregisterOdooQueryTools(): void {
  const registry = getToolRegistry();

  for (const tool of odooQueryTools) {
    registry.unregister(tool.id);
  }
}

/**
 * Check if Odoo query tools are registered
 */
export function areOdooQueryToolsRegistered(): boolean {
  const registry = getToolRegistry();
  return odooQueryTools.every((tool) => registry.has(tool.id));
}

/**
 * Get Odoo query tools in Claude-compatible format
 */
export function getOdooQueryClaudeTools() {
  const registry = getToolRegistry();

  // Register if not already registered
  if (!areOdooQueryToolsRegistered()) {
    registerOdooQueryTools();
  }

  // Return only Odoo query tools
  return odooQueryTools.map((tool) => ({
    name: tool.id,
    description: tool.description,
    input_schema: tool.inputSchema,
  }));
}
