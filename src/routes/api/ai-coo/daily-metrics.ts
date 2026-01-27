import { createFileRoute } from '@tanstack/react-router';
import { database as db } from '~/db';
import { autonomousActions, analysisResults } from '~/db/ai-coo-schema';
import { desc, gte, lte, eq, and, count, sql } from 'drizzle-orm';
import { getClaudeSDKClient } from '~/lib/claude/sdk-client';

export const Route = createFileRoute('/api/ai-coo/daily-metrics')({
  server: {
    handlers: {
      /**
       * GET /api/ai-coo/daily-metrics
       *
       * Fetches daily metrics, insights, and patterns for the AI COO dashboard
       */
      GET: async ({ request }) => {
        try {
          const now = new Date();
          const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);

          console.log('[AI COO API] Fetching daily metrics');

          // Fetch today's metrics
          const todayMetrics = await calculateTodayMetrics(startOfToday);

          // Fetch yesterday's metrics for trends
          const yesterdayMetrics = await calculateDailyMetrics(startOfYesterday, startOfToday);

          // Calculate trends (compare today vs yesterday)
          const metrics = calculateMetricsWithTrends(todayMetrics, yesterdayMetrics);

          // Generate AI insights
          const insights = await generateAIInsights(todayMetrics);

          // Calculate patterns
          const patterns = await calculatePatterns();

          console.log('[AI COO API] Daily metrics calculated:', {
            actionsCompleted: metrics.actionsCompleted.value,
            insightsGenerated: insights.length,
          });

          return Response.json({
            metrics,
            insights,
            patterns,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error('[AI COO API] Failed to fetch daily metrics:', error);
          return Response.json(
            {
              error: 'Failed to fetch daily metrics',
              message: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
          );
        }
      },
    },
  },
});

// ============================================================================
// METRICS CALCULATION
// ============================================================================

interface DailyMetrics {
  actionsCompleted: number;
  automated: number;
  ownerApprovals: number;
  revenueProtected: string;
  timeSaved: string;
  successRate: number;
  sparklineData: number[];
}

/**
 * Calculate metrics for today
 */
async function calculateTodayMetrics(startOfToday: Date): Promise<DailyMetrics> {
  // Count completed actions today
  const completedActions = await db
    .select({ count: count() })
    .from(autonomousActions)
    .where(
      and(
        eq(autonomousActions.status, 'executed'),
        gte(autonomousActions.executedAt!, startOfToday)
      )
    );

  const actionsCompleted = completedActions[0]?.count || 0;

  // Count automated (no approval needed)
  const automatedActions = await db
    .select({ count: count() })
    .from(autonomousActions)
    .where(
      and(
        eq(autonomousActions.status, 'executed'),
        eq(autonomousActions.requiresApproval, false),
        gte(autonomousActions.executedAt!, startOfToday)
      )
    );

  const automated = automatedActions[0]?.count || 0;

  // Count owner approvals
  const approvals = await db
    .select({ count: count() })
    .from(autonomousActions)
    .where(
      and(
        eq(autonomousActions.requiresApproval, true),
        gte(autonomousActions.approvedAt!, startOfToday)
      )
    );

  const ownerApprovals = approvals[0]?.count || 0;

  // Calculate revenue protected (sum from action protocols)
  const revenueProtected = await calculateRevenueProtected(startOfToday);

  // Estimate time saved (3 minutes per automated action)
  const totalMinutes = automated * 3;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const timeSaved = hours > 0 ? `${hours}.${Math.floor(minutes / 6)} hrs` : `${minutes} min`;

  // Calculate success rate
  const failedActions = await db
    .select({ count: count() })
    .from(autonomousActions)
    .where(
      and(eq(autonomousActions.status, 'failed'), gte(autonomousActions.createdAt, startOfToday))
    );

  const failed = failedActions[0]?.count || 0;
  const total = actionsCompleted + failed;
  const successRate = total > 0 ? Math.round((actionsCompleted / total) * 100) : 100;

  // Generate sparkline data (last 7 days)
  const sparklineData = await generateSparklineData();

  return {
    actionsCompleted,
    automated,
    ownerApprovals,
    revenueProtected,
    timeSaved,
    successRate,
    sparklineData,
  };
}

/**
 * Calculate metrics for a specific day
 */
async function calculateDailyMetrics(startDate: Date, endDate: Date): Promise<DailyMetrics> {
  const completedActions = await db
    .select({ count: count() })
    .from(autonomousActions)
    .where(
      and(
        eq(autonomousActions.status, 'executed'),
        gte(autonomousActions.executedAt!, startDate),
        lte(autonomousActions.executedAt!, endDate)
      )
    );

  const actionsCompleted = completedActions[0]?.count || 0;

  // For simplicity, return basic metrics (full calculation can be added if needed)
  return {
    actionsCompleted,
    automated: Math.floor(actionsCompleted * 0.7), // Estimate
    ownerApprovals: Math.floor(actionsCompleted * 0.3), // Estimate
    revenueProtected: '$0',
    timeSaved: '0 hrs',
    successRate: 95,
    sparklineData: [],
  };
}

/**
 * Calculate revenue protected from actions
 */
async function calculateRevenueProtected(startDate: Date): Promise<string> {
  // Fetch all invoice-related actions
  const actions = await db
    .select()
    .from(autonomousActions)
    .where(
      and(
        gte(autonomousActions.createdAt, startDate),
        sql`${autonomousActions.actionType} LIKE '%invoice%'`
      )
    );

  let totalRevenue = 0;

  for (const action of actions) {
    const protocol = action.actionProtocol as any;
    const recordName = protocol?.affected_records?.record_name || '';

    // Try to extract amount from record name
    const match = recordName.match(/\$[\d,]+/);
    if (match) {
      const amount = parseFloat(match[0].replace(/[$,]/g, ''));
      totalRevenue += amount;
    }
  }

  if (totalRevenue === 0) return '$0';
  if (totalRevenue >= 1000000) return `$${(totalRevenue / 1000000).toFixed(1)}M`;
  if (totalRevenue >= 1000) return `$${Math.round(totalRevenue / 1000)}K`;
  return `$${Math.round(totalRevenue)}`;
}

/**
 * Generate sparkline data (last 7 days)
 */
async function generateSparklineData(): Promise<number[]> {
  const data: number[] = [];
  const now = new Date();

  for (let i = 6; i >= 0; i--) {
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    const dayActions = await db
      .select({ count: count() })
      .from(autonomousActions)
      .where(
        and(
          eq(autonomousActions.status, 'executed'),
          gte(autonomousActions.executedAt!, startOfDay),
          lte(autonomousActions.executedAt!, endOfDay)
        )
      );

    data.push(dayActions[0]?.count || 0);
  }

  return data;
}

/**
 * Calculate metrics with trends
 */
function calculateMetricsWithTrends(today: DailyMetrics, yesterday: DailyMetrics): any {
  const calculateTrend = (todayValue: number, yesterdayValue: number) => {
    if (yesterdayValue === 0) return { direction: 'up', value: '+100%' };
    const change = ((todayValue - yesterdayValue) / yesterdayValue) * 100;
    const direction = change > 0 ? 'up' : change < 0 ? 'down' : 'neutral';
    const value = change > 0 ? `+${Math.round(change)}%` : `${Math.round(change)}%`;
    return { direction, value };
  };

  return {
    actionsCompleted: {
      label: 'Actions Completed',
      value: today.actionsCompleted.toString(),
      trend: calculateTrend(today.actionsCompleted, yesterday.actionsCompleted),
      sparkline: today.sparklineData,
    },
    automated: {
      label: 'Automated',
      value: today.automated.toString(),
      trend: calculateTrend(today.automated, yesterday.automated),
    },
    ownerApprovals: {
      label: 'Owner Approvals',
      value: today.ownerApprovals.toString(),
      trend: { direction: 'neutral', value: 'avg' },
    },
    revenueProtected: {
      label: 'Revenue Protected',
      value: today.revenueProtected,
      trend: { direction: 'up', value: 'at risk' },
    },
    timeSaved: {
      label: 'Time Saved',
      value: today.timeSaved,
      trend: calculateTrend(
        parseFloat(today.timeSaved.replace(/[^\d.]/g, '')),
        parseFloat(yesterday.timeSaved.replace(/[^\d.]/g, ''))
      ),
    },
    successRate: {
      label: 'Success Rate',
      value: `${today.successRate}%`,
      trend: calculateTrend(today.successRate, yesterday.successRate),
      sparkline: today.sparklineData.map((v) => (v / Math.max(...today.sparklineData)) * 100),
    },
  };
}

// ============================================================================
// AI INSIGHTS GENERATION
// ============================================================================

/**
 * Generate AI insights based on metrics
 */
async function generateAIInsights(metrics: DailyMetrics): Promise<any[]> {
  const insights: any[] = [];

  // Insight 1: Success rate insight
  if (metrics.successRate >= 90) {
    insights.push({
      id: 'success-rate-high',
      icon: 'lightbulb',
      borderColor: 'border-l-emerald-500',
      title: `Your success rate is ${metrics.successRate}%. Actions are executing smoothly with minimal failures.`,
      explanation: 'AI will continue current strategy and scale up automated actions.',
      actionLabel: 'Increase Automation',
      riskLevel: 'low',
      riskColor: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    });
  } else if (metrics.successRate < 80) {
    insights.push({
      id: 'success-rate-low',
      icon: 'lightbulb',
      borderColor: 'border-l-amber-500',
      title: `Success rate is ${metrics.successRate}%. Some actions are failing - review recommended.`,
      explanation: 'AI will require more approvals until success rate improves above 90%.',
      actionLabel: 'Review Failed Actions',
      riskLevel: 'medium',
      riskColor: 'bg-amber-50 border-amber-200 text-amber-800',
    });
  }

  // Insight 2: Automation level insight
  const automationRate = metrics.actionsCompleted > 0
    ? Math.round((metrics.automated / metrics.actionsCompleted) * 100)
    : 0;

  if (automationRate < 60) {
    insights.push({
      id: 'automation-low',
      icon: 'lightbulb',
      borderColor: 'border-l-amber-500',
      title: `Only ${automationRate}% of actions are automated. You're approving ${metrics.ownerApprovals} actions manually.`,
      explanation: 'Enable auto-approval for low-risk actions to save time.',
      actionLabel: 'Enable More Automation',
      riskLevel: 'low',
      riskColor: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    });
  }

  return insights;
}

// ============================================================================
// PATTERNS CALCULATION
// ============================================================================

/**
 * Calculate business patterns
 */
async function calculatePatterns(): Promise<any[]> {
  const now = new Date();
  const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Calculate average response time
  const actions = await db
    .select()
    .from(autonomousActions)
    .where(
      and(
        eq(autonomousActions.requiresApproval, true),
        gte(autonomousActions.approvedAt!, startOfWeek)
      )
    );

  let totalResponseTime = 0;
  let count = 0;

  for (const action of actions) {
    if (action.approvedAt && action.createdAt) {
      const diff = new Date(action.approvedAt).getTime() - new Date(action.createdAt).getTime();
      totalResponseTime += diff;
      count++;
    }
  }

  const avgResponseHours =
    count > 0 ? Math.round(totalResponseTime / count / (1000 * 60 * 60) * 10) / 10 : 0;

  // Calculate deal velocity (mock for now - needs real Odoo integration)
  const dealVelocity = '+18%';

  // Calculate customer health score (mock for now)
  const customerHealth = '92/100';

  // Calculate pipeline value (mock for now)
  const pipelineValue = '$1.2M';

  return [
    {
      label: 'Avg response time',
      value: `${avgResponseHours} hrs`,
      color: 'text-gray-900',
    },
    {
      label: 'Deal velocity',
      value: dealVelocity,
      color: 'text-emerald-600',
    },
    {
      label: 'Customer health',
      value: customerHealth,
      color: 'text-emerald-600',
    },
    {
      label: 'Pipeline value',
      value: pipelineValue,
      color: 'text-gray-900',
    },
  ];
}
