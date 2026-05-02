# Scheduled and Recurring Cash-Flow MVP Plan

Date: 2026-05-02

Implementation status: Implemented for the offline deterministic MVP.

## 1. Executive Summary

The next recommended implementation increment is scheduled and recurring cash-flow semantics. The engine already supports explicit settled and pending offline cash-flow records; the MVP should add deterministic date-bound schedule handling without introducing banking, payment, custody, execution, API, UI, database, or persistence scope.

The CLI is a first-class interface. Every implemented slice that changes engine behavior must update CLI validation, command output, help/docs, fixtures, and CLI tests or explicitly document why no CLI exposure is needed.

## 2. Baseline

Implemented cash-flow behavior:

- `PortfolioState.cashFlows` is optional.
- `DEPOSIT` and `WITHDRAWAL` directions are supported.
- `SETTLED` and `PENDING` statuses are supported.
- Settled deposits increase available cash before valuation and proposal generation.
- Settled withdrawals reduce available cash before valuation and proposal generation.
- Pending flows are excluded from valuation and proposal sizing.
- Pending flows are surfaced in cash-flow summary metadata and proposal warnings.
- Withdrawal-created cash deficits can be funded by existing sell proposal behavior.
- Raw negative cash without explicit withdrawal context remains invalid.

Implemented CLI behavior:

- `rebalance validate` validates scenario or explicit file inputs by running the deterministic engine path.
- `rebalance run` runs one scenario and renders summary, pretty, or JSON output.
- `rebalance batch` runs scenario manifests and optional expected-status manifests.
- `rebalance inspect scenarios|strategies|policies` exposes fixture and policy discoverability.
- `--strict` converts warnings into exit code `1`.
- `--output` writes command output to file.

Implemented by this increment:

- Optional `PortfolioState.cashFlowSchedules`.
- Top-level `RebalancingPolicy.evaluationDate` plus evaluation input/calendar fallback.
- ISO date-only validation.
- Deterministic one-off and `MONTHLY`/`QUARTERLY`/`ANNUAL` recurrence expansion.
- Schedule-derived settled cash-flow events in an internal evaluation copy.
- Future-schedule warnings and audit/explanation metadata.
- Scheduled/recurring fixtures, CLI help/output/tests, and documentation.

## 3. Scope

Implement:

- Terminology for realized, pending, scheduled, and recurring flows.
- Additive model/schema support for one-time scheduled flows and recurring cash-flow rules.
- Deterministic schedule expansion/evaluation against explicit dates.
- Integration with valuation, trigger evaluation, proposal generation, explanation, and audit.
- CLI validation, run, batch, inspect, help, output, and tests.
- Synthetic fixtures and expectation manifest entries.
- README, CLI docs, fixture docs, roadmap, PRD, and build journey updates.

## 4. Non-Scope

Remain deferred:

- Banking, payment, custody, execution, OMS, or market-data integrations.
- API, UI, database, persistence layer, hosted service, authentication, or authorization.
- Tax advice, jurisdiction-specific tax logic, tax-loss harvesting, or tax-aware optimization.
- Full optimizer or solver dependency.
- Business-day/holiday calendars.
- Multi-account or household cash routing.
- Recommendation of contribution or withdrawal amounts.

## 5. Slice-by-Slice Plan

### Slice 0 - Baseline Regression and Roadmap Lock

Objective:
Confirm current behavior before changing the model.

Status:
Complete. Baseline `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, scenario runner, expectation validation, and CLI smoke commands passed before implementation.

Scope:

- Run current regression checks.
- Confirm current CLI commands and fixture counts.
- Record baseline in `BUILD_JOURNEY.md`.

Out of scope:

- No code behavior changes.

Decisions required:

- None; this is a verification slice.

Files/modules likely affected:

- `BUILD_JOURNEY.md`
- Possibly `docs/roadmap/rebalancing-engine-roadmap.md`

Data structures changed:

- None.

CLI impact:

- Verify current `validate`, `run`, `batch`, and `inspect` behavior.

Tests to add/update:

- None unless baseline exposes a stale test gap.

Fixtures to add/update:

- None.

Documentation to update:

- Build journey validation entry.

Validation proof point:

- `npm test -- --runInBand`
- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`
- `npm run scenario:run`
- `node dist/runner/scenario-runner.js tests/fixtures/scenarios.json tests/fixtures/scenario-expectations.json`
- Representative CLI command such as `npm run cli -- inspect strategies`

Acceptance criteria:

- Current behavior is documented and checks pass before model changes.

Risks:

- Existing docs may contain stale historical limitations.

Commit recommendation:

- Fold into planning commit if documentation-only, or skip commit if no file changes.

### Slice 1 - Cash-Flow Terminology and Decision Lock

Objective:
Define realized, pending, scheduled, and recurring semantics before implementation.

Status:
Complete. Terminology, schedule location, evaluation date source, date semantics, recurrence scope, application semantics, CLI exposure, and non-scope are documented in the PRD and `BUILD_JOURNEY.md`.

Scope:

- Decide where schedule inputs live.
- Decide how valuation/evaluation date is supplied.
- Decide whether due scheduled flows become generated `SETTLED` events or a separate generated category.
- Decide MVP recurrence frequencies and expansion bounds.
- Update PRD/plan/domain docs accordingly.

Out of scope:

- No engine schedule expansion yet.

Decisions required:

- Schedule location: portfolio-level, policy-level, or scenario/evaluation context.
- Date source: policy calendar date, scenario metadata, or evaluation input.
- Generated event status and audit representation.
- Recurrence frequency subset.

Files/modules likely affected:

- `docs/prd/scheduled-recurring-cash-flow-prd.md`
- `docs/plans/scheduled-recurring-cash-flow-mvp-plan.md`
- `README.md`
- `tests/fixtures/README.md`
- `BUILD_JOURNEY.md`

Data structures changed:

- None in code unless documenting type stubs is explicitly chosen.

CLI impact:

- Draft CLI help/output expectations before code.

Tests to add/update:

- Optional documentation-only CLI acceptance checklist.

Fixtures to add/update:

- None yet.

Documentation to update:

- PRD, plan, build journey, possibly README/fixture docs.

Validation proof point:

- Documentation review plus full baseline checks if files are formatted by Prettier.

Acceptance criteria:

- Decisions are documented with alternatives, rationale, implementation impact, and validation plan.

Risks:

- Prematurely choosing a model that conflicts with future API shape.

Commit recommendation:

- `docs: lock scheduled cash-flow semantics`

### Slice 2 - Cash-Flow Schedule Data Model

Objective:
Add optional model/schema support for scheduled and recurring flows.

Status:
Complete. Domain types and validation for scheduled/recurring inputs were added.

Scope:

- Add TypeScript interfaces/types.
- Add validation helpers for IDs, directions, dates, amounts, and recurrence fields.
- Preserve backward compatibility for existing `PortfolioState.cashFlows`.

Out of scope:

- No valuation or proposal behavior change beyond validation unless schedule data is supplied.

Decisions required:

- Exact field names.
- Whether generated event types are public or internal.

Files/modules likely affected:

- `src/models/domain.ts`
- `src/core/valuation.ts` or a new cash-flow module if justified
- `tests/valuation.test.ts` or new cash-flow tests
- `tests/fixtures.test.ts`

Data structures changed:

- Add optional scheduled/recurring flow structures.

CLI impact:

- `validate` must fail invalid schedule shapes once accepted by model.
- `inspect policies` or fixture inspection may need field descriptions.

Tests to add/update:

- Unit tests for valid and invalid model inputs.
- CLI validation test for invalid schedule input.

Fixtures to add/update:

- Add at least one invalid schedule fixture if validation is implemented in this slice.

Documentation to update:

- README, fixture README, PRD/plan.

Validation proof point:

- Unit tests and CLI validation test pass.

Acceptance criteria:

- Existing fixtures pass unchanged.
- Invalid schedule inputs fail explicitly.

Risks:

- Overloading `PortfolioState` with too much planning metadata.

Commit recommendation:

- `feat: model scheduled cash-flow inputs`

### Slice 3 - Schedule Expansion / Effective-Date Evaluation

Objective:
Convert schedules into applicable cash-flow events for a valuation date or analysis window.

Status:
Complete. Pure expansion logic classifies applied, future, and already represented generated events deterministically.

Scope:

- Implement deterministic expansion.
- Bound recurrence expansion.
- Generate deterministic event IDs.
- Return applied and excluded event metadata.

Out of scope:

- No proposal behavior changes until expansion is integrated with valuation.

Decisions required:

- Expansion inclusivity: on-date counts as due.
- Future event representation in audit/explanation.

Files/modules likely affected:

- New `src/core/cash-flows.ts` or equivalent if cohesive.
- `src/core/valuation.ts`
- `src/core/index.ts`
- Unit tests.

Data structures changed:

- Internal expansion result type.

CLI impact:

- `validate` should catch expansion errors such as unbounded recurrence.

Tests to add/update:

- Before/on/after date tests.
- Monthly/quarterly/annual recurrence tests.
- Duplicate generated ID tests.

Fixtures to add/update:

- Valid due and future scheduled fixtures.

Documentation to update:

- Fixture README and PRD/plan decision notes.

Validation proof point:

- Expansion unit tests pass and existing regression suite remains stable.

Acceptance criteria:

- Generated events are deterministic and bounded.

Risks:

- Month-end recurrence ambiguity.

Commit recommendation:

- `feat: expand scheduled cash flows`

### Slice 4 - Engine Integration

Objective:
Apply scheduled/recurring cash-flow events to valuation, rebalance trigger, and trade proposal behavior.

Status:
Complete. Due scheduled deposits/withdrawals flow through valuation, drift, trigger evaluation, proposal generation, and simulation via an internal portfolio copy.

Scope:

- Feed due/applicable generated flows into existing cash-flow summary logic.
- Ensure deposits affect buy proposals and withdrawals affect sell funding.
- Preserve future flow exclusion.
- Add trigger/proposal metadata where useful.

Out of scope:

- No optimizer, no cash-routing redesign, no tax-aware withdrawal funding.

Decisions required:

- Whether excluded future flows create warnings or audit-only metadata.

Files/modules likely affected:

- `src/core/evaluation.ts`
- `src/core/valuation.ts`
- `src/core/trades.ts`
- `src/models/domain.ts`
- Tests for valuation, trades, evaluation, scenario runner.

Data structures changed:

- Cash-flow summary may gain schedule-derived fields.

CLI impact:

- `run` and `batch` outputs include schedule effects through existing renderers or new fields.

Tests to add/update:

- Applied scheduled deposit.
- Applied scheduled withdrawal.
- Future excluded scheduled flow.
- Recurring deposit/withdrawal due.

Fixtures to add/update:

- Add valid scheduled and recurring fixtures plus expected statuses.

Documentation to update:

- README, fixture README.

Validation proof point:

- Engine tests plus runner manifest pass.

Acceptance criteria:

- Existing non-scheduled behavior is unchanged.
- Scheduled behavior affects valuation/proposal only when due.

Risks:

- Double-counting when caller already included due flows in `cash`.

Commit recommendation:

- `feat: apply scheduled cash-flow events`

### Slice 5 - Explanation and Audit Integration

Objective:
Make schedule effects explainable and replayable.

Status:
Complete. Audit outputs include `cashFlowScheduleSummary`, and explanation output includes scheduled-flow impact text.

Scope:

- Add explanation text for applied/excluded schedules.
- Include schedule inputs and expansion result in audit record outputs.
- Preserve deterministic audit serialization.

Out of scope:

- Persistent audit store.

Decisions required:

- Exact audit field placement and rounded output behavior.

Files/modules likely affected:

- `src/explanation/explanation.ts`
- `src/audit/audit.ts`
- `src/cli/render.ts`
- Explanation and audit tests.

Data structures changed:

- Audit output schedule metadata.

CLI impact:

- Pretty and JSON output must surface relevant schedule metadata.
- Summary output should remain concise.

Tests to add/update:

- Explanation contains applied/excluded flow context.
- Audit record captures generated events deterministically.
- CLI JSON includes schedule metadata.

Fixtures to add/update:

- Update expectations if output snapshots are used; current tests are targeted assertions.

Documentation to update:

- README CLI/output sections and fixture docs.

Validation proof point:

- Audit/explanation/CLI tests pass.

Acceptance criteria:

- A user can explain and replay schedule effects from output.

Risks:

- Human output becomes too verbose.

Commit recommendation:

- `feat: explain scheduled cash-flow effects`

### Slice 6 - CLI Integration

Objective:
Complete CLI-first exposure for scheduled/recurring cash flows.

Status:
Complete. `validate`, `run`, `batch`, and `inspect scenarios|policies` understand scheduled-flow input through files; no schedule-creation flags were added.

Scope:

- Update command help.
- Update `inspect scenarios` to show schedule-bearing scenarios if useful.
- Update `inspect policies` if policy fields are added.
- Ensure `validate`, `run`, and `batch` cover schedule behavior.
- Add CLI tests for JSON, pretty/summary, strict warnings, and invalid inputs.

Out of scope:

- Hidden CLI overrides for schedule amount/date/frequency.

Decisions required:

- Whether any schedule-specific CLI flags are justified. Default: no.

Files/modules likely affected:

- `src/cli/help.ts`
- `src/cli/commands.ts`
- `src/cli/render.ts`
- `src/cli/validation.ts`
- `tests/cli.test.ts`

Data structures changed:

- CLI inspect item may include schedule metadata.

CLI impact:

- This slice is the CLI acceptance gate.

Tests to add/update:

- Valid scheduled scenario validation.
- Invalid scheduled scenario validation.
- `run --format json` deterministic metadata.
- `batch` manifest success.
- `inspect` schedule visibility.

Fixtures to add/update:

- Use fixtures added in earlier slices.

Documentation to update:

- README CLI section and `docs/cli/cli-design.md` or audit update.

Validation proof point:

- CLI tests pass plus manual command examples.

Acceptance criteria:

- No scheduled/recurring engine capability exists without corresponding CLI behavior.

Risks:

- CLI rendering duplicates engine logic. Keep renderers display-only.

Commit recommendation:

- `feat: expose scheduled cash flows in cli`

### Slice 7 - Fixtures and Scenario Coverage

Objective:
Make scheduled/recurring behavior executable through synthetic scenarios.

Status:
Complete. Fixture coverage includes due-before, due-on-date, future, withdrawal, monthly recurring, quarterly recurring, invalid recurrence, and already-settled/double-count scenarios.

Scope:

- Add and document fixtures:
  - `scheduled_deposit_due`
  - `scheduled_withdrawal_due`
  - `scheduled_cash_flow_future_excluded`
  - `recurring_deposit_due`
  - `recurring_withdrawal_due`
  - `invalid_cash_flow_schedule`
- Update expectation manifest.
- Add runner assertions.

Out of scope:

- Real client or bank data.

Decisions required:

- Fixture names and expected error text.

Files/modules likely affected:

- `tests/fixtures/scenarios.json`
- `tests/fixtures/scenario-expectations.json`
- `tests/fixtures/README.md`
- `tests/scenario-runner.test.ts`
- `tests/fixtures.test.ts`

Data structures changed:

- Fixture schema examples.

CLI impact:

- `batch` becomes the main regression proof.

Tests to add/update:

- Fixture count and scenario ID coverage.
- Runner success/error expectations.

Fixtures to add/update:

- See scope list.

Documentation to update:

- Fixture README.

Validation proof point:

- Scenario runner and expectation manifest pass with new scenarios.

Acceptance criteria:

- Each supported schedule semantic has a synthetic fixture.

Risks:

- Fixtures become hard to maintain if too many combinations are added.

Commit recommendation:

- `test: add scheduled cash-flow scenarios`

### Slice 8 - Documentation and Hardening

Objective:
Finalize documentation and validation for the increment.

Status:
Complete pending final full validation in the implementation branch.

Scope:

- Update README, CLI docs/audit, domain docs, roadmap, PRD, MVP plan, and build journey.
- Run full checks.
- Record residual limitations and next step.

Out of scope:

- New behavior beyond bug fixes found during hardening.

Decisions required:

- Whether the increment is complete for MVP scope.

Files/modules likely affected:

- `README.md`
- `docs/cli/cli-design.md`
- `docs/cli/cli-audit.md`
- `docs/roadmap/rebalancing-engine-roadmap.md`
- `docs/prd/scheduled-recurring-cash-flow-prd.md`
- `docs/plans/scheduled-recurring-cash-flow-mvp-plan.md`
- `BUILD_JOURNEY.md`

Data structures changed:

- None unless hardening discovers needed doc corrections.

CLI impact:

- Docs must match implemented CLI behavior.

Tests to add/update:

- Only gaps found during final audit.

Fixtures to add/update:

- Only corrections.

Documentation to update:

- All user-facing and planning docs touched by the increment.

Validation proof point:

- Full test, type-check, lint, build, scenario runner, expectation manifest, and representative CLI commands pass.

Acceptance criteria:

- Documentation, code, tests, fixtures, and CLI agree.

Risks:

- Stale docs may still imply old limitations; search again before finalizing.

Commit recommendation:

- `docs: audit scheduled cash-flow increment`

## 6. Dependency Graph

| Slice                                          | Depends on |
| ---------------------------------------------- | ---------- |
| Slice 0 - Baseline Regression and Roadmap Lock | None       |
| Slice 1 - Terminology and Decision Lock        | Slice 0    |
| Slice 2 - Data Model                           | Slice 1    |
| Slice 3 - Schedule Expansion                   | Slice 2    |
| Slice 4 - Engine Integration                   | Slice 3    |
| Slice 5 - Explanation and Audit Integration    | Slice 4    |
| Slice 6 - CLI Integration                      | Slices 2-5 |
| Slice 7 - Fixtures and Scenario Coverage       | Slices 4-6 |
| Slice 8 - Documentation and Hardening          | Slices 1-7 |

## 7. Test Strategy

Engine tests:

- Cash-flow validation tests for IDs, amounts, dates, directions, recurrence frequencies, and duplicate IDs.
- Schedule expansion tests for before/on/after valuation date.
- Recurrence tests for monthly, quarterly, and annual rules.
- Valuation tests for due deposits, due withdrawals, future excluded flows, and recurring due flows.
- Trade tests for scheduled deposits funding buys and scheduled withdrawals requiring sells.
- Evaluation tests for trigger/proposal metadata.
- Explanation and audit tests for schedule effects and deterministic generated IDs.

CLI tests:

- `validate` valid scheduled scenario.
- `validate` invalid scheduled scenario.
- `run --format json` includes schedule metadata.
- `run --format pretty` includes concise schedule details.
- `batch --expectations` passes with new fixtures.
- `inspect scenarios` or `inspect policies` exposes schedule capability where applicable.
- `--strict` behavior remains correct for schedule warnings.

Fixture/runner tests:

- Fixture manifest includes all new scenario IDs.
- Expected-status manifest includes all scenario IDs.
- Runner reports valid and invalid schedule fixtures deterministically.

Regression tests:

- Existing non-scheduled scenarios remain unchanged.
- Existing CLI input modes remain compatible.

## 8. Validation Gates

| Gate   | Required validation                                                                    |
| ------ | -------------------------------------------------------------------------------------- |
| Gate A | Baseline checks pass before behavior changes.                                          |
| Gate B | Terminology and model decisions are documented.                                        |
| Gate C | Schedule model validation tests pass.                                                  |
| Gate D | Schedule expansion tests pass.                                                         |
| Gate E | Engine valuation/proposal integration tests pass.                                      |
| Gate F | Explanation and audit tests pass.                                                      |
| Gate G | CLI tests pass for validate/run/batch/inspect.                                         |
| Gate H | Fixture runner and expectation manifest pass.                                          |
| Gate I | README, CLI docs, fixture docs, roadmap, PRD, plan, and build journey reflect reality. |

Full final command set:

```bash
npm test -- --runInBand
npx tsc --noEmit
npm run lint
npm run build
npm run scenario:run
node dist/runner/scenario-runner.js tests/fixtures/scenarios.json tests/fixtures/scenario-expectations.json
npm run cli -- validate --scenario tests/fixtures/scenarios.json --scenario-id scheduled_deposit_due
npm run cli -- run --scenario tests/fixtures/scenarios.json --scenario-id recurring_quarterly_withdrawal --format json
npm run cli -- batch --scenarios tests/fixtures/scenarios.json --expectations tests/fixtures/scenario-expectations.json
```

## 9. Documentation Plan

Update during or before final hardening:

- `README.md`: current status, cash-flow semantics, CLI examples, limitations.
- `docs/roadmap/rebalancing-engine-roadmap.md`: mark implementation status accurately.
- `docs/prd/scheduled-recurring-cash-flow-prd.md`: update decisions and acceptance status.
- `docs/plans/scheduled-recurring-cash-flow-mvp-plan.md`: update slice completion status.
- `docs/cli/cli-design.md`: reflect schedule input/output behavior.
- `docs/cli/cli-audit.md`: audit CLI behavior after implementation.
- `tests/fixtures/README.md`: document every new scenario and assumptions.
- `BUILD_JOURNEY.md`: iteration entry, decisions, validation, next step.

## 10. Commit Strategy

Recommended commits:

- `docs: add roadmap and scheduled cash-flow plan`
- `docs: lock scheduled cash-flow semantics`
- `feat: model scheduled cash-flow inputs`
- `feat: expand scheduled cash flows`
- `feat: apply scheduled cash-flow events`
- `feat: explain scheduled cash-flow effects`
- `feat: expose scheduled cash flows in cli`
- `test: add scheduled cash-flow scenarios`
- `docs: audit scheduled cash-flow increment`

Do not push partial, failing, exploratory, or ambiguous work. Before pushing, confirm the working tree state and summarize commits to be pushed.
