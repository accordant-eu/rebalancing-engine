---
type: Decision Record
title: Use Mocked Percentage Slippage Model for TCO Optimization
description: Hardcode a 5 bps percentage slippage model in the Live Agent to enable Friction Optimization logic.
tags: [architecture, friction, evaluation]
timestamp: 2026-06-20T18:25:00Z
status: Accepted
supersedes: 
---

# Use Mocked Percentage Slippage Model for TCO Optimization

## Context

The rebalancing engine calculates exact target allocations and derives a full-reset trade proposal to restore drifted portfolios. While we recently added the `DriftReductionIndicator` to our Quality Evaluation Pipeline to quantify the utility of drift correction vs Total Cost of Ownership (TCO), the Live Agent `Orchestrator` was not providing a `FrictionModel`. Consequently, the `estimatedTco` was zero, causing the engine to blindly trade tiny fractional drift corrections even when the slippage cost would theoretically outweigh the mathematical benefit.

Per the `v3-exploration` roadmap, our first algorithmic safety check before full paper trading is "Friction Optimization." We need to start with purely mocked models (e.g., a hardcoded flat % slippage) to prove the evaluation pipeline correctly rejects economically irrational trades.

## Options Considered

### Option 1: Live Level-2 Spread Data
- **Benefits:** Accurately reflects true slippage across highly liquid vs illiquid assets.
- **Costs:** Extremely complex. Requires a real-time Level 2 feed and a dynamic `FrictionModel` that calculates bid-ask depth.
- **Risks:** Too much engineering overhead for the current MVP phase.

### Option 2: Configurable Tenant-Level Friction Model
- **Benefits:** Allows different clients to define their expected friction profiles (e.g., Broker A charges flat fees, Broker B is PFOF with high slippage).
- **Costs:** Requires updating the database schema, Tenant configuration UI, and injecting the model deeply through the execution context.
- **Risks:** Slightly premature, as we just want to ensure the mathematical bounds of the Quality Evaluation Pipeline work.

### Option 3: Hardcoded Mocked 5-bps Percentage Slippage Model
- **Benefits:** Immediately completes the algorithmic feedback loop. The orchestrator will penalize all proposals with a standard 5 bps friction cost, ensuring micro-adjustments are discarded.
- **Costs:** Treats all assets (even penny stocks vs large-cap) identically.
- **Risks:** Might suppress legitimate small trades if the `driftUtilityConversionRate` isn't tuned properly.
- **Reversibility:** Very high. It's a single instantiation line in `loop.ts` that can be swapped out for a dynamic factory later.

## Decision

**Option 3 is selected.** We will instantiate a `new PercentageSlippageModel(5)` inside `loop.ts` and pass it into `evaluateRebalance`. Furthermore, we will parameterize the `DriftUtilityTranslator` using `currentState.policy.driftUtilityConversionRate` so tenants can tune the relative pain of TCO vs Drift.

## Rationale

This perfectly aligns with our MVP constraints and the `v3-exploration` roadmap strategy to "start with purely mocked models... to prove the pipeline works." It provides immediate protection against destructive churn in the Orchestrator without over-engineering an order-book depth analyzer.

## Implementation Impact

- **Code:** `src/orchestrator/loop.ts` updated to instantiate `PercentageSlippageModel` and pass it into the evaluation pipeline.
- **Tests:** Integrated seamlessly. Existing tests for `DriftReductionIndicator` already handle TCO correctly.
- **Documentation:** Recorded this ADR.

## Follow-up

- Monitor dry-run logs to ensure the 5 bps threshold is appropriate.
- Eventually replace this hardcoded mock with a `FrictionModelFactory` that reads from `TenantBrokerConfig` (Option 2) or live spread data (Option 1).


&copy; 2026 Johan Hellman. All rights reserved.
