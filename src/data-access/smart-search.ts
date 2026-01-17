/**
 * Smart Search Data Access Layer
 *
 * AI-powered unified search across tasks, contacts, messages, expenses, and documents
 * with natural language understanding and relevance ranking.
 */

import { eq, and, desc, ilike, or, sql, count } from "drizzle-orm";
import { database } from "~/db";
import {
  user,
  expenseRequest,
  expenseVoucher,
  message,
  syncedContact,
  dailyBriefing,
  kycDocument,
  type User,
  type ExpenseRequest,
  type ExpenseVoucher,
  type Message,
  type SyncedContact,
} from "~/db/schema";
import {
  type TaskFilters,
  getTasksWithFilters,
  type DashboardTaskSummary,
} from "./odoo-tasks";
import { initOdooClient, getOdooClient } from "./odoo";
import { privateEnv } from "~/config/privateEnv";

// =============================================================================
// Types
// =============================================================================

/**
 * Search result types for categorized results
 */
export type SearchResultType =
  | "task"
  | "contact"
  | "message"
  | "expense"
  | "document"
  | "user";

/**
 * Base search result structure
 */
export interface BaseSearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle?: string;
  description?: string;
  relevanceScore: number;
  createdAt?: Date;
  updatedAt?: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Task search result
 */
export interface TaskSearchResult extends BaseSearchResult {
  type: "task";
  metadata: {
    projectId?: number;
    projectName?: string;
    status?: string;
    priority?: string;
    deadline?: string;
    assignees?: string[];
  };
}

/**
 * Contact search result
 */
export interface ContactSearchResult extends BaseSearchResult {
  type: "contact";
  metadata: {
    email?: string;
    phone?: string;
    mobile?: string;
    company?: string;
    city?: string;
    odooPartnerId?: number;
  };
}

/**
 * Message search result
 */
export interface MessageSearchResult extends BaseSearchResult {
  type: "message";
  metadata: {
    senderId?: string;
    senderName?: string;
    conversationId?: string;
    isRead?: boolean;
  };
}

/**
 * Expense search result
 */
export interface ExpenseSearchResult extends BaseSearchResult {
  type: "expense";
  metadata: {
    amount?: string;
    currency?: string;
    status?: string;
    requesterName?: string;
    voucherNumber?: string;
    expenseType?: "request" | "voucher";
  };
}

/**
 * Document search result
 */
export interface DocumentSearchResult extends BaseSearchResult {
  type: "document";
  metadata: {
    documentType?: string;
    fileType?: string;
    fileUrl?: string;
    status?: string;
  };
}

/**
 * User search result
 */
export interface UserSearchResult extends BaseSearchResult {
  type: "user";
  metadata: {
    email?: string;
    role?: string;
    plan?: string;
    isAdmin?: boolean;
  };
}

/**
 * Union type for all search results
 */
export type SearchResult =
  | TaskSearchResult
  | ContactSearchResult
  | MessageSearchResult
  | ExpenseSearchResult
  | DocumentSearchResult
  | UserSearchResult;

/**
 * Search filters for controlling search scope
 */
export interface SmartSearchFilters {
  /** Types of results to include (default: all) */
  types?: SearchResultType[];
  /** Limit per result type */
  limitPerType?: number;
  /** Overall result limit */
  limit?: number;
  /** Minimum relevance score (0-100) */
  minRelevance?: number;
  /** Date range filter */
  dateFrom?: Date;
  dateTo?: Date;
  /** Filter by user ID (for user-specific searches) */
  userId?: string;
}

/**
 * Search result with categorized results
 */
export interface SmartSearchResult {
  query: string;
  normalizedQuery: string;
  totalResults: number;
  results: SearchResult[];
  resultsByType: {
    tasks: TaskSearchResult[];
    contacts: ContactSearchResult[];
    messages: MessageSearchResult[];
    expenses: ExpenseSearchResult[];
    documents: DocumentSearchResult[];
    users: UserSearchResult[];
  };
  searchTime: number;
  suggestions: string[];
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_LIMIT_PER_TYPE = 10;
const DEFAULT_TOTAL_LIMIT = 50;
const DEFAULT_MIN_RELEVANCE = 10;

// Keywords for detecting search intent
const INTENT_KEYWORDS = {
  task: ["task", "tasks", "todo", "project", "deadline", "overdue", "assigned", "work"],
  contact: ["contact", "contacts", "customer", "vendor", "supplier", "partner", "phone", "email", "person"],
  message: ["message", "messages", "chat", "conversation", "sent", "received"],
  expense: ["expense", "expenses", "voucher", "payment", "reimbursement", "request", "cost", "money", "amount"],
  document: ["document", "documents", "file", "files", "kyc", "attachment", "pdf", "image"],
  user: ["user", "users", "employee", "staff", "team", "member", "admin"],
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Calculate relevance score based on query match
 */
function calculateRelevance(
  query: string,
  text: string,
  exactMatchBoost: number = 30
): number {
  if (!text) return 0;

  const normalizedQuery = query.toLowerCase().trim();
  const normalizedText = text.toLowerCase();

  let score = 0;

  // Exact match
  if (normalizedText === normalizedQuery) {
    return 100;
  }

  // Contains exact query
  if (normalizedText.includes(normalizedQuery)) {
    score += exactMatchBoost;
  }

  // Word match scoring
  const queryWords = normalizedQuery.split(/\s+/).filter(Boolean);
  const textWords = new Set(normalizedText.split(/\s+/).filter(Boolean));

  let matchedWords = 0;
  for (const word of queryWords) {
    if (textWords.has(word)) {
      matchedWords++;
    } else {
      // Partial word match
      for (const textWord of textWords) {
        if (textWord.includes(word) || word.includes(textWord)) {
          matchedWords += 0.5;
          break;
        }
      }
    }
  }

  if (queryWords.length > 0) {
    score += (matchedWords / queryWords.length) * 50;
  }

  // Starts with query boost
  if (normalizedText.startsWith(normalizedQuery)) {
    score += 20;
  }

  return Math.min(Math.round(score), 100);
}

/**
 * Detect search intent from query
 */
function detectSearchIntent(query: string): SearchResultType[] {
  const normalizedQuery = query.toLowerCase();
  const detectedTypes: SearchResultType[] = [];

  for (const [type, keywords] of Object.entries(INTENT_KEYWORDS)) {
    for (const keyword of keywords) {
      if (normalizedQuery.includes(keyword)) {
        detectedTypes.push(type as SearchResultType);
        break;
      }
    }
  }

  return detectedTypes;
}

/**
 * Generate search suggestions based on query and results
 */
function generateSearchSuggestions(
  query: string,
  results: SearchResult[]
): string[] {
  const suggestions: string[] = [];
  const types = new Set(results.map(r => r.type));

  if (!types.has("task")) {
    suggestions.push(`Search tasks for "${query}"`);
  }
  if (!types.has("contact")) {
    suggestions.push(`Find contacts matching "${query}"`);
  }
  if (!types.has("expense")) {
    suggestions.push(`Search expenses for "${query}"`);
  }

  // Add refinement suggestions
  if (results.length > 10) {
    suggestions.push(`Refine search: "${query}" in tasks only`);
    suggestions.push(`Refine search: "${query}" in contacts only`);
  }

  return suggestions.slice(0, 5);
}

// =============================================================================
// Search Functions
// =============================================================================

/**
 * Search tasks in Odoo
 */
async function searchTasks(
  query: string,
  filters: SmartSearchFilters
): Promise<TaskSearchResult[]> {
  try {
    // Ensure Odoo client is initialized
    const url = privateEnv.ODOO_URL;
    const dbName = privateEnv.ODOO_DATABASE;
    const username = privateEnv.ODOO_USERNAME;
    const password = privateEnv.ODOO_PASSWORD;

    if (!url || !dbName || !username || !password) {
      console.warn("Odoo not configured, skipping task search");
      return [];
    }

    await initOdooClient({ url, database: dbName, username, password });

    const taskFilters: TaskFilters = {
      searchQuery: query,
      limit: filters.limitPerType || DEFAULT_LIMIT_PER_TYPE,
      status: "all",
    };

    const result = await getTasksWithFilters(taskFilters);

    return result.tasks.map((task: DashboardTaskSummary): TaskSearchResult => ({
      id: String(task.id),
      type: "task",
      title: task.name,
      subtitle: task.projectName || undefined,
      description: `Status: ${task.statusLabel}, Priority: ${task.priority === "1" ? "High" : "Normal"}`,
      relevanceScore: calculateRelevance(query, task.name),
      createdAt: undefined, // Tasks from Odoo dont have a createDate in the summary
      metadata: {
        projectId: task.projectId || undefined,
        projectName: task.projectName || undefined,
        status: task.statusLabel,
        priority: task.priority === "1" ? "high" : "normal",
        deadline: task.deadlineFormatted || undefined,
        assignees: task.assigneeNames,
      },
    }));
  } catch (error) {
    console.error("Error searching tasks:", error);
    return [];
  }
}

/**
 * Search synced contacts in database
 */
async function searchContacts(
  query: string,
  filters: SmartSearchFilters
): Promise<ContactSearchResult[]> {
  try {
    const searchPattern = `%${query}%`;
    const limit = filters.limitPerType || DEFAULT_LIMIT_PER_TYPE;

    const results = await database
      .select()
      .from(syncedContact)
      .where(
        and(
          eq(syncedContact.syncStatus, "synced"),
          or(
            ilike(syncedContact.name, searchPattern),
            ilike(syncedContact.email, searchPattern),
            ilike(syncedContact.phone, searchPattern),
            ilike(syncedContact.mobile, searchPattern),
            ilike(syncedContact.city, searchPattern),
            ilike(syncedContact.parentName, searchPattern)
          )
        )
      )
      .orderBy(desc(syncedContact.updatedAt))
      .limit(limit);

    return results.map((contact): ContactSearchResult => ({
      id: contact.id,
      type: "contact",
      title: contact.name,
      subtitle: contact.parentName || contact.email || undefined,
      description: [contact.city, contact.phone].filter(Boolean).join(" - ") || undefined,
      relevanceScore: calculateRelevance(query, contact.name),
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt,
      metadata: {
        email: contact.email || undefined,
        phone: contact.phone || undefined,
        mobile: contact.mobile || undefined,
        company: contact.parentName || undefined,
        city: contact.city || undefined,
        odooPartnerId: contact.odooPartnerId,
      },
    }));
  } catch (error) {
    console.error("Error searching contacts:", error);
    return [];
  }
}

/**
 * Search messages in database
 */
async function searchMessages(
  query: string,
  filters: SmartSearchFilters
): Promise<MessageSearchResult[]> {
  try {
    const searchPattern = `%${query}%`;
    const limit = filters.limitPerType || DEFAULT_LIMIT_PER_TYPE;

    const results = await database
      .select({
        id: message.id,
        content: message.content,
        senderId: message.senderId,
        conversationId: message.conversationId,
        isRead: message.isRead,
        createdAt: message.createdAt,
        senderName: user.name,
      })
      .from(message)
      .leftJoin(user, eq(message.senderId, user.id))
      .where(ilike(message.content, searchPattern))
      .orderBy(desc(message.createdAt))
      .limit(limit);

    return results.map((msg): MessageSearchResult => ({
      id: msg.id,
      type: "message",
      title: msg.content.substring(0, 100) + (msg.content.length > 100 ? "..." : ""),
      subtitle: `From: ${msg.senderName || "Unknown"}`,
      relevanceScore: calculateRelevance(query, msg.content),
      createdAt: msg.createdAt,
      metadata: {
        senderId: msg.senderId,
        senderName: msg.senderName || undefined,
        conversationId: msg.conversationId,
        isRead: msg.isRead,
      },
    }));
  } catch (error) {
    console.error("Error searching messages:", error);
    return [];
  }
}

/**
 * Search expense requests and vouchers
 */
async function searchExpenses(
  query: string,
  filters: SmartSearchFilters
): Promise<ExpenseSearchResult[]> {
  try {
    const searchPattern = `%${query}%`;
    const limit = filters.limitPerType || DEFAULT_LIMIT_PER_TYPE;
    const halfLimit = Math.ceil(limit / 2);

    // Search expense requests
    const requestResults = await database
      .select({
        id: expenseRequest.id,
        purpose: expenseRequest.purpose,
        description: expenseRequest.description,
        amount: expenseRequest.amount,
        currency: expenseRequest.currency,
        status: expenseRequest.status,
        createdAt: expenseRequest.createdAt,
        requesterName: user.name,
      })
      .from(expenseRequest)
      .leftJoin(user, eq(expenseRequest.requesterId, user.id))
      .where(
        or(
          ilike(expenseRequest.purpose, searchPattern),
          ilike(expenseRequest.description, searchPattern),
          ilike(expenseRequest.amount, searchPattern)
        )
      )
      .orderBy(desc(expenseRequest.createdAt))
      .limit(halfLimit);

    // Search expense vouchers
    const voucherResults = await database
      .select({
        id: expenseVoucher.id,
        voucherNumber: expenseVoucher.voucherNumber,
        description: expenseVoucher.description,
        totalAmount: expenseVoucher.amount,
        currency: expenseVoucher.currency,
        status: expenseVoucher.status,
        createdAt: expenseVoucher.createdAt,
        submitterName: user.name,
      })
      .from(expenseVoucher)
      .leftJoin(user, eq(expenseVoucher.submitterId, user.id))
      .where(
        or(
          ilike(expenseVoucher.voucherNumber, searchPattern),
          ilike(expenseVoucher.description, searchPattern),
          ilike(expenseVoucher.description, searchPattern)
        )
      )
      .orderBy(desc(expenseVoucher.createdAt))
      .limit(halfLimit);

    const requestMapped: ExpenseSearchResult[] = requestResults.map((req): ExpenseSearchResult => ({
      id: req.id,
      type: "expense",
      title: req.purpose,
      subtitle: `${req.currency} ${req.amount}`,
      description: req.description || undefined,
      relevanceScore: calculateRelevance(query, req.purpose),
      createdAt: req.createdAt,
      metadata: {
        amount: req.amount,
        currency: req.currency,
        status: req.status,
        requesterName: req.requesterName || undefined,
        expenseType: "request",
      },
    }));

    const voucherMapped: ExpenseSearchResult[] = voucherResults.map((voucher): ExpenseSearchResult => ({
      id: voucher.id,
      type: "expense",
      title: voucher.voucherNumber,
      subtitle: `${voucher.currency} ${voucher.totalAmount}`,
      description: voucher.description || undefined,
      relevanceScore: calculateRelevance(query, voucher.voucherNumber),
      createdAt: voucher.createdAt,
      metadata: {
        amount: voucher.totalAmount,
        currency: voucher.currency,
        status: voucher.status,
        requesterName: voucher.submitterName || undefined,
        voucherNumber: voucher.voucherNumber,
        expenseType: "voucher",
      },
    }));

    return [...requestMapped, ...voucherMapped];
  } catch (error) {
    console.error("Error searching expenses:", error);
    return [];
  }
}

/**
 * Search KYC documents
 */
async function searchDocuments(
  query: string,
  filters: SmartSearchFilters
): Promise<DocumentSearchResult[]> {
  try {
    const searchPattern = `%${query}%`;
    const limit = filters.limitPerType || DEFAULT_LIMIT_PER_TYPE;

    const results = await database
      .select({
        id: kycDocument.id,
        documentType: kycDocument.documentType,
        fileName: kycDocument.fileName,
        fileUrl: kycDocument.fileUrl,
        status: kycDocument.status,
        createdAt: kycDocument.createdAt,
        updatedAt: kycDocument.updatedAt,
      })
      .from(kycDocument)
      .where(
        or(
          ilike(kycDocument.fileName, searchPattern),
          ilike(kycDocument.documentType, searchPattern)
        )
      )
      .orderBy(desc(kycDocument.createdAt))
      .limit(limit);

    return results.map((doc): DocumentSearchResult => ({
      id: doc.id,
      type: "document",
      title: doc.fileName || doc.documentType,
      subtitle: `Type: ${doc.documentType}`,
      description: `Status: ${doc.status}`,
      relevanceScore: calculateRelevance(query, doc.fileName || doc.documentType),
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      metadata: {
        documentType: doc.documentType,
        fileUrl: doc.fileUrl || undefined,
        status: doc.status,
      },
    }));
  } catch (error) {
    console.error("Error searching documents:", error);
    return [];
  }
}

/**
 * Search users
 */
async function searchUsers(
  query: string,
  filters: SmartSearchFilters
): Promise<UserSearchResult[]> {
  try {
    const searchPattern = `%${query}%`;
    const limit = filters.limitPerType || DEFAULT_LIMIT_PER_TYPE;

    const results = await database
      .select()
      .from(user)
      .where(
        or(
          ilike(user.name, searchPattern),
          ilike(user.email, searchPattern)
        )
      )
      .orderBy(desc(user.createdAt))
      .limit(limit);

    return results.map((u): UserSearchResult => ({
      id: u.id,
      type: "user",
      title: u.name,
      subtitle: u.email,
      description: u.role ? `Role: ${u.role}` : undefined,
      relevanceScore: calculateRelevance(query, u.name),
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      metadata: {
        email: u.email,
        role: u.role || undefined,
        plan: u.plan,
        isAdmin: u.isAdmin,
      },
    }));
  } catch (error) {
    console.error("Error searching users:", error);
    return [];
  }
}

// =============================================================================
// Main Search Function
// =============================================================================

/**
 * Perform a unified smart search across all data types
 */
export async function performSmartSearch(
  query: string,
  filters: SmartSearchFilters = {}
): Promise<SmartSearchResult> {
  const startTime = Date.now();
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return {
      query,
      normalizedQuery,
      totalResults: 0,
      results: [],
      resultsByType: {
        tasks: [],
        contacts: [],
        messages: [],
        expenses: [],
        documents: [],
        users: [],
      },
      searchTime: 0,
      suggestions: [],
    };
  }

  // Determine which types to search
  const detectedIntents = detectSearchIntent(normalizedQuery);
  const typesToSearch = filters.types?.length
    ? filters.types
    : detectedIntents.length
      ? detectedIntents
      : (["task", "contact", "message", "expense", "document", "user"] as SearchResultType[]);

  // Perform parallel searches
  const searchPromises: Promise<SearchResult[]>[] = [];

  if (typesToSearch.includes("task")) {
    searchPromises.push(searchTasks(query, filters));
  }
  if (typesToSearch.includes("contact")) {
    searchPromises.push(searchContacts(query, filters));
  }
  if (typesToSearch.includes("message")) {
    searchPromises.push(searchMessages(query, filters));
  }
  if (typesToSearch.includes("expense")) {
    searchPromises.push(searchExpenses(query, filters));
  }
  if (typesToSearch.includes("document")) {
    searchPromises.push(searchDocuments(query, filters));
  }
  if (typesToSearch.includes("user")) {
    searchPromises.push(searchUsers(query, filters));
  }

  const searchResults = await Promise.all(searchPromises);

  // Flatten and filter results
  let allResults = searchResults.flat();

  // Apply minimum relevance filter
  const minRelevance = filters.minRelevance ?? DEFAULT_MIN_RELEVANCE;
  allResults = allResults.filter(r => r.relevanceScore >= minRelevance);

  // Sort by relevance
  allResults.sort((a, b) => b.relevanceScore - a.relevanceScore);

  // Apply total limit
  const totalLimit = filters.limit || DEFAULT_TOTAL_LIMIT;
  allResults = allResults.slice(0, totalLimit);

  // Categorize results
  const resultsByType = {
    tasks: allResults.filter((r): r is TaskSearchResult => r.type === "task"),
    contacts: allResults.filter((r): r is ContactSearchResult => r.type === "contact"),
    messages: allResults.filter((r): r is MessageSearchResult => r.type === "message"),
    expenses: allResults.filter((r): r is ExpenseSearchResult => r.type === "expense"),
    documents: allResults.filter((r): r is DocumentSearchResult => r.type === "document"),
    users: allResults.filter((r): r is UserSearchResult => r.type === "user"),
  };

  const searchTime = Date.now() - startTime;

  return {
    query,
    normalizedQuery,
    totalResults: allResults.length,
    results: allResults,
    resultsByType,
    searchTime,
    suggestions: generateSearchSuggestions(query, allResults),
  };
}

/**
 * Get search statistics
 */
export async function getSearchStatistics(): Promise<{
  totalTasks: number;
  totalContacts: number;
  totalMessages: number;
  totalExpenses: number;
  totalDocuments: number;
  totalUsers: number;
}> {
  try {
    const [contactCount] = await database.select({ count: count() }).from(syncedContact);
    const [messageCount] = await database.select({ count: count() }).from(message);
    const [expenseRequestCount] = await database.select({ count: count() }).from(expenseRequest);
    const [expenseVoucherCount] = await database.select({ count: count() }).from(expenseVoucher);
    const [documentCount] = await database.select({ count: count() }).from(kycDocument);
    const [userCount] = await database.select({ count: count() }).from(user);

    return {
      totalTasks: 0, // Tasks are in Odoo, would need to query separately
      totalContacts: contactCount?.count || 0,
      totalMessages: messageCount?.count || 0,
      totalExpenses: (expenseRequestCount?.count || 0) + (expenseVoucherCount?.count || 0),
      totalDocuments: documentCount?.count || 0,
      totalUsers: userCount?.count || 0,
    };
  } catch (error) {
    console.error("Error getting search statistics:", error);
    return {
      totalTasks: 0,
      totalContacts: 0,
      totalMessages: 0,
      totalExpenses: 0,
      totalDocuments: 0,
      totalUsers: 0,
    };
  }
}
