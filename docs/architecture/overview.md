---
type: Architecture
title: Overview
description: Documentation for overview
tags: [architecture]
timestamp: 2026-06-14T00:00:00Z
---

# Architecture Overview

Date: 2026-05-02

The rebalancing engine is an offline deterministic TypeScript calculation core with a thin CLI and fixture runner. It has no live integrations, no persistence, no API server, and no UI.

## High-Level Flow

```text
Scenario / explicit JSON files
        |
        v
CLI input loader or scenario runner
        |
        v
evaluateRebalance
        |
        +--> scheduled cash-flow expansion
        +--> valuation and current weights
        +--> drift calculation
        +--> strategy trigger evaluation
        +--> shared trade proposal generation
        +--> post-trade simulation
        +--> explanation generation
        +--> audit record generation
        |
        v
CLI summary / pretty / JSON output
```

## Main Layers

### Domain Layer

Location: [src/models/domain.ts](../../src/models/domain.ts)

The domain layer defines input and output shapes:

- Portfolio state, holdings, tax lots, cash flows, and cash-flow schedules.
- Price snapshots.
- Target allocations.
- Rebalancing policies.
- Strategy identifiers and strategy interface.
- Drift, trigger, proposal, warning, and trade types.

The public domain model remains number-based. Decimal-backed arithmetic is an internal implementation detail.

### Core Calculation Layer

Location: [src/core/](../../src/core)

The core layer owns deterministic financial behavior:

- Valuation from holdings, prices, cash, and settled cash flows.
- Current weight calculation.
- Drift calculation and target sum validation.
- Scheduled/recurring cash-flow expansion.
- Full-reset and boundary trade proposal generation.
- Minimum-trade warning generation.
- Generic tax-lot allocation metadata.
- Post-trade simulation and residual drift.
- Numeric and rounding policy.
- End-to-end orchestration through `evaluateRebalance`.

Core modules do not fetch external data, read system time for evaluation dates, or initiate money/security movement.

### Strategy Layer

Location: [src/strategy/](../../src/strategy)

Strategies evaluate trigger conditions and return `TriggerResult`.

Implemented strategies:

- `threshold`: tolerance-band trigger.
- `calendar`: due-date trigger from caller-supplied calendar dates.
- `manual`: always-trigger forced rebalance.

Strategies are registered in `STRATEGY_REGISTRY` in [src/core/evaluation.ts](../../src/core/evaluation.ts). `supportedStrategyTypes()` exposes the registry for tests and CLI discovery.

Trade proposal logic is shared today. Strategy-specific proposal behavior should be added only after a documented decision.

### Explanation and Audit Layer

Locations:

- [src/explanation/explanation.ts](../../src/explanation/explanation.ts)
- [src/audit/audit.ts](../../src/audit/audit.ts)

Explanations are deterministic text derived from trigger, proposal, warning, schedule, and simulation outputs. They should not perform separate financial calculations.

Audit records include original inputs and outputs needed to replay or review a recommendation. Serialized output numbers are rounded centrally. Audit records are the JSON recommendation contract used by the CLI.

### CLI Layer

Location: [src/cli/](../../src/cli)

The CLI is the first-class offline user interface. It supports:

- `validate`
- `run`
- `batch`
- `inspect scenarios`
- `inspect strategies`
- `inspect policies`

The CLI loads files/stdin, invokes engine or runner code, renders output, and returns documented exit codes. It does not change strategy selection or financial semantics through hidden overrides.

### Fixture and Runner Layer

Locations:

- [src/runner/scenario-runner.ts](../../src/runner/scenario-runner.ts)
- [tests/fixtures/](../../tests/fixtures)

The runner executes synthetic scenario fixtures independently and returns deterministic success/error results. The expected-status manifest validates regression outcomes without embedding assertions inside scenario input.

Fixtures are the main executable documentation for engine behavior and must remain synthetic.

## Domain Object Relationships

```text
ScenarioFixture
  portfolioState
    holdings
      taxLots?
    cashFlows?
    cashFlowSchedules?
  priceSnapshot
  targetAllocation
  policy
    strategyType?
    calendar?
    executionTargetMode?
    boundaryBandMode?
    sellSelectionMode?

evaluateRebalance -> AuditRecord
  inputs
  outputs
    driftMeasurements
    trigger
    tradeProposal
    postTradeSimulation
    explanation
    cashFlowSummary?
    cashFlowScheduleSummary?
```

## Boundaries and Non-Goals

The current architecture intentionally stops at offline deterministic calculation.

Out of scope:

- Live market data.
- Banking/custody/payment initiation.
- Trade execution and OMS integration.
- API server, UI, database, persistence, auth, deployment, and operations.
- Jurisdiction-specific tax advice.
- Full optimizer and solver dependency.
- Business-day, holiday, settlement, and time-zone calendars.

## Extension Points

Supported extension points:

- Add a new strategy trigger module and register it.
- Add policy fields when they are documented and tested.
- Add proposal modes or constraints in shared core trade logic.
- Add fixture scenarios and expectation entries.
- Extend explanation and audit outputs when outputs change.
- Extend CLI inspect/rendering where user-facing behavior changes.

Extension discipline:

- Record meaningful decisions before changing semantics.
- Keep shared calculation behavior in core modules.
- Keep strategies focused on trigger behavior.
- Expose new engine capabilities through CLI or document non-exposure.
- Update docs, tests, fixtures, audit/explanation behavior, and `BUILD_JOURNEY.md` together.

## Known Limitations

- Public interfaces use numbers rather than decimal strings.
- Validation is engine-path validation, not independent schema validation.
- Fixture schema is TypeScript-shaped JSON rather than a published JSON Schema.
- Strategy-specific proposal hooks are deferred.
- CLI config files and CLI strategy overrides are deferred.
- Production API, persistence, and integration boundaries are deferred.
