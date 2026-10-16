---
type: Audit
title: Holistic Codebase & Architecture Review (2026-10-16)
description: Comprehensive multi-dimensional review of the rebalancing-engine repository covering ADR/PRD/roadmap adherence, domain math integrity, live agent & API architecture, frontend/persona alignment, documentation hygiene, and test coverage.
tags: [audit, review, architecture, security, testing, documentation, adr, prd]
timestamp: 2026-10-16T08:30:00Z
---

# Holistic Codebase & Architecture Review

**Date:** 2026-10-16  
**Scope:** Full-repository assessment across `src/`, `web/`, `tests/`, `docs/`, and root configuration (`v0.9.0`, Iteration 107).

---

## 1. Executive Summary

`rebalancing-engine` has evolved from an offline deterministic TypeScript calculation core into a feature-rich, multi-tenant autonomous portfolio rebalancing platform comprising:
- **Deterministic Core (`src/core/`, `src/strategy/`, `src/optimizer/`)**: Valuation, drift calculation, threshold/calendar/manual/tax-aware strategies, execution overlays (TLH, UK Bed-and-Breakfasting, exclusions, concentration caps), corporate actions (splits, dividends, mergers), and a projected gradient descent risk optimizer.
- **Stateful Live Agent & Persistence (`src/orchestrator/`, `src/db/`, `src/broker/`, `src/services/`)**: Embedded `better-sqlite3` multi-tenant store, Alpaca REST + WebSocket streaming adapters, throttled model fan-out batch worker, EOD reconciliation, market calendar guards, and recurring mandate scheduler.
- **API & Command Center UI (`src/api/`, `web/`)**: Express 5 REST API with SSE telemetry, JWT + B2B `sk_live_` authentication, and a React 19 / Tailwind v4 persona-routed dashboard.

### Overall Scorecard

| Dimension | Rating | Summary |
| :--- | :--- | :--- |
| **Core Math & Domain Design** | **B+** | Strong pure-function architecture and `decimal.js` foundation, but several newer overlays/corporate-action paths leak native JS floats or double-count cash dividends. |
| **ADR, PRD & Roadmap Adherence** | **B-** | High velocity across 66 ADRs and 107 iterations, but several accepted ADRs (e.g., ADR-0040, ADR-0063, ADR-0064, ADR-0065) have implementation drift where wiring is incomplete in live/SQLite paths. |
| **Live Agent, DB & API Security** | **C+** | Critical bugs in SQLite policy persistence, plaintext user password storage on creation, seeded Superadmin role mismatch, missing RBAC on queue/subscription routes, and calendar scheduler premature date advancement. |
| **Frontend & Persona Alignment** | **B-** | Clean persona layout separation (`SharedWorkspaceLayout`), but suffers from frontend-backend contract mismatches (`ConcentrationLimit` casing, `?accountId` query filter, unreachable `AssetUniverseTab`) and 2s polling vs. rate-limiter friction. |
| **Documentation Hygiene** | **B** | Exemplary OKF structure and ADR templates, but foundational docs (`README.md`, `DEPLOYMENT.md`, `docs/architecture/overview.md`, `docs/guides/`) still describe the engine as an "offline-only" v2.0 MVP with unsigned Base64 JWTs. |
| **Test Coverage & Quality** | **B** | 46 backend suites (342 tests) with ~90%+ line coverage in `core`/`strategy`/`optimizer`, but missing read-after-write and cross-component lifecycle assertions masked critical persistence/scheduler bugs, and `web/` has only 2 smoke tests. |

---

## 2. Adherence to ADRs, PRDs, and Roadmap

### 2.1 Implementation Drift Against Accepted ADRs
1. **ADR-0064 (`0064-automated-recurring-mandate-scheduler.md`) — Premature Date Advancement Breaks Calendar Triggers & Per-Request Instantiation**:
   - **Premature Date Mutation (`src/orchestrator/scheduler.ts:132-149` vs. `src/strategy/calendar.ts:20-22`)**: When `MandateSchedulerService.scanAndEnqueue()` detects `evalDate >= nextDate`, it enqueues the portfolio into `EvaluationQueue` (`line 135`) and **immediately** advances `policy.calendar.nextRebalanceDate` to the next period in SQLite (`line 147`). When `Orchestrator.onTick` or `BatchEvaluationWorker.processNextBatch` subsequently dequeues and evaluates that portfolio, `CalendarRebalanceStrategy.evaluateTrigger` checks `evalDate >= nextRebalanceDate`, sees the future date, and returns `shouldRebalance: false` (`CALENDAR_NOT_DUE`). Scheduled calendar rebalances never execute.
   - **Ephemeral Instantiation (`src/api/server.ts:284-302`)**: `GET /api/admin/scheduler/status` and `POST /api/admin/scheduler/scan` instantiate a brand-new `new MandateSchedulerService(stateManager)` per HTTP request and never call `.start()`. Thus `GET /api/admin/scheduler/status` always reports `isRunning: false` and resets scan counters on every request.
2. **ADR-0058, ADR-0061, & ADR-0065 (`0065-adopt-mandate-archetypes-and-quality-evaluation-pipeline.md`) — Async Evaluation Pipeline Skips Quality Indicators & Friction Models**:
   - Synchronous `evaluateRebalance` (`src/core/evaluation.ts:174-230`) runs `input.indicators` (`DriftReductionIndicator`, `ConcentrationLimitIndicator`, etc.) and `input.frictionModel`.
   - However, `evaluateRebalanceAsync` (`src/core/evaluation.ts:294-382`)—used by both `Orchestrator.onTick` (`src/orchestrator/loop.ts:122`) and `BatchEvaluationWorker.processNextBatch` (`src/orchestrator/batch-evaluator.ts:178`)—initializes `const qualityResults = [];` at `line 346` and **never executes `input.indicators` or populates `qualityResults`, `preTradeMetrics`, `postTradeMetrics`, or `utilityTranslation`**.
   - Furthermore, `BatchEvaluationWorker.processNextBatch` (`src/orchestrator/batch-evaluator.ts:178-185`) does not pass `frictionModel` or `indicators` into `evaluateRebalanceAsync`.
3. **ADR-0063 (`0063-tax-advantaged-account-wrappers.md`) — `PUT /api/portfolios/:id/policy` Does Not Persist to SQLite**:
   - In `src/api/routes/portfolios.ts:328-367`, `PUT /api/portfolios/:id/policy` calls `const state = stateManager.getAccountState(accountId)` (which constructs a detached in-memory object from SQLite rows), mutates `state.policy`, `state.portfolioState.taxJurisdiction`, and `state.portfolioState.taxWrapper` on that transient object, and returns `res.json(...)` **without ever writing back to SQLite**. All policy, jurisdiction, and wrapper updates via this endpoint are lost immediately.
4. **ADR-0040 (`0040-use-pause-strategy-for-reconciliation.md`) — `hasOpenOrders()` Is Never Called**:
   - ADR-0040 requires the Orchestrator loop to query `brokerAdapter.hasOpenOrders(context, accountId)` before evaluating a portfolio and pause if orders are open. While `hasOpenOrders` is implemented in `AlpacaBrokerAdapter` (`src/broker/alpaca-broker.ts:136`), it is never called in `src/orchestrator/loop.ts` or anywhere else in `src/`.
5. **ADR-0046 (`0046-use-size-based-rotation-and-simulation-reset.md`) vs. ADR-0055 (`0055-continuous-broker-state-sync.md`) — Simulation State Reset Leaked Into Live Mode**:
   - In `src/cli/agent.ts:98-107`, the dry-run simulation state reset (`stateManager.updatePortfolio(accountId, postState)`) is also executed inside the `if (isLive)` branch right after `broker.executeTrades(...)`, overwriting live portfolio state with simulated state prior to webhook fill reconciliation (and wiping out SQLite `TaxLots` because `simulatePostTrade` strips `taxLots`).
6. **ADR-0050 & Iteration 82 (`DynamicOptimizerService`) — `validateModelMandate` Rejects Optimizer Archetypes & `Models` Table Lacks `universe`**:
   - `DynamicOptimizerService` (`src/optimizer/index.ts:27-85`) optimizes `MinimumVariance` and `EfficientFrontier` models using `model.universe`. However, `validateModelMandate` (`src/api/server.ts:421-424`) rejects any model/mandate whose archetype is not `'Threshold'`, `'Calendar'`, or `'Hybrid'`, and the SQLite `Models` table (`src/db/sqlite.ts:45-55`) has no `universe` column.

### 2.2 ADR Registry & Status Hygiene
- **Missing ADRs in `BUILD_JOURNEY.md`**: `BUILD_JOURNEY.md:89-90` skips directly from `ADR-0052` to `ADR-0058`, omitting **ADR-0053, ADR-0054, ADR-0055, ADR-0056, and ADR-0057** (which exist in `docs/decisions/` and `docs/decisions/index.md`). `BUILD_JOURNEY.md:20` also states `64 ADRs` instead of `66 ADRs`.
- **Inaccurate ADR-0050 Entry in `BUILD_JOURNEY.md:87`**: Describes ADR-0050 as *"Establish baseline for async dynamic targeting capabilities (VaR, EF) via B2B broker API"*, whereas `docs/decisions/0050-use-b2b-broker-api.md` is actually *"Use B2B Broker API for Execution"* (replacing the Alpaca SDK with native `fetch` against `/v1/trading/accounts/{account_id}/orders`).
- **Phantom `ADR-0085` References**: `docs/decisions/0060-corporate-actions-processor.md:17` and `docs/decisions/0061-model-fan-out-queue-worker.md:17` reference `ADR-0085` (confusing Iteration 85 with an ADR number).
- **Superseded ADRs Still Marked `Accepted`**:
  - `ADR-0017` (Explicit calendar dates only) → superseded by `ADR-0064` (recurring frequency advancement).
  - `ADR-0025` (Defer production surfaces) → superseded by `ADR-0041`, `ADR-0045`, `ADR-0049`, `ADR-0050`.
  - `ADR-0031` (Expand due schedules as `SETTLED`) → explicitly superseded by `ADR-0036` (`PENDING` projection-only).
  - `ADR-0032` (Monthly/Quarterly/Annual only) → superseded by `ADR-0034` (`WEEKLY` added).
  - `ADR-0039` & `ADR-0046` (JSONL `FileAuditStorage`) → superseded in Iteration 67 by `SqliteAuditStorage` (`AuditTrails` table).
  - `ADR-0048` (In-memory `MultiPortfolioStateManager`) → superseded by `ADR-0049` (`SqliteStateManager`).
  - `ADR-0053` (Defer API rate limiting) → partially superseded in Iteration 60 (`express-rate-limit` added to `src/api/server.ts:31-39`).
  - `ADR-0054` (Hardcoded 5 bps slippage) → superseded by `ADR-0056` (`policy.assumedSlippageBps`).

### 2.3 PRD & Roadmap Alignment
- **Completed Roadmaps & PRDs**: All four tranches of `docs/roadmap/rebalancing-engine-roadmap.md` and the core requirements of the Cash Flows, Tax Lots, Next-Iteration Strategy, and Execution Overlays (TLH) PRDs are implemented.
- **Unimplemented Policy Field (`depositAllocationMode`)**: Defined in `src/models/domain.ts:174, 216`, rendered in `web/src/components/MandateBuilderForm.tsx:29, 195`, and listed in `src/api/openapi.ts`, but never read or applied anywhere in `src/core/` or `src/strategy/`.
- **Undocumented PRD Supersession (`docs/prd/scheduled-recurring-cash-flow-prd.md:38, 73-80`)**: Still specifies that due scheduled flows expand into `SETTLED` events deployed into trades, without a banner noting that `ADR-0036` changed this to `PENDING` (projection-only).
- **Stale Plan Statuses**: `docs/roadmap/v3-exploration.md:11`, `docs/plans/live-agent-v3-mvp-plan.md:12`, `docs/plans/mandates-and-overlays-plan.md:12`, and `docs/plans/tranche-5-ux-optimization-plan.md:23-55` still carry `DRAFT` headers or unchecked `[ ]` boxes for tranches completed in Iterations 34–78.

---

## 3. Code Quality, Domain Integrity, and Architecture Assessment

### 3.1 Core Domain & Financial Integrity (`src/core/`, `src/strategy/`, `src/optimizer/`)
1. **[CRITICAL] Cash Dividends Double-Counted in `applyCorporateActionToPortfolio` + `calculateValuation`**:
   - In `src/core/corporate-actions.ts:120-139`, applying a `DIVIDEND` or `CASH_DIVIDEND` adds `dividendTotal` directly to `portfolio.cash` (`line 121`) **and** appends a `CashFlowRecord` with `direction: 'DEPOSIT'` and `status: 'SETTLED'` (`lines 123-130, 138`).
   - When `calculateValuation` (`src/core/valuation.ts:80-82, 222-242`) evaluates the resulting `PortfolioState`, `summarizeCashFlows(state.cash, state.cashFlows)` adds all `SETTLED` deposits to `state.cash` (`availableCash = startingCash + netSettledCashFlow`). As a result, every cash dividend is counted **twice** in `availableCash` and `totalValue`.
2. **[CRITICAL] `simulatePostTrade` Strips Portfolio Metadata & Tax Lots (`src/core/simulation.ts:97-106`)**:
   - `simulatePostTrade` constructs `postTradeState` with only `{ accountId, asOf, baseCurrency, cash, holdings: simulatedHoldings }`, dropping `taxLots` from every holding and omitting `tenantId`, `modelId`, `taxJurisdiction`, `taxWrapper`, `washSaleRecords`, `realizedCapitalGainsYTD`, and `circuitBreakerStatus`.
   - Also contains a leftover `console.log(\`Debug trade: ...\`)` at `src/core/simulation.ts:58`.
3. **[HIGH] Corporate Action `SPLIT` and `MERGER` Rounding & Lot ID Collisions (`src/core/corporate-actions.ts:84-97, 150-186`)**:
   - `newHoldingQuantity` and individual `taxLots[i].quantity` are rounded independently with `roundQuantity(...)` (8 decimal places). Under non-terminating split/merger ratios (e.g., `1-for-3` reverse split across 3 lots), the sum of rounded lot quantities differs from `newHoldingQuantity` by `~1e-8 > CALCULATION_EPSILON (1e-10)`, causing `validateHoldingTaxLots` (`src/core/valuation.ts:123-127`) to throw `Tax lot quantities do not sum to holding quantity`.
   - In `MERGER` (`lines 171-186`), merging into an existing target holding concatenates `targetHolding.taxLots` and `convertedTaxLots` without deduplicating `lotId`s, risking `Duplicate tax lot ID` errors (`src/core/valuation.ts:109-111`).
4. **[HIGH] Native Floating-Point Leaks Violating `ADR-0023` (`decimal.js` Policy)**:
   - `src/core/overlays.ts:36, 64, 66, 90, 119-120` (`OpportunisticLossHarvestingOverlay`): Uses native float `*` and `/` without `roundQuantity`/`roundMoney`, does not update `proposal.estimatedPostTradeCash` when appending harvest SELL/BUY pairs, and does not check if multiple harvested lots + existing drift SELLs exceed total holding quantity.
   - `src/core/overlays.ts:403-405` (`HoldingConcentrationCapOverlay`): Computes `newQty = roundQuantity(excessValue / price)` and `newEstimatedVal = roundMoney(excessValue)` independently instead of `roundMoney(toDecimal(newQty).times(price))`, which can fail `simulatePostTrade` validation (`src/core/simulation.ts:54-62`).
   - `src/core/oracle-adapter.ts:129, 325-335`: Uses native float `*`, `+=`, and `-=` in `calculatePostTradeCash`, risking `SIMULATION_EPSILON` cash reconciliation failures.
   - Additional minor float operations exist in `src/core/drift.ts:43, 82`, `src/core/trades.ts:184-186, 281`, `src/core/quality.ts:54-64, 79-85`, and `src/core/friction.ts:25`.

### 3.2 Live Agent, Database & REST API (`src/orchestrator/`, `src/db/`, `src/api/`)
1. **[CRITICAL] Broken User Password Hashing & Broken Seeded Superadmin Login**:
   - **Plaintext Passwords on User Creation (`src/api/server.ts:275-278, 364-390`)**: Both `POST /api/admin/users` and `POST /api/users` pass the raw plaintext `password` directly to `stateManager.createUser(...)` without `bcrypt.hashSync(password, 10)`. Because `POST /api/auth/login` (`line 159`) verifies via `bcrypt.compareSync(password, user.password)`, no user created through the API or UI can ever log in.
   - **Seeded Superadmin Role Mismatch (`src/db/sqlite.ts:272-280` vs. `src/api/server.ts:125, 134, 141, 173, 198`)**: `sqlite.ts` seeds `user-superadmin` (`admin@localhost`) with `role = 'Superadmin'` and `tenantId = 'tenant-baseline'`. However, `server.ts` checks `req.userRole === 'Admin' && req.tenantId === superadminTenantId` (`'tenant-superadmin'`). Logging in as `admin@localhost` yields `isSuperadmin: false` and `403 Forbidden` on both `requireSuperadmin` and `requireAdmin` routes!
2. **[CRITICAL] `SqliteStateManager.getStatesFilteredByTenant` Drops `cashBuffer` and `cashFlows` (`src/orchestrator/sqlite-state.ts:655-739`)**:
   - Omits `cashBuffer` from `SELECT` and constructs `targetAllocation: { targets }` without `cashBuffer`. When `GET /api/portfolios` calls `evaluateRebalance` (`src/api/routes/portfolios.ts:181`), any portfolio with a non-zero `cashBuffer` fails `validateTargetAllocation` (sum != `1.0`), is caught by a silent `catch (_e)` block (`line 192`), and displays `driftStatus: 'not_evaluated'` and zero weights.
3. **[CRITICAL] SQLite `NOT NULL` Crash When Persisting `CashFlows` (`src/db/sqlite.ts:134` vs. `src/orchestrator/sqlite-state.ts:372-385, 408`)**:
   - `CashFlows` table requires `submittedBy TEXT NOT NULL`, but `SqliteStateManager.updatePortfolio` inserts into `CashFlows` without `submittedBy`. Calling `updatePortfolio` on any portfolio with `cashFlows` (including `SqliteStateManager.applyCorporateAction` for a dividend) throws `SqliteError: NOT NULL constraint failed: CashFlows.submittedBy`.
4. **[CRITICAL] Missing RBAC & Cross-Tenant IDOR on Queue and Subscription Routes**:
   - `src/api/routes/queue.ts:8-91`: Accepts `middlewares` (`forbidViewer`, `requireAdmin`, `requireSuperadmin`) in `createQueueRouter` (`lines 8-13`) but never attaches them to any route, and `POST /api/models/:id/fan-out` never verifies that `modelId` belongs to `req.tenantId`.
   - `src/api/server.ts:478-488` (`PUT /api/portfolios/:id/subscription`): Does not verify that portfolio `:id` or `modelId` belongs to `req.tenantId`.
5. **[HIGH] Circuit Breaker Status & Cooldown Ignored on Subsequent Evaluations**:
   - Neither `Orchestrator.onTick` (`src/orchestrator/loop.ts:82`) nor `BatchEvaluationWorker.processNextBatch` (`src/orchestrator/batch-evaluator.ts:144`) checks `if (currentState.portfolioState.circuitBreakerStatus === 'open')` before evaluating and submitting orders. Once a portfolio trips its circuit breaker, subsequent ticks or batch worker runs continue trading it.
6. **[HIGH] Audit Record `type` Never Set by `generateAuditRecord` (`src/audit/audit.ts:70-105` vs. `src/audit/storage.ts:65`)**:
   - `SqliteAuditStorage.saveAuditRecord` stores `recordAny.type || 'UNKNOWN'`, causing `GET /api/portfolios/:id/execution-status` and `GET /api/portfolios/:id/audit-trail` (which query `WHERE type = 'LIVE_EXECUTION'`) to always return empty results.
7. **[HIGH] Global Rate Limiter vs. 2-Second UI Polling Self-DoS (`src/api/server.ts:32-39` vs. `web/src/App.tsx:193-197`)**:
   - `apiLimiter` caps each IP at 100 requests per 15 minutes across `/api`, while `App.tsx` polls `/api/state`, `/api/logs`, and `/api/metrics` every 2 seconds (90 req/min), triggering `HTTP 429` after ~66 seconds of dashboard usage.
8. **[HIGH] Webhook Signature Verification Hardening (`src/api/webhooks/broker-reports.ts:11-26`)**:
   - Falls back to `'local-dummy-secret'` even in production, hashes `JSON.stringify(req.body)` instead of raw request bytes, and uses `!==` instead of `crypto.timingSafeEqual`.

### 3.3 Maintainability & Repository Structure
- **Dual Repository / God-Object Pattern in SQLite Layer**: `src/db/repositories/` (`PortfolioRepository`, `ModelRepository`, `TenantRepository`, `AssetRepository`) was introduced to modularize SQLite access, but `SqliteStateManager` (`src/orchestrator/sqlite-state.ts`, 821 lines) still contains inline SQL queries (`getStatesFilteredByTenant`, `updatePortfolio`, `getAccountState`, etc.) that duplicate and diverge from the repository classes (e.g., `PortfolioRepository` selects `cashBuffer`, whereas `SqliteStateManager.getStatesFilteredByTenant` forgot it).
- **Route Organization**: `src/api/server.ts` (625 lines) mixes auth middleware, user management, models, assets, metrics, logs, and admin endpoints directly in the root file while delegating portfolios and queue routes to `src/api/routes/`.

---

## 4. Frontend (`web/`) & Persona / RBAC Assessment

1. **[HIGH] Superadmin "Asset Universe" Tab (`AssetUniverseTab`) Is Unreachable (`web/src/App.tsx:528-537`)**:
   - `SuperadminLayout.tsx:25` renders the `"Asset Universe"` sidebar button (`activeTab === 'assets'`), and `AssetUniverseTab` is imported in `App.tsx:25`, but `getSuperTab()` (`App.tsx:528-534`) only handles `'tenants'` and `'scheduler'`, defaulting to `<SystemOpsTab />` when `'assets'` is clicked.
2. **[HIGH] Frontend-Backend Contract Mismatches**:
   - **Concentration Limit Casing (`web/src/components/MandateBuilderForm.tsx:82, 233, 242`)**: Emits `type: 'ConcentrationLimit'`, whereas backend validation and evaluation (`src/core/evaluation.ts:207`, `src/models/domain.ts:183`) check `c.type === 'concentration_limit'`. UI-configured concentration limits are silently ignored.
   - **Compliance Log Account Filter (`web/src/components/ComplianceDashboard.tsx:16` vs. `src/api/server.ts:512`)**: Sends `?accountId=${filterAccount}`, whereas `GET /api/logs` reads `req.query.portfolioId`, returning unfiltered logs.
   - **Superadmin User Creation Missing `Advisor` Role (`web/src/components/admin/TenantManagementTab.tsx:230-233`)**: Dropdown only offers `Viewer` and `Admin`.
3. **[MEDIUM] Advisor Persona Gaps (`docs/architecture/personas.md:37-46`)**:
   - The Advisor "Action Inbox" tab (`web/src/App.tsx:482`) is a placeholder (`"Action Inbox under construction..."`), and the portfolio detail view lacks controls to trigger dry-run/live rebalances, submit cash flows, or edit bespoke portfolio mandates.
4. **[LOW] React Compiler Warning & UX Polish**:
   - `web/src/components/MandateBuilderForm.tsx:45` triggers an ESLint `react-hooks/incompatible-library` warning on `watch('archetype')` from `react-hook-form`.
   - Several components use blocking browser `alert()` / `confirm()` dialogs and `window.location.reload()` (`web/src/App.tsx:90-94`).

---

## 5. Documentation Hygiene Assessment

1. **Outdated Foundational Narratives**:
   - `README.md` (`lines 5, 22, 26, 36, 168-186`): Still describes the repo as `Live Agent v2.0 MVP`, claims `Node.js >= 18` (actually `>= 24.0.0`), claims tax-loss harvesting and jurisdiction-specific tax rules are out of scope, claims audit logs only go to `data/audit-trail.jsonl`, and lists only 8 of the 17 `src/` directories (with a typo `src/Explainability/`).
   - `BUILD_JOURNEY.md` (`lines 16, 20, 24-31`): Section 3 ("Working Assumptions") still states *"The current architecture is an offline TypeScript calculation core with no live integrations"*, directly contradicting Sections 1 and 2.
   - `DEPLOYMENT.md` (`lines 23-27`) & `src/api/openapi.ts` (`lines 12, 32`): Falsely warn that JWT authentication uses unsigned Base64 payloads with no expiry, despite `bcryptjs` + signed `jsonwebtoken` + refresh token rotation being implemented in Iterations 54 & 60. `DEPLOYMENT.md` also omits `JWT_SECRET`, `JWT_REFRESH_SECRET`, `SUPERADMIN_TENANT_ID`, and `REBALANCING_DB_PATH`.
   - `docs/architecture/overview.md`, `docs/guides/user-guide.md`, `docs/guides/developer-guide.md`, and `docs/guides/adding-rebalancing-strategies.md`: Still describe an offline-only 3-strategy engine, omitting `tax_aware_us`, `WEEKLY` cash flow recurrence, `PENDING` scheduled cash flow semantics (ADR-0036), and `SECTION_104` UK pooling.
2. **OKF Index & Validation Script Gaps**:
   - `docs/index.md` omits links to 4 subdirectories: `docs/api/index.md`, `docs/archetypes/index.md`, `docs/cli/index.md`, and `docs/plans/index.md`.
   - `scripts/validate-docs.sh` only checks for `^type:` in YAML frontmatter (ignoring `title`, `description`, `timestamp` required by `AGENTS.md` Rule 5) and does not verify that files inside subdirectories are listed in their corresponding `index.md` or that ADRs are synced in `BUILD_JOURNEY.md`.

---

## 6. Test Coverage & Suite Quality

### 6.1 Coverage Summary
- **Backend (`tests/`)**: 46 test suites / 342 tests.
  - `src/core/`, `src/strategy/`, `src/optimizer/`, `src/explanation/`, `src/audit/`: **93%–100%** line coverage.
  - `src/services/`, `src/broker/`: **86%–96%** line coverage.
  - `src/orchestrator/sqlite-state.ts` (~55%), `src/orchestrator/state.ts` (~41%), `src/notifications/` (~31%): Lower coverage in state persistence edge paths and external notification adapters (`slack.ts`, `webhook.ts`).
- **Frontend (`web/src/`)**: 2 test files (`App.test.tsx`, `SharedWorkspaceLayout.test.tsx`) with 2 basic render smoke tests. **0%** coverage of dashboard views, forms, and API interactions.

### 6.2 Key Testing Blind Spots to Address
1. **Read-After-Write API Persistence Assertions**: `tests/api.test.ts:187-199` only checked the HTTP response body of `PUT /api/portfolios/:id/policy` without querying `GET /api/portfolios/:id` afterward, which hid the missing SQLite persistence call.
2. **Scheduler → Worker Execution Handoff**: `tests/scheduler.test.ts` tested `scanAndEnqueue()` in isolation without running `Orchestrator.onTick()` or `BatchEvaluationWorker.processNextBatch()` on the enqueued account, hiding the premature `nextRebalanceDate` advancement bug.
3. **User Creation → Login Lifecycle**: No test exercised `POST /api/users` followed by `POST /api/auth/login`, hiding the missing `bcrypt.hashSync` call.
4. **Corporate Action Dividend → Valuation & SQLite Persistence**: Cross-feature tests covered `SPLIT` + `evaluateRebalance`, but not `DIVIDEND` + `calculateValuation` or `SqliteStateManager.applyCorporateAction`.

---

## 7. Prioritized Remediation Roadmap

### Priority 0 (Immediate — Data Integrity, Security & Broken Workflows)
1. **Fix `PUT /api/portfolios/:id/policy` Persistence (`src/api/routes/portfolios.ts:328-367`)**: Persist updated `policy`, `taxJurisdiction`, and `taxWrapper` to SQLite via `stateManager`.
2. **Fix User Password Hashing & Seeded Superadmin Role (`src/api/server.ts:275-278, 364-390`, `src/db/sqlite.ts:272-280`)**: Hash passwords with `bcrypt.hashSync(password, 10)` on user creation, and align the seeded Superadmin's `role`/`tenantId` with `requireSuperadmin`.
3. **Fix Corporate Action Dividend Double-Counting & SQLite `CashFlows.submittedBy` Crash (`src/core/corporate-actions.ts:120-139`, `src/orchestrator/sqlite-state.ts:372-385`)**: Either keep `portfolio.cash` as pre-cash-flow base cash when appending a `SETTLED` cash flow or do not append a duplicate `SETTLED` cash flow after incrementing `portfolio.cash`; include `submittedBy` in `SqliteStateManager.updatePortfolio`.
4. **Fix `MandateSchedulerService` Date Advancement Timing & Singleton Wiring (`src/orchestrator/scheduler.ts:132-149`, `src/api/server.ts:284-302`)**: Advance `nextRebalanceDate` only *after* `CalendarRebalanceStrategy` evaluates/executes (or record the due trigger before advancing), and share a single `MandateSchedulerService` instance in `server.ts`.
5. **Fix `getStatesFilteredByTenant` Missing `cashBuffer` (`src/orchestrator/sqlite-state.ts:655-739`)**: Include `p.cashBuffer` in the SQL `SELECT` and `targetAllocation` object.
6. **Enforce RBAC & Tenant Ownership on `/api/queue/*`, `/api/models/:id/fan-out`, and `PUT /api/portfolios/:id/subscription`**.

### Priority 1 (High — Engine Consistency & UI Contract Alignment)
1. **Wire Quality Indicators & Friction Model into `evaluateRebalanceAsync` and `BatchEvaluationWorker` (`src/core/evaluation.ts:346`, `src/orchestrator/batch-evaluator.ts:178`)**.
2. **Preserve `taxLots` and Portfolio Metadata in `simulatePostTrade` (`src/core/simulation.ts:97-106`)** and remove the live-mode simulation overwrite in `src/cli/agent.ts:104`.
3. **Enforce Circuit Breaker & Open-Order Checks (`circuitBreakerStatus === 'open'`, `hasOpenOrders`) in `Orchestrator.onTick` and `BatchEvaluationWorker`**.
4. **Eliminate Remaining Native Float Arithmetic in `src/core/overlays.ts` and `src/core/oracle-adapter.ts`**, and reconcile rounding residuals on `SPLIT`/`MERGER` tax lots (`src/core/corporate-actions.ts`).
5. **Fix Frontend Contract Bugs**: Wire `case 'assets': return <AssetUniverseTab />` in `web/src/App.tsx:528-534`, change `'ConcentrationLimit'` to `'concentration_limit'` in `MandateBuilderForm.tsx`, change `?accountId=` to `?portfolioId=` in `ComplianceDashboard.tsx`, and reduce/replace 2s polling with SSE events.

### Priority 2 (Medium — Documentation, OpenAPI & Test Suite Hardening)
1. **Sync `BUILD_JOURNEY.md` & ADR Statuses**: Add ADRs 0053–0057 to `BUILD_JOURNEY.md`, fix ADR-0050's description, mark superseded ADRs as `Superseded by ADR-XXXX`, and clean up Section 3 of `BUILD_JOURNEY.md`.
2. **Refresh `README.md`, `DEPLOYMENT.md`, `src/api/openapi.ts`, and `docs/architecture/`**: Update Node version (`>=24.0.0`), signed JWT documentation, project directory tree, and v3.0 capabilities.
3. **Strengthen `scripts/validate-docs.sh` & Expand Tests**: Validate full OKF frontmatter (`type`, `title`, `description`, `timestamp`) and `index.md` completeness, add read-after-write and end-to-end lifecycle tests in `tests/`, and add component tests in `web/src/`.

---

&copy; 2026 Johan Hellman. All rights reserved.
