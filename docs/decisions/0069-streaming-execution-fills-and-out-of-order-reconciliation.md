---
type: Decision Record
title: Streaming Execution Fills and Out-of-Order Reconciliation
description: Implemented WebSocket streaming trade updates, idempotent out-of-order execution report reconciliation, and fill telemetry emission.
tags: [broker, streaming, websockets, reconciliation, state-manager, telemetry]
timestamp: 2026-10-19T20:15:00Z
status: Accepted
supersedes: none
---

# Streaming Execution Fills and Out-of-Order Reconciliation

## Context

Prior to this decision, the engine relied primarily on periodic polling via `BrokerSyncService` and webhook notifications to learn about order status changes and trade fills. While adequate for low order volumes, polling introduces latency, triggers broker rate limits at scale, and leaves the shadow ledger vulnerable to inconsistent updates when execution confirmations arrive out-of-order or duplicate identical states.

Additionally, `AlpacaBrokerStreamer` only parsed `fill` and `partial_fill` events, lacked auto-reconnection on socket drops, and `SqliteStateManager.processExecutionReport` used floating-point arithmetic without checking order `updatedAt` timestamps or protecting against terminal status regressions.

## Options Considered

### Option 1: Polling-Only with Optimistic In-Memory Lock
- **Benefits:** Simpler code; avoids bi-directional WebSocket lifecycle complexity.
- **Costs:** High API rate-limit burn; high latency (seconds to tens of seconds) before fills update portfolio cash and holdings.
- **Risks:** Fails to scale across hundreds of multi-tenant accounts executing rebalance orders simultaneously.
- **Reversibility:** High.

### Option 2: Full WebSocket Trade Stream with Idempotent Timestamp-Ordered Reconciliation (Selected)
- **Benefits:**
  - Real-time fill propagation with zero HTTP polling overhead for trade executions.
  - Complete trade lifecycle awareness (`fill`, `partial_fill`, `canceled`, `rejected`, `expired`, `order_cancel_rejected`).
  - Idempotent and out-of-order resilient: stale fill messages with older timestamps cannot overwrite newer order states or duplicate cash deductions.
  - Financial math guaranteed by `decimal.js` for cash and holding delta calculations.
  - Instant telemetry broadcasting via `systemEventBus` and SSE (`/api/events`) for connected dashboards.
- **Costs:** Requires managing socket disconnects and reconnection backoff.
- **Risks:** Reconnection storms under severe network degradation, mitigated by exponential backoff (up to 30s) and fallback polling in `BrokerSyncService`.
- **Reversibility:** High (guarded by `STREAMING_EXECUTION_ENABLED`).

## Decision

We chose **Option 2**. We expanded `AlpacaBrokerStreamer` with resilient reconnection logic and full trade event coverage, updated `Orders` with `updatedAt` timestamps, implemented out-of-order and idempotent execution reconciliation in `SqliteStateManager`, and added `TRADE_FILL` event dispatching over `systemEventBus`.

## Rationale

This decision aligns directly with [Rule 2 (Decision Discipline)](file:///Users/johanhellman/Projects/rebalancing-engine/AGENTS.md#2-decision-discipline) and [Rule 7 (Data and Domain Integrity)](file:///Users/johanhellman/Projects/rebalancing-engine/AGENTS.md#7-data-and-domain-integrity). Financial ledgers must guarantee deterministic, non-regressive state updates even across asynchronous distributed systems.

## Implementation Impact

- **Code:**
  - `src/db/sqlite.ts`: Added `updatedAt` column to `Orders` table with safe migration.
  - `src/events/bus.ts`: Added `TRADE_FILL` to `EventType` and `TradeFillEvent` to `SystemEvent`.
  - `src/orchestrator/state.ts`: Added optional `executionTimestamp` to `processExecutionReport`.
  - `src/orchestrator/sqlite-state.ts`: Implemented out-of-order timestamp checks, terminal state protection, `Decimal` precision, and `TRADE_FILL` event emission.
  - `src/broker/streamer.ts`: Added `reason` field and `isConnected()` method.
  - `src/broker/alpaca-streamer.ts`: Handled all Alpaca trade update events and added auto-reconnection with exponential backoff.
  - `src/cli/agent.ts`: Guarded streamer initialization by `STREAMING_EXECUTION_ENABLED` and forwarded timestamps.
  - `src/api/webhooks/broker-reports.ts`: Forwarded execution timestamps.
  - `.env.example`: Documented `STREAMING_EXECUTION_ENABLED=true`.
- **Tests:**
  - `tests/alpaca-streamer.test.ts`: Expanded to verify partial fills, cancellations, rejections, expirations, and connection state.
  - `tests/streaming-fills.test.ts`: Added comprehensive suite validating in-order fills, duplicate idempotency, out-of-order rejection, terminal status protection, and SELL executions.
- **Fixtures:** Synthetic trade update frames and in-memory SQLite state fixtures.
- **Documentation:** Updated `docs/decisions/index.md`, `docs/log.md`, `docs/iterations/2026-10-19-streaming-execution-fills.md`, and `BUILD_JOURNEY.md`.

## Follow-up

- Slice 4 will expand multi-custodian broker adapters (e.g., Interactive Brokers) building upon this streaming and state reconciliation foundation.


&copy; 2026 Johan Hellman. All rights reserved.
