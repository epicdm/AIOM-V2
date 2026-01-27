# 🎯 AI COO Production-Ready Implementation Plan

**Complete Architecture, Design & Build Strategy**

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Core Architecture](#core-architecture)
3. [Database Schema](#database-schema)
4. [Action Protocol Design](#action-protocol-design)
5. [Safe Operations Layer](#safe-operations-layer)
6. [Job Queue Architecture](#job-queue-architecture)
7. [Approval System Design](#approval-system-design)
8. [API Design](#api-design)
9. [File Structure](#file-structure)
10. [4-Week MVP Build Plan](#4-week-mvp-build-plan)
11. [Security & Safety](#security--safety)
12. [Testing Strategy](#testing-strategy)
13. [Deployment & Scaling](#deployment--scaling)

---

## Executive Summary

### What We're Building

An **AI Operations Manager (AI COO)** that autonomously monitors your business (via Odoo), detects risks/opportunities, generates action plans, and executes them under ultra-conservative guardrails with full human oversight.

### Architecture Rating: 9.5/10 (After Revisions)

**Key Improvements from Original Plan:**
- ✅ Action Protocol - strict contract for every action
- ✅ Safe Operations Layer - curated, validated Odoo actions (no raw CRUD)
- ✅ Job Queue + Worker - BullMQ for reliable execution
- ✅ Immutable Audit Trail - append-only event log
- ✅ Signed Approvals - JWT tokens with expiry
- ✅ Idempotency + Revalidation - no duplicates or stale actions

### MVP Timeline: 4 Weeks (Not 8!)

**Proves the thesis:** AI can run your business autonomously under your control.

### Your Configuration

- **Email**: SMTP2GO (existing account)
- **SMS**: Your SMS server (existing)
- **Calendar**: Google Calendar only
- **Approvals**: In-app + Email + SMS (all channels)
- **Guardrails**: Ultra-conservative (approve almost everything)
- **Follow-up Timing**: AI-determined (Claude decides)
- **API**: Your Claude subscription (Anthropic API key)

---

## Core Architecture

### High-Level System Design

```
┌─────────────────────────────────────────────────────────────┐
│                     WEB APPLICATION                          │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ Dashboard UI     │  │ API Routes       │                │
│  │ - Approvals      │  │ - /ai-coo/*      │                │
│  │ - Audit Trail    │  │ - WebSocket      │                │
│  │ - Real-time Feed │  │                  │                │
│  └────────┬─────────┘  └────────┬─────────┘                │
└───────────┼────────────────────┼──────────────────────────┘
            │                    │
            ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│                   CORE BUSINESS LOGIC                        │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 1. ANALYZERS (Scheduled via node-cron)              │  │
│  │    ├─ Financial Analyzer (hourly)                   │  │
│  │    ├─ Sales Analyzer (future)                       │  │
│  │    └─ Operations Analyzer (future)                  │  │
│  └────────────┬─────────────────────────────────────────┘  │
│               │                                             │
│               ▼                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 2. ACTION RECOMMENDER                                │  │
│  │    ├─ Uses Claude SDK + Master Prompt               │  │
│  │    ├─ Generates ActionProtocol objects              │  │
│  │    ├─ Validates against schema (zod)                │  │
│  │    └─ Stores in DB with status                      │  │
│  └────────────┬─────────────────────────────────────────┘  │
│               │                                             │
│               ▼                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 3. GUARDRAILS CHECKER                                │  │
│  │    ├─ Risk level assessment                          │  │
│  │    ├─ Approval requirements                          │  │
│  │    ├─ Rate limits check                              │  │
│  │    └─ Policy evaluation                              │  │
│  └────────────┬─────────────────────────────────────────┘  │
│               │                                             │
│         ┌─────┴─────┐                                      │
│         │           │                                       │
│         ▼           ▼                                       │
│  ┌──────────┐ ┌────────────────┐                          │
│  │ Requires │ │ Auto-Execute   │                          │
│  │ Approval │ │ (Low Risk)     │                          │
│  └────┬─────┘ └───────┬────────┘                          │
│       │               │                                     │
└───────┼───────────────┼─────────────────────────────────────┘
        │               │
        ▼               │
┌──────────────────┐    │
│ 4. APPROVAL      │    │
│    SYSTEM        │    │
│  ├─ In-app       │    │
│  ├─ Email        │    │
│  └─ SMS          │    │
└────────┬─────────┘    │
         │              │
         ▼              ▼
┌─────────────────────────────────────────────────────────────┐
│              5. JOB QUEUE (BullMQ + Redis)                  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Queue: 'ai-coo-actions'                              │  │
│  │  ├─ Job: { actionId, priority, attempts }           │  │
│  │  ├─ Retries: 3 with exponential backoff             │  │
│  │  └─ Dead letter queue for failures                  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│       6. ACTION WORKER (Separate Node Process)              │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ For each job:                                        │  │
│  │  1. Load action from DB                              │  │
│  │  2. Check expiration                                 │  │
│  │  3. Idempotency check (already executed?)           │  │
│  │  4. Revalidate preconditions                        │  │
│  │  5. Execute via Safe Operations Layer               │  │
│  │  6. Append to audit trail (immutable)               │  │
│  │  7. Update action status                            │  │
│  │  8. Notify user of completion                       │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│         7. SAFE OPERATIONS LAYER                            │
│                                                              │
│  ✅ SAFE (Always Allowed):                                  │
│     ├─ createTask()                                         │
│     ├─ scheduleActivity()                                   │
│     └─ postInternalMessage()                                │
│                                                              │
│  ⚠️ GATED (Requires Approval):                              │
│     ├─ sendEmail()                                          │
│     ├─ sendSMS()                                            │
│     └─ updateDealStage()                                    │
│                                                              │
│  ❌ NEVER EXPOSED:                                          │
│     └─ Raw odoo.create/write/unlink                         │
│                                                              │
│  Each operation:                                            │
│    ├─ Validates inputs (zod schema)                         │
│    ├─ Executes against Odoo/SMTP2GO/SMS                    │
│    ├─ Logs to audit trail                                  │
│    └─ Returns typed result                                  │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              8. EXTERNAL SYSTEMS                            │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │ Odoo       │  │ SMTP2GO    │  │ SMS Server │           │
│  │ (XML-RPC)  │  │ (Email)    │  │            │           │
│  └────────────┘  └────────────┘  └────────────┘           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│           9. IMMUTABLE AUDIT TRAIL (PostgreSQL)             │
│                                                              │
│  Table: action_events (append-only)                         │
│    ├─ action.created   (when AI generates)                 │
│    ├─ action.approved  (when user approves)                │
│    ├─ action.executed  (when worker completes)             │
│    └─ action.failed    (when execution fails)              │
│                                                              │
│  Never updated, never deleted - only appended               │
└─────────────────────────────────────────────────────────────┘
```

### Key Architectural Principles

1. **Action Protocol** - Every action follows strict schema
2. **Safe by Default** - Curated operations, no raw CRUD
3. **Async Execution** - Job queue + worker pattern
4. **Immutable Audit** - Append-only event log
5. **Human Oversight** - Ultra-conservative approvals
6. **Fail-Safe** - Idempotency + revalidation

---

## Database Schema

### Core Tables

```sql
-- ============================================================
-- 1. AUTONOMOUS ACTIONS (Main action tracking)
-- ============================================================
CREATE TABLE autonomous_actions (
  id TEXT PRIMARY KEY,

  -- Action details
  action_type TEXT NOT NULL, -- 'create_task', 'send_email', etc.
  action_protocol JSONB NOT NULL, -- Full ActionProtocol object

  -- Lifecycle
  status TEXT NOT NULL, -- 'pending_approval', 'approved', 'executing', 'executed', 'failed', 'expired'
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL, -- Actions expire after 24 hours

  -- Approval
  requires_approval BOOLEAN NOT NULL DEFAULT TRUE,
  approved_by TEXT, -- user_id
  approved_at TIMESTAMP,
  approval_token_used TEXT, -- Prevents token reuse

  -- Execution
  executed_at TIMESTAMP,
  execution_result JSONB,
  execution_error TEXT,

  -- Safety
  idempotency_key TEXT NOT NULL UNIQUE,
  risk_level TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'

  -- Context
  analysis_id TEXT, -- Links to analysis that generated this
  reasoning TEXT NOT NULL,
  expected_effect TEXT NOT NULL,

  -- Indexing
  org_id TEXT, -- For multi-tenant future

  -- Metadata
  created_by TEXT NOT NULL DEFAULT 'ai_coo'
);

CREATE INDEX idx_actions_status ON autonomous_actions(status);
CREATE INDEX idx_actions_created_at ON autonomous_actions(created_at DESC);
CREATE INDEX idx_actions_expires_at ON autonomous_actions(expires_at);
CREATE INDEX idx_actions_idempotency ON autonomous_actions(idempotency_key);
CREATE INDEX idx_actions_org ON autonomous_actions(org_id);

-- ============================================================
-- 2. ACTION EVENTS (Immutable audit trail)
-- ============================================================
CREATE TABLE action_events (
  id TEXT PRIMARY KEY,
  action_id TEXT NOT NULL REFERENCES autonomous_actions(id),

  -- Event details
  event_type TEXT NOT NULL, -- 'created', 'approved', 'rejected', 'executing', 'executed', 'failed'
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Actor
  actor TEXT, -- user_id or 'ai_coo' or 'system'
  actor_type TEXT, -- 'human', 'ai', 'system'

  -- Event data
  event_data JSONB,

  -- NO updated_at - this is append-only!
  -- NO delete permission - immutable

  CONSTRAINT event_types CHECK (
    event_type IN ('created', 'approved', 'rejected', 'executing', 'executed', 'failed', 'expired', 'revalidation_failed')
  )
);

CREATE INDEX idx_events_action ON action_events(action_id, timestamp DESC);
CREATE INDEX idx_events_timestamp ON action_events(timestamp DESC);
CREATE INDEX idx_events_type ON action_events(event_type);

-- ============================================================
-- 3. ANALYSIS RESULTS (Existing - from Phase 1)
-- ============================================================
-- Already exists, used as input to action recommender
CREATE TABLE IF NOT EXISTS analysis_results (
  id TEXT PRIMARY KEY,
  analyzer_type TEXT NOT NULL,
  summary TEXT,
  insights JSONB,
  recommendations JSONB,
  metrics JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 4. ALERTS (Existing - from Phase 1)
-- ============================================================
-- Already exists
CREATE TABLE IF NOT EXISTS alerts (
  id TEXT PRIMARY KEY,
  analysis_id TEXT,
  type TEXT NOT NULL,
  severity TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 5. ACTION EXECUTION LOG (Detailed execution tracking)
-- ============================================================
CREATE TABLE action_execution_log (
  id TEXT PRIMARY KEY,
  action_id TEXT NOT NULL REFERENCES autonomous_actions(id),

  -- Execution details
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP,
  duration_ms INTEGER,

  -- What was called
  operation_type TEXT NOT NULL, -- 'odoo_create_task', 'smtp2go_send_email', etc.
  operation_params JSONB NOT NULL,

  -- Result
  success BOOLEAN NOT NULL,
  result_data JSONB,
  error_message TEXT,
  error_stack TEXT,

  -- External system responses
  odoo_record_id INTEGER,
  email_message_id TEXT,
  sms_message_id TEXT,

  -- Resource usage
  api_calls_made INTEGER DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,

  -- Retry tracking
  attempt_number INTEGER NOT NULL DEFAULT 1,
  is_retry BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_exec_log_action ON action_execution_log(action_id);
CREATE INDEX idx_exec_log_started ON action_execution_log(started_at DESC);
CREATE INDEX idx_exec_log_success ON action_execution_log(success);

-- ============================================================
-- 6. GUARDRAILS CONFIG (User-configurable safety settings)
-- ============================================================
CREATE TABLE guardrails_config (
  id TEXT PRIMARY KEY,
  org_id TEXT, -- For multi-tenant

  -- Permissions
  can_create_tasks BOOLEAN NOT NULL DEFAULT TRUE,
  can_send_emails BOOLEAN NOT NULL DEFAULT FALSE,
  can_send_sms BOOLEAN NOT NULL DEFAULT FALSE,
  can_update_financial_records BOOLEAN NOT NULL DEFAULT FALSE,
  can_delete_records BOOLEAN NOT NULL DEFAULT FALSE,

  -- Limits
  max_email_recipients_per_action INTEGER NOT NULL DEFAULT 10,
  max_sms_per_day INTEGER NOT NULL DEFAULT 50,
  max_financial_amount_without_approval NUMERIC NOT NULL DEFAULT 0,
  max_bulk_action_records INTEGER NOT NULL DEFAULT 10,

  -- Approval requirements
  requires_approval_for_financial BOOLEAN NOT NULL DEFAULT TRUE,
  requires_approval_for_bulk_actions BOOLEAN NOT NULL DEFAULT TRUE,
  requires_approval_for_deletion BOOLEAN NOT NULL DEFAULT TRUE,
  requires_approval_for_external_comms BOOLEAN NOT NULL DEFAULT TRUE,

  -- Time restrictions
  allow_actions_outside_business_hours BOOLEAN NOT NULL DEFAULT FALSE,
  allow_actions_on_weekends BOOLEAN NOT NULL DEFAULT FALSE,
  business_hours_start TIME DEFAULT '09:00:00',
  business_hours_end TIME DEFAULT '17:00:00',
  business_hours_timezone TEXT DEFAULT 'America/New_York',

  -- Notification preferences
  notify_before_action BOOLEAN NOT NULL DEFAULT TRUE,
  notify_after_action BOOLEAN NOT NULL DEFAULT TRUE,
  notification_channels JSONB DEFAULT '["in_app", "email"]'::jsonb,

  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 7. RATE LIMIT TRACKING
-- ============================================================
CREATE TABLE rate_limit_tracking (
  id TEXT PRIMARY KEY,

  -- What's being rate limited
  limit_type TEXT NOT NULL, -- 'email', 'sms', 'api_call'
  limit_key TEXT NOT NULL, -- e.g., 'org_123', 'user_456'

  -- Tracking
  count INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMP NOT NULL,
  window_end TIMESTAMP NOT NULL,

  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  UNIQUE(limit_type, limit_key, window_start)
);

CREATE INDEX idx_rate_limit_window ON rate_limit_tracking(limit_type, limit_key, window_end);
```

### Database Relationships

```
analysis_results (1) ──→ (many) autonomous_actions
                                      │
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
                    ▼                 ▼                 ▼
             action_events    action_execution_log   alerts
            (append-only)     (detailed tracking)   (alerts)
```

---

## Action Protocol Design

### TypeScript Interface

```typescript
// File: src/lib/ai-coo/action-protocol.ts

import { z } from 'zod';

/**
 * Action Protocol - The contract for every autonomous action
 *
 * This is the single source of truth for action structure.
 * Every action MUST conform to this schema.
 */

// ============================================================
// 1. ENUMS
// ============================================================

export const ActionType = z.enum([
  // ✅ SAFE - Always allowed
  'create_task',
  'schedule_activity',
  'post_internal_message',

  // ⚠️ GATED - Requires approval
  'send_email',
  'send_sms',
  'update_deal_stage',
  'create_invoice_reminder',

  // Future additions
  'schedule_meeting',
  'create_purchase_order',
]);

export const RiskLevel = z.enum([
  'low',      // Internal actions, no external impact
  'medium',   // External comms, low financial impact
  'high',     // High-value financial, bulk actions
  'critical', // Irreversible or high-risk actions
]);

export const RollbackStrategy = z.enum([
  'delete_record',       // Can delete the created record
  'restore_previous',    // Can restore previous value
  'manual',             // Requires manual intervention
  'not_possible',       // Cannot be rolled back
]);

// ============================================================
// 2. PRECONDITIONS
// ============================================================

export const PreconditionsSchema = z.object({
  // Financial preconditions
  invoice_still_unpaid: z.boolean().optional(),
  invoice_amount_unchanged: z.boolean().optional(),

  // CRM preconditions
  deal_stage_unchanged: z.boolean().optional(),
  deal_still_active: z.boolean().optional(),

  // Calendar preconditions
  meeting_slot_still_free: z.boolean().optional(),

  // General
  record_still_exists: z.boolean().optional(),
  no_duplicate_action_today: z.boolean().optional(),
}).passthrough(); // Allow additional preconditions

// ============================================================
// 3. AFFECTED RECORDS
// ============================================================

export const AffectedRecordsSchema = z.object({
  // Odoo records
  odoo_model: z.string().optional(),
  odoo_ids: z.array(z.number()).optional(),

  // Internal records
  internal_ids: z.array(z.string()).optional(),

  // Human-readable description
  description: z.string().optional(),
});

// ============================================================
// 4. ACTION INPUTS (Type-safe per action type)
// ============================================================

// Create Task inputs
export const CreateTaskInputsSchema = z.object({
  name: z.string().min(1).max(255),
  user_id: z.number().int().positive(),
  date_deadline: z.string(), // ISO date string
  description: z.string().optional(),
  project_id: z.number().int().positive().optional(),
  priority: z.enum(['0', '1', '2', '3']).optional(), // Odoo priority
});

// Send Email inputs
export const SendEmailInputsSchema = z.object({
  to: z.union([z.string().email(), z.array(z.string().email())]),
  subject: z.string().min(1).max(255),
  body: z.string().min(1),
  template_id: z.string().optional(),
  template_vars: z.record(z.unknown()).optional(),
});

// Schedule Activity inputs
export const ScheduleActivityInputsSchema = z.object({
  res_model: z.enum(['crm.lead', 'account.move', 'res.partner']),
  res_id: z.number().int().positive(),
  activity_type_id: z.number().int().positive(),
  summary: z.string().min(1).max(255),
  date_deadline: z.string(), // ISO date string
  note: z.string().optional(),
  user_id: z.number().int().positive().optional(),
});

// Update Deal Stage inputs
export const UpdateDealStageInputsSchema = z.object({
  deal_id: z.number().int().positive(),
  new_stage_id: z.number().int().positive(),
  reason: z.string().min(1),
  current_stage_id: z.number().int().positive(), // For validation
});

// Union of all input types
export const ActionInputsSchema = z.union([
  CreateTaskInputsSchema,
  SendEmailInputsSchema,
  ScheduleActivityInputsSchema,
  UpdateDealStageInputsSchema,
  z.object({}).passthrough(), // Fallback for future action types
]);

// ============================================================
// 5. MAIN ACTION PROTOCOL SCHEMA
// ============================================================

export const ActionProtocolSchema = z.object({
  // Identity
  action_id: z.string().uuid(),
  action_type: ActionType,

  // Classification
  risk_level: RiskLevel,
  requires_approval: z.boolean(),

  // Inputs (validated per action type)
  inputs: ActionInputsSchema,

  // Preconditions (what must be true before execution)
  preconditions: PreconditionsSchema.optional(),

  // Human-readable explanation
  expected_effect: z.string().min(10).max(500),
  reasoning: z.string().min(20).max(1000),

  // Impact tracking
  affected_records: AffectedRecordsSchema,
  estimated_impact: z.object({
    revenue_change: z.number().optional(),
    cash_runway_change_days: z.number().optional(),
    time_saved_hours: z.number().optional(),
    risk_reduction_score: z.number().min(0).max(100).optional(),
  }).optional(),

  // Safety
  rollback_strategy: RollbackStrategy,
  idempotency_key: z.string().min(1),
  expires_at: z.date(),

  // Audit
  created_at: z.date(),
  created_by: z.string(), // 'ai_coo', user_id, 'system'
  analysis_id: z.string().uuid().optional(), // Links to analysis

  // Metadata
  metadata: z.record(z.unknown()).optional(),
});

export type ActionProtocol = z.infer<typeof ActionProtocolSchema>;

// ============================================================
// 6. HELPER FUNCTIONS
// ============================================================

/**
 * Generate a unique idempotency key for an action
 */
export function generateIdempotencyKey(
  actionType: string,
  targetId: string | number,
  date: Date = new Date()
): string {
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
  return `${actionType}-${targetId}-${dateStr}`;
}

/**
 * Generate action ID
 */
export function generateActionId(): string {
  return `act_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

/**
 * Check if action has expired
 */
export function isActionExpired(action: ActionProtocol): boolean {
  return action.expires_at < new Date();
}

/**
 * Validate action against schema
 */
export function validateActionProtocol(action: unknown): ActionProtocol {
  return ActionProtocolSchema.parse(action);
}

/**
 * Create a new action protocol object
 */
export function createActionProtocol(params: {
  action_type: z.infer<typeof ActionType>;
  risk_level: z.infer<typeof RiskLevel>;
  inputs: z.infer<typeof ActionInputsSchema>;
  expected_effect: string;
  reasoning: string;
  affected_records: z.infer<typeof AffectedRecordsSchema>;
  analysis_id?: string;
  preconditions?: z.infer<typeof PreconditionsSchema>;
  expiresInHours?: number;
}): ActionProtocol {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + (params.expiresInHours || 24) * 60 * 60 * 1000);

  // Determine if approval required based on risk level
  const requires_approval = params.risk_level !== 'low';

  // Generate idempotency key
  const targetId = params.affected_records.odoo_ids?.[0] ||
                   params.affected_records.internal_ids?.[0] ||
                   'unknown';
  const idempotency_key = generateIdempotencyKey(
    params.action_type,
    targetId,
    now
  );

  const action: ActionProtocol = {
    action_id: generateActionId(),
    action_type: params.action_type,
    risk_level: params.risk_level,
    requires_approval,
    inputs: params.inputs,
    preconditions: params.preconditions,
    expected_effect: params.expected_effect,
    reasoning: params.reasoning,
    affected_records: params.affected_records,
    rollback_strategy: determineRollbackStrategy(params.action_type),
    idempotency_key,
    expires_at: expiresAt,
    created_at: now,
    created_by: 'ai_coo',
    analysis_id: params.analysis_id,
  };

  // Validate before returning
  return validateActionProtocol(action);
}

function determineRollbackStrategy(actionType: string): z.infer<typeof RollbackStrategy> {
  switch (actionType) {
    case 'create_task':
    case 'schedule_activity':
      return 'delete_record';
    case 'update_deal_stage':
      return 'restore_previous';
    case 'send_email':
    case 'send_sms':
      return 'not_possible';
    default:
      return 'manual';
  }
}
```

### Example Action Protocol Object

```json
{
  "action_id": "act_1706250000_abc123",
  "action_type": "send_email",
  "risk_level": "medium",
  "requires_approval": true,

  "inputs": {
    "to": ["customer@example.com", "manager@example.com"],
    "subject": "Invoice Payment Reminder - 62 Days Overdue",
    "body": "Dear valued customer,\n\nThis is a friendly reminder that Invoice #INV-1234 for $5,000 is now 62 days overdue..."
  },

  "preconditions": {
    "invoice_still_unpaid": true,
    "invoice_amount_unchanged": true
  },

  "expected_effect": "Send payment reminder to customer with 62-day overdue invoice",
  "reasoning": "Invoice #INV-1234 ($5,000) is 62 days overdue. Customer has paid on time historically. A friendly reminder may prompt payment and improve cash runway from 47 to 52 days.",

  "affected_records": {
    "odoo_model": "account.move",
    "odoo_ids": [1234],
    "description": "Invoice #INV-1234 - Acme Corp - $5,000"
  },

  "estimated_impact": {
    "revenue_change": 5000,
    "cash_runway_change_days": 5,
    "time_saved_hours": 0.5
  },

  "rollback_strategy": "not_possible",
  "idempotency_key": "send_email-1234-2025-01-26",
  "expires_at": "2025-01-27T10:00:00Z",
  "created_at": "2025-01-26T10:00:00Z",
  "created_by": "ai_coo",
  "analysis_id": "analysis_20250126_100000"
}
```

---

## Safe Operations Layer

### Architecture

The Safe Operations Layer is the **ONLY** interface between the AI and external systems. It enforces:

1. Input validation (zod schemas)
2. Audit logging (every operation)
3. Type-safe returns
4. No raw CRUD exposure

### Implementation

```typescript
// File: src/lib/ai-coo/safe-operations/index.ts

/**
 * Safe Operations Layer
 *
 * Rules:
 * 1. Every operation validates inputs with zod
 * 2. Every operation logs to audit trail
 * 3. Every operation returns typed results
 * 4. Raw Odoo CRUD is NEVER exposed
 */

import { z } from 'zod';
import { getOdooClient } from '~/lib/odoo/client';
import { appendActionEvent } from '~/lib/ai-coo/audit-trail';

export interface OperationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  execution_time_ms: number;
}

// ============================================================
// 1. CREATE TASK (✅ SAFE - Always Allowed)
// ============================================================

export async function createTask(
  inputs: z.infer<typeof CreateTaskInputsSchema>,
  actionId: string
): Promise<OperationResult<{ task_id: number }>> {
  const startTime = Date.now();

  try {
    // 1. Validate inputs
    const validated = CreateTaskInputsSchema.parse(inputs);

    // 2. Execute against Odoo
    const odooClient = await getOdooClient();
    const taskId = await odooClient.create('project.task', {
      name: validated.name,
      user_ids: [[6, 0, [validated.user_id]]], // Odoo many2many format
      date_deadline: validated.date_deadline,
      description: validated.description,
      project_id: validated.project_id,
      priority: validated.priority || '1',
    });

    // 3. Log to audit trail
    await appendActionEvent({
      action_id: actionId,
      event_type: 'executed',
      event_data: {
        operation: 'create_task',
        odoo_model: 'project.task',
        odoo_id: taskId,
        inputs: validated,
      },
    });

    // 4. Return result
    return {
      success: true,
      data: { task_id: taskId },
      execution_time_ms: Date.now() - startTime,
    };

  } catch (error) {
    // Log failure
    await appendActionEvent({
      action_id: actionId,
      event_type: 'failed',
      event_data: {
        operation: 'create_task',
        error: error instanceof Error ? error.message : String(error),
      },
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      execution_time_ms: Date.now() - startTime,
    };
  }
}

// ============================================================
// 2. SCHEDULE ACTIVITY (✅ SAFE)
// ============================================================

export async function scheduleActivity(
  inputs: z.infer<typeof ScheduleActivityInputsSchema>,
  actionId: string
): Promise<OperationResult<{ activity_id: number }>> {
  const startTime = Date.now();

  try {
    const validated = ScheduleActivityInputsSchema.parse(inputs);

    const odooClient = await getOdooClient();
    const activityId = await odooClient.create('mail.activity', {
      res_model: validated.res_model,
      res_id: validated.res_id,
      activity_type_id: validated.activity_type_id,
      summary: validated.summary,
      date_deadline: validated.date_deadline,
      note: validated.note,
      user_id: validated.user_id,
    });

    await appendActionEvent({
      action_id: actionId,
      event_type: 'executed',
      event_data: {
        operation: 'schedule_activity',
        odoo_model: 'mail.activity',
        odoo_id: activityId,
        inputs: validated,
      },
    });

    return {
      success: true,
      data: { activity_id: activityId },
      execution_time_ms: Date.now() - startTime,
    };

  } catch (error) {
    await appendActionEvent({
      action_id: actionId,
      event_type: 'failed',
      event_data: {
        operation: 'schedule_activity',
        error: error instanceof Error ? error.message : String(error),
      },
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      execution_time_ms: Date.now() - startTime,
    };
  }
}

// ============================================================
// 3. SEND EMAIL (⚠️ GATED - Requires Approval)
// ============================================================

import nodemailer from 'nodemailer';
import { RateLimiterMemory } from 'rate-limiter-flexible';

const emailRateLimiter = new RateLimiterMemory({
  points: 100, // 100 emails
  duration: 3600, // per hour
});

const transporter = nodemailer.createTransport({
  host: 'mail.smtp2go.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP2GO_USERNAME!,
    pass: process.env.SMTP2GO_PASSWORD!,
  },
});

export async function sendEmail(
  inputs: z.infer<typeof SendEmailInputsSchema>,
  actionId: string,
  bypassRateLimit: boolean = false
): Promise<OperationResult<{ message_id: string }>> {
  const startTime = Date.now();

  try {
    const validated = SendEmailInputsSchema.parse(inputs);

    // Rate limit check
    if (!bypassRateLimit) {
      try {
        await emailRateLimiter.consume(actionId, 1);
      } catch {
        throw new Error('Email rate limit exceeded (100/hour)');
      }
    }

    // Recipient count check
    const recipients = Array.isArray(validated.to) ? validated.to : [validated.to];
    if (recipients.length > 10) {
      throw new Error('Maximum 10 recipients per email');
    }

    // Send email
    const info = await transporter.sendMail({
      from: process.env.DEFAULT_FROM_EMAIL!,
      to: validated.to,
      subject: validated.subject,
      text: validated.body,
      html: validated.body, // TODO: Add template rendering
    });

    await appendActionEvent({
      action_id: actionId,
      event_type: 'executed',
      event_data: {
        operation: 'send_email',
        message_id: info.messageId,
        recipients: recipients,
        subject: validated.subject,
      },
    });

    return {
      success: true,
      data: { message_id: info.messageId },
      execution_time_ms: Date.now() - startTime,
    };

  } catch (error) {
    await appendActionEvent({
      action_id: actionId,
      event_type: 'failed',
      event_data: {
        operation: 'send_email',
        error: error instanceof Error ? error.message : String(error),
      },
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      execution_time_ms: Date.now() - startTime,
    };
  }
}

// ============================================================
// OPERATION REGISTRY
// ============================================================

export const SAFE_OPERATIONS = {
  create_task: createTask,
  schedule_activity: scheduleActivity,
  post_internal_message: postInternalMessage,
  send_email: sendEmail,
  update_deal_stage: updateDealStage,
} as const;

export type SafeOperationType = keyof typeof SAFE_OPERATIONS;

/**
 * Execute a safe operation by name
 */
export async function executeSafeOperation(
  operationType: SafeOperationType,
  inputs: unknown,
  actionId: string
): Promise<OperationResult> {
  const operation = SAFE_OPERATIONS[operationType];
  if (!operation) {
    throw new Error(`Unknown operation type: ${operationType}`);
  }

  return await operation(inputs as any, actionId);
}
```

### Security Guarantees

1. **No raw CRUD** - `odoo.create/write/unlink` never exposed to AI
2. **Validated inputs** - All inputs parsed with zod schemas
3. **Rate limited** - Email: 100/hour, SMS: 50/day
4. **Audited** - Every operation logged
5. **Type-safe** - Full TypeScript types

---

## Job Queue Architecture

### BullMQ Setup

```typescript
// File: src/lib/queue/connection.ts

import { Redis } from 'ioredis';

export const redisConnection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

redisConnection.on('connect', () => {
  console.log('[Redis] Connected');
});

redisConnection.on('error', (error) => {
  console.error('[Redis] Error:', error);
});
```

```typescript
// File: src/lib/queue/action-queue.ts

import { Queue, QueueOptions } from 'bullmq';
import { redisConnection } from './connection';

export interface ActionJobData {
  actionId: string;
  priority?: number;
  metadata?: Record<string, unknown>;
}

const queueOptions: QueueOptions = {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000, // Start with 2 seconds
    },
    removeOnComplete: {
      count: 1000, // Keep last 1000 completed jobs
      age: 7 * 24 * 3600, // Remove after 7 days
    },
    removeOnFail: {
      count: 500, // Keep last 500 failed jobs
      age: 30 * 24 * 3600, // Remove after 30 days
    },
  },
};

export const actionQueue = new Queue<ActionJobData>('ai-coo-actions', queueOptions);

/**
 * Add action to execution queue
 */
export async function queueActionForExecution(
  actionId: string,
  priority: number = 0
): Promise<void> {
  await actionQueue.add(
    'execute_action',
    { actionId, priority },
    {
      priority, // Higher number = higher priority
      jobId: `action-${actionId}`, // Prevents duplicates
    }
  );

  console.log(`[Queue] Action ${actionId} queued for execution`);
}
```

### Action Worker

```typescript
// File: src/workers/action-worker.ts

import { Worker, Job } from 'bullmq';
import { redisConnection } from '~/lib/queue/connection';
import { executeAction } from '~/lib/ai-coo/action-executor';

/**
 * Action Worker - Separate Node process
 * Start with: npm run worker
 */

const worker = new Worker<ActionJobData>(
  'ai-coo-actions',
  async (job: Job<ActionJobData>) => {
    const { actionId } = job.data;

    console.log(`[Worker] Processing action ${actionId} (attempt ${job.attemptsMade + 1})`);

    try {
      const result = await executeAction(actionId);
      console.log(`[Worker] ✅ Action ${actionId} completed successfully`);
      return result;
    } catch (error) {
      console.error(`[Worker] ❌ Action ${actionId} failed:`, error);
      throw error; // Will trigger retry
    }
  },
  {
    connection: redisConnection,
    concurrency: 5, // Process up to 5 actions concurrently
    limiter: {
      max: 10, // Max 10 jobs
      duration: 1000, // per second
    },
  }
);

// Event listeners
worker.on('completed', (job) => {
  console.log(`[Worker] Job ${job.id} completed`);
});

worker.on('failed', (job, error) => {
  console.error(`[Worker] Job ${job?.id} failed after ${job?.attemptsMade} attempts:`, error);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Worker] SIGTERM received, closing worker...');
  await worker.close();
  process.exit(0);
});

console.log('[Worker] Action worker started');
```

### Package.json Scripts

```json
{
  "scripts": {
    "dev": "npm run db:up && vite dev",
    "worker": "tsx src/workers/action-worker.ts",
    "dev:all": "concurrently \"npm run dev\" \"npm run worker\"",
    "build": "vite build",
    "start": "NODE_ENV=production node .output/server/index.mjs",
    "start:worker": "NODE_ENV=production tsx src/workers/action-worker.ts"
  },
  "dependencies": {
    "bullmq": "^5.0.0",
    "ioredis": "^5.3.2"
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
```

---

## Approval System Design

### Signed JWT Tokens

```typescript
// File: src/lib/ai-coo/approvals.ts

import jwt from 'jsonwebtoken';
import { sendEmail } from '~/lib/ai-coo/safe-operations';
import { queueActionForExecution } from '~/lib/queue/action-queue';

const APPROVAL_SECRET = process.env.APPROVAL_SECRET!;

interface ApprovalTokenPayload {
  actionId: string;
  type: 'approval' | 'rejection';
  exp: number;
}

export function generateApprovalToken(
  actionId: string,
  type: 'approval' | 'rejection' = 'approval'
): string {
  const payload: ApprovalTokenPayload = {
    actionId,
    type,
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
  };

  return jwt.sign(payload, APPROVAL_SECRET);
}

export function verifyApprovalToken(token: string): ApprovalTokenPayload {
  try {
    return jwt.verify(token, APPROVAL_SECRET) as ApprovalTokenPayload;
  } catch (error) {
    throw new Error('Invalid or expired approval token');
  }
}

export async function sendApprovalRequest(action: ActionProtocol): Promise<void> {
  const approveToken = generateApprovalToken(action.action_id, 'approval');
  const rejectToken = generateApprovalToken(action.action_id, 'rejection');

  const baseUrl = process.env.APP_URL || 'http://localhost:3000';
  const approveUrl = `${baseUrl}/api/ai-coo/approve?token=${approveToken}`;
  const rejectUrl = `${baseUrl}/api/ai-coo/reject?token=${rejectToken}`;

  const emailBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1f2937; color: white; padding: 20px; }
    .action { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #f59e0b; }
    .risk-critical { border-left-color: #ef4444; }
    .risk-high { border-left-color: #f97316; }
    .buttons { margin: 30px 0; }
    .button { display: inline-block; padding: 12px 30px; margin: 5px; text-decoration: none; border-radius: 6px; font-weight: bold; }
    .approve { background: #10b981; color: white; }
    .reject { background: #ef4444; color: white; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🤖 AI COO Action Approval Required</h1>
    </div>

    <div class="action risk-${action.risk_level}">
      <h2>${action.expected_effect}</h2>
      <p><strong>Risk Level:</strong> ${action.risk_level.toUpperCase()}</p>

      <h3>💡 AI Reasoning:</h3>
      <p>${action.reasoning}</p>

      <h3>🎯 Affected Records:</h3>
      <pre>${JSON.stringify(action.affected_records, null, 2)}</pre>

      <p><strong>⏰ Expires:</strong> ${action.expires_at.toLocaleString()}</p>
    </div>

    <div class="buttons">
      <a href="${approveUrl}" class="button approve">✅ Approve & Execute</a>
      <a href="${rejectUrl}" class="button reject">❌ Reject</a>
    </div>
  </div>
</body>
</html>
  `;

  await sendEmail({
    to: process.env.APPROVAL_EMAIL!,
    subject: `[AI COO] ${action.risk_level.toUpperCase()} - ${action.expected_effect}`,
    body: emailBody,
  }, action.action_id, true);

  console.log(`[Approval] Approval request sent for action ${action.action_id}`);
}

export async function approveAction(token: string, userId: string) {
  const payload = verifyApprovalToken(token);
  const actionId = payload.actionId;

  // Update database
  await db
    .update(autonomous_actions)
    .set({
      status: 'approved',
      approved_by: userId,
      approved_at: new Date(),
      approval_token_used: token,
    })
    .where(eq(autonomous_actions.id, actionId));

  // Log event
  await appendActionEvent({
    action_id: actionId,
    event_type: 'approved',
    actor: userId,
  });

  // Queue for execution
  await queueActionForExecution(actionId, 10);

  return { success: true, actionId };
}
```

---

## API Design

### REST Endpoints

```typescript
// GET /api/ai-coo/actions
// List actions with filtering
{
  query: {
    status?: 'pending_approval' | 'approved' | 'executing' | 'executed' | 'failed';
    risk_level?: 'low' | 'medium' | 'high' | 'critical';
    limit?: number;
    offset?: number;
  },
  response: {
    actions: ActionProtocol[];
    total: number;
  }
}

// POST /api/ai-coo/actions/:id/approve
// Approve action (in-app)
{
  body: { userId: string },
  response: { success: boolean }
}

// GET /api/ai-coo/approve?token=xxx
// Approve via email link
{
  query: { token: string },
  response: Redirect to dashboard
}

// GET /api/ai-coo/audit-trail
// Get audit events
{
  query: { actionId?: string; startDate?: string; endDate?: string },
  response: { events: ActionEvent[] }
}

// GET /api/ai-coo/queue/metrics
// Queue status
{
  response: { waiting: number; active: number; completed: number; failed: number }
}
```

---

## File Structure

```
C:\repos\AIOM-V2\
├── src/
│   ├── lib/
│   │   ├── ai-coo/
│   │   │   ├── action-protocol.ts        # NEW - Action Protocol schema
│   │   │   ├── action-recommender.ts     # NEW - Claude recommendation engine
│   │   │   ├── action-executor.ts        # NEW - Execution with revalidation
│   │   │   ├── guardrails.ts             # NEW - Safety rules
│   │   │   ├── approvals.ts              # NEW - Signed token system
│   │   │   ├── audit-trail.ts            # NEW - Append-only logging
│   │   │   ├── safe-operations/
│   │   │   │   ├── index.ts              # NEW - Safe operations registry
│   │   │   │   ├── odoo-operations.ts    # NEW - Curated Odoo actions
│   │   │   │   ├── email-operations.ts   # NEW - SMTP2GO integration
│   │   │   │   └── sms-operations.ts     # NEW - SMS server integration
│   │   │   ├── analyzers/
│   │   │   │   └── financial.ts          # EXISTS - Working
│   │   │   └── scheduler/
│   │   │       └── index.ts              # EXISTS - node-cron
│   │   ├── queue/
│   │   │   ├── connection.ts             # NEW - Redis connection
│   │   │   └── action-queue.ts           # NEW - BullMQ queue
│   │   ├── odoo/
│   │   │   ├── client.ts                 # EXISTS - Odoo XML-RPC client
│   │   │   └── config.ts                 # EXISTS
│   │   └── claude/
│   │       ├── sdk-client.ts             # EXISTS - Claude SDK
│   │       └── system-prompts/
│   │           └── aiom-master-prompt.ts # EXISTS - Master prompt
│   ├── workers/
│   │   └── action-worker.ts              # NEW - Separate worker process
│   ├── db/
│   │   ├── ai-coo-schema.ts              # UPDATE - Add new tables
│   │   └── migrations/
│   │       └── 00XX_action_system.sql    # NEW - Migration
│   ├── routes/
│   │   ├── api/
│   │   │   └── ai-coo/
│   │   │       ├── actions.ts            # NEW - Actions API
│   │   │       ├── approve.ts            # NEW - Approval endpoint
│   │   │       ├── reject.ts             # NEW - Rejection endpoint
│   │   │       ├── audit-trail.ts        # NEW - Audit API
│   │   │       ├── trigger.ts            # EXISTS
│   │   │       └── alerts.ts             # EXISTS
│   │   └── dashboard/
│   │       └── operator/
│   │           ├── index.tsx             # NEW - Operator dashboard
│   │           ├── approvals.tsx         # NEW - Approvals view
│   │           └── audit.tsx             # NEW - Audit trail viewer
│   └── components/
│       └── operator/
│           ├── ApprovalCard.tsx          # NEW - Approval card
│           ├── ActionHistory.tsx         # NEW - Actions list
│           └── AuditTimeline.tsx         # NEW - Audit timeline
├── .env                                  # UPDATE - Add secrets
├── package.json                          # UPDATE - Add dependencies
└── AI_COO_PRODUCTION_READY_PLAN.md       # THIS FILE
```

---

## 4-Week MVP Build Plan

### Week 1: Infrastructure Foundation

**Goal:** Build core protocol and safety infrastructure

#### Day 1-2: Action Protocol
- [ ] Create `action-protocol.ts` with zod schemas
- [ ] Define all action types and risk levels
- [ ] Implement helper functions
- [ ] Write unit tests

**Deliverable:** Action Protocol schema validates all actions

#### Day 3-4: Job Queue + Worker
- [ ] Install BullMQ and Redis
- [ ] Set up Redis connection
- [ ] Create action queue
- [ ] Create worker process
- [ ] Test with mock jobs

**Deliverable:** Working job queue with retries

#### Day 5: Immutable Audit Trail
- [ ] Create `action_events` migration
- [ ] Implement `appendActionEvent`
- [ ] Add append-only constraints
- [ ] Create audit API endpoint

**Deliverable:** Append-only audit log working

**Success Criteria:**
- ✅ Action Protocol validates correctly
- ✅ Job queue processes with retries
- ✅ Audit trail logs events
- ✅ Worker runs separately

---

### Week 2: Safe Execution Layer

**Goal:** Implement curated, safe operations

#### Day 1-2: Odoo Safe Operations
- [ ] Implement `createTask()`
- [ ] Implement `scheduleActivity()`
- [ ] Implement `postInternalMessage()`
- [ ] Implement `updateDealStage()` (gated)
- [ ] Test against Odoo

**Deliverable:** 4 safe Odoo operations

#### Day 3: Email with Safety
- [ ] Set up SMTP2GO
- [ ] Implement rate limiting (100/hour)
- [ ] Add recipient validation (max 10)
- [ ] Test email sending

**Deliverable:** Safe email with limits

#### Day 4: SMS with Safety
- [ ] Integrate SMS server
- [ ] Implement throttling
- [ ] Test SMS delivery

**Deliverable:** Safe SMS sending

#### Day 5: Action Executor + Revalidation
- [ ] Implement `executeAction()`
- [ ] Add expiration checking
- [ ] Add idempotency checking
- [ ] Implement revalidation
- [ ] Connect to queue

**Deliverable:** Executor with revalidation

**Success Criteria:**
- ✅ Task created in Odoo
- ✅ Email sent via SMTP2GO
- ✅ SMS delivered
- ✅ Rate limiting works
- ✅ Idempotency prevents duplicates
- ✅ Revalidation catches stale actions

---

### Week 3: AI → Approvals → Execution

**Goal:** End-to-end autonomous flow

#### Day 1-2: Action Recommender
- [ ] Implement `recommendActions()`
- [ ] Use master prompt
- [ ] Generate ActionProtocol objects
- [ ] Store in database

**Deliverable:** AI generates recommendations

#### Day 3-4: Approval System
- [ ] Implement JWT tokens
- [ ] Create approval API endpoints
- [ ] Build email template
- [ ] Add in-app UI
- [ ] Add SMS for critical

**Deliverable:** Full approval workflow

#### Day 5: Integration Testing
- [ ] Trigger financial analysis
- [ ] Verify recommendations generated
- [ ] Approve via email link
- [ ] Watch execution
- [ ] Check Odoo

**Deliverable:** End-to-end working

**Success Criteria:**
- ✅ Analysis generates recommendations
- ✅ Approval email sent
- ✅ Approve → queued → executed
- ✅ Action visible in Odoo
- ✅ Full audit trail

---

### Week 4: Dashboard + UI

**Goal:** Build operator dashboard

#### Day 1-2: Approval Dashboard
- [ ] Create `/dashboard/operator` route
- [ ] Build `ApprovalCard` component
- [ ] Fetch pending approvals
- [ ] Add approve/reject buttons

**Deliverable:** Approval dashboard

#### Day 3: Action History
- [ ] Build `ActionHistory` component
- [ ] Fetch recent actions
- [ ] Add real-time updates

**Deliverable:** Action history visible

#### Day 4: Audit Trail Viewer
- [ ] Create audit route
- [ ] Build timeline UI
- [ ] Add export to CSV

**Deliverable:** Audit trail viewer

#### Day 5: Guardrails Settings
- [ ] Create settings route
- [ ] Build guardrails form
- [ ] Save/load from DB

**Deliverable:** Configurable guardrails

**Success Criteria:**
- ✅ Dashboard shows pending
- ✅ Approve/reject works
- ✅ History updates
- ✅ Audit trail complete
- ✅ Guardrails configurable

---

## Security & Safety

### Security Measures

1. **Approval Tokens**
   - JWT signed with secret
   - 24-hour expiration
   - One-time use
   - Cannot be forged

2. **Input Validation**
   - Every operation validates with zod
   - No raw input to Odoo
   - SQL injection protected

3. **Rate Limiting**
   - Email: 100/hour
   - SMS: 50/day
   - API: 10/second

4. **Audit Trail**
   - Immutable (append-only)
   - All actions logged
   - Actor tracking
   - Exportable

### Safety Guardrails

1. **Action Expiration** - 24 hours
2. **Revalidation** - Check preconditions
3. **Idempotency** - Prevent duplicates
4. **Rollback Strategies** - Document recovery
5. **Ultra-Conservative** - Approve almost everything

---

## Testing Strategy

### Unit Tests

```typescript
// tests/unit/action-protocol.test.ts
import { ActionProtocolSchema, createActionProtocol } from '~/lib/ai-coo/action-protocol';

describe('Action Protocol', () => {
  it('validates correct action', () => {
    const action = createActionProtocol({
      action_type: 'create_task',
      risk_level: 'low',
      inputs: { name: 'Test', user_id: 1, date_deadline: '2025-02-01' },
      expected_effect: 'Create test task',
      reasoning: 'For testing',
      affected_records: { odoo_model: 'project.task' },
    });

    expect(() => ActionProtocolSchema.parse(action)).not.toThrow();
  });
});
```

### Integration Tests

```typescript
// tests/integration/action-execution.test.ts
describe('Action Execution', () => {
  it('creates task in Odoo', async () => {
    const result = await createTask({
      name: 'Test Task',
      user_id: 2,
      date_deadline: '2025-02-01',
    }, 'test-action-id');

    expect(result.success).toBe(true);
    expect(result.data?.task_id).toBeDefined();
  });
});
```

### End-to-End Tests

```typescript
// tests/e2e/autonomous-flow.test.ts
test('complete flow', async ({ page }) => {
  await page.goto('/dashboard/ai-coo');
  await page.click('button:has-text("Run Analysis")');
  await page.waitForTimeout(10000);

  await page.goto('/dashboard/operator');
  await expect(page.locator('.approval-card')).toBeVisible();

  await page.click('button:has-text("Approve")');
  await page.waitForTimeout(5000);

  await expect(page.locator('.action-history')).toContainText('completed');
});
```

---

## Deployment & Scaling

### Development

```bash
# Terminal 1: Web server
npm run dev

# Terminal 2: Worker
npm run worker

# Or combined:
npm run dev:all
```

### Production

```bash
npm run build
pm2 start ecosystem.config.js
```

### PM2 Config

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'aiom-web',
      script: '.output/server/index.mjs',
      instances: 2,
      exec_mode: 'cluster',
    },
    {
      name: 'aiom-worker',
      script: './node_modules/.bin/tsx',
      args: 'src/workers/action-worker.ts',
      instances: 2,
      exec_mode: 'cluster',
    },
  ],
};
```

### Docker Compose

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: aiom
      POSTGRES_PASSWORD: ${DB_PASSWORD}

  redis:
    image: redis:7-alpine

  web:
    build: .
    depends_on: [postgres, redis]
    ports: ["3000:3000"]
    command: npm run start

  worker:
    build: .
    depends_on: [postgres, redis]
    command: npm run start:worker
```

---

## Summary

### What This Plan Delivers (4-Week MVP)

- ✅ Financial risk detection
- ✅ AI-generated action recommendations
- ✅ Ultra-conservative approval workflow (in-app + email + SMS)
- ✅ Safe, curated action execution
- ✅ Complete immutable audit trail
- ✅ Real-time operator dashboard
- ✅ Idempotency + revalidation
- ✅ Rate limiting + security

### Production-Ready Architecture

- ✅ Action Protocol - strict contract
- ✅ Safe Operations Layer - no raw CRUD
- ✅ Job Queue + Worker - reliable execution
- ✅ Immutable Audit Trail - compliance-ready
- ✅ Signed Approvals - cryptographically secure

### Not in MVP (Add Later)

- ❌ Calendar integration
- ❌ Policy builder UI
- ❌ Sales/Operations analyzers
- ❌ Follow-up state machine
- ❌ Conversational UI polish

### Success Proof

1. AI detects financial risk (cash runway < 60 days)
2. Generates action (send invoice reminders)
3. Sends approval email
4. User approves → action executes → email sent
5. Task created in Odoo
6. Full audit trail recorded
7. No duplicates, no stale actions

**This proves: AI can autonomously run your business under your control.**

---

## Environment Variables Required

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/aiom

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Odoo (existing)
ODOO_URL=https://your-odoo.com
ODOO_DB=production
ODOO_USERNAME=admin
ODOO_PASSWORD=xxx

# Claude API (existing)
ANTHROPIC_API_KEY=sk-ant-xxx

# Email (SMTP2GO)
SMTP2GO_USERNAME=your_username
SMTP2GO_PASSWORD=your_password
DEFAULT_FROM_EMAIL=noreply@epiccommunications.com

# SMS (Your Server)
SMS_SERVER_URL=https://your-sms-server.com/api/send
SMS_SERVER_API_KEY=your_api_key
SMS_DEFAULT_FROM=+1234567890

# Approvals
APPROVAL_SECRET=generate_random_secret_here
APPROVAL_EMAIL=admin@epiccommunications.com
APPROVAL_PHONE=+1234567890
APP_URL=https://your-app.com

# Security
NODE_ENV=production
```

---

## Dependencies to Install

```bash
npm install bullmq ioredis jsonwebtoken nodemailer rate-limiter-flexible
npm install -D @types/jsonwebtoken @types/nodemailer concurrently
```

---

## Ready to Build?

**First Task:** Week 1, Day 1 - Create Action Protocol schema

File: `src/lib/ai-coo/action-protocol.ts`

Start with the zod schemas and validation logic.

---

**End of Production-Ready Plan**

This document is your complete blueprint for building the AI COO system. Follow it week by week, and you'll have a production-ready autonomous AI operator in 4 weeks.

Good luck! 🚀
