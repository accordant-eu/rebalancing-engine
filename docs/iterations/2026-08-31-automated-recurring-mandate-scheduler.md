---
type: Iteration
title: Automated Recurring Mandate Scheduler Service (ADR-0064)
description: Implemented MandateSchedulerService to autonomously scan registered portfolios, detect due calendar dates, advance recurring policy dates, and enqueue due accounts into EvaluationQueue.
tags: [iteration, orchestrator, scheduler, calendar, automation]
timestamp: 2026-08-31T12:23:00Z
---

# Iteration: Automated Recurring Mandate Scheduler Service (ADR-0064)

## Objective
Implement an autonomous orchestrator scheduling service (`MandateSchedulerService`) to scan registered portfolios across tenants, detect calendar-due trigger dates ($evaluationDate \ge nextRebalanceDate$), advance recurring dates (monthly, quarterly, annually) with deterministic UTC end-of-month clamping, enqueue due accounts into the throttled `EvaluationQueue`, and expose an admin trigger endpoint.

## Summary of Completed Work

### 1. MandateSchedulerService & Calendar Math
- Implemented `advanceDateByFrequency` in [`src/orchestrator/scheduler.ts`](../../src/orchestrator/scheduler.ts):
  - Deterministic UTC date arithmetic supporting `monthly`, `quarterly`, and `annually` frequencies.
  - End-of-month day clamping (e.g. Jan 31 $\rightarrow$ Feb 28 on standard years, Feb 29 on leap years, March 31 $\rightarrow$ April 30).
  - Strict validation of ISO date-only format (`YYYY-MM-DD`).
- Implemented `MandateSchedulerService`:
  - Configurable cron schedule (defaults to `'0 9 * * 1-5'` for weekday market open).
  - Clean lifecycle management (`start()` / `stop()`) ensuring zero open handles.
  - `scanAndEnqueue(evaluationDate?)`:
    - Retrieves registered account states across all tenants.
    - Filters for calendar strategies where `evaluationDate >= policy.calendar.nextRebalanceDate`.
    - Enqueues due accounts into `stateManager.enqueuePortfolio(accountId, timestampMs)`.
    - Auto-advances `nextRebalanceDate` and persists updated policy in state manager.
    - Emits `MANDATE_SCHEDULE_EVALUATED` event on `systemEventBus`.

### 2. Event Bus & API Integration
- Enriched `systemEventBus` in [`src/events/bus.ts`](../../src/events/bus.ts) with `MandateScheduleEvaluatedEvent` (`MANDATE_SCHEDULE_EVALUATED`).
- Added `POST /api/admin/scheduler/scan` endpoint in [`src/api/server.ts`](../../src/api/server.ts) with superadmin authorization.
- Re-exported scheduler services from [`src/orchestrator/index.ts`](../../src/orchestrator/index.ts).

### 3. Architecture Decision Record
- Authored and accepted [ADR-0064: Automated Recurring Mandate Scheduler Service](../../docs/decisions/0064-automated-recurring-mandate-scheduler.md).

### 4. Verification & Testing
- Added comprehensive unit and integration tests in [`tests/scheduler.test.ts`](../../tests/scheduler.test.ts):
  - Validated UTC calendar date advancement, year rollover, leap year handling, and end-of-month day clamping.
  - Verified due date detection, non-due skipping, strategy filtering, and auto-advancement of policy dates.
  - Verified clean start/stop lifecycle of cron task without handle leaks.
- All 46 backend test suites (339 tests) pass cleanly.

## Files Touched
- `src/orchestrator/scheduler.ts` (New)
- `src/orchestrator/index.ts` (Modified)
- `src/events/bus.ts` (Modified)
- `src/api/server.ts` (Modified)
- `tests/scheduler.test.ts` (New)
- `docs/decisions/0064-automated-recurring-mandate-scheduler.md` (New)
- `docs/decisions/index.md` (Modified)
- `docs/iterations/2026-08-31-automated-recurring-mandate-scheduler.md` (New)
- `docs/iterations/index.md` (Modified)
- `docs/log.md` (Modified)
- `BUILD_JOURNEY.md` (Modified)

&copy; 2026 Johan Hellman. All rights reserved.
