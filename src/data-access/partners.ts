/**
 * Partners Data Access Layer
 *
 * Provides data access functions for retrieving customer and vendor data
 * from Odoo partners module. Includes contact information, account balances,
 * and relationship history.
 */

import {
  type OdooDomain,
  type SearchReadOptions,
  type ResPartner,
  type PartnerDetail,
  type PartnerWithBalance,
  type PartnerRelationshipHistory,
  type PartnerContactInfo,
  type PartnerSummary,
  type PartnerSearchFilters,
  type SaleOrder,
  type PurchaseOrder,
  type AccountMove,
} from "~/lib/odoo";
import { getOdooClient } from "./odoo";
import {
  findInvoicesByPartner,
  getPartnerBalance,
} from "./accounting";

// =============================================================================
// Constants
// =============================================================================

/**
 * Default fields to retrieve for partner summaries
 */
const PARTNER_SUMMARY_FIELDS = [
  "id",
  "name",
  "email",
  "phone",
  "city",
  "country_id",
  "is_company",
  "customer_rank",
  "supplier_rank",
  "active",
];

/**
 * Extended fields for partner details
 */
const PARTNER_DETAIL_FIELDS = [
  "id",
  "name",
  "email",
  "phone",
  "mobile",
  "street",
  "street2",
  "city",
  "zip",
  "country_id",
  "state_id",
  "is_company",
  "company_type",
  "parent_id",
  "child_ids",
  "active",
  "comment",
  "website",
  "vat",
  "create_date",
  "write_date",
  "customer_rank",
  "supplier_rank",
  "credit_limit",
  "credit",
  "property_payment_term_id",
  "property_supplier_payment_term_id",
  "sale_order_count",
  "purchase_order_count",
  "total_invoiced",
  "company_id",
  "title",
  "function",
  "category_id",
  "user_id",
  "lang",
  "tz",
  "ref",
  "industry_id",
];

/**
 * Contact-specific fields
 */
const PARTNER_CONTACT_FIELDS = [
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
];

// =============================================================================
// Customer Operations
// =============================================================================

/**
 * Finds all customer partners (customer_rank > 0)
 */
export async function findCustomers(
  domain: OdooDomain = [],
  options: SearchReadOptions = {}
): Promise<PartnerDetail[]> {
  const client = await getOdooClient();

  const customerDomain: OdooDomain = [
    ["customer_rank", ">", 0],
    ["active", "=", true],
    ...domain,
  ];

  return client.searchRead<PartnerDetail>("res.partner", customerDomain, {
    fields: options.fields || PARTNER_DETAIL_FIELDS,
    order: "name asc",
    ...options,
  });
}

/**
 * Finds customers with their account balances
 */
export async function findCustomersWithBalance(
  domain: OdooDomain = [],
  options: SearchReadOptions = {}
): Promise<PartnerWithBalance[]> {
  const customers = await findCustomers(domain, options);

  const customersWithBalance: PartnerWithBalance[] = await Promise.all(
    customers.map(async (customer) => {
      const balance = await getPartnerBalance(customer.id);
      return {
        ...customer,
        totalReceivable: balance.totalReceivable,
        totalPayable: balance.totalPayable,
        creditUsed: balance.totalReceivable,
        creditAvailable: (customer.credit_limit ?? 0) - balance.totalReceivable,
        openInvoicesCount: balance.openInvoicesCount,
        overdueAmount: balance.overdueAmount,
        currency: balance.currency,
      };
    })
  );

  return customersWithBalance;
}

/**
 * Gets a single customer by ID with full details
 */
export async function getCustomerById(
  customerId: number
): Promise<PartnerDetail | null> {
  const client = await getOdooClient();

  const results = await client.read<PartnerDetail>("res.partner", [customerId], {
    fields: PARTNER_DETAIL_FIELDS,
  });

  const partner = results[0];
  if (!partner) return null;

  // Verify it's a customer
  if ((partner.customer_rank ?? 0) <= 0) {
    return null;
  }

  return partner;
}

/**
 * Gets customer with balance information
 */
export async function getCustomerWithBalance(
  customerId: number
): Promise<PartnerWithBalance | null> {
  const customer = await getCustomerById(customerId);
  if (!customer) return null;

  const balance = await getPartnerBalance(customerId);

  return {
    ...customer,
    totalReceivable: balance.totalReceivable,
    totalPayable: balance.totalPayable,
    creditUsed: balance.totalReceivable,
    creditAvailable: (customer.credit_limit ?? 0) - balance.totalReceivable,
    openInvoicesCount: balance.openInvoicesCount,
    overdueAmount: balance.overdueAmount,
    currency: balance.currency,
  };
}

// =============================================================================
// Vendor Operations
// =============================================================================

/**
 * Finds all vendor partners (supplier_rank > 0)
 */
export async function findVendors(
  domain: OdooDomain = [],
  options: SearchReadOptions = {}
): Promise<PartnerDetail[]> {
  const client = await getOdooClient();

  const vendorDomain: OdooDomain = [
    ["supplier_rank", ">", 0],
    ["active", "=", true],
    ...domain,
  ];

  return client.searchRead<PartnerDetail>("res.partner", vendorDomain, {
    fields: options.fields || PARTNER_DETAIL_FIELDS,
    order: "name asc",
    ...options,
  });
}

/**
 * Finds vendors with their account balances
 */
export async function findVendorsWithBalance(
  domain: OdooDomain = [],
  options: SearchReadOptions = {}
): Promise<PartnerWithBalance[]> {
  const vendors = await findVendors(domain, options);

  const vendorsWithBalance: PartnerWithBalance[] = await Promise.all(
    vendors.map(async (vendor) => {
      const balance = await getPartnerBalance(vendor.id);
      return {
        ...vendor,
        totalReceivable: balance.totalReceivable,
        totalPayable: balance.totalPayable,
        creditUsed: 0,
        creditAvailable: 0,
        openInvoicesCount: balance.openInvoicesCount,
        overdueAmount: balance.overdueAmount,
        currency: balance.currency,
      };
    })
  );

  return vendorsWithBalance;
}

/**
 * Gets a single vendor by ID with full details
 */
export async function getVendorById(
  vendorId: number
): Promise<PartnerDetail | null> {
  const client = await getOdooClient();

  const results = await client.read<PartnerDetail>("res.partner", [vendorId], {
    fields: PARTNER_DETAIL_FIELDS,
  });

  const partner = results[0];
  if (!partner) return null;

  // Verify it's a vendor
  if ((partner.supplier_rank ?? 0) <= 0) {
    return null;
  }

  return partner;
}

/**
 * Gets vendor with balance information
 */
export async function getVendorWithBalance(
  vendorId: number
): Promise<PartnerWithBalance | null> {
  const vendor = await getVendorById(vendorId);
  if (!vendor) return null;

  const balance = await getPartnerBalance(vendorId);

  return {
    ...vendor,
    totalReceivable: balance.totalReceivable,
    totalPayable: balance.totalPayable,
    creditUsed: 0,
    creditAvailable: 0,
    openInvoicesCount: balance.openInvoicesCount,
    overdueAmount: balance.overdueAmount,
    currency: balance.currency,
  };
}

// =============================================================================
// General Partner Operations
// =============================================================================

/**
 * Gets a partner by ID with full details
 */
export async function getPartnerDetail(
  partnerId: number
): Promise<PartnerDetail | null> {
  const client = await getOdooClient();

  const results = await client.read<PartnerDetail>("res.partner", [partnerId], {
    fields: PARTNER_DETAIL_FIELDS,
  });

  return results[0] || null;
}

/**
 * Gets a partner with balance information
 */
export async function getPartnerWithBalance(
  partnerId: number
): Promise<PartnerWithBalance | null> {
  const partner = await getPartnerDetail(partnerId);
  if (!partner) return null;

  const balance = await getPartnerBalance(partnerId);

  const isCustomer = (partner.customer_rank ?? 0) > 0;

  return {
    ...partner,
    totalReceivable: balance.totalReceivable,
    totalPayable: balance.totalPayable,
    creditUsed: isCustomer ? balance.totalReceivable : 0,
    creditAvailable: isCustomer
      ? (partner.credit_limit ?? 0) - balance.totalReceivable
      : 0,
    openInvoicesCount: balance.openInvoicesCount,
    overdueAmount: balance.overdueAmount,
    currency: balance.currency,
  };
}

/**
 * Gets contact information for a partner
 */
export async function getPartnerContactInfo(
  partnerId: number
): Promise<PartnerContactInfo | null> {
  const client = await getOdooClient();

  const results = await client.read<ResPartner>("res.partner", [partnerId], {
    fields: PARTNER_CONTACT_FIELDS,
  });

  const partner = results[0];
  if (!partner) return null;

  return {
    id: partner.id,
    name: partner.name,
    email: partner.email === false ? null : partner.email || null,
    phone: partner.phone === false ? null : partner.phone || null,
    mobile: partner.mobile === false ? null : partner.mobile || null,
    website: partner.website === false ? null : partner.website || null,
    address: {
      street: partner.street === false ? null : partner.street || null,
      street2: partner.street2 === false ? null : partner.street2 || null,
      city: partner.city === false ? null : partner.city || null,
      state: Array.isArray(partner.state_id) ? partner.state_id[1] : null,
      stateId: Array.isArray(partner.state_id) ? partner.state_id[0] : null,
      zip: partner.zip === false ? null : partner.zip || null,
      country: Array.isArray(partner.country_id) ? partner.country_id[1] : null,
      countryId: Array.isArray(partner.country_id) ? partner.country_id[0] : null,
    },
    isCompany: partner.is_company ?? false,
    companyType: partner.company_type || null,
    parentCompany: Array.isArray(partner.parent_id)
      ? { id: partner.parent_id[0], name: partner.parent_id[1] }
      : null,
    childContacts: partner.child_ids || [],
    jobTitle: partner.function === false ? null : (partner.function as string) || null,
    vat: partner.vat === false ? null : partner.vat || null,
    ref: partner.ref === false ? null : (partner.ref as string) || null,
    language: partner.lang === false ? null : (partner.lang as string) || null,
    timezone: partner.tz === false ? null : (partner.tz as string) || null,
  };
}

// =============================================================================
// Relationship History Operations
// =============================================================================

/**
 * Gets relationship history for a partner
 */
export async function getPartnerRelationshipHistory(
  partnerId: number
): Promise<PartnerRelationshipHistory | null> {
  const client = await getOdooClient();

  // Get partner info
  const partners = await client.read<PartnerDetail>("res.partner", [partnerId], {
    fields: ["id", "name", "sale_order_count", "purchase_order_count"],
  });

  const partner = partners[0];
  if (!partner) return null;

  // Get sale orders for this partner
  const saleOrders = await client.searchRead<SaleOrder>(
    "sale.order",
    [
      ["partner_id", "=", partnerId],
      ["state", "in", ["sale", "done"]],
    ],
    {
      fields: ["id", "date_order", "amount_total"],
      order: "date_order asc",
    }
  );

  // Get purchase orders for this partner
  const purchaseOrders = await client.searchRead<PurchaseOrder>(
    "purchase.order",
    [
      ["partner_id", "=", partnerId],
      ["state", "in", ["purchase", "done"]],
    ],
    {
      fields: ["id", "date_order", "amount_total"],
      order: "date_order asc",
    }
  );

  // Get invoices for this partner
  const invoices = await findInvoicesByPartner(partnerId, "all");

  // Calculate totals
  const totalRevenue = saleOrders.reduce(
    (sum, order) => sum + (order.amount_total ?? 0),
    0
  );
  const totalPurchased = purchaseOrders.reduce(
    (sum, order) => sum + (order.amount_total ?? 0),
    0
  );

  // Find first and last transaction dates
  const allDates: string[] = [];
  saleOrders.forEach((o) => o.date_order && allDates.push(o.date_order));
  purchaseOrders.forEach((o) => o.date_order && allDates.push(o.date_order));
  invoices.forEach((i) => i.invoice_date && allDates.push(i.invoice_date));

  allDates.sort();

  const firstTransactionDate = allDates[0] || null;
  const lastTransactionDate = allDates[allDates.length - 1] || null;

  // Calculate days since last transaction
  let daysSinceLastTransaction: number | null = null;
  if (lastTransactionDate) {
    const lastDate = new Date(lastTransactionDate);
    const today = new Date();
    daysSinceLastTransaction = Math.floor(
      (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  // Calculate average order value
  const totalOrders = saleOrders.length + purchaseOrders.length;
  const averageOrderValue =
    totalOrders > 0
      ? (totalRevenue + totalPurchased) / totalOrders
      : null;

  // Determine status
  let status: 'active' | 'inactive' | 'new' = 'new';
  if (daysSinceLastTransaction !== null) {
    if (daysSinceLastTransaction <= 90) {
      status = 'active';
    } else {
      status = 'inactive';
    }
  }

  return {
    partnerId: partner.id,
    partnerName: partner.name,
    firstTransactionDate,
    lastTransactionDate,
    totalSaleOrders: saleOrders.length,
    totalPurchaseOrders: purchaseOrders.length,
    totalInvoices: invoices.length,
    totalRevenue,
    totalPurchased,
    averageOrderValue,
    status,
    daysSinceLastTransaction,
  };
}

// =============================================================================
// Search Operations
// =============================================================================

/**
 * Searches partners with various filters
 */
export async function searchPartners(
  filters: PartnerSearchFilters,
  options: SearchReadOptions = {}
): Promise<PartnerSummary[]> {
  const client = await getOdooClient();

  const domain: OdooDomain = [];

  // Name filter (partial match)
  if (filters.name) {
    domain.push(["name", "ilike", filters.name]);
  }

  // Email filter (partial match)
  if (filters.email) {
    domain.push(["email", "ilike", filters.email]);
  }

  // Type filter
  if (filters.type === "customer") {
    domain.push(["customer_rank", ">", 0]);
  } else if (filters.type === "vendor") {
    domain.push(["supplier_rank", ">", 0]);
  } else if (filters.type === "both") {
    domain.push(["customer_rank", ">", 0]);
    domain.push(["supplier_rank", ">", 0]);
  }

  // Company type filter
  if (filters.companyType === "company") {
    domain.push(["is_company", "=", true]);
  } else if (filters.companyType === "person") {
    domain.push(["is_company", "=", false]);
  }

  // Active filter
  if (filters.active !== undefined) {
    domain.push(["active", "=", filters.active]);
  }

  // Location filters
  if (filters.countryId) {
    domain.push(["country_id", "=", filters.countryId]);
  }
  if (filters.stateId) {
    domain.push(["state_id", "=", filters.stateId]);
  }
  if (filters.city) {
    domain.push(["city", "ilike", filters.city]);
  }

  // User filter
  if (filters.userId) {
    domain.push(["user_id", "=", filters.userId]);
  }

  // Category filter
  if (filters.categoryIds && filters.categoryIds.length > 0) {
    domain.push(["category_id", "in", filters.categoryIds]);
  }

  const partners = await client.searchRead<PartnerDetail>(
    "res.partner",
    domain,
    {
      fields: PARTNER_SUMMARY_FIELDS,
      order: "name asc",
      ...options,
    }
  );

  return partners.map((partner) => ({
    id: partner.id,
    name: partner.name,
    email: partner.email === false ? null : partner.email || null,
    phone: partner.phone === false ? null : partner.phone || null,
    city: partner.city === false ? null : partner.city || null,
    country: Array.isArray(partner.country_id) ? partner.country_id[1] : null,
    isCompany: partner.is_company ?? false,
    isCustomer: (partner.customer_rank ?? 0) > 0,
    isVendor: (partner.supplier_rank ?? 0) > 0,
    active: partner.active ?? true,
  }));
}

/**
 * Counts partners matching filters
 */
export async function countPartners(
  filters: PartnerSearchFilters
): Promise<number> {
  const client = await getOdooClient();

  const domain: OdooDomain = [];

  if (filters.name) {
    domain.push(["name", "ilike", filters.name]);
  }
  if (filters.email) {
    domain.push(["email", "ilike", filters.email]);
  }
  if (filters.type === "customer") {
    domain.push(["customer_rank", ">", 0]);
  } else if (filters.type === "vendor") {
    domain.push(["supplier_rank", ">", 0]);
  } else if (filters.type === "both") {
    domain.push(["customer_rank", ">", 0]);
    domain.push(["supplier_rank", ">", 0]);
  }
  if (filters.companyType === "company") {
    domain.push(["is_company", "=", true]);
  } else if (filters.companyType === "person") {
    domain.push(["is_company", "=", false]);
  }
  if (filters.active !== undefined) {
    domain.push(["active", "=", filters.active]);
  }
  if (filters.countryId) {
    domain.push(["country_id", "=", filters.countryId]);
  }
  if (filters.stateId) {
    domain.push(["state_id", "=", filters.stateId]);
  }
  if (filters.city) {
    domain.push(["city", "ilike", filters.city]);
  }
  if (filters.userId) {
    domain.push(["user_id", "=", filters.userId]);
  }
  if (filters.categoryIds && filters.categoryIds.length > 0) {
    domain.push(["category_id", "in", filters.categoryIds]);
  }

  return client.searchCount("res.partner", domain);
}

// =============================================================================
// Summary Operations
// =============================================================================

/**
 * Gets a summary of partner data for a given partner
 */
export async function getPartnerSummary(
  partnerId: number
): Promise<{
  partner: PartnerDetail;
  balance: PartnerWithBalance;
  history: PartnerRelationshipHistory;
  contactInfo: PartnerContactInfo;
} | null> {
  const [partner, balance, history, contactInfo] = await Promise.all([
    getPartnerDetail(partnerId),
    getPartnerWithBalance(partnerId),
    getPartnerRelationshipHistory(partnerId),
    getPartnerContactInfo(partnerId),
  ]);

  if (!partner || !balance || !history || !contactInfo) {
    return null;
  }

  return {
    partner,
    balance,
    history,
    contactInfo,
  };
}

/**
 * Gets all child contacts for a company partner
 */
export async function getPartnerChildContacts(
  partnerId: number
): Promise<PartnerContactInfo[]> {
  const client = await getOdooClient();

  const contacts = await client.searchRead<ResPartner>(
    "res.partner",
    [
      ["parent_id", "=", partnerId],
      ["active", "=", true],
    ],
    {
      fields: PARTNER_CONTACT_FIELDS,
      order: "name asc",
    }
  );

  return contacts.map((partner) => ({
    id: partner.id,
    name: partner.name,
    email: partner.email === false ? null : partner.email || null,
    phone: partner.phone === false ? null : partner.phone || null,
    mobile: partner.mobile === false ? null : partner.mobile || null,
    website: partner.website === false ? null : partner.website || null,
    address: {
      street: partner.street === false ? null : partner.street || null,
      street2: partner.street2 === false ? null : partner.street2 || null,
      city: partner.city === false ? null : partner.city || null,
      state: Array.isArray(partner.state_id) ? partner.state_id[1] : null,
      stateId: Array.isArray(partner.state_id) ? partner.state_id[0] : null,
      zip: partner.zip === false ? null : partner.zip || null,
      country: Array.isArray(partner.country_id) ? partner.country_id[1] : null,
      countryId: Array.isArray(partner.country_id) ? partner.country_id[0] : null,
    },
    isCompany: partner.is_company ?? false,
    companyType: partner.company_type || null,
    parentCompany: Array.isArray(partner.parent_id)
      ? { id: partner.parent_id[0], name: partner.parent_id[1] }
      : null,
    childContacts: partner.child_ids || [],
    jobTitle: partner.function === false ? null : (partner.function as string) || null,
    vat: partner.vat === false ? null : partner.vat || null,
    ref: partner.ref === false ? null : (partner.ref as string) || null,
    language: partner.lang === false ? null : (partner.lang as string) || null,
    timezone: partner.tz === false ? null : (partner.tz as string) || null,
  }));
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Gets top customers by revenue
 */
export async function getTopCustomersByRevenue(
  limit: number = 10
): Promise<Array<{ partnerId: number; partnerName: string; totalRevenue: number }>> {
  const customers = await findCustomers([], { limit: 100 });

  const customersWithRevenue = await Promise.all(
    customers.map(async (customer) => {
      const history = await getPartnerRelationshipHistory(customer.id);
      return {
        partnerId: customer.id,
        partnerName: customer.name,
        totalRevenue: history?.totalRevenue ?? 0,
      };
    })
  );

  return customersWithRevenue
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, limit);
}

/**
 * Gets top vendors by purchase volume
 */
export async function getTopVendorsByPurchases(
  limit: number = 10
): Promise<Array<{ partnerId: number; partnerName: string; totalPurchased: number }>> {
  const vendors = await findVendors([], { limit: 100 });

  const vendorsWithPurchases = await Promise.all(
    vendors.map(async (vendor) => {
      const history = await getPartnerRelationshipHistory(vendor.id);
      return {
        partnerId: vendor.id,
        partnerName: vendor.name,
        totalPurchased: history?.totalPurchased ?? 0,
      };
    })
  );

  return vendorsWithPurchases
    .sort((a, b) => b.totalPurchased - a.totalPurchased)
    .slice(0, limit);
}

/**
 * Gets inactive customers (no transactions in last N days)
 */
export async function getInactiveCustomers(
  inactiveDays: number = 90,
  limit: number = 50
): Promise<Array<{ partnerId: number; partnerName: string; daysSinceLastTransaction: number }>> {
  const customers = await findCustomers([], { limit: 200 });

  const customersWithActivity = await Promise.all(
    customers.map(async (customer) => {
      const history = await getPartnerRelationshipHistory(customer.id);
      return {
        partnerId: customer.id,
        partnerName: customer.name,
        daysSinceLastTransaction: history?.daysSinceLastTransaction ?? Infinity,
      };
    })
  );

  return customersWithActivity
    .filter((c) => c.daysSinceLastTransaction > inactiveDays)
    .sort((a, b) => b.daysSinceLastTransaction - a.daysSinceLastTransaction)
    .slice(0, limit);
}
