/**
 * Customer Issue Monitor Dashboard
 *
 * Monitors and analyzes customer support tickets and communications
 * to detect escalating issues, SLA violations, and satisfaction risks.
 */

import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  RefreshCw,
  Loader2,
  Users,
  Clock,
  TrendingUp,
  TrendingDown,
  Shield,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Phone,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { cn } from "~/lib/utils";

export const Route = createFileRoute("/dashboard/customer-issues/")({
  component: CustomerIssueMonitorPage,
});

// Types for the API responses
interface CustomerIssue {
  id: string;
  customerName: string | null;
  phoneNumber: string;
  disposition: "resolved" | "follow_up_needed" | "escalate";
  notes: string | null;
  callDate: string;
  agentId: string | null;
  agentName: string | null;
  daysSinceCreated: number;
  slaStatus: "within_sla" | "at_risk" | "breached";
}

interface CustomerIssueStats {
  totalOpen: number;
  escalated: number;
  followUpNeeded: number;
  resolved24h: number;
  avgResolutionTimeHours: number;
  slaBreachRate: number;
}

interface CustomerRiskProfile {
  phoneNumber: string;
  customerName: string | null;
  totalInteractions: number;
  escalationCount: number;
  followUpCount: number;
  unresolvedCount: number;
  riskScore: number;
  lastInteraction: string;
}

interface EscalationTrend {
  date: string;
  escalations: number;
  followUps: number;
  resolved: number;
  total: number;
}

interface AIAnalysis {
  summary: string;
  criticalIssues: string[];
  riskFactors: string[];
  recommendations: string[];
  priorityActions: string[];
  generatedAt: string;
}

interface MonitorDashboardData {
  stats: CustomerIssueStats;
  openIssues: CustomerIssue[];
  highRiskCustomers: CustomerRiskProfile[];
  escalationTrends: EscalationTrend[];
  slaAtRisk: CustomerIssue[];
  aiAnalysis: AIAnalysis | null;
}

// Fetch dashboard data
async function fetchMonitorData(includeAi: boolean = false): Promise<MonitorDashboardData> {
  const response = await fetch(
    `/api/customer-issues/monitor?includeAi=${includeAi}&issueLimit=20&trendDays=7`
  );
  if (!response.ok) {
    throw new Error("Failed to fetch customer issue data");
  }
  return response.json();
}

// Trigger AI analysis
async function triggerAIAnalysis(): Promise<MonitorDashboardData> {
  return fetchMonitorData(true);
}

function CustomerIssueMonitorPage() {
  const queryClient = useQueryClient();
  const [showAI, setShowAI] = React.useState(false);

  // Query for dashboard data
  const {
    data,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["customer-issue-monitor", showAI],
    queryFn: () => fetchMonitorData(showAI),
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000,
  });

  // AI analysis mutation
  const aiMutation = useMutation({
    mutationFn: triggerAIAnalysis,
    onSuccess: (newData) => {
      queryClient.setQueryData(["customer-issue-monitor", true], newData);
      setShowAI(true);
    },
  });

  const handleRefresh = () => {
    refetch();
  };

  const handleRunAIAnalysis = () => {
    aiMutation.mutate();
  };

  // Get status color
  const getSLAStatusColor = (status: string) => {
    switch (status) {
      case "within_sla":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "at_risk":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "breached":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getDispositionColor = (disposition: string) => {
    switch (disposition) {
      case "resolved":
        return "bg-green-500/10 text-green-500";
      case "follow_up_needed":
        return "bg-yellow-500/10 text-yellow-500";
      case "escalate":
        return "bg-red-500/10 text-red-500";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getRiskScoreColor = (score: number) => {
    if (score >= 70) return "text-red-500";
    if (score >= 40) return "text-yellow-500";
    return "text-green-500";
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Phone className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  Customer Issue Monitor
                </h1>
                <p className="text-muted-foreground mt-1">
                  Track escalations, SLA compliance, and customer satisfaction risks
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRunAIAnalysis}
              disabled={aiMutation.isPending}
              className="gap-2"
              data-testid="ai-analysis-btn"
            >
              {aiMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              AI Analysis
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isFetching}
              className="gap-2"
              data-testid="refresh-btn"
            >
              <RefreshCw
                className={cn("w-4 h-4", isFetching && "animate-spin")}
              />
              Refresh
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading customer issue data...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-full bg-red-500/10 mb-4">
              <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Failed to load data</h2>
            <p className="text-muted-foreground mb-4">
              {error instanceof Error ? error.message : "An unexpected error occurred"}
            </p>
            <Button onClick={handleRefresh} variant="outline" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Try Again
            </Button>
          </div>
        ) : data ? (
          <>
            {/* Stats Cards */}
            <div
              className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
              data-testid="stats-grid"
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Open Issues</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="total-open">
                    {data.stats.totalOpen}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {data.stats.escalated} escalated, {data.stats.followUpNeeded} need follow-up
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Resolved (24h)</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-500" data-testid="resolved-24h">
                    {data.stats.resolved24h}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    In the last 24 hours
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Resolution</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="avg-resolution">
                    {data.stats.avgResolutionTimeHours.toFixed(1)}h
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Average time to resolution
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">SLA Breach Rate</CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div
                    className={cn(
                      "text-2xl font-bold",
                      data.stats.slaBreachRate > 10
                        ? "text-red-500"
                        : data.stats.slaBreachRate > 5
                        ? "text-yellow-500"
                        : "text-green-500"
                    )}
                    data-testid="sla-breach-rate"
                  >
                    {data.stats.slaBreachRate.toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Issues exceeding SLA
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* AI Analysis Section */}
            {data.aiAnalysis && (
              <Card className="border-primary/20 bg-primary/5" data-testid="ai-analysis-card">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <CardTitle>AI Analysis</CardTitle>
                  </div>
                  <CardDescription>
                    Generated at {new Date(data.aiAnalysis.generatedAt).toLocaleString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Summary</h4>
                    <p className="text-sm text-muted-foreground">
                      {data.aiAnalysis.summary}
                    </p>
                  </div>

                  {data.aiAnalysis.criticalIssues.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        Critical Issues
                      </h4>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        {data.aiAnalysis.criticalIssues.map((issue, idx) => (
                          <li key={idx} className="text-red-500">{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {data.aiAnalysis.recommendations.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Recommendations</h4>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        {data.aiAnalysis.recommendations.map((rec, idx) => (
                          <li key={idx} className="text-muted-foreground">{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {data.aiAnalysis.priorityActions.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Priority Actions</h4>
                      <div className="flex flex-wrap gap-2">
                        {data.aiAnalysis.priorityActions.map((action, idx) => (
                          <Badge key={idx} variant="secondary">
                            {action}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Main Content Grid */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* SLA At Risk */}
              <Card data-testid="sla-at-risk-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-yellow-500" />
                      <CardTitle>SLA At Risk</CardTitle>
                    </div>
                    <Badge variant="outline">{data.slaAtRisk.length}</Badge>
                  </div>
                  <CardDescription>
                    Issues approaching or exceeding SLA thresholds
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {data.slaAtRisk.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                      <p>All issues within SLA</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {data.slaAtRisk.slice(0, 5).map((issue) => (
                        <div
                          key={issue.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {issue.customerName || issue.phoneNumber}
                            </p>
                            <p className="text-sm text-muted-foreground truncate">
                              {issue.notes || "No notes"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 ml-2">
                            <Badge className={getSLAStatusColor(issue.slaStatus)}>
                              {issue.slaStatus === "breached" ? "Breached" : "At Risk"}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {issue.daysSinceCreated}d
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* High Risk Customers */}
              <Card data-testid="high-risk-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-red-500" />
                      <CardTitle>High Risk Customers</CardTitle>
                    </div>
                    <Badge variant="outline">{data.highRiskCustomers.length}</Badge>
                  </div>
                  <CardDescription>
                    Customers with elevated risk scores based on interaction history
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {data.highRiskCustomers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                      <p>No high-risk customers detected</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {data.highRiskCustomers.slice(0, 5).map((customer) => (
                        <div
                          key={customer.phoneNumber}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {customer.customerName || customer.phoneNumber}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {customer.totalInteractions} interactions,{" "}
                              {customer.escalationCount} escalations
                            </p>
                          </div>
                          <div className="flex items-center gap-2 ml-2">
                            <span
                              className={cn(
                                "font-bold text-lg",
                                getRiskScoreColor(customer.riskScore)
                              )}
                            >
                              {customer.riskScore}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              risk
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Open Issues */}
              <Card data-testid="open-issues-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      <CardTitle>Open Issues</CardTitle>
                    </div>
                    <Badge variant="outline">{data.openIssues.length}</Badge>
                  </div>
                  <CardDescription>
                    Issues requiring follow-up or escalation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {data.openIssues.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                      <p>No open issues</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {data.openIssues.map((issue) => (
                        <div
                          key={issue.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium truncate">
                                {issue.customerName || issue.phoneNumber}
                              </p>
                              <Badge
                                className={cn(
                                  "text-xs",
                                  getDispositionColor(issue.disposition)
                                )}
                              >
                                {issue.disposition === "escalate"
                                  ? "Escalated"
                                  : "Follow-up"}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {issue.notes || "No notes"}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {issue.agentName || "Unassigned"} &bull;{" "}
                              {new Date(issue.callDate).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge className={getSLAStatusColor(issue.slaStatus)}>
                            {issue.slaStatus.replace("_", " ")}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Escalation Trends */}
              <Card data-testid="trends-card">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-primary" />
                    <CardTitle>7-Day Trend</CardTitle>
                  </div>
                  <CardDescription>
                    Issue volume and resolution over time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {data.escalationTrends.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No trend data available</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {data.escalationTrends.map((trend) => (
                        <div
                          key={trend.date}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-muted-foreground w-20">
                            {new Date(trend.date).toLocaleDateString(undefined, {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                          <div className="flex-1 flex items-center gap-2 mx-4">
                            <div
                              className="h-2 bg-red-500/50 rounded"
                              style={{
                                width: `${Math.min(
                                  (trend.escalations / Math.max(trend.total, 1)) * 100,
                                  100
                                )}%`,
                              }}
                              title={`${trend.escalations} escalations`}
                            />
                            <div
                              className="h-2 bg-yellow-500/50 rounded"
                              style={{
                                width: `${Math.min(
                                  (trend.followUps / Math.max(trend.total, 1)) * 100,
                                  100
                                )}%`,
                              }}
                              title={`${trend.followUps} follow-ups`}
                            />
                            <div
                              className="h-2 bg-green-500/50 rounded"
                              style={{
                                width: `${Math.min(
                                  (trend.resolved / Math.max(trend.total, 1)) * 100,
                                  100
                                )}%`,
                              }}
                              title={`${trend.resolved} resolved`}
                            />
                          </div>
                          <span className="text-muted-foreground w-12 text-right">
                            {trend.total}
                          </span>
                        </div>
                      ))}
                      <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground justify-center">
                        <span className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-red-500/50 rounded" /> Escalated
                        </span>
                        <span className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-yellow-500/50 rounded" /> Follow-up
                        </span>
                        <span className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-green-500/50 rounded" /> Resolved
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
