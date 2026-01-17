/**
 * Job Handlers Index
 * Exports all job handlers and provides registration helper
 */

import type { JobHandler, JobHandlerRegistration, JobContext } from "../types";
import type { JobType } from "~/db/schema";

// Import handlers
import { briefingGenerateHandler, briefingDeliverHandler } from "./briefing";
import { notificationPushHandler, notificationEmailHandler } from "./notification";
import { syncContactsHandler, syncCrmHandler } from "./sync";
import { cleanupExpiredHandler, reportGenerateHandler } from "./cleanup";
import { dataExportHandler } from "./data-export";

// =============================================================================
// Handler Exports
// =============================================================================

export {
  briefingGenerateHandler,
  briefingDeliverHandler,
  notificationPushHandler,
  notificationEmailHandler,
  syncContactsHandler,
  syncCrmHandler,
  cleanupExpiredHandler,
  reportGenerateHandler,
  dataExportHandler,
};

// =============================================================================
// Handler Map
// =============================================================================

/**
 * Map of job types to their handlers
 * Using type assertion since handlers have specific payload/result types
 */
export const jobHandlers: Record<JobType, JobHandler<unknown, unknown>> = {
  "briefing.generate": briefingGenerateHandler as JobHandler<unknown, unknown>,
  "briefing.deliver": briefingDeliverHandler as JobHandler<unknown, unknown>,
  "notification.push": notificationPushHandler as JobHandler<unknown, unknown>,
  "notification.email": notificationEmailHandler as JobHandler<unknown, unknown>,
  "sync.contacts": syncContactsHandler as JobHandler<unknown, unknown>,
  "sync.crm": syncCrmHandler as JobHandler<unknown, unknown>,
  "cleanup.expired": cleanupExpiredHandler as JobHandler<unknown, unknown>,
  "report.generate": reportGenerateHandler as JobHandler<unknown, unknown>,
  "data.export": dataExportHandler as JobHandler<unknown, unknown>,
  custom: async (context: JobContext<unknown>) => {
    // Custom jobs should have their handler specified in the payload
    const { handler, data } = context.job.payload as { handler: string; data: unknown };
    console.log(`[CustomJobHandler] Executing custom job with handler: ${handler}`, data);
    return { executed: true, handler };
  },
};

// =============================================================================
// Handler Registrations
// =============================================================================

/**
 * All handler registrations for the job queue
 * Using type assertion for handlers with specific payload/result types
 */
export const allHandlerRegistrations: JobHandlerRegistration<unknown, unknown>[] = [
  {
    type: "briefing.generate",
    handler: briefingGenerateHandler as JobHandler<unknown, unknown>,
    defaultOptions: {
      priority: "normal",
      maxRetries: 3,
      processingTimeout: 60000, // 1 minute
    },
  },
  {
    type: "briefing.deliver",
    handler: briefingDeliverHandler as JobHandler<unknown, unknown>,
    defaultOptions: {
      priority: "high",
      maxRetries: 3,
      processingTimeout: 30000,
    },
  },
  {
    type: "notification.push",
    handler: notificationPushHandler as JobHandler<unknown, unknown>,
    defaultOptions: {
      priority: "high",
      maxRetries: 3,
      processingTimeout: 15000,
    },
  },
  {
    type: "notification.email",
    handler: notificationEmailHandler as JobHandler<unknown, unknown>,
    defaultOptions: {
      priority: "normal",
      maxRetries: 3,
      processingTimeout: 30000,
    },
  },
  {
    type: "sync.contacts",
    handler: syncContactsHandler as JobHandler<unknown, unknown>,
    defaultOptions: {
      priority: "normal",
      maxRetries: 2,
      processingTimeout: 300000, // 5 minutes
    },
  },
  {
    type: "sync.crm",
    handler: syncCrmHandler as JobHandler<unknown, unknown>,
    defaultOptions: {
      priority: "normal",
      maxRetries: 3,
      processingTimeout: 60000,
    },
  },
  {
    type: "cleanup.expired",
    handler: cleanupExpiredHandler as JobHandler<unknown, unknown>,
    defaultOptions: {
      priority: "low",
      maxRetries: 1,
      processingTimeout: 300000, // 5 minutes
    },
  },
  {
    type: "report.generate",
    handler: reportGenerateHandler as JobHandler<unknown, unknown>,
    defaultOptions: {
      priority: "normal",
      maxRetries: 2,
      processingTimeout: 600000, // 10 minutes
    },
  },
  {
    type: "data.export",
    handler: dataExportHandler as JobHandler<unknown, unknown>,
    defaultOptions: {
      priority: "normal",
      maxRetries: 2,
      processingTimeout: 300000, // 5 minutes
    },
  },
];

// =============================================================================
// Registration Helper
// =============================================================================

/**
 * Register all handlers with the job queue client
 */
export function registerAllHandlers(
  registerFn: (type: JobType, handler: JobHandler<unknown, unknown>) => void
): void {
  for (const registration of allHandlerRegistrations) {
    registerFn(registration.type, registration.handler);
  }
}
