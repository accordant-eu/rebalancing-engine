# Build Journey

This file is the living project journal. It captures the journey from initialization through future implementation.

## 1. Project Context

- **Known Objective:** Maintain and extend a generic portfolio rebalancing engine MVP.
- **Development Approach:** This project, including its documentation, scaffolding, and future implementations, is built heavily relying on LLM tools and AI-assisted editors.
- **What is Known:** The MVP is a TypeScript/Node.js offline calculation core using deterministic synthetic fixtures.
- **What is Not Yet Known:** Production integration model, deployment model, live data interfaces, execution routing, and production persistence remain undecided.
- **Next Steps:** Open questions from the roadmap have been resolved (weekly recurrence, schema-only validation deferral, scheduled flows as projection-only, price `asOf` timestamps). A live-agent vision has been documented. Near-term implementation candidates are weekly recurrence, scheduled-flow behavioral change (projection-only), price `asOf` metadata, and CI hardening. The project direction is toward a live autonomous agent with a real-time broker connection.

## 2. Current Repository Snapshot

- **Repository state:** MVP offline calculation core implemented for deterministic synthetic fixtures.
- **Languages detected:** TypeScript on Node.js.
- **Frameworks detected:** Jest test framework; no application framework.
- **Tooling detected:** TypeScript compiler, Jest, ESLint, Prettier, npm scripts.
- **Tests detected:** Unit, fixture, edge-case, scenario runner, explanation, audit, and strategy tests.
- **Documentation detected:** README, build journey, MVP plan, PRD/architecture document, roadmap, fixture README, CLI docs, PRDs/plans, and audit reports.
- **CI/CD detected:** None.
- **Notable gaps:** No CI workflow, no full optimizer, no jurisdiction-specific tax logic, no schema-only validator or published JSON Schema, and no live integrations/API/UI/database.

## 3. Working Assumptions

- The project is a generic portfolio rebalancing engine MVP.
- The current architecture is an offline TypeScript calculation core with no live integrations.
- The repository’s existing TypeScript/Node.js stack should be respected unless a documented post-MVP decision changes it.
- Future implementation should continue with short, validated proof cycles.
- The system requires deterministic calculations, explicit validation, and strong auditability.

## 4. Decisions Log

Detailed decision records are available in the [Architecture Decision Records (ADRs)](docs/decisions/index.md) knowledge base.

| # | Date       | Decision | Status | ADR |
|---|------------|----------|--------|-----|
| 0001 | 2026-05-02 | Add thin offline CLI around existing engine and fixture runner | Accepted | [ADR-0001](docs/decisions/0001-add-thin-offline-cli-around-existing-engine-and-fixture-runner.md) |
| 0002 | 2026-05-02 | Resolve CLI limitations pragmatically | Accepted | [ADR-0002](docs/decisions/0002-resolve-cli-limitations-pragmatically.md) |
| 0003 | 2026-05-02 | Adopt standing decision discipline in repository rules | Accepted | [ADR-0003](docs/decisions/0003-adopt-standing-decision-discipline-in-repository-rules.md) |
| 0004 | 2026-05-02 | Push validated commits at reasonable checkpoints | Accepted | [ADR-0004](docs/decisions/0004-push-validated-commits-at-reasonable-checkpoints.md) |
| 0005 | 2026-05-02 | Suppress below-minimum trades with structured warnings | Accepted | [ADR-0005](docs/decisions/0005-suppress-below-minimum-trades-with-structured-warnings.md) |
| 0006 | 2026-05-02 | Reject negative cash in trade proposal generation | Accepted | [ADR-0006](docs/decisions/0006-reject-negative-cash-in-trade-proposal-generation.md) |
| 0007 | 2026-05-02 | Simulate exact proposed trades with sell-side turnover | Accepted | [ADR-0007](docs/decisions/0007-simulate-exact-proposed-trades-with-sell-side-turnover.md) |
| 0008 | 2026-05-02 | Use sell-side turnover for MVP simulation | Accepted | [ADR-0008](docs/decisions/0008-use-sell-side-turnover-for-mvp-simulation.md) |
| 0009 | 2026-05-02 | Generate deterministic explanations from calculation outputs | Accepted | [ADR-0009](docs/decisions/0009-generate-deterministic-explanations-from-calculation-outputs.md) |
| 0010 | 2026-05-02 | Use caller-supplied audit metadata | Accepted | [ADR-0010](docs/decisions/0010-use-caller-supplied-audit-metadata.md) |
| 0011 | 2026-05-02 | Report batch scenario errors per scenario | Accepted | [ADR-0011](docs/decisions/0011-report-batch-scenario-errors-per-scenario.md) |
| 0012 | 2026-05-02 | Use manual forced rebalance as second strategy | Accepted | [ADR-0012](docs/decisions/0012-use-manual-forced-rebalance-as-second-strategy.md) |
| 0013 | 2026-05-02 | Mark offline fixture MVP complete | Accepted | [ADR-0013](docs/decisions/0013-mark-offline-fixture-mvp-complete.md) |
| 0014 | 2026-05-02 | Use hybrid multi-strategy architecture next | Accepted for next iteration | [ADR-0014](docs/decisions/0014-use-hybrid-multi-strategy-architecture-next.md) |
| 0015 | 2026-05-02 | Prioritize calendar and boundary-target strategy slices | Provisional | [ADR-0015](docs/decisions/0015-prioritize-calendar-and-boundary-target-strategy-slices.md) |
| 0016 | 2026-05-02 | Default omitted strategy policy to threshold | Accepted | [ADR-0016](docs/decisions/0016-default-omitted-strategy-policy-to-threshold.md) |
| 0017 | 2026-05-02 | Use explicit calendar dates only | Accepted for MVP | [ADR-0017](docs/decisions/0017-use-explicit-calendar-dates-only.md) |
| 0018 | 2026-05-02 | Limit boundary targeting to absolute bands first | Accepted for MVP | [ADR-0018](docs/decisions/0018-limit-boundary-targeting-to-absolute-bands-first.md) |
| 0019 | 2026-05-02 | Use separate expected-status runner manifest | Accepted | [ADR-0019](docs/decisions/0019-use-separate-expected-status-runner-manifest.md) |
| 0020 | 2026-05-02 | Mark active MVP slice sets complete | Accepted | [ADR-0020](docs/decisions/0020-mark-active-mvp-slice-sets-complete.md) |
| 0021 | 2026-05-02 | Use a strategy registry for selection | Accepted | [ADR-0021](docs/decisions/0021-use-a-strategy-registry-for-selection.md) |
| 0022 | 2026-05-02 | Scope next deferred-capability increment to numeric policy and relative boundaries | Accepted for next increment | [ADR-0022](docs/decisions/0022-scope-next-deferred-capability-increment-to-numeric-policy-and-relative-boundaries.md) |
| 0023 | 2026-05-02 | Use `decimal.js` internally with explicit output rounding | Accepted | [ADR-0023](docs/decisions/0023-use-decimal-js-internally-with-explicit-output-rounding.md) |
| 0024 | 2026-05-02 | Add policy-selected relative boundary targeting | Accepted | [ADR-0024](docs/decisions/0024-add-policy-selected-relative-boundary-targeting.md) |
| 0025 | 2026-05-02 | Defer production surfaces until concrete consumers and operations are defined | Accepted | [ADR-0025](docs/decisions/0025-defer-production-surfaces-until-concrete-consumers-and-operations-are-defined.md) |
| 0026 | 2026-05-02 | Prioritize scheduled/recurring cash-flow semantics next | Accepted for planning | [ADR-0026](docs/decisions/0026-prioritize-scheduled-recurring-cash-flow-semantics-next.md) |
| 0027 | 2026-05-02 | Require CLI exposure decisions for future engine capabilities | Accepted | [ADR-0027](docs/decisions/0027-require-cli-exposure-decisions-for-future-engine-capabilities.md) |
| 0028 | 2026-05-02 | Consolidate user/developer docs around observed behavior | Accepted | [ADR-0028](docs/decisions/0028-consolidate-user-developer-docs-around-observed-behavior.md) |
| 0029 | 2026-05-02 | Place scheduled flows on `PortfolioState.cashFlowSchedules` | Accepted | [ADR-0029](docs/decisions/0029-place-scheduled-flows-on-portfoliostate-cashflowschedules.md) |
| 0030 | 2026-05-02 | Use explicit ISO date-only evaluation semantics | Accepted | [ADR-0030](docs/decisions/0030-use-explicit-iso-date-only-evaluation-semantics.md) |
| 0031 | 2026-05-02 | Apply due schedules as schedule-derived settled cash-flow events in an internal copy | Accepted | [ADR-0031](docs/decisions/0031-apply-due-schedules-as-schedule-derived-settled-cash-flow-events-in-an-internal-copy.md) |
| 0032 | 2026-05-02 | Support monthly, quarterly, and annual recurrence only | Accepted | [ADR-0032](docs/decisions/0032-support-monthly-quarterly-and-annual-recurrence-only.md) |
| 0033 | 2026-05-02 | Keep scheduled-flow CLI inputs file-based | Accepted | [ADR-0033](docs/decisions/0033-keep-scheduled-flow-cli-inputs-file-based.md) |
| 0034 | 2026-06-14 | Add weekly recurrence frequency for cash-flow schedules | Accepted for next increment | [ADR-0034](docs/decisions/0034-add-weekly-recurrence-frequency-for-cash-flow-schedules.md) |
| 0035 | 2026-06-14 | Defer schema-only validation mode | Deferred | [ADR-0035](docs/decisions/0035-defer-schema-only-validation-mode.md) |
| 0036 | 2026-06-14 | Restrict scheduled cash flows to projection/planning only | Accepted | [ADR-0036](docs/decisions/0036-restrict-scheduled-cash-flows-to-projection-planning-only.md) |
| 0037 | 2026-06-14 | Add optional `asOf` timestamp on prices for audit traceability | Accepted for next increment | [ADR-0037](docs/decisions/0037-add-optional-asof-timestamp-on-prices-for-audit-traceability.md) |
| 0038 | 2026-06-14 | Document live-agent vision as directional architecture | Accepted | [ADR-0038](docs/decisions/0038-document-live-agent-vision-as-directional-architecture.md) |
| 0039 | 2026-06-14 | Use JSONL for persistent audit trails | Accepted | [ADR-0039](docs/decisions/0039-use-jsonl-for-persistent-audit-trails.md) |
| 0040 | 2026-06-14 | Use pause strategy for reconciliation | Accepted | [ADR-0040](docs/decisions/0040-use-pause-strategy-for-reconciliation.md) |
| 0041 | 2026-06-14 | Pivot to B2B SaaS multi-tenant architecture | Accepted | [ADR-0041](docs/decisions/0041-pivot-to-b2b-saas-multi-tenant-architecture.md) |
| 0042 | 2026-06-14 | Separate allocation strategy from execution overlays | Accepted | [ADR-0042](docs/decisions/0042-separate-allocation-strategy-from-execution-overlays.md) |
| 0043 | 2026-06-14 | Adopt UX-first thin-slice MVP methodology for v3 | Accepted | [ADR-0043](docs/decisions/0043-adopt-ux-first-thin-slice-mvp-methodology-for-v3.md) |
| 0044 | 2026-06-14 | Use npm workspaces for monorepo | Accepted | [ADR-0044](docs/decisions/0044-use-npm-workspaces-for-monorepo.md) |
| 0045 | 2026-06-14 | Colocate API Server within agent process | Accepted | [ADR-0045](docs/decisions/0045-colocate-api-server-within-agent-process.md) |
| 0046 | 2026-06-14 | Use size-based log rotation and realistic simulation reset in dry-run | Accepted | [ADR-0046](docs/decisions/0046-use-size-based-rotation-and-simulation-reset.md) |
| 0047 | 2026-06-14 | Use simple margin constraint for TCO penalty | Accepted | [ADR-0047](docs/decisions/0047-use-simple-margin-for-tco-penalty.md) |
| 0048 | 2026-06-14 | Use MultiPortfolioStateManager for in-memory scaling mock | Accepted | [ADR-0048](docs/decisions/0048-use-multi-portfolio-in-memory-scale.md) |
| 0049 | 2026-06-14 | Use better-sqlite3 for Persistent State Management | Accepted | [ADR-0049](docs/decisions/0049-use-sqlite-for-persistent-state-management.md) |
| 0050 | 2026-06-17 | Establish baseline for async dynamic targeting capabilities (VaR, EF) via B2B broker API | Accepted | [ADR-0050](docs/decisions/0050-use-b2b-broker-api.md) |
| 0051 | 2026-06-18 | Use Composite Asset Schema for Instrument Identity | Accepted | [ADR-0051](docs/decisions/0051-use-composite-asset-schema-for-instrument-identity.md) |
| 0052 | 2026-06-18 | Use Tenant API Keys for B2B Authentication | Accepted | [ADR-0052](docs/decisions/0052-use-tenant-api-keys-for-b2b-authentication.md) |


| Iteration | Date | Theme | Area | High-Level Summary | Details |
|-----------|------|-------|------|--------------------|---------|
| 1 | 2026-04-29 | Setup Project Hygiene | Phase 0: Init & Discovery | Inspected repo, created `BUILD_JOURNEY. | [Log](docs/iterations/2026-04-29.md#iteration-1-detail---2026-04-29) |
| 2 | 2026-04-29 | PRD Planning | Phase 1: MVP Plan | Digested PRD, created `docs/MVP_Implementation_Plan. | [Log](docs/iterations/2026-04-29.md#iteration-2-detail---2026-04-29) |
| 3 | 2026-04-29 | Tech Stack & Scaffolding | Slice 0 | Selected TypeScript/Node. | [Log](docs/iterations/2026-04-29.md#iteration-3-detail---2026-04-29) |
| 4 | 2026-04-29 | Domain Fixture Foundation | Slice 1 | Created TypeScript interfaces for domain models and wrote JSON fixtures covering all MVP edge cases (on-target, drift breaches, positive cash, min trade size, missing prices, universe/sum errors). | [Log](docs/iterations/2026-04-29.md#iteration-4-detail---2026-04-29) |
| 5 | 2026-04-29 | Portfolio Valuation | Slice 2 | Implemented `calculateValuation` and `calculateCurrentWeights`. | [Log](docs/iterations/2026-04-29.md#iteration-5-detail---2026-04-29) |
| 6 | 2026-04-29 | Target Allocation and Drift | Slice 3 | Implemented `calculateDrift` and `validateTargetAllocation`. | [Log](docs/iterations/2026-04-29.md#iteration-6-detail---2026-04-29) |
| 7 | 2026-04-29 | Threshold Trigger | Slice 4 | Created `StrategyInterface` and `ThresholdStrategy`. | [Log](docs/iterations/2026-04-29.md#iteration-7-detail---2026-04-29) |
| 8 | 2026-04-29 | Red-Team Audit | Phase 2: Audit | Performed red-team audit of Slices 1-4. | [Log](docs/iterations/2026-04-29.md#iteration-8-detail---2026-04-29) |
| 9 | 2026-04-30 | Test-Case Audit | Phase 2: Audit | Performed focused test-case audit of Slices 1–4. | [Log](docs/iterations/2026-04-30.md#iteration-9-detail---2026-04-30) |
| 10 | 2026-05-02 | Basic Trade Proposal Generation | Slice 5 | Verified repository reality against docs, implemented deterministic full-reset proposal generation, added trade proposal tests, exported core modules, and updated README status. | [Log](docs/iterations/2026-05-02.md#iteration-10-detail---2026-05-02) |
| 11 | 2026-05-02 | Cash-Aware Constraints | Slice 6 | Added structured proposal warnings, applied global minimum trade-size suppression, rejected negative cash during proposal generation, documented fixtures, and updated README status. | [Log](docs/iterations/2026-05-02.md#iteration-11-detail---2026-05-02) |
| 12 | 2026-05-02 | Post-Trade Simulation | Slice 7 | Added exact trade replay simulation with post-trade holdings, valuation, weights, residual drift, sell-side turnover, oversell checks, and cash reconciliation checks. | [Log](docs/iterations/2026-05-02.md#iteration-12-detail---2026-05-02) |
| 13 | 2026-05-02 | Explanation Output | Slice 8 | Added deterministic explanation generation from trigger, proposal, warning, and simulation outputs, with tests for no-op, rebalance, and suppressed-trade residual drift cases. | [Log](docs/iterations/2026-05-02.md#iteration-13-detail---2026-05-02) |
| 14 | 2026-05-02 | Audit and Reproducibility Record | Slice 9 | Added audit record generation and stable JSON serialization capturing inputs, drift, trigger, proposal, simulation, and explanation outputs. | [Log](docs/iterations/2026-05-02.md#iteration-14-detail---2026-05-02) |
| 15 | 2026-05-02 | Batch Scenario Runner | Slice 10 | Added an offline fixture runner and `npm run scenario:run` command that evaluates all scenarios into success/error JSON results with audit records for successful scenarios. | [Log](docs/iterations/2026-05-02.md#iteration-15-detail---2026-05-02) |
| 16 | 2026-05-02 | Second Strategy Proof Point | Slice 11 | Added manual forced-rebalance strategy isolated to trigger logic and tests proving shared valuation, proposal, simulation, and explanation functions work unchanged. | [Log](docs/iterations/2026-05-02.md#iteration-16-detail---2026-05-02) |
| 17 | 2026-05-02 | MVP Hardening and Final Audit | Slice 12 | Added final MVP audit documentation, refreshed README status, reconciled build journey project context with the implemented repository, and recorded the decision to mark the offline fixture MVP complete. | [Log](docs/iterations/2026-05-02.md#iteration-17-detail---2026-05-02) |
| 18 | 2026-05-02 | Full-Chain Strategy Traceability | Planning and architecture | Reviewed the Meta Paper, PRD, MVP plan, build journey, audits, README, fixtures, source, tests, runner, package config, git status, and recent commits. | [Log](docs/iterations/2026-05-02.md#iteration-18-detail---2026-05-02) |
| 19 | 2026-05-02 | Multi-Strategy Next Iteration | Next-iteration MVP | Implemented policy-driven strategy selection, calendar due-date strategy, threshold boundary-target execution, mixed-strategy runner fixtures, strategy/execution metadata in audit output, documentation updates, and a next-iteration audit. | [Log](docs/iterations/2026-05-02.md#iteration-19-detail---2026-05-02) |
| 20 | 2026-05-02 | Complete Next-Iteration Slices | Slice completion hardening | Added expected-status manifest validation to the scenario runner, added an invalid-strategy fixture, covered manifest success and mismatch behavior in tests, updated runner usage docs, refreshed the next-iteration audit, and recorded the final runner-manifest decision. | [Log](docs/iterations/2026-05-02.md#iteration-20-detail---2026-05-02) |
| 21 | 2026-05-02 | Reconcile Slice Completion | Documentation and tests | Verified the original MVP and next-iteration MVP slice lists against implementation, removed stale future-scope references for already completed manifest/calendar coverage, added explicit next-plan completion evidence, and converted old edge-case TODO comments into executable assertions. | [Log](docs/iterations/2026-05-02.md#iteration-21-detail---2026-05-02) |
| 22 | 2026-05-02 | Refactoring Assessment | Refactoring hardening | Created a repository-aware refactoring assessment, added direct high-level evaluation characterization tests, and replaced switch-based strategy selection with an explicit registry of stateless strategies. | [Log](docs/iterations/2026-05-02.md#iteration-22-detail---2026-05-02) |
| 23 | 2026-05-02 | Roadmap Synthesis | Roadmap and planning | Reviewed PRDs, plans, audits, CLI docs, README, build journey, fixtures, source, tests, package/config files, git status, and recent commits. | [Log](docs/iterations/2026-05-02.md#iteration-23-detail---2026-05-02) |
| 24 | 2026-05-02 | Scheduled Cash Flows | Offline domain increment | Implemented scheduled and recurring cash-flow domain types, validation, expansion, valuation/proposal integration, warnings, explanation/audit output, CLI rendering/inspection, fixtures, expectation updates, and audit documentation. | [Log](docs/iterations/2026-05-02.md#iteration-24-detail---2026-05-02) |
| 25 | 2026-05-02 | Documentation Consolidation | User/developer experience | Created dedicated user, CLI reference, developer, strategy-extension, architecture, and examples docs; replaced README with a concise entry point; documented strategy extension rules, warnings/errors, input/output models, CLI behavior, fixtures, audit/explanation concepts, and safe extension expectations. | [Log](docs/iterations/2026-05-02.md#iteration-25-detail---2026-05-02) |
| 26 | 2026-05-02 | Independent Full-Chain Audit | Audit | Performed 10-pass independent audit: research-to-implementation traceability, PRD/plan alignment, architecture, financial correctness, security/privacy, CLI, test quality, reliability, documentation/DX, and deferred scope. | [Log](docs/iterations/2026-05-02.md#iteration-26-detail---2026-05-02) |
| 27 | 2026-06-14 | Restructure Foundational Docs | Documentation structure | Restructured the `docs/` folder, moved historical/iterative PRDs/Plans into subdirectories, split the monolithic vision PRD into a concise `product-vision. | [Log](docs/iterations/2026-06-14.md#iteration-27-detail---2026-06-14) |
| 28 | 2026-06-14 | Define Live Agent MVP Tranches | Roadmap and planning | Drafted the Live Agent v2. | [Log](docs/iterations/2026-06-14.md#iteration-28-detail---2026-06-14) |
| 29 | 2026-06-14 | Resolve Dependabot Vulnerability | Security | Resolved high and moderate severity vulnerabilities from dependabot caused by axios and brace-expansion. | [Log](docs/iterations/2026-06-14.md#iteration-29-detail---2026-06-14) |
| 29 | 2026-06-14 | Core Engine Readiness (Tranche 1) | Offline domain increment | Added `asOf` to `PriceSnapshot`, `WEEKLY` frequency to cash-flow recurrence, changed scheduled flows to `PENDING` to strictly serve as projection/planning without inflating actionable cash, and added a full GitHub Actions CI pipeline. | [Log](docs/iterations/2026-06-14.md#iteration-29-detail---2026-06-14) |
| 30 | 2026-06-14 | Orchestrator Skeleton (Tranche 2) | Live agent transition | Implemented `LiveStateManager` for streaming inputs, `Orchestrator` for continuous autonomous loop with debounce/cooldown logic, `DryRunExecutor` for `stdout` JSON pipeline output, and an `agent start` CLI. | [Log](docs/iterations/2026-06-14.md#iteration-30-detail---2026-06-14) |
| 31 | 2026-06-14 | Broker Integration (Tranche 3) | Live agent transition | Defined `BrokerAdapter` interface, implemented `AlpacaAdapter`, integrated it into a polling loop under the `--live` flag in `agent start`, implemented `CircuitBreaker` safety middleware with strict gross/count limits, and updated `BrokerExecutor` to asynchronously submit trades to the broker. | [Log](docs/iterations/2026-06-14.md#iteration-31-detail---2026-06-14) |
| 32 | 2026-06-14 | Production Hardening (Tranche 4) | Live agent transition | Formalized architectural choices into ADRs 0039 and 0040. | [Log](docs/iterations/2026-06-14.md#iteration-32-detail---2026-06-14) |
| 33 | 2026-06-14 | MVP Housekeeping & Sanity Check | Maintenance | Fixed linting warnings (unused variables) across agent and strategy files. | [Log](docs/iterations/2026-06-14.md#iteration-33-detail---2026-06-14) |
| 34 | 2026-06-14 | Command Center Dashboard (Tranche 5) | UI & API MVP | Converted repo to npm workspaces. | [Log](docs/iterations/2026-06-14.md#iteration-34-detail---2026-06-14) |
| 35 | 2026-06-14 | Simulation Fidelity & Log Rotation | Maintenance | Added 5MB size-based rotation to `FileAuditStorage` to cap disk usage, and intercepted the `postTradeState` in dry-run mode to apply back to the `LiveStateManager`, resolving infinite log spam while testing. | [Log](docs/iterations/2026-06-14.md#iteration-35-detail---2026-06-14) |
| 36 | 2026-06-14 | Friction Optimization (Tranche 6) | Evaluation Enhancement | Introduced `FrictionModel` interface (`FixedFeeModel`, `PercentageSlippageModel`). | [Log](docs/iterations/2026-06-14.md#iteration-36-detail---2026-06-14) |
| 37 | 2026-06-14 | Multi-Portfolio In-Memory Mock (Tranche 7) | Architecture Scale | Refactored `LiveStateManager` to `MultiPortfolioStateManager`. | [Log](docs/iterations/2026-06-14.md#iteration-37-detail---2026-06-14) |
| 38 | 2026-06-14 | SQLite Data Persistence (Tranche 8) | Architecture Scale | Replaced in-memory state tracking with embedded `better-sqlite3`. | [Log](docs/iterations/2026-06-14.md#iteration-38-detail---2026-06-14) |
| 39 | 2026-06-15 | SaaS Shell & Multi-Tenant Model Execution (Tranche 9) | Architecture Scale | Transformed global state into a multi-tenant isolated architecture. | [Log](docs/iterations/2026-06-15.md#iteration-39-detail---2026-06-15) |
| 40 | 2026-06-15 | Event-Driven Orchestrator & Pub/Sub (Tranche 10) | Architecture Scale | Added `EvaluationQueue` table, built reverse index `getPortfoliosAffectedByInstrument`, implemented pub/sub model cascading inside a SQLite transaction, and refactored orchestrator loop to pop from the queue instead of full-table scans. | [Log](docs/iterations/2026-06-15.md#iteration-40-detail---2026-06-15) |
| 41 | 2026-06-15 | UX Mandate Builder (Tranche B) | UI & API MVP | Implemented bespoke MandateBuilderForm with dynamic conditional archetype fields, updated SQLite schema to support archetype/constraints, and decoupled Models UI with react-hook-form. | [Log](docs/iterations/2026-06-15.md#iteration-41-detail---2026-06-15) |
| 42 | 2026-06-17 | Target Sum Flexibility (Tranche C) | Core Evaluation Enhancement | Implemented explicit `cashBuffer` parameter in `TargetAllocation` schema. | [Log](docs/iterations/2026-06-17.md#iteration-42-detail---2026-06-17) |
| 43 | 2026-06-17 | Asynchronous Mock Optimizer (Tranche C) | Architecture Scale | Implemented an asynchronous `MockOptimizerService` that updates model targets and fans them out to all subscribed portfolios. | [Log](docs/iterations/2026-06-17.md#iteration-43-detail---2026-06-17) |
| 44 | 2026-06-17 | Architecture Mitigation Plan (Tranche 11 Prep) | Refactoring & Resilience | Implemented architecture mitigation plan: wrapped `orchestrator. | [Log](docs/iterations/2026-06-17.md#iteration-44-detail---2026-06-17) |
| 45 | 2026-06-17 | Security Review & Mitigation | MVP Hardening | Conducted IT Sec architecture review contextually scoped to the Live Agent MVP. | [Log](docs/iterations/2026-06-17.md#iteration-45-detail---2026-06-17) |
| 46 | 2026-06-17 | Dynamic Plugin Redaction | MVP Hardening | Implemented dynamic secret redaction in Pino. | [Log](docs/iterations/2026-06-17.md#iteration-46-detail---2026-06-17) |
| 47 | 2026-06-18 | B2B Broker Routing (Tranche 11) | Architecture Scale | Implemented multi-tenant broker routing by modifying the schema and domain models to support `brokerType`, API keys, and `brokerAccountId` directly on the `Tenants` and `Portfolios` tables. | [Log](docs/iterations/2026-06-18.md#iteration-47-detail---2026-06-18) |
| 47.5 | 2026-06-18 | Superadmin UI (Tranche 11.5) | UI & API MVP | Extended React dashboard with Superadmin Command Center; added `Users` table and RBAC; implemented `MetricsService` for observability; added global emergency circuit breaker. | [Log](docs/iterations/2026-06-18.md#iteration-47.5-detail---2026-06-18) |
| 48 | 2026-06-18 | Production Deployment Setup | Operations & CI/CD | Merged PR #7 adding Dockerfile, compose configurations, deployment workflow, and DEPLOYMENT. | [Log](docs/iterations/2026-06-18.md#iteration-48-detail---2026-06-18) |
| 49 | 2026-06-18 | Týr Agent API Integration | API Enhancements | Implemented remaining API endpoints (portfolios, drift, proposals, prices, logs) to support the Týr Agent integration. | [Log](docs/iterations/2026-06-18.md#iteration-49-detail---2026-06-18) |
| 50 | 2026-06-18 | Fix Deployment Build Error (Issue #11) | UI & API MVP | Resolved TypeScript build errors in RebalancingModelsTab. | [Log](docs/iterations/2026-06-18.md#iteration-50-detail---2026-06-18) |
| 51 | 2026-06-18 | Fix API Documentation Gaps (Issue #12) | Documentation | Addressed four documentation discrepancies: updated JWT auth description in openapi. | [Log](docs/iterations/2026-06-18.md#iteration-51-detail---2026-06-18) |
| 52 | 2026-06-18 | Refactor to Composite Instrument IDs | Architecture Scale | Migrated all hardcoded short tickers (AAPL, MSFT) to the `ISIN:MIC:CURRENCY` schema established in ADR-0051 across all unit tests, JSON fixtures, SQL seeds, mock optimizers, and UI placeholders. | [Log](docs/iterations/2026-06-18.md#iteration-52-detail---2026-06-18) |
| 53 | 2026-06-18 | Address UX & Ops Gaps after Composite ID Migration | DX / UX Polish | Created `AssetPicker. | [Log](docs/iterations/2026-06-18.md#iteration-53-detail---2026-06-18) |
| 54 | 2026-06-19 | Architecture Alignment & Auth Hardening | Security & Architecture | Hardened authentication using `bcrypt` and signed JWTs. | [Log](docs/iterations/2026-06-19.md#iteration-54-detail---2026-06-19) |
| 55 | 2026-06-19 | Native Portfolio Mandates & Týr Agent API | Architecture Alignment & API MVP | Corrected architecture to store `archetype` and `constraints` natively on `Portfolios`. | [Log](docs/iterations/2026-06-19.md#iteration-55-detail---2026-06-19) |
| 56 | 2026-06-19 | Test Suite Review & Gap Fixes (Issue #27) | Testing & Quality | Added missing E2E integration tests for model update fan-outs and B2B API key authentication lifecycle. | [Log](docs/iterations/2026-06-19.md#iteration-56-detail---2026-06-19) |
| 57 | 2026-06-19 | Resolve Code Scanning Alerts | Security | Checked GitHub Advanced Security alerts via `gh api` and resolved the open `actions/missing-workflow-permissions` alert by adding an explicit `permissions: contents: read` block to the CI workflow in `. | [Log](docs/iterations/2026-06-19.md#iteration-57-detail---2026-06-19) |
| 58 | 2026-06-20 | Týr Agent API Enhancements (Issues #30, #31) | API & Architecture | Implemented `GET /api/portfolios/summary` endpoint returning aggregated drift and audit counts. | [Log](docs/iterations/2026-06-20.md#iteration-58-detail---2026-06-20) |
| 59 | 2026-06-20 | SSE Event Streaming (Issue #29) | API & Architecture | Implemented a system-wide `EventBus` and `GET /api/events/stream` endpoint for SSE. | [Log](docs/iterations/2026-06-20.md#iteration-59-detail---2026-06-20) |
| 60 | 2026-06-20 | Token Refresh / TTL (Issue #32) | Security | Implemented Refresh Token Rotation. | [Log](docs/iterations/2026-06-20.md#iteration-60-detail---2026-06-20) |
| 61 | 2026-06-16 | UI Wireframing & Prototyping | Designed the layout scaffolding in React. Mapped out persona dashboards. | [Docs](docs/iterations/2026-06-16.md) |
| 61.5 | 2026-06-17 | Slice 1 Execution: Basic Routing & Role Assignment | Configured routing and mocked the seeded database with standard roles (Advisor, Compliance, Tenant Admin, Superadmin). Tested login flows. | [Docs](docs/iterations/2026-06-17.md) |
| 62 | 2026-07-02 | Slice 2 Execution: Detailed UI Verification & Backend Hardening | Fixed severe backend crashes in simulator. Built dashboard screens. Ran integration testing across all 4 personas. | [Docs](docs/iterations/2026-07-02.md) |
| 63 | 2026-06-20 | Friction Optimization (Mocked TCO) | Algorithm Safety | Implemented the first pass of Friction Optimization. | [Log](docs/iterations/2026-06-20.md#iteration-63-detail---2026-06-20) |
| 64 | 2026-06-20 | Continuous Broker State Sync | Architecture | Implemented `BrokerSyncService` to periodically batch price fetches and portfolio positions from Alpaca for all active tenants. | [Log](docs/iterations/2026-06-20.md#iteration-64-detail---2026-06-20) |
| 65 | 2026-07-01 | Deployment Bug Fixes (Issues #45, #46) | Reliability & Perf | Addressed post-deployment feedback and merged PR #47. | [Log](docs/iterations/2026-07-01.md#iteration-65-detail---2026-07-01) |
| 66 | 2026-07-01 | Tranche 4 - Slice 1: Webhook & Execution Reconciliation | Live Trading Readiness | Added `Orders` table to SQLite schema. | [Log](docs/iterations/2026-07-01.md#iteration-66-detail---2026-07-01) |
| 67 | 2026-07-01 | Tranche 4 - Slices 2 & 3: Audit Trails & Webhook Alerts | Safety & Compliance | Migrated audit trails from `audit-trail. | [Log](docs/iterations/2026-07-01.md#iteration-67-detail---2026-07-01) |
| 68 | 2026-07-01 | Tranche 4 - Slice 4: TCO Optimizer Un-Mocking | Configuration | Parameterized `PercentageSlippageModel` via `assumedSlippageBps` in `RebalancingPolicy`, replacing the hardcoded 5 bps. | [Log](docs/iterations/2026-07-01.md#iteration-68-detail---2026-07-01) |
| 69 | 2026-07-01 | Tranche 5 - Slice 1: Advisor Workspace MVP | UI & UX | Refactored the Command Center frontend to support Persona-specific routing. | [Log](docs/iterations/2026-07-01.md#iteration-69-detail---2026-07-01) |
| 70 | 2026-07-01 | Tranche 5 - Slice 2: Compliance Explorer MVP | UI & UX | Implemented dedicated Compliance persona layout and searchable Audit Trails view. | [Log](docs/iterations/2026-07-01.md#iteration-70-detail---2026-07-01) |
| 71 | 2026-07-01 | Tranche 5 - Slice 3: Tenant Admin MVP | UI & UX | Implemented Tenant Admin layout with Firm Overview and User Management. | [Log](docs/iterations/2026-07-01.md#iteration-71-detail---2026-07-01) |
| 72 | 2026-07-01 | Tranche 5 - Slice 4: Superadmin Pulse & Settings | UI & UX | Implemented Superadmin layout and executed browser E2E test plan across all personas. | [Log](docs/iterations/2026-07-01.md#iteration-72-detail---2026-07-01) |
| 73 | 2026-07-02 | Security & Perf Hardening (Issue #50) | Security & Architecture | Addressed Vidar audit deployment feedback blockers for webhooks and APIs. | [Log](docs/iterations/2026-07-02.md#iteration-73-detail---2026-07-02) |
| 74 | 2026-07-02 | Tenant Admin Firm Overview Wiring (Slice 3 Completion) | UI & UX | Wired the Firm Overview dashboard to the `/api/portfolios/summary` endpoint and fixed JWT decoding. | [Log](docs/iterations/2026-07-02.md#iteration-74-detail---2026-07-02) |
| 75 | 2026-07-05 | Tranche 6 Execution: Premium SaaS UX Aesthetics | UI & UX | Transitioned to Tailwind v4, standardized `lucide-react` iconography, enforced premium UX guidelines, and fixed layout scoping. | [Log](docs/iterations/2026-07-05.md) |
| 76 | 2026-07-05 | RBAC & API Hardening | Security & Architecture | Implemented strict RBAC middlewares, fixed API ownership overwrites, and resolved superadmin resolution logic on backend and frontend. | [Log](docs/iterations/2026-07-05.md) |
| 77 | 2026-07-08 | Codebase Hygiene & Web Testing | Maintenance | Comprehensive ESLint fixes across frontend and backend, orchestrated documentation link restorations, and added Vitest UI smoke testing. | [Log](docs/iterations/2026-07-08.md) |
| 78 | 2026-07-08 | Tranche 7 Execution: Premium UX & UI Polish | UI & UX | Refactored web frontend layouts into a unified SharedWorkspaceLayout with framer-motion micro-animations and a premium light mode aesthetic. | [Log](docs/iterations/2026-07-08.md#iteration-78-detail---2026-07-08) |

## Active Tranche Focus