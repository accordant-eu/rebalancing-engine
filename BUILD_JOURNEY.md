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


| Iteration | Date       | Goal                             | Scope                      | Actions taken                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Files changed                                                                                                                                                                                                                                                                          | Learnings                                                                                                                                                                                                                                     | Open questions                                                                                                                                                                          | Next step                                                                                                |
| :-------- | :--------- | :------------------------------- | :------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------- |
| 1         | 2026-04-29 | Setup Project Hygiene            | Phase 0: Init & Discovery  | Inspected repo, created `BUILD_JOURNEY.md`, `AGENTS.md`, and `.gitignore`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `BUILD_JOURNEY.md`, `AGENTS.md`, `.gitignore`, `README.md`                                                                                                                                                                                                                             | Repo is essentially empty with just one research doc. No existing stack to constrain future choices.                                                                                                                                          | What stack/language will be chosen?                                                                                                                                                     | Await PRD for Phase 1.                                                                                   |
| 2         | 2026-04-29 | PRD Planning                     | Phase 1: MVP Plan          | Digested PRD, created `docs/MVP_Implementation_Plan.md`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `docs/MVP_Implementation_Plan.md`, `BUILD_JOURNEY.md`                                                                                                                                                                                                                                  | PRD demands strict determinism, BIAN models, and strategy isolation. MVP focuses strictly on offline threshold rebalancing.                                                                                                                   | What is the target programming language for the engine?                                                                                                                                 | Await tech stack decision, then start Slice 1.                                                           |
| 3         | 2026-04-29 | Tech Stack & Scaffolding         | Slice 0                    | Selected TypeScript/Node.js stack. Added TS, Jest, Prettier configs. Set up basic smoke test. Updated `.gitignore` to ignore node_modules/dist/coverage.                                                                                                                                                                                                                                                                                                                                                                                                              | `package.json`, `tsconfig.json`, `jest.config.js`, `.prettierrc`, `.gitignore`, `tests/smoke.test.ts`, `src/core/index.ts`, `BUILD_JOURNEY.md`                                                                                                                                         | TS/Node.js is ideal for deterministic calculations, testability, and standard JSON fixture handling.                                                                                                                                          | None.                                                                                                                                                                                   | Proceed to Slice 1: Domain Fixture Foundation.                                                           |
| 4         | 2026-04-29 | Domain Fixture Foundation        | Slice 1                    | Created TypeScript interfaces for domain models and wrote JSON fixtures covering all MVP edge cases (on-target, drift breaches, positive cash, min trade size, missing prices, universe/sum errors).                                                                                                                                                                                                                                                                                                                                                                  | `src/models/domain.ts`, `tests/fixtures/scenarios.json`, `tests/fixtures.test.ts`, `BUILD_JOURNEY.md`                                                                                                                                                                                  | Found that standard `number` should suffice for the MVP phase, provided we don't do complex float manipulations. Documented this limitation.                                                                                                  | Should we add decimal.js later?                                                                                                                                                         | Proceed to Slice 2: Portfolio Valuation.                                                                 |
| 5         | 2026-04-29 | Portfolio Valuation              | Slice 2                    | Implemented `calculateValuation` and `calculateCurrentWeights`. Added unit tests verifying positive cash logic and missing price abort logic.                                                                                                                                                                                                                                                                                                                                                                                                                         | `src/core/valuation.ts`, `tests/valuation.test.ts`, `BUILD_JOURNEY.md`                                                                                                                                                                                                                 | Cash must be factored into total portfolio value to ensure weights are diluted accurately. Explicit error is thrown on missing prices.                                                                                                        | None.                                                                                                                                                                                   | Proceed to Slice 3: Target Allocation and Drift.                                                         |
| 6         | 2026-04-29 | Target Allocation and Drift      | Slice 3                    | Implemented `calculateDrift` and `validateTargetAllocation`. Added tests for out-of-band and out-of-universe scenarios.                                                                                                                                                                                                                                                                                                                                                                                                                                               | `src/core/drift.ts`, `tests/drift.test.ts`, `BUILD_JOURNEY.md`                                                                                                                                                                                                                         | Drift calculation explicitly checks and includes assets that are outside the model universe by treating their target weight as zero.                                                                                                          | None.                                                                                                                                                                                   | Proceed to Slice 4: Threshold Trigger Evaluation.                                                        |
| 7         | 2026-04-29 | Threshold Trigger                | Slice 4                    | Created `StrategyInterface` and `ThresholdStrategy`. Added unit tests showing trigger activates only when bands are breached.                                                                                                                                                                                                                                                                                                                                                                                                                                         | `src/models/domain.ts`, `src/strategy/threshold.ts`, `tests/threshold.test.ts`, `BUILD_JOURNEY.md`                                                                                                                                                                                     | Abstracting the strategy evaluation early keeps the core engine decoupled from specific threshold logic.                                                                                                                                      | None.                                                                                                                                                                                   | Proceed to Slice 5: Basic Trade Proposal Generation.                                                     |
| 8         | 2026-04-29 | Red-Team Audit                   | Phase 2: Audit             | Performed red-team audit of Slices 1-4. Fixed TSConfig `rootDir` issue, added `EPSILON` to handle float precision in drift thresholding, added lint/format scripts. Created formal audit report.                                                                                                                                                                                                                                                                                                                                                                      | `tsconfig.json`, `package.json`, `src/core/drift.ts`, `docs/audits/red-team-audit-current.md`, `BUILD_JOURNEY.md`                                                                                                                                                                      | Float arithmetic needs constant vigilance in JS/TS. Core logic holds up well to edge cases.                                                                                                                                                   | None.                                                                                                                                                                                   | Proceed to Slice 5: Basic Trade Proposal Generation.                                                     |
| 9         | 2026-04-30 | Test-Case Audit                  | Phase 2: Audit             | Performed focused test-case audit of Slices 1–4. Found 12 findings (1 High, 4 Medium, 5 Low, 2 Info). Fixed all High/Medium items: replaced tautological smoke test; added AAPL assertion to `holding_outside_universe`; added `multiple_assets_out_of_band` drift test; corrected fixture description; added `edge-cases.test.ts` covering `min_trade_size_issue`, `positive_cash` drift+trigger, cash-only portfolio, `validateTargetAllocation` edge cases, determinism ordering. Updated README with actual setup and test instructions. No product code changed. | `tests/smoke.test.ts`, `tests/drift.test.ts`, `tests/edge-cases.test.ts` (new), `tests/fixtures/scenarios.json`, `docs/audits/test-case-audit.md` (new), `README.md`, `BUILD_JOURNEY.md`                                                                                               | Smoke tests must exercise real imports to have value. Fixture descriptions must accurately reflect the math — GOOG was on-target in `multiple_assets_out_of_band`. Deferred gaps documented for Slices 5–10.                                  | Should we adopt `decimal.js` before Slice 5?                                                                                                                                            | Proceed to Slice 5: Basic Trade Proposal Generation.                                                     |
| 10        | 2026-05-02 | Basic Trade Proposal Generation  | Slice 5                    | Verified repository reality against docs, implemented deterministic full-reset proposal generation, added trade proposal tests, exported core modules, and updated README status.                                                                                                                                                                                                                                                                                                                                                                                     | `src/core/trades.ts`, `src/core/index.ts`, `tests/trades.test.ts`, `README.md`, `BUILD_JOURNEY.md`                                                                                                                                                                                     | Slice 5 can be implemented as pure math over existing valuation results; cash-aware routing and minimum trade suppression must remain separate Slice 6 concerns.                                                                              | Should `decimal.js` be introduced before constraint filtering or simulation?                                                                                                            | Proceed to Slice 6: Cash-Aware Adjustment and Minimum Trade Rules.                                       |
| 11        | 2026-05-02 | Cash-Aware Constraints           | Slice 6                    | Added structured proposal warnings, applied global minimum trade-size suppression, rejected negative cash during proposal generation, documented fixtures, and updated README status.                                                                                                                                                                                                                                                                                                                                                                                 | `src/models/domain.ts`, `src/core/trades.ts`, `tests/trades.test.ts`, `tests/fixtures/README.md`, `README.md`, `BUILD_JOURNEY.md`                                                                                                                                                      | Minimum trade constraints should not abort otherwise useful proposals; warnings provide the bridge to later simulation, explanation, and audit slices.                                                                                        | Should future policies support per-instrument minimum trade sizes?                                                                                                                      | Proceed to Slice 7: Post-Trade Simulation.                                                               |
| 12        | 2026-05-02 | Post-Trade Simulation            | Slice 7                    | Added exact trade replay simulation with post-trade holdings, valuation, weights, residual drift, sell-side turnover, oversell checks, and cash reconciliation checks.                                                                                                                                                                                                                                                                                                                                                                                                | `src/core/simulation.ts`, `src/core/index.ts`, `tests/simulation.test.ts`, `tests/smoke.test.ts`, `README.md`, `BUILD_JOURNEY.md`                                                                                                                                                      | Simulation exposes residual drift from suppressed trades, which keeps Slice 6 constraint decisions visible instead of hiding them in proposal generation.                                                                                     | Should future output include gross trade value separately from turnover?                                                                                                                | Proceed to Slice 8: Explanation Output.                                                                  |
| 13        | 2026-05-02 | Explanation Output               | Slice 8                    | Added deterministic explanation generation from trigger, proposal, warning, and simulation outputs, with tests for no-op, rebalance, and suppressed-trade residual drift cases.                                                                                                                                                                                                                                                                                                                                                                                       | `src/explanation/explanation.ts`, `src/explanation/index.ts`, `tests/explanation.test.ts`, `tests/smoke.test.ts`, `README.md`, `BUILD_JOURNEY.md`                                                                                                                                      | Explanation output should be assembled from already-computed facts to avoid contradictory financial rationale.                                                                                                                                | Should explanations later support localization or audience-specific wording?                                                                                                            | Proceed to Slice 9: Audit and Reproducibility Record.                                                    |
| 14        | 2026-05-02 | Audit and Reproducibility Record | Slice 9                    | Added audit record generation and stable JSON serialization capturing inputs, drift, trigger, proposal, simulation, and explanation outputs. Added replay tests.                                                                                                                                                                                                                                                                                                                                                                                                      | `src/audit/audit.ts`, `src/audit/index.ts`, `src/models/domain.ts`, `tests/audit.test.ts`, `tests/smoke.test.ts`, `README.md`, `BUILD_JOURNEY.md`                                                                                                                                      | Audit records should receive metadata from orchestration to preserve deterministic pure helpers and fixture replay.                                                                                                                           | Should event IDs later be content-addressed hashes?                                                                                                                                     | Proceed to Slice 10: Batch Scenario Runner / Test Harness.                                               |
| 15        | 2026-05-02 | Batch Scenario Runner            | Slice 10                   | Added an offline fixture runner and `npm run scenario:run` command that evaluates all scenarios into success/error JSON results with audit records for successful scenarios.                                                                                                                                                                                                                                                                                                                                                                                          | `src/runner/scenario-runner.ts`, `src/runner/index.ts`, `tests/scenario-runner.test.ts`, `tests/smoke.test.ts`, `package.json`, `README.md`, `BUILD_JOURNEY.md`                                                                                                                        | Batch output makes existing invalid fixtures useful as deterministic error-path checks instead of special cases that must be excluded.                                                                                                        | Should the runner later support expected-status manifests and output files?                                                                                                             | Proceed to Slice 11: Second Strategy Proof Point.                                                        |
| 16        | 2026-05-02 | Second Strategy Proof Point      | Slice 11                   | Added manual forced-rebalance strategy isolated to trigger logic and tests proving shared valuation, proposal, simulation, and explanation functions work unchanged.                                                                                                                                                                                                                                                                                                                                                                                                  | `src/strategy/manual.ts`, `src/strategy/index.ts`, `tests/manual-strategy.test.ts`, `tests/smoke.test.ts`, `README.md`, `BUILD_JOURNEY.md`                                                                                                                                             | Strategy extensibility can be proven without adding calendar/date policy decisions before the MVP requires them.                                                                                                                              | Should calendar scheduling be post-MVP or part of a later MVP extension?                                                                                                                | Proceed to Slice 12: MVP Hardening and Final Audit.                                                      |
| 17        | 2026-05-02 | MVP Hardening and Final Audit    | Slice 12                   | Added final MVP audit documentation, refreshed README status, reconciled build journey project context with the implemented repository, and recorded the decision to mark the offline fixture MVP complete.                                                                                                                                                                                                                                                                                                                                                           | `docs/audits/final-mvp-audit.md`, `README.md`, `BUILD_JOURNEY.md`                                                                                                                                                                                                                      | The MVP is complete for offline deterministic fixtures, but production readiness still requires decimal/rounding policy, CI, richer validation, and integration decisions.                                                                    | Which post-MVP hardening item should be prioritized first?                                                                                                                              | Begin post-MVP hardening.                                                                                |
| 18        | 2026-05-02 | Full-Chain Strategy Traceability | Planning and architecture  | Reviewed the Meta Paper, PRD, MVP plan, build journey, audits, README, fixtures, source, tests, runner, package config, git status, and recent commits. Classified strategy carry-forward from research to implementation. Created a full-chain traceability report, next-iteration PRD, and next-iteration MVP implementation plan. Recorded hybrid multi-strategy architecture and next-scope decisions.                                                                                                                                                            | `docs/strategy-traceability/full-chain-rebalancing-strategy-review.md`, `docs/prd/rebalancing-engine-next-iteration-prd.md`, `docs/plans/rebalancing-engine-next-iteration-mvp-plan.md`, `BUILD_JOURNEY.md`                                                                            | The Meta Paper taxonomy is five primary clusters, with cash-flow routing and boundary execution as cross-cutting design implications. Threshold and manual are implemented; calendar and boundary-target are the safest next strategy slices. | Calendar schedule semantics and boundary relative-band support need decisions before implementation.                                                                                    | Implement Slice 0/1 of the next-iteration plan: baseline lock and explicit strategy policy identifiers.  |
| 19        | 2026-05-02 | Multi-Strategy Next Iteration    | Next-iteration MVP         | Implemented policy-driven strategy selection, calendar due-date strategy, threshold boundary-target execution, mixed-strategy runner fixtures, strategy/execution metadata in audit output, documentation updates, and a next-iteration audit.                                                                                                                                                                                                                                                                                                                        | `src/models/domain.ts`, `src/core/evaluation.ts`, `src/core/trades.ts`, `src/strategy/calendar.ts`, `src/runner/scenario-runner.ts`, tests, fixtures, README, fixture README, `docs/audits/next-iteration-mvp-audit.md`, `BUILD_JOURNEY.md`                                            | Explicit strategy selection is now implemented; calendar is deterministic from input dates; boundary mode proves reduced-turnover execution without full optimal control.                                                                     | Should relative-boundary targeting, expected-status manifests, or decimal/rounding policy be next?                                                                                      | Harden runner manifests and decide decimal/rounding policy before broader strategy work.                 |
| 20        | 2026-05-02 | Complete Next-Iteration Slices   | Slice completion hardening | Added expected-status manifest validation to the scenario runner, added an invalid-strategy fixture, covered manifest success and mismatch behavior in tests, updated runner usage docs, refreshed the next-iteration audit, and recorded the final runner-manifest decision.                                                                                                                                                                                                                                                                                         | `src/runner/scenario-runner.ts`, `tests/fixtures/scenario-expectations.json`, `tests/fixtures/scenarios.json`, `tests/scenario-runner.test.ts`, `tests/fixtures.test.ts`, README, fixture README, `docs/audits/next-iteration-mvp-audit.md`, `BUILD_JOURNEY.md`                        | Separate expected-status manifests keep scenario inputs reusable while making CLI validation explicit. Unsupported strategy policies now have fixture-level and runner-level regression coverage.                                             | Decimal/rounding policy, relative-boundary targeting, richer cash-flow workflows, and live integrations remain post-MVP decisions.                                                      | Decide decimal/rounding policy before adding relative-boundary targeting or broader cash-flow workflows. |
| 21        | 2026-05-02 | Reconcile Slice Completion       | Documentation and tests    | Verified the original MVP and next-iteration MVP slice lists against implementation, removed stale future-scope references for already completed manifest/calendar coverage, added explicit next-plan completion evidence, and converted old edge-case TODO comments into executable assertions.                                                                                                                                                                                                                                                                      | `tests/edge-cases.test.ts`, `src/core/trades.ts`, README, final MVP audit, traceability report, next-iteration MVP plan, test-case audit, `BUILD_JOURNEY.md`                                                                                                                           | The active slice set is complete; remaining items are explicitly deferred post-MVP capabilities rather than unimplemented slices.                                                                                                             | Decimal/rounding policy, relative-boundary targeting, richer cash-flow workflows, and live integrations remain post-MVP decisions.                                                      | Decide decimal/rounding policy before adding new strategy breadth.                                       |
| 22        | 2026-05-02 | Refactoring Assessment           | Refactoring hardening      | Created a repository-aware refactoring assessment, added direct high-level evaluation characterization tests, and replaced switch-based strategy selection with an explicit registry of stateless strategies.                                                                                                                                                                                                                                                                                                                                                         | `docs/refactoring/refactoring-assessment.md`, `src/core/evaluation.ts`, `tests/evaluation.test.ts`, `BUILD_JOURNEY.md`                                                                                                                                                                 | The best near-term refactor is API/extension clarity, not financial semantics or new strategy breadth. Direct orchestration tests protect the public evaluation path.                                                                         | Decimal/rounding policy, strategy proposal hooks, schema validation, and CI remain deferred.                                                                                            | Decide decimal/rounding policy before adding broader monetary behavior.                                  |
| 23        | 2026-05-02 | Roadmap Synthesis                | Roadmap and planning       | Reviewed PRDs, plans, audits, CLI docs, README, build journey, fixtures, source, tests, package/config files, git status, and recent commits. Searched future-plan and deferred-scope language. Verified implementation state against code/tests/CLI. Created a consolidated roadmap, scheduled/recurring cash-flow PRD, and scheduled/recurring cash-flow MVP plan. Recorded roadmap and CLI exposure decisions.                                                                                                                                                     | `docs/roadmap/rebalancing-engine-roadmap.md`, `docs/prd/scheduled-recurring-cash-flow-prd.md`, `docs/plans/scheduled-recurring-cash-flow-mvp-plan.md`, `BUILD_JOURNEY.md`                                                                                                              | Scheduled/recurring cash-flow semantics are the best next offline domain increment because they extend implemented cash-flow foundations without requiring optimizer, tax, or production infrastructure decisions.                            | Schedule model location, valuation-date source, generated-event status, recurrence frequencies, and warning versus audit-only treatment remain open for Slice 1.                        | Implement Slice 0/1 of the scheduled cash-flow plan.                                                     |
| 24        | 2026-05-02 | Scheduled Cash Flows             | Offline domain increment   | Implemented scheduled and recurring cash-flow domain types, validation, expansion, valuation/proposal integration, warnings, explanation/audit output, CLI rendering/inspection, fixtures, expectation updates, and audit documentation.                                                                                                                                                                                                                                                                                                                              | `src/models/domain.ts`, `src/core/cash-flows.ts`, `src/core/evaluation.ts`, `src/core/trades.ts`, `src/core/valuation.ts`, `src/explanation/explanation.ts`, `src/audit/audit.ts`, `src/cli`, tests, fixtures, README, fixture README, PRD/plan/roadmap/audit docs, `BUILD_JOURNEY.md` | Scheduled flows can remain deterministic and auditable when evaluated from explicit date-only inputs and expanded into internal schedule-derived settled cash-flow records.                                                                   | Business-day calendars, holidays, payment initiation, custody movement, weekly/custom recurrence, production API, persistence, and optimizer-driven cash-flow planning remain deferred. | Consolidate user/developer documentation around the implemented CLI and architecture.                    |
| 25        | 2026-05-02 | Documentation Consolidation      | User/developer experience  | Created dedicated user, CLI reference, developer, strategy-extension, architecture, and examples docs; replaced README with a concise entry point; documented strategy extension rules, warnings/errors, input/output models, CLI behavior, fixtures, audit/explanation concepts, and safe extension expectations.                                                                                                                                                                                                                                                    | `README.md`, `docs/guides/user-guide.md`, `docs/cli/cli-reference.md`, `docs/guides/developer-guide.md`, `docs/guides/adding-rebalancing-strategies.md`, `docs/architecture/overview.md`, `docs/examples.md`, `BUILD_JOURNEY.md`                                                       | Separate guides are clearer than a large README and make CLI behavior, strategy extension, architecture, and examples easier to keep aligned with observed repository behavior.                                                               | Published JSON Schema, schema-only validation, CI workflow, API/UI/database design, and production integration docs remain deferred.                                                    | Run full validation, commit, merge to `main`, and push if branch state is safe.                          |
| 26        | 2026-05-02 | Independent Full-Chain Audit     | Audit                      | Performed 10-pass independent audit: research-to-implementation traceability, PRD/plan alignment, architecture, financial correctness, security/privacy, CLI, test quality, reliability, documentation/DX, and deferred scope. Verified all 26 fixture scenarios, boundary-mode cash invariant, month-end clamping, dedup semantics, and Decimal.js internalization. Identified 13 findings (2 High operational gaps, 4 Medium, 3 Low, 3 Info). No critical defects found. Created full-chain audit report with findings register, issue-ready backlog, and remediation sequence. | `docs/audits/independent-full-chain-audit.md`, `BUILD_JOURNEY.md`                                                                                                                                                                                                                      | Hardcoded creation timestamps in runner and CLI undermine audit-trail temporal integrity. Calendar Date.parse() timezone behavior needs a date-only validation guard. No CI remains the most operationally impactful gap. All deferred scope is correctly bounded with no accidental partial implementations. | H-01 (timestamps), H-02 (CI), M-01 (calendar timezone) are the top three remediation priorities. | Fix hardcoded timestamps (H-01), update roadmap count (H-03), add calendar date-only guard (M-01), add runner error handling (M-03), then add CI (H-02). |
| 27        | 2026-06-14 | Restructure Foundational Docs    | Documentation structure    | Restructured the `docs/` folder, moved historical/iterative PRDs/Plans into subdirectories, split the monolithic vision PRD into a concise `product-vision.md` and `engine-architecture.md`, archived the old vision, and established the "Live Agent Vision" as the current north star. Enforced BUILD_JOURNEY updating in AGENTS.md.                                                                                                                                                                                                                                                        | `docs/product-vision.md`, `docs/architecture/engine-architecture.md`, `docs/prd/original-vision-prd.md`, `README.md`, index files, `AGENTS.md`, `BUILD_JOURNEY.md`                                                                   | The "Live Agent Vision" clarifies the strict boundary between the deterministic pure-function engine and the live execution orchestrator.                                                                                     | None.                                                                                                                                                                                   | Address remaining backlog items or transition to Live Agent exploration.                                 |
| 28        | 2026-06-14 | Define Live Agent MVP Tranches   | Roadmap and planning       | Drafted the Live Agent v2.0 MVP tranches, outlining the path from the current offline calculation core through Dry Run, Paper Trading, and Production Hardening phases. Completely rewrote the core roadmap document to reflect this sequence.                                                                                                                                                                                                                                                                                          | `docs/roadmap/rebalancing-engine-roadmap.md`, `BUILD_JOURNEY.md`                                                                                                                                                                                                                                               | Tranching the live agent transition ensures the core engine remains deterministic while the orchestrator handles state, side effects, and async execution incrementally.                                                                                        | Should the orchestrator be a separate package/repository? Is Alpaca the confirmed target broker?                                                                                        | Proceed with Tranche 1 (Core Engine Readiness): CI, timestamp traceability, and cash flow realism.       |
| 29        | 2026-06-14 | Resolve Dependabot Vulnerability | Security                   | Resolved high and moderate severity vulnerabilities from dependabot caused by axios and brace-expansion. Added npm overrides to package.json, reinstalled dependencies, and verified successful execution of tests.                                                                                                                                                                                                                                                                                                             | `package.json`, `package-lock.json`, `BUILD_JOURNEY.md`                                                                                                                                                                                                                                                        | Forcing dependency resolutions via npm overrides is a viable short-term fix for unmaintained transitive dependencies from active SDKs like Alpaca.                                                                                              | Can we migrate to a modern, actively maintained SDK such as `alpaca-ts`?                                                                                                | Consider migrating away from `@alpacahq/alpaca-trade-api` for security.                  |
| 29        | 2026-06-14 | Core Engine Readiness (Tranche 1) | Offline domain increment   | Added `asOf` to `PriceSnapshot`, `WEEKLY` frequency to cash-flow recurrence, changed scheduled flows to `PENDING` to strictly serve as projection/planning without inflating actionable cash, and added a full GitHub Actions CI pipeline. | `src/models/domain.ts`, `src/core/cash-flows.ts`, `tests/evaluation.test.ts`, `tests/cli.test.ts`, `tests/fixtures/scenarios.json`, `.github/workflows/ci.yml`, `BUILD_JOURNEY.md` | Pending flows correctly exclude themselves from valuation cash while remaining visible in audit summaries. | None. | Proceed with Tranche 2 (Orchestrator Skeleton). |
| 30        | 2026-06-14 | Orchestrator Skeleton (Tranche 2) | Live agent transition      | Implemented `LiveStateManager` for streaming inputs, `Orchestrator` for continuous autonomous loop with debounce/cooldown logic, `DryRunExecutor` for `stdout` JSON pipeline output, and an `agent start` CLI. Added a suite of stateful temporal tests. | `src/orchestrator/state.ts`, `src/orchestrator/loop.ts`, `src/orchestrator/executor.ts`, `src/cli/agent.ts`, `src/cli/commands.ts`, `tests/orchestrator.test.ts`, `BUILD_JOURNEY.md` | Abstracting state from pure core evaluation simplifies testing temporal logic (cooldowns, price streaming). | None. | Proceed with Tranche 3 (Broker Integration). |
| 31        | 2026-06-14 | Broker Integration (Tranche 3) | Live agent transition      | Defined `BrokerAdapter` interface, implemented `AlpacaAdapter`, integrated it into a polling loop under the `--live` flag in `agent start`, implemented `CircuitBreaker` safety middleware with strict gross/count limits, and updated `BrokerExecutor` to asynchronously submit trades to the broker. | `src/broker/adapter.ts`, `src/broker/alpaca.ts`, `src/orchestrator/circuit-breaker.ts`, `src/orchestrator/executor.ts`, `src/cli/agent.ts`, `tests/circuit-breaker.test.ts`, `BUILD_JOURNEY.md` | Polling the live broker safely isolates API latency from the synchronous orchestration loop logic. | None. | Execute paper-trading tests or proceed to Tranche 4. |
| 32        | 2026-06-14 | Production Hardening (Tranche 4) | Live agent transition      | Formalized architectural choices into ADRs 0039 and 0040. Implemented `FileAuditStorage` for append-only JSONL persistent audit trails. Built `NotificationAdapter` with stdout implementation for structured alerting. Solved execution latency/reconciliation by adding `hasOpenOrders()` to `AlpacaAdapter` and pausing the orchestrator loop while broker trades are pending. | `docs/decisions/0039-use-jsonl-for-persistent-audit-trails.md`, `docs/decisions/0040-use-pause-strategy-for-reconciliation.md`, `src/audit/storage.ts`, `src/notifications/adapter.ts`, `src/cli/agent.ts`, `src/broker/adapter.ts`, `src/broker/alpaca.ts`, `src/orchestrator/loop.ts`, `BUILD_JOURNEY.md` | Pausing the orchestrator while trades settle is drastically safer than attempting to virtualize positions, guaranteeing pure evaluation on true ledger states. | None. | Validate full production trading lifecycle or mark Live Agent v2.0 complete. |
| 33        | 2026-06-14 | MVP Housekeeping & Sanity Check | Maintenance                | Fixed linting warnings (unused variables) across agent and strategy files. Added comprehensive unit tests for `FileAuditStorage`, `StdoutNotificationAdapter`, and `BrokerExecutor`, bumping coverage back above 81%. Rewrote `README.md` to reflect the completed Live Agent capabilities instead of describing the engine as purely offline. | `src/cli/agent.ts`, `src/core/trades.ts`, `src/strategy/manual.ts`, `tests/circuit-breaker.test.ts`, `tests/storage.test.ts`, `tests/notifications.test.ts`, `tests/executor.test.ts`, `README.md`, `docs/log.md`, `BUILD_JOURNEY.md` | Keeping the codebase pristine and the docs accurate immediately after a major pivot ensures the next feature wave starts on solid footing. | None. | Next major feature tranche (e.g., UI, TCO). |
| 34        | 2026-06-14 | Command Center Dashboard (Tranche 5) | UI & API MVP               | Converted repo to npm workspaces. Embedded an Express API within the `Orchestrator` on port 4444 to expose live state and audit trails. Initialized a React/Vite dashboard in `/web` with a premium dark-mode aesthetic to consume the API, proving the API-First M2M architecture. Drafted ADRs 0044 and 0045. | `package.json`, `src/cli/agent.ts`, `web/package.json`, `web/vite.config.ts`, `web/src/App.tsx`, `web/src/App.css`, `web/src/index.css`, `docs/decisions/0044...`, `docs/decisions/0045...`, `BUILD_JOURNEY.md` | Embedding the API inside the Node process provides zero-latency observability without prematurely committing to a heavy database. | None. | Tranche 6: Friction Optimization (TCO). |
| 35        | 2026-06-14 | Simulation Fidelity & Log Rotation | Maintenance                | Added 5MB size-based rotation to `FileAuditStorage` to cap disk usage, and intercepted the `postTradeState` in dry-run mode to apply back to the `LiveStateManager`, resolving infinite log spam while testing. Drafted ADR 0046. | `src/audit/storage.ts`, `src/cli/agent.ts`, `tests/storage.test.ts`, `docs/decisions/0046...`, `BUILD_JOURNEY.md` | Bounding log size guarantees system stability. Curing dry-run spam through accurate simulation state-reset allows for long-running reliable temporal testing. | None. | Continue with MVP tranches. |
| 36        | 2026-06-14 | Friction Optimization (Tranche 6) | Evaluation Enhancement     | Introduced `FrictionModel` interface (`FixedFeeModel`, `PercentageSlippageModel`). Implemented penalty function in `generateTradeProposal` using a simple margin constraint (`maxFrictionBps`) to act as a dynamic minimum trade size. Suppressed trades append `FRICTION_COST_EXCEEDED` warnings. Dashboard highlights friction warnings. Drafted ADR 0047. | `src/core/friction.ts`, `src/core/trades.ts`, `src/models/domain.ts`, `web/src/App.tsx`, `tests/friction.test.ts`, `docs/decisions/0047...`, `BUILD_JOURNEY.md` | Suppressing mathematically pure but financially disastrous micro-trades via TCO margins prevents wealth destruction at scale. | None. | Tranche 7: Multi-Portfolio Mock. |
| 37        | 2026-06-14 | Multi-Portfolio In-Memory Mock (Tranche 7) | Architecture Scale         | Refactored `LiveStateManager` to `MultiPortfolioStateManager`. Updated `Orchestrator.onTick` to execute synchronous rebalance evaluations for all registered portfolios. Updated `agent.ts` to load 5 concurrent scenarios. Updated `/web` UI to a two-level Fleet View (Heatmap Grid -> Details). Drafted ADR 0048. | `src/orchestrator/state.ts`, `src/orchestrator/loop.ts`, `src/cli/agent.ts`, `web/src/App.tsx`, `tests/orchestrator.test.ts`, `docs/decisions/0048...`, `BUILD_JOURNEY.md` | Proving the core loop scales asynchronously over a fleet of portfolios in-memory guarantees performance before migrating to a heavy SQL database. | None. | Tranche 8: SQLite Foundation. |
| 38        | 2026-06-14 | SQLite Data Persistence (Tranche 8) | Architecture Scale         | Replaced in-memory state tracking with embedded `better-sqlite3`. Refactored `LiveStateManager` into an interface and implemented `SqliteStateManager`. Built `agent seed` CLI tool. Migrated `agent start` loop to evaluate directly against the SQL database. Seeded 1000 synthetic portfolios successfully. Drafted ADR 0049. | `src/db/sqlite.ts`, `src/orchestrator/sqlite-state.ts`, `src/cli/seed.ts`, `src/cli/agent.ts`, `BUILD_JOURNEY.md` | `better-sqlite3` is synchronously fast enough to handle massive multi-portfolio looping natively inside Node without polluting orchestration logic with asynchronous Promises. | None. | Tranche 9: Orchestrator Fleet Simulation. |
| 39        | 2026-06-15 | SaaS Shell & Multi-Tenant Model Execution (Tranche 9) | Architecture Scale         | Transformed global state into a multi-tenant isolated architecture. Added `Tenant`, `ModelMandate`, and subscription logic to `domain.ts`. Updated SQLite schema with `Tenants`, `Models`, and linked `Portfolios`. Intercepted Express API with mock JWT `tenantId` extraction. Overhauled React frontend with Tenant Login, Models Tab, and Discretionary model assignment in Portfolio details. | `src/models/domain.ts`, `src/db/sqlite.ts`, `src/orchestrator/sqlite-state.ts`, `src/cli/seed.ts`, `src/cli/agent.ts`, `web/src/App.tsx`, `BUILD_JOURNEY.md` | Abstracting models separately from portfolios using a pub/sub subscription model prepares the system for scalable generic strategy execution. React frontend scales well for testing multi-tenant configurations. | None. | Tranche 10: Event-Driven Triggers & Core Logic Re-alignment. |
| 40        | 2026-06-15 | Event-Driven Orchestrator & Pub/Sub (Tranche 10) | Architecture Scale         | Added `EvaluationQueue` table, built reverse index `getPortfoliosAffectedByInstrument`, implemented pub/sub model cascading inside a SQLite transaction, and refactored orchestrator loop to pop from the queue instead of full-table scans. | `src/db/sqlite.ts`, `src/orchestrator/sqlite-state.ts`, `src/orchestrator/loop.ts`, `src/cli/agent.ts`, `BUILD_JOURNEY.md` | Event-driven dequeuing resolves the O(N) evaluation bottleneck across the fleet when central models update or prices stream. | SQLite in-memory mode investigation? | Tranche 11: B2B Broker Routing. |
| 41        | 2026-06-15 | UX Mandate Builder (Tranche B) | UI & API MVP | Implemented bespoke MandateBuilderForm with dynamic conditional archetype fields, updated SQLite schema to support archetype/constraints, and decoupled Models UI with react-hook-form. | `src/cli/agent.ts`, `src/db/sqlite.ts`, `web/src/App.tsx`, `web/src/components/MandateBuilderForm.tsx`, `web/src/types.ts` | Abstracting models separately from portfolios using a pub/sub subscription model prepares the system for scalable generic strategy execution. React frontend scales well for testing multi-tenant configurations. | None. | Tranche C (Core Optimizer). |

### Iteration 41 Detail — 2026-06-15

**Goal:** Implement Reusable Mandate Builder Form in React (Tranche B).

**Scope:** UI & API integration.

**Materials reviewed:** `src/models/domain.ts`, `docs/archetypes/static-weights-archetype.md`.

**Decisions made:**
1. Installed `react-hook-form` to cleanly manage the large, complex API-native mandate structures.
2. Created a dedicated `MandateBuilderForm` React component with dynamic conditional sections (e.g. Archetype selections, target allocations).
3. Exposed advanced `RebalancingPolicy` execution inputs, including the newly defined `driftUtilityConversionRate`, directly in the UI.
4. Added safe SQLite table alters to add `archetype`, `evaluationFrequency`, and `constraints` columns on startup to accommodate the extended `ModelMandate` payload.

**Files changed:**
- `src/cli/agent.ts`
- `src/db/sqlite.ts`
- `web/src/App.tsx`
- `web/src/components/MandateBuilderForm.tsx`
- `web/src/types.ts`
- `BUILD_JOURNEY.md`

**Open questions:**
- None.

**Recommended next step:** Proceed to Tranche C (Dynamic targeting or execution logic).

### Iteration 26 Detail — 2026-05-02

**Goal:** Perform an independent, evidence-based full-chain audit of the repository in its current state on the `feature/scheduled-recurring-cash-flows` branch.

**Scope:** 10 audit passes: research-to-implementation traceability, PRD/plan alignment, architecture, financial correctness, security/privacy, CLI, test quality, reliability, documentation/DX, and deferred scope.

**Repository status observed:** TypeScript/Node.js offline rebalancing engine. Branch `feature/scheduled-recurring-cash-flows` contains scheduled/recurring cash-flow implementation plus documentation consolidation as recent commits. 26 fixture scenarios; all 26 passing. No `.github/` directory. `dist/` present and gitignored. `scenario-expectations.json` manifest covers all 26 scenarios.

**Materials reviewed:** Meta-Paper Synthesis, PRD and Architecture Vision, MVP Plan, next-iteration PRD, scheduled cash-flow PRD/plan, roadmap, strategy traceability, all existing audits, domain model, all core/strategy/explanation/audit/CLI/runner modules, all test files, fixture manifests, package config, AGENTS.md, BUILD_JOURNEY.md.

**Key verifications performed:**
- Full-reset net-cash algebraic invariant holds by inspection of `generateTradeProposal`
- Boundary mode post-trade cash verified positive via three-asset test case
- Month-end clamping: 2026-01-31 monthly → 01-31, 02-28, 03-31, 04-30 (verified via test coverage)
- Dedup: `schedule:<id>:<date>` correctly prevents double-counting against explicit cashFlows
- `MAX_GENERATED_OCCURRENCES_PER_SCHEDULE = 1200` guard verified
- All 26 batch scenarios match expectations file; 5 error scenarios have correct `errorIncludes` text
- No network calls anywhere in codebase
- Audit inputs preserve original portfolioState; effective state used for calculations only

**Findings summary:** 13 findings total — 2 High (operational gaps: hardcoded timestamps, no CI), 1 High-documentation (stale roadmap count), 4 Medium, 3 Low, 3 Info. No critical defects.

**Files changed:** `docs/audits/independent-full-chain-audit.md` (new), `BUILD_JOURNEY.md`.

**Tests/checks run:** Audit only — no code changed, no tests modified. All existing checks verified passing before audit.

**Learnings:** The engine's mathematical correctness and determinism invariants are upheld throughout. The primary operational risk is the hardcoded audit timestamp pattern, which removes temporal traceability from all audit records. CI absence means the strong test suite only runs when explicitly invoked. The calendar `Date.parse()` timezone issue is the only financial-correctness risk and is contained to non-date-only input strings.

**Open questions from findings:** Should timestamps be injectable (test-friendly) or always live? Should CI be added on this branch or as a separate PR to main?

### Iteration 10 Detail — 2026-05-02

**Goal:** Resume from the Antigravity handoff, verify the repository against the documented MVP plan, and implement the next smallest validated MVP slice.

**Scope:** Slice 5 only: deterministic basic trade proposal generation using a naive full reset to target weights. Cash routing preference, minimum trade filtering, post-trade simulation, explanations, and audit records remain out of scope.

**Repository status observed:** TypeScript/Node.js project with Jest, TypeScript, ESLint, and Prettier scripts. Branch `main` was clean against `origin/main` before changes. No CI workflow files were present outside `node_modules`. Source implemented valuation, drift, and threshold trigger logic. Tests covered Slices 1–4 with 30 passing tests before this iteration.

**Documentation-versus-reality assessment:** `BUILD_JOURNEY.md`, README, red-team audit, and test-case audit all correctly identified Slice 5 as the next implementation step. README overstated current behavior by saying audit records were produced; audit records are not implemented and were clarified as deferred. `docs/MVP_Implementation_Plan.md` still contains early-snapshot language from before the TypeScript stack existed, so it is useful as a plan but not as current repository status.

**Selected slice:** Slice 5 — Basic Trade Proposal Generation.

**Actions taken:** Added `generateTradeProposal`, a pure deterministic full-reset proposal generator. It validates target allocation sums, computes target dollar values from current total portfolio value, emits sorted BUY/SELL trades, estimates quantities from supplied prices, sells out-of-universe holdings to zero target weight, buys target-only underweights when priced, rejects missing or non-positive prices when a trade is needed, and returns estimated post-trade cash. Exported core modules from `src/core/index.ts`.

**Files changed:** `src/core/trades.ts`, `src/core/index.ts`, `tests/trades.test.ts`, `README.md`, `BUILD_JOURNEY.md`.

**Tests/checks run:** `npm test -- --runInBand` passed (37 tests, 7 suites). `npx tsc --noEmit` passed. `npm run lint` passed. `npm run build` passed.

**Learnings:** Existing valuation results provide enough information to generate full-reset trades without introducing an engine orchestrator yet. The current `TradeProposal` model is adequate for Slice 5, but it is intentionally minimal and does not yet include trigger metadata, turnover, explanations, or audit context.

**Decisions made:** Keep Slice 5 using standard JavaScript `number` arithmetic to avoid adding a dependency before constraint and simulation requirements are known. This is provisional because Slice 6/7 will make rounding and residual behavior more important.

**Decisions deferred:** Decimal arithmetic adoption, trade rounding, minimum trade-size filtering, preferential cash routing, residual cash policy, turnover calculation, and post-trade simulation.

**Open questions:** Should minimum trade size apply globally only, or later support instrument/account-specific overrides? Should Slice 6 still perform full reset after filtering, or intentionally leave residual drift below minimum thresholds?

**Recommended next step:** Implement Slice 6: cash-aware adjustment and minimum trade rules, including tests for cash-first buy behavior and suppression of uneconomic trades in `min_trade_size_issue`.

### Iteration 18 Detail — 2026-05-02

**Goal:** Perform a full-chain traceability review from Meta Paper to PRD, MVP plan, implementation, tests, fixtures, audits, and documentation, then draft the next-iteration PRD and MVP plan for missing strategies.

**Scope:** Documentation, architecture analysis, strategy prioritization, and decision logging only. No missing strategies were implemented.

**Materials reviewed:** `AGENTS.md`, README, `BUILD_JOURNEY.md`, Meta Paper, PRD/Architecture/Vision document, MVP implementation plan, final MVP audit, red-team audit, test-case audit, source modules under `src/`, tests under `tests/`, fixtures, scenario runner, `package.json`, git status, and recent commits.

**Chain reviewed:** Research taxonomy -> PRD carry-forward -> MVP plan scope -> implementation reality -> gap and prioritization analysis.

**Strategies identified:** Calendar-based, threshold/tolerance-band and hybrid, transaction-cost-aware optimal control, tax-aware/direct-indexing, dynamic/regime-switching/ML, cash-flow routing, boundary execution target, factor/style calendar reconstitution, private-market denominator-effect handling, digital-asset extreme-volatility policy, manual forced rebalance, and no-rebalance/monitoring-only behavior.

**Strategies implemented:** Threshold/tolerance-band rebalancing, cash-aware positive-cash full-reset proposal behavior, minimum trade-size suppression, manual forced rebalance trigger, and threshold no-trigger monitoring behavior.

**Strategies missing or partial:** Calendar strategy is missing. Boundary-target execution is missing. Hybrid monitoring cadence is only structurally represented by batch execution. Cash-flow routing is partial and does not cover withdrawals, pending flows, or negative-cash funding. Transaction-cost-aware optimal control, tax-aware/direct-indexing, dynamic/regime/ML, factor-specific reconstitution, private-market handling, and digital-asset policy are not implemented.

**Architecture decision made:** Accepted for the next iteration: use a hybrid architecture with the existing common calculation core, pluggable strategy modules, explicit strategy identifiers, and a light orchestration/registry layer.

**Documents created/updated:** Created `docs/strategy-traceability/full-chain-rebalancing-strategy-review.md`, `docs/prd/rebalancing-engine-next-iteration-prd.md`, and `docs/plans/rebalancing-engine-next-iteration-mvp-plan.md`. Updated `BUILD_JOURNEY.md`.

**Decisions made:** Use hybrid multi-strategy architecture next. Prioritize calendar strategy and threshold boundary-target execution as the next missing strategy slices.

**Decisions deferred:** Calendar frequency/date semantics, whether calendar ignores drift permanently or only for the first slice, whether boundary targeting supports relative bands immediately, whether manual forced rebalance is a product-supported strategy, decimal arithmetic adoption, full optimizer design, tax-lot/direct-indexing design, dynamic/ML strategy design, and live integration architecture.

**Tests/checks run:** Documentation drafting stage completed after source/test inspection. Final validation for this iteration should run formatting and the existing test/build/scenario checks before committing.

**Learnings:** The repository should not claim generic multi-strategy support until policy-driven strategy selection exists. Manual forced rebalance proves module reuse, but it does not satisfy the PRD/MVP plan's calendar strategy carry-forward. Boundary-target execution is the smallest practical transaction-cost-aware increment; full no-trade-region optimization remains too large for the next slice.

**Recommended next step:** Implement next-iteration Slice 0 and Slice 1: lock current regression behavior, then add explicit strategy identifiers and backward-compatible policy schema support.

### Iteration 19 Detail — 2026-05-02

**Goal:** Implement `docs/plans/rebalancing-engine-next-iteration-mvp-plan.md` using the repository rules and the hybrid multi-strategy architecture selected in the traceability review.

**Scope:** Next-iteration MVP only: explicit strategy identifiers, policy-driven orchestration, calendar strategy, threshold boundary-target execution, mixed-strategy fixtures, explanation/audit metadata, docs, and validation. Full optimal control, tax-aware/direct-indexing, ML/regime logic, live integrations, UI, persistence, multi-currency, and production execution remain out of scope.

**Actions taken:** Added `strategyType`, `executionTargetMode`, and calendar policy fields. Added `evaluateRebalance` orchestration and strategy selection. Added `CalendarRebalanceStrategy`. Updated the runner to use orchestration instead of hard-coded threshold. Added boundary-target trade sizing for threshold policies. Added calendar and boundary fixtures. Extended audit output with strategy and execution target metadata. Updated README, fixture docs, and added next-iteration audit documentation.

**Files changed:** `src/models/domain.ts`, `src/core/evaluation.ts`, `src/core/index.ts`, `src/core/trades.ts`, `src/strategy/calendar.ts`, `src/strategy/index.ts`, `src/strategy/manual.ts`, `src/strategy/threshold.ts`, `src/explanation/explanation.ts`, `src/audit/audit.ts`, `src/runner/scenario-runner.ts`, tests, fixtures, README, fixture README, `docs/audits/next-iteration-mvp-audit.md`, and `BUILD_JOURNEY.md`.

**Strategies implemented:** Threshold remains default and supports full-reset and boundary target modes. Calendar strategy triggers from caller-supplied dates. Manual strategy remains selectable through orchestration. No-trigger monitoring behavior remains available when strategy conditions are not met.

**Strategies still missing or partial:** Full transaction-cost-aware no-trade-region optimization, tax-aware/direct-indexing, dynamic/regime/ML, factor-specific reconstitution, private-market denominator-effect handling, digital-asset policy, pending cash-flow routing, withdrawals, and negative-cash funding.

**Decisions made:** Default omitted strategy policy to threshold. Use caller-supplied calendar dates only. Limit boundary targeting to absolute tolerance bands for the next-iteration MVP.

**Decisions deferred:** Relative-boundary targeting, frequency-derived next dates, business-day/holiday calendars, manual actor/request metadata, strategy-specific proposal hooks beyond boundary mode, decimal arithmetic, and production integration architecture.

**Tests/checks run:** Baseline tests passed before implementation. After implementation, Jest passed with 69 tests across 13 suites before documentation finalization. Final validation should include tests, type-check, lint, build, scenario runner, expected-status manifest validation, format, and diff whitespace checks before commit.

**Learnings:** The light orchestration layer removes hard-coded strategy selection without disturbing the core calculation functions. Calendar strategy is straightforward when date generation is kept outside the core. Boundary-target mode lowers turnover and leaves intentional residual drift inside tolerance, which makes explanation and audit metadata important.

**Recommended next step:** Decide decimal/rounding policy before implementing relative-boundary targeting or broader cash-flow workflows.

### Iteration 20 Detail — 2026-05-02

**Goal:** Finish the remaining next-iteration MVP plan hardening item so all documented slices, including optional expected-status runner validation, are complete.

**Scope:** Runner and fixture regression hardening only. No new rebalancing strategy behavior, optimizer logic, tax logic, live integrations, UI, persistence, or execution routing.

**Actions taken:** Added optional expected-status manifest loading and validation to the scenario runner. Added `invalid_strategy` as a deterministic per-scenario error fixture. Added `scenario-expectations.json` covering all 12 scenarios. Added tests for successful manifest validation and mismatch reporting. Updated README, fixture docs, and the next-iteration audit to include manifest validation.

**Files changed:** `src/runner/scenario-runner.ts`, `tests/fixtures/scenario-expectations.json`, `tests/fixtures/scenarios.json`, `tests/scenario-runner.test.ts`, `tests/fixtures.test.ts`, `README.md`, `tests/fixtures/README.md`, `docs/audits/next-iteration-mvp-audit.md`, and `BUILD_JOURNEY.md`.

**Strategies implemented:** No new strategy behavior was added in this iteration. Threshold, calendar, manual, no-trigger monitoring, and boundary-target threshold execution remain the implemented next-iteration strategy set.

**Strategies still missing or partial:** Full transaction-cost-aware no-trade-region optimization, tax-aware/direct-indexing, dynamic/regime/ML, factor-specific reconstitution, private-market denominator-effect handling, digital-asset policy, pending cash-flow routing, withdrawals, negative-cash funding, and relative-boundary targeting remain outside the next-iteration MVP.

**Decisions made:** Use a separate expected-status runner manifest instead of embedding expected results in scenario input fixtures.

**Decisions deferred:** Decimal arithmetic, trade rounding, relative-boundary targeting, frequency-derived calendar dates, business-day/holiday calendars, richer cash-flow semantics, full optimizer design, tax-lot/direct-indexing design, dynamic/ML strategy design, and live integration architecture.

**Tests/checks run:** `npm run format` passed. `npm test -- --runInBand` passed with 69 tests across 13 suites. `npx tsc --noEmit` passed. `npm run lint` passed. `npm run build` passed. `npm run scenario:run` passed with nine successful scenario audit records and three expected per-scenario errors. `node dist/runner/scenario-runner.js tests/fixtures/scenarios.json tests/fixtures/scenario-expectations.json` passed with 12 checked scenarios and zero mismatches. `git diff --check` passed.

**Learnings:** Keeping expected statuses outside the scenario input file preserves fixture readability and makes the runner more useful as a CLI regression tool. The unsupported-strategy path is now covered as an executable fixture instead of only a unit-level behavior.

**Recommended next step:** Decide decimal/rounding policy, then choose whether the next implementation slice should be relative-boundary targeting or richer cash-flow workflows.

### Iteration 21 Detail — 2026-05-02

**Goal:** Proceed until the full set of slices defined in the MVP approach is implemented, then verify that repository documentation and tests no longer describe completed slice work as future work.

**Scope:** Slice-completion reconciliation across the original MVP plan and the next-iteration MVP plan. This included documentation cleanup and additional assertions for previously documented edge-case TODOs. No deferred post-MVP strategies or production integrations were added.

**Actions taken:** Confirmed the original MVP slices 0-12 and next-iteration slices 0-8 are implemented for the offline deterministic fixture scope. Added explicit completion evidence to the next-iteration MVP plan. Updated README, final MVP audit, traceability report, and test-case audit language that still referred to expected-status manifests, calendar strategy support, or minimum-trade enforcement as future work. Converted old edge-case TODO comments into executable assertions for minimum-trade suppression, cash-funded buy-only proposals, and on-target no-trade proposals. Updated the trade proposal comment to describe current full-reset, boundary, and minimum-trade behavior.

**Files changed:** `tests/edge-cases.test.ts`, `src/core/trades.ts`, `README.md`, `docs/audits/final-mvp-audit.md`, `docs/audits/test-case-audit.md`, `docs/strategy-traceability/full-chain-rebalancing-strategy-review.md`, `docs/plans/rebalancing-engine-next-iteration-mvp-plan.md`, and `BUILD_JOURNEY.md`.

**Strategies implemented:** No new strategy behavior was added in this iteration. The implemented slice set remains threshold/tolerance-band, manual forced rebalance, calendar due-date, no-trigger monitoring, and threshold boundary-target execution.

**Strategies still missing or partial:** Full transaction-cost-aware no-trade-region optimization, tax-aware/direct-indexing, dynamic/regime/ML, factor-specific reconstitution, private-market denominator-effect handling, digital-asset policy, pending cash-flow routing, withdrawals, negative-cash funding, and relative-boundary targeting remain outside the implemented MVP slice set.

**Decisions made:** Treat the original MVP and next-iteration MVP slice sets as complete for offline deterministic fixtures. Treat the remaining strategy breadth and production-readiness items as post-MVP work requiring separate scope and decisions.

**Decisions deferred:** Decimal arithmetic, trade rounding, relative-boundary targeting, frequency-derived calendar dates, business-day/holiday calendars, richer cash-flow semantics, full optimizer design, tax-lot/direct-indexing design, dynamic/ML strategy design, live integration architecture, API design, UI, database persistence, and CI workflow design.

**Tests/checks run:** `npm run format` passed. `npm test -- --runInBand` passed with 72 tests across 13 suites. `npx tsc --noEmit` passed. `npm run lint` passed. `npm run build` passed. `npm run scenario:run` passed with nine successful scenario audit records and three expected per-scenario errors. `node dist/runner/scenario-runner.js tests/fixtures/scenarios.json tests/fixtures/scenario-expectations.json` passed with 12 checked scenarios and zero mismatches. `git diff --check` passed.

**Learnings:** The implementation had already completed the active slices, but historical docs and TODO comments created ambiguity. Keeping the plan as an implementation artifact with explicit completion evidence makes the boundary between MVP slices and post-MVP backlog clearer.

**Recommended next step:** Decide decimal/rounding policy before adding new strategy breadth such as relative-boundary targeting or richer cash-flow workflows.

### Iteration 22 Detail — 2026-05-02

**Goal:** Perform a repository-aware refactoring review and implement only safe, high-value behavior-preserving refactoring.

**Scope:** Refactoring assessment, public orchestration characterization, and strategy selection clarity. No new rebalancing strategies, financial semantics, live integrations, UI, database persistence, or production execution flows were added.

**Materials reviewed:** `AGENTS.md`, `BUILD_JOURNEY.md`, README, PRD/architecture docs, MVP and next-iteration plans, strategy traceability report, audit reports, fixture docs, source modules, tests, fixtures, package/config files, git status, and recent commits.

**Refactoring findings:** The repository is healthy for offline deterministic fixtures. Highest-priority friction was that the happy-path `evaluateRebalance` API lacked direct characterization tests. Medium-priority friction was that strategy selection was switch-based and supported identifiers were not directly discoverable. Larger financial, schema, and strategy-extension changes remain deferred because they would change semantics or add feature scope.

**Decisions made:** Use a registry of stateless strategy instances for selection, expose supported strategy identifiers, and keep this pass behavior-preserving. Defer decimal/rounding migration and strategy proposal hooks.

**Refactors implemented:** Added `supportedStrategyTypes`, moved strategy selection to an explicit registry, kept unsupported strategy errors explicit, and added high-level evaluation tests covering threshold default behavior, calendar no-trigger metadata, supported strategy listing, and unsupported strategy rejection.

**Files changed:** `docs/refactoring/refactoring-assessment.md`, `src/core/evaluation.ts`, `tests/evaluation.test.ts`, `BUILD_JOURNEY.md`.

**Tests/checks run:** Baseline before code changes: `npm test -- --runInBand` passed with 72 tests across 13 suites; `npx tsc --noEmit` passed; `npm run lint` passed. Focused after code changes: `npm test -- --runInBand tests/evaluation.test.ts` passed with 4 tests; `npx tsc --noEmit` passed; `npm run lint` passed. Final validation should rerun the full gate before commit.

**Results:** Public orchestration behavior is now directly protected, and supported strategy identifiers are discoverable without changing financial outputs.

**Learnings:** The current architecture does not need broader abstraction yet. A registry improves extension clarity while keeping strategy proposal hooks deferred until a concrete non-threshold proposal behavior appears.

**Decisions deferred:** Decimal arithmetic, trade rounding, strategy proposal hooks, relative-boundary targeting, richer cash-flow semantics, fixture schema validation, price timestamp/staleness policy, CI workflow, API design, UI, database persistence, live integrations, and production execution routing.

**Open questions:** Should the next hardening slice decide decimal/rounding policy, add result-contract documentation, or introduce CI?

**Recommended next step:** Decide decimal/rounding policy before adding broader monetary behavior or additional strategy breadth.

### Iteration 23 Detail — 2026-05-02

**Goal:** Address the latest project feedback by synthesizing a repository-grounded roadmap across PRDs, plans, audits, docs, implementation status, fixtures, tests, and CLI behavior.

**Scope:** Roadmap and product planning only. No engine behavior, fixture schema, CLI command behavior, API, UI, database, persistence, optimizer, tax, banking, custody, or execution integration was implemented.

**Materials reviewed:** `AGENTS.md`, README, `BUILD_JOURNEY.md`, all PRDs under `docs/prd`, all plans under `docs/plans`, audits under `docs/audits`, CLI design/audit docs, strategy traceability and refactoring docs, original PRD/architecture and meta-paper docs, fixture documentation, source modules under `src`, tests under `tests`, fixture manifests, CLI implementation, runner implementation, package/config files, git status, and recent commits.

**Future-plan terms searched:** `future`, `future plan`, `future work`, `deferred`, `limitation`, `limitations`, `next step`, `next steps`, `roadmap`, `post-MVP`, `post MVP`, `out of scope`, `open question`, `open questions`, `TODO`, `TBD`, `not implemented`, `not yet`, `later`, `phase`, `productionization`, `API`, `UI`, `database`, `persistence`, `optimizer`, `tax`, `cash flow`, `cash-flow`, `recurring`, and `scheduled`.

**Current-state verification:** Verified implemented threshold/manual/calendar strategies, full-reset and boundary proposal behavior, decimal-backed numeric policy, explicit settled/pending offline cash flows, generic tax-lot allocation metadata, audit/explanation output, scenario runner, fixtures, expected-status manifest validation, and CLI commands. Verified scheduled/recurring cash-flow semantics, full optimizer, jurisdiction-specific tax handling, API, UI, database, persistence, live market data, banking/custody integration, and execution integration are not implemented.

**Roadmap items identified:** Scheduled/recurring cash-flow semantics, cash-flow terminology, optimizer prerequisites, tax advice boundaries, tax-lot primitive extensions, API, UI, database/persistence, live market data, banking/custody, execution integration, CLI expansion, strategy proposal hooks, audit/reproducibility hardening, fixture/schema validation, CI, performance/scalability, security/privacy, and compliance/governance.

**Recommended next increment:** Scheduled/recurring cash-flow semantics, starting with baseline regression and terminology/decision lock. This is preferred because it extends current cash-flow foundations, is deterministic and offline, fits the architecture, can be tested with synthetic fixtures, and can be exposed through the existing CLI.

**Decisions made:** Prioritize scheduled/recurring cash-flow semantics next. Require every future engine capability to include CLI exposure or an explicit documented non-exposure decision.

**Decisions deferred:** Productionization implementation, full optimizer, jurisdiction-specific tax logic, tax advice, API/UI/database/persistence/live integrations, banking/custody/execution integrations, exact schedule data-model placement, valuation-date source, generated-event status semantics, recurrence frequency subset, and warning versus audit-only treatment for future excluded flows.

**Documents created/updated:** Created `docs/roadmap/rebalancing-engine-roadmap.md`, `docs/prd/scheduled-recurring-cash-flow-prd.md`, and `docs/plans/scheduled-recurring-cash-flow-mvp-plan.md`. Updated `BUILD_JOURNEY.md`.

**CLI implications:** The roadmap and PRD state that scheduled/recurring cash-flow implementation must update `rebalance validate`, `rebalance run`, `rebalance batch`, `rebalance inspect`, help text, examples, JSON/pretty/summary output, CLI tests, README, and CLI documentation. Schedule inputs should remain file-based by default to preserve auditability.

**Tests/checks run:** Documentation drafting stage completed after source/test/CLI inspection. Final validation for this iteration should run formatting/check commands before commit.

**Learnings:** The latest feedback is consistent with repository evidence. The project should continue prioritizing offline domain semantics before production infrastructure. The CLI is now the operational boundary and must remain aligned with every future engine increment.

**Recommended next step:** Implement Slice 0 and Slice 1 from `docs/plans/scheduled-recurring-cash-flow-mvp-plan.md`: run the baseline regression gate, then lock cash-flow terminology, date source, schedule model location, generated-event status, recurrence subset, and CLI acceptance rules before code changes.

### Iteration 24 Detail — 2026-05-02

**Goal:** Implement scheduled/recurring cash-flow semantics as the next offline deterministic domain increment.

**Baseline verification before changes:** On branch `main`, with a clean working tree, `npm test` passed with 123 tests across 16 suites; `npx tsc --noEmit` passed; `npm run lint` passed; `npm run build` passed; `npm run scenario:run` passed; `node dist/runner/scenario-runner.js tests/fixtures/scenarios.json tests/fixtures/scenario-expectations.json` passed with 18 expected scenarios; `npm run cli -- inspect strategies` passed; `npm run cli -- validate --scenario tests/fixtures/scenarios.json --scenario-id on_target` passed.

**Branch:** Created `feature/scheduled-recurring-cash-flows` from `main` before implementation.

**Implemented scope:** Domain model, validation, schedule expansion, engine integration, warnings, explanation, audit output, synthetic fixtures, runner expectations, CLI behavior, README, CLI docs, PRD, plan, roadmap, fixture docs, and scheduled-flow audit.

**Out of scope preserved:** Banking/payment initiation, custody cash movement, execution integration, API, UI, database, persistence, live market data, tax advice, jurisdiction-specific tax handling, full optimizer, business-day calendars, holiday calendars, weekly/custom recurrence, and contribution/withdrawal amount recommendations.

**Validation during implementation:** Focused tests passed with `npm test -- --runInBand tests/cash-flows.test.ts tests/evaluation.test.ts`; expanded focused suite passed with `npm test -- --runInBand tests/cash-flows.test.ts tests/evaluation.test.ts tests/scenario-runner.test.ts tests/fixtures.test.ts tests/cli.test.ts`.

**Final validation:** `npm test` passed with 138 tests across 17 suites; `npx tsc --noEmit` passed; `npm run lint` passed; `npm run build` passed; `npm run scenario:run` passed; expected-status validation passed with 26 checked scenarios; CLI smoke commands passed for scheduled validation, recurring-withdrawal JSON run, batch expectations, and scenario inspection.

**Recommended next step:** Run final full validation, commit focused changes, and push the feature branch if all gates pass.

### Iteration 25 Detail — 2026-05-02

**Goal:** Create comprehensive user and developer documentation so a new developer, product reviewer, or technical stakeholder can understand and use the engine without reverse-engineering the code.

**Scope:** Documentation and developer experience. No new rebalancing strategy, financial behavior, optimizer, API, UI, database, live integration, custody/payment/execution flow, or production persistence was added.

**Materials reviewed:** README, `BUILD_JOURNEY.md`, `AGENTS.md`, PRDs under `docs/prd`, plans under `docs/plans`, roadmap docs, CLI design/decision/audit docs, audits, strategy traceability docs, refactoring assessment, fixture README, source modules under `src`, domain models, core/strategy/explanation/audit/CLI/runner modules, tests, fixture manifests, package scripts, git status, and current branch.

**Documentation created or updated:** Replaced README with a concise entry point. Added `docs/guides/user-guide.md`, `docs/cli/cli-reference.md`, `docs/guides/developer-guide.md`, `docs/guides/adding-rebalancing-strategies.md`, `docs/architecture/overview.md`, and `docs/examples.md`. Updated this build journey with corrected current-state summary, a documentation structure decision, and iteration records.

**Small code/test/fixture changes:** None. The work intentionally stayed documentation-only after confirming existing CLI and strategy discovery behavior already supports the documented workflows.

**Decision made:** Consolidate user/developer docs around observed behavior. README remains concise; detailed material lives in dedicated guides and references.

**Options considered:** Expand README as the primary documentation surface; create dedicated guides and keep README concise; add generated TypeScript docs. Dedicated guides were selected because the project needs workflow, CLI, architecture, strategy-extension, examples, and decision-discipline documentation that would make README too large.

**Decisions deferred:** Published JSON Schema, schema-only validation, generated API/type documentation, CI workflow, production API/UI/database docs, live integration docs, optimizer design docs beyond the existing deferral, and a dedicated manual-strategy fixture.

**Examples validated:** CLI help, `inspect scenarios`, `inspect strategies`, `inspect policies`, `validate --scenario ... --scenario-id on_target`, threshold boundary pretty run, scheduled deposit pretty run, recurring monthly JSON run, strict pending-cash-flow warning behavior, JSON output to file, batch expected-status validation, and per-scenario batch output directory were executed successfully. The strict warning command intentionally returned exit code `1`.

**Commands run:** Repository discovery commands, source/doc/test inspection commands, `npm run format`, focused `npx prettier --write` on edited docs, `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npm run scenario:run`, `node dist/runner/scenario-runner.js tests/fixtures/scenarios.json tests/fixtures/scenario-expectations.json`, `npm run cli -- --help`, `npm run cli -- inspect scenarios --scenarios tests/fixtures/scenarios.json`, `npm run cli -- inspect strategies`, `npm run cli -- inspect policies --format json`, `npm run cli -- validate --scenario tests/fixtures/scenarios.json --scenario-id on_target`, `npm run cli -- run --scenario tests/fixtures/scenarios.json --scenario-id threshold_boundary_target --format pretty`, `npm run cli -- run --scenario tests/fixtures/scenarios.json --scenario-id scheduled_deposit_due --format pretty`, `npm run cli -- run --scenario tests/fixtures/scenarios.json --scenario-id recurring_monthly_contribution --format json`, `npm run cli -- validate --scenario tests/fixtures/scenarios.json --scenario-id pending_cash_flow --strict`, `npm run cli -- run --scenario tests/fixtures/scenarios.json --scenario-id one_asset_out_of_band --format json --output /private/tmp/rebalancing-engine-doc-example.json`, `npm run cli -- batch --scenarios tests/fixtures/scenarios.json --expectations tests/fixtures/scenario-expectations.json`, `npm run cli -- batch --scenarios tests/fixtures/scenarios.json --expectations tests/fixtures/scenario-expectations.json --output-dir /private/tmp/rebalancing-engine-batch-example --force`, and `git diff --check`.

**Results:** All validation commands passed. `npm test` passed with 138 tests across 17 suites. TypeScript, lint, build, scenario runner, expected-status validation, CLI help, documented CLI examples, and whitespace checks passed.

**Learnings:** The implementation is already discoverable through `inspect strategies` and policy inspection, so documentation can require CLI exposure for new capabilities without additional code. The current fixture set covers calendar scenarios but not a dedicated manual CLI example, so examples document manual as implemented/tested without inventing a fixture-based command.

**Recommended next step:** Run full validation, commit the documentation pass, merge to `main`, and push if the merge is clean.

## 6. Scope of Work

### In Scope for This Initialization

- Repository discovery.
- Documentation scaffolding.
- Generic development rules.
- Basic project hygiene.
- Non-invasive tooling review.
- Identification of gaps.

### Out of Scope for This Initialization

- Implementing rebalancing logic.
- Choosing final architecture.
- Designing final data model.
- Introducing major dependencies.
- Creating production APIs.
- Building execution/integration layers.
- Making investment methodology decisions.

## 7. Learnings and Observations

- The repository is completely unopinionated at this stage. It contains one major markdown document (`Portfolio Rebalancing Meta-Paper Synthesis.md`) which suggests significant background research has been done on rebalancing, but no code has been written.
- Because there is no existing code, there are no constraints on the future technology choices.
- Any tooling introduced at this stage should be language-agnostic (like simple git ignores and markdown docs).

## 8. Open Questions (Pending PRD)

- What is the intended implementation stack (language, framework, runtime)?
- Is this a library, service, application, or platform component?
- What are the first MVP workflows?
- What data sources are assumed?
- What level of auditability is required?
- Will execution integration be in scope?
- What test fixtures or sample portfolios are available?
- What regulatory/compliance constraints matter?
- What performance/scalability expectations exist?

## 9. Proposed Future Work Plan (Provisional)

- **Phase 0:** Repository initialization and discovery (Current).
- **Phase 1:** PRD ingestion and requirement extraction.
- **Phase 2:** MVP scope confirmation.
- **Phase 3:** Domain model and test fixture design.
- **Phase 4:** Offline calculation prototype.
- **Phase 5:** Trade proposal prototype.
- **Phase 6:** Explainability, auditability, and review workflow.
- **Phase 7:** Second-strategy extensibility proof point.

## 10. Best-Practice Rules Initialized

- Generic AI-assisted development rules have been initialized in `AGENTS.md`. These cover Repository Stewardship, Decision Discipline, Implementation Discipline, Testing, Documentation, Security, Data Integrity, Dependency Hygiene, Tooling, and Agent Behavior.

## 11. PRD Ingestion Checklist

When the PRD / Architecture document is provided, the agent should complete the following checklist:

- [ ] Extract product goals.
- [ ] Extract MVP scope.
- [ ] Extract non-goals.
- [ ] Extract user roles.
- [ ] Extract workflows.
- [ ] Extract domain entities.
- [ ] Extract shared data structures.
- [ ] Extract common functions.
- [ ] Extract strategy-specific modules.
- [ ] Extract non-functional requirements.
- [ ] Extract auditability and explainability requirements.
- [ ] Extract testing requirements.
- [ ] Identify decisions already made by the PRD.
- [ ] Identify open questions.
- [ ] Convert requirements into implementation phases.
- [ ] Convert MVP scope into epics and tasks.
- [ ] Identify proof points for each cycle.

### Iteration 26 Detail — Audit Remediation

**Goal:** Address findings from the independent full-chain audit, improve documentation accuracy, and add automated CI.

**Scope:** Code fixes for timestamps and calendar validation, runner error handling, roadmap update, and GitHub Actions CI workflow.

**Decisions Made:**
- Inject `createdAt` timestamps instead of hardcoding `RUNNER_CREATED_AT` and `CLI_CREATED_AT` (H-01).
- Add ISO-date validation guard to `CalendarRebalanceStrategy` to prevent timezone-related bugs from `Date.parse` (M-01).
- Add graceful error handling for missing/invalid fixture files in the scenario runner (M-03).
- Update the roadmap scenario count from 18 to 26 (H-03).
- Implement a GitHub Actions workflow for automated CI checks on push/PR (H-02).

**Validation:**
- Local tests pass `npm test`, `npx tsc --noEmit`, `npm run lint`.
- GitHub Actions CI workflow created and ready to be triggered.

### Iteration 27 Detail — Final Audit Remediation

**Goal:** Complete the remaining low and medium-severity findings from the independent full-chain audit.

**Scope:** Code refactoring for module cohesion, package versioning, documentation updates for known limitations, and GitHub issue templates.

**Decisions Made:**
- Move `buildCashFlowProposalWarnings` and `buildCashFlowScheduleProposalWarnings` from `trades.ts` to `explanation/warnings.ts` to improve module cohesion (L-03).
- Change package version to `0.9.0` to clarify pre-production status (M-04).
- Document CLI path traversal absence as a known limitation for programmatic wrappers (M-05).
- Update `final-mvp-audit.md` to reflect that Decimal.js and Calendar strategy support are now implemented (I-01).
- Add standard GitHub issue templates for bug reports and feature requests (I-02).
- Add a note in the developer guide that `npm run build` is required to avoid running stale CLI artifacts (I-03).
- Finding L-02 (`roundAuditNumber` fragility) was intentionally deferred until new output fields are added, per the audit recommendation.

**Validation:**
- Local tests pass `npm test`, `npx tsc --noEmit`.

### Iteration 28 Detail — Open Questions Review and Live-Agent Vision

**Goal:** Resolve the four open questions from the roadmap and establish a directional architecture vision based on owner feedback.

**Scope:** Decision-making and documentation only. No code changes, no test changes, no fixture changes.

**Materials reviewed:** README, `BUILD_JOURNEY.md`, roadmap, architecture overview, production-boundary PRD, current docs hierarchy, source modules, and git status.

**Open questions resolved:**

1. **Weekly/custom recurrence:** Weekly recurrence should be added — the owner uses a broker with weekly contributions. Custom intervals remain deferred until a concrete need appears.

2. **Schema-only validation:** Deferred. Engine-path validation already terminates early on structural errors, so the performance profile is effectively identical to a schema-only check. Revisit only when external tooling integration creates a concrete need.

3. **Scheduled cash-flow warnings → projection only:** The engine should not make assumptions about what happened outside its visibility boundary. If the input says cash is X, that is what the engine uses. Scheduled flows are valuable for simulation/planning but should not inflate available cash for actionable rebalancing recommendations. This is a behavioral change from the current implementation where due scheduled flows are expanded into available cash.

4. **Price timestamps:** Add optional `asOf` timestamp on prices for audit traceability. Staleness/freshness enforcement belongs in the orchestrator, not the engine. In the live-agent model, prices are streaming and the orchestrator detects stale feeds.

**Vision established:**

The project direction is toward a live autonomous agent connected to a real-time broker (likely Alpaca), not a permanently offline module. The engine's core calculation logic (valuation, drift, strategy, trade proposals) remains pure and stateless. A future orchestration/agent layer would wrap it with:
- Real-time price feed management
- Live position and cash sync from broker
- Continuous trigger evaluation with debounce/cooldown
- Order execution, fill monitoring, and reconciliation
- Safety controls (kill switch, max trades per period, rate limiting)
- Persistent audit trail

The offline CLI and fixtures remain the development and regression interface.

**Documentation created:**
- `docs/architecture/live-agent-vision.md` — directional vision for the live-agent operating model.

**Documentation updated:**
- `BUILD_JOURNEY.md` — six new decisions in the log table; detailed decision records; this iteration entry.
- `docs/roadmap/rebalancing-engine-roadmap.md` — open questions resolved; next steps updated.

**Decisions made:**

### Iteration 27 Detail — 2026-06-14

**Goal:** Consolidate foundational documentation and enforce AI agent rules regarding project journals.

**Scope:** Documentation only. Restructured `docs/` and updated `AGENTS.md`.

**Materials reviewed:** `README.md`, all docs in `docs/`, `AGENTS.md`, and `BUILD_JOURNEY.md`.

**Decisions made:**
1. Split the massive PRD/Vision document into a concise `product-vision.md` and a core `engine-architecture.md`.
2. Move historical documents (MVP plans, PRDs) into `docs/plans` and `docs/prd/`.
3. Establish the "Live Agent Vision" as the true north star moving forward.
4. Update `AGENTS.md` to explicitly require AI agents to update `BUILD_JOURNEY.md` before committing changes.

**Documentation created:**
- `docs/product-vision.md`
- `docs/architecture/engine-architecture.md`
- `docs/research/index.md`

**Documentation updated:**
- `docs/index.md`, `README.md`, and all sub-indices.
- `AGENTS.md` to enforce journaling.
- `BUILD_JOURNEY.md` to capture this iteration.

**Open questions:** None at this time.

**Recommended next step:** Address the remaining high-priority gaps from the independent full-chain audit (H-01 timestamps, H-02 CI pipeline).

### Iteration 28 Detail — 2026-06-14

**Goal:** Define the MVP tranches to transition to the Live Agent v2.0 vision.

**Scope:** Documentation and Roadmap Planning.

**Materials reviewed:** `docs/roadmap/rebalancing-engine-roadmap.md` and the independent audit report.

**Decisions made:**
1. Established a 4-tranche sequence to build the Live Agent: Core Engine Readiness -> Orchestrator Skeleton (Dry Run) -> Broker Integration (Paper Trading) -> Production Hardening (Live Trading).
2. Completely rewrote `docs/roadmap/rebalancing-engine-roadmap.md` to establish this sequence as the official project roadmap, superseding the old offline-centric roadmap.

**Documentation updated:**
- `docs/roadmap/rebalancing-engine-roadmap.md`
- `BUILD_JOURNEY.md`

**Open questions:** 
- Should the Orchestrator/Agent be a separate package/folder within this monorepo, or an entirely new repository?
- Is Alpaca the confirmed target for Tranche 3?
- What persistent store will be used for the Tranche 4 audit trails?

**Recommended next step:** Begin execution of Tranche 1: Core Engine Readiness (CI pipeline, timestamp traceability, cash flow realism).


### Iteration 29 Detail — 2026-06-14

**Goal:** Resolve Dependabot security vulnerabilities.

**Scope:** Dependency Management.

**Materials reviewed:** `package.json`, `npm audit` output, Dependabot alerts.

**Decisions made:**
1. Used npm `overrides` to force secure versions of `axios` and `brace-expansion` instead of downgrading the main `@alpacahq/alpaca-trade-api` package.

**Files changed:**
- `package.json`
- `package-lock.json`
- `BUILD_JOURNEY.md`

**Open questions:**
- Is the project migrating to `alpaca-ts` to avoid maintaining overrides for the deprecated Node API?

**Recommended next step:** Consider evaluating `alpaca-ts` for future API interactions.

&copy; 2026 Johan Hellman. All rights reserved.

### Iteration 39 Detail — 2026-06-15

**Goal:** Transform the rebalancing engine into a multi-tenant SaaS shell and enable central Model Mandate subscription (Tranche 9).

**Scope:** Architecture Scale & UI.

**Materials reviewed:** `saas-architecture-plan.md`, `src/models/domain.ts`, `src/db/sqlite.ts`, `src/cli/agent.ts`, `web/src/App.tsx`.

**Decisions made:**
1. Created `Tenants` and `Models` tables in SQLite to isolate state and store centralized mandates.
2. Portfolios updated to link to a `tenantId` and optionally a `modelId` (with `subscriptionType` 'discretionary' or 'bespoke').
3. Utilized a lightweight mock JWT middleware in Express (`Authorization: Bearer <tenantId>`) to mock multi-tenant routing locally.
4. Overhauled the React Fleet UI to include an initial SaaS login screen, a "Model Mandates" creation tab, and mandate-assignment dropdowns in the portfolio view.

**Files changed:**
- `src/models/domain.ts`
- `src/db/sqlite.ts`
- `src/orchestrator/sqlite-state.ts`
- `src/cli/seed.ts`
- `src/cli/agent.ts`
- `web/src/App.tsx`
- `BUILD_JOURNEY.md`

**Open questions:**
- None.

**Recommended next step:** Proceed to Tranche 10: Core Engine Refactoring for Event-Driven Rebalancing (resolving the architecture bottleneck of executing central model updates across subscribed portfolios).

### Iteration 40 Detail — 2026-06-15

**Goal:** Implement Event-Driven Orchestrator & Pub/Sub Model Cascading (Tranche 10).

**Scope:** Core Architecture.

**Materials reviewed:** `saas-architecture-plan.md`, `src/orchestrator/sqlite-state.ts`, `src/orchestrator/loop.ts`.

**Decisions made:**
1. Added an `EvaluationQueue` table to back the orchestrator's queue safely.
2. Built a `getPortfoliosAffectedByInstrument` reverse index query. When prices stream in, the agent instantly identifies portfolios holding or targeting the asset and enqueues them.
3. Implemented a Pub/Sub Model Cascade in `SqliteStateManager`. Updating a `Model` automatically identifies `discretionary` portfolios subscribing to that model, overwrites their materialized targets, and forces them into the Event Queue.
4. Changed `Orchestrator.onTick` to only process accounts dequeued from the `EvaluationQueue` instead of polling all accounts on every tick.

**Files changed:**
- `src/db/sqlite.ts`
- `src/orchestrator/state.ts`
- `src/orchestrator/sqlite-state.ts`
- `src/orchestrator/loop.ts`
- `src/cli/agent.ts`
- `tests/orchestrator.test.ts`
- `BUILD_JOURNEY.md`

**Open questions:**
- We may need to investigate running SQLite in memory with a write-to-disk flag for higher throughput.

**Recommended next step:** Proceed to Tranche 11 (B2B Broker Routing) or investigate SQLite memory optimization.
