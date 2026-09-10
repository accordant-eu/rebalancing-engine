---
type: Iteration
title: Mandate Scheduler & Batch Queue UI Observability
description: Added Mandate Scheduler and Batch Queue telemetry, interactive on-demand scan triggers, and firm-level calendar horizon widgets in Command Center UI and System Ops.
tags: [iteration, ui, observability, scheduler, command-center]
timestamp: 2026-09-10T10:39:00Z
---

# Iteration: Mandate Scheduler & Batch Queue UI Observability

## Objective
Provide comprehensive UI observability and operational controls for the `MandateSchedulerService` (ADR-0064) and `BatchEvaluationWorker` across the Superadmin System Ops panel and Tenant Admin / Advisor firm dashboards.

## Summary of Completed Work

### 1. Backend Status & Summary Endpoints
- Extended `MandateSchedulerService` in [`src/orchestrator/scheduler.ts`](../../src/orchestrator/scheduler.ts) with `getStatus()` providing:
  - `isRunning`: active cron state
  - `cronSchedule`: cron cadence (`0 9 * * 1-5`)
  - `calendarAccountsCount`: count of registered calendar-strategy accounts
  - `frequencyBreakdown`: counts of `monthly`, `quarterly`, `annually`, and `explicit` mandates
  - `upcomingAccounts`: chronologically sorted accounts with `nextRebalanceDate`
- Added `GET /api/admin/scheduler/status` endpoint in [`src/api/server.ts`](../../src/api/server.ts) with superadmin authorization.
- Enhanced `GET /api/portfolios/summary` in [`src/api/routes/portfolios.ts`](../../src/api/routes/portfolios.ts) with `calendarSummary` for tenant-level visibility.

### 2. Superadmin System Ops Dashboard
- Overhauled [`web/src/components/admin/SystemOpsTab.tsx`](../../web/src/components/admin/SystemOpsTab.tsx):
  - **Live Evaluation Queue**: Real-time queue depth with live polling indicator and batch throughput info.
  - **Scheduler Cadence Card**: Cron cadence badge and auto-advance policy indicator.
  - **Recurring Cadence Breakdown**: Visual cards for `Monthly`, `Quarterly`, `Annually`, and `Explicit`.
  - **Interactive On-Demand Scan Tool**: Date selector (`input type="date"`) and action button (`POST /api/admin/scheduler/scan`) with real-time execution result banner.
  - **Upcoming Scheduled Rebalances Table**: Clean tabular view of upcoming accounts with status badges.
  - **Emergency Circuit Breaker Switch**: Refined pause/resume control.

### 3. Firm Overview Dashboard
- Enhanced [`web/src/components/FirmOverviewDashboard.tsx`](../../web/src/components/FirmOverviewDashboard.tsx) with **Scheduled Rebalance Horizon** table displaying firm-specific recurring mandates without exposing global operational switches.

### 4. Verification & Testing
- Added unit and integration tests in [`tests/api.test.ts`](../../tests/api.test.ts) verifying status payloads, scan triggers, and summary integration.
- All **46 test suites (342 tests)** and **2 Vitest suites** pass cleanly.
- Frontend production bundle builds with zero errors.

## Files Touched
- `src/orchestrator/scheduler.ts` (Modified)
- `src/api/server.ts` (Modified)
- `src/api/routes/portfolios.ts` (Modified)
- `web/src/types.ts` (Modified)
- `web/src/components/admin/SystemOpsTab.tsx` (Modified)
- `web/src/components/FirmOverviewDashboard.tsx` (Modified)
- `tests/api.test.ts` (Modified)
- `docs/iterations/2026-09-10-mandate-scheduler-observability-ui.md` (New)
- `docs/iterations/index.md` (Modified)
- `docs/log.md` (Modified)
- `BUILD_JOURNEY.md` (Modified)

&copy; 2026 Johan Hellman. All rights reserved.
