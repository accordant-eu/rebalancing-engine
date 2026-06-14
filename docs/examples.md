---
type: Reference
title: Examples
description: Documentation for examples
tags: [root]
timestamp: 2026-06-14T00:00:00Z
---

# Examples

Date: 2026-05-02

These examples are copy-pasteable from the repository root. They use synthetic fixture data only.

## Validate a Scenario Manifest

```bash
npm run cli -- validate --scenario tests/fixtures/scenarios.json
```

Expected behavior: validation runs every scenario through the deterministic engine path and reports valid/invalid counts plus warnings.

Validate one scenario:

```bash
npm run cli -- validate --scenario tests/fixtures/scenarios.json --scenario-id on_target
```

## Run a Threshold Strategy Scenario

```bash
npm run cli -- run --scenario tests/fixtures/scenarios.json --scenario-id one_asset_out_of_band --format pretty
```

Expected behavior: threshold strategy triggers because AAPL and MSFT breach tolerance bands. The pretty output shows a sell for AAPL, a buy for MSFT, no warnings, and post-trade residual drift within tolerance.

JSON output:

```bash
npm run cli -- run --scenario tests/fixtures/scenarios.json --scenario-id one_asset_out_of_band --format json
```

## Run Boundary Proposal Scenarios

Absolute boundary mode:

```bash
npm run cli -- run --scenario tests/fixtures/scenarios.json --scenario-id threshold_boundary_target --format pretty
```

Relative boundary mode:

```bash
npm run cli -- run --scenario tests/fixtures/scenarios.json --scenario-id threshold_relative_boundary_target --format pretty
```

Expected behavior: boundary mode trades breached assets to the nearest configured tolerance boundary instead of fully resetting to target.

## Run Calendar and Manual Strategy Coverage

Calendar due:

```bash
npm run cli -- run --scenario tests/fixtures/scenarios.json --scenario-id calendar_due --format pretty
```

Calendar not due:

```bash
npm run cli -- run --scenario tests/fixtures/scenarios.json --scenario-id calendar_not_due --format pretty
```

Expected behavior: calendar strategy does not trigger because the evaluation date is before the next rebalance date.

Manual strategy is implemented and covered by unit tests. The current fixture manifest does not include a dedicated manual scenario, so there is no fixture-based manual CLI example in this document.

## Run Cash-Flow Scenarios

Settled deposit:

```bash
npm run cli -- run --scenario tests/fixtures/scenarios.json --scenario-id settled_deposit_cash_flow --format pretty
```

Pending cash flow:

```bash
npm run cli -- run --scenario tests/fixtures/scenarios.json --scenario-id pending_cash_flow --format pretty
```

Expected behavior for pending flows: valuation and proposal sizing exclude the pending cash flow, and output contains a structured warning.

Strict warning behavior:

```bash
npm run cli -- validate --scenario tests/fixtures/scenarios.json --scenario-id pending_cash_flow --strict
```

Expected behavior: command exits `1` because warnings are treated as failures.

## Run Scheduled and Recurring Cash-Flow Scenarios

Due scheduled deposit:

```bash
npm run cli -- run --scenario tests/fixtures/scenarios.json --scenario-id scheduled_deposit_due --format pretty
```

Future scheduled deposit:

```bash
npm run cli -- run --scenario tests/fixtures/scenarios.json --scenario-id scheduled_deposit_future --format pretty
```

Expected behavior for future schedules: future events are excluded from valuation and proposal sizing, with a `FUTURE_CASH_FLOW_SCHEDULED` warning.

Recurring monthly contribution:

```bash
npm run cli -- run --scenario tests/fixtures/scenarios.json --scenario-id recurring_monthly_contribution --format json
```

Recurring quarterly withdrawal:

```bash
npm run cli -- run --scenario tests/fixtures/scenarios.json --scenario-id recurring_quarterly_withdrawal --format pretty
```

Expected behavior: due recurring events up to the evaluation date are expanded into schedule-derived settled cash flows in an internal portfolio copy.

## Run Tax-Lot Scenario

```bash
npm run cli -- run --scenario tests/fixtures/scenarios.json --scenario-id tax_lot_fifo_sell --format json
```

Expected behavior: the aggregate sell trade is unchanged, and the sell trade includes deterministic FIFO `lotAllocations` metadata.

## Run Batch Scenarios

Run all scenarios:

```bash
npm run cli -- batch --scenarios tests/fixtures/scenarios.json
```

Validate expected statuses:

```bash
npm run cli -- batch --scenarios tests/fixtures/scenarios.json --expectations tests/fixtures/scenario-expectations.json
```

Write one output file per scenario:

```bash
npm run cli -- batch --scenarios tests/fixtures/scenarios.json --expectations tests/fixtures/scenario-expectations.json --output-dir tmp/batch-results --force
```

## Write Output Files

Single run JSON:

```bash
npm run cli -- run --scenario tests/fixtures/scenarios.json --scenario-id one_asset_out_of_band --format json --output tmp/one-asset-out-of-band.json
```

Batch aggregate JSON:

```bash
npm run cli -- batch --scenarios tests/fixtures/scenarios.json --format json --output tmp/batch-summary.json
```

## Inspect Repository Inputs

Strategies:

```bash
npm run cli -- inspect strategies
```

Policy fields:

```bash
npm run cli -- inspect policies
```

Scenarios:

```bash
npm run cli -- inspect scenarios --scenarios tests/fixtures/scenarios.json
```

## Stdin Scenario Input

For a complete single scenario JSON file:

```bash
cat scenario.json | npm run cli -- validate --scenario -
cat scenario.json | npm run cli -- run --scenario - --format json
```

Stdin is not supported for explicit input files or batch manifests.

## Runner Without the CLI

The lower-level fixture runner is still available:

```bash
npm run scenario:run
node dist/runner/scenario-runner.js tests/fixtures/scenarios.json tests/fixtures/scenario-expectations.json
```

The second command requires `npm run build` first if `dist` is stale or missing.
