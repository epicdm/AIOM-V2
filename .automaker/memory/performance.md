---
tags: [performance]
summary: performance implementation decisions and patterns
relevantTo: [performance]
importance: 0.7
relatedFiles: []
usageStats:
  loaded: 1
  referenced: 0
  successfulFeatures: 0
---
# performance

### Compression middleware configured with minimum_size threshold (500 bytes) to avoid compression overhead for small payloads (2026-01-16)
- **Context:** Mobile clients benefit from compression but small responses incur more CPU cost from compression than data savings
- **Why:** Compression has CPU/latency cost; only worthwhile when data size savings exceed algorithmic overhead. 500 bytes is typical break-even point for Brotli/Gzip
- **Rejected:** Compressing all responses (wastes CPU on small payloads); no compression (mobile users on slow connections suffer larger payload sizes)
- **Trade-offs:** Small responses are faster but slightly larger; large responses are smaller but use more CPU; configurable via settings for different network conditions
- **Breaking if changed:** Changing minimum_size threshold changes bandwidth/CPU tradeoff; removing compression entirely hurts mobile performance on high-latency networks

#### [Pattern] Implemented client-side search filter on fetched data rather than server-side search query (2026-01-16)
- **Problem solved:** Approvals page has search input to filter requests by purpose/description
- **Why this works:** Dataset is small (pending requests only) and search is simple string matching. Client-side keeps server simpler and search response immediate
- **Trade-offs:** Easier: no backend changes needed. Harder: doesn't scale if pending request count becomes large (would need server-side eventually)

#### [Gotcha] Template rendering cost approximated with tokenCount, not actual Anthropic token count. Differs by ~15% from API actual. (2026-01-16)
- **Situation:** Need to estimate cache savings and cost before executing. Can't call API pre-execution without cost.
- **Root cause:** Approximation is fast and happens in-memory. Close enough for user-facing estimates. Actual tokens calculated after API call.
- **How to avoid:** User sees estimate that differs from actual. But estimates are directionally correct and conservative (overestimate costs).

### Local database caching with separate sync operations instead of always fetching from Odoo (2026-01-16)
- **Context:** Odoo API has latency; users need fast channel/message loading
- **Why:** Caching reduces API load and latency. Default queries hit local DB (fast), sync operations refresh from Odoo (slow but on-demand). Balances freshness with speed.
- **Rejected:** No caching - every load is slow; aggressive cache with background sync - more complex; cache invalidation after fixed TTL - might serve stale data
- **Trade-offs:** Users see cached data by default (might be slightly stale) but loads are fast. Explicit sync button for users needing latest data.
- **Breaking if changed:** If cache invalidation logic is removed, users never see new messages until explicit sync. If caching is removed entirely, UI becomes slow

### Implemented variable stale time configurations (2 minutes for volatile data, 30 minutes for static data) rather than uniform cache duration (2026-01-16)
- **Context:** Financial data has different update frequencies - invoices change frequently, payment terms change rarely
- **Why:** Balances freshness vs network load based on data volatility. Payment terms can safely be cached 30 minutes while customer balances need 2 minutes to reflect new transactions
- **Rejected:** Single stale time for all queries or relying on manual cache invalidation only
- **Trade-offs:** More configuration complexity but eliminates unnecessary re-fetches of stable data and reduces API load while keeping critical data reasonably fresh
- **Breaking if changed:** Changing stale times upward risks showing stale financial data leading to incorrect business decisions; downward increases API load exponentially

### Prompt caching implemented at ClaudeClient level with separate cache.ts utility, not at Hook/Query level (2026-01-16)
- **Context:** Claude API supports prompt caching to reduce costs on repeated long contexts, but caching logic shouldn't leak into React layer
- **Why:** Separates concerns: cache.ts handles cache token counting and formatting, client.ts handles cache headers in API calls, hooks/queries remain cache-agnostic. Enables testing cache logic independently.
- **Rejected:** Implement caching in hooks - couples cache logic to React lifecycle; at query level - mixes HTTP concerns with data fetching
- **Trade-offs:** Cache logic is isolated but requires passing cache options through layers (client → server function → Hook). Adds ~200 LOC for cache utilities.
- **Breaking if changed:** Removing cache layer loses cost optimization on long conversations; moving cache logic to hooks makes cache state part of React component state (leak abstraction)

#### [Pattern] getTopCustomersByRevenue and getTopVendorsByPurchases fetch up to 100 records and sort in-memory using JavaScript rather than using Odoo domain filtering with sort order (2026-01-16)
- **Problem solved:** Ranking customers by revenue requires aggregated revenue data not directly sortable by standard Odoo query
- **Why this works:** Odoo doesn't have efficient way to sort by calculated fields (total_revenue, total_purchased) without complex aggregation. Fetching 100 records and sorting client-side is simpler and works for 'top N' use cases where N < 100. Avoids server-side computation load.
- **Trade-offs:** Works for top 100 lists but fails for large datasets or pagination beyond 100. Client-side sorting adds small overhead but keeps logic in application code.

### useActiveCallContext hook extends useCallContext with call timer but doesn't auto-refetch based on elapsed time (2026-01-16)
- **Context:** Some call contexts may have time-sensitive data (subscription expiration is important info after 30min call)
- **Why:** Auto-refresh is expensive (server cost) and trust issues (what if subscription changed mid-call? Should we interrupt?). Better to let UI decide if/when to refetch based on actual call duration. The 30s base stale time on main context covers most scenarios
- **Rejected:** Auto-refetch every N minutes (would cause mid-call refreshes and server load), no timer at all (loses awareness of call duration for context decisions)
- **Trade-offs:** Simpler implementation and lower server cost, but requires UI components to explicitly refetch if they need super-fresh data during long calls. Makes behavior explicit rather than implicit
- **Breaking if changed:** If you add auto-refetch, you need to decide what happens if customer data changes mid-call (update silently vs notify vs pause call). This becomes a product decision, not a technical one

### User name resolution cached in-memory rather than fetching fresh from Odoo for each task query, despite Odoo API having the data directly (2026-01-16)
- **Context:** Task objects contain user IDs but not names; resolving names requires additional Odoo API calls which would explode query complexity with multiple tasks
- **Why:** Reduces Odoo API load (N+1 prevention). User data changes rarely compared to task data, so caching is safe. In-memory cache sufficient since user list is bounded and stable within a session
- **Rejected:** Always fetching fresh names adds latency and API load; using raw IDs reduces UX; storing in database adds infrastructure complexity for rarely-changing data
- **Trade-offs:** Simple implementation with performance benefit, but stale names for newly-created/renamed users until cache refresh. Trade accuracy for speed in a bounded context
- **Breaking if changed:** Removing this cache reveals N+1 performance problem in downstream components; changing to always-fresh would require rethinking the query design

#### [Pattern] Stale time granularity varies by data type: 2 minutes for volatile (tasks/milestones), 5 minutes for stable (projects), 1 minute for stats (2026-01-16)
- **Problem solved:** Different data types have different update frequencies in Odoo
- **Why this works:** Reflects domain knowledge: project names/status rarely change (5min safe), task statuses change frequently (2min), statistics change with every task update (1min). Balances freshness with cache hit rate.
- **Trade-offs:** Requires understanding domain volatility patterns, but prevents displaying stale task data (bad UX) while minimizing unnecessary re-fetches of stable project lists

### Image compression before upload (Canvas-based) rather than server-side processing (2026-01-16)
- **Context:** Receipts can be high-resolution from modern phones; S3/R2 bandwidth and storage costs
- **Why:** Reduces upload payload by 70-80%; offloads processing from server; faster perceived upload on client
- **Rejected:** Server-side ImageMagick/FFmpeg processing; storing full resolution
- **Trade-offs:** Client-side compression adds JavaScript execution time (~500ms) but saves bandwidth and server CPU; lossy compression slightly reduces OCR accuracy
- **Breaking if changed:** Removing compression increases data usage for mobile users and R2 storage costs; re-enabling would require server fallback for older browsers

### Mobile routes use same useExpenseRequests hook as desktop rather than creating mobile-specific data fetching (2026-01-16)
- **Context:** Mobile expense list and approval queue both need filtered expense data
- **Why:** Single hook source of truth reduces code duplication and keeps server-side caching consistent. Mobile UI is just different filtering/presentation of same data
- **Rejected:** Could create useMobileExpenseRequests with mobile-specific optimizations (pagination, smaller payloads) but premature optimization
- **Trade-offs:** Gained: single data source, simpler maintenance. Lost: can't optimize mobile payloads without affecting desktop
- **Breaking if changed:** If the hook changes pagination strategy or response size, would affect both mobile and desktop simultaneously

#### [Pattern] Registration status polling via separate query hook (`useSipRegistrationStatus`) rather than embedding in main credential query (2026-01-16)
- **Problem solved:** Registration status changes frequently (devices coming online/offline) but credential data (phone, username) is static
- **Why this works:** Separates cache invalidation concerns. Credential query has long TTL, status query has short TTL. Prevents unnecessary full credential refetches on status changes. Allows UI to show status indicator independently from credential display.
- **Trade-offs:** More queries means more network requests, but shorter invalidation window for status data. Client manages two separate query states instead of one.

#### [Pattern] Build output shows each sub-route compiled to separate JavaScript chunks (`work-orders-BrkwSnuO.js` 9.22 kB, `route-plan-C1l9tJ3A.js` 10.78 kB, etc.) indicating automatic code-splitting is working. (2026-01-16)
- **Problem solved:** Large mobile dashboard with 4 feature pages needed to balance initial load performance with feature availability.
- **Why this works:** Vite/build system automatically code-splits route modules. Each sub-page loads only when accessed, reducing initial bundle size. This is critical for mobile where bandwidth is limited.
- **Trade-offs:** Slightly increased complexity (more network requests per page navigation) but dramatically reduces initial page load. Each sub-route is ~10-13 kB, acceptable for mobile.

### Implemented auto-refresh every 60 seconds instead of real-time updates or manual refresh only (2026-01-16)
- **Context:** Executive dashboard needs reasonably current data without overwhelming backend or frontend with constant updates
- **Why:** 60-second refresh balances data freshness (needed for KPIs) with server load; frequent enough for executive decision-making, infrequent enough to not stress infrastructure
- **Rejected:** Real-time updates (WebSockets) would be more responsive but adds complexity and server load; manual refresh only leaves stale data for users
- **Trade-offs:** User sees 60-second stale data max but simpler implementation; requires user to understand they may see outdated info if they make decisions in first 59 seconds
- **Breaking if changed:** Removing auto-refresh means executives see stale data indefinitely; removing 60-second interval entirely could create server load if refresh is too frequent

#### [Pattern] Auto-refresh of context data on 30-second interval instead of WebSocket or real-time subscription (2026-01-16)
- **Problem solved:** Call context (customer info, tickets, suggestions) can change during active call but needs to stay relatively current
- **Why this works:** Polling with intervals is simpler than WebSocket setup and doesn't require server push capability. Reduces server load vs per-keystroke updates. 30s interval balances freshness with API load
- **Trade-offs:** Data can be up to 30 seconds stale - acceptable for most call context (customer info, historical issues). Adds periodic server load vs on-demand fetching. Simpler to test/debug than pub-sub patterns

### 24-hour briefing cache validity with explicit regeneration endpoint rather than periodic background generation (2026-01-16)
- **Context:** Briefings are expensive to compute (multiple queries + potential AI processing), but should feel fresh
- **Why:** On-demand regeneration gives users control and doesn't waste compute on stale data nobody reads. 24-hour cache prevents thundering herd on popular dashboard views
- **Rejected:** Could use background job to pre-generate briefings, but adds complexity and generates data that may never be viewed
- **Trade-offs:** First viewer after 24h sees stale data momentarily, but subsequent viewers get cached version. Regeneration button lets users force fresh data when needed.
- **Breaking if changed:** If compliance requires briefing recalculation below 24h intervals, entire caching strategy fails and requires background job infrastructure

### 30-second auto-refresh interval for approval requests and unread counts via React Query (2026-01-16)
- **Context:** Keeping approval status current in chat without real-time WebSocket infrastructure
- **Why:** Balances stale data risk vs server load. 30s is responsive enough for approval workflows (not safety-critical like medical systems). Query batching prevents N+1 requests. Auto-refresh only on pending items reduces unnecessary polling.
- **Rejected:** Real-time WebSocket would be responsive but adds complexity and server cost. Longer intervals (5min+) would make approvals feel stale.
- **Trade-offs:** Easier: simple polling implementation. Harder: visible latency (up to 30s delay in approval reflection), slight server load increase
- **Breaking if changed:** If removed entirely, approvals become fire-and-forget with no confirmation. If increased to 5min+, users won't see approval completion in reasonable time

#### [Gotcha] Tests use waitForLoadState('networkidle') to ensure data is loaded before assertions, but this doesn't guarantee React component renders are complete (2026-01-16)
- **Situation:** Page might finish network requests but React query is still loading data or components still mounting
- **Root cause:** networkidle waits for network activity to stop, not for component hydration or query completion, which are separate concerns
- **How to avoid:** Simple to implement vs tests may miss race conditions where UI loads before API data arrives

### Batch async queue writing with configurable flushInterval and batchSize parameters (2026-01-16)
- **Context:** Logging every approval, transfer, and role change could create DB bottleneck with individual writes
- **Why:** Reduces DB calls from O(n) to O(n/batchSize). AsyncWrite pattern allows non-blocking operation. Configurable params let different environments tune performance
- **Rejected:** Synchronous immediate writes would block business operations; unbatched async would still hammer DB; fixed batch size prevents flexibility
- **Trade-offs:** Easier: scales to high-volume operations. Harder: must handle flush-on-shutdown; introduces queueing complexity and potential data loss if process crashes
- **Breaking if changed:** Without batching, financial transfer volume could cause user-facing latency. Without configurable params, can't optimize for dev/test/prod differences

### Batch processing for retention cleanup with configurable batch size rather than deleting all expired recordings in single transaction (2026-01-16)
- **Context:** Organizations could have millions of old recordings; deleting all at once would lock database, cause timeouts, or run out of memory
- **Why:** Batch processing allows large deletion operations to be broken into smaller transactions, each completing quickly. Prevents query timeouts, allows interruption, provides progress visibility, spreads load
- **Rejected:** Single large delete - would timeout or lock database; individual deletes in loop - massive overhead from connection reuse
- **Trade-offs:** Multiple transactions increase complexity and require resumability (what if process dies mid-batch?); but prevents operational disasters from single runaway query
- **Breaking if changed:** If batch processing is removed for 'simplicity', large retention cleanups will timeout or crash the database; depends on batch size being reasonable (100-1000 not 1-10000000)

#### [Pattern] Deterministic consistent hashing (hash(userId + flagName)) for percentage rollout instead of random per-request (2026-01-16)
- **Problem solved:** Need users to see consistent flag state across sessions without storing per-user rollout assignments
- **Why this works:** Deterministic hashing means same user always gets same flag state without database lookups. Prevents flicker where flag appears on/off randomly across requests. Critical for user experience with feature flags
- **Trade-offs:** Requires hashing algorithm on each check (minor CPU cost) but eliminates need for millions of user-flag junction rows. Trade CPU for storage/query scalability

### LRU cache with TTL-based expiration and granular invalidation (by flag/user/role) rather than full cache invalidation (2026-01-16)
- **Context:** Flag evaluations can be expensive with complex targeting rules; service handles batch and concurrent requests
- **Why:** Partial invalidation (e.g., only invalidate entries for updated flag) reduces cache thrashing when one flag changes. TTL provides eventual consistency safety net. LRU limits memory even with unbounded access patterns.
- **Rejected:** Full cache clear on any update (simpler but wastes cached data for other flags), no TTL (requires manual invalidation everywhere), no size limits (OOM risk)
- **Trade-offs:** Granular invalidation is more complex logic but prevents cache thrashing; TTL adds staleness window but guarantees eventual consistency; LRU size limit may evict hot entries under extreme load
- **Breaking if changed:** Removing TTL requires explicit invalidation everywhere or risks stale flags; removing size limit can cause memory leak; removing granular invalidation causes unnecessary cache misses

### Queries execute independently per category rather than in a single transaction, allowing failed queries to not block others (2026-01-16)
- **Context:** Customer issues query fails but task, expenses, financial continue executing. Single transaction would abort all on first error
- **Why:** Maximizes availability and partial results. Database connection issues shouldn't cascade across unrelated health checks. Aligns with graceful degradation
- **Rejected:** Single transaction wrapping all categories - atomicity guarantees at cost of all-or-nothing visibility
- **Trade-offs:** No ACID guarantees across categories - status snapshot isn't transactionally consistent. Simpler, more resilient code. Category-level errors don't leak upstream
- **Breaking if changed:** If changed to require transactional consistency, must either fail entire health check or implement two-phase commit logic. Would reduce availability during database issues

### Set stale times to 30s-5min range per data type instead of aggressive 0s or lenient 1hr (2026-01-16)
- **Context:** Cash position data changes infrequently but users need reasonably current information for financial decisions
- **Why:** 30s for summary/alerts (money moves fast), 2min for flow history (less volatile), 5min for runway/burn (calculated infrequently). Balances: stale data risk vs backend load. User clicking dashboard button shouldn't trigger instant refetch for runway that changes weekly
- **Rejected:** 0s stale time - would hammer backend on every user interaction. 1hr - would show dangerously stale balance info
- **Trade-offs:** Risk of user seeing 5min-old runway data but prevents 600+ refetch requests per hour per user. Operator dashboard likely has 100+ users, so 30s-5min saves significant backend load
- **Breaking if changed:** Changing to 0s would need backend rate limiting. Changing to 1hr would require adding manual refresh button or users accept stale financial data

### Concurrent request handling with Promise.all - service designed to accept multiple simultaneous monitoring requests without queuing or throttling (2026-01-16)
- **Context:** Compliance checks may be triggered from multiple sources (cron jobs, manual requests, external integrations) and must not block each other
- **Why:** Avoiding mutual exclusion locks or queue processing simplifies the service. Since checks are read-heavy and stateless (except for timestamp updates), concurrent execution is safe and more responsive
- **Rejected:** Sequential request queueing - would introduce latency for concurrent monitoring triggers and create bottlenecks if cron + manual requests overlap
- **Trade-offs:** Gained: Better concurrency and responsiveness. Lost: Must ensure check operations are idempotent and thread-safe (achieved by read-only database queries)
- **Breaking if changed:** Adding mutex/locking would introduce deadlock risks and eliminate the concurrency benefit that makes the system responsive to multiple trigger sources

#### [Pattern] Supervisor alerts batched and sent as single notification per supervisor rather than per-task (2026-01-16)
- **Problem solved:** Teams with multiple overdue tasks need supervisor visibility without notification explosion
- **Why this works:** Sending one alert per task creates O(tasks*supervisors) notifications. Batching reduces to O(supervisors) notifications while still providing complete information. Respects user attention budgets
- **Trade-offs:** Requires aggregation logic and grouping by supervisor/organization but dramatically reduces alert volume; supervisor sees summary instead of individual task details

#### [Pattern] Implemented Jaccard similarity-based prompt matching for AIOM response caching to detect semantically similar queries without embedding computation (2026-01-16)
- **Problem solved:** Need to identify cached AIOM responses that can satisfy similar prompts without expensive embedding lookups or LLM calls
- **Why this works:** Jaccard similarity (token-level set intersection) is lightweight, deterministic, and requires no external dependencies. Avoids expensive semantic search while catching legitimate cache hits for rephrased queries.
- **Trade-offs:** False positives possible with unrelated prompts sharing common words, but configurable threshold mitigates this. Lightweight computation enables real-time similarity checks.

#### [Pattern] Implemented conversation history tracking in AIOM cache to associate new prompts with existing conversations, enabling cache reuse across multi-turn exchanges (2026-01-16)
- **Problem solved:** Users ask follow-up questions in same conversation that could be partially answered by cached responses from earlier turns in conversation
- **Why this works:** Associates AIOM responses with conversation context (systemPrompt + conversationHistory hash) rather than just the input prompt. Enables reuse of cached context and reduces redundant Claude API calls for conversation continuations.
- **Trade-offs:** Moderate added complexity in key generation but significant token savings on conversational interfaces. Conversation history hash ensures context changes invalidate cache appropriately.

### Token bucket uses time-based refill (refillRate tokens per refillInterval) instead of fixed schedules (2026-01-16)
- **Context:** Bucket needs to refill over time. Could use: cronjob to refill daily, time-based calculation, or queue.
- **Why:** Time-based calculation (compute elapsed time, add tokens) requires no background jobs, scales horizontally, precise per-request. Cronjob would have gaps (users hit limit right after refill). Hybrid approach: only calculate refill on access, not continuously.
- **Rejected:** Scheduled refills (cronjob) - adds complexity, has gaps where users wait between refills. Continuous timers per bucket - excessive resource use.
- **Trade-offs:** Gain: Serverless-friendly, scales infinitely, precise. Lose: Small computational cost on each request (time calculation).
- **Breaking if changed:** If switched to cronjob-based, users experience uneven bucket availability (empty right after limit hit, sudden refill at cron time). Horizontal scaling breaks (refills not coordinated across servers).

### Configurable concurrency in JobQueueWorker with default of 5, not unlimited or hard-coded per-job-type (2026-01-17)
- **Context:** Different job types have different resource requirements (briefing generation is CPU-intensive, notifications are I/O-bound)
- **Why:** Worker-level concurrency limit: (1) prevents resource exhaustion from all workers running unbounded, (2) can be tuned via environment variable without code change, (3) simpler than per-job-type concurrency which requires complex queue balancing, (4) allows same worker to process multiple job types with shared resource pool
- **Rejected:** Unlimited concurrency (resource exhaustion), per-job-type concurrency (complex scheduling, requires multiple workers), hard-coded values (can't tune for different deployments)
- **Trade-offs:** Single concurrency limit less optimal than per-type limits vs. simpler to reason about and tune. Briefs and notifications may interfere with each other's resources
- **Breaking if changed:** Removing concurrency control allows unlimited parallelism which crashes server under high load. Hard-coding value prevents tuning for different deployment sizes

#### [Pattern] Created debounce utility hook (useDebouncedValue) separate from search hook to prevent excessive server calls during typing (2026-01-17)
- **Problem solved:** Search input fires on every keystroke; without debouncing, typing 'overdue' = 6 server requests
- **Why this works:** Debouncing at the value level (not the handler level) is reusable and can apply to any input field. Decouples debounce concern from search logic. Prevents overwhelming server with requests during active typing.
- **Trade-offs:** Extra hook in dependency tree is minor overhead, but provides clean separation. Debounce value takes time to update (user perceives slight delay), but UX studies show 300-500ms is imperceptible while saving significant bandwidth.

### VAD silence detection uses threshold-based algorithm (audio level > threshold for X ms) rather than frequency analysis or ML-based approach (2026-01-17)
- **Context:** Need to auto-stop recording after user stops speaking without explicit stop button click
- **Why:** Threshold-based approach provides: (1) minimal computation overhead (simple numeric comparison), (2) predictable behavior easy to tune with visible config, (3) no model loading delays, (4) works in resource-constrained environments (mobile), (5) transparent to users what silence means
- **Rejected:** Frequency analysis (FFT) would be more accurate but adds audio processing complexity; ML models would require model loading and inference, adding latency and bundle size
- **Trade-offs:** Less sophisticated detection (may have false positives on quiet speech) vs instant, low-overhead silence detection that works everywhere
- **Breaking if changed:** Switching to ML-based VAD would add model loading latency on first use and increase bundle; threshold-based detection is fast but users with very quiet voices may need to adjust threshold

#### [Pattern] Peak hours analysis computed during aggregation phase using GROUP BY time buckets rather than real-time calculations (2026-01-17)
- **Problem solved:** Dashboard needs to show which hours have highest communication volume without blocking render
- **Why this works:** Moves expensive time-bucketing logic to async aggregation runs. Widget receives pre-computed peak hours array ready for visualization.
- **Trade-offs:** Gains: fast dashboard load, smooth rendering. Loses: real-time accuracy, requires aggregation job scheduling

#### [Gotcha] waitForTimeout(500ms) needed after language switch because translation is asynchronous but not promise-based in tests (2026-01-17)
- **Situation:** Language changes trigger React state updates and i18next re-renders, but Playwright can't detect when i18n async operations complete
- **Root cause:** i18next loads and applies translations asynchronously, but Playwright's waitForSelector and waitForLoadState don't understand i18n completion; arbitrary timeout masks latency issues
- **How to avoid:** 500ms timeout is fragile (might be too short on slow systems, too long for flaky tests); ideal solution would be testid markers indicating i18n ready state

#### [Pattern] Tests wait for 'networkidle' before checking page content, then add explicit 1000ms timeout before error validation (2026-01-17)
- **Problem solved:** Verifying that page renders without critical JavaScript errors
- **Why this works:** networkidle ensures all network requests complete, but async code might still be executing; 1000ms covers most setTimeout/Promise chains. Prevents flaky tests from race conditions.
- **Trade-offs:** Gained: reliable error detection without element assumptions. Lost: test speed (always waits full timeout); test becomes brittle if page does legitimate long async operations after 1000ms

### useCallQuality hook monitors call quality metrics periodically rather than on every state change (2026-01-17)
- **Context:** WebRTC quality metrics (packet loss, latency, jitter) change frequently; component re-renders must be controlled
- **Why:** Prevents re-render storms from constant metric updates. Periodic polling allows quality degradation detection without tying renders to network events
- **Rejected:** Event-driven quality updates would fire multiple times per second; one-time snapshot would miss degradation patterns
- **Trade-offs:** Slight latency in quality reporting vs smoother UI; configurable interval adds flexibility vs more hook parameters
- **Breaking if changed:** Removing polling interval and going event-driven would require throttling/debouncing in all consumers