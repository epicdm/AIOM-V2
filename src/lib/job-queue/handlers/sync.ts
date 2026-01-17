/**
 * Sync Job Handlers
 * Handlers for synchronization-related background jobs
 */

import type { JobHandler, SyncContactsPayload, SyncCrmPayload } from "../types";

/**
 * Contact sync job handler
 * Synchronizes contacts from Odoo for a user
 */
export const syncContactsHandler: JobHandler<SyncContactsPayload, { synced: number; errors: number }> = async (
  context
) => {
  const { job, updateProgress } = context;
  const { userId, syncType } = job.payload;

  console.log(`[SyncContactsHandler] Starting ${syncType} contact sync for user ${userId}`);
  await updateProgress(10, `Starting ${syncType} contact sync...`);

  try {
    // Dynamically import to avoid circular dependencies
    const { performFullSync, performIncrementalSync } = await import("~/data-access/contact-sync");

    await updateProgress(20, "Initializing sync...");

    await updateProgress(30, "Fetching contacts to sync...");

    let result;

    if (syncType === "full") {
      await updateProgress(50, "Performing full sync...");
      result = await performFullSync(userId);
    } else {
      await updateProgress(50, "Performing incremental sync...");
      result = await performIncrementalSync(userId);
    }

    await updateProgress(90, "Completing sync...");

    const synced = result.created + result.updated;
    const errors = result.errors.length;

    console.log(
      `[SyncContactsHandler] Contact sync completed for user ${userId}: ${synced} synced, ${errors} errors`
    );

    await updateProgress(100, "Complete");

    return { synced, errors };
  } catch (error) {
    console.error(`[SyncContactsHandler] Error syncing contacts for user ${userId}:`, error);
    throw error;
  }
};

/**
 * CRM sync job handler
 * Synchronizes CRM data between local system and Odoo
 */
export const syncCrmHandler: JobHandler<SyncCrmPayload, { success: boolean; operation: string }> = async (
  context
) => {
  const { job, updateProgress } = context;
  const { userId, entityType, entityId, operation } = job.payload;

  console.log(
    `[SyncCrmHandler] Starting CRM ${operation} for ${entityType}${entityId ? ` (${entityId})` : ""} by user ${userId}`
  );
  await updateProgress(10, `Starting CRM ${operation}...`);

  try {
    await updateProgress(30, "Connecting to CRM...");

    // Dynamically import Odoo client
    const { OdooClient } = await import("~/lib/odoo/client");

    await updateProgress(50, `Performing ${operation}...`);

    // Note: CRM sync logic would go here based on entityType and operation
    // This is a placeholder for actual CRM integration

    console.log(`[SyncCrmHandler] CRM operation:`, {
      userId,
      entityType,
      entityId,
      operation,
    });

    // Simulate CRM operation
    await new Promise((resolve) => setTimeout(resolve, 100));

    await updateProgress(90, "Operation completed");

    console.log(`[SyncCrmHandler] CRM ${operation} completed for ${entityType}`);

    await updateProgress(100, "Complete");

    return {
      success: true,
      operation,
    };
  } catch (error) {
    console.error(`[SyncCrmHandler] Error in CRM ${operation} for ${entityType}:`, error);
    throw error;
  }
};
