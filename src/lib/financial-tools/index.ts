/**
 * Financial Operation Tools
 *
 * Tools for querying balances, payment status, aging reports, and initiating payment workflows.
 * Provides conversational access to financial data through Claude.
 *
 * @module financial-tools
 */

import { getToolRegistry } from "../tool-registry";

// Export all tool definitions
export {
  getFinancialSnapshotTool,
  getPartnerBalanceTool,
  getBalancesTool,
  getAgingReportTool,
  getInvoicesTool,
  getInvoiceByIdTool,
  getPaymentsTool,
  getInvoiceCountTool,
  getFinancialTotalsTool,
  financialTools,
  getFinancialToolCount,
} from "./definitions";

// Import for registration
import { financialTools } from "./definitions";

/**
 * Register all financial tools with the global tool registry
 */
export function registerFinancialTools(): void {
  const registry = getToolRegistry();

  for (const tool of financialTools) {
    if (!registry.has(tool.id)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      registry.register(tool as any);
    }
  }
}

/**
 * Unregister all financial tools from the global tool registry
 */
export function unregisterFinancialTools(): void {
  const registry = getToolRegistry();

  for (const tool of financialTools) {
    registry.unregister(tool.id);
  }
}

/**
 * Check if financial tools are registered
 */
export function areFinancialToolsRegistered(): boolean {
  const registry = getToolRegistry();
  return financialTools.every((tool) => registry.has(tool.id));
}

/**
 * Get financial tools in Claude-compatible format
 */
export function getFinancialClaudeTools() {
  const registry = getToolRegistry();

  // Register if not already registered
  if (!areFinancialToolsRegistered()) {
    registerFinancialTools();
  }

  // Return only financial tools
  return financialTools.map((tool) => ({
    name: tool.id,
    description: tool.description,
    input_schema: tool.inputSchema,
  }));
}
