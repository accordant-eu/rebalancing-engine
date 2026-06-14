---
type: DecisionRecord
title: "Use Pause Strategy for Reconciliation"
description: "Decision to pause the orchestrator loop while broker orders are pending instead of simulating virtual positions."
timestamp: 2026-06-14T00:00:00Z
---

# Use Pause Strategy for Reconciliation

## Context

In Tranche 4 (Production Hardening), the Live Agent polls the broker for positions and prices. If an order is submitted but remains pending (not yet filled), the broker's ledger will not yet reflect the intended target weights. The orchestrator must handle this latency to prevent evaluating a duplicate trade proposal on the next tick.

## Options considered

1.  **Virtual Positions (High-Frequency approach):** The engine tracks "pending" orders internally, artificially modifying the `livePortfolio` (adding pending buys, subtracting pending sells) before passing it to the pure engine.
2.  **Pause Strategy (Batch approach):** The `BrokerAdapter` exposes `hasOpenOrders()`. If any orders are open, the orchestrator explicitly skips the `evaluateRebalance` loop and waits.

## Decision

We will use the **Pause Strategy** for the MVP Live Agent.

## Rationale

A periodic rebalancing engine treats a rebalance as a synchronized, portfolio-wide event. If we inject "virtual positions", we must accurately guess the exact fill prices and impacts on total valuation. If a pending order executes at a different price than our virtual estimate, the entire portfolio's target weight percentages drift immediately, risking micro-churn. Pausing the orchestrator until the broker confirms all pending legs are fully settled is drastically safer. It guarantees that the pure calculation engine always operates on 100% factual, settled ledger truth.

## Implementation impact

- Add `hasOpenOrders(): Promise<boolean>` to the `BrokerAdapter`.
- Implement via `alpaca.getOrders({ status: 'open' })`.
- Update the Orchestrator loop to return early if open orders exist, deferring evaluation to the next interval.

## Validation

- Verify that the agent logs a "waiting for pending orders" message and bypasses drift evaluation.


&copy; 2026 Johan Hellman. All rights reserved.
