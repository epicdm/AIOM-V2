/**
 * Contact Sync Server Functions
 *
 * Server-side functions for syncing Odoo contacts to mobile devices.
 * Handles sync operations, conflict resolution, and offline access.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authenticatedMiddleware } from "./middleware";
import {
  getOrCreateSyncState,
  updateSyncState,
  getSyncedContacts,
  getSyncedContactById,
  getSyncedContactByOdooId,
  createSyncedContact,
  updateSyncedContactLocally,
  deleteSyncedContact,
  performFullSync,
  performIncrementalSync,
  getContactsWithConflicts,
  resolveContactConflict,
  getContactsWithPendingChanges,
  pushContactChangesToOdoo,
  countSyncedContacts,
  searchSyncedContacts,
  toggleContactFavorite,
  getFavoriteContacts,
  clearAllSyncedContacts,
  getRecentSyncLogs,
  type ContactSyncOptions,
} from "~/data-access/contact-sync";
import type {
  SyncedContact,
  ContactSyncState,
  ContactSyncLog,
  ContactConflictResolution,
} from "~/db/schema";

// =============================================================================
// Schema Definitions
// =============================================================================

const contactSyncOptionsSchema = z.object({
  syncCustomers: z.boolean().optional(),
  syncVendors: z.boolean().optional(),
  companiesOnly: z.boolean().optional(),
  batchSize: z.number().min(1).max(500).optional(),
  partnerIds: z.array(z.number()).optional(),
});

const syncStateUpdateSchema = z.object({
  autoSyncEnabled: z.boolean().optional(),
  syncIntervalMinutes: z.number().min(1).max(1440).optional(),
  syncOnWifiOnly: z.boolean().optional(),
  syncCustomers: z.boolean().optional(),
  syncVendors: z.boolean().optional(),
  syncCompaniesOnly: z.boolean().optional(),
});

const contactLocalUpdateSchema = z.object({
  contactId: z.string(),
  updates: z.object({
    name: z.string().optional(),
    email: z.string().email().optional().nullable(),
    phone: z.string().optional().nullable(),
    mobile: z.string().optional().nullable(),
    website: z.string().url().optional().nullable(),
    street: z.string().optional().nullable(),
    street2: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    zip: z.string().optional().nullable(),
    jobTitle: z.string().optional().nullable(),
    isFavorite: z.boolean().optional(),
  }),
});

const conflictResolutionSchema = z.enum([
  "client_wins",
  "server_wins",
  "merge",
  "manual",
]);

const resolveConflictSchema = z.object({
  contactId: z.string(),
  resolution: conflictResolutionSchema,
  mergedData: z.record(z.string(), z.unknown()).optional(),
});

const contactsQuerySchema = z.object({
  limit: z.number().min(1).max(500).optional(),
  offset: z.number().min(0).optional(),
  status: z.enum(["synced", "pending", "conflict", "error"]).optional(),
  isCustomer: z.boolean().optional(),
  isVendor: z.boolean().optional(),
  hasConflict: z.boolean().optional(),
  search: z.string().optional(),
  orderBy: z.enum(["name", "updatedAt", "lastSyncedAt"]).optional(),
  orderDir: z.enum(["asc", "desc"]).optional(),
});

// =============================================================================
// Sync State Functions
// =============================================================================

/**
 * Get the user's contact sync state
 */
export const getSyncStateFn = createServerFn({
  method: "GET",
})
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }): Promise<ContactSyncState> => {
    return getOrCreateSyncState(context.userId);
  });

/**
 * Update the user's sync state/preferences
 */
export const updateSyncStateFn = createServerFn({
  method: "POST",
})
  .middleware([authenticatedMiddleware])
  .inputValidator(syncStateUpdateSchema)
  .handler(async ({ data, context }): Promise<ContactSyncState> => {
    return updateSyncState(context.userId, data);
  });

// =============================================================================
// Sync Operations
// =============================================================================

/**
 * Perform a full sync of contacts from Odoo
 */
export const performFullSyncFn = createServerFn({
  method: "POST",
})
  .middleware([authenticatedMiddleware])
  .inputValidator(contactSyncOptionsSchema.optional())
  .handler(async ({ data, context }) => {
    const options: ContactSyncOptions = data ?? {};
    return performFullSync(context.userId, options);
  });

/**
 * Perform an incremental sync of contacts from Odoo
 */
export const performIncrementalSyncFn = createServerFn({
  method: "POST",
})
  .middleware([authenticatedMiddleware])
  .inputValidator(contactSyncOptionsSchema.optional())
  .handler(async ({ data, context }) => {
    const options: ContactSyncOptions = data ?? {};
    return performIncrementalSync(context.userId, options);
  });

/**
 * Push local changes to Odoo
 */
export const pushLocalChangesFn = createServerFn({
  method: "POST",
})
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    return pushContactChangesToOdoo(context.userId);
  });

/**
 * Perform a bidirectional sync (pull then push)
 */
export const performBidirectionalSyncFn = createServerFn({
  method: "POST",
})
  .middleware([authenticatedMiddleware])
  .inputValidator(contactSyncOptionsSchema.optional())
  .handler(async ({ data, context }) => {
    const options: ContactSyncOptions = data ?? {};

    // First, push any local changes
    const pushResult = await pushContactChangesToOdoo(context.userId);

    // Then, pull updates from server
    const pullResult = await performIncrementalSync(context.userId, options);

    return {
      push: pushResult,
      pull: pullResult,
      success: pushResult.success && pullResult.success,
    };
  });

// =============================================================================
// Contact CRUD Functions
// =============================================================================

/**
 * Get all synced contacts with optional filters
 */
export const getSyncedContactsFn = createServerFn({
  method: "GET",
})
  .middleware([authenticatedMiddleware])
  .inputValidator(contactsQuerySchema.optional())
  .handler(async ({ data, context }): Promise<SyncedContact[]> => {
    return getSyncedContacts(context.userId, data);
  });

/**
 * Get a single synced contact by ID
 */
export const getSyncedContactByIdFn = createServerFn({
  method: "GET",
})
  .middleware([authenticatedMiddleware])
  .inputValidator(z.object({ contactId: z.string() }))
  .handler(async ({ data, context }): Promise<SyncedContact | null> => {
    return getSyncedContactById(data.contactId, context.userId);
  });

/**
 * Get a synced contact by Odoo partner ID
 */
export const getSyncedContactByOdooIdFn = createServerFn({
  method: "GET",
})
  .middleware([authenticatedMiddleware])
  .inputValidator(z.object({ odooPartnerId: z.number() }))
  .handler(async ({ data, context }): Promise<SyncedContact | null> => {
    return getSyncedContactByOdooId(data.odooPartnerId, context.userId);
  });

/**
 * Update a contact locally (creates pending changes for sync)
 */
export const updateContactLocallyFn = createServerFn({
  method: "POST",
})
  .middleware([authenticatedMiddleware])
  .inputValidator(contactLocalUpdateSchema)
  .handler(async ({ data, context }): Promise<SyncedContact | null> => {
    return updateSyncedContactLocally(
      data.contactId,
      context.userId,
      data.updates
    );
  });

/**
 * Delete a synced contact
 */
export const deleteSyncedContactFn = createServerFn({
  method: "POST",
})
  .middleware([authenticatedMiddleware])
  .inputValidator(z.object({ contactId: z.string() }))
  .handler(async ({ data, context }): Promise<{ success: boolean }> => {
    await deleteSyncedContact(data.contactId, context.userId);
    return { success: true };
  });

/**
 * Search synced contacts
 */
export const searchContactsFn = createServerFn({
  method: "GET",
})
  .middleware([authenticatedMiddleware])
  .inputValidator(z.object({ query: z.string(), limit: z.number().optional() }))
  .handler(async ({ data, context }): Promise<SyncedContact[]> => {
    return searchSyncedContacts(context.userId, data.query, data.limit);
  });

/**
 * Count synced contacts with optional filters
 */
export const countContactsFn = createServerFn({
  method: "GET",
})
  .middleware([authenticatedMiddleware])
  .inputValidator(
    z
      .object({
        status: z.enum(["synced", "pending", "conflict", "error"]).optional(),
        isCustomer: z.boolean().optional(),
        isVendor: z.boolean().optional(),
        hasConflict: z.boolean().optional(),
      })
      .optional()
  )
  .handler(async ({ data, context }): Promise<number> => {
    return countSyncedContacts(context.userId, data);
  });

// =============================================================================
// Conflict Resolution Functions
// =============================================================================

/**
 * Get all contacts with unresolved conflicts
 */
export const getConflictsFn = createServerFn({
  method: "GET",
})
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }): Promise<SyncedContact[]> => {
    return getContactsWithConflicts(context.userId);
  });

/**
 * Resolve a contact conflict
 */
export const resolveConflictFn = createServerFn({
  method: "POST",
})
  .middleware([authenticatedMiddleware])
  .inputValidator(resolveConflictSchema)
  .handler(async ({ data, context }): Promise<SyncedContact | null> => {
    return resolveContactConflict(
      data.contactId,
      context.userId,
      data.resolution as ContactConflictResolution,
      data.mergedData as Partial<SyncedContact> | undefined
    );
  });

/**
 * Get contacts with pending local changes
 */
export const getPendingChangesFn = createServerFn({
  method: "GET",
})
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }): Promise<SyncedContact[]> => {
    return getContactsWithPendingChanges(context.userId);
  });

// =============================================================================
// Favorites Functions
// =============================================================================

/**
 * Toggle favorite status for a contact
 */
export const toggleFavoriteFn = createServerFn({
  method: "POST",
})
  .middleware([authenticatedMiddleware])
  .inputValidator(z.object({ contactId: z.string() }))
  .handler(async ({ data, context }): Promise<SyncedContact | null> => {
    return toggleContactFavorite(data.contactId, context.userId);
  });

/**
 * Get favorite contacts
 */
export const getFavoritesFn = createServerFn({
  method: "GET",
})
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }): Promise<SyncedContact[]> => {
    return getFavoriteContacts(context.userId);
  });

// =============================================================================
// Sync Log Functions
// =============================================================================

/**
 * Get recent sync logs
 */
export const getSyncLogsFn = createServerFn({
  method: "GET",
})
  .middleware([authenticatedMiddleware])
  .inputValidator(z.object({ limit: z.number().min(1).max(100).optional() }).optional())
  .handler(async ({ data, context }): Promise<ContactSyncLog[]> => {
    return getRecentSyncLogs(context.userId, data?.limit ?? 10);
  });

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Clear all synced contacts (for logout/reset)
 */
export const clearAllContactsFn = createServerFn({
  method: "POST",
})
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }): Promise<{ success: boolean }> => {
    await clearAllSyncedContacts(context.userId);
    return { success: true };
  });

/**
 * Get sync summary/statistics
 */
export const getSyncSummaryFn = createServerFn({
  method: "GET",
})
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    const [syncState, totalContacts, pendingCount, conflictCount, customerCount, vendorCount] =
      await Promise.all([
        getOrCreateSyncState(context.userId),
        countSyncedContacts(context.userId),
        countSyncedContacts(context.userId, { status: "pending" }),
        countSyncedContacts(context.userId, { hasConflict: true }),
        countSyncedContacts(context.userId, { isCustomer: true }),
        countSyncedContacts(context.userId, { isVendor: true }),
      ]);

    return {
      syncState,
      stats: {
        totalContacts,
        pendingChanges: pendingCount,
        conflicts: conflictCount,
        customers: customerCount,
        vendors: vendorCount,
      },
    };
  });
