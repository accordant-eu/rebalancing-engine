---
type: Implementation Plan
title: Rebalancing Engine Cash Flows Mvp Plan
description: Documentation for rebalancing engine cash flows mvp plan
tags: [plan]
timestamp: 2026-06-14T00:00:00Z
---

# Cash Flows MVP Plan

Date: 2026-05-02

Implementation status: Complete for the selected offline cash-flow foundations scope.

## 1. Baseline

Current engine status:

- Explicit decimal and rounding policy is implemented.
- Threshold, manual, and calendar strategies are implemented.
- Full-reset, absolute-boundary, and relative-boundary execution are implemented.
- Existing positive cash is included in valuation and proposals.
- Cash flows are not yet explicit.

## 2. Selected Scope

Included:

- Optional `PortfolioState.cashFlows`.
- Settled deposit and withdrawal valuation adjustments.
- Withdrawal-created cash deficit funding through existing proposal math.
- Pending-flow visibility without valuation/proposal impact.
- Tests, fixtures, explanation, audit, README, fixture docs, and build journey updates.

Deferred:

- Scheduled/recurring cash-flow generation.
- Cash-flow-specific optimizer.
- Tax-lot-aware withdrawals.
- Live banking/custody integrations.
- API/UI/database.

## 3. Slice Plan

### Slice 0 - Baseline

Goal:
Confirm merged main is clean and validated.

Validation:
Use existing test/build/lint/scenario commands.

### Slice 1 - Cash-Flow Domain and Valuation

Goal:
Add explicit cash-flow records and deterministic valuation semantics.

Status:
Complete.

Scope:

- Add `CashFlow` domain model.
- Validate positive amounts and supported statuses/directions.
- Apply settled deposits/withdrawals to valuation cash.
- Exclude pending flows from valuation cash.
- Add `cashFlowSummary` to valuation output.
- Add focused valuation tests.

### Slice 2 - Proposal, Simulation, Explanation, Audit

Goal:
Make settled withdrawals fundable and pending flows visible.

Status:
Complete.

Scope:

- Allow negative valuation cash when cash-flow summary indicates an explicit settled withdrawal deficit.
- Keep rejecting raw negative cash without explicit cash-flow context.
- Add pending-flow proposal warning.
- Include cash-flow summary in audit output.
- Add explanation text for pending excluded flows.

### Slice 3 - Fixtures, Runner, Docs, Audit

Goal:
Expose cash flows in executable scenarios and documentation.

Status:
Complete.

Scope:

- Add settled deposit, settled withdrawal, pending flow, and invalid cash-flow fixtures.
- Update expected-status manifest and runner tests.
- Update README and fixture docs.
- Create increment audit report.

## 4. Test Strategy

- Unit tests for cash-flow summary math.
- Proposal tests for withdrawal-funded sells and raw negative cash rejection.
- Explanation/audit tests for pending-flow visibility.
- Fixture/runner tests for new scenarios and invalid inputs.
- Full regression suite after each slice.

## 5. Validation Gates

- `npm test -- --runInBand`
- `npm run build`
- `npm run lint`
- `npm run scenario:run`
- `npm run build && node dist/runner/scenario-runner.js tests/fixtures/scenarios.json tests/fixtures/scenario-expectations.json`
- `npm run format`

## 6. Commit Strategy

- `docs: scope cash flow increment`
- `feat: model explicit cash flows`
- `feat: surface cash flow effects`
- `docs: audit cash flow increment`


&copy; 2026 Johan Hellman. All rights reserved.
