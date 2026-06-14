---
type: Assessment
title: Refactoring Assessment
description: Documentation for refactoring assessment
tags: [refactoring]
timestamp: 2026-06-14T00:00:00Z
---

# Refactoring Assessment

Date: 2026-05-02

## 1. Executive Summary

The repository is healthy for its current offline deterministic fixture scope. The code is small, readable, and already separates valuation, drift, strategy trigger evaluation, proposal generation, simulation, explanation, audit, and fixture running. Tests cover the main public behavior and edge cases, and baseline validation passed before this assessment.

Main friction points are now mostly about public API clarity and future extension boundaries rather than obvious correctness problems. The highest-value near-term refactors are to make the high-level evaluation path more explicitly characterized, make strategy selection easier to extend and inspect, keep strategy-specific proposal behavior from growing into scattered conditionals, and tighten schema validation only when the project is ready to accept stricter fixture contracts.

Recommended sequence:

1. Add direct characterization coverage for `evaluateRebalance` and refactor strategy selection to a registry-backed contract.
2. Keep domain structures stable while documenting result envelope and warning conventions.
3. Revisit decimal/rounding policy before adding more monetary behavior.
4. Consider strategy proposal hooks only when another strategy needs non-threshold-specific proposal sizing.
5. Add CI only after repository commands and validation expectations are stable.

Risks are low for small API/registry refactors, medium for data-structure renames because fixtures and audit records consume current shapes, and high for any change to monetary precision, target validation, or cash semantics. Do not refactor tax lots, live integrations, databases, REST APIs, UI, execution routing, full optimizers, or new strategy breadth in this pass.

## 2. Materials Reviewed

Documents reviewed:

- `AGENTS.md`
- `BUILD_JOURNEY.md`
- `README.md`
- `docs/Rebalancing Engine_ PRD, Architecture, Vision.md`
- `docs/MVP_Implementation_Plan.md`
- `docs/prd/rebalancing-engine-next-iteration-prd.md`
- `docs/plans/rebalancing-engine-next-iteration-mvp-plan.md`
- `docs/strategy-traceability/full-chain-rebalancing-strategy-review.md`
- `docs/audits/final-mvp-audit.md`
- `docs/audits/next-iteration-mvp-audit.md`
- `docs/audits/red-team-audit-current.md`
- `docs/audits/test-case-audit.md`
- `tests/fixtures/README.md`

Source reviewed:

- `src/models/domain.ts`
- `src/core/valuation.ts`
- `src/core/drift.ts`
- `src/core/evaluation.ts`
- `src/core/trades.ts`
- `src/core/simulation.ts`
- `src/strategy/threshold.ts`
- `src/strategy/calendar.ts`
- `src/strategy/manual.ts`
- `src/explanation/explanation.ts`
- `src/audit/audit.ts`
- `src/runner/scenario-runner.ts`
- module barrel files under `src/*/index.ts`

Tests, fixtures, and config reviewed:

- `tests/*.test.ts`
- `tests/fixtures/scenarios.json`
- `tests/fixtures/scenario-expectations.json`
- `package.json`
- `tsconfig.json`
- `jest.config.js`
- `eslint.config.mjs`
- repository status and recent commits

Commands run:

- `rg --files`
- `git status --short`
- `git log --oneline -5`
- `npm test -- --runInBand`
- `npx tsc --noEmit`
- `npm run lint`

## 3. Current Architecture Snapshot

Module structure:

- `src/models/domain.ts` holds core domain interfaces and strategy/policy/result types.
- `src/core/valuation.ts` calculates holding values, cash-inclusive total value, and current weights.
- `src/core/drift.ts` validates target allocations and calculates drift.
- `src/strategy/*` owns trigger evaluation for threshold, calendar, and manual strategies.
- `src/core/trades.ts` generates deterministic trade proposals for full-reset and threshold boundary execution.
- `src/core/simulation.ts` replays proposed trades and reports residual drift and sell-side turnover.
- `src/explanation/explanation.ts` turns computed outputs into deterministic explanation strings.
- `src/audit/audit.ts` serializes inputs and outputs for replay.
- `src/core/evaluation.ts` is the main orchestration entry point.
- `src/runner/scenario-runner.ts` loads fixtures, runs scenarios, and optionally validates expected statuses.

Main data structures:

- Inputs: `PortfolioState`, `Holding`, `PriceSnapshot`, `TargetAllocation`, `RebalancingPolicy`.
- Intermediate outputs: `ValuationResult`, `WeightResult`, `DriftMeasurement`, `TriggerResult`.
- Recommendation outputs: `TradeProposal`, `ProposedTrade`, `ProposalWarning`, `PostTradeSimulation`, `RecommendationExplanation`, `AuditRecord`.

Core flow:

1. Calculate valuation and current weights.
2. Calculate drift against the target allocation.
3. Select and evaluate the configured strategy trigger.
4. Generate a trade proposal only if triggered.
5. Simulate the proposal.
6. Generate explanation and audit record.

Strategy support:

- Threshold is the default when `strategyType` is omitted.
- Manual always triggers.
- Calendar triggers deterministically from caller-supplied dates.
- Threshold supports `full_reset` and `boundary` execution target modes.

Test and fixture setup:

- Jest covers unit, edge-case, integration, fixture, runner, audit, explanation, and strategy behavior.
- Fixtures are synthetic JSON scenarios with a separate expected-status manifest.
- No CI workflow is present.

Public or semi-public interfaces:

- `evaluateRebalance` is the best high-level entry point.
- Lower-level pure functions remain importable for tests and future callers.
- `runScenarios` and CLI runner are public developer-facing fixture tools.

## 4. Refactoring Findings

| ID   | Priority | Category                      | Finding                                                                                                                    | Evidence                                                                                                                 | Impact                                                                                                                             | Recommended action                                                                                                          | Status        |
| ---- | -------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------- |
| R-01 | High     | API/interface                 | The intended happy-path API is `evaluateRebalance`, but most tests still assemble the pipeline manually.                   | `tests/audit.test.ts` and `tests/explanation.test.ts` duplicate valuation, drift, strategy, proposal, simulation wiring. | Public orchestration regressions could be missed or harder to diagnose.                                                            | Add direct characterization tests for `evaluateRebalance`; gradually use it in tests where end-to-end behavior is intended. | Fixed         |
| R-02 | Medium   | SOLID/separation of concerns  | Strategy selection is embedded in a switch that hides supported strategies from callers.                                   | `selectStrategy` in `src/core/evaluation.ts`.                                                                            | Adding strategies remains easy but discoverability and validation are weaker than they need to be.                                 | Move supported strategies to an explicit registry and expose supported strategy identifiers.                                | Fixed         |
| R-03 | Medium   | Strategy extensibility        | Strategy modules own trigger evaluation only; proposal differences are currently policy-driven in shared trade generation. | `boundary` logic lives in `src/core/trades.ts`, not a strategy proposal hook.                                            | This is acceptable for one threshold-specific execution mode but could grow conditionals if future strategies need proposal logic. | Defer strategy proposal hooks until a second non-threshold proposal behavior exists; document the boundary.                 | Deferred      |
| R-04 | Medium   | Financial calculation clarity | Monetary values use JavaScript `number` and fractional quantities.                                                         | Domain model header, audits, README, tests.                                                                              | Acceptable for fixtures; risky for production precision and rounding.                                                              | Decide decimal and rounding policy before adding more monetary semantics.                                                   | Deferred      |
| R-05 | Medium   | Data structures               | `PriceSnapshot` has no timestamp and fixture schema validation is mostly structural.                                       | `PriceSnapshot` is `Record<string, number>`; `fixtures.test.ts` checks only basic fields.                                | Stale price behavior and malformed JSON remain outside current guarantees.                                                         | Defer richer schema validation until timestamp/staleness policy is in scope.                                                | Deferred      |
| R-06 | Low      | Domain model                  | Warning structure is currently single-code but well-shaped.                                                                | `ProposalWarningCode = 'MINIMUM_TRADE_SIZE'`.                                                                            | No immediate problem; future warning codes should follow this shape.                                                               | Keep structure stable and document warning conventions.                                                                     | Accepted Risk |
| R-07 | Low      | Documentation                 | Architecture docs are accurate but distributed across README, audits, plans, and traceability docs.                        | Multiple docs describe current architecture.                                                                             | New contributors may need to read several documents to orient.                                                                     | Keep this assessment as the current refactoring index; avoid creating a broad architecture rewrite now.                     | Fixed         |
| R-08 | Low      | Tooling/DX                    | No CI workflow is present.                                                                                                 | Repository file inventory found no `.github` workflow outside `node_modules`.                                            | Local validation works, but remote regression protection is absent.                                                                | Defer CI unless requested; document relevant commands.                                                                      | Deferred      |

## 5. Decision Points

### Decision: Keep this pass behavior-preserving

Context: The repository already has validated financial behavior for the offline fixture scope.

Options considered:

- Refactor internals without changing public output semantics.
- Rename domain fields for readability.
- Change financial semantics while refactoring.

Preferred option: Refactor internals and add characterization coverage without changing output semantics.

Rationale: The current data shapes are already used in fixtures, audit records, and docs. Renames and financial changes would increase migration risk without a feature need.

Trade-offs: This leaves some naming and schema limitations in place.

Reversibility: High.

Implementation impact: Limited to tests, strategy selection internals, and documentation.

Validation approach: Run Jest, type-check, lint, build, scenario runner, expected-status manifest validation, format, and diff whitespace checks.

Status: Accepted.

### Decision: Use a strategy registry rather than a broader strategy engine abstraction

Context: `selectStrategy` currently switches over known strategy identifiers. The next useful extension is discoverability and explicit supported identifiers, not a new strategy lifecycle.

Options considered:

- Keep the switch unchanged.
- Replace the switch with a registry of stateless strategy instances.
- Introduce a full strategy execution interface with proposal hooks now.

Preferred option: Registry of stateless strategy instances.

Rationale: It improves extension clarity with minimal behavior change and avoids premature proposal-hook abstraction.

Trade-offs: Future strategies still require updating the registry; proposal behavior remains shared.

Reversibility: High.

Implementation impact: `src/core/evaluation.ts` and direct tests for strategy selection/evaluation.

Validation approach: Existing tests plus added high-level API tests.

Status: Implemented.

### Decision: Defer decimal arithmetic and rounding

Context: Production monetary correctness eventually requires a precision and rounding policy.

Options considered:

- Adopt a decimal library now.
- Keep JavaScript `number` for the fixture MVP and document the risk.

Preferred option: Defer decimal adoption.

Rationale: This pass is not changing financial semantics. Introducing a dependency would require a dedicated precision migration decision and test plan.

Trade-offs: Current outputs remain fixture-grade rather than production-grade.

Reversibility: Medium.

Implementation impact: None in this pass.

Validation approach: Existing precision-sensitive fixture tests remain unchanged.

Status: Deferred.

## 6. Refactoring Plan

### Slice 1: Assessment and Refactoring Index

Objective: Create a repository-aware refactoring assessment.

Scope: Documentation only.

Out of scope: Code, tests, fixtures, financial semantics.

Files likely affected: `docs/refactoring/refactoring-assessment.md`.

Tests to add/update: None.

Validation proof point: Markdown formatted by repository formatter.

Risk: Low.

Commit recommendation: `docs: add refactoring assessment`.

### Slice 2: Public Evaluation API Characterization and Strategy Registry

Objective: Make the happy-path API and strategy selection contract clearer.

Scope: Add direct `evaluateRebalance` tests, replace the switch with an explicit strategy registry, expose supported strategy identifiers.

Out of scope: Strategy proposal hooks, domain shape renames, new strategies, fixture schema changes.

Files likely affected: `src/core/evaluation.ts`, `tests/evaluation.test.ts`, `BUILD_JOURNEY.md`, this assessment.

Tests to add/update: Characterization tests for threshold default, calendar non-trigger, supported strategy list, and unsupported strategy error.

Validation proof point: Full local validation suite passes.

Risk: Low.

Commit recommendation: `refactor: clarify strategy selection contract`.

Status: Implemented.

### Slice 3: Result and Warning Shape Documentation

Objective: Document current result envelope and warning conventions without changing data structures.

Scope: README or architecture docs only.

Out of scope: Renaming `TradeProposal`, `TriggerResult`, warnings, or audit fields.

Files likely affected: README or a future domain model doc.

Tests to add/update: None.

Validation proof point: Docs match current tests and fixtures.

Risk: Low.

Commit recommendation: `docs: document result contracts`.

## 7. Deferred Refactors

| Refactor                        | Reason for deferral                                                          | Trigger for revisiting                                                                      | Risk if left as-is                                              | Blocks future work?                                        |
| ------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------- |
| Decimal and rounding migration  | Requires a dedicated financial semantics decision and expected-value review. | Production monetary outputs, share rounding, lot sizes, or execution workflows enter scope. | Floating-point and fractional-share simplifications remain.     | Blocks production readiness, not current fixture refactor. |
| Strategy proposal hooks         | Only threshold boundary mode currently needs special proposal sizing.        | A second strategy needs materially different proposal generation.                           | Shared `trades.ts` could accumulate policy conditionals.        | No.                                                        |
| Relative-boundary targeting     | It is strategy breadth, not refactoring.                                     | Product requires relative-band boundary behavior.                                           | Boundary mode remains absolute-only.                            | No.                                                        |
| Fixture JSON schema validator   | Adds tooling/process overhead.                                               | Fixture count grows or malformed input bugs appear.                                         | Basic structural validation may miss malformed optional fields. | No.                                                        |
| Price timestamp/staleness model | Changes domain inputs and validation semantics.                              | Market-data freshness becomes part of requirements.                                         | Stale price behavior remains unmodeled.                         | No for offline fixtures.                                   |
| CI workflow                     | Tooling addition outside requested refactoring slice.                        | User asks for CI or remote validation becomes a recurring issue.                            | Regressions rely on local checks.                               | No.                                                        |
| Renaming domain fields          | Would be a broad fixture/audit compatibility change.                         | A versioned API/schema migration is planned.                                                | Some names remain minimal rather than enterprise-rich.          | No.                                                        |
