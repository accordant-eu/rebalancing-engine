---
type: Plan
title: Advanced Mandates, Quality Indicators & Execution Overlays Plan
description: Detailed design plan for expanding the domain model to support complex institutional mandates, quality indicators for pre/post trade checks, and abstract execution overlays.
tags: [plan, mandates, domain, overlays, quality-indicators]
timestamp: 2026-06-15T00:00:00Z
---

# Advanced Mandates, Quality Indicators & Execution Overlays Plan

Date: 2026-06-15
Status: DRAFT / DISCUSSION

This document outlines the proposed pivot from infrastructural scaling (PostgreSQL) toward deepening the core financial domain logic. The goal is to evolve the concepts of "Target Allocations" and "Rebalancing Policy" into a sophisticated **Mandate**, and introduce **Quality Indicators** as an abstraction to evaluate trade outcomes.

## 1. Context & Motivation

Our current domain model focuses heavily on deterministic drift calculation based on static Target Weights (e.g., 60% AAPL, 40% MSFT). However, the v3 Exploration highlights that a true Rebalancing Engine must support more nuanced realities:
- **Quality Indicators**: An abstraction representing pre-trade and post-trade compliance checks to determine if a proposed trade makes the portfolio "better off" relative to the mandate's goals. "Better off" could mean reducing weight drift, moving closer to the efficient frontier, or reducing Value at Risk (VaR). ESG factors are just one possible, non-dominant implementation of a quality indicator.
- **Dynamic Targeting**: Adjusting targets dynamically based on strategy goals (Efficient Frontier, VaR, momentum) rather than static numbers.
- **Execution Overlays**: Passing a mathematically "correct" trade through a series of abstract constraints (Concentration limits, Wash-Sale/TLH rules, Quality Indicator thresholds) before execution.

## 2. Proposed Architecture

### 2.1 Cohesive Mandate Archetypes (`The Mandate Entity`)

To prevent a combinatorial explosion of free-form, incompatible rules, the Rebalancing Engine will only support explicitly defined **Mandate Archetypes** (Cohesive Models). An archetype dictates the underlying mathematical framework (Targeting + Quality Evaluation) the system executes.

```typescript
export type MandateArchetype = 'StaticWeights' | 'EfficientFrontier' | 'MinimumVariance';
```

When defining a Mandate, the archetype binds the parameters to a cohesive system model:
- **`StaticWeights` Model**: Inherently uses the `DriftReduction` optimization indicator. The user provides a target weight profile.
- **`MinimumVariance` Model**: Inherently uses a `VaRReduction` optimization indicator. The system dynamically targets weights that minimize volatility.

Within an archetype, the user can apply universal **Constraint Indicators** (Hard execution boundaries):
```typescript
export interface ConstraintIndicator {
  type: 'concentration_limit' | 'wash_sale_lockout';
  parameters: Record<string, any>;
}
```

- **Evaluation Frequency (The Immediacy Gradient)**: The mandate must define its event-driven "immediacy":
  ```typescript
  export type EvaluationFrequency = 'realtime' | 'daily' | 'weekly' | 'monthly';
  ```
  The Orchestrator will use this frequency to throttle evaluation queues.

### 2.2 Quality Indicators & Total Cost of Ownership (TCO)
Quality Indicators represent abstract evaluation functions that measure portfolio health. Crucially, they are used throughout the lifecycle of a rebalance to provide an objective, auditable trail of client benefit, weighed directly against the **Total Cost of Ownership (TCO)**.

TCO is a generic concept covering all friction: transaction costs, estimated slippage, and taxation impacts (capital gains drag). The Quality Indicator framework must answer: *Does the expected improvement in the portfolio justify the TCO incurred to get there?*

- **State A (Pre-Trade Baseline):** The current health of the portfolio before any action is taken.
- **State B (Expected Post-Trade Simulation):** The simulated health of the portfolio assuming trades execute. This simulation **deducts the expected TCO** (capital loss from friction/taxes) directly from the State B balances.
- **Net Expected Improvement:** The objective justification (A -> B) recorded in the audit trail. It requires that the Benefit (e.g., drift reduction, VaR reduction) outweighs the Cost (TCO). For example, a 0.1% reduction in drift does not justify a $50 tax drag.
- **State C (Realized Post-Trade Snapshot):** The actual health of the portfolio after broker execution and settlement. The actual improvement is (A -> C). The delta between (B -> C) represents execution slippage/execution drift vs the expected TCO.

**Examples of Indicators:**
- **Drift Reduction Indicator**: Calculates how much absolute/relative drift is expected to be reduced, weighed against the TCO margin.
- **Risk Indicator (VaR)**: Calculates the expected shift in portfolio VaR vs TCO.

### 2.3 The Quality Evaluation Pipeline (`src/core/quality.ts`)

To preserve the deterministic purity of the existing `generateTradeProposal` logic, we will introduce a post-processing **Quality Evaluation Pipeline**. 

Crucially, rebalancing is about shifting assets, so trades cannot be viewed in isolation. The evaluation must consider all legs of the proposed trades in their **totality** as a single atomic transformation.

1. `generateTradeProposal` generates the "ideal" batch of trades required to hit the mathematical target.
2. The engine calculates **State A** (Pre-Trade Baseline).
3. The engine simulates executing the *entire batch* of trades to generate **State B** (Post-Trade Simulation), calculating the *total* estimated TCO of the batch (in absolute currency terms).
4. **The Utility Translation Layer:** Because Quality (e.g., Drift %, VaR) is a qualitative measure and TCO is a quantitative financial measure (dollars), they cannot be directly compared. The pipeline utilizes a Mandate-defined Utility Function to translate them into a unified dimension (e.g., basis points of return or a dimensionless Utility Score).
5. The pipeline evaluates the transformation:
   - **Constraint Indicators (e.g., Concentration):** If State B breaches a concentration maximum, the utility score drops to negative infinity (fail).
   - **Optimization Indicators (e.g., Drift, VaR):** Evaluates if the translated Utility of the Quality Improvement `Utility(Quality B - Quality A)` is strictly greater than the translated Utility of the Cost `Utility(Total TCO)`.
6. If the Net Utility is positive, the final approved trade batch and the A -> B quality audit trail are committed immutably to the JSONL log before execution.

### 2.4 Command Center UX (The "Mandate Builder")
The value of complex mandates is exposing them intuitively. We will upgrade the `web` Dashboard's "Model Management" tab to feature a wizard-driven Mandate Builder:
- **Step 1:** Strategy & Targeting (Static Weights vs Dynamic Targeting).
- **Step 2:** Quality Indicators (Define what metrics measure "better off", including Drift and VaR).
- **Step 3:** Hard Constraints (Concentration limits, Wash-Sale pruning - modeled under the hood as pass/fail Quality Indicators).

## 3. Execution Strategy (MVP Slicing)

To execute this, we will slice the work vertically:
1. **Tranche A (Schema & Quality Abstractions):** Update the TypeScript interfaces. Build the `QualityIndicator` abstraction and `src/core/overlays.ts` pipeline. Prove via `npm test` that trades are evaluated (and pruned) based on drift-reduction and concentration-limit indicators.
2. **Tranche B (UX Mandate Builder):** Update the React components in `/web` to let an advisor construct these abstract mandate payloads visually.
3. **Tranche C (Dynamic Targeting Mock):** Introduce a mock "Efficient Frontier" or "VaR" evaluation logic to demonstrate a dynamic targeting strategy beyond static weights.

## 4. Future Considerations (Deferred from MVP)

- **Tax Awareness & Account Wrappers:** The engine must eventually know the tax status of the portfolio (e.g., Taxable vs. Tax-Advantaged Wrapper like an IRA). This wrapper context dictates whether the Quality Indicator should heavily penalize capital gains realization (for taxable accounts) or ignore tax drag completely (for tax-advantaged accounts) when calculating TCO. This is deferred from the current tranche but remains a critical requirement for a complete tax-loss harvesting execution overlay.

## 5. Open Questions for Discussion

1. **Quality Indicator Interfaces:** For the MVP, should we focus our Quality Indicator implementations strictly on **Drift Reduction** and **Concentration Limits**, leaving complex indicators like Efficient Frontier/VaR for the next tranche once the abstraction is proven?
