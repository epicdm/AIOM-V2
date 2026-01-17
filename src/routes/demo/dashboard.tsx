import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  Beaker,
  DollarSign,
  FileText,
  Users,
  Wrench,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  LogOut,
  RefreshCw,
  BarChart3,
  Activity,
} from "lucide-react";
import {
  useDemoEnvironment,
  useDemoDashboard,
  useDemoExpenses,
  useDemoWorkOrders,
  useDemoCustomers,
  useDemoTransactions,
  getDemoToken,
} from "~/hooks/useDemoEnvironment";
import type {
  DemoExpenseData,
  DemoWorkOrderData,
  DemoCustomerData,
  DemoTransactionData,
} from "~/lib/demo-environment/types";

export const Route = createFileRoute("/demo/dashboard")({
  component: DemoDashboardPage,
});

function DemoDashboardPage() {
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);
  const { session, logout, isLoggingOut, isAuthenticated, isSessionLoading } = useDemoEnvironment();
  const { data: dashboardData, isLoading: dashboardLoading, refetch: refetchDashboard } = useDemoDashboard();
  const { expenses, isLoading: expensesLoading, refetch: refetchExpenses } = useDemoExpenses();
  const { workOrders, isLoading: workOrdersLoading, refetch: refetchWorkOrders } = useDemoWorkOrders();
  const { customers, isLoading: customersLoading, refetch: refetchCustomers } = useDemoCustomers();
  const { transactions, isLoading: transactionsLoading, refetch: refetchTransactions } = useDemoTransactions();

  // Check for token on mount and redirect if not authenticated
  useEffect(() => {
    const token = getDemoToken();
    if (!token) {
      navigate({ to: "/demo" });
    } else {
      setIsChecking(false);
    }
  }, [navigate]);

  // Also redirect if session validation fails
  useEffect(() => {
    if (!isSessionLoading && !isChecking && !isAuthenticated) {
      // Session validation failed, redirect to login
      const token = getDemoToken();
      if (!token) {
        navigate({ to: "/demo" });
      }
    }
  }, [isAuthenticated, isSessionLoading, isChecking, navigate]);

  const handleRefreshAll = () => {
    refetchDashboard();
    refetchExpenses();
    refetchWorkOrders();
    refetchCustomers();
    refetchTransactions();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      case "disbursed":
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"><DollarSign className="h-3 w-3 mr-1" />Disbursed</Badge>;
      case "open":
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"><AlertCircle className="h-3 w-3 mr-1" />Open</Badge>;
      case "in_progress":
        return <Badge variant="outline" className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"><Activity className="h-3 w-3 mr-1" />In Progress</Badge>;
      case "completed":
        return <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300"><XCircle className="h-3 w-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent":
        return <Badge variant="destructive">Urgent</Badge>;
      case "high":
        return <Badge variant="outline" className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">High</Badge>;
      case "medium":
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">Medium</Badge>;
      case "low":
        return <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">Low</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  // Show loading state while checking authentication
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-amber-50 dark:from-slate-900 dark:to-slate-800">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="text-lg">Loading demo environment...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-amber-50 dark:from-slate-900 dark:to-slate-800">
      {/* Demo Mode Banner */}
      <div className="bg-amber-500 text-amber-950 py-2 px-4 text-center text-sm font-medium">
        <div className="flex items-center justify-center gap-2">
          <Beaker className="h-4 w-4" />
          <span>Demo Environment - Data shown is synthetic and for demonstration only</span>
        </div>
      </div>

      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <Beaker className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">Demo Dashboard</h1>
                  {dashboardData?.session && (
                    <p className="text-sm text-muted-foreground">
                      Logged in as <span className="font-medium">{dashboardData.session.name}</span>
                      <Badge variant="secondary" className="ml-2 text-xs">{dashboardData.session.role}</Badge>
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleRefreshAll}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Data
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => logout()}
                disabled={isLoggingOut}
              >
                <LogOut className="h-4 w-4 mr-2" />
                {isLoggingOut ? "Logging out..." : "Exit Demo"}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Stats Grid */}
        {dashboardLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="pt-6">
                  <div className="h-20 bg-muted rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : dashboardData?.stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Expenses</p>
                    <p className="text-2xl font-bold">{dashboardData.stats.totalExpenses}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {dashboardData.stats.pendingApprovals} pending approval
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                    <FileText className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Open Work Orders</p>
                    <p className="text-2xl font-bold">{dashboardData.stats.openWorkOrders}</p>
                    <p className="text-xs text-muted-foreground mt-1">Active tasks</p>
                  </div>
                  <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                    <Wrench className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Customers</p>
                    <p className="text-2xl font-bold">{dashboardData.stats.totalCustomers}</p>
                    <p className="text-xs text-muted-foreground mt-1">In database</p>
                  </div>
                  <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/30">
                    <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Monthly Revenue</p>
                    <p className="text-2xl font-bold">${Number(dashboardData.stats.monthlyRevenue).toLocaleString()}</p>
                    <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
                      <TrendingUp className="h-3 w-3" />
                      <span>+12.5% from last month</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/30">
                    <BarChart3 className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Data Tabs */}
        <Tabs defaultValue="expenses" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="expenses" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Expenses</span>
            </TabsTrigger>
            <TabsTrigger value="workorders" className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              <span className="hidden sm:inline">Work Orders</span>
            </TabsTrigger>
            <TabsTrigger value="customers" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Customers</span>
            </TabsTrigger>
            <TabsTrigger value="transactions" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Transactions</span>
            </TabsTrigger>
          </TabsList>

          {/* Expenses Tab */}
          <TabsContent value="expenses">
            <Card>
              <CardHeader>
                <CardTitle>Recent Expense Requests</CardTitle>
                <CardDescription>Demo expense data showing various approval states</CardDescription>
              </CardHeader>
              <CardContent>
                {expensesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Purpose</TableHead>
                          <TableHead>Requester</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expenses.slice(0, 10).map((expense: DemoExpenseData) => (
                          <TableRow key={expense.id}>
                            <TableCell className="font-medium">{expense.purpose}</TableCell>
                            <TableCell>{expense.requesterName}</TableCell>
                            <TableCell>${Number(expense.amount).toLocaleString()}</TableCell>
                            <TableCell>{getStatusBadge(expense.status)}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {new Date(expense.createdAt).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Work Orders Tab */}
          <TabsContent value="workorders">
            <Card>
              <CardHeader>
                <CardTitle>Work Orders</CardTitle>
                <CardDescription>Demo work order data with various statuses and priorities</CardDescription>
              </CardHeader>
              <CardContent>
                {workOrdersLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Assigned To</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Scheduled</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {workOrders.slice(0, 10).map((order: DemoWorkOrderData) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-medium">{order.title}</TableCell>
                            <TableCell>{order.customerName}</TableCell>
                            <TableCell>{order.assignedTo}</TableCell>
                            <TableCell>{getPriorityBadge(order.priority)}</TableCell>
                            <TableCell>{getStatusBadge(order.status)}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {new Date(order.scheduledDate).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Customers Tab */}
          <TabsContent value="customers">
            <Card>
              <CardHeader>
                <CardTitle>Customers</CardTitle>
                <CardDescription>Demo customer database with synthetic contact information</CardDescription>
              </CardHeader>
              <CardContent>
                {customersLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Total Orders</TableHead>
                          <TableHead>Total Spent</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customers.slice(0, 10).map((customer: DemoCustomerData) => (
                          <TableRow key={customer.id}>
                            <TableCell className="font-medium">{customer.name}</TableCell>
                            <TableCell>{customer.email}</TableCell>
                            <TableCell>{customer.phone}</TableCell>
                            <TableCell>{customer.totalOrders}</TableCell>
                            <TableCell>${Number(customer.totalSpent).toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>Demo financial transactions showing credits and debits</CardDescription>
              </CardHeader>
              <CardContent>
                {transactionsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Reference</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.slice(0, 10).map((txn: DemoTransactionData) => (
                          <TableRow key={txn.id}>
                            <TableCell className="font-mono text-sm">{txn.reference}</TableCell>
                            <TableCell>{txn.description}</TableCell>
                            <TableCell>{txn.category}</TableCell>
                            <TableCell>
                              {txn.type === "credit" ? (
                                <span className="flex items-center gap-1 text-green-600">
                                  <TrendingUp className="h-4 w-4" />
                                  Credit
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-red-600">
                                  <TrendingDown className="h-4 w-4" />
                                  Debit
                                </span>
                              )}
                            </TableCell>
                            <TableCell className={txn.type === "credit" ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                              {txn.type === "credit" ? "+" : "-"}${Number(txn.amount).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {new Date(txn.createdAt).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Demo Restrictions Notice */}
        {dashboardData?.restrictions && (
          <Card className="mt-8 border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <Beaker className="h-6 w-6 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-amber-800 dark:text-amber-200 mb-2">Demo Mode Restrictions</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-amber-700/80 dark:text-amber-300/80">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4" />
                      <span>Real payments disabled</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4" />
                      <span>Email sending disabled</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4" />
                      <span>Data export disabled</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>All other features available for testing</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
