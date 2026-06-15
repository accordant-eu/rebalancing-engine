---
type: decision
title: Adopt Mandate Archetypes and Quality Evaluation Pipeline
description: Unify execution overlays into a pass/fail Quality Indicator model and restrict open-ended mandate configurations using strict Archetypes to prevent combinatorial rule explosions.
timestamp: 2026-06-15T05:42:00Z
---

# ADR-0048: Adopt Mandate Archetypes and Quality Evaluation Pipeline

## Context

During the design of the v3 Execution Overlays and Quality Indicators, we encountered a combinatorial explosion risk: allowing users to freely mix and match Targeting Models (e.g. `MinimumVariance`) with incompatible Quality Indicators (e.g. `DriftReduction`) would create fundamentally unexecutable mandates.

Additionally, our initial design separated "Hard Constraints" (like concentration limits) from "Quality Indicators", leading to a fractured pipeline. Finally, the Cost-Benefit function subtracting quantitative TCO ($) from qualitative indicators (%) had a dimensionality mismatch.

## Options Considered

1. **Option A: Validating free-form inputs** - Build massive validation logic to prevent users from selecting incompatible targeting modes and indicators.
2. **Option B: Mandate Archetypes & Unified Quality Evaluation** - Restrict mandate types to strict "Archetypes" (e.g. `StaticWeights`, `MinimumVariance`) that permanently bind a specific Targeting logic with its mathematically correct Optimization Indicator. Unify Constraints as pass/fail Quality Indicators. Map everything through a `UtilityTranslator` to normalize Drift (%) and TCO ($) into Basis Points.

## Decision

We chose **Option B**. We introduced the `MandateArchetype` concept. A Mandate now has a strict archetype which guarantees internal mathematical consistency. We unified the post-trade simulation pipeline so that Hard Constraints (Concentration Limits) are merely `QualityIndicators` that return a `failed` utility score. We built a `UtilityTranslator` that converts qualitative improvements and monetary TCO into a unified dimension (bps) for mathematically sound cost-benefit evaluation.

## Rationale

1. **System Safety**: Mandate Archetypes make it impossible for users (or APIs) to build an internally contradictory mandate.
2. **Domain Purity**: A Concentration Limit breach conceptually means the portfolio is of unacceptable quality. It belongs in the Quality Evaluation Pipeline, not an orthogonal execution overlay pipeline.
3. **Mathematical Correctness**: Subtracting dollars from percentages is fundamentally flawed; the `UtilityTranslator` brings academic rigor to opportunistic rebalancing.

## Implementation Impact

- `src/models/domain.ts` expanded to include `MandateArchetype`, `EvaluationFrequency`, and `ConstraintIndicator`.
- `src/core/quality.ts` created, featuring `QualityIndicator`, `UtilityTranslator`, `DriftReductionIndicator`, and `ConcentrationLimitIndicator`.
- `generateTradeProposal` orchestrates the simulation of "State B" (post-trade), deducts total estimated TCO, and routes the transformation through the new pipeline.

## Validation

All unit tests for the core engine pass. The newly added `tests/quality.test.ts` validates that a trade batch with $250 of TCO on a minor drift reduction is correctly rejected for negative net utility.
