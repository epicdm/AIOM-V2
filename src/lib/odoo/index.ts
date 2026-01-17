/**
 * Odoo XML-RPC Client Library
 *
 * A type-safe client library for connecting to Odoo ERP via XML-RPC API.
 *
 * @example
 * ```typescript
 * import { createOdooClient } from "~/lib/odoo";
 *
 * const client = await createOdooClient({
 *   url: "https://mycompany.odoo.com",
 *   database: "mycompany",
 *   username: "admin@mycompany.com",
 *   password: "api-key-here",
 * });
 *
 * // Search and read partners
 * const partners = await client.searchRead<ResPartner>("res.partner", [
 *   ["is_company", "=", true],
 *   ["active", "=", true],
 * ], {
 *   fields: ["name", "email", "phone"],
 *   limit: 10,
 * });
 * ```
 *
 * @module odoo
 */

// Main client
export { OdooClient, createOdooClient, createOdooClientSync } from "./client";

// Types
export type {
  // Configuration
  OdooConfig,
  OdooSession,

  // XML-RPC
  XmlRpcValue,
  XmlRpcFault,

  // Domain filters
  OdooOperator,
  OdooDomainCondition,
  OdooDomainOperator,
  OdooDomainElement,
  OdooDomain,

  // Options
  SearchReadOptions,
  ReadOptions,

  // Record types
  OdooRecord,
  ResPartner,
  ProductProduct,
  SaleOrder,
  SaleOrderLine,
  PurchaseOrder,
  AccountMove,
  StockMove,
  ResUsers,

  // Accounting record types
  AccountMoveLine,
  AccountPaymentTerm,
  AccountPaymentTermLine,
  AccountJournal,
  AccountAccount,
  AccountPayment,

  // Accounting report types
  AccountingBalance,
  AgingReportEntry,
  AgingReport,
  InvoiceSummary,
  FinancialSnapshot,

  // Partner-specific types
  PartnerDetail,
  PartnerWithBalance,
  PartnerRelationshipHistory,
  PartnerContactInfo,
  PartnerSummary,
  PartnerSearchFilters,

  // Project types
  ProjectState,
  ProjectProject,
  ProjectMilestone,
  ProjectTask,
  ProjectTag,
  ProjectSummary,
  MilestoneSummary,
  TaskSummary,
  TeamMember,
  ProjectFilters,
  ProjectStats,

  // Result types
  OdooSearchResult,
  OdooCreateResult,
  OdooWriteResult,
  OdooDeleteResult,
} from "./types";

// Error classes
export {
  OdooError,
  OdooAuthenticationError,
  OdooConnectionError,
  OdooAccessError,
  OdooValidationError,
} from "./types";

// Low-level XML-RPC (for advanced usage)
export { xmlRpcCall, buildMethodCall, parseResponse, encodeValue } from "./xml-rpc";

// Discuss module (channels, messages, real-time)
export { DiscussClient, createDiscussClient } from "./discuss";
export type {
  DiscussChannel,
  DiscussMessage,
  ChannelMember,
  DiscussNotification,
  LongPollingResponse,
} from "./discuss";

// GL Posting module (expense posting to General Ledger)
export { OdooGLPostingService, createGLPostingService } from "./gl-posting";
export type {
  GLPostingLineItem,
  GLPostingRequest,
  GLPostingResult,
  GLAccountInfo,
  GLJournalInfo,
} from "./gl-posting";

// CRM Call Logging module (automatic call logging to CRM)
export { OdooCrmCallLoggingService, createCrmCallLoggingService } from "./crm-call-logging";
export type {
  CrmLead,
  MailActivity,
  MailActivityType,
  MailMessage,
  CallLogEntry,
  CrmLogResult,
  PartnerLinkResult,
  ActivityCreateOptions,
} from "./crm-call-logging";
