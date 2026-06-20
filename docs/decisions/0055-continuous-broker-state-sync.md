---
type: Decision Record
title: Continuous Broker State Synchronization
description: Decision to build a separate multi-tenant BrokerSyncService to poll Alpaca and update the central SQLite cache.
tags: [architecture, broker, state]
timestamp: 2026-06-20T00:00:00Z
status: Accepted
---

# Continuous Broker State Synchronization

## Context

To fulfill the Tranche 3 requirement (Broker API Integration), the engine needs to be aware of the real-time position and cash balances at the broker, as well as live market prices, to accurately compute drift. Polling the broker synchronously during the Orchestrator's high-frequency evaluate/execute loop would severely degrade performance and quickly exceed broker API rate limits.

## Options Considered

1. **Synchronous Polling within the Evaluation Pipeline**
   - *Benefits:* The engine always has perfectly accurate state right before evaluating.
   - *Costs:* Massive latency penalty per portfolio; guaranteed to hit rate limits at scale.
   - *Reversibility:* Low.

2. **Asynchronous Background Synchronization (`BrokerSyncService`)**
   - *Benefits:* Decouples market data and position fetching from the execution loop. Allows batching price requests across all active portfolios within a tenant. Respects rate limits via controlled polling intervals.
   - *Costs:* State may be slightly stale (up to the polling interval).
   - *Reversibility:* High.

## Decision

We chose **Option 2**. We implemented `BrokerSyncService`, a background service that:
1. Groups all active portfolios by tenant.
2. Batches price queries for all unique instruments across a tenant's portfolios.
3. Periodically queries each portfolio's position/cash state.
4. Updates the central `LiveStateManager` and triggers the orchestrator tick.

## Rationale

Decoupling state synchronization from the execution loop is the only viable path to scale. Polling intervals can be tuned (e.g., 60 seconds) to balance data freshness against API rate limits. The orchestrator loop remains fast and deterministic, acting upon the latest cached state.

## Implementation Impact

- `LiveStateManager` required reverse-lookup capabilities (`getInstrumentId`) to translate broker tickers back into composite instrument IDs.
- `AlpacaBrokerAdapter` continues to handle pure API interactions.
- `BrokerSyncService` handles the polling orchestration.

## Validation

The agent CLI can now be launched with a continuous sync loop, correctly pulling live state from Alpaca for configured tenants and triggering rebalances accordingly.

&copy; 2026 Johan Hellman. All rights reserved.
