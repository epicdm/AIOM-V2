---
tags: [patterns]
summary: patterns implementation decisions and patterns
relevantTo: [patterns]
importance: 0.7
relatedFiles: []
usageStats:
  loaded: 64
  referenced: 3
  successfulFeatures: 3
---
# patterns

#### [Pattern] Escalation levels that multiply threshold over time (escalationLevel tracks how many times threshold passed) vs fixed escalation points (2026-01-16)
- **Problem solved:** Severely overdue vouchers need increasing urgency but linear threshold system could trigger too frequently
- **Why this works:** Multiplier approach (2x, 3x, 4x base threshold) naturally increases escalation urgency over time without hardcoding specific day counts; flexible for different voucher types
- **Trade-offs:** More sophisticated logic vs easier to understand fixed thresholds; adapts to any configured baseline

#### [Pattern] Separate notification builders (buildReceiptPendingNotification, buildEscalationNotification) rather than template system (2026-01-16)
- **Problem solved:** Multiple alert types with significantly different content, formatting, and action handlers
- **Why this works:** Each alert type has different business logic and urgency; separate builders allow type-safe logic per alert without generic template system overhead
- **Trade-offs:** More code duplication vs clearer type safety and easier to understand per-alert logic