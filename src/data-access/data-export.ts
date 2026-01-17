/**
 * Data Export Data Access Layer
 * Provides functions to collect and format user data for export
 * Supports GDPR and data protection compliance
 */

import { eq, desc, and, gte, lte } from "drizzle-orm";
import { database } from "~/db";
import {
  user,
  userProfile,
  expenseRequest,
  dailyBriefing,
  callRecord,
  callDisposition,
  callTask,
  type User,
  type UserProfile,
  type ExpenseRequest,
  type DailyBriefing,
  type CallRecord,
} from "~/db/schema";

// =============================================================================
// Types
// =============================================================================

export type ExportFormat = "json" | "csv";

export interface DataExportFilters {
  startDate?: Date;
  endDate?: Date;
  includeProfile?: boolean;
  includeExpenses?: boolean;
  includeBriefings?: boolean;
  includeCallRecords?: boolean;
  includeCallDispositions?: boolean;
  includeCallTasks?: boolean;
}

export interface UserDataExport {
  exportedAt: string;
  userId: string;
  format: ExportFormat;
  user: Partial<User> | null;
  profile: UserProfile | null;
  expenses: ExpenseRequest[];
  briefings: Partial<DailyBriefing>[];
  callRecords: Partial<CallRecord>[];
  callDispositions: Array<{
    id: string;
    callRecordId: string;
    disposition: string;
    notes: string | null;
    customerSentiment: string | null;
    followUpDate: Date | null;
    createdAt: Date;
  }>;
  callTasks: Array<{
    id: string;
    callRecordId: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    dueDate: Date | null;
    createdAt: Date;
    completedAt: Date | null;
  }>;
  metadata: {
    totalRecords: number;
    filters: DataExportFilters;
  };
}

// =============================================================================
// Export Functions
// =============================================================================

/**
 * Get basic user information for export
 * Excludes sensitive fields like password hashes
 */
export async function getUserDataForExport(userId: string): Promise<Partial<User> | null> {
  const [userData] = await database
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      image: user.image,
      role: user.role,
      plan: user.plan,
      subscriptionStatus: user.subscriptionStatus,
      subscriptionExpiresAt: user.subscriptionExpiresAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  return userData || null;
}

/**
 * Get user profile for export
 */
export async function getUserProfileForExport(userId: string): Promise<UserProfile | null> {
  const [profile] = await database
    .select()
    .from(userProfile)
    .where(eq(userProfile.id, userId))
    .limit(1);

  return profile || null;
}

/**
 * Get user expense requests for export
 */
export async function getUserExpensesForExport(
  userId: string,
  filters?: Pick<DataExportFilters, "startDate" | "endDate">
): Promise<ExpenseRequest[]> {
  const conditions = [eq(expenseRequest.requesterId, userId)];

  if (filters?.startDate) {
    conditions.push(gte(expenseRequest.createdAt, filters.startDate));
  }
  if (filters?.endDate) {
    conditions.push(lte(expenseRequest.createdAt, filters.endDate));
  }

  const expenses = await database
    .select()
    .from(expenseRequest)
    .where(and(...conditions))
    .orderBy(desc(expenseRequest.createdAt));

  return expenses;
}

/**
 * Get user briefings for export
 */
export async function getUserBriefingsForExport(
  userId: string,
  filters?: Pick<DataExportFilters, "startDate" | "endDate">
): Promise<Partial<DailyBriefing>[]> {
  const conditions = [eq(dailyBriefing.userId, userId)];

  if (filters?.startDate) {
    conditions.push(gte(dailyBriefing.createdAt, filters.startDate));
  }
  if (filters?.endDate) {
    conditions.push(lte(dailyBriefing.createdAt, filters.endDate));
  }

  const briefings = await database
    .select({
      id: dailyBriefing.id,
      content: dailyBriefing.content,
      isRead: dailyBriefing.isRead,
      readAt: dailyBriefing.readAt,
      status: dailyBriefing.status,
      generatedAt: dailyBriefing.generatedAt,
      expiresAt: dailyBriefing.expiresAt,
      createdAt: dailyBriefing.createdAt,
    })
    .from(dailyBriefing)
    .where(and(...conditions))
    .orderBy(desc(dailyBriefing.createdAt));

  return briefings;
}

/**
 * Get user call records for export
 */
export async function getUserCallRecordsForExport(
  userId: string,
  filters?: Pick<DataExportFilters, "startDate" | "endDate">
): Promise<Partial<CallRecord>[]> {
  const conditions = [eq(callRecord.userId, userId)];

  if (filters?.startDate) {
    conditions.push(gte(callRecord.callTimestamp, filters.startDate));
  }
  if (filters?.endDate) {
    conditions.push(lte(callRecord.callTimestamp, filters.endDate));
  }

  const records = await database
    .select({
      id: callRecord.id,
      direction: callRecord.direction,
      duration: callRecord.duration,
      callTimestamp: callRecord.callTimestamp,
      callerId: callRecord.callerId,
      callerName: callRecord.callerName,
      recipientId: callRecord.recipientId,
      recipientName: callRecord.recipientName,
      summary: callRecord.summary,
      summaryGeneratedAt: callRecord.summaryGeneratedAt,
      status: callRecord.status,
      createdAt: callRecord.createdAt,
    })
    .from(callRecord)
    .where(and(...conditions))
    .orderBy(desc(callRecord.callTimestamp));

  return records;
}

/**
 * Get user call dispositions for export
 */
export async function getUserCallDispositionsForExport(
  userId: string,
  filters?: Pick<DataExportFilters, "startDate" | "endDate">
): Promise<Array<{
  id: string;
  callRecordId: string;
  disposition: string;
  notes: string | null;
  customerSentiment: string | null;
  followUpDate: Date | null;
  createdAt: Date;
}>> {
  const conditions = [eq(callDisposition.userId, userId)];

  if (filters?.startDate) {
    conditions.push(gte(callDisposition.createdAt, filters.startDate));
  }
  if (filters?.endDate) {
    conditions.push(lte(callDisposition.createdAt, filters.endDate));
  }

  const dispositions = await database
    .select({
      id: callDisposition.id,
      callRecordId: callDisposition.callRecordId,
      disposition: callDisposition.disposition,
      notes: callDisposition.notes,
      customerSentiment: callDisposition.customerSentiment,
      followUpDate: callDisposition.followUpDate,
      createdAt: callDisposition.createdAt,
    })
    .from(callDisposition)
    .where(and(...conditions))
    .orderBy(desc(callDisposition.createdAt));

  return dispositions;
}

/**
 * Get user call tasks for export
 */
export async function getUserCallTasksForExport(
  userId: string,
  filters?: Pick<DataExportFilters, "startDate" | "endDate">
): Promise<Array<{
  id: string;
  callRecordId: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: Date | null;
  createdAt: Date;
  completedAt: Date | null;
}>> {
  const conditions = [eq(callTask.userId, userId)];

  if (filters?.startDate) {
    conditions.push(gte(callTask.createdAt, filters.startDate));
  }
  if (filters?.endDate) {
    conditions.push(lte(callTask.createdAt, filters.endDate));
  }

  const tasks = await database
    .select({
      id: callTask.id,
      callRecordId: callTask.callRecordId,
      title: callTask.title,
      description: callTask.description,
      status: callTask.status,
      priority: callTask.priority,
      dueDate: callTask.dueDate,
      createdAt: callTask.createdAt,
      completedAt: callTask.completedAt,
    })
    .from(callTask)
    .where(and(...conditions))
    .orderBy(desc(callTask.createdAt));

  return tasks;
}

/**
 * Collect all user data for export
 * This is the main function to gather all exportable data
 */
export async function collectUserDataForExport(
  userId: string,
  filters: DataExportFilters = {}
): Promise<UserDataExport> {
  const defaultFilters: DataExportFilters = {
    includeProfile: true,
    includeExpenses: true,
    includeBriefings: true,
    includeCallRecords: true,
    includeCallDispositions: true,
    includeCallTasks: true,
    ...filters,
  };

  // Collect data in parallel where possible
  const [
    userData,
    profileData,
    expensesData,
    briefingsData,
    callRecordsData,
    callDispositionsData,
    callTasksData,
  ] = await Promise.all([
    getUserDataForExport(userId),
    defaultFilters.includeProfile ? getUserProfileForExport(userId) : Promise.resolve(null),
    defaultFilters.includeExpenses
      ? getUserExpensesForExport(userId, filters)
      : Promise.resolve([]),
    defaultFilters.includeBriefings
      ? getUserBriefingsForExport(userId, filters)
      : Promise.resolve([]),
    defaultFilters.includeCallRecords
      ? getUserCallRecordsForExport(userId, filters)
      : Promise.resolve([]),
    defaultFilters.includeCallDispositions
      ? getUserCallDispositionsForExport(userId, filters)
      : Promise.resolve([]),
    defaultFilters.includeCallTasks
      ? getUserCallTasksForExport(userId, filters)
      : Promise.resolve([]),
  ]);

  const totalRecords =
    (userData ? 1 : 0) +
    (profileData ? 1 : 0) +
    expensesData.length +
    briefingsData.length +
    callRecordsData.length +
    callDispositionsData.length +
    callTasksData.length;

  return {
    exportedAt: new Date().toISOString(),
    userId,
    format: "json", // Will be updated by the formatter
    user: userData,
    profile: profileData,
    expenses: expensesData,
    briefings: briefingsData,
    callRecords: callRecordsData,
    callDispositions: callDispositionsData,
    callTasks: callTasksData,
    metadata: {
      totalRecords,
      filters: defaultFilters,
    },
  };
}

// =============================================================================
// Format Converters
// =============================================================================

/**
 * Convert user data export to JSON string
 */
export function formatExportAsJson(data: UserDataExport): string {
  return JSON.stringify({ ...data, format: "json" }, null, 2);
}

/**
 * Convert user data export to CSV string
 * Creates a multi-section CSV with headers for each data type
 */
export function formatExportAsCsv(data: UserDataExport): string {
  const lines: string[] = [];

  // Helper to escape CSV values
  const escapeCSV = (value: unknown): string => {
    if (value === null || value === undefined) return "";
    const str = String(value);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // Helper to create CSV row
  const createRow = (values: unknown[]): string => values.map(escapeCSV).join(",");

  // Export metadata
  lines.push("# Data Export Report");
  lines.push(`# Exported At: ${data.exportedAt}`);
  lines.push(`# User ID: ${data.userId}`);
  lines.push(`# Total Records: ${data.metadata.totalRecords}`);
  lines.push("");

  // User information
  if (data.user) {
    lines.push("## User Information");
    lines.push("id,name,email,emailVerified,role,plan,subscriptionStatus,createdAt");
    lines.push(
      createRow([
        data.user.id,
        data.user.name,
        data.user.email,
        data.user.emailVerified,
        data.user.role,
        data.user.plan,
        data.user.subscriptionStatus,
        data.user.createdAt,
      ])
    );
    lines.push("");
  }

  // Profile information
  if (data.profile) {
    lines.push("## Profile Information");
    lines.push("id,bio,updatedAt");
    lines.push(createRow([data.profile.id, data.profile.bio, data.profile.updatedAt]));
    lines.push("");
  }

  // Expenses
  if (data.expenses.length > 0) {
    lines.push("## Expense Requests");
    lines.push("id,amount,currency,purpose,description,status,createdAt,submittedAt,approvedAt,rejectedAt,disbursedAt");
    for (const expense of data.expenses) {
      lines.push(
        createRow([
          expense.id,
          expense.amount,
          expense.currency,
          expense.purpose,
          expense.description,
          expense.status,
          expense.createdAt,
          expense.submittedAt,
          expense.approvedAt,
          expense.rejectedAt,
          expense.disbursedAt,
        ])
      );
    }
    lines.push("");
  }

  // Briefings
  if (data.briefings.length > 0) {
    lines.push("## Daily Briefings");
    lines.push("id,isRead,readAt,status,generatedAt,expiresAt,createdAt");
    for (const briefing of data.briefings) {
      lines.push(
        createRow([
          briefing.id,
          briefing.isRead,
          briefing.readAt,
          briefing.status,
          briefing.generatedAt,
          briefing.expiresAt,
          briefing.createdAt,
        ])
      );
    }
    lines.push("");
  }

  // Call Records
  if (data.callRecords.length > 0) {
    lines.push("## Call Records");
    lines.push("id,direction,duration,callTimestamp,callerId,callerName,recipientId,recipientName,status,createdAt");
    for (const record of data.callRecords) {
      lines.push(
        createRow([
          record.id,
          record.direction,
          record.duration,
          record.callTimestamp,
          record.callerId,
          record.callerName,
          record.recipientId,
          record.recipientName,
          record.status,
          record.createdAt,
        ])
      );
    }
    lines.push("");
  }

  // Call Dispositions
  if (data.callDispositions.length > 0) {
    lines.push("## Call Dispositions");
    lines.push("id,callRecordId,disposition,customerSentiment,followUpDate,createdAt");
    for (const disposition of data.callDispositions) {
      lines.push(
        createRow([
          disposition.id,
          disposition.callRecordId,
          disposition.disposition,
          disposition.customerSentiment,
          disposition.followUpDate,
          disposition.createdAt,
        ])
      );
    }
    lines.push("");
  }

  // Call Tasks
  if (data.callTasks.length > 0) {
    lines.push("## Call Tasks");
    lines.push("id,callRecordId,title,status,priority,dueDate,createdAt,completedAt");
    for (const task of data.callTasks) {
      lines.push(
        createRow([
          task.id,
          task.callRecordId,
          task.title,
          task.status,
          task.priority,
          task.dueDate,
          task.createdAt,
          task.completedAt,
        ])
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Format data export based on requested format
 */
export function formatDataExport(data: UserDataExport, format: ExportFormat): string {
  switch (format) {
    case "csv":
      return formatExportAsCsv(data);
    case "json":
    default:
      return formatExportAsJson(data);
  }
}

/**
 * Get content type for export format
 */
export function getContentTypeForFormat(format: ExportFormat): string {
  switch (format) {
    case "csv":
      return "text/csv";
    case "json":
    default:
      return "application/json";
  }
}

/**
 * Get file extension for export format
 */
export function getFileExtensionForFormat(format: ExportFormat): string {
  switch (format) {
    case "csv":
      return "csv";
    case "json":
    default:
      return "json";
  }
}
