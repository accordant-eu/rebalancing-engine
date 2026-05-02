# Scheduled and Recurring Cash-Flow PRD

Date: 2026-05-02

Implementation status: Planned. No scheduled or recurring cash-flow engine behavior is implemented yet.

## 1. Title

Scheduled and Recurring Cash-Flow Semantics for the Offline Rebalancing Engine

## 2. Background

The current engine supports explicit offline cash-flow records on `PortfolioState.cashFlows`. Supported directions are `DEPOSIT` and `WITHDRAWAL`; supported statuses are `SETTLED` and `PENDING`. Settled flows affect valuation and proposal sizing. Pending flows are excluded from valuation and proposal sizing but are surfaced in cash-flow summary metadata, warnings, explanation, and audit output.

The remaining limitation is that the engine cannot model scheduled future deposits or withdrawals, recurring contribution plans, or recurring decumulation/withdrawal plans. Callers must pre-expand all flows into settled or pending records before invoking the engine.

Scheduled and recurring cash flows matter because portfolio rebalancing often responds to planned contributions and withdrawals. Handling those plans explicitly can reduce unnecessary trades, improve auditability, and make scenario review more realistic without adding banking, custody, payment, or execution integrations.

This PRD is the recommended next roadmap increment because it extends implemented cash-flow foundations, remains deterministic and offline, can be tested with synthetic fixtures, and fits the CLI-first project boundary.

## 3. Product Objective

Add deterministic, auditable scheduled and recurring cash-flow semantics that can be evaluated for a supplied valuation date or analysis window, integrated into trigger and proposal behavior, exposed through the CLI, and documented without adding production infrastructure or external services.

## 4. Scope

Included:

- Scheduled deposits.
- Scheduled withdrawals.
- Recurring deposits.
- Recurring withdrawals.
- Effective dates.
- Explicit valuation-date interaction.
- Distinction between realized, pending, scheduled, and recurring cash-flow inputs.
- Deterministic expansion of applicable scheduled/recurring flows.
- Interaction with rebalance trigger logic.
- Interaction with trade proposal generation.
- Explanation and audit records showing how scheduled/recurring flows affected the recommendation.
- CLI validation, run, batch, inspect, output, tests, and documentation.

Provisional terminology:

- Realized flow: a cash movement already reflected as settled cash or represented by a `SETTLED` cash-flow record.
- Pending flow: a known cash movement not yet available for valuation or proposal sizing.
- Scheduled flow: a one-time dated future cash-flow intent.
- Recurring flow: a rule that produces dated scheduled flow instances.

## 5. Out of Scope

- Banking integration.
- Payment initiation.
- Custody integration.
- Execution integration.
- Database persistence.
- API or UI implementation.
- Tax advice.
- Jurisdiction-specific treatment.
- Full optimizer.
- Recommendations about the amount or timing of contributions/withdrawals.
- Multi-account or household cash routing.
- Business-day, holiday, or market-calendar adjustment unless separately scoped.

## 6. User Stories

- As a developer running synthetic scenarios, I want fixtures for scheduled deposits, scheduled withdrawals, recurring deposits, and recurring withdrawals so that date semantics are reproducible.
- As a product or strategy reviewer, I want to inspect how planned contributions or withdrawals affect recommendation timing and trade sizing without needing live banking data.
- As an operator reviewing recommendation output, I want explanations and warnings that distinguish applied, excluded, and future cash-flow events.
- As a CLI user, I want `rebalance validate`, `rebalance run`, `rebalance batch`, and `rebalance inspect` to understand scheduled cash-flow inputs and render deterministic outputs.
- As a future API consumer, I want the offline semantics documented before any wire contract or persistence model is introduced.

## 7. Functional Requirements

Cash-flow data model:

- Existing `CashFlow` records remain backward compatible.
- Scheduled and recurring inputs must be optional.
- Each scheduled or recurring cash-flow source must have a stable ID.
- Direction must be explicit: `DEPOSIT` or `WITHDRAWAL`.
- Amount must be positive.
- Effective dates must be explicit ISO date strings.
- Invalid dates must fail explicitly.

Schedule model:

- One-time scheduled flows must define an effective date.
- A scheduled flow before or on the valuation date may be converted into an applicable cash-flow event according to documented status semantics.
- A scheduled flow after the valuation date remains unapplied and must not silently affect valuation.

Recurrence model:

- Recurring flows must define start date, frequency, amount, direction, and ID.
- MVP recurrence should prefer a small explicit set such as monthly, quarterly, and annually.
- Infinite recurrence must be bounded by valuation date or an explicit analysis window to avoid unbounded expansion.
- Generated events must have deterministic IDs derived from the source schedule ID and occurrence date.

Effective date and valuation-date behavior:

- The engine must not read system time.
- The valuation/evaluation date must be supplied explicitly.
- Applicable generated events must be deterministic for identical inputs.
- The PRD implementation plan must decide whether applicable scheduled flows become `SETTLED`, `PENDING`, or a separate schedule-derived category.

Validation rules:

- Reject missing IDs, missing dates, invalid dates, unsupported frequencies, non-positive amounts, unsupported directions, and unbounded recurrence without an evaluation bound.
- Detect duplicate source IDs and duplicate generated event IDs.
- Prevent ambiguous double-counting between scalar `cash`, existing `cashFlows`, and generated schedule events through documentation and explicit validation where feasible.

Trigger behavior:

- Applied scheduled/recurring flows must affect valuation and drift only under the chosen semantics.
- Future scheduled flows outside the valuation date or analysis window must not trigger rebalancing by themselves in the MVP unless explicitly scoped.
- Trigger metadata should record whether cash-flow schedules were considered and how many events were applied or excluded.

Trade proposal behavior:

- Applied deposits should be available for buy proposals under the existing proposal path.
- Applied withdrawals may reduce available cash and can be funded by sell proposals under existing deficit-funding behavior.
- Excluded future or pending flows must not silently change trade sizing.
- Proposal warnings must distinguish excluded pending and excluded future scheduled flows when applicable.

Explanation behavior:

- Explanation output must state whether scheduled/recurring flows affected the recommendation.
- Explanation output must distinguish applied flows from excluded future or pending flows.

Audit behavior:

- Audit records must include input schedules, generated applicable flow events, excluded future events or counts, and cash-flow summary metadata.
- Audit output must be deterministic and rounded according to the existing numeric policy.

CLI command/option behavior:

- `rebalance validate` must validate scheduled/recurring cash-flow inputs.
- `rebalance run` must apply scheduled/recurring semantics when included in input files.
- `rebalance batch` must run scheduled cash-flow fixtures and expectation manifests.
- `rebalance inspect scenarios` should identify scenarios that include scheduled/recurring cash-flow inputs.
- `rebalance inspect policies` should list schedule-related policy fields if policy fields are introduced.

Fixture/scenario behavior:

- Add synthetic scenarios for one-time scheduled deposit, one-time scheduled withdrawal, recurring deposit, recurring withdrawal, future excluded flow, and invalid schedule.
- Add expected-status manifest entries for new valid and invalid fixtures.

## 8. Non-Functional Requirements

- Determinism: identical inputs produce identical generated events and outputs.
- Testability: behavior is covered by unit, integration, fixture, runner, and CLI tests.
- Explicit date handling: no system time, no implicit locale parsing, no hidden calendar dependency.
- Reproducibility: audit records contain enough input and expansion metadata to replay the recommendation.
- Explainability: output must explain applied and excluded flow effects.
- Auditability: schedule source, expansion result, warnings, and proposal effects must be serialized.
- Backward compatibility: existing fixtures without schedules continue to pass unchanged.
- No external service dependency: no bank, custodian, payment, market-data, database, API, or UI dependency.

## 9. CLI Requirements

Commands affected:

- `rebalance validate`
- `rebalance run`
- `rebalance batch`
- `rebalance inspect scenarios`
- `rebalance inspect policies`, if policy-level schedule fields are introduced

Flags/options:

- Prefer no new schedule override flags in the first implementation. Scheduled/recurring inputs should live in scenario, portfolio, or policy JSON files to preserve auditability.
- Existing `--scenario`, `--scenario-id`, `--portfolio`, `--prices`, `--target`, `--policy`, `--format`, `--output`, `--strict`, and `--quiet` semantics must remain compatible.

Input file/schema changes:

- Document the selected schedule shape in fixture docs and README.
- Support scheduled/recurring fields in scenario manifest mode.
- Support scheduled/recurring fields in explicit input-file mode if the fields live on `PortfolioState` or policy.

Output format changes:

- JSON output must include schedule expansion/audit metadata.
- Pretty output should show concise applied/excluded cash-flow information.
- Summary output should show warnings count and avoid excessive schedule detail.

Help text requirements:

- Root or command help must mention scheduled cash-flow support once implemented.
- `validate` and `run` examples should include at least one scheduled cash-flow fixture after implementation.

Examples:

```bash
rebalance validate --scenario tests/fixtures/scenarios.json --scenario-id scheduled_deposit_due
rebalance run --scenario tests/fixtures/scenarios.json --scenario-id recurring_withdrawal_due --format json
rebalance batch --scenarios tests/fixtures/scenarios.json --expectations tests/fixtures/scenario-expectations.json
```

Error/warning behavior:

- Invalid schedules return validation/scenario failures with exit code `1`.
- CLI usage errors remain exit code `2`.
- Warnings remain non-fatal unless `--strict` is supplied.
- Excluded future/pending schedule warnings should become strict failures under `--strict` if represented as proposal warnings.

Tests required:

- CLI validation of valid scheduled and recurring scenarios.
- CLI validation failure for invalid dates/frequencies/amounts.
- CLI `run --format json` includes deterministic schedule metadata.
- CLI `batch` expectation manifest covers new fixtures.
- CLI `inspect scenarios` identifies schedule-bearing scenarios if inspect output is expanded.

## 10. Acceptance Criteria

Engine behavior:

- Existing cash-flow behavior remains backward compatible.
- Scheduled deposits and withdrawals are evaluated deterministically against explicit dates.
- Recurring deposits and withdrawals expand deterministically within the selected bound.
- Future unapplied flows do not silently affect valuation or trade sizing.
- Invalid schedule input fails explicitly.

CLI behavior:

- `validate`, `run`, `batch`, and `inspect` behavior is updated and tested.
- JSON, pretty, and summary outputs remain deterministic and useful.
- Strict warning semantics remain consistent.

Tests:

- Unit tests cover schedule validation and expansion.
- Evaluation/trade tests cover applied deposit and withdrawal effects.
- Explanation and audit tests cover schedule metadata.
- CLI tests cover validation, run, batch, and inspect changes.
- Existing tests continue to pass.

Fixtures:

- Valid and invalid synthetic scheduled/recurring scenarios are added.
- Fixture README and expectation manifest are updated.

Documentation:

- README, CLI docs, fixture docs, roadmap, implementation plan, and `BUILD_JOURNEY.md` are updated.

Backward compatibility:

- Scenarios without scheduled/recurring flows behave unchanged.
- Existing `cashFlows` semantics remain valid.

Audit/explanation output:

- Applied and excluded scheduled/recurring flows are traceable.
- Generated event IDs are deterministic.

## 11. Risks and Mitigations

| Risk                                     | Impact                                 | Mitigation                                                                                      |
| ---------------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Date semantics ambiguity                 | Wrong flow application                 | Use explicit ISO dates, caller-supplied valuation date, and tests around before/on/after dates. |
| Recurrence complexity                    | Scope creep                            | Start with monthly/quarterly/annual and bounded expansion.                                      |
| Interaction with pending flows           | Double counting or unclear output      | Define terminology before implementation and audit generated events separately.                 |
| Overlap with banking/payment integration | Accidental production scope            | Document offline-only semantics and exclude payment initiation.                                 |
| CLI complexity                           | Hidden behavior or unaudited overrides | Keep schedules in input files and update help/output/tests.                                     |
| Backward compatibility                   | Existing fixtures regress              | Keep schedule fields optional and run full regression gates.                                    |

## 12. Open Questions

| Question                                                                             | Default assumption                                                                                      | Blocking status                        |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Where should schedules live: portfolio, policy, or scenario metadata?                | Prefer the smallest additive model aligned with existing `PortfolioState.cashFlows`; decide in Slice 1. | Blocks implementation.                 |
| What supplies valuation date?                                                        | Use explicit scenario/evaluation input, not system time.                                                | Blocks implementation.                 |
| Should due scheduled flows become `SETTLED` events or a separate generated category? | Keep generated metadata separate while applying settled-like effects only when due.                     | Blocks implementation detail.          |
| Which recurrence frequencies are MVP?                                                | Monthly, quarterly, annually.                                                                           | Not blocking PRD, blocks model design. |
| Should future scheduled flows produce warnings or informational audit metadata?      | Prefer audit/explanation metadata; warnings only when exclusion affects user expectations.              | Blocks output design.                  |
| Should business-day adjustment be supported?                                         | No for MVP.                                                                                             | Not blocking.                          |
