/**
 * RulesStatistics Component
 *
 * Displays statistics and metrics for task auto-creation rules.
 */

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import {
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  TrendingUp,
  Pause,
  Archive,
} from "lucide-react";
import type { RuleStatistics } from "~/data-access/task-auto-creation-rules";

// =============================================================================
// Types
// =============================================================================

interface RulesStatisticsProps {
  statistics?: RuleStatistics;
  isLoading?: boolean;
}

// =============================================================================
// Stat Card Component
// =============================================================================

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

function StatCard({ title, value, icon, description, trend }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value.toLocaleString()}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {trend && (
          <div className="flex items-center gap-1 mt-2">
            <TrendingUp
              className={`h-3 w-3 ${
                trend.isPositive ? "text-green-500" : "text-red-500"
              }`}
            />
            <span
              className={`text-xs ${
                trend.isPositive ? "text-green-500" : "text-red-500"
              }`}
            >
              {trend.isPositive ? "+" : "-"}
              {Math.abs(trend.value)}%
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Loading Skeleton
// =============================================================================

function StatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <div className="h-4 w-24 bg-muted animate-pulse rounded" />
          </CardHeader>
          <CardContent>
            <div className="h-8 w-16 bg-muted animate-pulse rounded" />
            <div className="h-3 w-32 bg-muted animate-pulse rounded mt-2" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// =============================================================================
// Component
// =============================================================================

export function RulesStatistics({ statistics, isLoading = false }: RulesStatisticsProps) {
  if (isLoading || !statistics) {
    return <StatsSkeleton />;
  }

  const successRate =
    statistics.totalExecutions > 0
      ? Math.round(
          (statistics.successfulExecutions / statistics.totalExecutions) * 100
        )
      : 0;

  return (
    <div className="space-y-4">
      {/* Main Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Rules"
          value={statistics.totalRules}
          icon={<Zap className="h-4 w-4" />}
          description={`${statistics.activeRules} active`}
        />
        <StatCard
          title="Total Executions"
          value={statistics.totalExecutions}
          icon={<Clock className="h-4 w-4" />}
          description={`${statistics.executionsToday} today`}
        />
        <StatCard
          title="Successful"
          value={statistics.successfulExecutions}
          icon={<CheckCircle className="h-4 w-4" />}
          description={`${successRate}% success rate`}
        />
        <StatCard
          title="Failed"
          value={statistics.failedExecutions}
          icon={<XCircle className="h-4 w-4" />}
          description={statistics.failedExecutions > 0 ? "Review errors" : "No failures"}
        />
      </div>

      {/* Rule Status Breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Rules by Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-green-500/10 text-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                Active
              </Badge>
              <span className="font-semibold">{statistics.activeRules}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600">
                <Pause className="h-3 w-3 mr-1" />
                Paused
              </Badge>
              <span className="font-semibold">{statistics.pausedRules}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-gray-500/10 text-gray-600">
                <XCircle className="h-3 w-3 mr-1" />
                Disabled
              </Badge>
              <span className="font-semibold">{statistics.disabledRules}</span>
            </div>
          </div>

          {/* Progress Bar */}
          {statistics.totalRules > 0 && (
            <div className="mt-4">
              <div className="h-2 rounded-full bg-muted overflow-hidden flex">
                <div
                  className="bg-green-500 transition-all"
                  style={{
                    width: `${(statistics.activeRules / statistics.totalRules) * 100}%`,
                  }}
                />
                <div
                  className="bg-yellow-500 transition-all"
                  style={{
                    width: `${(statistics.pausedRules / statistics.totalRules) * 100}%`,
                  }}
                />
                <div
                  className="bg-gray-400 transition-all"
                  style={{
                    width: `${(statistics.disabledRules / statistics.totalRules) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default RulesStatistics;
