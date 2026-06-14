---
type: Reference
title: Live Agent v3.0 Exploration & Scaling
description: A working document for exploring and discussing future features, scaling architectures, and multi-portfolio support.
tags: [roadmap, exploration, draft]
timestamp: 2026-06-14T14:35:00Z
---

# Live Agent v3.0: Exploration & Scaling Discussion

**Status:** WORK IN PROGRESS (Draft / Discussion Document)

This document is a scratchpad to map out the goals, interdependencies, and sequence of high-level areas for the next evolution of the rebalancing engine. It captures active discussions, pros/cons, and conceptual architectures before they are crystallized into a formal roadmap.

---

## 1. Friction Optimization (Beyond just "TCO")

**Goal:** Ensure the engine only trades when mathematically justified by the net-of-cost outcome.
**Discussion:**
- **The Scope of "Costs":** We must look at total friction, not just explicit broker commissions. Friction includes:
  1. **Explicit Costs:** Fixed fee per trade, basis points per order.
  2. **Implicit Costs (Slippage):** Bid/ask spread, market impact based on order size vs. liquidity.
  3. **Tax Impact (Capital Gains):** Triggering a massive short-term capital gain to fix a 0.5% drift is actively harmful to the after-tax portfolio value.
- **Proposed Approach:** Introduce a unified "Friction Penalty Function." We can start with purely mocked models (e.g., a hardcoded flat % slippage or fixed $ cost) to prove the pipeline works, before integrating complex cap-gains logic or live level-2 spread data.

## 2. Advanced Strategy vs. Tax-Loss Harvesting (TLH)

**Goal:** Separate the concepts of "what to hold" (Allocation Strategy) from "how to trade it efficiently" (Execution Overlay).
**Discussion:**
- **Advanced Strategy Support:** This refers to dynamic targeting. Instead of static weights, the engine rebalances to a dynamically calculated spot on the Efficient Frontier, or uses Value-at-Risk (VaR) or momentum-based targets.
- **Tax-Loss Harvesting (TLH):** This is an execution overlay. It is orthogonal to the allocation strategy. TLH opportunistically realizes capital losses to offset gains elsewhere, subject to wash-sale rules. 
- **Interdependencies:** Both require an extremely robust tax-lot tracking foundation (which we have started, but needs expansion for basis/duration tracking).

## 3. Scaling Architecture: The Multi-Portfolio Challenge

**Goal:** Scale the engine to gracefully handle thousands of portfolios reacting to a live market firehose.
**Discussion Points:**
- **The "Process-per-Portfolio" Idea:** Conceptually, having each portfolio act as a stand-alone subscriber to the price hose is the **Actor Model**. While we cannot literally spawn 10,000 OS-level processes, we *can* spawn 10,000 lightweight asynchronous "Actors" within a Node.js cluster. This guarantees ultra-low latency "time-to-respond" to market ticks.
- **State Management:** To support thousands of portfolios without querying a remote database on every tick, we need persistent in-memory storage. **SQLite** (running with Write-Ahead Logging or in `:memory:` mode with periodic disk flushing) is the perfect middle-ground. It provides relational querying for the UI but acts at memory speed for the engine.

## 4. Agent Dashboard & Command Center

**Goal:** Provide macro-observability over the entire agent ecosystem.
**Discussion:**
- **Aggregate Focus:** When managing thousands of portfolios, individual portfolio views become secondary to systemic health.
- **Metrics to Surface:**
  - Global Portfolio Health Scores (e.g., a distribution curve of how "out of balance" the book is).
  - "Near-Miss" Visualizations: How many portfolios are within `0.1%` of triggering a massive wave of orders?
  - Aggregated execution volumes and API rate-limit pressures.
- **Interdependencies:** This heavily relies on the SQLite multi-portfolio foundation (Point 3). The UI needs a structured way to query the global state rapidly.

---

## Proposed Sequencing (For Discussion)

1. **The Multi-Portfolio Foundation:** Transition the `LiveStateManager` into a multi-tenant SQLite foundation. Build a simulation script for 1,000 synthetic portfolios to prove the plumbing.
2. **Friction Optimization (Mocked):** Inject the basic TCO/slippage model into the core to prevent the engine from generating micro-churn across the 1,000 portfolios.
3. **The Command Center:** Build the macro-observability UI to query the SQLite state.
4. **Advanced Strategies & TLH:** With a safe, multi-tenant, observable engine in place, we can begin experimenting with dynamic targeting and wash-sale constraint overlays.
