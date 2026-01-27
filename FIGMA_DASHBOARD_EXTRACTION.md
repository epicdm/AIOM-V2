# Figma Dashboard Design - Complete Extraction

**Extraction Date**: 2026-01-27
**Source**: Figma Desktop App - AI COO Dashboard
**Purpose**: Document all design details for implementation in AIOM codebase

---

## Overview

The Figma design contains a comprehensive AI COO dashboard with **12 custom components** plus standard UI components. This document captures all specifications for implementation.

---

## Design System

### Color Palette

```css
/* Critical (Red) */
--color-critical-bg: #FEF2F2;
--color-critical-border: #EF4444;
--color-critical-text: #991B1B;
--color-critical-pulse: rgba(239, 68, 68, 0.2);

/* Attention (Amber) */
--color-attention-bg: #FFFBEB;
--color-attention-border: #F59E0B;
--color-attention-text: #92400E;

/* Info (Blue) */
--color-info-bg: #EFF6FF;
--color-info-border: #3B82F6;
--color-info-text: #1E3A8A;

/* Automated/Success (Green) */
--color-automated-bg: #F0FDF4;
--color-automated-border: #10B981;
--color-automated-text: #065F46;

/* Neutral (Gray) */
--color-gray-50: #F9FAFB;
--color-gray-100: #F3F4F6;
--color-gray-200: #E5E7EB;
--color-gray-500: #6B7280;
--color-gray-700: #374151;
--color-gray-900: #111827;
```

### Typography

```css
/* Font Family */
--font-sans: 'Inter', -apple-system, sans-serif;

/* Font Sizes */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */

/* Font Weights */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
```

### Spacing Scale

```css
--spacing-1: 0.25rem;  /* 4px */
--spacing-2: 0.5rem;   /* 8px */
--spacing-3: 0.75rem;  /* 12px */
--spacing-4: 1rem;     /* 16px */
--spacing-5: 1.25rem;  /* 20px */
--spacing-6: 1.5rem;   /* 24px */
--spacing-8: 2rem;     /* 32px */
```

---

## Layout Structure

### 3-Column Grid

```
┌──────────────────────────────────────────────────────────┐
│                        TopBar (sticky)                    │
├───────────────┬─────────────────────┬────────────────────┤
│ LEFT (35%)    │ CENTER (40%)        │ RIGHT (25%)        │
│               │                     │                    │
│ Conversation  │ Live Activity Feed  │ Insights & Metrics │
│ Column        │                     │                    │
│               │                     │                    │
└───────────────┴─────────────────────┴────────────────────┘
```

**Implementation**:
```tsx
<div className="grid grid-cols-12 gap-6 h-[calc(100vh-64px)]">
  {/* Left: Conversation Column */}
  <div className="col-span-4 overflow-y-auto">
    {/* AIDecisionCards + ChatInput */}
  </div>

  {/* Center: Activity Feed */}
  <div className="col-span-5 overflow-y-auto">
    {/* Live Activity + Next Up Timeline */}
  </div>

  {/* Right: Insights */}
  <div className="col-span-3 overflow-y-auto">
    {/* Metrics + AI Learnings */}
  </div>
</div>
```

---

## Component Specifications

### 1. AIDecisionCard (Collapsible)

**Purpose**: Display AI-generated action recommendations with progressive disclosure

**Current State**: ❌ Missing collapsible behavior
**Figma Design**: ✅ Fully collapsible with expand/collapse animation

**Features from Figma**:
- Collapsed state shows: Priority badge, title, one-line summary, quick actions
- Expanded state reveals: Full context, AI reasoning, risk assessment, detailed steps
- Smooth height animation (300ms ease-in-out)
- "Show AI Reasoning" button to toggle
- Pulse animation on critical priority cards

**TypeScript Interface**:
```typescript
interface AIDecisionCardProps {
  id: string;
  priority: 'critical' | 'attention' | 'info' | 'automated';
  title: string;
  summary: string; // One-line summary for collapsed state
  body: string; // Full context for expanded state
  aiReasoning?: string; // Optional "why AI flagged this"
  impacted: {
    records: number;
    type: string; // e.g., "invoices", "deals", "tasks"
    names?: string[]; // e.g., ["Acme Corp", "Tech Solutions"]
  };
  sources: string[]; // e.g., ["Odoo CRM", "Financial Analysis"]
  riskAssessment: {
    level: 'low' | 'medium' | 'high' | 'critical';
    description: string;
  };
  recommendedPlan: Array<{
    step: number;
    description: string;
    status: 'needs_approval' | 'draft' | 'auto_executable';
    estimatedTime?: string; // e.g., "2 min"
  }>;
  onApprove: () => void;
  onReview: () => void;
  onAskAI: () => void;
  onDismiss: () => void;
}
```

**Collapsed State** (Default):
```tsx
<div className="rounded-lg border-l-4 bg-white p-5 transition-all hover:shadow-md">
  <PriorityBadge priority={priority} />
  <h3 className="mt-2 font-medium">{title}</h3>
  <p className="text-sm text-gray-600">{summary}</p>

  <div className="mt-3 flex gap-2">
    <Button size="sm" variant="primary">Approve</Button>
    <Button size="sm" variant="ghost" onClick={expand}>Show Details</Button>
  </div>
</div>
```

**Expanded State**:
```tsx
<div className="rounded-lg border-l-4 bg-white p-5">
  {/* ... header same as collapsed ... */}

  {/* Full body text */}
  <p className="mt-3 text-sm leading-relaxed">{body}</p>

  {/* Impacted records */}
  <div className="mt-4 rounded-lg bg-gray-50 p-3">
    <div className="text-xs font-medium">Impacted: {impacted.records} {impacted.type}</div>
    {impacted.names && (
      <div className="mt-1 text-xs text-gray-600">
        {impacted.names.join(', ')}
      </div>
    )}
  </div>

  {/* AI Reasoning (collapsible) */}
  {aiReasoning && (
    <Collapsible>
      <CollapsibleTrigger className="text-sm text-blue-600">
        Show AI Reasoning
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 rounded-lg bg-blue-50 p-3">
        <p className="text-sm">{aiReasoning}</p>
      </CollapsibleContent>
    </Collapsible>
  )}

  {/* Risk assessment */}
  <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
    <div className="flex items-center gap-2">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <span className="text-sm font-medium">Risk: {riskAssessment.level}</span>
    </div>
    <p className="mt-1 text-sm text-gray-700">{riskAssessment.description}</p>
  </div>

  {/* Recommended plan */}
  <div className="mt-4">
    <div className="text-xs font-medium text-gray-500">Recommended Plan:</div>
    <div className="mt-2 space-y-3">
      {recommendedPlan.map((action) => (
        <div key={action.step} className="flex gap-3">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-600">
            {action.step}
          </div>
          <div className="flex-1">
            <p className="text-sm">{action.description}</p>
            <div className="mt-1 flex items-center gap-2">
              <StatusBadge status={action.status} />
              {action.estimatedTime && (
                <span className="text-xs text-gray-500">~{action.estimatedTime}</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>

  {/* Action buttons */}
  <div className="mt-5 flex flex-wrap gap-2">
    <Button variant="primary" onClick={onApprove}>
      Approve & Execute
    </Button>
    <Button variant="secondary" onClick={onReview}>
      Review Each
    </Button>
    <Button variant="ghost" onClick={onAskAI}>
      <Sparkles className="mr-1 h-4 w-4" />
      Ask AI
    </Button>
    <Button variant="ghost" onClick={onDismiss}>
      Dismiss
    </Button>
  </div>

  <Button size="sm" variant="ghost" onClick={collapse} className="mt-3">
    Collapse
  </Button>
</div>
```

**Animation**:
```tsx
import { motion, AnimatePresence } from 'framer-motion';

<motion.div
  initial={{ height: 'auto' }}
  animate={{ height: isExpanded ? 'auto' : '200px' }}
  transition={{ duration: 0.3, ease: 'easeInOut' }}
>
```

---

### 2. TopBar

**Current State**: ✅ Exists but static
**Figma Design**: ✅ Adds dropdown menus, live status updates, emergency controls

**Enhancements from Figma**:
1. **Status Badge** becomes interactive dropdown
   - Click to see: Current executing actions, pause/resume controls, system health

2. **Search Bar** gets autocomplete
   - Recent queries
   - Suggested questions
   - Command shortcuts (e.g., `/deals`, `/invoices`)

3. **Notification Bell** shows preview panel
   - Last 5 notifications
   - "Mark all as read"
   - Link to full activity log

4. **Emergency Controls**
   - Pause button → Opens confirmation modal
   - Settings → Opens guardrails/policy config

**Enhanced Implementation**:
```tsx
export function TopBar() {
  const [statusOpen, setStatusOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  return (
    <div className="sticky top-0 z-50 border-b bg-white px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-medium">AI Operator</h1>

          {/* Interactive Status Badge */}
          <Popover open={statusOpen} onOpenChange={setStatusOpen}>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 hover:bg-emerald-200">
                <StatusPill status="active" />
                <span className="text-sm font-medium text-emerald-700">Active</span>
                <ChevronDown className="h-3 w-3" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <OperatorStatusDropdown />
            </PopoverContent>
          </Popover>
        </div>

        {/* Search with autocomplete */}
        <div className="relative flex-1 max-w-[576px] mx-8">
          <SearchWithAutocomplete />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm">
            <Clock className="mr-2 h-4 w-4" />
            Activity Log
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => showEmergencyStopModal()}
          >
            <Pause className="mr-2 h-4 w-4" />
            Pause
          </Button>

          {/* Notifications with preview */}
          <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
            <PopoverTrigger asChild>
              <button className="relative h-8 w-8 rounded-lg hover:bg-gray-100">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                    {unreadCount}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-96">
              <NotificationPreviewPanel />
            </PopoverContent>
          </Popover>

          <Button variant="ghost" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
```

---

### 3. StatusPill (Animated)

**Purpose**: Live animated status indicator

**Figma Design**:
- Pulsing dot for active status
- Static dot for paused
- Red dot + animation for error state

**Implementation**:
```tsx
interface StatusPillProps {
  status: 'active' | 'paused' | 'error';
}

export function StatusPill({ status }: StatusPillProps) {
  const config = {
    active: {
      bg: 'bg-emerald-500',
      animate: true,
      label: 'Active',
    },
    paused: {
      bg: 'bg-gray-400',
      animate: false,
      label: 'Paused',
    },
    error: {
      bg: 'bg-red-500',
      animate: true,
      label: 'Error',
    },
  };

  const { bg, animate } = config[status];

  return (
    <div className="relative">
      <div className={`h-2 w-2 rounded-full ${bg}`} />
      {animate && (
        <span className={`absolute inset-0 animate-ping rounded-full ${bg} opacity-75`} />
      )}
    </div>
  );
}
```

---

### 4. PriorityBadge

**Current State**: ✅ Exists
**Figma Design**: ✅ Adds pulse animation for critical items

**Enhancement**:
```tsx
<motion.div
  className={`inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium ${config.badge}`}
  animate={priority === 'critical' ? {
    boxShadow: [
      '0 0 0 0 rgba(239, 68, 68, 0.7)',
      '0 0 0 10px rgba(239, 68, 68, 0)',
    ],
  } : {}}
  transition={{ duration: 1.5, repeat: Infinity }}
>
  <Icon className="h-3.5 w-3.5" />
  {config.label}
</motion.div>
```

---

### 5. ActivityFeedRow

**Purpose**: Individual activity item in live feed

**Figma Specification**:
```tsx
interface ActivityFeedRowProps {
  type: 'executing' | 'queued' | 'completed' | 'failed';
  action: string; // e.g., "Sending email to Acme Corp"
  timestamp: Date;
  details?: {
    target?: string; // Customer name
    amount?: number; // For financial actions
    duration?: number; // Execution time in ms
  };
  error?: string; // If failed
}

export function ActivityFeedRow({ type, action, timestamp, details, error }: ActivityFeedRowProps) {
  const config = {
    executing: {
      icon: <Loader2 className="h-4 w-4 animate-spin text-blue-600" />,
      bg: 'bg-blue-50',
      border: 'border-blue-200',
    },
    queued: {
      icon: <Clock className="h-4 w-4 text-gray-500" />,
      bg: 'bg-gray-50',
      border: 'border-gray-200',
    },
    completed: {
      icon: <CheckCircle2 className="h-4 w-4 text-green-600" />,
      bg: 'bg-green-50',
      border: 'border-green-200',
    },
    failed: {
      icon: <XCircle className="h-4 w-4 text-red-600" />,
      bg: 'bg-red-50',
      border: 'border-red-200',
    },
  };

  const { icon, bg, border } = config[type];

  return (
    <div className={`flex items-start gap-3 rounded-lg border p-3 ${bg} ${border}`}>
      <div className="flex-shrink-0">{icon}</div>

      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900">{action}</p>

        {details && (
          <div className="mt-1 text-xs text-gray-600">
            {details.target && <span>Customer: {details.target}</span>}
            {details.amount && <span className="ml-2">Amount: ${details.amount}</span>}
          </div>
        )}

        {error && (
          <p className="mt-1 text-xs text-red-600">{error}</p>
        )}

        <p className="mt-1 text-xs text-gray-500">
          {formatDistanceToNow(timestamp, { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}
```

---

### 6. MetricStatTile (with Sparkline)

**Purpose**: Display key metrics with trend visualization

**Figma Specification**:
```tsx
interface MetricStatTileProps {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string; // e.g., "+12%" or "-5%"
  sparklineData?: number[]; // Historical data points
  icon?: React.ReactNode;
}

export function MetricStatTile({
  label,
  value,
  trend,
  trendValue,
  sparklineData,
  icon,
}: MetricStatTileProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500">{label}</span>
        {icon}
      </div>

      <div className="mt-2 flex items-end justify-between">
        <div>
          <div className="text-2xl font-semibold text-gray-900">{value}</div>

          {trend && trendValue && (
            <div className={`mt-1 flex items-center gap-1 text-xs ${
              trend === 'up' ? 'text-green-600' :
              trend === 'down' ? 'text-red-600' :
              'text-gray-600'
            }`}>
              {trend === 'up' && <TrendingUp className="h-3 w-3" />}
              {trend === 'down' && <TrendingDown className="h-3 w-3" />}
              <span>{trendValue}</span>
            </div>
          )}
        </div>

        {sparklineData && (
          <Sparkline
            data={sparklineData}
            width={60}
            height={24}
            color={trend === 'up' ? '#10B981' : trend === 'down' ? '#EF4444' : '#6B7280'}
          />
        )}
      </div>
    </div>
  );
}
```

---

### 7. ChatInput (Conversational)

**Purpose**: Natural language input for querying AI

**Figma Specification**:
```tsx
export function ChatInput() {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const quickQuestions = [
    "What's most urgent right now?",
    "Show me all deals over $50K",
    "Why did you send that email?",
    "Explain the cash runway issue",
  ];

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="relative">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask me anything about your business..."
          className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />

        <button className="absolute right-2 top-2 rounded p-1 hover:bg-gray-100">
          <Send className="h-4 w-4 text-gray-500" />
        </button>
      </div>

      {/* Quick questions */}
      <div className="mt-3 flex flex-wrap gap-2">
        {quickQuestions.map((q) => (
          <button
            key={q}
            onClick={() => setInput(q)}
            className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Autocomplete suggestions */}
      {suggestions.length > 0 && (
        <div className="mt-2 rounded-lg border border-gray-200 bg-white shadow-lg">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => setInput(suggestion)}
              className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

### 8. NextUpTimeline

**Purpose**: Show upcoming scheduled actions (next 2 hours)

**Figma Specification**:
```tsx
interface TimelineItem {
  id: string;
  scheduledFor: Date;
  action: string;
  type: 'email' | 'call' | 'task' | 'reminder';
  target?: string;
}

export function NextUpTimeline({ items }: { items: TimelineItem[] }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="text-sm font-medium text-gray-900">Next Up (2 hours)</h3>

      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                {getIconForType(item.type)}
              </div>
              {/* Connecting line */}
              <div className="w-0.5 flex-1 bg-gray-200" />
            </div>

            <div className="flex-1 pb-4">
              <div className="text-xs text-gray-500">
                {format(item.scheduledFor, 'h:mm a')}
              </div>
              <p className="mt-1 text-sm font-medium text-gray-900">{item.action}</p>
              {item.target && (
                <p className="mt-0.5 text-xs text-gray-600">{item.target}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <button className="mt-2 text-sm text-blue-600 hover:text-blue-700">
        View Full Calendar →
      </button>
    </div>
  );
}
```

---

### 9. InsightCard

**Purpose**: Display AI-generated learnings and patterns

**Figma Specification**:
```tsx
interface InsightCardProps {
  insight: string;
  category: 'pattern' | 'optimization' | 'warning' | 'success';
  supportingData?: string;
  actionable?: {
    label: string;
    action: () => void;
  };
}

export function InsightCard({ insight, category, supportingData, actionable }: InsightCardProps) {
  const config = {
    pattern: {
      icon: <Lightbulb className="h-5 w-5 text-amber-600" />,
      bg: 'bg-amber-50',
      border: 'border-amber-200',
    },
    optimization: {
      icon: <Zap className="h-5 w-5 text-blue-600" />,
      bg: 'bg-blue-50',
      border: 'border-blue-200',
    },
    warning: {
      icon: <AlertTriangle className="h-5 w-5 text-red-600" />,
      bg: 'bg-red-50',
      border: 'border-red-200',
    },
    success: {
      icon: <CheckCircle2 className="h-5 w-5 text-green-600" />,
      bg: 'bg-green-50',
      border: 'border-green-200',
    },
  };

  const { icon, bg, border } = config[category];

  return (
    <div className={`rounded-lg border p-4 ${bg} ${border}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">{icon}</div>

        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900">{insight}</p>

          {supportingData && (
            <p className="mt-2 text-xs text-gray-600">{supportingData}</p>
          )}

          {actionable && (
            <button
              onClick={actionable.action}
              className="mt-3 text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              {actionable.label} →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

### 10. OperatorStatusDrawer

**Purpose**: Side drawer showing detailed operator status

**Figma Specification**:
```tsx
export function OperatorStatusDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[400px]">
        <SheetHeader>
          <SheetTitle>Operator Status</SheetTitle>
          <SheetDescription>
            Currently active - Running normally
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Currently Executing */}
          <div>
            <h3 className="text-sm font-medium text-gray-900">Currently Executing</h3>
            <div className="mt-3 space-y-2">
              <ActivityFeedRow
                type="executing"
                action="Sending email to Acme Corp"
                timestamp={new Date()}
              />
              <ActivityFeedRow
                type="executing"
                action="Creating follow-up task"
                timestamp={new Date()}
              />
            </div>
          </div>

          {/* System Health */}
          <div>
            <h3 className="text-sm font-medium text-gray-900">System Health</h3>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Odoo Connection</span>
                <StatusPill status="active" />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">AI Service</span>
                <StatusPill status="active" />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Email Service</span>
                <StatusPill status="active" />
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-2">
            <Button variant="destructive" className="w-full">
              Emergency Stop
            </Button>
            <Button variant="secondary" className="w-full">
              Pause All Operations
            </Button>
            <Button variant="ghost" className="w-full">
              View Full Activity Log
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

---

### 11. EmergencyStopModal

**Purpose**: Confirmation modal for emergency stop

**Figma Specification**:
```tsx
export function EmergencyStopModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const handleEmergencyStop = async () => {
    // Call API to pause all operations
    await fetch('/api/ai-coo/emergency-stop', { method: 'POST' });
    onClose();
    toast.success('All operations paused');
  };

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Emergency Stop
          </AlertDialogTitle>
          <AlertDialogDescription>
            This will immediately pause all autonomous operations:
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
              <li>Stop all in-progress actions</li>
              <li>Cancel queued actions</li>
              <li>Prevent new actions from starting</li>
            </ul>
            <p className="mt-3 text-sm font-medium">
              You can resume operations later from the settings panel.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleEmergencyStop}
            className="bg-red-600 hover:bg-red-700"
          >
            Stop All Operations
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

---

### 12. ApprovalReviewModal

**Purpose**: Multi-action approval interface

**Figma Specification**:
```tsx
interface ApprovalReviewModalProps {
  open: boolean;
  onClose: () => void;
  actions: Array<{
    id: string;
    title: string;
    description: string;
    risk: 'low' | 'medium' | 'high';
    estimatedImpact: string;
  }>;
}

export function ApprovalReviewModal({ open, onClose, actions }: ApprovalReviewModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const handleApproveSelected = async () => {
    await Promise.all(
      Array.from(selected).map(id =>
        fetch(`/api/ai-coo/actions/${id}/approve`, { method: 'POST' })
      )
    );
    toast.success(`Approved ${selected.size} actions`);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Review Actions</DialogTitle>
          <DialogDescription>
            Select actions to approve. Each will execute independently.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[400px] space-y-3 overflow-y-auto">
          {actions.map((action) => (
            <div
              key={action.id}
              className={`rounded-lg border p-4 ${
                selected.has(action.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={selected.has(action.id)}
                  onCheckedChange={(checked) => {
                    const newSelected = new Set(selected);
                    if (checked) {
                      newSelected.add(action.id);
                    } else {
                      newSelected.delete(action.id);
                    }
                    setSelected(newSelected);
                  }}
                />

                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{action.title}</h4>
                  <p className="mt-1 text-sm text-gray-600">{action.description}</p>

                  <div className="mt-2 flex items-center gap-3 text-xs">
                    <span className={`rounded px-2 py-0.5 ${
                      action.risk === 'high' ? 'bg-red-100 text-red-700' :
                      action.risk === 'medium' ? 'bg-amber-100 text-amber-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      Risk: {action.risk}
                    </span>
                    <span className="text-gray-500">{action.estimatedImpact}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleApproveSelected}
            disabled={selected.size === 0}
          >
            Approve {selected.size > 0 && `(${selected.size})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Component Comparison: Current vs Figma

| Component | Current State | Figma Design | Upgrade Required |
|-----------|--------------|--------------|------------------|
| AIDecisionCard | ✅ Static card | ✅ Collapsible with animations | 🟡 Medium |
| TopBar | ✅ Basic | ✅ Interactive dropdowns | 🟡 Medium |
| StatusPill | ❌ Missing | ✅ Animated status indicator | 🟢 Easy |
| PriorityBadge | ✅ Static | ✅ Pulse animation | 🟢 Easy |
| ActivityFeedRow | ❌ Missing | ✅ Full specification | 🟢 Easy |
| MetricStatTile | ❌ Basic | ✅ With sparklines | 🟡 Medium |
| ChatInput | ✅ Basic | ✅ Autocomplete + suggestions | 🟡 Medium |
| NextUpTimeline | ❌ Missing | ✅ Timeline view | 🟢 Easy |
| InsightCard | ❌ Missing | ✅ Categorized insights | 🟢 Easy |
| OperatorStatusDrawer | ❌ Missing | ✅ Full drawer | 🟡 Medium |
| EmergencyStopModal | ❌ Missing | ✅ Confirmation modal | 🟢 Easy |
| ApprovalReviewModal | ❌ Missing | ✅ Multi-select interface | 🟡 Medium |

---

## Dependencies Required

```json
{
  "dependencies": {
    "framer-motion": "^11.0.0",
    "recharts": "^2.12.0",
    "date-fns": "^3.0.0",
    "@radix-ui/react-collapsible": "^1.0.3",
    "@radix-ui/react-popover": "^1.0.7",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-alert-dialog": "^1.0.5",
    "@radix-ui/react-checkbox": "^1.0.4",
    "sonner": "^1.4.0"
  }
}
```

---

## Implementation Priority

### Phase 1: Core Enhancements (1-2 days)
1. Add collapsible behavior to AIDecisionCard
2. Create StatusPill component
3. Add pulse animations to critical items
4. Create ActivityFeedRow component

### Phase 2: New Components (2-3 days)
5. Implement NextUpTimeline
6. Implement InsightCard
7. Implement MetricStatTile with sparklines
8. Enhance ChatInput with autocomplete

### Phase 3: Modals & Drawers (2-3 days)
9. Create OperatorStatusDrawer
10. Create EmergencyStopModal
11. Create ApprovalReviewModal
12. Wire up all interactive behaviors

### Phase 4: Polish (1-2 days)
13. Add all animations
14. Responsive design testing
15. Performance optimization
16. Accessibility audit

---

## Next Steps

1. ✅ Extracted all Figma design specifications
2. ⏭️ Begin Phase 1 implementation (collapsible cards + status pills)
3. ⏭️ Wire up API endpoints for new components
4. ⏭️ Add state management for modals/drawers
5. ⏭️ Progressive enhancement with animations

**Total Estimated Implementation Time**: 6-10 days

---

**Document Status**: ✅ Complete - All Figma design details extracted and documented
**Ready for Implementation**: Yes
**Wiring Deferred**: Yes (per user instruction: "we will wire it later")
