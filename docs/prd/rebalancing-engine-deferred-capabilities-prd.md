# Deferred Capabilities PRD

Date: 2026-05-02

## 1. Background and Current MVP Status

The repository contains a completed offline deterministic MVP and completed next-iteration multi-strategy MVP. The current engine supports valuation, current weights, drift calculation, threshold/manual/calendar trigger strategies, full-reset and absolute-boundary trade sizing, minimum trade warnings, post-trade simulation, explanations, audit records, fixture tests, and a scenario runner.

Baseline verification on 2026-05-02:

- Original MVP slices 0-12 are documented as complete.
- Next-iteration MVP slices 0-8 are documented as complete.
- Current active documentation marks completed scope as complete.
- Full Jest suite, TypeScript build, ESLint, and scenario runner pass before this increment.
- Remaining capabilities are post-MVP scope, not unfinished MVP work.

## 2. Deferred Capability Inventory

| Capability                              | Current status                                                                                                        | Partial support                                                                                              | Product value                                               | Complexity                                                                                             | Architectural impact                                                      | Testability                                                           | Risk to existing behavior                                    | Scope decision                                                          |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------- |
| Decimal / rounding policy               | JavaScript `number` arithmetic and ad hoc `toFixed` display formatting.                                               | Epsilon tolerances exist in drift/trade/simulation tests and validation.                                     | High: correctness, reproducibility, and trust.              | Medium: can be introduced behind existing public number interfaces first.                              | Medium: central numeric helpers and explicit output rounding policy.      | High with precision regression and deterministic serialization tests. | Medium if internal math changes without compatibility gates. | Include now.                                                            |
| Relative-boundary targeting             | Trigger logic already supports optional relative drift tolerance; boundary trade sizing uses absolute tolerance only. | Relative drift is calculated and can trigger rebalance.                                                      | Medium-high: extends policy semantics without integrations. | Medium: needs policy shape, edge-case rules, and proposal math.                                        | Medium: touches policy, drift/boundary semantics, explanations, fixtures. | High with direct trade and runner fixtures.                           | Low-medium if absolute behavior remains default.             | Include now.                                                            |
| Richer cash flows                       | Positive cash is included in valuation and can fund buys; negative cash is rejected for proposals.                    | Cash-aware buy proposals exist, but no explicit deposits, withdrawals, pending flows, or cash-only workflow. | Medium-high: practical portfolio workflow.                  | High: affects valuation timing, trigger logic, proposal generation, warnings, audit, and explanations. | High: requires explicit cash-flow domain model and funding semantics.     | Medium-high, but many edge cases.                                     | Medium-high.                                                 | Defer to the next workflow increment.                                   |
| Tax lots                                | No tax-lot model or lot-aware sell selection.                                                                         | None.                                                                                                        | Medium for taxable accounts, low for generic MVP users.     | High due to data structures, sell selection, and jurisdiction sensitivity.                             | High if trade sizing becomes lot-aware.                                   | Medium: primitives testable, optimization less so.                    | Medium-high.                                                 | Defer; later limit to generic lot-selection primitives, not tax advice. |
| Full optimizer                          | Rule-based proposal generation only.                                                                                  | Boundary targeting is a deterministic transaction-cost-aware proof point.                                    | Medium later for complex constraints.                       | High: objective definition, solver choice, explainability, dependencies.                               | High.                                                                     | Medium-low until objectives are clear.                                | High.                                                        | Defer. No solver dependency now.                                        |
| Live integrations / API / UI / database | Offline library/CLI-style engine only.                                                                                | Scenario runner provides executable batch boundary.                                                          | Low now until domain behavior stabilizes.                   | High operational, security, and testing cost.                                                          | High.                                                                     | Medium with adapter tests, but live behavior would be brittle.        | High.                                                        | Defer. Keep core decoupled from IO.                                     |

## 3. Selected Scope

Preferred option: **Option A - Correctness and Policy Semantics Increment**.

Included:

- Decimal / rounding policy.
- Relative-boundary targeting.
- Related tests, fixtures, explanations, audit output, README, fixture docs, and build journey updates.

Excluded:

- Richer cash flows.
- Tax lots.
- Full optimizer.
- Live integrations, API, UI, and database.

## 4. Rationale

This option strengthens correctness and policy semantics without opening multiple workflow fronts at once. Numeric policy is a prerequisite for trustworthy financial output. Relative-boundary targeting is a coherent extension of the already implemented boundary mode and existing relative drift trigger support. The slice is reversible because the public API can continue accepting and returning numbers while internal calculation and output boundaries become explicit.

Richer cash flows are deferred because they require a separate domain decision about when flows affect valuation, trigger logic, funding, and audit records. Tax lots and optimizer work depend on clearer sell-selection and objective semantics. Production surfaces are deferred until the offline core stabilizes under richer domain policies.

## 5. User and System Use Cases

- A developer can inspect a single documented rounding policy for quantities, prices, values, weights, drift, turnover, and serialized outputs.
- A portfolio operator can choose absolute-boundary mode or relative-boundary mode for threshold policies.
- A reviewer can replay scenario runner output and see deterministic, rounded audit records.
- Existing threshold, calendar, manual, and absolute-boundary fixtures continue to behave materially the same.

## 6. Functional Requirements

- The engine must keep existing public domain inputs and outputs number-based for compatibility in this increment.
- Internal financial calculations must avoid silent presentation rounding.
- Rounding must occur only at explicit output/serialization boundaries or user-facing text boundaries.
- The rounding policy must define separate precision for prices, quantities, money values, weights, drift, and turnover.
- Audit serialization must be deterministic under the documented output rounding policy.
- Threshold policies must preserve current absolute tolerance behavior by default.
- Boundary execution must support a policy-selected absolute or relative band mode.
- Relative-boundary mode must calculate boundaries as `targetWeight +/- targetWeight * relativeDriftTolerance`.
- Relative-boundary mode must reject zero target weights because relative bands are undefined around zero.
- Relative-boundary mode must reject policies without `relativeDriftTolerance`.
- Explanations and audit records must identify the execution target mode and boundary band mode where relevant.

## 7. Non-Functional Requirements

- Determinism: identical inputs must produce identical rounded serialized audit output.
- Backward compatibility: existing fixtures and tests must pass unless expectations are expanded for additive metadata.
- Auditability: precision and boundary semantics must be explicit.
- Minimal dependency footprint: add a decimal dependency only if it materially improves calculation correctness and is documented.
- Reversibility: keep the public API stable and confine numeric-policy changes to core helpers and serialization boundaries.

## 8. Domain Model Impact

Expected changes:

- Add a `RoundingPolicy` model or equivalent central policy definition.
- Add an execution boundary band mode to threshold policies, such as `absolute` and `relative`.
- Preserve `executionTargetMode: "boundary"` as the trade-sizing switch.
- Extend trade proposals or audit output with boundary metadata if needed for explanation and replay.

## 9. Policy / Schema Impact

- Existing `absoluteDriftTolerance` remains required for backward-compatible threshold behavior.
- Existing `relativeDriftTolerance` remains optional and continues to support trigger evaluation.
- New boundary band mode defaults to `absolute`.
- Relative-boundary mode requires `relativeDriftTolerance`.

## 10. Explanation and Audit Impact

- Explanations must continue using display-oriented formatting and should not duplicate calculation logic.
- Audit records must serialize rounded outputs deterministically while preserving input snapshots.
- Audit output should make boundary band mode visible when boundary execution is used.

## 11. Acceptance Criteria

- Full existing test suite passes.
- Existing scenario runner fixtures pass.
- New precision tests cover values such as `0.1 + 0.2`-style decimal-sensitive calculations.
- Audit serialization is deterministic, preserves input snapshots, and uses documented output precision for outputs.
- Absolute-boundary behavior remains backward compatible.
- Relative-boundary scenario triggers and trades to the nearest relative boundary.
- Zero-target relative-boundary policy fails explicitly.
- Relative-boundary metadata appears in trade proposal, explanation, and audit output.
- README, fixture docs, implementation plan, and build journey reflect implemented and deferred scope.

## 12. Risks

- Decimal migration may create small expected-value changes in tests.
- Rounding audit outputs too early could reduce replay precision.
- Relative-boundary semantics can be confusing for very small target weights.
- Adding a dependency may require network access and package-lock churn.

Mitigations:

- Keep internal math precise and defer rounding to explicit boundaries.
- Preserve input snapshots in audit records.
- Reject zero-target relative-boundary policies and document small-target caution.
- Keep changes small and validate after each slice.

## 13. Open Questions

- Whether a later public API should expose decimal strings instead of numbers.
- Whether richer cash-flow workflows should treat pending flows as valuation inputs or proposal constraints.
- Whether future tax-lot primitives should support FIFO/LIFO/highest-cost or require caller-specified lots first.
