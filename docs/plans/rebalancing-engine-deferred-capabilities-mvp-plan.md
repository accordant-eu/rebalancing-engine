# Deferred Capabilities MVP Plan

Date: 2026-05-02

Implementation status: In progress. Selected scope is Option A: correctness and policy semantics. Slice 1 decimal / rounding policy is implemented and validated.

## 1. Current Baseline

The completed baseline is an offline TypeScript/Node.js calculation core with deterministic synthetic fixtures. It supports threshold, manual, and calendar strategies; full-reset and absolute-boundary execution; minimum trade warnings; post-trade simulation; explanations; audit records; and a fixture scenario runner.

Baseline validation before this plan:

- `npm test -- --runInBand`: 14 suites passed, 76 tests passed.
- `npm run build`: passed.
- `npm run lint`: passed.
- `npm run scenario:run`: passed.

## 2. Selected Scope

Included:

- Explicit decimal / rounding policy.
- Relative-boundary targeting for threshold boundary execution.
- Tests, fixtures, docs, and audit/explanation updates required by those capabilities.

Deferred:

- Richer cash flows.
- Tax lots.
- Full optimizer.
- Live integrations / API / UI / database.

## 3. Scope Decision

Decision: Implement the correctness and policy semantics increment first.

Status: Accepted for this increment.

Context:
The existing MVP is stable and documented. Remaining post-MVP items vary significantly in risk. Numeric policy affects every financial output and should be made explicit before adding richer workflows. Relative-boundary targeting extends existing relative drift and boundary execution support without requiring production infrastructure.

Options considered:

1. Correctness and policy semantics: decimal / rounding policy plus relative-boundary targeting.
2. Practical portfolio workflow: decimal / rounding policy plus richer cash flows.
3. Tax-aware foundations: decimal / rounding policy plus lot-aware sell-selection primitives.
4. Multi-capability expansion: decimal, relative boundaries, richer cash flows, and limited tax-lot primitives.
5. Productionization: API, persistence, and integration boundaries.

Preferred option:
Option 1.

Rationale:
Option 1 is the smallest coherent increment that improves correctness and strategy expressiveness while preserving the offline engine shape. Option 2 is valuable but broader because cash-flow semantics affect valuation, triggers, proposals, warnings, and audit records. Options 3 and 4 risk premature tax and objective semantics. Option 5 is premature until domain behavior is richer and stable.

Implementation impact:

- Add central numeric policy helpers.
- Add deterministic audit-output serialization rounding.
- Extend boundary execution policy shape.
- Add relative-boundary proposal math and validation.
- Update scenario fixtures and docs.

Validation:
Each slice must pass targeted tests, full Jest suite, build, lint, and scenario runner before commit.

## 4. Slice-by-Slice Plan

### Slice 0 - Baseline Lock and Regression Verification

Goal:
Confirm the completed MVP remains stable before adding deferred capabilities.

Status:
Complete before implementation.

Validation:

- Existing tests pass.
- Build passes.
- Lint passes.
- Scenario runner passes.

Commit:
No code commit required unless docs are updated.

### Slice 1 - Decimal / Rounding Policy

Goal:
Introduce explicit numeric precision and rounding policy without breaking public number-based interfaces.

Status:
Complete.

Decisions required:

- Numeric representation.
- Internal precision.
- Output/display rounding.
- Test tolerance policy.
- Deterministic serialization behavior.

Implemented approach:

- Use `decimal.js` through a central `src/core/numeric.ts` helper where financial multiplication, division, addition, and subtraction are performed.
- Keep domain model inputs and outputs as numbers in this increment for backward compatibility.
- Add a central rounding policy for prices, quantities, money values, weights, drift, and turnover.
- Round serialized audit outputs and explanation display text at explicit boundaries.
- Keep calculation helpers from silently rounding internal intermediate values.

Files likely affected:

- `src/models/domain.ts`
- `src/core/valuation.ts`
- `src/core/drift.ts`
- `src/core/trades.ts`
- `src/core/simulation.ts`
- `src/audit/audit.ts`
- `src/explanation/explanation.ts`
- Tests and docs.

Validation:

- Existing tests pass.
- Precision-sensitive tests pass in `tests/numeric.test.ts`.
- Audit serialization is deterministic and preserves input snapshots.
- Scenario runner output remains deterministic.

Commit:
`feat: add explicit rounding policy`

### Slice 2 - Relative-Boundary Targeting

Goal:
Support relative tolerance bands alongside existing absolute tolerance bands for threshold boundary execution.

Decisions required:

- Policy field name and default.
- Whether absolute and relative bands combine or are selected.
- Behavior for zero and very small target weights.

Planned approach:

- Add `boundaryBandMode?: "absolute" | "relative"` to `RebalancingPolicy`.
- Default to `absolute` for backward compatibility.
- Use `relative` only for `executionTargetMode: "boundary"`.
- In relative mode, calculate lower/upper boundaries as `targetWeight +/- targetWeight * relativeDriftTolerance`, clamped to `[0, 1]`.
- Reject relative boundary mode when `relativeDriftTolerance` is missing or when a boundary trade is required for a zero-target instrument.

Files likely affected:

- `src/models/domain.ts`
- `src/core/trades.ts`
- `src/explanation/explanation.ts`
- Tests, fixtures, README, fixture docs.

Validation:

- Absolute-boundary fixture remains unchanged.
- New relative-boundary fixture passes.
- Zero-target relative-boundary invalid case is tested.
- Scenario runner expected-status manifest includes new scenario.

Commit:
`feat: support relative boundary targeting`

### Slice 3 - Integrated Documentation and Hardening

Goal:
Ensure implementation, examples, and docs agree.

Scope:

- README updated.
- Fixture docs updated.
- PRD and plan implementation status updated.
- `BUILD_JOURNEY.md` updated.
- Audit report for this increment created or updated.

Validation:

- Full tests pass.
- Build, lint, format, and scenario runner pass.
- Diff reviewed.

Commit:
`docs: update deferred capability status`

## 5. Dependency Graph

| Slice                           | Depends on | Parallelizable |
| ------------------------------- | ---------- | -------------- |
| 0 - Baseline lock               | None       | No             |
| 1 - Decimal / rounding policy   | 0          | No             |
| 2 - Relative-boundary targeting | 1          | No             |
| 3 - Docs and hardening          | 1, 2       | No             |

## 6. Test Strategy

- Unit tests for numeric helper behavior and rounding boundaries.
- Regression tests for existing valuation, drift, trades, simulation, explanation, audit, and runner behavior.
- New trade tests for relative-boundary happy path and invalid zero-target behavior.
- Fixture tests for scenario schema compatibility.
- Runner tests for new scenario expected status.
- Deterministic serialization test for rounded audit output.

## 7. Validation Gates

- Gate A: Baseline full suite passes before implementation.
- Gate B: Numeric policy tests and existing calculation tests pass.
- Gate C: Relative-boundary unit and fixture tests pass.
- Gate D: Full validation passes: tests, build, lint, scenario runner.
- Gate E: Documentation and build journey reflect actual scope.

## 8. Documentation Plan

Update:

- `BUILD_JOURNEY.md`
- Deferred-capabilities PRD
- This implementation plan
- README
- Fixture README
- Increment audit report

## 9. Commit Strategy

- Commit planning docs first.
- Commit decimal / rounding policy as one focused slice.
- Commit relative-boundary targeting as one focused slice.
- Commit final docs/audit hardening if separated from implementation commits.
- Push only after validated checkpoints and after confirming branch/status.
