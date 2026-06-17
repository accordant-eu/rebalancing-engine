---
type: Plan
title: Core Optimizer & Dynamic Targeting (Tranche C)
description: Architectural plan for replacing static weights with dynamic targeting via an asynchronous Optimizer service.
timestamp: 2026-06-17T10:35:00Z
---

# Core Optimizer / Dynamic Targeting Plan (Tranche C)

This document outlines the architecture for introducing dynamic targeting (e.g., Efficient Frontier, Minimum Variance) to the rebalancing engine, replacing the reliance on purely static weights.

## User Review Required

> [!IMPORTANT]
> Since optimization (like Quadratic Programming for Mean-Variance Optimization) is computationally expensive, we need to decide **where** this runs. 
> Should the engine compute the Efficient Frontier weights on-the-fly during the high-speed `evaluateRebalance` loop for every portfolio tick? 
> **OR** should the Optimizer run asynchronously (e.g., daily via a CRON task) per *Model*, and simply stamp the resulting "static" weights into the database, so the engine just reads them as usual?
> 
> *Recommendation:* The Optimizer should be an asynchronous background service that runs per-model. It computes the new targets and publishes them to the `TargetAllocations` table. The core high-speed loop remains completely unaware of *how* the targets were generated—it just reads them and evaluates drift.

## Open Questions

> [!WARNING]
> 1. **Inputs for Optimization:** An Efficient Frontier model requires expected returns, volatility, and a covariance matrix for the asset universe. Where should these inputs come from in the mock? Should we hardcode a mock covariance matrix, or add a `MarketData` schema to the SQLite DB?
> 2. **Mock Implementation:** Since we don't have a Python/C++ optimization solver in this TypeScript engine, should the "Mock Optimizer" just be a simple inverse-volatility (Risk Parity) calculator, or a hardcoded target-rotation based on the current date?

## Proposed Architecture (Asynchronous Optimizer)

If we proceed with the asynchronous model approach:

### 1. The Optimizer Service
We create a new background module `src/optimizer/index.ts`.
This service loops over all Models where `archetype != 'StaticWeights'`.
- It fetches the model's constraints (e.g., universe of allowed assets, max concentration).
- It runs the mock math (e.g., inverse volatility allocation).
- It generates a new array of `TargetWeight[]`.

### 2. The Mandate Propagation
When the Optimizer generates new targets for `Model X`, it saves them to the DB.
We then use the existing `EvaluationQueue` pub/sub mechanism to trigger a rebalance evaluation for all portfolios subscribed to `Model X`.

### 3. The Orchestrator
The core `Orchestrator` and `evaluateRebalance` logic requires **zero changes**. It continues reading `TargetAllocation` from the DB. This perfectly separates the *Allocation Strategy* (Optimizer) from the *Execution Overlay* (Orchestrator).

---

## Verification Plan

### Automated Tests
- Unit tests for the `Optimizer` service to ensure it outputs weights summing to 1.0 (respecting the new `cashBuffer` constraints!).
- Integration tests ensuring that when the Optimizer updates a model, the subscribed portfolios are added to the evaluation queue.

### Manual Verification
- Update the UI Dashboard to trigger a "Run Optimizer" action on a model, and visually watch the subscribed portfolios react to the new targets.
