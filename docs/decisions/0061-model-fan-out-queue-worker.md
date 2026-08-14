---
type: Decision Record
title: Model Portfolio Fan-Out Queue Worker and Throttled Batch Evaluator
description: Implement an asynchronous, rate-limited Model Fan-Out Queue Worker that evaluates queued subscriber portfolios in throttled batches, protecting broker and optimizer rate limits and streaming live batch progress telemetry.
tags: [architecture, fan-out, queue, batch-evaluator, scaling, rate-limiting]
timestamp: 2026-08-14T20:31:00Z
status: Accepted
---

# Model Portfolio Fan-Out Queue Worker and Throttled Batch Evaluator

## Context

When an investment manager or dynamic optimizer updates a model portfolio mandate (or when bulk price fluctuations trigger market-wide drift breaches), hundreds or thousands of subscribed client portfolios must be re-evaluated.
- Synchronously evaluating all portfolios in the main event loop blocks HTTP request handling and UI responsiveness.
- Burst-executing thousands of evaluations simultaneously overwhelms external Oracle Tax Optimizer RPC endpoints and exhausts downstream broker API rate limits (e.g., Alpaca's 200 req/min threshold).
- While ADR-0049 and ADR-0085 introduced the `EvaluationQueue` SQLite table and pre-trade circuit breakers, there was no dedicated worker managing throttled batch consumption, progress tracking, and telemetry streaming.

## Options Considered

### Option 1: Inline synchronous execution upon model update
- **Benefits:** Simple; immediate completion response to the caller.
- **Costs:** Severe latency spikes for API callers; risks HTTP request timeouts and unhandled broker rate-limit errors.
- **Risks:** Unacceptable for institutional scale with >100 accounts.
- **Reversibility:** High.

### Option 2: Dedicated Asynchronous Throttled Batch Evaluator Worker (Chosen)
- **Benefits:**
  - **Rate Limiting & Safety**: Processes queued portfolios in configurable batch chunks (default `25` per batch) with configurable sleep intervals (default `200ms`), preventing API exhaustion.
  - **Graceful Failure Isolation**: Individual portfolio calculation or broker errors are recorded and isolated without aborting the rest of the batch.
  - **Asynchronous Optimization Compatibility**: Supports both synchronous rule-based evaluations and asynchronous Oracle tax optimization (`evaluateRebalanceAsync`).
  - **Live Telemetry & Observability**: Publishes `BATCH_EVALUATION_PROGRESS` events to `systemEventBus` for real-time Command Center dashboard tracking.
  - **REST API Control**: Exposes `/api/queue/status` and `/api/models/:id/fan-out` for programmatic monitoring.
- **Costs:** Introduces background worker lifecycle management.
- **Risks:** Low; uses existing SQLite queue and evaluation pipelines.
- **Reversibility:** High.

## Decision

We adopt **Option 2**:
1. Implement `src/orchestrator/batch-evaluator.ts` with `BatchEvaluationWorker`.
2. Enhance `SqliteStateManager` with queue depth monitoring and subscriber fan-out helpers.
3. Expose `GET /api/queue/status` and `POST /api/models/:id/fan-out` endpoints in `src/api/routes/queue.ts`.
4. Stream batch progress telemetry across `systemEventBus` and SSE.

## Implementation Impact

- **Code:**
  - `src/orchestrator/batch-evaluator.ts`: Worker implementation with batch throttling and async evaluation.
  - `src/orchestrator/sqlite-state.ts`: Queue depth queries and subscriber batch enqueueing.
  - `src/api/routes/queue.ts`: Queue status and model fan-out REST endpoints.
  - `src/api/server.ts`: Mount queue routes and manage worker lifecycle.
- **Tests:** Add `tests/core/batch-evaluator.test.ts` covering batch consumption, rate throttling, error isolation, and REST endpoints.
- **Documentation:** Register ADR-0061 in `docs/decisions/index.md` and log iteration in `BUILD_JOURNEY.md`.

## Follow-up

- Expand worker configuration to allow per-tenant priority queues and weighted round-robin scheduling.

&copy; 2026 Johan Hellman. All rights reserved.
