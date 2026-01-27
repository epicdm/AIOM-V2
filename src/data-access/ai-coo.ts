import { database as db } from "~/db";
import {
  monitoringJobs,
  analysisResults,
  alerts,
  dailyBriefings,
  autonomousActions,
  alertRules,
  aiCooUsage,
} from "~/db/ai-coo-schema";
import { eq, desc, and, gte, lte, inArray } from "drizzle-orm";

// ============================================================================
// Monitoring Jobs
// ============================================================================

export async function getMonitoringJobs() {
  return db.select().from(monitoringJobs).where(eq(monitoringJobs.enabled, true));
}

export async function getMonitoringJob(id: string) {
  const [job] = await db.select().from(monitoringJobs).where(eq(monitoringJobs.id, id));
  return job;
}

export async function createMonitoringJob(data: typeof monitoringJobs.$inferInsert) {
  const [job] = await db.insert(monitoringJobs).values(data).returning();
  return job;
}

export async function updateJobLastRun(id: string, nextRunAt: Date) {
  return db
    .update(monitoringJobs)
    .set({ lastRunAt: new Date(), nextRunAt, updatedAt: new Date() })
    .where(eq(monitoringJobs.id, id));
}

export async function updateMonitoringJob(
  id: string,
  data: Partial<typeof monitoringJobs.$inferInsert>
) {
  return db
    .update(monitoringJobs)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(monitoringJobs.id, id));
}

// ============================================================================
// Analysis Results
// ============================================================================

export async function createAnalysisResult(data: typeof analysisResults.$inferInsert) {
  const [result] = await db.insert(analysisResults).values(data).returning();
  return result;
}

export async function getLatestAnalysisResults(limit = 10) {
  return db.select().from(analysisResults).orderBy(desc(analysisResults.runAt)).limit(limit);
}

export async function getAnalysisResultsByJob(jobId: string, limit = 10) {
  return db
    .select()
    .from(analysisResults)
    .where(eq(analysisResults.jobId, jobId))
    .orderBy(desc(analysisResults.runAt))
    .limit(limit);
}

export async function getAnalysisResultsInDateRange(startDate: Date, endDate: Date) {
  return db
    .select()
    .from(analysisResults)
    .where(and(gte(analysisResults.runAt, startDate), lte(analysisResults.runAt, endDate)))
    .orderBy(desc(analysisResults.runAt));
}

// ============================================================================
// Alerts
// ============================================================================

export async function createAlert(data: typeof alerts.$inferInsert) {
  const [alert] = await db.insert(alerts).values(data).returning();
  return alert;
}

export async function getActiveAlerts() {
  return db
    .select()
    .from(alerts)
    .where(eq(alerts.status, "new"))
    .orderBy(desc(alerts.createdAt));
}

export async function getAlertsByPriority(priority: string) {
  return db
    .select()
    .from(alerts)
    .where(and(eq(alerts.status, "new"), eq(alerts.priority, priority)))
    .orderBy(desc(alerts.createdAt));
}

export async function getAlertsByType(type: string) {
  return db
    .select()
    .from(alerts)
    .where(and(eq(alerts.status, "new"), eq(alerts.type, type)))
    .orderBy(desc(alerts.createdAt));
}

export async function acknowledgeAlert(id: string, userId: string) {
  return db
    .update(alerts)
    .set({
      status: "acknowledged",
      acknowledgedBy: userId,
      acknowledgedAt: new Date(),
    })
    .where(eq(alerts.id, id));
}

export async function dismissAlert(id: string) {
  return db.update(alerts).set({ status: "dismissed" }).where(eq(alerts.id, id));
}

export async function resolveAlert(id: string) {
  return db
    .update(alerts)
    .set({ status: "resolved", resolvedAt: new Date() })
    .where(eq(alerts.id, id));
}

// ============================================================================
// Daily Briefings
// ============================================================================

export async function createDailyBriefing(data: typeof dailyBriefings.$inferInsert) {
  const [briefing] = await db.insert(dailyBriefings).values(data).returning();
  return briefing;
}

export async function getDailyBriefing(userId: string, date: Date) {
  const [briefing] = await db
    .select()
    .from(dailyBriefings)
    .where(and(eq(dailyBriefings.userId, userId), eq(dailyBriefings.date, date)));
  return briefing;
}

export async function getLatestBriefings(userId: string, limit = 7) {
  return db
    .select()
    .from(dailyBriefings)
    .where(eq(dailyBriefings.userId, userId))
    .orderBy(desc(dailyBriefings.date))
    .limit(limit);
}

export async function markBriefingAsRead(id: string) {
  return db
    .update(dailyBriefings)
    .set({ readAt: new Date() })
    .where(eq(dailyBriefings.id, id));
}

export async function markBriefingAsDelivered(id: string, method: string) {
  return db
    .update(dailyBriefings)
    .set({ deliveredAt: new Date(), deliveryMethod: method })
    .where(eq(dailyBriefings.id, id));
}

// ============================================================================
// Autonomous Actions
// ============================================================================

export async function createAutonomousAction(data: typeof autonomousActions.$inferInsert) {
  const [action] = await db.insert(autonomousActions).values(data).returning();
  return action;
}

export async function getPendingActions() {
  return db
    .select()
    .from(autonomousActions)
    .where(eq(autonomousActions.status, "pending"))
    .orderBy(desc(autonomousActions.createdAt));
}

/**
 * Get actions awaiting user approval
 * For the Operator Dashboard approval UI
 */
export async function getPendingApprovals(limit = 50) {
  return db
    .select()
    .from(autonomousActions)
    .where(eq(autonomousActions.status, "pending_approval"))
    .orderBy(desc(autonomousActions.createdAt))
    .limit(limit);
}

/**
 * Get recently executed/completed actions
 * For dashboard activity feed
 */
export async function getRecentActions(limit = 20) {
  return db
    .select()
    .from(autonomousActions)
    .where(
      inArray(autonomousActions.status, ["executed", "completed", "failed", "rejected"])
    )
    .orderBy(desc(autonomousActions.createdAt))
    .limit(limit);
}

/**
 * Get action history with filters
 * For dashboard audit trail
 */
export async function getActionHistory(filters?: {
  status?: string;
  actionType?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}) {
  const conditions = [];

  if (filters?.status) {
    conditions.push(eq(autonomousActions.status, filters.status));
  }

  if (filters?.actionType) {
    conditions.push(eq(autonomousActions.actionType, filters.actionType));
  }

  if (filters?.startDate) {
    conditions.push(gte(autonomousActions.createdAt, filters.startDate));
  }

  if (filters?.endDate) {
    conditions.push(lte(autonomousActions.createdAt, filters.endDate));
  }

  let query = db.select().from(autonomousActions);

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  return query
    .orderBy(desc(autonomousActions.createdAt))
    .limit(filters?.limit || 100);
}

/**
 * Get actions by risk level
 * For dashboard risk monitoring
 */
export async function getActionsByRiskLevel(riskLevel: string, limit = 20) {
  return db
    .select()
    .from(autonomousActions)
    .where(eq(autonomousActions.riskLevel, riskLevel))
    .orderBy(desc(autonomousActions.createdAt))
    .limit(limit);
}

/**
 * Get action statistics
 * For dashboard metrics
 */
export async function getActionStats(startDate?: Date, endDate?: Date) {
  const conditions = [];

  if (startDate) {
    conditions.push(gte(autonomousActions.createdAt, startDate));
  }

  if (endDate) {
    conditions.push(lte(autonomousActions.createdAt, endDate));
  }

  let query = db.select().from(autonomousActions);

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  const actions = await query;

  // Calculate statistics
  const stats = {
    total: actions.length,
    pending_approval: actions.filter(a => a.status === 'pending_approval').length,
    approved: actions.filter(a => a.status === 'approved').length,
    executed: actions.filter(a => a.status === 'executed').length,
    failed: actions.filter(a => a.status === 'failed').length,
    rejected: actions.filter(a => a.status === 'rejected').length,
    byType: {} as Record<string, number>,
    byRiskLevel: {} as Record<string, number>,
  };

  // Count by action type
  actions.forEach(action => {
    stats.byType[action.actionType] = (stats.byType[action.actionType] || 0) + 1;
    if (action.riskLevel) {
      stats.byRiskLevel[action.riskLevel] = (stats.byRiskLevel[action.riskLevel] || 0) + 1;
    }
  });

  return stats;
}

export async function getActionById(id: string) {
  const [action] = await db.select().from(autonomousActions).where(eq(autonomousActions.id, id));
  return action;
}

export async function getApprovedActions() {
  return db
    .select()
    .from(autonomousActions)
    .where(eq(autonomousActions.status, "approved"))
    .orderBy(autonomousActions.createdAt);
}

export async function getActionsByIdempotencyKey(key: string) {
  const [action] = await db
    .select()
    .from(autonomousActions)
    .where(eq(autonomousActions.idempotencyKey, key));
  return action;
}

export async function getExpiredActions() {
  const now = new Date();
  return db
    .select()
    .from(autonomousActions)
    .where(
      and(
        eq(autonomousActions.status, "pending_approval"),
        lte(autonomousActions.expiresAt, now)
      )
    );
}

export async function approveAction(id: string, userId: string) {
  return db
    .update(autonomousActions)
    .set({
      status: "approved",
      approvedBy: userId,
      approvedAt: new Date(),
    })
    .where(eq(autonomousActions.id, id));
}

export async function rejectAction(id: string) {
  return db.update(autonomousActions).set({ status: "rejected" }).where(eq(autonomousActions.id, id));
}

export async function updateActionStatus(id: string, status: string) {
  return db
    .update(autonomousActions)
    .set({ status })
    .where(eq(autonomousActions.id, id));
}

export async function markActionAsExecuted(id: string, result: any) {
  return db
    .update(autonomousActions)
    .set({
      status: "executed",
      executedAt: new Date(),
      result,
    })
    .where(eq(autonomousActions.id, id));
}

export async function markActionAsFailed(id: string, error: string) {
  return db
    .update(autonomousActions)
    .set({
      status: "failed",
      result: { error },
    })
    .where(eq(autonomousActions.id, id));
}

// ============================================================================
// Alert Rules
// ============================================================================

export async function createAlertRule(data: typeof alertRules.$inferInsert) {
  const [rule] = await db.insert(alertRules).values(data).returning();
  return rule;
}

export async function getAlertRules(userId?: string) {
  if (userId) {
    return db
      .select()
      .from(alertRules)
      .where(and(eq(alertRules.userId, userId), eq(alertRules.enabled, true)));
  }
  return db.select().from(alertRules).where(eq(alertRules.enabled, true));
}

export async function updateAlertRule(id: string, data: Partial<typeof alertRules.$inferInsert>) {
  return db
    .update(alertRules)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(alertRules.id, id));
}

export async function deleteAlertRule(id: string) {
  return db.delete(alertRules).where(eq(alertRules.id, id));
}

// ============================================================================
// AI COO Usage Analytics
// ============================================================================

export async function trackAICooUsage(data: typeof aiCooUsage.$inferInsert) {
  const [usage] = await db.insert(aiCooUsage).values(data).returning();
  return usage;
}

export async function getUsageStats(startDate?: Date, endDate?: Date) {
  let query = db.select().from(aiCooUsage);

  if (startDate && endDate) {
    query = query.where(
      and(gte(aiCooUsage.createdAt, startDate), lte(aiCooUsage.createdAt, endDate))
    ) as any;
  }

  return query.orderBy(desc(aiCooUsage.createdAt));
}

export async function getUsageByFeature(feature: string, limit = 100) {
  return db
    .select()
    .from(aiCooUsage)
    .where(eq(aiCooUsage.feature, feature))
    .orderBy(desc(aiCooUsage.createdAt))
    .limit(limit);
}
