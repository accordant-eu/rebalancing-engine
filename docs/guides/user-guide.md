# User Guide

Date: 2026-05-02

This guide explains how to use the offline rebalancing engine and its CLI. It reflects the current repository behavior, not planned production capabilities.

## What This Engine Does

The engine evaluates a synthetic or caller-supplied portfolio against a target allocation and rebalancing policy. It calculates valuation, current weights, drift, strategy trigger status, proposed trades, post-trade simulation, explanations, and audit records.

Current implemented capabilities:

- Offline deterministic valuation from holdings, cash, and price snapshots.
- Drift calculation against target weights.
- Threshold strategy, calendar due-date strategy, and manual forced rebalance strategy.
- Full-reset trade proposals.
- Boundary trade proposals using absolute or relative tolerance bands.
- Decimal-backed internal arithmetic with explicit output rounding for explanations and serialized audit output.
- Settled and pending cash-flow records.
- Scheduled and recurring cash-flow schedules for offline planning.
- Generic tax-lot allocation metadata for sell trades.
- Minimum-trade warnings.
- Post-trade simulation with residual drift and sell-side turnover.
- Explanation and audit-record generation.
- Fixture scenario execution through the runner and CLI.

Current non-goals:

- No jurisdiction-specific tax advice or tax optimization.
- No live market data.
- No banking, custody, payment initiation, or execution integration.
- No order-management system integration.
- No API, UI, database, persistence, authentication, or deployment layer.
- No full optimizer or solver-backed transaction-cost optimization.
- No business-day, holiday-calendar, time-zone, or settlement-calendar model.

## Quick Start

Install dependencies:

```bash
npm install
```

Run all tests:

```bash
npm test
```

Inspect available strategies:

```bash
npm run cli -- inspect strategies
```

Validate the fixture manifest:

```bash
npm run cli -- validate --scenario tests/fixtures/scenarios.json
```

Run one scenario:

```bash
npm run cli -- run --scenario tests/fixtures/scenarios.json --scenario-id one_asset_out_of_band --format pretty
```

Run all fixture scenarios against expected statuses:

```bash
npm run cli -- batch --scenarios tests/fixtures/scenarios.json --expectations tests/fixtures/scenario-expectations.json
```

## Input Model

The CLI accepts either scenario input or explicit input files.

Scenario mode reads a single scenario object or a manifest shaped as:

```json
{
  "scenarios": [
    {
      "id": "one_asset_out_of_band",
      "description": "Synthetic example",
      "portfolioState": {},
      "targetAllocation": {},
      "priceSnapshot": {},
      "policy": {}
    }
  ]
}
```

Explicit file mode assembles one scenario from four JSON files:

- `--portfolio`: `PortfolioState`
- `--prices`: `PriceSnapshot`
- `--target`: `TargetAllocation`
- `--policy`: `RebalancingPolicy`

Scenario mode and explicit file mode are mutually exclusive.

### Portfolio State

`PortfolioState` lives in [src/models/domain.ts](../../src/models/domain.ts). It includes:

- `accountId`: synthetic or caller-supplied account identifier.
- `cash`: starting cash before explicit cash-flow adjustment.
- `holdings`: instrument quantities.
- `cashFlows`: optional settled or pending deposit/withdrawal records.
- `cashFlowSchedules`: optional scheduled or recurring planning records.

Holdings use `instrumentId` and `quantity`. Optional `taxLots` may be attached to a holding. Tax lots must have positive quantities, unique non-empty lot IDs per holding, and quantities that sum to the holding quantity.

### Prices

`PriceSnapshot` is a map from instrument ID to price:

```json
{
  "prices": {
    "AAPL": 150,
    "MSFT": 300
  }
}
```

Every held or proposed-trade instrument must have a positive price.

### Target Allocation

`TargetAllocation.targets` contains instrument weights. Weights are decimal fractions such as `0.6` for 60%. Target weights must sum to 100%, within the engine tolerance. Holdings outside the target universe are treated as target weight zero and may be proposed for sale.

### Policy and Strategy Selection

`RebalancingPolicy` controls strategy and proposal behavior:

- `strategyType`: `threshold`, `calendar`, or `manual`; omitted defaults to `threshold`.
- `absoluteDriftTolerance`: required absolute drift tolerance.
- `relativeDriftTolerance`: optional relative drift tolerance.
- `minimumTradeSize`: required minimum estimated trade value.
- `executionTargetMode`: `full_reset` by default, or `boundary`.
- `boundaryBandMode`: `absolute` by default in boundary mode, or `relative`.
- `calendar`: required only for `strategyType: "calendar"`.
- `evaluationDate`: ISO date-only string used for scheduled cash flows outside calendar strategy.
- `sellSelectionMode`: `FIFO`, `LIFO`, `HIGHEST_COST`, or `LOWEST_COST` for sell lot allocation.

The CLI intentionally has no `--strategy` override. Strategy selection remains in scenario or policy input so audit records match reviewed input files.

### Cash Flows

`cashFlows` are explicit cash-flow records:

- `SETTLED DEPOSIT` increases available cash before valuation and proposal generation.
- `SETTLED WITHDRAWAL` decreases available cash before valuation and proposal generation.
- `PENDING` flows are excluded from valuation and trade sizing, but appear in warnings and audit metadata.
- Raw negative cash is invalid for proposal generation unless the deficit is caused by an explicit settled withdrawal flow.

### Scheduled and Recurring Cash Flows

`cashFlowSchedules` are offline planning inputs. They do not initiate payments or custody movement.

One-off schedules use `effectiveDate`. Recurring schedules support `MONTHLY`, `QUARTERLY`, and `ANNUAL` with optional `endDate` or `occurrenceCount`. An explicit `evaluationDate` is required when schedules are supplied.

Events with `effectiveDate <= evaluationDate` are expanded into schedule-derived settled cash flows in an internal portfolio copy. Future events are excluded from valuation and proposal sizing, but warnings, explanations, and audit metadata report them. Generated event IDs use `schedule:<cashFlowScheduleId>:<effectiveDate>`. If an explicit cash flow already uses that ID, the generated event is treated as already represented to avoid double counting.

## Output Model

A successful run produces an audit-backed recommendation. JSON output wraps the scenario result and audit record. Important fields include:

- `outputs.strategyType`: selected strategy.
- `outputs.executionTargetMode` and `outputs.boundaryBandMode`: proposal sizing mode.
- `outputs.driftMeasurements`: current weight, target weight, absolute drift, relative drift, and out-of-band flag per instrument.
- `outputs.trigger`: whether strategy conditions triggered a rebalance, reason, and strategy metadata.
- `outputs.tradeProposal`: proposed trades, post-trade cash estimate, warnings, and lot allocations when present.
- `outputs.postTradeSimulation`: post-trade state, valuation, weights, residual drift, and sell-side turnover.
- `outputs.explanation`: deterministic human explanation derived from outputs.
- `outputs.cashFlowSummary`: settled and pending explicit cash-flow summary when cash flows are present.
- `outputs.cashFlowScheduleSummary`: applied, future, and already represented schedule events when schedules are present.

Human summary output is concise. Pretty output includes trades, warnings, scheduled cash-flow summary, explanation text, and turnover.

## Warnings and Errors

Errors are blocking. Examples include missing prices, invalid target allocation sums, unsupported strategy IDs, invalid cash-flow amounts, unsupported recurrence frequencies, and missing `evaluationDate` when schedules are supplied.

Warnings are non-blocking unless `--strict` is used. Current warning codes include:

- `MINIMUM_TRADE_SIZE`: a proposed trade was suppressed because its estimated value is below `minimumTradeSize`.
- `PENDING_CASH_FLOW_EXCLUDED`: pending cash flows were excluded from valuation and trade sizing.
- `FUTURE_CASH_FLOW_SCHEDULED`: future scheduled cash-flow events were excluded from valuation and trade sizing.

Exit codes:

- `0`: success.
- `1`: validation failed, scenario error, batch expectation mismatch, or strict warning failure.
- `2`: CLI usage error.
- `3`: unexpected runtime/internal error.

## Common Workflows

List scenarios:

```bash
npm run cli -- inspect scenarios --scenarios tests/fixtures/scenarios.json
```

Run a threshold scenario:

```bash
npm run cli -- run --scenario tests/fixtures/scenarios.json --scenario-id one_asset_out_of_band --format pretty
```

Run a calendar scenario:

```bash
npm run cli -- run --scenario tests/fixtures/scenarios.json --scenario-id calendar_due --format pretty
```

Run a scheduled-flow scenario:

```bash
npm run cli -- run --scenario tests/fixtures/scenarios.json --scenario-id recurring_monthly_contribution --format json
```

Write deterministic JSON to a file:

```bash
npm run cli -- run --scenario tests/fixtures/scenarios.json --scenario-id one_asset_out_of_band --format json --output tmp/recommendation.json
```

Write one output file per batch scenario:

```bash
npm run cli -- batch --scenarios tests/fixtures/scenarios.json --expectations tests/fixtures/scenario-expectations.json --output-dir tmp/batch-results --force
```

## Troubleshooting

If a manifest has more than one scenario, `run` requires `--scenario-id`.

If `validate` reports warnings and exits `1`, check whether `--strict` was used. Without `--strict`, warnings do not fail successful commands.

If scheduled cash flows fail with a missing evaluation date, add `policy.evaluationDate` for threshold/manual workflows or `policy.calendar.evaluationDate` for calendar workflows.

If relative boundary mode fails for a zero-target instrument, use absolute boundary mode or full reset. Relative boundaries are undefined around zero target weight when a trade is required.

If a tax-lot sell mode based on cost fails, provide `unitCost` for every lot in the sold holding.
