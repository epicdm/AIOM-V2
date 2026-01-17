---
tags: [validation]
summary: validation implementation decisions and patterns
relevantTo: [validation]
importance: 0.7
relatedFiles: []
usageStats:
  loaded: 43
  referenced: 4
  successfulFeatures: 4
---
# validation

### Used Zod validation at server function layer (fn/accounting.ts) rather than in data-access or React components (2026-01-16)
- **Context:** Need to validate incoming parameters before hitting Odoo API or querying database
- **Why:** Server function layer is the boundary between client and backend - validating here prevents invalid requests from reaching the data layer. Validating in hooks would duplicate code; validating in data-access is too late after HTTP parsing
- **Rejected:** Validation in React hooks or in data-access functions
- **Trade-offs:** Server functions become heavier but guarantee data-access layer always receives valid input. Makes testing data-access easier since it doesn't need to handle invalid cases
- **Breaking if changed:** Removing validation would require data-access functions to handle invalid inputs or crash on bad data. Moving validation to data-access would create duplication if data-access is called from multiple sources