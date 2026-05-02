# Deferred Capabilities Increment Audit

Date: 2026-05-02

## Scope Audited

Selected increment: Option A - correctness and policy semantics.

Implemented:

- Decimal / rounding policy.
- Relative-boundary targeting for threshold boundary execution.

Still deferred:

- Richer cash flows.
- Tax lots.
- Full optimizer.
- Live integrations / API / UI / database.

## Baseline Verification

Before implementation:

- Original MVP slices 0-12 were documented as complete.
- Next-iteration MVP slices 0-8 were documented as complete.
- Existing tests, build, lint, and scenario runner passed.
- Deferred items were not incomplete MVP slices.

## Decision Consistency

Decision records added:

- Scope next deferred-capability increment to numeric policy and relative boundaries.
- Use `decimal.js` internally with explicit output rounding.
- Add policy-selected relative boundary targeting.

The implementation follows the selected scope. It does not add richer cash-flow workflows, tax-lot primitives, optimizer dependencies, live data, API, UI, persistence, or database code.

## Implementation Review

Numeric policy:

- `src/core/numeric.ts` centralizes decimal configuration, calculation epsilon, output rounding precision, and display formatting helpers.
- Valuation, drift, trade proposal generation, and simulation use decimal helpers for financial arithmetic.
- Public domain interfaces remain number-based for backward compatibility.
- `serializeAuditRecord` preserves input snapshots and rounds output numbers deterministically.
- Explanation and threshold reason formatting use the numeric formatting helper instead of ad hoc `toFixed`.

Relative-boundary targeting:

- `RebalancingPolicy.boundaryBandMode` supports `absolute` and `relative`.
- Boundary mode defaults to `absolute`.
- Relative boundary mode requires `relativeDriftTolerance`.
- Relative boundary mode rejects zero-target instruments requiring a boundary trade.
- Trade proposal, explanation, and audit output carry boundary band metadata.
- The new `threshold_relative_boundary_target` fixture demonstrates relative-triggered boundary execution.

## Test and Fixture Review

Added coverage:

- Precision-sensitive valuation and proposal arithmetic.
- Deterministic rounded audit serialization.
- Relative-boundary trade sizing.
- Missing `relativeDriftTolerance` validation.
- Zero-target relative-boundary validation.
- Relative-boundary simulation residual drift.
- Relative-boundary explanation and audit metadata.
- Scenario runner and expected-status manifest coverage for the new fixture.

Existing coverage retained:

- Threshold, manual, and calendar strategies.
- Absolute-boundary execution.
- Minimum-trade warnings.
- Invalid fixtures reported per scenario.
- Audit replay for raw in-memory audit records.

## Validation

Final validation commands should pass before this audit is committed:

- `npm test -- --runInBand`
- `npm run build`
- `npm run lint`
- `npm run scenario:run`
- `npm run build && node dist/runner/scenario-runner.js tests/fixtures/scenarios.json tests/fixtures/scenario-expectations.json`
- `npm run format`

## Residual Risks and Limitations

- Public interfaces still use numbers. A future production API may need decimal strings for exact wire contracts.
- Relative boundary mode is a threshold boundary-sizing policy, not a full optimizer.
- Relative boundary mode rejects zero-target instruments rather than inventing fallback absolute behavior.
- Richer cash flows remain shallow: positive cash is supported, but deposits, withdrawals, pending flows, and cash-only rebalancing are deferred.
- Tax lots remain unsupported and no tax advice or jurisdiction-specific optimization is implemented.
- No live integrations, API, UI, database, or persistence were added.

## Result

Audit result: Pass, subject to final validation command results being recorded in the final response.
