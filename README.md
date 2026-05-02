# rebalancing-engine

A generic, deterministic portfolio rebalancing engine. Built in TypeScript/Node.js as an offline calculation core; no live integrations, no UI.

## Overview

The engine evaluates portfolio drift against a target allocation, selects a configured strategy, produces deterministic trade proposals with minimum-trade warnings, simulates post-trade portfolio state, generates deterministic explanations, and emits replayable audit records. It is designed for auditability and reproducibility (MiFID II alignment).

**Current status:** Offline deterministic MVP plus the next multi-strategy iteration are implemented for synthetic fixtures. Supported strategies are threshold/tolerance-band, calendar due-date, and manual forced rebalance. Threshold policies support `full_reset` execution, absolute-boundary execution, and relative-boundary execution. The scenario runner supports expected-status manifest validation. The post-MVP deferred-capabilities increments have implemented explicit decimal arithmetic, output rounding policy, relative-boundary targeting, explicit offline cash-flow foundations, generic tax-lot allocation metadata, and documented optimizer and production-boundary deferrals. Post-MVP work remains for scheduled/recurring cash flows, full transaction-cost optimization, live integrations, API, UI, database, and persistence.

## Numeric Policy

Core financial calculations use `decimal.js` internally while the public TypeScript domain interfaces remain number-based for compatibility. Internal calculations are not rounded silently. Rounding is applied at explicit boundaries:

- Explanation text formats quantities to 6 decimals and monetary values/percentages to 2 decimals.
- `serializeAuditRecord` preserves input snapshots and emits deterministically rounded output numbers.
- Serialized audit output precision is centralized in `src/core/numeric.ts`: prices 6 decimals, quantities 8, money values 6, weights/drift/turnover 10.

## Boundary Targeting

Threshold policies support two execution target modes:

- `executionTargetMode: "full_reset"` restores breached portfolios to target weights.
- `executionTargetMode: "boundary"` trades breached assets to the nearest configured tolerance boundary.

Boundary mode defaults to `boundaryBandMode: "absolute"`, using `targetWeight +/- absoluteDriftTolerance`. Policies can opt into `boundaryBandMode: "relative"`, using `targetWeight +/- targetWeight * relativeDriftTolerance`. Relative-boundary mode requires `relativeDriftTolerance` and rejects zero-target instruments that require a boundary trade, because relative bands are undefined around a zero target.

## Cash Flows

`PortfolioState.cashFlows` is optional. Existing scalar `cash` remains supported. When cash flows are supplied:

- `SETTLED` `DEPOSIT` flows increase available cash before valuation and proposal generation.
- `SETTLED` `WITHDRAWAL` flows reduce available cash before valuation and proposal generation.
- Withdrawal-created cash deficits can be funded through sell proposals using the existing deterministic target-reset math.
- `PENDING` flows are excluded from valuation and trade sizing, but appear in cash-flow summary metadata and proposal warnings.
- Raw negative cash without explicit settled withdrawal context remains invalid for proposal generation.

## Tax Lots

Holdings may include optional `taxLots`. When a sell trade is proposed for a holding with tax lots, the aggregate sell quantity is unchanged and the trade includes deterministic `lotAllocations` metadata. Supported generic sell selection modes are `FIFO`, `LIFO`, `HIGHEST_COST`, and `LOWEST_COST`.

This is not tax advice, tax optimization, or jurisdiction-specific tax handling. It does not implement wash-sale rules, holding-period treatment, tax-loss harvesting, or optimizer-driven tax-aware sizing.

## Optimizer Boundary

The active proposal engine is deterministic and rule-based. It supports full-reset and boundary-target trade sizing, cash-flow effects, minimum-trade filtering, and generic lot allocation metadata. A full optimizer remains deferred until objective functions, constraints, explainability requirements, and solver dependency policy are documented.

## Production Boundary

The current delivery model is an offline library/CLI-style calculation core. No API wrapper, database, UI, live market-data integration, banking/custody integration, or trade-execution integration is implemented. Production surfaces remain deferred until concrete consumers, security requirements, persistence and retention needs, provider contracts, deployment model, and operational responsibilities are defined.

## Documentation

- [`BUILD_JOURNEY.md`](BUILD_JOURNEY.md) — Living project journal tracking assumptions, decisions, and iteration progress.
- [`AGENTS.md`](AGENTS.md) — AI-assisted development rules for this repository.
- [`docs/MVP_Implementation_Plan.md`](docs/MVP_Implementation_Plan.md) — Slice-by-slice implementation plan.
- [`docs/audits/`](docs/audits/) — Audit reports (red-team audit, test-case audit).
- [`docs/audits/final-mvp-audit.md`](docs/audits/final-mvp-audit.md) — Final MVP status, validation, and known limitations.
- [`docs/audits/next-iteration-mvp-audit.md`](docs/audits/next-iteration-mvp-audit.md) — Multi-strategy iteration status, validation, and known limitations.
- [`docs/audits/deferred-capabilities-audit.md`](docs/audits/deferred-capabilities-audit.md) — Decimal/rounding and relative-boundary increment audit.
- [`docs/audits/cash-flows-audit.md`](docs/audits/cash-flows-audit.md) — Explicit offline cash-flow increment audit.
- [`docs/audits/tax-lots-audit.md`](docs/audits/tax-lots-audit.md) — Generic tax-lot allocation increment audit.
- [`docs/audits/optimizer-feasibility-audit.md`](docs/audits/optimizer-feasibility-audit.md) — Optimizer deferral and prerequisite audit.
- [`docs/audits/production-boundary-audit.md`](docs/audits/production-boundary-audit.md) — Live integration, API, UI, and database deferral audit.
- [`docs/strategy-traceability/full-chain-rebalancing-strategy-review.md`](docs/strategy-traceability/full-chain-rebalancing-strategy-review.md) — Research-to-implementation strategy traceability.
- [`docs/prd/rebalancing-engine-next-iteration-prd.md`](docs/prd/rebalancing-engine-next-iteration-prd.md) — Next-iteration PRD.
- [`docs/plans/rebalancing-engine-next-iteration-mvp-plan.md`](docs/plans/rebalancing-engine-next-iteration-mvp-plan.md) — Next-iteration implementation plan.
- `docs/` — Background research and PRD.

## Getting Started

### Prerequisites

- Node.js ≥ 18
- npm ≥ 9

### Install

```bash
npm install
```

### Run Tests

```bash
npm test
```

Runs all unit and edge-case tests via Jest. All tests are deterministic and offline — no external services required.

### Run Tests (verbose)

```bash
npm test -- --verbose
```

### Type Check

```bash
npx tsc --noEmit
```

### Format

```bash
npm run format
```

### Run Fixture Scenario Runner

```bash
npm run scenario:run
```

Builds the project and runs all synthetic fixture scenarios through valuation, drift, policy-driven strategy selection, trigger evaluation, proposal generation, simulation, explanation, and audit record generation. Invalid fixtures are reported as deterministic per-scenario errors instead of aborting the batch.

To validate scenario results against the expected-status manifest:

```bash
npm run build
node dist/runner/scenario-runner.js tests/fixtures/scenarios.json tests/fixtures/scenario-expectations.json
```

The command exits non-zero if a scenario status or expected error message does not match the manifest.

## CLI

The repository includes a thin offline CLI wrapper around the existing engine.

```bash
npm run cli -- --help
```

After `npm run build`, the compiled CLI is available at `dist/cli/index.js`, and the package binary is named `rebalance`.

### Common Commands

```bash
npm run cli -- inspect strategies
npm run cli -- inspect scenarios --scenarios tests/fixtures/scenarios.json
npm run cli -- validate --scenario tests/fixtures/scenarios.json --scenario-id on_target
npm run cli -- run --scenario tests/fixtures/scenarios.json --scenario-id one_asset_out_of_band
npm run cli -- batch --scenarios tests/fixtures/scenarios.json --expectations tests/fixtures/scenario-expectations.json
```

### Input Modes

Scenario mode accepts either a single scenario object or a manifest shaped as `{ "scenarios": [...] }`.

```bash
npm run cli -- run --scenario tests/fixtures/scenarios.json --scenario-id one_asset_out_of_band
```

Explicit file mode assembles one scenario from separate files:

```bash
npm run cli -- run \
  --portfolio portfolio.json \
  --prices prices.json \
  --target target.json \
  --policy policy.json
```

Scenario mode and explicit file mode are mutually exclusive. Strategy selection remains in the policy or scenario file; there is no CLI `--strategy` override.

### Output Formats

The default format is `summary`. Use `--format pretty` for a more detailed human-readable report or `--format json` for deterministic machine-readable output. JSON output is written to stdout unless `--output <path>` is supplied.

```bash
npm run cli -- run --scenario tests/fixtures/scenarios.json --scenario-id one_asset_out_of_band --format json
npm run cli -- run --scenario tests/fixtures/scenarios.json --scenario-id one_asset_out_of_band --format json --output tmp/recommendation.json
```

Successful `run` JSON uses the existing audit record as the recommendation contract, including inputs, drift, trigger, proposed trades, warnings, post-trade simulation, explanation, and audit metadata.

### Exit Codes

- `0`: command completed successfully.
- `1`: validation failed, a scenario produced blocking errors, or `--strict` converted warnings into failure.
- `2`: CLI usage error, such as invalid flags, missing required inputs, or incompatible input modes.
- `3`: unexpected runtime/internal error.

Warnings are visible in human-readable output and included in JSON output. They do not fail a successful command unless `--strict` is used.

### CLI Tests

```bash
npm test -- --runInBand tests/cli.test.ts
```

The CLI is offline and file-based only. Stdin support, config files, per-scenario batch output directories, and CLI strategy overrides are intentionally deferred.

## Project Structure

```
/
├── src/
│   ├── models/domain.ts       # Domain interfaces (PortfolioState, DriftMeasurement, etc.)
│   ├── core/
│   │   ├── valuation.ts       # Market value and weight calculation
│   │   ├── drift.ts           # Drift calculation and target validation
│   │   ├── evaluation.ts      # Policy-driven strategy orchestration
│   │   ├── trades.ts          # Deterministic full-reset/boundary proposal generation
│   │   └── simulation.ts      # Post-trade holdings, weights, residual drift, turnover
│   ├── strategy/
│   │   ├── threshold.ts       # Threshold-band trigger strategy
│   │   ├── calendar.ts        # Calendar due-date trigger strategy
│   │   └── manual.ts          # Manual forced-rebalance strategy
│   ├── explanation/
│   │   └── explanation.ts     # Deterministic recommendation explanations
│   ├── audit/
│   │   └── audit.ts           # Replayable audit record generation and serialization
│   ├── cli/                   # Offline command-line wrapper
│   └── runner/
│       └── scenario-runner.ts # Offline fixture batch runner
├── tests/
│   ├── fixtures/
│   │   ├── README.md          # Fixture scenario documentation
│   │   ├── scenarios.json     # Synthetic JSON test scenarios
│   │   └── scenario-expectations.json # Expected runner success/error statuses
│   ├── smoke.test.ts          # Structural import smoke tests
│   ├── fixtures.test.ts       # Fixture schema validation
│   ├── valuation.test.ts      # Valuation and weight tests
│   ├── drift.test.ts          # Drift calculation tests
│   ├── threshold.test.ts      # Threshold strategy tests
│   ├── calendar-strategy.test.ts # Calendar strategy tests
│   ├── manual-strategy.test.ts # Manual strategy tests
│   ├── trades.test.ts         # Trade proposal generation tests
│   ├── simulation.test.ts     # Post-trade simulation tests
│   ├── explanation.test.ts    # Explanation output tests
│   ├── audit.test.ts          # Audit record and replay tests
│   ├── cli.test.ts            # CLI behavior tests
│   ├── scenario-runner.test.ts # Batch scenario runner tests
│   └── edge-cases.test.ts     # Edge-case and integration tests
└── docs/
    ├── MVP_Implementation_Plan.md
    └── audits/
        ├── red-team-audit-current.md
        └── test-case-audit.md
```
