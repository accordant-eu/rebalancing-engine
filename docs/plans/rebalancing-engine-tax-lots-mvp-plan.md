---
type: Implementation Plan
title: Rebalancing Engine Tax Lots Mvp Plan
description: Documentation for rebalancing engine tax lots mvp plan
tags: [plan]
timestamp: 2026-06-14T00:00:00Z
---

# Tax Lot Foundations MVP Plan

Date: 2026-05-02

Implementation status: Complete for the selected generic tax-lot foundations scope.

## 1. Baseline

Current engine status:

- Decimal/rounding policy is implemented.
- Relative-boundary targeting is implemented.
- Explicit offline cash flows are implemented.
- Sell trades are aggregate instrument-level proposals without lot allocation.

## 2. Selected Scope

Included:

- Optional holding-level tax lots.
- Lot aggregation validation.
- Deterministic sell allocation metadata.
- FIFO, LIFO, highest-cost, and lowest-cost modes.
- Tests, fixtures, explanation, audit, README, fixture docs, and build journey updates.

Deferred:

- Tax optimization.
- Jurisdiction-specific tax rules.
- Wash-sale logic.
- Tax-loss harvesting.
- Broker/custodian integrations.
- Optimizer-driven lot-aware sizing.

## 3. Slice Plan

### Slice 0 - Baseline

Goal:
Confirm merged main is clean and validated.

### Slice 1 - Domain Model and Lot Validation

Goal:
Add optional tax-lot data and validate aggregation.

Status:
Complete.

Scope:

- Add `TaxLot` model.
- Add optional `Holding.taxLots`.
- Validate lot quantity sums during valuation.
- Add unit tests for valid and inconsistent lot data.

### Slice 2 - Sell Allocation Modes

Goal:
Allocate sell trade quantities across lots when lot data is available.

Status:
Complete.

Scope:

- Add `SellSelectionMode`.
- Add optional `RebalancingPolicy.sellSelectionMode`.
- Add `ProposedTrade.lotAllocations`.
- Implement FIFO, LIFO, highest-cost, lowest-cost.
- Add unit tests for all modes and missing cost errors.

### Slice 3 - Fixtures, Docs, Audit

Goal:
Expose lot-aware sell allocation in executable scenarios.

Status:
Complete.

Scope:

- Add lot-aware sell fixture.
- Update scenario expectations and runner tests.
- Update README, fixture docs, PRD/plan, build journey.
- Create audit report.

## 4. Validation Gates

- `npm test -- --runInBand`
- `npm run build`
- `npm run lint`
- `npm run scenario:run`
- `npm run build && node dist/runner/scenario-runner.js tests/fixtures/scenarios.json tests/fixtures/scenario-expectations.json`
- `npm run format`

## 5. Commit Strategy

- `docs: scope tax lot foundations`
- `feat: validate tax lot holdings`
- `feat: allocate sell trades by lot`
- `docs: audit tax lot increment`


&copy; 2026 Johan Hellman. All rights reserved.
