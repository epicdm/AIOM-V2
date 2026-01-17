/**
 * Odoo XML-RPC Client Type Definitions
 *
 * This module provides TypeScript interfaces for the Odoo XML-RPC API.
 */

// =============================================================================
// Configuration Types
// =============================================================================

export interface OdooConfig {
  /** Odoo server URL (e.g., https://mycompany.odoo.com) */
  url: string;
  /** Database name */
  database: string;
  /** Username (email) for authentication */
  username: string;
  /** Password or API key */
  password: string;
}

export interface OdooSession {
  /** Authenticated user ID */
  uid: number;
  /** Database name */
  database: string;
  /** Server URL */
  url: string;
  /** Username used for authentication */
  username: string;
  /** Password (stored for subsequent API calls) */
  password: string;
  /** Session creation timestamp */
  createdAt: Date;
}

// =============================================================================
// XML-RPC Types
// =============================================================================

export type XmlRpcValue =
  | string
  | number
  | boolean
  | null
  | XmlRpcValue[]
  | { [key: string]: XmlRpcValue };

export interface XmlRpcFault {
  faultCode: number;
  faultString: string;
}

// =============================================================================
// Odoo Domain Filter Types
// =============================================================================

export type OdooOperator =
  | '='
  | '!='
  | '>'
  | '>='
  | '<'
  | '<='
  | 'like'
  | 'ilike'
  | 'not like'
  | 'not ilike'
  | 'in'
  | 'not in'
  | 'child_of'
  | 'parent_of';

export type OdooDomainCondition = [string, OdooOperator, XmlRpcValue];
export type OdooDomainOperator = '&' | '|' | '!';
export type OdooDomainElement = OdooDomainCondition | OdooDomainOperator;
export type OdooDomain = OdooDomainElement[];

// =============================================================================
// Search/Read Options
// =============================================================================

export interface SearchReadOptions {
  /** Fields to retrieve (empty array = all fields) */
  fields?: string[];
  /** Number of records to skip */
  offset?: number;
  /** Maximum number of records to return */
  limit?: number;
  /** Sort order (e.g., 'name asc, id desc') */
  order?: string;
}

export interface ReadOptions {
  /** Fields to retrieve (empty array = all fields) */
  fields?: string[];
}

// =============================================================================
// Common Odoo Record Types
// =============================================================================

/**
 * Base type for all Odoo records.
 * Note: The index signature allows dynamic field access while
 * specific interfaces extend this with properly typed fields.
 */
export interface OdooRecord {
  id: number;
  [key: string]: XmlRpcValue | undefined;
}

// Partner (Contact/Company)
export interface ResPartner extends OdooRecord {
  name: string;
  email?: string | false;
  phone?: string | false;
  mobile?: string | false;
  street?: string | false;
  street2?: string | false;
  city?: string | false;
  zip?: string | false;
  country_id?: [number, string] | false;
  state_id?: [number, string] | false;
  is_company?: boolean;
  company_type?: 'company' | 'person';
  parent_id?: [number, string] | false;
  child_ids?: number[];
  active?: boolean;
  comment?: string | false;
  website?: string | false;
  vat?: string | false;
  create_date?: string;
  write_date?: string;
}

// Product
export interface ProductProduct extends OdooRecord {
  name: string;
  default_code?: string | false;
  barcode?: string | false;
  list_price?: number;
  standard_price?: number;
  type?: 'consu' | 'service' | 'product';
  categ_id?: [number, string] | false;
  active?: boolean;
  sale_ok?: boolean;
  purchase_ok?: boolean;
  qty_available?: number;
  virtual_available?: number;
  uom_id?: [number, string] | false;
  description?: string | false;
  description_sale?: string | false;
  image_1920?: string | false;
  create_date?: string;
  write_date?: string;
}

// Sale Order
export interface SaleOrder extends OdooRecord {
  name: string;
  partner_id: [number, string];
  date_order?: string;
  state?: 'draft' | 'sent' | 'sale' | 'done' | 'cancel';
  amount_untaxed?: number;
  amount_tax?: number;
  amount_total?: number;
  order_line?: number[];
  user_id?: [number, string] | false;
  team_id?: [number, string] | false;
  company_id?: [number, string] | false;
  pricelist_id?: [number, string] | false;
  currency_id?: [number, string] | false;
  note?: string | false;
  create_date?: string;
  write_date?: string;
}

// Sale Order Line
export interface SaleOrderLine extends OdooRecord {
  order_id: [number, string];
  product_id: [number, string];
  name: string;
  product_uom_qty: number;
  price_unit: number;
  price_subtotal?: number;
  price_total?: number;
  discount?: number;
  tax_id?: number[];
  product_uom?: [number, string] | false;
  create_date?: string;
  write_date?: string;
}

// Purchase Order
export interface PurchaseOrder extends OdooRecord {
  name: string;
  partner_id: [number, string];
  date_order?: string;
  state?: 'draft' | 'sent' | 'to approve' | 'purchase' | 'done' | 'cancel';
  amount_untaxed?: number;
  amount_tax?: number;
  amount_total?: number;
  order_line?: number[];
  user_id?: [number, string] | false;
  company_id?: [number, string] | false;
  currency_id?: [number, string] | false;
  notes?: string | false;
  create_date?: string;
  write_date?: string;
}

// Invoice / Account Move
export interface AccountMove extends OdooRecord {
  name: string;
  partner_id?: [number, string] | false;
  move_type?: 'entry' | 'out_invoice' | 'out_refund' | 'in_invoice' | 'in_refund' | 'out_receipt' | 'in_receipt';
  state?: 'draft' | 'posted' | 'cancel';
  date?: string;
  invoice_date?: string;
  invoice_date_due?: string;
  amount_untaxed?: number;
  amount_tax?: number;
  amount_total?: number;
  amount_residual?: number;
  payment_state?: 'not_paid' | 'in_payment' | 'paid' | 'partial' | 'reversed' | 'invoicing_legacy';
  invoice_line_ids?: number[];
  journal_id?: [number, string] | false;
  company_id?: [number, string] | false;
  currency_id?: [number, string] | false;
  ref?: string | false;
  narration?: string | false;
  create_date?: string;
  write_date?: string;
}

// Stock Move / Inventory
export interface StockMove extends OdooRecord {
  name: string;
  product_id: [number, string];
  product_uom_qty: number;
  product_uom: [number, string];
  state?: 'draft' | 'waiting' | 'confirmed' | 'partially_available' | 'assigned' | 'done' | 'cancel';
  location_id: [number, string];
  location_dest_id: [number, string];
  picking_id?: [number, string] | false;
  date?: string;
  date_deadline?: string | false;
  origin?: string | false;
  create_date?: string;
  write_date?: string;
}

// User
export interface ResUsers extends OdooRecord {
  name: string;
  login: string;
  email?: string | false;
  active?: boolean;
  partner_id?: [number, string] | false;
  company_id?: [number, string] | false;
  company_ids?: number[];
  groups_id?: number[];
  create_date?: string;
  write_date?: string;
}

// =============================================================================
// Accounting-Specific Types
// =============================================================================

// Account Move Line (Journal Entry Line / Invoice Line)
export interface AccountMoveLine extends OdooRecord {
  name: string;
  move_id?: [number, string] | false;
  account_id?: [number, string] | false;
  partner_id?: [number, string] | false;
  journal_id?: [number, string] | false;
  date?: string;
  date_maturity?: string;
  debit?: number;
  credit?: number;
  balance?: number;
  amount_currency?: number;
  currency_id?: [number, string] | false;
  amount_residual?: number;
  amount_residual_currency?: number;
  reconciled?: boolean;
  blocked?: boolean;
  move_type?: string;
  parent_state?: 'draft' | 'posted' | 'cancel';
  create_date?: string;
  write_date?: string;
}

// Payment Term
export interface AccountPaymentTerm extends OdooRecord {
  name: string;
  active?: boolean;
  note?: string | false;
  line_ids?: number[];
  company_id?: [number, string] | false;
  sequence?: number;
  display_on_invoice?: boolean;
  create_date?: string;
  write_date?: string;
}

// Payment Term Line
export interface AccountPaymentTermLine extends OdooRecord {
  payment_id: [number, string];
  value?: 'balance' | 'percent' | 'fixed';
  value_amount?: number;
  nb_days?: number;
  delay_type?: 'days_after' | 'days_after_end_of_month' | 'days_after_end_of_next_month' | 'day_following_month' | 'day_current_month';
  create_date?: string;
  write_date?: string;
}

// Account Journal
export interface AccountJournal extends OdooRecord {
  name: string;
  code: string;
  type?: 'sale' | 'purchase' | 'cash' | 'bank' | 'general';
  company_id?: [number, string] | false;
  default_account_id?: [number, string] | false;
  currency_id?: [number, string] | false;
  active?: boolean;
  create_date?: string;
  write_date?: string;
}

// Account (Chart of Accounts)
export interface AccountAccount extends OdooRecord {
  name: string;
  code: string;
  account_type?: string;
  company_id?: [number, string] | false;
  currency_id?: [number, string] | false;
  deprecated?: boolean;
  reconcile?: boolean;
  create_date?: string;
  write_date?: string;
}

// Account Payment
export interface AccountPayment extends OdooRecord {
  name: string;
  payment_type?: 'inbound' | 'outbound' | 'transfer';
  partner_type?: 'customer' | 'supplier';
  partner_id?: [number, string] | false;
  amount?: number;
  currency_id?: [number, string] | false;
  date?: string;
  journal_id?: [number, string] | false;
  state?: 'draft' | 'posted' | 'sent' | 'reconciled' | 'cancelled';
  payment_method_id?: [number, string] | false;
  payment_method_line_id?: [number, string] | false;
  ref?: string | false;
  is_reconciled?: boolean;
  is_matched?: boolean;
  create_date?: string;
  write_date?: string;
}

// =============================================================================
// Accounting Report Types (Non-Odoo, for computed reports)
// =============================================================================

// AP/AR Balance Summary
export interface AccountingBalance {
  partnerId: number;
  partnerName: string;
  totalReceivable: number;
  totalPayable: number;
  openInvoicesCount: number;
  overdueAmount: number;
  currency: string;
}

// Aging Report Entry
export interface AgingReportEntry {
  partnerId: number;
  partnerName: string;
  current: number;        // 0-30 days
  period1: number;        // 31-60 days
  period2: number;        // 61-90 days
  period3: number;        // 91-120 days
  older: number;          // 120+ days
  total: number;
  currency: string;
}

// Aging Report Summary
export interface AgingReport {
  type: 'receivable' | 'payable';
  asOfDate: string;
  entries: AgingReportEntry[];
  totals: Omit<AgingReportEntry, 'partnerId' | 'partnerName'>;
}

// Invoice Summary
export interface InvoiceSummary {
  id: number;
  name: string;
  partnerId: number;
  partnerName: string;
  invoiceDate: string | null;
  dueDate: string | null;
  amountTotal: number;
  amountResidual: number;
  paymentState: string;
  state: string;
  moveType: string;
  daysOverdue: number | null;
  currency: string;
}

// Financial Snapshot for AIOM Intelligence
export interface FinancialSnapshot {
  asOfDate: string;
  totalReceivables: number;
  totalPayables: number;
  netPosition: number;
  overdueReceivables: number;
  overduePayables: number;
  openInvoicesCount: number;
  openBillsCount: number;
  averageDaysToPayReceivables: number | null;
  averageDaysToPayPayables: number | null;
  topReceivablePartners: Array<{ id: number; name: string; amount: number }>;
  topPayablePartners: Array<{ id: number; name: string; amount: number }>;
  currency: string;
}

// =============================================================================
// Project Types
// =============================================================================

/**
 * Project state types
 */
export type ProjectState = 'draft' | 'open' | 'pending' | 'close' | 'cancelled';

/**
 * Project (project.project model)
 */
export interface ProjectProject extends OdooRecord {
  name: string;
  active?: boolean;
  sequence?: number;
  partner_id?: [number, string] | false;
  company_id?: [number, string] | false;
  user_id?: [number, string] | false;
  date_start?: string | false;
  date?: string | false;
  description?: string | false;
  privacy_visibility?: 'followers' | 'employees' | 'portal';
  task_count?: number;
  open_task_count?: number;
  closed_task_count?: number;
  color?: number;
  tag_ids?: number[];
  favorite_user_ids?: number[];
  is_favorite?: boolean;
  label_tasks?: string | false;
  task_ids?: number[];
  allow_timesheets?: boolean;
  analytic_account_id?: [number, string] | false;
  milestone_ids?: number[];
  milestone_count?: number;
  create_date?: string;
  write_date?: string;
}

/**
 * Project Milestone (project.milestone model)
 */
export interface ProjectMilestone extends OdooRecord {
  name: string;
  project_id?: [number, string] | false;
  deadline?: string | false;
  is_reached?: boolean;
  reached_date?: string | false;
  sequence?: number;
  task_ids?: number[];
  open_task_count?: number;
  closed_task_count?: number;
  create_date?: string;
  write_date?: string;
}

/**
 * Project Task (project.task model)
 */
export interface ProjectTask extends OdooRecord {
  name: string;
  active?: boolean;
  project_id?: [number, string] | false;
  partner_id?: [number, string] | false;
  user_ids?: number[];
  date_deadline?: string | false;
  date_assign?: string | false;
  date_end?: string | false;
  date_last_stage_update?: string | false;
  priority?: '0' | '1';
  sequence?: number;
  stage_id?: [number, string] | false;
  tag_ids?: number[];
  kanban_state?: 'normal' | 'done' | 'blocked';
  color?: number;
  description?: string | false;
  parent_id?: [number, string] | false;
  child_ids?: number[];
  milestone_id?: [number, string] | false;
  planned_hours?: number;
  effective_hours?: number;
  remaining_hours?: number;
  progress?: number;
  timesheet_ids?: number[];
  subtask_count?: number;
  create_date?: string;
  write_date?: string;
}

/**
 * Project Tag (project.tags model)
 */
export interface ProjectTag extends OdooRecord {
  name: string;
  color?: number;
}

/**
 * Summary types for project data
 */
export interface ProjectSummary {
  id: number;
  name: string;
  partnerId: number | null;
  partnerName: string | null;
  managerId: number | null;
  managerName: string | null;
  dateStart: string | null;
  dateEnd: string | null;
  taskCount: number;
  openTaskCount: number;
  closedTaskCount: number;
  milestoneCount: number;
  isActive: boolean;
  isFavorite: boolean;
  progress: number;
}

export interface MilestoneSummary {
  id: number;
  name: string;
  projectId: number;
  projectName: string;
  deadline: string | null;
  isReached: boolean;
  reachedDate: string | null;
  openTaskCount: number;
  closedTaskCount: number;
  progress: number;
}

export interface TaskSummary {
  id: number;
  name: string;
  projectId: number | null;
  projectName: string | null;
  assigneeIds: number[];
  deadline: string | null;
  priority: string;
  stageId: number | null;
  stageName: string | null;
  milestoneId: number | null;
  milestoneName: string | null;
  kanbanState: string;
  plannedHours: number;
  effectiveHours: number;
  progress: number;
}

export interface TeamMember {
  id: number;
  name: string;
  email: string | null;
  taskCount: number;
  openTaskCount: number;
}

export interface ProjectFilters {
  active?: boolean;
  userId?: number;
  partnerId?: number;
  isFavorite?: boolean;
  searchQuery?: string;
  limit?: number;
  offset?: number;
}

export interface ProjectStats {
  totalProjects: number;
  activeProjects: number;
  totalTasks: number;
  openTasks: number;
  closedTasks: number;
  overdueTasks: number;
  totalMilestones: number;
  upcomingMilestones: number;
  reachedMilestones: number;
}

// =============================================================================
// API Response Types
// =============================================================================

export interface OdooSearchResult<T extends OdooRecord = OdooRecord> {
  records: T[];
  length: number;
}

export interface OdooCreateResult {
  id: number;
}

export interface OdooWriteResult {
  success: boolean;
}

export interface OdooDeleteResult {
  success: boolean;
}

// =============================================================================
// Error Types
// =============================================================================

export class OdooError extends Error {
  constructor(
    message: string,
    public code?: number,
    public data?: unknown
  ) {
    super(message);
    this.name = 'OdooError';
  }
}

export class OdooAuthenticationError extends OdooError {
  constructor(message: string = 'Authentication failed') {
    super(message);
    this.name = 'OdooAuthenticationError';
  }
}

export class OdooConnectionError extends OdooError {
  constructor(message: string = 'Failed to connect to Odoo server') {
    super(message);
    this.name = 'OdooConnectionError';
  }
}

export class OdooAccessError extends OdooError {
  constructor(message: string = 'Access denied') {
    super(message);
    this.name = 'OdooAccessError';
  }
}

export class OdooValidationError extends OdooError {
  constructor(message: string = 'Validation error') {
    super(message);
    this.name = 'OdooValidationError';
  }
}

// =============================================================================
// Partner-Specific Types (Extended for Partner Queries)
// =============================================================================

/**
 * Extended partner details including customer/vendor specific fields
 */
export interface PartnerDetail extends ResPartner {
  /** Customer ranking (higher = more important customer) */
  customer_rank?: number;
  /** Supplier ranking (higher = more important supplier) */
  supplier_rank?: number;
  /** Credit limit assigned to this partner */
  credit_limit?: number;
  /** Total credit used by this partner */
  credit?: number;
  /** Default payment term for customer invoices [id, name] */
  property_payment_term_id?: [number, string] | false;
  /** Default payment term for vendor bills [id, name] */
  property_supplier_payment_term_id?: [number, string] | false;
  /** Number of sale orders */
  sale_order_count?: number;
  /** Number of purchase orders */
  purchase_order_count?: number;
  /** Total invoiced amount */
  total_invoiced?: number;
  /** Company this partner belongs to [id, name] */
  company_id?: [number, string] | false;
  /** Partner's title (Mr., Mrs., etc.) [id, name] */
  title?: [number, string] | false;
  /** Partner's function/job position */
  function?: string | false;
  /** Partner's category/tags */
  category_id?: number[];
  /** User responsible for this partner [id, name] */
  user_id?: [number, string] | false;
  /** Partner's language */
  lang?: string | false;
  /** Partner's timezone */
  tz?: string | false;
  /** Internal reference */
  ref?: string | false;
  /** Industry [id, name] */
  industry_id?: [number, string] | false;
}

/**
 * Partner with calculated balance information
 */
export interface PartnerWithBalance extends PartnerDetail {
  /** Total accounts receivable balance */
  totalReceivable: number;
  /** Total accounts payable balance */
  totalPayable: number;
  /** Amount of credit currently used */
  creditUsed: number;
  /** Available credit (credit_limit - creditUsed) */
  creditAvailable: number;
  /** Number of open invoices */
  openInvoicesCount: number;
  /** Total overdue amount */
  overdueAmount: number;
  /** Currency code */
  currency: string;
}

/**
 * Partner relationship history and interaction summary
 */
export interface PartnerRelationshipHistory {
  /** Partner ID */
  partnerId: number;
  /** Partner name */
  partnerName: string;
  /** Date of first transaction */
  firstTransactionDate?: string | null;
  /** Date of most recent transaction */
  lastTransactionDate?: string | null;
  /** Total number of sale orders */
  totalSaleOrders: number;
  /** Total number of purchase orders */
  totalPurchaseOrders: number;
  /** Total number of invoices */
  totalInvoices: number;
  /** Total revenue from this customer */
  totalRevenue: number;
  /** Total amount purchased from this vendor */
  totalPurchased: number;
  /** Average order value */
  averageOrderValue: number | null;
  /** Relationship status */
  status: 'active' | 'inactive' | 'new';
  /** Days since last transaction */
  daysSinceLastTransaction: number | null;
}

/**
 * Contact information for a partner
 */
export interface PartnerContactInfo {
  /** Partner ID */
  id: number;
  /** Partner name */
  name: string;
  /** Email address */
  email: string | null;
  /** Phone number */
  phone: string | null;
  /** Mobile number */
  mobile: string | null;
  /** Website URL */
  website: string | null;
  /** Full address object */
  address: {
    street: string | null;
    street2: string | null;
    city: string | null;
    state: string | null;
    stateId: number | null;
    zip: string | null;
    country: string | null;
    countryId: number | null;
  };
  /** Is this a company? */
  isCompany: boolean;
  /** Company type */
  companyType: 'company' | 'person' | null;
  /** Parent company if this is a contact [id, name] */
  parentCompany: { id: number; name: string } | null;
  /** Child contacts/addresses */
  childContacts: number[];
  /** Job title/function */
  jobTitle: string | null;
  /** VAT number */
  vat: string | null;
  /** Internal reference */
  ref: string | null;
  /** Partner's language */
  language: string | null;
  /** Partner's timezone */
  timezone: string | null;
}

/**
 * Summary of a partner for list views
 */
export interface PartnerSummary {
  /** Partner ID */
  id: number;
  /** Partner name */
  name: string;
  /** Email address */
  email: string | null;
  /** Phone number */
  phone: string | null;
  /** City */
  city: string | null;
  /** Country name */
  country: string | null;
  /** Is this a company? */
  isCompany: boolean;
  /** Is customer (customer_rank > 0) */
  isCustomer: boolean;
  /** Is vendor (supplier_rank > 0) */
  isVendor: boolean;
  /** Is active */
  active: boolean;
  /** Total receivable balance */
  totalReceivable?: number;
  /** Total payable balance */
  totalPayable?: number;
}

/**
 * Search filters for partner queries
 */
export interface PartnerSearchFilters {
  /** Search by name (partial match) */
  name?: string;
  /** Search by email (partial match) */
  email?: string;
  /** Filter by partner type */
  type?: 'customer' | 'vendor' | 'both' | 'all';
  /** Filter by company/person */
  companyType?: 'company' | 'person' | 'all';
  /** Filter by active status */
  active?: boolean;
  /** Filter by country ID */
  countryId?: number;
  /** Filter by state ID */
  stateId?: number;
  /** Filter by city (partial match) */
  city?: string;
  /** Filter by assigned user ID */
  userId?: number;
  /** Filter by category/tag IDs */
  categoryIds?: number[];
}
