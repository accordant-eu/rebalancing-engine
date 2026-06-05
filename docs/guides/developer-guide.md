# Developer Guide

Date: 2026-05-02

This guide explains how to work on the rebalancing engine without breaking the current architecture, fixtures, CLI behavior, auditability, or documentation standards.

## Repository Structure

- [src/models/domain.ts](../../src/models/domain.ts): public domain interfaces and strategy contract.
- [src/core/](../../src/core): deterministic valuation, drift, cash-flow expansion, proposal generation, post-trade simulation, numeric policy, and orchestration.
- [src/strategy/](../../src/strategy): strategy trigger modules.
- [src/explanation/](../../src/explanation): deterministic explanation text generated from outputs.
- [src/audit/](../../src/audit): audit record generation and serialized-output rounding.
- [src/runner/](../../src/runner): scenario fixture runner and expectation validation.
- [src/cli/](../../src/cli): offline CLI parser, input loading, command execution, validation, rendering, and help.
- [tests/](../../tests): unit, integration, fixture, CLI, runner, explanation, and audit tests.
- [tests/fixtures/](../../tests/fixtures): synthetic scenario manifest and expected-status manifest.
- [docs/](../../docs): PRDs, plans, audits, CLI docs, roadmap, architecture docs, and guides.
- [BUILD_JOURNEY.md](../../BUILD_JOURNEY.md): decision log and iteration journal.

## Main Flow

The public orchestration function is `evaluateRebalance` in [src/core/evaluation.ts](../../src/core/evaluation.ts).

Flow:

1. Resolve explicit evaluation date from evaluation input, policy, or calendar policy.
2. Expand due scheduled cash flows into an internal portfolio copy.
3. Calculate valuation and current weights.
4. Calculate drift against target allocation.
5. Select strategy from the registry.
6. Evaluate trigger.
7. Generate proposal if triggered; otherwise return no trades with relevant warnings.
8. Simulate post-trade portfolio state.
9. Generate explanation.
10. Generate audit record.

Financial calculation modules stay deterministic and offline. They do not read wall-clock time, fetch market data, call external services, or mutate caller inputs.

## Domain Model Overview

The main public types are in `src/models/domain.ts`:

- `PortfolioState`, `Holding`, `TaxLot`
- `CashFlow`, `CashFlowSchedule`, `CashFlowRecurrence`
- `PriceSnapshot`
- `TargetAllocation`
- `RebalancingPolicy`
- `DriftMeasurement`
- `TriggerResult`
- `TradeProposal`, `ProposedTrade`, `ProposedLotAllocation`
- `StrategyInterface`

Public interfaces remain number-based for compatibility. Internally, money, weights, drift, and quantity calculations use `decimal.js` helpers in [src/core/numeric.ts](../../src/core/numeric.ts). Rounding is applied at output boundaries, especially explanation formatting and audit serialization.

## Core Calculation Modules

- [valuation.ts](../../src/core/valuation.ts): validates holdings and tax lots, applies settled cash flows, excludes pending cash flows, and calculates holdings value, available cash, total value, and weights.
- [drift.ts](../../src/core/drift.ts): validates target sum and calculates absolute/relative drift. Out-of-universe holdings are treated as zero target.
- [cash-flows.ts](../../src/core/cash-flows.ts): validates schedule input and expands one-off/monthly/quarterly/annual schedules against an explicit evaluation date.
- [trades.ts](../../src/core/trades.ts): generates full-reset or boundary proposals, applies minimum-trade suppression, creates cash-flow warnings, and attaches sell lot allocation metadata.
- [simulation.ts](../../src/core/simulation.ts): replays exact proposed trades, reconciles cash, calculates residual drift, and computes sell-side turnover.
- [evaluation.ts](../../src/core/evaluation.ts): orchestrates the full recommendation path and owns strategy selection.

Do not duplicate valuation, drift, cash-flow, trade-sizing, or simulation logic in strategies, CLI modules, explanations, or tests.

## Strategy Architecture

Strategies are trigger evaluators. They implement `StrategyInterface.evaluateTrigger(state, drift, policy)` and return a `TriggerResult`.

Current strategies:

- [threshold.ts](../../src/strategy/threshold.ts): triggers when any drift measurement is out of band.
- [calendar.ts](../../src/strategy/calendar.ts): triggers when `calendar.evaluationDate >= calendar.nextRebalanceDate`.
- [manual.ts](../../src/strategy/manual.ts): always triggers.

The registry in `evaluation.ts` maps strategy IDs to stateless strategy instances. `supportedStrategyTypes()` exposes discovery for tests and CLI `inspect strategies`.

Proposal sizing is currently shared. Policy fields such as `executionTargetMode`, `boundaryBandMode`, and `sellSelectionMode` influence shared proposal logic rather than strategy modules.

## CLI Architecture

CLI modules are intentionally thin:

- [options.ts](../../src/cli/options.ts): small local parser and option validation.
- [input.ts](../../src/cli/input.ts): scenario, manifest, explicit file, and stdin loading.
- [commands.ts](../../src/cli/commands.ts): command behavior and inspect metadata.
- [validation.ts](../../src/cli/validation.ts): validate command engine-path execution.
- [render.ts](../../src/cli/render.ts): summary, pretty, and JSON output.
- [help.ts](../../src/cli/help.ts): help text.

The CLI must not reimplement financial behavior. It loads input, calls runner/evaluation paths, renders output, and returns documented exit codes.

## Fixture and Scenario Architecture

The fixture manifest is [tests/fixtures/scenarios.json](../../tests/fixtures/scenarios.json). It is shaped as `{ "scenarios": [...] }`, where each scenario has `id`, `description`, `portfolioState`, `targetAllocation`, `priceSnapshot`, and `policy`.

[tests/fixtures/scenario-expectations.json](../../tests/fixtures/scenario-expectations.json) records expected `success` or `error` statuses and expected error text where relevant. Keep it aligned whenever scenarios are added, removed, or intentionally changed.

Fixtures must be synthetic. Do not commit real client data, personal data, production account IDs, tokens, or provider responses.

When changing fixtures:

1. Update the scenario manifest.
2. Update the expectations manifest.
3. Update [tests/fixtures/README.md](../../tests/fixtures/README.md).
4. Add or update tests that assert the behavior.
5. Validate with the runner and CLI batch command.

## Audit and Explanation Architecture

Explanation text is generated from trigger, proposal, simulation, and schedule summary outputs. It should explain what happened without recalculating independent financial state.

Audit records include original inputs and deterministic outputs. `serializeAuditRecord` and CLI JSON normalize outputs with centralized rounding. Do not remove fields from audit output without a documented compatibility decision and regression tests.

When adding output fields, update:

- Audit model and generator.
- JSON renderer expectations if needed.
- Explanation behavior if user-facing.
- CLI reference and examples.
- Fixture/runner tests.

## Numeric and Rounding Policy

Use helpers from [src/core/numeric.ts](../../src/core/numeric.ts). Do not use ad hoc rounding inside core calculations.

Current output precision policy:

- Explanation quantities: 6 decimals.
- Explanation money and percentages: 2 decimals.
- Serialized audit prices: 6 decimals.
- Serialized audit quantities: 8 decimals.
- Serialized audit money values: 6 decimals.
- Serialized audit weights, drift, and turnover: 10 decimals.

Public TypeScript interfaces are still number-based. A string/decimal public API remains a future production decision.

## Testing Approach

Run focused tests while editing, then run the full validation gate before commit.

Common commands:

```bash
npm test
npx tsc --noEmit
npm run lint
npm run build
npm run scenario:run
node dist/runner/scenario-runner.js tests/fixtures/scenarios.json tests/fixtures/scenario-expectations.json
npm run cli -- inspect strategies
npm run cli -- validate --scenario tests/fixtures/scenarios.json --scenario-id on_target
```

Note: Because the project is written in TypeScript, you must run `npm run build` before executing the CLI binary or the scenario runner directly. Otherwise, you may run stale build artifacts from the `dist/` directory.

Focused examples:

```bash
npm test -- --runInBand tests/cli.test.ts
npm test -- --runInBand tests/evaluation.test.ts tests/scenario-runner.test.ts
```

## Documentation and Decision Expectations

Meaningful changes require documentation updates. At minimum, consider:

- README for user-facing capability changes.
- User guide for behavior and workflows.
- CLI reference for command/output changes.
- Developer guide for architecture and workflow changes.
- Strategy extension guide for strategy changes.
- Fixture README for fixture changes.
- BUILD_JOURNEY decision log and iteration entry.
- PRD/plan/audit docs for substantial capability changes.

Use the project decision structure: Decision, Status, Date, Context, Options considered, Preferred option, Rationale, Implementation impact, and Validation. If a decision is deferred, document the default behavior, revisit point, risk, and whether it blocks current work.

## Safe Extension Checklist

Before code changes:

1. Inspect relevant source, tests, docs, fixtures, and current git status.
2. State assumptions and identify meaningful decisions.
3. Choose the smallest reversible change that fits existing architecture.
4. Decide whether CLI exposure is required.

During implementation:

1. Keep domain logic out of CLI and explanation modules.
2. Keep strategies focused on trigger behavior.
3. Reuse valuation, drift, cash-flow, trade, and simulation helpers.
4. Add synthetic fixtures only.
5. Add tests at the lowest useful level and one integration path when behavior crosses modules.

Before commit:

1. Run relevant focused tests.
2. Run the full validation gate when practical.
3. Review `git diff`.
4. Update docs and `BUILD_JOURNEY.md`.
5. Confirm no generated junk or secrets are staged.
