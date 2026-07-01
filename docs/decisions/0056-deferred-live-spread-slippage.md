---
type: decision
title: "ADR-0056: Deferred Live Spread Fetching for Slippage Modeling"
description: "Decision to parameterize assumed slippage in the policy rather than fetching live bid-ask spreads for TCO."
timestamp: "2026-07-01T12:00:00Z"
---

# ADR-0056: Deferred Live Spread Fetching for Slippage Modeling

## Context
During Tranche 4 (Production Hardening), we sought to "un-mock" the `PercentageSlippageModel(5)` which assumes a fixed 5 bps slippage across all trades. The goal was to connect the friction optimization to live market data so that Transaction Cost Optimization (TCO) could halt rebalancing dynamically during wide-spread environments (e.g., flash crashes).

## Options considered
1. **Live Synchronous Fetching:** Poll Alpaca for Level 1 Quote data (bid/ask) for all target symbols during every evaluation loop.
2. **Background Async Fetching:** Expand the `BrokerSyncService` to continually fetch bid-ask spreads and cache them in `LiveStateManager`.
3. **Configurable Heuristic (Parameterization):** Allow `assumedSlippageBps` to be defined on a per-policy basis, falling back to 5 bps if omitted.

## Decision
We chose **Option 3 (Configurable Heuristic)** and deferred the implementation of live spread fetching (Options 1 and 2).

## Rationale
- **Performance:** Live synchronous fetching would dramatically increase the evaluation loop latency.
- **Cost/Limits:** Aggressively fetching live quote data for background caching could exhaust sandbox tier rate limits, especially as the number of supported instruments scales.
- **Sufficiency:** For highly liquid assets (e.g., large-cap equities, major ETFs), a static 5 bps slippage assumption is an industry standard for MVP portfolio management logic. Permitting it to be configured via the `RebalancingPolicy` provides enough flexibility for different portfolios (e.g., one policy for small-caps with 15 bps assumed slippage, another for large-caps with 3 bps) without the engineering overhead of real-time market data pipelines.

## Implementation impact
- Added `assumedSlippageBps` to the `RebalancingPolicy` interface.
- Updated `src/orchestrator/loop.ts` to instantiate `PercentageSlippageModel` using the configured bps or default to 5.

## Validation
- Unit tests verify that policies without `assumedSlippageBps` continue to default gracefully.

## Deferred Details
- Fetching live quotes to measure `(ask - bid) / ask` spread dynamically is deferred. If future scale requires it, it should be implemented via **Option 2 (Background Async Fetching)** inside the `BrokerSyncService` to keep the evaluation loop purely computational and synchronous.
