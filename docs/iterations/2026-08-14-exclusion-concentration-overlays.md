---
type: Iteration
title: Composable Exclusion and Holding Concentration Overlays (ADR-0062)
description: Implementation of ExclusionListOverlay and HoldingConcentrationCapOverlay in the ExecutionOverlay pipeline for ESG restrictions, blackout lists, and position concentration caps.
tags: [iteration, overlays, compliance, esg, risk, adr]
timestamp: 2026-08-14T21:52:00Z
---

# Iteration: Composable Exclusion and Holding Concentration Overlays (ADR-0062)

## Objective
Implement composable compliance and position constraint overlays (`ExclusionListOverlay` and `HoldingConcentrationCapOverlay`) in the core `ExecutionOverlay` pipeline, formalizing the design in [ADR-0062](../decisions/0062-composable-exclusion-and-concentration-overlays.md).

## Summary of Completed Work

### 1. Domain Model Extensions
- Added `exclusionList?: string[]` and `maxHoldingConcentration?: number` to `RebalancingPolicy` in [`src/models/domain.ts`](../../src/models/domain.ts).

### 2. Overlay Pipeline Implementations
- **`ExclusionListOverlay`**: Suppresses `BUY` orders for any security in `policy.exclusionList` while allowing `SELL` divestment orders to execute cleanly; refunds unspent cash to `estimatedPostTradeCash` and surfaces `TRADE_SUPPRESSED_BY_OVERLAY` warnings.
- **`HoldingConcentrationCapOverlay`**: Enforces a strict ceiling on position weight (`policy.maxHoldingConcentration`); dynamically resizes `BUY` trades down to the allowable increment or suppresses orders if below `minimumTradeSize`.
- **`resolveExecutionOverlays`**: Added centralized helper in [`src/core/evaluation.ts`](../../src/core/evaluation.ts) supporting both synchronous and asynchronous evaluation pipelines.

### 3. Decision Record & Documentation
- Documented Context, Options, Decision, Rationale, and Validation in [ADR-0062](../decisions/0062-composable-exclusion-and-concentration-overlays.md).
- Updated decisions index, daily iteration log, and build journey.

## Files Touched
- `src/models/domain.ts` (Modified)
- `src/core/overlays.ts` (Modified)
- `src/core/evaluation.ts` (Modified)
- `tests/overlays.test.ts` (Modified)
- `docs/decisions/0062-composable-exclusion-and-concentration-overlays.md` (Created)
- `docs/decisions/index.md` (Modified)
- `docs/iterations/2026-08-14-exclusion-concentration-overlays.md` (Created)
- `docs/iterations/index.md` (Modified)
- `docs/log.md` (Modified)
- `BUILD_JOURNEY.md` (Modified)

&copy; 2026 Johan Hellman. All rights reserved.
