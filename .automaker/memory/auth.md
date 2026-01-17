---
tags: [auth]
summary: auth implementation decisions and patterns
relevantTo: [auth]
importance: 0.7
relatedFiles: []
usageStats:
  loaded: 4
  referenced: 3
  successfulFeatures: 3
---
# auth

#### [Gotcha] GoogleAuth import must be safely destructured after async import resolution, not in the import statement itself (2026-01-16)
- **Situation:** Initial implementation tried to use destructuring in the `.catch()` return type: `await import().catch(() => null) as { GoogleAuth?: ... }` which fails because the type assertion doesn't guarantee the property exists
- **Root cause:** Dynamic imports can fail or return unexpected shapes. Must import the module first, then safely check for the property before destructuring. The root cause is mixing runtime uncertainty (dynamic import) with compile-time type assertions
- **How to avoid:** Extra variable assignment (googleAuthModule) adds one line of code but prevents runtime errors. More defensive than trusting TypeScript's type system alone

### Token refresh triggered at 5-minute threshold before expiration with 1-minute check interval, not at expiration or arbitrary intervals (2026-01-16)
- **Context:** Mobile auth tokens need refresh without interrupting user experience or causing cascading failures
- **Why:** 5-minute buffer prevents race conditions where token expires between validation check and API call. 1-minute interval balances background work with responsiveness. Threshold-based (not event-based) avoids complex event listeners and works offline.
- **Rejected:** Event-driven refresh on each request (adds latency per request), exponential backoff (unpredictable timing), refresh-on-expiration (too late, causes 401 errors)
- **Trade-offs:** Predictable background load vs memory cost of interval; slightly stale tokens vs eliminated race conditions; works offline vs no network-aware optimization
- **Breaking if changed:** Changing threshold below 2 minutes causes excessive refresh attempts; removing interval causes token expiration mid-session

#### [Pattern] Device ID generation uses timestamp + random substring (device_${Date.now()}_${Math.random()}) rather than hardware-based identifiers (2026-01-16)
- **Problem solved:** Mobile devices need persistent identification for biometric association and session tracking, but browser environment has limited hardware access
- **Why this works:** Avoids fingerprinting API complexity (canvas, WebGL) and privacy concerns. Timestamp ensures uniqueness across devices, random string prevents sequential ID enumeration. Simple, reproducible in tests.
- **Trade-offs:** Weak device identification vs simpler code; loses persistence across browser clear vs no privacy issues; works in incognito vs device not truly unique

### Biometric re-authentication required after 24 hours of inactivity, checked at token validation not at UI entry (2026-01-16)
- **Context:** Balance security (force re-auth) with UX (don't interrupt at random moments). Better Auth integration needed.
- **Why:** 24-hour threshold matches industry standard (banks, payment apps). Validation-point checking (not timer-based) avoids spurious prompts when user inactive anyway. Aligns with token refresh logic.
- **Rejected:** Timestamp-only (no biometric check), shorter intervals like 1 hour (excessive prompts), activity tracking (complex state management)
- **Trade-offs:** Users see re-auth request when they return after 24h vs no interruption during active use; predictable security checkpoint vs no sliding expiration
- **Breaking if changed:** Removing 24h threshold eliminates session lifetime control; moving check to UI entry causes premature prompts; losing inactivity logic allows session fixation

#### [Pattern] WebAuthn biometric auth uses platform authenticators (Secure Enclave/TEE) not resident keys, requiring user interaction each time (2026-01-16)
- **Problem solved:** Biometric authentication for mobile needs to balance convenience (stored credentials) with security (hardware-backed storage)
- **Why this works:** Platform authenticators are guaranteed on iOS/Android, don't require server-side credential storage, backed by hardware security. User interaction prevents silent token theft. Standards-compliant (FIDO2).
- **Trade-offs:** One tap per auth vs seamless experience; no server-side credential sync needed vs limited to user's device; hardware-backed security vs slower UX

#### [Pattern] Implemented backwards-compatible decryption with plaintext fallback (2026-01-16)
- **Problem solved:** Database may contain legacy plaintext SIP passwords from before encryption was implemented. System must not break existing records.
- **Why this works:** Encrypted data has JSON structure with 'iv' and 'ciphertext' fields. Plaintext passwords don't match this format. Fallback detection avoids migration complexity.
- **Trade-offs:** Adds complexity to decryption logic but enables zero-downtime deployment. Legacy plaintext remains unencrypted in database until naturally replaced.

#### [Pattern] Role passed through React context (useWidgets hook) rather than fetched per-component or stored globally (2026-01-16)
- **Problem solved:** Multiple components (WidgetGrid, dashboard page, widget picker) need access to current user's role
- **Why this works:** Avoids prop drilling. Single source of truth via hook. Role changes trigger re-render of all components using the hook. Enables role selector to update all consumers simultaneously
- **Trade-offs:** Hook pattern is simpler than stores but less powerful. Works well for single role value; would need context provider pattern if many role-related values

#### [Gotcha] better-auth client returns {data: {user: ...}} structure, not direct session object. Naive null checks on session object fail. (2026-01-16)
- **Situation:** Session check `if (!session)` passed but accessing `session.user.role` threw 'Cannot read properties of undefined' because session was {data: null}
- **Root cause:** better-auth SDK returns a wrapper object with data property, not the session directly. Client-side getSession() has different structure than server-side.
- **How to avoid:** More verbose null checking (check both sessionResult and sessionResult.data) catches all edge cases but adds boilerplate

### Role-based middleware (assertSalesMiddleware) with three permitted roles (sales, admin, md) instead of binary auth check (2026-01-16)
- **Context:** Sales dashboard requires specific roles rather than just checking if user is authenticated
- **Why:** Aligns with organizational structure where MD and admin should also access sales data; more flexible than single-role gate
- **Rejected:** Single role ('sales' only) would exclude admin/MD oversight; universal auth would not enforce sales domain separation
- **Trade-offs:** More granular permission control vs. added complexity if role system needs audit logging or dynamic permission changes
- **Breaking if changed:** If 'md' or 'admin' roles are removed from codebase, those users lose dashboard access silently; no error handling exists

### Post-call screen requires authenticated context; unauthenticated users see 'Sign in' message in test assertions (2026-01-16)
- **Context:** Post-call workflow is sensitive (records customer sentiment, disposition decisions) and should only be accessible to authenticated agents
- **Why:** Disposition and task data should never be created by unauthenticated users; authentication gate prevents unauthorized access to call context
- **Rejected:** Public access to post-call screen would expose call details and allow unauthorized sentiment recording
- **Trade-offs:** Requires authentication on every page load vs open access; test assertions accept both authenticated form and sign-in redirect as valid states
- **Breaking if changed:** If authentication middleware is removed, users could access other users' calls and modify their dispositions

### Tenant context stored in async context (Context API) rather than request headers or URL parameters (2026-01-17)
- **Context:** Tenant information needed across nested function calls in server functions without passing through every function signature
- **Why:** Avoids 'prop drilling' of tenant data. Enables transparent tenant scoping in deeply nested data access functions. Matches Hattip/TanStack patterns for context propagation
- **Rejected:** Request headers (loses context in async operations); URL parameters (tightly couples routing); function parameters (creates maintenance burden)
- **Trade-offs:** Context is implicit (harder to trace data flow statically) but dramatically cleaner API. Requires understanding async context semantics
- **Breaking if changed:** Moving away from context would require threading tenantId through entire call stack, making functions verbose and error-prone