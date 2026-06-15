---
type: specification
title: Static Weights Mandate Archetype
description: PRD and execution flow for the default Static Weights mandate archetype.
timestamp: 2026-06-15T05:58:00Z
---

# Mandate Archetype: Static Weights

## 1. Executive Summary
The `StaticWeights` archetype is the foundational, default mandate for the Rebalancing Engine. It enforces a strict, time-invariant strategic asset allocation (e.g., a classic 60/40 portfolio) through continuous or scheduled threshold monitoring. 

As synthesized from institutional literature (Vanguard, Daryanani, NBIM), the primary mathematical benefit of this archetype is **risk control and variance reduction** rather than outright return enhancement. In trending markets, simplistic rebalancing can destroy momentum; therefore, this archetype leans heavily on tolerance bands, boundary execution, and the overarching Quality Evaluation Pipeline to minimize unnecessary trading friction (TCO).

## 2. Targeting Logic
Unlike dynamic models (like Minimum Variance) that recalculate allocations based on real-time market covariance, the `StaticWeights` model expects absolute stability in the target state. The user provides a fixed array of instrument weights summing to 100%.

**Domain Schema Mapping**:
```typescript
{
  archetype: 'StaticWeights',
  evaluationFrequency: 'daily', // or 'realtime', 'weekly', 'monthly'
  targetAllocation: {
    targets: [
      { instrumentId: 'AAPL', weight: 0.60 },
      { instrumentId: 'TLT', weight: 0.40 }
    ]
  },
  policy: {
    absoluteDriftTolerance: 0.05, // 5% absolute band
    executionTargetMode: 'boundary' // 'full_reset' or 'boundary'
  }
}
```

## 3. Evaluation Triggers (The Immediacy Gradient)
Based on optimal control research, rigid calendar rebalancing (trading blindly on Jan 1st) is sub-optimal. This archetype instead uses **Threshold (Tolerance-Band) Monitoring**.

The `EvaluationFrequency` determines how often the engine checks the portfolio against its targets. If `daily`, the Orchestrator queues the portfolio at the end of the day. The evaluation only triggers an execution workflow if the current weights have drifted outside the absolute or relative bands defined in the `policy`.

## 4. Trade Sizing (Execution Modes)
If an asset drifts beyond its band, the `generateTradeProposal` function calculates the required trades. This archetype natively supports two modes derived from optimal control theory:

1. **Full Reset**: Trades the portfolio entirely back to the original static target (e.g., if AAPL drifts to 66%, sell it back to exactly 60%). This maximizes tracking-error control but generates higher TCO.
2. **Boundary**: Trades the portfolio only to the edge of the acceptable band (e.g., if the band is 65% and it drifts to 66%, sell it back to 64.9%). Institutional math dictates this minimizes transaction friction while maintaining acceptable risk parameters, preserving capital inside the "no-trade region".

## 5. Quality Evaluation (Cost-Benefit)
## 5. Quality Evaluation (Cost-Benefit)
The defining feature of the Mandate Archetype is its unbreakable bond to a specific optimization function. 

The `StaticWeights` archetype inherently binds to the **`DriftReductionIndicator`**. The primary mathematical measure of portfolio quality under this archetype is the **Sum of Absolute Drifts**: `SUM(ABS(CurrentWeight - TargetWeight))` across all positions.

Before executing any generated trades, the pipeline simulates **State B**:
1. It simulates the exact post-trade asset weights.
2. It deducts the **Total Estimated TCO** (transaction fees, slippage) from the simulated cash balance.
3. The `UtilityTranslator` computes the total Drift Reduction (State A Sum Abs Drift - State B Sum Abs Drift).
4. Because drift is a measure of risk (probabilistic cost) and TCO is a guaranteed loss of capital, they cannot always be compared 1:1. The translator applies a user-configured **Utility Conversion Rate** (or multiplier) to the drift reduction. For example, if a mandate requires 10 bps of drift reduction to justify 1 bps of TCO, the conversion rate is 0.1.
5. It compares the converted Drift Utility (bps) against the TCO (bps).
6. If the `Drift Utility Gain < TCO Penalty`, the trades are completely rejected.

This mathematically guarantees that the system never spends more in guaranteed transaction costs than the value it assigns to the risk-reduction benefits, governed by the mandate's defined conversion rate.

## 6. Execution Constraints
Because the archetype provides the cohesive base model, users can freely stack universal `ConstraintIndicators` on top of it.
- **Concentration Limits**: E.g., "No single stock > 10%". If the trade proposal results in State B breaching this limit, the Quality Indicator returns a utility of `-Infinity`, and the proposal is safely rejected.
