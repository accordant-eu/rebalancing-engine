# Next-Iteration MVP Implementation Plan

Date: 2026-05-02

## 1. Executive Summary

The next iteration should evolve the offline deterministic MVP into a policy-selectable multi-strategy engine without adding live integrations or advanced optimizers. The first proof point is explicit strategy selection that preserves current threshold behavior. The next proof points are calendar rebalancing and threshold boundary-target execution.

Main deferrals:

- Full transaction-cost-aware no-trade-region optimization.
- Tax-aware/direct-indexing/tax-lot support.
- ML/regime-aware strategies.
- Live market data, execution integration, UI, and persistence.

Main risks:

- Regressing current threshold behavior.
- Over-abstracting strategy interfaces before boundary-target behavior proves what is needed.
- Ambiguous calendar/date semantics.
- Mislabeling boundary targeting as full optimal control.

## 2. Current State Baseline

Implemented strategies:

- Threshold/tolerance-band trigger strategy.
- Manual forced rebalance trigger strategy.
- No-trigger monitoring behavior for in-band threshold scenarios.

Existing shared core:

- Valuation and current weight calculation.
- Drift calculation and target validation.
- Deterministic full-reset trade proposals.
- Minimum trade-size warnings.
- Post-trade simulation.
- Deterministic explanations.
- Replayable audit records.

Current architecture:

- TypeScript/Node.js library-style offline calculation core.
- `StrategyInterface` supports trigger evaluation only.
- Scenario runner hard-codes `ThresholdStrategy`.
- `RebalancingPolicy` has tolerances and minimum trade size but no strategy identifier.

Current tests/fixtures:

- Jest unit and integration tests.
- Synthetic JSON scenarios for on-target, out-of-band, cash, minimum trade, invalid price, target sum, and out-of-universe cases.

Known limitations:

- JavaScript `number` arithmetic.
- Fractional quantities.
- No strategy selection in policy.
- No calendar strategy.
- No boundary-target mode.
- No tax lots, optimizer, live integrations, persistence, or UI.

## 3. Next-Iteration MVP Scope

Included:

- Explicit strategy identifiers.
- Light strategy selector/orchestrator.
- Backward-compatible threshold behavior.
- Calendar strategy.
- Boundary-target threshold execution mode.
- Strategy metadata in explanation and audit outputs.
- Mixed-strategy scenario runner support.
- Documentation and decision-log updates.

Excluded:

- Full optimal control.
- Tax-aware/direct indexing.
- Dynamic/regime/ML logic.
- Production APIs, databases, UI, live data, or execution.
- Multi-currency.
- Full cash-flow/withdrawal strategy.

Assumptions:

- Existing TypeScript stack remains.
- Existing threshold behavior remains default.
- Dates are supplied in fixtures/request context, not read from system time.
- Boundary targeting starts as threshold-specific behavior.

Success metrics:

- Existing tests remain passing.
- New calendar and boundary-target fixtures pass.
- Scenario runner supports mixed strategy policies.
- Audit and explanations include strategy metadata.
- No new heavy dependency is introduced.

## 4. Architecture Evolution Plan

Add a light orchestration layer:

- Introduce a function that accepts portfolio state, target allocation, prices, policy, and evaluation context.
- Select the configured strategy through a registry.
- Reuse existing valuation, drift, proposal, simulation, explanation, and audit functions.

Add strategy modules:

- Keep `ThresholdStrategy`.
- Keep `ManualRebalanceStrategy`.
- Add `CalendarStrategy`.
- Add boundary-target behavior as threshold execution configuration rather than a separate top-level strategy.

Avoid separate endpoints/interfaces:

- There is no API layer yet.
- Separate endpoints would duplicate the fixture runner and audit flow.

Extend policy configuration:

- Add strategy identifier.
- Add execution target mode such as `full_reset` and `boundary`.
- Add optional calendar configuration.
- Keep defaults for backward compatibility.

Avoid over-engineering:

- Do not introduce optimizer abstractions until full optimal control is in scope.
- Do not add tax-lot types until tax-aware strategy is in scope.
- Do not add scheduling libraries; use deterministic input dates.

## 5. Slice-by-Slice Plan

### Slice 0 - Baseline Lock and Regression Safety

Objective:

- Capture current MVP behavior before strategy expansion.

Scope:

- Run current validation suite.
- Add or tighten snapshot-free regression assertions for threshold fixtures if gaps are found.

Out of scope:

- Policy schema changes.

Decisions required:

- None unless current tests reveal gaps.

Files/modules likely affected:

- `tests/*`
- `tests/fixtures/README.md`

Data structures changed:

- None.

Tests to add/update:

- Existing threshold no-op, out-of-band, cash, minimum-trade, simulation, explanation, audit, and runner tests.

Fixtures to add/update:

- None unless baseline gaps are found.

Documentation to update:

- `BUILD_JOURNEY.md`.

Validation proof point:

- Current suite passes before schema changes.

Acceptance criteria:

- All existing checks pass.

Risks:

- Hidden baseline gaps.

Commit recommendation:

- Commit only if tests/docs are added.

### Slice 1 - Strategy Inventory and Policy Schema Extension

Objective:

- Add explicit strategy identifiers and execution target mode to policy while preserving defaults.

Scope:

- Extend `RebalancingPolicy`.
- Define strategy identifier type.
- Add execution target mode type.
- Update fixtures only where needed.

Out of scope:

- New calendar behavior.

Decisions required:

- Strategy identifier names.
- Default execution target mode.

Files/modules likely affected:

- `src/models/domain.ts`
- `tests/fixtures/scenarios.json`
- `tests/fixtures.test.ts`
- `tests/smoke.test.ts`

Data structures changed:

- `RebalancingPolicy.strategyType?`
- `RebalancingPolicy.executionTargetMode?`

Tests to add/update:

- Policy default tests.
- Fixture validation tests.

Fixtures to add/update:

- Add explicit `strategyType: "threshold"` to at least one fixture; keep old fixtures valid.

Documentation to update:

- README and fixture README.

Validation proof point:

- Current threshold fixtures pass with and without explicit strategy type.

Acceptance criteria:

- Backward compatibility is preserved.

Risks:

- Fixtures become noisy if every field is required immediately.

Commit recommendation:

- `feat: add strategy policy identifiers`

### Slice 2 - Strategy Interface and Orchestration Layer

Objective:

- Introduce a shared evaluation workflow that selects strategies from policy.

Scope:

- Add strategy registry/selector.
- Add `evaluateRebalancingScenario` or equivalent orchestration function.
- Update scenario runner to use the orchestrator.

Out of scope:

- Calendar implementation.
- Boundary proposal math.

Decisions required:

- Whether manual is selectable in fixtures.

Files/modules likely affected:

- `src/strategy/index.ts`
- `src/runner/scenario-runner.ts`
- New `src/core/evaluate.ts` or `src/engine/evaluate.ts`
- Tests for runner and orchestrator.

Data structures changed:

- Evaluation context may include deterministic `evaluationDate`.

Tests to add/update:

- Strategy selection tests.
- Runner tests proving threshold still works.
- Unknown strategy validation test.

Fixtures to add/update:

- Add one manual-strategy runner fixture only if manual is accepted as selectable.

Documentation to update:

- README, fixture README, build journey.

Validation proof point:

- Runner no longer directly instantiates `ThresholdStrategy`.

Acceptance criteria:

- Existing scenario output behavior remains equivalent except for additive metadata.

Risks:

- Orchestrator becomes too broad.

Commit recommendation:

- `feat: add policy-driven strategy orchestration`

### Slice 3 - Calendar Strategy Implementation

Objective:

- Implement the highest-priority missing Meta Paper strategy.

Scope:

- Add `CalendarStrategy`.
- Add deterministic calendar config.
- Add fixtures for due and not-due scenarios.
- Reuse full-reset proposal generation.

Out of scope:

- Business-day calendars.
- Holiday calendars.
- Scheduling services.
- Factor-specific model reconstitution.

Decisions required:

- Initial schedule representation.
- Whether due calendar trigger ignores drift.

Files/modules likely affected:

- `src/strategy/calendar.ts`
- `src/models/domain.ts`
- `src/strategy/index.ts`
- `tests/calendar-strategy.test.ts`
- `tests/fixtures/scenarios.json`

Data structures changed:

- Optional calendar config in policy or evaluation context.

Tests to add/update:

- Calendar due triggers.
- Calendar not-due does not trigger.
- Calendar explanation.
- Calendar audit metadata.
- Runner mixed strategy test.

Fixtures to add/update:

- `calendar_due`
- `calendar_not_due`

Documentation to update:

- README, fixture README, BUILD_JOURNEY.

Validation proof point:

- Calendar strategy can be added without modifying valuation/drift core.

Acceptance criteria:

- Calendar fixtures pass through runner with deterministic results.

Risks:

- Date semantics become too complex.

Commit recommendation:

- `feat: add calendar rebalance strategy`

### Slice 4 - Boundary-Target Threshold Execution

Objective:

- Implement the first missing transaction-cost-aware strategy capability as a bounded slice.

Scope:

- Add threshold execution target mode `boundary`.
- Calculate trades to nearest acceptable band boundary for breached assets.
- Simulate residual drift.
- Explain boundary targeting.

Out of scope:

- Full no-trade-region optimizer.
- Covariance inputs.
- Market-impact models.
- Tax-aware lot selection.

Decisions required:

- Absolute-only or absolute-plus-relative boundary support.
- How to handle multiple simultaneous breaches with cash constraints.

Files/modules likely affected:

- `src/core/trades.ts`
- `src/core/simulation.ts`
- `src/explanation/explanation.ts`
- `src/audit/audit.ts`
- `src/models/domain.ts`
- `tests/trades.test.ts`
- `tests/simulation.test.ts`

Data structures changed:

- Trade proposal metadata for execution target mode.

Tests to add/update:

- Boundary trade sizing.
- Boundary residual drift inside band.
- Boundary turnover lower than full reset.
- Explanation and audit tests.

Fixtures to add/update:

- `threshold_boundary_target`

Documentation to update:

- README, fixture README, BUILD_JOURNEY.

Validation proof point:

- A proportional-cost policy trades to band edge, not target.

Acceptance criteria:

- Boundary mode is deterministic and auditable.

Risks:

- Cash constraints can make simple boundary math non-trivial.

Commit recommendation:

- `feat: add threshold boundary target mode`

### Slice 5 - Shared Explanation and Audit Extension

Objective:

- Ensure multi-strategy outputs remain explainable and reproducible.

Scope:

- Add strategy metadata and execution target mode to explanation and audit output.
- Add tests for each strategy.

Out of scope:

- Localization.
- Regulatory suitability scoring.

Decisions required:

- Audit metadata shape.

Files/modules likely affected:

- `src/explanation/explanation.ts`
- `src/audit/audit.ts`
- `src/models/domain.ts`
- `tests/explanation.test.ts`
- `tests/audit.test.ts`

Data structures changed:

- Explanation and audit metadata fields.

Tests to add/update:

- Strategy-specific explanation assertions.
- Audit replay with strategy metadata.

Fixtures to add/update:

- None beyond prior slices unless coverage gaps exist.

Documentation to update:

- README and build journey.

Validation proof point:

- Audit record clearly states selected strategy and execution mode.

Acceptance criteria:

- Explanations do not contradict proposal/simulation facts.

Risks:

- Explanations duplicate business logic.

Commit recommendation:

- `feat: add multi-strategy audit metadata`

### Slice 6 - Scenario Runner Multi-Strategy Support

Objective:

- Make batch fixtures useful for multi-strategy regression.

Scope:

- Support mixed strategies in one fixture file.
- Optionally introduce expected-status manifest.

Out of scope:

- Writing output files unless explicitly needed.

Decisions required:

- Whether expected statuses live in fixture file or separate manifest.

Files/modules likely affected:

- `src/runner/scenario-runner.ts`
- `tests/scenario-runner.test.ts`
- `tests/fixtures/scenarios.json`

Data structures changed:

- Optional fixture metadata.

Tests to add/update:

- Mixed threshold/calendar/boundary runner test.
- Invalid strategy per-scenario error test.

Fixtures to add/update:

- Mixed strategy scenarios.

Documentation to update:

- Fixture README.

Validation proof point:

- Runner reports mixed strategy results deterministically.

Acceptance criteria:

- Invalid scenarios remain isolated per scenario.

Risks:

- Fixture file becomes difficult to scan.

Commit recommendation:

- `test: add multi-strategy scenario coverage`

### Slice 7 - Documentation, Examples, and Developer Experience

Objective:

- Make strategy configuration understandable.

Scope:

- Update README commands and architecture notes.
- Add strategy configuration examples.
- Update traceability docs if scope changes.

Out of scope:

- Generated API docs.

Decisions required:

- Documentation convention for strategies.

Files/modules likely affected:

- `README.md`
- `tests/fixtures/README.md`
- `BUILD_JOURNEY.md`
- Existing docs under `docs/`.

Data structures changed:

- None.

Tests to add/update:

- None unless docs include runnable snippets.

Fixtures to add/update:

- None.

Documentation to update:

- All user-facing docs affected by new strategy support.

Validation proof point:

- A developer can identify how to configure each strategy from docs.

Acceptance criteria:

- Docs distinguish implemented, partial, and deferred strategies.

Risks:

- Docs overclaim boundary mode as full optimal control.

Commit recommendation:

- `docs: update multi-strategy usage`

### Slice 8 - Next-Iteration Audit and Hardening

Objective:

- Verify traceability, tests, documentation, and strategy behavior.

Scope:

- Run full checks.
- Add final next-iteration audit.
- Update build journey and decision log.

Out of scope:

- New strategy functionality.

Decisions required:

- Whether next-iteration MVP is complete.

Files/modules likely affected:

- `docs/audits/*`
- `BUILD_JOURNEY.md`
- `README.md`

Data structures changed:

- None.

Tests to add/update:

- Only if audit finds gaps.

Fixtures to add/update:

- Only if audit finds gaps.

Documentation to update:

- Final audit and status docs.

Validation proof point:

- Full checks pass and documented scope matches implementation.

Acceptance criteria:

- No known implemented behavior lacks test/fixture evidence.

Risks:

- Hidden documentation drift.

Commit recommendation:

- `docs: add next-iteration mvp audit`

## 6. Dependency Graph

| Slice                       | Depends on         |
| --------------------------- | ------------------ |
| Slice 0 - Baseline Lock     | None               |
| Slice 1 - Policy Schema     | Slice 0            |
| Slice 2 - Orchestration     | Slice 1            |
| Slice 3 - Calendar Strategy | Slice 2            |
| Slice 4 - Boundary Target   | Slice 1, Slice 2   |
| Slice 5 - Explanation/Audit | Slices 3 and 4     |
| Slice 6 - Runner Support    | Slices 2, 3, and 4 |
| Slice 7 - Docs/DX           | Slices 1-6         |
| Slice 8 - Audit/Hardening   | Slices 1-7         |

## 7. Test Strategy

Unit tests:

- Strategy selector.
- Calendar trigger date logic.
- Boundary target trade sizing.
- Policy defaults and validation.

Strategy conformance tests:

- Each strategy returns deterministic trigger metadata.
- Each strategy can run through the common orchestration path.

Fixture scenario tests:

- Threshold current fixtures.
- Calendar due/not-due fixtures.
- Boundary target fixture.
- Invalid strategy fixture.

Regression tests:

- Existing threshold, trade, simulation, explanation, audit, and runner tests.

Explanation tests:

- Threshold no-op and triggered explanation.
- Calendar due/not-due explanation.
- Boundary residual drift explanation.

Audit tests:

- Strategy identifier and execution target mode included.
- Replay remains deterministic.

CLI/scenario runner tests:

- Mixed strategy fixtures.
- Per-scenario error handling.

## 8. Validation Gates

| Gate   | Slice | Required validation                                              |
| ------ | ----- | ---------------------------------------------------------------- |
| Gate A | 0     | Current tests, type-check, lint, build, scenario runner pass.    |
| Gate B | 1     | Policy schema supports old and new fixtures.                     |
| Gate C | 2     | Runner uses strategy selector and preserves threshold outputs.   |
| Gate D | 3     | Calendar due/not-due behavior is deterministic.                  |
| Gate E | 4     | Boundary target trades to band edge and explains residual drift. |
| Gate F | 5     | Audit and explanation include strategy metadata.                 |
| Gate G | 6     | Mixed strategy runner fixtures pass.                             |
| Gate H | 8     | Full checks and audit pass.                                      |

## 9. Backlog

Must-have next-iteration MVP:

- Explicit strategy identifiers.
- Policy-driven strategy selection.
- Calendar strategy.
- Boundary-target threshold mode.
- Strategy metadata in audit/explanation.
- Mixed strategy runner tests.

Should-have:

- Expected-status runner manifest.
- Per-instrument tolerance groundwork.
- Gross trade value metric.

Could-have:

- Manual strategy fixture selection if accepted as product behavior.
- Relative-band boundary targeting.
- Additional calendar frequencies.

Later-stage:

- Full optimal control.
- Tax-aware/direct indexing.
- Factor/style reconstitution.
- Private-market denominator-effect handling.

Explicitly out of scope:

- ML/regime-aware model.
- Live data and execution.
- UI.
- Database.
- Multi-currency.
- Regulatory suitability engine.

## 10. Documentation Plan

- Update `README.md` with current multi-strategy support and commands.
- Update `tests/fixtures/README.md` with strategy fixture semantics.
- Update `BUILD_JOURNEY.md` after each meaningful slice.
- Add decision-log entries for architecture, calendar semantics, and boundary targeting.
- Update this plan if implementation findings materially change scope.
- Add final audit under `docs/audits/` when the next-iteration MVP is complete.

## 11. Commit Strategy

Use focused commits per slice:

- `test: lock baseline rebalance behavior`
- `feat: add strategy policy identifiers`
- `feat: add policy-driven strategy orchestration`
- `feat: add calendar rebalance strategy`
- `feat: add threshold boundary target mode`
- `feat: add multi-strategy audit metadata`
- `test: add multi-strategy scenario coverage`
- `docs: update multi-strategy usage`
- `docs: add next-iteration mvp audit`

Do not push partial or failing work. Push only after a completed validated slice or documentation/process checkpoint, after reviewing `git status` and summarizing what will be pushed.
