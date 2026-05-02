# rebalancing-engine

A generic, deterministic portfolio rebalancing engine. Built in TypeScript/Node.js as an offline calculation core — no live integrations, no UI.

## Overview

The engine evaluates portfolio drift against a target allocation, applies tolerance-band threshold logic, produces deterministic full-reset trade proposals with minimum-trade warnings, and simulates post-trade portfolio state. It is designed for auditability and reproducibility (MiFID II alignment), with audit records still deferred to a later MVP slice.

**Current status:** Slices 1–7 implemented and validated (Fixtures, Valuation, Drift, Threshold Trigger, Basic Trade Proposals, Minimum Trade Rules, Post-Trade Simulation). Slices 8+ (Explanation, Audit Records, Batch Runner, Second Strategy) remain in progress.

## Documentation

- [`BUILD_JOURNEY.md`](BUILD_JOURNEY.md) — Living project journal tracking assumptions, decisions, and iteration progress.
- [`AGENTS.md`](AGENTS.md) — AI-assisted development rules for this repository.
- [`docs/MVP_Implementation_Plan.md`](docs/MVP_Implementation_Plan.md) — Slice-by-slice implementation plan.
- [`docs/audits/`](docs/audits/) — Audit reports (red-team audit, test-case audit).
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

## Project Structure

```
/
├── src/
│   ├── models/domain.ts       # Domain interfaces (PortfolioState, DriftMeasurement, etc.)
│   ├── core/
│   │   ├── valuation.ts       # Market value and weight calculation
│   │   ├── drift.ts           # Drift calculation and target validation
│   │   ├── trades.ts          # Deterministic full-reset trade proposal generation
│   │   └── simulation.ts      # Post-trade holdings, weights, residual drift, turnover
│   └── strategy/
│       └── threshold.ts       # Threshold-band trigger strategy
├── tests/
│   ├── fixtures/
│   │   ├── README.md          # Fixture scenario documentation
│   │   └── scenarios.json     # Synthetic JSON test scenarios
│   ├── smoke.test.ts          # Structural import smoke tests
│   ├── fixtures.test.ts       # Fixture schema validation
│   ├── valuation.test.ts      # Valuation and weight tests
│   ├── drift.test.ts          # Drift calculation tests
│   ├── threshold.test.ts      # Threshold strategy tests
│   ├── trades.test.ts         # Trade proposal generation tests
│   ├── simulation.test.ts     # Post-trade simulation tests
│   └── edge-cases.test.ts     # Edge-case and integration tests
└── docs/
    ├── MVP_Implementation_Plan.md
    └── audits/
        ├── red-team-audit-current.md
        └── test-case-audit.md
```
