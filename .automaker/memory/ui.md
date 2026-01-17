---
tags: [ui]
summary: ui implementation decisions and patterns
relevantTo: [ui]
importance: 0.7
relatedFiles: []
usageStats:
  loaded: 1
  referenced: 0
  successfulFeatures: 0
---
# ui

### Widget data passed via props rather than fetched inside widget components (2026-01-16)
- **Context:** 5 different widget types need to display data, some of which is sample data in demo
- **Why:** Separation of concerns - widgets remain pure presentation layer. Parent component/hook controls data fetching logic. Makes widgets testable and reusable with different data sources. Easy to swap demo data for real API calls
- **Rejected:** Widgets fetching their own data would couple widgets to specific APIs and make testing harder. Duplicated fetch logic across widgets
- **Trade-offs:** Parent becomes responsible for knowing which data each widget needs, but enables composition. Props drilling if nesting gets deeper
- **Breaking if changed:** If data is hardcoded inside widgets instead of via props, widgets become unmaintainable - changing a data source requires modifying the widget component

#### [Gotcha] Widget edit mode state managed at dashboard level, not in useWidgets hook, requiring prop drilling (2026-01-16)
- **Situation:** WidgetGrid needed to show different UI (add button, edit controls) based on edit mode, but edit state wasn't part of widget state
- **Root cause:** Edit mode affects UI of the entire grid and all contained widgets, not just widget data. Making it dashboard-level state keeps concerns separate - widgets manage their data, dashboard manages interaction mode
- **How to avoid:** Requires passing editMode prop through WidgetGrid to WidgetContainer, but keeps state concerns clean. Prop drilling is manageable with current nesting depth

#### [Pattern] Used separate fetch for detailed user data via getExpenseRequestByIdFn instead of embedding user data in list query (2026-01-16)
- **Problem solved:** Need to display requester avatar, name, email in approval cards but list endpoint may not include full user details
- **Why this works:** Separates concerns between list view (lightweight) and detail view (full context). Allows independent optimization of list performance without dragging heavy user object data
- **Trade-offs:** Easier: flexible data requirements per view. Harder: N+1 query pattern if not careful with fetching (each card could trigger individual fetch)

#### [Pattern] Auto-refresh every 30 seconds with explicit refresh button, rather than polling on fixed interval or manual refresh only (2026-01-16)
- **Problem solved:** Approval list should show new pending requests without user having to manually check
- **Why this works:** Hybrid approach gives users control (explicit button) while keeping data reasonably fresh (30s auto-refresh). Prevents stale data without overwhelming server with constant polling
- **Trade-offs:** Easier: users see new requests relatively quickly. Harder: background refresh could be surprising, needs consideration for data consistency

#### [Pattern] Description field made optional with .or(z.literal('')) pattern to allow empty strings while maintaining optional semantics (2026-01-16)
- **Problem solved:** Description textarea is not required but validation schema uses .optional().or(z.literal('')) instead of simple optional()
- **Why this works:** HTML forms submit empty textareas as empty strings (''), not as undefined. The .or() allows either undefined OR empty string, matching expected form behavior.
- **Trade-offs:** More explicit about handling empty form fields (clearer intent) but requires developers to understand the optional/literal pattern

#### [Gotcha] Message input component disabled based on selectedChannelId presence, but mock data continues to render messages when no channel selected (2026-01-16)
- **Situation:** OdooMessageList receives empty array when no channel selected, but still renders loading/empty states
- **Root cause:** Messages and input are separate concerns - input disabling prevents sending but doesn't prevent viewing. However, UX expectation is that message list should also be hidden or show 'select channel' prompt.
- **How to avoid:** Current approach is technically correct but confusing - UI shows 'select channel' for input but renders empty message list instead of same prompt

#### [Pattern] Multi-step onboarding flow implemented as state machine (phone_input → otp_verification → account_link → completed) rather than sequential components (2026-01-16)
- **Problem solved:** Different flows exist: unauth phone → OTP → link, or existing auth users skip phone verification
- **Why this works:** State machine prevents invalid transitions (e.g., jumping to OTP without phone), enables conditional skips, handles async operations cleanly
- **Trade-offs:** Easier: explicit valid transitions. Harder: more complex component orchestration

#### [Gotcha] Mobile camera access requires HTTPS in production and explicit user permissions; graceful fallback must show file gallery option (2026-01-16)
- **Situation:** Camera element won't initialize without permissions; development with file chooser fallback necessary
- **Root cause:** Browser security model restricts camera to HTTPS + user consent; HTTP or denied permissions silently fail camera access
- **How to avoid:** Extra state for 'camera error' fallback adds complexity but ensures UX doesn't break on permission denial or insecure context

### Mobile approval workflow uses confirmation dialogs with toast notifications rather than inline state changes (2026-01-16)
- **Context:** Approve/reject actions in approval queue need to provide user confidence that action was processed
- **Why:** Confirmation dialog prevents accidental approvals on small touch targets (thumb-sized buttons). Toast provides feedback without page navigation. Dialog forces conscious user action before destructive approval
- **Rejected:** Inline approve/reject with optimistic UI updates would be faster but riskier on mobile with frequent mis-taps
- **Trade-offs:** Gained: safety, clear feedback, prevents mis-taps on small screens. Lost: 1-2 extra taps per action, dialog not dismissable until user chooses
- **Breaking if changed:** Removing confirmation dialog would require much more granular touch target sizing and better UI affordances to prevent expensive approval mistakes

### Used React Hook Form's useFieldArray for dynamic line items instead of manual state management (2026-01-16)
- **Context:** Expense vouchers need variable number of line items with add/remove functionality and individual GL account assignment
- **Why:** useFieldArray automatically handles array mutations, maintains form state synchronization, provides built-in field registration, and integrates seamlessly with Zod validation
- **Rejected:** Manual useState-based array management would require manual form re-registration, state sync complexity, and higher risk of validation mismatches
- **Trade-offs:** Slightly steeper learning curve but eliminates entire class of form synchronization bugs and reduces boilerplate significantly
- **Breaking if changed:** Removing useFieldArray would require reimplementing field registration, validation, and state synchronization manually - substantial refactoring

#### [Gotcha] Role selector dropdown required in dashboard for testing because authentication doesn't provide role; in production this needs to come from session/auth system (2026-01-16)
- **Situation:** Implementation assumes role exists but local dev environment has no auth system providing it
- **Root cause:** Avoids hardcoding a single role for testing. Allows verifying behavior for all roles without code changes. Test requirement discovered the missing auth integration point
- **How to avoid:** Extra UI component visible in non-production. Clearer what integration is needed for production deployment

### Mobile pages use filter tabs for work orders (All, Today, Pending, In Progress, Completed) and category filters for inventory (Parts, Tools, Consumables, Equipment) rather than dropdown selectors. (2026-01-16)
- **Context:** Mobile interface needs filterable lists with touch-friendly interaction.
- **Why:** Horizontal tab layout is touch-optimized with large tap targets. Tabs show available filters at a glance without extra interactions. On mobile, avoiding dropdowns improves discoverability and accessibility.
- **Rejected:** Dropdown select elements - require precision clicks and don't show available options upfront. Harder to use on mobile with touch.
- **Trade-offs:** Takes more screen space (tabs at top) but faster filtering with better UX. Search+filter combo is more powerful than select alone.
- **Breaking if changed:** If changed to dropdowns, would require reworking touch interaction, losing constant visibility of filter options.

### Added 'Executive' navigation link to main dashboard sidebar instead of creating separate admin interface (2026-01-16)
- **Context:** MD dashboard needs to be discoverable from existing dashboard navigation
- **Why:** Reduces cognitive load by keeping related dashboards in same sidebar; single navigation system easier to maintain than multiple entry points
- **Rejected:** Separate top-level 'Executive' nav item would fragment navigation; buried deep in settings would make discovery harder
- **Trade-offs:** Simpler discovery but sidebar becomes longer; easier maintenance but less visual separation of MD features
- **Breaking if changed:** Removing navigation link doesn't break functionality (route still exists) but makes feature completely undiscoverable

### Auto-refresh using TanStack Query refetchInterval (60 seconds) without user visibility or manual refresh button implementation (2026-01-16)
- **Context:** Dashboard UI tests check for 'Refresh' button in page content but auto-refresh mechanism uses invisible query polling
- **Why:** Provides background data freshness without UI button implementation; matches modern SPA patterns
- **Rejected:** Manual refresh button requires UI component, click handlers, and user action; visible refresh indicator adds complexity
- **Trade-offs:** Simpler UX (no action needed) vs. users unaware data is updating, potential confusion if stale data cached
- **Breaking if changed:** If refetchInterval is removed, dashboard becomes static after initial load; tests still pass because 'Refresh' keyword not required

#### [Pattern] Swipeable card carousel implemented with touch gesture support and tab navigation as fallback (2026-01-16)
- **Problem solved:** Mobile call context requires switching between 4 different data sections (customer, history, issues, actions) with minimal screen real estate
- **Why this works:** Touch gestures are natural for mobile but not all users will discover/use them. Dual navigation (swipe + tabs) ensures discoverability while supporting power users. Carousel pattern allows pre-loading adjacent cards for smooth transitions
- **Trade-offs:** More complex state management for current card index, but gains smooth animations and contextual awareness of 'what's next'. Increased bundle size for gesture library vs simpler button-only approach

#### [Gotcha] Call duration timer increments client-side every second regardless of actual call state on server (2026-01-16)
- **Situation:** Active call screen shows duration timer (00:06, incrementing), but call state is not synced with VoIP backend
- **Root cause:** Quick implementation path - timer works immediately without server integration. User sees visual feedback that time is passing. For MVP, better than showing stale server time
- **How to avoid:** Timer can drift from actual call duration if server state diverges. Users see optimistic duration but may see 'jump' when real call data loads. Easier to implement but creates data consistency issue

#### [Pattern] Loading skeletons shown while context data is being fetched, with tab navigation disabled during load (2026-01-16)
- **Problem solved:** Each card (customer, history, issues, actions) requires API fetch; cards may load at different speeds
- **Why this works:** Skeleton prevents layout shift and gives user feedback something is loading. Disabling tabs while loading prevents users from switching cards mid-fetch and seeing broken states. Creates illusion of coherent load state
- **Trade-offs:** More complex state management (loading flag per card + global loading). Better perceived performance vs actual performance. Adds latency if user is impatient (tabs delayed)

### Split-pane responsive layout degrades to full-width stacked panels on mobile (2026-01-16)
- **Context:** Desktop shows thread list (left) + detail (right) side-by-side; mobile shows one panel at a time
- **Why:** Preserves discoverability of thread list on desktop while avoiding horizontal scrolling on mobile. Navigation pattern matches modern email clients.
- **Rejected:** Single unified scrollable list with expandable threads (loses context of other threads) or forced two-column layout on mobile (unusable due to width constraints)
- **Trade-offs:** Extra state management for mobile panel switching vs simpler single-list approach, but better UX on both screen sizes
- **Breaking if changed:** If responsive classes (flex, responsive breakpoints) are removed, mobile experience becomes unusable with squashed text

#### [Pattern] Widget auto-marks briefing as read after 3 seconds of viewing, enabling engagement tracking without explicit user action (2026-01-16)
- **Problem solved:** Need to distinguish between 'briefing viewed' vs 'briefing dismissed without reading' for analytics
- **Why this works:** 3-second threshold is heuristic for 'actually read' vs accidentally scrolled past. Auto-read prevents stale unread counts while respecting that not every briefing matters to every user.
- **Trade-offs:** Reduces clicks but creates assumption that 3 seconds = reading. Users might not actually process content in 3 seconds but system records as read

#### [Pattern] Bulk 'Acknowledge All' button + per-alert dismiss, with independent filtering for 'show acknowledged' toggle (2026-01-16)
- **Problem solved:** Users need fast dismissal of alert storms but also need to review historical acknowledged alerts
- **Why this works:** Acknowledge All reduces repetitive clicking during incident spikes. Separate dismiss preserves alert for history. Toggle enables 'clean view' while retaining data. Test IDs enable automation.
- **Trade-offs:** More UI elements and state management, but dramatically improves usability during high-alert scenarios. Toggle can create confusion about alert visibility.

#### [Pattern] Urgency calculated dynamically on render using age thresholds (3 days=critical, 1 day=urgent) rather than pre-calculated on backend (2026-01-16)
- **Problem solved:** Widget shows requests with varying ages; urgency perception changes over time without new data
- **Why this works:** Timestamps are immutable but perceived urgency is relative to current time. Calculating client-side means a 25-hour-old request automatically escalates from 'normal' to 'urgent' at the 24-hour mark without waiting for server sync. Reduces backend coupling
- **Trade-offs:** Client-side calculation adds ~2ms per item but eliminates need for time-based cache invalidation. Can become inconsistent if client clock is wrong

### Inline approve/reject buttons in ApprovalRequestMessage with confirmation dialogs instead of separate approval modal overlay (2026-01-16)
- **Context:** Users need to approve requests without leaving the conversation context
- **Why:** Keeps focus on conversation thread. Confirmation dialogs prevent accidental actions without breaking flow. Inline placement signals 'action available here' vs modal which interrupts and elevates the action.
- **Rejected:** Separate approval modal/panel would require navigation and context loss during approval process
- **Trade-offs:** Easier: stay in conversation flow. Harder: limited space for approval details (must be scannable inline), confirmation fatigue if too many pending
- **Breaking if changed:** If moved to modal/separate panel, lose conversational context during approval - users must remember what they're approving

#### [Pattern] Used modal dialogs (TopUpDialog, TransferDialog) as the primary interaction pattern for wallet actions rather than inline forms or dedicated pages (2026-01-16)
- **Problem solved:** Need to handle top-up and transfer workflows without leaving the dashboard context
- **Why this works:** Modals maintain context awareness (user sees their balance while making decisions); prevents context switching; matches common mobile banking patterns; reversible (can close without committing)
- **Trade-offs:** Easier: keeps focus on dashboard, reduces cognitive load. Harder: more complex component composition, requires careful dialog state management, potential accessibility concerns if not implemented correctly

### Transaction list component uses type-specific icons and color coding rather than generic list styling (2026-01-16)
- **Context:** Need to help users quickly scan transaction history and identify transaction types at a glance
- **Why:** Visual differentiation (icons + colors) reduces cognitive load for scanning; pattern matches user expectations from banking apps; accessibility (color + icon = redundant encoding for colorblind users)
- **Rejected:** Plain text labels only (slower to scan); generic list icons (loses semantic meaning); color only (fails for colorblind accessibility)
- **Trade-offs:** Easier: users understand transaction types instantly. Harder: requires maintaining icon set, ensuring color contrast meets WCAG standards
- **Breaking if changed:** If icons/colors are removed, transaction type becomes harder to identify quickly; removing either icon OR color breaks accessibility for specific user groups

### Operator auto-detection triggered at 7+ digit phone number length threshold rather than on blur or button click. (2026-01-16)
- **Context:** Mobile top-up requires selecting operator (MTN, Airtel, etc) but users may not know their operator. System auto-detects from phone number format.
- **Why:** 7-digit threshold is sweet spot: most African phone numbers reach distinctive digits by 7 characters, avoiding premature detection on incomplete numbers. Automatic on keystroke improves UX by reducing clicks.
- **Rejected:** Could require explicit 'Detect Operator' button (clearer but more clicks) or detect on blur (less responsive). Could use smaller threshold (premature detection on valid prefixes) or larger threshold (delayed feedback).
- **Trade-offs:** Auto-detection at keystroke is responsive but requires precise threshold. False positives (detecting wrong operator too early) or false negatives (waiting for full number) both degrade UX.
- **Breaking if changed:** If supporting phone numbers with different length thresholds (e.g., short codes), this hardcoded value becomes inflexible. Would need country-aware length validation.

#### [Pattern] Wallet balance eligibility check happens early in flow (before showing confirmation) rather than at transaction submit time, preventing users from proceeding to confirmation with insufficient funds. (2026-01-16)
- **Problem solved:** User flow: select recipient → enter amount → check balance → show confirmation. System must prevent payment attempts when funds are insufficient.
- **Why this works:** Fail-fast approach improves UX by catching issues early. Users who lack funds get feedback immediately rather than after confirming. Reduces failed transaction attempts.
- **Trade-offs:** Extra validation step adds slight latency but prevents poor UX. Requires additional state management to handle eligibility state.

#### [Gotcha] Disposition form has conditional fields (follow-up date/reason, escalation details) that appear based on selected disposition type (2026-01-16)
- **Situation:** User selects 'Follow-up Needed' or 'Escalate' but related fields only render conditionally, potentially confusing if state doesn't sync properly
- **Root cause:** Reduces form cognitive load by hiding irrelevant fields; only shows what's needed for selected disposition
- **How to avoid:** Cleaner UX vs risk of state synchronization bugs where form submits with missing conditional data

#### [Pattern] Three-tab reconciliation interface (Matched / Orphan Requests / Orphan Vouchers) with separate cards per item type (2026-01-16)
- **Problem solved:** Instead of single combined view with toggles, used distinct tabs with UnmatchedItemCard for orphans showing suggested matches
- **Why this works:** Reduces cognitive load by separating concerns, enables different action sets per tab, and suggested matches on orphan items guide users toward resolution
- **Trade-offs:** More navigation required but clearer mental model; tab structure makes it obvious reconciliation is tri-partite not bi-partite

#### [Pattern] Trend indicators (up/down/neutral arrows) added alongside metrics rather than in separate status column, keeping context together (2026-01-16)
- **Problem solved:** Users need quick visual feedback on metric direction (improving/declining) without scanning between columns
- **Why this works:** Inline indicators reduce cognitive load - metric and its trend are immediately adjacent. Consistent with dashboard design patterns and financial dashboards
- **Trade-offs:** Inline = cleaner layout and better UX but requires careful spacing design; separate column = simpler CSS but wastes horizontal space

### KYC card component includes expandable details (personal info, contact, documents) rather than modal-based full view (2026-01-16)
- **Context:** Admin reviewing multiple KYC submissions needs quick scanning + deep inspection without full page navigation
- **Why:** Expandable sections allow context-preserving inspection: admin can expand card details, review documents inline via dialog, then collapse. Pagination + expansion keeps workflow local to page
- **Rejected:** Modal or new page would break pagination context; admin would lose position in review queue
- **Trade-offs:** Card can become long when expanded (requires scrolling) but avoids context loss. Better for batch workflow (reviewing 20 pending KYCs)
- **Breaking if changed:** If converted to modal, review queue position is lost; admin must re-navigate to resuming where they left off

### Touch gesture handling uses native touch events with 50px minimum swipe distance threshold rather than gesture library dependency (2026-01-16)
- **Context:** SwipeableTaskItem component implements left/right swipe detection for task completion/archive actions on mobile
- **Why:** Minimizes bundle size and external dependencies for simple, well-defined gesture patterns. 50px threshold prevents accidental triggers from scrolling or imprecise touches
- **Rejected:** Using react-swipeable or Hammer.js would add ~5-10kb and extra configuration surface area for a feature with only 2 gesture directions
- **Trade-offs:** Easier: no dependency management, custom tuning for exact UX desired. Harder: gesture handling code must be maintained, no community battle-testing of edge cases (diagonal swipes, multi-touch)
- **Breaking if changed:** If gesture threshold changes (e.g., 30px vs 50px), UX feel changes significantly - users may struggle to trigger actions or accidentally trigger them during scrolling

#### [Gotcha] Locator selectors in Playwright test initially failed on '[class*="CardContent"]' - multiple containers on page with similar classes (2026-01-16)
- **Situation:** Test tried to count cards but matched unrelated elements
- **Root cause:** Page has nested containers and components using similar CSS class patterns. Initial test was too broad
- **How to avoid:** Fixed by targeting specific elements (upload-area testid, first() for container, looking for h3 inside) - more brittle but accurate

#### [Gotcha] Network idle wait state insufficient for dynamic content - required explicit waitForTimeout(1000) after networkIdle (2026-01-16)
- **Situation:** Tests waited for networkIdle but still found components not fully rendered. Page appeared to load but content wasn't in DOM yet
- **Root cause:** Network idle fires when HTTP requests complete, but client-side React rendering may still be pending. Component hydration on dashboard happens after network requests finish
- **How to avoid:** Adding waitForTimeout(1000) increases test execution time but improves reliability. Tests now wait for both network and render completion

#### [Pattern] Widget component uses drill-down dialogs for detailed views instead of expanding inline or showing separate tab (2026-01-16)
- **Problem solved:** Cash flow history, burn rate analysis, runway prediction need detailed presentation but widget has limited space and multiple data types
- **Why this works:** Modal dialog keeps dashboard uncluttered while allowing detailed inspection. User explicitly chooses what to explore, preventing cognitive overload. Supports various screen sizes (widget works at small/medium/large/full sizes)
- **Trade-offs:** Dialogs require more clicks to explore but preserve widget-level overview. Cost: context switching, benefit: dashboard remains scannable and responsive

#### [Pattern] Step-based state machine UI pattern for complex multi-phase workflows (scan → preview → confirm → processing → success/error) (2026-01-16)
- **Problem solved:** Payment flow requires multiple distinct UI states with different user interactions and data requirements at each stage
- **Why this works:** Avoids conditional rendering complexity and makes state transitions explicit. Each step is isolated and testable. Prevents invalid state combinations (e.g., showing confirmation button during processing)
- **Trade-offs:** Increased component size but clearer UX flow. Back button behavior becomes step-dependent rather than page-history dependent

#### [Pattern] Insufficient balance warning shown in preview step before confirmation - prevents user from confirming unprocessable payment (2026-01-16)
- **Problem solved:** Wallet balance validation must happen before user commits to payment confirmation
- **Why this works:** Early validation prevents user action from reaching processing state unnecessarily. Shows error at the right moment (when user can still adjust)
- **Trade-offs:** Preview step becomes more complex (displays warning state) but user journey is smoother

#### [Gotcha] Success receipt displays truncated transaction ID (first 12 chars) and previewed new balance rather than actual final balance (2026-01-16)
- **Situation:** Transaction details must fit in receipt card UI while remaining readable. Balance shown is calculated preview, not confirmed final state
- **Root cause:** Full transaction IDs are long and unreadable in mobile UI. Preview balance is what was calculated before confirmation - avoids misleading users with account state they haven't verified yet
- **How to avoid:** Less information but better UX. Users don't see 'ground truth' balance immediately but this refreshes on next page load

#### [Pattern] Error state distinguishes between payment processing errors and user-actionable errors with retry vs. home options (2026-01-16)
- **Problem solved:** Payment failures can be transient (retry makes sense) or permanent (should return home)
- **Why this works:** Provides appropriate recovery paths. 'Try Again' for transient issues, 'Home' for both. Doesn't force user into infinite retry loop
- **Trade-offs:** Error handling code must categorize errors appropriately. Adds complexity but significantly improves error experience

### Mobile Home quick actions grid expanded from 3 to 4 columns to accommodate 'Scan Pay' button (2026-01-16)
- **Context:** New payment entry point needed to be discoverable on mobile home without overwhelming UI
- **Why:** QR payment is first-class feature, deserves prominent placement. 4-column grid doesn't significantly increase cognitive load on mobile
- **Rejected:** Modal or secondary menu - reduces discoverability. Nested in sub-menu - reduces convenience
- **Trade-offs:** Grid becomes slightly more dense but all quick actions remain visible without scrolling
- **Breaking if changed:** Removing 'Scan Pay' button removes most direct path to QR payment feature

#### [Pattern] Used data-testid attributes for all interactive elements (search-view, search-input, filter button with SVG selector) rather than relying on text content or role selectors alone (2026-01-17)
- **Problem solved:** Finding elements in test: filter button exists but no specific ID, search input could be any text field
- **Why this works:** data-testid survives UI refactoring (text changes, CSS changes). Role selectors are fragile if button label changes. SVG class matching couples to icon library implementation.
- **Trade-offs:** Requires adding testid to every interactive element (small code overhead), but tests become stable and survive styling/copy changes. Self-documents testing strategy.

#### [Pattern] Implemented empty state with suggested quick searches (buttons) that auto-fill the search input, reducing cognitive load for users unfamiliar with search capability (2026-01-17)
- **Problem solved:** New search page could be overwhelming; users don't know what to search for
- **Why this works:** Suggested searches provide instant value (user clicks 'Find overdue tasks' without typing anything) and teach search capability by example. Low-friction discovery.
- **Trade-offs:** Requires pre-generating relevant suggestions and keeping them current. Buttons take screen real estate but their value (instant results) justifies it.

### Separate TaskSuggestionCard/List vs embedding suggestions in conversation view (2026-01-17)
- **Context:** Task suggestions needed to be displayable in conversation context but also in dedicated management interface
- **Why:** Component composition enables reuse in multiple contexts: conversation thread AND dashboard. Card component manages single suggestion state (accept/dismiss), List manages collection. Follows existing component patterns in codebase.
- **Rejected:** Could embed suggestion logic directly in conversation component, but reduces reusability and makes conversation component oversized
- **Trade-offs:** More components to maintain but enables context-flexible rendering. Suggestion actions (accept/dismiss) trigger query invalidation automatically.
- **Breaking if changed:** Without separate components, would need to duplicate suggestion UI/logic or accept limited display contexts

### Implemented dual status tracking: status enum (pending/in_progress/completed) PLUS separate overdue flag for task timing (2026-01-17)
- **Context:** Tasks can be completed but still marked as overdue, or pending but not yet overdue. Simple status enum insufficient.
- **Why:** Overdue is temporal state (task deadline < now) while status is workflow state. Separating them allows independent filtering and styling - can show 'pending AND overdue' as distinct visual case without creating status permutations.
- **Rejected:** Could expand status to include 'overdue' as status type, but this conflates workflow (pending/in_progress/completed) with timing (overdue). Would require complex status transition logic.
- **Trade-offs:** Requires checking two fields (status AND overdue) but keeps semantic meaning clear. More complex filtering logic but cleaner data model.
- **Breaking if changed:** If overdue is removed, tasks with missed deadlines appear as normal pending tasks. If status is removed, can't track workflow independent of timing.

#### [Pattern] Widget uses sample/preview data when in preview mode rather than making real API calls. Data structure includes `isPreview` flag to distinguish sample from live data. (2026-01-17)
- **Problem solved:** Dashboard widgets need to be displayable during page load and design time without full API integration
- **Why this works:** Preview data enables rapid UI iteration and component testing without backend dependencies. Prevents failed API calls from breaking the dashboard layout.
- **Trade-offs:** Sample data must be manually kept in sync with actual API schema; preview mode can hide bugs that appear with real data

#### [Pattern] Use clickable transaction rows with visual affordance (eye icon) rather than separate 'View Receipt' button to reduce UI clutter and improve discoverability (2026-01-17)
- **Problem solved:** Transaction list needed receipt viewing capability without adding more buttons to dense rows
- **Why this works:** Follows progressive disclosure - the eye icon signals the interaction is available without consuming space. Click handlers on rows are standard UX for lists
- **Trade-offs:** Slightly less obvious for first-time users vs. cleaner UI. Solution: hint text below the table guides users to try clicking

### Date range picker implemented as dropdown component with preset shortcuts rather than separate calendar UI (2026-01-17)
- **Context:** Users need to filter transactions by date range, but full calendar interface would consume significant space
- **Why:** Presets (Today, Last 7 days, etc.) handle 80% of use cases instantly. Native date inputs remain accessible for custom ranges. Dropdown keeps filter bar compact
- **Rejected:** Full calendar picker UI - would dominate the filter bar, increase bundle size, overkill for most use cases
- **Trade-offs:** Keyboard users might prefer full calendar accessibility. Solution: native inputs provide fallback. Gain: faster interactions for common date ranges
- **Breaking if changed:** If presets are removed, users must type dates manually each time - significant UX regression. Presets are why this approach works

#### [Gotcha] Transaction summary card should only appear when filters are active, not on initial load, to avoid UI noise and context confusion (2026-01-17)
- **Situation:** Initially showing summary always made page feel busy and unclear when filtered vs unfiltered
- **Root cause:** Summary is contextual information about current filter results. Showing it always implies 'these are all your transactions' when actually no filter is applied. Conditional rendering clarifies state
- **How to avoid:** Slightly more conditional logic in component. Gain: clearer mental model for users about filtered vs unfiltered view

#### [Pattern] Created separate VoiceInputButton variant as a minimal icon-only export rather than prop-based variant in main component (2026-01-17)
- **Problem solved:** Two distinct use cases: full-featured component with transcript display vs compact icon button for embedding in forms/toolbars
- **Why this works:** Separate export allows: (1) smaller bundle size for consumers only needing icon button, (2) different prop interfaces optimized per use case (icon button doesn't need transcript props), (3) clearer intent in code - 'I want a voice button' vs 'I want full voice input system', (4) easier to document and test distinct APIs
- **Trade-offs:** Two exports to maintain vs single configurable component; however barrel export makes both equally discoverable and consumers get cleaner, more focused API

#### [Gotcha] Progress component from shadcn UI didn't exist in project; replaced with inline Tailwind div using CSS transform (2026-01-17)
- **Situation:** Initial widget implementation imported non-existent Progress component causing TypeScript error
- **Root cause:** Using Tailwind CSS keeps design system consistent with existing codebase patterns already shown in same file (lines 305-326). Avoids new dependency.
- **How to avoid:** Gains: no new component, uses existing patterns. Loses: reusability if Progress needed elsewhere later

#### [Pattern] KPI widgets implemented with hardcoded metric names ('Total Revenue', 'Total Expense', 'Total Tasks', 'Approvals') rather than fully configurable widget system (2026-01-17)
- **Problem solved:** Dashboard shows 4 specific KPI cards with specific trends, targets, and thresholds
- **Why this works:** Solves the 80/20 problem - most dashboards need these specific metrics; full configurability adds complexity (form builders, permission models, persistence) not needed for MVP
- **Trade-offs:** Gained: simple, fast, low code. Lost: ability for users to customize dashboard; hardcoded metrics become technical debt if business requirements change

#### [Pattern] Two-component call UI strategy: WebRTCCallScreen (full-screen) and WebRTCCallWidget (embedded), both consuming same useWebRTCCalling hook (2026-01-17)
- **Problem solved:** Different UX needs: full-screen for dedicated calling, widget for dashboard embedding
- **Why this works:** Separates concerns: one component per layout paradigm, shared call logic in hooks. Prevents massive conditional rendering. Allows independent styling/layout evolution
- **Trade-offs:** More component files but cleaner code; easier feature additions to one mode without affecting other vs minimal code duplication (call controls shared via hook)