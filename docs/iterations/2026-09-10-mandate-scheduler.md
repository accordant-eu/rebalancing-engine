---
type: Iteration
title: Automated Recurring Mandate Scheduler Service (ADR-0064)
description: Implementation of MandateSchedulerService for autonomous calendar rebalance evaluation, queue ingestion, and UTC date advancement.
tags: [iteration, orchestrator, scheduler, calendar, automation, adr]
timestamp: 2026-09-10T10:30:00Z
---

# Iteration: Automated Recurring Mandate Scheduler Service (ADR-0064)

## Objective
Implement an autonomous orchestrator scheduling service (`MandateSchedulerService`) to scan tenant accounts for calendar-based mandates, evaluate schedule triggers against an explicit evaluation date, enqueue due accounts into the `EvaluationQueue`, and deterministically advance next rebalance dates.

## Summary of Completed Work

### 1. Date Advancement Math (`advanceDateByFrequency`)
- Implemented pure UTC calendar arithmetic in [`src/orchestrator/scheduler.ts`](../../src/orchestrator/scheduler.ts).
- Deterministically handles monthly (+1 month), quarterly (+3 months), and annual (+12 months) increments with month-end clamping (e.g., `2026-01-31` $\rightarrow$ `2026-02-28`).

### 2. Mandate Scheduler Service (`MandateSchedulerService`)
- Created autonomous service in [`src/orchestrator/scheduler.ts`](../../src/orchestrator/scheduler.ts) that periodically scans registered portfolios across tenants.
- Evaluates calendar trigger conditions ($evaluationDate \ge nextRebalanceDate$).
- Enqueues due accounts into `stateManager.enqueuePortfolio(accountId, timestampMs)` for throttled processing by `BatchEvaluationWorker`.
- Automatically advances `nextRebalanceDate` and persists updated policy in state manager.
- Emits `MANDATE_SCHEDULE_EVALUATED` event on `systemEventBus`.

### 3. REST API & Event Integration
- Added `MANDATE_SCHEDULE_EVALUATED` event type to [`src/events/bus.ts`](../../src/events/bus.ts).
- Mounted `POST /api/admin/scheduler/scan` endpoint in [`src/api/server.ts`](../../src/api/server.ts) for on-demand admin-triggered mandate evaluations.

### 4. Comprehensive Test Suite
- Added 9 unit and integration tests in [`tests/scheduler.test.ts`](../../tests/scheduler.test.ts) covering date arithmetic, leap years, multi-tenant scanning, selective queueing, and clean lifecycle teardown.

## Files Touched
- `src/orchestrator/scheduler.ts` (Created)
- `src/events/bus.ts` (Modified)
- `src/api/server.ts` (Modified)
- `tests/scheduler.test.ts` (Created)
- `docs/decisions/0064-automated-recurring-mandate-scheduler.md` (Created)
- `docs/decisions/index.md` (Modified)
- `docs/iterations/2026-09-10-mandate-scheduler.md` (Created)
- `docs/iterations/index.md` (Modified)
- `docs/log.md` (Modified)
- `BUILD_JOURNEY.md` (Modified)

&copy; 2026 Johan Hellman. All rights reserved.
