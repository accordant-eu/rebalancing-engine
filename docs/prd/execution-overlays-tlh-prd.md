---
type: PRD
title: Execution Overlays & Tax-Loss Harvesting (TLH)
description: Formal architecture and product requirements for composable Execution Overlays and jurisdiction-agnostic Tax-Loss Harvesting.
tags: [prd, architecture, tlh, overlays]
timestamp: 2026-08-03T10:00:00Z
---

# Execution Overlays & Tax-Loss Harvesting (TLH) PRD

Date: 2026-08-03
Status: DRAFT / DISCUSSION

## 1. Background & Context

ADR 0042 established a fundamental separation of concerns: **Allocation Strategies** (what to hold) are decoupled from **Execution Overlays** (how to trade them efficiently). 

As we approach the implementation of Tax-Loss Harvesting (TLH), a critical architectural risk emerges: tax legislation is highly jurisdiction-specific. The US enforces 30-day "Wash Sale" rules, the UK enforces "Bed & Breakfasting" and "Section 104 pools", and other jurisdictions may have no such restrictions. 

To ensure the Rebalancing Engine remains globally applicable, we must distill TLH into a composable, jurisdiction-agnostic architecture.

## 2. Architectural Separation of Concerns

The solution is to introduce the **Execution Overlay Pipeline**, which sits exactly between the mathematical generation of drift-based trades and the final Quality Evaluation Pipeline.

We categorize overlays into two distinct types:

1. **Generative Overlays**: Pure mathematical logic that opportunistically *injects* new trades into the proposal to maximize an objective (e.g., harvesting capital losses). They possess zero knowledge of tax legislation.
2. **Constraint Overlays**: Jurisdictional or structural rules that analyze the proposed trade batch and *suppress* or block trades that violate legislation (e.g., Wash-Sale lockouts).

### Example Pipeline Executions
- **German Client**: Configures `[OpportunisticLossHarvestingOverlay]` (no wash-sale suppression).
- **US Client**: Configures `[OpportunisticLossHarvestingOverlay, UsWashSaleLockoutOverlay]`.
- **UK Client**: Configures `[OpportunisticLossHarvestingOverlay, UkBedAndBreakfastingOverlay]`.

## 3. The `OpportunisticLossHarvestingOverlay` (Generative)

This overlay is responsible exclusively for the math of realizing losses.

### 3.1 Loss Identification
It iterates through all tax lots in the portfolio. If a lot's unrealized loss exceeds a configured threshold (`tlhLossThreshold`, e.g., 5%), it flags the lot for harvesting.

### 3.2 Instrument Substitution & Target Equivalency
If we sell a losing asset (e.g., `IVV`), we cannot simply hold cash; we must reinvest in a highly correlated asset (`VOO`) to maintain market exposure. 

**CRITICAL INSIGHT**: If the engine swaps `IVV` for `VOO`, the standard `DriftReductionIndicator` will view this as a massive tracking error (0% `IVV` actual vs 10% target, and 10% `VOO` actual vs 0% target), causing the Quality Pipeline to reject the trade.

To solve this, the core domain model must introduce **Target Equivalency** (or Substitution Groups). 
- When the TLH overlay generates a SELL for `IVV` and a BUY for `VOO`, it must also dynamically inject a temporary Equivalency Mapping into the `EvaluationState`.
- The `calculateDrift` function must be updated to respect Equivalency Mappings, allowing an overweight in a substitute (`VOO`) to perfectly offset an underweight in the primary target (`IVV`) for the purpose of drift calculation.

### 3.3 Substitution Bidirectionality
Substitutes must be configured as bidirectional pairs or groups (e.g., `['IVV', 'VOO', 'SPY']`). If `IVV` is harvested into `VOO`, and `VOO` later incurs a loss, the system must seamlessly harvest `VOO` back into `IVV` (subject to constraint overlays).

## 4. Jurisdictional Constraints (e.g., `WashSaleLockoutOverlay`)

Constraint overlays analyze the `TradeProposal` after generative overlays have run.

### 4.1 Intra-Proposal Wash Sales (MVP)
For the MVP, the `WashSaleLockoutOverlay` evaluates the current trade batch. If it detects a SELL for a loss on `Asset A`, and a BUY for `Asset A` (perhaps generated independently by the drift strategy), it detects an intra-day wash sale. 
**Rule**: Constraint overlays must prioritize strategic drift trades over opportunistic tax trades. It will suppress the tax-motivated SELL and allow the drift-motivated BUY, emitting a `WASH_SALE_LOCKOUT` warning.

### 4.2 Historical Wash Sales (Future Extension)
In subsequent iterations, the overlay will be provided with the portfolio's recent execution history (e.g., last 30 days) to suppress BUYS on assets that were recently harvested for a loss.

## 5. Functional Requirements

### 5.1 Interfaces
```typescript
export interface ExecutionOverlay {
  name: string;
  apply(
    proposal: TradeProposal,
    valuation: ValuationResult,
    target: TargetAllocation,
    policy: RebalancingPolicy,
    priceSnapshot: PriceSnapshot
  ): TradeProposal;
}
```

### 5.2 Domain Configuration
The `RebalancingPolicy` (or a dedicated `ExecutionPolicy`) must be updated to include:
- `executionOverlays`: Array of activated overlay configurations.
- `tlhLossThresholdBps`: Minimum percentage loss required to trigger a harvest (e.g., 500 for 5%).
- `equivalencyGroups`: Array of string arrays `[['IVV', 'VOO', 'SPY'], ['VEA', 'IEFA']]` defining interchangeable assets.

### 5.3 Quality Pipeline Integration
- `applyQualityEvaluationPipeline` must accept and respect active equivalency groups so that holding a substitute does not negatively impact the Drift Utility Score.

## 6. Non-Functional Requirements
- **Performance**: Overlay execution must be O(N) relative to the number of holdings/tax lots.
- **Traceability**: If an overlay injects or suppresses a trade, it must log a specific `ProposalWarning` or metadata tag so the end-user (advisor) understands exactly *why* a trade was altered (e.g., `WASH_SALE_LOCKOUT`, `TLH_HARVEST_GENERATED`).

## 7. Acceptance Criteria
1. The engine successfully exports the `ExecutionOverlay` interface.
2. `OpportunisticLossHarvestingOverlay` successfully injects SELL/BUY pairs when losses exceed the threshold and substitutes are available.
3. `WashSaleLockoutOverlay` successfully suppresses overlapping SELL/BUY pairs within the same proposal.
4. `calculateDrift` successfully treats assets within an Equivalency Group as fungible, preventing the Quality Pipeline from rejecting TLH trades due to artificial tracking error.
