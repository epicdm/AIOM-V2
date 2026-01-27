# 🚀 AI COO Phase 1: Implementation Plan

**Timeline:** Week 1-2 (10 working days)  
**Goal:** Build core monitoring infrastructure with financial health analysis

---

## Overview

Phase 1 establishes the foundation for the AI COO system:
- Scheduled monitoring jobs
- Financial health analyzer
- Basic alert system
- Simple executive dashboard

**Success Criteria:**
- ✅ Scheduled job runs every hour automatically
- ✅ Financial analysis completes successfully with real Odoo data
- ✅ Alerts generated when thresholds exceeded
- ✅ Dashboard displays metrics and alerts
- ✅ User can acknowledge/dismiss alerts

---

## Day 1-2: Database Schema & Infrastructure

### Task 1.1: Create Database Schema
**File:** `src/db/schema/ai-coo.ts`

```typescript
import { pgTable, text, timestamp, integer, jsonb, boolean, decimal } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';
import { users } from './auth';

// Monitoring jobs configuration
export const monitoringJobs = pgTable('monitoring_jobs', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  name: text('name').notNull(),
  description: text('description'),
  schedule: text('schedule').notNull(), // cron expression
  analyzerType: text('analyzer_type').notNull(), // financial, sales, operations, customer
  config: jsonb('config').$type<{
    thresholds?: Record<string, number>;
    parameters?: Record<string, any>;
  }>(),
  enabled: boolean('enabled').notNull().default(true),
  lastRunAt: timestamp('last_run_at'),
  nextRunAt: timestamp('next_run_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Analysis results
export const analysisResults = pgTable('analysis_results', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  jobId: text('job_id').notNull().references(() => monitoringJobs.id, { onDelete: 'cascade' }),
  runAt: timestamp('run_at').notNull().defaultNow(),
  status: text('status').notNull(), // success, failed, partial
  insights: jsonb('insights').$type<Array<{
    metric: string;
    value: number | string;
    label: string;
    trend?: 'up' | 'down' | 'stable';
    severity?: 'good' | 'warning' | 'critical';
  }>>(),
  metrics: jsonb('metrics').$type<Record<string, any>>(),
  alertsGenerated: integer('alerts_generated').notNull().default(0),
  durationMs: integer('duration_ms').notNull(),
  cost: decimal('cost', { precision: 10, scale: 6 }),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Alerts
export const alerts = pgTable('alerts', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  analysisResultId: text('analysis_result_id').references(() => analysisResults.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // financial, sales, operations, customer
  priority: text('priority').notNull(), // critical, high, medium, low
  title: text('title').notNull(),
  description: text('description').notNull(),
  data: jsonb('data').$type<Record<string, any>>(),
  status: text('status').notNull().default('new'), // new, acknowledged, resolved, dismissed
  acknowledgedBy: text('acknowledged_by').references(() => users.id),
  acknowledgedAt: timestamp('acknowledged_at'),
  resolvedAt: timestamp('resolved_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
```

**Deliverable:** Schema file created, migration generated

### Task 1.2: Run Database Migration
**Commands:**
```bash
npm run db:generate
npm run db:migrate
```

**Deliverable:** New tables created in database

### Task 1.3: Create Data Access Functions
**File:** `src/data-access/ai-coo.ts`

```typescript
import { db } from '@/db';
import { monitoringJobs, analysisResults, alerts } from '@/db/schema/ai-coo';
import { eq, desc, and } from 'drizzle-orm';

export async function getMonitoringJobs() {
  return db.select().from(monitoringJobs).where(eq(monitoringJobs.enabled, true));
}

export async function getMonitoringJob(id: string) {
  const [job] = await db.select().from(monitoringJobs).where(eq(monitoringJobs.id, id));
  return job;
}

export async function updateJobLastRun(id: string, nextRunAt: Date) {
  return db.update(monitoringJobs)
    .set({ lastRunAt: new Date(), nextRunAt, updatedAt: new Date() })
    .where(eq(monitoringJobs.id, id));
}

export async function createAnalysisResult(data: typeof analysisResults.$inferInsert) {
  const [result] = await db.insert(analysisResults).values(data).returning();
  return result;
}

export async function getLatestAnalysisResults(limit = 10) {
  return db.select().from(analysisResults).orderBy(desc(analysisResults.runAt)).limit(limit);
}

export async function createAlert(data: typeof alerts.$inferInsert) {
  const [alert] = await db.insert(alerts).values(data).returning();
  return alert;
}

export async function getActiveAlerts() {
  return db.select().from(alerts)
    .where(and(
      eq(alerts.status, 'new'),
    ))
    .orderBy(desc(alerts.createdAt));
}

export async function acknowledgeAlert(id: string, userId: string) {
  return db.update(alerts)
    .set({ 
      status: 'acknowledged', 
      acknowledgedBy: userId, 
      acknowledgedAt: new Date() 
    })
    .where(eq(alerts.id, id));
}

export async function dismissAlert(id: string) {
  return db.update(alerts)
    .set({ status: 'dismissed' })
    .where(eq(alerts.id, id));
}
```

**Deliverable:** Data access layer for AI COO tables

---

## Day 3-4: Monitoring Scheduler

### Task 2.1: Install Dependencies
```bash
npm install node-cron
npm install -D @types/node-cron
```

### Task 2.2: Create Scheduler Service
**File:** `src/lib/ai-coo/scheduler.ts`

```typescript
import cron from 'node-cron';
import { getMonitoringJobs, updateJobLastRun } from '@/data-access/ai-coo';
import { runFinancialAnalysis } from './analyzers/financial';

const activeJobs = new Map<string, cron.ScheduledTask>();

export async function startAICOOScheduler() {
  console.log('[AI COO Scheduler] Starting...');
  
  // Load all enabled jobs from database
  const jobs = await getMonitoringJobs();
  
  for (const job of jobs) {
    scheduleJob(job);
  }
  
  console.log(`[AI COO Scheduler] Started ${jobs.length} monitoring jobs`);
}

export function scheduleJob(job: any) {
  // Stop existing job if running
  if (activeJobs.has(job.id)) {
    activeJobs.get(job.id)?.stop();
  }
  
  // Create new scheduled task
  const task = cron.schedule(job.schedule, async () => {
    console.log(`[AI COO] Running job: ${job.name}`);
    
    try {
      // Calculate next run time
      const nextRun = getNextRunTime(job.schedule);
      await updateJobLastRun(job.id, nextRun);
      
      // Execute analyzer based on type
      switch (job.analyzerType) {
        case 'financial':
          await runFinancialAnalysis(job);
          break;
        // Add more analyzers as we build them
        default:
          console.warn(`[AI COO] Unknown analyzer type: ${job.analyzerType}`);
      }
    } catch (error) {
      console.error(`[AI COO] Job failed: ${job.name}`, error);
    }
  });
  
  activeJobs.set(job.id, task);
  console.log(`[AI COO] Scheduled job: ${job.name} (${job.schedule})`);
}

export function stopAICOOScheduler() {
  console.log('[AI COO Scheduler] Stopping...');
  
  for (const [id, task] of activeJobs.entries()) {
    task.stop();
  }
  
  activeJobs.clear();
  console.log('[AI COO Scheduler] Stopped');
}

function getNextRunTime(cronExpression: string): Date {
  // Parse cron expression and calculate next run
  // For MVP, just add 1 hour
  return new Date(Date.now() + 60 * 60 * 1000);
}
```

**Deliverable:** Scheduler service that loads and runs jobs

### Task 2.3: Integrate Scheduler into App Startup
**File:** `src/app.ts` (or wherever app initializes)

```typescript
import { startAICOOScheduler } from '@/lib/ai-coo/scheduler';

// During app startup
if (process.env.NODE_ENV === 'production' || process.env.ENABLE_AI_COO === 'true') {
  startAICOOScheduler().catch(console.error);
}
```

**Deliverable:** Scheduler starts automatically with app

---

## Day 5-7: Financial Health Analyzer

### Task 3.1: Create Odoo Financial Data Fetchers
**File:** `src/lib/ai-coo/data-fetchers/financial.ts`

```typescript
import { getOdooClient } from '@/lib/odoo';

export async function getAccountsReceivable() {
  const odoo = getOdooClient();
  
  // Fetch all open customer invoices
  const invoices = await odoo.searchRead('account.move', {
    domain: [
      ['move_type', '=', 'out_invoice'],
      ['state', '=', 'posted'],
      ['payment_state', 'in', ['not_paid', 'partial']],
    ],
    fields: ['name', 'partner_id', 'invoice_date', 'invoice_date_due', 'amount_residual', 'amount_total'],
  });
  
  // Calculate aging
  const now = new Date();
  const aging = {
    current: 0,      // 0-30 days
    days30: 0,       // 31-60 days
    days60: 0,       // 61-90 days
    days90plus: 0,   // 90+ days
    total: 0,
    invoices: invoices.map((inv: any) => {
      const dueDate = new Date(inv.invoice_date_due);
      const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        id: inv.id,
        name: inv.name,
        partner: inv.partner_id[1],
        amount: inv.amount_residual,
        dueDate: inv.invoice_date_due,
        daysOverdue: Math.max(0, daysOverdue),
      };
    }),
  };
  
  // Categorize by aging
  for (const inv of aging.invoices) {
    aging.total += inv.amount;
    
    if (inv.daysOverdue <= 30) {
      aging.current += inv.amount;
    } else if (inv.daysOverdue <= 60) {
      aging.days30 += inv.amount;
    } else if (inv.daysOverdue <= 90) {
      aging.days60 += inv.amount;
    } else {
      aging.days90plus += inv.amount;
    }
  }
  
  return aging;
}

export async function getAccountsPayable() {
  const odoo = getOdooClient();
  
  // Fetch all open vendor bills
  const bills = await odoo.searchRead('account.move', {
    domain: [
      ['move_type', '=', 'in_invoice'],
      ['state', '=', 'posted'],
      ['payment_state', 'in', ['not_paid', 'partial']],
    ],
    fields: ['name', 'partner_id', 'invoice_date', 'invoice_date_due', 'amount_residual', 'amount_total'],
  });
  
  const now = new Date();
  const aging = {
    current: 0,
    days30: 0,
    days60: 0,
    days90plus: 0,
    total: 0,
    bills: bills.map((bill: any) => {
      const dueDate = new Date(bill.invoice_date_due);
      const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        id: bill.id,
        name: bill.name,
        partner: bill.partner_id[1],
        amount: bill.amount_residual,
        dueDate: bill.invoice_date_due,
        daysOverdue: Math.max(0, daysOverdue),
      };
    }),
  };
  
  for (const bill of aging.bills) {
    aging.total += bill.amount;
    
    if (bill.daysOverdue <= 30) {
      aging.current += bill.amount;
    } else if (bill.daysOverdue <= 60) {
      aging.days30 += bill.amount;
    } else if (bill.daysOverdue <= 90) {
      aging.days60 += bill.amount;
    } else {
      aging.days90plus += bill.amount;
    }
  }
  
  return aging;
}

export async function getBankBalances() {
  const odoo = getOdooClient();
  
  // Fetch bank account balances
  const journals = await odoo.searchRead('account.journal', {
    domain: [['type', '=', 'bank']],
    fields: ['name', 'currency_id', 'account_id'],
  });
  
  let totalBalance = 0;
  const accounts = [];
  
  for (const journal of journals) {
    // Get account balance
    const [account] = await odoo.searchRead('account.account', {
      domain: [['id', '=', journal.account_id[0]]],
      fields: ['name', 'current_balance'],
    });
    
    if (account) {
      totalBalance += account.current_balance;
      accounts.push({
        name: journal.name,
        balance: account.current_balance,
      });
    }
  }
  
  return {
    total: totalBalance,
    accounts,
  };
}

export async function getMonthlyBurnRate() {
  const odoo = getOdooClient();
  
  // Get expenses from last 3 months to calculate average
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  
  const expenses = await odoo.searchRead('account.move', {
    domain: [
      ['move_type', '=', 'in_invoice'],
      ['state', '=', 'posted'],
      ['invoice_date', '>=', threeMonthsAgo.toISOString().split('T')[0]],
    ],
    fields: ['amount_total', 'invoice_date'],
  });
  
  const totalExpenses = expenses.reduce((sum: number, exp: any) => sum + exp.amount_total, 0);
  const monthlyBurn = totalExpenses / 3;
  
  return monthlyBurn;
}
```

**Deliverable:** Functions to fetch financial data from Odoo

### Task 3.2: Create Financial Analyzer
**File:** `src/lib/ai-coo/analyzers/financial.ts`

```typescript
import { getClaudeSDKClient } from '@/lib/claude/sdk-client';
import { createAnalysisResult, createAlert } from '@/data-access/ai-coo';
import { 
  getAccountsReceivable, 
  getAccountsPayable, 
  getBankBalances,
  getMonthlyBurnRate 
} from '../data-fetchers/financial';

export async function runFinancialAnalysis(job: any) {
  const startTime = Date.now();
  
  try {
    console.log('[Financial Analyzer] Starting analysis...');
    
    // 1. Fetch data from Odoo
    const [ar, ap, bank, monthlyBurn] = await Promise.all([
      getAccountsReceivable(),
      getAccountsPayable(),
      getBankBalances(),
      getMonthlyBurnRate(),
    ]);
    
    // 2. Calculate key metrics
    const cashRunway = bank.total / monthlyBurn;
    const netPosition = bank.total + ar.total - ap.total;
    
    // 3. Use AI to analyze and generate insights
    const claude = getClaudeSDKClient();
    
    const prompt = `
You are a financial analyst. Analyze this business financial data and provide structured insights.

ACCOUNTS RECEIVABLE:
- Total: $${ar.total.toFixed(2)}
- Current (0-30 days): $${ar.current.toFixed(2)}
- 31-60 days: $${ar.days30.toFixed(2)}
- 61-90 days: $${ar.days60.toFixed(2)}
- 90+ days: $${ar.days90plus.toFixed(2)}
- Top overdue invoices: ${JSON.stringify(ar.invoices.filter(i => i.daysOverdue > 60).slice(0, 5))}

ACCOUNTS PAYABLE:
- Total: $${ap.total.toFixed(2)}
- Current (0-30 days): $${ap.current.toFixed(2)}
- 31-60 days: $${ap.days30.toFixed(2)}
- 61-90 days: $${ap.days60.toFixed(2)}
- 90+ days: $${ap.days90plus.toFixed(2)}

CASH POSITION:
- Bank balance: $${bank.total.toFixed(2)}
- Monthly burn rate: $${monthlyBurn.toFixed(2)}
- Cash runway: ${cashRunway.toFixed(1)} months
- Net position: $${netPosition.toFixed(2)}

Provide insights in this JSON format:
{
  "insights": [
    {
      "metric": "cash_runway",
      "value": ${cashRunway},
      "label": "Cash Runway (months)",
      "trend": "up|down|stable",
      "severity": "good|warning|critical"
    },
    // ... more insights
  ],
  "summary": "Brief executive summary",
  "concerns": ["List of concerning findings"],
  "recommendations": ["List of recommended actions"]
}
`;
    
    const response = await claude.complete(prompt, {
      useCase: 'financial_analysis',
      maxTokens: 2048,
    });
    
    // Parse AI response
    const analysis = JSON.parse(response);
    
    // 4. Detect alerts based on thresholds
    const alerts = [];
    const thresholds = job.config?.thresholds || {
      cashRunwayMonths: 2,
      ar60PlusDays: 50000,
      ap90PlusDays: 25000,
    };
    
    if (cashRunway < thresholds.cashRunwayMonths) {
      alerts.push({
        type: 'financial',
        priority: cashRunway < 1 ? 'critical' : 'high',
        title: 'Low Cash Runway',
        description: `Cash runway is ${cashRunway.toFixed(1)} months (threshold: ${thresholds.cashRunwayMonths} months)`,
        data: { cashRunway, monthlyBurn, bankBalance: bank.total },
      });
    }
    
    if (ar.days60 + ar.days90plus > thresholds.ar60PlusDays) {
      alerts.push({
        type: 'financial',
        priority: 'high',
        title: 'High Overdue Receivables',
        description: `$${(ar.days60 + ar.days90plus).toFixed(2)} in 60+ day receivables`,
        data: { 
          amount: ar.days60 + ar.days90plus,
          invoices: ar.invoices.filter(i => i.daysOverdue > 60).slice(0, 10),
        },
      });
    }
    
    // 5. Store results
    const result = await createAnalysisResult({
      jobId: job.id,
      status: 'success',
      insights: analysis.insights,
      metrics: {
        ar,
        ap,
        bank,
        monthlyBurn,
        cashRunway,
        netPosition,
      },
      alertsGenerated: alerts.length,
      durationMs: Date.now() - startTime,
      cost: '0', // Will be populated from Claude SDK usage tracking
    });
    
    // 6. Create alerts
    for (const alertData of alerts) {
      await createAlert({
        ...alertData,
        analysisResultId: result.id,
      });
    }
    
    console.log(`[Financial Analyzer] Complete. Generated ${alerts.length} alerts in ${Date.now() - startTime}ms`);
    
    return result;
  } catch (error) {
    console.error('[Financial Analyzer] Error:', error);
    
    // Store failed result
    await createAnalysisResult({
      jobId: job.id,
      status: 'failed',
      insights: [],
      metrics: {},
      alertsGenerated: 0,
      durationMs: Date.now() - startTime,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });
    
    throw error;
  }
}
```

**Deliverable:** Working financial analyzer that runs on schedule

---

## Day 8-9: Dashboard UI

### Task 4.1: Create Dashboard Route
**File:** `src/routes/dashboard/ai-coo/index.tsx`

```typescript
import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, TrendingUp, TrendingDown, DollarSign, Calendar } from 'lucide-react';

export const Route = createFileRoute('/dashboard/ai-coo/')({
  component: AICOODashboard,
});

function AICOODashboard() {
  const { data: alerts } = useQuery({
    queryKey: ['ai-coo-alerts'],
    queryFn: async () => {
      const res = await fetch('/api/ai-coo/alerts');
      return res.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
  
  const { data: latestAnalysis } = useQuery({
    queryKey: ['ai-coo-latest-analysis'],
    queryFn: async () => {
      const res = await fetch('/api/ai-coo/latest-analysis');
      return res.json();
    },
    refetchInterval: 60000, // Refresh every minute
  });
  
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">AI COO Dashboard</h1>
        <Badge variant="outline">Last updated: {new Date().toLocaleTimeString()}</Badge>
      </div>
      
      {/* Active Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Active Alerts ({alerts?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alerts && alerts.length > 0 ? (
            <div className="space-y-3">
              {alerts.map((alert: any) => (
                <AlertCard key={alert.id} alert={alert} />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No active alerts</p>
          )}
        </CardContent>
      </Card>
      
      {/* Financial Metrics */}
      {latestAnalysis && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            title="Cash Runway"
            value={`${latestAnalysis.metrics.cashRunway.toFixed(1)} months`}
            icon={<Calendar className="w-5 h-5" />}
            trend={latestAnalysis.metrics.cashRunway > 2 ? 'up' : 'down'}
          />
          <MetricCard
            title="Accounts Receivable"
            value={`$${latestAnalysis.metrics.ar.total.toLocaleString()}`}
            icon={<DollarSign className="w-5 h-5" />}
          />
          <MetricCard
            title="Bank Balance"
            value={`$${latestAnalysis.metrics.bank.total.toLocaleString()}`}
            icon={<DollarSign className="w-5 h-5" />}
          />
        </div>
      )}
      
      {/* Insights */}
      {latestAnalysis?.insights && (
        <Card>
          <CardHeader>
            <CardTitle>Latest Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {latestAnalysis.insights.map((insight: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded">
                  <span>{insight.label}</span>
                  <Badge variant={insight.severity === 'critical' ? 'destructive' : 'default'}>
                    {insight.value}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function AlertCard({ alert }: { alert: any }) {
  const priorityColors = {
    critical: 'destructive',
    high: 'destructive',
    medium: 'default',
    low: 'secondary',
  };
  
  return (
    <div className="flex items-start justify-between p-4 border rounded-lg">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant={priorityColors[alert.priority as keyof typeof priorityColors]}>
            {alert.priority}
          </Badge>
          <h3 className="font-semibold">{alert.title}</h3>
        </div>
        <p className="text-sm text-muted-foreground">{alert.description}</p>
        <p className="text-xs text-muted-foreground mt-2">
          {new Date(alert.createdAt).toLocaleString()}
        </p>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline">Acknowledge</Button>
        <Button size="sm" variant="ghost">Dismiss</Button>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, trend }: any) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {icon}
            {trend && (
              trend === 'up' ? 
                <TrendingUp className="w-4 h-4 text-green-500" /> :
                <TrendingDown className="w-4 h-4 text-red-500" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

**Deliverable:** Dashboard UI showing alerts and metrics

### Task 4.2: Create API Routes
**File:** `src/routes/api/ai-coo/alerts.ts`

```typescript
import { createAPIFileRoute } from '@tanstack/start/api';
import { getActiveAlerts, acknowledgeAlert, dismissAlert } from '@/data-access/ai-coo';
import { requireAuth } from '@/fn/auth';

export const Route = createAPIFileRoute('/api/ai-coo/alerts')({
  GET: async ({ request }) => {
    const user = await requireAuth(request);
    const alerts = await getActiveAlerts();
    return Response.json(alerts);
  },
  
  POST: async ({ request }) => {
    const user = await requireAuth(request);
    const body = await request.json();
    
    if (body.action === 'acknowledge') {
      await acknowledgeAlert(body.alertId, user.id);
    } else if (body.action === 'dismiss') {
      await dismissAlert(body.alertId);
    }
    
    return Response.json({ success: true });
  },
});
```

**File:** `src/routes/api/ai-coo/latest-analysis.ts`

```typescript
import { createAPIFileRoute } from '@tanstack/start/api';
import { getLatestAnalysisResults } from '@/data-access/ai-coo';
import { requireAuth } from '@/fn/auth';

export const Route = createAPIFileRoute('/api/ai-coo/latest-analysis')({
  GET: async ({ request }) => {
    await requireAuth(request);
    const [latest] = await getLatestAnalysisResults(1);
    return Response.json(latest);
  },
});
```

**Deliverable:** API endpoints for dashboard data

---

## Day 10: Testing & Seed Data

### Task 5.1: Create Seed Script for Monitoring Jobs
**File:** `scripts/seed-ai-coo-jobs.ts`

```typescript
import { db } from '@/db';
import { monitoringJobs } from '@/db/schema/ai-coo';

async function seedMonitoringJobs() {
  await db.insert(monitoringJobs).values([
    {
      name: 'Financial Health Check',
      description: 'Hourly analysis of AR, AP, cash position, and runway',
      schedule: '0 * * * *', // Every hour
      analyzerType: 'financial',
      config: {
        thresholds: {
          cashRunwayMonths: 2,
          ar60PlusDays: 50000,
          ap90PlusDays: 25000,
        },
      },
      enabled: true,
    },
  ]);
  
  console.log('✅ Seeded monitoring jobs');
}

seedMonitoringJobs().catch(console.error);
```

**Deliverable:** Seed script to create initial monitoring job

### Task 5.2: Manual Testing Checklist
- [ ] Run seed script to create monitoring job
- [ ] Start app with `ENABLE_AI_COO=true npm run dev`
- [ ] Verify scheduler starts and logs job
- [ ] Wait for job to run (or trigger manually)
- [ ] Check database for analysis_results record
- [ ] Check database for alerts if thresholds exceeded
- [ ] Open dashboard at `/dashboard/ai-coo`
- [ ] Verify metrics display correctly
- [ ] Verify alerts display correctly
- [ ] Test acknowledge alert button
- [ ] Test dismiss alert button

**Deliverable:** Tested and working Phase 1 system

---

## Success Metrics

### Technical
- ✅ Scheduler runs without errors
- ✅ Financial analysis completes in <30 seconds
- ✅ Alerts generated when thresholds exceeded
- ✅ Dashboard loads in <2 seconds
- ✅ No database errors

### Business
- ✅ Accurate financial metrics from Odoo
- ✅ Actionable alerts with clear descriptions
- ✅ User can understand dashboard at a glance

---

## Next Steps After Phase 1

Once Phase 1 is complete and tested:

1. **Phase 2 Planning:** Sales Pipeline Analyzer + Operations Analyzer
2. **Refinement:** Improve financial analyzer based on real-world usage
3. **User Feedback:** Get feedback from business owner on usefulness
4. **Performance Tuning:** Optimize queries and AI prompts

---

## Notes

- Start with conservative thresholds, adjust based on business needs
- Log everything for debugging
- Keep AI prompts simple and focused for Phase 1
- Dashboard should be functional, not beautiful (polish in Phase 6)
- Focus on getting real value (accurate data, useful alerts) over features
