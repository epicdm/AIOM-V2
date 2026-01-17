import * as React from "react";
import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Shield,
  RefreshCw,
  Activity,
  Users,
  FileText,
  GitBranch,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Server,
  Cpu,
  HardDrive,
  Wifi,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { authClient } from "~/lib/auth-client";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import { getAdminDashboardDataFn } from "~/fn/admin";
import type { UserRole } from "~/db/schema";

export const Route = createFileRoute("/dashboard/admin/")({
  beforeLoad: async () => {
    const sessionResult = await authClient.getSession();
    // Check both for null result and for data being null
    if (!sessionResult || !sessionResult.data) {
      throw redirect({
        to: "/sign-in",
        search: { redirect: "/dashboard/admin" },
      });
    }
    // Check if user is admin
    const user = sessionResult.data.user as { role?: UserRole; isAdmin?: boolean } | undefined;
    if (!user || (user.role !== "admin" && !user.isAdmin)) {
      throw redirect({
        to: "/dashboard",
      });
    }
  },
  component: AdminDashboardPage,
});

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ElementType;
  trend?: { value: number; isPositive: boolean };
  status?: "success" | "warning" | "error" | "info";
}

function StatCard({ title, value, description, icon: Icon, trend, status }: StatCardProps) {
  const statusColors = {
    success: "text-green-500 bg-green-500/10",
    warning: "text-yellow-500 bg-yellow-500/10",
    error: "text-red-500 bg-red-500/10",
    info: "text-blue-500 bg-blue-500/10",
  };

  return (
    <div className="bg-card/50 backdrop-blur-sm border rounded-xl p-6 hover:shadow-lg transition-all">
      <div className="flex items-start justify-between">
        <div className={cn("p-3 rounded-lg", status ? statusColors[status] : "bg-primary/10")}>
          <Icon className={cn("w-5 h-5", status ? "" : "text-primary")} />
        </div>
        {trend && (
          <div className={cn("flex items-center gap-1 text-sm", trend.isPositive ? "text-green-500" : "text-red-500")}>
            {trend.isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>
      <div className="mt-4">
        <h3 className="text-2xl font-bold">{value}</h3>
        <p className="text-sm text-muted-foreground">{title}</p>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </div>
    </div>
  );
}

interface ListItemProps {
  title: string;
  subtitle: string;
  value?: string;
  status?: "pending" | "processing" | "completed" | "error";
  onClick?: () => void;
}

function ListItem({ title, subtitle, value, status, onClick }: ListItemProps) {
  const statusConfig = {
    pending: { color: "bg-yellow-500", label: "Pending" },
    processing: { color: "bg-blue-500", label: "Processing" },
    completed: { color: "bg-green-500", label: "Completed" },
    error: { color: "bg-red-500", label: "Error" },
  };

  return (
    <div
      className={cn(
        "flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors",
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        {status && (
          <div className={cn("w-2 h-2 rounded-full", statusConfig[status].color)} />
        )}
        <div>
          <p className="font-medium text-sm">{title}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {value && <span className="text-sm font-medium">{value}</span>}
    </div>
  );
}

function AdminDashboardPage() {
  const { data: session } = authClient.useSession();

  // Fetch admin dashboard data
  const {
    data: dashboardData,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["admin-dashboard-data"],
    queryFn: async () => {
      return await getAdminDashboardDataFn();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Use sample data if no real data yet
  const data = dashboardData ?? {
    systemHealth: {
      status: "healthy" as const,
      uptime: 99.9,
      cpuUsage: 45,
      memoryUsage: 62,
      diskUsage: 38,
      activeConnections: 156,
    },
    pendingApprovals: {
      total: 12,
      expenses: 8,
      documents: 3,
      access: 1,
    },
    documentQueue: {
      total: 25,
      processing: 5,
      pending: 15,
      completed: 5,
      failed: 0,
    },
    userStats: {
      totalUsers: 150,
      activeToday: 45,
      newThisWeek: 8,
      byRole: {
        md: 2,
        admin: 5,
        "field-tech": 100,
        sales: 43,
      },
    },
    workflows: {
      active: 15,
      completed: 230,
      failed: 2,
      averageTime: "2.5h",
    },
    recentActivity: [
      { id: "1", type: "approval", title: "Expense approved", user: "John Doe", time: "5m ago" },
      { id: "2", type: "document", title: "Invoice processed", user: "System", time: "12m ago" },
      { id: "3", type: "user", title: "New user registered", user: "Jane Smith", time: "1h ago" },
      { id: "4", type: "workflow", title: "Workflow completed", user: "System", time: "2h ago" },
    ],
  };

  const getSystemHealthStatus = () => {
    if (data.systemHealth.status === "healthy") return "success";
    if (data.systemHealth.status === "degraded") return "warning";
    return "error";
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" data-testid="admin-dashboard-title">
                  Admin Dashboard
                </h1>
                <p className="text-muted-foreground mt-1">
                  Monitor system health, approvals, and operations
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="gap-2"
              data-testid="refresh-btn"
            >
              <RefreshCw className={cn("w-4 h-4", isFetching && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        {/* System Health Overview */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              System Health
            </h2>
            <Badge variant={getSystemHealthStatus() === "success" ? "default" : "destructive"} data-testid="system-health-badge">
              {data.systemHealth.status.charAt(0).toUpperCase() + data.systemHealth.status.slice(1)}
            </Badge>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" data-testid="system-health-stats">
            <StatCard
              title="CPU Usage"
              value={`${data.systemHealth.cpuUsage}%`}
              icon={Cpu}
              status={data.systemHealth.cpuUsage > 80 ? "error" : data.systemHealth.cpuUsage > 60 ? "warning" : "success"}
            />
            <StatCard
              title="Memory Usage"
              value={`${data.systemHealth.memoryUsage}%`}
              icon={Server}
              status={data.systemHealth.memoryUsage > 80 ? "error" : data.systemHealth.memoryUsage > 60 ? "warning" : "success"}
            />
            <StatCard
              title="Disk Usage"
              value={`${data.systemHealth.diskUsage}%`}
              icon={HardDrive}
              status={data.systemHealth.diskUsage > 80 ? "error" : data.systemHealth.diskUsage > 60 ? "warning" : "success"}
            />
            <StatCard
              title="Active Connections"
              value={data.systemHealth.activeConnections}
              icon={Wifi}
              status="info"
            />
          </div>
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Pending Approvals */}
          <div className="bg-card/50 backdrop-blur-sm border rounded-xl p-6" data-testid="pending-approvals-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" />
                Pending Approvals
              </h3>
              <Link to="/dashboard/approvals">
                <Button variant="ghost" size="sm">View All</Button>
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-3xl font-bold text-yellow-500">{data.pendingApprovals.total}</p>
                <p className="text-sm text-muted-foreground">Total Pending</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Expenses</span>
                  <span className="font-medium">{data.pendingApprovals.expenses}</span>
                </div>
                <Link to="/dashboard/kyc" className="flex justify-between text-sm hover:text-primary transition-colors">
                  <span className="text-muted-foreground">KYC Verifications</span>
                  <span className="font-medium">{data.pendingApprovals.documents}</span>
                </Link>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Access Requests</span>
                  <span className="font-medium">{data.pendingApprovals.access}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Document Processing Queue */}
          <div className="bg-card/50 backdrop-blur-sm border rounded-xl p-6" data-testid="document-queue-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Document Processing Queue
              </h3>
              <Badge variant="outline">{data.documentQueue.total} total</Badge>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-sm">Processing</span>
                </div>
                <span className="font-medium">{data.documentQueue.processing}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span className="text-sm">Pending</span>
                </div>
                <span className="font-medium">{data.documentQueue.pending}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-sm">Completed Today</span>
                </div>
                <span className="font-medium">{data.documentQueue.completed}</span>
              </div>
              {data.documentQueue.failed > 0 && (
                <div className="flex items-center justify-between text-red-500">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-sm">Failed</span>
                  </div>
                  <span className="font-medium">{data.documentQueue.failed}</span>
                </div>
              )}
              {/* Progress bar */}
              <div className="mt-4">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full flex">
                    <div
                      className="bg-green-500"
                      style={{ width: `${(data.documentQueue.completed / data.documentQueue.total) * 100}%` }}
                    />
                    <div
                      className="bg-blue-500"
                      style={{ width: `${(data.documentQueue.processing / data.documentQueue.total) * 100}%` }}
                    />
                    <div
                      className="bg-yellow-500"
                      style={{ width: `${(data.documentQueue.pending / data.documentQueue.total) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* User Management */}
          <div className="bg-card/50 backdrop-blur-sm border rounded-xl p-6" data-testid="user-management-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                User Management
              </h3>
              <Button variant="ghost" size="sm">Manage Users</Button>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{data.userStats.totalUsers}</p>
                <p className="text-xs text-muted-foreground">Total Users</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-500">{data.userStats.activeToday}</p>
                <p className="text-xs text-muted-foreground">Active Today</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-500">{data.userStats.newThisWeek}</p>
                <p className="text-xs text-muted-foreground">New This Week</p>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground mb-2">Users by Role</p>
              {Object.entries(data.userStats.byRole).map(([role, count]) => (
                <div key={role} className="flex items-center justify-between text-sm">
                  <span className="capitalize">{role.replace("-", " ")}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${(count / data.userStats.totalUsers) * 100}%` }}
                      />
                    </div>
                    <span className="font-medium w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Operational Workflows */}
          <div className="bg-card/50 backdrop-blur-sm border rounded-xl p-6" data-testid="workflows-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-primary" />
                Operational Workflows
              </h3>
              <Badge variant="outline">{data.workflows.active} active</Badge>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Clock className="w-4 h-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-medium">{data.workflows.active}</p>
                    <p className="text-xs text-muted-foreground">In Progress</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  </div>
                  <div>
                    <p className="font-medium">{data.workflows.completed}</p>
                    <p className="text-xs text-muted-foreground">Completed</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-500/10">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  </div>
                  <div>
                    <p className="font-medium">{data.workflows.failed}</p>
                    <p className="text-xs text-muted-foreground">Failed</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Activity className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{data.workflows.averageTime}</p>
                    <p className="text-xs text-muted-foreground">Avg. Time</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-card/50 backdrop-blur-sm border rounded-xl p-6" data-testid="recent-activity-card">
          <h3 className="font-semibold mb-4">Recent Activity</h3>
          <div className="space-y-1">
            {data.recentActivity.map((activity) => (
              <ListItem
                key={activity.id}
                title={activity.title}
                subtitle={`By ${activity.user}`}
                value={activity.time}
                status={activity.type === "approval" ? "completed" : activity.type === "document" ? "processing" : "pending"}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
