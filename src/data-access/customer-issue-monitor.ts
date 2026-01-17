/**
 * Customer Issue Monitor Data Access Layer
 *
 * Provides comprehensive database queries for monitoring customer support issues,
 * detecting escalating problems, SLA violations, and satisfaction risks.
 */

import { eq, desc, and, or, gte, lte, lt, count, sql } from "drizzle-orm";
import { database } from "~/db";
import {
  callRecord,
  callDisposition,
  callTask,
  callSummary,
  user,
  type CallDisposition,
  type CallRecord,
  type CallTask,
} from "~/db/schema";

// =============================================================================
// Types
// =============================================================================

export interface CustomerIssue {
  id: string;
  callRecordId: string;
  customerId: string | null;
  customerName: string | null;
  issueType: "escalation" | "follow_up" | "unresolved";
  status: "open" | "in_progress" | "resolved" | "overdue";
  priority: "low" | "medium" | "high" | "urgent";
  sentiment: string | null;
  summary: string | null;
  notes: string | null;
  assignedTo: string | null;
  assignedToName: string | null;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  slaStatus: "within_sla" | "at_risk" | "breached";
  hoursOpen: number;
}

export interface SLAConfiguration {
  escalationResponseHours: number;
  followUpCompletionHours: number;
  highPriorityResponseHours: number;
  mediumPriorityResponseHours: number;
  lowPriorityResponseHours: number;
}

export interface CustomerIssueStats {
  totalOpenIssues: number;
  totalEscalations: number;
  totalPendingFollowUps: number;
  overdueIssues: number;
  resolvedToday: number;
  resolvedThisWeek: number;
  avgResolutionTimeHours: number | null;
  slaComplianceRate: number;
  sentimentDistribution: { sentiment: string; count: number; percentage: number }[];
  issuesByPriority: { priority: string; count: number }[];
  issuesByAssignee: { userId: string; userName: string; openCount: number; resolvedCount: number }[];
}

export interface CustomerRiskProfile {
  customerId: string;
  customerName: string | null;
  riskLevel: "low" | "medium" | "high" | "critical";
  riskScore: number;
  totalInteractions: number;
  negativeInteractions: number;
  escalationCount: number;
  unresolvedIssueCount: number;
  lastInteractionDate: Date | null;
  lastSentiment: string | null;
  riskFactors: string[];
}

export interface EscalationTrend {
  date: string;
  newEscalations: number;
  resolvedEscalations: number;
  openEscalations: number;
}

export interface CustomerIssueSummary {
  id: string;
  callRecordId: string;
  customerName: string | null;
  direction: string;
  duration: number;
  callTimestamp: Date;
  disposition: string;
  sentiment: string | null;
  notes: string | null;
  summary: string | null;
  followUpDate: Date | null;
  escalationReason: string | null;
  escalationPriority: string | null;
  slaStatus: "within_sla" | "at_risk" | "breached";
}

// Default SLA Configuration
export const DEFAULT_SLA_CONFIG: SLAConfiguration = {
  escalationResponseHours: 4,
  followUpCompletionHours: 24,
  highPriorityResponseHours: 2,
  mediumPriorityResponseHours: 8,
  lowPriorityResponseHours: 24,
};

// =============================================================================
// Core Query Functions
// =============================================================================

/**
 * Get all open customer issues with details
 */
export async function getOpenCustomerIssues(
  slaConfig: SLAConfiguration = DEFAULT_SLA_CONFIG
): Promise<CustomerIssue[]> {
  const now = new Date();

  // Get all dispositions that are escalations or need follow-up
  const dispositions = await database
    .select({
      id: callDisposition.id,
      callRecordId: callDisposition.callRecordId,
      disposition: callDisposition.disposition,
      notes: callDisposition.notes,
      customerSentiment: callDisposition.customerSentiment,
      followUpDate: callDisposition.followUpDate,
      followUpReason: callDisposition.followUpReason,
      escalationReason: callDisposition.escalationReason,
      escalationPriority: callDisposition.escalationPriority,
      escalatedTo: callDisposition.escalatedTo,
      createdAt: callDisposition.createdAt,
      updatedAt: callDisposition.updatedAt,
    })
    .from(callDisposition)
    .where(
      or(
        eq(callDisposition.disposition, "escalate"),
        eq(callDisposition.disposition, "follow_up_needed")
      )
    )
    .orderBy(desc(callDisposition.createdAt));

  // Get related call records
  const callRecordIds = dispositions.map((d) => d.callRecordId);
  const records =
    callRecordIds.length > 0
      ? await database
          .select({
            id: callRecord.id,
            callerId: callRecord.callerId,
            callerName: callRecord.callerName,
            summary: callRecord.summary,
          })
          .from(callRecord)
          .where(sql`${callRecord.id} IN ${callRecordIds}`)
      : [];

  const recordMap = new Map(records.map((r) => [r.id, r]));

  // Get assignee info
  const assigneeIds = dispositions
    .map((d) => d.escalatedTo)
    .filter((id): id is string => id !== null);
  const assignees =
    assigneeIds.length > 0
      ? await database
          .select({ id: user.id, name: user.name })
          .from(user)
          .where(sql`${user.id} IN ${assigneeIds}`)
      : [];

  const assigneeMap = new Map(assignees.map((a) => [a.id, a.name]));

  return dispositions.map((d) => {
    const record = recordMap.get(d.callRecordId);
    const hoursOpen =
      (now.getTime() - d.createdAt.getTime()) / (1000 * 60 * 60);

    // Determine priority
    let priority: "low" | "medium" | "high" | "urgent" = "medium";
    if (d.escalationPriority === "urgent") priority = "urgent";
    else if (d.escalationPriority === "high") priority = "high";
    else if (d.escalationPriority === "low") priority = "low";
    else if (d.disposition === "escalate") priority = "high";

    // Calculate SLA status
    let slaThreshold = slaConfig.mediumPriorityResponseHours;
    if (d.disposition === "escalate") {
      slaThreshold = slaConfig.escalationResponseHours;
    } else if (d.disposition === "follow_up_needed") {
      slaThreshold = slaConfig.followUpCompletionHours;
    }

    let slaStatus: "within_sla" | "at_risk" | "breached" = "within_sla";
    if (hoursOpen >= slaThreshold) {
      slaStatus = "breached";
    } else if (hoursOpen >= slaThreshold * 0.75) {
      slaStatus = "at_risk";
    }

    // Determine status
    let status: "open" | "in_progress" | "resolved" | "overdue" = "open";
    if (d.followUpDate && d.followUpDate.getTime() < now.getTime()) {
      status = "overdue";
    } else if (d.escalatedTo) {
      status = "in_progress";
    }

    return {
      id: d.id,
      callRecordId: d.callRecordId,
      customerId: record?.callerId || null,
      customerName: record?.callerName || null,
      issueType: d.disposition === "escalate" ? "escalation" : "follow_up",
      status,
      priority,
      sentiment: d.customerSentiment,
      summary: record?.summary || null,
      notes: d.notes,
      assignedTo: d.escalatedTo,
      assignedToName: d.escalatedTo ? assigneeMap.get(d.escalatedTo) || null : null,
      dueDate: d.followUpDate,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
      slaStatus,
      hoursOpen: Math.round(hoursOpen * 10) / 10,
    };
  });
}

/**
 * Get customer issue statistics
 */
export async function getCustomerIssueStats(
  startDate?: Date,
  endDate?: Date
): Promise<CustomerIssueStats> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);

  // Get all dispositions
  const allDispositions = await database
    .select({
      id: callDisposition.id,
      disposition: callDisposition.disposition,
      customerSentiment: callDisposition.customerSentiment,
      escalationPriority: callDisposition.escalationPriority,
      escalatedTo: callDisposition.escalatedTo,
      followUpDate: callDisposition.followUpDate,
      createdAt: callDisposition.createdAt,
      updatedAt: callDisposition.updatedAt,
    })
    .from(callDisposition)
    .orderBy(desc(callDisposition.createdAt));

  // Filter by date range if provided
  let filtered = allDispositions;
  if (startDate) {
    filtered = filtered.filter((d) => d.createdAt >= startDate);
  }
  if (endDate) {
    filtered = filtered.filter((d) => d.createdAt <= endDate);
  }

  // Calculate stats
  const openIssues = filtered.filter(
    (d) => d.disposition === "escalate" || d.disposition === "follow_up_needed"
  );

  const totalOpenIssues = openIssues.length;
  const totalEscalations = openIssues.filter(
    (d) => d.disposition === "escalate"
  ).length;
  const totalPendingFollowUps = openIssues.filter(
    (d) => d.disposition === "follow_up_needed"
  ).length;

  const overdueIssues = openIssues.filter(
    (d) => d.followUpDate && d.followUpDate.getTime() < now.getTime()
  ).length;

  // Resolved issues
  const resolvedIssues = filtered.filter((d) => d.disposition === "resolved");
  const resolvedToday = resolvedIssues.filter(
    (d) => d.createdAt >= todayStart
  ).length;
  const resolvedThisWeek = resolvedIssues.filter(
    (d) => d.createdAt >= weekStart
  ).length;

  // Average resolution time (using time between creation and update for resolved issues)
  const resolvedWithTime = resolvedIssues.filter(
    (d) => d.updatedAt.getTime() !== d.createdAt.getTime()
  );
  const avgResolutionTimeHours =
    resolvedWithTime.length > 0
      ? resolvedWithTime.reduce(
          (sum, d) =>
            sum + (d.updatedAt.getTime() - d.createdAt.getTime()) / (1000 * 60 * 60),
          0
        ) / resolvedWithTime.length
      : null;

  // SLA compliance rate
  const slaConfig = DEFAULT_SLA_CONFIG;
  const slaCompliant = openIssues.filter((d) => {
    const hoursOpen = (now.getTime() - d.createdAt.getTime()) / (1000 * 60 * 60);
    const threshold =
      d.disposition === "escalate"
        ? slaConfig.escalationResponseHours
        : slaConfig.followUpCompletionHours;
    return hoursOpen < threshold;
  }).length;
  const slaComplianceRate =
    openIssues.length > 0 ? (slaCompliant / openIssues.length) * 100 : 100;

  // Sentiment distribution
  const sentimentCounts = new Map<string, number>();
  for (const d of filtered) {
    const sentiment = d.customerSentiment || "unknown";
    sentimentCounts.set(sentiment, (sentimentCounts.get(sentiment) || 0) + 1);
  }
  const total = filtered.length || 1;
  const sentimentDistribution = Array.from(sentimentCounts.entries()).map(
    ([sentiment, count]) => ({
      sentiment,
      count,
      percentage: Math.round((count / total) * 100),
    })
  );

  // Issues by priority
  const priorityCounts = new Map<string, number>();
  for (const d of openIssues) {
    const priority = d.escalationPriority || "medium";
    priorityCounts.set(priority, (priorityCounts.get(priority) || 0) + 1);
  }
  const issuesByPriority = Array.from(priorityCounts.entries()).map(
    ([priority, count]) => ({ priority, count })
  );

  // Issues by assignee
  const assigneeCounts = new Map<
    string,
    { openCount: number; resolvedCount: number }
  >();
  for (const d of filtered) {
    if (d.escalatedTo) {
      const current = assigneeCounts.get(d.escalatedTo) || {
        openCount: 0,
        resolvedCount: 0,
      };
      if (d.disposition === "resolved") {
        current.resolvedCount++;
      } else if (
        d.disposition === "escalate" ||
        d.disposition === "follow_up_needed"
      ) {
        current.openCount++;
      }
      assigneeCounts.set(d.escalatedTo, current);
    }
  }

  const assigneeIds = Array.from(assigneeCounts.keys());
  const assignees =
    assigneeIds.length > 0
      ? await database
          .select({ id: user.id, name: user.name })
          .from(user)
          .where(sql`${user.id} IN ${assigneeIds}`)
      : [];
  const assigneeMap = new Map(assignees.map((a) => [a.id, a.name]));

  const issuesByAssignee = Array.from(assigneeCounts.entries()).map(
    ([userId, counts]) => ({
      userId,
      userName: assigneeMap.get(userId) || "Unknown",
      ...counts,
    })
  );

  return {
    totalOpenIssues,
    totalEscalations,
    totalPendingFollowUps,
    overdueIssues,
    resolvedToday,
    resolvedThisWeek,
    avgResolutionTimeHours:
      avgResolutionTimeHours !== null
        ? Math.round(avgResolutionTimeHours * 10) / 10
        : null,
    slaComplianceRate: Math.round(slaComplianceRate),
    sentimentDistribution,
    issuesByPriority,
    issuesByAssignee,
  };
}

/**
 * Get customer risk profiles
 */
export async function getCustomerRiskProfiles(): Promise<CustomerRiskProfile[]> {
  // Get all dispositions grouped by caller
  const dispositions = await database
    .select({
      callRecordId: callDisposition.callRecordId,
      disposition: callDisposition.disposition,
      customerSentiment: callDisposition.customerSentiment,
      createdAt: callDisposition.createdAt,
    })
    .from(callDisposition)
    .orderBy(desc(callDisposition.createdAt));

  // Get call records for customer info
  const callRecordIds = [...new Set(dispositions.map((d) => d.callRecordId))];
  const records =
    callRecordIds.length > 0
      ? await database
          .select({
            id: callRecord.id,
            callerId: callRecord.callerId,
            callerName: callRecord.callerName,
            callTimestamp: callRecord.callTimestamp,
          })
          .from(callRecord)
          .where(sql`${callRecord.id} IN ${callRecordIds}`)
      : [];

  const recordMap = new Map(records.map((r) => [r.id, r]));

  // Group by customer
  const customerData = new Map<
    string,
    {
      name: string | null;
      interactions: {
        disposition: string;
        sentiment: string | null;
        date: Date;
      }[];
    }
  >();

  for (const d of dispositions) {
    const record = recordMap.get(d.callRecordId);
    if (!record?.callerId) continue;

    const existing = customerData.get(record.callerId) || {
      name: record.callerName,
      interactions: [],
    };
    existing.interactions.push({
      disposition: d.disposition,
      sentiment: d.customerSentiment,
      date: d.createdAt,
    });
    customerData.set(record.callerId, existing);
  }

  // Calculate risk profiles
  const profiles: CustomerRiskProfile[] = [];

  for (const [customerId, data] of customerData) {
    const totalInteractions = data.interactions.length;
    const negativeInteractions = data.interactions.filter(
      (i) => i.sentiment === "negative" || i.sentiment === "very_negative"
    ).length;
    const escalationCount = data.interactions.filter(
      (i) => i.disposition === "escalate"
    ).length;
    const unresolvedIssueCount = data.interactions.filter(
      (i) =>
        i.disposition === "escalate" || i.disposition === "follow_up_needed"
    ).length;

    // Calculate risk score (0-100)
    let riskScore = 0;

    // Negative sentiment contributes up to 30 points
    const negativePct = totalInteractions > 0 ? negativeInteractions / totalInteractions : 0;
    riskScore += negativePct * 30;

    // Escalations contribute up to 40 points
    const escalationPct = totalInteractions > 0 ? escalationCount / totalInteractions : 0;
    riskScore += escalationPct * 40;

    // Unresolved issues contribute up to 30 points
    riskScore += Math.min(unresolvedIssueCount * 10, 30);

    // Determine risk level
    let riskLevel: "low" | "medium" | "high" | "critical" = "low";
    if (riskScore >= 70) riskLevel = "critical";
    else if (riskScore >= 50) riskLevel = "high";
    else if (riskScore >= 25) riskLevel = "medium";

    // Identify risk factors
    const riskFactors: string[] = [];
    if (negativeInteractions > 0) {
      riskFactors.push(`${negativeInteractions} negative interaction(s)`);
    }
    if (escalationCount > 0) {
      riskFactors.push(`${escalationCount} escalation(s)`);
    }
    if (unresolvedIssueCount > 0) {
      riskFactors.push(`${unresolvedIssueCount} unresolved issue(s)`);
    }

    const sortedInteractions = [...data.interactions].sort(
      (a, b) => b.date.getTime() - a.date.getTime()
    );

    profiles.push({
      customerId,
      customerName: data.name,
      riskLevel,
      riskScore: Math.round(riskScore),
      totalInteractions,
      negativeInteractions,
      escalationCount,
      unresolvedIssueCount,
      lastInteractionDate: sortedInteractions[0]?.date || null,
      lastSentiment: sortedInteractions[0]?.sentiment || null,
      riskFactors,
    });
  }

  // Sort by risk score descending
  return profiles.sort((a, b) => b.riskScore - a.riskScore);
}

/**
 * Get escalation trends over time
 */
export async function getEscalationTrends(
  days: number = 7
): Promise<EscalationTrend[]> {
  const result: EscalationTrend[] = [];
  const now = new Date();

  // Get all escalation dispositions
  const allEscalations = await database
    .select({
      id: callDisposition.id,
      disposition: callDisposition.disposition,
      createdAt: callDisposition.createdAt,
      updatedAt: callDisposition.updatedAt,
    })
    .from(callDisposition)
    .where(eq(callDisposition.disposition, "escalate"));

  // Get resolved dispositions (for tracking resolutions)
  const allResolved = await database
    .select({
      id: callDisposition.id,
      createdAt: callDisposition.createdAt,
    })
    .from(callDisposition)
    .where(eq(callDisposition.disposition, "resolved"));

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];

    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    const newEscalations = allEscalations.filter(
      (e) => e.createdAt >= dayStart && e.createdAt < dayEnd
    ).length;

    const resolvedEscalations = allResolved.filter(
      (r) => r.createdAt >= dayStart && r.createdAt < dayEnd
    ).length;

    // Open escalations are those created before day end that weren't resolved before day end
    const openEscalations = allEscalations.filter(
      (e) => e.createdAt < dayEnd
    ).length - allResolved.filter(
      (r) => r.createdAt < dayEnd
    ).length;

    result.push({
      date: dateStr,
      newEscalations,
      resolvedEscalations,
      openEscalations: Math.max(0, openEscalations),
    });
  }

  return result;
}

/**
 * Get recent customer issues with full details
 */
export async function getRecentCustomerIssues(
  limit: number = 20
): Promise<CustomerIssueSummary[]> {
  const now = new Date();
  const slaConfig = DEFAULT_SLA_CONFIG;

  const dispositions = await database
    .select({
      id: callDisposition.id,
      callRecordId: callDisposition.callRecordId,
      disposition: callDisposition.disposition,
      notes: callDisposition.notes,
      customerSentiment: callDisposition.customerSentiment,
      followUpDate: callDisposition.followUpDate,
      escalationReason: callDisposition.escalationReason,
      escalationPriority: callDisposition.escalationPriority,
      createdAt: callDisposition.createdAt,
    })
    .from(callDisposition)
    .where(
      or(
        eq(callDisposition.disposition, "escalate"),
        eq(callDisposition.disposition, "follow_up_needed")
      )
    )
    .orderBy(desc(callDisposition.createdAt))
    .limit(limit);

  const callRecordIds = dispositions.map((d) => d.callRecordId);
  const records =
    callRecordIds.length > 0
      ? await database
          .select({
            id: callRecord.id,
            callerName: callRecord.callerName,
            direction: callRecord.direction,
            duration: callRecord.duration,
            callTimestamp: callRecord.callTimestamp,
            summary: callRecord.summary,
          })
          .from(callRecord)
          .where(sql`${callRecord.id} IN ${callRecordIds}`)
      : [];

  const recordMap = new Map(records.map((r) => [r.id, r]));

  return dispositions.map((d) => {
    const record = recordMap.get(d.callRecordId);
    const hoursOpen =
      (now.getTime() - d.createdAt.getTime()) / (1000 * 60 * 60);

    const threshold =
      d.disposition === "escalate"
        ? slaConfig.escalationResponseHours
        : slaConfig.followUpCompletionHours;

    let slaStatus: "within_sla" | "at_risk" | "breached" = "within_sla";
    if (hoursOpen >= threshold) {
      slaStatus = "breached";
    } else if (hoursOpen >= threshold * 0.75) {
      slaStatus = "at_risk";
    }

    return {
      id: d.id,
      callRecordId: d.callRecordId,
      customerName: record?.callerName || null,
      direction: record?.direction || "unknown",
      duration: record?.duration || 0,
      callTimestamp: record?.callTimestamp || d.createdAt,
      disposition: d.disposition,
      sentiment: d.customerSentiment,
      notes: d.notes,
      summary: record?.summary || null,
      followUpDate: d.followUpDate,
      escalationReason: d.escalationReason,
      escalationPriority: d.escalationPriority,
      slaStatus,
    };
  });
}

/**
 * Get issue details by ID
 */
export async function getCustomerIssueById(
  id: string
): Promise<CustomerIssue | null> {
  const issues = await getOpenCustomerIssues();
  return issues.find((i) => i.id === id) || null;
}

/**
 * Get issues for a specific customer
 */
export async function getIssuesByCustomerId(
  customerId: string
): Promise<CustomerIssue[]> {
  const issues = await getOpenCustomerIssues();
  return issues.filter((i) => i.customerId === customerId);
}

/**
 * Get SLA breach count by time period
 */
export async function getSLABreachStats(
  startDate: Date,
  endDate: Date
): Promise<{
  totalIssues: number;
  breachedCount: number;
  atRiskCount: number;
  withinSlaCount: number;
  breachRate: number;
}> {
  const issues = await getOpenCustomerIssues();
  const filteredIssues = issues.filter(
    (i) => i.createdAt >= startDate && i.createdAt <= endDate
  );

  const breachedCount = filteredIssues.filter(
    (i) => i.slaStatus === "breached"
  ).length;
  const atRiskCount = filteredIssues.filter(
    (i) => i.slaStatus === "at_risk"
  ).length;
  const withinSlaCount = filteredIssues.filter(
    (i) => i.slaStatus === "within_sla"
  ).length;

  return {
    totalIssues: filteredIssues.length,
    breachedCount,
    atRiskCount,
    withinSlaCount,
    breachRate:
      filteredIssues.length > 0
        ? Math.round((breachedCount / filteredIssues.length) * 100)
        : 0,
  };
}
