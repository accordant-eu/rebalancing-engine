---
type: Decision Record
title: Holistic Audit Remediation & Domain Invariants
description: Establishes domain and architectural decisions for corporate action dividend valuation, deposit allocation modes, and calendar scheduler trigger handoff following the 2026-10-16 holistic review.
tags: [architecture, domain, corporate-actions, cash-flow, scheduler, adr]
timestamp: 2026-10-16T08:36:00Z
status: Accepted
supersedes: None
---

# ADR-0067: Holistic Audit Remediation & Domain Invariants

## Context

During the [2026-10-16 Holistic Codebase & Architecture Review](../audits/holistic-codebase-review-2026-10-16.md), three cross-cutting domain and lifecycle interactions required explicit architectural resolution before executing the 6-chunk remediation plan:

1. **Corporate Action Cash Dividend Valuation (`src/core/corporate-actions.ts` vs. `src/core/valuation.ts`):** `applyCorporateActionToPortfolio` increments `portfolio.cash` by `dividendTotal` and appends a `SETTLED` deposit `CashFlow` (`div-${instrumentId}-${exDate}`). When `calculateValuation` subsequently calls `summarizeCashFlows(state.cash, state.cashFlows)`, it adds all `SETTLED` deposits to `state.cash`, double-counting the dividend in in-memory evaluations while SQLite reloads only `PENDING` cash flows.
2. **Policy Deposit Allocation Mode (`depositAllocationMode` in `src/models/domain.ts`):** `RebalancingPolicy.depositAllocationMode` (`'REBALANCING' | 'CURRENT_WEIGHT' | 'FIXED_TARGET'`) was exposed in the domain schema, OpenAPI specification, and React `MandateBuilderForm`, but was never implemented in `src/core/trades.ts`.
3. **Calendar Mandate Scheduler Handoff (`src/orchestrator/scheduler.ts` vs. `src/strategy/calendar.ts`):** `MandateSchedulerService.scanAndEnqueue` advances `policy.calendar.nextRebalanceDate` to the next period in SQLite immediately upon enqueuing a due account. When `Orchestrator` or `BatchEvaluationWorker` later dequeues and evaluates the account, `CalendarRebalanceStrategy.evaluateTrigger` sees the future `nextRebalanceDate` and returns `CALENDAR_NOT_DUE` (`shouldRebalance: false`).

## Options Considered

### 1. Corporate Action Cash Dividend Accounting
- **Option 1A (Stop incrementing `portfolio.cash` in `applyCorporateActionToPortfolio`):**
  - *Benefits:* Matches offline fixture conventions where `state.cash` is pre-cash-flow base cash.
  - *Costs/Risks:* Breaks `CorporateActionResult.cashAdjustment` (`currentPortfolio.cash - startingCash`) and causes data loss in `SqliteStateManager.applyCorporateAction`, which persists `portfolio.cash` to `Portfolios.cash` and only reloads `PENDING` cash flows.
- **Option 1B (Stop appending `CashFlow` records for dividends):**
  - *Benefits:* Avoids double-counting in `summarizeCashFlows`.
  - *Costs/Risks:* Loses structured dividend cash-flow provenance in `PortfolioState.cashFlows` and audit records.
- **Option 1C (Recognize settled corporate-action dividend cash flows in `summarizeCashFlows` as already credited to `state.cash`):**
  - *Benefits:* Preserves `updatedPortfolio.cash`, `CorporateActionResult.cashAdjustment`, and the structured `div-*` `CashFlow` record, while ensuring `summarizeCashFlows` derives `startingCash = state.cash - creditedDividendFlows` so `availableCash` equals `state.cash` (+ any uncredited external settled flows) across both in-memory and SQLite-reloaded paths.
  - *Reversibility:* High.

### 2. `depositAllocationMode` Handling
- **Option 2A (Remove `depositAllocationMode` from domain, UI, and OpenAPI):**
  - *Benefits:* Eliminates an unimplemented field.
  - *Costs/Risks:* Breaking contract change for API clients and UI forms.
- **Option 2B (Implement `depositAllocationMode` deterministically in `src/core/trades.ts`):**
  - *Benefits:* Honors the documented domain, OpenAPI, and UI contract with deterministic `decimal.js` math (`'REBALANCING'` rebalances full portfolio value; `'FIXED_TARGET'` deploys positive investable cash pro-rata to normalized target weights; `'CURRENT_WEIGHT'` deploys positive investable cash pro-rata to current holding weights).
  - *Reversibility:* High.

### 3. Calendar Mandate Scheduler Handoff
- **Option 3A (Defer `nextRebalanceDate` advancement until after worker execution):**
  - *Benefits:* `CalendarRebalanceStrategy` sees the original `nextRebalanceDate`.
  - *Costs/Risks:* Repeated scheduler scans before worker consumption would repeatedly re-enqueue or fail to advance dates in dry-run/scan-only workflows (`POST /api/admin/scheduler/scan`).
- **Option 3B (Record `lastTriggeredRebalanceDate` on `CalendarRebalancingConfig` when advancing `nextRebalanceDate`):**
  - *Benefits:* Keeps `scanAndEnqueue` idempotent while allowing `CalendarRebalanceStrategy.evaluateTrigger` to recognize that the current evaluation date was triggered by the schedule (`evalDate >= nextRebalanceDate || (lastTriggeredRebalanceDate !== undefined && evalDate >= lastTriggeredRebalanceDate)`).
  - *Reversibility:* High.

## Decision

We adopt **Option 1C**, **Option 2B**, and **Option 3B**, and execute the full repository remediation across the 6 dependency-ordered chunks defined in the [Holistic Codebase Review Remediation Plan](../plans/holistic-review-remediation-plan.md).

## Rationale

These choices preserve all existing public API, UI, and fixture contracts while restoring strict mathematical determinism, SQLite state parity, and end-to-end lifecycle correctness between the scheduler, evaluation queue, and core rebalancing strategies.

## Implementation Impact

- **Code:** `src/core/valuation.ts`, `src/core/corporate-actions.ts`, `src/core/trades.ts`, `src/core/simulation.ts`, `src/core/evaluation.ts`, `src/core/overlays.ts`, `src/orchestrator/scheduler.ts`, `src/strategy/calendar.ts`, `src/orchestrator/sqlite-state.ts`, `src/api/`, and `web/src/`.
- **Tests:** Expanded unit and integration coverage across `tests/` and `web/src/`.
- **Documentation:** Updated ADR registry, OpenAPI specification, guides, and `scripts/validate-docs.sh`.

## Follow-up

Track execution across Chunks 1–6 in `docs/plans/holistic-review-remediation-plan.md` and `BUILD_JOURNEY.md`.

&copy; 2026 Johan Hellman. All rights reserved.
