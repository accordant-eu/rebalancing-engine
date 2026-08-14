---
type: Decision Record
title: Composable Exclusion and Holding Concentration Overlays
description: Introduce ExclusionListOverlay and HoldingConcentrationCapOverlay to enforce ESG/sanctions restrictions and position concentration caps within the ExecutionOverlay pipeline.
tags: [architecture, overlays, compliance, esg, risk, policy]
timestamp: 2026-08-14T21:50:00Z
status: Accepted
supersedes: null
---

# Composable Exclusion and Holding Concentration Overlays

## Context

Wealth management mandates, ESG compliance guidelines, and enterprise risk policies require strict constraints on trade generation:
1. **Instrument Exclusions**: Prohibiting the purchase of specific instruments (e.g., sanctioned securities, tobacco/weapons ESG exclusions, or employer restricted stock for corporate insiders) while permitting existing holdings to be divested (sold).
2. **Holding Concentration Limits**: Mandating that no single security exceeds a maximum allowable percentage weight of total portfolio value (e.g., 20% max concentration).

Prior to this decision, the engine provided generative overlays (TLH) and tax lockout overlays (Wash Sale, UK Bed-and-Breakfast), but lacked explicit compliance constraint overlays to restrict buys of blacklisted instruments or resize buys that would breach position concentration ceilings.

## Options Considered

### Option 1: Hardcode Exclusions and Concentration Limits in Base Trade Generator (`trades.ts`)
- **Benefits:** Direct integration in trade sizing math.
- **Costs:** Couples compliance and mandate constraints directly into the base rule-based generator, bypassing alternative optimizers (e.g., Oracle Tax Optimizer).
- **Risks:** Bloats base trade generation and violates single responsibility.
- **Reversibility:** Low.

### Option 2: Implement Composable `ExclusionListOverlay` and `HoldingConcentrationCapOverlay` in the `ExecutionOverlay` Pipeline
- **Benefits:** 
  - Works across all trade generators and optimizers seamlessly.
  - Decouples ESG/compliance filtering from math algorithms.
  - Allows `SELL` orders (divestment) to proceed unimpeded while strictly suppressing `BUY` orders.
  - Resizes `BUY` orders down to the exact concentration ceiling and accurately restores unspent cash into `estimatedPostTradeCash`.
- **Costs:** Modest additional pass in the evaluation pipeline.
- **Risks:** Negligible.
- **Reversibility:** High.

## Decision

Adopt **Option 2**. Implement `ExclusionListOverlay` and `HoldingConcentrationCapOverlay` as composable execution overlays in `src/core/overlays.ts`. Extend `RebalancingPolicy` with `exclusionList?: string[]` and `maxHoldingConcentration?: number`. Automatically register both overlays whenever their respective policy configurations are defined.

## Rationale

- **Modularity & Reusability**: The `ExecutionOverlay` architecture (established in ADR-0042 and ADR-0059) is designed specifically to intercept and mutate trade proposals before final quality/utility evaluation.
- **Divestment Support**: Exclusion lists must allow selling existing restricted holdings down to zero without generating illegal buy recommendations.
- **Precision & Cash Traceability**: Sizing down a buy trade to a concentration ceiling adjusts `estimatedValue` using `roundMoney` and `roundQuantity`, properly refunding unspent cash to preserve portfolio cash invariance.

## Implementation Impact

- **Domain Model:** Added `exclusionList` and `maxHoldingConcentration` to `RebalancingPolicy` in [`src/models/domain.ts`](../../src/models/domain.ts).
- **Core Overlays:** Implemented `ExclusionListOverlay` and `HoldingConcentrationCapOverlay` in [`src/core/overlays.ts`](../../src/core/overlays.ts).
- **Evaluation Pipeline:** Added `resolveExecutionOverlays` helper in [`src/core/evaluation.ts`](../../src/core/evaluation.ts) supporting both synchronous and asynchronous evaluation workflows.
- **Tests:** Added unit and integration test suites in [`tests/overlays.test.ts`](../../tests/overlays.test.ts).

## Validation

- Tested exclusion suppression for `BUY` orders and cash refund reconciliation.
- Tested divestment `SELL` execution for excluded securities.
- Tested concentration cap `BUY` trade resizing and suppression when already at or above threshold.
- Verified all 45 test suites pass with 0 regressions.

&copy; 2026 Johan Hellman. All rights reserved.
