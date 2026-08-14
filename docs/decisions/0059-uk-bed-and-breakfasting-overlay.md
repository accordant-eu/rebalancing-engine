---
type: Decision Record
title: UK Capital Gains Tax Rules and Bed-and-Breakfasting Overlay
description: Implement HMRC-compliant UK tax rules including the 30-day Bed-and-Breakfast repurchase matching rule and Section 104 average-cost holding pool calculations via the Execution Overlay pipeline.
tags: [architecture, tax, uk, overlays, lot-allocation]
timestamp: 2026-08-14T19:26:00Z
status: Accepted
---

# UK Capital Gains Tax Rules and Bed-and-Breakfasting Overlay

## Context

The rebalancing engine is designed to be jurisdiction-agnostic, providing a pure mathematical core with pluggable overlays and modules for specific regional tax regimes. While US-specific tax rules (wash-sale rules and individual tax-lot harvesting via Oracle) are supported, UK capital gains rules operate under a fundamentally different statutory framework defined by HMRC:

1. **Statutory Matching Hierarchy**:
   - **Priority 1 (Same Day)**: Shares acquired on the same day as the disposal are matched first.
   - **Priority 2 (30-Day Bed-and-Breakfast Rule)**: Shares acquired within the 30 days following the disposal are matched next (preventing artificial loss crystallization through quick repurchases).
   - **Priority 3 (Section 104 Holding Pool)**: All remaining holdings are pooled into a single average acquisition cost pool per share class.

2. **Need for Execution Overlay & Pool Basis**:
   - For UK accounts (`taxJurisdiction: 'UK'`), individual lot picking (e.g. Specific ID, FIFO, LIFO) is not permissible under HMRC rules; all shares belong to the Section 104 pool.
   - Attempting tax-loss harvesting by selling and immediately repurchasing the same asset (or buying within 30 days) triggers the Bed-and-Breakfast rule, matching the disposal to the new acquisition and neutralizing the intended loss realization against the historic pool basis.

## Options Considered

### Option 1: Hardcoded branching in core trade sizing
- **Benefits:** Fast initial implementation.
- **Costs:** Violates modular separation of concerns; tightly couples UK tax law to the core trade generator.
- **Risks:** High risk of regression across other jurisdictions.
- **Reversibility:** Low.

### Option 2: Composable `UkBedAndBreakfastOverlay` and `SECTION_104` Sell Selection Mode (Chosen)
- **Benefits:** 
  - Keeps the core sizing engine jurisdiction-agnostic.
  - Leverages the existing `ExecutionOverlay` pipeline (`UkBedAndBreakfastOverlay` alongside `WashSaleLockoutOverlay` and `OpportunisticLossHarvestingOverlay`).
  - Extends `SellSelectionMode` with `SECTION_104` to calculate the pooled weighted average unit cost.
  - Deterministic, modular, and fully testable without external service dependencies.
- **Costs:** Requires adding dedicated matching utilities for Section 104 pooling and 30-day date interval evaluations.
- **Risks:** Low; localized to overlay and lot allocation selection.
- **Reversibility:** High.

## Decision

We adopt **Option 2**:
1. Add `'SECTION_104'` to `SellSelectionMode` in `src/models/domain.ts` and support Section 104 pool basis calculations in `src/core/trades.ts`.
2. Implement `UkBedAndBreakfastOverlay` in `src/core/overlays.ts` and `src/core/uk-tax.ts` to detect and suppress invalid 30-day repurchase loss harvests, emitting `UK_BED_AND_BREAKFAST_LOCKOUT` warnings.
3. Automatically apply Section 104 pooling and UK rules when `taxJurisdiction: 'UK'` or when `UkBedAndBreakfastOverlay` is specified in `policy.executionOverlays`.

## Rationale

This decision aligns with our architectural principle of separating pure allocation/drift sizing from regional tax overlays (ADR-0042 & ADR-0058). It delivers deterministic, HMRC-compliant capital gains matching without compromising the generality of the core rebalancing engine.

## Implementation Impact

- **Code:** 
  - `src/models/domain.ts`: Add `'SECTION_104'` to `SellSelectionMode`.
  - `src/core/uk-tax.ts`: Implement `calculateSection104Pool` and UK statutory matching logic.
  - `src/core/overlays.ts`: Implement `UkBedAndBreakfastOverlay`.
  - `src/core/trades.ts`: Support Section 104 pooled unit cost in `allocateLotsForSellTrade`.
  - `src/core/evaluation.ts`: Resolve `UkBedAndBreakfastOverlay` in execution pipeline.
- **Tests:** Add `tests/uk-tax.test.ts` covering Section 104 average cost pooling, same-day matching, 30-day repurchase lockouts, and integration evaluations.
- **Documentation:** Register ADR-0059 in `docs/decisions/index.md` and log iteration details in `BUILD_JOURNEY.md`.

## Follow-up

- Expand Section 104 pool management to handle corporate action bonus/rights issues and capital reductions.

&copy; 2026 Johan Hellman. All rights reserved.
