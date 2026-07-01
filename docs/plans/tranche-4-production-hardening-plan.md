---
type: Plan
title: Tranche 4 - Production Hardening Plan
description: Implementation plan for transitioning to a Live Trading Agent
timestamp: 2026-07-01T00:00:00Z
---

# Tranche 4: Production Hardening

This plan structures Tranche 4 (moving to a Live Trading Agent) into distinct, testable MVP slices. 

## Goal Description
Transition the rebalancing engine from a "Paper Trading" agent (Tranche 3) to a "Live Trading" agent that manages real capital safely. This requires moving audit logs to a persistent database, handling real-world execution reports (partial fills, rejections), and establishing robust operator alerting.

## Task Progress

- [ ] **Slice 1: Live Webhook & Execution Reconciliation**
  - [ ] Implement `src/api/webhooks/broker-reports.ts`
  - [ ] Update `LiveStateManager` for partial fill parsing
  - [ ] Add `Orders` table to SQLite schema
- [ ] **Slice 2: Persistent Audit & Compliance Sink**
  - [ ] Add `AuditTrails` table to SQLite schema
  - [ ] Refactor `DefaultAuditSink`
  - [ ] Update API endpoints to query database
- [ ] **Slice 3: Alerting & Safety Notifications**
  - [ ] Create `src/notifications/webhook-notifier.ts`
  - [ ] Connect `systemEventBus` to dispatcher
- [ ] **Slice 4: TCO Optimizer Un-Mocking (Stretch)**
  - [ ] Connect `PercentageSlippageModel` to live data

---

## Slice 1: Live Webhook & Execution Reconciliation
To handle actual execution reports from the broker.

### `src/api/webhooks/broker-reports.ts` (New)
- Implement handlers for `fill`, `partial_fill`, `canceled`, and `rejected` webhooks.
### `src/orchestrator/state.ts` (Modify)
- Update `LiveStateManager` to parse partial fills and incrementally update `Holdings` and `Cash` based on execution reports rather than assuming instant 100% fills.
### `src/db/sqlite.ts` (Modify)
- Add an `Orders` table to track order IDs, statuses, expected quantities, and actual filled quantities.

---

## Slice 2: Persistent Audit & Compliance Sink
To replace the text-based `.jsonl` audit trail with a robust, queryable sink.

### `src/db/sqlite.ts` (Modify)
- Add an `AuditTrails` table to store `eventId`, `accountId`, `type`, `inputs`, `outputs` (as JSON strings), and `timestamp`.
### `src/audit/audit.ts` (Modify)
- Modify the `DefaultAuditSink` to write to the `AuditTrails` SQLite table instead of appending to `audit-trail.jsonl`.
### `src/api/server.ts` (Modify)
- Refactor the `/api/logs` and `/api/portfolios/:id/proposals` endpoints to query the `AuditTrails` table instead of reading files via `fs.ts`.

---

## Slice 3: Alerting & Safety Notifications
To ensure operators are notified of critical system events.

### `src/notifications/webhook-notifier.ts` (New)
- Create a simple webhook dispatcher that implements `NotificationAdapter`.
### `src/cli/agent.ts` (Modify)
- Wire up the `systemEventBus` to listen for critical events like `CIRCUIT_BREAKER_HALT` or `STALE_FEED` and dispatch them via the `WebhookNotifier`.
- Add `ALERT_WEBHOOK_URL` to `.env.example`.

---

## Slice 4: TCO Optimizer Un-Mocking (Stretch/Optional)
To replace the hardcoded 5bps slippage model.

### `src/orchestrator/loop.ts` (Modify)
- Connect the mocked `PercentageSlippageModel` to a live spread or historical slippage database lookup to ensure drift optimization is based on factual execution costs rather than hardcoded assumptions.

---

## Verification Plan

### Automated Tests
- Add unit tests simulating partial fills and verify the `LiveStateManager` updates state correctly without generating duplicate orders.
- Add tests to ensure `AuditTrails` SQLite insertions work correctly.

### Manual Verification
- Simulate an Alpaca webhook for a partial fill and observe the engine's next evaluation cycle.
- Trigger a Circuit Breaker halt and verify the generic webhook receives the alert payload.
- Verify audit queries via the Týr API retrieve JSON payloads from the database.
