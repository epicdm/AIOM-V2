/**
 * Proactive Monitoring Engine
 *
 * Background service for running periodic health checks on tasks, expenses,
 * financial position, customer issues, and team capacity. Generates alerts
 * for anomalies.
 */

// Export types
export * from "./types";

// Export service
export {
  ProactiveMonitoringService,
  getProactiveMonitoringService,
  runProactiveHealthChecks,
} from "./service";
