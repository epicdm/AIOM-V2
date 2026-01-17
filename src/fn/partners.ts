/**
 * Server Functions for Partners Data
 *
 * Provides server-side functions for retrieving customer and vendor data
 * from Odoo partners module. Includes contact information, account balances,
 * and relationship history.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authenticatedMiddleware } from "./middleware";
import { privateEnv } from "~/config/privateEnv";
import { initOdooClient } from "~/data-access/odoo";
import {
  findCustomers,
  findCustomersWithBalance,
  getCustomerById,
  getCustomerWithBalance,
  findVendors,
  findVendorsWithBalance,
  getVendorById,
  getVendorWithBalance,
  getPartnerDetail,
  getPartnerWithBalance,
  getPartnerContactInfo,
  getPartnerRelationshipHistory,
  searchPartners,
  countPartners,
  getPartnerSummary,
  getPartnerChildContacts,
  getTopCustomersByRevenue,
  getTopVendorsByPurchases,
  getInactiveCustomers,
} from "~/data-access/partners";

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Gets the Odoo configuration and initializes client
 */
async function ensureOdooClient() {
  const url = privateEnv.ODOO_URL;
  const database = privateEnv.ODOO_DATABASE;
  const username = privateEnv.ODOO_USERNAME;
  const password = privateEnv.ODOO_PASSWORD;

  if (!url || !database || !username || !password) {
    throw new Error(
      "Odoo configuration is incomplete. Please check environment variables."
    );
  }

  await initOdooClient({ url, database, username, password });
}

// =============================================================================
// Customer Functions
// =============================================================================

/**
 * Get all customers
 */
export const getCustomersFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z
      .object({
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      })
      .optional()
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    await ensureOdooClient();
    const options = data || { limit: 50, offset: 0 };
    const customers = await findCustomers([], options);
    return { customers };
  });

/**
 * Get customers with balance information
 */
export const getCustomersWithBalanceFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z
      .object({
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      })
      .optional()
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    await ensureOdooClient();
    const options = data || { limit: 50, offset: 0 };
    const customers = await findCustomersWithBalance([], options);
    return { customers };
  });

/**
 * Get customer by ID
 */
export const getCustomerByIdFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      customerId: z.number().int().positive("Invalid customer ID"),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    await ensureOdooClient();
    const customer = await getCustomerById(data.customerId);

    if (!customer) {
      throw new Error("Customer not found");
    }

    return { customer };
  });

/**
 * Get customer with balance
 */
export const getCustomerWithBalanceFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      customerId: z.number().int().positive("Invalid customer ID"),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    await ensureOdooClient();
    const customer = await getCustomerWithBalance(data.customerId);

    if (!customer) {
      throw new Error("Customer not found");
    }

    return { customer };
  });

// =============================================================================
// Vendor Functions
// =============================================================================

/**
 * Get all vendors
 */
export const getVendorsFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z
      .object({
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      })
      .optional()
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    await ensureOdooClient();
    const options = data || { limit: 50, offset: 0 };
    const vendors = await findVendors([], options);
    return { vendors };
  });

/**
 * Get vendors with balance information
 */
export const getVendorsWithBalanceFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z
      .object({
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      })
      .optional()
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    await ensureOdooClient();
    const options = data || { limit: 50, offset: 0 };
    const vendors = await findVendorsWithBalance([], options);
    return { vendors };
  });

/**
 * Get vendor by ID
 */
export const getVendorByIdFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      vendorId: z.number().int().positive("Invalid vendor ID"),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    await ensureOdooClient();
    const vendor = await getVendorById(data.vendorId);

    if (!vendor) {
      throw new Error("Vendor not found");
    }

    return { vendor };
  });

/**
 * Get vendor with balance
 */
export const getVendorWithBalanceFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      vendorId: z.number().int().positive("Invalid vendor ID"),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    await ensureOdooClient();
    const vendor = await getVendorWithBalance(data.vendorId);

    if (!vendor) {
      throw new Error("Vendor not found");
    }

    return { vendor };
  });

// =============================================================================
// General Partner Functions
// =============================================================================

/**
 * Get partner details by ID
 */
export const getPartnerDetailFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      partnerId: z.number().int().positive("Invalid partner ID"),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    await ensureOdooClient();
    const partner = await getPartnerDetail(data.partnerId);

    if (!partner) {
      throw new Error("Partner not found");
    }

    return { partner };
  });

/**
 * Get partner with balance
 */
export const getPartnerWithBalanceFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      partnerId: z.number().int().positive("Invalid partner ID"),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    await ensureOdooClient();
    const partner = await getPartnerWithBalance(data.partnerId);

    if (!partner) {
      throw new Error("Partner not found");
    }

    return { partner };
  });

/**
 * Get partner contact information
 */
export const getPartnerContactInfoFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      partnerId: z.number().int().positive("Invalid partner ID"),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    await ensureOdooClient();
    const contactInfo = await getPartnerContactInfo(data.partnerId);

    if (!contactInfo) {
      throw new Error("Partner not found");
    }

    return { contactInfo };
  });

/**
 * Get partner relationship history
 */
export const getPartnerRelationshipHistoryFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      partnerId: z.number().int().positive("Invalid partner ID"),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    await ensureOdooClient();
    const history = await getPartnerRelationshipHistory(data.partnerId);

    if (!history) {
      throw new Error("Partner not found");
    }

    return { history };
  });

/**
 * Get comprehensive partner summary
 */
export const getPartnerSummaryFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      partnerId: z.number().int().positive("Invalid partner ID"),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    await ensureOdooClient();
    const summary = await getPartnerSummary(data.partnerId);

    if (!summary) {
      throw new Error("Partner not found");
    }

    return summary;
  });

/**
 * Get child contacts for a company partner
 */
export const getPartnerChildContactsFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      partnerId: z.number().int().positive("Invalid partner ID"),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    await ensureOdooClient();
    const contacts = await getPartnerChildContacts(data.partnerId);
    return { contacts };
  });

// =============================================================================
// Search Functions
// =============================================================================

/**
 * Search partners with filters
 */
export const searchPartnersFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z
      .object({
        name: z.string().optional(),
        email: z.string().optional(),
        type: z.enum(["customer", "vendor", "both", "all"]).optional().default("all"),
        companyType: z.enum(["company", "person", "all"]).optional().default("all"),
        active: z.boolean().optional(),
        countryId: z.number().int().positive().optional(),
        stateId: z.number().int().positive().optional(),
        city: z.string().optional(),
        userId: z.number().int().positive().optional(),
        categoryIds: z.array(z.number().int().positive()).optional(),
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      })
      .optional()
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    await ensureOdooClient();
    const { limit = 50, offset = 0, ...filters } = data || {};
    const partners = await searchPartners(filters, { limit, offset });
    return { partners };
  });

/**
 * Count partners matching filters
 */
export const countPartnersFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z
      .object({
        name: z.string().optional(),
        email: z.string().optional(),
        type: z.enum(["customer", "vendor", "both", "all"]).optional().default("all"),
        companyType: z.enum(["company", "person", "all"]).optional().default("all"),
        active: z.boolean().optional(),
        countryId: z.number().int().positive().optional(),
        stateId: z.number().int().positive().optional(),
        city: z.string().optional(),
        userId: z.number().int().positive().optional(),
        categoryIds: z.array(z.number().int().positive()).optional(),
      })
      .optional()
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    await ensureOdooClient();
    const filters = data || {};
    const count = await countPartners(filters);
    return { count };
  });

// =============================================================================
// Analytics Functions
// =============================================================================

/**
 * Get top customers by revenue
 */
export const getTopCustomersByRevenueFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z
      .object({
        limit: z.number().optional().default(10),
      })
      .optional()
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    await ensureOdooClient();
    const limit = data?.limit ?? 10;
    const topCustomers = await getTopCustomersByRevenue(limit);
    return { topCustomers };
  });

/**
 * Get top vendors by purchase volume
 */
export const getTopVendorsByPurchasesFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z
      .object({
        limit: z.number().optional().default(10),
      })
      .optional()
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    await ensureOdooClient();
    const limit = data?.limit ?? 10;
    const topVendors = await getTopVendorsByPurchases(limit);
    return { topVendors };
  });

/**
 * Get inactive customers
 */
export const getInactiveCustomersFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z
      .object({
        inactiveDays: z.number().optional().default(90),
        limit: z.number().optional().default(50),
      })
      .optional()
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    await ensureOdooClient();
    const { inactiveDays = 90, limit = 50 } = data || {};
    const inactiveCustomers = await getInactiveCustomers(inactiveDays, limit);
    return { inactiveCustomers };
  });
