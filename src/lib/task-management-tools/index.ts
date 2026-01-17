/**
 * Task Management Tools
 *
 * Tools for creating, updating, assigning, and querying tasks through natural language.
 * Includes smart scheduling, priority setting, and dependency management.
 * Provides conversational access to task management through Claude.
 *
 * @module task-management-tools
 */

import { getToolRegistry } from "../tool-registry";

// Export all tool definitions
export {
  // Query tools
  getTasksTool,
  getTaskByIdTool,
  getTaskStatsTool,
  getOverdueTasksTool,
  getTasksDueTodayTool,
  getTasksDueThisWeekTool,
  getHighPriorityTasksTool,
  getBlockedTasksTool,
  getProjectTasksTool,
  searchTasksTool,
  // Create/update tools
  createTaskTool,
  updateTaskTool,
  assignTaskTool,
  setTaskPriorityTool,
  setTaskDeadlineTool,
  completeTaskTool,
  addSubtaskTool,
  scheduleTaskTool,
  // Collection and count
  taskManagementTools,
  getTaskManagementToolCount,
} from "./definitions";

// Import for registration
import { taskManagementTools } from "./definitions";

/**
 * Register all task management tools with the global tool registry
 */
export function registerTaskManagementTools(): void {
  const registry = getToolRegistry();

  for (const tool of taskManagementTools) {
    if (!registry.has(tool.id)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      registry.register(tool as any);
    }
  }
}

/**
 * Unregister all task management tools from the global tool registry
 */
export function unregisterTaskManagementTools(): void {
  const registry = getToolRegistry();

  for (const tool of taskManagementTools) {
    registry.unregister(tool.id);
  }
}

/**
 * Check if task management tools are registered
 */
export function areTaskManagementToolsRegistered(): boolean {
  const registry = getToolRegistry();
  return taskManagementTools.every((tool) => registry.has(tool.id));
}

/**
 * Get task management tools in Claude-compatible format
 */
export function getTaskManagementClaudeTools() {
  const registry = getToolRegistry();

  // Register if not already registered
  if (!areTaskManagementToolsRegistered()) {
    registerTaskManagementTools();
  }

  // Return only task management tools
  return taskManagementTools.map((tool) => ({
    name: tool.id,
    description: tool.description,
    input_schema: tool.inputSchema,
  }));
}
