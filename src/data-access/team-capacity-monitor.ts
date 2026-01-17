/**
 * Team Capacity Monitor Data Access Layer
 *
 * Provides database queries for team workload monitoring, assignment balance tracking,
 * and capacity constraint detection.
 *
 * Features:
 * - Real-time team member capacity tracking
 * - Workload distribution analysis
 * - Overload and underutilization detection
 * - Assignment balance monitoring
 * - Historical capacity trending
 */

import { eq, desc, and, gte, lte, sql, count, asc, lt, gt, ne, or, isNull } from "drizzle-orm";
import { database } from "~/db";
import {
  user,
  teamMemberCapacity,
  teamAssignment,
  capacityAlert,
  teamCapacitySnapshot,
  type User,
  type TeamMemberCapacity,
  type TeamAssignment,
  type CapacityAlert,
  type TeamCapacitySnapshot,
} from "~/db/schema";

// =============================================================================
// Types
// =============================================================================

/**
 * Alert severity levels for capacity monitoring
 */
export type CapacityAlertSeverity = "info" | "warning" | "critical";

/**
 * Alert types for capacity monitoring
 */
export type CapacityAlertType =
  | "member_overloaded"
  | "member_underutilized"
  | "team_capacity_critical"
  | "unbalanced_workload"
  | "deadline_risk"
  | "availability_gap";

/**
 * Member capacity status
 */
export type MemberCapacityStatus = "available" | "busy" | "overloaded" | "away" | "offline";

/**
 * Team member with capacity data
 */
export interface TeamMemberWithCapacity {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: string | null;
  capacity: {
    maxWeeklyHours: number;
    maxConcurrentTasks: number;
    maxActiveProjects: number;
    currentTasks: number;
    currentProjects: number;
    currentWeeklyHours: number;
    currentUtilization: number;
    status: MemberCapacityStatus;
    statusNote: string | null;
  } | null;
  assignments: TeamAssignmentSummary[];
}

/**
 * Team assignment summary
 */
export interface TeamAssignmentSummary {
  id: string;
  title: string;
  type: string;
  priority: string;
  status: string;
  estimatedHours: number | null;
  dueDate: Date | null;
  isOverdue: boolean;
}

/**
 * Capacity alert for monitoring
 */
export interface CapacityMonitorAlert {
  id: string;
  type: CapacityAlertType;
  severity: CapacityAlertSeverity;
  title: string;
  message: string;
  userId?: string;
  userName?: string;
  currentValue?: number;
  thresholdValue?: number;
  createdAt: Date;
  acknowledged: boolean;
}

/**
 * Team capacity summary
 */
export interface TeamCapacitySummary {
  totalMembers: number;
  availableMembers: number;
  busyMembers: number;
  overloadedMembers: number;
  awayMembers: number;
  averageUtilization: number;
  totalCapacityHours: number;
  usedCapacityHours: number;
  availableCapacityHours: number;
}

/**
 * Workload distribution analysis
 */
export interface WorkloadDistribution {
  underutilized: number; // Members with < 50% utilization
  optimal: number; // Members with 50-80% utilization
  busy: number; // Members with 80-100% utilization
  overloaded: number; // Members with > 100% utilization
  balanceScore: number; // 0-100, higher is better
}

/**
 * Capacity trend data point
 */
export interface CapacityTrendPoint {
  date: string;
  averageUtilization: number;
  overloadedCount: number;
  availableCapacityHours: number;
}

/**
 * Workload rebalancing suggestion
 */
export interface RebalancingSuggestion {
  id: string;
  type: "reassign" | "redistribute" | "defer" | "hire";
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  fromUserId?: string;
  fromUserName?: string;
  toUserId?: string;
  toUserName?: string;
  potentialImpact: string;
}

/**
 * Threshold configuration for capacity monitoring
 */
export interface CapacityThresholdConfig {
  overloadThreshold: number; // Utilization % considered overloaded (default: 100)
  warningThreshold: number; // Utilization % for warning (default: 85)
  underutilizedThreshold: number; // Utilization % considered underutilized (default: 30)
  criticalTeamUtilization: number; // Team avg utilization for critical alert (default: 90)
  workloadImbalanceThreshold: number; // Standard deviation for imbalance alert (default: 25)
}

/**
 * Complete team capacity monitor data
 */
export interface TeamCapacityMonitorData {
  summary: TeamCapacitySummary;
  members: TeamMemberWithCapacity[];
  distribution: WorkloadDistribution;
  alerts: CapacityMonitorAlert[];
  suggestions: RebalancingSuggestion[];
  trends: CapacityTrendPoint[];
  lastRefreshed: Date;
}

// =============================================================================
// Default Configuration
// =============================================================================

export const DEFAULT_CAPACITY_THRESHOLDS: CapacityThresholdConfig = {
  overloadThreshold: 100,
  warningThreshold: 85,
  underutilizedThreshold: 30,
  criticalTeamUtilization: 90,
  workloadImbalanceThreshold: 25,
};

// =============================================================================
// Team Member Queries
// =============================================================================

/**
 * Get all team members with their capacity data
 */
export async function getTeamMembersWithCapacity(): Promise<TeamMemberWithCapacity[]> {
  // Get all users with their capacity data
  const usersWithCapacity = await database
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role,
      capacityId: teamMemberCapacity.id,
      maxWeeklyHours: teamMemberCapacity.maxWeeklyHours,
      maxConcurrentTasks: teamMemberCapacity.maxConcurrentTasks,
      maxActiveProjects: teamMemberCapacity.maxActiveProjects,
      currentTasks: teamMemberCapacity.currentTasks,
      currentProjects: teamMemberCapacity.currentProjects,
      currentWeeklyHours: teamMemberCapacity.currentWeeklyHours,
      currentUtilization: teamMemberCapacity.currentUtilization,
      status: teamMemberCapacity.status,
      statusNote: teamMemberCapacity.statusNote,
    })
    .from(user)
    .leftJoin(teamMemberCapacity, eq(user.id, teamMemberCapacity.userId));

  // Get active assignments for each user
  const activeAssignments = await database
    .select({
      id: teamAssignment.id,
      userId: teamAssignment.userId,
      title: teamAssignment.title,
      assignmentType: teamAssignment.assignmentType,
      priority: teamAssignment.priority,
      status: teamAssignment.status,
      estimatedHours: teamAssignment.estimatedHours,
      dueDate: teamAssignment.dueDate,
    })
    .from(teamAssignment)
    .where(
      or(
        eq(teamAssignment.status, "assigned"),
        eq(teamAssignment.status, "in_progress")
      )
    );

  // Group assignments by user
  const assignmentsByUser = new Map<string, TeamAssignmentSummary[]>();
  const now = new Date();

  for (const assignment of activeAssignments) {
    const userId = assignment.userId;
    if (!assignmentsByUser.has(userId)) {
      assignmentsByUser.set(userId, []);
    }

    assignmentsByUser.get(userId)!.push({
      id: assignment.id,
      title: assignment.title,
      type: assignment.assignmentType,
      priority: assignment.priority,
      status: assignment.status,
      estimatedHours: assignment.estimatedHours,
      dueDate: assignment.dueDate,
      isOverdue: assignment.dueDate ? assignment.dueDate < now : false,
    });
  }

  // Combine data
  return usersWithCapacity.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    image: u.image,
    role: u.role,
    capacity: u.capacityId
      ? {
          maxWeeklyHours: u.maxWeeklyHours!,
          maxConcurrentTasks: u.maxConcurrentTasks!,
          maxActiveProjects: u.maxActiveProjects!,
          currentTasks: u.currentTasks!,
          currentProjects: u.currentProjects!,
          currentWeeklyHours: u.currentWeeklyHours!,
          currentUtilization: u.currentUtilization!,
          status: u.status as MemberCapacityStatus,
          statusNote: u.statusNote,
        }
      : null,
    assignments: assignmentsByUser.get(u.id) || [],
  }));
}

/**
 * Get a single team member's capacity data
 */
export async function getTeamMemberCapacity(
  userId: string
): Promise<TeamMemberWithCapacity | null> {
  const members = await getTeamMembersWithCapacity();
  return members.find((m) => m.id === userId) || null;
}

// =============================================================================
// Team Summary Queries
// =============================================================================

/**
 * Calculate team capacity summary
 */
export async function getTeamCapacitySummary(): Promise<TeamCapacitySummary> {
  const members = await getTeamMembersWithCapacity();

  let totalMembers = 0;
  let availableMembers = 0;
  let busyMembers = 0;
  let overloadedMembers = 0;
  let awayMembers = 0;
  let totalUtilization = 0;
  let totalCapacityHours = 0;
  let usedCapacityHours = 0;

  for (const member of members) {
    totalMembers++;

    if (member.capacity) {
      const utilization = member.capacity.currentUtilization;
      totalUtilization += utilization;
      totalCapacityHours += member.capacity.maxWeeklyHours;
      usedCapacityHours += member.capacity.currentWeeklyHours;

      switch (member.capacity.status) {
        case "available":
          availableMembers++;
          break;
        case "busy":
          busyMembers++;
          break;
        case "overloaded":
          overloadedMembers++;
          break;
        case "away":
        case "offline":
          awayMembers++;
          break;
      }
    } else {
      // Members without capacity data are considered available
      availableMembers++;
      totalCapacityHours += 40; // Default 40 hours
    }
  }

  const averageUtilization = totalMembers > 0 ? totalUtilization / totalMembers : 0;
  const availableCapacityHours = totalCapacityHours - usedCapacityHours;

  return {
    totalMembers,
    availableMembers,
    busyMembers,
    overloadedMembers,
    awayMembers,
    averageUtilization: Math.round(averageUtilization * 10) / 10,
    totalCapacityHours,
    usedCapacityHours,
    availableCapacityHours,
  };
}

/**
 * Analyze workload distribution across team
 */
export async function analyzeWorkloadDistribution(): Promise<WorkloadDistribution> {
  const members = await getTeamMembersWithCapacity();

  let underutilized = 0;
  let optimal = 0;
  let busy = 0;
  let overloaded = 0;
  const utilizations: number[] = [];

  for (const member of members) {
    const utilization = member.capacity?.currentUtilization ?? 0;
    utilizations.push(utilization);

    if (utilization < 30) {
      underutilized++;
    } else if (utilization < 80) {
      optimal++;
    } else if (utilization <= 100) {
      busy++;
    } else {
      overloaded++;
    }
  }

  // Calculate balance score based on standard deviation
  const mean = utilizations.reduce((a, b) => a + b, 0) / utilizations.length || 0;
  const squaredDiffs = utilizations.map((u) => Math.pow(u - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / squaredDiffs.length || 0;
  const stdDev = Math.sqrt(avgSquaredDiff);

  // Convert stdDev to a 0-100 score (lower stdDev = higher score)
  // StdDev of 0 = 100, StdDev of 50+ = 0
  const balanceScore = Math.max(0, Math.min(100, 100 - stdDev * 2));

  return {
    underutilized,
    optimal,
    busy,
    overloaded,
    balanceScore: Math.round(balanceScore),
  };
}

// =============================================================================
// Alert Generation
// =============================================================================

/**
 * Generate capacity alerts based on current state
 */
export async function generateCapacityAlerts(
  thresholds: CapacityThresholdConfig = DEFAULT_CAPACITY_THRESHOLDS
): Promise<CapacityMonitorAlert[]> {
  const alerts: CapacityMonitorAlert[] = [];
  const members = await getTeamMembersWithCapacity();
  const summary = await getTeamCapacitySummary();
  const distribution = await analyzeWorkloadDistribution();
  const now = new Date();

  // Check for overloaded members
  for (const member of members) {
    if (!member.capacity) continue;

    const utilization = member.capacity.currentUtilization;

    // Critical: Member overloaded
    if (utilization >= thresholds.overloadThreshold) {
      alerts.push({
        id: `overload-${member.id}-${now.getTime()}`,
        type: "member_overloaded",
        severity: "critical",
        title: "Team Member Overloaded",
        message: `${member.name} is at ${utilization.toFixed(0)}% capacity with ${member.assignments.length} active assignments`,
        userId: member.id,
        userName: member.name,
        currentValue: utilization,
        thresholdValue: thresholds.overloadThreshold,
        createdAt: now,
        acknowledged: false,
      });
    }
    // Warning: Member approaching overload
    else if (utilization >= thresholds.warningThreshold) {
      alerts.push({
        id: `warning-${member.id}-${now.getTime()}`,
        type: "member_overloaded",
        severity: "warning",
        title: "High Workload Warning",
        message: `${member.name} is at ${utilization.toFixed(0)}% capacity`,
        userId: member.id,
        userName: member.name,
        currentValue: utilization,
        thresholdValue: thresholds.warningThreshold,
        createdAt: now,
        acknowledged: false,
      });
    }
    // Info: Member underutilized
    else if (utilization <= thresholds.underutilizedThreshold && utilization > 0) {
      alerts.push({
        id: `underutilized-${member.id}-${now.getTime()}`,
        type: "member_underutilized",
        severity: "info",
        title: "Team Member Underutilized",
        message: `${member.name} is only at ${utilization.toFixed(0)}% capacity - available for more work`,
        userId: member.id,
        userName: member.name,
        currentValue: utilization,
        thresholdValue: thresholds.underutilizedThreshold,
        createdAt: now,
        acknowledged: false,
      });
    }

    // Check for deadline risks
    const overdueAssignments = member.assignments.filter((a) => a.isOverdue);
    if (overdueAssignments.length > 0) {
      alerts.push({
        id: `deadline-${member.id}-${now.getTime()}`,
        type: "deadline_risk",
        severity: "warning",
        title: "Overdue Assignments",
        message: `${member.name} has ${overdueAssignments.length} overdue assignment(s)`,
        userId: member.id,
        userName: member.name,
        currentValue: overdueAssignments.length,
        createdAt: now,
        acknowledged: false,
      });
    }
  }

  // Team-level alerts
  if (summary.averageUtilization >= thresholds.criticalTeamUtilization) {
    alerts.push({
      id: `team-critical-${now.getTime()}`,
      type: "team_capacity_critical",
      severity: "critical",
      title: "Team Capacity Critical",
      message: `Team average utilization is ${summary.averageUtilization.toFixed(0)}% - consider adding resources`,
      currentValue: summary.averageUtilization,
      thresholdValue: thresholds.criticalTeamUtilization,
      createdAt: now,
      acknowledged: false,
    });
  }

  // Workload imbalance alert
  if (distribution.balanceScore < 100 - thresholds.workloadImbalanceThreshold * 2) {
    alerts.push({
      id: `imbalance-${now.getTime()}`,
      type: "unbalanced_workload",
      severity: "warning",
      title: "Workload Imbalance Detected",
      message: `Work is unevenly distributed (balance score: ${distribution.balanceScore}%). ${distribution.overloaded} member(s) overloaded, ${distribution.underutilized} underutilized.`,
      currentValue: distribution.balanceScore,
      thresholdValue: 100 - thresholds.workloadImbalanceThreshold * 2,
      createdAt: now,
      acknowledged: false,
    });
  }

  // Sort alerts by severity
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return alerts;
}

// =============================================================================
// Rebalancing Suggestions
// =============================================================================

/**
 * Generate workload rebalancing suggestions
 */
export async function generateRebalancingSuggestions(): Promise<RebalancingSuggestion[]> {
  const suggestions: RebalancingSuggestion[] = [];
  const members = await getTeamMembersWithCapacity();

  // Find overloaded and underutilized members
  const overloaded = members.filter(
    (m) => m.capacity && m.capacity.currentUtilization > 100
  );
  const underutilized = members.filter(
    (m) => m.capacity && m.capacity.currentUtilization < 50
  );

  // Generate reassignment suggestions
  for (const overloadedMember of overloaded) {
    // Find tasks that could be reassigned
    const reassignableTasks = overloadedMember.assignments.filter(
      (a) => a.priority !== "urgent" && a.status === "assigned"
    );

    for (const task of reassignableTasks.slice(0, 2)) {
      // Limit suggestions
      for (const availableMember of underutilized.slice(0, 1)) {
        suggestions.push({
          id: `reassign-${task.id}-${availableMember.id}`,
          type: "reassign",
          title: `Reassign "${task.title}"`,
          description: `Move this ${task.type} from ${overloadedMember.name} to ${availableMember.name} to balance workload`,
          priority: overloadedMember.capacity!.currentUtilization > 120 ? "high" : "medium",
          fromUserId: overloadedMember.id,
          fromUserName: overloadedMember.name,
          toUserId: availableMember.id,
          toUserName: availableMember.name,
          potentialImpact: `Could reduce ${overloadedMember.name}'s load by ${task.estimatedHours || 4}+ hours`,
        });
      }
    }
  }

  // Generate general suggestions
  if (overloaded.length > 0 && underutilized.length === 0) {
    suggestions.push({
      id: "hire-suggestion",
      type: "hire",
      title: "Consider Adding Team Members",
      description: `${overloaded.length} team member(s) are overloaded with no available capacity to redistribute work`,
      priority: "high",
      potentialImpact: "Immediate relief for overloaded team members",
    });
  }

  if (overloaded.length > 2) {
    suggestions.push({
      id: "defer-suggestion",
      type: "defer",
      title: "Review and Defer Non-Critical Work",
      description: "With multiple team members overloaded, consider deferring lower-priority items",
      priority: "medium",
      potentialImpact: "Could free up capacity for critical work",
    });
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return suggestions;
}

// =============================================================================
// Historical Data & Trends
// =============================================================================

/**
 * Get capacity trends over time
 */
export async function getCapacityTrends(
  days: number = 14
): Promise<CapacityTrendPoint[]> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const snapshots = await database
    .select({
      snapshotDate: teamCapacitySnapshot.snapshotDate,
      averageUtilization: teamCapacitySnapshot.averageUtilization,
      overloadedMembers: teamCapacitySnapshot.overloadedMembers,
      availableCapacityHours: teamCapacitySnapshot.availableCapacityHours,
    })
    .from(teamCapacitySnapshot)
    .where(
      and(
        gte(teamCapacitySnapshot.snapshotDate, startDate),
        lte(teamCapacitySnapshot.snapshotDate, endDate)
      )
    )
    .orderBy(asc(teamCapacitySnapshot.snapshotDate));

  return snapshots.map((s) => ({
    date: s.snapshotDate.toISOString().split("T")[0],
    averageUtilization: s.averageUtilization,
    overloadedCount: s.overloadedMembers,
    availableCapacityHours: s.availableCapacityHours,
  }));
}

/**
 * Create a capacity snapshot for historical tracking
 */
export async function createCapacitySnapshot(): Promise<TeamCapacitySnapshot> {
  const summary = await getTeamCapacitySummary();
  const distribution = await analyzeWorkloadDistribution();

  // Count assignments at risk (overdue or due within 24 hours)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const atRiskAssignments = await database
    .select({ count: count() })
    .from(teamAssignment)
    .where(
      and(
        or(
          eq(teamAssignment.status, "assigned"),
          eq(teamAssignment.status, "in_progress")
        ),
        lte(teamAssignment.dueDate, tomorrow)
      )
    );

  const totalOpenAssignments = await database
    .select({ count: count() })
    .from(teamAssignment)
    .where(
      or(
        eq(teamAssignment.status, "assigned"),
        eq(teamAssignment.status, "in_progress")
      )
    );

  const snapshotId = `snapshot-${Date.now()}`;
  const snapshot = {
    id: snapshotId,
    snapshotDate: new Date(),
    totalMembers: summary.totalMembers,
    availableMembers: summary.availableMembers,
    overloadedMembers: summary.overloadedMembers,
    underutilizedMembers: distribution.underutilized,
    averageUtilization: summary.averageUtilization,
    totalCapacityHours: summary.totalCapacityHours,
    usedCapacityHours: summary.usedCapacityHours,
    availableCapacityHours: summary.availableCapacityHours,
    totalOpenAssignments: totalOpenAssignments[0]?.count || 0,
    assignmentsAtRisk: atRiskAssignments[0]?.count || 0,
    createdAt: new Date(),
  };

  await database.insert(teamCapacitySnapshot).values(snapshot);

  return snapshot;
}

// =============================================================================
// Complete Monitor Data
// =============================================================================

/**
 * Get complete team capacity monitor data
 */
export async function getTeamCapacityMonitorData(
  thresholds?: CapacityThresholdConfig
): Promise<TeamCapacityMonitorData> {
  const [summary, members, distribution, alerts, suggestions, trends] = await Promise.all([
    getTeamCapacitySummary(),
    getTeamMembersWithCapacity(),
    analyzeWorkloadDistribution(),
    generateCapacityAlerts(thresholds || DEFAULT_CAPACITY_THRESHOLDS),
    generateRebalancingSuggestions(),
    getCapacityTrends(14),
  ]);

  return {
    summary,
    members,
    distribution,
    alerts,
    suggestions,
    trends,
    lastRefreshed: new Date(),
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Update a team member's capacity data
 */
export async function updateMemberCapacity(
  userId: string,
  updates: {
    currentTasks?: number;
    currentProjects?: number;
    currentWeeklyHours?: number;
    status?: MemberCapacityStatus;
    statusNote?: string;
  }
): Promise<void> {
  const existing = await database
    .select()
    .from(teamMemberCapacity)
    .where(eq(teamMemberCapacity.userId, userId))
    .limit(1);

  // Calculate utilization if hours are updated
  let currentUtilization = updates.currentWeeklyHours
    ? (updates.currentWeeklyHours / 40) * 100
    : undefined;

  if (existing.length > 0) {
    const maxHours = existing[0].maxWeeklyHours;
    if (updates.currentWeeklyHours !== undefined) {
      currentUtilization = (updates.currentWeeklyHours / maxHours) * 100;
    }

    // Determine status based on utilization
    let newStatus = updates.status;
    if (!newStatus && currentUtilization !== undefined) {
      if (currentUtilization > 100) {
        newStatus = "overloaded";
      } else if (currentUtilization > 85) {
        newStatus = "busy";
      } else {
        newStatus = "available";
      }
    }

    await database
      .update(teamMemberCapacity)
      .set({
        ...updates,
        currentUtilization: currentUtilization ?? existing[0].currentUtilization,
        status: newStatus ?? existing[0].status,
        statusUpdatedAt: updates.status ? new Date() : existing[0].statusUpdatedAt,
        updatedAt: new Date(),
      })
      .where(eq(teamMemberCapacity.userId, userId));
  } else {
    // Create new capacity record
    const id = `cap-${userId}-${Date.now()}`;
    await database.insert(teamMemberCapacity).values({
      id,
      userId,
      currentTasks: updates.currentTasks ?? 0,
      currentProjects: updates.currentProjects ?? 0,
      currentWeeklyHours: updates.currentWeeklyHours ?? 0,
      currentUtilization: currentUtilization ?? 0,
      status: updates.status ?? "available",
      statusNote: updates.statusNote,
      statusUpdatedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}

/**
 * Recalculate capacity for all team members based on their assignments
 */
export async function recalculateTeamCapacity(): Promise<void> {
  // Get all users
  const users = await database.select({ id: user.id }).from(user);

  for (const u of users) {
    // Count active assignments
    const assignments = await database
      .select({
        count: count(),
        totalHours: sql<number>`COALESCE(SUM(${teamAssignment.estimatedHours}), 0)`,
      })
      .from(teamAssignment)
      .where(
        and(
          eq(teamAssignment.userId, u.id),
          or(
            eq(teamAssignment.status, "assigned"),
            eq(teamAssignment.status, "in_progress")
          )
        )
      );

    const taskCount = assignments[0]?.count || 0;
    const totalHours = assignments[0]?.totalHours || 0;

    // Count distinct projects
    const projects = await database
      .select({ count: sql<number>`COUNT(DISTINCT ${teamAssignment.referenceId})` })
      .from(teamAssignment)
      .where(
        and(
          eq(teamAssignment.userId, u.id),
          eq(teamAssignment.assignmentType, "project"),
          or(
            eq(teamAssignment.status, "assigned"),
            eq(teamAssignment.status, "in_progress")
          )
        )
      );

    const projectCount = projects[0]?.count || 0;

    await updateMemberCapacity(u.id, {
      currentTasks: taskCount,
      currentProjects: projectCount,
      currentWeeklyHours: totalHours,
    });
  }
}
