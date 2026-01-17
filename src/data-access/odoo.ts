/**
 * Odoo Data Access Layer
 *
 * Provides convenient data access functions for common Odoo operations.
 * Uses the Odoo XML-RPC client library internally.
 */

import {
  OdooClient,
  createOdooClient,
  type OdooConfig,
  type OdooDomain,
  type SearchReadOptions,
  type ResPartner,
  type ProductProduct,
  type SaleOrder,
  type SaleOrderLine,
  type PurchaseOrder,
  type AccountMove,
  type ResUsers,
  type XmlRpcValue,
} from '~/lib/odoo';

// =============================================================================
// Client Instance Management
// =============================================================================

let odooClient: OdooClient | null = null;

/**
 * Gets or creates the Odoo client instance
 */
export async function getOdooClient(config?: OdooConfig): Promise<OdooClient> {
  if (!odooClient && config) {
    odooClient = await createOdooClient(config);
  }

  if (!odooClient) {
    throw new Error(
      'Odoo client not initialized. Call initOdooClient() first or provide config.'
    );
  }

  return odooClient;
}

/**
 * Initializes the Odoo client with configuration
 */
export async function initOdooClient(config: OdooConfig): Promise<OdooClient> {
  odooClient = await createOdooClient(config);
  return odooClient;
}

/**
 * Clears the current Odoo client instance
 */
export function clearOdooClient(): void {
  if (odooClient) {
    odooClient.logout();
    odooClient = null;
  }
}

// =============================================================================
// Partner (Contact) Operations
// =============================================================================

/**
 * Finds partners (contacts/companies) matching the criteria
 */
export async function findPartners(
  domain: OdooDomain = [],
  options: SearchReadOptions = {}
): Promise<ResPartner[]> {
  const client = await getOdooClient();
  return client.searchRead<ResPartner>('res.partner', domain, {
    fields: options.fields || [
      'id',
      'name',
      'email',
      'phone',
      'mobile',
      'is_company',
      'street',
      'city',
      'country_id',
      'active',
    ],
    ...options,
  });
}

/**
 * Finds a partner by ID
 */
export async function findPartnerById(
  id: number
): Promise<ResPartner | null> {
  const client = await getOdooClient();
  const results = await client.read<ResPartner>('res.partner', [id]);
  return results[0] || null;
}

/**
 * Finds a partner by email
 */
export async function findPartnerByEmail(
  email: string
): Promise<ResPartner | null> {
  const partners = await findPartners([['email', '=', email]], { limit: 1 });
  return partners[0] || null;
}

/**
 * Creates a new partner
 */
export async function createPartner(
  data: Partial<Omit<ResPartner, 'id'>>
): Promise<number> {
  const client = await getOdooClient();
  return client.create('res.partner', data as Record<string, XmlRpcValue>);
}

/**
 * Updates a partner
 */
export async function updatePartner(
  id: number,
  data: Partial<Omit<ResPartner, 'id'>>
): Promise<boolean> {
  const client = await getOdooClient();
  return client.write('res.partner', [id], data as Record<string, XmlRpcValue>);
}

/**
 * Deletes a partner
 */
export async function deletePartner(id: number): Promise<boolean> {
  const client = await getOdooClient();
  return client.unlink('res.partner', [id]);
}

// =============================================================================
// Product Operations
// =============================================================================

/**
 * Finds products matching the criteria
 */
export async function findProducts(
  domain: OdooDomain = [],
  options: SearchReadOptions = {}
): Promise<ProductProduct[]> {
  const client = await getOdooClient();
  return client.searchRead<ProductProduct>('product.product', domain, {
    fields: options.fields || [
      'id',
      'name',
      'default_code',
      'barcode',
      'list_price',
      'standard_price',
      'type',
      'categ_id',
      'qty_available',
      'active',
    ],
    ...options,
  });
}

/**
 * Finds a product by ID
 */
export async function findProductById(
  id: number
): Promise<ProductProduct | null> {
  const client = await getOdooClient();
  const results = await client.read<ProductProduct>('product.product', [id]);
  return results[0] || null;
}

/**
 * Finds a product by internal reference (default_code)
 */
export async function findProductByCode(
  code: string
): Promise<ProductProduct | null> {
  const products = await findProducts([['default_code', '=', code]], {
    limit: 1,
  });
  return products[0] || null;
}

/**
 * Finds a product by barcode
 */
export async function findProductByBarcode(
  barcode: string
): Promise<ProductProduct | null> {
  const products = await findProducts([['barcode', '=', barcode]], {
    limit: 1,
  });
  return products[0] || null;
}

/**
 * Creates a new product
 */
export async function createProduct(
  data: Partial<Omit<ProductProduct, 'id'>>
): Promise<number> {
  const client = await getOdooClient();
  return client.create('product.product', data as Record<string, XmlRpcValue>);
}

/**
 * Updates a product
 */
export async function updateProduct(
  id: number,
  data: Partial<Omit<ProductProduct, 'id'>>
): Promise<boolean> {
  const client = await getOdooClient();
  return client.write(
    'product.product',
    [id],
    data as Record<string, XmlRpcValue>
  );
}

// =============================================================================
// Sale Order Operations
// =============================================================================

/**
 * Finds sale orders matching the criteria
 */
export async function findSaleOrders(
  domain: OdooDomain = [],
  options: SearchReadOptions = {}
): Promise<SaleOrder[]> {
  const client = await getOdooClient();
  return client.searchRead<SaleOrder>('sale.order', domain, {
    fields: options.fields || [
      'id',
      'name',
      'partner_id',
      'date_order',
      'state',
      'amount_untaxed',
      'amount_tax',
      'amount_total',
      'user_id',
    ],
    ...options,
  });
}

/**
 * Finds a sale order by ID
 */
export async function findSaleOrderById(
  id: number
): Promise<SaleOrder | null> {
  const client = await getOdooClient();
  const results = await client.read<SaleOrder>('sale.order', [id]);
  return results[0] || null;
}

/**
 * Finds a sale order by name (e.g., 'SO001')
 */
export async function findSaleOrderByName(
  name: string
): Promise<SaleOrder | null> {
  const orders = await findSaleOrders([['name', '=', name]], { limit: 1 });
  return orders[0] || null;
}

/**
 * Finds sale orders for a specific partner
 */
export async function findSaleOrdersByPartner(
  partnerId: number,
  options: SearchReadOptions = {}
): Promise<SaleOrder[]> {
  return findSaleOrders([['partner_id', '=', partnerId]], options);
}

/**
 * Creates a new sale order
 */
export async function createSaleOrder(
  data: Partial<Omit<SaleOrder, 'id'>>
): Promise<number> {
  const client = await getOdooClient();
  return client.create('sale.order', data as Record<string, XmlRpcValue>);
}

/**
 * Creates a sale order line
 */
export async function createSaleOrderLine(
  data: Partial<Omit<SaleOrderLine, 'id'>>
): Promise<number> {
  const client = await getOdooClient();
  return client.create('sale.order.line', data as Record<string, XmlRpcValue>);
}

/**
 * Confirms a sale order (changes state from draft to sale)
 */
export async function confirmSaleOrder(orderId: number): Promise<boolean> {
  const client = await getOdooClient();
  await client.callMethodOnIds('sale.order', [orderId], 'action_confirm');
  return true;
}

/**
 * Cancels a sale order
 */
export async function cancelSaleOrder(orderId: number): Promise<boolean> {
  const client = await getOdooClient();
  await client.callMethodOnIds('sale.order', [orderId], 'action_cancel');
  return true;
}

// =============================================================================
// Purchase Order Operations
// =============================================================================

/**
 * Finds purchase orders matching the criteria
 */
export async function findPurchaseOrders(
  domain: OdooDomain = [],
  options: SearchReadOptions = {}
): Promise<PurchaseOrder[]> {
  const client = await getOdooClient();
  return client.searchRead<PurchaseOrder>('purchase.order', domain, {
    fields: options.fields || [
      'id',
      'name',
      'partner_id',
      'date_order',
      'state',
      'amount_untaxed',
      'amount_tax',
      'amount_total',
      'user_id',
    ],
    ...options,
  });
}

/**
 * Finds a purchase order by ID
 */
export async function findPurchaseOrderById(
  id: number
): Promise<PurchaseOrder | null> {
  const client = await getOdooClient();
  const results = await client.read<PurchaseOrder>('purchase.order', [id]);
  return results[0] || null;
}

// =============================================================================
// Invoice Operations
// =============================================================================

/**
 * Finds invoices matching the criteria
 */
export async function findInvoices(
  domain: OdooDomain = [],
  options: SearchReadOptions = {}
): Promise<AccountMove[]> {
  const client = await getOdooClient();

  // Add move_type filter for invoices by default
  const invoiceDomain: OdooDomain = [
    ['move_type', 'in', ['out_invoice', 'out_refund', 'in_invoice', 'in_refund']],
    ...domain,
  ];

  return client.searchRead<AccountMove>('account.move', invoiceDomain, {
    fields: options.fields || [
      'id',
      'name',
      'partner_id',
      'move_type',
      'state',
      'invoice_date',
      'invoice_date_due',
      'amount_untaxed',
      'amount_tax',
      'amount_total',
      'amount_residual',
      'payment_state',
    ],
    ...options,
  });
}

/**
 * Finds customer invoices for a specific partner
 */
export async function findCustomerInvoicesByPartner(
  partnerId: number,
  options: SearchReadOptions = {}
): Promise<AccountMove[]> {
  return findInvoices(
    [
      ['partner_id', '=', partnerId],
      ['move_type', 'in', ['out_invoice', 'out_refund']],
    ],
    options
  );
}

// =============================================================================
// User Operations
// =============================================================================

/**
 * Finds users matching the criteria
 */
export async function findUsers(
  domain: OdooDomain = [],
  options: SearchReadOptions = {}
): Promise<ResUsers[]> {
  const client = await getOdooClient();
  return client.searchRead<ResUsers>('res.users', domain, {
    fields: options.fields || [
      'id',
      'name',
      'login',
      'email',
      'active',
      'partner_id',
      'company_id',
    ],
    ...options,
  });
}

/**
 * Finds a user by login (email)
 */
export async function findUserByLogin(
  login: string
): Promise<ResUsers | null> {
  const users = await findUsers([['login', '=', login]], { limit: 1 });
  return users[0] || null;
}

// =============================================================================
// Generic Operations
// =============================================================================

/**
 * Executes a search on any Odoo model
 */
export async function searchModel<T extends { id: number } = { id: number }>(
  model: string,
  domain: OdooDomain = [],
  options: SearchReadOptions = {}
): Promise<T[]> {
  const client = await getOdooClient();
  return client.searchRead<T>(model, domain, options);
}

/**
 * Counts records in any Odoo model
 */
export async function countModel(
  model: string,
  domain: OdooDomain = []
): Promise<number> {
  const client = await getOdooClient();
  return client.searchCount(model, domain);
}

/**
 * Creates a record in any Odoo model
 */
export async function createRecord(
  model: string,
  data: Record<string, XmlRpcValue>
): Promise<number> {
  const client = await getOdooClient();
  return client.create(model, data);
}

/**
 * Updates a record in any Odoo model
 */
export async function updateRecord(
  model: string,
  id: number,
  data: Record<string, XmlRpcValue>
): Promise<boolean> {
  const client = await getOdooClient();
  return client.write(model, [id], data);
}

/**
 * Deletes a record from any Odoo model
 */
export async function deleteRecord(
  model: string,
  id: number
): Promise<boolean> {
  const client = await getOdooClient();
  return client.unlink(model, [id]);
}
