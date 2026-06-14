---
type: Decision Record
title: Place scheduled flows on `PortfolioState.cashFlowSchedules`
description: Decision to place scheduled flows on `portfoliostate.cashflowschedules`
tags: [architecture, cash-flow]
timestamp: 2026-05-02T00:00:00Z
status: Accepted
---

# Place scheduled flows on `PortfolioState.cashFlowSchedules`

## Context

Existing explicit cash-flow records live on `PortfolioState.cashFlows`, and scenario/portfolio files are the first-class offline input surface.

## Options Considered


1. Add schedules to `PortfolioState`.
   - Benefits: Keeps all account-level cash-flow inputs in one file shape; works with scenario and explicit portfolio CLI inputs.
   - Costs: Mixes current account state with planning assumptions.

2. Add schedules to `RebalancingPolicy`.
   - Benefits: Treats schedules as planning policy.
   - Costs: Less intuitive for account-level deposits/withdrawals and harder to avoid strategy-specific interpretation.

3. Add a separate cash-flow plan/evaluation context object.
   - Benefits: Cleaner future API boundary.
   - Costs: More structural complexity and CLI input-mode churn for the MVP.

## Decision

Option 1: optional `PortfolioState.cashFlowSchedules`.

## Rationale

The first implementation stays additive, file-friendly, auditable, and reversible. It preserves existing `cashFlows` behavior and avoids a larger context model before production API/persistence requirements exist.

## Implementation Impact

Added `CashFlowSchedule`, `CashFlowRecurrence`, and recurrence frequency types to `src/models/domain.ts`; fixtures use portfolio-level schedules.

## Validation

Unit, evaluation, fixture, runner, and CLI tests cover schedule input.
