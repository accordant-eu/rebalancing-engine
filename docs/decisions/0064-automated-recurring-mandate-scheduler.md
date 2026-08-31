---
type: Decision Record
title: Automated Recurring Mandate Scheduler Service
description: Introduce MandateSchedulerService to autonomously scan, evaluate, and enqueue calendar-due portfolios into the EvaluationQueue with deterministic date advancement.
tags: [architecture, orchestrator, scheduler, calendar, automation]
timestamp: 2026-08-31T12:20:00Z
status: Accepted
supersedes: null
---

# ADR-0064: Automated Recurring Mandate Scheduler Service

## Context

While the engine previously featured a stateless `CalendarRebalanceStrategy` capable of evaluating whether a portfolio is due for rebalancing on an explicit date ($evaluationDate \ge nextRebalanceDate$), orchestrator execution remained reactive—relying on incoming market price ticks or manual user triggers. 

For enterprise wealth management and recurring calendar mandates (e.g. monthly, quarterly, or annual rebalancing schedules), the engine required an autonomous, background scheduling service to periodically scan registered portfolios, detect due calendar dates, enqueue them into the persistent `EvaluationQueue`, and deterministically advance next rebalance dates.

## Options Considered

### Option 1: Inline Calendar Evaluation on Every Real-Time Market Tick
- **Benefits:** No separate timer or cron service.
- **Costs:** Tremendous redundant overhead scanning calendar mandates on high-frequency market data ticks; tightly couples real-time data streaming with low-frequency calendar schedules.
- **Risks:** High computational waste and risk of duplicate triggering.
- **Reversibility:** Low.

### Option 2: Dedicated Autonomous `MandateSchedulerService` Feeding `EvaluationQueue`
- **Benefits:**
  - Decoupled from real-time price feeds; runs on a configurable cron schedule (e.g., market open weekdays) or on-demand via REST endpoint.
  - Leverages the existing multi-tenant `EvaluationQueue` and throttled `BatchEvaluationWorker` for execution.
  - Pure, deterministic UTC date advancement (`advanceDateByFrequency`) handling month-end clamping (e.g., Jan 31 $\rightarrow$ Feb 28/29) and leap years.
  - Strict lifecycle management (`start()` / `stop()`) ensuring zero open-handle leaks during testing and shutdowns.
- **Costs:** Introduces a lightweight scheduler service module in `src/orchestrator/scheduler.ts`.
- **Risks:** Negligible.
- **Reversibility:** High.

## Decision

Adopt **Option 2**. Implement `MandateSchedulerService` in [`src/orchestrator/scheduler.ts`](../../src/orchestrator/scheduler.ts). 

When run (either on schedule or triggered via `POST /api/admin/scheduler/scan`):
1. Retrieves registered account states across tenants.
2. Checks if `policy.strategyType === 'calendar'` and `evaluationDate >= policy.calendar.nextRebalanceDate`.
3. Enqueues due accounts into `stateManager.enqueuePortfolio(accountId, timestampMs)` for processing by `BatchEvaluationWorker`.
4. If `policy.calendar.frequency` is `'monthly'`, `'quarterly'`, or `'annually'`, computes the next valid date using `advanceDateByFrequency` and persists the updated policy.
5. Emits a `MANDATE_SCHEDULE_EVALUATED` event on `systemEventBus`.

## Rationale

- **Autonomous Operation**: Bridges the gap between pure calculation strategies and live autonomous portfolio management.
- **Traceability & Invariance**: Date advancement uses ISO-only strings and pure UTC arithmetic, avoiding timezone ambiguities.
- **Resource Discipline**: Reuses the throttled batch evaluation worker, preventing system overload when hundreds of calendar accounts trigger simultaneously at month-end.

## Implementation Impact

- **Code:**
  - Created [`src/orchestrator/scheduler.ts`](../../src/orchestrator/scheduler.ts) (`MandateSchedulerService`, `advanceDateByFrequency`).
  - Added `MANDATE_SCHEDULE_EVALUATED` event to [`src/events/bus.ts`](../../src/events/bus.ts).
  - Added `POST /api/admin/scheduler/scan` endpoint to [`src/api/server.ts`](../../src/api/server.ts).
- **Tests:** Created comprehensive unit and integration tests in [`tests/scheduler.test.ts`](../../tests/scheduler.test.ts).
- **Documentation:** Updated decisions index, daily iteration log, and build journey.

## Validation

- Verified monthly, quarterly, annual, and month-end clamping date math.
- Verified selective enqueueing of due portfolios and preservation of explicit/threshold policies.
- Verified clean startup and shutdown lifecycles with zero Jest open handles.

&copy; 2026 Johan Hellman. All rights reserved.
