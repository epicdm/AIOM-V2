/**
 * Contact Sync Data Access Layer
 *
 * Provides data access functions for syncing Odoo contacts to mobile devices.
 * Handles incremental updates, conflict resolution, and offline access.
 */

import { eq, and, desc, asc, gt, lt, inArray, sql, or, isNull } from "drizzle-orm";
import { database } from "~/db";
import {
  syncedContact,
  contactSyncLog,
  contactSyncState,
  type SyncedContact,
  type CreateSyncedContactData,
  type UpdateSyncedContactData,
  type ContactSyncLog,
  type CreateContactSyncLogData,
  type ContactSyncState,
  type CreateContactSyncStateData,
  type UpdateContactSyncStateData,
  type ContactConflictData,
  type FullOdooContactData,
  type ContactSyncStatus,
  type ContactConflictResolution,
} from "~/db/schema";
import {
  type OdooDomain,
  type SearchReadOptions,
  type PartnerDetail,
} from "~/lib/odoo";
import { getOdooClient } from "./odoo";
import type { XmlRpcValue } from "~/lib/odoo";

// =============================================================================
// Constants
// =============================================================================

/**
 * Fields to fetch from Odoo for contact sync
 */
const CONTACT_SYNC_FIELDS = [
  "id",
  "name",
  "email",
  "phone",
  "mobile",
  "website",
  "street",
  "street2",
  "city",
  "state_id",
  "zip",
  "country_id",
  "is_company",
  "company_type",
  "parent_id",
  "child_ids",
  "function",
  "vat",
  "ref",
  "lang",
  "tz",
  "customer_rank",
  "supplier_rank",
  "create_date",
  "write_date",
  "active",
  "comment",
  "credit_limit",
  "title",
  "category_id",
  "user_id",
  "industry_id",
];

/**
 * Default batch size for sync operations
 */
const DEFAULT_BATCH_SIZE = 100;

// =============================================================================
// Types
// =============================================================================

export interface ContactSyncOptions {
  /** Include customers in sync */
  syncCustomers?: boolean;
  /** Include vendors in sync */
  syncVendors?: boolean;
  /** Only sync companies (not individual contacts) */
  companiesOnly?: boolean;
  /** Maximum contacts to sync in one batch */
  batchSize?: number;
  /** Specific partner IDs to sync */
  partnerIds?: number[];
}

export interface ContactSyncResult {
  success: boolean;
  created: number;
  updated: number;
  deleted: number;
  conflicts: number;
  errors: string[];
  syncLogId: string;
}

export interface ContactChange {
  contactId: string;
  odooPartnerId: number;
  changeType: "create" | "update" | "delete";
  fields?: string[];
  oldValues?: Partial<SyncedContact>;
  newValues?: Partial<SyncedContact>;
}

export interface ConflictInfo {
  contactId: string;
  odooPartnerId: number;
  conflictData: ContactConflictData;
  suggestedResolution: ContactConflictResolution;
}

// =============================================================================
// Sync State Management
// =============================================================================

/**
 * Gets or creates the sync state for a user
 */
export async function getOrCreateSyncState(
  userId: string
): Promise<ContactSyncState> {
  const existing = await database
    .select()
    .from(contactSyncState)
    .where(eq(contactSyncState.id, userId))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  // Create default sync state
  const newState: CreateContactSyncStateData = {
    id: userId,
    autoSyncEnabled: true,
    syncIntervalMinutes: 15,
    syncOnWifiOnly: false,
    syncCustomers: true,
    syncVendors: true,
    syncCompaniesOnly: false,
    totalContactsSynced: 0,
    pendingConflicts: 0,
    pendingChanges: 0,
  };

  const [created] = await database
    .insert(contactSyncState)
    .values(newState)
    .returning();

  return created;
}

/**
 * Updates the sync state for a user
 */
export async function updateSyncState(
  userId: string,
  updates: UpdateContactSyncStateData
): Promise<ContactSyncState> {
  const [updated] = await database
    .update(contactSyncState)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(contactSyncState.id, userId))
    .returning();

  return updated;
}

// =============================================================================
// Sync Log Management
// =============================================================================

/**
 * Creates a new sync log entry
 */
export async function createSyncLog(
  data: CreateContactSyncLogData
): Promise<ContactSyncLog> {
  const [log] = await database
    .insert(contactSyncLog)
    .values({
      ...data,
      id: crypto.randomUUID(),
    })
    .returning();

  return log;
}

/**
 * Updates a sync log entry
 */
export async function updateSyncLog(
  logId: string,
  updates: Partial<ContactSyncLog>
): Promise<ContactSyncLog | null> {
  const [updated] = await database
    .update(contactSyncLog)
    .set(updates)
    .where(eq(contactSyncLog.id, logId))
    .returning();

  return updated ?? null;
}

/**
 * Gets recent sync logs for a user
 */
export async function getRecentSyncLogs(
  userId: string,
  limit: number = 10
): Promise<ContactSyncLog[]> {
  return database
    .select()
    .from(contactSyncLog)
    .where(eq(contactSyncLog.userId, userId))
    .orderBy(desc(contactSyncLog.startedAt))
    .limit(limit);
}

// =============================================================================
// Contact CRUD Operations
// =============================================================================

/**
 * Gets all synced contacts for a user
 */
export async function getSyncedContacts(
  userId: string,
  options: {
    limit?: number;
    offset?: number;
    status?: ContactSyncStatus;
    isCustomer?: boolean;
    isVendor?: boolean;
    hasConflict?: boolean;
    search?: string;
    orderBy?: "name" | "updatedAt" | "lastSyncedAt";
    orderDir?: "asc" | "desc";
  } = {}
): Promise<SyncedContact[]> {
  const {
    limit = 100,
    offset = 0,
    status,
    isCustomer,
    isVendor,
    hasConflict,
    search,
    orderBy = "name",
    orderDir = "asc",
  } = options;

  let query = database
    .select()
    .from(syncedContact)
    .where(eq(syncedContact.userId, userId));

  // Apply filters
  const conditions = [eq(syncedContact.userId, userId)];

  if (status) {
    conditions.push(eq(syncedContact.syncStatus, status));
  }

  if (isCustomer !== undefined) {
    conditions.push(eq(syncedContact.isCustomer, isCustomer));
  }

  if (isVendor !== undefined) {
    conditions.push(eq(syncedContact.isVendor, isVendor));
  }

  if (hasConflict !== undefined) {
    conditions.push(eq(syncedContact.hasConflict, hasConflict));
  }

  if (search) {
    const searchPattern = `%${search}%`;
    conditions.push(
      or(
        sql`${syncedContact.name} ILIKE ${searchPattern}`,
        sql`${syncedContact.email} ILIKE ${searchPattern}`,
        sql`${syncedContact.phone} ILIKE ${searchPattern}`,
        sql`${syncedContact.mobile} ILIKE ${searchPattern}`
      )!
    );
  }

  // Apply ordering
  const orderColumn = orderBy === "name"
    ? syncedContact.name
    : orderBy === "updatedAt"
    ? syncedContact.updatedAt
    : syncedContact.lastSyncedAt;

  const orderFn = orderDir === "asc" ? asc : desc;

  return database
    .select()
    .from(syncedContact)
    .where(and(...conditions))
    .orderBy(orderFn(orderColumn))
    .limit(limit)
    .offset(offset);
}

/**
 * Gets a single synced contact by ID
 */
export async function getSyncedContactById(
  contactId: string,
  userId: string
): Promise<SyncedContact | null> {
  const [contact] = await database
    .select()
    .from(syncedContact)
    .where(
      and(
        eq(syncedContact.id, contactId),
        eq(syncedContact.userId, userId)
      )
    )
    .limit(1);

  return contact ?? null;
}

/**
 * Gets a synced contact by Odoo partner ID
 */
export async function getSyncedContactByOdooId(
  odooPartnerId: number,
  userId: string
): Promise<SyncedContact | null> {
  const [contact] = await database
    .select()
    .from(syncedContact)
    .where(
      and(
        eq(syncedContact.odooPartnerId, odooPartnerId),
        eq(syncedContact.userId, userId)
      )
    )
    .limit(1);

  return contact ?? null;
}

/**
 * Creates a new synced contact from Odoo data
 */
export async function createSyncedContact(
  userId: string,
  odooData: FullOdooContactData
): Promise<SyncedContact> {
  const contactData: CreateSyncedContactData = {
    id: crypto.randomUUID(),
    userId,
    odooPartnerId: odooData.id,
    name: odooData.name,
    email: odooData.email ?? undefined,
    phone: odooData.phone ?? undefined,
    mobile: odooData.mobile ?? undefined,
    website: odooData.website ?? undefined,
    street: odooData.street ?? undefined,
    street2: odooData.street2 ?? undefined,
    city: odooData.city ?? undefined,
    stateId: odooData.state_id?.[0] ?? undefined,
    stateName: odooData.state_id?.[1] ?? undefined,
    zip: odooData.zip ?? undefined,
    countryId: odooData.country_id?.[0] ?? undefined,
    countryName: odooData.country_id?.[1] ?? undefined,
    isCompany: odooData.is_company,
    companyType: odooData.company_type ?? undefined,
    parentId: odooData.parent_id?.[0] ?? undefined,
    parentName: odooData.parent_id?.[1] ?? undefined,
    jobTitle: odooData.function ?? undefined,
    vat: odooData.vat ?? undefined,
    ref: odooData.ref ?? undefined,
    isCustomer: (odooData.customer_rank ?? 0) > 0,
    isVendor: (odooData.supplier_rank ?? 0) > 0,
    syncStatus: "synced",
    lastSyncedAt: new Date(),
    odooWriteDate: odooData.write_date ? new Date(odooData.write_date) : undefined,
    localVersion: 1,
    serverVersion: 1,
    hasConflict: false,
    fullContactData: JSON.stringify(odooData),
    isFavorite: false,
    tags: JSON.stringify(odooData.category_id ?? []),
  };

  const [created] = await database
    .insert(syncedContact)
    .values(contactData)
    .returning();

  return created;
}

/**
 * Updates a synced contact with new Odoo data
 */
export async function updateSyncedContactFromOdoo(
  contactId: string,
  userId: string,
  odooData: FullOdooContactData
): Promise<SyncedContact | null> {
  const updates: UpdateSyncedContactData = {
    name: odooData.name,
    email: odooData.email ?? undefined,
    phone: odooData.phone ?? undefined,
    mobile: odooData.mobile ?? undefined,
    website: odooData.website ?? undefined,
    street: odooData.street ?? undefined,
    street2: odooData.street2 ?? undefined,
    city: odooData.city ?? undefined,
    stateId: odooData.state_id?.[0] ?? undefined,
    stateName: odooData.state_id?.[1] ?? undefined,
    zip: odooData.zip ?? undefined,
    countryId: odooData.country_id?.[0] ?? undefined,
    countryName: odooData.country_id?.[1] ?? undefined,
    isCompany: odooData.is_company,
    companyType: odooData.company_type ?? undefined,
    parentId: odooData.parent_id?.[0] ?? undefined,
    parentName: odooData.parent_id?.[1] ?? undefined,
    jobTitle: odooData.function ?? undefined,
    vat: odooData.vat ?? undefined,
    ref: odooData.ref ?? undefined,
    isCustomer: (odooData.customer_rank ?? 0) > 0,
    isVendor: (odooData.supplier_rank ?? 0) > 0,
    syncStatus: "synced",
    lastSyncedAt: new Date(),
    odooWriteDate: odooData.write_date ? new Date(odooData.write_date) : undefined,
    serverVersion: sql`${syncedContact.serverVersion} + 1` as unknown as number,
    hasConflict: false,
    conflictData: undefined,
    fullContactData: JSON.stringify(odooData),
    tags: JSON.stringify(odooData.category_id ?? []),
    updatedAt: new Date(),
  };

  const [updated] = await database
    .update(syncedContact)
    .set(updates)
    .where(
      and(
        eq(syncedContact.id, contactId),
        eq(syncedContact.userId, userId)
      )
    )
    .returning();

  return updated ?? null;
}

/**
 * Updates a synced contact locally (creates pending changes)
 */
export async function updateSyncedContactLocally(
  contactId: string,
  userId: string,
  updates: Partial<Pick<SyncedContact, "name" | "email" | "phone" | "mobile" | "website" | "street" | "street2" | "city" | "zip" | "jobTitle" | "isFavorite">>
): Promise<SyncedContact | null> {
  // Get current contact to merge pending changes
  const current = await getSyncedContactById(contactId, userId);
  if (!current) return null;

  // Merge with existing pending changes
  const existingPending = current.pendingChanges
    ? JSON.parse(current.pendingChanges)
    : {};
  const mergedPending = { ...existingPending, ...updates };

  const [updated] = await database
    .update(syncedContact)
    .set({
      ...updates,
      syncStatus: "pending",
      pendingChanges: JSON.stringify(mergedPending),
      localVersion: sql`${syncedContact.localVersion} + 1` as unknown as number,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(syncedContact.id, contactId),
        eq(syncedContact.userId, userId)
      )
    )
    .returning();

  return updated ?? null;
}

/**
 * Deletes a synced contact
 */
export async function deleteSyncedContact(
  contactId: string,
  userId: string
): Promise<boolean> {
  const result = await database
    .delete(syncedContact)
    .where(
      and(
        eq(syncedContact.id, contactId),
        eq(syncedContact.userId, userId)
      )
    );

  return true;
}

// =============================================================================
// Sync Operations
// =============================================================================

/**
 * Fetches contacts from Odoo for syncing
 */
export async function fetchOdooContactsForSync(
  options: ContactSyncOptions = {}
): Promise<FullOdooContactData[]> {
  const {
    syncCustomers = true,
    syncVendors = true,
    companiesOnly = false,
    batchSize = DEFAULT_BATCH_SIZE,
    partnerIds,
  } = options;

  const client = await getOdooClient();

  // Build domain
  const domain: OdooDomain = [["active", "=", true]];

  // Filter by specific partner IDs if provided
  if (partnerIds && partnerIds.length > 0) {
    domain.push(["id", "in", partnerIds]);
  } else {
    // Filter by customer/vendor
    const typeFilters: OdooDomain = [];
    if (syncCustomers) {
      typeFilters.push(["customer_rank", ">", 0]);
    }
    if (syncVendors) {
      typeFilters.push(["supplier_rank", ">", 0]);
    }

    if (typeFilters.length === 1) {
      domain.push(typeFilters[0]);
    } else if (typeFilters.length > 1) {
      // Use OR for multiple type filters
      domain.push("|", ...typeFilters);
    }

    // Companies only filter
    if (companiesOnly) {
      domain.push(["is_company", "=", true]);
    }
  }

  const contacts = await client.searchRead<FullOdooContactData>(
    "res.partner",
    domain,
    {
      fields: CONTACT_SYNC_FIELDS,
      limit: batchSize,
      order: "write_date desc",
    }
  );

  return contacts;
}

/**
 * Fetches contacts from Odoo that have been modified since a given date
 */
export async function fetchModifiedOdooContacts(
  since: Date,
  options: ContactSyncOptions = {}
): Promise<FullOdooContactData[]> {
  const {
    syncCustomers = true,
    syncVendors = true,
    companiesOnly = false,
    batchSize = DEFAULT_BATCH_SIZE,
  } = options;

  const client = await getOdooClient();

  // Build domain
  const domain: OdooDomain = [
    ["active", "=", true],
    ["write_date", ">", since.toISOString()],
  ];

  // Filter by customer/vendor
  const typeFilters: OdooDomain = [];
  if (syncCustomers) {
    typeFilters.push(["customer_rank", ">", 0]);
  }
  if (syncVendors) {
    typeFilters.push(["supplier_rank", ">", 0]);
  }

  if (typeFilters.length === 1) {
    domain.push(typeFilters[0]);
  } else if (typeFilters.length > 1) {
    domain.push("|", ...typeFilters);
  }

  if (companiesOnly) {
    domain.push(["is_company", "=", true]);
  }

  const contacts = await client.searchRead<FullOdooContactData>(
    "res.partner",
    domain,
    {
      fields: CONTACT_SYNC_FIELDS,
      limit: batchSize,
      order: "write_date asc",
    }
  );

  return contacts;
}

/**
 * Performs a full sync of contacts for a user
 */
export async function performFullSync(
  userId: string,
  options: ContactSyncOptions = {}
): Promise<ContactSyncResult> {
  const errors: string[] = [];
  let created = 0;
  let updated = 0;
  let deleted = 0;
  let conflicts = 0;

  // Create sync log
  const syncLog = await createSyncLog({
    id: crypto.randomUUID(),
    userId,
    operationType: "full_sync",
    status: "in_progress",
  });

  try {
    // Get sync state
    const syncState = await getOrCreateSyncState(userId);

    // Merge options with user preferences
    const syncOptions: ContactSyncOptions = {
      syncCustomers: options.syncCustomers ?? syncState.syncCustomers,
      syncVendors: options.syncVendors ?? syncState.syncVendors,
      companiesOnly: options.companiesOnly ?? syncState.syncCompaniesOnly,
      batchSize: options.batchSize ?? DEFAULT_BATCH_SIZE,
    };

    // Fetch contacts from Odoo
    const odooContacts = await fetchOdooContactsForSync(syncOptions);

    // Get existing synced contacts
    const existingContacts = await getSyncedContacts(userId, { limit: 10000 });
    const existingByOdooId = new Map(
      existingContacts.map((c) => [c.odooPartnerId, c])
    );

    // Track which Odoo IDs we've seen (for deletion detection)
    const seenOdooIds = new Set<number>();

    // Process each Odoo contact
    for (const odooContact of odooContacts) {
      seenOdooIds.add(odooContact.id);

      const existing = existingByOdooId.get(odooContact.id);

      if (!existing) {
        // Create new contact
        try {
          await createSyncedContact(userId, odooContact);
          created++;
        } catch (error) {
          errors.push(`Failed to create contact ${odooContact.name}: ${error}`);
        }
      } else {
        // Check for conflicts
        const hasLocalChanges = existing.pendingChanges && existing.localVersion > existing.serverVersion;
        const odooWriteDate = odooContact.write_date ? new Date(odooContact.write_date) : null;
        const hasServerChanges = odooWriteDate && existing.odooWriteDate &&
          odooWriteDate > existing.odooWriteDate;

        if (hasLocalChanges && hasServerChanges) {
          // Conflict detected
          const conflictData: ContactConflictData = {
            clientVersion: {
              data: JSON.parse(existing.pendingChanges || "{}"),
              modifiedAt: existing.updatedAt.toISOString(),
              modifiedFields: Object.keys(JSON.parse(existing.pendingChanges || "{}")),
            },
            serverVersion: {
              data: odooContact as unknown as Partial<SyncedContact>,
              modifiedAt: odooContact.write_date ?? new Date().toISOString(),
            },
            conflictFields: Object.keys(JSON.parse(existing.pendingChanges || "{}")),
            detectedAt: new Date().toISOString(),
          };

          await database
            .update(syncedContact)
            .set({
              hasConflict: true,
              conflictData: JSON.stringify(conflictData),
              syncStatus: "conflict",
              updatedAt: new Date(),
            })
            .where(eq(syncedContact.id, existing.id));

          conflicts++;
        } else {
          // Update contact with Odoo data
          try {
            await updateSyncedContactFromOdoo(existing.id, userId, odooContact);
            updated++;
          } catch (error) {
            errors.push(`Failed to update contact ${odooContact.name}: ${error}`);
          }
        }
      }
    }

    // Delete contacts that no longer exist in Odoo (optional - could also mark as deleted)
    for (const existing of existingContacts) {
      if (!seenOdooIds.has(existing.odooPartnerId)) {
        await deleteSyncedContact(existing.id, userId);
        deleted++;
      }
    }

    // Update sync state
    await updateSyncState(userId, {
      lastFullSyncAt: new Date(),
      lastIncrementalSyncAt: new Date(),
      totalContactsSynced: created + updated,
      pendingConflicts: conflicts,
      pendingChanges: 0,
    });

    // Update sync log
    await updateSyncLog(syncLog.id, {
      status: "completed",
      completedAt: new Date(),
      contactsSynced: created + updated,
      contactsCreated: created,
      contactsUpdated: updated,
      contactsDeleted: deleted,
      conflictsDetected: conflicts,
      errorMessage: errors.length > 0 ? errors.join("; ") : undefined,
    });

    return {
      success: errors.length === 0,
      created,
      updated,
      deleted,
      conflicts,
      errors,
      syncLogId: syncLog.id,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    errors.push(errorMessage);

    await updateSyncLog(syncLog.id, {
      status: "failed",
      completedAt: new Date(),
      errorMessage,
      errorDetails: JSON.stringify({ stack: error instanceof Error ? error.stack : undefined }),
    });

    return {
      success: false,
      created,
      updated,
      deleted,
      conflicts,
      errors,
      syncLogId: syncLog.id,
    };
  }
}

/**
 * Performs an incremental sync of contacts for a user
 */
export async function performIncrementalSync(
  userId: string,
  options: ContactSyncOptions = {}
): Promise<ContactSyncResult> {
  const errors: string[] = [];
  let created = 0;
  let updated = 0;
  const deleted = 0;
  let conflicts = 0;

  // Create sync log
  const syncLog = await createSyncLog({
    id: crypto.randomUUID(),
    userId,
    operationType: "incremental",
    status: "in_progress",
  });

  try {
    // Get sync state
    const syncState = await getOrCreateSyncState(userId);

    // If no previous sync, do a full sync
    if (!syncState.lastIncrementalSyncAt) {
      return performFullSync(userId, options);
    }

    // Merge options with user preferences
    const syncOptions: ContactSyncOptions = {
      syncCustomers: options.syncCustomers ?? syncState.syncCustomers,
      syncVendors: options.syncVendors ?? syncState.syncVendors,
      companiesOnly: options.companiesOnly ?? syncState.syncCompaniesOnly,
      batchSize: options.batchSize ?? DEFAULT_BATCH_SIZE,
    };

    // Fetch modified contacts from Odoo
    const modifiedContacts = await fetchModifiedOdooContacts(
      syncState.lastIncrementalSyncAt,
      syncOptions
    );

    // Process each modified contact
    for (const odooContact of modifiedContacts) {
      const existing = await getSyncedContactByOdooId(odooContact.id, userId);

      if (!existing) {
        // Create new contact
        try {
          await createSyncedContact(userId, odooContact);
          created++;
        } catch (error) {
          errors.push(`Failed to create contact ${odooContact.name}: ${error}`);
        }
      } else {
        // Check for conflicts
        const hasLocalChanges = existing.pendingChanges && existing.localVersion > existing.serverVersion;

        if (hasLocalChanges) {
          // Conflict detected
          const conflictData: ContactConflictData = {
            clientVersion: {
              data: JSON.parse(existing.pendingChanges || "{}"),
              modifiedAt: existing.updatedAt.toISOString(),
              modifiedFields: Object.keys(JSON.parse(existing.pendingChanges || "{}")),
            },
            serverVersion: {
              data: odooContact as unknown as Partial<SyncedContact>,
              modifiedAt: odooContact.write_date ?? new Date().toISOString(),
            },
            conflictFields: Object.keys(JSON.parse(existing.pendingChanges || "{}")),
            detectedAt: new Date().toISOString(),
          };

          await database
            .update(syncedContact)
            .set({
              hasConflict: true,
              conflictData: JSON.stringify(conflictData),
              syncStatus: "conflict",
              updatedAt: new Date(),
            })
            .where(eq(syncedContact.id, existing.id));

          conflicts++;
        } else {
          // Update contact with Odoo data
          try {
            await updateSyncedContactFromOdoo(existing.id, userId, odooContact);
            updated++;
          } catch (error) {
            errors.push(`Failed to update contact ${odooContact.name}: ${error}`);
          }
        }
      }
    }

    // Update sync state
    await updateSyncState(userId, {
      lastIncrementalSyncAt: new Date(),
      totalContactsSynced: syncState.totalContactsSynced + created + updated,
      pendingConflicts: syncState.pendingConflicts + conflicts,
    });

    // Update sync log
    await updateSyncLog(syncLog.id, {
      status: "completed",
      completedAt: new Date(),
      contactsSynced: created + updated,
      contactsCreated: created,
      contactsUpdated: updated,
      contactsDeleted: deleted,
      conflictsDetected: conflicts,
      errorMessage: errors.length > 0 ? errors.join("; ") : undefined,
    });

    return {
      success: errors.length === 0,
      created,
      updated,
      deleted,
      conflicts,
      errors,
      syncLogId: syncLog.id,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    errors.push(errorMessage);

    await updateSyncLog(syncLog.id, {
      status: "failed",
      completedAt: new Date(),
      errorMessage,
      errorDetails: JSON.stringify({ stack: error instanceof Error ? error.stack : undefined }),
    });

    return {
      success: false,
      created,
      updated,
      deleted,
      conflicts,
      errors,
      syncLogId: syncLog.id,
    };
  }
}

// =============================================================================
// Conflict Resolution
// =============================================================================

/**
 * Gets all contacts with unresolved conflicts
 */
export async function getContactsWithConflicts(
  userId: string
): Promise<SyncedContact[]> {
  return database
    .select()
    .from(syncedContact)
    .where(
      and(
        eq(syncedContact.userId, userId),
        eq(syncedContact.hasConflict, true)
      )
    )
    .orderBy(desc(syncedContact.updatedAt));
}

/**
 * Resolves a contact conflict
 */
export async function resolveContactConflict(
  contactId: string,
  userId: string,
  resolution: ContactConflictResolution,
  mergedData?: Partial<SyncedContact>
): Promise<SyncedContact | null> {
  const contact = await getSyncedContactById(contactId, userId);
  if (!contact || !contact.hasConflict) {
    return null;
  }

  const conflictData: ContactConflictData = contact.conflictData
    ? JSON.parse(contact.conflictData)
    : null;

  if (!conflictData) {
    return null;
  }

  let updates: UpdateSyncedContactData;

  switch (resolution) {
    case "client_wins":
      // Keep local changes, mark as pending to push to server
      updates = {
        hasConflict: false,
        conflictData: undefined,
        syncStatus: "pending",
        updatedAt: new Date(),
      };
      break;

    case "server_wins":
      // Discard local changes, use server version
      updates = {
        ...(conflictData.serverVersion.data as UpdateSyncedContactData),
        hasConflict: false,
        conflictData: undefined,
        pendingChanges: undefined,
        syncStatus: "synced",
        localVersion: sql`${syncedContact.serverVersion}` as unknown as number,
        updatedAt: new Date(),
      };
      break;

    case "merge":
    case "manual":
      // Use provided merged data
      if (!mergedData) {
        throw new Error("Merged data required for merge/manual resolution");
      }
      updates = {
        ...mergedData,
        hasConflict: false,
        conflictData: undefined,
        pendingChanges: undefined,
        syncStatus: "pending", // Need to push merged version to server
        localVersion: sql`${syncedContact.localVersion} + 1` as unknown as number,
        updatedAt: new Date(),
      };
      break;

    default:
      throw new Error(`Unknown resolution strategy: ${resolution}`);
  }

  const [updated] = await database
    .update(syncedContact)
    .set(updates)
    .where(
      and(
        eq(syncedContact.id, contactId),
        eq(syncedContact.userId, userId)
      )
    )
    .returning();

  // Update sync state conflict count
  await database
    .update(contactSyncState)
    .set({
      pendingConflicts: sql`${contactSyncState.pendingConflicts} - 1`,
      updatedAt: new Date(),
    })
    .where(eq(contactSyncState.id, userId));

  return updated ?? null;
}

// =============================================================================
// Push Local Changes
// =============================================================================

/**
 * Gets contacts with pending local changes
 */
export async function getContactsWithPendingChanges(
  userId: string
): Promise<SyncedContact[]> {
  return database
    .select()
    .from(syncedContact)
    .where(
      and(
        eq(syncedContact.userId, userId),
        eq(syncedContact.syncStatus, "pending")
      )
    )
    .orderBy(asc(syncedContact.updatedAt));
}

/**
 * Pushes local changes to Odoo
 */
export async function pushContactChangesToOdoo(
  userId: string
): Promise<{ success: boolean; pushed: number; errors: string[] }> {
  const errors: string[] = [];
  let pushed = 0;

  try {
    const pendingContacts = await getContactsWithPendingChanges(userId);
    const client = await getOdooClient();

    for (const contact of pendingContacts) {
      if (!contact.pendingChanges) continue;

      const changes = JSON.parse(contact.pendingChanges);

      // Map local field names to Odoo field names
      const odooChanges: Record<string, XmlRpcValue> = {};
      const fieldMapping: Record<string, string> = {
        name: "name",
        email: "email",
        phone: "phone",
        mobile: "mobile",
        website: "website",
        street: "street",
        street2: "street2",
        city: "city",
        zip: "zip",
        jobTitle: "function",
      };

      for (const [localField, odooField] of Object.entries(fieldMapping)) {
        if (changes[localField] !== undefined) {
          odooChanges[odooField] = changes[localField];
        }
      }

      if (Object.keys(odooChanges).length > 0) {
        try {
          await client.write("res.partner", [contact.odooPartnerId], odooChanges);

          // Mark as synced
          await database
            .update(syncedContact)
            .set({
              syncStatus: "synced",
              pendingChanges: undefined,
              serverVersion: sql`${syncedContact.localVersion}`,
              lastSyncedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(syncedContact.id, contact.id));

          pushed++;
        } catch (error) {
          errors.push(`Failed to push changes for ${contact.name}: ${error}`);

          // Mark as error
          await database
            .update(syncedContact)
            .set({
              syncStatus: "error",
              updatedAt: new Date(),
            })
            .where(eq(syncedContact.id, contact.id));
        }
      }
    }

    return { success: errors.length === 0, pushed, errors };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    errors.push(errorMessage);
    return { success: false, pushed, errors };
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Counts synced contacts for a user
 */
export async function countSyncedContacts(
  userId: string,
  filters?: {
    status?: ContactSyncStatus;
    isCustomer?: boolean;
    isVendor?: boolean;
    hasConflict?: boolean;
  }
): Promise<number> {
  const conditions = [eq(syncedContact.userId, userId)];

  if (filters?.status) {
    conditions.push(eq(syncedContact.syncStatus, filters.status));
  }
  if (filters?.isCustomer !== undefined) {
    conditions.push(eq(syncedContact.isCustomer, filters.isCustomer));
  }
  if (filters?.isVendor !== undefined) {
    conditions.push(eq(syncedContact.isVendor, filters.isVendor));
  }
  if (filters?.hasConflict !== undefined) {
    conditions.push(eq(syncedContact.hasConflict, filters.hasConflict));
  }

  const [result] = await database
    .select({ count: sql<number>`count(*)::int` })
    .from(syncedContact)
    .where(and(...conditions));

  return result?.count ?? 0;
}

/**
 * Searches synced contacts
 */
export async function searchSyncedContacts(
  userId: string,
  query: string,
  limit: number = 20
): Promise<SyncedContact[]> {
  const searchPattern = `%${query}%`;

  return database
    .select()
    .from(syncedContact)
    .where(
      and(
        eq(syncedContact.userId, userId),
        or(
          sql`${syncedContact.name} ILIKE ${searchPattern}`,
          sql`${syncedContact.email} ILIKE ${searchPattern}`,
          sql`${syncedContact.phone} ILIKE ${searchPattern}`,
          sql`${syncedContact.mobile} ILIKE ${searchPattern}`,
          sql`${syncedContact.city} ILIKE ${searchPattern}`
        )
      )
    )
    .orderBy(asc(syncedContact.name))
    .limit(limit);
}

/**
 * Toggles favorite status for a contact
 */
export async function toggleContactFavorite(
  contactId: string,
  userId: string
): Promise<SyncedContact | null> {
  const contact = await getSyncedContactById(contactId, userId);
  if (!contact) return null;

  const [updated] = await database
    .update(syncedContact)
    .set({
      isFavorite: !contact.isFavorite,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(syncedContact.id, contactId),
        eq(syncedContact.userId, userId)
      )
    )
    .returning();

  return updated ?? null;
}

/**
 * Gets favorite contacts for a user
 */
export async function getFavoriteContacts(
  userId: string
): Promise<SyncedContact[]> {
  return database
    .select()
    .from(syncedContact)
    .where(
      and(
        eq(syncedContact.userId, userId),
        eq(syncedContact.isFavorite, true)
      )
    )
    .orderBy(asc(syncedContact.name));
}

/**
 * Clears all synced contacts for a user (used when logging out or resetting)
 */
export async function clearAllSyncedContacts(userId: string): Promise<void> {
  await database
    .delete(syncedContact)
    .where(eq(syncedContact.userId, userId));

  // Reset sync state
  await updateSyncState(userId, {
    lastFullSyncAt: undefined,
    lastIncrementalSyncAt: undefined,
    lastSyncToken: undefined,
    totalContactsSynced: 0,
    pendingConflicts: 0,
    pendingChanges: 0,
  });
}
